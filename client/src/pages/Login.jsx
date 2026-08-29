import { Navigate, useSearchParams } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSeo } from '../components/RouteEffects.jsx';

const ERROR_COPY = {
  missing_code: 'GitHub did not send an authorization code. Try again.',
  bad_state: 'That sign in link expired. Start again.',
  github_error: 'GitHub would not talk to us. Try again in a minute.',
};

export default function Login() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const error = params.get('error');

  useSeo({ title: 'Sign in', noindex: true });

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="center-narrow panel" style={{ padding: 32, marginTop: 40 }}>
      <h1>Sign in</h1>
      <p className="hint">
        Deckr uses GitHub to sign you in. It reads your public profile and verified email so it can pull stars
        and languages onto your cards. Nothing is posted on your behalf.
      </p>

      {error ? <div className="error-banner">{ERROR_COPY[error] || 'Sign in failed. Try again.'}</div> : null}

      <a className="btn btn--lg" href={Deckr.githubLoginUrl()} style={{ marginTop: 12 }}>
        Continue with GitHub
      </a>

      <p className="hint" style={{ marginTop: 20 }}>
        Your username is set from your GitHub handle at first sign in. You can change it later in your profile.
      </p>
    </div>
  );
}
