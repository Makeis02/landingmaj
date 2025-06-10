import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { persist } from "zustand/middleware";

interface CartItem {
  id: string;
  quantity: number;
  price: number; // Prix final (réduit si applicable, sinon original)
  title: string;
  image_url?: string;
  is_gift?: boolean;
  threshold_gift?: boolean;
  variant?: string; // Format: "Taille:120" ou "Couleur:Rouge|Taille:L"
  stripe_price_id?: string; // ID du prix Stripe pour la variante (prix de base)
  stripe_discount_price_id?: string; // ID du prix Stripe promotionnel
  original_price?: number; // Prix original avant réduction
  discount_percentage?: number; // Pourcentage de réduction appliqué
  has_discount?: boolean; // Indique si une réduction est active
  // 🎁 Propriétés pour les cadeaux de la roue
  type?: 'wheel_gift' | 'regular';
  won_at?: string; // Date ISO de quand le cadeau a été gagné
  expires_at?: string; // Date ISO d'expiration
}

interface GiftSettings {
  active: boolean;
  shopify_product_id: string;
  shopify_variant_id: string;
}

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  giftSettings: GiftSettings | null;
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  updateItem: (id: string, updates: Partial<CartItem>) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotal: () => number;
  syncWithSupabase: () => Promise<void>;
  fetchGiftSettings: () => Promise<void>;
  manageGiftItem: () => Promise<void>;
  getApplicableGiftRule: (total: number) => Promise<any>;
  getDiscountedPrice: (productId: string, variant?: string) => Promise<{ price: number; original_price?: number; discount_percentage?: number; stripe_discount_price_id?: string } | null>;
  // 🎁 Gestion des cadeaux de la roue
  updateWheelGiftExpiration: (giftId: string, newExpirationHours: number) => Promise<void>;
  cleanupExpiredGifts: () => void;
  clearWheelGifts: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
  items: [],
  isLoading: false,
  giftSettings: null,
  isOpen: false,
  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),

  getApplicableGiftRule: async (total: number) => {
    try {
      const { data: giftRules, error } = await supabase
        .from("cart_gift_rules")
        .select("*")
        .lte("threshold", total)
        .eq("active", true)
        .order("threshold", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching gift rule:", error);
        return null;
      }

      return giftRules;
    } catch (error) {
      console.error("Error in getApplicableGiftRule:", error);
      return null;
    }
  },

  fetchGiftSettings: async () => {
    try {
      const { data: settings, error } = await supabase
        .from("cart_gift_settings")
        .select("*")
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;
      set({ giftSettings: settings });
    } catch (error) {
      console.error("Error fetching gift settings:", error);
    }
  },

  manageGiftItem: async () => {
    try {
      const { items, giftSettings } = get();
      const nonGiftItems = items.filter(item => !item.is_gift && !item.threshold_gift);
      const total = nonGiftItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      
      // Récupérer la session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Supprimer tous les cadeaux existants
      const { error: deleteError } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", session.user.id)
        .or("is_gift.eq.true,threshold_gift.eq.true");

      if (deleteError) throw deleteError;

      // N'ajouter des cadeaux que si le panier n'est pas vide
      if (nonGiftItems.length > 0) {
        // Ajouter le cadeau par défaut si actif
        if (giftSettings?.active) {
          const { error: defaultGiftError } = await supabase
            .from("cart_items")
            .insert({
              user_id: session.user.id,
              product_id: giftSettings.shopify_product_id,
              quantity: 1,
              is_gift: true,
              threshold_gift: false
            });

          if (defaultGiftError) throw defaultGiftError;
        }

        // Récupérer et ajouter le cadeau par palier si applicable
        const giftRule = await get().getApplicableGiftRule(total);
        if (giftRule) {
          const { error: thresholdGiftError } = await supabase
            .from("cart_items")
            .insert({
              user_id: session.user.id,
              product_id: giftRule.shopify_product_id,
              quantity: 1,
              is_gift: false,
              threshold_gift: true
            });

          if (thresholdGiftError) throw thresholdGiftError;
        }
      }

      await get().syncWithSupabase();
    } catch (error) {
      console.error("Error managing gift items:", error);
    }
  },

  addItem: async (item) => {
    try {
      set({ isLoading: true });
      // Patch: garantir title et variant
      let patchedItem = { ...item };
      if (!patchedItem.title) {
        // Essayer de récupérer le titre depuis la base produits
        const { data: product } = await supabase
          .from('products')
          .select('title')
          .eq('shopify_id', item.id)
          .maybeSingle();
        patchedItem.title = product?.title || 'Produit inconnu';
      }
      if (typeof patchedItem.variant === 'undefined') {
        patchedItem.variant = null;
      }
          
          const existingItem = get().items.find((i) => {
        if (i.id === patchedItem.id) {
          if (patchedItem.variant && i.variant) {
            return i.variant === patchedItem.variant;
              }
              return true;
            }
            return false;
          });
      const quantity = patchedItem.quantity || 1;
          let updatedItems;
          if (existingItem) {
            updatedItems = get().items.map((i) => {
          if (i.id === patchedItem.id && i.variant === patchedItem.variant) {
                return { ...i, quantity: i.quantity + quantity };
              }
              return i;
            });
          } else {
        updatedItems = [...get().items, { ...patchedItem, quantity }];
          }
          set({ items: updatedItems });
          // Synchro serveur si connecté
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            try {
      if (existingItem) {
                await supabase
          .from("cart_items")
                  .update({ quantity: existingItem.quantity + quantity })
          .eq("user_id", session.user.id)
              .eq("product_id", patchedItem.id);
      } else {
                await supabase
          .from("cart_items")
          .insert({
            user_id: session.user.id,
                product_id: patchedItem.id,
                    quantity,
                variant: patchedItem.variant,
                price_id: patchedItem.stripe_price_id,
                discount_price_id: patchedItem.stripe_discount_price_id,
                original_price: patchedItem.original_price,
                discount_percentage: patchedItem.discount_percentage,
                has_discount: patchedItem.has_discount,
                title: patchedItem.title
          });
      }
      await get().manageGiftItem();
            } catch (error) {
              console.error("Error syncing with Supabase:", error);
            }
          }
    } catch (error) {
      console.error("Error adding item to cart:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout au panier",
        variant: "destructive",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (id) => {
    try {
      set({ isLoading: true });
      
          // Modifier la copie locale
          set((state) => ({
            items: state.items.filter((item) => item.id !== id)
          }));

          // Synchro serveur si connecté
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", session.user.id)
        .eq("product_id", id);

      await get().manageGiftItem();
          }
    } catch (error) {
      console.error("Error removing item from cart:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateQuantity: async (id, quantity) => {
    try {
      set({ isLoading: true });
          
          // Mettre à jour la copie locale
          set((state) => ({
            items: state.items.map((item) => 
              item.id === id ? { ...item, quantity } : item
            )
          }));
          
          // Synchro serveur si connecté
      const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("user_id", session.user.id)
        .eq("product_id", id);

      await get().manageGiftItem();
          }
    } catch (error) {
          console.error("Error updating item quantity:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearCart: async () => {
    try {
      set({ isLoading: true });
      
          // Vider le panier local
          set({ items: [] });

      // 🧹 FORCER la suppression du localStorage persist
      localStorage.removeItem('cart-storage');
      console.log("🧹 [CLEAR-CART] localStorage 'cart-storage' supprimé");

          // Synchro serveur si connecté
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", session.user.id);
        console.log("🧹 [CLEAR-CART] Cart_items supprimés de Supabase");
          }
      
      console.log("✅ [CLEAR-CART] Panier complètement vidé (local + localStorage + Supabase)");
    } catch (error) {
      console.error("Error clearing cart:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  getTotal: () => {
        return get().items.reduce((sum, item) => {
          // Exclure les cadeaux du total
          if (item.is_gift || item.threshold_gift) return sum;
          return sum + item.price * item.quantity;
        }, 0);
  },

  getDiscountedPrice: async (productId: string, variant?: string) => {
    try {
      const cleanProductId = productId.replace(/^(stripe_|shopify_)/, '');
      
      if (!variant) {
        // 🎯 NOUVEAU: Produit sans variante - récupérer le prix promotionnel depuis product_prices
        const { data: activePromoData } = await supabase
          .from('product_prices')
          .select('stripe_price_id, lookup_key')
          .eq('product_id', `prod_${cleanProductId}`)
          .eq('variant_label', 'main')
          .eq('variant_value', 'default')
          .eq('is_discount', true)
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activePromoData?.stripe_price_id) {
          // Récupérer les détails de la promotion depuis editable_content
        const { data: discountData } = await supabase
            .from('editable_content')
            .select('content_key, content')
            .in('content_key', [
              `product_${cleanProductId}_discount_price`,
              `product_${cleanProductId}_discount_percentage`,
              `product_${cleanProductId}_price`
            ]);

          if (discountData) {
            const dataMap = discountData.reduce((acc, item) => {
              acc[item.content_key] = item.content;
              return acc;
            }, {} as Record<string, string>);

            const discountPrice = dataMap[`product_${cleanProductId}_discount_price`];
            const discountPercentage = dataMap[`product_${cleanProductId}_discount_percentage`];
            const basePrice = dataMap[`product_${cleanProductId}_price`];

            if (discountPrice && discountPercentage) {
              return {
                price: parseFloat(discountPrice),
                original_price: parseFloat(basePrice || '0'),
                discount_percentage: parseFloat(discountPercentage),
                stripe_discount_price_id: activePromoData.stripe_price_id
              };
            }
          }
        }

        // 🔄 FALLBACK: Si pas de promo active dans product_prices, utiliser l'ancienne méthode
        const { data: fallbackDiscountData } = await supabase
          .from('editable_content')
          .select('content_key, content')
          .in('content_key', [
            `product_${cleanProductId}_discount_price`,
            `product_${cleanProductId}_discount_percentage`,
            `product_${cleanProductId}_stripe_discount_price_id`,
            `product_${cleanProductId}_price`
          ]);
        
        if (!fallbackDiscountData) return null;
        
        const dataMap = fallbackDiscountData.reduce((acc, item) => {
          acc[item.content_key] = item.content;
          return acc;
        }, {} as Record<string, string>);
        
        const discountPrice = dataMap[`product_${cleanProductId}_discount_price`];
        const discountPercentage = dataMap[`product_${cleanProductId}_discount_percentage`];
        const stripeDiscountPriceId = dataMap[`product_${cleanProductId}_stripe_discount_price_id`];
        
        if (discountPrice && discountPercentage) {
          // 🎯 CORRECTION : Calculer le prix original à partir du prix réduit et du pourcentage
          const discountPriceNum = parseFloat(discountPrice);
          const discountPercentageNum = parseFloat(discountPercentage);
          const originalPrice = discountPriceNum / (1 - discountPercentageNum / 100);
          
          return {
            price: discountPriceNum,
            original_price: originalPrice,
            discount_percentage: discountPercentageNum,
            stripe_discount_price_id: stripeDiscountPriceId
          };
        }
        
        // Si pas de promotion, essayer de récupérer le prix de base
        const basePrice = dataMap[`product_${cleanProductId}_price`];
        return basePrice ? { price: parseFloat(basePrice) } : null;
      } else {
        // Produit avec variante - parser les variantes
        const variantParts = variant.split('|');
        let variantIdx = 0;
        let option = '';
        
        // Extraire le premier variant (format "Label:Option")
        if (variantParts.length > 0) {
          const [label, opt] = variantParts[0].split(':');
          option = opt;
          
          // Récupérer l'index de la variante depuis les labels
          const { data: labelData } = await supabase
            .from('editable_content')
            .select('content_key')
            .like('content_key', `product_${cleanProductId}_variant_%_label`)
            .eq('content', label);
          
          if (labelData && labelData.length > 0) {
            const match = labelData[0].content_key.match(/variant_(\d+)_label/);
            if (match) {
              variantIdx = parseInt(match[1]);
            }
          }
        }
        
        // Récupérer les données de réduction pour cette variante/option
        const { data: variantDiscountData } = await supabase
          .from('editable_content')
          .select('content_key, content')
          .in('content_key', [
            `product_${cleanProductId}_variant_${variantIdx}_option_${option}_discount_price`,
            `product_${cleanProductId}_variant_${variantIdx}_option_${option}_discount_percentage`,
            `product_${cleanProductId}_variant_${variantIdx}_option_${option}_stripe_discount_price_id`,
            `product_${cleanProductId}_variant_${variantIdx}_price_map`
          ]);
        
        if (!variantDiscountData) return null;
        
        const variantDataMap = variantDiscountData.reduce((acc, item) => {
          acc[item.content_key] = item.content;
          return acc;
        }, {} as Record<string, string>);
        
        const discountPrice = variantDataMap[`product_${cleanProductId}_variant_${variantIdx}_option_${option}_discount_price`];
        const discountPercentage = variantDataMap[`product_${cleanProductId}_variant_${variantIdx}_option_${option}_discount_percentage`];
        const stripeDiscountPriceId = variantDataMap[`product_${cleanProductId}_variant_${variantIdx}_option_${option}_stripe_discount_price_id`];
        const priceMapRaw = variantDataMap[`product_${cleanProductId}_variant_${variantIdx}_price_map`];
        
        let originalPrice = 0;
        if (priceMapRaw) {
          try {
            const priceMap = JSON.parse(priceMapRaw);
            const comboKey = `${variantParts[0]}`; // Format "Label:Option"
            originalPrice = priceMap[comboKey] || 0;
          } catch (e) {
            console.error('Erreur parsing price_map:', e);
          }
        }
        
        if (discountPrice && discountPercentage) {
          return {
            price: parseFloat(discountPrice),
            original_price: originalPrice,
            discount_percentage: parseFloat(discountPercentage),
            stripe_discount_price_id: stripeDiscountPriceId
          };
        }
        
        return originalPrice > 0 ? { price: originalPrice } : null;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du prix avec réduction:', error);
      return null;
    }
  },

  syncWithSupabase: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return; // Ne rien faire si non connecté

      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          product_id,
          quantity,
          is_gift,
          threshold_gift,
          variant,
          price_id,
          discount_price_id,
          original_price,
          discount_percentage,
          has_discount,
          products (
            title,
            price,
            image_url
          )
        `)
        .eq("user_id", session.user.id);

      if (error) throw error;

      // Enrichir chaque article avec les prix réduits
      const mappedItems: CartItem[] = await Promise.all(data.map(async (item) => {
        const basePrice = (item.products as any)?.price || 0;
        const title = (item.products as any)?.title || "Produit inconnu";
        const image_url = (item.products as any)?.image_url;
        
        // Récupérer le prix actuel avec les éventuelles promotions
        const priceInfo = await get().getDiscountedPrice(item.product_id, item.variant);
        
        let finalPrice = basePrice;
        let originalPrice = item.original_price;
        let discountPercentage = item.discount_percentage;
        let hasDiscount = item.has_discount || false;
        let stripePriceId = item.price_id;
        let stripeDiscountPriceId = item.discount_price_id;
        
        if (priceInfo) {
          finalPrice = priceInfo.price;
          
          if (priceInfo.discount_percentage && priceInfo.stripe_discount_price_id) {
            // Il y a une promotion active
            originalPrice = priceInfo.original_price;
            discountPercentage = priceInfo.discount_percentage;
            hasDiscount = true;
            stripeDiscountPriceId = priceInfo.stripe_discount_price_id;
            
            console.log(`🎯 [SYNC] Promotion détectée pour ${item.product_id}: ${originalPrice}€ -> ${finalPrice}€`);
          } else {
            // Pas de promotion
            hasDiscount = false;
            originalPrice = undefined;
            discountPercentage = undefined;
            stripeDiscountPriceId = undefined;
          }
        }
        
        return {
          id: item.product_id,
          quantity: item.quantity,
          price: finalPrice, // Utiliser le prix avec promotion si applicable
          title,
          image_url,
          is_gift: item.is_gift || false,
          threshold_gift: item.threshold_gift || false,
          variant: item.variant,
          stripe_price_id: stripePriceId,
          stripe_discount_price_id: stripeDiscountPriceId,
          original_price: originalPrice,
          discount_percentage: discountPercentage,
          has_discount: hasDiscount
        };
      }));

      set({ items: mappedItems });
      
    } catch (error) {
      console.error("Error syncing with Supabase:", error);
    }
  },

  // 🎁 Nouvelle méthode pour mettre à jour un item existant
  updateItem: async (id: string, updates: Partial<CartItem>) => {
    const updatedItems = get().items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    set({ items: updatedItems });
    
    // Pas de sync Supabase nécessaire pour les cadeaux de la roue
  },

  // 🎁 Méthode pour recalculer l'expiration d'un cadeau de la roue
  updateWheelGiftExpiration: async (giftId: string, newExpirationHours: number) => {
    console.log(`🎁 🔄 updateWheelGiftExpiration appelée pour:`, { giftId, newExpirationHours });
    
    const allItems = get().items;
    const wheelGifts = allItems.filter(i => i.type === 'wheel_gift');
    console.log(`🎁 🔄 Items dans le panier:`, allItems.map(i => ({ id: i.id, type: i.type, title: i.title })));
    console.log(`🎁 🔄 Cadeaux de la roue trouvés:`, wheelGifts.map(i => ({ id: i.id, title: i.title, won_at: i.won_at, expires_at: i.expires_at })));
    
    const item = wheelGifts.find(i => i.id === giftId);
    if (!item) {
      console.log(`🎁 ❌ Cadeau avec ID ${giftId} non trouvé`);
      return;
    }

    if (!item.won_at) {
      console.log(`🎁 ❌ Cadeau ${giftId} n'a pas de won_at`);
      return;
    }

    const wonAt = new Date(item.won_at);
    const newExpiresAt = new Date(wonAt.getTime() + newExpirationHours * 60 * 60 * 1000);
    
    console.log(`🎁 🔄 Recalcul pour ${giftId}:`, {
      wonAt: wonAt.toISOString(),
      newExpirationHours,
      ancienExpiresAt: item.expires_at,
      nouveauExpiresAt: newExpiresAt.toISOString()
    });
    
    await get().updateItem(giftId, {
      expires_at: newExpiresAt.toISOString()
    });
    
    console.log(`🎁 ✅ Timer recalculé pour cadeau ${giftId}: expire maintenant le ${newExpiresAt.toISOString()}`);
  },

  // 🎁 Méthode pour nettoyer les cadeaux expirés
  cleanupExpiredGifts: () => {
    const now = new Date();
    const validItems = get().items.filter(item => {
      if (item.type !== 'wheel_gift') return true;
      if (!item.expires_at) return true;
      
      const expiresAt = new Date(item.expires_at);
      const isExpired = now > expiresAt;
      
      if (isExpired) {
        console.log(`🎁 Suppression automatique du cadeau expiré: ${item.title}`);
      }
      
      return !isExpired;
    });
    
    set({ items: validItems });
  },

  // 🎁 Méthode pour supprimer tous les cadeaux de la roue (pour le mode édition)
  clearWheelGifts: () => {
    const wheelGifts = get().items.filter(item => item.type === 'wheel_gift');
    const remainingItems = get().items.filter(item => item.type !== 'wheel_gift');
    
    console.log(`🎁 🗑️ Suppression de ${wheelGifts.length} cadeau(x) de la roue:`, wheelGifts.map(g => g.title));
    set({ items: remainingItems });
    
    return wheelGifts.length;
  }
}),
{
  name: 'cart-storage', // nom pour le localStorage
}
)
);

