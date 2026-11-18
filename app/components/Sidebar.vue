<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { store, logout, toggleSidebar } from '../store.js';
import { t } from '../i18n.js';
import { NAV, SOON } from '../nav.js';
import Icon from './Icon.vue';

const router = useRouter();
const route = useRoute();
const soonOpen = ref(false);
const isActive = (to) => (to === '/' ? route.path === '/' : route.path.startsWith(to));

async function signOut() {
  await logout();
  router.push('/login');
}
</script>

<template>
  <aside class="sidebar">
    <div class="sb-brand">
      <img src="/img/24order-logo.png" alt="" width="36" height="36">
      <div class="txt">
        <strong>24order Pro</strong>
        <small>{{ store.settings.restaurant_name }}</small>
      </div>
    </div>

    <nav class="sb-nav">
      <section v-for="g in NAV" :key="g.label" class="sb-group">
        <h3>{{ t(g.label) }}</h3>
        <template v-for="it in g.items" :key="it.key">
          <a v-if="it.href" :href="it.href" class="sb-link" :title="t(it.key)"><Icon :name="it.icon" /><span class="label">{{ t(it.key) }}</span></a>
          <RouterLink v-else :to="it.to" class="sb-link" :class="{ active: isActive(it.to) }" :title="t(it.key)">
            <Icon :name="it.icon" /><span class="label">{{ t(it.key) }}</span>
            <span v-if="it.count && store.activeCount" class="count">{{ store.activeCount }}</span>
          </RouterLink>
        </template>
      </section>

      <section class="sb-group">
        <button type="button" class="sb-link sb-toggle" :class="{ open: soonOpen }" :title="t('moreModules')" @click="soonOpen = !soonOpen">
          <Icon name="grid" /><span class="label">{{ t('moreModules') }}</span><Icon name="chevronDown" :size="16" class="chev hide-min" />
        </button>
        <template v-if="soonOpen">
          <RouterLink v-for="it in SOON" :key="it.key" :to="it.to" class="sb-link soon" :class="{ active: isActive(it.to) }" :title="t(it.key)">
            <Icon :name="it.icon" /><span class="label">{{ t(it.key) }}</span><span class="soon-tag">{{ t('soon') }}</span>
          </RouterLink>
        </template>
      </section>
    </nav>

    <div class="sb-foot">
      <button type="button" class="sb-link hide-sm" :title="store.collapsed ? t('expand') : t('collapse')" @click="toggleSidebar">
        <Icon name="sidebar" /><span class="label">{{ store.collapsed ? t('expand') : t('collapse') }}</span>
      </button>
      <div class="sb-user">
        <span class="avatar">{{ (store.user?.name || '?').slice(0, 1).toUpperCase() }}</span>
        <div class="txt"><strong>{{ store.user?.name }}</strong><small>{{ store.user?.email }}</small></div>
        <button class="icon-btn sm hide-min" type="button" :title="t('logout')" :aria-label="t('logout')" @click="signOut"><Icon name="logout" :size="18" /></button>
      </div>
    </div>
  </aside>
</template>
