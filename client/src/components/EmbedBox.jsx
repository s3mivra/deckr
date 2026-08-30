import { useState } from 'react';
import Icon from './Icon.jsx';

/**
 * Copyable snippets for putting a card badge in a README. The badge is an SVG
 * served by the API, so it renders inline on GitHub.
 */
export default function EmbedBox({ card }) {
  const [copied, setCopied] = useState('');

  const origin = window.location.origin;
  const img = `${origin}/embed/card/${card.id}.svg`;
  const link = `${origin}/c/${card.id}`;
  const alt = `${card.projectName} on Deckr`;

  const snippets = [
    ['Markdown', `[![${alt}](${img})](${link})`],
    ['HTML', `<a href="${link}"><img src="${img}" alt="${alt}" width="440"></a>`],
  ];

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
