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
const SHOPIFY_DOMAIN = process.env.VITE_SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.VITE_SHOPIFY_ADMIN_ACCESS_TOKEN;

console.log('🔑 Configuration chargée:');
console.log('- PORT:', PORT);
console.log('- WS_PORT:', WS_PORT);
console.log('- VERIFY_TOKEN:', VERIFY_TOKEN ? '✅ Défini' : '❌ Manquant');
console.log('- PAGE_ACCESS_TOKEN:', PAGE_ACCESS_TOKEN ? '✅ Défini' : '❌ Manquant');
console.log('- SHOPIFY_DOMAIN:', SHOPIFY_DOMAIN ? '✅ Défini' : '❌ Manquant');
console.log('- SHOPIFY_ADMIN_ACCESS_TOKEN:', SHOPIFY_ADMIN_ACCESS_TOKEN ? '✅ Défini' : '❌ Manquant');

// 🛠️ Middleware essentiels
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

// ==========================================
// 🔴 SECTION API ROUTES (PRIORITAIRES)
// ==========================================

// 🛍️ **API Shopify pour les produits**
app.get('/api/shopify/products', async (req, res) => {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_ADMIN_ACCESS_TOKEN) {
    console.error('❌ Variables d\'environnement Shopify manquantes');
    return res.status(500).json({ 
      error: 'Configuration Shopify manquante', 
      message: 'Les identifiants Shopify ne sont pas configurés sur le serveur' 
    });
  }

  try {
    console.log('🔍 Récupération des produits depuis Shopify...');
    const response = await axios.get(`https://${SHOPIFY_DOMAIN}/admin/api/2023-10/products.json`, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
        "Content-Type": "application/json",
      }
    });

    // Vérifier d'abord si nous avons des données valides
    if (!response.data) {
      console.error('❌ Réponse vide de Shopify');
      return res.status(500).json({ 
        error: 'Réponse vide', 
        message: 'Shopify a renvoyé une réponse vide' 
      });
    }

    // Vérifier si nous avons des produits dans les données
    if (!response.data.products || !Array.isArray(response.data.products)) {
      console.error('❌ Aucun produit dans la réponse Shopify:', response.data);
      return res.status(500).json({ 
        error: 'Pas de produits', 
        message: 'Aucun produit trouvé dans la réponse de Shopify' 
      });
    }

    // Formater les données avant de les renvoyer au frontend
    const formattedProducts = response.data.products.map(product => ({
      id: product.id,
      title: product.title,
      price: product.variants[0]?.price || "0.00",
      stock: product.variants[0]?.inventory_quantity || 0,
      image: product.image?.src || "",
    }));

    console.log(`✅ ${formattedProducts.length} produits récupérés avec succès`);
    
    // Toujours renvoyer un JSON valide, même si la liste est vide
    return res.status(200).json({ 
      products: formattedProducts,
      count: formattedProducts.length
    });
  } catch (error) {
    console.error('❌ Erreur lors de la communication avec Shopify :', error.message);
    
    // Sécuriser le message d'erreur pour toujours renvoyer un JSON valide
    let errorMessage = "Erreur inconnue";
    
    if (error.response) {
      // La requête a été faite et le serveur a répondu avec un code d'état hors de la plage 2xx
      errorMessage = `Erreur API Shopify (${error.response.status}): ${JSON.stringify(error.response.data || {})}`;
    } else if (error.request) {
      // La requête a été faite mais aucune réponse n'a été reçue
      errorMessage = "Pas de réponse de Shopify - vérifiez la connectivité réseau";
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      errorMessage = error.message || "Erreur lors de la configuration de la requête";
    }
    
    return res.status(500).json({ 
      error: 'Erreur API Shopify', 
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// 🌍 **Endpoint pour tester si le serveur tourne**
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: "ok", message: "✅ Serveur en ligne et fonctionnel !" });
});

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

// ==========================================
// 🔵 SECTION FRONTEND (APRÈS LES API)
// ==========================================

// Servir les fichiers statiques de l'application React
app.use(express.static(path.join(__dirname, 'dist')));

// Route par défaut qui retourne index.html pour toutes les requêtes qui ne correspondent pas à une API
app.get('*', (req, res) => {
    console.log(`🌐 Requête frontend pour: ${req.path}`);
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// **🚀 Démarrage du serveur**
app.listen(PORT, () => {
    console.log(`🚀 Serveur webhook en ligne sur http://localhost:${PORT}`);
    console.log(`🔌 WebSocket en écoute sur le port ${WS_PORT}`);
}).on('error', (error) => {
    console.error('❌ Erreur de démarrage du serveur:', error);
    process.exit(1);
});
