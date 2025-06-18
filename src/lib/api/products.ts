import slugify from 'slugify';
import { supabase } from "@/integrations/supabase/client";

// Get API base URL from environment variables with fallback
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // En prod, forcer l'URL Render
  if (import.meta.env.PROD) {
    return "https://landingmaj-production.up.railway.app";
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

export interface PageGenerationParams {
  productId: string;
  title: string;
  description: string;
  price: number;
  image: string;
  brandName: string;
  brandId: string | null;
  categories: Array<{ id: string; name: string }>;
}

/**
 * Récupère les descriptions des produits depuis Supabase
 * @param productIds Liste des IDs de produits à rechercher
 * @returns Objet avec les descriptions indexées par ID de produit
 */
export async function fetchProductDescriptions(productIds?: string[]): Promise<Record<string, string>> {
  console.log("⭐ fetchProductDescriptions appelée avec:", productIds?.length, "IDs");
  
  if (!productIds || productIds.length === 0) {
    console.log("⚠️ Aucun ID de produit fourni à fetchProductDescriptions");
    return {};
  }

  try {
    console.log("🔍 Recherche de descriptions pour les IDs:", productIds.slice(0, 5), "...");
    
    // Construire les clés au format product_ID_description
    const contentKeys = productIds.map(id => `product_${id}_description`);
    console.log("🔑 Format des clés recherchées:", contentKeys.slice(0, 3), "...");
    console.log(`🔢 Total des clés générées: ${contentKeys.length}`);

    // Récupérer les descriptions depuis Supabase
    const { data, error } = await supabase
      .from('editable_content')
      .select('content_key, content')
      .in('content_key', contentKeys);

    if (error) {
      console.error("❌ Erreur Supabase:", error);
      return {};
    }
    
    if (!data || data.length === 0) {
      console.log("⚠️ Aucune description trouvée dans Supabase");
      return {};
    }
    
    console.log(`✅ ${data.length}/${productIds.length} descriptions trouvées dans Supabase`);
    
    // Afficher quelques exemples des clés trouvées
    if (data.length > 0) {
      console.log("📝 Exemples de clés trouvées:", data.slice(0, 3).map(item => item.content_key));
    }
    
    // Transformer les données en objet indexé par ID de produit
    const descriptions: Record<string, string> = {};
    
    data.forEach(item => {
      // Extraire l'ID du produit à partir de la clé (format: product_ID_description)
      const matches = item.content_key.match(/product_(.+)_description/);
      
      if (matches && matches[1]) {
        const productId = matches[1];
        descriptions[productId] = item.content;
        console.log(`📝 Description trouvée pour produit ID ${productId}`);
      } else {
        console.log(`⚠️ Format de clé non reconnu: ${item.content_key}`);
      }
    });

    // Identifier les produits sans description
    const missingIds = productIds.filter(id => !descriptions[id]);
    if (missingIds.length > 0) {
      console.log(`⚠️ ${missingIds.length} produits sans description:`, missingIds.slice(0, 5), "...");
    }

    return descriptions;
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des descriptions:", error);
    return {};
  }
}

// Fonction pour extraire proprement le contenu HTML des descriptions
export function getSafeHtmlDescription(description: string | undefined | null): string {
  if (!description) return "Description non disponible";

  // Cas où le contenu est HTML encodé (ex: &lt;div&gt;)
  if (description.includes('&lt;') || description.includes('&gt;')) {
    // Décode les entités HTML
    return description
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  return description;
}

// Crée une page produit sur le serveur
export const createProductPage = async (params: PageGenerationParams): Promise<{ success: boolean; message: string; slug?: string }> => {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/products/create-page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Erreur lors de la création de la page produit:', error);
    return {
      success: false,
      message: `Erreur technique: ${error.message || 'Erreur inconnue'}`,
    };
  }
};

// Supprime une page produit
export const deleteProductPage = async (productId: string, title: string): Promise<{ success: boolean; message: string; slug?: string }> => {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/products/delete-page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId, title }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de la page produit:', error);
    return {
      success: false,
      message: `Erreur technique: ${error.message || 'Erreur inconnue'}`,
    };
  }
};

// Interface pour le statut d'une page produit
interface ProductPageStatus {
  exists: boolean;
  slug?: string;
}

// Vérifie l'existence des pages produit
export const checkProductPageExists = async (productIds: string[], titles?: Record<string, string>): Promise<Record<string, ProductPageStatus>> => {
  try {
    console.log("🔍 Vérification des pages produit avec IDs:", productIds.slice(0, 5), "...");
    if (titles) {
      console.log("📝 Titres fournis pour la vérification par slug");
    }
    
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/products/check-pages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productIds, titles }),
    });

    const result = await response.json();
    
    if (result.success && result.exists) {
      console.log(`✅ Résultat de la vérification: ${Object.values(result.exists).filter(Boolean).length} pages trouvées`);
      return result.exists;
    }
    
    console.log("⚠️ Aucune page trouvée ou erreur dans la réponse");
    return {};
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des pages produit:', error);
    return {};
  }
}; 