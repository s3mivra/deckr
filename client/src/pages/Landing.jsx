import { Link } from 'react-router-dom';
import FlipCard from '../components/FlipCard.jsx';
import SampleBadge from '../components/SampleBadge.jsx';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTitle } from '../components/RouteEffects.jsx';
import { SAMPLE_CARDS } from '../data/sampleCards.js';

const FEATURES = [
  {
    title: 'Start from a repo',
    body: 'Sign in and Deckr shows your top repos. One tap opens the builder already filled with stars, language and stack.',
  },
  {
    title: 'A card with two sides',
    body: 'Front for the pitch: name, repo, description, tech. Back for the story: build time, status, the hardest bug, what you learned.',
  },
  {
    title: 'Live badge for your README',
    body: 'Drop one line of Markdown in your README. The card renders on GitHub and updates itself whenever you edit it.',
  },
  {
    title: 'Download as an image',
    body: 'Export any card as a crisp 3x PNG for slides, a talk, or a post. No screenshot cropping.',
  },
  {
    title: 'Move at keyboard speed',
    body: 'Cmd or Ctrl K opens a command menu for every page and every card. Press n anywhere to start a new one.',
  },
  {
    title: 'Shelves and baskets',
    body: 'Browse and search every public card in the community aisles, then curate your favourites into a shareable basket.',
  },
];

const STEPS = [
  { n: '1', title: 'Sign in with GitHub', body: 'No passwords. Deckr reads your public profile once and never touches your code.' },
  { n: '2', title: 'Pick a repo', body: 'Choose a packaging and a colour, tweak the story, and your first card is done in a minute.' },
  { n: '3', title: 'Show it off', body: 'Pin it to your profile, paste the badge in your README, or share the card page anywhere.' },
];

export default function Landing() {
  const { user } = useAuth();
  useTitle('');

  return (
    <>
      <section className="hero">
        <div>
          <h1>Trading cards for the things you have built.</h1>
          <p>
            Deckr turns your projects into a deck of collectible cards. Show what you shipped, the stack you
            used and the hardest bug you beat.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            <Link className="btn btn--lg" to={user ? '/dashboard' : '/login'}>
              {user ? 'Open my deck' : 'Sign in with GitHub'}
            </Link>
            <Link className="btn btn--ghost btn--lg" to="/community">
              Browse the shelves
            </Link>
          </div>
          <p className="hint" style={{ marginTop: 14 }}>
            Free, no card details, runs on GitHub sign-in.
          </p>
        </div>
        <div className="hero__cards">
          {SAMPLE_CARDS.slice(0, 2).map((c) => (
            <FlipCard key={c.projectName} card={c} />
          ))}
        </div>
      </section>

      <section className="section pkg-section">
        <h2>Every project gets its own packaging</h2>
        <p className="hint" style={{ maxWidth: '58ch', marginBottom: 30 }}>
          Six formats, ten colourways, one chunky frame. Pick the one that fits the project —
          then tap any card to flip it to the nutrition panel on the back.
        </p>
        <div className="pkg-shelf">
          {SAMPLE_CARDS.map((c) => (
            <figure key={`show-${c.projectName}`} className="pkg-shelf__item">
              <FlipCard card={c} />
              <figcaption className="pkg-tag">
                <span className="pkg-tag__fmt">{c.packaging}</span>
                <span className="pkg-tag__theme">{c.theme}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="readme-promo panel">
          <div className="readme-promo__copy">
            <h2>Then drop it in your README</h2>
            <p className="hint">
              One line of Markdown. The badge is a live image served by Deckr, so it re-renders on GitHub every
              time you update the card. No build step, no action to install.
            </p>
            <code className="readme-promo__snip">
              [![My project on Deckr](https://deckr.top/embed/card/&hellip;.svg)](https://deckr.top/c/&hellip;)
            </code>
          </div>
          <div className="readme-promo__art">
            <SampleBadge />
          </div>
        </div>
      </section>

      <section className="section">
        <h2>What you get</h2>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel feature">
              <h3>{f.title}</h3>
              <p className="hint">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>From zero to a card in a minute</h2>
        <div className="steps">
          {STEPS.map((s) => (
            <div key={s.n} className="panel step">
              <span className="step__num">{s.n}</span>
              <h3>{s.title}</h3>
              <p className="hint">{s.body}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          <Link className="btn btn--lg" to={user ? '/cards/new' : '/login'}>
            <Icon name="plus" /> {user ? 'Build a card' : 'Get started'}
          </Link>
        </div>
      </section>
    </>
  );
}
