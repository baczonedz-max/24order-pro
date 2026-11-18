<script setup>
// Product builder: pick a size, remove included ingredients, add extras, and watch the dish update live.
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { money } from '../store.js';
import { t } from '../i18n.js';
import Icon from './Icon.vue';
import FoodStage from '../food/FoodStage.vue';
import { kindOf, modeOf } from '../food/art.js';
import { loadPhotos, thumbPile } from '../food/photos.js';

const props = defineProps({
  food: { type: Object, required: true },
  line: { type: Object, default: null },
  categoryName: { type: String, default: '' },
});
const emit = defineEmits(['close', 'save']);

const sizeId = ref(props.line?.size_id ?? props.food.sizes[0]?.id);
const removed = ref(new Set(props.line?.remove || []));
const added = ref(new Set(props.line?.add || []));
const qty = ref(props.line?.qty || 1);
const note = ref(props.line?.note || '');
const bumped = ref(null);

const mode = computed(() => modeOf(props.food, props.categoryName));
const size = computed(() => props.food.sizes.find((s) => s.id === sizeId.value));
const comps = computed(() => props.food.components.map((c) => ({ ...c, kind: kindOf(c.name) })));
const base = computed(() => comps.value.filter((c) => c.state === 'selected'));
const extras = computed(() => comps.value.filter((c) => c.state === 'optional'));
const extraPrice = (c) => (c.extra_by_size && size.value?.code && c.extra_by_size[size.value.code] !== undefined ? Number(c.extra_by_size[size.value.code]) : Number(c.extra_price || 0));
const unit = computed(() => Number(size.value?.price || 0) + extras.value.filter((c) => added.value.has(c.id)).reduce((a, c) => a + extraPrice(c), 0));

const stageItems = computed(() => comps.value.map((c) => ({
  id: c.id, name: c.name, kind: c.kind, base: c.state === 'selected',
  on: c.state === 'selected' ? !removed.value.has(c.id) : added.value.has(c.id),
})));

const title = computed(() => ({ pizza: t('buildPizza'), burger: t('buildBurger') })[mode.value] || t('buildDish'));

function toggle(which, id) {
  const r = which === 'removed' ? removed : added;
  const s = new Set(r.value);
  s.has(id) ? s.delete(id) : s.add(id);
  r.value = s;
  bumped.value = null;
  requestAnimationFrame(() => (bumped.value = id));
}

function save() {
  emit('save', {
    key: props.line?.key || crypto.randomUUID(),
    food_id: props.food.id,
    size_id: sizeId.value,
    add: [...added.value],
    remove: [...removed.value],
    qty: qty.value,
    note: note.value.trim(),
  });
}

const onKey = (e) => e.key === 'Escape' && emit('close');
onMounted(() => { loadPhotos(); window.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden'; });
onUnmounted(() => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; });
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal builder" role="dialog" aria-modal="true" :aria-label="food.name">
      <button class="icon-btn close-fab" type="button" :aria-label="t('close')" @click="emit('close')"><Icon name="x" /></button>

      <section class="stage">
        <div class="stage-head">
          <div class="t">
            <small>{{ title }}<template v-if="food.number"> · #{{ food.number }}</template></small>
            <h2>{{ food.name }}</h2>
            <p v-if="food.description">{{ food.description }}</p>
          </div>
        </div>
        <div class="stage-art">
          <FoodStage :mode="mode" :image="food.image || ''" :items="stageItems" />
        </div>
        <div class="stage-sum">
          <span v-if="food.sizes.length > 1 && size" class="mod note">{{ size.label || size.code }}</span>
          <span v-for="c in base.filter((c) => removed.has(c.id))" :key="'r' + c.id" class="mod minus">{{ c.name }}</span>
          <span v-for="c in extras.filter((c) => added.has(c.id))" :key="'a' + c.id" class="mod plus">+ {{ c.name }}</span>
        </div>
        <p v-if="comps.length" class="stage-hint">{{ t('builderHint') }}</p>
      </section>

      <section class="opts">
        <div class="opts-scroll">
          <div v-if="food.sizes.length > 1" class="opts-sec">
            <h3>{{ t('chooseSize') }}</h3>
            <div class="size-grid">
              <button v-for="s in food.sizes" :key="s.id" type="button" class="size-card" :class="{ on: sizeId === s.id }" :aria-pressed="sizeId === s.id" @click="sizeId = s.id">
                <b>{{ s.label || s.code }}</b><span>{{ money(s.price) }}</span>
              </button>
            </div>
          </div>

          <div v-if="base.length" class="opts-sec">
            <h3>{{ t('included') }} <small>{{ t('includedHint') }}</small></h3>
            <div class="ing-grid">
              <button v-for="c in base" :key="c.id" type="button" class="ing" :class="[removed.has(c.id) ? 'out' : 'in', { bump: bumped === c.id }]" :aria-pressed="!removed.has(c.id)" @click="toggle('removed', c.id)">
                <span class="mark"><Icon :name="removed.has(c.id) ? 'x' : 'check'" :size="13" :stroke="3" /></span>
                <span class="th" :class="{ pile: thumbPile(c.kind).length > 1 }"><img v-for="(u, k) in thumbPile(c.kind)" :key="u" :src="u" alt="" :class="'p' + k"><b v-if="!thumbPile(c.kind).length" class="th-letter">{{ c.name.trim().slice(0, 1).toUpperCase() }}</b></span>
                <span class="nm">{{ c.name }}</span>
                <span class="pr">{{ t('inBase') }}</span>
              </button>
            </div>
          </div>

          <div v-if="extras.length" class="opts-sec">
            <h3>{{ t('extras') }} <small>{{ t('extrasHint') }}</small></h3>
            <div class="ing-grid">
              <button v-for="c in extras" :key="c.id" type="button" class="ing" :class="{ on: added.has(c.id), bump: bumped === c.id }" :aria-pressed="added.has(c.id)" @click="toggle('added', c.id)">
                <span class="mark"><Icon name="check" :size="13" :stroke="3" /></span>
                <span class="th" :class="{ pile: thumbPile(c.kind).length > 1 }"><img v-for="(u, k) in thumbPile(c.kind)" :key="u" :src="u" alt="" :class="'p' + k"><b v-if="!thumbPile(c.kind).length" class="th-letter">{{ c.name.trim().slice(0, 1).toUpperCase() }}</b></span>
                <span class="nm">{{ c.name }}</span>
                <span class="pr">{{ extraPrice(c) ? '+' + money(extraPrice(c)) : t('free') }}</span>
              </button>
            </div>
          </div>

          <label class="field opts-sec">
            <span>{{ t('note') }}</span>
            <textarea v-model="note" maxlength="200" rows="2" :placeholder="t('notePh')" />
          </label>
        </div>

        <footer class="opts-foot">
          <div class="stepper lg">
            <button type="button" class="icon-btn" :aria-label="t('remove')" :disabled="qty <= 1" @click="qty--"><Icon name="minus" /></button>
            <b aria-live="polite">{{ qty }}</b>
            <button type="button" class="icon-btn" aria-label="+" :disabled="qty >= 99" @click="qty++"><Icon name="plus" /></button>
          </div>
          <button class="btn primary lg" type="button" @click="save">
            <span>{{ line ? t('save') : t('addToCart') }}</span><span class="num">{{ money(unit * qty) }}</span>
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>
