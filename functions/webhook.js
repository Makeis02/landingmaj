const axios = require("axios");

// Configuration CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

// Stockage temporaire des messages
let messages = [
  {
    id: "1",
    type: "bot",
    content: "Bonjour ! 😊 Je suis AquaBot, ton assistant. Comment puis-je t'aider ?",
    timestamp: new Date().toISOString(),
    from: "chat"
  }
];

// Stockage des associations email-ID Messenger
const messengerLinks = {};

// Fonction utilitaire pour les logs
const log = {
  request: (event) => {
    console.group('📩 Nouvelle Requête');
    console.log('🔍 Méthode:', event.httpMethod);
    console.log('🔗 Path:', event.path);
    console.log('📦 Query Params:', event.queryStringParameters);
    console.log('📋 Headers:', JSON.stringify(event.headers, null, 2));
    if (event.body) {
      try {
        const parsedBody = JSON.parse(event.body);
        console.log('📥 Body:', JSON.stringify(parsedBody, null, 2));
        
        // Log spécifique pour les messages Facebook
        if (parsedBody.object === 'page') {
          console.group('📱 Message Facebook');
          console.log('📦 Type:', parsedBody.object);
          console.log('📥 Entrées:', parsedBody.entry.length);
          parsedBody.entry.forEach((entry, index) => {
            console.log(`\n📥 Entrée ${index + 1}:`);
            console.log('⏰ Timestamp:', entry.time);
            console.log('💬 Messaging:', entry.messaging[0]);
          });
          console.groupEnd();
        }
      } catch (e) {
        console.log('📥 Body (raw):', event.body);
      }
    }
    console.groupEnd();
  },
  
  error: (error, context = '') => {
    console.group('❌ Erreur');
    console.log('🔍 Contexte:', context);
    console.log('📝 Message:', error.message);
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📦 Data:', JSON.stringify(error.response.data, null, 2));
      console.log('🔍 Headers:', JSON.stringify(error.response.headers, null, 2));
    }
    console.log('🔍 Stack:', error.stack);
    console.groupEnd();
  },

  success: (message, data = null) => {
    console.group('✅ Succès');
    console.log('📝 Message:', message);
    if (data) {
      console.log('📦 Données:', JSON.stringify(data, null, 2));
    }
    console.groupEnd();
  }
};

// Fonction utilitaire pour les réponses
const createResponse = (statusCode, body, headers = {}) => {
  const response = {
    statusCode,
    headers: { ...corsHeaders, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
  
  log.success(`Réponse créée: ${statusCode}`, response);
  return response;
};

// Fonction pour générer un ID temporaire
function generateTemporaryId(email) {
  const hash = require('crypto').createHash('md5').update(email).digest('hex');
  return `temp_${hash.substring(0, 8)}`;
}

// Fonction pour envoyer un message à Messenger
async function sendMessageToMessenger(recipientId, messageText) {
  console.group('📤 Envoi Message Messenger');
  console.log('👤 Recipient ID:', recipientId);
  console.log('💬 Message à envoyer:', messageText);

  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  const PAGE_ID = process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID;


  if (!PAGE_ACCESS_TOKEN) {
    log.error(new Error('PAGE_ACCESS_TOKEN manquant'), 'Configuration');
    console.groupEnd();
    return false;
  }

  if (!PAGE_ID) {
    console.warn('⚠️ PAGE_ID non défini dans les variables d\'environnement');
  }

  console.log('🔒 PAGE_ACCESS_TOKEN défini ? →', !!PAGE_ACCESS_TOKEN);
  console.log('🆔 PAGE_ID défini ? →', !!PAGE_ID);

  // Vérifie l'association email-tempID avec sender ID
  const finalRecipientId = messengerLinks[recipientId] || 
    (recipientId.startsWith('temp_') ? PAGE_ID : recipientId);

  console.log('🧭 ID final utilisé pour envoi :', finalRecipientId);

  if (messengerLinks[recipientId]) {
    console.log(`🔗 Mapping trouvé pour ${recipientId} → ${finalRecipientId}`);
  } else if (recipientId.startsWith('temp_')) {
    console.warn(`⚠️ Aucun mapping trouvé pour ${recipientId}, fallback sur PAGE_ID`);
  }

  const url = `https://graph.facebook.com/v13.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  const payload = {
    recipient: { id: finalRecipientId },
    message: { text: messageText }
  };

  console.log('🌐 Requête POST Facebook Messenger API');
  console.log('🔗 URL:', url);
  console.log('📦 Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(url, payload);
    console.log('📥 Réponse brute:', response.status, response.statusText);
    console.log('📦 Réponse data:', JSON.stringify(response.data, null, 2));

    log.success(`Message envoyé à ${finalRecipientId}`);
    console.groupEnd();
    return true;
  } catch (error) {
    console.error('❌ Axios POST a échoué');
    if (error.response) {
      console.log('📊 Code HTTP:', error.response.status);
      console.log('📦 Réponse d\'erreur:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ Erreur inconnue (pas de réponse)');
    }

    log.error(error, 'sendMessageToMessenger');
    console.groupEnd();
    return false;
  }
}

exports.handler = async function (event) {
  // Log de la requête entrante
  log.request(event);

  // Gestion des requêtes OPTIONS pour CORS
  if (event.httpMethod === "OPTIONS") {
    log.success('Requête OPTIONS traitée');
    return createResponse(200, "");
  }

  try {
    // Route GET /messages pour récupérer les messages
    if (event.httpMethod === "GET" && event.path.endsWith("/messages")) {
      console.group('📥 Récupération Messages');
      console.log('📊 Nombre de messages:', messages.length);
      console.log('📦 Messages:', JSON.stringify(messages, null, 2));
      console.groupEnd();
      return createResponse(200, messages);
    }

    // Vérification du webhook Facebook
    if (event.httpMethod === "GET") {
      console.group('🔍 Vérification Webhook Facebook');
      const params = new URLSearchParams(event.queryStringParameters);
      const mode = params.get("hub.mode");
      const token = params.get("hub.verify_token");
      const challenge = params.get("hub.challenge");

      console.log('📋 Paramètres:', { mode, token, challenge });
      console.log('🔑 VERIFY_TOKEN configuré:', !!process.env.VERIFY_TOKEN);

      if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        log.success('Webhook validé avec succès');
        console.groupEnd();
        return createResponse(200, challenge);
      } else {
        log.error(new Error('Échec de validation du Webhook'), 'Vérification');
        console.groupEnd();
        return createResponse(403, "Échec de vérification");
      }
    }

    // Traitement des messages Facebook
    if (event.httpMethod === "POST") {
      console.group('📥 Traitement Message');
      const body = JSON.parse(event.body);

      // Gestion des messages du frontend
      if (body.recipientId && body.message) {
        console.log('📤 Message du frontend reçu');
        console.log('👤 Recipient ID:', body.recipientId);
        console.log('💬 Message:', body.message);

        // Générer un ID temporaire si nécessaire
        const messageId = body.recipientId.startsWith('temp_') 
          ? body.recipientId 
          : generateTemporaryId(body.recipientId);

        const newMessage = {
          id: Date.now().toString(),
          type: "user",
          content: body.message,
          timestamp: new Date().toISOString(),
          from: "chat",
          messengerUserId: messageId
        };

        console.log('📥 Message enregistré:', JSON.stringify(newMessage, null, 2));
        messages.push(newMessage);

        const success = await sendMessageToMessenger(messageId, body.message);
        
        if (!success) {
          log.error(new Error('Échec de l\'envoi du message'), 'Frontend Message');
          console.groupEnd();
          return createResponse(500, { success: false, error: "Erreur lors de l'envoi du message" });
        }

        log.success('Message du frontend traité avec succès');
        console.groupEnd();
        return createResponse(200, { 
          success: true, 
          message: newMessage 
        });
      }

      // Gestion des messages Facebook
      if (body.object === "page") {
        for (const entry of body.entry) {
          const webhookEvent = entry.messaging[0];
          if (!webhookEvent) {
            console.log('⚠️ Pas de message dans l\'entrée');
            continue;
          }

          // Traitement des referrals pour l'association email-ID
          if (webhookEvent.referral && webhookEvent.referral.ref) {
            const ref = webhookEvent.referral.ref;
            console.log('🔍 Referral détecté:', ref);
            
            if (ref.startsWith("email=")) {
              const email = ref.split("email=")[1];
              const tempId = `temp_${require('crypto').createHash('md5').update(email).digest('hex').substring(0, 8)}`;
              messengerLinks[tempId] = webhookEvent.sender.id;
              console.log(`🔗 Lien Messenger associé : ${tempId} ↔ ${webhookEvent.sender.id}`);
              console.log('📧 Email associé:', email);
            }
          }

          const senderId = webhookEvent.sender.id;
          const messageText = webhookEvent.message?.text;

          console.log('👤 Sender ID:', senderId);
          console.log('💬 Message reçu:', messageText);
          console.log('📦 Événement complet:', JSON.stringify(webhookEvent, null, 2));

          if (messageText) {
            const newMessage = {
              id: Date.now().toString(),
              type: "messenger",
              content: messageText,
              timestamp: new Date().toISOString(),
              from: "messenger",
              messengerUserId: senderId
            };

            console.log("📥 Message enregistré avec ID Messenger:", senderId);
            console.log('📦 Nouveau message:', JSON.stringify(newMessage, null, 2));
            messages.push(newMessage);

            if (messages.length > 100) {
              console.log('🧹 Nettoyage des anciens messages');
              messages = messages.slice(-100);
            }

            log.success('Message traité avec succès');
            console.groupEnd();
            return createResponse(200, "EVENT_RECEIVED");
          }
        }
        log.success('Traitement terminé sans message');
        console.groupEnd();
        return createResponse(200, "EVENT_RECEIVED");
      }
    }

    log.error(new Error('Méthode non autorisée'), 'Validation');
    return createResponse(405, "Méthode non autorisée");

  } catch (error) {
    log.error(error, 'Traitement Général');
    return createResponse(500, "Erreur interne du serveur");
  }
};
