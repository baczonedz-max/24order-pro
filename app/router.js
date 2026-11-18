import { createRouter, createWebHistory } from 'vue-router';
import { store, loadSession } from './store.js';
import { api } from './api.js';

const soon = () => import('./views/ComingSoon.vue');

const routes = [
  { path: '/login', component: () => import('./views/Login.vue'), meta: { public: true } },
  { path: '/setup', component: () => import('./views/Setup.vue'), meta: { public: true } },
  { path: '/', component: () => import('./views/Home.vue'), meta: { title: 'navHome' } },
  { path: '/orders', component: () => import('./views/Orders.vue'), meta: { title: 'navOrders' } },
  { path: '/pos', component: () => import('./views/Pos.vue'), meta: { title: 'navPos', full: true } },
  { path: '/ingredients', component: () => import('./views/Photos.vue'), meta: { title: 'navPhotos' } },
  { path: '/kitchen', component: soon, meta: { title: 'navKitchen' } },
  { path: '/products', component: soon, meta: { title: 'navProducts' } },
  { path: '/categories', component: soon, meta: { title: 'navCategories' } },
  { path: '/components', component: soon, meta: { title: 'navComponents' } },
  { path: '/allergies', component: soon, meta: { title: 'navAllergy' } },
  { path: '/import', component: soon, meta: { title: 'navImport' } },
  { path: '/customers', component: soon, meta: { title: 'navCustomers' } },
  { path: '/reports', component: soon, meta: { title: 'navReports' } },
  { path: '/invoices', component: soon, meta: { title: 'navInvoices' } },
  { path: '/inventory', component: soon, meta: { title: 'navInventory' } },
  { path: '/gift-cards', component: soon, meta: { title: 'navGiftCards' } },
  { path: '/users', component: soon, meta: { title: 'navUsers' } },
  { path: '/roles', component: soon, meta: { title: 'navRoles' } },
  { path: '/settings', component: soon, meta: { title: 'navSettings' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
  if (!store.checked) await loadSession();
  if (to.meta.public) {
    if (store.user) return '/';
    if (to.path === '/login') {
      try {
        if ((await api('/setup')).data.needsSetup) return '/setup';
      } catch {}
    }
    return true;
  }
  if (!store.user) return { path: '/login', query: to.fullPath !== '/' ? { next: to.fullPath } : undefined };
  return true;
});
