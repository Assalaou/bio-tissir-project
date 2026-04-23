
# Bio Tissir — Phase 2 : Modules Avancés

Extension de la plateforme avec fidélité, packs, CMS storefront, avis clients, notifications et dashboard analytique avancé. Tout est intégré aux modules existants (produits, commandes, clients, livraisons) et entièrement multilingue.

## 1. Système de fidélité

**Tables**
- `loyalty_accounts` (id, customer_id unique, points_balance, lifetime_points, tier: `bronze`/`silver`/`gold`/`vip`, tier_updated_at)
- `loyalty_transactions` (id, account_id, type: `earn`/`redeem`/`adjust`/`expire`, points, order_id nullable, reason, created_at, expires_at)
- `loyalty_rules` (id, name, points_per_currency, min_order_amount, tier_thresholds jsonb, active)
- `coupons` (id, code unique, type: `percent`/`fixed`/`free_shipping`/`bogo`, value, min_order, max_uses, max_uses_per_customer, valid_from, valid_until, applicable_products jsonb, applicable_categories jsonb, customer_segment, active)
- `coupon_usage` (id, coupon_id, customer_id, order_id, discount_applied, used_at)

**Logique**
- Trigger DB sur `orders.status = 'delivered'` → crée `loyalty_transactions` (earn) selon `loyalty_rules`
- Recalcul auto du `tier` selon `lifetime_points`
- Validation coupon côté serveur (server function) avant application
- Expiration points via job (structure préparée)

**UI Admin**
- Page Fidélité : règles d'attribution, paliers, vue comptes clients
- Page Coupons : CRUD, statistiques d'utilisation, génération codes en masse
- Bloc fidélité dans fiche client

**UI Storefront**
- Espace client : solde points, historique, palier actuel + progression
- Saisie code promo au checkout

## 2. Packs / Bundles produits

**Tables**
- `bundles` (id, sku, base_price, discount_type: `fixed_price`/`percent_off`/`sum_minus`, discount_value, active)
- `bundle_translations` (bundle_id, locale, name, description, marketing_label) — FR/AR/EN
- `bundle_items` (id, bundle_id, variant_id, quantity)
- `bundle_images` (id, bundle_id, url, sort_order)

**Logique stock**
- Vue SQL `bundle_availability` calcule stock dispo = `MIN(inventory.quantity / bundle_items.quantity)` par entrepôt
- À la commande : décrément des composants individuels (pas d'entrée stock pour le bundle lui-même)
- Réservation atomique des composants à la confirmation

**UI Admin**
- Page Packs : composer un bundle en sélectionnant variantes + quantités, preview prix vs somme composants, économie affichée
- Indicateur stock dispo en temps réel
- Tags marketing : "Pack Ramadan", "Pack Cadeau", "Pack Beauté"

**UI Storefront**
- Section "Coffrets & Packs" sur l'accueil
- Fiche pack : composition détaillée avec photos des produits inclus, économie mise en avant

## 3. CMS Storefront multilingue

**Tables**
- `cms_pages` (id, slug unique, type: `page`/`policy`/`legal`, status: `draft`/`published`, published_at, sort_order)
- `cms_page_translations` (page_id, locale, title, content_html, meta_title, meta_description) — FR/AR/EN
- `banners` (id, position: `home_hero`/`home_secondary`/`category_top`/`checkout`, image_url, link_url, sort_order, start_date, end_date, active)
- `banner_translations` (banner_id, locale, title, subtitle, cta_label)
- `blog_posts` (id, slug unique, author_id, cover_image, category, status, published_at)
- `blog_post_translations` (post_id, locale, title, excerpt, content_html, meta_title, meta_description)
- `blog_categories` + `blog_category_translations`

**UI Admin — Module CMS**
- Pages : éditeur riche (TipTap) avec onglets de langue FR/AR/EN, RTL automatique pour AR
- Bannières : drag & drop ordering, planification, preview par position
- Blog : éditeur articles, gestion catégories, brouillons/publication
- SEO : meta titles/descriptions par langue

**UI Storefront**
- Routes dynamiques : `/p/$slug` (pages), `/blog`, `/blog/$slug`
- Footer auto-rempli avec pages de type `policy`/`legal`
- Bannières affichées selon position et langue active

## 4. Avis clients

**Tables**
- `product_reviews` (id, product_id, customer_id, order_id nullable, rating 1-5, title, comment, status: `pending`/`approved`/`rejected`/`spam`, verified_purchase bool, helpful_count, created_at, moderated_by, moderated_at)
- `review_responses` (id, review_id, responder_id, response_text, created_at) — réponses officielles de la marque
- `review_votes` (id, review_id, customer_id, helpful bool) — unique(review, customer)

**Logique**
- `verified_purchase = true` si le client a une commande livrée contenant le produit
- Trigger : recalcul `products.avg_rating` et `review_count` agrégés
- Modération obligatoire avant publication (configurable)
- Email/notification à la marque sur nouvel avis

**UI Admin**
- File de modération : approuver/rejeter/marquer spam, répondre publiquement
- Statistiques par produit : note moyenne, distribution étoiles

**UI Storefront**
- Section avis sur fiche produit : note moyenne, distribution, avis vérifiés en premier
- Formulaire d'avis (clients connectés ayant acheté)
- Vote "utile", tri (récents/utiles/notes)

## 5. Système de notifications

**Tables**
- `notifications` (id, recipient_user_id, type: `new_order`/`order_confirmed`/`low_stock`/`failed_delivery`/`new_review`/`payment_received`/`vip_customer`/`franchise_target`, title, body, link_url, read_at, priority: `low`/`normal`/`high`/`urgent`, created_at)
- `notification_preferences` (user_id, channel: `in_app`/`email`/`sms`/`whatsapp`, type, enabled) — unique(user, channel, type)
- `notification_outbox` (id, channel, recipient_address, template_key, payload jsonb, status: `pending`/`sent`/`failed`, attempts, sent_at, error) — file pour SMS/WhatsApp/email (workers à brancher Phase 3)
- `notification_templates` (id, key, channel, locale, subject, body) — multilingue

**Logique**
- Triggers DB sur événements clés : nouvelle commande → notif admin commercial + agents confirmation ; stock < seuil → notif stock manager ; livraison échouée → notif logistique ; nouvel avis → notif modérateur
- Server function `enqueueNotification()` insère dans `notification_outbox` selon préférences utilisateur
- Realtime Supabase pour notifications in-app instantanées

**UI Admin**
- Cloche notifications dans header avec badge non-lus, dropdown live
- Page Notifications : liste filtrée, marquer lu/tout lu
- Page Préférences : matrice canal × type d'événement
- Page Templates (super_admin) : éditeur templates multilingues

## 6. Dashboard analytique avancé

**Vues SQL matérialisées (refresh périodique)**
- `mv_daily_sales` : CA, commandes, panier moyen par jour/canal/franchise
- `mv_product_performance` : ventes, marge, rotation par produit/variante
- `mv_delivery_metrics` : taux succès, taux refus, délai moyen par zone/transporteur
- `mv_customer_retention` : cohortes, taux réachat, churn, CLV par segment
- `mv_channel_revenue` : CA et marge par canal (web/WhatsApp/shop/wholesale/franchise)

**KPIs ajoutés au dashboard**
- **Performance livraison** : taux de succès, taux d'annulation, taux de retour, délai moyen de livraison
- **Revenu par canal** : graphique en aires par canal sur 30j, comparaison période
- **Rentabilité produit** : top profit (prix - coût × ventes), produits à faible marge, produits dormants
- **Rétention client** : taux de réachat 30/60/90j, nouveaux vs récurrents, cohortes mensuelles, CLV moyen
- **Performance fidélité** : points distribués, points utilisés, taux de redemption, impact CA des membres
- **Coupons** : utilisation, CA généré, ROI
- **Avis** : note moyenne globale, nouveaux avis, taux de réponse
- **Franchises** : classement, atteinte objectifs, comparaison

**UI**
- Dashboard restructuré en onglets : Vue d'ensemble / Ventes / Logistique / Clients / Produits / Franchises
- Filtres globaux : période (7/30/90j/custom), canal, franchise, ville
- Graphiques (Recharts) : courbes, barres empilées, donuts, heatmaps
- Export CSV/Excel par section
- Comparaison période précédente avec indicateurs % évolution

## Multilingue & RTL
Toutes les nouvelles entités à contenu visible (bundles, CMS, bannières, blog, templates notifications, coupons descriptions) ont une table `_translations` avec `locale` ∈ {fr, ar, en}. L'éditeur admin propose les onglets de langue avec basculement RTL automatique pour l'arabe.

## Sécurité & RLS
RLS activé sur toutes les nouvelles tables avec policies basées sur `has_role()` :
- CMS/banners/blog publiés → lecture publique ; écriture `super_admin`/`commercial_admin`
- Avis approuvés → lecture publique ; création par client connecté ayant acheté ; modération par `commercial_admin`
- Notifications → lecture par destinataire uniquement
- Loyalty/coupons → lecture du compte par client propriétaire ; gestion par admin

## Hors scope (Phase 3)
Envoi réel SMS/WhatsApp/email (workers + intégrations Twilio/Meta), expiration automatique des points (cron), recommandations IA produits, A/B testing bannières, génération automatique fiches produits IA. La structure est prête à les recevoir.
