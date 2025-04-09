import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OMNISEND_API_URL = 'https://api.omnisend.com/v3'

console.log('⚡️ Fonction déclenchée');

serve(async (req) => {
  console.log('🎯 Function called');

  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('🔄 Requête OPTIONS, retour CORS');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Nouvelle requête reçue');

    // Vérification et parsing du JSON
    let body;
    try {
      body = await req.json();
      console.log('📦 Payload reçu :', JSON.stringify(body, null, 2));
    } catch (e) {
      console.error('❌ Impossible de parser le JSON:', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const OMNISEND_API_KEY = Deno.env.get('OMNISEND_API_KEY') ?? '';
    const SITE_URL = Deno.env.get('SITE_URL') ?? '';

    console.log('🔍 Vérification des variables d\'environnement :');
    console.log('SUPABASE_URL:', SUPABASE_URL || '❌ NON DÉFINIE');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ DÉFINIE' : '❌ NON DÉFINIE');
    console.log('OMNISEND_API_KEY:', OMNISEND_API_KEY ? '✅ DÉFINIE' : '❌ NON DÉFINIE');
    console.log('SITE_URL:', SITE_URL || '❌ NON DÉFINIE');

    const missingVars = [];
    if (!SUPABASE_URL) missingVars.push('SUPABASE_URL');
    if (!SUPABASE_SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!OMNISEND_API_KEY) missingVars.push('OMNISEND_API_KEY');
    if (!SITE_URL) missingVars.push('SITE_URL');

    if (missingVars.length > 0) {
      console.error('❌ Variables manquantes :', missingVars.join(', '));
      return new Response(JSON.stringify({ 
        error: 'Missing env vars',
        missing: missingVars 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Créer le client Supabase
    console.log('🔌 Création du client Supabase...');
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    console.log('✅ Client Supabase créé');

    const { record } = body
    if (!record) {
      console.warn('⚠️ Aucun record dans la requête');
      return new Response(JSON.stringify({ error: 'Missing record' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { email, chat_id, message, sender } = record;

    console.log('🧪 Validation du sender...');
    console.log('🔍 Champ "sender" reçu :', sender);
    console.log('📧 Email reçu :', email);
    console.log('💬 Message reçu :', message);

    // Vérifier que c'est un message admin
    if (sender !== 'admin') {
      console.log('🙅‍♂️ Message ignoré (non admin)');
      return new Response(
        JSON.stringify({ message: 'Not an admin message, skipping' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Message validé comme message admin');

    console.log('🔎 Vérification session client pour:', email);

    // Récupérer le statut initial du chat
    console.log('📥 Récupération du statut initial du chat...');
    const { data: chatStatus, error: chatStatusError } = await supabaseClient
      .from('client_chat_opened')
      .select('closed_at, updated_at, last_notified_at, last_admin_message_id_notified, client_has_replied_since_last_admin')
      .eq('user_email', email)
      .eq('chat_id', chat_id)
      .maybeSingle();

    if (chatStatusError) {
      console.error('❌ Erreur récupération chatStatus:', chatStatusError);
      return new Response(JSON.stringify({ error: 'Erreur lecture statut client' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!chatStatus) {
      console.error('❌ Aucune session de chat trouvée pour:', email);
      return new Response(JSON.stringify({ error: 'Session de chat non trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('📊 Statut initial du chat:', {
      closed_at: chatStatus.closed_at,
      updated_at: chatStatus.updated_at,
      last_notified_at: chatStatus.last_notified_at,
      last_admin_message_id_notified: chatStatus.last_admin_message_id_notified,
      client_has_replied_since_last_admin: chatStatus.client_has_replied_since_last_admin
    });

    // Vérifier si le client est toujours actif
    console.log('🔍 Vérification 1/4: Le client est-il toujours actif ?');
    
    // Log de l'heure serveur
    const now = new Date();
    console.log('🧾 Chat Status complet reçu du client:', chatStatus);
    console.log('🕐 Heure actuelle serveur:', now.toISOString());
    
    // Vérification de l'activité avec une marge de 60 secondes
    const updatedAt = new Date(chatStatus.updated_at);
    console.log('🕐 updated_at:', updatedAt.toISOString());
    
    const delta = now.getTime() - updatedAt.getTime();
    console.log('⏱️ delta:', delta);

    // Récupérer le statut complet incluant is_user_active
    const { data: currentStatus, error: currentStatusError } = await supabaseClient
      .from('client_chat_opened')
      .select('closed_at, updated_at, is_user_active')
      .eq('chat_id', chat_id)
      .maybeSingle();

    if (currentStatusError) {
      console.error('❌ Erreur lors de la vérification du statut actuel:', currentStatusError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la vérification du statut du chat' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Vérification de l'activité client en prenant en compte is_user_active
    const userIsActive = (!currentStatus?.closed_at && delta < 60000) || currentStatus?.is_user_active === true;
    console.log('⏱️ Comparaison activité:', {
      now: now.toISOString(),
      updatedAt: updatedAt.toISOString(),
      delta: delta,
      is_user_active: currentStatus?.is_user_active,
      isActive: userIsActive
    });

    if (userIsActive) {
      console.log('⏳ Le client est actif, démarrage des vérifications rapprochées...');
      
      // Faire 4 vérifications espacées d'une seconde
      for (let i = 1; i <= 4; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`🔄 Vérification ${i}/4 du statut du chat...`);
        const { data: updatedStatus, error: updatedStatusError } = await supabaseClient
          .from('client_chat_opened')
          .select('closed_at, updated_at, is_user_active')
          .eq('chat_id', chat_id)
          .maybeSingle();

        if (updatedStatusError) {
          console.error(`❌ Erreur lors de la vérification ${i}/4 du statut:`, updatedStatusError);
          return new Response(JSON.stringify({ error: 'Erreur lors de la vérification du statut du chat' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const newNow = new Date();
        const newUpdatedAt = new Date(updatedStatus?.updated_at);
        const newDelta = newNow.getTime() - newUpdatedAt.getTime();
        const stillActive = (!updatedStatus?.closed_at && newDelta < 60000) || updatedStatus?.is_user_active === true;

        console.log(`⏱️ Vérification ${i}/4 activité:`, {
          now: newNow.toISOString(),
          updatedAt: newUpdatedAt.toISOString(),
          delta: newDelta,
          is_user_active: updatedStatus?.is_user_active,
          isActive: stillActive
        });

        if (stillActive) {
          if (i === 4) {
            console.log('❌ Le client est resté actif pendant toutes les vérifications');
            console.log('⚠️ Envoi d\'email annulé - Raison: Client toujours actif sur la page');
            return new Response(JSON.stringify({ message: 'Le client est toujours actif sur la page' }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          console.log(`✳️ Le client est toujours actif, continuation des vérifications (${i}/4)...`);
          continue;
        }

        console.log(`✅ Le client est devenu inactif à la vérification ${i}/4`);
        break;
      }
    } else {
      console.log('✅ Le client n\'est pas actif ou a fermé le chat, on continue les vérifications');
    }
    console.log('✅ Vérification 1/4 passée: Le client n\'est plus actif');

    // Vérification 2/4 : Y a-t-il au moins 10 messages admin depuis la dernière notification ?
    console.log('🔍 Vérification 2/4: Nombre de messages admin depuis la dernière notification...');
    
    // Déterminer à partir de quand on compte les messages admin
    let adminMessageStartTime = '1970-01-01T00:00:00Z';

    // VÉRIFICATION DIRECTE : rechercher le dernier message client
    console.log('🔍 Vérification directe du dernier message client...');
    const { data: lastUserMessage, error: lastUserMessageError } = await supabaseClient
      .from('chatbot_messages')
      .select('timestamp')
      .eq('chat_id', chat_id)
      .eq('sender', 'user')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Vérifier s'il y a un message client et s'il est plus récent que le dernier message admin notifié
    let clientHasRepliedSinceLastAdmin = false;
    
    if (lastUserMessageError) {
      console.error('❌ Erreur lors de la vérification du dernier message client:', lastUserMessageError);
    } else if (lastUserMessage?.timestamp) {
      const lastUserTimestamp = new Date(lastUserMessage.timestamp).getTime();
      const lastNotifiedTimestamp = chatStatus.last_notified_at ? new Date(chatStatus.last_notified_at).getTime() : 0;
      
      clientHasRepliedSinceLastAdmin = lastUserTimestamp > lastNotifiedTimestamp;
      console.log('📊 Comparaison timestamps:', {
        lastUserMessage: lastUserMessage.timestamp,
        lastNotifiedAt: chatStatus.last_notified_at,
        clientHasReplied: clientHasRepliedSinceLastAdmin,
        flagValue: chatStatus.client_has_replied_since_last_admin
      });
    }
    
    console.log('🔍 Vérification directe: client a répondu depuis dernier message admin notifié?', clientHasRepliedSinceLastAdmin);
    console.log('🔍 Flag DB: client_has_replied_since_last_admin:', chatStatus.client_has_replied_since_last_admin);
    
    // Utiliser à la fois la vérification directe ET le flag de la DB (l'un des deux suffit)
    const clientHasActuallyReplied = clientHasRepliedSinceLastAdmin || chatStatus.client_has_replied_since_last_admin;

    if (clientHasActuallyReplied) {
      // Le client a effectivement répondu - utiliser son dernier message comme point de départ
      if (lastUserMessage?.timestamp) {
        adminMessageStartTime = lastUserMessage.timestamp;
        console.log('📅 Client a répondu - on compte les messages admin depuis son dernier message à:', adminMessageStartTime);
      } else {
        console.log('⚠️ Client a répondu mais pas de message trouvé, on utilise updated_at:', chatStatus.updated_at);
        adminMessageStartTime = chatStatus.updated_at || adminMessageStartTime;
      }
    } else if (chatStatus.last_notified_at) {
      adminMessageStartTime = chatStatus.last_notified_at;
      console.log('📅 Le client n\'a pas répondu - on compte depuis last_notified_at:', adminMessageStartTime);
    } else {
      console.log('📅 Pas de notification précédente - on compte depuis le début des temps:', adminMessageStartTime);
    }

    const { data: adminMessages, error: adminMessagesError } = await supabaseClient
      .from('chatbot_messages')
      .select('id')
      .eq('chat_id', chat_id)
      .eq('sender', 'admin')
      .gte('timestamp', adminMessageStartTime)
      .order('timestamp', { ascending: true });

    if (adminMessagesError) {
      console.error('❌ Erreur lors de la récupération des messages admin:', adminMessagesError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la vérification des messages admin' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const adminMessagesCount = adminMessages?.length || 0;
    console.log('📊 Nombre de messages admin depuis la dernière notification:', adminMessagesCount);

    // Si c'est le premier message après une réponse client OU le premier message en général, on l'envoie
    if (clientHasActuallyReplied) {
        // Cas 1: Le client a répondu - vérifier si c'est le premier message admin depuis sa réponse
        const { data: adminMessagesSinceReply } = await supabaseClient
          .from('chatbot_messages')
          .select('id')
          .eq('chat_id', chat_id)
          .eq('sender', 'admin')
          .gte('timestamp', adminMessageStartTime)
          .order('timestamp', { ascending: true });
          
        const adminCountSinceReply = adminMessagesSinceReply?.length || 0;
        console.log('📊 Nombre de messages admin depuis la réponse client:', adminCountSinceReply);
        
        if (adminCountSinceReply <= 1) {
            console.log('✅ Premier message admin après réponse client – on envoie l\'email !');
        } else {
            console.log('❌ Pas le premier message admin après réponse client (' + adminCountSinceReply + ' messages) - pas d\'email');
            return new Response(JSON.stringify({ message: 'Pas le premier message admin après la réponse client' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
    } else if (adminMessagesCount < 10) {
        // Cas 2: Le client n'a pas répondu et moins de 10 messages admin
        console.log('❌ Moins de 10 messages admin envoyés depuis le dernier email');
        return new Response(JSON.stringify({ message: 'Moins de 10 messages admin envoyés depuis le dernier email' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } else {
        // Cas 3: Le client n'a pas répondu mais au moins 10 messages admin
        console.log('✅ Au moins 10 messages admin depuis la dernière notification - on envoie l\'email !');
    }
    console.log('✅ Vérification 2/4 passée: Conditions de messages admin remplies');

    // Vérification 3/4 : Est-ce que ce message admin a déjà déclenché une notif ?
    if (chatStatus.last_admin_message_id_notified === record.id) {
      console.log('🚫 Notification déjà envoyée pour ce message admin ID:', record.id);
      return new Response(JSON.stringify({ message: 'Déjà notifié pour ce message' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    console.log('✅ Vérification 3/4 passée: Message admin non notifié');

    // Vérification 4/4 : Le client est-il toujours inactif ?
    console.log('🔍 Vérification 4/4: Le client est-il toujours inactif ?');
    const { data: finalStatus } = await supabaseClient
      .from('client_chat_opened')
      .select('closed_at, updated_at')
      .eq('user_email', email)
      .eq('chat_id', chat_id)
      .maybeSingle();

    if (finalStatus) {
      const finalNow = new Date();
      const finalUpdatedAt = new Date(finalStatus.updated_at);
      const finalDelta = finalNow.getTime() - finalUpdatedAt.getTime();
      
      if (!finalStatus.closed_at && finalDelta < 60000) {
        console.log('❌ Le client est redevenu actif pendant les vérifications');
        return new Response(JSON.stringify({ message: 'Le client est redevenu actif' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    console.log('✅ Vérification 4/4 passée: Le client est toujours inactif');

    console.log('🎯 Toutes les vérifications passées, préparation de l\'envoi d\'email...');

    // Créer le lien vers le chatbot
    const chatbotUrl = `${SITE_URL}/?email=${encodeURIComponent(email)}&chat_id=${chat_id}`
    console.log('🔗 Lien chatbot généré:', chatbotUrl);

    // Préparer les données du contact
    const contactData = {
      email: email,
      status: 'subscribed',
      statusDate: new Date().toISOString(),
      properties: {
        last_admin_reply: new Date().toISOString(),
        last_chat_message: message,
        last_chat_id: chat_id
      }
    }
    console.log('📤 Préparation des données pour Omnisend /contacts :', contactData);

    // Ajouter ou mettre à jour le contact dans Omnisend
    console.log('🔄 Appel API Omnisend /contacts...');
    const contactResponse = await fetch(`${OMNISEND_API_URL}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': OMNISEND_API_KEY
      },
      body: JSON.stringify(contactData)
    })

    if (!contactResponse.ok) {
      const errorData = await contactResponse.json()
      console.error('❌ Échec update contact Omnisend:', errorData);
      console.log('⚠️ Envoi d\'email annulé - Raison: Échec de la mise à jour du contact Omnisend');
      return new Response(JSON.stringify({ error: `Omnisend contact error: ${JSON.stringify(errorData)}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Contact Omnisend mis à jour avec succès');

    // Déclencher l'événement personnalisé pour l'envoi d'email
    const eventData = {
      email: email,
      eventName: 'admin_reply_notification',
      SystemName: 'admin_reply_notification',
      fields: {
        message_preview: message
          ? message.substring(0, 100) + (message.length > 100 ? '...' : '')
          : '...',
        chatbot_url: chatbotUrl,
        chat_id: chat_id
      }
    }
    console.log('📤 Préparation des données pour Omnisend /events :', eventData);

    console.log('🧪 Appel API Omnisend /events...');
    console.log('🧪 Payload event envoyé à Omnisend :', JSON.stringify(eventData, null, 2));

    const eventResponse = await fetch(`${OMNISEND_API_URL}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': OMNISEND_API_KEY
      },
      body: JSON.stringify(eventData)
    })

    if (!eventResponse.ok) {
      const errorData = await eventResponse.json()
      console.error('❌ Échec déclenchement événement Omnisend:', errorData);
      console.log('⚠️ Envoi d\'email annulé - Raison: Échec du déclenchement de l\'événement Omnisend');
      return new Response(JSON.stringify({ error: `Omnisend event error: ${JSON.stringify(errorData)}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Événement Omnisend déclenché avec succès');

    // Après l'envoi réussi de l'email, mettre à jour last_notified_at et client_has_replied_since_last_admin
    console.log('🔄 Mise à jour du statut de notification dans Supabase...');
    const { error: updateError } = await supabaseClient
      .from('client_chat_opened')
      .update({
        last_notified_at: new Date().toISOString(),
        client_has_replied_since_last_admin: false,
        last_admin_message_id_notified: record.id,
        updated_at: new Date().toISOString()
      })
      .eq('chat_id', chat_id);

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour du statut de notification:', updateError);
      console.log('⚠️ Attention: Le statut n\'a pas été mis à jour dans Supabase');
      return new Response(JSON.stringify({ error: 'Failed to update notification status' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      console.log('✅ Statut de notification mis à jour avec succès');
    }

    // 👇 Ping activité client pour mettre à jour updated_at (évite faux positifs)
    try {
      const now = new Date().toISOString();
      const { error: pingError } = await supabaseClient
        .from('client_chat_opened')
        .update({ updated_at: now })
        .eq('chat_id', chat_id);

      if (pingError) {
        console.warn("⚠️ Ping d'activité échoué (mais on continue):", pingError);
      } else {
        console.log("📡 Ping d'activité effectué avec succès pour chat_id:", chat_id);
      }
    } catch (e) {
      console.warn("⚠️ Erreur inattendue pendant le ping (ignorée):", e);
    }

    console.log('🎉 Fonction exécutée avec succès !');
    console.log('📧 Email de notification envoyé avec succès à:', email);
    console.log('✉️ Envoi de l\'email réussi');
    return new Response(JSON.stringify({ message: 'Email envoyé avec succès' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Erreur dans le handler:', error);
    console.log('⚠️ Envoi d\'email annulé - Raison: Erreur inattendue');
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 