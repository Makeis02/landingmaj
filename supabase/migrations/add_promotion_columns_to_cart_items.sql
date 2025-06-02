-- Migration pour ajouter les colonnes de promotion à la table cart_items
-- Ces colonnes permettent de stocker les informations sur les réductions dans le panier

-- Ajouter la colonne discount_price_id (ID du prix Stripe promotionnel)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'discount_price_id'
    ) THEN
        ALTER TABLE cart_items ADD COLUMN discount_price_id TEXT;
        COMMENT ON COLUMN cart_items.discount_price_id IS 'ID du prix Stripe pour la promotion (stripe_discount_price_id)';
    END IF;
END $$;

-- Ajouter la colonne original_price (prix original avant réduction)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'original_price'
    ) THEN
        ALTER TABLE cart_items ADD COLUMN original_price DECIMAL(10, 2);
        COMMENT ON COLUMN cart_items.original_price IS 'Prix original du produit avant réduction';
    END IF;
END $$;

-- Ajouter la colonne discount_percentage (pourcentage de réduction appliqué)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'discount_percentage'
    ) THEN
        ALTER TABLE cart_items ADD COLUMN discount_percentage DECIMAL(5, 2);
        COMMENT ON COLUMN cart_items.discount_percentage IS 'Pourcentage de réduction appliqué (ex: 15.50 pour 15.5%)';
    END IF;
END $$;

-- Ajouter la colonne has_discount (indicateur de promotion)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cart_items' AND column_name = 'has_discount'
    ) THEN
        ALTER TABLE cart_items ADD COLUMN has_discount BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN cart_items.has_discount IS 'Indique si une promotion est appliquée à cet article';
    END IF;
END $$;

-- Créer un index pour optimiser les requêtes sur les promotions dans le panier
CREATE INDEX IF NOT EXISTS idx_cart_items_has_discount 
ON cart_items (has_discount, user_id) 
WHERE has_discount = TRUE;

-- Commentaire sur l'index
COMMENT ON INDEX idx_cart_items_has_discount IS 'Index pour optimiser les requêtes sur les articles en promotion dans le panier'; 