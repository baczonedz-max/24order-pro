// Real ingredient photos: which slots exist, how the AI should shoot each one, where they're stored,
// and in-browser background removal so every photo becomes a clean cut-out that can be layered.
import { reactive } from 'vue';
import { api } from '../api.js';

const TOP = (what, bg) => `Professional food photography, top-down overhead view of ${what}, isolated on a plain solid ${bg} background, centered, the whole item fully visible with plenty of empty space around it, soft even studio light, sharp focus, photorealistic, high detail, no plate, no board, no cast shadow, no text`;
const SIDE = (what, bg) => `Professional food photography, straight side view at eye level of ${what}, horizontal, isolated on a plain solid ${bg} background, centered, fully visible with plenty of empty space around it, soft even studio light, sharp focus, photorealistic, high detail, no plate, no cast shadow, no text`;
const PIZZA = (what) => `Professional food photography, exact top-down overhead view of ${what}, perfectly round, the entire pizza fully visible and centered with empty space around it, isolated on a plain solid white background, soft even studio light, photorealistic, high detail, no plate, no board, no cast shadow, no text`;

// [key, english label, what to shoot, background]
const TOPS = [
  ['cheese', 'Cheese', 'a small pile of shredded mozzarella cheese', 'black'],
  ['sauce_tomato', 'Tomato sauce', 'a small round dollop of red tomato pizza sauce', 'white'],
  ['sauce_white', 'Garlic / white sauce', 'a small round dollop of creamy white garlic sauce', 'black'],
  ['sauce_bbq', 'BBQ sauce', 'a small round dollop of dark brown barbecue sauce', 'white'],
  ['sauce_chili', 'Chili sauce', 'a small round dollop of red chili sauce', 'white'],
  ['ham', 'Ham', 'one square slice of cooked ham', 'white'],
  ['salami', 'Salami', 'one round slice of salami', 'white'],
  ['pepperoni', 'Pepperoni', 'one round slice of pepperoni', 'white'],
  ['mushroom', 'Mushroom', 'one thin slice of white button mushroom', 'black'],
  ['onion', 'Onion', 'one ring of red onion', 'white'],
  ['leek', 'Leek', 'one thin ring of green leek', 'white'],
  ['garlic', 'Garlic', 'one peeled garlic clove', 'black'],
  ['pepper', 'Bell pepper', 'three strips of red, yellow and green bell pepper', 'white'],
  ['jalapeno', 'Jalapeño', 'one round slice of green jalapeño pepper', 'white'],
  ['chili', 'Chili', 'one small fresh red chili pepper', 'white'],
  ['olive', 'Olive', 'one black olive ring slice', 'white'],
  ['pineapple', 'Pineapple', 'one small chunk of pineapple', 'white'],
  ['corn', 'Corn', 'a small cluster of sweet corn kernels', 'white'],
  ['meatball', 'Meatball', 'one small cooked meatball', 'white'],
  ['chicken', 'Chicken', 'one piece of grilled chicken breast', 'white'],
  ['kebab', 'Kebab meat', 'a few thin strips of doner kebab meat', 'white'],
  ['beef', 'Minced beef', 'a small piece of cooked seasoned minced beef', 'white'],
  ['bacon', 'Bacon', 'one crispy bacon strip', 'white'],
  ['tomato', 'Tomato', 'one round slice of fresh red tomato', 'white'],
  ['pickles', 'Pickles', 'one round slice of pickle', 'white'],
  ['lettuce', 'Lettuce', 'one fresh green lettuce leaf', 'white'],
  ['herbs', 'Herbs', 'a small sprig of fresh dill', 'white'],
  ['fries', 'Fries', 'a few golden french fries', 'white'],
  ['egg', 'Egg', 'one fried egg', 'black'],
  ['shrimp', 'Shrimp', 'one cooked pink shrimp', 'white'],
  ['tuna', 'Tuna', 'a few flakes of canned tuna', 'white'],
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
];

export const SLOTS = [
  { group: 'pizza', items: [
    { key: 'base.pizza', label: 'Pizza (sauce + cheese)', prompt: PIZZA('a whole round pizza with tomato sauce and melted mozzarella cheese, no other toppings'), bg: 'white' },
    { key: 'base.pizza_sauce', label: 'Pizza base with sauce', prompt: PIZZA('a whole round pizza base with red tomato sauce spread on it, no cheese, no toppings'), bg: 'white' },
    { key: 'base.dough', label: 'Plain pizza crust', prompt: PIZZA('a whole round baked plain pizza crust, no sauce, no toppings'), bg: 'white' },
  ] },
  { group: 'toppings', items: TOPS.map(([k, label, what, bg]) => ({ key: `top.${k}`, label, prompt: TOP(what, bg), bg })) },
  { group: 'burger', items: SIDES.map(([k, label, what, bg]) => ({ key: `side.${k}`, label, prompt: SIDE(what, bg), bg })) },
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
export const photoUrl = (key) => { const r = photos.map[key]; return r ? `/api/media/${key}?v=${encodeURIComponent(r.updated_at)}` : null; };
export const photoRow = (key) => photos.map[key] || null;
export const thumbPhoto = (kind) => photoUrl(`top.${kind}`) || photoUrl(`side.${kind}`);

/* ---------- Background removal ---------- */
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('Could not read the image'));
    img.src = src;
  });
}

/**
 * Turn a photo on a plain background into a cut-out: flood-fill the background from the edges,
 * soften the edge, crop to the item. Returns { blob, w, h, url }.
 */
export async function cutOut(src, { removeBg = true, max = 768 } = {}) {
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
    const TOL = 50; // high enough to also drop the faint shadow AI photos leave under items
    const seen = new Uint8Array(W * H);
    const stack = [];
    for (const i of border) if (!seen[i] && dist(i) < TOL) { seen[i] = 1; stack.push(i); }
    while (stack.length) {
      const i = stack.pop();
      const x = i % W, y = (i / W) | 0;
      const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
      for (const j of nb) if (j >= 0 && !seen[j] && dist(j) < TOL) { seen[j] = 1; stack.push(j); }
    }
    for (let i = 0; i < W * H; i++) {
      if (seen[i]) { px[i * 4 + 3] = 0; continue; }
      // Soften pixels that touch the background and are close to its colour.
      const x = i % W;
      const touches = (x > 0 && seen[i - 1]) || (x < W - 1 && seen[i + 1]) || seen[i - W] || seen[i + W];
      if (touches) px[i * 4 + 3] = Math.min(255, Math.max(60, ((dist(i) - TOL) / (TOL * 0.8)) * 255));
    }
  }

  // Crop to the visible item with a small margin.
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) throw new Error('Nothing left after removing the background');
  ctx.putImageData(id, 0, 0);
  const pad = 4;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  const blob = await new Promise((r) => out.toBlob(r, 'image/webp', 0.9)) || await new Promise((r) => out.toBlob(r, 'image/png'));
  return { blob, w: out.width, h: out.height, url: URL.createObjectURL(blob) };
}

export async function savePhoto(key, { blob, w, h }, source) {
  const res = await fetch(`/api/media/${key}?w=${w}&h=${h}&source=${source}`, { method: 'PUT', headers: { 'content-type': blob.type }, body: blob, credentials: 'same-origin' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || json.message || `Upload failed (${res.status})`);
  setPhoto(json.data);
  return json.data;
}

export async function generate(slot) {
  const { image, mime } = (await api('/ai/image', { method: 'POST', body: { prompt: slot.prompt } })).data;
  return `data:${mime};base64,${image}`;
}
