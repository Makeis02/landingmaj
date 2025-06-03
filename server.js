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
import dotenv from 'dotenv';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Charger les variables d'environnement
console.log('📂 Chargement du fichier .env:', path.join(__dirname, '.env'));
try {
  // Charge .env en forçant le chemin absolu
  dotenv.config({ path: path.resolve(__dirname, '.env') });
  console.log('✅ Variables d\'environnement chargées avec succès');
  console.log("🔑 Stripe key chargée:", process.env.STRIPE_SECRET_KEY?.substring(0, 5) + '...');
} catch (error) {
  console.error('❌ Erreur lors du chargement des variables d\'environnement:', error);
}

const app = express();
const PORT = process.env.PORT || 3000;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'http://192.168.1.14:8080',
  'https://majemsiteteste.netlify.app',
  'https://landingmaj.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('⛔ Origine refusée :', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(bodyParser.json());

// 1. Récupérer les produits Stripe
console.log('[DEBUG] Route enregistrée : /api/stripe/products');
app.get('/api/stripe/products', async (_, res) => {
  try {
    const stripeProducts = await stripe.products.list({ expand: ['data.default_price'], active: true });
    const products = [];
    for (const p of stripeProducts.data) {
      // Récupérer les stocks par variante (price)
      const prices = await stripe.prices.list({ product: p.id });
      const priceStocks = {};
      prices.data.forEach(price => {
        if (price.lookup_key && price.metadata?.stock) {
          priceStocks[price.lookup_key] = Number(price.metadata.stock);
        }
      });
      products.push({
        id: p.id,
        title: p.name,
        price: p.default_price?.unit_amount / 100 || 0,
        image: p.images[0] || '',
        description: p.description || '',
        brand: p.metadata?.brand || '',
        reference: p.metadata?.reference || '',
        metadata: p.metadata,
        variantStocks: priceStocks,
        stock: Number(p.metadata?.stock) || 0
      });
    }
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Stripe error', message: err.message });
  }
});
    
// 2. Créer un fichier .tsx pour chaque produit
// DEPRECATED: Remplacé par une approche dynamique sans génération de fichiers
console.log('[DEBUG] Route enregistrée : /api/products/create-page');
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

// 3. Supprimer un fichier .tsx produit
// DEPRECATED: Remplacé par une approche dynamique sans génération de fichiers
console.log('[DEBUG] Route enregistrée : /api/products/delete-page');
app.post('/api/products/delete-page', async (req, res) => {
  res.json({ 
    success: true, 
    message: "Mode dynamique activé - Pas besoin de supprimer des fichiers" 
  });
});

// 4. Vérifier si une page produit existe (fichier ou Supabase)
console.log('[DEBUG] Route enregistrée : /api/products/check-pages');
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

// 5. Extraire les descriptions depuis fichiers .tsx ou Supabase
console.log('[DEBUG] Route enregistrée : /api/products/descriptions');
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

app.listen(PORT, () => {
  console.log(`🚀 Serveur en ligne sur http://localhost:${PORT}`);
});
