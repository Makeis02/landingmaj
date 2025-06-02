const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { generateProductPage } = require('./generatePage');
const { deleteProductPage } = require('./deletePage');
const { addRoute, removeRoute } = require('./updateRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Route pour vérifier que le serveur fonctionne
app.get('/', (req, res) => {
  res.json({ message: 'API de gestion des pages produit' });
});

// API pour générer une page produit
app.post('/api/generate', async (req, res) => {
  try {
    const product = req.body;
    
    if (!product || !product.title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Les données du produit sont incomplètes. Le titre est obligatoire.' 
      });
    }

    // Générer la page produit
    const generateResult = await generateProductPage(product);
    
    if (!generateResult.success) {
      return res.status(400).json(generateResult);
    }

    // Si la page a été générée avec succès, ajouter la route
    if (generateResult.slug && generateResult.componentName) {
      const routeResult = await addRoute(generateResult.slug, generateResult.componentName);
      
      // Même si l'ajout de route échoue, nous renvoyons un succès car la page a été générée
      return res.json({
        success: true,
        message: generateResult.message,
        routeAdded: routeResult.success,
        routeMessage: routeResult.message,
        slug: generateResult.slug
      });
    }

    return res.json(generateResult);
  } catch (error) {
    console.error('Erreur lors de la génération de la page:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Erreur serveur: ${error.message}` 
    });
  }
});

// API pour supprimer une page produit
app.post('/api/delete', async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le titre du produit est obligatoire' 
      });
    }

    // Supprimer la page produit
    const deleteResult = await deleteProductPage(title);
    
    if (!deleteResult.success) {
      return res.status(400).json(deleteResult);
    }

    // Si la page a été supprimée avec succès, supprimer aussi la route
    if (deleteResult.slug) {
      const routeResult = await removeRoute(deleteResult.slug);
      
      // Même si la suppression de route échoue, nous renvoyons un succès car la page a été supprimée
      return res.json({
        success: true,
        message: deleteResult.message,
        routeRemoved: routeResult.success,
        routeMessage: routeResult.message,
        slug: deleteResult.slug
      });
    }

    return res.json(deleteResult);
  } catch (error) {
    console.error('Erreur lors de la suppression de la page:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Erreur serveur: ${error.message}` 
    });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📝 API de génération: POST http://localhost:${PORT}/api/generate`);
  console.log(`🗑️ API de suppression: POST http://localhost:${PORT}/api/delete`);
}); 