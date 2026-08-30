import { useState } from 'react';
import Icon from './Icon.jsx';

// The badge SVG is pure shapes and system-font text with no external refs, so
// it paints onto a canvas without tainting it. Render at 3x for a crisp PNG.
async function svgToPng(svgUrl, scale = 3) {
  const svgText = await fetch(svgUrl).then((r) => {
    if (!r.ok) throw new Error('Could not load the badge');
    return r.text();
  });
  const wrapped = new Blob([svgText], { type: 'image/svg+xml' });
  const blobUrl = URL.createObjectURL(wrapped);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not render the badge'));
      el.src = blobUrl;
    });
    const w = img.naturalWidth || 440;
    const h = img.naturalHeight || 180;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Copyable snippets for putting a card badge in a README. The badge is an SVG
 * served by the API, so it renders inline on GitHub.
 */
export default function EmbedBox({ card }) {
  const [copied, setCopied] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const origin = window.location.origin;
  const img = `${origin}/embed/card/${card.id}.svg`;
  const link = `${origin}/c/${card.id}`;
  const alt = `${card.projectName} on Deckr`;

  const snippets = [
    ['Markdown', `[![${alt}](${img})](${link})`],
    ['HTML', `<a href="${link}"><img src="${img}" alt="${alt}" width="440"></a>`],
  ];

  const slug = (card.projectName || 'card')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'card';

  const download = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const blob = await svgToPng(img);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deckr-${slug}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setSaveError(err.message || 'Could not save the image');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1600);
    } catch {
      /* clipboard blocked, the text is selectable anyway */
    }
  };

  return (
    <section className="panel embed" aria-label="Embed this card">
      <div className="embed__head">
        <h3>Put this card in your README</h3>
        <p className="hint">
          It renders on GitHub and updates itself when you edit the card.
        </p>
      </div>

      <img className="embed__preview" src={img} alt={alt} width="440" loading="lazy" />

      <div className="embed__actions">
        <button type="button" className="btn btn--sm" onClick={download} disabled={saving}>
          <Icon name="external" size={15} />
          {saving ? 'Saving' : 'Download PNG'}
        </button>
        {saveError ? (
          <span className="hint" style={{ color: 'var(--danger-ink)' }}>
            {saveError}
          </span>
        ) : (
          <span className="hint">A 3x image for slides, tweets or your site.</span>
        )}
      </div>

      {snippets.map(([label, text]) => (
        <div className="embed__row" key={label}>
          <span className="embed__label">{label}</span>
          <code className="embed__code">{text}</code>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => copy(label, text)}
            aria-label={`Copy ${label} snippet`}
          >
            <Icon name={copied === label ? 'check' : 'copy'} size={15} />
            {copied === label ? 'Copied' : 'Copy'}
          </button>
        </div>
      ))}
    </section>
  );
}
