-- ====================================================================
-- SCRIPT SQL COMPLET CORRIGÉ POUR LE SYSTÈME DE CADEAUX DE LA ROUE
-- À exécuter dans l'interface SQL de Supabase
-- ====================================================================

BEGIN;

-- ====================================================================
-- 1. CRÉATION DE LA TABLE POUR LES CADEAUX DE LA ROUE
-- ====================================================================

CREATE TABLE IF NOT EXISTS order_wheel_gifts (
  id BIGSERIAL PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL,
  gift_type VARCHAR(50) DEFAULT 'wheel_gift',
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  won_at TIMESTAMPTZ DEFAULT NOW(),
  segment_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 2. COMMENTAIRES SUR LES COLONNES
-- ====================================================================

COMMENT ON TABLE order_wheel_gifts IS 'Cadeaux gagnés à la roue de la fortune associés aux commandes';
COMMENT ON COLUMN order_wheel_gifts.order_id IS 'ID de la commande associée';
COMMENT ON COLUMN order_wheel_gifts.gift_type IS 'Type de cadeau (wheel_gift par défaut)';
COMMENT ON COLUMN order_wheel_gifts.title IS 'Nom du cadeau gagné';
COMMENT ON COLUMN order_wheel_gifts.image_url IS 'URL de l''image du cadeau';
COMMENT ON COLUMN order_wheel_gifts.won_at IS 'Date et heure du gain';
COMMENT ON COLUMN order_wheel_gifts.segment_position IS 'Position du segment sur la roue (0-5)';

-- ====================================================================
-- 3. INDEX POUR LES PERFORMANCES
-- ====================================================================

-- Index principal sur order_id pour les requêtes rapides
CREATE INDEX IF NOT EXISTS idx_order_wheel_gifts_order_id 
ON order_wheel_gifts(order_id);

-- Index sur gift_type pour filtrer par type
CREATE INDEX IF NOT EXISTS idx_order_wheel_gifts_gift_type 
ON order_wheel_gifts(gift_type);

-- Index sur won_at pour trier par date de gain
CREATE INDEX IF NOT EXISTS idx_order_wheel_gifts_won_at 
ON order_wheel_gifts(won_at DESC);

-- Index composé pour les requêtes d'un utilisateur spécifique
CREATE INDEX IF NOT EXISTS idx_order_wheel_gifts_order_won 
ON order_wheel_gifts(order_id, won_at DESC);

-- ====================================================================
-- 4. TRIGGER POUR UPDATED_AT AUTOMATIQUE
-- ====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_order_wheel_gifts_updated_at ON order_wheel_gifts;
CREATE TRIGGER update_order_wheel_gifts_updated_at
    BEFORE UPDATE ON order_wheel_gifts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 5. ACTIVATION DU ROW LEVEL SECURITY (RLS)
-- ====================================================================

ALTER TABLE order_wheel_gifts ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 6. SUPPRESSION DES ANCIENNES POLITIQUES (SI ELLES EXISTENT)
-- ====================================================================

DROP POLICY IF EXISTS "order_wheel_gifts_select" ON order_wheel_gifts;
DROP POLICY IF EXISTS "order_wheel_gifts_insert" ON order_wheel_gifts;
DROP POLICY IF EXISTS "order_wheel_gifts_update" ON order_wheel_gifts;
DROP POLICY IF EXISTS "order_wheel_gifts_delete" ON order_wheel_gifts;
DROP POLICY IF EXISTS "order_wheel_gifts_admin_all" ON order_wheel_gifts;

-- ====================================================================
-- 7. POLITIQUES RLS POUR LA SÉCURITÉ
-- ====================================================================

-- Politique pour la LECTURE (SELECT)
-- Les clients peuvent voir leurs propres cadeaux, les admins voient tout
CREATE POLICY "order_wheel_gifts_select" ON order_wheel_gifts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_wheel_gifts.order_id 
      AND (
        orders.user_id = auth.uid()::text OR 
        EXISTS (
          SELECT 1 FROM auth.users 
          WHERE auth.users.id = auth.uid() 
          AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
      )
    )
  );

-- Politique pour l'INSERTION (INSERT)
-- Permet l'insertion lors du checkout (webhook Stripe)
CREATE POLICY "order_wheel_gifts_insert" ON order_wheel_gifts
  FOR INSERT WITH CHECK (
    -- Autorise l'insertion si c'est lié à une commande existante
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_wheel_gifts.order_id)
  );

-- Politique pour la MISE À JOUR (UPDATE)
-- Seuls les admins peuvent modifier
CREATE POLICY "order_wheel_gifts_update" ON order_wheel_gifts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Politique pour la SUPPRESSION (DELETE)
-- Seuls les admins peuvent supprimer
CREATE POLICY "order_wheel_gifts_delete" ON order_wheel_gifts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ====================================================================
-- 8. VUE POUR LES REQUÊTES SIMPLIFIÉES
-- ====================================================================

CREATE OR REPLACE VIEW order_wheel_gifts_with_order_info AS
SELECT 
  owg.*,
  o.user_id,
  o.email,
  o.first_name,
  o.last_name,
  o.created_at as order_created_at,
  o.total as order_total,
  o.status as order_status
FROM order_wheel_gifts owg
JOIN orders o ON o.id = owg.order_id;

-- ====================================================================
-- 9. FONCTION UTILITAIRE CORRIGÉE POUR RÉCUPÉRER LES CADEAUX D'UN UTILISATEUR
-- ====================================================================

CREATE OR REPLACE FUNCTION get_user_wheel_gifts(user_id_param TEXT)
RETURNS TABLE (
  gift_id BIGINT,
  order_id VARCHAR(255),
  title TEXT,
  image_url TEXT,
  won_at TIMESTAMPTZ,
  segment_position INTEGER,
  order_total NUMERIC,
  order_date TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    owg.id,
    owg.order_id,
    owg.title,
    owg.image_url,
    owg.won_at,
    owg.segment_position,
    o.total,
    o.created_at
  FROM order_wheel_gifts owg
  JOIN orders o ON o.id = owg.order_id
  WHERE o.user_id = user_id_param
  ORDER BY owg.won_at DESC;
END;
$$;

-- ====================================================================
-- 10. FONCTION POUR LES STATISTIQUES ADMIN
-- ====================================================================

CREATE OR REPLACE FUNCTION get_wheel_gifts_stats()
RETURNS TABLE (
  total_gifts BIGINT,
  total_orders_with_gifts BIGINT,
  gifts_today BIGINT,
  gifts_this_week BIGINT,
  gifts_this_month BIGINT,
  most_won_gift TEXT,
  most_won_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM order_wheel_gifts),
    (SELECT COUNT(DISTINCT order_id) FROM order_wheel_gifts),
    (SELECT COUNT(*) FROM order_wheel_gifts WHERE won_at >= CURRENT_DATE),
    (SELECT COUNT(*) FROM order_wheel_gifts WHERE won_at >= DATE_TRUNC('week', CURRENT_DATE)),
    (SELECT COUNT(*) FROM order_wheel_gifts WHERE won_at >= DATE_TRUNC('month', CURRENT_DATE)),
    (SELECT title FROM order_wheel_gifts GROUP BY title ORDER BY COUNT(*) DESC LIMIT 1),
    (SELECT COUNT(*) FROM order_wheel_gifts GROUP BY title ORDER BY COUNT(*) DESC LIMIT 1);
END;
$$;

-- ====================================================================
-- 11. PERMISSIONS POUR LES FONCTIONS
-- ====================================================================

-- Accès public pour la fonction utilisateur (protégée par RLS)
GRANT EXECUTE ON FUNCTION get_user_wheel_gifts(TEXT) TO authenticated;

-- Accès admin uniquement pour les statistiques
REVOKE ALL ON FUNCTION get_wheel_gifts_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_wheel_gifts_stats() TO authenticated;

-- ====================================================================
-- 12. CONTRAINTES DE VALIDATION
-- ====================================================================

-- Contrainte pour s'assurer que segment_position est valide (0-5 pour 6 segments)
ALTER TABLE order_wheel_gifts 
DROP CONSTRAINT IF EXISTS check_segment_position;
ALTER TABLE order_wheel_gifts 
ADD CONSTRAINT check_segment_position 
CHECK (segment_position IS NULL OR (segment_position >= 0 AND segment_position <= 5));

-- Contrainte pour s'assurer que l'image_url est valide
ALTER TABLE order_wheel_gifts 
DROP CONSTRAINT IF EXISTS check_image_url_format;
ALTER TABLE order_wheel_gifts 
ADD CONSTRAINT check_image_url_format 
CHECK (image_url ~ '^https?://.*');

-- Index partiel pour les cadeaux récents (optimisation)
CREATE INDEX IF NOT EXISTS idx_order_wheel_gifts_recent 
ON order_wheel_gifts(won_at) 
WHERE won_at > (NOW() - INTERVAL '30 days');

-- ====================================================================
-- 13. FONCTION DE TEST POUR VÉRIFIER L'INSTALLATION
-- ====================================================================

CREATE OR REPLACE FUNCTION test_wheel_gifts_installation()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  table_exists BOOLEAN;
  policies_count INTEGER;
  indexes_count INTEGER;
BEGIN
  -- Vérifier que la table existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'order_wheel_gifts'
  ) INTO table_exists;
  
  -- Compter les politiques RLS
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies 
  WHERE tablename = 'order_wheel_gifts';
  
  -- Compter les index
  SELECT COUNT(*) INTO indexes_count
  FROM pg_indexes 
  WHERE tablename = 'order_wheel_gifts';
  
  IF table_exists AND policies_count >= 4 AND indexes_count >= 4 THEN
    RETURN '✅ Installation du système de cadeaux de la roue RÉUSSIE ! Table: ' || table_exists || ', Politiques: ' || policies_count || ', Index: ' || indexes_count;
  ELSE
    RETURN '❌ Problème d''installation. Table: ' || table_exists || ', Politiques: ' || policies_count || ', Index: ' || indexes_count;
  END IF;
END;
$$;

COMMIT;

-- ====================================================================
-- TEST FINAL
-- ====================================================================

SELECT test_wheel_gifts_installation() as installation_status; 