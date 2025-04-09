-- Add sender column and migrate data from 'from' column
ALTER TABLE public.chatbot_messages ADD COLUMN IF NOT EXISTS sender text;

-- Update existing records to use the new sender column
UPDATE public.chatbot_messages SET sender = "from" WHERE sender IS NULL;

-- Drop the old 'from' column
ALTER TABLE public.chatbot_messages DROP COLUMN IF EXISTS "from";

-- Add check constraint for sender values
ALTER TABLE public.chatbot_messages ADD CONSTRAINT chatbot_messages_sender_check 
    CHECK (sender IN ('user', 'admin'));

-- Make sender column NOT NULL after migration
ALTER TABLE public.chatbot_messages ALTER COLUMN sender SET NOT NULL; 