import { Link, useParams } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useQuery } from '../lib/cache.js';
import { useSeo } from '../components/RouteEffects.jsx';
import { ErrorBanner } from '../components/common.jsx';
import { CardGridSkeleton } from '../components/Skeleton.jsx';
import DeckCard from '../components/DeckCard.jsx';
import Icon from '../components/Icon.jsx';

export default function BasketPage() {
  const { id } = useParams();
  const { data, error, loading } = useQuery(`basket:${id}`, () => Deckr.getBasket(id), {
    ttl: 20 * 1000,
    refetchInterval: 30 * 1000,
  });

  const b = data?.basket;
  useSeo({
    title: b ? b.title : 'Basket',
    description: b
      ? b.note ||
        `A basket of ${data.cards.length} project cards picked by ${
          b.owner?.displayName || b.owner?.username
        } on Deckr.`
      : undefined,
    type: 'article',
    path: b ? `/b/${id}` : undefined,
  });

  if (loading) return <CardGridSkeleton count={3} />;
  if (error) return <ErrorBanner error={error} />;

  const { cards, isOwner } = data;

  return (
    <>
      <div className="panel basket-head">
        <span className="basket-head__tag">
          <Icon name="copy" size={14} strokeWidth={2.6} /> Basket
        </span>
        <h1>{b.title}</h1>
        {b.note ? <p>{b.note}</p> : null}
        <div className="stat-row">
          <span className="tag">{cards.length} cards</span>
          {b.owner ? (
            <Link className="tag count-pill" to={`/u/${b.owner.username}`}>
              <img
                src={b.owner.avatarUrl}
                alt=""
                width={20}
                height={20}
                style={{ borderRadius: 6, border: '2px solid var(--ink)', objectFit: 'cover' }}
              />
              {b.owner.displayName || b.owner.username}
            </Link>
          ) : null}
          {isOwner ? (
            <Link className="tag" to="/baskets">
              Edit baskets
            </Link>
          ) : null}
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="hint">This basket is empty for now.</p>
      ) : (
        <div className="card-grid">
          {cards.map((c) => (
            <DeckCard key={c.id} card={c} showOwner />
          ))}
        </div>
      )}
    </>
  );
}
