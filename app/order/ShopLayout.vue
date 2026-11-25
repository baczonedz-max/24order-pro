<script setup>
// Customer ordering page: sidebar · menu · cart on a computer; top bar, bottom bar and a cart sheet on a phone.
import { ref, watch, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Icon from '../components/Icon.vue';
import ProductBuilder from '../components/ProductBuilder.vue';
import ShopCart from './ShopCart.vue';
import { shop, loadMenu, saveLine, cartCount, cartTotal } from './shop.js';
import { money, toggleTheme } from '../store.js';
import { t, LANGS, i18n, setLang } from '../i18n.js';
import './shop.css';

const route = useRoute();
const dark = ref(document.documentElement.dataset.theme === 'dark');
const bump = ref(false);
function flipTheme() { toggleTheme(); dark.value = document.documentElement.dataset.theme === 'dark'; }

onMounted(loadMenu);
watch(() => route.fullPath, () => { shop.cartOpen = false; window.scrollTo({ top: 0 }); });
watch(() => shop.flash, () => { bump.value = false; requestAnimationFrame(() => (bump.value = true)); });
watch([() => shop.restaurant.name, () => i18n.lang], () => (document.title = shop.restaurant.name ? `${shop.restaurant.name} · ${t('shopOrderNow')}` : t('shopOrderNow')), { immediate: true });
watch(() => shop.cartOpen, (v) => (document.body.style.overflow = v ? 'hidden' : ''));

const isMenu = computed(() => route.path === '/order' || route.path.startsWith('/order/menu'));
const initials = computed(() => (shop.restaurant.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase());
</script>

<template>
  <div class="shop">
    <!-- Computer: left sidebar -->
    <aside class="sh-side">
      <RouterLink to="/order" class="sh-logo" :aria-label="shop.restaurant.name">
        <img v-if="shop.restaurant.logo" :src="shop.restaurant.logo" alt="">
        <span v-else class="sh-initials">{{ initials }}</span>
      </RouterLink>
      <nav class="sh-nav">
        <RouterLink to="/order" :class="{ on: isMenu }">{{ t('shopMenu') }}</RouterLink>
        <RouterLink to="/order/orders" :class="{ on: route.path.startsWith('/order/orders') || route.path.startsWith('/order/track') }">{{ t('shopMyOrders') }}</RouterLink>
      </nav>
      <div class="sh-side-foot">
        <label class="sh-round" :title="t('language')">
          <Icon name="globe" />
          <select :value="i18n.lang" :aria-label="t('language')" @change="setLang($event.target.value)">
            <option v-for="(v, k) in LANGS" :key="k" :value="k">{{ v }}</option>
          </select>
        </label>
        <button class="sh-round" type="button" :aria-label="dark ? t('lightMode') : t('darkMode')" @click="flipTheme"><Icon :name="dark ? 'sun' : 'moon'" /></button>
      </div>
    </aside>

    <!-- Phone: top bar -->
    <!-- Phone: logo in the middle, language on one side, light/dark on the other -->
    <header class="sh-top">
      <label class="sh-round sm" :title="t('language')">
        <Icon name="globe" :size="18" />
        <select :value="i18n.lang" :aria-label="t('language')" @change="setLang($event.target.value)">
          <option v-for="(v, k) in LANGS" :key="k" :value="k">{{ v }}</option>
        </select>
      </label>
      <RouterLink to="/order" class="sh-logo sm" :aria-label="shop.restaurant.name">
        <img v-if="shop.restaurant.logo" :src="shop.restaurant.logo" alt="">
        <span v-else class="sh-initials">{{ initials }}</span>
      </RouterLink>
      <button class="sh-round sm" type="button" :aria-label="dark ? t('lightMode') : t('darkMode')" @click="flipTheme"><Icon :name="dark ? 'sun' : 'moon'" :size="18" /></button>
    </header>

    <main class="sh-main">
      <div v-if="shop.loading" class="sh-loading"><span class="sh-spin"></span></div>
      <div v-else-if="shop.error && !shop.categories.length" class="sh-empty">
        <p>{{ t('error') }}</p>
        <button class="sh-btn" type="button" @click="loadMenu">{{ t('retry') }}</button>
      </div>
      <RouterView v-else />
    </main>

    <!-- Computer: cart on the right -->
    <aside class="sh-cart-col"><ShopCart /></aside>

    <!-- Phone / tablet: sticky cart button, bottom bar and cart sheet -->
    <button v-if="cartCount && !shop.cartOpen" class="sh-cartbar" :class="{ bump }" type="button" @click="shop.cartOpen = true" @animationend="bump = false">
      <span class="sh-cartbar-n">{{ cartCount }}</span>
      <span>{{ t('shopViewCart') }}</span>
      <b class="num">{{ money(cartTotal) }}</b>
    </button>
    <nav class="sh-bottom" :aria-label="t('shopMenu')">
      <RouterLink to="/order" :class="{ on: isMenu && !shop.cartOpen }"><Icon name="grid" :size="22" />{{ t('shopMenu') }}</RouterLink>
      <button type="button" :class="{ on: shop.cartOpen }" @click="shop.cartOpen = !shop.cartOpen">
        <Icon name="bag" :size="22" />{{ t('shopCart') }}<span v-if="cartCount" class="sh-dot">{{ cartCount }}</span>
      </button>
      <RouterLink to="/order/orders" :class="{ on: route.path.startsWith('/order/orders') || route.path.startsWith('/order/track') }"><Icon name="orders" :size="22" />{{ t('shopMyOrders') }}</RouterLink>
    </nav>
    <transition name="fade"><div v-if="shop.cartOpen" class="sh-backdrop" @click="shop.cartOpen = false"></div></transition>
    <transition name="sheet">
      <div v-if="shop.cartOpen" class="sh-sheet" role="dialog" aria-modal="true" :aria-label="t('shopCart')">
        <ShopCart sheet @close="shop.cartOpen = false" />
      </div>
    </transition>

    <ProductBuilder
      v-if="shop.editing"
      :food="shop.editing.food"
      :line="shop.editing.line"
      :category-name="shop.editing.categoryName"
      :allergens="shop.editing.food.allergens || []"
      @close="shop.editing = null"
      @save="saveLine"
    />
  </div>
</template>
