// Navigation shared by the sidebar (desktop/tablet) and the bottom bar + "More" sheet (phone).
export const NAV = [
  { label: 'navSales', items: [
    { to: '/', icon: 'home', key: 'navHome' },
    { to: '/orders', icon: 'orders', key: 'navOrders', count: true },
    { to: '/pos', icon: 'pos', key: 'navPos' },
  ] },
  { label: 'navMenu', items: [
    { to: '/ingredients', icon: 'components', key: 'navPhotos' },
    { href: '/mtv.html', icon: 'tv', key: 'navMtv' },
  ] },
];

// Built in later phases; grouped under one collapsible "Upcoming" section so they don't clutter the menu.
export const SOON = [
  { to: '/kitchen', icon: 'kitchen', key: 'navKitchen' },
  { to: '/products', icon: 'products', key: 'navProducts' },
  { to: '/categories', icon: 'categories', key: 'navCategories' },
  { to: '/components', icon: 'components', key: 'navComponents' },
  { to: '/allergies', icon: 'allergy', key: 'navAllergy' },
  { to: '/import', icon: 'sparkle', key: 'navImport' },
  { to: '/customers', icon: 'customers', key: 'navCustomers' },
  { to: '/reports', icon: 'reports', key: 'navReports' },
  { to: '/invoices', icon: 'invoices', key: 'navInvoices' },
  { to: '/inventory', icon: 'inventory', key: 'navInventory' },
  { to: '/gift-cards', icon: 'gift', key: 'navGiftCards' },
  { to: '/users', icon: 'users', key: 'navUsers' },
  { to: '/roles', icon: 'roles', key: 'navRoles' },
  { to: '/settings', icon: 'settings', key: 'navSettings' },
];
