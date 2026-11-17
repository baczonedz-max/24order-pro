<script setup>
// Line icons (24×24, stroke = currentColor).
defineProps({ name: { type: String, required: true }, size: { type: Number, default: 20 } });
const P = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4',
  pos: 'M3 5h18v10H3zM7 19h10M12 15v4M7 9h4',
  kitchen: 'M6 3v8a3 3 0 0 0 6 0V3M9 3v18M17 3c-2 2-2 6 0 8v10',
  products: 'M4 7l8-4 8 4-8 4zM4 7v10l8 4 8-4V7M12 11v10',
  categories: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  components: 'M12 3a4 4 0 0 1 4 4c3 0 5 2 5 5s-2 5-5 5a4 4 0 0 1-8 0c-3 0-5-2-5-5s2-5 5-5a4 4 0 0 1 4-4z',
  allergy: 'M12 3l9 16H3zM12 10v4M12 17h.01',
  import: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  tv: 'M3 5h18v12H3zM8 21h8M12 17v4',
  customers: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21c1-4 4-6 8-6s7 2 8 6',
  reports: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  invoices: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h6',
  inventory: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  gift: 'M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8c-2-4-6-4-6-1 0 1 1 1 6 1zM12 8c2-4 6-4 6-1 0 1-1 1-6 1z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 1 0 0-6M22 21c0-3-2-5-5-5',
  roles: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-2V4h-4v2L9 8 7 7l-2 4 2 1v2l-2 1 2 4 2-1 2 2v2h4v-2l2-2 2 1 2-4-2-1z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  print: 'M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  bellOff: 'M6 16V11a6 6 0 0 1 9-5M18 11v5l2 2H8M10 20a2 2 0 0 0 4 0M3 3l18 18',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  note: 'M5 4h14v12l-4 4H5zM15 20v-4h4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
};
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="P[name] || ''" />
  </svg>
</template>
