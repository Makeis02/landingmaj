import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 📂 Obtenir le chemin du répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Démarrage du serveur ultra-minimal...');

const PORT = process.env.PORT || 8080;

// Créer un serveur HTTP basique
const server = http.createServer((req, res) => {
  console.log(`📥 Requête reçue: ${req.method} ${req.url}`);
  
  // Headers CORS basiques
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Gérer les requêtes OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Route de santé
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ULTRA_MINIMAL_MODE',
      message: 'Serveur ultra-minimal fonctionnel',
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method
    }));
    return;
  }
  
  // Route de test
  if (req.url === '/api/test') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Test route working in ultra-minimal mode',
      path: req.url
    }));
    return;
  }
  
  // Routes API - retourner 404
  if (req.url.startsWith('/api/')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'API endpoint not found in ultra-minimal mode',
      path: req.url
    }));
    return;
  }
  
  // Routes frontend - servir index.html
  try {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    } else {
      // Fallback si index.html n'existe pas
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Serveur Ultra-Minimal</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>🚀 Serveur ultra-minimal en ligne</h1>
          <p>L'application fonctionne en mode minimal.</p>
          <p><strong>URL demandée:</strong> ${req.url}</p>
          <p><small>Timestamp: ${new Date().toISOString()}</small></p>
        </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('❌ Erreur lors du service du fichier:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Erreur interne du serveur');
  }
});

// Démarrer le serveur
server.listen(PORT, () => {
  console.log(`🚀 Serveur ultra-minimal en ligne sur http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Test route: http://localhost:${PORT}/api/test`);
});

// Gestion des erreurs
server.on('error', (error) => {
  console.error('💥 Erreur du serveur ultra-minimal:', error);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Exception non capturée:', error);
  // Ne pas quitter, continuer à fonctionner
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promesse rejetée non gérée:', reason);
  // Ne pas quitter, continuer à fonctionner
});
