// Serveur Express minimal avec gestion Stripe et fichiers .tsx
import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import slugify from 'slugify';
import Stripe from 'stripe';
import { toComponentName } from './src/lib/utils/componentNames.js';
import { addRoute, removeRoute } from './src/lib/utils/routeGenerator.js';
import { supabase } from './src/integrations/supabase/client.js';
import cors from 'cors';

console.log("📦 Lancement du serveur Express...");
console.log("🌍 Railway ENV chargé ?");
console.log("🔑 STRIPE_SECRET_KEY OK:", !!process.env.STRIPE_SECRET_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
  timeout: 10000 // 10 secondes
});

// Stripe Webhook: doit être AVANT TOUS les middlewares
app.post('/api/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Erreur de signature webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gère l'événement de paiement réussi
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    // Ici, tu peux mettre à jour la commande dans Supabase, etc.
    console.log('✅ Paiement reçu, session:', session.id, 'metadata:', session.metadata);
    // ... ta logique métier ici ...
  }

  res.status(200).json({ received: true });
});

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'http://192.168.1.14:8080',
  'https://majemsiteteste.netlify.app',
  'https://landingmaj.onrender.com',
  'https://landingmaj-production.up.railway.app',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      console.log("✅ Origine autorisée:", origin);
      return callback(null, true);
    }
    console.warn("⛔ Blocage CORS pour l'origine:", origin);
    console.log("🧾 Liste des origines autorisées:", allowedOrigins);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.options('*', cors()); // Gère les requêtes OPTIONS pour toutes les routes

// 🔍 Log middleware universel pour diagnostiquer les requêtes
app.use((req, res, next) => {
  console.log("🔍 Nouvelle requête reçue:");
  console.log("➡️ Méthode:", req.method);
  console.log("➡️ URL:", req.originalUrl);
  console.log("➡️ Origin:", req.headers.origin);
  console.log("➡️ Headers:", req.headers);
  next();
});

app.use(bodyParser.json());

// 🔧 Route de test simple pour vérifier que le serveur fonctionne
app.get('/api/ping', (_, res) => {
  console.log('🏓 Ping reçu - Serveur fonctionne !');
  res.json({ message: 'pong 🎯', timestamp: new Date().toISOString() });
});

// 🔧 Correction CORS explicite pour OPTIONS (préflight)

// 1. Récupérer les produits Stripe - TEMPORAIREMENT COMMENTÉ
/*
app.get('/api/stripe/products', cors(), async (_, res) => {
  console.log('⚡ Requête entrante vers /api/stripe/products');
  console.log('📥 Requête reçue pour /api/stripe/products');
  console.log("📦 Tentative de récupération des produits Stripe");
  
  try {
    // 🛠️ SOLUTION RAPIDE TEMPORAIRE: Récupère uniquement les IDs des produits
    const stripeProducts = await stripe.products.list({ limit: 5 });
    console.log(`✅ ${stripeProducts.data.length} produits récupérés depuis Stripe`);
    console.log(`🛍️ ${stripeProducts.data.length} produits récupérés depuis Stripe`);

    // 🛠️ MAPPING SIMPLE sans appels lourds
    const products = stripeProducts.data.map(p => ({
      id: p.id,
      title: p.name,
      price: 0, // pas de prix
      image: p.images[0] || '',
      description: p.description || '',
      brand: p.metadata?.brand || '',
      reference: p.metadata?.reference || '',
      metadata: p.metadata,
      variantStocks: {}, // pas de stocks
      stock: 0 // pas de stock non plus
    }));

    console.log("✅ Produits renvoyés:", products.length, "produits");
    console.log('✅ Envoi des produits au frontend');
    res.json({ products });
  } catch (err) {
    console.error("❌ Erreur Stripe:", err.message);
    console.error('❌ Erreur Stripe :', err.message);
    console.error('❌ Erreur Stripe:', err);
    console.error(err);
    res.status(500).json({ error: 'Stripe error', message: err.message });
  }
});
*/
    
// 2. Créer un fichier .tsx pour chaque produit - TEMPORAIREMENT COMMENTÉ
/*
app.post('/api/products/create-page', async (req, res) => {
  // Cette API est conservée pour rétrocompatibilité mais ne crée plus de fichiers .tsx
  const p = req.body;
  const slug = p.title.toLowerCase().replace(/\s+/g, '').replace(/[^\w-]/g, '');
  
  // Fournir un slug pour les utilisateurs existants de l'API
  res.json({ 
    success: true, 
    slug,
    message: "Mode dynamique activé - Pas de fichier généré",
    note: "Utilisez /produits/:slug?id=PRODUCT_ID pour accéder dynamiquement aux produits"
  });
});
*/

// 3. Supprimer un fichier .tsx produit - TEMPORAIREMENT COMMENTÉ
/*
app.post('/api/products/delete-page', async (req, res) => {
  res.json({ 
    success: true, 
    message: "Mode dynamique activé - Pas besoin de supprimer des fichiers" 
  });
});
*/

// 4. Vérifier si une page produit existe - TEMPORAIREMENT COMMENTÉ
/*
app.post('/api/products/check-pages', async (req, res) => {
    const { productIds, titles = {} } = req.body;
  const pagesDir = path.join(__dirname, 'src/pages/products');
  const files = await fs.pathExists(pagesDir) ? await fs.readdir(pagesDir) : [];
    const results = {};
    
  for (const id of productIds) {
    const slug = titles[id] ? slugify(titles[id], { lower: true }) : null;
    const match = slug && files.includes(`${slug}.tsx`);
    results[id] = match || false;

    if (!match) {
      for (const file of files) {
        const content = await fs.readFile(path.join(pagesDir, file), 'utf-8');
        if (content.includes(`id: "${id}"`) || content.includes(`id: '${id}'`)) {
          results[id] = true;
            break;
          }
      }
    }
    }
    
  // Supabase fallback
  const keys = productIds.map(id => `product_${id}_description`);
  const { data } = await supabase.from('editable_content').select('content_key').in('content_key', keys);
  data.forEach(row => {
    const match = row.content_key.match(/product_(.+)_description/);
    if (match && !results[match[1]]) results[match[1]] = true;
  });

  res.json({ exists: results });
});
*/

// 5. Extraire les descriptions - TEMPORAIREMENT COMMENTÉ
/*
app.post('/api/products/descriptions', async (req, res) => {
  const { productIds } = req.body;
  const pagesDir = path.join(__dirname, 'src/pages/products');
    const descriptions = {};
  const files = await fs.pathExists(pagesDir) ? await fs.readdir(pagesDir) : [];

  for (const id of productIds) {
      for (const file of files) {
      const content = await fs.readFile(path.join(pagesDir, file), 'utf-8');
      if (content.includes(`id: "${id}"`) || content.includes(`id: '${id}'`)) {
        const match = content.match(/description:\s*['"]([^'"]*)['"]?/);
        if (match) descriptions[id] = match[1];
                  break;
                }
              }
            }

  const keys = productIds.filter(id => !descriptions[id]).map(id => `product_${id}_description`);
  const { data } = await supabase.from('editable_content').select('content_key, content').in('content_key', keys);
  data.forEach(row => {
    const match = row.content_key.match(/product_(.+)_description/);
    if (match) descriptions[match[1]] = row.content;
  });

    res.json({ descriptions });
});
*/

// 🧪 Logger de routes pour débug
console.log("📋 Liste des routes Express déclarées :");
try {
  app._router.stack
    .filter(r => r.route)
    .forEach(r => {
      console.log(`➡️ ${Object.keys(r.route.methods).join(', ').toUpperCase()} ${r.route.path}`);
    });
} catch (error) {
  console.error("❌ Erreur lors de l'affichage des routes:", error);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur http://0.0.0.0:${PORT}`);
  console.log("🔐 Origines CORS autorisées :", allowedOrigins);
});
