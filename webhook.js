const express = require('express');
const axios = require('axios');
const router = express.Router();

// ⚙️ Récupération des variables d'environnement
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "MON_TOKEN_SECRET";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || "MON_ACCESS_TOKEN_FACEBOOK";

// ✅ Vérification de la configuration avant démarrage
console.log("🔍 Vérification des variables d'environnement...");
if (!VERIFY_TOKEN || !PAGE_ACCESS_TOKEN) {
    console.error("❌ ERREUR : Les variables d'environnement VERIFY_TOKEN et PAGE_ACCESS_TOKEN ne sont pas définies !");
} else {
    console.log("✅ Variables d'environnement chargées avec succès !");
}

// 📌 Vérification du webhook pour Facebook Messenger
router.get('/webhook', (req, res) => {
    console.log("🔄 Requête GET reçue sur /webhook");

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log(`📥 Paramètres reçus : mode=${mode}, token=${token}`);

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("✔️ Webhook validé avec succès !");
        res.status(200).send(challenge);
    } else {
        console.warn("❌ Échec de validation du Webhook !");
        res.status(403).send('Échec de vérification');
    }
});

// 📩 Réception des messages de Messenger
router.post('/webhook', async (req, res) => {
    console.log("🔄 Requête POST reçue sur /webhook");
    
    const body = req.body;
    console.log("📥 Corps de la requête :", JSON.stringify(body, null, 2));

    if (body.object === 'page') {
        body.entry.forEach(entry => {
            const webhookEvent = entry.messaging[0];
            
            if (!webhookEvent || !webhookEvent.sender) {
                console.warn("⚠️ Événement webhook invalide, ignoré.");
                return;
            }

            const senderId = webhookEvent.sender.id;

            if (webhookEvent.message) {
                const messageText = webhookEvent.message.text;
                console.log(`📩 Nouveau message reçu de ${senderId}: ${messageText}`);

                // ✅ Répondre automatiquement
                sendMessageToMessenger(senderId, `Tu as dit : ${messageText}`);
            } else {
                console.log("ℹ️ Aucune gestion définie pour ce type de message.");
            }
        });

        res.status(200).send('EVENT_RECEIVED');
    } else {
        console.warn("⚠️ Objet inattendu reçu, réponse 404.");
        res.sendStatus(404);
    }
});

// 📤 Fonction pour envoyer un message à Messenger
async function sendMessageToMessenger(recipientId, messageText) {
    console.log(`🛠️ Envoi d'un message à ${recipientId}: "${messageText}"`);

    const url = `https://graph.facebook.com/v13.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
    const payload = {
        recipient: { id: recipientId },
        message: { text: messageText }
    };

    try {
        const response = await axios.post(url, payload);
        console.log(`📤 Message envoyé avec succès à ${recipientId}!`);
        console.log("📊 Réponse API:", response.data);
        return true;
    } catch (error) {
        console.error("❌ Erreur d'envoi du message:", error.response?.data || error.message);
        return false;
    }
}

module.exports = router;
