<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { t } from '../i18n.js';
import Icon from '../components/Icon.vue';
import { SLOTS, photos, loadPhotos, variants, slotRow, cutOut, saveSlot, removeSlot, generate } from '../food/photos.js';
import { kindOf, modeOf } from '../food/art.js';
import { api } from '../api.js';

// What this restaurant's menu actually uses: ingredient kinds (with the menu's own names) and dish types.
const engine = ref(null); // { gemini, workersAi }
const menu = reactive({ names: {}, pizza: false, burger: false, loaded: false });
async function loadMenu() {
  try {
    const cats = (await api('/catalog')).data;
    const names = {};
    for (const c of cats) for (const f of c.foods) {
      const mode = modeOf(f, c.name);
      if (mode === 'pizza') menu.pizza = true;
      if (mode === 'burger') menu.burger = true;
      for (const comp of f.components) (names[kindOf(comp.name)] ||= new Set()).add(comp.name.trim());
    }
    menu.names = Object.fromEntries(Object.entries(names).map(([k, v]) => [k, [...v].slice(0, 4)]));
  } catch {}
  menu.loaded = true;
}
const BURGER_BASE = new Set(['bun_top', 'bun_bottom', 'beef']);
/** Is this photo needed by the current menu? */
function inMenu(slot) {
  if (slot.key.startsWith('base.')) return menu.pizza;
  if (slot.key.startsWith('side.')) return menu.burger && (BURGER_BASE.has(slot.kind) || !!menu.names[slot.kind]);
  return !!menu.names[slot.kind];
}
const groups = computed(() => SLOTS.map((g) => ({ ...g, items: [...g.items].sort((a, b) => inMenu(b) - inMenu(a)) })));

const busy = reactive({}); // key -> 'gen' | 'up'
const errs = reactive({});
const removeBg = ref(true);
const bulk = ref(null); // { done, total }
const bulkErr = ref('');
const fileFor = ref(null);
const fileInput = ref(null);

// First visit with no photos at all: start making them right away.
onMounted(async () => {
  await Promise.all([loadPhotos(true), loadMenu(), api('/ai/status').then((r) => (engine.value = r.data)).catch(() => {})]);
  if (have.value === 0 && total.value > 0) genMissing();
});

const total = computed(() => SLOTS.reduce((a, g) => a + g.items.filter(inMenu).length, 0));
const hasPhoto = (s) => variants(s.key).length > 0;
const have = computed(() => (photos.map, SLOTS.reduce((a, g) => a + g.items.filter((s) => inMenu(s) && hasPhoto(s)).length, 0)));

async function gen(slot) {
  busy[slot.key] = 'gen';
  errs[slot.key] = '';
  try {
    const src = await generate(slot);
    const cuts = await cutOut(src, { removeBg: true, parts: slot.parts || 1 });
    await saveSlot(slot, cuts, 'ai');
  } catch (e) {
    errs[slot.key] = e.message;
    throw e;
  } finally {
    delete busy[slot.key];
  }
}

async function genMissing() {
  const todo = SLOTS.flatMap((g) => g.items).filter((s) => !hasPhoto(s) && inMenu(s));
  bulk.value = { done: 0, total: todo.length };
  for (const s of todo) {
    try { await gen(s); } catch (e) { if (e.status === 501 || e.status === 429) { bulkErr.value = e.message; break; } }
    bulk.value.done++;
  }
  bulk.value = null;
}

function pickFile(slot) {
  fileFor.value = slot;
  fileInput.value.value = '';
  fileInput.value.click();
}
async function onFile(e) {
  const f = e.target.files?.[0];
  const slot = fileFor.value;
  if (!f || !slot) return;
  busy[slot.key] = 'up';
  errs[slot.key] = '';
  try {
    const url = URL.createObjectURL(f);
    const cuts = await cutOut(url, { removeBg: removeBg.value, parts: removeBg.value ? slot.parts || 1 : 1 });
    await saveSlot(slot, cuts, 'upload');
  } catch (err) {
    errs[slot.key] = err.message;
  } finally {
    delete busy[slot.key];
  }
}

async function remove(slot) {
  if (!confirm(t('confirmRemovePhoto'))) return;
  try {
    await removeSlot(slot);
  } catch (e) {
    errs[slot.key] = e.message;
  }
}
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div class="lead">
        <p>{{ t('photosLead') }}</p>
      </div>
      <label class="check"><input v-model="removeBg" type="checkbox"> {{ t('removeBg') }}</label>
      <button class="btn primary" type="button" :disabled="!!bulk || have === total" @click="genMissing">
        <Icon name="sparkle" />{{ bulk ? `${t('generating')} ${bulk.done}/${bulk.total}` : t('genAll') }}
      </button>
    </header>

    <p v-if="bulkErr" class="form-error">{{ bulkErr }}</p>
    <div class="card photo-note">
      <Icon name="sparkle" />
      <p>{{ t('photosAiNote') }}</p>
      <span v-if="engine" class="pill" :class="engine.gemini ? 'st-ready' : engine.workersAi ? 'st-preparing' : 'st-cancelled'">{{ engine.gemini ? 'Gemini' : engine.workersAi ? 'Cloudflare AI' : t('noAi') }}</span>
      <span class="pill plain">{{ have }} / {{ total }}</span>
    </div>

    <section v-for="g in groups" :key="g.group" class="card">
      <div class="card-head"><h2>{{ t('group_' + g.group) }}</h2><span class="muted">{{ g.items.filter(hasPhoto).length }} / {{ g.items.length }}</span></div>
      <div class="card-body photo-grid">
        <article v-for="s in g.items" :key="s.key" class="photo-card" :class="{ off: menu.loaded && !inMenu(s) }">
          <div class="ph-box">
            <div v-if="variants(s.key).length > 1" class="ph-pieces"><img v-for="u in variants(s.key)" :key="u" :src="u" alt=""></div>
            <img v-else-if="variants(s.key).length" :src="variants(s.key)[0]" alt="">
            <span v-else class="ph-empty"><Icon name="components" :size="26" />{{ t('noPhotoYet') }}</span>
            <span v-if="busy[s.key]" class="ph-busy"><span class="spinner"></span>{{ busy[s.key] === 'gen' ? t('generating') : t('upload') }}…</span>
            <span class="ph-src pill plain">{{ slotRow(s.key) ? t({ ai: 'aiPhoto', upload: 'yourPhoto', library: 'libraryPhoto' }[slotRow(s.key).source]) : '—' }}</span>
          </div>
          <div class="ph-meta">
            <strong>{{ menu.names[s.kind]?.join(' · ') || s.label }}</strong>
            <small v-if="menu.names[s.kind]" class="muted">{{ s.label }}</small>
            <small v-else-if="menu.loaded && !inMenu(s)" class="muted">{{ t('notOnMenu') }}</small>
            <p v-if="errs[s.key]" class="ph-err">{{ errs[s.key] }}</p>
          </div>
          <div class="ph-actions">
            <button class="btn sm soft" type="button" :disabled="!!busy[s.key] || !!bulk" :title="t('generate')" @click="gen(s).catch(() => {})"><Icon name="sparkle" :size="16" />{{ slotRow(s.key) ? t('regenerate') : t('generate') }}</button>
            <button class="icon-btn sm bordered" type="button" :disabled="!!busy[s.key]" :title="t('upload')" :aria-label="t('upload')" @click="pickFile(s)"><Icon name="import" :size="16" /></button>
            <button v-if="slotRow(s.key) && slotRow(s.key).source !== 'library'" class="icon-btn sm bordered" type="button" :title="t('remove')" :aria-label="t('remove')" @click="remove(s)"><Icon name="trash" :size="16" /></button>
          </div>
        </article>
      </div>
    </section>

    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile">
  </section>
</template>

<style scoped>
.check { display: inline-flex; align-items: center; gap: 8px; color: var(--text-2); font-weight: 500; }
.check input { width: 18px; height: 18px; accent-color: var(--brand-strong); }
.photo-note { display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: var(--brand-soft); border-color: transparent; }
.photo-note p { flex: 1; color: var(--text-2); }
.photo-note .ico { color: var(--brand-text); }
.photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
.photo-card { display: grid; gap: 8px; padding: 8px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface); }
.ph-box { position: relative; aspect-ratio: 1; border-radius: 10px; display: grid; place-items: center; overflow: hidden;
  background: repeating-conic-gradient(var(--sunken) 0 25%, var(--surface) 0 50%) 0 0 / 16px 16px; }
.ph-box img { max-width: 86%; max-height: 86%; object-fit: contain; filter: drop-shadow(0 6px 10px rgba(0,0,0,.18)); }
.ph-pieces { width: 86%; height: 86%; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; place-items: center; }
.ph-pieces img { max-width: 100%; max-height: 100%; }
.ph-empty { display: grid; justify-items: center; gap: 6px; color: var(--muted); font-size: 12px; font-weight: 500; }
.ph-busy { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 8px; background: color-mix(in srgb, var(--surface) 80%, transparent); font-weight: 600; font-size: 13px; }
.ph-src { position: absolute; top: 6px; inset-inline-start: 6px; background: var(--surface); box-shadow: var(--sh-1); }
.ph-meta strong { font-size: 13px; display: block; }
.ph-meta small { display: block; font-size: 11.5px; }
.photo-card.off { opacity: .6; }
.ph-err { color: var(--red); font-size: 12px; margin-top: 2px; }
.ph-actions { display: flex; gap: 6px; }
.ph-actions .btn { flex: 1; }
.spinner { width: 22px; height: 22px; border-radius: 50%; border: 3px solid var(--line); border-top-color: var(--brand-strong); animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
