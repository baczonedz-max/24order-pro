<script setup>
// The live picture in the product builder: a pizza seen from above, a burger built layer by layer,
// or the product photo with its ingredients around it. Adding an ingredient animates it in.
import { computed } from 'vue';
import { piece, layer, scatter, rng, isSauce, BUN_TOP, BUN_BOTTOM, LAYER_W } from './art.js';
import { photoUrl, photoRow, thumbPhoto } from './photos.js';

const props = defineProps({
  mode: { type: String, default: 'photo' }, // pizza | burger | photo
  image: { type: String, default: '' },
  // Every ingredient of the product: { id, name, kind, base: bool, on: bool }
  items: { type: Array, default: () => [] },
});

const on = computed(() => props.items.filter((i) => i.on));
const has = (kind) => props.items.some((i) => i.kind === kind && i.base);
const isOn = (kind) => on.value.some((i) => i.kind === kind);

/* ---------- Pizza ---------- */
const sauceOn = computed(() => (has('sauce_tomato') ? on.value.some((i) => i.kind === 'sauce_tomato' && i.base) : true));
const cheeseOn = computed(() => (has('cheese') ? on.value.some((i) => i.kind === 'cheese' && i.base) : true));
const extraCheese = computed(() => on.value.some((i) => i.kind === 'cheese' && !i.base));

function blob(seed, r, wobble, n = 30) {
  const R = rng(seed);
  const pts = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2;
    const d = r + (R() - 0.5) * wobble * 2;
    return [Math.cos(a) * d, Math.sin(a) * d];
  });
  // Smooth closed curve: start between the last and first point, then curve through each midpoint.
  const mid = (a, b) => `${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`;
  let d = `M${mid(pts[n - 1], pts[0])}`;
  pts.forEach((p, k) => { d += ` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${mid(p, pts[(k + 1) % n])}`; });
  return d + 'Z';
}
const cheesePath = blob(7, 75, 4);
const bubbles = scatter(99, 14, 62);
const browned = scatter(31, 10, 64);
// A real photo of the base replaces the drawn crust/sauce/cheese when one has been made.
const basePhoto = computed(() => {
  const key = sauceOn.value && cheeseOn.value ? 'base.pizza' : sauceOn.value ? 'base.pizza_sauce' : cheeseOn.value ? 'base.pizza' : 'base.dough';
  return photoUrl(key) || photoUrl('base.pizza');
});
const cheesePhoto = computed(() => photoUrl('top.cheese'));

const toppings = computed(() =>
  on.value
    .filter((i) => i.kind !== 'cheese' && i.kind !== 'sauce_tomato')
    .map((i) => {
      if (isSauce(i.kind)) {
        // Sauces on a pizza are drizzled in a zig-zag.
        const R = rng(i.id + 5);
        const pts = Array.from({ length: 9 }, (_, k) => `${(-60 + k * 15).toFixed(1)} ${((k % 2 ? -1 : 1) * (40 + R() * 18)).toFixed(1)}`);
        const color = { sauce_white: '#f6efdc', sauce_bbq: '#6e2f1a', sauce_chili: '#ea5320' }[i.kind] || '#f6efdc';
        return { id: i.id, drizzle: `M${pts.join(' L')}`, color, rot: R() * 180 };
      }
      const n = i.kind === 'herbs' || i.kind === 'corn' ? 10 : i.kind === 'beef' || i.kind === 'kebab' ? 9 : 8;
      return { id: i.id, svg: piece(i.kind, i.name), photo: photoUrl(`top.${i.kind}`), pts: scatter(i.id * 7 + 3, i.base ? n : n + 3, 62) };
    }),
);

/* ---------- Burger ---------- */
const ORDER = { sauce_white: 1, sauce_bbq: 1, sauce_chili: 1, sauce_tomato: 1, lettuce: 2, tomato: 3, pickles: 4, jalapeno: 4, beef: 5, kebab: 5, meatball: 5, chicken: 5, cheese: 6, bacon: 7, egg: 8, onion: 9, leek: 9, onion_rings: 10, pepper: 11, chili: 11, mushroom: 11 };
const MEAT = new Set(['beef', 'kebab', 'meatball', 'chicken']);
const fries = computed(() => isOn('fries'));
const SIDE_KEY = { kebab: 'beef', meatball: 'beef', leek: 'onion' };
// How much of a photo's height counts as the layer's thickness (the rest overlaps its neighbours).
const THICK = { bun_bottom: 0.8, bun_top: 0.9, beef: 0.72, chicken: 0.72, cheese: 0.34, lettuce: 0.45, tomato: 0.5, onion: 0.45, bacon: 0.5, egg: 0.5 };
function photoLayer(kind) {
  const row = photoRow(`side.${kind}`);
  if (!row || !row.w || !row.h) return null;
  const w = kind === 'cheese' ? 204 : kind === 'bun_top' || kind === 'bun_bottom' ? 194 : 186;
  const ih = Math.min(110, (w * row.h) / row.w);
  return { img: photoUrl(`side.${kind}`), iw: w, ih, h: ih * (THICK[kind] ?? 0.55) };
}
const stack = computed(() => {
  const list = on.value.filter((i) => i.kind !== 'fries' && i.kind !== 'herbs' && i.kind !== 'garlic' && i.kind !== 'corn');
  const make = (key, rank, kind, name) => {
    const ph = photoLayer(SIDE_KEY[kind] || kind);
    if (ph) return { key, rank, ...ph };
    const v = layer(kind, name);
    return { key, rank, svg: v.svg, h: v.h - 2, ih: v.h };
  };
  const parts = list.map((i) => make('i' + i.id, ORDER[i.kind] ?? 12, i.kind, i.name));
  if (!list.some((i) => MEAT.has(i.kind))) parts.push(make('patty', 5, 'beef'));
  parts.sort((a, b) => a.rank - b.rank);

  // Lay out from the ground upwards. y = top of each layer's band; images are centred on their band.
  const out = [];
  const bb = photoLayer('bun_bottom');
  let y;
  if (bb) { y = -bb.h; out.push({ key: 'bottom', ...bb, y, iy: -bb.ih }); }
  else { out.push({ key: 'bottom', svg: BUN_BOTTOM.svg, y: -BUN_BOTTOM.h, iy: -BUN_BOTTOM.h }); y = -BUN_BOTTOM.h + 3; }
  for (const p of parts) {
    y -= p.h;
    out.push({ ...p, y, iy: p.img ? y - (p.ih - p.h) / 2 : y });
  }
  const bt = photoLayer('bun_top');
  if (bt) { y -= bt.h; out.push({ key: 'top', ...bt, y, iy: y }); return { layers: out, height: -y }; }
  y -= BUN_TOP.h - 8;
  out.push({ key: 'top', svg: BUN_TOP.svg, y, iy: y });
  return { layers: out, height: -y };
});
const friesPhoto = computed(() => photoRow('side.fries') && photoUrl('side.fries'));
const burgerScale = computed(() => Math.min(fries.value ? 1.12 : 1.3, 210 / stack.value.height));
const burgerX = computed(() => (fries.value ? 118 : 150));

/* ---------- Photo ---------- */
const ring = computed(() => {
  const list = on.value.slice(0, 12);
  const n = Math.max(list.length, 6);
  return list.map((i, k) => {
    const a = (-90 + (k * 360) / n) * (Math.PI / 180);
    return { id: i.id, extra: !i.base, x: Math.cos(a) * 112, y: Math.sin(a) * 112, svg: piece(i.kind, i.name), photo: thumbPhoto(i.kind) };
  });
});
</script>

<template>
  <!-- PIZZA -->
  <svg v-if="mode === 'pizza'" viewBox="-118 -118 236 236" role="img" aria-hidden="true">
    <defs>
      <radialGradient id="crustG" r=".5">
        <stop offset=".78" stop-color="#f3c47c" />
        <stop offset=".9" stop-color="#dc9a4f" />
        <stop offset="1" stop-color="#b8712f" />
      </radialGradient>
      <radialGradient id="sauceG" r=".5">
        <stop offset="0" stop-color="#e3553a" />
        <stop offset="1" stop-color="#bf321c" />
      </radialGradient>
    </defs>
    <ellipse cx="0" cy="10" rx="108" ry="104" fill="#000" opacity=".1" />
    <circle r="110" fill="#c79a6b" />
    <circle r="110" fill="none" stroke="#a97e52" stroke-width="2" />
    <path d="M-80 -60 Q0 -75 80 -60 M-95 -20 Q0 -35 95 -20 M-98 20 Q0 5 98 20 M-90 60 Q0 45 90 60" stroke="#b88a5c" stroke-width="1.5" fill="none" opacity=".6" />
    <image v-if="basePhoto" :href="basePhoto" x="-100" y="-100" width="200" height="200" preserveAspectRatio="xMidYMid meet" />
    <template v-else>
    <circle r="96" fill="url(#crustG)" />
    <g fill="#c07a36" opacity=".55">
      <circle cx="-70" cy="-58" r="3" /><circle cx="78" cy="-44" r="2.5" /><circle cx="-88" cy="20" r="2.5" /><circle cx="60" cy="70" r="3" /><circle cx="-30" cy="88" r="2" /><circle cx="20" cy="-90" r="2.5" />
    </g>
    <transition name="fade"><circle v-if="sauceOn" r="83" fill="url(#sauceG)" /></transition>
    <transition name="fade">
      <g v-if="cheeseOn">
        <path :d="cheesePath" fill="#f8db8b" opacity=".97" />
        <circle v-for="(b, i) in bubbles" :key="'b' + i" :cx="b.x" :cy="b.y" :r="2 + (i % 3)" fill="#fbe7ab" />
        <g v-if="extraCheese">
          <circle v-for="(b, i) in browned" :key="'x' + i" class="piece" :style="{ animationDelay: i * 40 + 'ms' }" :cx="b.x" :cy="b.y" :r="4 + (i % 3) * 1.5" fill="#e6b45e" opacity=".85" />
        </g>
      </g>
    </transition>
    </template>
    <g v-if="basePhoto && extraCheese">
      <g v-for="(b, i) in browned" :key="'pc' + i" :transform="`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${(b.rot).toFixed(0)})`">
        <image v-if="cheesePhoto" class="piece" :style="{ animationDelay: i * 40 + 'ms' }" :href="cheesePhoto" x="-16" y="-16" width="32" height="32" />
        <circle v-else class="piece" :style="{ animationDelay: i * 40 + 'ms' }" :r="5 + (i % 3) * 1.5" fill="#f3d27a" opacity=".9" />
      </g>
    </g>
    <TransitionGroup tag="g" name="top">
      <g v-for="tp in toppings" :key="tp.id">
        <g v-if="tp.drizzle" :transform="`rotate(${tp.rot.toFixed(0)})`">
          <path class="piece" :d="tp.drizzle" fill="none" :stroke="tp.color" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
        <template v-else>
          <g v-for="(p, i) in tp.pts" :key="i" :transform="`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot.toFixed(0)}) scale(${(p.s * 0.82).toFixed(2)})`">
            <image v-if="tp.photo" class="piece" :style="{ animationDelay: i * 45 + 'ms' }" :href="tp.photo" x="-19" y="-19" width="38" height="38" preserveAspectRatio="xMidYMid meet" />
            <g v-else class="piece" :style="{ animationDelay: i * 45 + 'ms' }" v-html="tp.svg" />
          </g>
        </template>
      </g>
    </TransitionGroup>
  </svg>

  <!-- BURGER -->
  <svg v-else-if="mode === 'burger'" viewBox="0 0 300 280" role="img" aria-hidden="true">
    <ellipse cx="150" cy="262" rx="130" ry="12" fill="#000" opacity=".1" />
    <g class="slide" :style="{ transform: `translate(${burgerX}px, 256px) scale(${burgerScale})` }">
      <TransitionGroup tag="g" name="lay">
        <g v-for="l in stack.layers" :key="l.key" class="slide" :style="{ transform: `translate(${l.img ? -l.iw / 2 : -LAYER_W / 2}px, ${l.iy}px)` }">
          <image v-if="l.img" class="layer" :href="l.img" x="0" y="0" :width="l.iw" :height="l.ih" preserveAspectRatio="xMidYMid meet" />
          <g v-else class="layer" v-html="l.svg" />
        </g>
      </TransitionGroup>
    </g>
    <transition name="fade">
      <g v-if="fries" transform="translate(250 256)">
        <image v-if="friesPhoto" class="layer" :href="friesPhoto" x="-44" y="-120" width="88" height="120" preserveAspectRatio="xMidYMax meet" />
        <g v-else class="layer">
          <g v-for="(f, i) in [-22, -14, -6, 2, 10, 18, -18, -2, 14]" :key="i" :transform="`rotate(${f * 0.6} 0 -40)`">
            <rect :x="f - 3" :y="-92 - (i % 3) * 8" width="7" height="60" rx="2" fill="#f5c542" stroke="#d6a320" />
          </g>
          <path d="M-32 -50 L32 -50 L24 0 L-24 0 Z" fill="#d62f2f" />
          <path d="M-32 -50 L32 -50 L30 -40 L-30 -40 Z" fill="#b51f1f" />
          <circle cx="0" cy="-22" r="9" fill="#ffc20e" />
          <path class="steam" d="M-8 -110 q4 -8 0 -16 M6 -114 q4 -8 0 -16" stroke="#999" stroke-width="2" fill="none" stroke-linecap="round" />
        </g>
      </g>
    </transition>
  </svg>

  <!-- PHOTO + INGREDIENT RING -->
  <svg v-else viewBox="-150 -150 300 300" role="img" aria-hidden="true">
    <defs><clipPath id="photoClip"><circle r="86" /></clipPath></defs>
    <circle r="112" fill="none" stroke="currentColor" stroke-opacity=".08" stroke-width="40" />
    <circle r="92" fill="#fff" />
    <circle r="92" fill="none" stroke="#000" stroke-opacity=".06" stroke-width="2" />
    <image v-if="image" :href="image" x="-86" y="-86" width="172" height="172" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)" />
    <g v-else>
      <circle r="70" fill="#f3efe8" /><circle r="50" fill="none" stroke="#e5ddd0" stroke-width="2" />
    </g>
    <TransitionGroup tag="g" name="top">
      <g v-for="(r, i) in ring" :key="r.id">
        <g :transform="`translate(${r.x.toFixed(1)} ${r.y.toFixed(1)})`">
          <g class="orbit-in" :style="{ animationDelay: i * 30 + 'ms' }">
            <circle r="21" fill="#fff" :stroke="r.extra ? '#ffc20e' : '#e5e7eb'" :stroke-width="r.extra ? 3 : 1.5" />
            <image v-if="r.photo" :href="r.photo" x="-15" y="-15" width="30" height="30" preserveAspectRatio="xMidYMid meet" />
            <g v-else transform="scale(.95)" v-html="r.svg" />
          </g>
        </g>
      </g>
    </TransitionGroup>
  </svg>
</template>
