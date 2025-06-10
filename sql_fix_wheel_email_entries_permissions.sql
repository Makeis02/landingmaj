-- Corriger les permissions de la table wheel_email_entries
-- En cas d'erreur 406, cela peut venir des politiques RLS

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Permettre lecture wheel_email_entries" ON public.wheel_email_entries;
DROP POLICY IF EXISTS "Permettre insertion wheel_email_entries" ON public.wheel_email_entries;
DROP POLICY IF EXISTS "Permettre mise à jour wheel_email_entries" ON public.wheel_email_entries;

-- Désactiver temporairement RLS pour tester
ALTER TABLE public.wheel_email_entries DISABLE ROW LEVEL SECURITY;

-- Ou si vous voulez garder RLS actif, créer des politiques plus permissives :
-- ALTER TABLE public.wheel_email_entries ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Accès complet wheel_email_entries" ON public.wheel_email_entries
--     FOR ALL USING (true) WITH CHECK (true); 