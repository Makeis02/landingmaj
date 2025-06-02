const fs = require("fs-extra");
const path = require("path");
const slugify = require("slugify");

/**
 * Supprime une page produit
 * @param {string} title - Titre du produit
 * @returns {Promise<{success: boolean, message: string, slug?: string}>}
 */
async function deleteProductPage(title) {
  try {
    if (!title) {
      return { success: false, message: "Le titre du produit est obligatoire" };
    }

    // Générer le slug à partir du titre
    const slug = slugify(title, { lower: true });
    
    // Définir le chemin du fichier à supprimer
    const pagesDir = path.resolve(process.cwd(), "src/pages/products");
    const filePath = path.resolve(pagesDir, `${slug}.tsx`);

    // Vérifier si le fichier existe
    if (!(await fs.pathExists(filePath))) {
      return { 
        success: false, 
        message: `La page ${slug}.tsx n'existe pas`,
        slug
      };
    }

    // Supprimer le fichier
    await fs.remove(filePath);

    return { 
      success: true, 
      message: `Page ${slug}.tsx supprimée avec succès`,
      slug
    };
  } catch (error) {
    console.error("Erreur lors de la suppression de la page:", error);
    return { 
      success: false, 
      message: `Erreur lors de la suppression de la page: ${error.message}` 
    };
  }
}

// Exécution directe si le script est appelé directement (pas importé)
if (require.main === module) {
  // Récupérer les arguments de la ligne de commande
  const title = process.argv[2];
  
  if (!title) {
    console.error("❌ Titre du produit manquant.");
    console.log("Usage: node deletePage.js \"Titre du produit\"");
    process.exit(1);
  }

  deleteProductPage(title).then(result => {
    if (result.success) {
      console.log(`✅ ${result.message}`);
    } else {
      console.error(`❌ ${result.message}`);
    }
  });
}

module.exports = { deleteProductPage }; 