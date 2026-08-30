/**
 * A static stand-in for the README badge, drawn in the same Cute-alism style as
 * the real one from /embed/card/:id.svg. Pure shapes and system-font text so it
 * matches how the badge renders on GitHub.
 */
const FONT = 'Verdana,DejaVu Sans,Geneva,sans-serif';
const MONO = "'DejaVu Sans Mono',Consolas,Menlo,monospace";

export default function SampleBadge() {
  const W = 440;
  const H = 206;
  const BW = W - 12;
  const BH = H - 12;
  const ink = '#211a2b';
  const pastel = '#d5e8ff';
  const themeInk = '#235b9e';

  return (
    <svg
      className="sample-badge"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Example Deckr README badge for a project called Tidepool"
    >
      <rect x="8" y="8" width={BW} height={BH} rx="16" fill="#1b1626" />
      <clipPath id="sbclip">
        <rect x="2" y="2" width={BW} height={BH} rx="16" />
      </clipPath>
      <g clipPath="url(#sbclip)">
        <rect x="2" y="2" width={BW} height={BH} fill="#fffdf8" />
        <rect x="2" y="2" width={BW} height="34" fill={pastel} />
        <rect x="2" y="33.5" width={BW} height="2.5" fill={ink} />

        <text x="18" y="22" fontFamily={FONT} fontSize="11" fontWeight="bold" letterSpacing="2.5" fill={ink}>
          DECKR
        </text>
        <text x={W - 22} y="22" fontFamily={FONT} fontSize="10" fill={ink} opacity="0.72" textAnchor="end">
          ana/tidepool
        </text>

        <rect x="18" y="46" width="52" height="52" rx="14" fill={pastel} stroke={ink} strokeWidth="2" />
        <text x="44" y="77" fontFamily={FONT} fontSize="15" fontWeight="bold" fill={themeInk} textAnchor="middle">
          TIDE
        </text>

        <rect x="349" y="47" width="73" height="19" rx="9.5" fill="#c6efd6" stroke={ink} strokeWidth="2" />
        <text x="385.5" y="60" fontFamily={FONT} fontSize="9" fontWeight="bold" letterSpacing="0.6" fill="#15643a" textAnchor="middle">
          LIVE
        </text>

        <text x="82" y="64" fontFamily={FONT} fontSize="22" fontWeight="bold" fill={ink}>
          Tidepool
        </text>

        <circle cx="86" cy="79.5" r="4" fill="#3178c6" stroke={ink} strokeWidth="1.2" />
        <text x="96" y="83" fontFamily={FONT} fontSize="10.5" fill={themeInk}>
          TypeScript &#183; by Ana &#183; 3 weekends
        </text>
        <g transform="translate(334, 72)">
          <path d="M7 0.6 8.85 4.55 13.3 5.05 10 8.05 10.95 12.45 7 10.2 3.05 12.45 4 8.05 0.7 5.05 5.15 4.55Z" fill={themeInk} />
          <text x="18" y="11" fontFamily={FONT} fontSize="10.5" fontWeight="bold" fill={themeInk}>128</text>
          <path d="M6.4 11.5C6.4 11.5 0.8 7.7 0.8 3.9 0.8 1.7 2.7 0.5 4.4 1.15 5.3 1.5 6 2.35 6.4 3.2 6.8 2.35 7.5 1.5 8.4 1.15 10.1 0.5 12 1.7 12 3.9 12 7.7 6.4 11.5 6.4 11.5Z" transform="translate(45,0.5)" fill="#d6437f" />
          <text x="61" y="11" fontFamily={FONT} fontSize="10.5" fontWeight="bold" fill={themeInk}>37</text>
        </g>

        <text x="18" y="112" fontFamily={FONT} fontSize="11.5" fill={themeInk}>
          A tiny local-first note app that syncs over your own
        </text>
        <text x="18" y="127" fontFamily={FONT} fontSize="11.5" fill={themeInk}>
          storage. Works on a plane with no wifi.
        </text>

        {[
          ['React', 18, 58],
          ['IndexedDB', 82, 82],
          ['Vite', 170, 46],
          ['CRDT', 222, 52],
        ].map(([label, x, w]) => (
          <g key={label}>
            <rect x={x} y="141" width={w} height="20" rx="10" fill="#fffdf8" stroke={ink} strokeWidth="2" />
            <text x={x + w / 2} y="155" fontFamily={FONT} fontSize="10" fontWeight="bold" fill={ink} textAnchor="middle">
              {label}
            </text>
          </g>
        ))}

        <path d="M18 180 H422" stroke={ink} strokeWidth="1.2" strokeDasharray="2 3" opacity="0.5" />
        <g opacity="0.7">
          {[18, 22, 27, 31, 36, 42, 46, 51, 57, 61, 66, 72].map((x, i) => (
            <rect key={i} x={x} y="184" width={i % 2 ? 2 : 1} height="9" fill={ink} />
          ))}
        </g>
        <text x="90" y="191" fontFamily={MONO} fontSize="8.5" letterSpacing="1" fill={themeInk} opacity="0.8">
          LOT 7F0A21
        </text>
        <text x={W - 18} y="191" fontFamily={FONT} fontSize="9.5" fontWeight="bold" fill={ink} textAnchor="end">
          open on deckr  &#8250;
        </text>
      </g>
      <rect x="2" y="2" width={BW} height={BH} rx="16" fill="none" stroke={ink} strokeWidth="3" />
    </svg>
  );
}
