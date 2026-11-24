<script setup>
// The live picture in the product builder, made only from real photos:
// - pizza: a photo of the base, with photo cut-outs of each topping dropped on top
// - burger: photo layers (bun, patty, cheese, lettuce…) stacked one by one
// - anything else, or when photos are missing: the product's own photo with its ingredients around it.
// No drawings: an ingredient without a photo is shown as a label, never as a cartoon.
import { computed, ref, watch, nextTick, onMounted } from 'vue';
import { scatter, isSauce, rng } from './art.js';
import { photoUrl, photoRow, thumbPhoto, variants } from './photos.js';
import { loadDish, dishVariant } from './dish.js';
import { liveDish } from './dishLive.js';
import { t } from '../i18n.js';

const props = defineProps({
  mode: { type: String, default: 'photo' }, // wanted mode: pizza | burger | photo
  image: { type: String, default: '' },
  // Every ingredient of the product: { id, name, kind, base: bool, on: bool }
  items: { type: Array, default: () => [] },
  // Set by the builder when an ingredient is added: { id, x, y } = screen point of the tapped button.
  // That ingredient's pieces fly from there onto the pizza.
  fly: { type: Object, default: null },
  // True while the "oven" effect plays after "Add to cart".
  baking: { type: Boolean, default: false },
  // Pizza size: 1 = the biggest size; smaller sizes draw a smaller pizza (e.g. Medium ≈ .8).
  scale: { type: Number, default: 1 },
  // The product id: lets the server make (once) and return a photo of the dish with the changes in it.
  foodId: { type: Number, default: 0 },
});
const svg = ref(null);

const on = computed(() => props.items.filter((i) => i.on));
// When the builder opens, the dish is built step by step (like the video); later changes animate at once.
const intro = ref(true);
onMounted(() => { loadDish(); setTimeout(() => (intro.value = false), 2600); });
const STEP = 300;
const has = (kind) => props.items.some((i) => i.kind === kind && i.base);
const isOn = (kind) => on.value.some((i) => i.kind === kind);

/* ---------- Pizza ---------- */
const sauceOn = computed(() => (has('sauce_tomato') ? on.value.some((i) => i.kind === 'sauce_tomato' && i.base) : true));
const cheeseOn = computed(() => (has('cheese') ? on.value.some((i) => i.kind === 'cheese' && i.base) : true));
// Base photos: the baked pizza (sauce + melted cheese), the raw base with sauce, and the plain crust.
// The baked photo holds both sauce and cheese, so it is shown only when both are on;
// without sauce the crust gets melted cheese pieces instead (a "white" pizza), without cheese the sauced base.
const bakedBase = computed(() => photoUrl('base.pizza'));
const rawBase = computed(() => (sauceOn.value ? photoUrl('base.pizza_sauce') : photoUrl('base.dough')) || photoUrl('base.pizza_sauce'));
const showBaked = computed(() => !!bakedBase.value && ((cheeseOn.value && sauceOn.value) || !rawBase.value));
const basePhoto = computed(() => bakedBase.value || rawBase.value);
const cheesePieces = computed(() => variants('top.cheese'));
const whiteCheese = computed(() => cheeseOn.value && !showBaked.value && cheesePieces.value.length > 0);
// The product's own photo (the real baked pizza) is always the picture: extras are baked onto it, and
// removed ingredients are listed under it by the builder. A pizza is only assembled from the ingredient
// library when the product has no photo of its own.
const usePhoto = computed(() => props.mode === 'pizza' && !!props.image);
// Taking something off a pizza can't be drawn: the server makes a photo of this pizza without it (once, then cached).
const pizzaLive = computed(() => {
  if (!usePhoto.value) return null;
  const toks = props.items.filter((i) => i.base && !i.on).slice(0, 3).map((i) => '-' + i.id);
  return liveDish(props.foodId, props.image, toks);
});
const pizzaPhoto = computed(() => (pizzaLive.value?.status === 'ready' ? pizzaLive.value.url : props.image));

// Sauce colours for the drizzle: body, darker edge, gloss.
const SAUCE = {
  sauce_white: ['#f4ecd6', '#cdbf9c', '#ffffff'],
  sauce_bbq: ['#5c2615', '#341209', '#b06a4c'],
  sauce_chili: ['#d2421d', '#952b10', '#ff9f7f'],
  sauce_tomato: ['#c63a1d', '#8a240f', '#ff8d6e'],
};
/** One line of sauce across the pizza at height y (radius r), like one pass of a squeeze bottle:
    a gentle wave, plus small pools where the bottle slowed down at the turns. */
function stripePath(y, amp, seed, r) {
  const half = Math.sqrt(Math.max(0, r * r - y * y)) * 0.88;
  const R = rng(seed);
  const n = Math.max(4, Math.round(half / 6.5));
  const pts = [];
  for (let k = 0; k <= n; k++) pts.push([-half + (k * 2 * half) / n + (R() - 0.5) * 2, y + (k % 2 ? -1 : 1) * amp * (0.5 + R() * 0.5)]);
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1];
    const [x1, y1] = pts[k];
    // Hand-poured zigzag: quick turns, straight runs between them.
    const dx = x1 - x0;
    d += ` C${(x0 + dx * 0.3).toFixed(1)} ${y0.toFixed(1)} ${(x1 - dx * 0.3).toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  // A little pool where the bottle started and stopped.
  const dots = [{ x: pts[0][0], y: pts[0][1], r: 1.8 }, { x: pts[n][0], y: pts[n][1], r: 1.5 }];
  return { d, dots };
}
// Sauces never cross: they all run the same way and take turns line by line
// (garlic, tomato, garlic, tomato…), with more space between neighbours than a line is wide.
const SAUCE_TILT = -22;
const sauces = computed(() => {
  const list = on.value.filter((i) => isSauce(i.kind) && !(i.kind === 'sauce_tomato' && i.base));
  const S = list.length;
  if (!S) return [];
  const per = S === 1 ? 6 : S === 2 ? 4 : 3;
  const T = per * S;
  const r = 78;
  const gap = (2 * r) / (T + 1);
  const amp = Math.min(4.6, gap * 0.28);
  return list.map((i, k) => ({
    id: i.id,
    c: SAUCE[i.kind] || SAUCE.sauce_white,
    // A real photo of the sauce (from the ingredient library) gives each line its texture, gloss and colour.
    tex: variants(`top.${i.kind}`)[i.id % Math.max(1, variants(`top.${i.kind}`).length)] || null,
    lines: Array.from({ length: per }, (_, j) => stripePath(-r + gap * (j * S + k + 1), amp, i.id * 13 + j, r)),
  }));
});
// Piece sizes (in pizza units; the pizza is ~200 wide) and counts per ingredient, close to a real pizza.
const SIZE = { cheese: 26, ham: 34, salami: 34, pepperoni: 30, mushroom: 30, onion: 32, leek: 26, olive: 18, jalapeno: 22, pepper: 30, pineapple: 26, corn: 16, meatball: 26, chicken: 28, kebab: 34, beef: 24, bacon: 32, tomato: 32, garlic: 18, herbs: 26, shrimp: 30, tuna: 24, egg: 40, lettuce: 30, pickles: 24 };
const COUNT = { olive: 8, corn: 10, garlic: 7, herbs: 6, beef: 9, kebab: 7, jalapeno: 8, egg: 3 };
const toppings = computed(() => {
  const list = on.value.filter((i) => !isSauce(i.kind) && !(usePhoto.value && i.base));
  const out = [];
  let baseCheese = null;
  for (const i of list) {
    if (i.kind === 'cheese') {
      if (!cheesePieces.value.length) continue;
      // Base cheese is in the baked photo; on a pizza without sauce it is melted pieces on the crust.
      if (i.base) {
        if (whiteCheese.value) baseCheese = { id: i.id, cheese: true, vs: cheesePieces.value, size: 30, pts: scatter(i.id * 11 + 9, 22, 76) };
        continue;
      }
      // Extra cheese: melted mozzarella patches with browned spots (raw shreds would look uncooked).
      const R = rng(i.id * 5 + 2);
      out.push({ id: i.id, cheese: true, melt: true, pts: scatter(i.id * 11 + 5, 15, 70).map((q) => ({ ...q, rx: 8 + R() * 5, ry: 6.5 + R() * 4, spot: R() < 0.55 })) });
      continue;
    }
    const vs = variants(`top.${i.kind}`);
    if (!vs.length) continue;
    const n = (COUNT[i.kind] || 7) + (i.base ? 0 : 2);
    // Spread to the edge of the topping area (the crust starts at ~85), like a real pizza.
    out.push({ id: i.id, vs, size: SIZE[i.kind] || 30, pts: scatter(i.id * 7 + 3, n, 74) });
  }
  // Melted cheese goes over the toppings, as it does in the oven.
  if (baseCheese) out.push(baseCheese);
  return out.map((tp, order) => ({ ...tp, order }));
});

/* Cooked look: melted cheese creeps over the edges of each piece. The patches are cut from the baked
   pizza photo itself, so where there is no piece they match the cheese underneath and can't be seen. */
const meltSrc = computed(() => (usePhoto.value ? pizzaPhoto.value : bakedBase.value));
const meltBlobs = computed(() => {
  if (!usePhoto.value && !showBaked.value) return [];
  const out = [];
  for (const tp of toppings.value) {
    if (tp.cheese) continue;
    tp.pts.forEach((p, n) => {
      const R = rng(tp.id * 31 + n * 7 + 1);
      const s = tp.size * p.s;
      const a0 = R() * Math.PI * 2;
      for (let k = 0; k < 3; k++) {
        const a = a0 + k * 2.1 + (R() - 0.5) * 0.8;
        const d = s * (0.32 + R() * 0.1);
        out.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: s * (0.12 + R() * 0.08), o: 0.95 });
      }
      out.push({ x: p.x, y: p.y, r: s * 0.3, o: 0.2 }); // a thin cheesy glaze over the middle
    });
  }
  return out;
});

/* Pieces fly from the tapped button to their place on the pizza (Web Animations API). */
const SPRING = 'cubic-bezier(.3, 1.45, .45, 1)';
function toSvg(x, y) {
  const el = svg.value;
  if (!el?.getScreenCTM) return null;
  const p = el.createSVGPoint();
  p.x = x; p.y = y;
  return p.matrixTransform(el.getScreenCTM().inverse());
}
watch(() => props.fly, async (f) => {
  if (!f) return;
  await nextTick();
  const from = toSvg(f.x, f.y);
  const k = props.scale || 1; // the pieces sit inside the size-scaled group
  const nodes = svg.value?.querySelectorAll(`[data-top="${f.id}"] .fly`) || [];
  nodes.forEach((el, i) => {
    const tx = Number(el.dataset.x), ty = Number(el.dataset.y);
    const start = from ? `translate(${from.x / k - tx}px, ${from.y / k - ty}px) scale(.55)` : 'translateY(-40px) scale(1.4)';
    el.animate([{ transform: start, opacity: 0.2 }, { transform: 'none', opacity: 1 }], { duration: 620, delay: i * 38, easing: SPRING, fill: 'backwards' });
  });
  svg.value?.querySelectorAll(`[data-top="${f.id}"] .drizzle`).forEach((el) => {
    el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 900, easing: 'ease-out', fill: 'backwards' });
  });
});

/* ---------- Burger ---------- */
const ORDER = { sauce_white: 1, sauce_bbq: 1, sauce_chili: 1, sauce_tomato: 1, lettuce: 2, tomato: 3, pickles: 4, jalapeno: 4, beef: 5, kebab: 5, meatball: 5, chicken: 5, cheese: 6, bacon: 7, egg: 8, onion: 9, leek: 9, onion_rings: 10 };
const MEAT = new Set(['beef', 'kebab', 'meatball', 'chicken']);
const SIDE_KEY = { kebab: 'beef', meatball: 'beef', leek: 'onion' };
// How much of a photo's height counts as the layer's thickness (the rest overlaps its neighbours).
const THICK = { sauce_white: 0.28, sauce_bbq: 0.28, sauce_chili: 0.28, sauce_tomato: 0.28, bun_bottom: 0.8, bun_top: 0.9, beef: 0.72, chicken: 0.72, cheese: 0.34, lettuce: 0.45, tomato: 0.5, onion: 0.45, bacon: 0.5, egg: 0.5 };
function photoLayer(kind) {
  const row = photoRow(`side.${kind}`);
  if (!row || !row.w || !row.h) return null;
  const w = kind === 'cheese' ? 204 : kind === 'bun_top' || kind === 'bun_bottom' ? 194 : 186;
  const ih = Math.min(110, (w * row.h) / row.w);
  return { img: photoUrl(`side.${kind}`), iw: w, ih, h: ih * (THICK[kind] ?? 0.55) };
}
const fries = computed(() => isOn('fries') && photoUrl('side.fries'));
const stack = computed(() => {
  const bb = photoLayer('bun_bottom');
  const bt = photoLayer('bun_top');
  if (!bb || !bt) return null;
  const parts = on.value
    .map((i) => { const ph = photoLayer(SIDE_KEY[i.kind] || i.kind); return ph && { key: 'i' + i.id, rank: ORDER[i.kind] ?? 12, ...ph }; })
    .filter(Boolean);
  const patty = photoLayer('beef');
  if (!on.value.some((i) => MEAT.has(i.kind)) && patty) parts.push({ key: 'patty', rank: 5, ...patty });
  parts.sort((a, b) => a.rank - b.rank);
  // Build from the ground up. y = top of each layer's band; each photo is centred on its band.
  const out = [];
  let y = -bb.h;
  out.push({ key: 'bottom', ...bb, iy: -bb.ih });
  for (const p of parts) {
    y -= p.h;
    out.push({ ...p, iy: y - (p.ih - p.h) / 2 });
  }
  y -= bt.h;
  out.push({ key: 'top', ...bt, iy: y });
  return { layers: out, height: -y };
});
const burgerScale = computed(() => (stack.value ? Math.min(fries.value ? 1.12 : 1.3, 210 / stack.value.height) : 1));
const burgerX = computed(() => (fries.value ? 118 : 150));

/* ---------- Which picture to show ---------- */
const view = computed(() => {
  if (props.mode === 'pizza' && (props.image || basePhoto.value)) return 'pizza';
  // Burgers are shown as their real photo; the layered drawing is only used when there is no photo.
  if (props.mode === 'burger' && stack.value && !props.image) return 'burger';
  return 'photo';
});

/* ---------- Product photo, with the changes pinned on it ---------- */
// The photo stays exactly as the restaurant took it; added extras and removed ingredients appear as labels.
const changed = computed(() => props.items.filter((i) => (i.base ? !i.on : i.on)));
// A ready-made photo of the dish with these changes in it (cheese melted inside the burger…), when there is one.
const shown = computed(() => dishVariant(props.image, changed.value.map((i) => (i.base ? '-' : '+') + i.kind)));
// Otherwise the server makes one (the first time) for up to three changes.
const live = computed(() => {
  if (props.mode === 'pizza' || shown.value.covered.length === changed.value.length) return null;
  return liveDish(props.foodId, props.image, changed.value.slice(-3).map((i) => (i.base ? '-' : '+') + i.id));
});
const liveCovered = computed(() => (live.value?.status === 'ready' ? changed.value.slice(-3).map((i) => i.id) : []));
const shownUrl = computed(() => (live.value?.status === 'ready' ? live.value.url : shown.value.url));
const preparing = computed(() => live.value?.status === 'pending' || pizzaLive.value?.status === 'pending');
// Changes that the photo doesn't show yet are pinned on it as labels.
const changes = computed(() => changed.value
  .filter((i) => !liveCovered.value.includes(i.id))
  .filter((i) => !shown.value.covered.includes((i.base ? '-' : '+') + i.kind))
  .map((i) => ({ id: i.id, minus: i.base, name: i.name, photo: i.icon || thumbPhoto(i.kind) })));
</script>

<template>
  <!-- PIZZA -->
  <svg v-if="view === 'pizza'" ref="svg" viewBox="-118 -118 236 236" role="img" aria-hidden="true" :class="{ baking }">
    <defs>
      <radialGradient id="pcShadow"><stop offset="0" stop-color="#000" stop-opacity=".42" /><stop offset=".5" stop-color="#000" stop-opacity=".14" /><stop offset=".72" stop-color="#000" stop-opacity="0" /></radialGradient>
      <clipPath id="pizzaRound"><circle r="93" /></clipPath>
      <radialGradient id="plateShadow"><stop offset=".82" stop-color="#000" stop-opacity=".22" /><stop offset="1" stop-color="#000" stop-opacity="0" /></radialGradient>
      <radialGradient id="ovenGlow"><stop offset="0" stop-color="#fd992f" stop-opacity=".55" /><stop offset=".45" stop-color="#df4d0c" stop-opacity=".28" /><stop offset=".72" stop-color="#df4d0c" stop-opacity="0" /></radialGradient>
      <!-- Baked toppings: warmer, a little less fresh, with browned edges -->
      <filter id="cooked" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="1.04 .06 0 0 -.01  .03 .93 0 0 -.03  0 .02 .8 0 -.03  0 0 0 1 0" result="warm" />
        <feMorphology in="SourceAlpha" operator="erode" radius="1" result="inner" />
        <feComposite in="SourceAlpha" in2="inner" operator="out" result="rim" />
        <feGaussianBlur in="rim" stdDeviation=".9" result="rimSoft" />
        <feFlood flood-color="#5b2a0a" flood-opacity=".6" />
        <feComposite in2="rimSoft" operator="in" />
        <feComposite in2="SourceAlpha" operator="in" result="burn" />
        <feMerge><feMergeNode in="warm" /><feMergeNode in="burn" /></feMerge>
      </filter>
      <!-- Sauce: slightly uneven edges, a soft shadow on the pizza and a wet, glossy highlight -->
      <filter id="sauceFx" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".11" numOctaves="2" seed="11" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="body" />
        <feGaussianBlur in="body" stdDeviation="1" result="bodyBlur" />
        <feOffset in="bodyBlur" dx=".6" dy="1.3" result="sh" />
        <feColorMatrix in="sh" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .38 0" result="shadow" />
        <feSpecularLighting in="bodyBlur" surfaceScale="2.2" specularConstant=".9" specularExponent="24" lighting-color="#fff" result="spec">
          <feDistantLight azimuth="225" elevation="48" />
        </feSpecularLighting>
        <feComposite in="spec" in2="body" operator="in" result="gloss" />
        <feComposite in="body" in2="gloss" operator="arithmetic" k1="0" k2="1" k3=".55" k4="0" result="wet" />
        <feMerge><feMergeNode in="shadow" /><feMergeNode in="wet" /></feMerge>
      </filter>
      <!-- Melted mozzarella: creamy centre, golden edge that fades into the pizza, wobbly outline, soft sheen -->
      <radialGradient id="meltCheese"><stop offset="0" stop-color="#fff8e0" /><stop offset=".55" stop-color="#fbeab8" /><stop offset=".85" stop-color="#efcf83" stop-opacity=".85" /><stop offset="1" stop-color="#e2b65e" stop-opacity="0" /></radialGradient>
      <filter id="cheeseMelt" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".18" numOctaves="2" seed="4" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" result="body" />
        <feGaussianBlur in="body" stdDeviation="1.4" result="b" />
        <feSpecularLighting in="b" surfaceScale="1.6" specularConstant=".55" specularExponent="16" lighting-color="#fff" result="spec"><feDistantLight azimuth="225" elevation="55" /></feSpecularLighting>
        <feComposite in="spec" in2="body" operator="in" result="gloss" />
        <feComposite in="body" in2="gloss" operator="arithmetic" k1="0" k2="1" k3=".4" k4="0" />
      </filter>
      <!-- Ragged, soft edges for the melted cheese patches -->
      <filter id="meltEdge" filterUnits="userSpaceOnUse" x="-118" y="-118" width="236" height="236">
        <feTurbulence type="fractalNoise" baseFrequency=".32" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" />
        <feGaussianBlur stdDeviation=".6" />
      </filter>
      <mask id="melt" maskUnits="userSpaceOnUse" x="-118" y="-118" width="236" height="236">
        <g filter="url(#meltEdge)"><circle v-for="(b, k) in meltBlobs" :key="k" :cx="b.x.toFixed(1)" :cy="b.y.toFixed(1)" :r="b.r.toFixed(1)" fill="#fff" :fill-opacity="b.o" /></g>
      </mask>
    </defs>
    <!-- Everything on the pizza grows or shrinks with the chosen size -->
    <g class="pz-size" :style="{ transform: `scale(${scale})` }">
      <ellipse cx="0" cy="8" rx="100" ry="97" fill="url(#plateShadow)" />
      <g class="base-in">
        <g class="base-baked" :style="{ opacity: usePhoto ? 0 : 1 }">
          <image v-if="rawBase" :href="rawBase" x="-108" y="-108" width="216" height="216" preserveAspectRatio="xMidYMid meet" />
          <image v-if="bakedBase" class="base-baked" :style="{ opacity: showBaked ? 1 : 0 }" :href="bakedBase" x="-108" y="-108" width="216" height="216" preserveAspectRatio="xMidYMid meet" />
        </g>
        <!-- The product's own photo: exactly the pizza the restaurant sells -->
        <image v-if="image" class="base-baked" :style="{ opacity: usePhoto && pizzaPhoto === image ? 1 : 0 }" :href="image" x="-108" y="-108" width="216" height="216" preserveAspectRatio="xMidYMid meet" />
        <!-- The AI photo of this pizza without what was taken off (white background, so cut round) -->
        <image v-if="usePhoto && pizzaPhoto !== image" :key="pizzaPhoto" class="base-baked ps-fade" :href="pizzaPhoto" x="-108" y="-108" width="216" height="216" preserveAspectRatio="xMidYMid meet" clip-path="url(#pizzaRound)" />
      </g>
      <TransitionGroup tag="g" name="top">
        <g v-for="tp in toppings" :key="tp.id" :data-top="tp.id">
          <!-- Extra cheese: melted patches -->
          <g v-if="tp.melt" filter="url(#cheeseMelt)">
            <g v-for="(p, i) in tp.pts" :key="i" :transform="`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot.toFixed(0)})`">
              <g class="pop-in" :style="{ '--d': (intro ? 250 + tp.order * STEP : 0) + i * 30 + 'ms' }">
                <ellipse :rx="p.rx.toFixed(1)" :ry="p.ry.toFixed(1)" fill="url(#meltCheese)" />
                <ellipse v-if="p.spot" :cx="(p.rx * 0.25).toFixed(1)" :cy="(-p.ry * 0.2).toFixed(1)" :rx="(p.rx * 0.28).toFixed(1)" :ry="(p.ry * 0.22).toFixed(1)" fill="#b8742f" opacity=".45" />
              </g>
            </g>
          </g>
          <!-- Pieces: real photo cut-outs, baked, each landing with a spring -->
          <g v-for="(p, i) in tp.melt ? [] : tp.pts" :key="i" :transform="`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`">
            <g class="fly pop-in" :data-x="p.x.toFixed(1)" :data-y="p.y.toFixed(1)" :style="{ '--d': (intro ? 250 + tp.order * STEP : 0) + i * 38 + 'ms' }">
              <circle :r="tp.size * 0.38" :cx="tp.size * 0.05" :cy="tp.size * 0.07" fill="url(#pcShadow)" opacity=".6" />
              <g :transform="`rotate(${p.rot.toFixed(0)}) scale(${p.s.toFixed(2)})`">
                <image class="topping" :style="{ '--d': (intro ? 250 + tp.order * STEP : 0) + i * 38 + 'ms' }" :href="tp.vs[i % tp.vs.length]" :x="-tp.size / 2" :y="-tp.size / 2" :width="tp.size" :height="tp.size" preserveAspectRatio="xMidYMid meet" />
              </g>
            </g>
          </g>
        </g>
      </TransitionGroup>
      <!-- Melted cheese over the edges of the toppings -->
      <image v-if="meltBlobs.length" class="melt" :href="meltSrc" x="-108" y="-108" width="216" height="216" preserveAspectRatio="xMidYMid meet" mask="url(#melt)" />
      <!-- Sauces on top, in parallel lines that never cross; glossy and uneven like real sauce -->
      <g :transform="`rotate(${SAUCE_TILT})`">
        <TransitionGroup tag="g" name="top">
          <g v-for="(sc, k) in sauces" :key="sc.id" :data-top="sc.id" class="pop-in" filter="url(#sauceFx)" :style="{ '--d': (intro ? 250 + (toppings.length + k) * STEP : 0) + 'ms' }">
            <template v-if="sc.tex">
              <!-- The lines cut out of the real sauce photo; a slightly offset second pass makes the width uneven -->
              <mask :id="'sm' + sc.id" maskUnits="userSpaceOnUse" x="-150" y="-150" width="300" height="300">
                <g v-for="(ln, j) in sc.lines" :key="j">
                  <path :d="ln.d" fill="none" stroke="#fff" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round" class="drizzle" pathLength="1" stroke-dasharray="1" />
                  <path :d="ln.d" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" transform="translate(.5 .4)" class="drizzle" pathLength="1" stroke-dasharray="1" />
                  <circle v-for="(dt, q) in ln.dots" :key="q" :cx="dt.x.toFixed(1)" :cy="dt.y.toFixed(1)" :r="dt.r.toFixed(1)" fill="#fff" />
                </g>
              </mask>
              <g opacity=".35">
                <path v-for="(ln, j) in sc.lines" :key="j" :d="ln.d" fill="none" :stroke="sc.c[1]" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" class="drizzle" pathLength="1" stroke-dasharray="1" />
              </g>
              <image :href="sc.tex" x="-150" y="-150" width="300" height="300" preserveAspectRatio="xMidYMid slice" :mask="`url(#sm${sc.id})`" />
            </template>
            <g v-for="(ln, j) in sc.tex ? [] : sc.lines" :key="j">
              <path :d="ln.d" fill="none" :stroke="sc.c[1]" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round" class="drizzle" pathLength="1" stroke-dasharray="1" />
              <path :d="ln.d" fill="none" :stroke="sc.c[0]" stroke-width="3.7" stroke-linecap="round" stroke-linejoin="round" class="drizzle" pathLength="1" stroke-dasharray="1" />
              <!-- wet shine along the top of the line -->
              <path :d="ln.d" fill="none" :stroke="sc.c[2]" stroke-opacity=".75" stroke-width="1" stroke-linecap="round" transform="translate(-.5 -.9)" class="drizzle" pathLength="1" stroke-dasharray="1" />
              <circle v-for="(dt, q) in ln.dots" :key="q" :cx="dt.x.toFixed(1)" :cy="dt.y.toFixed(1)" :r="dt.r.toFixed(1)" :fill="sc.c[0]" :stroke="sc.c[1]" stroke-width=".5" />
            </g>
          </g>
        </TransitionGroup>
      </g>
    </g>
    <circle class="oven" r="150" fill="url(#ovenGlow)" />
    <foreignObject v-if="preparing" x="-70" y="96" width="140" height="22"><div class="ps-making in-svg"><i></i>{{ t('makingPhoto') }}</div></foreignObject>
  </svg>

  <!-- BURGER -->
  <svg v-else-if="view === 'burger'" viewBox="0 0 300 280" role="img" aria-hidden="true">
    <ellipse cx="150" cy="262" rx="120" ry="10" fill="#000" opacity=".12" />
    <g class="slide" :style="{ transform: `translate(${burgerX}px, 256px) scale(${burgerScale})` }">
      <TransitionGroup tag="g" name="lay">
        <g v-for="(l, li) in stack.layers" :key="l.key" class="slide" :style="{ transform: `translate(${-l.iw / 2}px, ${l.iy}px)` }">
          <image class="layer" :style="{ animationDelay: (intro ? li * STEP : 0) + 'ms' }" :href="l.img" x="0" y="0" :width="l.iw" :height="l.ih" preserveAspectRatio="xMidYMid meet" />
        </g>
      </TransitionGroup>
    </g>
    <transition name="fade">
      <g v-if="fries" transform="translate(250 256)">
        <image class="layer" :style="{ animationDelay: (intro ? stack.layers.length * STEP : 0) + 'ms' }" :href="fries" x="-46" y="-124" width="92" height="124" preserveAspectRatio="xMidYMax meet" />
      </g>
    </transition>
  </svg>

  <!-- PRODUCT PHOTO, exactly as the restaurant took it, with the changes pinned on it -->
  <div v-else class="ps">
    <div class="ps-frame">
      <img v-if="image" :src="image" alt="" class="ps-img">
      <transition name="ps-swap"><img v-if="shownUrl && shownUrl !== image" :key="shownUrl" :src="shownUrl" alt="" class="ps-img ps-over"></transition>
      <transition name="fade"><span v-if="preparing" class="ps-making"><i></i>{{ t('makingPhoto') }}</span></transition>
      <TransitionGroup tag="div" name="chip" class="ps-chips">
        <span v-for="c in changes" :key="c.id" class="ps-chip" :class="c.minus ? 'minus' : 'plus'">
          <img v-if="c.photo" :src="c.photo" alt=""><b>{{ c.minus ? '−' : '+' }}</b>{{ c.name }}
        </span>
      </TransitionGroup>
    </div>
  </div>
</template>
