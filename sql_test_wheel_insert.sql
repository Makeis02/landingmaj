-- 🧪 SCRIPT TEST INSERTION WHEEL - Email: smn02300@gmail.com
-- Exécuter ce script dans l'éditeur SQL de Supabase pour tester l'insertion

-- 1. Test insertion dans wheel_email_entries
INSERT INTO wheel_email_entries (
    email, 
    user_id, 
    ip_address, 
    browser_fingerprint, 
    created_at
) VALUES (
    'smn02300@gmail.com',
    NULL,
    '127.0.0.1',
    'test_fingerprint',
    NOW() - INTERVAL '1 hour'
);

-- 2. Vérifier que l'insertion a marché
SELECT 'TEST_INSERTION_WHEEL_EMAIL_ENTRIES' as source, * 
FROM wheel_email_entries 
WHERE email = 'smn02300@gmail.com'
ORDER BY created_at DESC;

-- 3. Test de la requête que fait le client (exactement la même)
SELECT 'TEST_CLIENT_QUERY' as source, created_at
FROM wheel_email_entries
WHERE email = 'smn02300@gmail.com'
  AND created_at >= (NOW() - INTERVAL '6 hours')
ORDER BY created_at DESC
LIMIT 1;

-- 4. Nettoyage (décommenter si tu veux supprimer le test)
-- DELETE FROM wheel_email_entries WHERE email = 'smn02300@gmail.com' AND ip_address = '127.0.0.1'; 