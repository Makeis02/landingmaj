#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('🚀 Application des améliorations promotionnelles...');

// Fichier de référence
const referenceFile = 'src/pages/categories/EaucDouceDécorationPage.tsx';

if (!fs.existsSync(referenceFile)) {
    console.log('❌ Fichier de référence non trouvé');
    process.exit(1);
}

const referenceContent = fs.readFileSync(referenceFile, 'utf8');

// Extraire la fonction enrichProductsWithPromotions
const enrichFunctionMatch = referenceContent.match(/const enrichProductsWithPromotions = async[\s\S]*?(?=\n\nconst fetchVariantPriceMaps)/);
const enrichFunction = enrichFunctionMatch ? enrichFunctionMatch[0] : null;

if (!enrichFunction) {
    console.log('❌ Fonction enrichProductsWithPromotions non trouvée');
    process.exit(1);
}

// Extraire le useEffect pour les prix promos
const promoUseEffectMatch = referenceContent.match(/useEffect\(\(\) => \{[\s\S]*?Précharger les prix promos[\s\S]*?\}, \[filteredProducts\]\);/);
const promoUseEffect = promoUseEffectMatch ? promoUseEffectMatch[0] : null;

if (!promoUseEffect) {
    console.log('❌ useEffect pour prix promos non trouvé');
    process.exit(1);
}

// Obtenir la liste des fichiers
const categoriesDir = 'src/pages/categories';
const files = fs.readdirSync(categoriesDir)
    .filter(file => file.endsWith('.tsx') && file !== 'EaucDouceDécorationPage.tsx')
    .filter(file => !file.includes('.backup') && !file.includes('.debug'));

console.log(`📋 Fichiers à traiter: ${files.length}`);
files.forEach(file => console.log(`   - ${file}`));

let updatedCount = 0;

for (const fileName of files) {
    const filePath = path.join(categoriesDir, fileName);
    console.log(`\n🔧 Traitement de ${fileName}...`);
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let hasChanges = false;
        
        // 1. Ajouter import useCartStore si manquant
        if (!content.includes('import { useCartStore }')) {
            content = content.replace(
                /(import.*?use-toast.*?;)/,
                `$1\nimport { useCartStore } from "@/stores/useCartStore";`
            );
            console.log('  ✅ Import useCartStore ajouté');
            hasChanges = true;
        }
        
        // 2. Ajouter import PromoBadge si manquant
        if (!content.includes('import PromoBadge')) {
            content = content.replace(
                /(import { getPriceIdForProduct }.*?;)/,
                `$1\nimport PromoBadge from "@/components/PromoBadge";`
            );
            console.log('  ✅ Import PromoBadge ajouté');
            hasChanges = true;
        }
        
        // 3. Ajouter enrichProductsWithPromotions si absent
        if (!content.includes('enrichProductsWithPromotions')) {
            content = content.replace(
                /(const \w+Page = \(\) => \{)/,
                `${enrichFunction}\n\n$1`
            );
            console.log('  ✅ Fonction enrichProductsWithPromotions ajoutée');
            hasChanges = true;
        }
        
        // 4. Ajouter état promoPrices si absent
        if (!content.includes('promoPrices')) {
            const stateDeclaration = `
  // Ajout d'un état local pour stocker les prix promos des produits sans variante
  const [promoPrices, setPromoPrices] = useState<Record<string, any>>({});

  // Cart functionality
  const { getDiscountedPrice, addItem } = useCartStore();`;
            
            content = content.replace(
                /(const \[currentPage, setCurrentPage\] = useState\(1\);)/,
                `$1\n${stateDeclaration}`
            );
            console.log('  ✅ État promoPrices et useCartStore ajoutés');
            hasChanges = true;
        }
        
        // 5. Ajouter useEffect pour prix promos si absent
        if (!content.includes('Précharger les prix promos')) {
            content = content.replace(
                /(\}, \[filteredProducts\]\);)/,
                `$1\n\n  ${promoUseEffect}`
            );
            console.log('  ✅ useEffect pour prix promos ajouté');
            hasChanges = true;
        }
        
        // 6. Mettre à jour le map des produits pour inclure la logique promo
        if (content.includes('paginatedProducts.map((product) => (') && !content.includes('const promo = promoPrices')) {
            content = content.replace(
                /paginatedProducts\.map\(\(product\) => \(/,
                `paginatedProducts.map((product) => {
                  const promo = promoPrices[product.id];
                  const isPromo = !!promo && promo.discount_percentage;
                  return (`
            );
            console.log('  ✅ Logique des prix promos ajoutée au rendu');
            hasChanges = true;
        }
        
        // 7. Mettre à jour l'affichage des prix
        const oldPriceRegex = /\{product\.variantPriceRange[\s\S]*?`\$\{product\.price\?\?\.toFixed\(2\)\} €`[\s\S]*?\}/;
        if (oldPriceRegex.test(content) && !content.includes('isPromo ?')) {
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
            
            content = content.replace(oldPriceRegex, newPriceDisplay);
            console.log('  ✅ Affichage des prix avec promotions mis à jour');
            hasChanges = true;
        }
        
        // 8. Mettre à jour le bouton Ajouter pour gérer les promotions
        const oldButtonRegex = /onClick=\{\(\) => \{[\s\S]*?addItem\(\{[\s\S]*?title: product\.title,[\s\S]*?price: product\.price,[\s\S]*?\}\);[\s\S]*?\}\}/;
        if (oldButtonRegex.test(content) && !content.includes('if (isPromo)')) {
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
            
            content = content.replace(oldButtonRegex, newButtonLogic);
            console.log('  ✅ Bouton Ajouter avec gestion des promotions mis à jour');
            hasChanges = true;
        }
        
        // 9. Appliquer enrichProductsWithPromotions dans le useEffect principal
        if (content.includes('enrichProductsWithPromotions') && !content.includes('await enrichProductsWithPromotions(finalProducts)')) {
            content = content.replace(
                /(const finalProducts = updatedWithRatings\.map[\s\S]*?\}\);)/,
                `$1\n\n        // 🎯 Enrichir les produits avec la détection des promotions\n        const productsWithPromotions = await enrichProductsWithPromotions(finalProducts);`
            );
            
            content = content.replace('setProducts(finalProducts);', 'setProducts(productsWithPromotions);');
            content = content.replace('const filtered = finalProducts.filter', 'const filtered = productsWithPromotions.filter');
            
            console.log('  ✅ enrichProductsWithPromotions appliqué');
            hasChanges = true;
        }
        
        // 10. Corriger la fermeture du map si nécessaire
        if (content.includes('const isPromo = !!promo && promo.discount_percentage;') && !content.includes('})\n              )}')) {
            content = content.replace(
                /(\}\)\)\s*)(?=\s*\)\})/,
                '};\n                })\n              )}'
            );
            console.log('  ✅ Fermeture du map corrigée');
            hasChanges = true;
        }
        
        // Sauvegarder si des modifications ont été apportées
        if (hasChanges) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('  🎉 Fichier mis à jour avec succès!');
            updatedCount++;
        } else {
            console.log('  ℹ️  Aucune modification nécessaire');
        }
        
    } catch (error) {
        console.log(`  ❌ Erreur: ${error.message}`);
    }
}

console.log(`\n📊 Résumé:`);
console.log(`   ✅ ${updatedCount} fichiers mis à jour`);
console.log(`   ℹ️  ${files.length - updatedCount} fichiers déjà à jour`);

console.log(`\n🎉 Mise à jour terminée!`);
console.log(`💡 Les pages de catégorie ont maintenant:`);
console.log(`   - Gestion des prix promotionnels`);
console.log(`   - Badges de promotion`);
console.log(`   - Ajout au panier avec prix réduits`);
console.log(`   - Affichage correct des prix barrés`); 