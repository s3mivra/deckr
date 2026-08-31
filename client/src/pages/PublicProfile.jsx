import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useQuery } from '../lib/cache.js';
import { useSeo } from '../components/RouteEffects.jsx';
import { ErrorBanner } from '../components/common.jsx';
import { ProfileSkeleton } from '../components/Skeleton.jsx';
import Icon from '../components/Icon.jsx';
import { formatNumber } from '../lib/format.js';
import DeckCard from '../components/DeckCard.jsx';
import DeckPresenter from '../components/DeckPresenter.jsx';

export default function PublicProfile() {
  const { username } = useParams();
  const { data, error, loading } = useQuery(
    `profile:${username}`,
    () => Deckr.publicProfile(username),
    { ttl: 15 * 1000, refetchInterval: 25 * 1000 }
  );
  const [copied, setCopied] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const p = data?.profile;
  useSeo({
    title: p ? p.displayName || p.username : 'Profile',
    description: p
      ? [
          p.openToWork ? `Open to work${p.openToWorkNote ? ` (${p.openToWorkNote})` : ''}.` : '',
          p.bio ||
            `${p.displayName || p.username}'s deck on Deckr: ${data.cards.length} project card${
              data.cards.length === 1 ? '' : 's'
            }.`,
        ]
          .filter(Boolean)
          .join(' ')
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

  const contactHref = profile.contactUrl || profile.websiteUrl || '';

  return (
    <>
      <header className="panel profile-hero" data-ptheme={profile.profileTheme || 'lilac'}>
        <div className="profile-hero__banner" aria-hidden="true" />
        <div className="profile-hero__body">
          <img className="profile-hero__avatar" src={profile.avatarUrl} alt={profile.username} />
          <div className="profile-hero__main">
            <div className="profile-hero__top">
              <div>
                <h1>{profile.displayName || profile.username}</h1>
                <p className="profile-hero__handle">
                  deckr.top/u/{profile.username} &nbsp;&middot;&nbsp;
                  <a href={profile.githubProfileUrl} target="_blank" rel="noreferrer">
                    @{profile.githubUsername}
                  </a>
                </p>
              </div>
              {isOwner ? (
                <Link className="btn btn--sm btn--ghost" to="/dashboard">
                  <Icon name="edit" size={15} /> Edit profile
                </Link>
              ) : null}
            </div>

            {profile.bio ? <p className="profile-hero__bio">{profile.bio}</p> : null}

            {profile.openToWork ? (
              <div className="profile-hero__hire">
                <span className="hire-badge">
                  <Icon name="check" size={13} strokeWidth={2.8} /> Open to work
                  {profile.openToWorkNote ? (
                    <span className="hire-badge__note">{profile.openToWorkNote}</span>
                  ) : null}
                </span>
                {contactHref ? (
                  <a
                    className="btn btn--sm profile-hero__contact"
                    href={contactHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Get in touch
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="profile-hero__stats">
              <div className="pstat">
                <b>{formatNumber(cards.length)}</b>
                <span>{cards.length === 1 ? 'card' : 'cards'}</span>
              </div>
              <div className="pstat">
                <b>{formatNumber(totalLikes)}</b>
                <span>stars</span>
              </div>
              <div className="pstat">
                <b>
                  {achievements.unlocked.length}
                  <em>/{achievements.total}</em>
                </b>
                <span>achievements</span>
              </div>
            </div>

            <div className="profile-hero__links">
              {profile.location ? <span className="ptag">{profile.location}</span> : null}
              {profile.websiteUrl ? (
                <a className="ptag" href={profile.websiteUrl} target="_blank" rel="noreferrer">
                  <Icon name="external" size={13} /> Website
                </a>
              ) : null}
              <button type="button" className="ptag" onClick={copy}>
                <Icon name={copied ? 'check' : 'copy'} size={13} />
                {copied ? 'Link copied' : 'Copy link'}
              </button>
            </div>
          </div>
        </div>
      </header>

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

      <div className="deck-toolbar">
        <h2>The deck</h2>
        {cards.length > 0 ? (
          <div className="deck-toolbar__actions">
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => setPresenting(true)}
            >
              <Icon name="present" size={15} /> Present deck
            </button>
          </div>
        ) : null}
      </div>
      {cards.length === 0 ? (
        <p className="hint">No public cards yet.</p>
      ) : (
        <div className="card-grid">
          {cards.map((card) => (
            <DeckCard key={card.id} card={card} />
          ))}
        </div>
      )}

      {presenting ? (
        <DeckPresenter cards={cards} onClose={() => setPresenting(false)} />
      ) : null}
    </>
  );
}
