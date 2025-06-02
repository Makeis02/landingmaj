#!/usr/bin/env node

const fs = require('fs').promises;

/**
 * Script pour synchroniser la gestion des promotions entre les pages de catégories
 * et les composants de la page d'accueil (PopularProducts et EditorialProductCard)
 */

console.log('🔄 Synchronisation des promotions sur la page d\'accueil...\n');

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

// Améliorer la fonction fetchPromo dans EditorialProductCard
function improveEditorialPromoFunction(content) {
  // Rechercher et remplacer la fonction fetchPromo existante
  const fetchPromoRegex = /const fetchPromo = async \(\) => \{[\s\S]*?\};/;
  
  const improvedFetchPromo = `const fetchPromo = async () => {
      // 🎯 AMÉLIORÉ : Récupération des prix promotionnels avec getDiscountedPrice
      if (!variantPriceRange) {
        try {
          const promo = await getDiscountedPrice(selectedProductId);
          if (promo && promo.discount_percentage) {
            setPromoPrice(promo);
            setHasPromo(true);
            return;
          } else {
            setPromoPrice(null);
          }
        } catch (error) {
          console.error('Erreur récupération prix promo:', error);
          setPromoPrice(null);
        }
      }
      
      // Vérifie la promo globale (pour le badge)
      const globalKey = \`product_\${selectedProductId}_discount_percentage\`;
      const { data: globalData, error: globalError } = await supabase
        .from("editable_content")
        .select("content")
        .eq("content_key", globalKey)
        .maybeSingle();
      
      if (!globalError && globalData?.content) {
        const discount = parseFloat(globalData.content);
        if (!isNaN(discount) && discount > 0) {
          setHasPromo(true);
          return;
        }
      }
      
      // Vérifie les promos sur les variantes
      const { data: variantPromos, error: variantError } = await supabase
        .from("editable_content")
        .select("content_key, content")
        .like("content_key", \`product_\${selectedProductId}_variant_%_option_%_discount_percentage\`)
        .not("content", "is", null)
        .neq("content", "0");

      if (!variantError && variantPromos && variantPromos.length > 0) {
        const hasActivePromo = variantPromos.some(promo => {
          const discount = parseFloat(promo.content);
          return !isNaN(discount) && discount > 0;
        });
        
        if (hasActivePromo) {
          setHasPromo(true);
          return;
        }
      }
      
      setHasPromo(false);
    };`;

  if (fetchPromoRegex.test(content)) {
    return content.replace(fetchPromoRegex, improvedFetchPromo);
  }

  return content;
}

// Améliorer l'affichage des prix avec détection des réductions de variantes
function improveEditorialPriceDisplay(content) {
  const priceDisplayRegex = /<div className="font-medium text-lg text-gray-900 mb-4 truncate"[\s\S]*?<\/div>/;
  
  const improvedPriceDisplay = `<div className="font-medium text-lg text-gray-900 mb-4 truncate" style={{minHeight: '1.8em'}}>
          {variantPriceRange ? (
            \`De \${variantPriceRange.min.toFixed(2)} € à \${variantPriceRange.max.toFixed(2)} €\`
          ) : promoPrice && promoPrice.discount_percentage ? (
            <>
              <span className="text-gray-500 line-through mr-2">{\`\${promoPrice.original_price.toFixed(2)}€\`}</span>
              <span className="text-red-600 font-semibold">{\`\${promoPrice.price.toFixed(2)}€\`}</span>
              <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">{\`-\${promoPrice.discount_percentage}%\`}</span>
            </>
          ) : (
            selectedProduct?.price?.toFixed(2) + ' €'
          )}
        </div>`;

  if (priceDisplayRegex.test(content)) {
    return content.replace(priceDisplayRegex, improvedPriceDisplay);
  }

  return content;
}

// Améliorer PacksSection pour inclure la gestion des promotions si nécessaire
async function improvePacksSection() {
  const filePath = 'src/components/PacksSection.tsx';
  const content = await readFile(filePath);
  
  if (!content) return false;

  // Vérifier si PacksSection affiche des produits individuels ou juste des packs
  if (content.includes('StripeProduct') && !content.includes('getDiscountedPrice')) {
    console.log('📦 PacksSection affiche des produits - ajout gestion promotions...');
    
    // Ajouter les imports nécessaires
    let updatedContent = content;
    
    if (!content.includes('import PromoBadge')) {
      updatedContent = updatedContent.replace(
        /import.*from ['"][^'"]*['"];?\n/g,
        (match) => match + (match.includes('React') ? 'import PromoBadge from \'@/components/PromoBadge\';\n' : '')
      );
    }

    if (!content.includes('getDiscountedPrice')) {
      updatedContent = updatedContent.replace(
        /const.*useCartStore.*=.*useCartStore\(\);?/,
        (match) => match.replace('addItem', 'addItem, getDiscountedPrice')
      );
    }

    await writeFile(filePath, updatedContent);
    return true;
  }
  
  console.log('📦 PacksSection ne nécessite pas de modifications (pas de produits individuels)');
  return false;
}

// Fonction principale
async function main() {
  try {
    console.log('🎯 Phase 1: Amélioration d\'EditorialProductCard...');
    
    // Lire le fichier EditorialProductCard
    const editorialPath = 'src/components/EditorialProductCard.tsx';
    let editorialContent = await readFile(editorialPath);
    
    if (editorialContent) {
      // Améliorer la fonction fetchPromo
      editorialContent = improveEditorialPromoFunction(editorialContent);
      
      // Améliorer l'affichage des prix
      editorialContent = improveEditorialPriceDisplay(editorialContent);
      
      // Sauvegarder
      const success = await writeFile(editorialPath, editorialContent);
      if (success) {
        console.log('✅ EditorialProductCard amélioré avec gestion promotions cohérente');
      }
    }

    console.log('\n🎯 Phase 2: Vérification et amélioration de PacksSection...');
    await improvePacksSection();

    console.log('\n🎯 Phase 3: Vérification de la cohérence des promotions...');
    
    // Vérifier que tous les composants utilisent la même logique
    const componentsToCheck = [
      'src/components/PopularProducts.tsx',
      'src/components/EditorialProductCard.tsx'
    ];
    
    let allConsistent = true;
    
    for (const filePath of componentsToCheck) {
      const content = await readFile(filePath);
      if (content) {
        const hasGetDiscountedPrice = content.includes('getDiscountedPrice');
        const hasPromoBadge = content.includes('PromoBadge');
        const hasPromoStates = content.includes('promoPrices') || content.includes('promoPrice');
        
        console.log(`📊 ${filePath}:`);
        console.log(`   - getDiscountedPrice: ${hasGetDiscountedPrice ? '✅' : '❌'}`);
        console.log(`   - PromoBadge: ${hasPromoBadge ? '✅' : '❌'}`);
        console.log(`   - États promo: ${hasPromoStates ? '✅' : '❌'}`);
        
        if (!hasGetDiscountedPrice || !hasPromoBadge || !hasPromoStates) {
          allConsistent = false;
        }
      }
    }

    console.log('\n📋 RÉSUMÉ:');
    if (allConsistent) {
      console.log('✅ Tous les composants de la page d\'accueil utilisent la gestion de promotions cohérente');
      console.log('✅ La section "Conseils & Inspirations" devrait maintenant afficher correctement les promotions');
    } else {
      console.log('⚠️  Certains composants nécessitent encore des améliorations');
    }

    console.log('\n🔧 Actions recommandées:');
    console.log('1. Redémarrer le serveur de développement');
    console.log('2. Vérifier que les produits de la section "Conseils & Inspirations" affichent les badges promo');
    console.log('3. Tester l\'ajout au panier avec les prix promotionnels');
    console.log('4. Vérifier que les prix barrés et réduits s\'affichent correctement');
    
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
    process.exit(1);
  }
}

// Exécuter le script
main(); 