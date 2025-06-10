-- 🔐 VÉRIFICATION PERMISSIONS RLS - Tables wheel
-- Exécuter ce script dans l'éditeur SQL de Supabase

-- 1. Vérifier le statut RLS des tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasrls as has_rls_policies
FROM pg_tables 
WHERE tablename IN ('wheel_spins', 'wheel_email_entries');

-- 2. Vérifier les politiques RLS existantes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('wheel_spins', 'wheel_email_entries');

-- 3. Test de requête simple (comme fait le client)
-- Ceci devrait marcher si les permissions sont OK
SELECT 'TEST_SIMPLE_WHEEL_SPINS' as test, count(*) as total
FROM wheel_spins 
WHERE user_email = 'smn02300@gmail.com';

SELECT 'TEST_SIMPLE_WHEEL_EMAIL_ENTRIES' as test, count(*) as total  
FROM wheel_email_entries
WHERE email = 'smn02300@gmail.com';

-- 4. Test avec la requête exacte du client
SELECT 'TEST_CLIENT_EXACT_QUERY' as test, user_id, created_at, user_email
FROM wheel_spins
WHERE user_email = 'smn02300@gmail.com'
ORDER BY created_at DESC
LIMIT 1;

-- 5. Vérifier le rôle actuel et les permissions
SELECT 
    'CURRENT_ROLE' as info,
    current_user as role_name,
    session_user as session_role; 