import { useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';

/**
 * Dynamic pill input. Type and press Enter or comma to add a chip, click the x
 * to remove one, Backspace on an empty field removes the last. Enforces a max
 * count and a max length per chip.
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
  const inputRef = useRef(null);
  const listId = useId();
  const full = values.length >= max;

  const add = (raw) => {
    const clean = raw.trim().slice(0, maxLength);
    if (!clean || full) return;
    if (values.some((v) => v.toLowerCase() === clean.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...values, clean]);
    setDraft('');
  };

  const removeAt = (i) => onChange(values.filter((_, idx) => idx !== i));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && values.length) {
      removeAt(values.length - 1);
    }
  };

  return (
    <div>
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
            list={suggestions.length ? listId : undefined}
            maxLength={maxLength}
            placeholder={values.length ? '' : placeholder}
            onChange={(e) => setDraft(e.target.value.replace(',', ''))}
            onKeyDown={onKeyDown}
            onBlur={() => add(draft)}
          />
        ) : null}
      </div>
      {suggestions.length ? (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
      <span className="hint">
        {values.length}/{max} added{full ? ', that is the max' : ''}
      </span>
    </div>
  );
}
