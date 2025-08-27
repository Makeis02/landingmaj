import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 📂 Obtenir le chemin du répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Charger les variables d'environnement
console.log('🚀 Démarrage du serveur de test...');
console.log('📂 Chargement du fichier .env:', path.join(__dirname, '.env'));

try {
  dotenv.config({ path: path.join(__dirname, '.env') });
  console.log('✅ Variables d\'environnement chargées avec succès');
} catch (error) {
  console.error('❌ Erreur lors du chargement des variables d\'environnement:', error);
}

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware de base
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Routes de test simples
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Test route working',
    path: req.path,
    method: req.method
  });
});

// Route par défaut - SANS regex complexe
app.get('*', (req, res) => {
  console.log(`🌐 Requête frontend pour: ${req.path}`);
  
  // Vérifier si c'est une route API
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.path 
    });
  }
  
  // Servir index.html pour les routes frontend
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur de test en ligne sur http://localhost:${PORT}`);
  console.log(`🔍 Test health: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Test route: http://localhost:${PORT}/api/test`);
}).on('error', (error) => {
  console.error('❌ Erreur de démarrage du serveur:', error);
  process.exit(1);
});

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('💥 Exception non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promesse rejetée non gérée:', reason);
  process.exit(1);
});
