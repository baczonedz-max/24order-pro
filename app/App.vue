<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from './components/Sidebar.vue';
import { store } from './store.js';
import { t } from './i18n.js';

const route = useRoute();
const isPublic = computed(() => route.meta.public);
const navOpen = ref(false);
watch(() => route.fullPath, () => (navOpen.value = false));
watch(() => route.meta.title, (k) => (document.title = k ? `${t(k)} · 24order Pro` : '24order Pro'), { immediate: true });
</script>

<template>
  <RouterView v-if="isPublic" />
  <div v-else-if="store.user" class="shell" :class="{ 'nav-open': navOpen }">
    <Sidebar @close="navOpen = false" />
    <div class="scrim" @click="navOpen = false"></div>
    <div class="main">
      <header class="mobilebar">
        <button class="icon-btn" type="button" :aria-label="t('navMenu')" @click="navOpen = true">☰</button>
        <img src="/img/24order-logo.png" alt="" width="28" height="28">
        <strong>{{ t(route.meta.title || 'appName') }}</strong>
      </header>
      <RouterView />
    </div>
  </div>
</template>
