<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../api.js';
import { money, refreshActiveCount } from '../store.js';
import { t } from '../i18n.js';
import Icon from '../components/Icon.vue';
import Receipt from '../components/Receipt.vue';

const ACTIVE = ['new', 'accepted', 'preparing', 'ready'];
const HISTORY_TABS = ['all', 'completed', 'cancelled', ...ACTIVE];
const NEXT = { new: 'accepted', accepted: 'preparing', preparing: 'ready', ready: 'completed' };
const TYPE_ICON = { takeaway: 'bag', dine_in: 'dine', delivery: 'truck' };

const route = useRoute();
const read = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const view = ref(read('orders.view', 'board'));
const tab = ref('all');
const type = ref('');
const search = ref('');
const active = ref([]);
const history = ref([]);
const err = ref('');
const selected = ref(null);
const busy = ref(false);
const sound = ref(read('orders.sound', 'on') !== 'off');
const printing = ref(null);
const now = ref(Date.now());
let lastNow = null;
let timer = null;
let clock = null;
let knownIds = new Set();

watch(view, (v) => { try { localStorage.setItem('orders.view', v); } catch {} load(); });

async function load() {
  err.value = '';
  try {
    if (view.value === 'board') {
      const res = await api('/orders', { query: { status: 'active', type: type.value, search: search.value, limit: 200 } });
      active.value = res.data.slice().reverse(); // oldest first: work the queue from the top
      lastNow = res.now;
      res.data.forEach((o) => knownIds.add(o.id));
    } else {
      const res = await api('/orders', { query: { status: tab.value, type: type.value, search: search.value, limit: 100 } });
      history.value = res.data;
      lastNow = res.now;
      res.data.forEach((o) => knownIds.add(o.id));
    }
  } catch (e) {
    err.value = e.message;
  }
}

// Every 8 s, ask only for orders changed since the last call; beep on brand-new ones.
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
    refreshActiveCount();
    if (selected.value) open(selected.value.id, true);
  } catch {}
}

function beep() {
  if (!sound.value) return;
  try {
    const ctx = new AudioContext();
    [0, 0.22, 0.44].forEach((delay, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = [880, 1100, 1320][i];
      g.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.2);
    });
  } catch {}
}

function toggleSound() {
  sound.value = !sound.value;
  try { localStorage.setItem('orders.sound', sound.value ? 'on' : 'off'); } catch {}
  if (sound.value) beep();
}

async function open(id, quiet = false) {
  try {
    selected.value = (await api(`/orders/${id}`)).data;
  } catch (e) {
    if (!quiet) err.value = e.message;
  }
}

async function move(order, status) {
  if (status === 'cancelled' && !confirm(t('confirmCancel'))) return;
  busy.value = true;
  try {
    const updated = (await api(`/orders/${order.id}/status`, { method: 'PATCH', body: { status } })).data;
    if (selected.value?.id === order.id) selected.value = updated;
    await load();
    refreshActiveCount();
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

onMounted(async () => {
  await load();
  if (route.query.open) open(Number(route.query.open));
  timer = setInterval(poll, 8000);
  clock = setInterval(() => (now.value = Date.now()), 30000);
});
onUnmounted(() => { clearInterval(timer); clearInterval(clock); });

const columns = computed(() => ACTIVE.map((s) => ({ s, list: active.value.filter((o) => o.status === s) })));
const mins = (s) => Math.max(0, Math.round((now.value - new Date(s)) / 60000));
const ageClass = (s) => { const m = mins(s); return m >= 20 ? 'late' : m >= 10 ? 'warn' : ''; };
const ago = (s) => { const m = mins(s); return m < 1 ? '<1 min' : m < 60 ? `${m} min` : new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
const who = (o) => o.customer_name || (o.table_no ? `${t('table')} ${o.table_no}` : t('walkIn'));
const nextStatus = computed(() => (selected.value ? NEXT[selected.value.status] : null));
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div class="lead"><span class="live">{{ t('live') }}</span></div>
      <div class="seg">
        <button type="button" :class="{ on: view === 'board' }" @click="view = 'board'"><Icon name="board" :size="16" />{{ t('board') }}</button>
        <button type="button" :class="{ on: view === 'list' }" @click="view = 'list'"><Icon name="list" :size="16" />{{ t('list') }}</button>
      </div>
      <button class="icon-btn bordered" type="button" :title="sound ? t('soundOn') : t('soundOff')" :aria-label="sound ? t('soundOn') : t('soundOff')" @click="toggleSound"><Icon :name="sound ? 'bell' : 'bellOff'" /></button>
      <RouterLink to="/pos" class="btn primary"><Icon name="plus" />{{ t('newOrder') }}</RouterLink>
    </header>

    <div class="toolbar">
      <div v-if="view === 'list'" class="tabs" role="tablist">
        <button v-for="s in HISTORY_TABS" :key="s" role="tab" type="button" :aria-selected="tab === s" :class="{ on: tab === s }" @click="tab = s">{{ s === 'all' ? t('all') : t('st_' + s) }}</button>
      </div>
      <div class="seg">
        <button type="button" :class="{ on: !type }" @click="type = ''">{{ t('all') }}</button>
        <button v-for="ty in ['takeaway', 'dine_in', 'delivery']" :key="ty" type="button" :class="{ on: type === ty }" :title="t('ty_' + ty)" @click="type = ty"><Icon :name="TYPE_ICON[ty]" :size="16" /><span class="hide-sm">{{ t('ty_' + ty) }}</span></button>
      </div>
      <label class="search"><Icon name="search" /><input v-model="search" type="search" :placeholder="t('search')" :aria-label="t('search')"></label>
    </div>

    <p v-if="err" class="form-error">{{ err }}</p>

    <!-- BOARD -->
    <div v-if="view === 'board'" class="board">
      <section v-for="c in columns" :key="c.s" class="col">
        <header class="col-head"><span class="pill" :class="'st-' + c.s">{{ t('st_' + c.s) }}</span><span class="grow"></span><span class="n">{{ c.list.length }}</span></header>
        <div v-if="!c.list.length" class="empty">{{ t('emptyColumn') }}</div>
        <article v-for="o in c.list" :key="o.id" class="ocard" :class="{ sel: selected?.id === o.id, fresh: o.status === 'new' }" tabindex="0" role="button" @click="open(o.id)" @keydown.enter="open(o.id)">
          <div class="ocard-top">
            <span class="mono">#{{ o.code }}</span>
            <span class="age" :class="ageClass(o.created_at)"><Icon name="clock" :size="13" :stroke="2.2" />{{ ago(o.created_at) }}</span>
          </div>
          <div class="ocard-meta"><Icon :name="TYPE_ICON[o.type]" :size="16" />{{ t('ty_' + o.type) }} · {{ who(o) }}</div>
          <div class="ocard-items">{{ o.items_preview }}</div>
          <div class="ocard-foot">
            <strong class="num">{{ money(o.total) }}</strong>
            <button v-if="NEXT[o.status]" class="btn sm" :class="o.status === 'ready' ? 'primary' : 'dark'" type="button" :disabled="busy" @click.stop="move(o, NEXT[o.status])">{{ t('next_' + NEXT[o.status]) }}<Icon name="arrowRight" :size="15" /></button>
          </div>
        </article>
      </section>
    </div>

    <!-- LIST -->
    <template v-else>
      <div class="card table-wrap">
        <table class="table">
          <thead>
            <tr><th>#</th><th>{{ t('time') }}</th><th>{{ t('type') }}</th><th>{{ t('customer') }}</th><th>{{ t('items') }}</th><th>{{ t('payment') }}</th><th>{{ t('status') }}</th><th style="text-align: end">{{ t('total') }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="o in history" :key="o.id" :class="{ sel: selected?.id === o.id }" tabindex="0" @click="open(o.id)" @keydown.enter="open(o.id)">
              <td class="mono">#{{ o.code }}</td>
              <td>{{ new Date(o.created_at).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }}</td>
              <td><span style="display: inline-flex; gap: 6px; align-items: center"><Icon :name="TYPE_ICON[o.type]" :size="16" />{{ t('ty_' + o.type) }}</span></td>
              <td>{{ who(o) }}<small v-if="o.customer_phone"> · {{ o.customer_phone }}</small></td>
              <td>{{ o.item_count }}</td>
              <td>{{ t('pay_' + o.payment_method) }}</td>
              <td><span class="pill" :class="'st-' + o.status">{{ t('st_' + o.status) }}</span></td>
              <td class="num" style="text-align: end; font-weight: 600">{{ money(o.total) }}</td>
            </tr>
            <tr v-if="!history.length"><td colspan="8" class="empty"><Icon name="orders" :size="32" />{{ t('noOrders') }}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="cards-list">
        <article v-for="o in history" :key="o.id" class="ocard" @click="open(o.id)">
          <div class="ocard-top"><span class="mono">#{{ o.code }}</span><span class="pill" :class="'st-' + o.status">{{ t('st_' + o.status) }}</span></div>
          <div class="ocard-meta"><Icon :name="TYPE_ICON[o.type]" :size="16" />{{ t('ty_' + o.type) }} · {{ who(o) }} · {{ ago(o.created_at) }}</div>
          <div class="ocard-items">{{ o.items_preview }}</div>
          <div class="ocard-foot"><strong class="num">{{ money(o.total) }}</strong><span class="muted">{{ t('pay_' + o.payment_method) }}</span></div>
        </article>
        <div v-if="!history.length" class="empty card"><Icon name="orders" :size="32" />{{ t('noOrders') }}</div>
      </div>
    </template>

    <!-- DETAILS -->
    <transition name="fade"><div v-if="selected" class="backdrop" @click="selected = null"></div></transition>
    <transition name="drawer">
      <aside v-if="selected" class="drawer" role="dialog" aria-modal="true" :aria-label="t('orderDetails')">
        <header class="drawer-head">
          <div class="grow">
            <h2 class="mono">#{{ selected.code }}</h2>
            <span class="pill" :class="'st-' + selected.status">{{ t('st_' + selected.status) }}</span>
          </div>
          <button class="icon-btn" type="button" :aria-label="t('print')" @click="print(selected)"><Icon name="print" /></button>
          <button class="icon-btn" type="button" :aria-label="t('close')" @click="selected = null"><Icon name="x" /></button>
        </header>
        <div class="drawer-body">
          <dl class="meta-grid">
            <div><dt>{{ t('type') }}</dt><dd>{{ t('ty_' + selected.type) }}<template v-if="selected.table_no"> · {{ t('table') }} {{ selected.table_no }}</template></dd></div>
            <div><dt>{{ t('time') }}</dt><dd>{{ new Date(selected.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }} · {{ ago(selected.created_at) }}</dd></div>
            <div><dt>{{ t('payment') }}</dt><dd>{{ t('pay_' + selected.payment_method) }}</dd></div>
            <div><dt>{{ t('customer') }}</dt><dd>{{ who(selected) }}<template v-if="selected.customer_phone"> · {{ selected.customer_phone }}</template></dd></div>
            <div v-if="selected.address" class="wide"><dt>{{ t('address') }}</dt><dd>{{ selected.address }}</dd></div>
            <div v-if="selected.note" class="wide"><dt>{{ t('note') }}</dt><dd>{{ selected.note }}</dd></div>
          </dl>

          <ul class="lines">
            <li v-for="it in selected.items" :key="it.id">
              <div class="line-main"><span class="q">{{ it.qty }}×</span><span class="n">{{ it.name }}<small v-if="it.size_label" class="muted"> · {{ it.size_label }}</small></span><span class="num">{{ money(it.line_total) }}</span></div>
              <div v-for="a in it.added" :key="'a' + a.id" class="line-sub plus">+ {{ a.name }}<template v-if="a.price"> ({{ money(a.price) }})</template></div>
              <div v-for="r in it.removed" :key="'r' + r.id" class="line-sub minus">− {{ t('without') }} {{ r.name }}</div>
              <div v-if="it.note" class="line-sub">“{{ it.note }}”</div>
            </li>
          </ul>

          <div class="totals">
            <div class="muted"><span>{{ t('subtotal') }}</span><span class="num">{{ money(selected.subtotal) }}</span></div>
            <div v-if="selected.discount" class="muted"><span>{{ t('discount') }}</span><span class="num">−{{ money(selected.discount) }}</span></div>
            <div class="muted"><span>{{ t('vat') }}</span><span class="num">{{ money(selected.tax_total) }}</span></div>
            <div class="grand"><span>{{ t('total') }}</span><span class="num">{{ money(selected.total) }}</span></div>
          </div>

          <div>
            <h3 style="margin-bottom: 10px">{{ t('history') }}</h3>
            <ol class="timeline">
              <li v-for="(e, i) in selected.events" :key="i"><div><b>{{ t('st_' + e.status) }}</b><br><small>{{ new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}<template v-if="e.user_name"> · {{ e.user_name }}</template></small></div></li>
            </ol>
          </div>
        </div>
        <footer class="drawer-foot">
          <button v-if="!['completed', 'cancelled'].includes(selected.status)" class="btn danger" type="button" :disabled="busy" @click="move(selected, 'cancelled')">{{ t('cancelOrder') }}</button>
          <button v-if="nextStatus" class="btn primary lg grow" type="button" :disabled="busy" @click="move(selected, nextStatus)"><Icon name="check" />{{ t('next_' + nextStatus) }}</button>
          <button v-else class="btn ghost lg grow" type="button" @click="print(selected)"><Icon name="print" />{{ t('print') }}</button>
        </footer>
      </aside>
    </transition>

    <div class="print-only"><Receipt v-if="printing" :order="printing" /></div>
  </section>
</template>
