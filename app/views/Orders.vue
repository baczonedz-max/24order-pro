<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { api } from '../api.js';
import { money } from '../store.js';
import { t } from '../i18n.js';
import Icon from '../components/Icon.vue';
import Receipt from '../components/Receipt.vue';

const STATUS_TABS = ['active', 'new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled', 'all'];
const NEXT = { new: 'accepted', accepted: 'preparing', preparing: 'ready', ready: 'completed' };

const tab = ref('active');
const type = ref('');
const search = ref('');
const orders = ref([]);
const loading = ref(false);
const err = ref('');
const selected = ref(null);
const busy = ref(false);
const sound = ref(localStorage.getItem('orders.sound') !== 'off');
const printing = ref(null);
let lastNow = null;
let timer = null;
let knownIds = new Set();

async function load() {
  loading.value = true;
  err.value = '';
  try {
    const res = await api('/orders', { query: { status: tab.value, type: type.value, search: search.value, limit: 100 } });
    orders.value = res.data;
    lastNow = res.now;
    knownIds = new Set(res.data.map((o) => o.id));
  } catch (e) {
    err.value = e.message;
  } finally {
    loading.value = false;
  }
}

// Every 8 s, fetch only what changed since the last call.
async function poll() {
  if (!lastNow || document.hidden) return;
  try {
    const res = await api('/orders', { query: { since: lastNow, limit: 100 } });
    lastNow = res.now;
    if (!res.data.length) return;
    let fresh = false;
    for (const o of res.data) {
      if (!knownIds.has(o.id) && o.status === 'new') fresh = true;
      knownIds.add(o.id);
    }
    if (fresh) beep();
    await load();
    if (selected.value) open(selected.value.id, true);
  } catch {}
}

function beep() {
  if (!sound.value) return;
  try {
    const ctx = new AudioContext();
    [0, 0.25].forEach((delay) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.22);
    });
  } catch {}
}

function toggleSound() {
  sound.value = !sound.value;
  localStorage.setItem('orders.sound', sound.value ? 'on' : 'off');
  if (sound.value) beep();
}

async function open(id, quiet = false) {
  try {
    selected.value = (await api(`/orders/${id}`)).data;
  } catch (e) {
    if (!quiet) err.value = e.message;
  }
}

async function move(status) {
  if (status === 'cancelled' && !confirm(t('confirmCancel'))) return;
  busy.value = true;
  try {
    selected.value = (await api(`/orders/${selected.value.id}/status`, { method: 'PATCH', body: { status } })).data;
    await load();
  } catch (e) {
    err.value = e.message;
  } finally {
    busy.value = false;
  }
}

async function print(order) {
  printing.value = order;
  await nextTick();
  window.print();
}

let searchTimer;
watch(search, () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 300); });
watch([tab, type], load);

onMounted(() => {
  load();
  timer = setInterval(poll, 8000);
});
onUnmounted(() => clearInterval(timer));

const ago = (s) => {
  const m = Math.round((Date.now() - new Date(s)) / 60000);
  return m < 1 ? '<1 min' : m < 60 ? `${m} min` : new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const nextStatus = computed(() => (selected.value ? NEXT[selected.value.status] : null));
</script>

<template>
  <section class="page orders-page">
    <header class="page-head">
      <h1>{{ t('navOrders') }}</h1>
      <span class="live-dot">{{ t('live') }}</span>
      <div class="grow"></div>
      <button class="btn ghost" type="button" @click="toggleSound"><Icon :name="sound ? 'bell' : 'bellOff'" />{{ sound ? t('soundOn') : t('soundOff') }}</button>
      <RouterLink to="/pos" class="btn primary"><Icon name="plus" />{{ t('newOrder') }}</RouterLink>
    </header>

    <div class="toolbar">
      <div class="tabs" role="tablist">
        <button v-for="s in STATUS_TABS" :key="s" role="tab" type="button" :aria-selected="tab === s" :class="{ on: tab === s }" @click="tab = s">{{ s === 'all' ? t('all') : t('st_' + s) }}</button>
      </div>
      <select v-model="type" class="input" :aria-label="t('type')">
        <option value="">{{ t('type') }}: {{ t('all') }}</option>
        <option v-for="ty in ['takeaway', 'dine_in', 'delivery']" :key="ty" :value="ty">{{ t('ty_' + ty) }}</option>
      </select>
      <label class="search"><Icon name="search" /><input v-model="search" :placeholder="t('search')" :aria-label="t('search')"></label>
    </div>

    <p v-if="err" class="form-error">{{ err }}</p>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr><th>#</th><th>{{ t('time') }}</th><th>{{ t('type') }}</th><th>{{ t('customer') }}</th><th>{{ t('items') }}</th><th>{{ t('total') }}</th><th>{{ t('payment') }}</th><th>{{ t('status') }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id" :class="{ sel: selected?.id === o.id, fresh: o.status === 'new' }" tabindex="0" @click="open(o.id)" @keydown.enter="open(o.id)">
            <td class="mono">{{ o.code }}</td>
            <td>{{ ago(o.created_at) }}</td>
            <td>{{ t('ty_' + o.type) }}<small v-if="o.table_no"> · {{ o.table_no }}</small></td>
            <td>{{ o.customer_name || '—' }}<small v-if="o.customer_phone"> {{ o.customer_phone }}</small></td>
            <td>{{ o.item_count }}</td>
            <td class="num">{{ money(o.total) }}</td>
            <td>{{ t('pay_' + o.payment_method) }}</td>
            <td><span class="pill" :class="'st-' + o.status">{{ t('st_' + o.status) }}</span></td>
          </tr>
          <tr v-if="!orders.length && !loading"><td colspan="8" class="empty">{{ t('noOrders') }}</td></tr>
        </tbody>
      </table>
    </div>

    <transition name="drawer">
      <aside v-if="selected" class="drawer" role="dialog" :aria-label="'#' + selected.code">
        <header class="drawer-head">
          <div><h2>#{{ selected.code }}</h2><span class="pill" :class="'st-' + selected.status">{{ t('st_' + selected.status) }}</span></div>
          <button class="icon-btn" type="button" :aria-label="t('close')" @click="selected = null"><Icon name="x" /></button>
        </header>
        <div class="drawer-body">
          <dl class="meta">
            <div><dt>{{ t('type') }}</dt><dd>{{ t('ty_' + selected.type) }}<template v-if="selected.table_no"> · {{ t('table') }} {{ selected.table_no }}</template></dd></div>
            <div><dt>{{ t('time') }}</dt><dd>{{ new Date(selected.created_at).toLocaleString() }}</dd></div>
            <div v-if="selected.customer_name || selected.customer_phone"><dt>{{ t('customer') }}</dt><dd>{{ selected.customer_name }} {{ selected.customer_phone }}</dd></div>
            <div v-if="selected.address"><dt>{{ t('address') }}</dt><dd>{{ selected.address }}</dd></div>
            <div><dt>{{ t('payment') }}</dt><dd>{{ t('pay_' + selected.payment_method) }} · {{ t('src_' + selected.source) }}</dd></div>
            <div v-if="selected.note"><dt>{{ t('note') }}</dt><dd>{{ selected.note }}</dd></div>
          </dl>

          <ul class="lines">
            <li v-for="it in selected.items" :key="it.id">
              <div class="line-main"><b>{{ it.qty }}×</b><span>{{ it.name }}<small v-if="it.size_label"> · {{ it.size_label }}</small></span><span class="num">{{ money(it.line_total) }}</span></div>
              <div v-for="a in it.added" :key="'a' + a.id" class="line-sub plus">+ {{ a.name }}<template v-if="a.price"> ({{ money(a.price) }})</template></div>
              <div v-for="r in it.removed" :key="'r' + r.id" class="line-sub minus">− {{ t('without') }} {{ r.name }}</div>
              <div v-if="it.note" class="line-sub">“{{ it.note }}”</div>
            </li>
          </ul>

          <div class="totals">
            <div><span>{{ t('subtotal') }}</span><span>{{ money(selected.subtotal) }}</span></div>
            <div v-if="selected.discount"><span>{{ t('discount') }}</span><span>−{{ money(selected.discount) }}</span></div>
            <div class="grand"><span>{{ t('total') }}</span><span>{{ money(selected.total) }}</span></div>
            <div class="muted"><span>{{ t('vat') }}</span><span>{{ money(selected.tax_total) }}</span></div>
          </div>

          <details class="history">
            <summary>{{ t('history') }}</summary>
            <ol><li v-for="(e, i) in selected.events" :key="i">{{ t('st_' + e.status) }} · {{ new Date(e.at).toLocaleTimeString() }}<template v-if="e.user_name"> · {{ e.user_name }}</template></li></ol>
          </details>
        </div>
        <footer class="drawer-foot">
          <button v-if="nextStatus" class="btn primary grow" type="button" :disabled="busy" @click="move(nextStatus)"><Icon name="check" />{{ t('next_' + nextStatus) }}</button>
          <button class="btn ghost" type="button" @click="print(selected)"><Icon name="print" />{{ t('print') }}</button>
          <button v-if="!['completed', 'cancelled'].includes(selected.status)" class="btn danger" type="button" :disabled="busy" @click="move('cancelled')">{{ t('cancelOrder') }}</button>
        </footer>
      </aside>
    </transition>

    <div class="print-only"><Receipt v-if="printing" :order="printing" /></div>
  </section>
</template>
