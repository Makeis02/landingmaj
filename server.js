import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 📂 Obtenir le chemin du répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Charger les variables d'environnement
console.log('📂 Chargement du fichier .env:', path.join(__dirname, '.env'));
try {
  dotenv.config({ path: path.join(__dirname, '.env') });
  console.log('✅ Variables d\'environnement chargées avec succès');
} catch (error) {
  console.error('❌ Erreur lors du chargement des variables d\'environnement:', error);
}

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8081;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "MON_TOKEN_SECRET";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || "MON_ACCESS_TOKEN_FACEBOOK";

console.log('🔑 Configuration chargée:');
console.log('- PORT:', PORT);
console.log('- WS_PORT:', WS_PORT);
console.log('- VERIFY_TOKEN:', VERIFY_TOKEN ? '✅ Défini' : '❌ Manquant');
console.log('- PAGE_ACCESS_TOKEN:', PAGE_ACCESS_TOKEN ? '✅ Défini' : '❌ Manquant');

// 🛠️ Middleware
app.use(bodyParser.json());
app.use(cors());

// 🚀 Démarrage WebSocket
const wss = new WebSocketServer({ port: WS_PORT });
let activeConnections = new Set();

wss.on('connection', (ws) => {
    activeConnections.add(ws);
    console.log('🔌 Nouvelle connexion WebSocket établie');

    ws.on('close', () => {
        activeConnections.delete(ws);
        console.log('🔌 Connexion WebSocket fermée');
    });

    ws.on('error', (error) => {
        console.error('❌ Erreur WebSocket:', error);
        activeConnections.delete(ws);
    });
});

// 📢 Fonction pour envoyer un message à tous les WebSocket connectés
const broadcastMessage = (message) => {
    activeConnections.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
};

// 📂 Stockage temporaire des conversations (Remplacez par une BDD)
const conversations = new Map();

// 🔍 **Vérification Webhook Facebook**
app.get('/webhook', (req, res) => {
    console.log("🔍 Vérification du Webhook reçue");
    console.log("📦 Paramètres de la requête:", req.query);

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("✔️ Webhook validé !");
        res.status(200).send(challenge);
    } else {
        console.log("❌ Échec de validation du Webhook !");
        res.status(403).send('Échec de la vérification');
    }
});

// 📩 **Réception des messages Facebook Messenger**
app.post('/webhook', async (req, res) => {
    console.log("📩 Webhook POST reçu avec ce body:", JSON.stringify(req.body, null, 2));

    if (req.body.object === 'page') {
        for (const entry of req.body.entry) {
            const webhookEvent = entry.messaging[0];
            if (!webhookEvent) continue;
            
            const senderId = webhookEvent.sender?.id;
            const messageText = webhookEvent.message?.text;

            if (senderId && messageText) {
                console.log(`📩 Message reçu de ${senderId}: ${messageText}`);

                // Enregistrement du message
                if (!conversations.has(senderId)) {
                    conversations.set(senderId, []);
                }
                conversations.get(senderId).push({
                    id: Date.now().toString(),
                    text: messageText,
                    timestamp: new Date(),
                    from: 'messenger'
                });

                // 🔥 Broadcast aux WebSockets
                broadcastMessage({
                    type: 'new_message',
                    senderId,
                    message: {
                        id: Date.now().toString(),
                        text: messageText,
                        timestamp: new Date(),
                        from: 'messenger'
                    }
                });

                // 📤 Réponse automatique (optionnelle)
                await sendMessageToMessenger(senderId, `Tu as dit : ${messageText}`);
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        console.log("⚠️ Webhook reçu mais non reconnu");
        res.sendStatus(404);
    }
});

// 📤 **Envoi de messages vers Messenger**
const sendMessageToMessenger = async (recipientId, messageText) => {
    const url = `https://graph.facebook.com/v13.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
    const payload = {
        recipient: { id: recipientId },
        message: { text: messageText }
    };

    try {
        const response = await axios.post(url, payload);
        console.log(`📤 Message envoyé à ${recipientId}: ${messageText}`, response.data);
        return true;
    } catch (error) {
        console.error("❌ Erreur d'envoi:", error.response?.data || error);
        return false;
    }
};

// 🌍 **Endpoint pour tester si le serveur tourne**
app.get('/', (req, res) => {
    res.send("✅ Serveur en ligne et fonctionnel !");
});

// **🚀 Démarrage du serveur**
app.listen(PORT, () => {
    console.log(`🚀 Serveur webhook en ligne sur http://localhost:${PORT}`);
    console.log(`🔌 WebSocket en écoute sur le port ${WS_PORT}`);
}).on('error', (error) => {
    console.error('❌ Erreur de démarrage du serveur:', error);
    process.exit(1);
});
