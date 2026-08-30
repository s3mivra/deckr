import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';

const norm = (opts) =>
  (opts || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

/**
 * A drop-in replacement for a native <select> that we can actually style. Keeps
 * the important keyboard behaviour: type-ahead, arrow keys, Home / End, Escape,
 * and it closes on an outside click or blur.
 */
export default function Select({ value, onChange, options, id, 'aria-label': ariaLabel }) {
  const opts = norm(options);
  const current = opts.find((o) => o.value === value) || opts[0];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const popRef = useRef(null);
  const typed = useRef({ str: '', at: 0 });
  const listId = useId();

  useEffect(() => {
    if (!open) return undefined;
    setActive(Math.max(0, opts.findIndex((o) => o.value === value)));
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('pointerdown', onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) popRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const pick = (i) => {
    const o = opts[i];
    if (o) onChange(o.value);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) e.preventDefault();
    if (!open && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'Enter' || e.key === ' ') pick(active);
    else if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, opts.length - 1));
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(opts.length - 1);
    else if (e.key.length === 1) {
      const now = Date.now();
      typed.current.str = now - typed.current.at > 700 ? e.key : typed.current.str + e.key;
      typed.current.at = now;
      const hit = opts.findIndex((o) =>
        o.label.toLowerCase().startsWith(typed.current.str.toLowerCase())
      );
      if (hit >= 0) setActive(hit);
    }
  };

  return (
    <div className="xselect" ref={rootRef}>
      <button
        type="button"
        id={id}
        className="xselect__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
      >
        <span>{current?.label}</span>
        <Icon name="chevron" size={16} className="xselect__caret" strokeWidth={2.6} />
      </button>
      {open ? (
        <ul className="xselect__pop" id={listId} role="listbox" ref={popRef}>
          {opts.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`xselect__opt ${i === active ? 'is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(i)}
            >
              <span>{o.label}</span>
              <Icon name="check" size={14} className="xselect__tick" strokeWidth={3} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
