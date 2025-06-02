-- ================================================================================================
-- SCRIPT DE VÉRIFICATION DES TABLES POUR LE SYSTÈME DE PROMOTIONS
-- ================================================================================================
-- Ce script vérifie l'état actuel des tables cart_items et order_items
-- et identifie les colonnes manquantes pour le système de promotions
-- ================================================================================================

\echo '================================================================================================'
\echo 'VÉRIFICATION DU SYSTÈME DE PROMOTIONS - TABLES CART_ITEMS ET ORDER_ITEMS'
\echo '================================================================================================'
\echo ''

-- ================================================================================================
-- 1. VÉRIFICATION DE L'EXISTENCE DES TABLES
-- ================================================================================================
\echo '1. VÉRIFICATION DE L''EXISTENCE DES TABLES'
\echo '----------------------------------------'

SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ MANQUANTE'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('cart_items', 'order_items')
ORDER BY table_name;

\echo ''

-- ================================================================================================
-- 2. STRUCTURE ACTUELLE DE LA TABLE CART_ITEMS
-- ================================================================================================
\echo '2. STRUCTURE ACTUELLE DE LA TABLE CART_ITEMS'
\echo '--------------------------------------------'

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('discount_price_id', 'original_price', 'discount_percentage', 'has_discount') 
        THEN '🎯 COLONNE PROMOTION'
        ELSE '📋 COLONNE STANDARD'
    END as category
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'cart_items'
ORDER BY ordinal_position;

\echo ''

-- ================================================================================================
-- 3. STRUCTURE ACTUELLE DE LA TABLE ORDER_ITEMS
-- ================================================================================================
\echo '3. STRUCTURE ACTUELLE DE LA TABLE ORDER_ITEMS'
\echo '---------------------------------------------'

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('original_price', 'discount_percentage', 'has_discount') 
        THEN '🎯 COLONNE PROMOTION'
        ELSE '📋 COLONNE STANDARD'
    END as category
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'order_items'
ORDER BY ordinal_position;

\echo ''

-- ================================================================================================
-- 4. VÉRIFICATION DES COLONNES PROMOTIONS MANQUANTES - CART_ITEMS
-- ================================================================================================
\echo '4. COLONNES PROMOTIONS MANQUANTES - CART_ITEMS'
\echo '----------------------------------------------'

WITH required_cart_columns AS (
    SELECT unnest(ARRAY['discount_price_id', 'original_price', 'discount_percentage', 'has_discount']) as column_name
),
existing_cart_columns AS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cart_items'
)
SELECT 
    r.column_name,
    CASE 
        WHEN e.column_name IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ MANQUANTE'
    END as status,
    CASE r.column_name
        WHEN 'discount_price_id' THEN 'ID du prix Stripe promotionnel'
        WHEN 'original_price' THEN 'Prix original avant réduction'
        WHEN 'discount_percentage' THEN 'Pourcentage de réduction'
        WHEN 'has_discount' THEN 'Indicateur de promotion'
    END as description
FROM required_cart_columns r
LEFT JOIN existing_cart_columns e ON r.column_name = e.column_name
ORDER BY r.column_name;

\echo ''

-- ================================================================================================
-- 5. VÉRIFICATION DES COLONNES PROMOTIONS MANQUANTES - ORDER_ITEMS
-- ================================================================================================
\echo '5. COLONNES PROMOTIONS MANQUANTES - ORDER_ITEMS'
\echo '-----------------------------------------------'

WITH required_order_columns AS (
    SELECT unnest(ARRAY['original_price', 'discount_percentage', 'has_discount']) as column_name
),
existing_order_columns AS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_items'
)
SELECT 
    r.column_name,
    CASE 
        WHEN e.column_name IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ MANQUANTE'
    END as status,
    CASE r.column_name
        WHEN 'original_price' THEN 'Prix original avant réduction'
        WHEN 'discount_percentage' THEN 'Pourcentage de réduction'
        WHEN 'has_discount' THEN 'Indicateur de promotion'
    END as description
FROM required_order_columns r
LEFT JOIN existing_order_columns e ON r.column_name = e.column_name
ORDER BY r.column_name;

\echo ''

-- ================================================================================================
-- 6. VÉRIFICATION DES INDEX EXISTANTS
-- ================================================================================================
\echo '6. INDEX PROMOTIONS EXISTANTS'
\echo '-----------------------------'

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef,
    CASE 
        WHEN indexname LIKE '%promotion%' OR indexname LIKE '%discount%' THEN '🎯 INDEX PROMOTION'
        ELSE '📋 INDEX AUTRE'
    END as category
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('cart_items', 'order_items')
    AND (indexname LIKE '%discount%' OR indexname LIKE '%promotion%' OR indexname LIKE '%has_discount%')
ORDER BY tablename, indexname;

\echo ''

-- ================================================================================================
-- 7. RÉSUMÉ EXÉCUTIF
-- ================================================================================================
\echo '7. RÉSUMÉ EXÉCUTIF'
\echo '-----------------'

WITH cart_missing AS (
    SELECT COUNT(*) as missing_count
    FROM (
        SELECT unnest(ARRAY['discount_price_id', 'original_price', 'discount_percentage', 'has_discount']) as column_name
    ) required
    WHERE column_name NOT IN (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'cart_items'
    )
),
order_missing AS (
    SELECT COUNT(*) as missing_count
    FROM (
        SELECT unnest(ARRAY['original_price', 'discount_percentage', 'has_discount']) as column_name
    ) required
    WHERE column_name NOT IN (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'order_items'
    )
)
SELECT 
    'CART_ITEMS' as table_name,
    CASE 
        WHEN c.missing_count = 0 THEN '✅ PRÊT POUR LES PROMOTIONS'
        ELSE '❌ ' || c.missing_count || ' COLONNES MANQUANTES'
    END as status
FROM cart_missing c
UNION ALL
SELECT 
    'ORDER_ITEMS' as table_name,
    CASE 
        WHEN o.missing_count = 0 THEN '✅ PRÊT POUR LES PROMOTIONS'
        ELSE '❌ ' || o.missing_count || ' COLONNES MANQUANTES'
    END as status
FROM order_missing o;

\echo ''
\echo '================================================================================================'
\echo 'FIN DE LA VÉRIFICATION'
\echo '================================================================================================'
\echo ''
\echo 'INSTRUCTIONS SUIVANTES :'
\echo '- Si des colonnes sont manquantes, exécutez les migrations appropriées'
\echo '- Les fichiers de migration sont disponibles dans supabase/migrations/'
\echo '- Utilisez: npx supabase db push pour appliquer les migrations'
\echo '================================================================================================' 