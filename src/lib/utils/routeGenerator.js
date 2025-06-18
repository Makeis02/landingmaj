import { toComponentName, isValidComponentName } from './componentNames.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appTsxPath = path.join(__dirname, '..', '..', 'App.tsx');

/**
 * Génère une ligne d'import React pour un fichier produit
 */
export function generateImport(slug) {
  const componentName = toComponentName(slug);
  if (!isValidComponentName(componentName)) {
    throw new Error(`Nom de composant invalide généré pour le slug "${slug}": ${componentName}`);
  }
  return `import ${componentName} from "@/pages/products/${slug}";`;
}

/**
 * Génère une route React pour App.tsx
 */
export function generateRoute(slug) {
  // 🔐 Sécurité anti-bug: vérifier que le slug est valide
  if (!slug || typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`❌ Slug invalide pour generateRoute(): "${slug}"`);
  }
  
  const componentName = toComponentName(slug);
  if (!isValidComponentName(componentName)) {
    throw new Error(`Nom de composant invalide généré pour le slug "${slug}": ${componentName}`);
  }
  return `<Route path="/produits/${slug}" element={<${componentName} />} />`;
}

/**
 * Génère le bloc complet d'import et de route pour un produit
 */
export function generateProductRoutes(slugs) {
  const imports = slugs.map(generateImport).join('\n');
  const routes = slugs.map(generateRoute).join('\n');
  
  return `${imports}\n\n${routes}`;
}

/**
 * Vérifie si un slug est valide pour la génération de routes
 */
export function isValidProductSlug(slug) {
  return /^[a-z0-9-]+$/.test(slug) && !slug.startsWith('-') && !slug.endsWith('-');
}

/**
 * Ajoute une nouvelle route dans App.tsx
 */
export async function addRoute(slug, componentName) {
  try {
    // 🔐 Sécurité anti-bug: vérifier que le slug est valide
    if (!slug || typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) {
      console.warn(`❌ Slug invalide détecté : "${slug}"`);
      return { success: false, message: `Slug invalide : "${slug}"` };
    }
    
    if (!slug) {
      return { 
        success: false, 
        message: "Le slug est obligatoire" 
      };
    }

    // Utiliser le nom de composant fourni ou en générer un
    const finalComponentName = componentName || toComponentName(slug);
    
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
    const importStatement = `import ${finalComponentName} from "@/pages/products/${slug}";`;
    
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
    
    const newRoute = `          <Route path="/produits/${slug}" element={<${finalComponentName} />} />\n          `;
    
    appContent = beforeRoutesEnd + newRoute + afterRoutesEnd;

    // Écrire le fichier mis à jour
    await fs.writeFile(appTsxPath, appContent);

    return { 
      success: true, 
      message: `Route pour ${slug} ajoutée avec succès` 
    };
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout de la route:", error);
    return { 
      success: false, 
      message: `Erreur lors de l'ajout de la route: ${error.message}` 
    };
  }
}

/**
 * Supprime une route existante de App.tsx
 */
export async function removeRoute(slug) {
  try {
    if (!slug) {
      return { success: false, message: "Le slug est obligatoire" };
    }

    // Vérifier si App.tsx existe
    if (!(await fs.pathExists(appTsxPath))) {
      return { 
        success: false, 
        message: "Le fichier App.tsx n'existe pas" 
      };
    }

    // Générer le nom du composant basé sur le slug
    const componentName = toComponentName(slug);

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
    console.error("❌ Erreur lors de la suppression de la route:", error);
    return { 
      success: false, 
      message: `Erreur lors de la suppression de la route: ${error.message}` 
    };
  }
} 