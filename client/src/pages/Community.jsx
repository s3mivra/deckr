import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useQuery } from '../lib/cache.js';
import { useSeo } from '../components/RouteEffects.jsx';
import { ErrorBanner } from '../components/common.jsx';
import { CardGridSkeleton } from '../components/Skeleton.jsx';
import Icon from '../components/Icon.jsx';
import { formatNumber } from '../lib/format.js';
import DeckCard from '../components/DeckCard.jsx';
import ActivityStrip from '../components/ActivityStrip.jsx';

/* A hanging aisle sign, the way a supermarket labels a row. */
function AisleSign({ number, title, note }) {
  return (
    <div className="aisle">
      <span className="aisle__hook" aria-hidden="true" />
      <span className="aisle__hook aisle__hook--right" aria-hidden="true" />
      <div className="aisle__board">
        <span className="aisle__num">Aisle {number}</span>
        <span className="aisle__title">{title}</span>
      </div>
      {note ? <span className="aisle__note">{note}</span> : null}
    </div>
  );
}

/* Store PA announcement strip. */
function Tannoy({ cards }) {
  if (!cards || !cards.length) return null;
  const items = cards.slice(0, 6).map((c) => {
    const who = c.owner?.displayName || c.owner?.username || 'a shopper';
    return `${c.projectName} just landed from ${who}`;
  });
  // duplicated so the marquee can loop without a visible seam
  const loop = [...items, ...items];
  return (
    <div className="tannoy">
      <span className="tannoy__label">Attention shoppers</span>
      <div className="tannoy__viewport">
        <div className="tannoy__track">
          {loop.map((text, i) => (
            <span className="tannoy__item" key={i}>
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Leaderboard({ rows, metric }) {
  if (!rows.length) return <p className="hint">No one here yet. Be the first.</p>;
  return (
    <ol className="board">
      {rows.map((r, i) => (
        <li key={r.user.username} className="board__row panel">
          <span className="board__rank">{i + 1}</span>
          <Link to={`/u/${r.user.username}`} className="board__user">
            <img src={r.user.avatarUrl} alt="" />
            <span>{r.user.displayName || r.user.username}</span>
          </Link>
          <span className="board__stat">
            {metric === 'likes' ? (
              <>
                <Icon name="star" size={14} /> {formatNumber(r.likes)}
              </>
            ) : (
              <>{formatNumber(r.cards)} cards</>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function Community() {
  useSeo({
    title: 'Community',
    description:
      'Browse the shelves: the most starred and most recent project cards on Deckr, and the builders behind them.',
  });
  const { data, error, loading } = useQuery('community', Deckr.community, {
    ttl: 15 * 1000,
    refetchInterval: 20 * 1000,
  });
  const [cardTab, setCardTab] = useState('top');
  const [userTab, setUserTab] = useState('likes');

  const cards = data ? (cardTab === 'top' ? data.topCards : data.recentCards) || [] : [];

  // freezer aisle: archived cards, pulled from whatever the API returned
  const frozen = data
    ? [...(data.topCards || []), ...(data.recentCards || [])]
        .filter((c) => c.status === 'archived')
        .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
        .slice(0, 3)
    : [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>The aisles</h1>
          <p className="hint">Everything on the shelves right now, and the people who stock them.</p>
        </div>
      </div>

      <ErrorBanner error={error} />

      <ActivityStrip />

      <Tannoy cards={data?.recentCards} />

      <section className="section" style={{ marginTop: 28 }}>
        <AisleSign
          number={cardTab === 'top' ? 1 : 2}
          title={cardTab === 'top' ? 'Best sellers' : 'Freshly stocked'}
          note={
            cardTab === 'top'
              ? 'Most starred cards across the whole store'
              : 'Straight off the delivery truck'
          }
        />

        <div className="tab-row">
          <button
            className={`btn ${cardTab === 'top' ? '' : 'btn--ghost'}`}
            onClick={() => setCardTab('top')}
          >
            Best sellers
          </button>
          <button
            className={`btn ${cardTab === 'recent' ? '' : 'btn--ghost'}`}
            onClick={() => setCardTab('recent')}
          >
            Freshly stocked
          </button>
        </div>

        {loading || !data ? (
          <CardGridSkeleton count={6} />
        ) : !cards.length ? (
          <p className="hint">Shelves are empty. Be the first to stock one.</p>
        ) : (
          <div className="card-grid">
            {cards.map((c) => (
              <DeckCard key={c.id} card={c} showOwner />
            ))}
          </div>
        )}
      </section>

      {frozen.length ? (
        <section className="section">
          <AisleSign number={9} title="Freezer" note="Archived, but still worth a look" />
          <div className="card-grid is-frozen">
            {frozen.map((c) => (
              <DeckCard key={`frozen-${c.id}`} card={c} showOwner />
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <AisleSign number={12} title="Staff of the month" note="Ranked by the whole store" />

        <div className="tab-row">
          <button
            className={`btn ${userTab === 'likes' ? '' : 'btn--ghost'}`}
            onClick={() => setUserTab('likes')}
          >
            Most stars
          </button>
          <button
            className={`btn ${userTab === 'cards' ? '' : 'btn--ghost'}`}
            onClick={() => setUserTab('cards')}
          >
            Most stocked
          </button>
        </div>

        {loading || !data ? (
          <div className="board">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="panel board__row">
                <span className="sk" style={{ width: 24, height: 20 }} />
                <span className="sk" style={{ width: 160, height: 24 }} />
              </div>
            ))}
          </div>
        ) : (
          <Leaderboard
            rows={(userTab === 'likes' ? data.topByLikes : data.topByCards) || []}
            metric={userTab === 'likes' ? 'likes' : 'cards'}
          />
        )}
      </section>
    </>
  );
}
