import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

/**
 * Dynamic pill input. Type and press Enter or comma to add a chip, click the x
 * to remove one, Backspace on an empty field removes the last. Suggestions show
 * in an own-drawn popover (arrow keys to highlight, Enter to take one).
 */
export default function ChipInput({
  values = [],
  onChange,
  max = 10,
  maxLength = 24,
  placeholder = 'Add and press Enter',
  suggestions = [],
}) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const full = values.length >= max;

  const taken = new Set(values.map((v) => v.toLowerCase()));
  const matches = suggestions
    .filter((s) => !taken.has(s.toLowerCase()) && s.toLowerCase().includes(draft.toLowerCase()))
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

  const add = (raw) => {
    const clean = raw.trim().slice(0, maxLength);
    setDraft('');
    setActive(-1);
    if (!clean || full) return;
    if (taken.has(clean.toLowerCase())) return;
    onChange([...values, clean]);
  };

  const removeAt = (i) => onChange(values.filter((_, idx) => idx !== i));

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(open && active >= 0 && matches[active] ? matches[active] : draft);
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Backspace' && !draft && values.length) {
      removeAt(values.length - 1);
    }
  };

  return (
    <div>
      <div className="xselect" ref={rootRef}>
        <div
          className={`chip-input ${full ? 'is-full' : ''}`}
          onClick={() => inputRef.current?.focus()}
        >
          {values.map((v, i) => (
            <span className="chip-input__chip" key={`${v}-${i}`}>
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
              >
                <Icon name="trash" size={11} strokeWidth={2.8} />
              </button>
            </span>
          ))}
          {!full ? (
            <input
              ref={inputRef}
              className="chip-input__field"
              value={draft}
              maxLength={maxLength}
              placeholder={values.length ? '' : placeholder}
              autoComplete="off"
              onChange={(e) => {
                setDraft(e.target.value.replace(',', ''));
                setOpen(true);
                setActive(-1);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              onBlur={() => add(draft)}
            />
          ) : null}
        </div>
        {open && matches.length && !full ? (
          <ul className="xselect__pop" role="listbox">
            {matches.map((s, i) => (
              <li
                key={s}
                role="option"
                aria-selected={i === active}
                className={`xselect__opt ${i === active ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(s);
                  setOpen(false);
                }}
              >
                {s}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <span className="hint">
        {values.length}/{max} added{full ? ', that is the max' : ''}
      </span>
    </div>
  );
}
