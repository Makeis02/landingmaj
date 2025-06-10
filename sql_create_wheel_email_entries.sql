-- Création de la table wheel_email_entries pour gérer les limitations par email
-- Cette table enregistre chaque tentative à la roue pour appliquer le cooldown

CREATE TABLE IF NOT EXISTS public.wheel_email_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    browser_fingerprint VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes fréquentes
CREATE INDEX idx_wheel_email_entries_email ON public.wheel_email_entries(email);
CREATE INDEX idx_wheel_email_entries_created_at ON public.wheel_email_entries(created_at);
CREATE INDEX idx_wheel_email_entries_email_created_at ON public.wheel_email_entries(email, created_at);

-- Politique de sécurité (RLS)
ALTER TABLE public.wheel_email_entries ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture et l'insertion (nécessaire pour le système de limitation)
CREATE POLICY "Permettre lecture wheel_email_entries" ON public.wheel_email_entries
    FOR SELECT USING (true);

CREATE POLICY "Permettre insertion wheel_email_entries" ON public.wheel_email_entries
    FOR INSERT WITH CHECK (true);

-- Politique pour la mise à jour (au cas où)
CREATE POLICY "Permettre mise à jour wheel_email_entries" ON public.wheel_email_entries
    FOR UPDATE USING (true);

-- Commentaires pour documenter la table
COMMENT ON TABLE public.wheel_email_entries IS 'Table pour gérer les limitations de participation à la roue par email';
COMMENT ON COLUMN public.wheel_email_entries.email IS 'Email de l''utilisateur qui a participé';
COMMENT ON COLUMN public.wheel_email_entries.user_id IS 'ID utilisateur si connecté, NULL si invité';
COMMENT ON COLUMN public.wheel_email_entries.ip_address IS 'Adresse IP pour anti-contournement';
COMMENT ON COLUMN public.wheel_email_entries.browser_fingerprint IS 'Empreinte navigateur pour anti-contournement';
COMMENT ON COLUMN public.wheel_email_entries.created_at IS 'Horodatage de la participation'; 