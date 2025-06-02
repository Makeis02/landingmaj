import { getApiUrl } from "@/lib/constants";

export interface StripeProduct {
  id: string;
  title: string;
  price: number;
  stock: number;
  image: string;
  description?: string;
  metadata?: Record<string, string>;
  show_logo_eaudouce?: string;
  show_logo_eaudemer?: string;
}

// Fonction utilitaire pour obtenir la base URL correcte
function getApiBaseUrl(): string {
  // En développement, utiliser l'URL du serveur backend (port 3000)
  if (import.meta.env.DEV) {
    // Si on est sur une IP locale, utiliser le port 3000 explicitement
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const host = window.location.hostname;
      return `http://${host}:3000`;
    }
  }
  
  // Par défaut, utiliser l'URL relative
  return '';
}

export async function fetchStripeProducts(): Promise<StripeProduct[]> {
  const url = getApiUrl('/api/stripe/products');
  
  try {
    console.log(`⏳ Appel à l'API Stripe sur: ${url}`);
    
    // Ajouter un timeout pour éviter que la requête ne reste bloquée indéfiniment
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes
    
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      console.error(`❌ Erreur HTTP: ${res.status} - ${res.statusText}`);
      
      // Important: ne pas essayer de lire à la fois json() et text() sur la même réponse
      let errorMessage = `HTTP error! status: ${res.status} - ${res.statusText}`;
      
      try {
        const errorData = await res.json();
        console.error("Détails de l'erreur:", errorData);
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        // Ne pas essayer de lire le texte ici, car ça causerait une erreur "Body already consumed"
        console.error("Impossible de parser l'erreur comme JSON");
      }
      
      throw new Error(errorMessage);
    }
    
    // Tenter de lire la réponse comme JSON
    const data = await res.json();
    console.log("✅ Réponse Stripe reçue", {
      count: data.products?.length || 0
    });
    
    // Vérifier que la structure est correcte
    if (!data || !Array.isArray(data.products)) {
      console.error("❌ Format de réponse invalide:", data);
      return [];
    }
    
    return data.products;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des produits Stripe:", error);
    throw error;
  }
} 