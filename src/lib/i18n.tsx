import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Locale = "fr" | "ar";

type Dict = Record<string, string>;

const translations: Record<Locale, Dict> = {
  fr: {
    "app.name": "Bio Tissir",
    "app.backoffice": "Back-office",
    "auth.signin": "Se connecter",
    "auth.signup": "Créer un compte",
    "auth.email": "Email",
    "auth.password": "Mot de passe",
    "auth.displayName": "Nom complet",
    "auth.phone": "Téléphone",
    "auth.signinCta": "Connexion",
    "auth.signupCta": "Inscription",
    "auth.staffPortal": "Portail du personnel",
    "auth.customerPortal": "Espace client",
    "auth.haveAccount": "Vous avez déjà un compte ?",
    "auth.noAccount": "Pas encore de compte ?",
    "auth.signOut": "Se déconnecter",
    "auth.welcome": "Bienvenue",
    "nav.dashboard": "Tableau de bord",
    "nav.products": "Produits",
    "nav.categories": "Catégories",
    "nav.variants": "Variantes",
    "nav.inventory": "Stock",
    "nav.locations": "Entrepôts",
    "nav.orders": "Commandes",
    "nav.confirmation": "Centre de confirmation",
    "nav.customers": "Clients",
    "nav.invoices": "Factures",
    "nav.deliveries": "Livraisons",
    "nav.franchises": "Franchises",
    "nav.settings": "Paramètres",
    "nav.catalog": "Catalogue",
    "nav.stock": "Inventaire",
    "nav.sales": "Ventes",
    "nav.admin": "Administration",
    "common.search": "Rechercher",
    "common.filter": "Filtrer",
    "common.all": "Tous",
    "common.loading": "Chargement…",
    "common.empty": "Aucun résultat",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.actions": "Actions",
    "common.status": "Statut",
    "common.date": "Date",
    "common.total": "Total",
    "common.notifications": "Notifications",
    "common.noNotifications": "Aucune notification",
    "kpi.totalOrders": "Total commandes",
    "kpi.toConfirm": "À confirmer",
    "kpi.confirmed": "Confirmées",
    "kpi.delivered": "Livrées",
    "kpi.cancelled": "Annulées",
    "kpi.lowStock": "Alertes stock",
    "kpi.topProducts": "Meilleurs produits",
    "kpi.recentOrders": "Commandes récentes",
    "orders.title": "Commandes",
    "orders.number": "N°",
    "orders.customer": "Client",
    "orders.channel": "Canal",
    "orders.payment": "Paiement",
    "orders.items": "Articles",
    "orders.timeline": "Historique",
    "orders.address": "Adresse de livraison",
    "confirm.title": "File de confirmation",
    "confirm.attempts": "Tentatives",
    "confirm.confirm": "Confirmer",
    "confirm.reject": "Refuser",
    "confirm.callLog": "Journal d'appels",
    "confirm.notes": "Notes agent",
    "inventory.byLocation": "Stock par entrepôt",
    "inventory.byVariant": "Stock par variante",
    "inventory.movements": "Mouvements",
    "inventory.lowStock": "Faible stock",
    "inventory.batches": "Lots & expiration",
    "inventory.quantity": "Quantité",
    "inventory.reserved": "Réservé",
    "inventory.available": "Disponible",
    "settings.language": "Langue",
    "settings.theme": "Thème",
    "role.required": "Accès refusé : rôle requis",
  },
  ar: {
    "app.name": "بيو تيسير",
    "app.backoffice": "لوحة الإدارة",
    "auth.signin": "تسجيل الدخول",
    "auth.signup": "إنشاء حساب",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.displayName": "الاسم الكامل",
    "auth.phone": "الهاتف",
    "auth.signinCta": "دخول",
    "auth.signupCta": "تسجيل",
    "auth.staffPortal": "بوابة الموظفين",
    "auth.customerPortal": "فضاء العميل",
    "auth.haveAccount": "هل لديك حساب؟",
    "auth.noAccount": "ليس لديك حساب؟",
    "auth.signOut": "خروج",
    "auth.welcome": "مرحباً",
    "nav.dashboard": "لوحة التحكم",
    "nav.products": "المنتجات",
    "nav.categories": "الفئات",
    "nav.variants": "المتغيرات",
    "nav.inventory": "المخزون",
    "nav.locations": "المستودعات",
    "nav.orders": "الطلبات",
    "nav.confirmation": "مركز التأكيد",
    "nav.customers": "العملاء",
    "nav.invoices": "الفواتير",
    "nav.deliveries": "التوصيل",
    "nav.franchises": "الامتيازات",
    "nav.settings": "الإعدادات",
    "nav.catalog": "الكتالوج",
    "nav.stock": "المخزون",
    "nav.sales": "المبيعات",
    "nav.admin": "الإدارة",
    "common.search": "بحث",
    "common.filter": "تصفية",
    "common.all": "الكل",
    "common.loading": "جار التحميل…",
    "common.empty": "لا توجد نتائج",
    "common.save": "حفظ",
    "common.cancel": "إلغاء",
    "common.actions": "إجراءات",
    "common.status": "الحالة",
    "common.date": "التاريخ",
    "common.total": "المجموع",
    "common.notifications": "الإشعارات",
    "common.noNotifications": "لا توجد إشعارات",
    "kpi.totalOrders": "إجمالي الطلبات",
    "kpi.toConfirm": "بانتظار التأكيد",
    "kpi.confirmed": "مؤكدة",
    "kpi.delivered": "تم التوصيل",
    "kpi.cancelled": "ملغاة",
    "kpi.lowStock": "تنبيهات المخزون",
    "kpi.topProducts": "أفضل المنتجات",
    "kpi.recentOrders": "آخر الطلبات",
    "orders.title": "الطلبات",
    "orders.number": "رقم",
    "orders.customer": "العميل",
    "orders.channel": "القناة",
    "orders.payment": "الدفع",
    "orders.items": "المنتجات",
    "orders.timeline": "السجل",
    "orders.address": "عنوان التوصيل",
    "confirm.title": "قائمة التأكيد",
    "confirm.attempts": "المحاولات",
    "confirm.confirm": "تأكيد",
    "confirm.reject": "رفض",
    "confirm.callLog": "سجل المكالمات",
    "confirm.notes": "ملاحظات الوكيل",
    "inventory.byLocation": "المخزون حسب المستودع",
    "inventory.byVariant": "المخزون حسب المتغير",
    "inventory.movements": "الحركات",
    "inventory.lowStock": "مخزون منخفض",
    "inventory.batches": "الدفعات والصلاحية",
    "inventory.quantity": "الكمية",
    "inventory.reserved": "محجوز",
    "inventory.available": "متاح",
    "settings.language": "اللغة",
    "settings.theme": "السمة",
    "role.required": "وصول مرفوض: الدور مطلوب",
  },
};

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const Ctx = createContext<I18nCtx | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "fr";
    return (localStorage.getItem("bt_locale") as Locale) || "fr";
  });

  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
    }
  }, [locale, dir]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem("bt_locale", l);
  };

  const t = (key: string) => translations[locale][key] ?? key;

  return <Ctx.Provider value={{ locale, setLocale, t, dir }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n must be used inside I18nProvider");
  return c;
}