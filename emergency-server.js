import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// 📂 Obtenir le chemin du répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🆘 Démarrage du serveur d\'urgence...');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware minimal
app.use(express.json());

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'EMERGENCY_MODE',
    message: 'Serveur d\'urgence en ligne',
    timestamp: new Date().toISOString()
  });
});

// Route de test
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Serveur d\'urgence fonctionnel',
    path: req.path
  });
});

// Route par défaut ultra-simple
app.get('*', (req, res) => {
  console.log(`🌐 Requête reçue: ${req.path}`);
  
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'API endpoint not found in emergency mode',
      path: req.path 
    });
  }
  
  // Réponse simple pour éviter les erreurs
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Serveur d'urgence</title>
      <meta charset="utf-8">
    </head>
    <body>
      <h1>🚨 Serveur d'urgence en ligne</h1>
      <p>L'application principale rencontre des difficultés.</p>
      <p>Veuillez réessayer plus tard.</p>
      <p><small>Timestamp: ${new Date().toISOString()}</small></p>
    </body>
    </html>
  `);
});

// Démarrage du serveur d'urgence
app.listen(PORT, () => {
  console.log(`🆘 Serveur d'urgence en ligne sur http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
}).on('error', (error) => {
  console.error('💥 Erreur critique du serveur d\'urgence:', error);
  // Ne pas quitter, essayer de redémarrer
  setTimeout(() => {
    console.log('🔄 Tentative de redémarrage du serveur d\'urgence...');
    process.exit(1);
  }, 5000);
});
