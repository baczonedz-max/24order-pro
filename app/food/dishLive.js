// Asks the server for a photo of the dish with the customer's changes (made by AI the first time, then cached).
// Results are kept per session so going back and forth is instant.
import { reactive } from 'vue';

const cache = reactive({});

/** Returns a reactive { status: 'pending' | 'ready' | 'none', url? } for these changes ("+12", "-5"…). */
export function liveDish(foodId, img, tokens) {
  if (!foodId || !img || !tokens.length) return null;
  const ch = [...tokens].sort().join(',');
  const k = `${foodId}|${img}|${ch}`;
  if (!cache[k]) {
    cache[k] = { status: 'pending' };
    poll(k, foodId, img, ch, 0);
  }
  return cache[k];
}

async function poll(k, foodId, img, ch, n) {
  try {
    const r = await fetch(`/api/shop/dish?food=${foodId}&img=${encodeURIComponent(img)}&ch=${encodeURIComponent(ch)}`);
    const d = (await r.json())?.data || { status: 'none' };
    cache[k] = d;
    // The first time a photo is made it takes 10–20 s; check every 3 s for up to ~75 s.
    if (d.status === 'pending' && n < 25) setTimeout(() => poll(k, foodId, img, ch, n + 1), 3000);
    else if (d.status === 'pending') cache[k] = { status: 'none' };
  } catch {
    cache[k] = { status: 'none' };
  }
}
