import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useToast } from '../components/Toasts.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { dropCache, invalidate } from '../lib/cache.js';
import { useTitle } from '../components/RouteEffects.jsx';
import { Spinner, ErrorBanner } from '../components/common.jsx';
import Tooltip from '../components/Tooltip.jsx';
import FlipCard from '../components/FlipCard.jsx';

const THEMES = ['butter', 'lilac', 'mint', 'peach', 'sky'];
const STATUSES = ['idea', 'in-progress', 'shipped', 'live', 'archived'];

// single source of truth for input limits, kept in step with the server
export const LIMITS = {
  projectName: 40,
  repoName: 60,
  description: 160,
  tech: 24,
  techCount: 10,
  buildTime: 40,
  primaryLanguage: 30,
  whyBuilt: 180,
  hardestPart: 180,
  whatLearned: 180,
  repoUrl: 200,
  portfolioUrl: 200,
  githubStars: 10_000_000,
};

const EMPTY = {
  projectName: '',
  repoName: '',
  description: '',
  techStack: [],
  theme: 'butter',
  buildTime: '',
  teamType: 'solo',
  teamSize: null,
  status: 'in-progress',
  githubStars: 0,
  primaryLanguage: '',
  whyBuilt: '',
  hardestPart: '',
  whatLearned: '',
  repoUrl: '',
  portfolioUrl: '',
  isPublic: true,
};

function Counter({ value, max }) {
  const len = (value || '').length;
  const over = len > max;
  return (
    <span className="hint" style={{ color: over ? 'var(--danger-ink)' : undefined }}>
      {len}/{max}
    </span>
  );
}

export default function CardBuilder({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [stackText, setStackText] = useState('');
  const [loading, setLoading] = useState(mode === 'edit');
  const [busy, setBusy] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [repoLookup, setRepoLookup] = useState('');
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(false);
  useTitle(mode === 'edit' ? 'Edit card' : 'Build a card');

  useEffect(() => {
    if (mode !== 'edit') return;
    Deckr.getCard(id)
      .then(({ card }) => {
        setForm({ ...EMPTY, ...card });
        setStackText((card.techStack || []).join(', '));
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [mode, id]);

  const setText = (k, max) => (e) => {
    const v = e.target.value.slice(0, max);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const setRaw = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
  };
  const setStars = (e) => {
    const n = Math.max(0, Math.min(LIMITS.githubStars, Math.floor(Number(e.target.value) || 0)));
    setForm((f) => ({ ...f, githubStars: n }));
  };

  const parseStack = (text) =>
    text
      .split(',')
      .map((s) => s.trim().slice(0, LIMITS.tech))
      .filter(Boolean)
      .slice(0, LIMITS.techCount);

  const stack = parseStack(stackText);
  const card = useMemo(
    () => ({ ...form, techStack: stack, ownerWebsite: user?.websiteUrl || '' }),
    [form, stackText, user]
  );

  const urlBad = (v) => v && !/^https?:\/\/\S+$/i.test(v);
  const invalid =
    !form.projectName.trim() || urlBad(form.repoUrl) || urlBad(form.portfolioUrl);

  const prefill = async () => {
    if (!repoLookup.trim()) return;
    setPrefilling(true);
    setError(null);
    try {
      const { prefill: p } = await Deckr.prefill(repoLookup.trim());
      setForm((f) => ({
        ...f,
        repoName: (p.repoName || f.repoName).slice(0, LIMITS.repoName),
        description: (f.description || p.description || '').slice(0, LIMITS.description),
        githubStars: p.githubStars ?? f.githubStars,
        primaryLanguage: (p.primaryLanguage || f.primaryLanguage).slice(0, LIMITS.primaryLanguage),
        repoUrl: (p.repoUrl || f.repoUrl).slice(0, LIMITS.repoUrl),
        portfolioUrl: (f.portfolioUrl || p.portfolioUrl || '').slice(0, LIMITS.portfolioUrl),
        projectName:
          f.projectName || (p.repoName || '').split('/').pop()?.slice(0, LIMITS.projectName) || '',
      }));
      if (p.techStack?.length) {
        setStackText(p.techStack.slice(0, LIMITS.techCount).join(', '));
      }
      push('Prefilled from GitHub');
    } catch (err) {
      setError(err);
    } finally {
      setPrefilling(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (invalid) {
      setError({ message: 'Fix the highlighted fields first.' });
      return;
    }
    setBusy(true);
    setError(null);
    const payload = { ...form, techStack: stack, githubStars: Number(form.githubStars) || 0 };
    try {
      const res =
        mode === 'edit' ? await Deckr.updateCard(id, payload) : await Deckr.createCard(payload);
      push(mode === 'edit' ? 'Card saved' : 'Card created');
      (res.newlyUnlocked || []).forEach((k) => push(`Achievement unlocked: ${k}`));
      dropCache('cards');
      dropCache(`card:${id}`);
      invalidate('achievements');
      if (user?.username) dropCache(`profile:${user.username}`);
      navigate('/dashboard');
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <div className="page-head">
        <h1>{mode === 'edit' ? 'Edit card' : 'Build a card'}</h1>
        <button className="btn btn--ghost" onClick={() => setPreview((p) => !p)}>
          {preview ? 'Show front' : 'Preview back'}
        </button>
      </div>

      <ErrorBanner error={error} />

      <div className="builder-grid">
        <form onSubmit={submit}>
          <div className="panel" style={{ padding: 20, marginBottom: 20 }}>
            <h3>Prefill from GitHub</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ flex: 1, minWidth: 200 }}
                placeholder="owner/repo or a github.com URL"
                value={repoLookup}
                maxLength={200}
                onChange={(e) => setRepoLookup(e.target.value)}
              />
              <button type="button" className="btn" disabled={prefilling} onClick={prefill}>
                {prefilling ? 'Looking' : 'Prefill'}
              </button>
            </div>
          </div>

          <div className="panel" style={{ padding: 20, marginBottom: 20 }}>
            <h3>Front</h3>
            <label className="field">
              <span>Project name</span>
              <input
                className="input"
                required
                maxLength={LIMITS.projectName}
                value={form.projectName}
                onChange={setText('projectName', LIMITS.projectName)}
              />
              <Counter value={form.projectName} max={LIMITS.projectName} />
            </label>
            <label className="field">
              <span>GitHub repo name</span>
              <input
                className="input"
                maxLength={LIMITS.repoName}
                value={form.repoName}
                onChange={setText('repoName', LIMITS.repoName)}
                placeholder="owner/project"
              />
              <Counter value={form.repoName} max={LIMITS.repoName} />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                className="textarea"
                maxLength={LIMITS.description}
                value={form.description}
                onChange={setText('description', LIMITS.description)}
              />
              <Counter value={form.description} max={LIMITS.description} />
            </label>
            <label className="field">
              <span>Tech stack</span>
              <input
                className="input"
                value={stackText}
                onChange={(e) => setStackText(e.target.value)}
                placeholder="React, Node, MongoDB, Vite"
              />
              <span className="hint">
                Comma separated. {stack.length}/{LIMITS.techCount} shown, {LIMITS.tech} chars each.
              </span>
            </label>
            <label className="field">
              <span>Theme</span>
              <div className="theme-swatches">
                {THEMES.map((t) => (
                  <Tooltip key={t} label={t[0].toUpperCase() + t.slice(1)}>
                    <button
                      type="button"
                      aria-label={`${t} theme`}
                      aria-pressed={form.theme === t}
                      className={`theme-swatch card-theme ${form.theme === t ? 'is-active' : ''}`}
                      data-theme={t}
                      style={{ background: `var(--${t})` }}
                      onClick={() => setForm((f) => ({ ...f, theme: t }))}
                    />
                  </Tooltip>
                ))}
              </div>
            </label>
          </div>

          <div className="panel" style={{ padding: 20, marginBottom: 20 }}>
            <h3>Back</h3>
            <div className="row-2">
              <label className="field">
                <span>Build time</span>
                <input
                  className="input"
                  maxLength={LIMITS.buildTime}
                  value={form.buildTime}
                  onChange={setText('buildTime', LIMITS.buildTime)}
                  placeholder="2 weeks"
                />
              </label>
              <label className="field">
                <span>Team or solo</span>
                <select className="select" value={form.teamType} onChange={setRaw('teamType')}>
                  <option value="solo">Solo</option>
                  <option value="team">Team</option>
                </select>
              </label>
            </div>
            {form.teamType === 'team' ? (
              <label className="field">
                <span>Team size (optional)</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={200}
                  value={form.teamSize ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      teamSize: e.target.value ? Math.min(200, Math.max(1, Math.floor(Number(e.target.value)))) : null,
                    }))
                  }
                  placeholder="3"
                />
                <span className="hint">Shows as "Team (3 devs)" on the card back.</span>
              </label>
            ) : null}
            <div className="row-2">
              <label className="field">
                <span>Status</span>
                <select className="select" value={form.status} onChange={setRaw('status')}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>GitHub stars</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={LIMITS.githubStars}
                  value={form.githubStars}
                  onChange={setStars}
                />
              </label>
            </div>
            <label className="field">
              <span>Main language</span>
              <input
                className="input"
                maxLength={LIMITS.primaryLanguage}
                value={form.primaryLanguage}
                onChange={setText('primaryLanguage', LIMITS.primaryLanguage)}
              />
            </label>
            {['whyBuilt', 'hardestPart', 'whatLearned'].map((k) => (
              <label className="field" key={k}>
                <span>
                  {k === 'whyBuilt' ? 'Why I built it' : k === 'hardestPart' ? 'Hardest part' : 'What I learned'}
                </span>
                <textarea
                  className="textarea"
                  maxLength={LIMITS[k]}
                  value={form[k]}
                  onChange={setText(k, LIMITS[k])}
                />
                <Counter value={form[k]} max={LIMITS[k]} />
              </label>
            ))}
            <div className="row-2">
              <label className="field">
                <span>Repo URL</span>
                <input
                  className="input"
                  maxLength={LIMITS.repoUrl}
                  value={form.repoUrl}
                  onChange={setText('repoUrl', LIMITS.repoUrl)}
                  placeholder="https://github.com/owner/project"
                  style={urlBad(form.repoUrl) ? { borderColor: 'var(--danger-ink)' } : undefined}
                />
                {urlBad(form.repoUrl) ? <span className="hint" style={{ color: 'var(--danger-ink)' }}>Must start with http or https</span> : null}
              </label>
              <label className="field">
                <span>Portfolio or live site</span>
                <input
                  className="input"
                  maxLength={LIMITS.portfolioUrl}
                  value={form.portfolioUrl}
                  onChange={setText('portfolioUrl', LIMITS.portfolioUrl)}
                  placeholder="https://example.com"
                  style={urlBad(form.portfolioUrl) ? { borderColor: 'var(--danger-ink)' } : undefined}
                />
                {urlBad(form.portfolioUrl) ? <span className="hint" style={{ color: 'var(--danger-ink)' }}>Must start with http or https</span> : null}
              </label>
            </div>
            <label className="field" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="checkbox" checked={form.isPublic} onChange={setRaw('isPublic')} style={{ width: 20, height: 20 }} />
              <span style={{ fontWeight: 400, fontFamily: 'var(--font-body)' }}>Show this card on my public profile</span>
            </label>
          </div>

          <button className="btn btn--lg" disabled={busy || invalid}>
            {busy ? 'Saving' : mode === 'edit' ? 'Save card' : 'Create card'}
          </button>
        </form>

        <div className="builder-preview">
          <FlipCard card={card} flipped={preview} onToggle={setPreview} />
          <span className="hint">Live preview. Click the card to flip.</span>
        </div>
      </div>
    </>
  );
}
