const axios = require("axios");

// Configuration CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

// Stockage temporaire des messages (à remplacer par une base de données)
let messages = [
  {
    id: "1",
    type: "bot",
    content: "Bonjour ! 😊 Je suis AquaBot, ton assistant. Comment puis-je t'aider ?",
    timestamp: new Date().toISOString(),
    from: "chat"
  }
];

// Fonction utilitaire pour les réponses
const createResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { ...corsHeaders, ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body)
});

// Fonction pour envoyer un message à Messenger
async function sendMessageToMessenger(recipientId, messageText) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  
  if (!PAGE_ACCESS_TOKEN) {
    console.error("❌ PAGE_ACCESS_TOKEN manquant dans les variables d'environnement");
    return false;
  }

  const url = `https://graph.facebook.com/v13.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  const payload = {
    recipient: { id: recipientId },
    message: { text: messageText }
  };

  try {
    const response = await axios.post(url, payload);
    console.log(`📤 Message envoyé avec succès à ${recipientId}`);
    return true;
  } catch (error) {
    console.error("❌ Erreur d'envoi:", error.response?.data || error);
    return false;
  }
}

exports.handler = async function (event) {
  console.log("📩 Requête reçue:", event.httpMethod, event.path);

  // Gestion des requêtes OPTIONS pour CORS
  if (event.httpMethod === "OPTIONS") {
    console.log("🔄 Requête OPTIONS reçue");
    return createResponse(200, "");
  }

  try {
    // Route GET /messages pour récupérer les messages
    if (event.httpMethod === "GET" && event.path.endsWith("/messages")) {
      console.log("📥 Récupération des messages");
      return createResponse(200, messages);
    }

    // Vérification du webhook Facebook
    if (event.httpMethod === "GET") {
      const params = new URLSearchParams(event.queryStringParameters);
      const mode = params.get("hub.mode");
      const token = params.get("hub.verify_token");
      const challenge = params.get("hub.challenge");

      console.log("🔍 Vérification du Webhook:", { mode, token, challenge });

      if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
        console.log("✔️ Webhook validé !");
        return createResponse(200, challenge);
      } else {
        console.log("❌ Échec de validation du Webhook !");
        return createResponse(403, "Échec de vérification");
      }
    }

    // Traitement des messages Facebook
    if (event.httpMethod === "POST") {
      console.log("📩 Webhook POST reçu");
      const body = JSON.parse(event.body);

      if (body.object === "page") {
        for (const entry of body.entry) {
          const webhookEvent = entry.messaging[0];
          if (!webhookEvent) continue;

          const senderId = webhookEvent.sender.id;
          const messageText = webhookEvent.message?.text;

          if (messageText) {
            console.log(`📩 Message reçu de ${senderId}: ${messageText}`);

            // Ajouter le message à la liste
            const newMessage = {
              id: Date.now().toString(),
              type: "messenger",
              content: messageText,
              timestamp: new Date().toISOString(),
              from: "messenger"
            };
            messages.push(newMessage);

            // Limiter le nombre de messages stockés (optionnel)
            if (messages.length > 100) {
              messages = messages.slice(-100);
            }

            // Envoi de la réponse à Messenger
            const success = await sendMessageToMessenger(senderId, `Tu as dit : ${messageText}`);
            
            if (!success) {
              console.error("❌ Échec de l'envoi de la réponse à Messenger");
              return createResponse(500, "Erreur lors de l'envoi du message");
            }

            return createResponse(200, "EVENT_RECEIVED");
          }
        }
        return createResponse(200, "EVENT_RECEIVED");
      }
    }

    return createResponse(405, "Méthode non autorisée");

  } catch (error) {
    console.error("❌ Erreur lors du traitement de la requête:", error);
    return createResponse(500, "Erreur interne du serveur");
  }
};
