// Inline SVG icons used on the TV boards (white or currentColor line art).
const s = (body, vb = '0 0 64 64') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  pizza: s('<path d="M8 14c15-8 33-8 48 0L32 58z"/><path d="M12 20c13-6 27-6 40 0"/><circle cx="26" cy="28" r="3.5"/><circle cx="38" cy="30" r="3"/><circle cx="31" cy="41" r="3"/>'),
  cheese: s('<path d="M6 30l34-18 18 18v20H6z"/><path d="M6 30h52"/><circle cx="18" cy="40" r="3.5"/><circle cx="34" cy="43" r="2.5"/><circle cx="47" cy="38" r="3"/>'),
  sauce: s('<path d="M8 30h48c0 14-10 24-24 24S8 44 8 30z"/><path d="M18 30c2-6 8-9 14-9s12 3 14 9"/><path d="M26 22c2-4 6-6 10-5"/>'),
  salad: s('<path d="M6 32h52c0 13-12 22-26 22S6 45 6 32z"/><path d="M14 32c0-7 5-12 11-12 2-4 6-6 10-5 5 1 7 5 7 8 5 1 8 5 8 9"/><circle cx="24" cy="27" r="2"/><circle cx="38" cy="25" r="2"/>'),
  fries: s('<path d="M16 26h32l-5 30H21z"/><path d="M20 26l-3-16M27 26l-1-19M33 26l1-20M39 26l2-17M45 26l4-13"/>'),
  drink: s('<path d="M18 18h28l-4 38H22z"/><path d="M16 18h32"/><path d="M34 18l6-12h8"/><path d="M20 30h24"/>'),
  burger: s('<path d="M10 28c0-11 10-18 22-18s22 7 22 18z"/><path d="M8 36h48"/><path d="M10 44h44c0 6-4 10-10 10H20c-6 0-10-4-10-10z"/>'),
  kebab: s('<path d="M22 8l20 48"/><rect x="18" y="20" width="22" height="9" rx="4" transform="rotate(-22 29 24)"/><rect x="22" y="32" width="22" height="9" rx="4" transform="rotate(-22 33 36)"/>'),
  chili: s('<path d="M40 14c-2 6-3 10 0 14-10 4-18 14-28 22 14 2 30-4 36-18 2-6 0-12-8-18z"/><path d="M40 14c2-4 6-6 10-6"/>'),
};

// Pick an icon from a category or label name.
export function iconFor(name = '') {
  const n = name.toLowerCase();
  if (/pizza|pizze|calzone/.test(n)) return ICONS.pizza;
  if (/ost|cheese|fromage|جبن/.test(n)) return ICONS.cheese;
  if (/saus|sauce|dressing|صوص/.test(n)) return ICONS.sauce;
  if (/salat|salad|salade|سلط/.test(n)) return ICONS.salad;
  if (/pommes|fries|frites|chips|بطاط/.test(n)) return ICONS.fries;
  if (/drikke|drink|boisson|vann|cola|مشروب/.test(n)) return ICONS.drink;
  if (/burger|برغر/.test(n)) return ICONS.burger;
  if (/kebab|kabab|shawarma|كباب/.test(n)) return ICONS.kebab;
  return ICONS.pizza;
}
