import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Ajoute des logs de débogage détaillés à EaucDouceDécorationPage.tsx
 */
async function debugDescriptions() {
  try {
    // Cibler spécifiquement la page EaucDouceDécorationPage.tsx
    const filePath = path.resolve(__dirname, 'src/pages/categories/EaucDouceDécorationPage.tsx');
    console.log(`🔍 Modifying file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      return;
    }
    
    // Créer une sauvegarde
    const backupPath = `${filePath}.debug-backup`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`📑 Created backup at ${backupPath}`);
    
    // Lire le contenu
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Ajouter une variable pour tracer les descriptions
    content = content.replace(
      /const \[productDescriptions, setProductDescriptions\] = useState<Record<string, string>>\({}\);/,
      `const [productDescriptions, setProductDescriptions] = useState<Record<string, string>>({});
  const [debugLoaded, setDebugLoaded] = useState<boolean>(false);
  
  // Pour le débogage, afficher les descriptions dans la console à chaque rendu
  useEffect(() => {
    if (!debugLoaded && Object.keys(productDescriptions).length > 0) {
      console.log("🔍 [DEBUG] productDescriptions chargées:", Object.keys(productDescriptions).length);
      console.log("🔑 [DEBUG] Clés des productDescriptions:", Object.keys(productDescriptions));
      setDebugLoaded(true);
    }
  }, [productDescriptions, debugLoaded]);`
    );
    
    // 2. Améliorer la function loadProductDescriptions
    content = content.replace(
      /const loadProductDescriptions = async \(\) => {[\s\S]*?try {[\s\S]*?const descriptions = await fetchProductDescriptions\(\);[\s\S]*?setProductDescriptions\(descriptions\);[\s\S]*?} catch[\s\S]*?};/,
      `const loadProductDescriptions = async () => {
      try {
        console.log("🟢 [DEBUG] Chargement des descriptions - DÉBUT");
        window.DEBUG_PRODUCTS = products; // Pour accès via console
        
        // Log des infos sur les produits qu'on va chercher à associer
        console.log("📋 [DEBUG] Nombre de produits:", products.length);
        const productIds = products.map(p => p.id.toString());
        console.log("🔑 [DEBUG] IDs des produits:", productIds);
        
        // Appel de la fonction fetchProductDescriptions
        console.log("📡 [DEBUG] Appel de fetchProductDescriptions()...");
        const startTime = Date.now();
        const descriptions = await fetchProductDescriptions();
        const endTime = Date.now();
        console.log(\`⏱️ [DEBUG] Temps d'exécution: \${endTime - startTime}ms\`);
        
        // Pour debug dans la console
        window.DEBUG_DESCRIPTIONS = descriptions;
        
        // Analyse des résultats
        console.log("📊 [DEBUG] Descriptions reçues:", Object.keys(descriptions).length);
        console.log("📊 [DEBUG] Type de descriptions:", typeof descriptions);
        
        if (Object.keys(descriptions).length === 0) {
          console.error("⚠️ [DEBUG] ALERTE: Aucune description reçue!");
        } else {
          // Afficher quelques exemples
          const sample = Object.entries(descriptions).slice(0, 5);
          console.log("📝 [DEBUG] Échantillon de descriptions:");
          sample.forEach(([id, desc]) => {
            console.log(\`   ID: \${id}, Description: \${desc ? desc.substring(0, 100) + '...' : 'VIDE'}\`);
          });
          
          // Vérifier les correspondances
          console.log("🔍 [DEBUG] Vérification des correspondances avec les produits:");
          let matchCount = 0;
          let mismatchIds = [];
          
          products.forEach(product => {
            const productId = product.id.toString();
            const hasDescription = !!descriptions[productId];
            
            if (hasDescription) {
              matchCount++;
              console.log(\`   ✅ Match: Produit \${productId} (\${product.title})\`);
            } else {
              mismatchIds.push(productId);
              console.log(\`   ❌ NO MATCH: Produit \${productId} (\${product.title})\`);
            }
          });
          
          console.log(\`📊 [DEBUG] Taux de correspondance: \${matchCount}/\${products.length} (\${Math.round(matchCount/products.length*100)}%)\`);
          
          if (mismatchIds.length > 0) {
            console.log("⚠️ [DEBUG] IDs sans description:", mismatchIds);
            
            // Vérifier si les IDs sont numériques ou sous forme de chaîne
            console.log("🔍 [DEBUG] Types des IDs des produits:");
            productIds.slice(0, 5).forEach(id => {
              console.log(\`   ID: \${id}, Type: \${typeof id}\`);
            });
            
            console.log("🔍 [DEBUG] Types des clés de descriptions:");
            Object.keys(descriptions).slice(0, 5).forEach(key => {
              console.log(\`   Clé: \${key}, Type: \${typeof key}\`);
            });
          }
        }
        
        // Mise à jour de l'état
        console.log("💾 [DEBUG] Mise à jour de l'état avec setProductDescriptions");
        setProductDescriptions(descriptions);
        console.log("🟢 [DEBUG] Chargement des descriptions - FIN");
      } catch (error) {
        console.error("❌ [DEBUG] ERREUR lors du chargement des descriptions:", error);
        console.error("📚 [DEBUG] Stack trace:", error.stack);
      }
    };`
    );
    
    // 3. Améliorer le rendu des descriptions
    content = content.replace(
      /<p\s+className="text-sm text-gray-500 line-clamp-2 mb-2 h-10"\s+dangerouslySetInnerHTML=\{\{\s*__html: getSafeHtmlDescription\(productDescriptions\[product\.id\.toString\(\)\]\)\s*\}\}\s*\/>/,
      `<div className="relative">
                      <p
                        className="text-sm text-gray-500 line-clamp-2 mb-2 h-10"
                        dangerouslySetInnerHTML={{
                          __html: (() => {
                            const productId = product.id.toString();
                            console.log(\`🖌️ [DEBUG] Rendu description pour produit: \${productId}\`);
                            const description = productDescriptions[productId];
                            const hasDesc = !!description;
                            console.log(\`   \${hasDesc ? '✅' : '❌'} Description \${hasDesc ? 'trouvée' : 'manquante'}\`);
                            if (hasDesc) {
                              console.log(\`   📝 Contenu: \${description.substring(0, 50)}...\`);
                            }
                            return getSafeHtmlDescription(description);
                          })()
                        }}
                      />
                      {/* Indicateur visuel pour le débogage */}
                      <div 
                        className={\`absolute top-0 right-0 w-2 h-2 rounded-full \${
                          productDescriptions[product.id.toString()] ? 'bg-green-500' : 'bg-red-500'
                        }\`}
                        title={\`Description \${productDescriptions[product.id.toString()] ? 'trouvée' : 'manquante'}\`}
                      />
                    </div>`
    );
    
    // 4. Améliorer la fonction getSafeHtmlDescription
    if (content.includes('getSafeHtmlDescription')) {
      content = content.replace(
        /const getSafeHtmlDescription = \(description: string \| undefined\): string => {[\s\S]*?if \(!description\)[\s\S]*?return[\s\S]*?};/,
        `const getSafeHtmlDescription = (description: string | undefined): string => {
  console.log("🧼 [DEBUG] getSafeHtmlDescription appelé");
  
  if (!description) {
    console.log("⚠️ [DEBUG] Description undefined ou null");
    return "Description non disponible";
  }
  
  // Vérifier si c'est du HTML
  const hasHtmlContent = /<[a-z][\\s\\S]*>/i.test(description);
  
  console.log(\`🧼 [DEBUG] Description (longueur: \${description.length}): \${hasHtmlContent ? 'HTML' : 'texte brut'}\`);
  console.log(\`   \${description.substring(0, 100)}...\`);
  
  return description || "Description non disponible";
};`
      );
    }
    
    // Écrire le fichier modifié
    fs.writeFileSync(filePath, content);
    console.log(`✅ Added detailed debug logs`);
    
    // Modifier également la fonction fetchProductDescriptions dans l'API
    const apiFilePath = path.resolve(__dirname, 'src/lib/api/products.ts');
    
    if (fs.existsSync(apiFilePath)) {
      console.log(`\n🔍 Modifying API file: ${apiFilePath}`);
      fs.copyFileSync(apiFilePath, `${apiFilePath}.debug-backup`);
      
      let apiContent = fs.readFileSync(apiFilePath, 'utf8');
      
      // Ajouter des logs à fetchProductDescriptions
      if (apiContent.includes('fetchProductDescriptions')) {
        apiContent = apiContent.replace(
          /export const fetchProductDescriptions = async \(\): Promise<Record<string, string>> => {/,
          `export const fetchProductDescriptions = async (): Promise<Record<string, string>> => {
  console.log("🌟 [DEBUG] fetchProductDescriptions DÉBUT - " + new Date().toISOString());`
        );
        
        apiContent = apiContent.replace(
          /const apiBaseUrl = getApiBaseUrl\(\);/,
          `const apiBaseUrl = getApiBaseUrl();
    console.log("🌐 [DEBUG] API Base URL:", apiBaseUrl);`
        );
        
        apiContent = apiContent.replace(
          /const response = await fetch\(`\${apiBaseUrl}\/api\/products\/descriptions`\);/,
          `console.log("🌐 [DEBUG] URL complète:", \`\${apiBaseUrl}/api/products/descriptions\`);
    const startFetch = Date.now();
    const response = await fetch(\`\${apiBaseUrl}/api/products/descriptions\`);
    console.log(\`⏱️ [DEBUG] Fetch terminé en \${Date.now() - startFetch}ms\`);`
        );
        
        apiContent = apiContent.replace(
          /const data = await response\.json\(\);/,
          `console.log("🔄 [DEBUG] Parsing de la réponse JSON...");
    const data = await response.json();
    console.log("📦 [DEBUG] Structure de data:", Object.keys(data));
    console.log("📦 [DEBUG] Type de data:", typeof data);`
        );
        
        apiContent = apiContent.replace(
          /const normalizedDescriptions: Record<string, string> = \{\};/,
          `const normalizedDescriptions: Record<string, string> = {};
    console.log("🔑 [DEBUG] Descriptions brutes reçues:", Object.keys(descriptions).length);`
        );
        
        apiContent = apiContent.replace(
          /return normalizedDescriptions;/,
          `console.log("📤 [DEBUG] Nombres de descriptions normalisées:", Object.keys(normalizedDescriptions).length);
    console.log("🔑 [DEBUG] Exemples de clés:", Object.keys(normalizedDescriptions).slice(0, 5));
    console.log("🌟 [DEBUG] fetchProductDescriptions FIN");
    
    // Pour déboguer des problèmes de types
    if (Object.keys(normalizedDescriptions).length > 0) {
      const sampleKeys = Object.keys(normalizedDescriptions).slice(0, 3);
      console.log("🔍 [DEBUG] Types des clés:");
      sampleKeys.forEach(key => {
        console.log(\`   Clé: "\${key}", Type: \${typeof key}, Est numérique: \${!isNaN(Number(key))}\`);
      });
    }
    
    return normalizedDescriptions;`
        );
        
        // Écrire le fichier modifié
        fs.writeFileSync(apiFilePath, apiContent);
        console.log(`✅ Added detailed debug logs to API file`);
      }
    }
    
    console.log('\n🎉 Debugging setup completed!');
    console.log('⚠️ Assurez-vous d\'ouvrir la console du navigateur (F12) pour voir les logs détaillés.');
    console.log('💡 Après débogage, vous pouvez restaurer les fichiers originaux à partir des sauvegardes .debug-backup');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
debugDescriptions(); 