import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} . Deckr` : 'Deckr';
    return () => {
      document.title = 'Deckr';
    };
  }, [title]);
}

export default function RouteEffects() {
  const { pathname } = useLocation();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    setBusy(true);
    const t = setTimeout(() => setBusy(false), 420);
    return () => clearTimeout(t);
  }, [pathname]);

  return <div className={`route-bar ${busy ? 'is-busy' : ''}`} aria-hidden="true" />;
}
