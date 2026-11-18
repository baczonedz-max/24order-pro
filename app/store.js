// Shared app state: the signed-in user, restaurant settings and UI preferences.
import { reactive } from 'vue';
import { api } from './api.js';

const read = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

export const store = reactive({
  user: null,
  settings: {},
  checked: false,
  theme: read('theme', 'light'), // 'light' | 'dark' | 'auto'
  collapsed: read('sidebar', 'open') === 'min',
  activeCount: 0,
});

// ---- Theme ----
const media = window.matchMedia?.('(prefers-color-scheme: dark)');
function applyTheme() {
  const dark = store.theme === 'dark' || (store.theme === 'auto' && media?.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
media?.addEventListener?.('change', applyTheme);
applyTheme();
export function toggleTheme() {
  store.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  write('theme', store.theme);
  applyTheme();
}
export function toggleSidebar() {
  store.collapsed = !store.collapsed;
  write('sidebar', store.collapsed ? 'min' : 'open');
}

// ---- Session ----
export async function loadSession() {
  try {
    store.user = (await api('/auth/me')).data;
    store.settings = (await api('/settings')).data;
  } catch {
    store.user = null;
  }
  store.checked = true;
  return store.user;
}

export async function logout() {
  try { await api('/auth/logout', { method: 'POST' }); } catch {}
  store.user = null;
}

export async function refreshActiveCount() {
  try {
    const res = await api('/orders', { query: { status: 'active', limit: 200 } });
    store.activeCount = res.data.length;
  } catch {}
}

/** "365,00 kr". Wrapped in LRI…PDI so the amount keeps its order inside Arabic (RTL) text. */
export function money(n, withCurrency = true) {
  const v = Number(n || 0);
  const s = v.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `⁦${withCurrency ? `${s} ${store.settings.currency || 'kr'}` : s}⁩`;
}

/** Short menu price: "180,-" */
export function price(n) {
  const v = Number(n || 0);
  return `⁦${Number.isInteger(v) ? v : v.toFixed(2).replace('.', ',')},-⁩`;
}
