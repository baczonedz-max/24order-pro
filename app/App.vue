<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Sidebar from './components/Sidebar.vue';
import Icon from './components/Icon.vue';
import { store, toggleTheme, logout, refreshActiveCount } from './store.js';
import { t, LANGS, i18n, setLang } from './i18n.js';
import { NAV, SOON } from './nav.js';

const route = useRoute();
const router = useRouter();
const isPublic = computed(() => route.meta.public);
const moreOpen = ref(false);
const scrolled = ref(false);
const dark = ref(document.documentElement.dataset.theme === 'dark');

watch(() => route.fullPath, () => (moreOpen.value = false));
watch([() => route.meta.title, () => i18n.lang], ([k]) => (document.title = k ? `${t(k)} · 24order Pro` : '24order Pro'), { immediate: true });

const onScroll = () => (scrolled.value = window.scrollY > 4);
let timer;
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  timer = setInterval(() => store.user && !document.hidden && refreshActiveCount(), 20000);
});
onUnmounted(() => { window.removeEventListener('scroll', onScroll); clearInterval(timer); });
watch(() => store.user, (u) => u && refreshActiveCount(), { immediate: true });

function flipTheme() {
  toggleTheme();
  dark.value = document.documentElement.dataset.theme === 'dark';
}
async function signOut() {
  await logout();
  router.push('/login');
}
const isActive = (to) => (to === '/' ? route.path === '/' : route.path.startsWith(to));
const moreItems = [...NAV.flatMap((g) => g.items).filter((i) => i.href), ...SOON];
</script>

<template>
  <RouterView v-if="isPublic" />
  <div v-else-if="store.user" class="shell" :class="{ collapsed: store.collapsed || route.meta.full }">
    <Sidebar />
    <div class="main">
      <header class="topbar" :class="{ scrolled }">
        <img src="/img/24order-logo.png" alt="" class="mobile-logo">
        <div class="title">
          <h1>{{ t(route.meta.title || 'appName') }}</h1>
        </div>
        <select class="lang-select hide-sm" :value="i18n.lang" :aria-label="t('language')" @change="setLang($event.target.value)">
          <option v-for="(v, k) in LANGS" :key="k" :value="k">{{ v }}</option>
        </select>
        <button class="icon-btn bordered" type="button" :title="dark ? t('lightMode') : t('darkMode')" :aria-label="dark ? t('lightMode') : t('darkMode')" @click="flipTheme">
          <Icon :name="dark ? 'sun' : 'moon'" />
        </button>
        <button class="icon-btn bordered hide-sm" type="button" :title="t('logout')" :aria-label="t('logout')" @click="signOut"><Icon name="logout" /></button>
      </header>
      <main class="content">
        <RouterView />
      </main>
    </div>

    <!-- Phone navigation -->
    <nav class="bottom-nav" :aria-label="t('navMenu')">
      <RouterLink v-for="it in NAV[0].items" :key="it.key" :to="it.to" :class="{ on: isActive(it.to) && !moreOpen }">
        <Icon :name="it.icon" :size="22" />{{ t(it.key) }}
        <span v-if="it.count && store.activeCount" class="count">{{ store.activeCount }}</span>
      </RouterLink>
      <button type="button" :class="{ on: moreOpen }" @click="moreOpen = !moreOpen"><Icon name="more" :size="22" :stroke="3" />{{ t('more') }}</button>
    </nav>
    <transition name="fade"><div v-if="moreOpen" class="backdrop" @click="moreOpen = false"></div></transition>
    <transition name="sheet">
      <div v-if="moreOpen" class="sheet" role="dialog" aria-modal="true" :aria-label="t('more')">
        <div class="grab"></div>
        <div class="sb-user">
          <span class="avatar">{{ (store.user?.name || '?').slice(0, 1).toUpperCase() }}</span>
          <div class="txt"><strong>{{ store.user?.name }}</strong><small>{{ store.settings.restaurant_name }}</small></div>
          <button class="icon-btn bordered" type="button" :aria-label="t('logout')" @click="signOut"><Icon name="logout" /></button>
        </div>
        <label class="sb-link"><Icon name="globe" /><span class="label">{{ t('language') }}</span>
          <select class="lang-select" :value="i18n.lang" :aria-label="t('language')" @change="setLang($event.target.value)">
            <option v-for="(v, k) in LANGS" :key="k" :value="k">{{ v }}</option>
          </select>
        </label>
        <template v-for="it in moreItems" :key="it.key">
          <a v-if="it.href" :href="it.href" class="sb-link"><Icon :name="it.icon" /><span class="label">{{ t(it.key) }}</span></a>
          <RouterLink v-else :to="it.to" class="sb-link soon"><Icon :name="it.icon" /><span class="label">{{ t(it.key) }}</span><span class="soon-tag">{{ t('soon') }}</span></RouterLink>
        </template>
      </div>
    </transition>
  </div>
</template>
