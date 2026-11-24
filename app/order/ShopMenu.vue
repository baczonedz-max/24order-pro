<script setup>
// One category: category tabs on top, then the products. Each card shows every size's price and the allergen names.
import { computed, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../components/Icon.vue';
import { shop, openFood } from './shop.js';
import { price } from '../store.js';
import { t } from '../i18n.js';

const route = useRoute();
const router = useRouter();
const tabs = ref(null);
const cat = computed(() => shop.categories.find((c) => c.slug === route.params.slug));
watch(() => [shop.categories.length, route.params.slug], () => {
  if (shop.categories.length && !cat.value) router.replace('/order');
  nextTick(() => tabs.value?.querySelector('.on')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }));
}, { immediate: true });

const scroll = (dir) => tabs.value?.scrollBy({ left: dir * 260 * (document.dir === 'rtl' ? -1 : 1), behavior: 'smooth' });
const desc = (f) => f.description || f.components.filter((c) => c.state === 'selected').map((c) => c.name).join(', ');
const sizeName = (s) => s.label || s.code || '';
</script>

<template>
  <div v-if="cat" class="sh-page">
    <div class="sh-tabs-wrap">
      <button class="sh-arrow" type="button" :aria-label="t('shopBack')" @click="scroll(-1)"><Icon name="chevronLeft" :size="16" :stroke="2.6" class="flip-rtl" /></button>
      <div ref="tabs" class="sh-tabs">
        <RouterLink v-for="c in shop.categories" :key="c.id" :to="`/order/menu/${c.slug}`" :class="{ on: c.id === cat.id }">{{ c.name }}</RouterLink>
      </div>
      <button class="sh-arrow" type="button" aria-label="→" @click="scroll(1)"><Icon name="chevronRight" :size="16" :stroke="2.6" class="flip-rtl" /></button>
    </div>

    <div class="sh-title">
      <h1>{{ cat.name }}</h1><small>{{ cat.foods.length }} {{ t('shopItems') }}</small>
    </div>

    <div class="sh-grid">
      <button v-for="f in cat.foods" :key="f.id" type="button" class="sh-food" :aria-label="f.name" @click="openFood(f, cat.name)">
        <div class="sh-food-img">
          <img v-if="f.image" :src="f.image" alt="" loading="lazy">
          <span class="sh-add" aria-hidden="true"><Icon name="plus" :size="18" :stroke="2.6" /></span>
        </div>
        <div class="sh-food-txt">
          <h3><span v-if="f.number" class="n">{{ f.number }}.</span> {{ f.name }}</h3>
          <p v-if="desc(f)">{{ desc(f) }}</p>
          <div v-if="f.allergens.length" class="sh-algs">
            <span v-for="a in f.allergens" :key="a">{{ t('alg_' + a) }}</span>
          </div>
          <div class="sh-prices" :class="{ multi: f.sizes.length > 1 }">
            <template v-if="f.sizes.length > 1">
              <span v-for="s in f.sizes" :key="s.id"><small>{{ sizeName(s) }}</small><b class="num">{{ price(s.price).replace(',-', '') }}<i> {{ shop.restaurant.currency }}</i></b></span>
            </template>
            <span v-else-if="f.sizes.length"><b class="num">{{ price(f.sizes[0].price).replace(',-', '') }}<i> {{ shop.restaurant.currency }}</i></b></span>
          </div>
        </div>
      </button>
    </div>

    <p v-if="cat.foods.some((f) => f.allergens.length)" class="sh-note"><Icon name="allergy" :size="16" />{{ t('shopAllergyNote') }}</p>
  </div>
</template>
