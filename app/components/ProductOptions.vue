<script setup>
import { ref, computed, onMounted } from 'vue';
import { money } from '../store.js';
import { t } from '../i18n.js';
import Icon from './Icon.vue';

const props = defineProps({ food: { type: Object, required: true }, line: { type: Object, default: null } });
const emit = defineEmits(['close', 'save']);

const sizeId = ref(props.line?.size_id ?? props.food.sizes[0]?.id);
const removed = ref(new Set(props.line?.remove || []));
const added = ref(new Set(props.line?.add || []));
const qty = ref(props.line?.qty || 1);
const note = ref(props.line?.note || '');
const dialog = ref(null);

const size = computed(() => props.food.sizes.find((s) => s.id === sizeId.value));
const base = computed(() => props.food.components.filter((c) => c.state === 'selected'));
const extras = computed(() => props.food.components.filter((c) => c.state === 'optional'));
const extraPrice = (c) => (c.extra_by_size && size.value?.code && c.extra_by_size[size.value.code] !== undefined ? Number(c.extra_by_size[size.value.code]) : Number(c.extra_price || 0));
const unit = computed(() => Number(size.value?.price || 0) + extras.value.filter((c) => added.value.has(c.id)).reduce((a, c) => a + extraPrice(c), 0));

// Pass the ref by name: in the template Vue unwraps refs, so a ref can't be passed as an argument.
const sets = { removed, added };
const toggle = (which, id) => {
  const r = sets[which];
  const s = new Set(r.value);
  s.has(id) ? s.delete(id) : s.add(id);
  r.value = s;
};

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

onMounted(() => dialog.value?.focus());
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')" @keydown.esc="emit('close')">
    <div ref="dialog" class="modal po" role="dialog" aria-modal="true" :aria-label="food.name" tabindex="-1">
      <header class="po-head">
        <img v-if="food.image" :src="food.image" alt="" class="po-photo">
        <div>
          <small v-if="food.number" class="muted">#{{ food.number }}</small>
          <h2>{{ food.name }}</h2>
          <p v-if="food.description" class="muted">{{ food.description }}</p>
        </div>
        <button class="icon-btn" type="button" :aria-label="t('close')" @click="emit('close')"><Icon name="x" /></button>
      </header>

      <div class="po-body">
        <section v-if="food.sizes.length > 1">
          <h3>{{ t('size') }}</h3>
          <div class="chips">
            <button v-for="s in food.sizes" :key="s.id" type="button" class="chip size" :class="{ on: sizeId === s.id }" @click="sizeId = s.id">
              <b>{{ s.label || s.code }}</b><span>{{ money(s.price) }}</span>
            </button>
          </div>
        </section>

        <section v-if="base.length">
          <h3>{{ t('ingredients') }} <small class="muted">· {{ t('ingredientsHint') }}</small></h3>
          <div class="chips">
            <button v-for="c in base" :key="c.id" type="button" class="chip ing" :class="{ off: removed.has(c.id) }" :aria-pressed="!removed.has(c.id)" @click="toggle('removed', c.id)">
              <Icon :name="removed.has(c.id) ? 'x' : 'check'" :size="16" />{{ c.name }}
            </button>
          </div>
        </section>

        <section v-if="extras.length">
          <h3>{{ t('extras') }}</h3>
          <div class="chips">
            <button v-for="c in extras" :key="c.id" type="button" class="chip extra" :class="{ on: added.has(c.id) }" :aria-pressed="added.has(c.id)" @click="toggle('added', c.id)">
              <Icon :name="added.has(c.id) ? 'check' : 'plus'" :size="16" />{{ c.name }}<em v-if="extraPrice(c)">+{{ money(extraPrice(c), false) }}</em>
            </button>
          </div>
        </section>

        <label class="field"><span>{{ t('note') }}</span><input v-model="note" maxlength="200"></label>
      </div>

      <footer class="po-foot">
        <div class="stepper">
          <button type="button" class="icon-btn" :aria-label="t('remove')" :disabled="qty <= 1" @click="qty--"><Icon name="minus" /></button>
          <b aria-live="polite">{{ qty }}</b>
          <button type="button" class="icon-btn" aria-label="+" :disabled="qty >= 99" @click="qty++"><Icon name="plus" /></button>
        </div>
        <button class="btn primary grow" type="button" @click="save">{{ line ? t('save') : t('addToCart') }} · {{ money(unit * qty) }}</button>
      </footer>
    </div>
  </div>
</template>
