// Ber Months 2026 limited-edition packaging.
//
// One festive format per month. A NEW card can only pick a seasonal format
// during its own month in 2026 (parol in September, and so on). A card that
// already carries one keeps rendering and stays editable forever, but once you
// switch a card away from its seasonal format you cannot pick it again.

export const BER_YEAR = 2026;

export const BER_MONTHS = {
  parol: { month: 8, label: 'September', title: 'Parol' },
  giftbox: { month: 9, label: 'October', title: 'Gift box' },
  hamper: { month: 10, label: 'November', title: 'Noche Buena hamper' },
  hamcan: { month: 11, label: 'December', title: 'Christmas ham' },
};

export const SEASONAL_FORMATS = Object.keys(BER_MONTHS);

export function isSeasonal(pkg) {
  return Object.prototype.hasOwnProperty.call(BER_MONTHS, pkg);
}

// The seasonal format a brand-new card is allowed to pick right now, or null.
export function openSeasonalFormat(now = new Date()) {
  if (now.getFullYear() !== BER_YEAR) return null;
  const month = now.getMonth();
  return SEASONAL_FORMATS.find((key) => BER_MONTHS[key].month === month) || null;
}

// Short tag shown on a seasonal card, e.g. "Ber Months 2026".
export function seasonalTag(pkg) {
  return isSeasonal(pkg) ? `Ber Months ${BER_YEAR}` : '';
}
