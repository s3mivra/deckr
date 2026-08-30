import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useQuery } from '../lib/cache.js';
import { useSeo } from '../components/RouteEffects.jsx';
import { ErrorBanner } from '../components/common.jsx';
import { ProfileSkeleton } from '../components/Skeleton.jsx';
import { IconButton } from '../components/Tooltip.jsx';
import Icon from '../components/Icon.jsx';
import { formatNumber } from '../lib/format.js';
import DeckCard from '../components/DeckCard.jsx';

export default function PublicProfile() {
  const { username } = useParams();
  const { data, error, loading } = useQuery(
    `profile:${username}`,
    () => Deckr.publicProfile(username),
    { ttl: 15 * 1000, refetchInterval: 25 * 1000 }
  );
  const [copied, setCopied] = useState(false);
  const p = data?.profile;
  useSeo({
    title: p ? p.displayName || p.username : 'Profile',
    description: p
      ? p.bio ||
        `${p.displayName || p.username}'s deck on Deckr: ${data.cards.length} project card${
          data.cards.length === 1 ? '' : 's'
        }.`
      : undefined,
    type: 'profile',
    path: p ? `/u/${p.username}` : undefined,
  });

  if (loading) return <ProfileSkeleton />;
  if (error) return <ErrorBanner error={error} />;

  const { profile, cards, achievements, isOwner, baskets } = data;
  const shareUrl = `${window.location.origin}/u/${profile.username}`;
  const totalLikes = cards.reduce((s, c) => s + (c.likeCount || 0), 0);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div className="panel profile-head">
        <img src={profile.avatarUrl} alt={profile.username} />
        <div>
          <h1 style={{ marginBottom: 2 }}>{profile.displayName || profile.username}</h1>
          <p className="hint" style={{ margin: 0 }}>
            {window.location.host}/u/{profile.username} .{' '}
            <a href={profile.githubProfileUrl} target="_blank" rel="noreferrer">
              @{profile.githubUsername} on GitHub
            </a>
          </p>
          {profile.bio ? <p style={{ marginTop: 8 }}>{profile.bio}</p> : null}
          <div className="stat-row">
            <span className="tag">{formatNumber(cards.length)} cards</span>
            <span className="tag count-pill" title="Total stars across all cards">
              <Icon name="star" size={14} filled={totalLikes > 0} /> {formatNumber(totalLikes)}
            </span>
            <span className="tag">
              {achievements.unlocked.length}/{achievements.total} achievements
            </span>
            {profile.location ? <span className="tag">{profile.location}</span> : null}
            {profile.websiteUrl ? (
              <a className="tag" href={profile.websiteUrl} target="_blank" rel="noreferrer">
                Website
              </a>
            ) : null}
            <IconButton label={copied ? 'Copied' : 'Copy share link'} onClick={copy}>
              <Icon name={copied ? 'check' : 'copy'} />
            </IconButton>
          </div>
          {isOwner ? (
            <Link className="btn btn--ghost" style={{ marginTop: 12 }} to="/dashboard">
              Edit my deck
            </Link>
          ) : null}
        </div>
      </div>

      {achievements.showcased.length > 0 || isOwner ? (
        <section style={{ marginBottom: 32 }}>
          <h2>Showcased</h2>
          {achievements.showcased.length > 0 ? (
            <div className="showcase-row">
              {achievements.showcased.map((a) => (
                <div key={a.key} className="panel ach">
                  <span className="ach__tier" data-tier={a.tier}>
                    {a.tier}
                  </span>
                  <h4>{a.name}</h4>
                  <p className="hint">{a.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="hint">
              Nothing showcased yet. Pick up to 4 on your{' '}
              <Link to="/dashboard">dashboard</Link> and press Save showcase.
            </p>
          )}
        </section>
      ) : null}

      {baskets && baskets.length > 0 ? (
        <section style={{ marginBottom: 32 }}>
          <h2>Baskets</h2>
          <div className="basket-list">
            {baskets.map((b) => (
              <Link key={b.id} className="panel basket-row basket-row--link" to={`/b/${b.id}`}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ marginBottom: 4 }}>{b.title}</h3>
                  {b.note ? <p className="hint">{b.note}</p> : null}
                </div>
                <span className="tag" style={{ flexShrink: 0 }}>
                  {b.cardCount} cards
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <h2>The deck</h2>
      {cards.length === 0 ? (
        <p className="hint">No public cards yet.</p>
      ) : (
        <div className="card-grid">
          {cards.map((card) => (
            <DeckCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </>
  );
}
