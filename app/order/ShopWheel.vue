<script setup>
// "The menu that turns": one dish at a time on a big wooden board. Scrolling, swiping or the arrows turn
// the board; the next dish comes round from the right, its ingredients drop in around it, and the left side
// shows its name, description, ingredients, allergens and price. Tapping opens the builder to order it.
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import Icon from '../components/Icon.vue';
import { shop, openFood } from './shop.js';
import { t } from '../i18n.js';

const cats = computed(() => shop.categories.filter((c) => c.foods.some((f) => f.image)));
const catId = ref(null);
const cat = computed(() => cats.value.find((c) => c.id === catId.value) || cats.value[0]);
const items = computed(() => (cat.value?.foods || []).filter((f) => f.image));
const index = ref(0);
const cur = computed(() => items.value[index.value]);
watch(() => cat.value?.id, () => { index.value = 0; });

// Board geometry (in % of the stage), per layout. Dishes sit on a ring; the ring turns by STEP per dish.
const phone = ref(false);
let mq;
const STEP = 70;
// cx (% of width), cy (% of height); r, size in % of the stage width (cqw); ring = where dishes sit (0–1 of r).
const geo = computed(() => (phone.value
  ? { cx: 50, cy: 100, r: 92, ring: 0.64, size: 66, base: -90 }   // board below, dish centred, next one peeking right
  : { cx: 82, cy: 112, r: 61, ring: 0.62, size: 40, base: -112 })); // board bottom-right, dish upper-left
const isPizza = computed(() => /pizza/i.test(cat.value?.name || ''));
const dishPct = computed(() => (geo.value.size / (2 * geo.value.r)) * 100);          // dish size, % of the board
const ringTx = computed(() => ((geo.value.ring * 50) / dishPct.value) * 100);        // ring radius, % of the dish
const front = computed(() => {
  const a = (geo.value.base * Math.PI) / 180;
  return { x: geo.value.cx + Math.cos(a) * geo.value.ring * geo.value.r, dy: Math.sin(a) * geo.value.ring * geo.value.r };
});
const turn = computed(() => -index.value * STEP);
const slots = computed(() => items.value.map((f, k) => {
  const a = geo.value.base + k * STEP;
  return { f, k, a, near: Math.abs(k - index.value) <= 2 };
}));

const go = (k) => { if (!items.value.length) return; index.value = (k + items.value.length) % items.value.length; };
const next = () => go(index.value + 1);
const prev = () => go(index.value - 1);

// Mouse wheel / trackpad: turn the board while there are dishes left, then let the page scroll.
let lock = 0;
function onWheel(e) {
  if (Math.abs(e.deltaY) < Math.abs(e.deltaX) || Math.abs(e.deltaY) < 8) return;
  const dir = e.deltaY > 0 ? 1 : -1;
  const atEnd = dir > 0 ? index.value >= items.value.length - 1 : index.value <= 0;
  if (atEnd) return;
  e.preventDefault();
  stopAuto();
  if (Date.now() < lock) return;
  lock = Date.now() + 650;
  go(index.value + dir);
}
// Touch: a sideways swipe turns the board.
let sx = 0, sy = 0;
const onTouchStart = (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - sx;
  const dy = e.changedTouches[0].clientY - sy;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { stopAuto(); dx < 0 ? next() : prev(); }
}
const onKey = (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { stopAuto(); next(); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { stopAuto(); prev(); } };

// Turns by itself every few seconds until the customer takes over.
let auto;
const stopAuto = () => { clearInterval(auto); auto = null; };
onMounted(() => {
  mq = matchMedia('(max-width: 760px)');
  phone.value = mq.matches;
  mq.addEventListener?.('change', (e) => (phone.value = e.matches));
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) auto = setInterval(next, 5200);
});
onUnmounted(stopAuto);

// Ingredients that "arrive" around the dish: the restaurant's own cut-out photos of what's on it.
const floaters = computed(() => {
  const list = (cur.value?.components || []).filter((c) => c.icon && c.state === 'selected' && !c.choice).slice(0, 4);
  const spots = phone.value ? [[-38, -30], [36, -34], [40, 30], [-40, 26]] : [[-44, -26], [40, -38], [46, 24], [-30, 40]];
  return list.map((c, k) => ({ id: `${cur.value.id}-${c.id}`, icon: c.icon, x: spots[k][0], y: spots[k][1], r: (k * 67) % 50 - 25, d: 120 + k * 110 }));
});

const kr = (n) => `${Number.isInteger(Number(n)) ? n : Number(n).toFixed(2).replace('.', ',')}`;
const ingredients = computed(() => (cur.value?.components || []).filter((c) => c.state === 'selected' && !c.choice).map((c) => c.name).slice(0, 6));
const sizes = computed(() => cur.value?.sizes || []);
const pad = (n) => String(n).padStart(2, '0');
const engraved = computed(() => `${shop.restaurant.name || ''} · ${cats.value.map((c) => c.name).join(' · ')} · `.toUpperCase());
</script>

<template>
  <section v-if="cur" class="wh" tabindex="0" :aria-label="cat?.name" @wheel="onWheel" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd" @keydown="onKey" @mouseenter="stopAuto">
    <!-- Category switch -->
    <div class="wh-cats">
      <button v-for="c in cats" :key="c.id" type="button" :class="{ on: c.id === cat.id }" @click="stopAuto(); catId = c.id">{{ c.name }}</button>
    </div>

    <!-- The board with the dishes on its ring -->
    <div class="wh-stage">
      <div class="wh-board" :style="{ left: geo.cx + '%', top: geo.cy + '%', width: geo.r * 2 + 'cqw', transform: `translate(-50%, -50%) rotate(${turn}deg)` }">
        <svg class="wh-rim" viewBox="-100 -100 200 200" aria-hidden="true">
          <defs><path id="whText" d="M0,-91 a91,91 0 1,1 -0.1,0" /></defs>
          <text><textPath href="#whText" textLength="560">{{ engraved.repeat(2) }}</textPath></text>
        </svg>
        <div v-for="s in slots" :key="s.f.id" class="wh-slot" :class="{ on: s.k === index }"
          :style="{ width: dishPct + '%', margin: `${-dishPct / 2}% 0 0 ${-dishPct / 2}%`, transform: `rotate(${s.a}deg) translateX(${ringTx}%) rotate(${-s.a}deg)` }">
          <!-- pizzas turn with the board; plates and wraps stay upright -->
          <img v-if="s.near" :src="s.f.image" alt="" class="wh-dish" :style="{ transform: isPizza ? 'none' : `rotate(${-turn}deg)` }" draggable="false">
        </div>
      </div>

      <!-- Ingredients dropping in around the dish in front -->
      <div class="wh-float" :style="{ left: front.x + 'cqw', top: `calc(${geo.cy}% + ${front.dy}cqw)`, width: geo.size + 'cqw' }">
        <TransitionGroup name="wh-ing">
          <img v-for="f in floaters" :key="f.id" :src="f.icon" alt="" class="wh-ing"
            :style="{ left: 50 + f.x + '%', top: 50 + f.y + '%', rotate: f.r + 'deg', transitionDelay: f.d + 'ms' }">
        </TransitionGroup>
        <button type="button" class="wh-peek" @click="openFood(cur, cat.name)">{{ t('shopSeeIngredients') }}</button>
      </div>
    </div>

    <!-- What's in front: name, story, ingredients, allergens, price -->
    <Transition name="wh-txt" mode="out-in">
      <div :key="cur.id" class="wh-info">
        <div class="wh-count"><span>{{ pad(index + 1) }}</span><i></i><span>{{ pad(items.length) }}</span></div>
        <h2>{{ cur.name }}</h2>
        <p v-if="cur.description" class="wh-desc">{{ cur.description }}</p>
        <div v-if="ingredients.length" class="wh-chips"><span v-for="n in ingredients" :key="n">{{ n }}</span></div>
        <div v-if="cur.allergens?.length" class="wh-chips alg"><span v-for="a in cur.allergens" :key="a">{{ t('alg_' + a) }}</span></div>
        <div class="wh-buy">
          <div class="wh-price">
            <template v-if="sizes.length > 1"><span v-for="z in sizes" :key="z.id"><small>{{ z.label || z.code }}</small><b>{{ kr(z.price) }}</b><i>{{ shop.restaurant.currency }}</i></span></template>
            <span v-else-if="sizes.length"><b>{{ kr(sizes[0].price) }}</b><i>{{ shop.restaurant.currency }}</i></span>
          </div>
          <button type="button" class="wh-cta" @click="openFood(cur, cat.name)">{{ t('shopOrderThis') }} <Icon name="arrowRight" :size="16" class="flip-rtl" /></button>
        </div>
      </div>
    </Transition>

    <!-- Progress dots and arrows -->
    <div class="wh-nav">
      <button type="button" class="wh-arrow" :aria-label="t('shopBack')" @click="stopAuto(); prev()"><Icon name="chevronLeft" :size="18" class="flip-rtl" /></button>
      <div class="wh-dots"><i v-for="(f, k) in items" :key="f.id" :class="{ on: k === index }" @click="stopAuto(); go(k)"></i></div>
      <button type="button" class="wh-arrow" aria-label="→" @click="stopAuto(); next()"><Icon name="chevronRight" :size="18" class="flip-rtl" /></button>
    </div>
  </section>
</template>
