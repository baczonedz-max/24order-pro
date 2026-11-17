// Shared app state: the signed-in user and restaurant settings.
import { reactive } from 'vue';
import { api } from './api.js';

export const store = reactive({
  user: null,
  settings: {},
  checked: false,
});

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

/** "190,-" style for menus, "190,00 kr" style for money. */
export function money(n, withCurrency = true) {
  const v = Number(n || 0);
  const s = v.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Wrapped in LRI…PDI so "365,00 kr" keeps its order inside Arabic (RTL) text.
  return `⁦${withCurrency ? `${s} ${store.settings.currency || 'kr'}` : s}⁩`;
}
