const fs = require('fs').promises;
const path = require('path');

async function updateCategoryPages() {
  try {
    // Chemin vers le répertoire des pages de catégories
    const categoriesDir = path.join(__dirname, 'src', 'pages', 'categories');
    
    // Lister tous les fichiers .tsx dans le répertoire
    const files = await fs.readdir(categoriesDir);
    const tsxFiles = files.filter(file => file.endsWith('.tsx'));
    
    console.log(`📂 Trouvé ${tsxFiles.length} fichiers de pages de catégories`);
    
    let modifiedCount = 0;
    
    for (const file of tsxFiles) {
      const filePath = path.join(categoriesDir, file);
      
      // Lire le contenu du fichier
      let content = await fs.readFile(filePath, 'utf8');
      
      // Modifications à appliquer
      
      // 1. Ajouter l'import pour fetchProductDescriptions s'il n'existe pas déjà
      if (!content.includes('fetchProductDescriptions')) {
        content = content.replace(
          /import slugify from ['"]slugify['"];/,
          `import slugify from 'slugify';\nimport { fetchProductDescriptions } from "@/lib/api/products";`
        );
      }
      
      // 2. Ajouter l'état productDescriptions s'il n'existe pas déjà
      if (!content.includes('productDescriptions')) {
        content = content.replace(
          /const hasAppliedInitialSubCategory = useRef\(false\);/,
          `const [productDescriptions, setProductDescriptions] = useState<Record<string, string>>({});\n\n  // Add this near the other state declarations\n  const hasAppliedInitialSubCategory = useRef(false);`
        );
        
        // Si la ligne const hasAppliedInitialSubCategory n'existe pas, essayons une autre approche
        if (!content.includes('productDescriptions')) {
          content = content.replace(
            /const \[brandsLoading, setBrandsLoading\] = useState\(false\);/,
            `const [brandsLoading, setBrandsLoading] = useState(false);\n  const [productDescriptions, setProductDescriptions] = useState<Record<string, string>>({});`
          );
        }
      }
      
      // 3. Ajouter l'useEffect pour charger les descriptions si pas déjà présent
      if (!content.includes('loadProductDescriptions')) {
        content = content.replace(
          /useEffect\(\) => {\s*loadProductsAndCategories\(\);\s*}, \[currentSlug, selectedSubCategories, selectedBrandIds, priceRange, inStock, promoOnly\]\);/,
          `useEffect(() => {
    loadProductsAndCategories();
  }, [currentSlug, selectedSubCategories, selectedBrandIds, priceRange, inStock, promoOnly]);

  // Récupérer les descriptions des produits
  useEffect(() => {
    if (products.length === 0) return;

    const loadProductDescriptions = async () => {
      try {
        const descriptions = await fetchProductDescriptions();
        setProductDescriptions(descriptions);
        console.log("✅ Descriptions des produits chargées:", Object.keys(descriptions).length);
      } catch (error) {
        console.error("❌ Erreur lors du chargement des descriptions:", error);
      }
    };

    loadProductDescriptions();
  }, [products]);`
        );
      }
      
      // 4. Remplacer la ligne de description dans la carte produit
      if (content.includes('{"Description non disponible"}')) {
        content = content.replace(
          /<p className="text-sm text-gray-500 line-clamp-2 mb-2 h-10">{"Description non disponible"}<\/p>/,
          `<p className="text-sm text-gray-500 line-clamp-2 mb-2 h-10">
                      {productDescriptions[product.id.toString()] || "Description non disponible"}
                    </p>`
        );
      }
      
      // Vérifier si des modifications ont été effectuées
      if (content.includes('productDescriptions') && content.includes('fetchProductDescriptions')) {
        // Écrire les modifications dans le fichier
        await fs.writeFile(filePath, content, 'utf8');
        modifiedCount++;
        console.log(`✅ Mise à jour de ${file} terminée`);
      } else {
        console.log(`⚠️ Aucune modification nécessaire pour ${file}`);
      }
    }
    
    console.log(`✅ Terminé! ${modifiedCount}/${tsxFiles.length} fichiers mis à jour.`);
  } catch (err) {
    console.error('❌ Erreur:', err);
  }
}

updateCategoryPages(); 