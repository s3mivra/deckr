import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useQuery } from '../lib/cache.js';
import { useTitle } from '../components/RouteEffects.jsx';
import { ErrorBanner } from '../components/common.jsx';
import { ProfileSkeleton } from '../components/Skeleton.jsx';
import Tooltip, { IconButton } from '../components/Tooltip.jsx';
import Icon from '../components/Icon.jsx';
import { formatNumber } from '../lib/format.js';
import { useLike } from '../lib/useLike.js';
import FlipCard, { CardZoom } from '../components/FlipCard.jsx';

function ProfileCard({ card, onZoom }) {
  const like = useLike(card);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <FlipCard card={card} like={like} />
      <div style={{ display: 'flex', gap: 8 }}>
        <IconButton label="Zoom in" onClick={() => onZoom(card)}>
          <Icon name="zoom" />
        </IconButton>
        <Tooltip label="Open card page">
          <Link to={`/c/${card.id}`} className="icon-btn" aria-label="Open card page">
            <Icon name="external" />
          </Link>
        </Tooltip>
      </div>
    </div>
  );
}

export default function PublicProfile() {
  const { username } = useParams();
  const { data, error, loading } = useQuery(
    `profile:${username}`,
    () => Deckr.publicProfile(username),
    { ttl: 30 * 1000 }
  );
  const [zoom, setZoom] = useState(null);
  const [copied, setCopied] = useState(false);
  useTitle(data ? data.profile.displayName || data.profile.username : 'Profile');

  if (loading) return <ProfileSkeleton />;
  if (error) return <ErrorBanner error={error} />;

  const { profile, cards, achievements, isOwner } = data;
  const shareUrl = `${window.location.origin}/u/${profile.username}`;
  const totalStars = cards.reduce((s, c) => s + (c.githubStars || 0), 0);

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
            deckr.app/u/{profile.username} .{' '}
            <a href={profile.githubProfileUrl} target="_blank" rel="noreferrer">
              @{profile.githubUsername} on GitHub
            </a>
          </p>
          {profile.bio ? <p style={{ marginTop: 8 }}>{profile.bio}</p> : null}
          <div className="stat-row">
            <span className="tag">{formatNumber(cards.length)} cards</span>
            <span className="tag count-pill">
              <Icon name="star" size={14} /> {formatNumber(totalStars)}
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

      {achievements.showcased.length > 0 ? (
        <section style={{ marginBottom: 32 }}>
          <h2>Showcased</h2>
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
        </section>
      ) : null}

      <h2>The deck</h2>
      {cards.length === 0 ? (
        <p className="hint">No public cards yet.</p>
      ) : (
        <div className="card-grid">
          {cards.map((card) => (
            <ProfileCard key={card.id} card={card} onZoom={setZoom} />
          ))}
        </div>
      )}

      {zoom ? <CardZoom card={zoom} onClose={() => setZoom(null)} /> : null}
    </>
  );
}
