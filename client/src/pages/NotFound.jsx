import { Link } from 'react-router-dom';
import { useSeo } from '../components/RouteEffects.jsx';

export default function NotFound() {
  useSeo({ title: 'Not found', noindex: true });
  return (
    <div className="center-narrow panel" style={{ padding: 32, marginTop: 40, textAlign: 'center' }}>
      <h1>Card not in the deck</h1>
      <p className="hint">That page does not exist, or it was shuffled away.</p>
      <Link className="btn" to="/">
        Back to the top
      </Link>
    </div>
  );
}
