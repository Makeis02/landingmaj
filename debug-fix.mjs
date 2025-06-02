import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fonction pour diagnostiquer le problème de récupération des descriptions
async function diagnoseProblem() {
  console.log("🔍 Début du diagnostic du problème de descriptions...");
  
  try {
    // 1. Vérifier si les fichiers existent
    const apiFilePath = path.resolve(__dirname, 'src/lib/api/products.ts');
    const categoryFilePath = path.resolve(__dirname, 'src/pages/categories/EaucDouceDécorationPage.tsx');
    
    if (!fs.existsSync(apiFilePath)) {
      console.error("❌ Fichier API introuvable:", apiFilePath);
      return;
    }
    
    if (!fs.existsSync(categoryFilePath)) {
      console.error("❌ Fichier catégorie introuvable:", categoryFilePath);
      return;
    }
    
    console.log("✅ Fichiers trouvés");
    
    // 2. Vérifier si fetchProductDescriptions est correctement importé
    const categoryContent = fs.readFileSync(categoryFilePath, 'utf8');
    const hasImport = categoryContent.includes('import { fetchProductDescriptions } from');
    
    if (!hasImport) {
      console.log("⚠️ Problème détecté: import de fetchProductDescriptions manquant");
      
      // Créer une sauvegarde du fichier
      fs.writeFileSync(`${categoryFilePath}.fix`, categoryContent);
      console.log(`📑 Sauvegarde créée: ${categoryFilePath}.fix`);
      
      // Ajouter l'import manquant
      const newContent = categoryContent.replace(
        /import { fetchBrands, Brand, fetchBrandsForProducts } from "@\/lib\/api\/brands";/,
        `import { fetchBrands, Brand, fetchBrandsForProducts } from "@/lib/api/brands";\nimport { fetchProductDescriptions } from "@/lib/api/products";`
      );
      
      fs.writeFileSync(categoryFilePath, newContent);
      console.log("✅ Import ajouté");
    } else {
      console.log("✅ L'import fetchProductDescriptions est présent");
    }
    
    // 3. Vérifier si productDescriptions est correctement initialisé
    const hasState = categoryContent.includes('const [productDescriptions, setProductDescriptions] = useState');
    
    if (!hasState) {
      console.log("⚠️ Problème détecté: état productDescriptions manquant");
      
      if (!fs.existsSync(`${categoryFilePath}.fix`)) {
        fs.writeFileSync(`${categoryFilePath}.fix`, categoryContent);
        console.log(`📑 Sauvegarde créée: ${categoryFilePath}.fix`);
      }
      
      // Ajouter l'état manquant
      let newContent = categoryContent.replace(
        /const \[brandsLoading, setBrandsLoading\] = useState\(false\);/,
        `const [brandsLoading, setBrandsLoading] = useState(false);\n  const [productDescriptions, setProductDescriptions] = useState<Record<string, string>>({});`
      );
      
      fs.writeFileSync(categoryFilePath, newContent);
      console.log("✅ État productDescriptions ajouté");
    } else {
      console.log("✅ L'état productDescriptions est présent");
    }
    
    // 4. Vérifier si la fonction loadProductDescriptions est présente
    const hasLoadFunction = categoryContent.includes('loadProductDescriptions');
    
    if (!hasLoadFunction) {
      console.log("⚠️ Problème détecté: fonction loadProductDescriptions manquante");
      
      if (!fs.existsSync(`${categoryFilePath}.fix`)) {
        fs.writeFileSync(`${categoryFilePath}.fix`, categoryContent);
        console.log(`📑 Sauvegarde créée: ${categoryFilePath}.fix`);
      }
      
      // Trouver la position après le useEffect de loadProductsAndCategories
      const effectPos = categoryContent.indexOf('}, [currentSlug, selectedSubCategories, selectedBrandIds, priceRange, inStock, promoOnly]);');
      
      if (effectPos !== -1) {
        const beforeEffect = categoryContent.substring(0, effectPos + '}, [currentSlug, selectedSubCategories, selectedBrandIds, priceRange, inStock, promoOnly]);'.length);
        const afterEffect = categoryContent.substring(effectPos + '}, [currentSlug, selectedSubCategories, selectedBrandIds, priceRange, inStock, promoOnly]);'.length);
        
        const newContent = beforeEffect + `

  // Récupérer les descriptions des produits
  useEffect(() => {
    if (products.length === 0) return;

    const loadProductDescriptions = async () => {
      try {
        console.log("🔄 [DEBUG] Chargement des descriptions pour", products.length, "produits");
        const descriptions = await fetchProductDescriptions();
        console.log("📋 [DEBUG] Descriptions reçues:", Object.keys(descriptions).length);
        
        // Afficher des informations détaillées sur les descriptions reçues
        if (Object.keys(descriptions).length > 0) {
          console.log("📊 [DEBUG] Échantillon de descriptions:");
          Object.entries(descriptions).slice(0, 3).forEach(([id, desc]) => {
            console.log(\`   ID: \${id}, Type: \${typeof id}, Description: \${desc ? desc.substring(0, 50) + '...' : 'VIDE'}\`);
          });
          
          console.log("🔍 [DEBUG] Vérification des correspondances:");
          products.forEach(product => {
            const productId = product.id.toString();
            console.log(\`   Produit \${productId} (\${product.title}): \${descriptions[productId] ? "✅ Description trouvée" : "❌ Pas de description"}\`);
          });
        }
        
        setProductDescriptions(descriptions);
      } catch (error) {
        console.error("❌ [DEBUG] Erreur lors du chargement des descriptions:", error);
      }
    };

    loadProductDescriptions();
  }, [products]);` + afterEffect;
        
        fs.writeFileSync(categoryFilePath, newContent);
        console.log("✅ Fonction loadProductDescriptions ajoutée");
      } else {
        console.error("❌ Position d'insertion non trouvée pour la fonction loadProductDescriptions");
      }
    } else {
      console.log("✅ La fonction loadProductDescriptions est présente");
    }
    
    // 5. Vérifier si le rendu avec dangerouslySetInnerHTML est présent
    const hasHtmlRender = categoryContent.includes('dangerouslySetInnerHTML');
    
    if (!hasHtmlRender) {
      console.log("⚠️ Problème détecté: rendu HTML manquant");
      
      if (!fs.existsSync(`${categoryFilePath}.fix`)) {
        fs.writeFileSync(`${categoryFilePath}.fix`, categoryContent);
        console.log(`📑 Sauvegarde créée: ${categoryFilePath}.fix`);
      }
      
      // Remplacer la description standard par le rendu HTML
      const newContent = categoryContent.replace(
        /<p className="text-sm text-gray-500 line-clamp-2 mb-2 h-10">[^<]*<\/p>/g,
        `<p
      className="text-sm text-gray-500 line-clamp-2 mb-2 h-10"
      dangerouslySetInnerHTML={{
        __html: productDescriptions[product.id.toString()] || "Description non disponible"
      }}
    />`
      );
      
      fs.writeFileSync(categoryFilePath, newContent);
      console.log("✅ Rendu HTML ajouté");
    } else {
      console.log("✅ Le rendu HTML est présent");
    }
    
    // 6. Ajouter un console.log à server.js pour déboguer l'API
    const serverPath = path.resolve(__dirname, 'server.js');
    if (fs.existsSync(serverPath)) {
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      // Créer une sauvegarde
      fs.writeFileSync(`${serverPath}.fix`, serverContent);
      
      // Ajouter des logs dans l'API pour les descriptions
      if (serverContent.includes('/api/products/descriptions')) {
        console.log("🔍 Ajout de logs dans l'API de descriptions de produits");
        
        const newContent = serverContent.replace(
          /app\.get\('\/api\/products\/descriptions', async \(req, res\) => {/,
          `app.get('/api/products/descriptions', async (req, res) => {
  console.log("🌟 [DEBUG] API /api/products/descriptions appelée");`
        );
        
        fs.writeFileSync(serverPath, newContent);
        console.log("✅ Logs ajoutés au serveur");
      }
    }
    
    console.log("\n🎯 Diagnostic terminé. Principaux problèmes potentiels identifiés et corrigés:");
    console.log("1. Import de fetchProductDescriptions");
    console.log("2. État productDescriptions");
    console.log("3. Fonction de chargement des descriptions");
    console.log("4. Rendu HTML des descriptions");
    console.log("\n⚠️ Pour voir les résultats, rafraîchissez la page et ouvrez la console du navigateur (F12).");
    
  } catch (error) {
    console.error("❌ Erreur pendant le diagnostic:", error);
  }
}

// Exécuter le script
diagnoseProblem(); 