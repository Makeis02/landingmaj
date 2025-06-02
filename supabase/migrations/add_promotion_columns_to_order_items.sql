-- Migration pour ajouter les colonnes de promotion à la table order_items
-- Ces colonnes permettent de stocker les informations sur les réductions appliquées lors de la commande

-- Ajouter la colonne original_price (prix original avant réduction)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'original_price'
    ) THEN
        ALTER TABLE order_items ADD COLUMN original_price DECIMAL(10, 2);
        COMMENT ON COLUMN order_items.original_price IS 'Prix original du produit avant réduction';
    END IF;
END $$;

-- Ajouter la colonne discount_percentage (pourcentage de réduction appliqué)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'discount_percentage'
    ) THEN
        ALTER TABLE order_items ADD COLUMN discount_percentage DECIMAL(5, 2);
        COMMENT ON COLUMN order_items.discount_percentage IS 'Pourcentage de réduction appliqué (ex: 15.50 pour 15.5%)';
    END IF;
END $$;

-- Ajouter la colonne has_discount (indicateur de promotion)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'has_discount'
    ) THEN
        ALTER TABLE order_items ADD COLUMN has_discount BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN order_items.has_discount IS 'Indique si une promotion était appliquée lors de l''achat';
    END IF;
END $$;

-- Créer un index pour optimiser les requêtes sur les promotions
CREATE INDEX IF NOT EXISTS idx_order_items_has_discount 
ON order_items (has_discount) 
WHERE has_discount = TRUE;

-- Commentaire sur l'index
COMMENT ON INDEX idx_order_items_has_discount IS 'Index pour optimiser les requêtes sur les commandes avec promotions'; 