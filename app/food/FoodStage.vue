<script setup>
// The live picture in the product builder, made only from real photos:
// - pizza: a photo of the base, with photo cut-outs of each topping dropped on top
// - burger: photo layers (bun, patty, cheese, lettuce…) stacked one by one
// - anything else, or when photos are missing: the product's own photo with its ingredients around it.
// No drawings: an ingredient without a photo is shown as a label, never as a cartoon.
import { computed } from 'vue';
import { scatter, isSauce } from './art.js';
import { photoUrl, photoRow, thumbPhoto } from './photos.js';

const props = defineProps({
  mode: { type: String, default: 'photo' }, // wanted mode: pizza | burger | photo
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
const basePhoto = computed(() => {
  const key = sauceOn.value && cheeseOn.value ? 'base.pizza' : sauceOn.value ? 'base.pizza_sauce' : cheeseOn.value ? 'base.pizza' : 'base.dough';
  return photoUrl(key) || photoUrl('base.pizza');
});
const cheeseBits = scatter(31, 10, 62);
const cheesePhoto = computed(() => photoUrl('top.cheese'));
const toppings = computed(() =>
  on.value
    .filter((i) => i.kind !== 'cheese' && i.kind !== 'sauce_tomato')
    .map((i) => {
      const photo = photoUrl(`top.${i.kind}`);
      if (!photo) return null;
      const n = isSauce(i.kind) ? 5 : i.kind === 'herbs' || i.kind === 'corn' ? 10 : i.kind === 'beef' || i.kind === 'kebab' ? 9 : 8;
      return { id: i.id, photo, size: isSauce(i.kind) ? 30 : 40, pts: scatter(i.id * 7 + 3, i.base ? n : n + 3, 62) };
    })
    .filter(Boolean),
);

/* ---------- Burger ---------- */
const ORDER = { sauce_white: 1, sauce_bbq: 1, sauce_chili: 1, sauce_tomato: 1, lettuce: 2, tomato: 3, pickles: 4, jalapeno: 4, beef: 5, kebab: 5, meatball: 5, chicken: 5, cheese: 6, bacon: 7, egg: 8, onion: 9, leek: 9, onion_rings: 10 };
const MEAT = new Set(['beef', 'kebab', 'meatball', 'chicken']);
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
  <svg v-if="view === 'pizza'" viewBox="-118 -118 236 236" role="img" aria-hidden="true">
    <defs>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".28" /></filter>
    </defs>
    <ellipse cx="0" cy="8" rx="104" ry="100" fill="#000" opacity=".12" />
    <image :href="basePhoto" x="-108" y="-108" width="216" height="216" preserveAspectRatio="xMidYMid meet" />
    <g v-if="extraCheese && cheesePhoto">
      <g v-for="(b, i) in cheeseBits" :key="'c' + i" :transform="`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${b.rot.toFixed(0)})`">
        <image class="piece" :style="{ animationDelay: i * 40 + 'ms' }" :href="cheesePhoto" x="-17" y="-17" width="34" height="34" />
      </g>
    </g>
    <TransitionGroup tag="g" name="top">
      <g v-for="tp in toppings" :key="tp.id" filter="url(#softShadow)">
        <g v-for="(p, i) in tp.pts" :key="i" :transform="`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot.toFixed(0)}) scale(${(p.s * 0.82).toFixed(2)})`">
          <image class="piece" :style="{ animationDelay: i * 45 + 'ms' }" :href="tp.photo" :x="-tp.size / 2" :y="-tp.size / 2" :width="tp.size" :height="tp.size" preserveAspectRatio="xMidYMid meet" />
        </g>
      </g>
    </TransitionGroup>
  </svg>

  <!-- BURGER -->
  <svg v-else-if="view === 'burger'" viewBox="0 0 300 280" role="img" aria-hidden="true">
    <ellipse cx="150" cy="262" rx="120" ry="10" fill="#000" opacity=".12" />
    <g class="slide" :style="{ transform: `translate(${burgerX}px, 256px) scale(${burgerScale})` }">
      <TransitionGroup tag="g" name="lay">
        <g v-for="l in stack.layers" :key="l.key" class="slide" :style="{ transform: `translate(${-l.iw / 2}px, ${l.iy}px)` }">
          <image class="layer" :href="l.img" x="0" y="0" :width="l.iw" :height="l.ih" preserveAspectRatio="xMidYMid meet" />
        </g>
      </TransitionGroup>
    </g>
    <transition name="fade">
      <g v-if="fries" transform="translate(250 256)">
        <image class="layer" :href="fries" x="-46" y="-124" width="92" height="124" preserveAspectRatio="xMidYMax meet" />
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
