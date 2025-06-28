require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Parser } = require('json2csv');
const fs = require('fs');
const Stripe = require('stripe');
const slugify = require('slugify');

// Variables d'environnement
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.VITE_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !STRIPE_SECRET_KEY) {
  console.error('❌ Variables d\'environnement manquantes (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY);

// Fonction pour récupérer tous les champs d'un produit (comme dans Modele.tsx)
async function fetchProductFields(productId) {
  try {
    const searchKey = `product_${productId}_%`;
    console.log(`  🔍 Recherche clés: ${searchKey}`);
    
    const { data, error } = await supabase
      .from('editable_content')
      .select('content_key, content')
      .like('content_key', searchKey);

    if (error) {
      console.warn(`⚠️  [${productId}] Erreur Supabase: ${error.message}`);
      return {};
    }

    console.log(`  ✅ ${data.length} champs trouvés`);
    
    // Créer un objet avec tous les champs
    const fields = {};
    data.forEach(item => {
      const fieldName = item.content_key.replace(`product_${productId}_`, '');
      fields[fieldName] = item.content;
    });

    return fields;
  } catch (error) {
    console.warn(`⚠️  [${productId}] Erreur récupération champs: ${error.message}`);
    return {};
  }
}

// Fonction pour récupérer le prix avec la même logique que Modele.tsx
async function getProductPrice(productId, fields) {
  try {
    console.log(`  🎯 [${productId}] === SÉLECTION INTELLIGENTE DU PRIX ===`);
    
    // 1. Récupérer tous les prix Stripe pour ce produit
    const prices = await stripe.prices.list({
      product: productId,
      active: true
    });

    if (!prices.data || prices.data.length === 0) {
      console.log(`  ❌ [${productId}] Aucun prix Stripe trouvé`);
      return null;
    }

    console.log(`  📋 [${productId}] Prix disponibles:`, prices.data.map(p => ({
      id: p.id,
      active: p.active,
      is_discount: p.metadata?.is_discount,
      amount: p.unit_amount,
      lookup_key: p.lookup_key
    })));

    // 2. Logique de sélection intelligente : PROMO > NORMAL > FALLBACK (comme dans Modele.tsx)
    
    // Recherche prioritaire : Prix promo actif d'abord !
    const promoPrice = prices.data.find(p => 
      p.active && p.metadata?.is_discount === 'true'
    );
    
    // Prix normal (non promo)
    const basePrice = prices.data.find(p => 
      p.active && p.metadata?.is_discount !== 'true'
    );
    
    // Fallback : n'importe quel prix actif
    const fallbackPrice = prices.data.find(p => p.active) || prices.data[0];

    // Sélection finale : PROMO en priorité !
    const selectedPrice = promoPrice || basePrice || fallbackPrice;

    console.log(`  🔍 [${productId}] Analyse des prix:`);
    console.log(`    🎉 Prix promo trouvé:`, promoPrice ? `${promoPrice.id} (${promoPrice.unit_amount/100}€)` : "❌ Aucun");
    console.log(`    💰 Prix normal trouvé:`, basePrice ? `${basePrice.id} (${basePrice.unit_amount/100}€)` : "❌ Aucun");
    console.log(`    🔄 Fallback trouvé:`, fallbackPrice ? `${fallbackPrice.id} (${fallbackPrice.unit_amount/100}€)` : "❌ Aucun");
    console.log(`    🎯 Prix SÉLECTIONNÉ:`, selectedPrice ? `${selectedPrice.id} (${selectedPrice.unit_amount/100}€) - ${selectedPrice.metadata?.is_discount === 'true' ? 'PROMO 🎉' : 'NORMAL 💰'}` : "❌ Aucun");

    if (!selectedPrice) {
      console.warn(`⚠️  [${productId}] Aucun prix actif trouvé`);
      return null;
    }

    // 3. Déterminer le type de prix et récupérer les infos promo
    const isPromo = selectedPrice.metadata?.is_discount === 'true';
    const priceInEuros = selectedPrice.unit_amount / 100;

    if (isPromo) {
      // Pour les prix promo, récupérer le pourcentage de réduction depuis Supabase
      const discountPercentage = fields.discount_percentage;
      const discountPrice = fields.discount_price;
      
      if (discountPercentage && discountPrice) {
        console.log(`  🎉 [${productId}] Prix promo avec réduction: ${discountPrice}€ (-${discountPercentage}%)`);
        return {
          amount: parseFloat(discountPrice),
          originalAmount: priceInEuros, // Prix Stripe = prix original
          isPromo: true,
          discountPercentage: parseFloat(discountPercentage),
          stripePriceId: selectedPrice.id
        };
      } else {
        console.log(`  ℹ️  [${productId}] Prix promo sans pourcentage, utilisation du prix normal`);
        // Si pas de pourcentage de réduction défini, utiliser le prix normal
        const normalPrice = basePrice || fallbackPrice;
        if (normalPrice) {
          return {
            amount: normalPrice.unit_amount / 100,
            originalAmount: normalPrice.unit_amount / 100,
            isPromo: false,
            discountPercentage: null,
            stripePriceId: normalPrice.id
          };
        }
      }
    }

    // Prix normal
    console.log(`  💰 [${productId}] Prix normal: ${priceInEuros}€`);
    return {
      amount: priceInEuros,
      originalAmount: priceInEuros,
      isPromo: false,
      discountPercentage: null,
      stripePriceId: selectedPrice.id
    };

  } catch (error) {
    console.warn(`⚠️  [${productId}] Erreur récupération prix: ${error.message}`);
    return null;
  }
}

// Fonction pour vérifier si un produit a des variantes
function hasVariants(fields) {
  return fields['variant_0_label'] !== undefined;
}

// Fonction pour récupérer les prix des variantes (comme dans Modele.tsx)
function getVariantPriceRange(fields) {
  const variantPrices = [];
  
  // Chercher toutes les variantes
  let variantIndex = 0;
  while (fields[`variant_${variantIndex}_price_map`]) {
    try {
      const priceMap = JSON.parse(fields[`variant_${variantIndex}_price_map`]);
      const prices = Object.values(priceMap).filter(p => typeof p === 'number' && !isNaN(p));
      variantPrices.push(...prices);
      variantIndex++;
    } catch (error) {
      console.warn(`⚠️  Erreur parsing price_map pour variant ${variantIndex}:`, error.message);
      variantIndex++;
    }
  }
  
  if (variantPrices.length > 0) {
    return {
      min: Math.min(...variantPrices),
      max: Math.max(...variantPrices)
    };
  }
  
  return null;
}

// Fonction pour récupérer la marque d'un produit depuis product_brands
async function fetchProductBrand(productId) {
  try {
    console.log(`  🏷️  [${productId}] Récupération de la marque...`);
    
    // Récupérer la marque depuis product_brands
    const { data: brandData, error: brandError } = await supabase
      .from('product_brands')
      .select('brand_id')
      .eq('product_id', productId)
      .maybeSingle();

    if (brandError) {
      console.warn(`⚠️  [${productId}] Erreur récupération marque: ${brandError.message}`);
      return null;
    }

    if (!brandData) {
      console.log(`  ℹ️  [${productId}] Aucune marque associée`);
      return null;
    }

    // Récupérer les détails de la marque
    const { data: brandDetails, error: detailsError } = await supabase
      .from('brands')
      .select('name')
      .eq('id', brandData.brand_id)
      .single();

    if (detailsError) {
      console.warn(`⚠️  [${productId}] Erreur récupération détails marque: ${detailsError.message}`);
      return null;
    }

    console.log(`  ✅ [${productId}] Marque trouvée: ${brandDetails.name}`);
    return brandDetails.name;

  } catch (error) {
    console.warn(`⚠️  [${productId}] Erreur récupération marque: ${error.message}`);
    return null;
  }
}

async function generateCatalog() {
  try {
    console.log('🔎 Récupération des produits Stripe...');
    
    // Récupérer tous les produits Stripe
    const products = await stripe.products.list({
      limit: 100,
      active: true
    });

    console.log(`✅ ${products.data.length} produits Stripe trouvés\n`);

    const rows = [];
    let addedCount = 0;
    let ignoredCount = 0;

    // Traiter chaque produit Stripe
    for (const stripeProduct of products.data) {
      console.log(`➡️  Traitement produit Stripe: ${stripeProduct.id} (${stripeProduct.name})`);
      
      // Récupérer tous les champs du produit depuis Supabase
      const fields = await fetchProductFields(stripeProduct.id);
      
      // Récupérer la marque depuis product_brands
      const brand = await fetchProductBrand(stripeProduct.id);
      
      // Vérifier s'il a des variantes
      const hasProductVariants = hasVariants(fields);
      const variantPriceRange = hasProductVariants ? getVariantPriceRange(fields) : null;
      
      // Récupérer le prix avec la logique de Modele.tsx
      const priceInfo = await getProductPrice(stripeProduct.id, fields);
      
      // Extraire les valeurs des champs
      const title = fields.title || stripeProduct.name;
      const description = fields.description || stripeProduct.description || '';
      const stock = fields.stock;
      const reference = fields.reference;
      
      // Récupérer l'image principale
      let image = '';
      if (fields.image_0) {
        image = fields.image_0;
      } else if (stripeProduct.images && stripeProduct.images.length > 0) {
        image = stripeProduct.images[0];
      }

      console.log(`   - title: ${title}`);
      console.log(`   - price: ${priceInfo ? (priceInfo.amount) + '€' + (priceInfo.isPromo ? ' (PROMO)' : '') : 'undefined'}`);
      if (priceInfo && priceInfo.isPromo) {
        console.log(`   - originalPrice: ${priceInfo.originalAmount}€`);
        console.log(`   - discountPercentage: ${priceInfo.discountPercentage}%`);
      }
      console.log(`   - stock: ${stock}`);
      console.log(`   - image: ${image}`);
      console.log(`   - brand: ${brand || 'Aucune'}`);
      console.log(`   - reference: ${reference}`);
      console.log(`   - hasVariants: ${hasProductVariants}`);
      if (variantPriceRange) {
        console.log(`   - variantPriceRange: ${variantPriceRange.min}€ - ${variantPriceRange.max}€`);
      }

      // Vérifier que les champs obligatoires sont présents et non vides
      if (!title || !priceInfo || !description || !brand || !image) {
        let missing = [];
        if (!title) missing.push('title');
        if (!priceInfo) missing.push('price');
        if (!description) missing.push('description');
        if (!brand) missing.push('brand');
        if (!image) missing.push('image');
        console.log(`   ❌ Produit ignoré (champ obligatoire manquant: ${missing.join(', ')})\n`);
        ignoredCount++;
        continue;
      }

      // Déterminer la disponibilité
      const stockNum = parseInt(stock) || 0;
      const availability = stockNum > 0 ? 'in stock' : 'out of stock';

      // Générer le slug SEO-friendly à partir du titre
      const slug = slugify(title, { lower: true, strict: true });
      const link = `https://aqua-reve.com/produits/${slug}?id=${stripeProduct.id}`;
      console.log(`   - link: ${link}`);

      // Créer la ligne du CSV avec gestion des prix barrés et variantes
      const row = {
        id: stripeProduct.id,
        title: title,
        description: description.replace(/<[^>]*>/g, ''), // Nettoyer le HTML
        price: `${priceInfo.amount.toFixed(2)} EUR`,
        availability: availability,
        condition: 'new',
        link: link,
        image_link: image,
        brand: brand || '',
        reference: reference || ''
      };

      // Ajouter les champs pour les prix barrés si promo (comme dans Modele.tsx)
      if (priceInfo.isPromo && priceInfo.discountPercentage) {
        // Utiliser le prix original réel (comme dans Modele.tsx)
        row.sale_price = `${priceInfo.amount.toFixed(2)} EUR`;
        row.price = `${priceInfo.originalAmount.toFixed(2)} EUR`;
        console.log(`   🎉 Prix barré: ${priceInfo.originalAmount.toFixed(2)}€ → ${priceInfo.amount.toFixed(2)}€ (-${priceInfo.discountPercentage}%)`);
      }

      // Ajouter les champs pour les variantes si applicable
      if (hasProductVariants && variantPriceRange) {
        row.title = `${title} (Variantes disponibles)`;
        row.price = `${variantPriceRange.min.toFixed(2)} EUR`;
        row.sale_price = `${variantPriceRange.max.toFixed(2)} EUR`;
        console.log(`   🔄 Produit avec variantes: ${variantPriceRange.min}€ - ${variantPriceRange.max}€`);
      }

      rows.push(row);
      console.log(`   ✅ Produit ajouté au catalogue\n`);
      addedCount++;
    }

    // Générer le CSV avec tous les champs possibles
    const parser = new Parser({
      fields: ['id', 'title', 'description', 'price', 'sale_price', 'availability', 'condition', 'link', 'image_link', 'brand', 'reference']
    });

    const csv = parser.parse(rows);
    fs.writeFileSync('public/facebook-catalog.csv', csv);

    console.log('🎉 CSV généré dans public/facebook-catalog.csv');
    console.log(`Résumé: ${addedCount} produits ajoutés, ${ignoredCount} ignorés`);

  } catch (error) {
    console.error('❌ Erreur lors de la génération du catalogue:', error);
    process.exit(1);
  }
}

generateCatalog(); 