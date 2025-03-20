const axios = require("axios"); // Utilisation de require pour éviter les erreurs d'importation

exports.handler = async function (event) {
  console.log("📩 Requête reçue:", event.httpMethod);

  if (event.httpMethod === "GET") {
    const params = new URLSearchParams(event.queryStringParameters);
    const mode = params.get("hub.mode");
    const token = params.get("hub.verify_token");
    const challenge = params.get("hub.challenge");

    console.log("🔍 Vérification du Webhook:", { mode, token, challenge });

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      console.log("✔️ Webhook validé !");
      return { statusCode: 200, body: challenge };
    } else {
      console.log("❌ Échec de validation du Webhook !");
      return { statusCode: 403, body: "Échec de vérification" };
    }
  }

  if (event.httpMethod === "POST") {
    console.log("📩 Webhook POST reçu.");
    try {
      const body = JSON.parse(event.body);

      if (body.object === "page") {
        for (const entry of body.entry) {
          const webhookEvent = entry.messaging[0];
          const senderId = webhookEvent.sender.id;

          if (webhookEvent.message) {
            const messageText = webhookEvent.message.text;
            console.log(`📩 Message reçu de ${senderId}: ${messageText}`);

            // Envoi de la réponse à Messenger
            const success = await sendMessageToMessenger(senderId, `Tu as dit : ${messageText}`);
            return {
              statusCode: success ? 200 : 500,
              body: success ? "EVENT_RECEIVED" : "Erreur lors de l'envoi du message",
            };
          }
        }
      }
      return { statusCode: 200, body: "EVENT_RECEIVED" };
    } catch (error) {
      console.error("❌ Erreur lors du traitement de la requête:", error);
      return { statusCode: 500, body: "Erreur interne du serveur" };
    }
  }

  return { statusCode: 405, body: "Méthode non autorisée" };
};

// Fonction pour envoyer un message à Messenger
async function sendMessageToMessenger(recipientId, messageText) {
  const url = `https://graph.facebook.com/v13.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`;
  const payload = {
    recipient: { id: recipientId },
    message: { text: messageText },
  };

  console.log("📤 Envoi du message à Messenger:", payload);

  try {
    const response = await axios.post(url, payload);
    console.log(`📤 Message envoyé avec succès à ${recipientId}:`, response.data);
    return true;
  } catch (error) {
    console.error("❌ Erreur d'envoi:", error.response?.data || error);
    return false;
  }
}
