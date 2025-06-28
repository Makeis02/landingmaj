require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Parser } = require('json2csv');
const fs = require('fs');

// Utilise les variables d'environnement officielles Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables d\'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // 1. Récupère tous les produits
  const { data: products, error } = await supabase
    .from('products')
    .select('*');

  if (error) {
    console.error('Erreur Supabase:', error);
    process.exit(1);
  }

  // 2. Mappe les produits au format Facebook
  const rows = products.map(prod => ({
    id: prod.id,
    title: prod.title,
    description: prod.description,
    price: (prod.price || 0).toFixed(2) + ' EUR',
    availability: prod.stock > 0 ? 'in stock' : 'out of stock',
    condition: 'new',
    link: `https://aqua-reve.com/produits/${encodeURIComponent(prod.title)}?id=${prod.id}`,
    image_link: prod.image || '',
    brand: prod.brand || '', // Marque incluse
    reference: prod.reference || '',
  }));

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