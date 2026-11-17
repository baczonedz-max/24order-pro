// Screen config <-> URL hash, so a TV link carries its own settings (no database needed).
export const DEFAULT_CONFIG = {
  source: 'demo',
  restaurant: 'paradis',
  server: '',
  branch: '',
  template: 'fire-grid',
  categories: [1],
  title: '',
  showNumbers: true,
  showDesc: true,
  showFooter: true,
  embers: true,
  accent: '#e11d1d',
  priceColor: '#ffc21a',
  columns: 4,
};

export function encodeConfig(cfg) {
  const bytes = new TextEncoder().encode(JSON.stringify(cfg));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeConfig(str) {
  try {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return { ...DEFAULT_CONFIG, ...JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return null;
  }
}

export async function loadMenu(cfg) {
  const q = new URLSearchParams({ source: cfg.source });
  if (cfg.source === 'demo') q.set('restaurant', cfg.restaurant || 'paradis');
  else {
    if (cfg.server) q.set('server', cfg.server);
    if (cfg.branch) q.set('branche_id', cfg.branch);
  }
  const res = await fetch(`/api/menu?${q}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || `HTTP ${res.status}`);
  return body.data;
}
