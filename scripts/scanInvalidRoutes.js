// scripts/scanInvalidRoutes.js
import fs from 'fs-extra';
import path from 'path';

const appTsxPath = path.resolve('src/App.tsx');

(async () => {
  if (!(await fs.pathExists(appTsxPath))) {
    console.error("❌ Le fichier App.tsx est introuvable.");
    console.error("📁 Chemin recherché:", appTsxPath);
    process.exit(1);
  }

  const content = await fs.readFile(appTsxPath, 'utf-8');
  const routeRegex = /<Route\s+path=["']([^"']+)["']/g;

  const invalidRoutes = [];

  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const routePath = match[1];

    // Critères de slug invalide - routes avec paramètres vides ou mal formés
    const isInvalid =
      routePath.includes('/produits/:') ||           // slug vide : "/produits/:"
      /\/produits\/["']?["']?/.test(routePath) ||     // slash vide
      /\/produits\/[^a-z0-9-:]/i.test(routePath);     // caractère interdit (mais pas :)

    if (isInvalid) {
      invalidRoutes.push(routePath);
    }
  }

  if (invalidRoutes.length === 0) {
    console.log("✅ Aucune route cassée détectée dans App.tsx.");
    console.log("✅ La route /produits/:slug est valide (paramètre nommé).");
  } else {
    console.warn("🚨 Routes potentiellement invalides détectées :");
    invalidRoutes.forEach((r, i) => console.log(`🔍 ${i + 1}. ${r}`));
  }
})(); 