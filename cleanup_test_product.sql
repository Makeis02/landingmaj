-- ===================================================================
-- NETTOYAGE COMPLET DU PRODUIT DE TEST : prod_SITVuxVO8xLt5u
-- ===================================================================
-- Ce script supprime toutes les données liées aux variantes et promotions
-- pour permettre de tester les nouvelles corrections

-- 1️⃣ SUPPRESSION DES PRIX DANS LA TABLE product_prices
-- (nouvelle table pour les prix Stripe)
DELETE FROM product_prices 
WHERE product_id = 'prod_SITVuxVO8xLt5u';

-- 2️⃣ SUPPRESSION DES DONNÉES DE VARIANTES ET PROMOTIONS DANS editable_content
-- (table legacy mais encore utilisée)

-- Suppression des variantes (labels, options, price_maps, etc.)
DELETE FROM editable_content 
WHERE content_key LIKE 'product_prod_SITVuxVO8xLt5u_variant_%';

-- Suppression des promotions globales du produit
DELETE FROM editable_content 
WHERE content_key IN (
    'product_prod_SITVuxVO8xLt5u_discount_percentage',
    'product_prod_SITVuxVO8xLt5u_discount_price',
    'product_prod_SITVuxVO8xLt5u_stripe_discount_price_id'
);

-- 3️⃣ GARDER UNIQUEMENT LES DONNÉES DE BASE DU PRODUIT
-- (on ne supprime pas le titre, description, prix de base, images, etc.)

-- Vérification : afficher ce qui reste après nettoyage
SELECT content_key, content, updated_at 
FROM editable_content 
WHERE content_key LIKE 'product_prod_SITVuxVO8xLt5u_%'
  AND content_key NOT LIKE '%variant_%'
  AND content_key NOT LIKE '%discount_%'
ORDER BY content_key;

-- ===================================================================
-- RÉSUMÉ DES SUPPRESSIONS PRÉVUES :
-- ===================================================================
-- ✅ Toutes les variantes (variant_0_*)
-- ✅ Tous les stocks de variantes
-- ✅ Tous les prix réduits de variantes (*_discount_*)
-- ✅ Tous les stripe_price_id de variantes et promotions
-- ✅ Toutes les entrées dans product_prices
-- 
-- 🔒 CONSERVÉ :
-- ✅ Titre, description, prix de base
-- ✅ Images, spécifications
-- ✅ brand_id, related_category
-- ✅ Logos eau douce/mer
-- ✅ stripe_price_id de base du produit
-- =================================================================== 