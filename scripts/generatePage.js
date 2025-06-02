const fs = require("fs-extra");
const path = require("path");
const slugify = require("slugify");

/**
 * Génère une page produit à partir du modèle
 * @param {Object} product - Les données du produit
 * @param {string} product.title - Titre du produit
 * @param {string} product.description - Description du produit
 * @param {number} product.price - Prix du produit
 * @param {string} product.image - URL de l'image du produit
 * @param {string} product.brand - Nom de la marque
 * @param {string[]} product.badges - Badges du produit (ex: "Eau douce", "Basse consommation")
 * @param {Object[]} product.specifications - Spécifications techniques (optional)
 * @returns {Promise<{success: boolean, message: string, slug?: string, componentName?: string}>}
 */
async function generateProductPage(product) {
  try {
    // Valider les données essentielles du produit
    if (!product.title) {
      return { success: false, message: "Le titre du produit est obligatoire" };
    }

    // Générer le slug à partir du titre
    const slug = slugify(product.title, { lower: true });
    
    // Définir les chemins
    const pagesDir = path.resolve(process.cwd(), "src/pages/products");
    const modelePath = path.resolve(process.cwd(), "src/pages/Product/Modele.tsx");
    const outputPath = path.resolve(pagesDir, `${slug}.tsx`);

    // Vérifier si le dossier products existe, sinon le créer
    await fs.ensureDir(pagesDir);

    // Vérifier si la page existe déjà
    if (await fs.pathExists(outputPath)) {
      return { 
        success: false, 
        message: `La page ${slug}.tsx existe déjà`,
        slug
      };
    }

    // Lire le fichier modèle
    const template = await fs.readFile(modelePath, "utf8");

    // Générer le nom du composant React
    const componentName = `Product${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`;

    // Formatage des badges et spécifications
    const badges = product.badges || [];
    const specifications = product.specifications || [
      { name: "Référence", value: product.id || "N/A" },
      { name: "Marque", value: product.brand || "Non spécifié" }
    ];

    // Remplacer le contenu du modèle
    let pageContent = template;

    // Remplacer la constante demoProduct
    pageContent = pageContent.replace(
      /const demoProduct = {[\s\S]*?};/,
      `const demoProduct = {
  id: "${product.id || ''}",
  title: "${product.title.replace(/"/g, '\\"')}",
  brand: "${product.brand || 'Non spécifié'}",
  reference: "${product.reference || product.id || ''}",
  description: "${(product.description || '').replace(/"/g, '\\"')}",
  price: ${product.price || 0},
  image: "${product.image || '/placeholder.svg'}",
  badges: ${JSON.stringify(badges)},
  specifications: ${JSON.stringify(specifications)},
  category: "${product.category || ''}",
  categoryName: "${product.categoryName || ''}"
};`
    );

    // Remplacer le nom du composant
    pageContent = pageContent.replace('const ProductPage = () => {', `const ${componentName} = () => {`);
    pageContent = pageContent.replace('export default ProductPage;', `export default ${componentName};`);

    // Écrire le fichier
    await fs.writeFile(outputPath, pageContent);

    return { 
      success: true, 
      message: `Page ${slug}.tsx créée avec succès`, 
      slug,
      componentName
    };
  } catch (error) {
    console.error("Erreur lors de la génération de la page:", error);
    return { 
      success: false, 
      message: `Erreur lors de la génération de la page: ${error.message}` 
    };
  }
}

// Exécution directe si le script est appelé directement (pas importé)
if (require.main === module) {
  // Récupérer les arguments de la ligne de commande
  // Format attendu: node generatePage.js '{"title":"Produit Test","price":99.99,...}'
  const productArg = process.argv[2];
  
  if (!productArg) {
    console.error("❌ Aucune donnée de produit fournie.");
    console.log("Usage: node generatePage.js '{\"title\":\"Nom Produit\",\"price\":99.99,...}'");
    process.exit(1);
  }

  try {
    const product = JSON.parse(productArg);
    generateProductPage(product).then(result => {
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.error(`❌ ${result.message}`);
      }
    });
  } catch (error) {
    console.error("❌ Erreur lors du parsing des données du produit:", error.message);
    process.exit(1);
  }
}

module.exports = { generateProductPage }; 