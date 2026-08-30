import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBanner } from '../components/common.jsx';
import QuickStart from '../components/QuickStart.jsx';

const GUIDELINES = [
  'One card per real project. Concepts and forks are fine, just be honest about status.',
  'Star counts and languages come from GitHub. Do not hand edit them to something they are not.',
  'Keep descriptions yours. No scraped marketing copy from someone else.',
  'Be kind in public profiles. Deckr is a place to show work, not to dunk on other people.',
];

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const steps = useMemo(
    () => ['About you', 'Privacy and terms', 'Guidelines', 'Your first card'],
    []
  );

  const finish = async (repo) => {
    setBusy(true);
    setError(null);
    try {
      const { user: updated } = await Deckr.finishOnboarding({
        displayName: displayName.trim(),
        bio: bio.trim(),
        acceptedTerms: true,
      });
      setUser(updated);
      const to =
        typeof repo === 'string' && repo
          ? `/cards/new?repo=${encodeURIComponent(repo)}`
          : '/cards/new';
      navigate(to, { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="center-narrow panel" style={{ padding: 30, marginTop: 24 }}>
      <div className="stat-row" style={{ marginBottom: 18 }}>
        {steps.map((label, i) => (
          <span key={label} className="tag" style={{ background: i === step ? 'var(--accent)' : undefined }}>
            {i + 1}. {label}
          </span>
        ))}
      </div>

      <ErrorBanner error={error} />

      {step === 0 && (
        <>
          <h2>Tell us who you are</h2>
          <label className="field">
            <span>Display name</span>
            <input
              className="input"
              value={displayName}
              maxLength={60}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={user?.githubUsername}
            />
          </label>
          <label className="field">
            <span>Short bio</span>
            <textarea
              className="textarea"
              value={bio}
              maxLength={280}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Backend leaning full stack dev. I like small tools and big tests."
            />
            <span className="hint">{bio.length}/280. A 20 character bio unlocks the Introduced achievement.</span>
          </label>
          <button className="btn" onClick={() => setStep(1)}>
            Next
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <h2>Privacy and terms</h2>
          <p className="hint">
            Deckr stores your GitHub id, handle, avatar, email and the cards you make. It does not sell data,
            run third party trackers or post to GitHub. Your profile is public by default and you can switch it
            to private any time from your deck.
          </p>
          <p className="hint">
            By continuing you agree to use Deckr in line with the community guidelines on the next screen.
          </p>
          <label className="field" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              style={{ width: 20, height: 20, marginTop: 3 }}
            />
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 400 }}>
              I have read the above and I accept the terms.
            </span>
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--ghost" onClick={() => setStep(0)}>
              Back
            </button>
            <button className="btn" disabled={!accepted} onClick={() => setStep(2)}>
              Next
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2>Community guidelines</h2>
          <ul className="hint" style={{ paddingLeft: 20, lineHeight: 1.7 }}>
            {GUIDELINES.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn--ghost" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn" onClick={() => setStep(3)}>
              Got it
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2>Make your first card</h2>
          <p className="hint">
            Last step. We will drop you into the card builder. Paste a GitHub repo and Deckr prefills most of
            the front for you. Finishing your first card unlocks First Draw.
          </p>
          <QuickStart heading="Or start from a repo now" onPick={(slug) => finish(slug)} />
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn--ghost" onClick={() => setStep(2)}>
              Back
            </button>
            <button className="btn btn--lg" disabled={busy} onClick={finish}>
              {busy ? 'Setting up' : 'Open the card builder'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
