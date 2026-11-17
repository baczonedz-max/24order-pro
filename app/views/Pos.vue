<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { api } from '../api.js';
import { money } from '../store.js';
import { t } from '../i18n.js';
import Icon from '../components/Icon.vue';
import ProductOptions from '../components/ProductOptions.vue';
import Receipt from '../components/Receipt.vue';

const catalog = ref([]);
const catId = ref(null);
const query = ref('');
const err = ref('');
const cart = ref(loadCart());
const editing = ref(null); // { food, line }
const orderType = ref('takeaway');
const payment = ref('card');
const discount = ref({ type: 'percent', value: '' });
const customer = ref({ customer_name: '', customer_phone: '', table_no: '', address: '', note: '' });
const priced = ref(null);
const busy = ref(false);
const done = ref(null);
const showCustomer = ref(false);

function loadCart() {
  try { return JSON.parse(sessionStorage.getItem('pos.cart') || '[]'); } catch { return []; }
}
watch(cart, (v) => { try { sessionStorage.setItem('pos.cart', JSON.stringify(v)); } catch {} }, { deep: true });

onMounted(async () => {
  try {
    catalog.value = (await api('/catalog')).data;
    catId.value = catalog.value[0]?.id ?? null;
    reprice();
  } catch (e) {
    err.value = e.message;
  }
});

const foodById = computed(() => Object.fromEntries(catalog.value.flatMap((c) => c.foods).map((f) => [f.id, f])));
const visible = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (q) return catalog.value.flatMap((c) => c.foods).filter((f) => f.name.toLowerCase().includes(q) || String(f.number) === q);
  return catalog.value.find((c) => c.id === catId.value)?.foods || [];
});
const fromPrice = (f) => Math.min(...f.sizes.map((s) => Number(s.price)));

function tapFood(f) {
  const simple = f.sizes.length <= 1 && !f.components.length;
  if (!simple) return (editing.value = { food: f, line: null });
  const same = cart.value.find((l) => l.food_id === f.id && !l.add.length && !l.remove.length && !l.note);
  if (same) same.qty = Math.min(99, same.qty + 1);
  else cart.value.push({ key: crypto.randomUUID(), food_id: f.id, size_id: f.sizes[0]?.id, add: [], remove: [], qty: 1, note: '' });
}

function saveLine(line) {
  const i = cart.value.findIndex((l) => l.key === line.key);
  if (i >= 0) cart.value.splice(i, 1, line);
  else cart.value.push(line);
  editing.value = null;
}

function lineInfo(l) {
  const f = foodById.value[l.food_id];
  if (!f) return null;
  const size = f.sizes.find((s) => s.id === l.size_id);
  const ex = (c) => (c.extra_by_size && size?.code && c.extra_by_size[size.code] !== undefined ? Number(c.extra_by_size[size.code]) : Number(c.extra_price || 0));
  const adds = f.components.filter((c) => l.add.includes(c.id));
  const rems = f.components.filter((c) => l.remove.includes(c.id));
  const unit = Number(size?.price || 0) + adds.reduce((a, c) => a + ex(c), 0);
  return { f, size: f.sizes.length > 1 ? size?.label || size?.code : null, adds, rems, total: unit * l.qty };
}

// Totals and VAT always come from the server.
let priceTimer;
watch([cart, orderType, discount], () => { clearTimeout(priceTimer); priceTimer = setTimeout(reprice, 250); }, { deep: true });
async function reprice() {
  if (!cart.value.length) return (priced.value = null);
  try {
    priced.value = (await api('/cart/price', { method: 'POST', body: payload() })).data;
    err.value = '';
  } catch (e) {
    err.value = e.message;
  }
}

function payload(extra = {}) {
  return {
    items: cart.value.map(({ food_id, size_id, add, remove, qty, note }) => ({ food_id, size_id, add, remove, qty, note })),
    type: orderType.value,
    discount: discount.value.value ? { type: discount.value.type, value: Number(discount.value.value) } : null,
    payment_method: payment.value,
    ...customer.value,
    ...extra,
  };
}

async function place(completed) {
  busy.value = true;
  try {
    done.value = (await api('/orders', { method: 'POST', body: payload({ status: completed ? 'completed' : 'new' }) })).data;
    cart.value = [];
    discount.value = { type: 'percent', value: '' };
    customer.value = { customer_name: '', customer_phone: '', table_no: '', address: '', note: '' };
    showCustomer.value = false;
  } catch (e) {
    err.value = e.message;
  } finally {
    busy.value = false;
  }
}

async function printDone() {
  await nextTick();
  window.print();
}

const count = computed(() => cart.value.reduce((a, l) => a + l.qty, 0));
</script>

<template>
  <section class="pos">
    <div class="pos-menu">
      <header class="pos-top">
        <label class="search big"><Icon name="search" /><input v-model="query" :placeholder="t('searchProducts')" :aria-label="t('searchProducts')"></label>
      </header>
      <nav class="cat-tabs" :aria-label="t('navCategories')">
        <button v-for="c in catalog" :key="c.id" type="button" :class="{ on: catId === c.id && !query }" @click="catId = c.id; query = ''">
          <img v-if="c.image" :src="c.image" alt="">{{ c.name }}<small>{{ c.foods.length }}</small>
        </button>
      </nav>
      <p v-if="err" class="form-error">{{ err }}</p>
      <div class="food-grid">
        <button v-for="f in visible" :key="f.id" type="button" class="food" @click="tapFood(f)">
          <span v-if="f.number" class="food-num">{{ f.number }}</span>
          <img v-if="f.image" :src="f.image" alt="" loading="lazy">
          <div v-else class="food-ph"></div>
          <strong>{{ f.name }}</strong>
          <span class="food-price" dir="ltr">{{ f.sizes.length > 1 ? f.sizes.map((s) => (s.code ? s.code + ' ' : '') + money(s.price, false)).join(' · ') : money(fromPrice(f)) }}</span>
        </button>
      </div>
    </div>

    <aside class="pos-cart" :aria-label="t('cart')">
      <div class="seg full">
        <button v-for="ty in ['takeaway', 'dine_in', 'delivery']" :key="ty" type="button" :class="{ on: orderType === ty }" @click="orderType = ty">{{ t('ty_' + ty) }}</button>
      </div>

      <button class="link-btn" type="button" @click="showCustomer = !showCustomer">{{ t('optionalDetails') }} {{ showCustomer ? '▴' : '▾' }}</button>
      <div v-if="showCustomer" class="cust">
        <input v-if="orderType === 'dine_in'" v-model="customer.table_no" class="input" :placeholder="t('table')">
        <input v-model="customer.customer_name" class="input" :placeholder="t('name')">
        <input v-model="customer.customer_phone" class="input" :placeholder="t('phone')" inputmode="tel">
        <input v-if="orderType === 'delivery'" v-model="customer.address" class="input" :placeholder="t('address')">
        <input v-model="customer.note" class="input" :placeholder="t('note')">
      </div>

      <h2 class="cart-title">{{ t('cart') }} <span v-if="count" class="badge">{{ count }}</span>
        <button v-if="cart.length" class="link-btn" type="button" @click="cart = []">{{ t('clear') }}</button>
      </h2>

      <ul class="cart-lines">
        <li v-if="!cart.length" class="muted empty">{{ t('emptyCart') }}</li>
        <li v-for="l in cart" :key="l.key">
          <template v-if="lineInfo(l)">
            <div class="cl-main">
              <div class="stepper sm">
                <button type="button" class="icon-btn" :aria-label="t('remove')" @click="l.qty > 1 ? l.qty-- : cart.splice(cart.indexOf(l), 1)"><Icon :name="l.qty > 1 ? 'minus' : 'trash'" :size="16" /></button>
                <b>{{ l.qty }}</b>
                <button type="button" class="icon-btn" aria-label="+" @click="l.qty < 99 && l.qty++"><Icon name="plus" :size="16" /></button>
              </div>
              <button type="button" class="cl-name" @click="editing = { food: lineInfo(l).f, line: l }">
                {{ lineInfo(l).f.name }}<small v-if="lineInfo(l).size"> · {{ lineInfo(l).size }}</small>
              </button>
              <span class="num">{{ money(lineInfo(l).total, false) }}</span>
            </div>
            <div v-for="a in lineInfo(l).adds" :key="'a' + a.id" class="line-sub plus">+ {{ a.name }}</div>
            <div v-for="r in lineInfo(l).rems" :key="'r' + r.id" class="line-sub minus">− {{ t('without') }} {{ r.name }}</div>
            <div v-if="l.note" class="line-sub">“{{ l.note }}”</div>
          </template>
        </li>
      </ul>

      <div class="cart-foot">
        <div class="disc">
          <span>{{ t('discount') }}</span>
          <select v-model="discount.type" class="input sm" :aria-label="t('discount')"><option value="percent">%</option><option value="amount">kr</option></select>
          <input v-model="discount.value" class="input sm" type="number" min="0" inputmode="decimal" :aria-label="t('discount')">
        </div>
        <div class="totals" aria-live="polite">
          <div><span>{{ t('subtotal') }}</span><span>{{ money(priced?.subtotal || 0) }}</span></div>
          <div v-if="priced?.discount"><span>{{ t('discount') }}</span><span>−{{ money(priced.discount) }}</span></div>
          <div v-for="tx in priced?.taxes || []" :key="tx.rate" class="muted"><span>MVA {{ tx.rate }}%</span><span>{{ money(tx.amount) }}</span></div>
          <div class="grand"><span>{{ t('total') }}</span><span>{{ money(priced?.total || 0) }}</span></div>
        </div>
        <div class="seg full pay">
          <button v-for="p in ['card', 'cash', 'vipps', 'unpaid']" :key="p" type="button" :class="{ on: payment === p }" @click="payment = p">{{ t('pay_' + p) }}</button>
        </div>
        <div class="pos-actions">
          <button class="btn ghost grow" type="button" :disabled="!cart.length || busy" @click="place(false)">{{ t('sendKitchen') }}</button>
          <button class="btn primary grow" type="button" :disabled="!cart.length || busy || payment === 'unpaid'" @click="place(true)">{{ t('paidNow') }}</button>
        </div>
      </div>
    </aside>

    <ProductOptions v-if="editing" :food="editing.food" :line="editing.line" @close="editing = null" @save="saveLine" />

    <div v-if="done" class="modal-backdrop" @click.self="done = null">
      <div class="modal done" role="dialog" aria-modal="true">
        <Icon name="check" :size="40" />
        <h2>{{ t('orderPlaced') }}</h2>
        <p class="big-code">#{{ done.code }}</p>
        <p>{{ money(done.total) }} · {{ t('pay_' + done.payment_method) }}</p>
        <div class="row">
          <button class="btn ghost" type="button" @click="printDone"><Icon name="print" />{{ t('print') }}</button>
          <button class="btn primary" type="button" @click="done = null">{{ t('newOrder') }}</button>
        </div>
      </div>
    </div>
    <div class="print-only"><Receipt v-if="done" :order="done" /></div>
  </section>
</template>
