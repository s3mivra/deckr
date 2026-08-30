import { useEffect, useState } from 'react';
import { Deckr } from '../api/client.js';
import { useQuery } from '../lib/cache.js';
import { CardGridSkeleton } from './Skeleton.jsx';
import DeckCard from './DeckCard.jsx';
import SearchField from './SearchField.jsx';
import Pager from './Pager.jsx';

/**
 * Search + paged grid over every public card. Debounces the query and resets to
 * page 1 whenever the search or sort changes.
 */
export default function CardExplorer() {
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('top');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(term.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [term]);

  const { data, loading } = useQuery(
    `explore:${sort}:${q}:${page}`,
    () => Deckr.exploreCards({ q, page, sort }),
    { ttl: 15 * 1000 }
  );

  const cards = data?.cards || [];

  return (
    <div className="explorer">
      <div className="explorer__bar">
        <SearchField
          value={term}
          onChange={setTerm}
          placeholder="Search cards by name, stack, language"
        />
        <div className="explorer__sorts" role="group" aria-label="Sort">
          {[
            ['top', 'Most liked'],
            ['new', 'Newest'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn--sm ${sort === key ? '' : 'btn--ghost'}`}
              aria-pressed={sort === key}
              onClick={() => {
                setSort(key);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <CardGridSkeleton count={6} />
      ) : cards.length === 0 ? (
        <p className="hint" style={{ padding: '20px 0' }}>
          {q ? `Nothing matches "${q}".` : 'No public cards yet.'}
        </p>
      ) : (
        <>
          <p className="hint">
            {data.total} card{data.total === 1 ? '' : 's'}
            {q ? ` matching "${q}"` : ''}
          </p>
          <div className="card-grid">
            {cards.map((card) => (
              <DeckCard key={card.id} card={card} showOwner />
            ))}
          </div>
          <Pager page={data.page} pages={data.pages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
