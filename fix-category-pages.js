const fs = require('fs');
const path = require('path');

// Dossier contenant les pages de catégorie
const CATEGORIES_DIR = './src/pages/categories';

// Fonction pour lire le contenu du fichier de référence (EaucDouceDécorationPage.tsx)
const getReferenceFunctions = () => {
  const referenceFile = path.join(CATEGORIES_DIR, 'EaucDouceDécorationPage.tsx');
  if (!fs.existsSync(referenceFile)) {
    throw new Error('Fichier de référence EaucDouceDécorationPage.tsx non trouvé');
  }
  return fs.readFileSync(referenceFile, 'utf8');
};

// Fonctions à extraire du fichier de référence
const extractFunction = (content, functionName) => {
  // Trouver la fonction et l'extraire avec sa logique complète
  const patterns = {
    enrichProductsWithPromotions: /const enrichProductsWithPromotions = async[\s\S]*?(?=;?\s*(?:const|function|\/\/|$|\n\s*\n))/,
    promoPricesState: /const \[promoPrices, setPromoPrices\] = useState<Record<string, any>>\(\{\}\);/,
    promoPricesUseEffect: /useEffect\(\(\) => \{[\s\S]*?précharger les prix promos[\s\S]*?\}, \[filteredProducts\]\);/,
    handleAddToCartFunction: /const handleAddToCart = async \(product\) => \{[\s\S]*?(?=\s*return \()/,
    productCardRender: /paginatedProducts\.map\(\(product\) => \{[\s\S]*?const promo = promoPrices\[product\.id\];[\s\S]*?const isPromo = !!promo && promo\.discount_percentage;[\s\S]*?\}\)\)/
  };

  const match = content.match(patterns[functionName]);
  return match ? match[0] : null;
};

// Importer les types et imports nécessaires
const getRequiredImports = () => {
  return `import { useCartStore } from "@/stores/useCartStore";
import PromoBadge from "@/components/PromoBadge";
import { getPriceIdForProduct } from "@/lib/stripe/getPriceIdFromSupabase";`;
};

// Fonction pour traiter un seul fichier
const fixCategoryPage = (filePath) => {
  console.log(`🔧 Traitement de ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let hasChanges = false;

  // 1. Ajouter les imports manquants s'ils ne sont pas présents
  if (!content.includes('import { useCartStore }')) {
    const importIndex = content.indexOf('import');
    if (importIndex !== -1) {
      const firstImportLine = content.indexOf('\n', importIndex);
      content = content.slice(0, firstImportLine + 1) + 
                'import { useCartStore } from "@/stores/useCartStore";\n' +
                content.slice(firstImportLine + 1);
      hasChanges = true;
    }
  }

  if (!content.includes('import PromoBadge')) {
    const importIndex = content.lastIndexOf('import');
    if (importIndex !== -1) {
      const lastImportLine = content.indexOf('\n', importIndex);
      content = content.slice(0, lastImportLine + 1) + 
                'import PromoBadge from "@/components/PromoBadge";\n' +
                content.slice(lastImportLine + 1);
      hasChanges = true;
    }
  }

  // 2. Corriger l'erreur isPromo is not defined
  const brokenPromoPattern = /\{isPromo && <PromoBadge \/>\}/g;
  if (content.match(brokenPromoPattern)) {
    content = content.replace(brokenPromoPattern, '{(product.hasDiscount || product.onSale) && <PromoBadge />}');
    hasChanges = true;
    console.log('  ✅ Correction de l\'erreur isPromo');
  }

  // 3. Ajouter enrichProductsWithPromotions si absent
  if (!content.includes('enrichProductsWithPromotions')) {
    const referenceContent = getReferenceFunctions();
    const enrichFunction = extractFunction(referenceContent, 'enrichProductsWithPromotions');
    
    if (enrichFunction) {
      // Ajouter la fonction avant le composant principal
      const componentMatch = content.match(/const \w+Page = \(\) => \{/);
      if (componentMatch) {
        const insertPosition = content.indexOf(componentMatch[0]);
        content = content.slice(0, insertPosition) + 
                  enrichFunction + '\n\n' +
                  content.slice(insertPosition);
        hasChanges = true;
        console.log('  ✅ Ajout de enrichProductsWithPromotions');
      }
    }
  }

  // 4. Ajouter la gestion des prix promos dans le composant
  if (!content.includes('promoPrices')) {
    // Ajouter l'état promoPrices
    const statePattern = /const \[currentPage, setCurrentPage\] = useState\(1\);/;
    if (content.match(statePattern)) {
      content = content.replace(statePattern, 
        '$&\n\n  // Ajout d\'un état local pour stocker les prix promos des produits sans variante\n  const [promoPrices, setPromoPrices] = useState<Record<string, any>>({});');
      hasChanges = true;
      console.log('  ✅ Ajout de l\'état promoPrices');
    }
  }

  // 5. Ajouter useCartStore
  if (!content.includes('const { getDiscountedPrice, addItem } = useCartStore();')) {
    const statePattern = /const \[promoPrices, setPromoPrices\]/;
    if (content.match(statePattern)) {
      content = content.replace(statePattern, 
        '$&\n\n  // Cart functionality\n  const { getDiscountedPrice, addItem } = useCartStore();');
      hasChanges = true;
      console.log('  ✅ Ajout de useCartStore');
    }
  }

  // 6. Ajouter useEffect pour précharger les prix promos
  if (!content.includes('Précharger les prix promos')) {
    const lastUseEffect = content.lastIndexOf('}, [');
    if (lastUseEffect !== -1) {
      const nextLine = content.indexOf('\n', lastUseEffect) + 1;
      const promoUseEffect = `
  useEffect(() => {
    // Précharger les prix promos pour les produits sans variante
    const fetchPromos = async () => {
      const promos: Record<string, any> = {};
      for (const p of filteredProducts) {
        if (!p.hasVariant) {
          const promo = await getDiscountedPrice(p.id);
          if (promo && promo.discount_percentage) {
            promos[p.id] = promo;
          }
        }
      }
      setPromoPrices(promos);
    };
    fetchPromos();
  }, [filteredProducts]);
`;
      content = content.slice(0, nextLine) + promoUseEffect + content.slice(nextLine);
      hasChanges = true;
      console.log('  ✅ Ajout du useEffect pour les prix promos');
    }
  }

  // 7. Corriger le rendu des produits pour inclure les prix promos
  const oldCardPattern = /paginatedProducts\.map\(\(product\) => \(/;
  if (content.match(oldCardPattern) && !content.includes('const promo = promoPrices[product.id];')) {
    content = content.replace(oldCardPattern, 
      'paginatedProducts.map((product) => {\n                  const promo = promoPrices[product.id];\n                  const isPromo = !!promo && promo.discount_percentage;\n                  return (');
    hasChanges = true;
    console.log('  ✅ Ajout de la logique des prix promos dans le rendu');
  }

  // 8. Corriger l'affichage des prix pour inclure les promotions
  const oldPricePattern = /\{product\.variantPriceRange[\s\S]*?\$\{product\.price\?\?\.toFixed\(2\)\} €`[\s\S]*?\}/;
  if (content.match(oldPricePattern) && !content.includes('isPromo ?')) {
    const newPriceDisplay = `{product.variantPriceRange ? (
                            \`De \${product.variantPriceRange.min.toFixed(2)} € à \${product.variantPriceRange.max.toFixed(2)} €\`
                          ) : isPromo ? (
                            <>
                              <span className="text-gray-500 line-through mr-2">{promo.original_price.toFixed(2)}€</span>
                              <span className="text-red-600 font-semibold">{promo.price.toFixed(2)}€</span>
                              <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">-{promo.discount_percentage}%</span>
                            </>
                          ) : (
                            \`\${product.price?.toFixed(2)} €\`
                          )}`;
    
    content = content.replace(oldPricePattern, newPriceDisplay);
    hasChanges = true;
    console.log('  ✅ Correction de l\'affichage des prix avec promotions');
  }

  // 9. Ajouter handleAddToCart amélioré
  if (!content.includes('handleAddToCart')) {
    const referenceContent = getReferenceFunctions();
    const handleAddToCartFunction = extractFunction(referenceContent, 'handleAddToCartFunction');
    
    if (handleAddToCartFunction) {
      // Ajouter la fonction avant le return du composant
      const returnMatch = content.match(/\s*return \(/);
      if (returnMatch) {
        const insertPosition = content.indexOf(returnMatch[0]);
        content = content.slice(0, insertPosition) + 
                  '\n  ' + handleAddToCartFunction + '\n' +
                  content.slice(insertPosition);
        hasChanges = true;
        console.log('  ✅ Ajout de handleAddToCart amélioré');
      }
    }
  }

  // 10. Corriger le bouton "Ajouter" pour utiliser la logique des promotions
  const oldButtonPattern = /onClick=\{\(\) => \{[\s\S]*?addItem\(\{[\s\S]*?title: product\.title,[\s\S]*?price: product\.price,[\s\S]*?\}\);[\s\S]*?\}\}/;
  if (content.match(oldButtonPattern)) {
    const newButtonLogic = `onClick={async () => {
                                // Ajout au panier avec gestion promo
                                if (isPromo) {
                                  await addItem({
                                    id: product.id,
                                    title: product.title,
                                    price: promo.price,
                                    original_price: promo.original_price,
                                    discount_percentage: promo.discount_percentage,
                                    has_discount: true,
                                    image_url: product.image || "",
                                    quantity: 1,
                                    stripe_price_id: promo.stripe_price_id,
                                    stripe_discount_price_id: promo.stripe_discount_price_id
                                  });
                                  toast({
                                    title: "Produit ajouté au panier",
                                    description: \`\${product.title} a été ajouté au panier avec \${promo.discount_percentage}% de réduction !\`,
                                  });
                                } else {
                                  await addItem({
                                    id: product.id,
                                    title: product.title,
                                    price: product.price,
                                    image_url: product.image || "",
                                    quantity: 1
                                  });
                                  toast({
                                    title: "Produit ajouté au panier",
                                    description: \`\${product.title} a été ajouté au panier.\`,
                                  });
                                }
                              }}`;
    
    content = content.replace(oldButtonPattern, newButtonLogic);
    hasChanges = true;
    console.log('  ✅ Correction du bouton Ajouter avec gestion des promotions');
  }

  // 11. Appliquer enrichProductsWithPromotions dans le useEffect principal
  if (content.includes('enrichProductsWithPromotions') && !content.includes('await enrichProductsWithPromotions(finalProducts);')) {
    const finalProductsPattern = /const finalProducts = updatedWithRatings\.map\([\s\S]*?\}\);/;
    if (content.match(finalProductsPattern)) {
      content = content.replace(finalProductsPattern, 
        '$&\n\n        // 🎯 Enrichir les produits avec la détection des promotions\n        const productsWithPromotions = await enrichProductsWithPromotions(finalProducts);');
      
      // Remplacer setProducts(finalProducts) par setProducts(productsWithPromotions)
      content = content.replace('setProducts(finalProducts);', 'setProducts(productsWithPromotions);');
      
      // Remplacer les références à finalProducts dans le filtrage
      content = content.replace(/const filtered = finalProducts\.filter/, 'const filtered = productsWithPromotions.filter');
      
      hasChanges = true;
      console.log('  ✅ Application de enrichProductsWithPromotions');
    }
  }

  // 12. Corriger la fermeture du map s'il y a des erreurs de parenthèses
  const mapPattern = /paginatedProducts\.map\(\(product\) => \{[\s\S]*?const isPromo = !!promo && promo\.discount_percentage;[\s\S]*?\}\)\)/;
  if (content.match(mapPattern)) {
    const mapMatch = content.match(mapPattern)[0];
    if (!mapMatch.includes('})\n              )}')) {
      content = content.replace(mapMatch, mapMatch.replace(/\}\)\)$/, '};\n                })\n              )}'));
      hasChanges = true;
      console.log('  ✅ Correction des parenthèses du map');
    }
  }

  // Sauvegarder le fichier s'il y a eu des modifications
  if (hasChanges) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${path.basename(filePath)} mis à jour avec succès!`);
    return true;
  } else {
    console.log(`ℹ️  ${path.basename(filePath)} déjà à jour`);
    return false;
  }
};

// Fonction principale
const main = () => {
  console.log('🚀 Début de la mise à jour des pages de catégorie...\n');

  if (!fs.existsSync(CATEGORIES_DIR)) {
    console.error(`❌ Dossier ${CATEGORIES_DIR} non trouvé`);
    process.exit(1);
  }

  // Lister tous les fichiers .tsx dans le dossier (sauf les backups)
  const files = fs.readdirSync(CATEGORIES_DIR)
    .filter(file => file.endsWith('.tsx') && !file.includes('.backup') && !file.includes('.debug'))
    .map(file => path.join(CATEGORIES_DIR, file));

  console.log(`📁 ${files.length} fichiers trouvés à traiter:`);
  files.forEach(file => console.log(`   - ${path.basename(file)}`));
  console.log();

  let updatedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      const wasUpdated = fixCategoryPage(file);
      if (wasUpdated) updatedCount++;
    } catch (error) {
      console.error(`❌ Erreur lors du traitement de ${path.basename(file)}:`, error.message);
      errorCount++;
    }
    console.log();
  }

  console.log('📊 Résumé:');
  console.log(`   ✅ ${updatedCount} fichiers mis à jour`);
  console.log(`   ℹ️  ${files.length - updatedCount - errorCount} fichiers déjà à jour`);
  console.log(`   ❌ ${errorCount} erreurs`);
  console.log('\n🎉 Mise à jour terminée!');

  if (updatedCount > 0) {
    console.log('\n💡 N\'oubliez pas de:');
    console.log('   1. Vérifier que tous les imports sont corrects');
    console.log('   2. Tester les pages mises à jour');
    console.log('   3. Vérifier que les prix promotionnels s\'affichent correctement');
  }
};

// Exécuter le script
main(); 