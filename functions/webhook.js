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

// Fonction pour envoyer un message à Messenger
async function sendMessageToMessenger(recipientId, messageText) {
  console.group('📤 Envoi Message Messenger');
  console.log('👤 Recipient ID:', recipientId);
  console.log('💬 Message:', messageText);

  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  
  if (!PAGE_ACCESS_TOKEN) {
    log.error(new Error('PAGE_ACCESS_TOKEN manquant'), 'Configuration');
    console.groupEnd();
    return false;
  }

  const url = `https://graph.facebook.com/v13.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  const payload = {
    recipient: { id: recipientId },
    message: { text: messageText }
  };

  try {
    console.log('🔗 URL:', url);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(url, payload);
    log.success(`Message envoyé avec succès à ${recipientId}`, response.data);
    console.groupEnd();
    return true;
  } catch (error) {
    log.error(error, 'Envoi Message Messenger');
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
      console.group('📩 Traitement Message Facebook');
      const body = JSON.parse(event.body);

      if (body.object === "page") {
        for (const entry of body.entry) {
          const webhookEvent = entry.messaging[0];
          if (!webhookEvent) {
            console.log('⚠️ Pas de message dans l\'entrée');
            continue;
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

            const success = await sendMessageToMessenger(senderId, `Tu as dit : ${messageText}`);
            
            if (!success) {
              log.error(new Error('Échec de l\'envoi de la réponse'), 'Traitement Message');
              console.groupEnd();
              return createResponse(500, "Erreur lors de l'envoi du message");
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
