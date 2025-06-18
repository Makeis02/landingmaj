import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Recherche des dépendances qui utilisent path-to-regexp...');

// Chercher dans node_modules
const nodeModulesPath = path.join(__dirname, 'node_modules');

function scanForPathToRegexp(dir, depth = 0) {
  if (depth > 3) return; // Éviter les boucles infinies
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Chercher dans les fichiers JS/TS
        try {
          const files = fs.readdirSync(fullPath);
          for (const file of files) {
            if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.mjs')) {
              const filePath = path.join(fullPath, file);
              try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Chercher des références à path-to-regexp
                if (content.includes('path-to-regexp') || content.includes('pathToRegexp')) {
                  console.log(`  🔍 Trouvé dans: ${filePath}`);
                  
                  // Chercher des routes problématiques
                  const problematicPatterns = [
                    /\/:/g,
                    /\/:\s*[^a-zA-Z]/g,
                    /\/:\s*$/g
                  ];
                  
                  problematicPatterns.forEach(pattern => {
                    const matches = content.match(pattern);
                    if (matches) {
                      console.log(`    ❌ Pattern problématique trouvé: ${pattern}`);
                      console.log(`       Matches: ${matches.slice(0, 3).join(', ')}`);
                    }
                  });
                }
              } catch (err) {
                // Ignore les erreurs de lecture
              }
            }
          }
        } catch (err) {
          // Ignore les erreurs de lecture de répertoire
        }
        
        // Récursion pour les sous-dossiers
        scanForPathToRegexp(fullPath, depth + 1);
      }
    }
  } catch (err) {
    // Ignore les erreurs
  }
}

// Scanner les dépendances principales
const mainDeps = [
  'react-router-dom',
  'express',
  'vite',
  '@vitejs/plugin-react-swc'
];

mainDeps.forEach(dep => {
  const depPath = path.join(nodeModulesPath, dep);
  if (fs.existsSync(depPath)) {
    console.log(`\n🔍 Scanning ${dep}...`);
    scanForPathToRegexp(depPath);
  }
});

console.log('\n✅ Scan terminé.'); 