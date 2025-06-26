import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, ShoppingCart, Star, Settings } from 'lucide-react';
import { useEditStore } from '@/stores/useEditStore';
import { useCartStore } from '@/stores/useCartStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Link as RouterLink } from 'react-router-dom';
import slugify from 'slugify';
import { fetchStripeProducts, StripeProduct } from '@/lib/api/stripe';
import PromoBadge from '@/components/PromoBadge';
import { getPriceIdForProduct } from '@/lib/stripe/getPriceIdFromSupabase';
import { checkMultiplePromotions } from "@/lib/promotions/checkActivePromotion";

// Types
interface ExtendedStripeProduct extends StripeProduct {
  averageRating?: number;
  reviewCount?: number;
  hasVariant?: boolean;
  isInStock?: boolean;
  hasDiscount?: boolean;
  variantPriceRange?: { min: number, max: number };
  onSale?: boolean;
  originalPrice?: number;
  discount?: number;
  badge?: string;
  brand?: string;
}

interface PopularProductsProps {
  className?: string;
}



const PopularProducts: React.FC<PopularProductsProps> = ({ className = "" }) => {
  const { isEditMode } = useEditStore();
  const { addItem, getDiscountedPrice } = useCartStore();
  const { toast } = useToast();
  
  const [allProducts, setAllProducts] = useState<ExtendedStripeProduct[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<ExtendedStripeProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [promoPrices, setPromoPrices] = useState<Record<string, any>>({});
  const [ddmFlags, setDdmFlags] = useState<Record<string, boolean>>({});
  const [ddmDates, setDdmDates] = useState<Record<string, string>>({});
  
  const itemsPerSlide = 4;

  useEffect(() => {
    const fetchPromos = async () => {
      const promos: Record<string, any> = {};
      for (const p of displayedProducts) {
        if (!p.hasVariant) {
          const promo = await getDiscountedPrice(p.id);
          if (promo && promo.discount_percentage) {
            promos[p.id] = promo;
          }
        }
      }
      setPromoPrices(promos);
    };
    
    if (displayedProducts.length > 0) {
      fetchPromos();
    }
  }, [displayedProducts, getDiscountedPrice]);

  const handleAddToCart = async (product: ExtendedStripeProduct) => {
    if (!product) return;
    
    let variant = null;
    let stripePriceId = null;
    let stripeDiscountPriceId = null;
    let finalPrice = product.price;
    let originalPrice = undefined;
    let discountPercentage = undefined;
    let hasDiscountApplied = false;
    
    const priceInfo = await getDiscountedPrice(product.id);
    
    if (priceInfo) {
      finalPrice = priceInfo.price;
      if (priceInfo.discount_percentage) {
        originalPrice = priceInfo.original_price;
        discountPercentage = priceInfo.discount_percentage;
        stripeDiscountPriceId = priceInfo.stripe_discount_price_id;
        hasDiscountApplied = true;
      }
      if (priceInfo.stripe_discount_price_id && !priceInfo.discount_percentage) {
        stripePriceId = priceInfo.stripe_discount_price_id;
      }
    }
    
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

  // Fonctions utilitaires
  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  // Chargement des produits depuis l'API Stripe
  const loadProducts = async () => {
    try {
      setIsLoading(true);
      
      // Récupérer tous les produits depuis l'API Stripe
      const stripeProducts = await fetchStripeProducts();

      // Enrichir les produits avec les données supplémentaires
      const enrichedProducts = await enrichProductsWithData(stripeProducts);
      setAllProducts(enrichedProducts);

      // Charger les produits sélectionnés depuis la configuration
      await loadSelectedProducts();

      // Récupérer les flags DDM et dates pour tous les produits affichés
      const ddmKeys = enrichedProducts.map(p => `product_${p.id}_ddm_exceeded`);
      const ddmDateKeys = enrichedProducts.map(p => `product_${p.id}_ddm_date`);
      const { data: ddmData } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .in('content_key', [...ddmKeys, ...ddmDateKeys]);
      const flags: Record<string, boolean> = {};
      const dates: Record<string, string> = {};
      ddmData?.forEach(item => {
        if (item.content_key.endsWith('_ddm_exceeded')) {
          const id = item.content_key.replace(/^product_|_ddm_exceeded$/g, '');
          flags[id] = item.content === 'true';
        }
        if (item.content_key.endsWith('_ddm_date')) {
          const id = item.content_key.replace(/^product_|_ddm_date$/g, '');
          dates[id] = item.content;
        }
      });
      setDdmFlags(flags);
      setDdmDates(dates);

    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Enrichir les produits avec images, avis, stock, etc. (identique aux pages de catégories)
  const enrichProductsWithData = async (products: StripeProduct[]): Promise<ExtendedStripeProduct[]> => {
    const productIds = products.map(p => p.id);
    
    // 🔥 Ajoute les images principales Supabase
    const imageMap = await fetchMainImages(products);
    let updatedWithImages = products.map(p => ({
      ...p,
      image: imageMap[getCleanProductId(p.id)] || p.image || "/placeholder.svg"
    }));
    
    // 🔥 Ajoute la note moyenne et le nombre d'avis
    const reviewStats = await fetchReviewStats(productIds);
    let updatedWithRatings = updatedWithImages.map(p => {
      const id = getCleanProductId(p.id);
      return {
        ...p,
        averageRating: reviewStats[id]?.avg || 0,
        reviewCount: reviewStats[id]?.count || 0,
      };
    });
    
    // 🔥 Ajoute la détection de variantes
    const variantMap = await fetchVariantsPresence(productIds);

    // 🔄 Récupère les price_maps directement depuis Supabase
    const priceMap = await fetchVariantPriceMaps(productIds);
    
    const stockMap = await fetchAllProductStocks(productIds);
    const finalProducts = updatedWithRatings.map(p => {
      const id = getCleanProductId(p.id);
      const stocks = stockMap[id] || [];
      // Un produit est en stock si au moins un stock > 0
      const isInStock = stocks.some(s => s > 0);
      // Calculer le stock total
      const totalStock = stocks.reduce((acc, s) => acc + s, 0);
      const variantPrices = priceMap[id];

      return {
        ...p,
        hasVariant: variantPrices && variantPrices.min !== variantPrices.max,
        isInStock,
        stock: totalStock, // Ajouter le stock total
        variantPriceRange: variantPrices || null // Ajouter le price range des variantes
      };
    });

    // 🎯 Enrichir les produits avec la détection des promotions
    const productsWithPromotions = await enrichProductsWithPromotions(finalProducts);

    // 🔍 Récupérer les descriptions des produits
    const descriptions = await fetchProductDescriptions(productIds);
    const finalProductsWithDescriptions = productsWithPromotions.map(product => {
      const cleanId = getCleanProductId(product.id);
      return {
        ...product,
        description: descriptions[cleanId] || "",
        brand: product.metadata?.brand || '',
      };
    });

    return finalProductsWithDescriptions;
  };

  // Fonction utilitaire pour nettoyer les IDs de produit (identique aux pages de catégories)
  const getCleanProductId = (id: string) => {
    if (!id || typeof id !== "string") return "";
    
    // Format prod_XXX (format Stripe)
    if (id.startsWith("prod_")) return id;
    
    // Format shopify_XXX (format common)
    if (id.startsWith("shopify_")) return id.replace("shopify_", "");
    
    // Format gid://shopify/Product/XXX (format Shopify API)
    if (id.includes("/")) return id.split("/").pop() || "";
    
    // Default
    return id;
  };

  // Fonctions d'enrichissement (identiques aux pages de catégories)
  const fetchMainImages = async (productList: StripeProduct[]) => {
    const keys = productList.map(p => `product_${getCleanProductId(p.id)}_image_0`);
    const { data, error } = await supabase
      .from("editable_content")
      .select("content_key, content")
      .in("content_key", keys);
    if (error) {
      console.error("Erreur récupération image principale :", error);
      return {};
    }
    const imageMap = {};
    for (const item of data) {
      const id = item.content_key.replace("product_", "").replace("_image_0", "");
      imageMap[id] = item.content;
    }
    return imageMap;
  };

  const fetchReviewStats = async (productIds) => {
    const { data, error } = await supabase
      .from("customer_reviews")
      .select("product_id, rating");
    if (error) {
      console.error("Erreur chargement avis :", error);
      return {};
    }
    const stats = {};
    for (const pid of productIds) {
      const cleanId = getCleanProductId(pid);
      const ratings = data.filter(r => getCleanProductId(r.product_id) === cleanId).map(r => r.rating);
      if (ratings.length > 0) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        stats[cleanId] = { avg, count: ratings.length };
      }
    }
    return stats;
  };

  const fetchVariantsPresence = async (productIds) => {
    const keys = productIds.map(id => `product_${getCleanProductId(id)}_variant_0_label`);
    const { data, error } = await supabase
      .from("editable_content")
      .select("content_key")
      .in("content_key", keys);
    const hasVariant = {};
    for (const item of data) {
      const id = getCleanProductId(item.content_key.split("_")[1]);
      hasVariant[id] = true;
    }
    return hasVariant;
  };

  // Fonction utilitaire pour convertir proprement les valeurs de stock
  function parseStockValue(value) {
    if (value === undefined || value === null) return 0;
    const raw = value.toString().trim();
    return /^[0-9]+$/.test(raw) ? parseInt(raw, 10) : 0;
  }

  const fetchAllProductStocks = async (productIds) => {
    // Créer un tableau des IDs sous différentes formes pour s'assurer qu'on couvre tous les formats
    const normalizedIds = productIds.map(id => {
      const cleanId = getCleanProductId(id);
      return { originalId: id, cleanId, prefixId: `product_${cleanId}` };
    });

    // Récupérer TOUS les stocks (généraux + variantes) en une seule requête
    const { data: allStockData, error: stockError } = await supabase
      .from("editable_content")
      .select("content_key, content")
      .like("content_key", "%_stock");

    if (stockError) {
      console.error("❌ Erreur récupération de stock:", stockError);
      return {};
    }

    console.log(`✅ Total entrées stock récupérées: ${allStockData?.length || 0}`);
    
    // Organiser les stocks par clé pour faciliter la détection
    const stockByKey = {};
    allStockData?.forEach(item => {
      stockByKey[item.content_key] = item.content;
    });
    
    // Créer le mapping final des stocks par produit
    const stockMap = {};
    
    // Pour chaque produit normalisé
    for (const { cleanId, originalId, prefixId } of normalizedIds) {
      // 1. Vérifier le stock de base
      const baseStockKey = `${prefixId}_stock`;
      const baseStockRaw = stockByKey[baseStockKey] || "0";
      const baseStock = parseStockValue(baseStockRaw);
      
      // 2. Chercher toutes les clés de variantes pour ce produit
      const variantStockKeys = Object.keys(stockByKey).filter(key => 
        key.startsWith(`${prefixId}_variant_`) && 
        key.includes("_option_") && 
        key.endsWith("_stock")
      );
      
      // 3. Extraire les valeurs de stock des variantes
      const variantStocks = variantStockKeys.map(key => parseStockValue(stockByKey[key]));
      
      // 4. Combiner tous les stocks pour ce produit
      const allStocks = [baseStock, ...variantStocks].filter(val => !isNaN(val));
      
      // 5. Enregistrer dans le stockMap
      if (allStocks.length > 0) {
        stockMap[cleanId] = allStocks;
      }
    }
    
    return stockMap;
  };

  // Fonction pour enrichir les produits avec la détection des promotions (identique aux pages de catégories)
  const enrichProductsWithPromotions = async (products: ExtendedStripeProduct[]): Promise<ExtendedStripeProduct[]> => {
    if (!products || products.length === 0) return products;
    
    try {
      console.log(`🔍 [PROMO-POPULAR] Recherche réductions pour ${products.length} produits avec nouvelle logique`);
      
      // 🎯 NOUVEAU: Utiliser la fonction utilitaire pour vérifier les promotions actives
      const productIds = products.map(p => p.id);
      const promotionMap = await checkMultiplePromotions(productIds);
      
      console.log(`💰 [PROMO-POPULAR] Promotions actives détectées:`, Object.keys(promotionMap).filter(id => promotionMap[id]).length);

      // Enrichir les produits avec les données de réductions
      const enrichedProducts = products.map(product => {
        const hasDiscount = promotionMap[product.id] === true;
        
        return {
          ...product,
          onSale: hasDiscount,
          hasDiscount
        };
      });

      console.log(`🎉 [PROMO-POPULAR] Résumé: ${enrichedProducts.filter(p => p.hasDiscount).length}/${enrichedProducts.length} produits en promo`);
      
      return enrichedProducts;
    } catch (error) {
      console.error("Erreur lors de l'enrichissement des produits avec les promotions:", error);
      return products.map(p => ({ ...p, onSale: false, hasDiscount: false }));
    }
  };

  // Fonction pour récupérer les descriptions des produits (identique aux pages de catégories)
  const fetchProductDescriptions = async (productIds) => {
    const keys = productIds.map(id => `product_${getCleanProductId(id)}_description`);
    console.log("🔍 Recherche descriptions pour clés:", keys);

    const { data, error } = await supabase
      .from('editable_content')
      .select('content_key, content')
      .in('content_key', keys);

    if (error) {
      console.error("❌ Erreur Supabase:", error);
      return {};
    }

    const descMap = {};
    data.forEach(({ content_key, content }) => {
      const id = content_key.replace(/^product_/, '').replace(/_description$/, '');
      descMap[id] = content;
    });

    return descMap;
  };

  // Fonction pour récupérer les price_maps des variantes (identique aux pages de catégories)
  const fetchVariantPriceMaps = async (productIds) => {
    const cleanedIds = productIds.map(id => getCleanProductId(id));
    const keys = [];
    
    // Générer toutes les clés possibles (variant_0, variant_1, etc.)
    cleanedIds.forEach(id => {
      for (let i = 0; i < 5; i++) { // On limite à 5 variantes maximum par produit
        keys.push(`product_${id}_variant_${i}_price_map`);
      }
    });
    
    // Récupérer les données de Supabase
    const { data, error } = await supabase
      .from("editable_content")
      .select("content_key, content")
      .in("content_key", keys);
      
    if (error) {
      console.error("Erreur récupération price_maps:", error);
      return;
    }
    
    // Créer un mapping des prix min/max par produit
    const priceMap = {};
    if (data) {
      data.forEach(({ content_key, content }) => {
        const id = content_key.replace(/^product_/, "").replace(/_variant_0_price_map$/, "");
        try {
          const parsed = JSON.parse(content);
          const prices = Object.values(parsed).map(v => parseFloat(String(v)));
          if (prices.length > 0) {
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            priceMap[id] = { min, max };
          }
        } catch (e) {
          console.warn("Erreur parsing price_map pour", id);
        }
      });
    }
    
    return priceMap;
  };

  // Charger les produits sélectionnés depuis Supabase
  const loadSelectedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', 'popular_products_selection')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.content) {
        const selectedIds = JSON.parse(data.content);
        setSelectedProductIds(selectedIds);
        updateDisplayedProducts(selectedIds);
      } else {
        // Par défaut, prendre les 8 premiers produits
        const defaultIds = allProducts.slice(0, 8).map(p => p.id);
        setSelectedProductIds(defaultIds);
        updateDisplayedProducts(defaultIds);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la sélection:', error);
    }
  };

  // Mettre à jour les produits affichés
  const updateDisplayedProducts = (selectedIds: string[]) => {
    const products = allProducts.filter(p => selectedIds.includes(p.id));
    setDisplayedProducts(products);
  };

  // Sauvegarder la sélection
  const saveSelection = async () => {
    try {
      const { data: existing } = await supabase
        .from('editable_content')
        .select('id')
        .eq('content_key', 'popular_products_selection')
        .maybeSingle();

      const content = JSON.stringify(selectedProductIds);

      if (existing) {
        await supabase
          .from('editable_content')
          .update({ content })
          .eq('content_key', 'popular_products_selection');
      } else {
        await supabase
          .from('editable_content')
          .insert({
            content_key: 'popular_products_selection',
            content
          });
      }

      updateDisplayedProducts(selectedProductIds);
      setShowEditModal(false);
      
      toast({
        title: "Sélection sauvegardée",
        description: `${selectedProductIds.length} produits sélectionnés pour les produits populaires`,
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la sélection",
        variant: "destructive",
      });
    }
  };

  // Navigation du carousel
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.ceil(displayedProducts.length / itemsPerSlide));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + Math.ceil(displayedProducts.length / itemsPerSlide)) % Math.ceil(displayedProducts.length / itemsPerSlide));
  };

  // Gestion de la sélection des produits
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (allProducts.length > 0) {
      loadSelectedProducts();
    }
  }, [allProducts]);

  if (isLoading) {
    return (
      <section className={`py-20 bg-gray-50 ${className}`}>
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-slate-900">
            Produits les Plus Populaires
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-56 rounded-t-lg"></div>
                <div className="bg-gray-100 p-6 rounded-b-lg">
                  <div className="h-6 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const visibleProducts = displayedProducts.slice(currentSlide * itemsPerSlide, (currentSlide + 1) * itemsPerSlide);

  return (
    <section className={`py-20 bg-gray-50 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Produits les Plus Populaires
            </h2>
            <p className="text-xl text-gray-600">
              Découvrez les favoris de nos clients
            </p>
          </div>
          <div className="flex gap-3">
            {isEditMode && (
              <Button 
                variant="outline" 
                onClick={() => setShowEditModal(true)}
                className="mr-3"
              >
                <Settings className="h-4 w-4 mr-2" />
                Gérer la sélection
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={prevSlide} className="w-12 h-12 rounded-xl">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextSlide} className="w-12 h-12 rounded-xl">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {visibleProducts.map((product) => (
            <Card key={product.id} className="flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow duration-300 group">
              <div className="relative h-56 bg-white flex items-center justify-center">
                {/* Badge DDM prioritaire sur promo */}
                {ddmFlags[product.id] && ddmDates[product.id] ? (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg z-30 border border-orange-700 pointer-events-none animate-pulse">
                      DDM DÉPASSÉE
                    </span>
                  </div>
                ) : (product.hasDiscount || product.onSale) ? (
                  <div className="absolute top-2 left-2 z-10">
                    <PromoBadge />
                  </div>
                ) : null}
                <RouterLink to={`/produits/${slugify(product.title, { lower: true })}?id=${product.id}`}>
                  <img 
                    src={product.image}
                    alt={product.title}
                    className="h-32 object-contain mx-auto"
                  />
                </RouterLink>
              </div>
              <CardContent className="flex flex-col flex-1 p-4">
                <h3 className="font-bold text-base leading-snug mb-1 line-clamp-1">
                  <RouterLink
                    to={`/produits/${slugify(product.title, { lower: true })}?id=${product.id}`}
                    className="transition-colors group-hover:text-[#0074b3] hover:text-[#0074b3] focus:text-[#0074b3]"
                  >
                    {product.title}
                  </RouterLink>
                </h3>
                <div className="text-xs text-gray-600 mb-2 line-clamp-2 min-h-[2.5em]">
                  {/* Affiche la description en texte brut, sans HTML */}
                  {product.description
                    ? product.description.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
                    : <span className="italic text-gray-400">Aucune description</span>}
                </div>
                <div className="flex items-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`h-5 w-5 ${i < Math.round(product.averageRating || 0) ? 'text-[#0074b3] fill-[#0074b3]' : 'text-gray-200 fill-gray-200'}`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="text-xs ml-1 text-gray-500">
                    ({product.reviewCount || 0})
                  </span>
                </div>
                <div className="font-medium text-lg text-gray-900 mb-3 truncate" style={{minHeight: '1.8em'}}>
                  {product.variantPriceRange ? (
                    `De ${product.variantPriceRange.min.toFixed(2)} € à ${product.variantPriceRange.max.toFixed(2)} €`
                  ) : (
                    // 🎯 AJOUT : Gestion des prix promotionnels
                    (() => {
                      const promo = promoPrices[product.id];
                      const isPromo = !!promo && promo.discount_percentage;
                      
                      if (isPromo) {
                        return (
                          <>
                            <span className="text-gray-500 line-through mr-2">{promo.original_price.toFixed(2)}€</span>
                            <span className="text-red-600 font-semibold">{promo.price.toFixed(2)}€</span>
                            <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">-{promo.discount_percentage}%</span>
                          </>
                        );
                      } else {
                        return `${product.price?.toFixed(2)} €`;
                      }
                    })()
                  )}
                </div>
                <div className="mt-auto">
                  {product.hasVariant ? (
                    <RouterLink
                      to={`/produits/${slugify(product.title, { lower: true })}?id=${product.id}`}
                      className="block bg-[#0074b3] text-white py-2 rounded-md hover:bg-[#00639c] transition font-semibold text-center text-sm w-full"
                    >
                      Voir le produit
                    </RouterLink>
                  ) : (
                    <button
                      className="block bg-[#0074b3] text-white py-2 rounded-md hover:bg-[#00639c] transition font-semibold text-center text-sm w-full flex items-center justify-center gap-2"
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingCart size={16} className="mr-1" />
                      Ajouter
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modal de sélection des produits */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold">Sélectionner les produits populaires</h3>
                <p className="text-gray-600">Cochez les produits à afficher dans la section "Produits les Plus Populaires"</p>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allProducts.map((product) => (
                    <div key={product.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        checked={selectedProductIds.includes(product.id)}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                      />
                      <img 
                        src={product.image || "/placeholder.svg"} 
                        alt={product.title}
                        className="w-12 h-12 object-contain"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.title}</p>
                        <p className="text-xs text-gray-500">{product.price?.toFixed(2)}€</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-6 border-t flex justify-between">
                <p className="text-sm text-gray-600">
                  {selectedProductIds.length} produit(s) sélectionné(s)
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowEditModal(false)}>
                    Annuler
                  </Button>
                  <Button onClick={saveSelection}>
                    Sauvegarder la sélection
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PopularProducts; 