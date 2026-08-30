import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useQuery } from '../lib/cache.js';
import { timeAgo } from '../lib/format.js';
import Icon from './Icon.jsx';

const ICON = { star: 'star', basket: 'copy', newCard: 'plus' };

function Line({ item }) {
  const who = (
    <Link to={`/u/${item.who.username}`}>{item.who.displayName || item.who.username}</Link>
  );

  if (item.type === 'star') {
    return (
      <>
        {who} starred <Link to={`/c/${item.cardId}`}>{item.cardName}</Link>
      </>
    );
  }
  if (item.type === 'basket') {
    return (
      <>
        {who} put <strong>{item.cardName}</strong>
        {item.alsoCount > 0 ? ` and ${item.alsoCount} more` : ''} in{' '}
        <Link to={`/b/${item.basketId}`}>{item.basketTitle}</Link>
      </>
    );
  }
  return (
    <>
      {who} stocked <Link to={`/c/${item.cardId}`}>{item.cardName}</Link>
    </>
  );
}

/**
 * What happened around this deck since the owner last looked. Marks itself as
 * seen once it has rendered, so the "new" dots clear on the next visit rather
 * than while they are still reading.
 */
export default function ActivityStrip() {
  const { data, loading } = useQuery('activity', Deckr.activity, { ttl: 20 * 1000 });
  const marked = useRef(false);

  useEffect(() => {
    if (!data || marked.current) return;
    marked.current = true;
    Deckr.seenActivity().catch(() => {});
  }, [data]);

  if (loading && !data) return null;

  const items = data?.items || [];
  if (!items.length) {
    return (
      <section className="panel activity">
        <div className="activity__head">
          <h3>While you were away</h3>
        </div>
        <p className="hint">
          Nothing yet. Star a few cards on the <Link to="/community">community shelves</Link> and
          new work from those makers will show up here.
        </p>
      </section>
    );
  }

  return (
    <section className="panel activity">
      <div className="activity__head">
        <h3>While you were away</h3>
        {data.unseen > 0 ? <span className="activity__count">{data.unseen} new</span> : null}
      </div>
      <ul className="activity__list">
        {items.map((item) => (
          <li key={item.id} className={item.isNew ? 'is-new' : ''}>
            <span className="activity__icon" aria-hidden="true">
              <Icon name={ICON[item.type] || 'star'} size={14} strokeWidth={2.6} />
            </span>
            <span className="activity__text">
              <Line item={item} />
            </span>
            <span className="activity__when">{timeAgo(item.at)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
