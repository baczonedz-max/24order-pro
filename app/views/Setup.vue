<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api.js';
import { loadSession } from '../store.js';
import { t } from '../i18n.js';
import AuthLayout from '../components/AuthLayout.vue';

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
  <AuthLayout>
    <h1>{{ t('setupTitle') }}</h1>
    <p class="sub">{{ t('setupText') }}</p>
    <form style="display: grid; gap: 14px" @submit.prevent="submit">
      <label class="field"><span>{{ t('name') }}</span><input v-model="form.name" required autocomplete="name"></label>
      <label class="field"><span>{{ t('email') }}</span><input v-model="form.email" type="email" required autocomplete="username"></label>
      <label class="field"><span>{{ t('password') }}</span><input v-model="form.password" type="password" minlength="8" required autocomplete="new-password"><small>{{ t('passwordHint') }}</small></label>
      <p v-if="err" class="form-error" role="alert">{{ err }}</p>
      <button class="btn primary lg block" :disabled="busy">{{ busy ? t('loading') : t('createAccount') }}</button>
    </form>
  </AuthLayout>
</template>
