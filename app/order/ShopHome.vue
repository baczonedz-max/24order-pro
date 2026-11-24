<script setup>
// Start page: a big banner made from the restaurant's own categories, then the category cards.
import { computed } from 'vue';
import Icon from '../components/Icon.vue';
import { shop } from './shop.js';
import { t } from '../i18n.js';

const words = computed(() => shop.categories.slice(0, 3).map((c) => c.name.toUpperCase()));
const pics = computed(() => shop.categories.filter((c) => c.image).slice(0, 2).map((c) => c.image));
const first = computed(() => shop.categories[0]);
</script>

<template>
  <div class="sh-page">
    <section class="sh-hero">
      <div class="sh-hero-txt">
        <h1><span v-for="w in words" :key="w">{{ w }}</span></h1>
        <RouterLink v-if="first" :to="`/order/menu/${first.slug}`" class="sh-hero-btn">{{ t('shopOrderNow') }} <Icon name="arrowRight" :size="18" class="flip-rtl" /></RouterLink>
      </div>
      <div class="sh-hero-art" aria-hidden="true">
        <img v-if="shop.restaurant.logo" :src="shop.restaurant.logo" alt="" class="sh-hero-logo">
        <img v-for="(p, k) in pics" :key="p" :src="p" alt="" :class="'sh-hero-pic p' + k">
      </div>
    </section>

    <div class="sh-cats">
      <RouterLink v-for="c in shop.categories" :key="c.id" :to="`/order/menu/${c.slug}`" class="sh-cat">
        <img v-if="c.image" :src="c.image" alt="" loading="lazy">
        <div class="sh-glass"><h4>{{ c.name }}</h4><small>{{ c.foods.length }} {{ t('shopItems') }}</small></div>
      </RouterLink>
    </div>
  </div>
</template>
