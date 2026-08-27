import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useQuery } from '../lib/cache.js';
import { useTitle } from '../components/RouteEffects.jsx';
import { ErrorBanner } from '../components/common.jsx';
import { CardGridSkeleton } from '../components/Skeleton.jsx';
import Icon from '../components/Icon.jsx';
import { formatNumber } from '../lib/format.js';
import DeckCard from '../components/DeckCard.jsx';

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
  useTitle('Community');
  const { data, error, loading } = useQuery('community', Deckr.community, { ttl: 60 * 1000 });
  const [cardTab, setCardTab] = useState('top');
  const [userTab, setUserTab] = useState('likes');

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Community</h1>
          <p className="hint">The best and newest cards, and the people behind them.</p>
        </div>
      </div>

      <ErrorBanner error={error} />

      <section className="section" style={{ marginTop: 8 }}>
        <div className="tab-row">
          <button
            className={`btn ${cardTab === 'top' ? '' : 'btn--ghost'}`}
            onClick={() => setCardTab('top')}
          >
            Top cards
          </button>
          <button
            className={`btn ${cardTab === 'recent' ? '' : 'btn--ghost'}`}
            onClick={() => setCardTab('recent')}
          >
            Recent cards
          </button>
        </div>

        {loading || !data ? (
          <CardGridSkeleton count={6} />
        ) : (
          (() => {
            const cards = (cardTab === 'top' ? data.topCards : data.recentCards) || [];
            if (!cards.length) return <p className="hint">No public cards yet.</p>;
            return (
              <div className="card-grid">
                {cards.map((c) => (
                  <DeckCard key={c.id} card={c} showOwner />
                ))}
              </div>
            );
          })()
        )}
      </section>

      <section className="section">
        <h2>Top builders</h2>
        <div className="tab-row">
          <button
            className={`btn ${userTab === 'likes' ? '' : 'btn--ghost'}`}
            onClick={() => setUserTab('likes')}
          >
            Most likes
          </button>
          <button
            className={`btn ${userTab === 'cards' ? '' : 'btn--ghost'}`}
            onClick={() => setUserTab('cards')}
          >
            Most cards
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
