
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CartItem {
  id: string;
  quantity: number;
  price: number;
  title: string;
  image_url?: string;
  is_gift?: boolean;
  threshold_gift?: boolean;
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
  addItem: (item: Omit<CartItem, "quantity">) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotal: () => number;
  syncWithSupabase: () => Promise<void>;
  fetchGiftSettings: () => Promise<void>;
  manageGiftItem: () => Promise<void>;
  getApplicableGiftRule: (total: number) => Promise<any>;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isLoading: false,
  giftSettings: null,

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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour ajouter des articles au panier",
          variant: "destructive",
        });
        return;
      }

      const existingItem = get().items.find((i) => i.id === item.id);

      if (existingItem) {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("user_id", session.user.id)
          .eq("product_id", item.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cart_items")
          .insert({
            user_id: session.user.id,
            product_id: item.id,
            quantity: 1,
          });

        if (error) throw error;
      }

      await get().syncWithSupabase();
      await get().manageGiftItem();
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", session.user.id)
        .eq("product_id", id);

      if (error) throw error;

      await get().syncWithSupabase();
      await get().manageGiftItem();
    } catch (error) {
      console.error("Error removing item from cart:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression",
        variant: "destructive",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  updateQuantity: async (id, quantity) => {
    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      if (quantity <= 0) {
        await get().removeItem(id);
        return;
      }

      const { error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("user_id", session.user.id)
        .eq("product_id", id);

      if (error) throw error;

      await get().syncWithSupabase();
      await get().manageGiftItem();
    } catch (error) {
      console.error("Error updating cart item quantity:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour",
        variant: "destructive",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  clearCart: async () => {
    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", session.user.id);

      if (error) throw error;

      await get().syncWithSupabase();
    } catch (error) {
      console.error("Error clearing cart:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression du panier",
        variant: "destructive",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  getTotal: () => {
    const { items } = get();
    const nonGiftItems = items.filter(item => !item.is_gift && !item.threshold_gift);
    return nonGiftItems.reduce((total, item) => total + item.price * item.quantity, 0);
  },

  syncWithSupabase: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        set({ items: [] });
        return;
      }

      const { data: cartItems, error } = await supabase
        .from("cart_items")
        .select(`
          quantity,
          product_id,
          is_gift,
          threshold_gift,
          products (
            title,
            price,
            image_url
          )
        `)
        .eq("user_id", session.user.id);

      if (error) throw error;

      const items = cartItems.map((item) => ({
        id: item.product_id,
        quantity: item.quantity,
        price: item.products?.price || 0,
        title: item.products?.title || "",
        image_url: item.products?.image_url,
        is_gift: item.is_gift || false,
        threshold_gift: item.threshold_gift || false,
      }));

      set({ items });
    } catch (error) {
      console.error("Error syncing with Supabase:", error);
    }
  },
}));

