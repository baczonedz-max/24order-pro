<script setup>
// Start page: a big banner made from the restaurant's own categories, then the category cards.
import ShopWheel from './ShopWheel.vue';
import { shop } from './shop.js';
import { t } from '../i18n.js';

</script>

<template>
  <div class="sh-page">
    <!-- The menu that turns: one dish at a time on a wooden board -->
    <ShopWheel />

    <div class="sh-cats">
      <RouterLink v-for="c in shop.categories" :key="c.id" :to="`/order/menu/${c.slug}`" class="sh-cat">
        <img v-if="c.image" :src="c.image" alt="" loading="lazy">
        <div class="sh-glass"><h4>{{ c.name }}</h4><small>{{ c.foods.length }} {{ t('shopItems') }}</small></div>
      </RouterLink>
    </div>
  </div>
</template>
