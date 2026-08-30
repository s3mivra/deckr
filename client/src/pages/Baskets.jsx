import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useQuery, dropCache } from '../lib/cache.js';
import { useSeo } from '../components/RouteEffects.jsx';
import { useToast } from '../components/Toasts.jsx';
import { ErrorBanner, Spinner } from '../components/common.jsx';
import Icon from '../components/Icon.jsx';

const MAX_CARDS = 12;
const LIMITS = { title: 60, note: 200 };
const EMPTY = { title: '', note: '', cards: [], isPublic: true };

/** Compact row used to tick cards into a basket. */
function PickRow({ card, checked, disabled, onToggle }) {
  return (
    <label className={`pick ${checked ? 'is-on' : ''} ${disabled ? 'is-off' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(card.id)}
      />
      <span className="pick__body">
        <strong>{card.projectName}</strong>
        <span className="hint">
          {card.owner?.displayName || card.owner?.username}
          {card.primaryLanguage ? ` · ${card.primaryLanguage}` : ''}
        </span>
      </span>
    </label>
  );
}

function Editor({ initial, pickable, busy, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  const full = form.cards.length >= MAX_CARDS;

  const toggle = (id) =>
    setForm((f) => {
      if (f.cards.includes(id)) return { ...f, cards: f.cards.filter((c) => c !== id) };
      if (f.cards.length >= MAX_CARDS) return f;
      return { ...f, cards: [...f.cards, id] };
    });

  return (
    <form
      className="panel builder-section"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <span className="builder-section__ribbon">{initial.id ? 'Edit basket' : 'New basket'}</span>

      <label className="field" style={{ marginTop: 14 }}>
        <span>Title</span>
        <input
          className="input"
          required
          maxLength={LIMITS.title}
          value={form.title}
          placeholder="Six tiny tools I actually use"
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, LIMITS.title) }))}
        />
        <span className="hint">
          {form.title.length}/{LIMITS.title}
        </span>
      </label>

      <label className="field">
        <span>Note</span>
        <textarea
          className="textarea"
          maxLength={LIMITS.note}
          value={form.note}
          placeholder="Why these belong together."
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value.slice(0, LIMITS.note) }))}
        />
        <span className="hint">
          {form.note.length}/{LIMITS.note}
        </span>
      </label>

      <div className="field">
        <span>
          Cards ({form.cards.length}/{MAX_CARDS})
        </span>
        {pickable.length === 0 ? (
          <p className="hint">
            Nothing to pick yet. Star cards on the <Link to="/community">community shelves</Link> and
            they show up here.
          </p>
        ) : (
          <div className="pick-list">
            {pickable.map((c) => (
              <PickRow
                key={c.id}
                card={c}
                checked={form.cards.includes(c.id)}
                disabled={full && !form.cards.includes(c.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        )}
      </div>

      <label className="field check-row">
        <input
          type="checkbox"
          checked={form.isPublic}
          onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
        />
        <span>Show this basket on my public profile</span>
      </label>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn" disabled={busy || !form.title.trim()}>
          {busy ? 'Saving' : initial.id ? 'Save basket' : 'Create basket'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Baskets() {
  useSeo({ title: 'My baskets', noindex: true });
  const { push } = useToast();
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [pickable, setPickable] = useState([]);

  const basketsQ = useQuery('baskets', Deckr.myBaskets, { ttl: 15 * 1000 });

  useEffect(() => {
    Deckr.pickableCards()
      .then((d) => setPickable(d.cards))
      .catch(() => setPickable([]));
  }, []);

  const baskets = basketsQ.data?.baskets;

  const save = async (form) => {
    setBusy(true);
    setError(null);
    try {
      const body = {
        title: form.title,
        note: form.note,
        cards: form.cards,
        isPublic: form.isPublic,
      };
      const res = form.id
        ? await Deckr.updateBasket(form.id, body)
        : await Deckr.createBasket(body);
      push(form.id ? 'Basket saved' : 'Basket stacked');
      (res.newlyUnlocked || []).forEach((k) => push(`Achievement unlocked: ${k}`));
      dropCache('baskets');
      dropCache('profile:');
      basketsQ.refetch();
      setEditing(null);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`Delete "${b.title}"? This cannot be undone.`)) return;
    try {
      await Deckr.deleteBasket(b.id);
      push('Basket emptied');
      dropCache('baskets');
      dropCache('profile:');
      basketsQ.refetch();
    } catch (err) {
      push(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>My baskets</h1>
          <p className="hint">
            Fill a basket with cards by anyone and share it. Star a card and it lands here to pick
            from.
          </p>
        </div>
        {!editing ? (
          <button className="btn btn--lg" onClick={() => setEditing({ ...EMPTY })}>
            <Icon name="plus" /> New basket
          </button>
        ) : null}
      </div>

      <ErrorBanner error={error || basketsQ.error} />

      {editing ? (
        <Editor
          initial={editing}
          pickable={pickable}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      ) : null}

      {basketsQ.loading && !baskets ? (
        <Spinner />
      ) : !baskets?.length ? (
        !editing ? (
          <div className="panel" style={{ padding: 26 }}>
            <p>No baskets yet. A basket is a short list of cards you rate, built by anyone.</p>
            <button className="btn" onClick={() => setEditing({ ...EMPTY })}>
              Stack your first basket
            </button>
          </div>
        ) : null
      ) : (
        <div className="basket-list">
          {baskets.map((b) => (
            <div key={b.id} className="panel basket-row">
              <div style={{ minWidth: 0 }}>
                <h3 style={{ marginBottom: 4 }}>
                  <Link to={`/b/${b.id}`}>{b.title}</Link>
                </h3>
                {b.note ? <p className="hint">{b.note}</p> : null}
                <div className="stat-row">
                  <span className="tag">{b.cardCount} cards</span>
                  {!b.isPublic ? (
                    <span className="tag count-pill">
                      <Icon name="lock" size={13} /> Private
                    </span>
                  ) : null}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() =>
                    setEditing({
                      id: b.id,
                      title: b.title,
                      note: b.note || '',
                      cards: (b.cards || []).map(String),
                      isPublic: b.isPublic,
                    })
                  }
                >
                  Edit
                </button>
                <button className="btn btn--danger btn--sm" onClick={() => remove(b)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
