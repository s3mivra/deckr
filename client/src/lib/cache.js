import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Stale-while-revalidate cache.
 * - in memory Map keyed by a string
 * - optional localStorage persistence for data that is safe to show stale
 * - subscribers re-render when a key changes
 * - revalidates on window focus, and optionally on an interval
 */

const mem = new Map(); // key -> { data, ts, error, promise }
const listeners = new Map(); // key -> Set<fn>
const DEFAULT_TTL = 60_000;

function notify(key) {
  const set = listeners.get(key);
  if (set) set.forEach((fn) => fn());
}

function persistKey(key) {
  return `deckr_cache:${key}`;
}

function hydrate(key) {
  try {
    const raw = localStorage.getItem(persistKey(key));
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!mem.has(key)) mem.set(key, { data: parsed.data, ts: parsed.ts });
  } catch {
    /* ignore */
  }
}

function save(key, data, persist) {
  const ts = Date.now();
  const prev = mem.get(key) || {};
  mem.set(key, { ...prev, data, ts, error: undefined });
  if (persist) {
    try {
      localStorage.setItem(persistKey(key), JSON.stringify({ data, ts }));
    } catch {
      /* quota or disabled */
    }
  }
}

export function mutateCache(key, updater) {
  const cur = mem.get(key);
  if (!cur) return undefined; // do not create entries other components are not watching
  const prev = cur.data;
  const next = typeof updater === 'function' ? updater(prev) : updater;
  save(key, next, false);
  notify(key);
  return prev;
}

export function invalidate(prefix) {
  for (const k of [...mem.keys()]) {
    if (k === prefix || k.startsWith(prefix)) {
      const entry = mem.get(k);
      mem.set(k, { ...entry, ts: 0 }); // mark stale, keep data for SWR
      notify(k);
    }
  }
}

export function dropCache(prefix) {
  for (const k of [...mem.keys()]) {
    if (k === prefix || k.startsWith(prefix)) {
      mem.delete(k);
      try {
        localStorage.removeItem(persistKey(k));
      } catch {
        /* ignore */
      }
      notify(k);
    }
  }
}

/**
 * Patch a single card wherever it is cached (deck list, community lists, single
 * card page). Used so a like registers everywhere without a refetch.
 */
export function patchCardInCaches(cardId, patch) {
  const applyToList = (arr) =>
    Array.isArray(arr) ? arr.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) : arr;

  for (const [key, entry] of mem) {
    const d = entry?.data;
    if (!d) continue;
    let next = d;
    if (Array.isArray(d?.cards)) next = { ...next, cards: applyToList(d.cards) };
    if (Array.isArray(d?.topCards)) next = { ...next, topCards: applyToList(d.topCards) };
    if (Array.isArray(d?.recentCards)) next = { ...next, recentCards: applyToList(d.recentCards) };
    if (d?.card?.id === cardId) next = { ...next, card: { ...d.card, ...patch } };
    if (next !== d) {
      mem.set(key, { ...entry, data: next });
      notify(key);
    }
  }
}

export function useQuery(key, fetcher, options = {}) {
  const {
    ttl = DEFAULT_TTL,
    persist = false,
    enabled = true,
    refetchInterval = 0,
    refetchOnFocus = true,
  } = options;

  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((n) => n + 1), []);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const revalidate = useCallback(
    (force = false) => {
      if (!enabled || !key) return;
      if (persist) hydrate(key);
      const entry = mem.get(key);
      if (entry?.promise) return;
      const fresh = entry?.data && Date.now() - entry.ts < ttl;
      if (fresh && !force) return;

      const promise = Promise.resolve()
        .then(() => fetcherRef.current())
        .then((data) => save(key, data, persist))
        .catch((error) => {
          const cur = mem.get(key) || {};
          mem.set(key, { ...cur, error });
        })
        .finally(() => {
          const cur = mem.get(key);
          if (cur) delete cur.promise;
          notify(key);
        });

      mem.set(key, { ...(entry || {}), promise });
      notify(key);
    },
    [key, enabled, ttl, persist]
  );

  useEffect(() => {
    if (!enabled || !key) return undefined;
    const set = listeners.get(key) || new Set();
    set.add(rerender);
    listeners.set(key, set);
    return () => set.delete(rerender);
  }, [key, enabled, rerender]);

  useEffect(() => {
    revalidate();
  }, [revalidate]);

  useEffect(() => {
    if (!enabled || !key || !refetchOnFocus) return undefined;
    const onFocus = () => {
      if (document.visibilityState !== 'hidden') revalidate(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [enabled, key, refetchOnFocus, revalidate]);

  useEffect(() => {
    if (!enabled || !key || !refetchInterval) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState !== 'hidden') revalidate(true);
    }, refetchInterval);
    return () => clearInterval(id);
  }, [enabled, key, refetchInterval, revalidate]);

  const entry = enabled && key ? mem.get(key) : undefined;
  return {
    data: entry?.data,
    error: entry?.data ? undefined : entry?.error,
    loading: Boolean(enabled && key) && !entry?.data && !entry?.error,
    isValidating: Boolean(entry?.promise),
    refetch: () => revalidate(true),
    mutate: (updater) => mutateCache(key, updater),
  };
}
