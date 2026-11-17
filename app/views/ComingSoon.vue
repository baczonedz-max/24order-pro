<script setup>
import { useRoute } from 'vue-router';
import { t } from '../i18n.js';
const route = useRoute();
</script>

<template>
  <section class="page">
    <header class="page-head"><h1>{{ t(route.meta.title) }}</h1></header>
    <div class="empty-state">
      <span class="badge">{{ t('comingSoon') }}</span>
      <p>{{ t('comingSoonText') }}</p>
    </div>
  </section>
</template>
