-- Script pour vider la table wheel_email_entries
-- Utilisez ceci si vous voulez repartir à zéro pour les tests

DELETE FROM public.wheel_email_entries;

-- Optionnel : remettre à zéro l'auto-increment si vous voulez
-- ALTER SEQUENCE wheel_email_entries_id_seq RESTART WITH 1;

-- Vérifier que la table est vide
SELECT COUNT(*) as nombre_entrees FROM public.wheel_email_entries; 