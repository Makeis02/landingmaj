import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const categoriesDir = path.resolve(__dirname, 'src/pages/categories');

/**
 * Ajoute des logs détaillés pour déboguer la récupération des descriptions HTML
 */
async function enhanceLogging() {
  try {
    console.log('🔍 Scanning category pages directory:', categoriesDir);
    const files = fs.readdirSync(categoriesDir);
    
    // Only process full category pages (the larger ones)
    const categoryFiles = files.filter(file => 
      file.endsWith('.tsx') && 
      !file.endsWith('.backup') &&
      fs.statSync(path.join(categoriesDir, file)).size > 10000 // Only larger files
    );
    
    console.log(`📂 Found ${categoryFiles.length} category pages to update`);
    
    let updatedFiles = 0;
    
    for (const file of categoryFiles) {
      const filePath = path.join(categoriesDir, file);
      console.log(`⚙️ Processing ${file}...`);
      
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      // 1. Améliorer le logging dans la fonction de récupération des descriptions
      if (content.includes('loadProductDescriptions')) {
        // Trouver et remplacer la fonction loadProductDescriptions par une version avec plus de logs
        const loadDescriptionsPattern = /const loadProductDescriptions = async \(\) => \{[\s\S]*?try \{[\s\S]*?const descriptions = await fetchProductDescriptions\(\);[\s\S]*?setProductDescriptions\(descriptions\);[\s\S]*?\} catch[\s\S]*?\};/;
        
        const enhancedLogging = `const loadProductDescriptions = async () => {
      try {
        console.log("🔄 [DEBUG] Début de la récupération des descriptions pour", products.length, "produits");
        console.log("🔎 [DEBUG] IDs des produits:", products.map(p => p.id.toString()));
        
        // Appel API pour récupérer les descriptions
        console.log("📡 [DEBUG] Appel de fetchProductDescriptions()");
        const descriptions = await fetchProductDescriptions();
        
        // Logging détaillé du résultat
        console.log("📋 [DEBUG] Descriptions reçues:", Object.keys(descriptions).length);
        console.log("🧪 [DEBUG] Type de l'objet descriptions:", typeof descriptions);
        
        if (Object.keys(descriptions).length === 0) {
          console.error("⚠️ [DEBUG] ALERTE: Aucune description reçue!");
        } else {
          console.log("✅ [DEBUG] Exemples de descriptions reçues:");
          Object.entries(descriptions).slice(0, 3).forEach(([id, desc]) => {
            console.log(\`   ID: \${id}, Type: \${typeof id}, Description: \${desc ? desc.substring(0, 50) + '...' : 'VIDE'}\`);
          });
        }
        
        // Vérifier les correspondances avec les produits actuels
        console.log("🔍 [DEBUG] Vérification des correspondances avec les produits affichés:");
        let matchCount = 0;
        products.forEach(product => {
          const productId = product.id.toString();
          const hasDescription = !!descriptions[productId];
          if (hasDescription) matchCount++;
          console.log(\`   🏷️ Produit \${productId} (\${product.title}): \${hasDescription ? "✅ Description trouvée" : "❌ Pas de description"}\`);
          if (hasDescription) {
            console.log(\`      📝 Aperçu: \${descriptions[productId].substring(0, 50)}...\`);
          }
        });
        console.log(\`📊 [DEBUG] Taux de correspondance: \${matchCount}/\${products.length} (\${Math.round(matchCount/products.length*100)}%)\`);
        
        // Mettre à jour l'état avec les descriptions
        console.log("💾 [DEBUG] Mise à jour de l'état productDescriptions");
        setProductDescriptions(descriptions);
        console.log("🏁 [DEBUG] Fin de loadProductDescriptions");
      } catch (error) {
        console.error("❌ [DEBUG] Erreur lors du chargement des descriptions:", error);
        console.error("📚 [DEBUG] Stack trace:", error.stack);
      }
    };`;
        
        if (loadDescriptionsPattern.test(content)) {
          content = content.replace(loadDescriptionsPattern, enhancedLogging);
          modified = true;
        }
      }
      
      // 2. Ajouter des logs au rendu des descriptions
      if (content.includes('dangerouslySetInnerHTML')) {
        const renderPattern = /dangerouslySetInnerHTML=\{\{\s*__html: getSafeHtmlDescription\(productDescriptions\[product\.id\.toString\(\)\]\)\s*\}\}/;
        
        if (renderPattern.test(content)) {
          content = content.replace(
            renderPattern,
            `dangerouslySetInnerHTML={{
                        __html: (() => {
                          const productId = product.id.toString();
                          const description = productDescriptions[productId];
                          console.log(\`🖌️ [DEBUG] Rendu description pour \${productId}: \${description ? 'Disponible' : 'Non disponible'}\`);
                          return getSafeHtmlDescription(description);
                        })()
                      }}`
          );
          modified = true;
        }
      }
      
      // 3. Améliorer la fonction getSafeHtmlDescription pour plus de logs
      if (content.includes('getSafeHtmlDescription')) {
        const safeHtmlPattern = /const getSafeHtmlDescription[\s\S]*?= \(description[\s\S]*?\) => \{[\s\S]*?if \(!description\)[\s\S]*?return[\s\S]*?;[\s\S]*?\};/;
        
        const enhancedSafeHtml = `const getSafeHtmlDescription = (description: string | undefined): string => {
  console.log("🧼 [DEBUG] getSafeHtmlDescription appelé avec:", description ? \`description de \${description.length} caractères\` : "undefined");
  
  if (!description) {
    console.log("⚠️ [DEBUG] Description manquante, retourne fallback");
    return "Description non disponible";
  }
  
  // Simple HTML validation - check if it has HTML-like content
  const hasHtmlContent = /<[a-z][\\s\\S]*>/i.test(description);
  console.log("🔍 [DEBUG] La description contient du HTML:", hasHtmlContent);
  
  // If it's already HTML content, return it as is
  if (hasHtmlContent) {
    console.log("✅ [DEBUG] Retourne contenu HTML");
    return description;
  }
  
  // Otherwise treat it as plain text
  console.log("📝 [DEBUG] Retourne texte brut:", description.substring(0, 50) + "...");
  return description.trim() || "Description non disponible";
};`;
        
        if (safeHtmlPattern.test(content)) {
          content = content.replace(safeHtmlPattern, enhancedSafeHtml);
          modified = true;
        }
      }
      
      if (modified) {
        // Create backup of original file
        const backupPath = `${filePath}.debug`;
        fs.writeFileSync(backupPath, fs.readFileSync(filePath));
        console.log(`📑 Created debug backup at ${backupPath}`);
        
        // Write updated content with enhanced logging
        fs.writeFileSync(filePath, content);
        console.log(`✅ Added debug logs to ${file}`);
        updatedFiles++;
      } else {
        console.log(`ℹ️ No logging changes made to ${file}`);
      }
    }
    
    console.log(`\n🎉 Process completed! Enhanced logging in ${updatedFiles} files.`);
    
    // 4. Ajouter des logs à la fonction fetchProductDescriptions
    const apiProductsPath = path.resolve(__dirname, 'src/lib/api/products.ts');
    if (fs.existsSync(apiProductsPath)) {
      console.log(`🔍 Examining fetchProductDescriptions in API file...`);
      let apiContent = fs.readFileSync(apiProductsPath, 'utf8');
      let apiModified = false;
      
      if (apiContent.includes('fetchProductDescriptions')) {
        const fetchPattern = /export const fetchProductDescriptions = async[\s\S]*?\(\)[\s\S]*?{[\s\S]*?try {[\s\S]*?return normalizedDescriptions;[\s\S]*?} catch[\s\S]*?}/;
        
        if (fetchPattern.test(apiContent)) {
          // Create backup
          fs.writeFileSync(`${apiProductsPath}.debug`, apiContent);
          console.log(`📑 Created API debug backup at ${apiProductsPath}.debug`);
          
          // Enhanced logging in fetchProductDescriptions
          apiContent = apiContent.replace(
            /const apiBaseUrl = getApiBaseUrl\(\);[\s\S]*?console\.log\("🔍 Récupération des descriptions de produits depuis l'API\.\.\."\);/,
            `const apiBaseUrl = getApiBaseUrl();
    console.log("🔍 [DEBUG] Début de fetchProductDescriptions");
    console.log("⏱️ [DEBUG] Timestamp:", new Date().toISOString());
    console.log("🔍 [DEBUG] Récupération des descriptions de produits depuis l'API...");`
          );
          
          apiContent = apiContent.replace(
            /const response = await fetch\(`\${apiBaseUrl}\/api\/products\/descriptions`\);/,
            `console.log("🌐 [DEBUG] URL complète:", \`\${apiBaseUrl}/api/products/descriptions\`);
    const startTime = Date.now();
    console.log("⏱️ [DEBUG] Début de la requête fetch");
    const response = await fetch(\`\${apiBaseUrl}/api/products/descriptions\`);
    const endTime = Date.now();
    console.log(\`⏱️ [DEBUG] Requête fetch terminée en \${endTime - startTime}ms\`);`
          );
          
          apiContent = apiContent.replace(
            /if \(!response\.ok\) {[\s\S]*?throw new Error\(`Erreur HTTP: \${response\.status}`\);[\s\S]*?}/,
            `if (!response.ok) {
      console.error(\`❌ [DEBUG] Erreur HTTP: \${response.status}\`);
      const responseText = await response.text();
      console.error(\`❌ [DEBUG] Contenu de la réponse en erreur: \${responseText}\`);
      throw new Error(\`Erreur HTTP: \${response.status}\`);
    }`
          );
          
          apiContent = apiContent.replace(
            /const data = await response\.json\(\);/,
            `console.log("⏱️ [DEBUG] Début parsing JSON");
    const data = await response.json();
    console.log("⏱️ [DEBUG] Fin parsing JSON");
    console.log("📦 [DEBUG] Type de la réponse:", typeof data);
    console.log("📦 [DEBUG] Structure de la réponse:", Object.keys(data));`
          );
          
          apiContent = apiContent.replace(
            /const descriptions = data\.descriptions \|\| \{\};/,
            `const descriptions = data.descriptions || {};
    console.log("📦 [DEBUG] Type de data.descriptions:", typeof data.descriptions);
    console.log("📦 [DEBUG] Nombre de descriptions:", Object.keys(descriptions).length);`
          );
          
          apiContent = apiContent.replace(
            /return normalizedDescriptions;/,
            `console.log("🏁 [DEBUG] Fin de fetchProductDescriptions, retourne", Object.keys(normalizedDescriptions).length, "descriptions");
    return normalizedDescriptions;`
          );
          
          fs.writeFileSync(apiProductsPath, apiContent);
          console.log(`✅ Enhanced logging in API file`);
          apiModified = true;
        }
      }
      
      if (!apiModified) {
        console.log(`ℹ️ No logging changes made to API file`);
      }
    }
    
    console.log(`\n🏁 All logging enhancements completed!`);
    console.log(`⚠️ N'oubliez pas d'ouvrir la console du navigateur (F12) pour voir les logs de débogage.`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
enhanceLogging(); 