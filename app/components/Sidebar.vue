<script setup>
import { useRouter } from 'vue-router';
import { store, logout } from '../store.js';
import { t, LANGS, i18n, setLang } from '../i18n.js';
import Icon from './Icon.vue';

const emit = defineEmits(['close']);
const router = useRouter();

const groups = [
  { label: 'navSales', items: [
    { to: '/', icon: 'home', key: 'navHome' },
    { to: '/orders', icon: 'orders', key: 'navOrders' },
    { to: '/pos', icon: 'pos', key: 'navPos' },
    { to: '/kitchen', icon: 'kitchen', key: 'navKitchen', soon: true },
  ] },
  { label: 'navMenu', items: [
    { to: '/products', icon: 'products', key: 'navProducts', soon: true },
    { to: '/categories', icon: 'categories', key: 'navCategories', soon: true },
    { to: '/components', icon: 'components', key: 'navComponents', soon: true },
    { to: '/allergies', icon: 'allergy', key: 'navAllergy', soon: true },
    { to: '/import', icon: 'import', key: 'navImport', soon: true },
    { href: '/mtv.html', icon: 'tv', key: 'navMtv' },
  ] },
  { label: 'navManage', items: [
    { to: '/customers', icon: 'customers', key: 'navCustomers', soon: true },
    { to: '/reports', icon: 'reports', key: 'navReports', soon: true },
    { to: '/invoices', icon: 'invoices', key: 'navInvoices', soon: true },
    { to: '/inventory', icon: 'inventory', key: 'navInventory', soon: true },
    { to: '/gift-cards', icon: 'gift', key: 'navGiftCards', soon: true },
    { to: '/users', icon: 'users', key: 'navUsers', soon: true },
    { to: '/roles', icon: 'roles', key: 'navRoles', soon: true },
    { to: '/settings', icon: 'settings', key: 'navSettings', soon: true },
  ] },
];

async function signOut() {
  await logout();
  router.push('/login');
}
</script>

<template>
  <aside class="sidebar">
    <div class="sb-brand">
      <img src="/img/24order-logo.png" alt="" width="36" height="36">
      <div>
        <strong>24order Pro</strong>
        <small>{{ store.settings.restaurant_name }}</small>
      </div>
      <button class="icon-btn sb-close" type="button" :aria-label="t('close')" @click="emit('close')">✕</button>
    </div>

    <nav class="sb-nav">
      <section v-for="g in groups" :key="g.label">
        <h3>{{ t(g.label) }}</h3>
        <template v-for="it in g.items" :key="it.key">
          <a v-if="it.href" :href="it.href" class="sb-link"><Icon :name="it.icon" /><span>{{ t(it.key) }}</span></a>
          <RouterLink v-else :to="it.to" class="sb-link" :exact-active-class="it.to === '/' ? 'active' : ''" :active-class="it.to === '/' ? '' : 'active'">
            <Icon :name="it.icon" /><span>{{ t(it.key) }}</span><em v-if="it.soon" class="soon">{{ t('comingSoon') }}</em>
          </RouterLink>
        </template>
      </section>
    </nav>

    <div class="sb-foot">
      <label class="sb-lang">
        <Icon name="globe" />
        <select :value="i18n.lang" :aria-label="t('language')" @change="setLang($event.target.value)">
          <option v-for="(v, k) in LANGS" :key="k" :value="k">{{ v }}</option>
        </select>
      </label>
      <div class="sb-user">
        <span class="avatar">{{ (store.user?.name || '?').slice(0, 1).toUpperCase() }}</span>
        <div><strong>{{ store.user?.name }}</strong><small>{{ store.user?.email }}</small></div>
        <button class="icon-btn" type="button" :title="t('logout')" :aria-label="t('logout')" @click="signOut"><Icon name="logout" /></button>
      </div>
    </div>
  </aside>
</template>
