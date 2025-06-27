import slugify from 'slugify';

import SEO from "@/components/SEO";
import PromoBadge from '@/components/PromoBadge';import { Link as RouterLink } from "react-router-dom";
import { fetchProductDescriptions } from "@/lib/api/products";
import PromoBadge from "@/components/PromoBadge";
import { getPriceIdForProduct } from "@/lib/stripe/getPriceIdFromSupabase";

// Fonction pour enrichir les produits avec la détection des promotions
const enrichProductsWithPromotions = async (products: ExtendedStripeProduct[]): Promise<ExtendedStripeProduct[]> => {
  if (!products || products.length === 0) return products;
  
  try {
    console.log(`🔍 [PROMO-CATEGORY] Recherche réductions pour ${products.length} produits`);
    
    // Rechercher TOUTES les réductions avec une requête plus large
    const { data: discountData, error: discountError } = await supabase
      .from("editable_content")
      .select("content_key, content")
      .like("content_key", "%discount_percentage")
      .not("content", "is", null)
      .neq("content", "0");

    console.log(`💰 [PROMO-CATEGORY] Données de réduction trouvées:`, discountData?.length || 0);
    
    // Calculer hasDiscount pour chaque produit
    const discountMap = {};

    if (!discountError && discountData) {
      for (const item of discountData) {
        // Détecter les réductions sur les variantes - REGEX CORRIGÉ
        const match = item.content_key.match(/^product_(.+?)_variant_\d+_option_[^_]+_discount_percentage$/);
        if (match && match[1]) {
          const productId = match[1];
          const discountValue = parseFloat(item.content);
          
          console.log(`🔍 [PROMO-CATEGORY] Variante trouvée - Product ID: ${productId}, Discount: ${discountValue}%`);
          
          // Si on trouve une réduction active (> 0), marquer le produit
          if (!isNaN(discountValue) && discountValue > 0) {
            discountMap[productId] = true;
            console.log("✅ [PROMO-CATEGORY] Produit avec réduction enregistré dans discountMap:", productId);
          }
        }

        // Détecter les réductions globales - REGEX CORRIGÉ
        const globalMatch = item.content_key.match(/^product_(.+?)_discount_percentage$/);
        if (globalMatch && globalMatch[1]) {
          const productId = globalMatch[1];
          const discountValue = parseFloat(item.content);
          
          console.log(`🔍 [PROMO-CATEGORY] Global trouvé - Product ID: ${productId}, Discount: ${discountValue}%`);
          
          // Si on trouve une réduction active (> 0), marquer le produit
          if (!isNaN(discountValue) && discountValue > 0) {
            discountMap[productId] = true;
            console.log("✅ [PROMO-CATEGORY] Produit avec réduction enregistré dans discountMap:", productId);
          }
        }
      }
    }

    console.log(`🗂️ [PROMO-CATEGORY] discountMap final:`, discountMap);

    // Enrichir les produits avec les données de réductions
    const enrichedProducts = products.map(product => {
      const hasDiscount = discountMap[product.id] === true;
      
      console.log(`[CHECK-CATEGORY] Produit ${product.id} -> hasDiscount = ${hasDiscount}`);
      
      return {
        ...product,
        onSale: hasDiscount, // Mettre à jour onSale avec la vraie détection
        hasDiscount // Ajouter aussi hasDiscount pour compatibilité
      };
    });

    console.log(`🎉 [PROMO-CATEGORY] Résumé: ${enrichedProducts.filter(p => p.hasDiscount).length}/${enrichedProducts.length} produits en promo`);
    
    return enrichedProducts;
  } catch (error) {
    console.error("Erreur lors de l'enrichissement des produits avec les promotions:", error);
    return products.map(p => ({ ...p, onSale: false, hasDiscount: false }));
  }
};

const DecorationPage = () => {
  
  // Fonction pour ajouter un produit au panier
  const handleAddToCart = async (product) => {
    if (!product) return;
    
    // Récupérer les informations sur les variantes sélectionnées
    let variant = null;
    let stripePriceId = null;
    let stripeDiscountPriceId = null;
    let finalPrice = product.price;
    let originalPrice = undefined;
    let discountPercentage = undefined;
    let hasDiscountApplied = false;
    
    // Vérifier s'il y a une réduction avec getDiscountedPrice
    const priceInfo = await getDiscountedPrice(product.id);
    
    if (priceInfo) {
      finalPrice = priceInfo.price;
      if (priceInfo.discount_percentage) {
        originalPrice = priceInfo.original_price;
        discountPercentage = priceInfo.discount_percentage;
        stripeDiscountPriceId = priceInfo.stripe_discount_price_id;
        hasDiscountApplied = true;
      }
      // Si pas de promotion mais qu'on a un stripe_discount_price_id, c'est que le prix de base est le promotional
      if (priceInfo.stripe_discount_price_id && !priceInfo.discount_percentage) {
        stripePriceId = priceInfo.stripe_discount_price_id;
      }
    }
    
    // Si on n'a pas encore de stripePriceId, récupérer le prix de base
    if (!stripePriceId) {
      const { data: priceIdData } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', `product_${product.id}_stripe_price_id`)
        .single();
      if (priceIdData?.content) {
        stripePriceId = priceIdData.content;
      }
    }
    
    // Vérifier que nous avons un stripe_price_id valide
    if (!stripePriceId || stripePriceId === "null") {
      console.error(`❌ Aucun stripe_price_id trouvé pour le produit ${product.id}`);
      toast({
        variant: "destructive",
        title: "Erreur de configuration",
        description: "Ce produit n'a pas de prix Stripe configuré."
      });
      return;
    }
    
    console.log(`✅ stripe_price_id trouvé pour ${product.id}: ${stripePriceId}`);
    
    // Vérifier le stock
    const { data: stockData } = await supabase
      .from('editable_content')
      .select('content')
      .eq('content_key', `product_${product.id}_stock`)
      .single();
    
    const stock = stockData ? parseInt(stockData.content) : 0;
    if (stock === 0) {
      toast({
        variant: "destructive",
        title: "Rupture de stock",
        description: "Ce produit est en rupture de stock."
      });
      return;
    }
    
    // Ajouter au panier avec toutes les informations nécessaires
    try {
      await addItem({
        id: product.id,
        price: finalPrice,
        title: product.title,
        image_url: product.image,
        quantity: 1,
        variant: variant,
        stripe_price_id: stripePriceId,
        stripe_discount_price_id: stripeDiscountPriceId,
        original_price: originalPrice,
        discount_percentage: discountPercentage,
        has_discount: hasDiscountApplied
      });

      if (window.fbq) {
        window.fbq('track', 'AddToCart', {
          content_ids: [product.id],
          content_name: product.title,
          content_type: variant ? 'product_group' : 'product',
          value: finalPrice,
          currency: 'EUR',
          quantity: 1,
          ...(variant ? { variant } : {})
        });
      }
toast({
        title: "Produit ajouté au panier",
        description: hasDiscountApplied 
          ? `${product.title} a été ajouté à votre panier avec ${discountPercentage}% de réduction !`
          : `${product.title} a été ajouté à votre panier.`,
      });
      
      console.log(`✅ Produit ajouté au panier:`, {
        id: product.id,
        title: product.title,
        price: finalPrice,
        stripe_price_id: stripePriceId,
        has_discount: hasDiscountApplied
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout au panier:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter le produit au panier."
      });
    }
  };

  
      <SEO
        title="Decoration"
        description="Découvrez notre sélection Decoration"
        canonical={typeof window !== 'undefined' ? window.location.href : ''}
        ogImage="/og-image.png"
      />
  
return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Catégorie : Décoration</h1>
      <p>Bienvenue sur la page test de la catégorie "Décoration".</p>
      <p>Ici tu pourras bientôt afficher les produits, les sous-catégories, etc.</p>
    </div>
  );
};

export default DecorationPage; 