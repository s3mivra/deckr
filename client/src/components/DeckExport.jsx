import { useState } from 'react';
import { useToast } from './Toasts.jsx';
import Icon from './Icon.jsx';
import { cardsToMarkdown, downloadText } from '../lib/portfolio.js';

/**
 * Copy or download the deck as a Markdown "Projects" block. Pure client side,
 * public cards only.
 */
export default function DeckExport({ cards }) {
  const { push } = useToast();
  const [copied, setCopied] = useState(false);
  const publicCount = (cards || []).filter((c) => c && c.isPublic !== false).length;
  if (!publicCount) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cardsToMarkdown(cards));
      setCopied(true);
      push(`${publicCount} project${publicCount === 1 ? '' : 's'} copied as Markdown`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      push('Could not copy. Check clipboard permissions.');
    }
  };

  return (
    <div className="deck-export">
      <button type="button" className="btn btn--sm btn--ghost" onClick={copy}>
        <Icon name={copied ? 'check' : 'copy'} size={15} />
        {copied ? 'Copied' : 'Copy as Markdown'}
      </button>
      <button
        type="button"
        className="btn btn--sm btn--ghost"
        onClick={() => downloadText(cardsToMarkdown(cards), 'projects.md')}
      >
        <Icon name="download" size={15} /> Download .md
      </button>
    </div>
  );
}
