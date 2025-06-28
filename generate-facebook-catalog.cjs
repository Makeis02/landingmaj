require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Parser } = require('json2csv');
const fs = require('fs');
const Stripe = require('stripe');

// Variables d'environnement
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.VITE_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !STRIPE_SECRET_KEY) {
  console.error('❌ Variables d\'environnement manquantes (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

async function main() {
  // 1. Récupère tous les produits Stripe
  const stripeProducts = await stripe.products.list({ limit: 100 }); // adapte le limit si besoin

  const rows = [];

  for (const stripeProduct of stripeProducts.data) {
    // 2. Récupère les infos enrichies dans Supabase via l'ID Stripe
    const { data: supaProduct, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', stripeProduct.id)
      .single();

    if (error || !supaProduct) {
      // Si pas trouvé dans Supabase, saute ce produit
      continue;
    }

    // 3. Ajoute la ligne au CSV
    rows.push({
      id: stripeProduct.id,
      title: supaProduct.title || stripeProduct.name,
      description: supaProduct.description || '',
      price: (supaProduct.price || 0).toFixed(2) + ' EUR',
      availability: supaProduct.stock > 0 ? 'in stock' : 'out of stock',
      condition: 'new',
      link: `https://aqua-reve.com/produits/${encodeURIComponent(supaProduct.title || stripeProduct.name)}?id=${stripeProduct.id}`,
      image_link: supaProduct.image || '',
      brand: supaProduct.brand || '',
      reference: supaProduct.reference || '',
    });
  }

  // 4. Génère le CSV
  const fields = [
    'id', 'title', 'description', 'price', 'availability', 'condition',
    'link', 'image_link', 'brand', 'reference'
  ];
  const parser = new Parser({ fields });
  const csv = parser.parse(rows);

  // 5. Écrit le fichier dans /public
  fs.writeFileSync('./public/facebook-catalog.csv', csv, 'utf8');
  console.log('✅ CSV généré dans public/facebook-catalog.csv');
}

main(); 