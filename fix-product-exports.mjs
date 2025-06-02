#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import slugify from 'slugify';

// Obtenir le répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin du dossier des produits
const productsDir = path.join(__dirname, 'src', 'pages', 'products');

async function fixProductExports() {
  console.log('🔍 Recherche des pages produit à corriger...');
  
  try {
    // Vérifier si le dossier existe
    try {
      await fs.access(productsDir);
    } catch (err) {
      console.error(`❌ Le dossier ${productsDir} n'existe pas.`);
      return;
    }
    
    // Lister tous les fichiers
    const files = await fs.readdir(productsDir);
    const productFiles = files.filter(file => file.endsWith('.tsx'));
    
    console.log(`📑 Nombre de fichiers produit trouvés: ${productFiles.length}`);
    
    let correctedCount = 0;
    let alreadyCorrectCount = 0;
    let errorCount = 0;
    
    // Traiter chaque fichier
    for (const file of productFiles) {
      try {
        const filePath = path.join(productsDir, file);
        const fileContent = await fs.readFile(filePath, 'utf8');
        
        // Générer le nom du composant React à partir du nom de fichier
        const slug = file.replace('.tsx', '');
        const componentName = `Product${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`;
        
        // Vérifier si le fichier a déjà le bon export
        const hasCorrectExport = fileContent.includes(`export default ${componentName};`);
        
        // Vérifier si le composant est correctement défini
        const hasCorrectComponentDef = fileContent.includes(`const ${componentName} =`);
        
        if (hasCorrectExport && hasCorrectComponentDef) {
          console.log(`✅ ${file} est déjà correct.`);
          alreadyCorrectCount++;
          continue;
        }
        
        // Créer une copie modifiée du contenu
        let updatedContent = fileContent;
        
        // Remplacer toutes les déclarations de composant incorrectes
        if (!hasCorrectComponentDef) {
          // Rechercher différentes formes de déclaration de composant
          const patterns = [
            /const\s+ProductPage\s*=/g,
            /const\s+Modele\s*=/g,
            // Essayer de trouver un composant avec un nom similaire
            new RegExp(`const\\s+Product[A-Z][a-zA-Z]*\\s*=`, 'g')
          ];
          
          let componentFound = false;
          for (const pattern of patterns) {
            if (updatedContent.match(pattern)) {
              updatedContent = updatedContent.replace(pattern, `const ${componentName} =`);
              componentFound = true;
              console.log(`🔄 Remplacé la déclaration du composant dans ${file}`);
              break;
            }
          }
          
          if (!componentFound) {
            console.warn(`⚠️ Impossible de trouver une déclaration de composant à remplacer dans ${file}`);
          }
        }
        
        // Remplacer l'export incorrect
        if (!hasCorrectExport) {
          // Rechercher différentes formes d'export
          const exportPatterns = [
            /export\s+default\s+ProductPage;/g,
            /export\s+default\s+Modele;/g,
            /export\s+default\s+Product[A-Z][a-zA-Z]*;/g
          ];
          
          let exportFound = false;
          for (const pattern of exportPatterns) {
            if (updatedContent.match(pattern)) {
              updatedContent = updatedContent.replace(pattern, `export default ${componentName};`);
              exportFound = true;
              console.log(`🔄 Remplacé l'export dans ${file}`);
              break;
            }
          }
          
          // Si aucun export n'a été trouvé, ajouter un export à la fin du fichier
          if (!exportFound) {
            if (!updatedContent.includes('export default')) {
              updatedContent += `\nexport default ${componentName};\n`;
              console.log(`➕ Ajouté un export manquant dans ${file}`);
            } else {
              console.warn(`⚠️ Un export est présent mais non reconnu dans ${file}`);
            }
          }
        }
        
        // Si le contenu a été modifié, écrire les modifications
        if (updatedContent !== fileContent) {
          await fs.writeFile(filePath, updatedContent, 'utf8');
          console.log(`✅ ${file} corrigé avec succès.`);
          correctedCount++;
        }
      } catch (err) {
        console.error(`❌ Erreur lors du traitement de ${file}:`, err);
        errorCount++;
      }
    }
    
    console.log('\n📊 Résumé:');
    console.log(`  ✅ ${alreadyCorrectCount} fichiers déjà corrects`);
    console.log(`  🔄 ${correctedCount} fichiers corrigés`);
    console.log(`  ❌ ${errorCount} fichiers avec erreurs`);
    
  } catch (err) {
    console.error('❌ Une erreur est survenue:', err);
  }
}

// Exécuter la fonction principale
fixProductExports(); 