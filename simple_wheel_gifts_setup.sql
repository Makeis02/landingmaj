-- ====================================================================
-- SCRIPT SQL ULTRA-SIMPLIFIÉ POUR LE SYSTÈME DE CADEAUX DE LA ROUE
-- Version sans conflit de types UUID/VARCHAR
-- ====================================================================

BEGIN;

-- ====================================================================
-- 1. CRÉATION DE LA TABLE SIMPLE
-- ====================================================================

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

-- ====================================================================
-- 2. INDEX ESSENTIELS
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_order_wheel_gifts_order_id 
ON order_wheel_gifts(order_id);

CREATE INDEX IF NOT EXISTS idx_order_wheel_gifts_won_at 
ON order_wheel_gifts(won_at DESC);

-- ====================================================================
-- 3. ACTIVATION DU RLS AVEC POLITIQUES ULTRA-PERMISSIVES
-- ====================================================================

ALTER TABLE order_wheel_gifts ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes politiques
DROP POLICY IF EXISTS "order_wheel_gifts_select" ON order_wheel_gifts;
DROP POLICY IF EXISTS "order_wheel_gifts_insert" ON order_wheel_gifts;
DROP POLICY IF EXISTS "order_wheel_gifts_update" ON order_wheel_gifts;
DROP POLICY IF EXISTS "order_wheel_gifts_delete" ON order_wheel_gifts;

-- Politique ULTRA-PERMISSIVE pour la lecture (tout utilisateur authentifié)
CREATE POLICY "order_wheel_gifts_select" ON order_wheel_gifts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politique ULTRA-PERMISSIVE pour l'insertion (tout utilisateur authentifié)  
CREATE POLICY "order_wheel_gifts_insert" ON order_wheel_gifts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Politique ULTRA-PERMISSIVE pour la mise à jour (tout utilisateur authentifié)
CREATE POLICY "order_wheel_gifts_update" ON order_wheel_gifts
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Politique ULTRA-PERMISSIVE pour la suppression (tout utilisateur authentifié)
CREATE POLICY "order_wheel_gifts_delete" ON order_wheel_gifts
  FOR DELETE USING (auth.role() = 'authenticated');

-- ====================================================================
-- 4. FONCTION DE TEST SIMPLE
-- ====================================================================

CREATE OR REPLACE FUNCTION test_wheel_gifts_simple()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_wheel_gifts') 
    THEN '✅ Table order_wheel_gifts créée avec succès !'
    ELSE '❌ Erreur: Table non créée'
  END;
$$;

COMMIT;

-- ====================================================================
-- TEST DE VALIDATION
-- ====================================================================

SELECT test_wheel_gifts_simple() as status;

-- Test d'insertion simple (si vous voulez tester)
-- INSERT INTO order_wheel_gifts (order_id, title, image_url, segment_position) 
-- VALUES ('test123', 'Test Cadeau', 'https://exemple.com/test.jpg', 0); 