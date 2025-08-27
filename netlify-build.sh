#!/bin/bash

# Script de build personnalisé pour Netlify
echo "🧹 Nettoyage du cache npm..."
npm cache clean --force

echo "🗑️ Suppression des node_modules et package-lock.json..."
rm -rf node_modules package-lock.json

echo "📦 Installation des dépendances..."
npm install --legacy-peer-deps --no-optional

echo "🔨 Build du projet..."
npm run build

echo "✅ Build terminé avec succès!"
