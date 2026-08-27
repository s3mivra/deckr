import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tiny stale-while-revalidate cache.
 * - in memory Map keyed by a string
 * - optional localStorage persistence for data that is safe to show stale
 * - subscribers re-render when a key changes (via useQuery or mutate/invalidate)
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
      /* quota or disabled, ignore */
    }
  }
}

export function mutateCache(key, updater) {
  const cur = mem.get(key);
  const prev = cur?.data;
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

export function useQuery(key, fetcher, options = {}) {
  const { ttl = DEFAULT_TTL, persist = false, enabled = true } = options;
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((n) => n + 1), []);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled || !key) return undefined;
    const set = listeners.get(key) || new Set();
    set.add(rerender);
    listeners.set(key, set);
    return () => set.delete(rerender);
  }, [key, enabled, rerender]);

  useEffect(() => {
    if (!enabled || !key) return;
    if (persist) hydrate(key);
    const entry = mem.get(key);
    const fresh = entry?.data && Date.now() - entry.ts < ttl;
    if (fresh || entry?.promise) return;

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
  }, [key, enabled, ttl, persist]);

  const entry = enabled && key ? mem.get(key) : undefined;
  return {
    data: entry?.data,
    error: entry?.data ? undefined : entry?.error,
    loading: Boolean(enabled && key) && !entry?.data && !entry?.error,
    isValidating: Boolean(entry?.promise),
    refetch: () => {
      invalidate(key);
      rerender();
    },
    mutate: (updater) => mutateCache(key, updater),
  };
}
