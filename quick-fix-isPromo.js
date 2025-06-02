const fs = require('fs');
const path = require('path');

// Dossier contenant les pages de catégorie
const CATEGORIES_DIR = './src/pages/categories';

console.log('🚀 Correction rapide de l\'erreur "isPromo is not defined"...\n');

// Lister tous les fichiers .tsx 
const files = fs.readdirSync(CATEGORIES_DIR)
  .filter(file => file.endsWith('.tsx') && !file.includes('.backup') && !file.includes('.debug'))
  .map(file => path.join(CATEGORIES_DIR, file));

let fixedCount = 0;

for (const filePath of files) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Rechercher et corriger l'erreur isPromo
    const brokenPattern = /{isPromo && <PromoBadge \/>}/g;
    
    if (content.match(brokenPattern)) {
      content = content.replace(brokenPattern, '{(product.hasDiscount || product.onSale) && <PromoBadge />}');
      fs.writeFileSync(filePath, content);
      console.log(`✅ Corrigé: ${path.basename(filePath)}`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`❌ Erreur avec ${path.basename(filePath)}:`, error.message);
  }
}

console.log(`\n🎉 Terminé! ${fixedCount} fichiers corrigés.`);
console.log('\n💡 Pour une mise à jour complète avec les prix promotionnels, exécutez: node fix-category-pages.js'); 