const fs = require("fs-extra");
const path = require("path");
const slugify = require("slugify");

/**
 * Ajoute une nouvelle route dans App.tsx
 * @param {string} slug - Le slug du produit
 * @param {string} componentName - Le nom du composant React
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function addRoute(slug, componentName) {
  try {
    if (!slug || !componentName) {
      return { 
        success: false, 
        message: "Le slug et le nom du composant sont obligatoires" 
      };
    }

    const appTsxPath = path.resolve(process.cwd(), "src/App.tsx");
    
    // Vérifier si App.tsx existe
    if (!(await fs.pathExists(appTsxPath))) {
      return { 
        success: false, 
        message: "Le fichier App.tsx n'existe pas" 
      };
    }

    // Lire le fichier App.tsx
    let appContent = await fs.readFile(appTsxPath, "utf8");

    // Vérifier si la route existe déjà
    if (appContent.includes(`path="/produits/${slug}"`)) {
      return { 
        success: true, 
        message: `La route pour ${slug} existe déjà` 
      };
    }

    // Ajouter l'import
    const importStatement = `import ${componentName} from "@/pages/products/${slug}";`;
    
    // Trouver le dernier import
    const lastImportIndex = appContent.lastIndexOf('import ');
    if (lastImportIndex === -1) {
      return { 
        success: false, 
        message: "Impossible de trouver la section des imports dans App.tsx" 
      };
    }
    
    const lastImportEndIndex = appContent.indexOf('\n', lastImportIndex);
    appContent = appContent.slice(0, lastImportEndIndex + 1) + 
                importStatement + '\n' + 
                appContent.slice(lastImportEndIndex + 1);

    // Ajouter la route
    const routesEndIndex = appContent.lastIndexOf("</Routes>");
    if (routesEndIndex === -1) {
      return { 
        success: false, 
        message: "Impossible de trouver la balise </Routes> dans App.tsx" 
      };
    }
    
    const beforeRoutesEnd = appContent.substring(0, routesEndIndex);
    const afterRoutesEnd = appContent.substring(routesEndIndex);
    
    const newRoute = `          <Route path="/produits/${slug}" element={<${componentName} />} />\n          `;
    
    appContent = beforeRoutesEnd + newRoute + afterRoutesEnd;

    // Écrire le fichier mis à jour
    await fs.writeFile(appTsxPath, appContent);

    return { 
      success: true, 
      message: `Route pour ${slug} ajoutée avec succès` 
    };
  } catch (error) {
    console.error("Erreur lors de l'ajout de la route:", error);
    return { 
      success: false, 
      message: `Erreur lors de l'ajout de la route: ${error.message}` 
    };
  }
}

/**
 * Supprime une route existante de App.tsx
 * @param {string} slug - Le slug du produit
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function removeRoute(slug) {
  try {
    if (!slug) {
      return { success: false, message: "Le slug est obligatoire" };
    }

    const appTsxPath = path.resolve(process.cwd(), "src/App.tsx");
    
    // Vérifier si App.tsx existe
    if (!(await fs.pathExists(appTsxPath))) {
      return { 
        success: false, 
        message: "Le fichier App.tsx n'existe pas" 
      };
    }

    // Générer le nom du composant basé sur le slug
    const componentName = `Product${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`;

    // Lire le fichier App.tsx
    let appContent = await fs.readFile(appTsxPath, "utf8");

    // Vérifier si la route existe
    if (!appContent.includes(`path="/produits/${slug}"`)) {
      return { 
        success: false, 
        message: `La route pour ${slug} n'existe pas` 
      };
    }

    // Supprimer l'import
    const importRegex = new RegExp(`import\\s+${componentName}\\s+from\\s+["']@/pages/products/${slug}["'];?\\n?`, 'g');
    appContent = appContent.replace(importRegex, '');

    // Supprimer la route
    const routeRegex = new RegExp(`\\s*<Route\\s+path=["']/produits/${slug}["']\\s+element={<${componentName}\\s*/>}\\s*/>\\n?`, 'g');
    appContent = appContent.replace(routeRegex, '');

    // Écrire le fichier mis à jour
    await fs.writeFile(appTsxPath, appContent);

    return { 
      success: true, 
      message: `Route pour ${slug} supprimée avec succès` 
    };
  } catch (error) {
    console.error("Erreur lors de la suppression de la route:", error);
    return { 
      success: false, 
      message: `Erreur lors de la suppression de la route: ${error.message}` 
    };
  }
}

// Exécution directe pour ajouter une route
async function addRouteCommand() {
  const title = process.argv[3];
  if (!title) {
    console.error("❌ Titre du produit manquant.");
    console.log("Usage: node updateRoutes.js add \"Titre du produit\"");
    process.exit(1);
  }

  const slug = slugify(title, { lower: true });
  const componentName = `Product${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`;
  
  const result = await addRoute(slug, componentName);
  if (result.success) {
    console.log(`✅ ${result.message}`);
  } else {
    console.error(`❌ ${result.message}`);
  }
}

// Exécution directe pour supprimer une route
async function removeRouteCommand() {
  const title = process.argv[3];
  if (!title) {
    console.error("❌ Titre du produit manquant.");
    console.log("Usage: node updateRoutes.js remove \"Titre du produit\"");
    process.exit(1);
  }

  const slug = slugify(title, { lower: true });
  
  const result = await removeRoute(slug);
  if (result.success) {
    console.log(`✅ ${result.message}`);
  } else {
    console.error(`❌ ${result.message}`);
  }
}

// Exécution directe si le script est appelé directement (pas importé)
if (require.main === module) {
  const command = process.argv[2];
  
  if (!command || (command !== 'add' && command !== 'remove')) {
    console.error("❌ Commande invalide.");
    console.log("Usage: node updateRoutes.js [add|remove] \"Titre du produit\"");
    process.exit(1);
  }

  if (command === 'add') {
    addRouteCommand();
  } else {
    removeRouteCommand();
  }
}

module.exports = { addRoute, removeRoute }; 