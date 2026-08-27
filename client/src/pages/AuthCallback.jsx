import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from '../components/common.jsx';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = params.get('token');
    const isNew = params.get('new') === 'true';
    if (!token) {
      setError('No sign in token was returned.');
      return;
    }
    loginWithToken(token).then((u) => {
      if (!u) {
        setError('That session could not be verified.');
        return;
      }
      navigate(isNew || !u.onboardingComplete ? '/onboarding' : '/dashboard', { replace: true });
    });
  }, [params, loginWithToken, navigate]);

  if (error) {
    return (
      <div className="center-narrow panel" style={{ padding: 28, marginTop: 40 }}>
        <h2>Sign in problem</h2>
        <p className="hint">{error}</p>
        <button className="btn" onClick={() => navigate('/login', { replace: true })}>
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="center-narrow" style={{ textAlign: 'center', marginTop: 40 }}>
      <Spinner />
      <p className="hint">Shuffling you in</p>
    </div>
  );
}
