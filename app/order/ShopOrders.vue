<script setup>
// "My orders" (orders sent from this device) and the live tracking page for one order.
import { ref, computed, watch, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import Icon from '../components/Icon.vue';
import { api } from '../api.js';
import { shop } from './shop.js';
import { money } from '../store.js';
import { t, i18n } from '../i18n.js';

const route = useRoute();
const code = computed(() => route.params.code || null);
const orders = ref({}); // code → order
const missing = ref(new Set());
const STEPS = ['new', 'accepted', 'preparing', 'ready', 'completed'];

async function fetchOne(c) {
  try {
    orders.value = { ...orders.value, [c]: (await api(`/shop/orders/${c}`)).data };
  } catch (e) {
    if (e.status === 404) missing.value = new Set([...missing.value, c]);
  }
}
async function refresh() {
  if (document.hidden) return;
  const list = code.value ? [code.value] : shop.myOrders.map((o) => o.code);
  await Promise.all(list.filter((c) => !missing.value.has(c)).map(fetchOne));
}
let timer;
watch(code, () => { refresh(); clearInterval(timer); timer = setInterval(refresh, 10000); }, { immediate: true });
onUnmounted(() => clearInterval(timer));

const one = computed(() => (code.value ? orders.value[code.value] : null));
const list = computed(() => shop.myOrders.map((o) => orders.value[o.code]).filter(Boolean));
const stepIndex = (o) => STEPS.indexOf(o.status);
const when = (iso) => new Date(iso).toLocaleString(i18n.lang === 'no' ? 'nb-NO' : i18n.lang, { dateStyle: 'medium', timeStyle: 'short' });
const fresh = computed(() => one.value && shop.myOrders[0]?.code === one.value.code && Date.now() - new Date(one.value.created_at) < 15 * 60e3);
</script>

<template>
  <div class="sh-page">
    <!-- One order -->
    <template v-if="code">
      <RouterLink to="/order/orders" class="sh-back"><Icon name="chevronLeft" :size="18" class="flip-rtl" />{{ t('shopMyOrders') }}</RouterLink>
      <div v-if="missing.has(code)" class="sh-empty"><p>{{ t('error') }}</p></div>
      <div v-else-if="!one" class="sh-loading"><span class="sh-spin"></span></div>
      <section v-else class="sh-track">
        <div v-if="fresh" class="sh-thanks"><Icon name="check" :size="26" :stroke="3" /><h1>{{ t('shopThanks') }}</h1></div>
        <div class="sh-code"><small>{{ t('shopOrderCode') }}</small><b class="mono">{{ one.code }}</b></div>

        <ol v-if="one.status !== 'cancelled'" class="sh-steps">
          <li v-for="(s, k) in STEPS" :key="s" :class="{ done: k < stepIndex(one), now: k === stepIndex(one) }">
            <span class="dot"><Icon v-if="k < stepIndex(one) || one.status === 'completed'" name="check" :size="14" :stroke="3" /></span>
            <span>{{ t('shopStep_' + s) }}</span>
          </li>
        </ol>
        <p v-else class="sh-err">{{ t('shopStep_cancelled') }}</p>
        <p class="sh-muted">{{ t('shopTrackHint') }}</p>

        <ul class="sh-receipt">
          <li v-for="(i, k) in one.items" :key="k">
            <span class="q">{{ i.qty }}×</span>
            <span class="nm">{{ i.name }}<small v-if="i.size_label"> · {{ i.size_label }}</small>
              <em v-for="a in i.added" :key="'a' + a" class="plus">+ {{ a }}</em><em v-for="r in i.removed" :key="'r' + r" class="minus">− {{ r }}</em></span>
            <b class="num">{{ money(i.line_total) }}</b>
          </li>
          <li class="tot"><span class="nm">{{ t('shopTotal') }}</span><b class="num">{{ money(one.total) }}</b></li>
        </ul>
        <p class="sh-muted">{{ one.type === 'delivery' ? t('shopPayAtDoor') : t('shopPayAtPickup') }} · {{ when(one.created_at) }}</p>
      </section>
    </template>

    <!-- My orders -->
    <template v-else>
      <div class="sh-title"><h1>{{ t('shopMyOrders') }}</h1></div>
      <div v-if="!shop.myOrders.length" class="sh-empty">
        <Icon name="orders" :size="40" />
        <strong>{{ t('shopNoOrders') }}</strong>
        <p>{{ t('shopNoOrdersText') }}</p>
        <RouterLink to="/order" class="sh-btn">{{ t('shopMenu') }}</RouterLink>
      </div>
      <ul v-else class="sh-olist">
        <li v-for="o in list" :key="o.code">
          <RouterLink :to="`/order/track/${o.code}`">
            <span class="mono">{{ o.code }}</span>
            <span class="sh-muted">{{ when(o.created_at) }} · {{ o.items.reduce((a, i) => a + i.qty, 0) }} {{ t('shopItems') }}</span>
            <span class="sh-status" :class="'st-' + o.status">{{ t('shopStep_' + o.status) }}</span>
            <b class="num">{{ money(o.total) }}</b>
          </RouterLink>
        </li>
      </ul>
    </template>
  </div>
</template>
