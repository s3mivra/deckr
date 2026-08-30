import { useEffect, useId, useRef, useState } from 'react';

/**
 * A text field that is free to type in, with an own-drawn popover of matching
 * suggestions (replaces <datalist>, which the browser styles its own way).
 */
export default function Combobox({
  value,
  onChange,
  options = [],
  placeholder,
  maxLength,
  id,
  className = 'input',
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const listId = useId();

  const q = String(value || '').toLowerCase();
  const matches = options
    .filter((o) => o.toLowerCase().includes(q) && o.toLowerCase() !== q)
    .slice(0, 8);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const choose = (v) => {
    onChange(v);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && matches.length) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && active >= 0 && matches[active]) {
      e.preventDefault();
      choose(matches[active]);
    }
  };

  return (
    <div className="xselect" ref={rootRef}>
      <input
        id={id}
        className={className}
        value={value ?? ''}
        maxLength={maxLength}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && matches.length ? (
        <ul className="xselect__pop" id={listId} role="listbox">
          {matches.map((o, i) => (
            <li
              key={o}
              role="option"
              aria-selected={i === active}
              className={`xselect__opt ${i === active ? 'is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o);
              }}
            >
              {o}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
