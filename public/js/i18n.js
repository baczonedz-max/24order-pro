// Interface strings in Arabic, English, French and Norwegian.
export const LANGS = { ar: 'العربية', en: 'English', fr: 'Français', no: 'Norsk' };

const T = {
  appTitle: { ar: 'مُنشئ شاشات المنيو', en: 'TV Menu Builder', fr: 'Créateur de menus TV', no: 'TV-menybygger' },
  source: { ar: 'مصدر البيانات', en: 'Data source', fr: 'Source des données', no: 'Datakilde' },
  demo: { ar: 'تجريبي: Paradis Pizza', en: 'Demo: Paradis Pizza', fr: 'Démo : Paradis Pizza', no: 'Demo: Paradis Pizza' },
  live: { ar: 'مباشر من 24order', en: 'Live from 24order', fr: 'En direct de 24order', no: 'Direkte fra 24order' },
  server: { ar: 'سيرفر المطعم', en: 'Restaurant server', fr: 'Serveur du restaurant', no: 'Restaurantserver' },
  branch: { ar: 'رقم الفرع (اختياري)', en: 'Branch id (optional)', fr: 'ID de la succursale (facultatif)', no: 'Avdelings-ID (valgfritt)' },
  load: { ar: 'تحميل', en: 'Load', fr: 'Charger', no: 'Last inn' },
  liveNote: {
    ar: 'واجهة 24order الحالية ترسل الأسماء والأوصاف فقط. الأسعار والصور والأحجام تحتاج endpoint كامل.',
    en: 'The current 24order API sends names and descriptions only. Prices, photos and sizes need a full endpoint.',
    fr: "L'API 24order actuelle n'envoie que les noms et descriptions. Prix, photos et tailles nécessitent un endpoint complet.",
    no: 'Dagens 24order-API sender bare navn og beskrivelser. Priser, bilder og størrelser trenger et fullt endepunkt.',
  },
  template: { ar: 'القالب', en: 'Template', fr: 'Modèle', no: 'Mal' },
  categories: { ar: 'الأقسام', en: 'Categories', fr: 'Catégories', no: 'Kategorier' },
  categoriesHint: {
    ar: 'شبكة اللهب: القسم الأول. البطاقات: قسم رئيسي + قسم ثانٍ اختياري. الألواح: حتى 4 أقسام.',
    en: 'Fire grid: first category. Cards: main + optional second. Panels: up to 4.',
    fr: 'Grille feu : 1re catégorie. Cartes : principale + 2e facultative. Panneaux : jusqu’à 4.',
    no: 'Flammerutenett: første kategori. Kort: hoved + valgfri andre. Paneler: opptil 4.',
  },
  title: { ar: 'العنوان', en: 'Title', fr: 'Titre', no: 'Tittel' },
  titlePh: { ar: 'اسم القسم تلقائيًا', en: 'Category name by default', fr: 'Nom de la catégorie par défaut', no: 'Kategorinavn som standard' },
  show: { ar: 'إظهار', en: 'Show', fr: 'Afficher', no: 'Vis' },
  numbers: { ar: 'الأرقام', en: 'Numbers', fr: 'Numéros', no: 'Numre' },
  ingredients: { ar: 'المكونات', en: 'Ingredients', fr: 'Ingrédients', no: 'Ingredienser' },
  footer: { ar: 'شريط الإضافات', en: 'Extras bar', fr: 'Barre des suppléments', no: 'Ekstralinje' },
  embers: { ar: 'شرارات متحركة', en: 'Moving embers', fr: 'Braises animées', no: 'Bevegelige gnister' },
  colours: { ar: 'الألوان', en: 'Colours', fr: 'Couleurs', no: 'Farger' },
  accent: { ar: 'اللون الرئيسي', en: 'Accent', fr: 'Accent', no: 'Aksent' },
  priceColor: { ar: 'لون السعر', en: 'Price colour', fr: 'Couleur des prix', no: 'Prisfarge' },
  columns: { ar: 'الأعمدة', en: 'Columns', fr: 'Colonnes', no: 'Kolonner' },
  openTv: { ar: 'فتح شاشة التلفاز', en: 'Open TV screen', fr: "Ouvrir l'écran TV", no: 'Åpne TV-skjerm' },
  copyLink: { ar: 'نسخ رابط التلفاز', en: 'Copy TV link', fr: 'Copier le lien TV', no: 'Kopier TV-lenke' },
  copied: { ar: 'تم النسخ', en: 'Copied', fr: 'Copié', no: 'Kopiert' },
  save: { ar: 'حفظ الشاشة', en: 'Save screen', fr: "Enregistrer l'écran", no: 'Lagre skjerm' },
  saved: { ar: 'الشاشات المحفوظة', en: 'Saved screens', fr: 'Écrans enregistrés', no: 'Lagrede skjermer' },
  none: { ar: 'لا توجد شاشات بعد', en: 'No screens yet', fr: "Pas encore d'écrans", no: 'Ingen skjermer ennå' },
  screenName: { ar: 'اسم الشاشة', en: 'Screen name', fr: "Nom de l'écran", no: 'Skjermnavn' },
  delete: { ar: 'حذف', en: 'Delete', fr: 'Supprimer', no: 'Slett' },
  loading: { ar: 'جارٍ التحميل…', en: 'Loading…', fr: 'Chargement…', no: 'Laster…' },
  error: { ar: 'تعذّر تحميل المنيو', en: 'Could not load the menu', fr: 'Impossible de charger le menu', no: 'Kunne ikke laste menyen' },
  products: { ar: 'منتج', en: 'products', fr: 'produits', no: 'produkter' },
};

export function t(key, lang) {
  return T[key]?.[lang] ?? T[key]?.en ?? key;
}

export function detectLang() {
  try {
    const saved = localStorage.getItem('mtv.lang');
    if (saved && LANGS[saved]) return saved;
  } catch {}
  const nav = (navigator.language || 'en').slice(0, 2);
  return nav === 'nb' || nav === 'nn' ? 'no' : LANGS[nav] ? nav : 'en';
}
