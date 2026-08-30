import Icon from './Icon.jsx';

/** A short, windowed list of page numbers plus prev / next. */
function windowed(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page, page - 1, page + 1]);
  const out = [];
  let prev = 0;
  for (const n of [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)) {
    if (n - prev > 1) out.push('gap');
    out.push(n);
    prev = n;
  }
  return out;
}

export default function Pager({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button
        type="button"
        className="pager__step"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Previous page"
      >
        <Icon name="chevron" size={16} strokeWidth={2.8} style={{ transform: 'rotate(90deg)' }} />
      </button>
      {windowed(page, pages).map((n, i) =>
        n === 'gap' ? (
          <span key={`g${i}`} className="pager__gap">
            &hellip;
          </span>
        ) : (
          <button
            key={n}
            type="button"
            className={`pager__num ${n === page ? 'is-current' : ''}`}
            aria-current={n === page ? 'page' : undefined}
            onClick={() => onPage(n)}
          >
            {n}
          </button>
        )
      )}
      <button
        type="button"
        className="pager__step"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
      >
        <Icon name="chevron" size={16} strokeWidth={2.8} style={{ transform: 'rotate(-90deg)' }} />
      </button>
    </nav>
  );
}
