#!/usr/bin/env node

/**
 * Script de test pour vérifier que les promotions fonctionnent
 * correctement dans tous les composants de la page d'accueil
 */

const fs = require('fs').promises;

console.log('🧪 Test des promotions sur la page d\'accueil...\n');

async function checkFileForPromoFeatures(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    const checks = {
      hasGetDiscountedPrice: content.includes('getDiscountedPrice'),
      hasPromoBadge: content.includes('PromoBadge'),
      hasPromoPrice: content.includes('promoPrice') || content.includes('discount_percentage'),
      hasHandleAddToCart: content.includes('handleAddToCart'),
      hasPromoDisplay: content.includes('line-through') && content.includes('text-red-600'),
    };
    
    return {
      filePath,
      checks,
      score: Object.values(checks).filter(Boolean).length,
      total: Object.keys(checks).length
    };
  } catch (error) {
    return {
      filePath,
      error: error.message,
      score: 0,
      total: 0
    };
  }
}

async function runTests() {
  const filesToCheck = [
    'src/components/PopularProducts.tsx',
    'src/components/EditorialProductCard.tsx',
    'src/pages/Index.tsx'
  ];
  
  console.log('📋 Vérification des fonctionnalités de promotion...\n');
  
  for (const file of filesToCheck) {
    const result = await checkFileForPromoFeatures(file);
    
    if (result.error) {
      console.log(`❌ ${file}: Erreur - ${result.error}`);
      continue;
    }
    
    const percentage = Math.round((result.score / result.total) * 100);
    const status = percentage >= 80 ? '✅' : percentage >= 60 ? '⚠️' : '❌';
    
    console.log(`${status} ${file}: ${result.score}/${result.total} fonctionnalités (${percentage}%)`);
    
    // Détails des vérifications
    Object.entries(result.checks).forEach(([check, passed]) => {
      const icon = passed ? '  ✓' : '  ✗';
      console.log(`${icon} ${check}`);
    });
    
    console.log('');
  }
  
  console.log('🔍 Suggestions:');
  console.log('  1. Vérifiez que les composants EditorialProductCard affichent bien les badges de promotion');
  console.log('  2. Testez l\'ajout au panier avec un produit en promotion');
  console.log('  3. Vérifiez que les prix barrés et les pourcentages de réduction s\'affichent');
  console.log('  4. Redémarrez votre serveur de développement pour appliquer les changements');
  
  console.log('\n✅ Test terminé !');
}

runTests().catch(console.error); 