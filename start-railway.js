#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 📂 Obtenir le chemin du répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Charger les variables d'environnement
console.log('🚀 Démarrage de l\'application Railway...');
console.log('📂 Chargement du fichier .env:', path.join(__dirname, '.env'));

try {
  dotenv.config({ path: path.join(__dirname, '.env') });
  console.log('✅ Variables d\'environnement chargées avec succès');
} catch (error) {
  console.error('❌ Erreur lors du chargement des variables d\'environnement:', error);
}

// Vérifier les variables critiques
const requiredVars = [
  'VERIFY_TOKEN',
  'PAGE_ACCESS_TOKEN',
  'STRIPE_SECRET_KEY'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('⚠️ Variables d\'environnement manquantes:', missingVars.join(', '));
  console.warn('🔄 L\'application continuera avec des valeurs par défaut');
}

// Démarrer le serveur principal
try {
  console.log('🔌 Import du serveur principal...');
  const { default: startServer } = await import('./server.js');
  
  if (typeof startServer === 'function') {
    startServer();
  } else {
    console.log('📡 Démarrage du serveur via import direct...');
    // Le serveur se démarre automatiquement via server.js
  }
} catch (error) {
  console.error('❌ Erreur lors du démarrage du serveur principal:', error);
  
  // Fallback : démarrer le serveur de test
  try {
    console.log('🔄 Tentative de démarrage avec le serveur de test...');
    await import('./test-server.js');
  } catch (fallbackError) {
    console.error('❌ Échec du démarrage avec le serveur de test:', fallbackError);
    
    // Dernier recours : démarrer un serveur minimal
    console.log('🆘 Démarrage d\'un serveur minimal d\'urgence...');
    await import('./emergency-server.js');
  }
}

// Gestion des signaux d'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Signal SIGTERM reçu, arrêt gracieux...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Signal SIGINT reçu, arrêt gracieux...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Exception non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promesse rejetée non gérée:', reason);
  process.exit(1);
}); 