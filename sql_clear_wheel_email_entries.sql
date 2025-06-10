-- Supprimer tout le contenu de la table wheel_email_entries
DELETE FROM public.wheel_email_entries;

-- Optionnel : Remettre à zéro l'auto-increment si nécessaire
-- (pas nécessaire avec les UUID, mais au cas où)
-- ALTER SEQUENCE wheel_email_entries_id_seq RESTART WITH 1; 