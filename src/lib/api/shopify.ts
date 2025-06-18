// Service pour interagir avec l'API Shopify via le backend

// Récupération des variables d'environnement de Shopify
const SHOPIFY_DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const SHOPIFY_ADMIN_ACCESS_TOKEN = import.meta.env.VITE_SHOPIFY_ADMIN_ACCESS_TOKEN;

export interface ShopifyProduct {
  id: number;
  title: string;
  price: string;
  stock: number;
  image: string;
}

// Configuration de l'URL de base en fonction de l'environnement
const BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3000' // En développement, API sur localhost:3000
  : ''; // En production, utiliser l'URL relative

/**
 * Récupère les produits depuis l'API Shopify via notre backend
 * Nous utilisons notre propre serveur comme proxy pour protéger nos identifiants Shopify
 */
export async function fetchShopifyProducts(): Promise<ShopifyProduct[]> {
  try {
    console.log('📤 Appel à l\'API de produits sur:', `${BASE_URL}/api/shopify/products`);
    
    // Appel à notre API locale au lieu de Shopify directement
    const response = await fetch(`${BASE_URL}/api/shopify/products`);

    // Lire d'abord le texte de la réponse pour éviter les erreurs de parsing
    const text = await response.text();
    
    // Vérifier si le contenu est vide
    if (!text || text.trim() === '') {
      console.error('⚠️ Réponse API vide');
      throw new Error('Réponse API vide');
    }
    
    // Vérifier rapidement si la réponse ressemble à du HTML (donc erreur)
    if (text.toLowerCase().includes('<!doctype html>')) {
      console.error('⚠️ Réponse HTML reçue au lieu de JSON:', text.substring(0, 100) + '...');
      throw new Error('Réponse HTML reçue au lieu de JSON. Vérifiez que votre serveur Express est bien démarré sur le port 3000.');
    }
    
    // Parser sécurisé du JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('⚠️ Erreur de parsing JSON:', text.substring(0, 100) + '...');
      throw new Error(`Erreur de parsing JSON: ${parseError.message}`);
    }

    if (!data.products || !Array.isArray(data.products)) {
      console.error("Format de réponse API inattendu:", data);
      throw new Error("Format de réponse API inattendu");
    }

    console.log(`✅ ${data.products.length} produits récupérés`);
    return data.products;
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    
    // En développement, retourner des données fictives en cas d'erreur
    if (import.meta.env.DEV) {
      console.info("⚠️ Utilisation des données fictives en développement");
      return getMockProducts();
    }
    
    throw error;
  }
}

/**
 * Fonction pour simuler des données de produits
 * Utilisée en développement ou en cas d'erreur API
 */
export function getMockProducts(): ShopifyProduct[] {
  return [
    {
      id: 1,
      title: "Aquarium 60L complet",
      price: "129.99",
      stock: 15,
      image: "https://placehold.co/300x300?text=Aquarium",
    },
    {
      id: 2,
      title: "Filtre externe Fluval 307",
      price: "149.99",
      stock: 8,
      image: "https://placehold.co/300x300?text=Filtre",
    },
    {
      id: 3,
      title: "Pompe à air silencieuse",
      price: "24.99",
      stock: 23,
      image: "https://placehold.co/300x300?text=Pompe",
    },
    {
      id: 4,
      title: "Kit de test d'eau complet",
      price: "39.99",
      stock: 12,
      image: "https://placehold.co/300x300?text=TestKit",
    },
    {
      id: 5,
      title: "Nourriture premium pour poissons tropicaux",
      price: "12.99",
      stock: 45,
      image: "https://placehold.co/300x300?text=Nourriture",
    },
  ];
} 