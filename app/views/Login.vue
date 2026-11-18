<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api } from '../api.js';
import { loadSession } from '../store.js';
import { t } from '../i18n.js';
import AuthLayout from '../components/AuthLayout.vue';

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
  <AuthLayout>
    <h1>{{ t('signIn') }}</h1>
    <p class="sub">{{ t('signInText') }}</p>
    <form style="display: grid; gap: 14px" @submit.prevent="submit">
      <label class="field"><span>{{ t('email') }}</span><input v-model="email" type="email" autocomplete="username" required autofocus></label>
      <label class="field"><span>{{ t('password') }}</span><input v-model="password" type="password" autocomplete="current-password" required></label>
      <p v-if="err" class="form-error" role="alert">{{ err }}</p>
      <button class="btn primary lg block" :disabled="busy">{{ busy ? t('loading') : t('signIn') }}</button>
    </form>
  </AuthLayout>
</template>
