<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { api } from '../api.js';
import { money, price, refreshActiveCount } from '../store.js';
import { t } from '../i18n.js';
import Icon from '../components/Icon.vue';
import ProductBuilder from '../components/ProductBuilder.vue';
import Receipt from '../components/Receipt.vue';
import { loadPhotos } from '../food/photos.js';

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
const panel = ref(''); // '' | 'customer' | 'discount'
const priced = ref(null);
const busy = ref(false);
const done = ref(null);
const cartOpen = ref(false);
const loading = ref(true);

function loadCart() {
  try { return JSON.parse(sessionStorage.getItem('pos.cart') || '[]'); } catch { return []; }
}
watch(cart, (v) => { try { sessionStorage.setItem('pos.cart', JSON.stringify(v)); } catch {} }, { deep: true });

onMounted(async () => {
  loadPhotos();
  try {
    catalog.value = (await api('/catalog')).data;
    catId.value = catalog.value[0]?.id ?? null;
    reprice();
  } catch (e) {
    err.value = e.message;
  } finally {
    loading.value = false;
  }
});

const allFoods = computed(() => catalog.value.flatMap((c) => c.foods.map((f) => ({ ...f, _cat: c.name }))));
const foodById = computed(() => Object.fromEntries(allFoods.value.map((f) => [f.id, f])));
const current = computed(() => catalog.value.find((c) => c.id === catId.value));
const visible = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (q) return allFoods.value.filter((f) => f.name.toLowerCase().includes(q) || String(f.number) === q || (f.description || '').toLowerCase().includes(q));
  return (current.value?.foods || []).map((f) => ({ ...f, _cat: current.value.name }));
});
const inCart = computed(() => {
  const m = {};
  for (const l of cart.value) m[l.food_id] = (m[l.food_id] || 0) + l.qty;
  return m;
});

function pick(c) {
  catId.value = c.id;
  query.value = '';
}

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
    panel.value = '';
    cartOpen.value = false;
    refreshActiveCount();
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
const total = computed(() => priced.value?.total ?? 0);
const TYPES = [['takeaway', 'bag'], ['dine_in', 'dine'], ['delivery', 'truck']];
const PAYS = [['card', 'card'], ['cash', 'cash'], ['vipps', 'phone'], ['unpaid', 'hourglass']];
const hasCustomer = computed(() => Object.values(customer.value).some(Boolean));
</script>

<template>
  <section class="pos">
    <!-- Category rail (desktop) -->
    <nav class="pos-rail" :aria-label="t('navCategories')">
      <button v-for="c in catalog" :key="c.id" type="button" class="rail-btn" :class="{ on: catId === c.id && !query }" @click="pick(c)">
        <span class="ph"><img v-if="c.image || c.foods[0]?.image" :src="c.image || c.foods[0]?.image" alt=""><Icon v-else name="grid" /></span>
        <span class="nm">{{ c.name }}</span>
      </button>
    </nav>

    <!-- Menu -->
    <div class="pos-menu">
      <header class="pos-head">
        <label class="search">
          <Icon name="search" />
          <input v-model="query" type="search" :placeholder="t('searchProducts')" :aria-label="t('searchProducts')">
          <button v-if="query" class="icon-btn sm clear" type="button" :aria-label="t('clear')" @click="query = ''"><Icon name="x" :size="16" /></button>
        </label>
      </header>
      <nav class="chips-row" :aria-label="t('navCategories')">
        <button v-for="c in catalog" :key="c.id" type="button" class="chip-cat" :class="{ on: catId === c.id && !query }" @click="pick(c)">
          <img v-if="c.image || c.foods[0]?.image" :src="c.image || c.foods[0]?.image" alt="">{{ c.name }}
        </button>
      </nav>

      <div class="pos-scroll">
        <p v-if="err" class="form-error">{{ err }}</p>
        <div class="sec-title">
          <h2>{{ query ? `“${query}”` : current?.name }}</h2>
          <span class="muted">{{ visible.length }} {{ query ? t('results') : '' }}</span>
        </div>
        <div v-if="!loading && !visible.length" class="empty card"><Icon name="search" :size="32" />{{ t('noProducts') }}</div>
        <div class="food-grid">
          <button v-for="f in visible" :key="f.id" type="button" class="food" @click="tapFood(f)">
            <div class="img">
              <img v-if="f.image" :src="f.image" alt="" loading="lazy">
              <span v-if="f.number" class="no">{{ f.number }}</span>
              <span v-if="inCart[f.id]" class="badge in-cart">{{ inCart[f.id] }}</span>
              <span class="add" aria-hidden="true"><Icon name="plus" :size="18" :stroke="2.4" /></span>
            </div>
            <div class="body">
              <span class="nm">{{ f.name }}</span>
              <span v-if="f.description" class="desc">{{ f.description }}</span>
              <span class="prices">
                <span v-for="s in f.sizes" :key="s.id"><b v-if="f.sizes.length > 1">{{ s.code || s.label }}</b>{{ price(s.price) }}</span>
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Cart -->
    <aside class="pos-cart" :class="{ open: cartOpen }" :aria-label="t('cart')">
      <header class="cart-head">
        <h2>{{ t('currentOrder') }} <span v-if="count" class="badge">{{ count }}</span></h2>
        <button v-if="cart.length" class="btn sm soft" type="button" @click="cart = []"><Icon name="trash" :size="16" />{{ t('clear') }}</button>
        <button class="icon-btn cart-close" type="button" :aria-label="t('close')" @click="cartOpen = false"><Icon name="chevronDown" /></button>
      </header>
      <div class="cart-type">
        <div class="seg full">
          <button v-for="[ty, ic] in TYPES" :key="ty" type="button" :class="{ on: orderType === ty }" @click="orderType = ty"><Icon :name="ic" :size="16" />{{ t('ty_' + ty) }}</button>
        </div>
      </div>

      <div class="cart-scroll">
        <div v-if="!cart.length" class="cart-empty">
          <span class="art"><Icon name="cart" :size="32" /></span>
          <strong>{{ t('emptyCartTitle') }}</strong>
          <span>{{ t('emptyCart') }}</span>
        </div>
        <div v-for="l in cart" :key="l.key" class="cline">
          <template v-if="lineInfo(l)">
            <img v-if="lineInfo(l).f.image" :src="lineInfo(l).f.image" alt="" class="thumb">
            <span v-else class="thumb"></span>
            <div>
              <div class="top">
                <button type="button" class="nm" @click="editing = { food: lineInfo(l).f, line: l }">
                  {{ lineInfo(l).f.name }}<small v-if="lineInfo(l).size"> · {{ lineInfo(l).size }}</small>
                </button>
                <button v-if="lineInfo(l).f.components.length || lineInfo(l).f.sizes.length > 1" class="icon-btn sm" type="button" :aria-label="t('edit')" @click="editing = { food: lineInfo(l).f, line: l }"><Icon name="edit" :size="16" /></button>
              </div>
              <div v-if="lineInfo(l).adds.length || lineInfo(l).rems.length || l.note" class="mods">
                <span v-for="a in lineInfo(l).adds" :key="'a' + a.id" class="mod plus">+ {{ a.name }}</span>
                <span v-for="r in lineInfo(l).rems" :key="'r' + r.id" class="mod minus">{{ r.name }}</span>
                <span v-if="l.note" class="mod note">“{{ l.note }}”</span>
              </div>
              <div class="bottom">
                <div class="stepper">
                  <button type="button" class="icon-btn" :aria-label="t('remove')" @click="l.qty > 1 ? l.qty-- : cart.splice(cart.indexOf(l), 1)"><Icon :name="l.qty > 1 ? 'minus' : 'trash'" :size="16" /></button>
                  <b>{{ l.qty }}</b>
                  <button type="button" class="icon-btn" aria-label="+" @click="l.qty < 99 && l.qty++"><Icon name="plus" :size="16" /></button>
                </div>
                <strong class="num">{{ money(lineInfo(l).total) }}</strong>
              </div>
            </div>
          </template>
        </div>
      </div>

      <footer class="cart-foot">
        <div class="cart-tools">
          <button class="btn ghost sm" type="button" :class="{ on: panel === 'customer' || hasCustomer }" @click="panel = panel === 'customer' ? '' : 'customer'"><Icon name="user" :size="16" />{{ t('customerBtn') }}</button>
          <button class="btn ghost sm" type="button" :class="{ on: panel === 'discount' || discount.value }" @click="panel = panel === 'discount' ? '' : 'discount'"><Icon name="percent" :size="16" />{{ t('discountBtn') }}</button>
        </div>
        <div v-if="panel === 'customer'" class="panel-in">
          <input v-if="orderType === 'dine_in'" v-model="customer.table_no" class="input sm" :placeholder="t('table')">
          <div class="row">
            <input v-model="customer.customer_name" class="input sm" :placeholder="t('name')" autocomplete="off">
            <input v-model="customer.customer_phone" class="input sm" :placeholder="t('phone')" inputmode="tel" autocomplete="off">
          </div>
          <input v-if="orderType === 'delivery'" v-model="customer.address" class="input sm" :placeholder="t('address')">
          <input v-model="customer.note" class="input sm" :placeholder="t('note')">
        </div>
        <div v-if="panel === 'discount'" class="panel-in">
          <div class="row">
            <div class="seg">
              <button type="button" :class="{ on: discount.type === 'percent' }" @click="discount.type = 'percent'">%</button>
              <button type="button" :class="{ on: discount.type === 'amount' }" @click="discount.type = 'amount'">kr</button>
            </div>
            <input v-model="discount.value" class="input sm" type="number" min="0" inputmode="decimal" :aria-label="t('discount')" placeholder="0">
          </div>
        </div>

        <div class="totals" aria-live="polite">
          <div class="muted"><span>{{ t('subtotal') }}</span><span class="num">{{ money(priced?.subtotal || 0) }}</span></div>
          <div v-if="priced?.discount" class="muted"><span>{{ t('discount') }}</span><span class="num">−{{ money(priced.discount) }}</span></div>
          <div v-for="tx in priced?.taxes || []" :key="tx.rate" class="muted"><span>MVA {{ tx.rate }}%</span><span class="num">{{ money(tx.amount) }}</span></div>
          <div class="grand"><span>{{ t('total') }}</span><span class="num">{{ money(total) }}</span></div>
        </div>
        <div class="pay-grid" role="radiogroup" :aria-label="t('payment')">
          <button v-for="[p, ic] in PAYS" :key="p" type="button" role="radio" :aria-checked="payment === p" :class="{ on: payment === p }" @click="payment = p"><Icon :name="ic" :size="18" />{{ t('pay_' + p) }}</button>
        </div>
        <div class="pos-actions">
          <button class="btn ghost lg" type="button" :disabled="!cart.length || busy" @click="place(false)"><Icon name="kitchen" :size="18" />{{ t('sendKitchen') }}</button>
          <button class="btn primary lg" type="button" :disabled="!cart.length || busy || payment === 'unpaid'" @click="place(true)">
            <span>{{ t('charge') }}</span><span class="num">{{ money(total) }}</span>
          </button>
        </div>
      </footer>
    </aside>

    <!-- Phone: floating cart bar -->
    <button v-if="count && !cartOpen" class="cart-bar" type="button" @click="cartOpen = true">
      <span class="badge">{{ count }}</span>
      <span class="grow">{{ t('viewOrder') }}</span>
      <span class="total num">{{ money(total) }}</span>
    </button>
    <transition name="fade"><div v-if="cartOpen" class="backdrop" @click="cartOpen = false"></div></transition>

    <transition name="pop">
      <ProductBuilder v-if="editing" :food="editing.food" :line="editing.line" :category-name="editing.food._cat || ''" @close="editing = null" @save="saveLine" />
    </transition>

    <transition name="pop">
      <div v-if="done" class="modal-backdrop" @click.self="done = null">
        <div class="modal done" role="dialog" aria-modal="true">
          <span class="tick"><Icon name="check" :size="34" :stroke="2.6" /></span>
          <h2>{{ t('orderPlaced') }}</h2>
          <p class="code">#{{ done.code }}</p>
          <p class="muted">{{ money(done.total) }} · {{ t('pay_' + done.payment_method) }} · {{ t('ty_' + done.type) }}</p>
          <div class="row">
            <button class="btn ghost lg" type="button" @click="printDone"><Icon name="print" />{{ t('print') }}</button>
            <button class="btn primary lg" type="button" @click="done = null">{{ t('newOrder') }}</button>
          </div>
        </div>
      </div>
    </transition>
    <div class="print-only"><Receipt v-if="done" :order="done" /></div>
  </section>
</template>
