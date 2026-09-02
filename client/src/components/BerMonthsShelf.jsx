import FlipCard from './FlipCard.jsx';
import Icon from './Icon.jsx';
import { SEASONAL_SAMPLE_CARDS } from '../data/sampleCards.js';
import { BER_YEAR, BER_MONTHS, SEASONAL_FORMATS, openSeasonalFormat } from '../lib/seasonal.js';

// state of one monthly edition relative to now
function editionState(fmt, open, now) {
  const m = BER_MONTHS[fmt];
  const past =
    now.getFullYear() > BER_YEAR || (now.getFullYear() === BER_YEAR && now.getMonth() > m.month);
  if (past) return 'closed';
  if (fmt === open) return 'open';
  return 'soon';
}

const STATE_LABEL = { open: 'Open now', soon: 'Locked', closed: 'Closed' };

export default function BerMonthsShelf({ heading = true }) {
  const open = openSeasonalFormat();
  const now = new Date();

  return (
    <div className="berm">
      {heading ? (
        <div className="berm__head">
          <span className="berm__kicker">Ber Months {BER_YEAR}</span>
          <h2>Exclusive this ber months</h2>
          <p className="hint" style={{ maxWidth: '60ch' }}>
            Four festive formats, one for each ber month, {BER_YEAR} only. Pick a month&apos;s design
            while it is open and it stays on your card for good. Miss the window and it is gone.
          </p>
        </div>
      ) : null}

      <div className="berm__grid">
        {SEASONAL_FORMATS.map((fmt) => {
          const m = BER_MONTHS[fmt];
          const card = SEASONAL_SAMPLE_CARDS.find((c) => c.packaging === fmt);
          const state = editionState(fmt, open, now);
          return (
            <figure key={fmt} className="berm__item" data-state={state}>
              <div className="berm__card">
                <FlipCard card={card} />
                {state !== 'open' ? (
                  <span className="berm__lock" aria-hidden="true">
                    <Icon name={state === 'closed' ? 'check' : 'lock'} size={18} strokeWidth={2.6} />
                  </span>
                ) : null}
              </div>
              <figcaption className="berm__tag" data-state={state}>
                <span className="berm__mo">{m.label}</span>
                <span className="berm__state">{STATE_LABEL[state]}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
