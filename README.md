# Système de génération de pages produit pour Landing Page Pack

Ce projet permet de générer dynamiquement des pages produit à partir d'un modèle et d'une interface d'administration.

## Fonctionnalités

- Génération de pages produit personnalisées en utilisant un modèle
- Mise à jour automatique des routes dans App.tsx
- Interface d'administration pour créer et supprimer des pages produit
- API REST pour automatiser la génération et suppression de pages

## Structure du projet

```
/src
  /pages
    /admin
      ProduitsPage.tsx  # Interface d'administration avec boutons de gestion
    /Product
      Modele.tsx        # Modèle de page produit
    /products
      # Pages produit générées automatiquement
/scripts                # Scripts de génération/suppression
  generatePage.js       # Génération de pages produit
  deletePage.js         # Suppression de pages produit
  updateRoutes.js       # Mise à jour des routes dans App.tsx
  server.js             # Serveur Express pour l'API REST
  README.md             # Documentation des scripts
```

## Installation et démarrage

### 1. Installation des dépendances

```bash
# Installation des dépendances principales du projet
npm install

# Installation des dépendances pour les scripts
cd scripts
npm install
cd ..
```

### 2. Démarrage du serveur de développement

```bash
# Dans un premier terminal, démarrer l'application React
npm run dev

# Dans un second terminal, démarrer le serveur API pour les scripts
cd scripts
npm run dev
```

## Utilisation

1. Accédez à l'interface d'administration à l'adresse `/admin/produits`
2. Pour chaque produit, vous pouvez :
   - Cliquer sur "✨ Créer page produit" pour générer une page produit
   - Cliquer sur "🗑️ Supprimer page produit" pour supprimer une page produit existante
   - Cliquer sur "🔗 Voir la page" pour voir la page produit générée

## Comment ça fonctionne

1. Le modèle `Modele.tsx` sert de base pour toutes les pages produit
2. Lorsque vous cliquez sur "Créer page produit", les données du produit sont envoyées à l'API
3. Le script `generatePage.js` crée un nouveau fichier `.tsx` dans `/src/pages/products/`
4. Le script `updateRoutes.js` ajoute une nouvelle route dans `App.tsx`
5. La page produit est immédiatement accessible via l'URL `/produits/[slug]`

## Ligne de commande

Vous pouvez également utiliser les scripts directement en ligne de commande. Consultez le [README des scripts](./scripts/README.md) pour plus d'informations.

## Notes techniques

- Le système utilise un serveur Express local pour la communication entre l'interface d'administration et les scripts
- Les opérations sur le système de fichiers sont effectuées côté serveur, et non dans le navigateur
- Les modifications sont locales et nécessitent un redéploiement pour être visibles en production
