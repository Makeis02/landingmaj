import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FavoriteItem {
  id: string;
  title: string;
  price: number;
  image_url?: string;
}

interface FavoritesStore {
  items: FavoriteItem[];
  addItem: (item: FavoriteItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  syncWithSupabase: () => Promise<void>;
  isInFavorites: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: async (item) => {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Ajouter localement
        set((state) => ({
          items: [...state.items, item]
        }));

        // Si l'utilisateur est connecté, synchroniser avec Supabase
        if (user) {
          try {
            await supabase
              .from("user_favorites")
              .upsert({
                user_id: user.id,
                product_id: item.id,
                created_at: new Date().toISOString()
              });
          } catch (error) {
            console.error("Erreur lors de la synchronisation avec Supabase:", error);
          }
        }

        toast({
          title: "Ajouté aux favoris",
          description: "Le produit a été ajouté à vos favoris.",
        });
      },

      removeItem: async (id) => {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Retirer localement
        set((state) => ({
          items: state.items.filter(item => item.id !== id)
        }));

        // Si l'utilisateur est connecté, synchroniser avec Supabase
        if (user) {
          try {
            await supabase
              .from("user_favorites")
              .delete()
              .eq("user_id", user.id)
              .eq("product_id", id);
          } catch (error) {
            console.error("Erreur lors de la suppression de Supabase:", error);
          }
        }

        toast({
          title: "Retiré des favoris",
          description: "Le produit a été retiré de vos favoris.",
        });
      },

      syncWithSupabase: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
          const { data, error } = await supabase
            .from("user_favorites")
            .select("*, product:product_id(*)")
            .eq("user_id", user.id);

          if (error) throw error;

          const favorites = data.map(fav => ({
            id: fav.product_id,
            title: fav.product.title,
            price: fav.product.price,
            image_url: fav.product.image_url
          }));

          set({ items: favorites });
        } catch (error) {
          console.error("Erreur lors de la synchronisation des favoris:", error);
        }
      },

      isInFavorites: (id) => {
        return get().items.some(item => item.id === id);
      }
    }),
    {
      name: "favorites-storage",
    }
  )
); 