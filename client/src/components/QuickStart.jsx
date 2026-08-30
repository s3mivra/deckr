import { Link } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useQuery } from '../lib/cache.js';
import { formatNumber } from '../lib/format.js';
import Icon from './Icon.jsx';

/**
 * "Instant first card": pulls the signed-in maker's best public repos from
 * GitHub and offers one tap to open the builder already prefilled. Repos that
 * already have a card are filtered out server side, so this quietly empties
 * itself as the deck fills up.
 */
export default function QuickStart({ heading = 'Start from one of your repos', onPick }) {
  const { data, loading } = useQuery('cardSuggestions', Deckr.cardSuggestions, {
    ttl: 5 * 60 * 1000,
    persist: true,
  });

  const repos = data?.repos || [];
  if (loading && !data) return null;
  if (!repos.length) return null;

  return (
    <section className="panel quickstart">
      <div className="quickstart__head">
        <h3>{heading}</h3>
        <span className="hint">Deckr fills in the details. You just pick a style.</span>
      </div>
      <ul className="quickstart__list">
        {repos.map((r) => {
          const inner = (
            <>
              <span className="quickstart__name">{r.projectName}</span>
              {r.description ? (
                <span className="quickstart__desc">{r.description}</span>
              ) : null}
              <span className="quickstart__meta">
                {r.primaryLanguage ? <span>{r.primaryLanguage}</span> : null}
                {r.githubStars > 0 ? (
                  <span>
                    <Icon name="star" size={12} filled /> {formatNumber(r.githubStars)}
                  </span>
                ) : null}
              </span>
              <span className="quickstart__go" aria-hidden="true">
                <Icon name="plus" size={16} strokeWidth={2.6} />
              </span>
            </>
          );
          return (
            <li key={r.slug}>
              {onPick ? (
                <button type="button" className="quickstart__pick" onClick={() => onPick(r.slug)}>
                  {inner}
                </button>
              ) : (
                <Link
                  className="quickstart__pick"
                  to={`/cards/new?repo=${encodeURIComponent(r.slug)}`}
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
