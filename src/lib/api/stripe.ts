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
  const baseUrl = "https://landingmaj.onrender.com";
  const url = `${baseUrl}/api/stripe/products`;
  
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
      const errorText = await res.text();
      console.error("Erreur API:", res.status, errorText);
      throw new Error(`Erreur serveur: ${res.status}`);
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
    if (error.name === 'AbortError') {
      console.error("❌ La requête Stripe a expiré (timeout)");
    } else {
      console.error("❌ Error fetching Stripe products:", error);
    }
    return [];
  }
} 