-- Script pour ajouter les nouvelles colonnes à la table wheel_settings
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter la colonne auto_show_popup (affichage automatique du popup)
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS auto_show_popup BOOLEAN DEFAULT true;

-- Ajouter la colonne scroll_trigger_enabled (déclenchement au scroll)
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS scroll_trigger_enabled BOOLEAN DEFAULT false;

-- Ajouter la colonne scroll_trigger_percentage (pourcentage de scroll pour déclenchement)
ALTER TABLE wheel_settings 
ADD COLUMN IF NOT EXISTS scroll_trigger_percentage INTEGER DEFAULT 50 CHECK (scroll_trigger_percentage >= 10 AND scroll_trigger_percentage <= 90);

-- Mettre à jour les enregistrements existants avec les valeurs par défaut
UPDATE wheel_settings 
SET 
  auto_show_popup = COALESCE(auto_show_popup, true),
  scroll_trigger_enabled = COALESCE(scroll_trigger_enabled, false),
  scroll_trigger_percentage = COALESCE(scroll_trigger_percentage, 50),
  updated_at = NOW()
WHERE auto_show_popup IS NULL 
   OR scroll_trigger_enabled IS NULL 
   OR scroll_trigger_percentage IS NULL;

-- Vérifier la structure de la table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'wheel_settings' 
ORDER BY ordinal_position; 