import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from './Icon.jsx';

const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL || 'https://www.buymeacoffee.com/';
const MAKER_URL = import.meta.env.VITE_MAKER_URL || 'https://semivra.asia';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // close the menu on navigate, on Escape, and on an outside click
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    // attached on the next tick so the click that opened the menu cannot
    // immediately close it again
    const t = setTimeout(() => document.addEventListener('pointerdown', onDown), 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

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

        <div className="navbar__right" data-auth={user ? 'true' : 'false'} ref={wrapRef}>
          <nav id="nav-menu" className={`navbar__links ${open ? 'is-open' : ''}`}>
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
                <NavLink to="/baskets" className="btn btn--ghost">
                  Baskets
                </NavLink>
                <NavLink to="/cards/new" className="btn">
                  New card
                </NavLink>
                {user.isAdmin ? (
                  <NavLink to="/admin" className="btn btn--ghost">
                    Admin
                  </NavLink>
                ) : null}
                <button className="btn btn--ghost" onClick={onLogout}>
                  Sign out
                </button>
              </>
            ) : null}
          </nav>

          {/* kept outside the menu so a small screen still shows it directly,
              next to the three dots */}
          {user ? (
            <NavLink
              to={`/u/${user.username}`}
              className="btn btn--ghost navbar__me"
              title="Your public profile"
            >
              <img src={user.avatarUrl} alt="" />
              <span>{user.username}</span>
            </NavLink>
          ) : (
            <NavLink to="/login" className="btn">
              Sign in
            </NavLink>
          )}

          <button
            type="button"
            className={`navbar__toggle ${open ? 'is-open' : ''}`}
            aria-expanded={open}
            aria-controls="nav-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name="dots" size={22} filled strokeWidth={0} />
          </button>
        </div>
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
        <div className="footer__inner">
          <div className="footer__brand">
            <Link to="/" className="brand">
              <span className="brand__mark" aria-hidden="true" />
              Deckr
            </Link>
            <p>
              Trading cards for the things you have built. Built on the MERN stack. No
              trackers, no ads, no card details.
            </p>
            <a
              className="btn btn--ghost btn--sm coffee"
              href={SUPPORT_URL}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="coffee" size={16} /> Buy me a coffee
            </a>
          </div>

          <nav className="footer__col" aria-label="Explore">
            <h3>Explore</h3>
            <Link to="/community">Community</Link>
            <Link to="/achievements">Achievements</Link>
            <Link to="/baskets">Baskets</Link>
          </nav>

          <nav className="footer__col" aria-label="Build">
            <h3>Build</h3>
            <Link to="/cards/new">New card</Link>
            <Link to="/dashboard">My deck</Link>
            <Link to="/login">Sign in</Link>
          </nav>
        </div>

        <div className="footer__bar">
          <span>© {new Date().getFullYear()} Deckr</span>
          <span>
            Partnered with{' '}
            <a href={MAKER_URL} target="_blank" rel="noreferrer">
              semivra
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
