// Dashboard strings: Arabic (RTL), English, French, Norwegian.
import { reactive, computed } from 'vue';

export const LANGS = { ar: 'العربية', en: 'English', fr: 'Français', no: 'Norsk' };

const D = {
  // general
  appName: ['24order Pro', '24order Pro', '24order Pro', '24order Pro'],
  save: ['حفظ', 'Save', 'Enregistrer', 'Lagre'],
  cancel: ['إلغاء', 'Cancel', 'Annuler', 'Avbryt'],
  close: ['إغلاق', 'Close', 'Fermer', 'Lukk'],
  search: ['بحث', 'Search', 'Rechercher', 'Søk'],
  all: ['الكل', 'All', 'Tous', 'Alle'],
  loading: ['جارٍ التحميل…', 'Loading…', 'Chargement…', 'Laster…'],
  error: ['حدث خطأ', 'Something went wrong', 'Une erreur est survenue', 'Noe gikk galt'],
  retry: ['إعادة المحاولة', 'Try again', 'Réessayer', 'Prøv igjen'],
  comingSoon: ['قريبًا', 'Coming soon', 'Bientôt', 'Kommer snart'],
  comingSoonText: ['هذه الصفحة قيد البناء وستكون جاهزة في المراحل القادمة.', 'This page is being built and arrives in a next phase.', 'Cette page est en construction et arrive dans une prochaine phase.', 'Denne siden bygges og kommer i en senere fase.'],
  logout: ['تسجيل الخروج', 'Sign out', 'Se déconnecter', 'Logg ut'],
  language: ['اللغة', 'Language', 'Langue', 'Språk'],
  today: ['اليوم', 'Today', "Aujourd'hui", 'I dag'],
  yesterday: ['أمس', 'Yesterday', 'Hier', 'I går'],
  week: ['7 أيام', '7 days', '7 jours', '7 dager'],
  month: ['30 يومًا', '30 days', '30 jours', '30 dager'],

  // nav
  navHome: ['الرئيسية', 'Home', 'Accueil', 'Hjem'],
  navOrders: ['الطلبات', 'Orders', 'Commandes', 'Bestillinger'],
  navPos: ['نقطة البيع', 'POS', 'Caisse', 'Kasse'],
  navKitchen: ['شاشة المطبخ', 'Kitchen screen', 'Écran cuisine', 'Kjøkkenskjerm'],
  navProducts: ['المنتجات', 'Products', 'Produits', 'Produkter'],
  navCategories: ['الأقسام', 'Categories', 'Catégories', 'Kategorier'],
  navComponents: ['المكونات', 'Components', 'Ingrédients', 'Ingredienser'],
  navAllergy: ['الحساسية', 'Allergies', 'Allergènes', 'Allergener'],
  navImport: ['استيراد ذكي للمنيو', 'AI menu import', 'Import IA du menu', 'AI-menyimport'],
  navMtv: ['شاشات التلفاز (MTV)', 'TV menus (MTV)', 'Menus TV (MTV)', 'TV-menyer (MTV)'],
  navCustomers: ['العملاء', 'Customers', 'Clients', 'Kunder'],
  navReports: ['التقارير', 'Reports', 'Rapports', 'Rapporter'],
  navInvoices: ['الفواتير', 'Invoices', 'Factures', 'Fakturaer'],
  navInventory: ['المخزون', 'Inventory', 'Stock', 'Lager'],
  navGiftCards: ['بطاقات الهدايا', 'Gift cards', 'Cartes cadeaux', 'Gavekort'],
  navUsers: ['المستخدمون', 'Users', 'Utilisateurs', 'Brukere'],
  navRoles: ['الأدوار والصلاحيات', 'Roles & permissions', 'Rôles et permissions', 'Roller og tilganger'],
  navSettings: ['الإعدادات', 'Settings', 'Paramètres', 'Innstillinger'],
  navSales: ['المبيعات', 'Sales', 'Ventes', 'Salg'],
  navMenu: ['المنيو', 'Menu', 'Menu', 'Meny'],
  navManage: ['الإدارة', 'Management', 'Gestion', 'Administrasjon'],

  // auth
  signIn: ['تسجيل الدخول', 'Sign in', 'Se connecter', 'Logg inn'],
  email: ['البريد الإلكتروني', 'Email', 'E-mail', 'E-post'],
  password: ['كلمة المرور', 'Password', 'Mot de passe', 'Passord'],
  name: ['الاسم', 'Name', 'Nom', 'Navn'],
  setupTitle: ['إنشاء حساب المدير', 'Create the admin account', 'Créer le compte administrateur', 'Opprett administratorkonto'],
  setupText: ['أول حساب يُنشأ هنا يكون مدير المنصة.', 'The first account created here becomes the platform admin.', 'Le premier compte créé ici devient administrateur.', 'Den første kontoen som opprettes her blir administrator.'],
  createAccount: ['إنشاء الحساب', 'Create account', 'Créer le compte', 'Opprett konto'],
  passwordHint: ['8 أحرف على الأقل', 'At least 8 characters', 'Au moins 8 caractères', 'Minst 8 tegn'],

  // home
  revenue: ['الإيرادات', 'Revenue', "Chiffre d'affaires", 'Omsetning'],
  ordersCount: ['الطلبات', 'Orders', 'Commandes', 'Bestillinger'],
  activeOrders: ['طلبات جارية', 'Active orders', 'Commandes en cours', 'Aktive bestillinger'],
  cancelledOrders: ['ملغاة', 'Cancelled', 'Annulées', 'Kansellert'],
  topProducts: ['الأكثر مبيعًا', 'Best sellers', 'Meilleures ventes', 'Mest solgt'],
  byType: ['حسب النوع', 'By type', 'Par type', 'Etter type'],
  noData: ['لا توجد بيانات بعد', 'No data yet', 'Pas encore de données', 'Ingen data ennå'],
  goPos: ['فتح نقطة البيع', 'Open POS', 'Ouvrir la caisse', 'Åpne kassen'],

  // orders
  status: ['الحالة', 'Status', 'Statut', 'Status'],
  type: ['النوع', 'Type', 'Type', 'Type'],
  customer: ['العميل', 'Customer', 'Client', 'Kunde'],
  phone: ['الهاتف', 'Phone', 'Téléphone', 'Telefon'],
  total: ['الإجمالي', 'Total', 'Total', 'Totalt'],
  subtotal: ['المجموع الفرعي', 'Subtotal', 'Sous-total', 'Delsum'],
  discount: ['الخصم', 'Discount', 'Remise', 'Rabatt'],
  vat: ['الضريبة (مشمولة)', 'VAT (included)', 'TVA (incluse)', 'MVA (inkludert)'],
  time: ['الوقت', 'Time', 'Heure', 'Tid'],
  items: ['الأصناف', 'Items', 'Articles', 'Varer'],
  note: ['ملاحظة', 'Note', 'Note', 'Notat'],
  table: ['الطاولة', 'Table', 'Table', 'Bord'],
  address: ['العنوان', 'Address', 'Adresse', 'Adresse'],
  payment: ['الدفع', 'Payment', 'Paiement', 'Betaling'],
  history: ['السجل', 'History', 'Historique', 'Historikk'],
  noOrders: ['لا توجد طلبات', 'No orders', 'Aucune commande', 'Ingen bestillinger'],
  newOrder: ['طلب جديد', 'New order', 'Nouvelle commande', 'Ny bestilling'],
  print: ['طباعة', 'Print', 'Imprimer', 'Skriv ut'],
  live: ['مباشر', 'Live', 'En direct', 'Direkte'],
  soundOn: ['الصوت مفعّل', 'Sound on', 'Son activé', 'Lyd på'],
  soundOff: ['الصوت مطفأ', 'Sound off', 'Son coupé', 'Lyd av'],
  st_active: ['الجارية', 'Active', 'En cours', 'Aktive'],
  st_new: ['جديد', 'New', 'Nouvelle', 'Ny'],
  st_accepted: ['مقبول', 'Accepted', 'Acceptée', 'Godtatt'],
  st_preparing: ['قيد التحضير', 'Preparing', 'En préparation', 'Tilberedes'],
  st_ready: ['جاهز', 'Ready', 'Prête', 'Klar'],
  st_completed: ['مكتمل', 'Completed', 'Terminée', 'Fullført'],
  st_cancelled: ['ملغى', 'Cancelled', 'Annulée', 'Kansellert'],
  next_accepted: ['قبول', 'Accept', 'Accepter', 'Godta'],
  next_preparing: ['بدء التحضير', 'Start preparing', 'Préparer', 'Start tilberedning'],
  next_ready: ['جاهز', 'Mark ready', 'Marquer prête', 'Merk klar'],
  next_completed: ['تسليم', 'Complete', 'Terminer', 'Fullfør'],
  cancelOrder: ['إلغاء الطلب', 'Cancel order', 'Annuler la commande', 'Kanseller bestilling'],
  confirmCancel: ['هل تريد إلغاء هذا الطلب؟', 'Cancel this order?', 'Annuler cette commande ?', 'Kansellere denne bestillingen?'],
  ty_takeaway: ['استلام', 'Takeaway', 'À emporter', 'Takeaway'],
  ty_dine_in: ['في المطعم', 'Dine in', 'Sur place', 'Spise her'],
  ty_delivery: ['توصيل', 'Delivery', 'Livraison', 'Levering'],
  pay_cash: ['نقدًا', 'Cash', 'Espèces', 'Kontant'],
  pay_card: ['بطاقة', 'Card', 'Carte', 'Kort'],
  pay_vipps: ['Vipps', 'Vipps', 'Vipps', 'Vipps'],
  pay_unpaid: ['غير مدفوع', 'Unpaid', 'Non payé', 'Ubetalt'],
  src_pos: ['نقطة البيع', 'POS', 'Caisse', 'Kasse'],
  src_online: ['أونلاين', 'Online', 'En ligne', 'Nett'],

  // POS
  cart: ['السلة', 'Cart', 'Panier', 'Handlekurv'],
  emptyCart: ['السلة فارغة. اضغط على منتج لإضافته.', 'The cart is empty. Tap a product to add it.', 'Le panier est vide. Touchez un produit.', 'Handlekurven er tom. Trykk på et produkt.'],
  addToCart: ['إضافة للسلة', 'Add to cart', 'Ajouter', 'Legg til'],
  size: ['الحجم', 'Size', 'Taille', 'Størrelse'],
  ingredients: ['المكونات', 'Ingredients', 'Ingrédients', 'Ingredienser'],
  ingredientsHint: ['اضغط لإزالة مكوّن', 'Tap to remove', 'Touchez pour retirer', 'Trykk for å fjerne'],
  extras: ['إضافات', 'Extras', 'Suppléments', 'Ekstra'],
  without: ['بدون', 'No', 'Sans', 'Uten'],
  qty: ['الكمية', 'Qty', 'Qté', 'Antall'],
  clear: ['تفريغ', 'Clear', 'Vider', 'Tøm'],
  charge: ['تأكيد الطلب', 'Place order', 'Valider', 'Fullfør bestilling'],
  paidNow: ['مدفوع ومُسلَّم', 'Paid & handed over', 'Payée et remise', 'Betalt og utlevert'],
  sendKitchen: ['إرسال للمطبخ', 'Send to kitchen', 'Envoyer en cuisine', 'Send til kjøkkenet'],
  orderPlaced: ['تم إنشاء الطلب', 'Order placed', 'Commande créée', 'Bestilling opprettet'],
  percent: ['نسبة %', 'Percent %', 'Pourcentage %', 'Prosent %'],
  amount: ['مبلغ', 'Amount', 'Montant', 'Beløp'],
  searchProducts: ['ابحث عن منتج أو رقم', 'Search product or number', 'Rechercher un produit', 'Søk etter produkt eller nummer'],
  optionalDetails: ['تفاصيل العميل (اختياري)', 'Customer details (optional)', 'Client (facultatif)', 'Kundeinfo (valgfritt)'],
  receipt: ['الإيصال', 'Receipt', 'Reçu', 'Kvittering'],
  orderNo: ['رقم الطلب', 'Order no.', 'Commande n°', 'Ordrenr.'],
  thanks: ['شكرًا لزيارتكم', 'Thank you!', 'Merci !', 'Takk for besøket!'],
  edit: ['تعديل', 'Edit', 'Modifier', 'Endre'],
  remove: ['حذف', 'Remove', 'Supprimer', 'Fjern'],
};

const idx = { ar: 0, en: 1, fr: 2, no: 3 };

function initial() {
  try {
    const s = localStorage.getItem('lang');
    if (s && idx[s] !== undefined) return s;
  } catch {}
  const n = (navigator.language || 'en').slice(0, 2);
  return n === 'nb' || n === 'nn' ? 'no' : idx[n] !== undefined ? n : 'en';
}

export const i18n = reactive({ lang: initial() });
export const isRtl = computed(() => i18n.lang === 'ar');

export function t(key) {
  const row = D[key];
  return row ? row[idx[i18n.lang]] ?? row[1] : key;
}

export function setLang(l) {
  i18n.lang = l;
  try { localStorage.setItem('lang', l); } catch {}
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
}
setLang(i18n.lang);
