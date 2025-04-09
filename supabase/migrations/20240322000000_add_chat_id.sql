-- Ajout du champ chat_id à client_chat_opened
ALTER TABLE public.client_chat_opened
ADD COLUMN chat_id TEXT;

-- Ajout du champ chat_id à chatbot_messages
ALTER TABLE public.chatbot_messages
ADD COLUMN chat_id TEXT;

-- Ajout du champ chat_id à admin_chat_opened
ALTER TABLE public.admin_chat_opened
ADD COLUMN chat_id TEXT;

-- Création des index pour optimiser les requêtes
CREATE INDEX idx_client_chat_opened_chat_id ON public.client_chat_opened(chat_id);
CREATE INDEX idx_chatbot_messages_chat_id ON public.chatbot_messages(chat_id);
CREATE INDEX idx_admin_chat_opened_chat_id ON public.admin_chat_opened(chat_id);

-- Mise à jour des contraintes d'unicité
ALTER TABLE public.client_chat_opened
ADD CONSTRAINT client_chat_opened_chat_id_unique UNIQUE (chat_id);

-- Mise à jour des politiques RLS pour prendre en compte le chat_id
CREATE POLICY "Allow users to read their own chat messages"
    ON public.chatbot_messages
    FOR SELECT
    TO public
    USING (
        chat_id IN (
            SELECT chat_id 
            FROM public.client_chat_opened 
            WHERE user_email = current_user
        )
    );

CREATE POLICY "Allow users to insert their own chat messages"
    ON public.chatbot_messages
    FOR INSERT
    TO public
    WITH CHECK (
        chat_id IN (
            SELECT chat_id 
            FROM public.client_chat_opened 
            WHERE user_email = current_user
        )
    );

-- Mise à jour des politiques pour admin_chat_opened
CREATE POLICY "Allow admins to read chat sessions"
    ON public.admin_chat_opened
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow admins to insert chat sessions"
    ON public.admin_chat_opened
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow admins to delete chat sessions"
    ON public.admin_chat_opened
    FOR DELETE
    TO authenticated
    USING (true); 