import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test path-to-regexp directement
import pathToRegexp from 'path-to-regexp';

console.log('🔍 Test de path-to-regexp...');

// Test des routes connues
const testRoutes = [
  '/',
  '/admin',
  '/api/ping',
  '/api/stripe/products',
  '/categories/:slug',
  '/produits/:slug',
  '/api/webhook',
  '/api/products/create-page',
  '/api/products/delete-page',
  '/api/products/check-pages',
  '/api/products/descriptions'
];

console.log('✅ Test des routes Express...');
testRoutes.forEach(route => {
  try {
    const regex = pathToRegexp(route);
    console.log(`  ✅ ${route} -> OK`);
  } catch (error) {
    console.log(`  ❌ ${route} -> ERREUR: ${error.message}`);
  }
});

// Chercher des routes problématiques dans les fichiers
console.log('\n🔍 Recherche de routes problématiques...');

function scanForRoutes(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Chercher des patterns de routes
    const routePatterns = [
      /path=["']([^"']*:)["']/g,  // path="/:"
      /path=["']([^"']*\/:)["']/g, // path="/produits/:"
      /Route\s+path=["']([^"']*:)["']/g, // Route path="/:"
      /app\.(get|post|use)\s*\(\s*["']([^"']*:)["']/g // app.get('/:'
    ];
    
    routePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        console.log(`  ❌ Route problématique trouvée dans ${filePath}:`);
        console.log(`     ${match[0]}`);
      }
    });
  } catch (error) {
    // Ignore les erreurs de lecture
  }
}

// Scanner les fichiers principaux
const filesToScan = [
  'src/App.tsx',
  'server.js',
  'src/pages/Index.tsx',
  'src/pages/DynamicProductPage.tsx'
];

filesToScan.forEach(file => {
  if (fs.existsSync(file)) {
    scanForRoutes(file);
  }
});

console.log('\n✅ Debug terminé.'); 