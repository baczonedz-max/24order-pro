<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api } from '../api.js';
import { loadSession } from '../store.js';
import { t, LANGS, i18n, setLang } from '../i18n.js';

const router = useRouter();
const route = useRoute();
const email = ref('');
const password = ref('');
const err = ref('');
const busy = ref(false);

async function submit() {
  err.value = '';
  busy.value = true;
  try {
    await api('/auth/login', { method: 'POST', body: { email: email.value, password: password.value } });
    await loadSession();
    router.replace(route.query.next || '/');
  } catch (e) {
    err.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="auth">
    <form class="auth-card" @submit.prevent="submit">
      <img src="/img/24order-logo.png" alt="24order" width="64" height="64">
      <h1>{{ t('signIn') }}</h1>
      <label class="field"><span>{{ t('email') }}</span><input v-model="email" type="email" autocomplete="username" required autofocus></label>
      <label class="field"><span>{{ t('password') }}</span><input v-model="password" type="password" autocomplete="current-password" required></label>
      <p v-if="err" class="form-error" role="alert">{{ err }}</p>
      <button class="btn primary block" :disabled="busy">{{ busy ? t('loading') : t('signIn') }}</button>
      <select class="lang-pick" :value="i18n.lang" :aria-label="t('language')" @change="setLang($event.target.value)">
        <option v-for="(v, k) in LANGS" :key="k" :value="k">{{ v }}</option>
      </select>
    </form>
  </main>
</template>
