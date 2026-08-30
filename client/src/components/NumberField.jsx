/**
 * A number input with our own minus / plus steppers instead of the browser's
 * spin buttons. `value` is a number (or '' when cleared), `onChange` gets a
 * number or null.
 */
export default function NumberField({ value, onChange, min = 0, max = Infinity, step = 1, id, placeholder }) {
  const num = value === '' || value == null ? null : Number(value);
  const clamp = (n) => Math.min(max, Math.max(min, n));
  const set = (n) => onChange(n == null || Number.isNaN(n) ? null : clamp(Math.round(n)));

  return (
    <div className="numfield">
      <button
        type="button"
        className="numfield__btn"
        aria-label="Decrease"
        onClick={() => set((num ?? min) - step)}
      >
        &minus;
      </button>
      <input
        id={id}
        className="input"
        type="number"
        inputMode="numeric"
        min={min}
        max={Number.isFinite(max) ? max : undefined}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))}
      />
      <button
        type="button"
        className="numfield__btn"
        aria-label="Increase"
        onClick={() => set((num ?? min - step) + step)}
      >
        +
      </button>
    </div>
  );
}
