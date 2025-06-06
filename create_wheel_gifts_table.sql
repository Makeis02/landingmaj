-- Script SQL pour créer la table des cadeaux de la roue
-- Lancer cette commande dans l'interface SQL de Supabase

-- Table pour les cadeaux de la roue dans les commandes
CREATE TABLE IF NOT EXISTS order_wheel_gifts (
  id BIGSERIAL PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL,
  gift_type VARCHAR(50) DEFAULT 'wheel_gift',
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  won_at TIMESTAMPTZ DEFAULT NOW(),
  segment_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_order_wheel_gifts_order_id ON order_wheel_gifts(order_id);

-- RLS pour sécurité
ALTER TABLE order_wheel_gifts ENABLE ROW LEVEL SECURITY;

-- Politique pour lecture (clients peuvent voir leurs cadeaux, admins tout)
CREATE POLICY "order_wheel_gifts_select" ON order_wheel_gifts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_wheel_gifts.order_id 
      AND (orders.user_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin'))
    )
  );

-- Politique pour insertion (lors du checkout)
CREATE POLICY "order_wheel_gifts_insert" ON order_wheel_gifts
  FOR INSERT WITH CHECK (true);

-- Politique pour mise à jour/suppression (admins seulement)
CREATE POLICY "order_wheel_gifts_admin_only" ON order_wheel_gifts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.raw_user_meta_data->>'role' = 'admin')
  );

-- Suppression des anciens champs Shopify gift dans order_items (si ils existent)
-- ALTER TABLE order_items DROP COLUMN IF EXISTS is_gift;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS gift_type;
-- ALTER TABLE order_items DROP COLUMN IF EXISTS gift_note;

COMMIT; 