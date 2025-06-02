# Scripts de gestion des pages produit

Ces scripts permettent de générer et supprimer des pages produit dynamiquement à partir d'un modèle.

## Installation

```bash
cd scripts
npm install
```

## Utilisation

### Démarrer le serveur API local

```bash
npm run dev
```

Cela démarre un serveur Express sur le port 5000 (par défaut) qui expose les API pour générer et supprimer des pages produit.

### Générer une page produit depuis la ligne de commande

```bash
npm run generate '{"title":"Pompe JBL CristalProfi","description":"Une pompe puissante pour aquarium.","price":89.99,"image":"/images/pompe.jpg"}'
```

ou directement :

```bash
node generatePage.js '{"title":"Pompe JBL CristalProfi","description":"Une pompe puissante pour aquarium.","price":89.99,"image":"/images/pompe.jpg"}'
```

### Supprimer une page produit depuis la ligne de commande

```bash
npm run delete "Pompe JBL CristalProfi"
```

ou directement :

```bash
node deletePage.js "Pompe JBL CristalProfi"
```

### Gérer les routes dans App.tsx

Pour ajouter une route :

```bash
npm run add-route "Pompe JBL CristalProfi"
```

Pour supprimer une route :

```bash
npm run remove-route "Pompe JBL CristalProfi"
```

## API REST

Le serveur expose deux endpoints :

### POST /api/generate

Génère une nouvelle page produit.

Exemple de requête :

```json
{
  "title": "Pompe JBL CristalProfi",
  "description": "Une pompe puissante pour aquarium.",
  "price": 89.99,
  "image": "/images/pompe.jpg",
  "brand": "JBL",
  "badges": ["Eau douce", "Basse consommation"],
  "specifications": [
    { "name": "Débit", "value": "900 L/h" },
    { "name": "Puissance", "value": "11W" }
  ]
}
```

### POST /api/delete

Supprime une page produit existante.

Exemple de requête :

```json
{
  "title": "Pompe JBL CristalProfi"
}
```

## Utilisation depuis l'interface d'administration

L'interface d'administration Shopify dispose de boutons pour créer et supprimer les pages produit directement depuis le panneau de gestion des produits. Ces boutons appellent les API REST mentionnées ci-dessus.

## Structure des fichiers

- `generatePage.js` : Script pour générer une page produit
- `deletePage.js` : Script pour supprimer une page produit
- `updateRoutes.js` : Script pour ajouter ou supprimer des routes dans App.tsx
- `server.js` : Serveur Express exposant les API REST 