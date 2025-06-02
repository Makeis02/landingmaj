import { supabase } from "@/integrations/supabase/client";

/**
 * Vérifie les promotions actives pour une liste de produits
 * @param productIds Liste des IDs de produits à vérifier
 * @returns Un objet avec les IDs des produits en promotion
 */
export async function checkMultiplePromotions(productIds: string[]): Promise<Record<string, boolean>> {
  try {
    // Récupérer toutes les promotions actives
    const { data: activePromotions, error } = await supabase
      .from('product_promotions')
      .select('*')
      .eq('active', true);

    if (error) {
      console.error("Erreur lors de la récupération des promotions:", error);
      return {};
    }

    // Créer un map des produits en promotion
    const promotionMap: Record<string, boolean> = {};
    
    // Pour chaque produit, vérifier s'il a une promotion active
    for (const productId of productIds) {
      const hasPromotion = activePromotions?.some(promo => 
        promo.product_id === productId && 
        new Date(promo.start_date) <= new Date() && 
        new Date(promo.end_date) >= new Date()
      );
      
      promotionMap[productId] = hasPromotion || false;
    }

    return promotionMap;
  } catch (error) {
    console.error("Erreur lors de la vérification des promotions:", error);
    return {};
  }
}

/**
 * Vérifie si un produit spécifique a une promotion active
 * @param productId ID du produit à vérifier
 * @returns true si le produit a une promotion active, false sinon
 */
export async function checkActivePromotion(productId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('product_promotions')
      .select('*')
      .eq('product_id', productId)
      .eq('active', true)
      .single();

    if (error) {
      console.error("Erreur lors de la vérification de la promotion:", error);
      return false;
    }

    if (!data) return false;

    const now = new Date();
    return new Date(data.start_date) <= now && new Date(data.end_date) >= now;
  } catch (error) {
    console.error("Erreur lors de la vérification de la promotion:", error);
    return false;
  }
} 