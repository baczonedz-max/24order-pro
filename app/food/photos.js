// Real ingredient photos: which slots exist, how the AI should shoot each one, where they're stored,
// and in-browser background removal so every photo becomes clean cut-outs that can be layered.
//
// Toppings are shot as FOUR separate pieces in one photo; the browser splits them into four cut-outs
// (top.salami.0 … top.salami.3). Scattering different pieces makes the pizza look like a real one.
import { reactive } from 'vue';
import { api } from '../api.js';

// Plain food-photography wording. (Words like "touch", "loose" or "shot" can trip the AI's safety filter.)
const LIGHT = 'even studio lighting, sharp, realistic food photo, high detail, no plate, no shadows, no text';
const TOPS4 = (what, bg) => `Overhead food photograph of four ${what} placed apart from each other with clear space between them, on a seamless pure ${bg} background, top view, ${LIGHT}`;
const DRIZZLE = (what, bg) => `Overhead food photograph of ${what} drizzled in thin zigzag lines over a round area, on a seamless pure ${bg} background, top view, ${LIGHT}`;
const SIDE = (what, bg) => `Food photograph, side view at eye level of ${what}, horizontal, centered with empty space around it, on a seamless pure ${bg} background, ${LIGHT}`;
const PIZZA = (what) => `Overhead food photograph of ${what}, perfectly round, the whole pizza visible and centered with empty space around it, on a seamless pure white background, ${LIGHT}`;
const SHORT = (what, bg) => `Food photo, top view: ${what} on a plain ${bg} background`;

// [key, label, four separate … (plural), background]
const TOPS = [
  ['cheese', 'Cheese', 'small piles of shredded mozzarella cheese', 'black'],
  ['ham', 'Ham', 'small square slices of pink cooked ham', 'white'],
  ['salami', 'Salami', 'thin round slices of italian salami sausage', 'white'],
  ['pepperoni', 'Pepperoni', 'thin round slices of pepperoni sausage', 'white'],
  ['mushroom', 'Mushroom', 'thin slices of white button mushroom', 'black'],
  ['onion', 'Onion', 'rings of red onion', 'white'],
  ['leek', 'Leek', 'thin rings of green leek', 'white'],
  ['garlic', 'Garlic', 'peeled garlic cloves', 'black'],
  ['pepper', 'Bell pepper', 'strips of red, yellow and green bell pepper', 'white'],
  ['jalapeno', 'Jalapeño', 'round slices of green jalapeño pepper', 'white'],
  ['chili', 'Chili', 'small slices of fresh red chili pepper', 'white'],
  ['olive', 'Olive', 'black olive ring slices', 'white'],
  ['pineapple', 'Pineapple', 'small chunks of pineapple', 'white'],
  ['corn', 'Corn', 'small clusters of sweet corn kernels', 'white'],
  ['meatball', 'Meatball', 'small cooked meatballs', 'white'],
  ['chicken', 'Chicken', 'small cubes of grilled chicken', 'white'],
  ['kebab', 'Kebab meat', 'small piles of sliced doner kebab', 'white'],
  ['beef', 'Minced beef', 'small piles of cooked minced beef crumbles', 'white'],
  ['bacon', 'Bacon', 'short crispy bacon pieces', 'white'],
  ['tomato', 'Tomato', 'round slices of fresh red tomato', 'white'],
  ['pickles', 'Pickles', 'round slices of pickle', 'white'],
  ['lettuce', 'Lettuce', 'small pieces of fresh green lettuce leaf', 'white'],
  ['herbs', 'Herbs', 'small sprigs of fresh dill', 'white'],
  ['fries', 'Fries', 'small bunches of golden french fries', 'white'],
  ['egg', 'Egg', 'small fried eggs', 'black'],
  ['shrimp', 'Shrimp', 'cooked pink prawns', 'white'],
  ['tuna', 'Tuna', 'small flakes of canned tuna', 'white'],
];
// Sauces: one drizzle picture laid across the whole pizza.
const SAUCES = [
  ['sauce_white', 'Garlic / white sauce', 'creamy white garlic sauce', 'black'],
  ['sauce_bbq', 'BBQ sauce', 'dark brown barbecue sauce', 'white'],
  ['sauce_chili', 'Chili sauce', 'red chili sauce', 'white'],
  ['sauce_tomato', 'Tomato sauce', 'red tomato sauce', 'white'],
];
const SIDES = [
  ['bun_top', 'Top bun', 'the top half of a golden sesame seed burger bun', 'white'],
  ['bun_bottom', 'Bottom bun', 'the bottom half of a golden burger bun, cut side up', 'white'],
  ['beef', 'Beef patty', 'one thick juicy grilled beef burger patty', 'white'],
  ['chicken', 'Chicken fillet', 'one crispy golden fried chicken fillet', 'white'],
  ['cheese', 'Cheese slice', 'one slice of melted yellow cheddar cheese, flat, slightly drooping at the edges', 'white'],
  ['lettuce', 'Lettuce', 'a flat layer of fresh green iceberg lettuce leaves', 'white'],
  ['tomato', 'Tomato slices', 'two thick slices of fresh red tomato laid flat side by side', 'white'],
  ['onion', 'Onion rings (raw)', 'thin raw red onion rings laid flat', 'white'],
  ['onion_rings', 'Fried onion rings', 'three crispy fried onion rings laid flat in a row', 'white'],
  ['bacon', 'Bacon', 'two crispy bacon strips laid flat', 'white'],
  ['egg', 'Fried egg', 'one fried egg laid flat', 'black'],
  ['pickles', 'Pickles', 'a row of pickle slices laid flat', 'white'],
  ['jalapeno', 'Jalapeños', 'a row of green jalapeño slices laid flat', 'white'],
  ['fries', 'Fries in a box', 'golden french fries standing in a red paper fries box', 'white'],
  ['sauce_white', 'Garlic sauce layer', 'a thin flat layer of creamy white garlic sauce with small drips hanging down', 'black'],
  ['sauce_bbq', 'BBQ sauce layer', 'a thin flat layer of dark brown barbecue sauce with small drips hanging down', 'white'],
  ['sauce_chili', 'Chili sauce layer', 'a thin flat layer of red chili sauce with small drips hanging down', 'white'],
  ['sauce_tomato', 'Ketchup layer', 'a thin flat layer of red ketchup with small drips hanging down', 'white'],
];

export const SLOTS = [
  { group: 'pizza', items: [
    { key: 'base.pizza', label: 'Pizza (sauce + cheese)', prompt: PIZZA('a whole round pizza with tomato sauce and melted mozzarella cheese, no other toppings'), bg: 'white' },
    { key: 'base.pizza_sauce', label: 'Pizza base with sauce', prompt: PIZZA('a whole round raw pizza dough base with red tomato sauce spread on it, no cheese, no toppings'), bg: 'white' },
    { key: 'base.dough', label: 'Plain pizza crust', prompt: PIZZA('a whole round plain pizza dough base, no sauce, no toppings'), bg: 'white' },
  ] },
  { group: 'toppings', items: [
    ...TOPS.map(([k, label, what, bg]) => ({ key: `top.${k}`, kind: k, label, prompt: TOPS4(what, bg), alt: SHORT(`four ${what}`, bg), bg, parts: 4 })),
    ...SAUCES.map(([k, label, what, bg]) => ({ key: `top.${k}`, kind: k, label, prompt: DRIZZLE(what, bg), alt: SHORT(`zigzag drizzle of ${what}`, bg), bg })),
  ] },
  { group: 'burger', items: SIDES.map(([k, label, what, bg]) => ({ key: `side.${k}`, kind: k, label, prompt: SIDE(what, bg), alt: SHORT(what, bg).replace('top view', 'side view'), bg })) },
];

/* ---------- Index of stored photos ---------- */
export const photos = reactive({ map: {}, loaded: false });

export async function loadPhotos(force = false) {
  if (photos.loaded && !force) return;
  try {
    const rows = (await api('/media')).data;
    photos.map = Object.fromEntries(rows.map((r) => [r.key, r]));
  } catch {}
  photos.loaded = true;
}
export function setPhoto(row) { photos.map = { ...photos.map, [row.key]: row }; }
export function dropPhoto(key) { const m = { ...photos.map }; delete m[key]; photos.map = m; }
const url = (key) => { const r = photos.map[key]; return r ? `/api/media/${key}?v=${encodeURIComponent(r.updated_at)}` : null; };
export const photoUrl = url;
export const photoRow = (key) => photos.map[key] || null;

/** Every stored key of a slot: "top.salami" itself and/or "top.salami.0", "top.salami.1", … */
export function slotKeys(key) {
  return Object.keys(photos.map)
    .filter((k) => k === key || (k.startsWith(key + '.') && /^\d+$/.test(k.slice(key.length + 1))))
    .sort((a, b) => (a === key ? -1 : b === key ? 1 : Number(a.split('.').pop()) - Number(b.split('.').pop())));
}
/** URLs of all piece variants of a slot (empty when there is no photo). */
export const variants = (key) => slotKeys(key).map(url);
export const slotRow = (key) => photos.map[slotKeys(key)[0]] || null;
/** Up to three pieces for an ingredient icon (top view first, then side view). */
export function thumbPile(kind) {
  const top = variants(`top.${kind}`);
  if (top.length) return top.slice(0, 3);
  const side = variants(`side.${kind}`);
  return side.slice(0, 1);
}
export const thumbPhoto = (kind) => thumbPile(kind)[0] || null;

/* ---------- Background removal and splitting ---------- */
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Could not read the image'));
    img.src = src;
  });
}

async function toBlob(canvas) {
  return (await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.9))) || new Promise((r) => canvas.toBlob(r, 'image/png'));
}

/**
 * Turn a photo on a plain background into cut-outs: flood-fill the background from the edges and soften
 * the edge. With parts > 1 every separate item becomes its own cut-out (largest first).
 * Returns [{ blob, w, h }].
 */
export async function cutOut(src, { removeBg = true, max = 900, parts = 1 } = {}) {
  const img = await loadImage(src);
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.round(img.naturalWidth * scale);
  const H = Math.round(img.naturalHeight * scale);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const id = ctx.getImageData(0, 0, W, H);
  const px = id.data;

  if (removeBg) {
    // Background colour = median of the border pixels.
    const border = [];
    for (let x = 0; x < W; x += 2) border.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y += 2) border.push(y * W, y * W + W - 1);
    const med = (ch) => { const v = border.map((i) => px[i * 4 + ch]).sort((a, b) => a - b); return v[v.length >> 1]; };
    const bg = [med(0), med(1), med(2)];
    const dist = (i) => Math.hypot(px[i * 4] - bg[0], px[i * 4 + 1] - bg[1], px[i * 4 + 2] - bg[2]);
    const TOL = 56; // high enough to also drop the faint shadow AI photos leave under items
    const seen = new Uint8Array(W * H);
    const stack = [];
    for (const i of border) if (!seen[i] && dist(i) < TOL) { seen[i] = 1; stack.push(i); }
    while (stack.length) {
      const i = stack.pop();
      const x = i % W, y = (i / W) | 0;
      if (x > 0 && !seen[i - 1] && dist(i - 1) < TOL) { seen[i - 1] = 1; stack.push(i - 1); }
      if (x < W - 1 && !seen[i + 1] && dist(i + 1) < TOL) { seen[i + 1] = 1; stack.push(i + 1); }
      if (y > 0 && !seen[i - W] && dist(i - W) < TOL) { seen[i - W] = 1; stack.push(i - W); }
      if (y < H - 1 && !seen[i + W] && dist(i + W) < TOL) { seen[i + W] = 1; stack.push(i + W); }
    }
    for (let i = 0; i < W * H; i++) {
      // Also clear background-coloured pixels the edge fill can't reach (holes inside rings).
      if (seen[i] || dist(i) < TOL * 0.5) { px[i * 4 + 3] = 0; continue; }
      const x = i % W;
      const touches = (x > 0 && seen[i - 1]) || (x < W - 1 && seen[i + 1]) || seen[i - W] || seen[i + W];
      if (touches) px[i * 4 + 3] = Math.min(255, Math.max(60, ((dist(i) - TOL) / (TOL * 0.8)) * 255));
    }
  }
  ctx.putImageData(id, 0, 0);

  // Find separate items (connected opaque areas).
  const label = new Int32Array(W * H);
  const boxes = [];
  for (let s = 0; s < W * H; s++) {
    if (label[s] || px[s * 4 + 3] <= 24) continue;
    const n = boxes.length + 1;
    const b = { x0: W, y0: H, x1: 0, y1: 0, area: 0, n };
    const st = [s];
    label[s] = n;
    while (st.length) {
      const i = st.pop();
      const x = i % W, y = (i / W) | 0;
      b.area++;
      if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j >= 0 && !label[j] && px[j * 4 + 3] > 24) { label[j] = n; st.push(j); }
      }
    }
    boxes.push(b);
  }
  if (!boxes.length) throw new Error('Nothing left after removing the background');
  boxes.sort((a, b) => b.area - a.area);
  const biggest = boxes[0].area;

  const crop = async (b, only) => {
    const pad = 4;
    const x0 = Math.max(0, b.x0 - pad), y0 = Math.max(0, b.y0 - pad);
    const x1 = Math.min(W - 1, b.x1 + pad), y1 = Math.min(H - 1, b.y1 + pad);
    const out = document.createElement('canvas');
    out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    const o = out.getContext('2d');
    o.drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    if (only) {
      // Keep only this item: clear pixels that belong to neighbours inside the box.
      const d = o.getImageData(0, 0, out.width, out.height);
      for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
        const l = label[(y + y0) * W + (x + x0)];
        if (l && l !== b.n) d.data[(y * out.width + x) * 4 + 3] = 0;
      }
      o.putImageData(d, 0, 0);
    }
    return { blob: await toBlob(out), w: out.width, h: out.height };
  };

  if (parts > 1) {
    // Separate pieces: anything at least 15% of the biggest one (drops crumbs and specks).
    const pieces = boxes.filter((b) => b.area >= biggest * 0.15).slice(0, parts);
    if (pieces.length > 1) return Promise.all(pieces.map((b) => crop(b, true)));
  }
  // One item: crop around everything that is not a speck.
  const keep = boxes.filter((b) => b.area >= biggest * 0.02);
  const all = keep.reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }), { x0: W, y0: H, x1: 0, y1: 0 });
  return [await crop(all, false)];
}

async function putOne(key, { blob, w, h }, source) {
  const res = await fetch(`/api/media/${key}?w=${w}&h=${h}&source=${source}`, { method: 'PUT', headers: { 'content-type': blob.type }, body: blob, credentials: 'same-origin' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Upload failed (${res.status})`);
  setPhoto(json.data);
}

/** Save a slot's cut-outs: one image as "key", several pieces as "key.0", "key.1", … */
export async function saveSlot(slot, cuts, source) {
  const old = slotKeys(slot.key);
  const keys = cuts.length > 1 ? cuts.map((_, i) => `${slot.key}.${i}`) : [slot.key];
  for (let i = 0; i < cuts.length; i++) await putOne(keys[i], cuts[i], source);
  for (const k of old.filter((k) => !keys.includes(k))) await removeKey(k);
}

async function removeKey(key) {
  await api(`/media/${key}`, { method: 'DELETE' });
  dropPhoto(key);
}
export async function removeSlot(slot) {
  for (const k of slotKeys(slot.key)) await removeKey(k);
}

export async function generate(slot) {
  let res;
  try {
    res = await api('/ai/image', { method: 'POST', body: { prompt: slot.prompt } });
  } catch (e) {
    // The AI's safety filter sometimes refuses harmless food words (error 8007): try a shorter prompt.
    if (!slot.alt || !/8007|NSFW/i.test(e.message)) throw e;
    res = await api('/ai/image', { method: 'POST', body: { prompt: slot.alt } });
  }
  return `data:${res.data.mime};base64,${res.data.image}`;
}
