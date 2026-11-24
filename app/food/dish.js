// Ready-made photos of a dish with a change already in it (e.g. the burger with melted cheese inside),
// made once per product photo with AI photo editing and shipped in public/img/dish.
// manifest.json: { photos: { "<product photo file name>": { "+cheese": "file.webp", "+cheese -lettuce": "…" } } }
// Keys are the changes, as "+kind" (added) / "-kind" (removed), sorted and joined with a space.
import { reactive } from 'vue';

export const dish = reactive({ map: {}, loaded: false });

let loading;
export function loadDish() {
  loading ||= fetch('/img/dish/manifest.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => { dish.map = j?.photos || {}; })
    .catch(() => {})
    .finally(() => { dish.loaded = true; });
  return loading;
}

const fileOf = (url) => { try { return decodeURIComponent(String(url || '').split('?')[0].split('/').pop()); } catch { return ''; } };

/**
 * The best photo for these changes: the variant that covers the most of them (all of its changes must be wanted).
 * Returns { url, covered } — covered = the changes the photo already shows.
 */
export function dishVariant(image, tokens) {
  const v = dish.map[fileOf(image)];
  if (!v || !tokens.length) return { url: image, covered: [] };
  let best = null;
  for (const [key, file] of Object.entries(v)) {
    const ks = key.split(' ').filter(Boolean);
    if (ks.every((k) => tokens.includes(k)) && (!best || ks.length > best.ks.length)) best = { ks, file };
  }
  return best ? { url: `/img/dish/${best.file}`, covered: best.ks } : { url: image, covered: [] };
}
