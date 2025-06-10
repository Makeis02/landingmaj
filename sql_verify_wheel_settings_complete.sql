-- Script complet pour vérifier et ajouter toutes les colonnes nécessaires à wheel_settings
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier la structure actuelle de la table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'wheel_settings' 
ORDER BY ordinal_position;

-- 2. Ajouter toutes les colonnes manquantes si elles n'existent pas

-- Colonne pour le titre
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Roue Aquatique';

-- Colonne pour la description
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT 'Plongez dans l''aventure et gagnez des cadeaux aquatiques !';

-- Colonne pour activer/désactiver la roue
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;

-- Colonne pour le délai avant affichage automatique
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS auto_show_delay INTEGER DEFAULT 5;

-- Colonne pour les pages où afficher la roue
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS show_on_pages TEXT DEFAULT '/';

-- Colonne pour la condition d'affichage (panier)
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS show_when_cart TEXT DEFAULT 'any';

-- Colonne pour le ciblage des utilisateurs
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS show_to TEXT DEFAULT 'all';

-- Colonne pour le délai entre participations (en heures)
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS participation_delay INTEGER DEFAULT 72;

-- Colonne pour la fréquence de participation
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS participation_frequency TEXT DEFAULT 'per_3days';

-- Colonne pour le texte du bouton flottant
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS floating_button_text TEXT DEFAULT 'Tentez votre chance !';

-- Colonne pour la position du bouton flottant
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS floating_button_position TEXT DEFAULT 'bottom_right';

-- Colonne pour le cooldown anti-spam
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS popup_seen_cooldown INTEGER DEFAULT 1;

-- 🆕 Nouvelles colonnes ajoutées récemment

-- Colonne pour l'affichage automatique du popup
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS auto_show_popup BOOLEAN DEFAULT true;

-- Colonne pour activer le déclenchement au scroll
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS scroll_trigger_enabled BOOLEAN DEFAULT false;

-- Colonne pour le pourcentage de scroll de déclenchement
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS scroll_trigger_percentage INTEGER DEFAULT 50 CHECK (scroll_trigger_percentage >= 10 AND scroll_trigger_percentage <= 90);

-- Colonne pour tracking des mises à jour
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Mettre à jour les enregistrements existants avec les valeurs par défaut
UPDATE wheel_settings 
SET 
  title = COALESCE(title, 'Roue Aquatique'),
  description = COALESCE(description, 'Plongez dans l''aventure et gagnez des cadeaux aquatiques !'),
  is_enabled = COALESCE(is_enabled, true),
  auto_show_delay = COALESCE(auto_show_delay, 5),
  show_on_pages = COALESCE(show_on_pages, '/'),
  show_when_cart = COALESCE(show_when_cart, 'any'),
  show_to = COALESCE(show_to, 'all'),
  participation_delay = COALESCE(participation_delay, 72),
  participation_frequency = COALESCE(participation_frequency, 'per_3days'),
  floating_button_text = COALESCE(floating_button_text, 'Tentez votre chance !'),
  floating_button_position = COALESCE(floating_button_position, 'bottom_right'),
  popup_seen_cooldown = COALESCE(popup_seen_cooldown, 1),
  auto_show_popup = COALESCE(auto_show_popup, true),
  scroll_trigger_enabled = COALESCE(scroll_trigger_enabled, false),
  scroll_trigger_percentage = COALESCE(scroll_trigger_percentage, 50),
  updated_at = NOW()
WHERE title IS NULL 
   OR description IS NULL 
   OR is_enabled IS NULL 
   OR auto_show_delay IS NULL
   OR show_on_pages IS NULL
   OR show_when_cart IS NULL
   OR show_to IS NULL
   OR participation_delay IS NULL
   OR participation_frequency IS NULL
   OR floating_button_text IS NULL
   OR floating_button_position IS NULL
   OR popup_seen_cooldown IS NULL
   OR auto_show_popup IS NULL
   OR scroll_trigger_enabled IS NULL
   OR scroll_trigger_percentage IS NULL;

-- 4. Créer un enregistrement par défaut si la table est vide
INSERT INTO wheel_settings (
  title, 
  description, 
  is_enabled, 
  auto_show_delay, 
  show_on_pages, 
  show_when_cart, 
  show_to, 
  participation_delay, 
  participation_frequency, 
  floating_button_text, 
  floating_button_position, 
  popup_seen_cooldown,
  auto_show_popup,
  scroll_trigger_enabled,
  scroll_trigger_percentage,
  updated_at
)
SELECT 
  'Roue Aquatique',
  'Plongez dans l''aventure et gagnez des cadeaux aquatiques !',
  true,
  5,
  '/',
  'any',
  'all',
  72,
  'per_3days',
  'Tentez votre chance !',
  'bottom_right',
  1,
  true,
  false,
  50,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM wheel_settings);

-- 5. Vérifier la structure finale
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'wheel_settings' 
ORDER BY ordinal_position;

-- 6. Afficher le contenu de la table
SELECT * FROM wheel_settings; 