-- Ajout de la colonne pour suivre si le client a répondu depuis le dernier message admin
ALTER TABLE client_chat_opened
ADD COLUMN client_has_replied_since_last_admin BOOLEAN DEFAULT true;

-- Création d'un index pour optimiser les requêtes
CREATE INDEX idx_client_has_replied_since_last_admin ON client_chat_opened(client_has_replied_since_last_admin);

-- Mise à jour des entrées existantes
UPDATE client_chat_opened
SET client_has_replied_since_last_admin = true; 