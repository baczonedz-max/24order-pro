<script setup>
import { useRoute } from 'vue-router';
import { t } from '../i18n.js';
import Icon from '../components/Icon.vue';
const route = useRoute();
</script>

<template>
  <section class="page">
    <div class="card soon-card">
      <span class="art"><Icon name="sparkle" :size="32" /></span>
      <h2>{{ t(route.meta.title) }}</h2>
      <span class="pill plain">{{ t('comingSoon') }}</span>
      <p>{{ t('comingSoonText') }}</p>
      <RouterLink to="/" class="btn ghost"><Icon name="home" :size="18" />{{ t('navHome') }}</RouterLink>
    </div>
  </section>
</template>
