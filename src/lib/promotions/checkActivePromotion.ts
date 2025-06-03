import { supabase } from "@/integrations/supabase/client";

/**
 * Vérifie les promotions actives pour une liste de produits
 * @param productIds Liste des IDs de produits à vérifier
 * @returns Un objet avec les IDs des produits en promotion
 */
export async function checkMultiplePromotions(productIds: string[]): Promise<Record<string, boolean>> {
  try {
    console.log(`🔍 [PROMO-CHECK] Vérification des promotions pour ${productIds.length} produits`);
    
    // 🎯 CORRECTION: Utiliser la table product_prices au lieu de product_promotions
    // Récupérer toutes les promotions actives depuis product_prices
    const { data: activePromotions, error } = await supabase
      .from('product_prices')
      .select('product_id, stripe_price_id, variant_label, variant_value')
      .eq('is_discount', true)
      .eq('active', true);

    if (error) {
      console.error("❌ [PROMO-CHECK] Erreur lors de la récupération des promotions:", error);
      return {};
    }

    console.log(`💰 [PROMO-CHECK] Promotions actives trouvées:`, activePromotions?.length || 0);

    // Créer un map des produits en promotion
    const promotionMap: Record<string, boolean> = {};
    
    // Pour chaque produit, vérifier s'il a une promotion active
    for (const productId of productIds) {
      // Nettoyer l'ID produit pour les comparaisons
      const cleanProductId = productId.replace(/^prod_/, '');
      
      const hasPromotion = activePromotions?.some(promo => {
        const cleanPromoId = promo.product_id.replace(/^prod_/, '');
        return cleanPromoId === cleanProductId;
      });
      
      promotionMap[productId] = hasPromotion || false;
      
      if (hasPromotion) {
        console.log(`🎯 [PROMO-CHECK] Promotion active détectée pour ${productId}`);
      }
    }

    const promoCount = Object.values(promotionMap).filter(Boolean).length;
    console.log(`✅ [PROMO-CHECK] Résumé: ${promoCount}/${productIds.length} produits avec promotions actives`);

    return promotionMap;
  } catch (error) {
    console.error("❌ [PROMO-CHECK] Erreur lors de la vérification des promotions:", error);
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
    // 🎯 CORRECTION: Utiliser la table product_prices au lieu de product_promotions
    const cleanProductId = productId.replace(/^prod_/, '');
    
    const { data, error } = await supabase
      .from('product_prices')
      .select('product_id, stripe_price_id')
      .like('product_id', `%${cleanProductId}%`)
      .eq('is_discount', true)
      .eq('active', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("❌ [PROMO-CHECK] Erreur lors de la vérification de la promotion:", error);
      return false;
    }

    const hasPromotion = !!data;
    
    if (hasPromotion) {
      console.log(`🎯 [PROMO-CHECK] Promotion active pour ${productId}: ${data.stripe_price_id}`);
    }

    return hasPromotion;
  } catch (error) {
    console.error("❌ [PROMO-CHECK] Erreur lors de la vérification de la promotion:", error);
    return false;
  }
} 