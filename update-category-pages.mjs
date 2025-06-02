import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtenir le répertoire courant en utilisant import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      
      let modified = false;
      
      // Modifications à appliquer
      
      // 0. Assurer que slugify est importé
      if (!content.includes('import slugify from')) {
        // Si nous n'avons pas encore l'import slugify, ajoutons-le
        if (content.includes('import React')) {
          content = content.replace(
            /import React.*?;/,
            `$&\nimport slugify from 'slugify';`
          );
          modified = true;
        } else if (content.includes('import { useState')) {
          content = content.replace(
            /import { useState/,
            `import slugify from 'slugify';\nimport { useState`
          );
          modified = true;
        } else if (content.includes('import ')) {
          // Ajouter après le premier import trouvé
          content = content.replace(
            /import .*?;/,
            `$&\nimport slugify from 'slugify';`
          );
          modified = true;
        } else {
          // Si aucun import n'est trouvé (cas rare), ajouter au début du fichier
          content = `import slugify from 'slugify';\n` + content;
          modified = true;
        }
      }
      
      // 1. Ajouter l'import pour fetchProductDescriptions s'il n'existe pas déjà
      if (!content.includes('fetchProductDescriptions')) {
        content = content.replace(
          /import slugify from ['"]slugify['"];/,
          `import slugify from 'slugify';\nimport { fetchProductDescriptions } from "@/lib/api/products";`
        );
        
        // Si la première tentative échoue, essayons une autre approche
        if (!content.includes('fetchProductDescriptions')) {
          content = content.replace(
            /import { useCartStore } from "@\/stores\/useCartStore";/,
            `import { useCartStore } from "@/stores/useCartStore";\nimport { fetchProductDescriptions } from "@/lib/api/products";`
          );
        }
        
        // Si toujours pas d'import, essayons une approche plus générique
        if (!content.includes('fetchProductDescriptions')) {
          content = content.replace(
            /import slugify from ['"]slugify['"];/,
            `import slugify from 'slugify';\nimport { fetchProductDescriptions } from "@/lib/api/products";`
          );
        }
        modified = true;
      }
      
      // 2. Ajouter RouterLink pour la redirection si non présent
      if (!content.includes('Link as RouterLink') && !content.includes('import { Link } from "react-router-dom"')) {
        // Essayer différentes variantes d'import de react-router-dom
        if (content.includes('import { useParams, useSearchParams } from "react-router-dom"')) {
          content = content.replace(
            /import { useParams, useSearchParams } from "react-router-dom";/,
            `import { useParams, useSearchParams, Link as RouterLink } from "react-router-dom";`
          );
        } else if (content.includes('import { useParams } from "react-router-dom"')) {
          content = content.replace(
            /import { useParams } from "react-router-dom";/,
            `import { useParams, Link as RouterLink } from "react-router-dom";`
          );
        } else if (content.includes('import') && content.includes('react-router-dom')) {
          // Extraction plus générique pour tout import react-router-dom
          const routerImportRegex = /import\s+{([^}]+)}\s+from\s+["']react-router-dom["']/;
          const match = content.match(routerImportRegex);
          if (match) {
            const currentImports = match[1];
            if (!currentImports.includes('Link')) {
              content = content.replace(
                routerImportRegex,
                `import { ${currentImports}, Link as RouterLink } from "react-router-dom"`
              );
            }
          }
        } else {
          // Si aucun import react-router-dom n'est trouvé, ajouter un nouveau
          content = content.replace(
            /import[^;]+;/,
            `$&\nimport { Link as RouterLink } from "react-router-dom";`
          );
        }
        modified = true;
      }
      
      // 3. Ajouter l'état productDescriptions s'il n'existe pas déjà
      if (!content.includes('productDescriptions')) {
        // Plusieurs tentatives pour trouver un bon endroit pour insérer l'état
        if (content.includes('const hasAppliedInitialSubCategory = useRef(false);')) {
          content = content.replace(
            /const hasAppliedInitialSubCategory = useRef\(false\);/,
            `const [productDescriptions, setProductDescriptions] = useState<Record<string, string>>({});\n\n  // Add this near the other state declarations\n  const hasAppliedInitialSubCategory = useRef(false);`
          );
        } else if (content.includes('const [brandsLoading, setBrandsLoading] = useState(false);')) {
          content = content.replace(
            /const \[brandsLoading, setBrandsLoading\] = useState\(false\);/,
            `const [brandsLoading, setBrandsLoading] = useState(false);\n  const [productDescriptions, setProductDescriptions] = useState<Record<string, string>>({});`
          );
        } else if (content.includes('useState')) {
          // Recherche plus générique pour tout useState
          content = content.replace(
            /const \[[^\]]+\] = useState\([^)]*\);/,
            `$&\n  const [productDescriptions, setProductDescriptions] = useState<Record<string, string>>({});`
          );
        } else {
          // Si la page est très simple, nous devrons peut-être ajouter davantage de structure
          console.log(`⚠️ Page ${file} trop simple, pas de useState trouvé`);
        }
        modified = true;
      }
      
      // 4. Ajouter l'useEffect pour charger les descriptions si pas déjà présent
      if (!content.includes('loadProductDescriptions')) {
        if (content.includes('loadProductsAndCategories')) {
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
        } else if (content.includes('useEffect') && content.includes('products')) {
          // Recherche plus générique pour un useEffect avec products
          content = content.replace(
            /useEffect\([^{]+{[^}]+}\s*,\s*\[[^\]]*products[^\]]*\]\);/,
            `$&

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
        modified = true;
      }
      
      // 5. Remplacer la ligne de description dans la carte produit
      if (content.includes('{"Description non disponible"}')) {
        content = content.replace(
          /<p className="text-sm text-gray-500 line-clamp-2 mb-2 h-10">{"Description non disponible"}<\/p>/,
          `<p className="text-sm text-gray-500 line-clamp-2 mb-2 h-10">
                    {(() => {
                      const desc = productDescriptions[product.id.toString()];
                      console.log("🔍 Affichage description pour produit ID:", product.id, 
                        desc ? "Description trouvée" : "Description non disponible");
                      return desc || "Description non disponible";
                    })()}
                  </p>`
        );
        modified = true;
      }
      
      // Modification alternative pour les pages qui ont déjà une description mais qui pourrait ne pas fonctionner
      if (content.includes('{productDescriptions[product.id.toString()] || "Description non disponible"}')) {
        content = content.replace(
          /{productDescriptions\[product\.id\.toString\(\)\] \|\| "Description non disponible"}/,
          `{(() => {
            const desc = productDescriptions[product.id.toString()];
            console.log("🔍 Affichage description pour produit ID:", product.id, 
              desc ? "Description trouvée" : "Description non disponible");
            return desc || "Description non disponible";
          })()}`
        );
        modified = true;
      }
      
      // 6. Ajouter les liens de redirection dans les cartes produit
      if (!content.includes('RouterLink to={`/produits/')) {
        // 6.1 Envelopper l'image du produit avec un lien RouterLink
        const imageWithLinkPattern = /<div className="relative h-48 bg-gray-100">\s*<img\s+src={[^}]+}\s+alt={[^}]+}\s+className="[^"]+"\s*\/>\s*<\/div>/;
        if (imageWithLinkPattern.test(content)) {
          content = content.replace(
            imageWithLinkPattern,
            `<div className="relative h-48 bg-gray-100">
                    <RouterLink to={\`/produits/\${slugify(product.title, { lower: true })}?categorie=\${currentSlug}\`}>
                      <img 
                        src={product.image || "/placeholder.svg"} 
                        alt={product.title} 
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                      />
                    </RouterLink>
                  </div>`
          );
          modified = true;
        }
        
        // 6.2 Envelopper le titre du produit avec un lien RouterLink
        const titlePattern = /<h3 className="font-medium line-clamp-2 mb-1 h-12">{product\.title}<\/h3>/;
        if (titlePattern.test(content)) {
          content = content.replace(
            titlePattern,
            `<RouterLink to={\`/produits/\${slugify(product.title, { lower: true })}?categorie=\${currentSlug}\`} className="hover:text-primary">
                      <h3 className="font-medium line-clamp-2 mb-1 h-12">{product.title}</h3>
                    </RouterLink>`
          );
          modified = true;
        }
      }
      
      // Vérifier si des modifications ont été effectuées
      if (modified) {
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