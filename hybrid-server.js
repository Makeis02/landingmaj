import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

// 📂 Obtenir le chemin du répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Charger les variables d'environnement
console.log('🚀 Démarrage du serveur hybride...');
console.log('📂 Chargement du fichier .env:', path.join(__dirname, '.env'));

try {
  dotenv.config({ path: path.join(__dirname, '.env') });
  console.log('✅ Variables d\'environnement chargées avec succès');
} catch (error) {
  console.error('❌ Erreur lors du chargement des variables d\'environnement:', error);
}

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware de base - SANS regex complexes
app.use(express.json());
app.use(cors({
  origin: '*',
  credentials: true
}));

// Servir les fichiers statiques
app.use('/assets', express.static(path.join(__dirname, 'dist/assets')));
app.use('/images', express.static(path.join(__dirname, 'dist/images')));
app.use('/favicon.ico', express.static(path.join(__dirname, 'dist/favicon.ico')));

// Routes API simplifiées - SANS regex
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'HYBRID_MODE',
    message: 'Serveur hybride fonctionnel',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Test route working in hybrid mode',
    path: req.path
  });
});

// Route par défaut ultra-simple - SANS regex
app.get('*', (req, res) => {
  console.log(`🌐 Requête frontend pour: ${req.path}`);
  
  // Vérifier si c'est une route API
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'API endpoint not found in hybrid mode',
      path: req.path 
    });
  }
  
  // Servir index.html pour toutes les routes frontend
  try {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback si index.html n'existe pas
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Serveur Hybride</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>🚀 Serveur hybride en ligne</h1>
          <p>Votre site fonctionne en mode hybride.</p>
          <p><strong>Route demandée:</strong> ${req.path}</p>
          <p><small>Timestamp: ${new Date().toISOString()}</small></p>
        </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('❌ Erreur lors du service du fichier:', error);
    res.status(500).send('Erreur interne du serveur');
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur hybride en ligne sur http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Test route: http://localhost:${PORT}/api/test`);
}).on('error', (error) => {
  console.error('❌ Erreur de démarrage du serveur hybride:', error);
  process.exit(1);
});

// Gestion des erreurs robuste
process.on('uncaughtException', (error) => {
  console.error('💥 Exception non capturée:', error);
  // Ne pas quitter, continuer à fonctionner
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promesse rejetée non gérée:', reason);
  // Ne pas quitter, continuer à fonctionner
});
