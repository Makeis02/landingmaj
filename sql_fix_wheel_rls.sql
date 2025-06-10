-- 🔧 CORRECTION PERMISSIONS RLS - Tables wheel
-- Exécuter ce script dans l'éditeur SQL de Supabase

-- 1. Vérifier l'état actuel des permissions
SELECT 'AVANT_CORRECTION' as status, tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('wheel_spins', 'wheel_email_entries');

-- 2. Supprimer les politiques RLS restrictives existantes (si elles existent)
DROP POLICY IF EXISTS "wheel_spins_policy" ON wheel_spins;
DROP POLICY IF EXISTS "wheel_email_entries_policy" ON wheel_email_entries;

-- 3. Créer des politiques RLS permissives pour la lecture
-- Politique pour wheel_spins : lecture libre
CREATE POLICY "wheel_spins_read_policy" ON wheel_spins
    FOR SELECT
    USING (true);

-- Politique pour wheel_email_entries : lecture libre  
CREATE POLICY "wheel_email_entries_read_policy" ON wheel_email_entries
    FOR SELECT
    USING (true);

-- Politique pour wheel_spins : insertion libre
CREATE POLICY "wheel_spins_insert_policy" ON wheel_spins
    FOR INSERT
    WITH CHECK (true);

-- Politique pour wheel_email_entries : insertion libre
CREATE POLICY "wheel_email_entries_insert_policy" ON wheel_email_entries
    FOR INSERT
    WITH CHECK (true);

-- 4. S'assurer que RLS est activé sur les tables
ALTER TABLE wheel_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE wheel_email_entries ENABLE ROW LEVEL SECURITY;

-- 5. Test immédiat des permissions
SELECT 'TEST_APRES_CORRECTION_WHEEL_SPINS' as test, count(*) as total
FROM wheel_spins 
WHERE user_email = 'smn02300@gmail.com';

SELECT 'TEST_APRES_CORRECTION_WHEEL_EMAIL_ENTRIES' as test, count(*) as total
FROM wheel_email_entries
WHERE email = 'smn02300@gmail.com';

-- 6. Vérifier que les nouvelles politiques sont en place
SELECT 'APRES_CORRECTION' as status, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('wheel_spins', 'wheel_email_entries')
ORDER BY tablename, policyname; 