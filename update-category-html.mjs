import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const categoriesDir = path.resolve(__dirname, 'src/pages/categories');

/**
 * Updates category pages to use HTML descriptions from Supabase
 */
async function updateCategoryPages() {
  try {
    console.log('🔎 Scanning category pages directory:', categoriesDir);
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
      
      // 1. Add the import for fetchProductDescriptions if missing
      if (!content.includes('fetchProductDescriptions')) {
        content = content.replace(
          /import { fetchBrands, Brand, fetchBrandsForProducts } from "@\/lib\/api\/brands";/,
          `import { fetchBrands, Brand, fetchBrandsForProducts } from "@/lib/api/brands";\nimport { fetchProductDescriptions } from "@/lib/api/products";`
        );
        modified = true;
      }
      
      // 2. Add helper function for safe HTML if missing
      if (!content.includes('getSafeHtmlDescription')) {
        content = content.replace(
          /import slugify from 'slugify';/,
          `import slugify from 'slugify';\n\n// Helper function to safely handle HTML descriptions\nconst getSafeHtmlDescription = (description: string | undefined): string => {\n  if (!description) return "Description non disponible";\n  \n  // Simple HTML validation - check if it has HTML-like content\n  const hasHtmlContent = /<[a-z][\\s\\S]*>/i.test(description);\n  \n  // If it's already HTML content, return it as is\n  if (hasHtmlContent) return description;\n  \n  // Otherwise treat it as plain text\n  return description.trim() || "Description non disponible";\n};`
        );
        modified = true;
      }
      
      // 3. Add productDescriptions state if missing
      if (!content.includes('productDescriptions')) {
        content = content.replace(
          /const \[brandsLoading, setBrandsLoading\] = useState\(false\);/,
          `const [brandsLoading, setBrandsLoading] = useState(false);\n  const [productDescriptions, setProductDescriptions] = useState<Record<string, string>>({});`
        );
        modified = true;
      }
      
      // 4. Add useEffect for loading descriptions if missing
      if (!content.includes('loadProductDescriptions')) {
        content = content.replace(
          /loadProductsAndCategories\(\);\s*}\s*\, \[currentSlug, selectedSubCategories, selectedBrandIds, priceRange, inStock, promoOnly\]\);/,
          `loadProductsAndCategories();\n  }, [currentSlug, selectedSubCategories, selectedBrandIds, priceRange, inStock, promoOnly]);\n\n  // Récupérer les descriptions des produits\n  useEffect(() => {\n    if (products.length === 0) return;\n\n    const loadProductDescriptions = async () => {\n      try {\n        console.log("🔄 Chargement des descriptions pour", products.length, "produits...");\n        const descriptions = await fetchProductDescriptions();\n        console.log("📋 Descriptions reçues:", Object.keys(descriptions).length);\n        \n        // Vérifier les IDs des produits actuels pour voir s'ils ont des descriptions\n        products.forEach(product => {\n          const productId = product.id.toString();\n          console.log(\`🏷️ Produit \${productId} (\${product.title}): \${descriptions[productId] ? "✅ Description trouvée" : "❌ Pas de description"}\`);\n        });\n        \n        setProductDescriptions(descriptions);\n      } catch (error) {\n        console.error("❌ Erreur lors du chargement des descriptions:", error);\n      }\n    };\n\n    loadProductDescriptions();\n  }, [products]);`
        );
        modified = true;
      }
      
      // 5. Replace the product description with dangerouslySetInnerHTML
      const regularDescriptionPattern = /<p className="text-sm text-gray-500 line-clamp-2 mb-2 h-10">(?:{\s*(?:"[^"]*"|[^{}])+\s*}|[^<]*)<\/p>/;
      if (content.includes('line-clamp-2 mb-2 h-10') && !content.includes('dangerouslySetInnerHTML')) {
        content = content.replace(
          regularDescriptionPattern,
          `<p\n                      className="text-sm text-gray-500 line-clamp-2 mb-2 h-10"\n                      dangerouslySetInnerHTML={{\n                        __html: getSafeHtmlDescription(productDescriptions[product.id.toString()])\n                      }}\n                    />`
        );
        modified = true;
      }
      
      if (modified) {
        // Create backup of original file
        const backupPath = `${filePath}.backup`;
        fs.writeFileSync(backupPath, fs.readFileSync(filePath));
        console.log(`📑 Created backup at ${backupPath}`);
        
        // Write updated content
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${file}`);
        updatedFiles++;
      } else {
        console.log(`ℹ️ No changes needed for ${file}`);
      }
    }
    
    console.log(`\n🎉 Process completed! Updated ${updatedFiles} files.`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
updateCategoryPages(); 