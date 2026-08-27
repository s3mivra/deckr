import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toasts.jsx';
import { useQuery, mutateCache, dropCache } from '../lib/cache.js';
import { useTitle } from '../components/RouteEffects.jsx';
import { ErrorBanner } from '../components/common.jsx';
import { DashboardSkeleton, CardGridSkeleton } from '../components/Skeleton.jsx';
import Tooltip, { IconButton } from '../components/Tooltip.jsx';
import Icon from '../components/Icon.jsx';
import { formatNumber } from '../lib/format.js';
import FlipCard, { CardZoom } from '../components/FlipCard.jsx';

function ProfileEditor() {
  const { user, setUser } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState({
    displayName: user.displayName || '',
    username: user.username,
    bio: user.bio || '',
    location: user.location || '',
    websiteUrl: user.websiteUrl || '',
    isPublic: user.isPublic,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const snapshot = user;
    setUser({ ...user, ...form }); // optimistic
    try {
      const { user: updated } = await Deckr.updateProfile(form);
      setUser(updated);
      push('Profile saved');
    } catch (err) {
      setUser(snapshot); // rollback
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel" style={{ padding: 22 }} onSubmit={save}>
      <h3>Profile</h3>
      <ErrorBanner error={error} />
      <div className="row-2">
        <label className="field">
          <span>Display name</span>
          <input className="input" value={form.displayName} onChange={set('displayName')} maxLength={60} />
        </label>
        <label className="field">
          <span>Username</span>
          <input className="input" value={form.username} onChange={set('username')} minLength={3} maxLength={30} />
        </label>
      </div>
      <label className="field">
        <span>Bio</span>
        <textarea className="textarea" value={form.bio} onChange={set('bio')} maxLength={280} />
        <span className="hint">{form.bio.length}/280</span>
      </label>
      <div className="row-2">
        <label className="field">
          <span>Location</span>
          <input className="input" value={form.location} onChange={set('location')} maxLength={80} />
        </label>
        <label className="field">
          <span>Website</span>
          <input className="input" value={form.websiteUrl} onChange={set('websiteUrl')} maxLength={200} />
        </label>
      </div>
      <label className="field" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input type="checkbox" checked={form.isPublic} onChange={set('isPublic')} style={{ width: 20, height: 20 }} />
        <span style={{ fontWeight: 400, fontFamily: 'var(--font-body)' }}>
          Public profile. Turn off to hide your deck from everyone but you.
        </span>
      </label>
      <button className="btn" disabled={busy}>
        {busy ? 'Saving' : 'Save profile'}
      </button>
    </form>
  );
}

function ShowcasePicker({ unlockedKeys, catalog }) {
  const { user, setUser } = useAuth();
  const { push } = useToast();
  const [selected, setSelected] = useState(user.showcasedAchievements || []);
  const [busy, setBusy] = useState(false);

  const toggle = (key) => {
    setSelected((cur) => {
      if (cur.includes(key)) return cur.filter((k) => k !== key);
      if (cur.length >= 4) return cur;
      return [...cur, key];
    });
  };

  const save = async () => {
    setBusy(true);
    const snapshot = user;
    setUser({ ...user, showcasedAchievements: selected }); // optimistic
    try {
      const { user: updated } = await Deckr.setShowcase(selected);
      setUser(updated);
      dropCache('profile:'); // profile page recomputes the showcased list server side
      dropCache('community');
      push(selected.length ? 'Showcase updated' : 'Showcase cleared');
    } catch (err) {
      setUser(snapshot);
      setSelected(snapshot.showcasedAchievements || []);
      push(err.message);
    } finally {
      setBusy(false);
    }
  };

  const unlocked = catalog.filter((a) => unlockedKeys.includes(a.key));

  return (
    <div className="panel" style={{ padding: 22 }}>
      <h3>Showcase up to 4 achievements</h3>
      {unlocked.length === 0 ? (
        <p className="hint">Nothing unlocked yet. Build a card to get started.</p>
      ) : (
        <>
          <div className="ach-grid">
            {unlocked.map((a) => (
              <button
                key={a.key}
                type="button"
                className={`panel ach ${selected.includes(a.key) ? '' : 'is-locked'}`}
                style={{ cursor: 'var(--cursor-hand)', textAlign: 'left' }}
                onClick={() => toggle(a.key)}
              >
                <span className="ach__tier" data-tier={a.tier}>
                  {a.tier}
                </span>
                <h4>{a.name}</h4>
                <p className="hint">{a.description}</p>
              </button>
            ))}
          </div>
          <button className="btn" style={{ marginTop: 14 }} disabled={busy} onClick={save}>
            {busy ? 'Saving' : `Save showcase (${selected.length}/4)`}
          </button>
        </>
      )}
    </div>
  );
}

function CardRow({ card, onZoom }) {
  const { push } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (!window.confirm('Delete this card? This cannot be undone.')) return;
    setDeleting(true);
    const prev = mutateCache('cards', (d) => ({ cards: (d?.cards || []).filter((c) => c.id !== card.id) }));
    try {
      await Deckr.deleteCard(card.id);
      push('Card deleted');
    } catch (err) {
      mutateCache('cards', () => prev); // best effort rollback
      push(err.message);
      setDeleting(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const { card: fresh } = await Deckr.syncCard(card.id);
      mutateCache('cards', (d) => ({
        cards: (d?.cards || []).map((c) => (c.id === card.id ? fresh : c)),
      }));
      push('Synced from GitHub');
    } catch (err) {
      push(err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'center',
        opacity: deleting ? 0.4 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      <FlipCard card={card} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Tooltip label="Edit card">
          <Link className="icon-btn" to={`/cards/${card.id}/edit`} aria-label="Edit card">
            <Icon name="edit" />
          </Link>
        </Tooltip>
        <IconButton label="Zoom in" onClick={() => onZoom(card)}>
          <Icon name="zoom" />
        </IconButton>
        <IconButton label="Sync stars and language from GitHub" onClick={sync} disabled={syncing}>
          <Icon name="sync" style={syncing ? { animation: 'spin 0.8s linear infinite' } : undefined} />
        </IconButton>
        <IconButton label="Delete card" tone="danger" onClick={remove} disabled={deleting}>
          <Icon name="trash" />
        </IconButton>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {!card.isPublic ? (
          <span className="tag count-pill">
            <Icon name="lock" size={13} /> Private
          </span>
        ) : null}
        <span className="tag count-pill" title="Stars on this card">
          <Icon name="star" size={13} filled={(card.likeCount || 0) > 0} />{' '}
          {formatNumber(card.likeCount || 0)}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, unlocked } = useAuth();
  useTitle('My deck');
  const [zoom, setZoom] = useState(null);

  const cardsQ = useQuery('cards', Deckr.listCards, {
    ttl: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
  const achQ = useQuery('achievements', Deckr.achievements, { persist: true, ttl: 5 * 60 * 1000 });

  const cards = cardsQ.data?.cards;
  const catalog = achQ.data?.achievements || [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My deck</h1>
          <p className="hint">
            Signed in as {user.username}. <Link to={`/u/${user.username}`}>View public profile</Link>
          </p>
        </div>
        <Link className="btn btn--lg" to="/cards/new">
          <Icon name="plus" /> New card
        </Link>
      </div>

      <ErrorBanner error={cardsQ.error} />

      {cardsQ.loading && !cards ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div style={{ display: 'grid', gap: 22, gridTemplateColumns: '1fr', marginBottom: 32 }}>
            <ProfileEditor />
            <ShowcasePicker unlockedKeys={unlocked} catalog={catalog} />
          </div>

          <h2>Cards {cards ? `(${cards.length})` : ''}</h2>
          {!cards ? (
            <CardGridSkeleton count={3} />
          ) : cards.length === 0 ? (
            <div className="panel" style={{ padding: 26 }}>
              <p>No cards yet. Your deck is waiting.</p>
              <Link className="btn" to="/cards/new">
                Build your first card
              </Link>
            </div>
          ) : (
            <div className="card-grid">
              {cards.map((card) => (
                <CardRow key={card.id} card={card} onZoom={setZoom} />
              ))}
            </div>
          )}
        </>
      )}

      {zoom ? <CardZoom card={zoom} onClose={() => setZoom(null)} /> : null}
    </>
  );
}
