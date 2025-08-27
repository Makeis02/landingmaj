-- ================================================================================================
-- CORRECTION DE LA COLONNE VARIANT MANQUANTE DANS CART_ITEMS
-- ================================================================================================
-- Ce script ajoute la colonne 'variant' manquante qui cause l'erreur 42703
-- ================================================================================================

-- Ajouter la colonne variant si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'variant'
    ) THEN
        ALTER TABLE cart_items ADD COLUMN variant TEXT;
        COMMENT ON COLUMN cart_items.variant IS 'Variante du produit (ex: "Taille:L|Couleur:Rouge")';
        RAISE NOTICE '✅ Colonne variant ajoutée à cart_items';
    ELSE
        RAISE NOTICE 'ℹ️ Colonne variant existe déjà dans cart_items';
    END IF;
END $$;

-- Ajouter la colonne price_id si elle n'existe pas (utilisée dans le code)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'price_id'
    ) THEN
        ALTER TABLE cart_items ADD COLUMN price_id TEXT;
        COMMENT ON COLUMN cart_items.price_id IS 'ID du prix Stripe pour la variante';
        RAISE NOTICE '✅ Colonne price_id ajoutée à cart_items';
    ELSE
        RAISE NOTICE 'ℹ️ Colonne price_id existe déjà dans cart_items';
    END IF;
END $$;

-- Vérifier la structure finale
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN ('variant', 'price_id', 'discount_price_id', 'original_price', 'discount_percentage', 'has_discount') 
        THEN '🎯 COLONNE PROMOTION/VARIANTE'
        ELSE '📋 COLONNE STANDARD'
    END as category
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'cart_items'
ORDER BY ordinal_position;

-- Créer un index sur la colonne variant pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_cart_items_variant 
ON cart_items (variant) 
WHERE variant IS NOT NULL;

COMMENT ON INDEX idx_cart_items_variant IS 'Index pour optimiser les requêtes sur les variantes de produits';
