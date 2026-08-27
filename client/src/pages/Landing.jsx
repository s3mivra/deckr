import { Link } from 'react-router-dom';
import FlipCard from '../components/FlipCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTitle } from '../components/RouteEffects.jsx';
import { SAMPLE_CARDS } from '../data/sampleCards.js';

const FEATURES = [
  { title: 'Build a card', body: 'One card per project. Front for the pitch, back for the story behind it.' },
  { title: 'Pull from GitHub', body: 'Paste a repo and Deckr fills in stars, language and stack for you.' },
  { title: 'Flip and zoom', body: 'Every card flips with a springy animation and zooms to full size.' },
  { title: 'Five themes', body: 'Lilac, mint, butter, peach and sky. Same chunky frame, different tint.' },
  { title: 'Earn achievements', body: 'Two dozen of them, from First Draw to Very Meta. Showcase four on your profile.' },
  { title: 'Share your deck', body: 'A public profile at deckr.app/u/yourname. Private mode if you would rather not.' },
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
            <Link className="btn btn--ghost btn--lg" to="/achievements">
              See achievements
            </Link>
          </div>
        </div>
        <div className="hero__cards">
          {SAMPLE_CARDS.map((c) => (
            <FlipCard key={c.projectName} card={c} />
          ))}
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

      <section className="section panel" style={{ padding: 28 }}>
        <h2>How a card works</h2>
        <p className="hint" style={{ maxWidth: '60ch' }}>
          The front carries the project name, its GitHub repo, a short description and the tech stack. Flip it
          and the back holds build time, solo or team, status, star count, why you built it, the hardest part,
          what you learned, plus links to the repo and a live site.
        </p>
      </section>
    </>
  );
}
