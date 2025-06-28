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

async function getEditableField(productId, field) {
  const key = `product_${productId}_${field}`;
  const { data } = await supabase
    .from('editable_content')
    .select('content')
    .eq('content_key', key)
    .single();
  return data?.content || '';
}

async function main() {
  // 1. Récupère tous les produits Stripe
  const stripeProducts = await stripe.products.list({ limit: 100 });

  const rows = [];

  for (const stripeProduct of stripeProducts.data) {
    const id = stripeProduct.id;

    // 2. Récupère chaque champ dans editable_content
    const title = await getEditableField(id, 'title') || stripeProduct.name;
    const description = await getEditableField(id, 'description');
    const price = await getEditableField(id, 'price');
    const stock = await getEditableField(id, 'stock');
    const image = await getEditableField(id, 'image_0');
    const brand = await getEditableField(id, 'brand');
    const reference = await getEditableField(id, 'reference');

    // Si pas de titre ou de prix, on saute le produit (optionnel)
    if (!title || !price) continue;

    rows.push({
      id,
      title,
      description,
      price: Number(price).toFixed(2) + ' EUR',
      availability: Number(stock) > 0 ? 'in stock' : 'out of stock',
      condition: 'new',
      link: `https://aqua-reve.com/produits/${encodeURIComponent(title)}?id=${id}`,
      image_link: image,
      brand,
      reference,
    });
  }

  // 3. Génère le CSV
  const fields = [
    'id', 'title', 'description', 'price', 'availability', 'condition',
    'link', 'image_link', 'brand', 'reference'
  ];
  const parser = new Parser({ fields });
  const csv = parser.parse(rows);

  // 4. Écrit le fichier dans /public
  fs.writeFileSync('./public/facebook-catalog.csv', csv, 'utf8');
  console.log('✅ CSV généré dans public/facebook-catalog.csv');
}

main(); 