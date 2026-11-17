<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { api } from '../api.js';
import { money } from '../store.js';
import { t } from '../i18n.js';

const range = ref('today');
const data = ref(null);
const err = ref('');

const bounds = computed(() => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 864e5);
  if (range.value === 'yesterday') return { from: new Date(start - 864e5), to: start };
  if (range.value === 'week') return { from: new Date(start - 6 * 864e5), to: end };
  if (range.value === 'month') return { from: new Date(start - 29 * 864e5), to: end };
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

const typeRows = computed(() => {
  if (!data.value) return [];
  const total = data.value.orders || 1;
  return ['takeaway', 'dine_in', 'delivery'].map((k) => ({ k, n: data.value[k] || 0, pct: Math.round(((data.value[k] || 0) / total) * 100) }));
});
</script>

<template>
  <section class="page">
    <header class="page-head">
      <h1>{{ t('navHome') }}</h1>
      <div class="seg">
        <button v-for="r in ['today', 'yesterday', 'week', 'month']" :key="r" type="button" :class="{ on: range === r }" @click="range = r">{{ t(r) }}</button>
      </div>
      <RouterLink to="/pos" class="btn primary">{{ t('goPos') }}</RouterLink>
    </header>

    <p v-if="err" class="form-error">{{ err }}</p>

    <div class="kpis">
      <article class="kpi"><span>{{ t('revenue') }}</span><strong>{{ data ? money(data.revenue) : '—' }}</strong></article>
      <article class="kpi"><span>{{ t('ordersCount') }}</span><strong>{{ data?.orders ?? '—' }}</strong></article>
      <article class="kpi"><span>{{ t('activeOrders') }}</span><strong class="accent">{{ data?.active ?? '—' }}</strong></article>
      <article class="kpi"><span>{{ t('cancelledOrders') }}</span><strong>{{ data?.cancelled ?? '—' }}</strong></article>
    </div>

    <div class="two-col">
      <article class="card">
        <h2>{{ t('topProducts') }}</h2>
        <ol v-if="data?.top?.length" class="toplist">
          <li v-for="p in data.top" :key="p.name"><span>{{ p.name }}</span><b>{{ p.qty }}×</b><small>{{ money(p.total) }}</small></li>
        </ol>
        <p v-else class="muted">{{ t('noData') }}</p>
      </article>
      <article class="card">
        <h2>{{ t('byType') }}</h2>
        <div v-for="r in typeRows" :key="r.k" class="bar-row">
          <span>{{ t('ty_' + r.k) }}</span>
          <div class="bar"><i :style="{ width: r.pct + '%' }"></i></div>
          <b>{{ r.n }}</b>
        </div>
      </article>
    </div>
  </section>
</template>
