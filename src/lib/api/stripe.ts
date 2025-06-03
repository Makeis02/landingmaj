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
    return 'http://localhost:3000';
  }
  
  // En production, utiliser l'URL de l'API sur Render
  return 'https://landingmaj.onrender.com';
}

export async function fetchStripeProducts(): Promise<StripeProduct[]> {
  const baseUrl = getApiBaseUrl();
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
      },
      mode: 'cors' // Explicitement demander le mode CORS
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      console.error(`❌ Erreur HTTP: ${res.status} - ${res.statusText}`);
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    console.log("✅ Réponse Stripe reçue", {
      count: data.products?.length || 0
    });
    
    if (!data || !Array.isArray(data.products)) {
      console.error("❌ Format de réponse invalide:", data);
      return [];
    }
    
    return data.products;
  } catch (error) {
    console.error("❌ Error fetching Stripe products:", error);
    return [];
  }
} 