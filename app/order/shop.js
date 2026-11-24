// Shared state for the customer ordering page: the menu, the cart and the customer's recent orders.
// The cart lives in localStorage so it survives a reload; prices always come from the server.
import { reactive, computed, watch } from 'vue';
import { api } from '../api.js';
import { store } from '../store.js';

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || '') ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export const shop = reactive({
  restaurant: { name: '', logo: null, currency: 'kr' },
  categories: [],
  loading: true,
  error: '',
  cart: read('shop.cart', []),
  type: read('shop.type', 'takeaway'), // 'takeaway' | 'delivery'
  priced: null,
  priceError: '',
  editing: null, // { food, line, categoryName }
  cartOpen: false, // phone/tablet cart sheet
  myOrders: read('shop.orders', []), // [{ code, at }]
  flash: 0, // bumps when something is added, to animate the cart button
});

watch(() => shop.cart, (v) => write('shop.cart', v), { deep: true });
watch(() => shop.type, (v) => write('shop.type', v));
watch(() => shop.myOrders, (v) => write('shop.orders', v), { deep: true });

let loaded;
export function loadMenu() {
  loaded ||= api('/shop/menu').then((res) => {
    shop.restaurant = res.data.restaurant;
    shop.categories = res.data.categories;
    store.settings = { ...store.settings, currency: res.data.restaurant.currency, restaurant_name: res.data.restaurant.name };
    // Drop cart lines whose product left the menu.
    shop.cart = shop.cart.filter((l) => foodById.value[l.food_id]);
    shop.error = '';
    reprice();
  }).catch((e) => {
    shop.error = e.message;
    loaded = null;
  }).finally(() => (shop.loading = false));
  return loaded;
}

export const allFoods = computed(() => shop.categories.flatMap((c) => c.foods.map((f) => ({ ...f, _cat: c.name }))));
export const foodById = computed(() => Object.fromEntries(allFoods.value.map((f) => [f.id, f])));
export const cartCount = computed(() => shop.cart.reduce((a, l) => a + l.qty, 0));

const extraOf = (c, size) => (c.extra_by_size && size?.code && c.extra_by_size[size.code] !== undefined ? Number(c.extra_by_size[size.code]) : Number(c.extra_price || 0));

/** What a cart line shows: product, size, extras, removed and the line total (the server has the final word). */
export function lineInfo(l) {
  const f = foodById.value[l.food_id];
  if (!f) return null;
  const size = f.sizes.find((s) => s.id === l.size_id) || f.sizes[0];
  const adds = f.components.filter((c) => l.add.includes(c.id));
  const rems = f.components.filter((c) => l.remove.includes(c.id));
  const unit = Number(size?.price || 0) + adds.reduce((a, c) => a + extraOf(c, size), 0);
  return { f, size: f.sizes.length > 1 ? size?.label || size?.code : null, adds, rems, total: unit * l.qty };
}
export const cartTotal = computed(() => shop.priced?.total ?? shop.cart.reduce((a, l) => a + (lineInfo(l)?.total || 0), 0));

/** Tap on a product: simple products go straight into the cart, the rest open the builder. */
export function openFood(f, categoryName) {
  const simple = f.sizes.length <= 1 && !f.components.length;
  if (!simple) return (shop.editing = { food: f, line: null, categoryName });
  const same = shop.cart.find((l) => l.food_id === f.id && !l.add.length && !l.remove.length && !l.note);
  if (same) same.qty = Math.min(99, same.qty + 1);
  else shop.cart.push({ key: crypto.randomUUID(), food_id: f.id, size_id: f.sizes[0]?.id, add: [], remove: [], qty: 1, note: '' });
  shop.flash++;
}

export function editLine(l) {
  const f = foodById.value[l.food_id];
  if (f) shop.editing = { food: f, line: l, categoryName: f._cat };
}

export function saveLine(line) {
  const i = shop.cart.findIndex((l) => l.key === line.key);
  if (i >= 0) shop.cart.splice(i, 1, line);
  else { shop.cart.push(line); shop.flash++; }
  shop.editing = null;
}

export function setQty(l, q) {
  if (q <= 0) shop.cart.splice(shop.cart.indexOf(l), 1);
  else l.qty = Math.min(99, q);
}

export const cartItems = () => shop.cart.map(({ food_id, size_id, add, remove, qty, note }) => ({ food_id, size_id, add, remove, qty, note }));

let timer;
watch([() => shop.cart, () => shop.type], () => {
  shop.priced = null; // show the local sum at once; the server's total replaces it a moment later
  clearTimeout(timer);
  timer = setTimeout(reprice, 250);
}, { deep: true });
export async function reprice() {
  if (!shop.cart.length) { shop.priced = null; shop.priceError = ''; return; }
  try {
    shop.priced = (await api('/shop/price', { method: 'POST', body: { items: cartItems(), type: shop.type } })).data;
    shop.priceError = '';
  } catch (e) {
    shop.priceError = e.message;
  }
}

export async function placeOrder(customer) {
  const res = await api('/shop/orders', { method: 'POST', body: { ...customer, items: cartItems(), type: shop.type } });
  shop.myOrders = [{ code: res.data.code, at: res.data.created_at }, ...shop.myOrders.filter((o) => o.code !== res.data.code)].slice(0, 20);
  shop.cart = [];
  shop.priced = null;
  return res.data;
}

/** Allergen keys → names, in the page language (see i18n: alg_*). */
export const ALLERGENS = ['gluten', 'crustaceans', 'egg', 'fish', 'peanuts', 'soy', 'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs'];
