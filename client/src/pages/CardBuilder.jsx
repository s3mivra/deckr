import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useToast } from '../components/Toasts.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { dropCache, invalidate } from '../lib/cache.js';
import { useSeo } from '../components/RouteEffects.jsx';
import { Spinner, ErrorBanner } from '../components/common.jsx';
import Tooltip from '../components/Tooltip.jsx';
import ChipInput from '../components/ChipInput.jsx';
import Select from '../components/Select.jsx';
import NumberField from '../components/NumberField.jsx';
import Combobox from '../components/Combobox.jsx';
import FlipCard from '../components/FlipCard.jsx';
import Receipt from '../components/Receipt.jsx';
import { deriveAppCode } from '../lib/format.js';
import { BER_YEAR, BER_MONTHS, isSeasonal, openSeasonalFormat } from '../lib/seasonal.js';

const THEMES = [
  'butter',
  'lilac',
  'mint',
  'peach',
  'sky',
  'bubblegum',
  'grape',
  'tangerine',
  'berry',
  'charcoal',
];
const STATUSES = ['idea', 'in-progress', 'shipped', 'live', 'archived'];
const PACKAGING = [
  ['bag', 'Bag'],
  ['carton', 'Carton'],
  ['cereal', 'Cereal box'],
  ['jar', 'Jar'],
  ['can', 'Can'],
  ['box', 'Software box'],
  ['tin', 'Tin'],
];

const BUILD_TIME_HINTS = [
  'A weekend',
  'A few days',
  '1 week',
  '2 weeks',
  '1 month',
  '3 months',
  '6 months',
  'Over a year',
  'Still building',
];

const LANGUAGE_HINTS = [
  'JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'C#', 'C++', 'C',
  'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart', 'Elixir', 'Scala', 'HTML', 'CSS', 'Shell',
];

const TECH_HINTS = [
  'React', 'Vue', 'Svelte', 'Next.js', 'Node', 'Express', 'Fastify', 'MongoDB',
  'PostgreSQL', 'Redis', 'Prisma', 'GraphQL', 'Vite', 'Tailwind', 'Docker',
  'AWS', 'Vercel', 'Jest', 'Playwright', 'Zod',
];

// single source of truth for input limits, kept in step with the server
export const LIMITS = {
  projectName: 40,
  appCode: 5,
  repoName: 60,
  description: 140,
  tech: 24,
  techCount: 10,
  buildTime: 32,
  primaryLanguage: 24,
  whyBuilt: 160,
  hardestPart: 160,
  whatLearned: 160,
  repoUrl: 200,
  portfolioUrl: 200,
  githubStars: 10_000_000,
};

const EMPTY = {
  projectName: '',
  appCode: '',
  packaging: 'bag',
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

// fields that count toward "card completeness"
const SCORED = [
  'projectName', 'repoName', 'description', 'techStack', 'buildTime',
  'primaryLanguage', 'whyBuilt', 'hardestPart', 'whatLearned', 'repoUrl', 'portfolioUrl',
];

function isFilled(form, key) {
  const v = form[key];
  if (Array.isArray(v)) return v.length > 0;
  return Boolean(String(v || '').trim());
}

function Counter({ value, max }) {
  const len = (value || '').length;
  const ratio = len / max;
  const tone = len > max ? 'var(--danger-ink)' : ratio > 0.9 ? 'var(--butter-ink)' : undefined;
  return (
    <span className="hint" style={{ color: tone }}>
      {len}/{max}
    </span>
  );
}

function CompletenessMeter({ form }) {
  const done = SCORED.filter((k) => isFilled(form, k)).length;
  const pct = Math.round((done / SCORED.length) * 100);
  return (
    <div className="meter panel">
      <div className="meter__head">
        <strong>Card completeness</strong>
        <span>
          {done}/{SCORED.length} {pct === 100 ? '. Perfectionist ready' : ''}
        </span>
      </div>
      <div className="meter__track">
        <div className="meter__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Section({ title, note, children }) {
  return (
    <div className="panel builder-section">
      <span className="builder-section__ribbon">{title}</span>
      {note ? <p className="hint" style={{ marginTop: 6 }}>{note}</p> : null}
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}

export default function CardBuilder({ mode }) {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(mode === 'edit');
  const [busy, setBusy] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [repoLookup, setRepoLookup] = useState('');
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(false);
  const [receipt, setReceipt] = useState(null);
  useSeo({ title: mode === 'edit' ? 'Edit card' : 'Build a card', noindex: true });

  useEffect(() => {
    if (mode !== 'edit') return;
    Deckr.getCard(id)
      .then(({ card }) => setForm({ ...EMPTY, ...card, techStack: card.techStack || [] }))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [mode, id]);

  // arriving from a "quick start" repo pick: prefill straight away
  useEffect(() => {
    if (mode === 'edit') return;
    const repo = params.get('repo');
    if (!repo) return;
    setRepoLookup(repo);
    prefill(repo);
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setText = (k, max) => (e) => {
    const v = e.target.value.slice(0, max);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const setRaw = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
  };
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const card = useMemo(
    () => ({ ...form, ownerWebsite: user?.websiteUrl || '' }),
    [form, user]
  );

  // Ber Months: the seasonal format pickable this month (if any), plus one the
  // card may already carry from a past month so an edit keeps showing it.
  const openFmt = useMemo(() => openSeasonalFormat(), []);
  const seasonalChoices = useMemo(() => {
    const set = new Set();
    if (openFmt) set.add(openFmt);
    if (isSeasonal(form.packaging)) set.add(form.packaging);
    return [...set];
  }, [openFmt, form.packaging]);

  const urlBad = (v) => v && !/^https?:\/\/\S+$/i.test(v);
  const invalid = !form.projectName.trim() || urlBad(form.repoUrl) || urlBad(form.portfolioUrl);

  const prefill = async (repoArg) => {
    const repo = (typeof repoArg === 'string' ? repoArg : repoLookup).trim();
    if (!repo) return;
    setPrefilling(true);
    setError(null);
    try {
      const { prefill: p } = await Deckr.prefill(repo);
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
        appCode: f.appCode || deriveAppCode((p.repoName || '').split('/').pop() || f.projectName),
        techStack:
          f.techStack.length || !p.techStack?.length
            ? f.techStack
            : p.techStack.slice(0, LIMITS.techCount).map((t) => t.slice(0, LIMITS.tech)),
      }));
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
    const payload = { ...form, githubStars: Number(form.githubStars) || 0 };
    try {
      const res =
        mode === 'edit' ? await Deckr.updateCard(id, payload) : await Deckr.createCard(payload);
      (res.newlyUnlocked || []).forEach((k) => push(`Achievement unlocked: ${k}`));
      dropCache('cards');
      dropCache(`card:${id}`);
      dropCache('community');
      invalidate('achievements');
      if (user?.username) dropCache(`profile:${user.username}`);
      // the receipt prints, and closing it takes you back to the deck
      setReceipt(res.card || payload);
      setBusy(false);
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
          <CompletenessMeter form={form} />

          <Section title="Prefill from GitHub" note="Paste a repo and Deckr fills in what it can.">
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
          </Section>

          <Section title="Front">
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
              <span>App code</span>
              <input
                className="input"
                style={{ maxWidth: 170 }}
                maxLength={LIMITS.appCode}
                value={form.appCode}
                onChange={(e) =>
                  setField(
                    'appCode',
                    e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, LIMITS.appCode)
                  )
                }
                placeholder={deriveAppCode(form.projectName)}
              />
              <span className="hint">Shown on the card badge. Blank uses the project's initials.</span>
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
            <div className="field">
              <span>Tech stack</span>
              <ChipInput
                values={form.techStack}
                onChange={(v) => setField('techStack', v)}
                max={LIMITS.techCount}
                maxLength={LIMITS.tech}
                placeholder="React, then Enter"
                suggestions={TECH_HINTS}
              />
            </div>
            <div className="field">
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
                      style={{
                        background: 'var(--pastel)',
                        borderColor: 'var(--card-ink)',
                        boxShadow: '3px 3px 0 var(--card-ink)',
                      }}
                      onClick={() => setField('theme', t)}
                    />
                  </Tooltip>
                ))}
              </div>
              {isSeasonal(form.packaging) ? (
                <span className="hint" style={{ display: 'block', marginTop: 8 }}>
                  Ber Months designs use their own festive colours. Your pick here applies if you
                  switch back to a year-round packet.
                </span>
              ) : null}
            </div>
            <div className="field">
              <span>Packaging</span>
              <div className="pkg-picker">
                {PACKAGING.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={form.packaging === value}
                    className={`btn btn--sm ${form.packaging === value ? '' : 'btn--ghost'}`}
                    onClick={() => setField('packaging', value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {seasonalChoices.length ? (
                <div className="pkg-picker pkg-picker--season">
                  {seasonalChoices.map((value) => {
                    const m = BER_MONTHS[value];
                    const kept = value !== openFmt;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={form.packaging === value}
                        className={`btn btn--sm pkg-season ${
                          form.packaging === value ? '' : 'btn--ghost'
                        }`}
                        onClick={() => setField('packaging', value)}
                      >
                        {m.title}
                        <span className="pkg-season__mo">{kept ? 'kept' : m.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <span className="hint" style={{ display: 'block', marginTop: 10 }}>
                {openFmt ? (
                  <>
                    The packet style. Same fields, different label design.{' '}
                    <strong>Ber Months {BER_YEAR}:</strong> the {BER_MONTHS[openFmt].title} is only
                    pickable in {BER_MONTHS[openFmt].label}. Once your card uses it, it stays yours
                    for good.
                  </>
                ) : isSeasonal(form.packaging) ? (
                  <>
                    This card carries a Ber Months {BER_YEAR} design. Switch away and you will not be
                    able to pick it again.
                  </>
                ) : (
                  'The packet style. Same fields, different label design.'
                )}
              </span>
            </div>
          </Section>

          <Section title="Back">
            <div className="row-2">
              <label className="field">
                <span>Build time</span>
                <Combobox
                  value={form.buildTime}
                  onChange={(v) => setField('buildTime', v.slice(0, LIMITS.buildTime))}
                  options={BUILD_TIME_HINTS}
                  maxLength={LIMITS.buildTime}
                  placeholder="2 weeks"
                />
              </label>
              <div className="field">
                <span>Team or solo</span>
                <Select
                  aria-label="Team or solo"
                  value={form.teamType}
                  onChange={(v) => setField('teamType', v)}
                  options={[
                    { value: 'solo', label: 'Solo' },
                    { value: 'team', label: 'Team' },
                  ]}
                />
              </div>
            </div>
            {form.teamType === 'team' ? (
              <label className="field">
                <span>Team size (optional)</span>
                <NumberField
                  min={1}
                  max={200}
                  value={form.teamSize ?? ''}
                  onChange={(n) => setField('teamSize', n)}
                  placeholder="3"
                />
                <span className="hint">Shows as "Team (3 devs)" on the card back.</span>
              </label>
            ) : null}
            <div className="row-2">
              <div className="field">
                <span>Status</span>
                <Select
                  aria-label="Status"
                  value={form.status}
                  onChange={(v) => setField('status', v)}
                  options={STATUSES.map((s) => ({
                    value: s,
                    label: s.replace(/(^|-)([a-z])/g, (_, d, c) => (d ? ' ' : '') + c.toUpperCase()),
                  }))}
                />
              </div>
              <label className="field">
                <span>GitHub stars</span>
                <NumberField
                  min={0}
                  max={LIMITS.githubStars}
                  step={1}
                  value={form.githubStars}
                  onChange={(n) => setField('githubStars', n ?? 0)}
                />
              </label>
            </div>
            <label className="field">
              <span>Main language</span>
              <Combobox
                value={form.primaryLanguage}
                onChange={(v) => setField('primaryLanguage', v.slice(0, LIMITS.primaryLanguage))}
                options={LANGUAGE_HINTS}
                maxLength={LIMITS.primaryLanguage}
              />
            </label>
            {['whyBuilt', 'hardestPart', 'whatLearned'].map((k) => (
              <label className="field" key={k}>
                <span>
                  {k === 'whyBuilt'
                    ? 'Why I built it'
                    : k === 'hardestPart'
                      ? 'Hardest part'
                      : 'What I learned'}
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
                {urlBad(form.repoUrl) ? (
                  <span className="hint" style={{ color: 'var(--danger-ink)' }}>
                    Must start with http or https
                  </span>
                ) : null}
              </label>
              <label className="field">
                <span>Portfolio or live site</span>
                <input
                  className="input"
                  maxLength={LIMITS.portfolioUrl}
                  value={form.portfolioUrl}
                  onChange={setText('portfolioUrl', LIMITS.portfolioUrl)}
                  placeholder="https://example.com"
                  style={
                    urlBad(form.portfolioUrl) ? { borderColor: 'var(--danger-ink)' } : undefined
                  }
                />
                {urlBad(form.portfolioUrl) ? (
                  <span className="hint" style={{ color: 'var(--danger-ink)' }}>
                    Must start with http or https
                  </span>
                ) : null}
              </label>
            </div>
            <label className="field check-row">
              <input type="checkbox" checked={form.isPublic} onChange={setRaw('isPublic')} />
              <span>Show this card on my public profile</span>
            </label>
          </Section>

          <button className="btn btn--lg" disabled={busy || invalid}>
            {busy ? 'Saving' : mode === 'edit' ? 'Save card' : 'Create card'}
          </button>
        </form>

        <div className="builder-preview">
          <FlipCard card={card} flipped={preview} onToggle={setPreview} />
          <span className="hint">Live preview. Click the card to flip.</span>
        </div>
      </div>

      {receipt ? (
        <Receipt card={receipt} mode={mode} onClose={() => navigate('/dashboard')} />
      ) : null}
    </>
  );
}
