#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * Script pour appliquer les améliorations de gestion des promotions 
 * à tous les composants qui affichent des produits
 */

console.log('🚀 Application des améliorations promotions...\n');

// Fonction utilitaire pour lire un fichier
async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    console.error(`❌ Erreur lecture ${filePath}:`, error.message);
    return null;
  }
}

// Fonction utilitaire pour écrire un fichier
async function writeFile(filePath, content) {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`✅ Fichier mis à jour: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur écriture ${filePath}:`, error.message);
    return false;
  }
}

// Fonction pour ajouter les imports nécessaires
function addPromoImports(content) {
  // Vérifier si getPriceIdForProduct est déjà importé
  if (!content.includes('getPriceIdForProduct')) {
    // Trouver la ligne d'import de PromoBadge et ajouter après
    const promoBadgeImportMatch = content.match(/(import PromoBadge from.*?;)/);
    if (promoBadgeImportMatch) {
      const newImport = `${promoBadgeImportMatch[1]}\nimport { getPriceIdForProduct } from '@/lib/stripe/getPriceIdFromSupabase';`;
      content = content.replace(promoBadgeImportMatch[1], newImport);
    } else {
      // Ajouter l'import après les autres imports
      const lastImportMatch = content.match(/(import.*?from.*?;)(?=\n\n)/);
      if (lastImportMatch) {
        const newImport = `${lastImportMatch[1]}\nimport { getPriceIdForProduct } from '@/lib/stripe/getPriceIdFromSupabase';`;
        content = content.replace(lastImportMatch[1], newImport);
      }
    }
  }
  return content;
}

// Fonction pour ajouter getDiscountedPrice au destructuring de useCartStore
function addGetDiscountedPrice(content) {
  // Chercher l'appel à useCartStore et ajouter getDiscountedPrice s'il n'est pas présent
  const cartStoreMatch = content.match(/const\s*{\s*([^}]*)\s*}\s*=\s*useCartStore\(\)/);
  if (cartStoreMatch && !cartStoreMatch[1].includes('getDiscountedPrice')) {
    const currentDestructure = cartStoreMatch[1].trim();
    const newDestructure = currentDestructure 
      ? `${currentDestructure}, getDiscountedPrice`
      : 'getDiscountedPrice';
    content = content.replace(cartStoreMatch[0], `const { ${newDestructure} } = useCartStore()`);
  }
  return content;
}

// Fonction pour ajouter les états pour les prix promos
function addPromoStates(content) {
  // Chercher après les autres useState et ajouter promoPrices si pas présent
  if (!content.includes('promoPrices')) {
    const lastUseStateMatch = content.match(/(const \[.*?\] = useState.*?;)/g);
    if (lastUseStateMatch && lastUseStateMatch.length > 0) {
      const lastUseState = lastUseStateMatch[lastUseStateMatch.length - 1];
      const newState = `${lastUseState}\n  const [promoPrices, setPromoPrices] = useState<Record<string, any>>({});`;
      content = content.replace(lastUseState, newState);
    }
  }
  return content;
}

// Fonction pour ajouter l'useEffect de préchargement des promos
function addPromoUseEffect(content) {
  if (!content.includes('fetchPromos')) {
    // Chercher un useEffect existant et ajouter après
    const useEffectMatch = content.match(/(useEffect\(\(\) => {[\s\S]*?}, \[.*?\]\);)/);
    if (useEffectMatch) {
      const promoUseEffect = `
  useEffect(() => {
    // Précharger les prix promos pour les produits sans variante
    const fetchPromos = async () => {
      const promos: Record<string, any> = {};
      for (const p of displayedProducts) {
        if (!p.hasVariant) {
          const promo = await getDiscountedPrice(p.id);
          if (promo && promo.discount_percentage) {
            promos[p.id] = promo;
          }
        }
      }
      setPromoPrices(promos);
    };
    
    if (displayedProducts.length > 0) {
      fetchPromos();
    }
  }, [displayedProducts, getDiscountedPrice]);

${useEffectMatch[0]}`;
      content = content.replace(useEffectMatch[0], promoUseEffect);
    }
  }
  return content;
}

// Template pour la fonction handleAddToCart complète
const handleAddToCartTemplate = `
  // 🎯 FONCTION : Gestion complète de l'ajout au panier avec promotions
  const handleAddToCart = async (product) => {
    if (!product) return;
    
    let variant = null;
    let stripePriceId = null;
    let stripeDiscountPriceId = null;
    let finalPrice = product.price;
    let originalPrice = undefined;
    let discountPercentage = undefined;
    let hasDiscountApplied = false;
    
    const priceInfo = await getDiscountedPrice(product.id);
    
    if (priceInfo) {
      finalPrice = priceInfo.price;
      if (priceInfo.discount_percentage) {
        originalPrice = priceInfo.original_price;
        discountPercentage = priceInfo.discount_percentage;
        stripeDiscountPriceId = priceInfo.stripe_discount_price_id;
        hasDiscountApplied = true;
      }
      if (priceInfo.stripe_discount_price_id && !priceInfo.discount_percentage) {
        stripePriceId = priceInfo.stripe_discount_price_id;
      }
    }
    
    if (!stripePriceId) {
      const { data: priceIdData } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', \`product_\${product.id}_stripe_price_id\`)
        .single();
      if (priceIdData?.content) {
        stripePriceId = priceIdData.content;
      }
    }
    
    if (!stripePriceId || stripePriceId === "null") {
      console.error(\`❌ Aucun stripe_price_id trouvé pour le produit \${product.id}\`);
      toast({
        variant: "destructive",
        title: "Erreur de configuration",
        description: "Ce produit n'a pas de prix Stripe configuré."
      });
      return;
    }
    
    const { data: stockData } = await supabase
      .from('editable_content')
      .select('content')
      .eq('content_key', \`product_\${product.id}_stock\`)
      .single();
    
    const stock = stockData ? parseInt(stockData.content) : 0;
    if (stock === 0) {
      toast({
        variant: "destructive",
        title: "Rupture de stock",
        description: "Ce produit est en rupture de stock."
      });
      return;
    }
    
    try {
      await addItem({
        id: product.id,
        price: finalPrice,
        title: product.title,
        image_url: product.image || "",
        quantity: 1,
        variant: variant,
        stripe_price_id: stripePriceId,
        stripe_discount_price_id: stripeDiscountPriceId,
        original_price: originalPrice,
        discount_percentage: discountPercentage,
        has_discount: hasDiscountApplied
      });

      toast({
        title: "Produit ajouté au panier",
        description: hasDiscountApplied 
          ? \`\${product.title} a été ajouté à votre panier avec \${discountPercentage}% de réduction !\`
          : \`\${product.title} a été ajouté à votre panier.\`,
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout au panier:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter le produit au panier."
      });
    }
  };
`;

// Fonction pour ajouter la fonction handleAddToCart
function addHandleAddToCart(content) {
  if (!content.includes('handleAddToCart')) {
    // Chercher avant la première fonction de rendu ou de return
    const functionMatch = content.match(/(const \w+ = .*?=> {|function \w+\(.*?\) {)/);
    if (functionMatch) {
      content = content.replace(functionMatch[0], `${handleAddToCartTemplate}\n\n  ${functionMatch[0]}`);
    }
  }
  return content;
}

// Template pour l'affichage des prix avec promotions
const promoPriceDisplayTemplate = `{product.variantPriceRange ? (
                    \`De \${product.variantPriceRange.min.toFixed(2)} € à \${product.variantPriceRange.max.toFixed(2)} €\`
                  ) : (
                    (() => {
                      const promo = promoPrices[product.id];
                      const isPromo = !!promo && promo.discount_percentage;
                      
                      if (isPromo) {
                        return (
                          <>
                            <span className="text-gray-500 line-through mr-2">{\${promo.original_price.toFixed(2)}€</span>
                            <span className="text-red-600 font-semibold">{\${promo.price.toFixed(2)}€</span>
                            <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">-{\${promo.discount_percentage}%</span>
                          </>
                        );
                      } else {
                        return \`\${product.price?.toFixed(2)} €\`;
                      }
                    })()
                  )}`;

// Fonction pour mettre à jour l'affichage des prix
function updatePriceDisplay(content) {
  // Chercher les affichages de prix simples et les remplacer
  const simplePriceMatch = content.match(/{\$?product\.price.*?\.toFixed\(2\).*?€}/g);
  if (simplePriceMatch) {
    // Remplacer par le template avec gestion des promos
    content = content.replace(simplePriceMatch[0], promoPriceDisplayTemplate);
  }
  return content;
}

// Fonction pour mettre à jour les appels d'ajout au panier
function updateAddToCartCalls(content) {
  // Chercher les onClick avec addItem basique et les remplacer
  const basicAddItemMatch = content.match(/onClick=\{.*?addItem\(\{[\s\S]*?\}\)[\s\S]*?\}/);
  if (basicAddItemMatch) {
    content = content.replace(basicAddItemMatch[0], 'onClick={() => handleAddToCart(product)}');
  }
  return content;
}

// Fonction principale pour traiter un fichier
async function processFile(filePath) {
  console.log(`🔄 Traitement de ${filePath}...`);
  
  let content = await readFile(filePath);
  if (!content) return false;

  // Vérifier si le fichier contient des produits avec prix
  if (!content.includes('product.price') && !content.includes('addItem')) {
    console.log(`⏭️  Ignoré (pas de gestion de produits): ${filePath}`);
    return true;
  }

  let modified = false;
  const originalContent = content;

  // Appliquer les transformations
  content = addPromoImports(content);
  content = addGetDiscountedPrice(content);
  content = addPromoStates(content);
  content = addPromoUseEffect(content);
  content = addHandleAddToCart(content);
  content = updatePriceDisplay(content);
  content = updateAddToCartCalls(content);

  // Vérifier si le contenu a changé
  if (content !== originalContent) {
    modified = true;
    await writeFile(filePath, content);
  } else {
    console.log(`✅ Aucune modification nécessaire: ${filePath}`);
  }

  return modified;
}

// Fonction pour scanner les composants
async function scanComponents() {
  const componentsDir = path.join(process.cwd(), 'src/components');
  const pagesDir = path.join(process.cwd(), 'src/pages');
  
  const processedFiles = [];
  
  try {
    // Traiter les composants
    const componentFiles = await fs.readdir(componentsDir);
    for (const file of componentFiles) {
      if (file.endsWith('.tsx') && !file.startsWith('.')) {
        const filePath = path.join(componentsDir, file);
        const processed = await processFile(filePath);
        if (processed) processedFiles.push(filePath);
      }
    }

    // Traiter les pages
    const pageFiles = await fs.readdir(pagesDir);
    for (const file of pageFiles) {
      if (file.endsWith('.tsx') && !file.startsWith('.')) {
        const filePath = path.join(pagesDir, file);
        const processed = await processFile(filePath);
        if (processed) processedFiles.push(filePath);
      }
    }

    // Traiter les sous-dossiers de pages
    const subDirs = ['categories', 'Product'];
    for (const subDir of subDirs) {
      const subDirPath = path.join(pagesDir, subDir);
      try {
        const subFiles = await fs.readdir(subDirPath);
        for (const file of subFiles) {
          if (file.endsWith('.tsx') && !file.startsWith('.')) {
            const filePath = path.join(subDirPath, file);
            const processed = await processFile(filePath);
            if (processed) processedFiles.push(filePath);
          }
        }
      } catch (error) {
        // Dossier n'existe pas, ignorer
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors du scan:', error.message);
    return false;
  }

  console.log(`\n🎉 Traitement terminé !`);
  console.log(`📊 ${processedFiles.length} fichier(s) traité(s)`);
  
  if (processedFiles.length > 0) {
    console.log('\n📁 Fichiers modifiés:');
    processedFiles.forEach(file => console.log(`   - ${file}`));
  }

  return true;
}

// Script principal
async function main() {
  console.log('🎯 Application des améliorations de gestion des promotions');
  console.log('   - ✅ Import de getPriceIdForProduct');
  console.log('   - ✅ Ajout de getDiscountedPrice');
  console.log('   - ✅ États pour prix promotionnels');
  console.log('   - ✅ useEffect de préchargement des promos');
  console.log('   - ✅ Fonction handleAddToCart complète');
  console.log('   - ✅ Affichage des prix avec promotions');
  console.log('   - ✅ Mise à jour des appels d\'ajout au panier\n');
  
  const success = await scanComponents();
  
  if (success) {
    console.log('\n✅ Toutes les améliorations ont été appliquées avec succès !');
    console.log('\n📋 Étapes suivantes:');
    console.log('   1. Redémarrer votre serveur de développement');
    console.log('   2. Tester les fonctionnalités de promotion');
    console.log('   3. Vérifier que les prix promotionnels s\'affichent correctement');
    console.log('   4. Tester l\'ajout au panier avec promotions');
  } else {
    console.log('\n❌ Des erreurs sont survenues lors du traitement');
    process.exit(1);
  }
}

// Exécution du script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  processFile,
  scanComponents
}; 