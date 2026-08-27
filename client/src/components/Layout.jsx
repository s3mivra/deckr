import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Tooltip from './Tooltip.jsx';
import Icon from './Icon.jsx';

const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL || 'https://www.buymeacoffee.com/';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="brand">
          <span className="brand__mark" aria-hidden="true" />
          Deckr
        </Link>
        <nav className="navbar__links">
          <NavLink to="/community" className="btn btn--ghost">
            Community
          </NavLink>
          <NavLink to="/achievements" className="btn btn--ghost">
            Achievements
          </NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard" className="btn btn--ghost">
                My deck
              </NavLink>
              <NavLink to="/cards/new" className="btn">
                New card
              </NavLink>
              <Tooltip label="Your public profile" side="bottom">
                <Link to={`/u/${user.username}`} aria-label="Your public profile">
                  <img className="navbar__avatar" src={user.avatarUrl} alt={user.username} />
                </Link>
              </Tooltip>
              <button className="btn btn--ghost" onClick={onLogout}>
                Sign out
              </button>
            </>
          ) : (
            <NavLink to="/login" className="btn">
              Sign in
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

export default function Layout({ children }) {
  const { pathname } = useLocation();
  return (
    <div className="app-shell">
      <Navbar />
      <main className="page">
        <div className="container page-fade" key={pathname}>
          {children}
        </div>
      </main>
      <footer className="footer">
        <span>Deckr. Built with the MERN stack, deployed for free. No trackers.</span>
        <a className="btn btn--ghost btn--sm coffee" href={SUPPORT_URL} target="_blank" rel="noreferrer">
          <Icon name="coffee" size={16} /> Buy me a coffee
        </a>
      </footer>
    </div>
  );
}
