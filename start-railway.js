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

// Démarrer avec le serveur ultra-minimal en premier (plus sûr)
try {
  console.log('🚀 Démarrage avec le serveur ultra-minimal...');
  await import('./ultra-minimal-server.js');
  console.log('✅ Serveur ultra-minimal démarré avec succès');
} catch (error) {
  console.error('❌ Erreur avec le serveur ultra-minimal:', error);
  
  // Fallback : essayer le serveur de test
  try {
    console.log('🔄 Tentative avec le serveur de test...');
    await import('./test-server.js');
  } catch (fallbackError) {
    console.error('❌ Échec avec le serveur de test:', fallbackError);
    
    // Dernier recours : serveur d'urgence
    try {
      console.log('🆘 Démarrage du serveur d\'urgence...');
      await import('./emergency-server.js');
    } catch (emergencyError) {
      console.error('❌ Échec critique de tous les serveurs:', emergencyError);
      process.exit(1);
    }
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
  // Ne pas quitter, laisser le serveur continuer
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promesse rejetée non gérée:', reason);
  // Ne pas quitter, laisser le serveur continuer
}); 