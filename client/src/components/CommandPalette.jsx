import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useQuery } from '../lib/cache.js';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from './Icon.jsx';

const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL || 'https://www.buymeacoffee.com/';

// true when the user is typing somewhere, so single-key shortcuts stay quiet
function isTyping(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function score(text, q) {
  const t = text.toLowerCase();
  const query = q.toLowerCase();
  if (!query) return 0;
  if (t.startsWith(query)) return 3;
  if (t.includes(query)) return 2;
  // loose subsequence match, so "cmty" still finds "Community"
  let i = 0;
  for (const ch of t) if (ch === query[i]) i += 1;
  return i === query.length ? 1 : -1;
}

/**
 * Cmd/Ctrl+K opens a searchable list of every place you can go and thing you
 * can do, plus your own cards. Single-key shortcuts when nothing is focused:
 * "n" for a new card, "?" to open this with the shortcut list showing.
 */
export default function CommandPalette() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const cardsQ = useQuery('cards', Deckr.listCards, {
    ttl: 30 * 1000,
    enabled: Boolean(user) && open,
  });

  const close = useCallback(() => {
    setOpen(false);
    setQ('');
    setActive(0);
  }, []);

  const commands = useMemo(() => {
    const go = (to) => () => {
      close();
      navigate(to);
    };
    const list = [
      { id: 'community', label: 'Community shelves', hint: 'Browse every maker', icon: 'star', run: go('/community') },
      { id: 'achievements', label: 'Achievements', hint: 'The full catalog', icon: 'check', run: go('/achievements') },
    ];
    if (user) {
      list.push(
        { id: 'deck', label: 'My deck', hint: 'Your cards and profile', icon: 'user', run: go('/dashboard') },
        { id: 'new', label: 'New card', hint: 'Shortcut: n', icon: 'plus', run: go('/cards/new') },
        { id: 'baskets', label: 'My baskets', hint: 'Curated lists', icon: 'copy', run: go('/baskets') },
        { id: 'profile', label: 'My public profile', hint: `/u/${user.username}`, icon: 'external', run: go(`/u/${user.username}`) },
        {
          id: 'signout',
          label: 'Sign out',
          icon: 'lock',
          run: async () => {
            close();
            await logout();
            navigate('/');
          },
        }
      );
    } else {
      list.push({ id: 'signin', label: 'Sign in', icon: 'user', run: go('/login') });
    }
    list.push({
      id: 'coffee',
      label: 'Buy me a coffee',
      hint: 'Support Deckr',
      icon: 'coffee',
      run: () => {
        close();
        window.open(SUPPORT_URL, '_blank', 'noopener');
      },
    });

    for (const c of cardsQ.data?.cards || []) {
      list.push({
        id: `card-${c.id}`,
        label: c.projectName,
        hint: 'Edit card',
        icon: 'edit',
        run: () => {
          close();
          navigate(`/cards/${c.id}/edit`);
        },
      });
    }
    return list;
  }, [user, cardsQ.data, navigate, close, logout]);

  const results = useMemo(() => {
    if (!q.trim()) return commands;
    return commands
      .map((c) => ({ c, s: score(c.label, q.trim()) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c);
  }, [commands, q]);

  // global keys: open with Cmd/Ctrl+K, plus n and ? when nothing is focused
  useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (open || isTyping(e.target)) return;
      if (e.key === 'n' && user) {
        e.preventDefault();
        navigate('/cards/new');
      } else if (e.key === '?') {
        e.preventDefault();
        setOpen(true);
        setQ('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, user, navigate]);

  useEffect(() => {
    if (open) {
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, results.length - 1)));
  }, [results.length]);

  useEffect(() => {
    const row = listRef.current?.children[active];
    row?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      results[active]?.run();
    }
  };

  return createPortal(
    <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command menu" onMouseDown={close}>
      <div className="cmdk__panel panel" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className="cmdk__search">
          <Icon name="zoom" size={18} strokeWidth={2.4} />
          <input
            ref={inputRef}
            className="cmdk__input"
            placeholder="Search pages, actions and your cards"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <kbd className="cmdk__kbd">esc</kbd>
        </div>
        {results.length === 0 ? (
          <p className="cmdk__empty hint">Nothing matches that.</p>
        ) : (
          <ul className="cmdk__list" ref={listRef}>
            {results.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`cmdk__row ${i === active ? 'is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => c.run()}
                >
                  <span className="cmdk__icon" aria-hidden="true">
                    <Icon name={c.icon} size={15} strokeWidth={2.4} />
                  </span>
                  <span className="cmdk__label">{c.label}</span>
                  {c.hint ? <span className="cmdk__hint">{c.hint}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="cmdk__foot">
          <span><kbd className="cmdk__kbd">up</kbd><kbd className="cmdk__kbd">down</kbd> move</span>
          <span><kbd className="cmdk__kbd">enter</kbd> open</span>
          {user ? <span><kbd className="cmdk__kbd">n</kbd> new card</span> : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
