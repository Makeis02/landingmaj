import axios from "axios";

// Netlify Function - Webhook Facebook
export async function handler(event) {
  if (event.httpMethod === "GET") {
    const params = new URLSearchParams(event.queryStringParameters);
    const mode = params.get("hub.mode");
    const token = params.get("hub.verify_token");
    const challenge = params.get("hub.challenge");

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      console.log("✔️ Webhook validé !");
      return {
        statusCode: 200,
        body: challenge,
      };
    } else {
      console.log("❌ Échec de validation du Webhook !");
      return {
        statusCode: 403,
        body: "Échec de vérification",
      };
    }
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body);

    if (body.object === "page") {
      for (const entry of body.entry) {
        const webhookEvent = entry.messaging[0];
        const senderId = webhookEvent.sender.id;

        if (webhookEvent.message) {
          const messageText = webhookEvent.message.text;
          console.log(`📩 Message reçu de ${senderId}: ${messageText}`);

          // Répondre au message
          await sendMessageToMessenger(senderId, `Tu as dit : ${messageText}`);
        }
      }
      return { statusCode: 200, body: "EVENT_RECEIVED" };
    }
    return { statusCode: 404, body: "Not Found" };
  }

  return { statusCode: 405, body: "Méthode non autorisée" };
}

// Fonction pour envoyer un message sur Messenger
async function sendMessageToMessenger(recipientId, messageText) {
  const url = `https://graph.facebook.com/v13.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`;
  const payload = {
    recipient: { id: recipientId },
    message: { text: messageText },
  };

  try {
    await axios.post(url, payload);
    console.log(`📤 Message envoyé à ${recipientId}: ${messageText}`);
    return true;
  } catch (error) {
    console.error("❌ Erreur d'envoi:", error.response?.data || error);
    return false;
  }
}
