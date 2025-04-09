-- Créer la fonction trigger
CREATE OR REPLACE FUNCTION public.handle_admin_reply()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si c'est un message admin
  IF NEW.sender = 'admin' THEN
    -- Appeler la fonction Edge
    PERFORM net.http_post(
      url := current_setting('app.settings.edge_function_url') || '/notify_user_on_admin_reply',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS on_admin_reply ON public.chatbot_messages;
CREATE TRIGGER on_admin_reply
  AFTER INSERT ON public.chatbot_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_reply(); 