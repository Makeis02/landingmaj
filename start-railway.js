#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Obtenir le chemin du répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
console.log('🚀 Démarrage du serveur Railway...');
console.log('📂 Répertoire de travail:', process.cwd());
console.log('🔧 Chargement des variables d\'environnement...');

try {
  // Essayer de charger .env depuis différents emplacements
  const envPaths = [
    join(__dirname, '.env'),
    join(process.cwd(), '.env'),
    join(process.cwd(), '.env.local'),
    join(process.cwd(), '.env.production')
  ];

  let envLoaded = false;
  for (const envPath of envPaths) {
    try {
      dotenv.config({ path: envPath });
      console.log(`✅ Variables d'environnement chargées depuis: ${envPath}`);
      envLoaded = true;
      break;
    } catch (error) {
      console.log(`⚠️ Impossible de charger: ${envPath}`);
    }
  }

  if (!envLoaded) {
    console.log('⚠️ Aucun fichier .env trouvé, utilisation des variables système');
  }

  // Afficher les variables importantes
  console.log('🔑 Configuration:');
  console.log('- NODE_ENV:', process.env.NODE_ENV || 'non défini');
  console.log('- PORT:', process.env.PORT || '3000');
  console.log('- STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Défini' : '❌ Manquant');
  console.log('- VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Défini' : '❌ Manquant');

} catch (error) {
  console.error('❌ Erreur lors du chargement des variables d\'environnement:', error);
}

// Supprimer les fichiers de redirections Netlify dans l'environnement Railway
// afin d'éviter que des middlewares interprètent des patterns d'URL complets
// qui provoquent des erreurs path-to-regexp.
try {
  const redirectCandidates = [
    join(__dirname, 'public', '_redirects'),
    join(process.cwd(), 'public', '_redirects'),
    join(__dirname, 'dist', '_redirects'),
    join(process.cwd(), 'dist', '_redirects')
  ];

  for (const candidate of redirectCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        fs.unlinkSync(candidate);
        console.log(`🧹 Fichier _redirects supprimé: ${candidate}`);
      } catch (e) {
        console.warn(`⚠️ Impossible de supprimer ${candidate}:`, e.message);
      }
    }
  }
} catch (cleanupError) {
  console.warn('⚠️ Nettoyage _redirects ignoré:', cleanupError.message);
}

// Importer et démarrer le serveur
try {
  console.log('🚀 Import du serveur principal...');
  const { default: startServer } = await import('./server.js');
  
  if (typeof startServer === 'function') {
    startServer();
  } else {
    console.log('📡 Démarrage du serveur Express...');
    // Le serveur se démarre automatiquement dans server.js
  }
} catch (error) {
  console.error('❌ Erreur lors du démarrage du serveur:', error);
  process.exit(1);
} 