-- 🔍 SCRIPT DE DIAGNOSTIC ROUE - Email: smn02300@gmail.com
-- Exécuter ce script dans l'éditeur SQL de Supabase

-- 1. Vérifier la table wheel_spins
SELECT 'WHEEL_SPINS' as source, count(*) as total_records FROM wheel_spins;

SELECT 'WHEEL_SPINS_POUR_EMAIL' as source, * 
FROM wheel_spins 
WHERE user_email ILIKE '%smn02300@gmail.com%' 
ORDER BY created_at DESC;

-- 2. Vérifier la table wheel_email_entries  
SELECT 'WHEEL_EMAIL_ENTRIES' as source, count(*) as total_records FROM wheel_email_entries;

SELECT 'WHEEL_EMAIL_ENTRIES_POUR_EMAIL' as source, * 
FROM wheel_email_entries 
WHERE email ILIKE '%smn02300@gmail.com%' 
ORDER BY created_at DESC;

-- 3. Vérifier toutes les participations récentes (toutes tables)
SELECT 'RECENT_WHEEL_SPINS' as source, user_email, created_at, user_id
FROM wheel_spins 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

SELECT 'RECENT_WHEEL_EMAIL_ENTRIES' as source, email, created_at, user_id  
FROM wheel_email_entries 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Vérifier la structure des tables
SELECT 'WHEEL_SPINS_COLUMNS' as source, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wheel_spins';

SELECT 'WHEEL_EMAIL_ENTRIES_COLUMNS' as source, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wheel_email_entries';

-- 5. Recherche LARGE pour cet email (au cas où il y aurait des variations)
SELECT 'SEARCH_EMAIL_VARIATIONS' as source, 'wheel_spins' as table_name, user_email, created_at
FROM wheel_spins 
WHERE user_email ILIKE '%smn02%' OR user_email ILIKE '%gmail%'
ORDER BY created_at DESC;

SELECT 'SEARCH_EMAIL_VARIATIONS' as source, 'wheel_email_entries' as table_name, email, created_at
FROM wheel_email_entries 
WHERE email ILIKE '%smn02%' OR email ILIKE '%gmail%'
ORDER BY created_at DESC; 