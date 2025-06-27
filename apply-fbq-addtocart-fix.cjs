const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'src/pages/categories');
const FBQ_SNIPPET = `if (window.fbq) {\n        window.fbq('track', 'AddToCart', {\n          content_ids: [product.id],\n          content_name: product.title,\n          content_type: variant ? 'product_group' : 'product',\n          value: finalPrice,\n          currency: 'EUR',\n          quantity: 1,\n          ...(variant ? { variant } : {})\n        });\n      }`;

function processFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Cherche la fonction handleAddToCart
  code = code.replace(/(await addItem\([^\)]*\);)(\s*)(?![^]*window\.fbq)/g, (match, addItemCall, ws) => {
    changed = true;
    return `${addItemCall}${ws}${FBQ_SNIPPET}\n`;
  });

  if (changed) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('✅ Patch FBQ AddToCart appliqué :', path.basename(filePath));
  }
}

fs.readdirSync(DIR).forEach(file => {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    processFile(path.join(DIR, file));
  }
});

console.log('🎉 Correction FBQ AddToCart terminée sur toutes les pages catégorie.'); 