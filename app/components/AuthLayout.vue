<script setup>
import { t, LANGS, i18n, setLang } from '../i18n.js';
</script>

<template>
  <main class="auth">
    <section class="auth-art" aria-hidden="true">
      <div class="brand"><img src="/img/24order-logo.png" alt="">24order Pro</div>
      <div>
        <h2>{{ t('authTitle') }}</h2>
        <p>{{ t('authText') }}</p>
      </div>
      <div class="feats">
        <span>{{ t('navPos') }}</span><span>{{ t('navOrders') }}</span><span>{{ t('navMtv') }}</span><span>{{ t('navImport') }}</span>
      </div>
    </section>
    <section class="auth-form">
      <div class="auth-card">
        <img src="/img/24order-logo.png" alt="24order" class="logo">
        <slot />
        <div class="foot">
          <select class="lang-select" :value="i18n.lang" :aria-label="t('language')" @change="setLang($event.target.value)">
            <option v-for="(v, k) in LANGS" :key="k" :value="k">{{ v }}</option>
          </select>
        </div>
      </div>
    </section>
  </main>
</template>
