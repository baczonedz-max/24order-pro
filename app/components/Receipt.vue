<script setup>
// 80 mm receipt. Shown only when printing (see .print-only in styles.css).
import { store, money } from '../store.js';
import { t } from '../i18n.js';
defineProps({ order: { type: Object, required: true } });
const when = (s) => new Date(s).toLocaleString();
</script>

<template>
  <div class="receipt">
    <h2>{{ store.settings.restaurant_name }}</h2>
    <p class="r-center">{{ t('orderNo') }} <b>#{{ order.code }}</b><br>{{ when(order.created_at) }}<br>{{ t('ty_' + order.type) }}<template v-if="order.table_no"> · {{ t('table') }} {{ order.table_no }}</template></p>
    <p v-if="order.customer_name || order.customer_phone">{{ order.customer_name }} {{ order.customer_phone }}</p>
    <hr>
    <div v-for="it in order.items" :key="it.id" class="r-line">
      <div class="r-row"><span>{{ it.qty }}× {{ it.name }}<template v-if="it.size_label"> ({{ it.size_label }})</template></span><span>{{ money(it.line_total, false) }}</span></div>
      <div v-for="a in it.added" :key="'a' + a.id" class="r-sub">+ {{ a.name }} <template v-if="a.price">({{ money(a.price, false) }})</template></div>
      <div v-for="r in it.removed" :key="'r' + r.id" class="r-sub">− {{ t('without') }} {{ r.name }}</div>
      <div v-if="it.note" class="r-sub">“{{ it.note }}”</div>
    </div>
    <hr>
    <div class="r-row"><span>{{ t('subtotal') }}</span><span>{{ money(order.subtotal, false) }}</span></div>
    <div v-if="order.discount" class="r-row"><span>{{ t('discount') }}</span><span>−{{ money(order.discount, false) }}</span></div>
    <div class="r-row r-total"><span>{{ t('total') }}</span><span>{{ money(order.total) }}</span></div>
    <div class="r-row"><span>{{ t('vat') }}</span><span>{{ money(order.tax_total, false) }}</span></div>
    <div class="r-row"><span>{{ t('payment') }}</span><span>{{ t('pay_' + order.payment_method) }}</span></div>
    <p v-if="order.note" class="r-sub">{{ t('note') }}: {{ order.note }}</p>
    <hr>
    <p class="r-center">{{ t('thanks') }}</p>
  </div>
</template>
