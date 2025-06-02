-- Migration pour ajouter la colonne 'active' à la table product_prices
-- Cette colonne permet de gérer l'état actif/inactif des promotions

-- Ajouter la colonne active avec valeur par défaut true
ALTER TABLE product_prices 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Mettre à jour tous les enregistrements existants pour qu'ils soient actifs
UPDATE product_prices 
SET active = true 
WHERE active IS NULL;

-- Créer un index pour optimiser les requêtes sur les promotions actives
CREATE INDEX IF NOT EXISTS idx_product_prices_active_discount 
ON product_prices (product_id, is_discount, active) 
WHERE is_discount = true AND active = true;

-- Commentaire pour documenter la table
COMMENT ON COLUMN product_prices.active IS 'Indique si ce prix est actuellement actif (true) ou désactivé (false). Utilisé principalement pour gérer les promotions.'; 