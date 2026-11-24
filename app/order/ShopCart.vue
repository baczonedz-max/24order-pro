<script setup>
// The cart: lines, pickup/delivery, totals from the server, then the customer's details and "Send order".
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import { shop, lineInfo, setQty, editLine, cartCount, cartTotal, placeOrder } from './shop.js';
import { money } from '../store.js';
import { t } from '../i18n.js';

defineProps({ sheet: { type: Boolean, default: false } });
const emit = defineEmits(['close']);
const router = useRouter();

const step = ref('cart'); // 'cart' | 'details'
const busy = ref(false);
const err = ref('');
const read = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const form = ref({ customer_name: read('shop.name'), customer_phone: read('shop.phone'), address: read('shop.address'), note: '', website: '' });

const lines = computed(() => shop.cart.map((l) => ({ l, i: lineInfo(l) })).filter((x) => x.i));
const vat = computed(() => shop.priced?.tax_total ?? null);

function goDetails() {
  err.value = '';
  step.value = 'details';
}

async function send() {
  err.value = '';
  const f = form.value;
  if (f.customer_name.trim().length < 2) return (err.value = t('shopErrName'));
  if ((f.customer_phone.match(/\d/g) || []).length < 8) return (err.value = t('shopErrPhone'));
  if (shop.type === 'delivery' && f.address.trim().length < 5) return (err.value = t('shopErrAddress'));
  busy.value = true;
  try {
    const o = await placeOrder({ ...f });
    try {
      localStorage.setItem('shop.name', f.customer_name.trim());
      localStorage.setItem('shop.phone', f.customer_phone.trim());
      if (shop.type === 'delivery') localStorage.setItem('shop.address', f.address.trim());
    } catch {}
    step.value = 'cart';
    form.value.note = '';
    emit('close');
    router.push(`/order/track/${o.code}`);
  } catch (e) {
    err.value = { name: t('shopErrName'), phone: t('shopErrPhone'), address: t('shopErrAddress') }[e.message] || e.message || t('error');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="sh-cart" :class="{ sheet }">
    <header class="sh-cart-head">
      <button v-if="step === 'details'" class="sh-icon" type="button" :aria-label="t('shopBack')" @click="step = 'cart'"><Icon name="chevronLeft" class="flip-rtl" /></button>
      <h2>{{ step === 'details' ? t('shopYourDetails') : t('shopCart') }}</h2>
      <span v-if="cartCount && step === 'cart'" class="sh-count">{{ cartCount }}</span>
      <button v-if="sheet" class="sh-icon" type="button" :aria-label="t('close')" @click="emit('close')"><Icon name="x" /></button>
    </header>

    <!-- Empty -->
    <div v-if="!lines.length" class="sh-cart-empty">
      <div class="sh-cart-art" aria-hidden="true">
        <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" class="a" /><path class="b" d="M34 46h52l-5 44H39z" /><path class="c" d="M48 46v-6a12 12 0 0 1 24 0v6" /><circle cx="52" cy="62" r="3" class="c2" /><circle cx="68" cy="62" r="3" class="c2" /><path class="c" d="M52 74c5 4 11 4 16 0" /></svg>
      </div>
      <strong>{{ t('shopEmptyCart') }}</strong>
      <p>{{ t('shopEmptyCartText') }}</p>
    </div>

    <!-- Lines -->
    <template v-else-if="step === 'cart'">
      <ul class="sh-lines">
        <li v-for="{ l, i } in lines" :key="l.key">
          <img v-if="i.f.image" :src="i.f.image" alt="" class="sh-line-img" loading="lazy">
          <div class="sh-line-txt">
            <button type="button" class="sh-line-name" @click="editLine(l)">{{ i.f.name }}<small v-if="i.size"> · {{ i.size }}</small></button>
            <span v-for="c in i.adds" :key="'a' + c.id" class="sh-mod plus">+ {{ c.name }}</span>
            <span v-for="c in i.rems" :key="'r' + c.id" class="sh-mod minus">− {{ c.name }}</span>
            <span v-if="l.note" class="sh-mod">“{{ l.note }}”</span>
            <div class="sh-line-row">
              <div class="sh-step">
                <button type="button" :aria-label="t('remove')" @click="setQty(l, l.qty - 1)"><Icon :name="l.qty > 1 ? 'minus' : 'trash'" :size="16" /></button>
                <b>{{ l.qty }}</b>
                <button type="button" aria-label="+" :disabled="l.qty >= 99" @click="setQty(l, l.qty + 1)"><Icon name="plus" :size="16" /></button>
              </div>
              <b class="num">{{ money(i.total) }}</b>
            </div>
          </div>
        </li>
      </ul>

      <footer class="sh-cart-foot">
        <div class="sh-seg" role="radiogroup">
          <button type="button" role="radio" :aria-checked="shop.type === 'takeaway'" :class="{ on: shop.type === 'takeaway' }" @click="shop.type = 'takeaway'"><Icon name="bag" :size="18" />{{ t('shopPickup') }}</button>
          <button type="button" role="radio" :aria-checked="shop.type === 'delivery'" :class="{ on: shop.type === 'delivery' }" @click="shop.type = 'delivery'"><Icon name="truck" :size="18" />{{ t('shopDelivery') }}</button>
        </div>
        <div class="sh-sum">
          <div><span>{{ t('shopTotal') }}</span><b class="num">{{ money(cartTotal) }}</b></div>
          <small v-if="vat !== null">{{ t('shopVat') }} {{ money(vat) }}</small>
        </div>
        <p v-if="shop.priceError" class="sh-err">{{ shop.priceError }}</p>
        <button class="sh-btn lg" type="button" :disabled="!!shop.priceError" @click="goDetails">
          <span>{{ t('shopCheckout') }}</span><Icon name="arrowRight" class="flip-rtl" />
        </button>
      </footer>
    </template>

    <!-- Details -->
    <form v-else class="sh-details" @submit.prevent="send">
      <div class="sh-fields">
        <label class="sh-field"><span>{{ t('name') }}</span><input v-model="form.customer_name" autocomplete="name" maxlength="80" required></label>
        <label class="sh-field"><span>{{ t('shopPhone') }}</span><input v-model="form.customer_phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="30" required></label>
        <label v-if="shop.type === 'delivery'" class="sh-field"><span>{{ t('shopAddress') }}</span><input v-model="form.address" autocomplete="street-address" maxlength="200" required></label>
        <label class="sh-field"><span>{{ t('shopNoteToKitchen') }}</span><textarea v-model="form.note" rows="2" maxlength="300"></textarea></label>
        <input v-model="form.website" class="sh-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="sh-pay"><Icon :name="shop.type === 'delivery' ? 'truck' : 'bag'" /><span>{{ shop.type === 'delivery' ? t('shopPayAtDoor') : t('shopPayAtPickup') }}</span></div>
      </div>
      <footer class="sh-cart-foot">
        <div class="sh-sum">
          <div><span>{{ t('shopTotal') }}</span><b class="num">{{ money(cartTotal) }}</b></div>
          <small v-if="vat !== null">{{ t('shopVat') }} {{ money(vat) }}</small>
        </div>
        <p v-if="err" class="sh-err" role="alert">{{ err }}</p>
        <button class="sh-btn lg" type="submit" :disabled="busy">{{ busy ? t('shopSending') : t('shopSend') }}</button>
      </footer>
    </form>
  </div>
</template>
