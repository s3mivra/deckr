import { Link, useParams } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useQuery } from '../lib/cache.js';
import { useSeo } from '../components/RouteEffects.jsx';
import { ErrorBanner } from '../components/common.jsx';
import { CardSkeleton } from '../components/Skeleton.jsx';
import { useLike } from '../lib/useLike.js';
import FlipCard from '../components/FlipCard.jsx';
import EmbedBox from '../components/EmbedBox.jsx';

function LoadedCard({ card }) {
  const like = useLike(card);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <FlipCard card={card} like={like} />
      <p className="hint">
        A card by{' '}
        <Link to={`/u/${card.owner?.username}`}>{card.owner?.displayName || card.owner?.username}</Link>.
        Click to flip.
      </p>

      {card.isPublic !== false ? <EmbedBox card={card} /> : null}
    </div>
  );
}

export default function PublicCard() {
  const { id } = useParams();
  const { data, error, loading } = useQuery(`card:${id}`, () => Deckr.getCard(id), {
    ttl: 15 * 1000,
    refetchInterval: 20 * 1000,
  });
  const c = data?.card;
  useSeo({
    title: c ? c.projectName : 'Card',
    description: c
      ? c.description ||
        `${c.projectName}${c.primaryLanguage ? ` · ${c.primaryLanguage}` : ''} · a project card on Deckr.`
      : undefined,
    type: 'article',
    path: c ? `/c/${id}` : undefined,
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <CardSkeleton />
      </div>
    );
  }
  if (error) return <ErrorBanner error={error} />;

  return <LoadedCard card={data.card} />;
}
