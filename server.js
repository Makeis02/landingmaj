import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import slugify from 'slugify';
import { supabase } from './src/integrations/supabase/client.js';
import Stripe from 'stripe';


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

// DEBUG: log every route registration to find invalid patterns in prod
try {
  const methods = ['use', 'get', 'post', 'put', 'delete'];
  methods.forEach((method) => {
    const original = app[method].bind(app);
    app[method] = (pathArg, ...rest) => {
      try {
        if (typeof pathArg === 'string') {
          console.log(`🛣️ Registering route [${method.toUpperCase()}] -> "${pathArg}"`);
        } else if (pathArg instanceof RegExp) {
          console.log(`🛣️ Registering route [${method.toUpperCase()}] -> RegExp(${pathArg})`);
        } else {
          console.log(`🛣️ Registering route [${method.toUpperCase()}] ->`, pathArg);
        }
      } catch {}
      return original(pathArg, ...rest);
    };
  });
} catch (e) {
  console.warn('⚠️ Route registration logger not applied:', e?.message);
}

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

// 💳 Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

console.log('- STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Défini' : '❌ Manquant');

// 🛠️ Middleware essentiels
try {
  app.use(bodyParser.json());
  
  // Configuration CORS plus permissive pour résoudre les problèmes cross-origin
  app.use(cors({
    origin: function (origin, callback) {
      // Autoriser les requêtes sans origine (comme les apps mobiles)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'https://aqua-reve.com',
        'https://www.aqua-reve.com',
        'https://majemsiteteste.netlify.app',
        'https://landingmaj-production.up.railway.app',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8080'
      ];
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('🚫 Origine bloquée par CORS:', origin);
        callback(null, true); // Temporairement autoriser toutes les origines
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  }));
  
  // Middleware pour gérer les requêtes OPTIONS (preflight CORS)
  app.options('*', cors());
  
  // Middleware pour ajouter des en-têtes de sécurité
  app.use((req, res, next) => {
    // En-têtes de sécurité
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // En-têtes CORS supplémentaires
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    
    next();
  });
} catch (error) {
  console.error('❌ Erreur lors de la configuration des middlewares:', error);
  throw error;
}

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

// 💳 **API Stripe pour les produits**
app.get('/api/stripe/products', async (req, res) => {
  // Log de la requête pour debug
  console.log('🔍 Requête reçue sur /api/stripe/products:', {
    method: req.method,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']
  });

  // Vérifier la clé Stripe
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Variable d\'environnement STRIPE_SECRET_KEY manquante');
    return res.status(500).json({ 
      error: 'Configuration Stripe manquante', 
      message: 'La clé secrète Stripe n\'est pas configurée sur le serveur' 
    });
  }

  try {
    console.log('🔍 Récupération des produits depuis Stripe...');
    
    // Pagination Stripe pour récupérer tous les produits
    let allProducts = [];
    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
      const response = await stripe.products.list({
        active: true,
        expand: ['data.default_price'],
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {})
      });
      allProducts = allProducts.concat(response.data);
      hasMore = response.has_more;
      if (hasMore) startingAfter = response.data[response.data.length - 1].id;
    }
    const products = { data: allProducts };

    console.log(`📦 ${products.data.length} produits trouvés dans Stripe`);

    // Formater les produits pour correspondre à l'interface StripeProduct
    const formattedProducts = await Promise.all(products.data.map(async (product) => {
      // Récupérer les prix pour ce produit
      const prices = await stripe.prices.list({
        product: product.id,
        active: true
      });

      // Calculer le stock total à partir des métadonnées des prix
      let totalStock = 0;
      prices.data.forEach(price => {
        if (price.metadata?.stock) {
          const stock = parseInt(price.metadata.stock);
          if (!isNaN(stock)) {
            totalStock += stock;
          }
        }
      });

      // Utiliser le stock du produit si disponible, sinon la somme des prix
      const productStock = product.metadata?.stock ? parseInt(product.metadata.stock) : totalStock;

      // Trouver le prix par défaut ou le premier prix actif
      const defaultPrice = product.default_price || prices.data[0];
      const price = defaultPrice ? (defaultPrice.unit_amount / 100) : 0;

      return {
        id: product.id,
        title: product.name,
        price: price,
        stock: productStock || 0,
        image: product.images?.[0] || '',
        description: product.description || '',
        metadata: product.metadata || {}
      };
    }));

    console.log(`✅ ${formattedProducts.length} produits formatés avec succès`);
    
    return res.status(200).json({ 
      products: formattedProducts,
      count: formattedProducts.length
    });
  } catch (error) {
    console.error('❌ Erreur lors de la communication avec Stripe :', error.message);
    
    let errorMessage = "Erreur inconnue";
    
    if (error.type) {
      errorMessage = `Erreur Stripe (${error.type}): ${error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return res.status(500).json({ 
      error: 'Erreur API Stripe', 
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// 🧪 **Endpoint de test pour vérifier que l'API fonctionne**
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: 'enabled'
  });
});

// 💳 **API Stripe pour créer une session de checkout**
app.post('/api/stripe/create-checkout', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ Variable d\'environnement STRIPE_SECRET_KEY manquante');
    return res.status(500).json({ 
      error: 'Configuration Stripe manquante', 
      message: 'La clé secrète Stripe n\'est pas configurée sur le serveur' 
    });
  }

  try {
    const { items, success_url, cancel_url } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'Panier vide', 
        message: 'Le panier ne peut pas être vide' 
      });
    }

    console.log('🛒 Création de session de checkout Stripe...');
    
    // Créer la session de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.title || 'Produit',
            images: item.image_url ? [item.image_url] : [],
          },
          unit_amount: Math.round((item.price || 0) * 100), // Stripe utilise les centimes
        },
        quantity: item.quantity || 1,
      })),
      mode: 'payment',
      success_url: success_url || 'https://majemsiteteste.netlify.app/success',
      cancel_url: cancel_url || 'https://majemsiteteste.netlify.app/checkout?canceled=true',
    });

    console.log('✅ Session de checkout créée:', session.id);
    
    return res.status(200).json({ 
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création de la session de checkout:', error);
    return res.status(500).json({ 
      error: 'Erreur serveur', 
      message: error.message || 'Erreur lors de la création de la session de checkout'
    });
  }
});

// 🔄 **API Stripe Webhook**
app.post('/api/stripe-webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('❌ Variable d\'environnement STRIPE_WEBHOOK_SECRET manquante');
    return res.status(500).json({ 
      error: 'Configuration webhook manquante', 
      message: 'La clé secrète webhook n\'est pas configurée' 
    });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Erreur de signature webhook:', err.message);
    return res.status(400).json({ 
      error: 'Signature invalide', 
      message: 'La signature du webhook est invalide' 
    });
  }

  try {
    console.log('📡 Webhook Stripe reçu:', event.type);
    
    // Gérer les différents types d'événements
    switch (event.type) {
      case 'checkout.session.completed':
    const session = event.data.object;
        console.log('✅ Paiement complété pour la session:', session.id);
        // Ici tu peux ajouter la logique pour mettre à jour ta base de données
        break;
        
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('✅ Paiement réussi:', paymentIntent.id);
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('❌ Paiement échoué:', failedPayment.id);
        break;
        
      default:
        console.log('📡 Événement non géré:', event.type);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Erreur lors du traitement du webhook:', error);
    return res.status(500).json({ 
      error: 'Erreur serveur', 
      message: error.message || 'Erreur lors du traitement du webhook'
    });
  }
});

// 📦 **API pour décrémenter le stock**
app.post('/api/stock/decrement', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) {
      return res.status(400).json({ 
        error: 'ID produit manquant', 
        message: 'L\'ID du produit est requis' 
      });
    }

    console.log('📦 Décrémentation du stock pour le produit:', productId);
    
    // Ici tu peux ajouter la logique pour décrémenter le stock
    // Par exemple, mettre à jour Supabase ou Stripe
    
    // Pour l'instant, on retourne juste un succès
    console.log('✅ Stock décrémenté avec succès');
    
    return res.status(200).json({ 
      success: true,
      message: 'Stock décrémenté avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la décrémentation du stock:', error);
    return res.status(500).json({ 
      error: 'Erreur serveur', 
      message: error.message || 'Erreur lors de la décrémentation du stock'
    });
  }
});

// API pour récupérer les descriptions des pages produit
app.get('/api/products/descriptions', async (req, res) => {
  const pagesDir = path.join(__dirname, "src", "pages", "products");
  const descriptions = {};

  try {
    // Vérifier si le dossier existe
    if (!await fs.pathExists(pagesDir)) {
      console.log("⚠️ Le dossier des pages produit n'existe pas:", pagesDir);
      return res.json({ descriptions: {} });
    }

    console.log("📂 Lecture du dossier des pages produit:", pagesDir);
    const files = await fs.readdir(pagesDir);
    console.log(`📑 Nombre de fichiers trouvés: ${files.length}`);

    let processedCount = 0;
    let matchedCount = 0;

    for (const file of files) {
      if (!file.endsWith('.tsx')) continue;
      
      processedCount++;
      const filePath = path.join(pagesDir, file);
      console.log(`\n🔍 Analyse du fichier: ${file}`);
      
      try {
        const content = await fs.readFile(filePath, "utf-8");

        // Extraire l'ID du produit avec une regex plus robuste
        console.log(`  🔎 Recherche de l'ID et de la description dans le fichier: ${file}`);
        const matchId = content.match(/id:\s*["']([^"']+)["']/);
        if (!matchId) {
          console.log(`  ⚠️ Pas d'ID trouvé dans le fichier: ${file}`);
          continue;
        }
        
        // Nettoyer et normaliser l'ID à une chaîne de caractères
        let productId = matchId[1].trim();
        
        // Vérifier si l'ID est un nombre ou une chaîne contenant uniquement des chiffres
        // Dans ce cas, il vaut mieux le stocker sous forme de chaîne pour éviter les problèmes de conversion
        if (/^\d+$/.test(productId)) {
          productId = productId.toString();
          console.log(`  🔄 ID numérique normalisé en chaîne: "${productId}"`);
        } else {
          console.log(`  🏷️ ID produit trouvé (non-numérique): "${productId}"`);
        }

        // Chercher dans le bloc demoProduct
        const demoProductMatch = content.match(/const\s+demoProduct\s*=\s*{([^}]*?description:\s*["']([^]*?)["'](?=,|[\r\n])[^}]*?)}/s);
        
        if (demoProductMatch) {
          console.log(`  ✅ Bloc demoProduct trouvé avec description`);
          let description = demoProductMatch[2].replace(/\\"/g, '"').replace(/\\'/g, "'");
          
          // Ne pas inclure les descriptions vides
          if (description && description.trim() !== '') {
            descriptions[productId] = description.trim();
            matchedCount++;
            console.log(`  📝 Description trouvée pour le produit ID: ${productId}`);
            console.log(`  📝 Début de la description: ${description.substring(0, 50)}...`);
          } else {
            console.log(`  ⚠️ Description vide pour le produit ID: ${productId}`);
            
            // Essayer de trouver une description ailleurs dans le fichier
            console.log(`  🔍 Recherche d'une description ailleurs dans le fichier...`);
            const descMatch = content.match(/description:\s*["']([^]*?)["'](?=,|[\r\n])/s);
            
            if (descMatch) {
              description = descMatch[1].replace(/\\"/g, '"').replace(/\\'/g, "'").trim();
              if (description && description.trim() !== '') {
                descriptions[productId] = description.trim();
                matchedCount++;
                console.log(`  ✅ Description alternative trouvée pour le produit ID: ${productId}`);
                console.log(`  📝 Début de la description: ${description.substring(0, 50)}...`);
              }
            }
          }
        } else {
          console.log(`  ⚠️ Bloc demoProduct avec description non trouvé, tentative avec pattern simple...`);
          
          // Essayer avec un pattern plus simple
          const descMatch = content.match(/description:\s*["']([^]*?)["']/s);
          
          if (descMatch) {
            let description = descMatch[1].replace(/\\"/g, '"').replace(/\\'/g, "'").trim();
            
            if (description && description.trim() !== '') {
              descriptions[productId] = description.trim();
              matchedCount++;
              console.log(`  ✅ Description trouvée via pattern simple pour le produit ID: ${productId}`);
              console.log(`  📝 Début de la description: ${description.substring(0, 50)}...`);
            } else {
              console.log(`  ⚠️ Description vide trouvée via pattern simple pour le produit ID: ${productId}`);
            }
          } else {
            console.log(`  ❌ Format incompatible dans le fichier: ${file} - Aucune description trouvée`);
            
            // Log une portion du contenu pour diagnostiquer
            const contentSample = content.substring(0, 500);
            console.log(`  📄 Échantillon du contenu: ${contentSample.replace(/\n/g, "\\n").substring(0, 200)}...`);
          }
        }
      } catch (fileError) {
        console.error(`❌ Erreur lors de la lecture du fichier ${file}:`, fileError);
      }
    }

    console.log(`\n📊 Statistiques: ${processedCount} fichiers .tsx traités, ${matchedCount} descriptions trouvées`);
    console.log(`✅ ${Object.keys(descriptions).length} descriptions de produits récupérées`);
    
    // Liste un échantillon des descriptions récupérées
    if (Object.keys(descriptions).length > 0) {
      console.log("📋 Échantillon des descriptions récupérées:");
      Object.entries(descriptions).slice(0, 3).forEach(([id, desc]) => {
        console.log(`  - ID: "${id}", Type: ${typeof id}, Description: ${desc.substring(0, 50)}...`);
      });
    } else {
      console.log("⚠️ Aucune description récupérée !");
    }
    
    res.json({ descriptions });
  } catch (err) {
    console.error("❌ Erreur lors de la lecture des descriptions:", err);
    res.status(500).json({ error: "Impossible de récupérer les descriptions des produits." });
  }
});

// 🌍 **Endpoint pour tester si le serveur tourne**
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: "ok", message: "✅ Serveur en ligne et fonctionnel !" });
});

// ==========================================
// 🏗️ SECTION API POUR LA GÉNÉRATION DE PAGES
// ==========================================

/**
 * Génère une page produit à partir du modèle
 */
async function generateProductPage(product) {
  try {
    // Valider les données essentielles du produit
    if (!product.title) {
      return { success: false, message: "Le titre du produit est obligatoire" };
    }

    // Générer le slug à partir du titre
    const slug = slugify(product.title, { lower: true });
    
    // Définir les chemins
    const pagesDir = path.join(__dirname, "src", "pages", "products");
    const modelePath = path.join(__dirname, "src", "pages", "Product", "Modele.tsx");
    const outputPath = path.join(pagesDir, `${slug}.tsx`);

    // Vérifier si le dossier products existe, sinon le créer
    await fs.ensureDir(pagesDir);

    // Vérifier si la page existe déjà
    if (await fs.pathExists(outputPath)) {
      return { 
        success: false, 
        message: `La page ${slug}.tsx existe déjà`,
        slug
      };
    }

    // Lire le fichier modèle
    const template = await fs.readFile(modelePath, "utf8");

    // Générer le nom du composant React
    const componentName = `Product${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`;

    // Formatage des badges et spécifications
    const badges = product.badges || [];
    const specifications = product.specifications || [
      { name: "Référence", value: product.id || "N/A" },
      { name: "Marque", value: product.brand || "Non spécifié" }
    ];

    // Remplacer le contenu du modèle
    let pageContent = template;

    // Remplacer la constante demoProduct
    pageContent = pageContent.replace(
      /const demoProduct = {[\s\S]*?};/,
      `const demoProduct = {
  id: "${product.id || ''}",
  title: "${product.title.replace(/"/g, '\\"')}",
  brand: "${product.brand || 'Non spécifié'}",
  reference: "${product.reference || product.id || ''}",
  description: "${(product.description || '').replace(/"/g, '\\"')}",
  price: ${product.price || 0},
  image: "${product.image || '/placeholder.svg'}",
  badges: ${JSON.stringify(badges)},
  specifications: ${JSON.stringify(specifications)},
  category: "${product.category || ''}",
  categoryName: "${product.categoryName || ''}"
};`
    );

    // Remplacer toutes les occurrences de Modele ou ProductPage par le nouveau nom de composant
    pageContent = pageContent.replace(/const\s+Modele\s*=/g, `const ${componentName} =`);
    pageContent = pageContent.replace(/const\s+ProductPage\s*=/g, `const ${componentName} =`);
    
    // S'assurer que l'export par défaut est correct
    pageContent = pageContent.replace(/export\s+default\s+Modele;/g, `export default ${componentName};`);
    pageContent = pageContent.replace(/export\s+default\s+ProductPage;/g, `export default ${componentName};`);
    
    // Vérifier s'il y a un export default qui ne correspond pas au pattern remplacé
    if (!pageContent.includes(`export default ${componentName};`)) {
      // Ajouter l'export default à la fin du fichier si nécessaire
      pageContent = pageContent + `\nexport default ${componentName};`;
      console.log(`✅ Export par défaut ajouté: export default ${componentName};`);
    }

    // Écrire le fichier
    await fs.writeFile(outputPath, pageContent);
    
    // Ajouter la route dans App.tsx
    const routeResult = await addRoute(slug, componentName);

    // Initialiser les entrées editable_content dans Supabase
    try {
      // S'assurer que la connexion à Supabase est initialisée
      const { supabase } = await import('./src/integrations/supabase/client.js');
      
      // Créer les entrées de contenu éditable pour les champs clés
      const editableFields = [
        { key: `product_${product.id}_title`, content: product.title },
        { key: `product_${product.id}_description`, content: product.description || '' },
        { key: `product_${product.id}_brand`, content: product.brand || 'Non spécifié' },
        { key: `product_${product.id}_price`, content: product.price.toString() },
        { key: `product_${product.id}_image`, content: product.image || '/placeholder.svg' }
      ];
      
      // Ajouter les spécifications
      specifications.forEach((spec, index) => {
        editableFields.push({ 
          key: `product_${product.id}_specification_${index}_name`, 
          content: spec.name 
        });
        editableFields.push({ 
          key: `product_${product.id}_specification_${index}_value`, 
          content: spec.value 
        });
      });
      
      // Insérer les entrées dans Supabase
      const { error } = await supabase.from('editable_content').upsert(
        editableFields.map(field => ({
          content_key: field.key,
          content: field.content
        }))
      );
      
      if (error) {
        console.error("Erreur lors de l'initialisation du contenu éditable:", error);
      } else {
        console.log("✅ Contenu éditable initialisé avec succès pour:", product.title);
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation du contenu éditable:", error);
      // Continue avec la création de la page même si l'initialisation échoue
    }

    return { 
      success: true, 
      message: `Page ${slug}.tsx créée avec succès`, 
      routeAdded: routeResult.success,
      routeMessage: routeResult.message,
      slug,
      componentName
    };
  } catch (error) {
    console.error("❌ Erreur lors de la génération de la page:", error);
    return { 
      success: false, 
      message: `Erreur lors de la génération de la page: ${error.message}` 
    };
  }
}

/**
 * Supprime une page produit
 */
async function deleteProductPage(title) {
  try {
    if (!title) {
      return { success: false, message: "Le titre du produit est obligatoire" };
    }

    // Générer le slug à partir du titre
    const slug = slugify(title, { lower: true });
    
    // Définir le chemin du fichier à supprimer
    const pagesDir = path.join(__dirname, "src", "pages", "products");
    const filePath = path.join(pagesDir, `${slug}.tsx`);

    // Vérifier si le fichier existe
    if (!(await fs.pathExists(filePath))) {
      return { 
        success: false, 
        message: `La page ${slug}.tsx n'existe pas`,
        slug
      };
    }

    // Supprimer le fichier
    await fs.remove(filePath);
    
    // Supprimer la route dans App.tsx
    const routeResult = await removeRoute(slug);

    return { 
      success: true, 
      message: `Page ${slug}.tsx supprimée avec succès`,
      routeRemoved: routeResult.success,
      routeMessage: routeResult.message,
      slug
    };
  } catch (error) {
    console.error("❌ Erreur lors de la suppression de la page:", error);
    return { 
      success: false, 
      message: `Erreur lors de la suppression de la page: ${error.message}` 
    };
  }
}

/**
 * Ajoute une nouvelle route dans App.tsx
 */
async function addRoute(slug, componentName) {
  try {
    if (!slug || !componentName) {
      return { 
        success: false, 
        message: "Le slug et le nom du composant sont obligatoires" 
      };
    }

    const appTsxPath = path.join(__dirname, "src", "App.tsx");
    
    // Vérifier si App.tsx existe
    if (!(await fs.pathExists(appTsxPath))) {
      return { 
        success: false, 
        message: "Le fichier App.tsx n'existe pas" 
      };
    }

    // Lire le fichier App.tsx
    let appContent = await fs.readFile(appTsxPath, "utf8");

    // Vérifier si la route existe déjà
    if (appContent.includes(`path="/produits/${slug}"`)) {
      return { 
        success: true, 
        message: `La route pour ${slug} existe déjà` 
      };
    }

    // Ajouter l'import
    const importStatement = `import ${componentName} from "@/pages/products/${slug}";`;
    
    // Trouver le dernier import
    const lastImportIndex = appContent.lastIndexOf('import ');
    if (lastImportIndex === -1) {
      return { 
        success: false, 
        message: "Impossible de trouver la section des imports dans App.tsx" 
      };
    }
    
    const lastImportEndIndex = appContent.indexOf('\n', lastImportIndex);
    appContent = appContent.slice(0, lastImportEndIndex + 1) + 
                importStatement + '\n' + 
                appContent.slice(lastImportEndIndex + 1);

    // Ajouter la route
    const routesEndIndex = appContent.lastIndexOf("</Routes>");
    if (routesEndIndex === -1) {
      return { 
        success: false, 
        message: "Impossible de trouver la balise </Routes> dans App.tsx" 
      };
    }
    
    const beforeRoutesEnd = appContent.substring(0, routesEndIndex);
    const afterRoutesEnd = appContent.substring(routesEndIndex);
    
    const newRoute = `          <Route path="/produits/${slug}" element={<${componentName} />} />\n          `;
    
    appContent = beforeRoutesEnd + newRoute + afterRoutesEnd;

    // Écrire le fichier mis à jour
    await fs.writeFile(appTsxPath, appContent);

    return { 
      success: true, 
      message: `Route pour ${slug} ajoutée avec succès` 
    };
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout de la route:", error);
    return { 
      success: false, 
      message: `Erreur lors de l'ajout de la route: ${error.message}` 
    };
  }
}

/**
 * Supprime une route existante de App.tsx
 */
async function removeRoute(slug) {
  try {
    if (!slug) {
      return { success: false, message: "Le slug est obligatoire" };
    }

    const appTsxPath = path.join(__dirname, "src", "App.tsx");
    
    // Vérifier si App.tsx existe
    if (!(await fs.pathExists(appTsxPath))) {
      return { 
        success: false, 
        message: "Le fichier App.tsx n'existe pas" 
      };
    }

    // Générer le nom du composant basé sur le slug
    const componentName = `Product${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`;

    // Lire le fichier App.tsx
    let appContent = await fs.readFile(appTsxPath, "utf8");

    // Vérifier si la route existe
    if (!appContent.includes(`path="/produits/${slug}"`)) {
      return { 
        success: false, 
        message: `La route pour ${slug} n'existe pas` 
      };
    }

    // Supprimer l'import
    const importRegex = new RegExp(`import\\s+${componentName}\\s+from\\s+["']@/pages/products/${slug}["'];?\\n?`, 'g');
    appContent = appContent.replace(importRegex, '');

    // Supprimer la route
    const routeRegex = new RegExp(`\\s*<Route\\s+path=["']/produits/${slug}["']\\s+element={<${componentName}\\s*/>}\\s*/>\\n?`, 'g');
    appContent = appContent.replace(routeRegex, '');

    // Écrire le fichier mis à jour
    await fs.writeFile(appTsxPath, appContent);

    return { 
      success: true, 
      message: `Route pour ${slug} supprimée avec succès` 
    };
  } catch (error) {
    console.error("❌ Erreur lors de la suppression de la route:", error);
    return { 
      success: false, 
      message: `Erreur lors de la suppression de la route: ${error.message}` 
    };
  }
}

// API pour générer une page produit
app.post('/api/products/create-page', async (req, res) => {
  try {
    console.log('📝 Demande de création de page reçue:', req.body);
    const product = req.body;
    
    if (!product || !product.title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Les données du produit sont incomplètes. Le titre est obligatoire.' 
      });
    }

    // Générer la page produit
    const result = await generateProductPage(product);
    
    if (!result.success) {
      console.log('❌ Échec de création de page:', result.message);
      return res.status(400).json(result);
    }

    console.log('✅ Page produit créée avec succès:', result.slug);
    return res.json(result);
  } catch (error) {
    console.error('❌ Erreur lors de la génération de la page:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Erreur serveur: ${error.message}` 
    });
  }
});

// API pour supprimer une page produit
app.post('/api/products/delete-page', async (req, res) => {
  try {
    console.log('🗑️ Demande de suppression de page reçue:', req.body);
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le titre du produit est obligatoire' 
      });
    }

    // Supprimer la page produit
    const result = await deleteProductPage(title);
    
    if (!result.success) {
      console.log('❌ Échec de suppression de page:', result.message);
      return res.status(400).json(result);
    }

    console.log('✅ Page produit supprimée avec succès:', result.slug);
    return res.json(result);
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de la page:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Erreur serveur: ${error.message}` 
    });
  }
});

// API pour vérifier l'existence des pages produit
app.post('/api/products/check-pages', async (req, res) => {
  try {
    console.log('🔍 Vérification des pages produit:', req.body);
    const { productIds, titles = {} } = req.body;
    
    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({
        success: false,
        message: 'La liste des IDs de produits est obligatoire'
      });
    }
    
    const pagesDir = path.join(__dirname, "src", "pages", "products");
    
    // Vérifier si le dossier existe
    if (!await fs.pathExists(pagesDir)) {
      console.log("⚠️ Le dossier des pages produit n'existe pas:", pagesDir);
      return res.status(200).json({ success: true, exists: {} });
    }
    
    // Obtenir la liste des fichiers dans le répertoire
    const files = await fs.readdir(pagesDir);
    console.log(`📂 ${files.length} fichiers trouvés dans le dossier des pages produit`);
    
    // Créer un objet pour stocker les résultats
    const results = {};
    
    // Vérifier chaque ID de produit
    for (const productId of productIds) {
      const title = titles[productId];
      
      if (title) {
        // Si nous avons le titre, nous pouvons vérifier directement le fichier correspondant
        const slug = slugify(title, { lower: true });
        const fileExists = files.includes(`${slug}.tsx`);
        
        if (fileExists) {
          console.log(`✅ Page trouvée pour le produit "${title}" (ID: ${productId}) via le slug: ${slug}`);
          results[productId] = true;
          continue;
        } else {
          console.log(`⚠️ Aucune page trouvée pour le slug: ${slug} (ID: ${productId})`);
        }
      }
      
      // Si nous n'avons pas trouvé de page par le slug, cherchons par ID dans les fichiers
      results[productId] = false;
      
      for (const file of files) {
        if (!file.endsWith('.tsx')) continue;
        
        // Vérifier si ce fichier contient l'ID du produit
        const filePath = path.join(pagesDir, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          
          if (content.includes(`id: "${productId}"`) || content.includes(`id: '${productId}'`)) {
            console.log(`✅ Page trouvée pour le produit ID: ${productId} dans le fichier: ${file}`);
            results[productId] = true;
            break;
          }
        } catch (fileError) {
          console.error(`❌ Erreur lors de la lecture du fichier ${file}:`, fileError);
        }
      }
    }
    
    // Essayer de vérifier dans Supabase si des contenus éditables existent pour ces produits
    try {
      console.log("🔄 Vérification des contenus éditables dans Supabase...");
      const { supabase } = await import('./src/integrations/supabase/client.js');
      
      // Rechercher des entrées editable_content pour ces produits
      const contentKeys = productIds.map(id => `product_${id}_description`);
      
      const { data, error } = await supabase
        .from('editable_content')
        .select('content_key')
        .in('content_key', contentKeys);
      
      if (error) {
        console.error("❌ Erreur lors de la vérification dans Supabase:", error);
      } else if (data && data.length > 0) {
        console.log(`✅ ${data.length} entrées trouvées dans Supabase`);
        
        // Pour chaque entrée trouvée, extraire l'ID du produit et marquer comme existant
        data.forEach(item => {
          const matches = item.content_key.match(/product_(\d+)_description/);
          if (matches && matches[1]) {
            const productId = matches[1];
            if (!results[productId]) {
              console.log(`✅ Page détectée via Supabase pour le produit ID: ${productId}`);
              results[productId] = true;
            }
          }
        });
      } else {
        console.log("⚠️ Aucune entrée trouvée dans Supabase");
      }
    } catch (supabaseError) {
      console.error("❌ Erreur lors de l'accès à Supabase:", supabaseError);
    }
    
    console.log('📊 Résultat final de la vérification:', 
      `${Object.values(results).filter(Boolean).length}/${productIds.length} pages trouvées`);
    
    return res.status(200).json({ success: true, exists: results });
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des pages produit:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Erreur serveur: ${error.message}` 
    });
  }
});

// Nouvelle route POST pour descriptions basée sur IDs spécifiques
app.post('/api/products/descriptions', async (req, res) => {
  const { productIds } = req.body;

  if (!Array.isArray(productIds)) {
    console.log("⚠️ Request reçue, mais productIds manquant ou invalide", req.body);
    return res.status(400).json({ error: 'productIds manquant ou invalide' });
  }

  console.log(`📥 Requête pour ${productIds.length} descriptions de produits, IDs:`, productIds.slice(0, 5));

  try {
    const pagesDir = path.join(__dirname, "src", "pages", "products");
    const descriptions = {};

    // Vérifier si le dossier existe
    if (!await fs.pathExists(pagesDir)) {
      console.log("⚠️ Le dossier des pages produit n'existe pas:", pagesDir);
      return res.json({ descriptions: {} });
    }

    // On charge d'abord tous les fichiers
    console.log("📂 Lecture du dossier des pages produit:", pagesDir);
    const files = await fs.readdir(pagesDir);
    console.log(`📑 Nombre de fichiers produit trouvés: ${files.length}`);

    let matchedCount = 0;

    // Pour chaque ID demandé, parcourir les fichiers pour trouver la description correspondante
    for (const productId of productIds) {
      let found = false;
      
      // On cherche d'abord dans les fichiers qui pourraient contenir cet ID spécifique
      for (const file of files) {
        if (!file.endsWith('.tsx')) continue;
        
        const filePath = path.join(pagesDir, file);
        
        try {
          const content = await fs.readFile(filePath, "utf-8");
          
          // On cherche spécifiquement cet ID dans le fichier
          const idPattern = new RegExp(`id:\\s*["']${productId}["']`);
          if (idPattern.test(content)) {
            console.log(`  🎯 ID ${productId} trouvé dans le fichier: ${file}`);
            
            // Trouver la description associée
            const demoProductMatch = content.match(/const\s+demoProduct\s*=\s*{([^}]*?description:\s*["']([^]*?)["'](?=,|[\r\n])[^}]*?)}/s);
            
            if (demoProductMatch) {
              let description = demoProductMatch[2].replace(/\\"/g, '"').replace(/\\'/g, "'");
              
              if (description && description.trim() !== '') {
                descriptions[productId] = description.trim();
                matchedCount++;
                found = true;
                console.log(`  📝 Description trouvée pour le produit ID: ${productId}`);
                console.log(`  📝 Début de la description: ${description.substring(0, 50)}...`);
                break; // Sortir de la boucle une fois trouvé
              }
            } else {
              // Pattern alternatif
              const descMatch = content.match(/description:\s*["']([^]*?)["'](?=,|[\r\n])/s);
              
              if (descMatch) {
                let description = descMatch[1].replace(/\\"/g, '"').replace(/\\'/g, "'").trim();
                
                if (description && description.trim() !== '') {
                  descriptions[productId] = description.trim();
                  matchedCount++;
                  found = true;
                  console.log(`  📝 Description alternative trouvée pour le produit ID: ${productId}`);
                  break;
                }
              }
            }
          }
        } catch (fileError) {
          console.error(`❌ Erreur lors de la lecture du fichier ${file}:`, fileError);
        }
      }
      
      if (!found) {
        console.log(`  ⚠️ Aucune description trouvée pour le produit ID: ${productId}`);
      }
    }

    console.log(`\n📊 Statistiques: ${matchedCount}/${productIds.length} descriptions trouvées`);
    
    // Liste un échantillon des descriptions récupérées
    if (Object.keys(descriptions).length > 0) {
      console.log("📋 Échantillon des descriptions récupérées:");
      Object.entries(descriptions).slice(0, 3).forEach(([id, desc]) => {
        console.log(`  - ID: "${id}", Description: ${desc.substring(0, 50)}...`);
      });
    } else {
      console.log("⚠️ Aucune description récupérée !");
    }
    
    // Essayer de récupérer depuis la base Supabase si disponible
    try {
      // S'assurer que la connexion à Supabase est initialisée
      console.log("🔄 Tentative d'accès à Supabase pour récupérer les descriptions manquantes...");
      const { supabase } = await import('./src/integrations/supabase/client.js');
      console.log("✅ Client Supabase importé avec succès");
      
      // Test de connexion à Supabase
      const { data: testData, error: testError } = await supabase
        .from('editable_content')
        .select('content_key')
        .limit(1);
        
      if (testError) {
        console.error("❌ Erreur lors du test de connexion à Supabase:", testError);
      } else {
        console.log("✅ Test de connexion Supabase réussi, données récupérées:", testData);
      }
      
      // Récupérer les descriptions depuis Supabase
      console.log("🔍 Recherche des descriptions dans Supabase pour les IDs manquants...");
      
      const missingIds = productIds.filter(id => !descriptions[id]);
      if (missingIds.length > 0) {
        console.log(`  🔎 Recherche de ${missingIds.length} descriptions manquantes dans Supabase`);
        console.log("  📝 Exemples de clés recherchées:");
        missingIds.slice(0, 3).forEach(id => {
          console.log(`     - product_${id}_description`);
        });
        
        // Construire la requête pour récupérer toutes les entrées contenant "product_X_description"
        const keysToSearch = missingIds.map(id => `product_${id}_description`);
        console.log(`  🔑 Recherche avec ${keysToSearch.length} clés dans Supabase`);
        
        const { data, error } = await supabase
          .from('editable_content')
          .select('content_key, content')
          .in('content_key', keysToSearch);
        
        if (error) {
          console.error("❌ Erreur Supabase:", error);
        } else if (data && data.length > 0) {
          console.log(`  ✅ Trouvé ${data.length} descriptions dans Supabase`);
          console.log("  📝 Échantillon des données Supabase:", data.slice(0, 3));
          
          // Ajouter ces descriptions au résultat
          data.forEach(item => {
            // Extraire l'ID du produit de la clé (format: product_123_description)
            const idMatch = item.content_key.match(/product_(\d+)_description/);
            if (idMatch && idMatch[1]) {
              const id = idMatch[1];
              descriptions[id] = item.content;
              console.log(`  📝 Description Supabase trouvée pour ID: ${id}`);
            } else {
              console.log(`  ⚠️ Format de clé non reconnu: ${item.content_key}`);
            }
          });
        } else {
          console.log("  ⚠️ Aucune description trouvée dans Supabase");
        }
      }
    } catch (supabaseError) {
      console.error("❌ Erreur lors de l'accès à Supabase:", supabaseError);
      console.error("📚 Stack trace:", supabaseError.stack);
    }
    
    // Répondre avec les descriptions trouvées
    console.log(`🔄 Envoi de la réponse avec ${Object.keys(descriptions).length} descriptions au total`);
    res.json({ descriptions });
  } catch (err) {
    console.error("❌ Erreur lors de la lecture des descriptions:", err);
    console.error("📚 Stack trace:", err.stack);
    res.status(500).json({ error: "Impossible de récupérer les descriptions des produits." });
  }
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
app.get('/*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    console.log(`🌐 Requête frontend pour: ${req.path}`);
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// **🚀 Démarrage du serveur**
app.listen(PORT, () => {
    console.log(`🚀 Serveur webhook en ligne sur http://localhost:${PORT}`);
    console.log(`🔌 WebSocket en écoute sur le port ${WS_PORT}`);
    console.log(`📝 API de génération: POST http://localhost:${PORT}/api/products/create-page`);
    console.log(`🗑️ API de suppression: POST http://localhost:${PORT}/api/products/delete-page`);
}).on('error', (error) => {
    console.error('❌ Erreur de démarrage du serveur:', error);
    process.exit(1);
});