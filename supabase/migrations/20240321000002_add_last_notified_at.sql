-- Ajouter le champ last_notified_at
ALTER TABLE public.client_chat_opened
ADD COLUMN last_notified_at TIMESTAMP WITH TIME ZONE;

-- Créer un index pour optimiser les requêtes
CREATE INDEX idx_client_chat_opened_last_notified_at 
ON public.client_chat_opened(last_notified_at); 