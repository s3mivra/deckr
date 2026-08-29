import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'Deckr';
const DEFAULT_DESC =
  'Deckr turns your projects into collectible trading cards. Show what you shipped, the stack you used and the story behind it.';

function setMeta(selector, attr, value) {
  let el = document.head.querySelector(selector);
  if (!value) {
    if (el && el.dataset.seo) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    const [, name] = selector.match(/\[(?:name|property)="([^"]+)"\]/) || [];
    if (selector.includes('property=')) el.setAttribute('property', name);
    else el.setAttribute('name', name);
    el.dataset.seo = 'true';
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!href) {
    if (el && el.dataset.seo) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    el.dataset.seo = 'true';
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Per-route SEO. Sets title, description, canonical, Open Graph and Twitter
 * tags, and a robots directive. Googlebot renders the SPA and picks these up.
 */
export function useSeo({ title, description, image, noindex, type = 'website', path } = {}) {
  useEffect(() => {
    const desc = description || DEFAULT_DESC;
    const url = `${window.location.origin}${path || window.location.pathname}`;
    const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · trading cards for the things you have built`;
    const img = image || `${window.location.origin}/og.png`;

    document.title = fullTitle;
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('meta[name="robots"]', 'content', noindex ? 'noindex, nofollow' : 'index, follow');
    setLink('canonical', url);

    setMeta('meta[property="og:site_name"]', 'content', SITE_NAME);
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:type"]', 'content', type);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[property="og:image"]', 'content', img);

    setMeta('meta[name="twitter:card"]', 'content', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'content', fullTitle);
    setMeta('meta[name="twitter:description"]', 'content', desc);
    setMeta('meta[name="twitter:image"]', 'content', img);

    return () => {
      document.title = SITE_NAME;
    };
  }, [title, description, image, noindex, type, path]);
}

// kept for existing call sites
export function useTitle(title) {
  useSeo({ title });
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
