-- ======================================================
-- VÉRIFICATION RAPIDE DU SYSTÈME DE PROMOTIONS
-- ======================================================

-- Tables existantes
SELECT 'TABLES EXISTANTES' as section;
SELECT table_name, 'EXISTS' as status 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('cart_items', 'order_items');

-- Colonnes promotions manquantes dans cart_items
SELECT 'CART_ITEMS - COLONNES MANQUANTES' as section;
WITH required AS (
  SELECT unnest(ARRAY['discount_price_id', 'original_price', 'discount_percentage', 'has_discount']) as col
)
SELECT r.col as missing_column, 'CART_ITEMS' as table_name
FROM required r
WHERE r.col NOT IN (
  SELECT column_name FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'cart_items'
);

-- Colonnes promotions manquantes dans order_items  
SELECT 'ORDER_ITEMS - COLONNES MANQUANTES' as section;
WITH required AS (
  SELECT unnest(ARRAY['original_price', 'discount_percentage', 'has_discount']) as col
)
SELECT r.col as missing_column, 'ORDER_ITEMS' as table_name
FROM required r
WHERE r.col NOT IN (
  SELECT column_name FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'order_items'
);

-- Résumé final
SELECT 'RÉSUMÉ' as section;
SELECT 
  'CART_ITEMS' as table_name,
  4 - COUNT(*) as missing_columns_count,
  CASE WHEN COUNT(*) = 4 THEN 'READY' ELSE 'NEEDS_MIGRATION' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'cart_items' 
  AND column_name IN ('discount_price_id', 'original_price', 'discount_percentage', 'has_discount')
UNION ALL
SELECT 
  'ORDER_ITEMS' as table_name,
  3 - COUNT(*) as missing_columns_count,
  CASE WHEN COUNT(*) = 3 THEN 'READY' ELSE 'NEEDS_MIGRATION' END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'order_items' 
  AND column_name IN ('original_price', 'discount_percentage', 'has_discount'); 