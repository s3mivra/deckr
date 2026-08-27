import { useId } from 'react';

/**
 * Accessible hover / focus tooltip. Pure CSS positioning, so it just needs a
 * positioned wrapper. Use for icon-only controls.
 */
export default function Tooltip({ label, side = 'top', children }) {
  const id = useId();
  return (
    <span className="tt-wrap">
      <span className="tt-anchor" aria-describedby={id}>
        {children}
      </span>
      <span role="tooltip" id={id} className={`tt tt--${side}`}>
        {label}
      </span>
    </span>
  );
}

/** Icon button with a built in tooltip. */
export function IconButton({ label, side, onClick, tone = 'ghost', type = 'button', children, disabled }) {
  return (
    <Tooltip label={label} side={side}>
      <button
        type={type}
        className={`icon-btn icon-btn--${tone}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
      >
        {children}
      </button>
    </Tooltip>
  );
}
