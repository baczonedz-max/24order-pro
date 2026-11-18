<script setup>
// The live picture in the product builder, made only from real photos:
// - pizza: a photo of the base, with photo cut-outs of each topping dropped on top
// - burger: photo layers (bun, patty, cheese, lettuce…) stacked one by one
// - anything else, or when photos are missing: the product's own photo with its ingredients around it.
// No drawings: an ingredient without a photo is shown as a label, never as a cartoon.
import { computed, ref, watch, nextTick, onMounted } from 'vue';
import { scatter, isSauce, rng } from './art.js';
import { photoUrl, photoRow, thumbPhoto, variants } from './photos.js';

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
});
const svg = ref(null);

const on = computed(() => props.items.filter((i) => i.on));
// When the builder opens, the dish is built step by step (like the video); later changes animate at once.
const intro = ref(true);
onMounted(() => setTimeout(() => (intro.value = false), 2600));
const STEP = 300;
const has = (kind) => props.items.some((i) => i.kind === kind && i.base);
const isOn = (kind) => on.value.some((i) => i.kind === kind);

/* ---------- Pizza ---------- */
const sauceOn = computed(() => (has('sauce_tomato') ? on.value.some((i) => i.kind === 'sauce_tomato' && i.base) : true));
const cheeseOn = computed(() => (has('cheese') ? on.value.some((i) => i.kind === 'cheese' && i.base) : true));
const extraCheese = computed(() => on.value.some((i) => i.kind === 'cheese' && !i.base));
// Two stacked base photos: the raw base (dough + sauce, or plain dough) and the baked pizza with cheese.
// Toggling cheese cross-fades between them.
const bakedBase = computed(() => photoUrl('base.pizza'));
const rawBase = computed(() => (sauceOn.value ? photoUrl('base.pizza_sauce') : photoUrl('base.dough') || photoUrl('base.pizza_sauce')));
const showBaked = computed(() => !!bakedBase.value && (cheeseOn.value || !rawBase.value));
const basePhoto = computed(() => bakedBase.value || rawBase.value);
// Sauce colours for the drizzle: body, darker edge, gloss.
const SAUCE = {
  sauce_white: ['#f4ecd6', '#cdbf9c', '#ffffff'],
  sauce_bbq: ['#5c2615', '#341209', '#b06a4c'],
  sauce_chili: ['#d2421d', '#952b10', '#ff9f7f'],
};
/** A smooth zig-zag that stays inside the pizza (radius r), like sauce poured from a bottle. */
function drizzlePath(seed, r = 74) {
  const R = rng(seed);
  const n = 9;
  const pts = [];
  for (let k = 0; k < n; k++) {
    const x = -r * 0.92 + (k * 2 * r * 0.92) / (n - 1) + (R() - 0.5) * 6;
    const lim = Math.sqrt(Math.max(0, r * r - x * x)) * 0.86;
    pts.push([x, (k % 2 ? -1 : 1) * lim * (0.75 + R() * 0.25)]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let k = 1; k < n; k++) {
    const [x0, y0] = pts[k - 1];
    const [x1, y1] = pts[k];
    d += ` C${(x0 + (x1 - x0) * 0.5).toFixed(1)} ${y0.toFixed(1)} ${(x0 + (x1 - x0) * 0.5).toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}

const cheesePieces = computed(() => variants('top.cheese'));
// Piece sizes (in pizza units; the pizza is ~200 wide) and counts per ingredient, close to a real pizza.
const SIZE = { cheese: 26, ham: 34, salami: 34, pepperoni: 30, mushroom: 30, onion: 32, leek: 26, olive: 18, jalapeno: 22, pepper: 30, pineapple: 26, corn: 16, meatball: 26, chicken: 28, kebab: 34, beef: 24, bacon: 32, tomato: 32, garlic: 18, herbs: 26, shrimp: 30, tuna: 24, egg: 40, lettuce: 30, pickles: 24 };
const COUNT = { olive: 8, corn: 10, garlic: 7, herbs: 6, beef: 9, kebab: 7, jalapeno: 8, egg: 3 };
const toppings = computed(() => {
  const list = on.value.filter((i) => i.kind !== 'sauce_tomato');
  const out = [];
  for (const i of list) {
    if (i.kind === 'cheese') {
      // Base cheese is in the base photo; extra cheese adds shredded mozzarella on top.
      if (i.base || !cheesePieces.value.length) continue;
      out.push({ id: i.id, vs: cheesePieces.value, size: SIZE.cheese, pts: scatter(i.id * 11 + 5, 12, 74) });
      continue;
    }
    if (isSauce(i.kind)) {
      const c = SAUCE[i.kind] || SAUCE.sauce_white;
      out.push({ id: i.id, sauce: drizzlePath(i.id * 13 + 7), rot: (i.id * 47) % 180, c });
      continue;
    }
    const vs = variants(`top.${i.kind}`);
    if (!vs.length) continue;
    const n = (COUNT[i.kind] || 7) + (i.base ? 0 : 2);
    // Spread to the edge of the topping area (the crust starts at ~85), like a real pizza.
    out.push({ id: i.id, vs, size: SIZE[i.kind] || 30, pts: scatter(i.id * 7 + 3, n, 74) });
  }
  return out.map((tp, order) => ({ ...tp, order }));
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
  const nodes = svg.value?.querySelectorAll(`[data-top="${f.id}"] .fly`) || [];
  nodes.forEach((el, i) => {
    const tx = Number(el.dataset.x), ty = Number(el.dataset.y);
    const start = from ? `translate(${from.x - tx}px, ${from.y - ty}px) scale(.55)` : 'translateY(-40px) scale(1.4)';
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
  if (props.mode === 'pizza' && basePhoto.value) return 'pizza';
  if (props.mode === 'burger' && stack.value) return 'burger';
  return 'photo';
});

/* ---------- Product photo + ingredients around it ---------- */
const ring = computed(() => {
  const list = on.value.slice(0, 12);
  const n = Math.max(list.length, 6);
  return list.map((i, k) => {
    const a = (-90 + (k * 360) / n) * (Math.PI / 180);
    const label = i.name.length > 12 ? i.name.slice(0, 11) + '…' : i.name;
    return { id: i.id, extra: !i.base, x: Math.cos(a) * 116, y: Math.sin(a) * 116, photo: thumbPhoto(i.kind), label, lw: label.length * 6.4 + 16 };
  });
});
</script>

<template>
  <!-- PIZZA -->
  <svg v-if="view === 'pizza'" ref="svg" viewBox="-118 -118 236 236" role="img" aria-hidden="true" :class="{ baking }">
    <defs>
      <radialGradient id="pcShadow"><stop offset="0" stop-color="#000" stop-opacity=".42" /><stop offset=".5" stop-color="#000" stop-opacity=".14" /><stop offset=".72" stop-color="#000" stop-opacity="0" /></radialGradient>
      <radialGradient id="ovenGlow"><stop offset="0" stop-color="#fd992f" stop-opacity=".55" /><stop offset=".45" stop-color="#df4d0c" stop-opacity=".28" /><stop offset=".72" stop-color="#df4d0c" stop-opacity="0" /></radialGradient>
    </defs>
    <ellipse cx="0" cy="9" rx="104" ry="100" fill="#000" opacity=".14" />
    <g class="base-in">
      <image v-if="rawBase" :href="rawBase" x="-108" y="-108" width="216" height="216" preserveAspectRatio="xMidYMid meet" />
      <image v-if="bakedBase" class="base-baked" :style="{ opacity: showBaked ? 1 : 0 }" :href="bakedBase" x="-108" y="-108" width="216" height="216" preserveAspectRatio="xMidYMid meet" />
    </g>
    <TransitionGroup tag="g" name="top">
      <g v-for="tp in toppings" :key="tp.id" :data-top="tp.id">
        <!-- Sauce: a glossy drizzle across the whole pizza -->
        <g v-if="tp.sauce" :transform="`rotate(${tp.rot})`" class="pop-in" :style="{ '--d': (intro ? 250 + tp.order * STEP : 0) + 'ms' }">
          <path :d="tp.sauce" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="5.2" stroke-linecap="round" transform="translate(1.2 2)" class="drizzle" pathLength="1" stroke-dasharray="1" />
          <path :d="tp.sauce" fill="none" :stroke="tp.c[1]" stroke-width="4.6" stroke-linecap="round" class="drizzle" pathLength="1" stroke-dasharray="1" />
          <path :d="tp.sauce" fill="none" :stroke="tp.c[0]" stroke-width="3.4" stroke-linecap="round" class="drizzle" pathLength="1" stroke-dasharray="1" />
          <path :d="tp.sauce" fill="none" :stroke="tp.c[2]" stroke-opacity=".7" stroke-width="1" stroke-linecap="round" transform="translate(-.5 -.8)" class="drizzle" pathLength="1" stroke-dasharray="1" />
        </g>
        <!-- Pieces: real photo cut-outs with a soft shadow, each landing with a spring -->
        <g v-for="(p, i) in tp.pts || []" :key="i" :transform="`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`">
          <g class="fly pop-in" :data-x="p.x.toFixed(1)" :data-y="p.y.toFixed(1)" :style="{ '--d': (intro ? 250 + tp.order * STEP : 0) + i * 38 + 'ms' }">
            <circle :r="tp.size * 0.42" :cx="tp.size * 0.07" :cy="tp.size * 0.11" fill="url(#pcShadow)" />
            <g :transform="`rotate(${p.rot.toFixed(0)}) scale(${p.s.toFixed(2)})`">
              <image class="topping" :style="{ '--d': (intro ? 250 + tp.order * STEP : 0) + i * 38 + 'ms' }" :href="tp.vs[i % tp.vs.length]" :x="-tp.size / 2" :y="-tp.size / 2" :width="tp.size" :height="tp.size" preserveAspectRatio="xMidYMid meet" />
            </g>
          </g>
        </g>
      </g>
    </TransitionGroup>
    <circle class="oven" r="150" fill="url(#ovenGlow)" />
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

  <!-- PRODUCT PHOTO + INGREDIENTS -->
  <svg v-else viewBox="-160 -160 320 320" role="img" aria-hidden="true">
    <defs><clipPath id="photoClip"><circle r="90" /></clipPath></defs>
    <circle r="96" fill="#fff" />
    <circle r="96" fill="none" stroke="#000" stroke-opacity=".06" stroke-width="2" />
    <image v-if="image" :href="image" x="-90" y="-90" width="180" height="180" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)" />
    <TransitionGroup tag="g" name="top">
      <g v-for="(r, i) in ring" :key="r.id">
        <g :transform="`translate(${r.x.toFixed(1)} ${r.y.toFixed(1)})`">
          <g class="orbit-in" :style="{ animationDelay: i * 30 + 'ms' }">
            <template v-if="r.photo">
              <circle r="23" fill="#fff" :stroke="r.extra ? '#ffc20e' : '#e5e7eb'" :stroke-width="r.extra ? 3 : 1.5" />
              <image :href="r.photo" x="-17" y="-17" width="34" height="34" preserveAspectRatio="xMidYMid meet" />
            </template>
            <template v-else>
              <rect :x="-r.lw / 2" y="-12" :width="r.lw" height="24" rx="12" fill="#fff" :stroke="r.extra ? '#ffc20e' : '#e5e7eb'" :stroke-width="r.extra ? 2.5 : 1.5" />
              <text y="4" text-anchor="middle" font-size="11" font-weight="600" fill="#1f2937" font-family="Readex Pro, sans-serif">{{ r.label }}</text>
            </template>
          </g>
        </g>
      </g>
    </TransitionGroup>
  </svg>
</template>
