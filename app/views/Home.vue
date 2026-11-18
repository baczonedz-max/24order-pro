<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '../api.js';
import { store, money } from '../store.js';
import { t, i18n } from '../i18n.js';
import Icon from '../components/Icon.vue';

const range = ref('today');
const data = ref(null);
const err = ref('');

const DAY = 864e5;
const bounds = computed(() => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + DAY);
  if (range.value === 'yesterday') return { from: new Date(start - DAY), to: start };
  if (range.value === 'week') return { from: new Date(start - 6 * DAY), to: end };
  if (range.value === 'month') return { from: new Date(start - 29 * DAY), to: end };
  return { from: start, to: end };
});

async function load() {
  err.value = '';
  try {
    data.value = (await api('/dashboard/summary', { query: { from: bounds.value.from.toISOString(), to: bounds.value.to.toISOString() } })).data;
  } catch (e) {
    err.value = e.message;
  }
}
onMounted(load);
watch(range, load);

const greeting = computed(() => {
  const h = new Date().getHours();
  return t(h < 12 ? 'goodMorning' : h < 18 ? 'goodAfternoon' : 'goodEvening');
});
const locale = computed(() => ({ ar: 'ar', en: 'en-GB', fr: 'fr-FR', no: 'nb-NO' })[i18n.lang]);
const today = computed(() => new Date().toLocaleDateString(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }));
const avg = computed(() => {
  const n = (data.value?.orders || 0) - (data.value?.cancelled || 0);
  return n > 0 ? data.value.revenue / n : 0;
});

/* Sales chart: hourly for a single day, daily for 7/30 days. */
const series = computed(() => {
  const pts = data.value?.points || [];
  const hourly = range.value === 'today' || range.value === 'yesterday';
  if (hourly) {
    const b = Array.from({ length: 24 }, (_, h) => ({ label: String(h).padStart(2, '0'), v: 0 }));
    for (const p of pts) b[new Date(p.t).getHours()].v += Number(p.total);
    // Show opening hours only: trim empty hours at both ends (keep at least 10:00–22:00).
    let lo = 10, hi = 22;
    b.forEach((x, i) => { if (x.v) { lo = Math.min(lo, i); hi = Math.max(hi, i); } });
    return b.slice(lo, hi + 1);
  }
  const days = range.value === 'week' ? 7 : 30;
  const from = bounds.value.from;
  const b = Array.from({ length: days }, (_, i) => {
    const d = new Date(from.getTime() + i * DAY);
    return { label: days === 7 ? d.toLocaleDateString(locale.value, { weekday: 'short' }) : String(d.getDate()), v: 0, d };
  });
  for (const p of pts) {
    const i = Math.floor((new Date(p.t) - from) / DAY);
    if (b[i]) b[i].v += Number(p.total);
  }
  return b;
});
const chart = computed(() => {
  const s = series.value;
  const W = 640, H = 240, L = 44, B = 26, T = 10;
  const max = Math.max(...s.map((x) => x.v), 1);
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step || 1;
  const bw = (W - L) / s.length;
  const every = s.length > 16 ? Math.ceil(s.length / 8) : 1;
  return {
    W, H,
    grid: [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: T + (H - B - T) * (1 - f), v: Math.round(top * f) })),
    bars: s.map((x, i) => {
      const h = ((H - B - T) * x.v) / top;
      return { x: L + i * bw + bw * 0.18, w: bw * 0.64, y: H - B - h, h, v: x.v, label: x.label, show: i % every === 0 };
    }),
    L, B,
  };
});

const TYPE_COLORS = { takeaway: '#ffc20e', dine_in: '#2563eb', delivery: '#7c3aed' };
const typeRows = computed(() => {
  const total = (data.value?.takeaway || 0) + (data.value?.dine_in || 0) + (data.value?.delivery || 0);
  let acc = 0;
  return ['takeaway', 'dine_in', 'delivery'].map((k) => {
    const n = data.value?.[k] || 0;
    const frac = total ? n / total : 0;
    const row = { k, n, pct: Math.round(frac * 100), color: TYPE_COLORS[k], dash: `${frac * 289} 289`, off: -acc * 289 };
    acc += frac;
    return row;
  });
});
const typeTotal = computed(() => typeRows.value.reduce((a, r) => a + r.n, 0));
const topMax = computed(() => Math.max(...(data.value?.top || []).map((p) => p.qty), 1));
const TYPE_ICON = { takeaway: 'bag', dine_in: 'dine', delivery: 'truck' };
const ago = (s) => {
  const m = Math.round((Date.now() - new Date(s)) / 60000);
  return m < 1 ? '<1 min' : m < 60 ? `${m} min` : new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
</script>

<template>
  <section class="page">
    <header class="page-head">
      <div class="lead">
        <h1>{{ greeting }}, {{ store.user?.name?.split(' ')[0] }}</h1>
        <p>{{ today }} · {{ t('homeLead') }}</p>
      </div>
      <div class="seg">
        <button v-for="r in ['today', 'yesterday', 'week', 'month']" :key="r" type="button" :class="{ on: range === r }" @click="range = r">{{ t(r) }}</button>
      </div>
      <RouterLink to="/pos" class="btn primary hide-sm"><Icon name="plus" />{{ t('newOrder') }}</RouterLink>
    </header>

    <p v-if="err" class="form-error">{{ err }}</p>

    <div class="kpis">
      <article class="card kpi">
        <div class="kpi-top"><span>{{ t('revenue') }}</span><span class="kpi-ico c1"><Icon name="coins" /></span></div>
        <strong class="num">{{ data ? money(data.revenue) : '—' }}</strong>
      </article>
      <article class="card kpi">
        <div class="kpi-top"><span>{{ t('ordersCount') }}</span><span class="kpi-ico c2"><Icon name="orders" /></span></div>
        <strong class="num">{{ data?.orders ?? '—' }}</strong>
        <small v-if="data?.cancelled">{{ data.cancelled }} {{ t('cancelledOrders').toLowerCase() }}</small>
      </article>
      <article class="card kpi">
        <div class="kpi-top"><span>{{ t('avgOrder') }}</span><span class="kpi-ico c3"><Icon name="trend" /></span></div>
        <strong class="num">{{ data ? money(avg) : '—' }}</strong>
      </article>
      <RouterLink to="/orders" class="card kpi">
        <div class="kpi-top"><span>{{ t('activeOrders') }}</span><span class="kpi-ico c4"><Icon name="flame" /></span></div>
        <strong class="num">{{ store.activeCount }}</strong>
        <small>{{ t('inProgress') }}</small>
      </RouterLink>
    </div>

    <div class="home-grid">
      <article class="card">
        <div class="card-head">
          <h2>{{ t('sales') }}</h2>
          <span class="muted">{{ range === 'today' || range === 'yesterday' ? t('salesByHour') : t('salesByDay') }}</span>
        </div>
        <div class="card-body">
          <div class="chart-total"><strong class="num">{{ data ? money(data.revenue) : '—' }}</strong></div>
          <svg class="chart" :viewBox="`0 0 ${chart.W} ${chart.H}`" preserveAspectRatio="none" role="img" :aria-label="t('sales')">
            <g v-for="g in chart.grid" :key="g.y">
              <line class="grid-line" :x1="chart.L" :x2="chart.W" :y1="g.y" :y2="g.y" />
              <text class="axis" :x="chart.L - 8" :y="g.y + 4" text-anchor="end">{{ g.v }}</text>
            </g>
            <g v-for="b in chart.bars" :key="b.label + b.x">
              <rect class="bar" :x="b.x" :y="b.y" :width="b.w" :height="Math.max(b.h, b.v ? 2 : 0)" rx="4"><title>{{ b.label }} · {{ b.v.toFixed(0) }} kr</title></rect>
              <text v-if="b.show" class="axis" :x="b.x + b.w / 2" :y="chart.H - 8" text-anchor="middle">{{ b.label }}</text>
            </g>
          </svg>
        </div>
      </article>

      <article class="card">
        <div class="card-head"><h2>{{ t('byType') }}</h2></div>
        <div class="card-body donut-wrap">
          <svg class="donut" viewBox="0 0 120 120" role="img" :aria-label="t('byType')">
            <circle cx="60" cy="60" r="46" fill="none" stroke="var(--sunken)" stroke-width="16" />
            <circle v-for="r in typeRows" :key="r.k" cx="60" cy="60" r="46" fill="none" :stroke="r.color" stroke-width="16" :stroke-dasharray="r.dash" :stroke-dashoffset="r.off" transform="rotate(-90 60 60)" />
            <text x="60" y="58" text-anchor="middle" font-size="22" font-weight="600" fill="currentColor">{{ typeTotal }}</text>
            <text x="60" y="76" text-anchor="middle" font-size="10" fill="var(--muted)">{{ t('ordersCount') }}</text>
          </svg>
          <div class="legend">
            <div v-for="r in typeRows" :key="r.k"><i :style="{ background: r.color }"></i>{{ t('ty_' + r.k) }}<b>{{ r.pct }}%</b></div>
          </div>
        </div>
      </article>

      <article class="card">
        <div class="card-head"><h2>{{ t('topProducts') }}</h2></div>
        <div class="card-body">
          <ol v-if="data?.top?.length" class="top-list">
            <li v-for="p in data.top" :key="p.name">
              <img v-if="p.image" :src="p.image" alt="" class="thumb"><span v-else class="thumb"></span>
              <div>
                <div class="name">{{ p.name }}</div>
                <div class="meter"><i :style="{ width: (p.qty / topMax) * 100 + '%' }"></i></div>
              </div>
              <div style="text-align: end"><b>{{ p.qty }}×</b><br><small class="muted num">{{ money(p.total) }}</small></div>
            </li>
          </ol>
          <div v-else class="empty"><Icon name="chart" :size="32" />{{ t('noData') }}</div>
        </div>
      </article>

      <article class="card">
        <div class="card-head"><h2>{{ t('recentOrders') }}</h2><RouterLink to="/orders" class="link-btn">{{ t('viewAll') }}</RouterLink></div>
        <div class="card-body" style="padding-top: 8px">
          <ul v-if="data?.recent?.length" class="recent">
            <li v-for="o in data.recent" :key="o.id">
              <RouterLink :to="{ path: '/orders', query: { open: o.id } }">
                <span class="ty"><Icon :name="TYPE_ICON[o.type]" /></span>
                <span class="meta"><b class="mono">#{{ o.code }}</b><small>{{ ago(o.created_at) }} · {{ o.customer_name || (o.table_no ? t('table') + ' ' + o.table_no : t('ty_' + o.type)) }}</small></span>
                <span class="end"><b class="num">{{ money(o.total) }}</b><span class="pill" :class="'st-' + o.status">{{ t('st_' + o.status) }}</span></span>
              </RouterLink>
            </li>
          </ul>
          <div v-else class="empty"><Icon name="orders" :size="32" />{{ t('noOrders') }}</div>
        </div>
      </article>
    </div>
  </section>
</template>
