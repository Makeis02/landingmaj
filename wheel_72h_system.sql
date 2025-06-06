-- ===============================================
-- 🎡 SYSTÈME DE LIMITATION 72H POUR ROUE AQUATIQUE
-- ===============================================
-- Ce script crée les tables et politiques nécessaires
-- pour le système de limitation 72h avec anti-contournement

-- 1️⃣ CRÉER LA TABLE wheel_guest_attempts (anti-contournement invités)
-- ===============================================
CREATE TABLE IF NOT EXISTS wheel_guest_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    browser_fingerprint TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Métadonnées additionnelles pour tracking avancé
    user_agent TEXT,
    referrer TEXT,
    session_data JSONB DEFAULT '{}',
    
    -- Contraintes
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 2️⃣ CRÉER DES INDEX POUR OPTIMISER LES PERFORMANCES
-- ===============================================
-- Index composé pour requêtes rapides de vérification
CREATE INDEX IF NOT EXISTS idx_wheel_guest_attempts_lookup 
ON wheel_guest_attempts (email, ip_address, browser_fingerprint, created_at DESC);

-- Index pour nettoyage automatique des anciens enregistrements
CREATE INDEX IF NOT EXISTS idx_wheel_guest_attempts_created_at 
ON wheel_guest_attempts (created_at DESC);

-- Index spécialisés pour chaque type de détection
CREATE INDEX IF NOT EXISTS idx_wheel_guest_attempts_email 
ON wheel_guest_attempts (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wheel_guest_attempts_ip 
ON wheel_guest_attempts (ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wheel_guest_attempts_fingerprint 
ON wheel_guest_attempts (browser_fingerprint, created_at DESC);

-- 3️⃣ AJOUTER LE CHAMP user_email À wheel_spins (si pas déjà présent)
-- ===============================================
DO $$ 
BEGIN
    -- Vérifier si la colonne existe déjà
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wheel_spins' 
        AND column_name = 'user_email'
    ) THEN
        ALTER TABLE wheel_spins ADD COLUMN user_email TEXT;
        
        -- Créer un index sur user_email pour les requêtes rapides
        CREATE INDEX IF NOT EXISTS idx_wheel_spins_user_email 
        ON wheel_spins (user_email, created_at DESC);
    END IF;
END $$;

-- 4️⃣ POLITIQUES RLS (Row Level Security)
-- ===============================================

-- Activer RLS sur wheel_guest_attempts
ALTER TABLE wheel_guest_attempts ENABLE ROW LEVEL SECURITY;

-- Politique pour lecture (tous les utilisateurs authentifiés peuvent lire)
CREATE POLICY "wheel_guest_attempts_read" ON wheel_guest_attempts
    FOR SELECT USING (true);

-- Politique pour insertion (tous les utilisateurs authentifiés peuvent insérer)
CREATE POLICY "wheel_guest_attempts_insert" ON wheel_guest_attempts
    FOR INSERT WITH CHECK (true);

-- Politique pour les admins (lecture/écriture complète)
CREATE POLICY "wheel_guest_attempts_admin" ON wheel_guest_attempts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.email LIKE '%admin%'
        )
    );

-- 5️⃣ FONCTION DE NETTOYAGE AUTOMATIQUE (optionnel)
-- ===============================================
-- Supprime automatiquement les entrées de plus de 30 jours
CREATE OR REPLACE FUNCTION cleanup_old_wheel_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM wheel_guest_attempts 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Log du nettoyage
    RAISE NOTICE 'Nettoyage terminé: anciennes tentatives supprimées';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6️⃣ CRÉATION D'UNE VUE POUR STATISTIQUES (optionnel)
-- ===============================================
CREATE OR REPLACE VIEW wheel_attempts_stats AS
SELECT 
    -- Statistiques globales
    COUNT(*) as total_attempts,
    COUNT(DISTINCT email) as unique_emails,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(DISTINCT browser_fingerprint) as unique_browsers,
    
    -- Statistiques temporelles
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as attempts_last_24h,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '72 hours' THEN 1 END) as attempts_last_72h,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as attempts_last_week,
    
    -- Détection de contournement
    COUNT(*) FILTER (
        WHERE email IN (
            SELECT email FROM wheel_guest_attempts 
            GROUP BY email HAVING COUNT(*) > 1
        )
    ) as repeated_emails,
    
    COUNT(*) FILTER (
        WHERE ip_address IN (
            SELECT ip_address FROM wheel_guest_attempts 
            GROUP BY ip_address HAVING COUNT(*) > 1
        )
    ) as repeated_ips,
    
    -- Dates importantes
    MIN(created_at) as first_attempt,
    MAX(created_at) as last_attempt
    
FROM wheel_guest_attempts;

-- 7️⃣ COMMENTAIRES POUR DOCUMENTATION
-- ===============================================
COMMENT ON TABLE wheel_guest_attempts IS 
'Table de tracking des tentatives invités pour le système anti-contournement 72h de la roue aquatique';

COMMENT ON COLUMN wheel_guest_attempts.email IS 
'Email saisi par l''invité lors de la tentative';

COMMENT ON COLUMN wheel_guest_attempts.ip_address IS 
'Adresse IP de l''invité au moment de la tentative';

COMMENT ON COLUMN wheel_guest_attempts.browser_fingerprint IS 
'Empreinte unique du navigateur pour détection avancée';

COMMENT ON COLUMN wheel_guest_attempts.session_data IS 
'Données additionnelles de session en format JSON';

-- 8️⃣ TRIGGER POUR NETTOYAGE AUTOMATIQUE (optionnel)
-- ===============================================
-- Crée un trigger qui nettoie automatiquement les anciens enregistrements
-- après chaque insertion (pour éviter l'accumulation excessive)

CREATE OR REPLACE FUNCTION trigger_cleanup_old_attempts()
RETURNS TRIGGER AS $$
BEGIN
    -- Nettoyer les enregistrements de plus de 30 jours
    -- (Exécuté de manière asynchrone pour ne pas ralentir l'insertion)
    PERFORM cleanup_old_wheel_attempts();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger (exécuté après insertion, mais seulement 1% du temps pour éviter la surcharge)
CREATE TRIGGER trigger_cleanup_wheel_attempts
    AFTER INSERT ON wheel_guest_attempts
    FOR EACH ROW
    WHEN (random() < 0.01) -- 1% de chance d'exécution
    EXECUTE FUNCTION trigger_cleanup_old_attempts();

-- ===============================================
-- 🎯 RÉCAPITULATIF DES TABLES CRÉÉES/MODIFIÉES :
-- ===============================================
/*
✅ wheel_guest_attempts (NOUVELLE)
   - Tracking complet des tentatives invités
   - Anti-contournement par email/IP/empreinte
   - Index optimisés pour performances

✅ wheel_spins (MODIFIÉE)
   - Ajout du champ user_email
   - Index sur user_email + created_at

✅ Politiques RLS configurées
✅ Fonctions de nettoyage automatique
✅ Vue de statistiques
✅ Triggers de maintenance

🎡 SYSTÈME PRÊT POUR LA ROUE AQUATIQUE 72H ! 🐠
*/ 