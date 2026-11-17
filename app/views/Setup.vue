<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { loadSession } from '../store.js';
import { t, LANGS, i18n, setLang } from '../i18n.js';

const router = useRouter();
const form = ref({ name: '', email: '', password: '' });
const err = ref('');
const busy = ref(false);

async function submit() {
  err.value = '';
  busy.value = true;
  try {
    await api('/setup', { method: 'POST', body: form.value });
    await loadSession();
    router.replace('/');
  } catch (e) {
    err.value = e.message;
    if (e.status === 409) router.replace('/login');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="auth">
    <form class="auth-card" @submit.prevent="submit">
      <img src="/img/24order-logo.png" alt="24order" width="64" height="64">
      <h1>{{ t('setupTitle') }}</h1>
      <p class="muted">{{ t('setupText') }}</p>
      <label class="field"><span>{{ t('name') }}</span><input v-model="form.name" required autocomplete="name"></label>
      <label class="field"><span>{{ t('email') }}</span><input v-model="form.email" type="email" required autocomplete="username"></label>
      <label class="field"><span>{{ t('password') }}</span><input v-model="form.password" type="password" minlength="8" required autocomplete="new-password"><small>{{ t('passwordHint') }}</small></label>
      <p v-if="err" class="form-error" role="alert">{{ err }}</p>
      <button class="btn primary block" :disabled="busy">{{ busy ? t('loading') : t('createAccount') }}</button>
      <select class="lang-pick" :value="i18n.lang" :aria-label="t('language')" @change="setLang($event.target.value)">
        <option v-for="(v, k) in LANGS" :key="k" :value="k">{{ v }}</option>
      </select>
    </form>
  </main>
</template>
