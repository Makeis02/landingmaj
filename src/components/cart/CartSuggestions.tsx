
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/useCartStore";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Product {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
}

const CartSuggestions = () => {
  const { items, addItem } = useCartStore();
  
  // Ne récupérer des suggestions que s'il y a des produits non-cadeaux dans le panier
  const hasNonGiftItems = items.some(item => !item.is_gift);
  const nonGiftItems = items.filter(item => !item.is_gift);
  
  console.log("Cart items:", {
    allItems: items,
    nonGiftItems,
    hasNonGiftItems
  });
  
  // Récupérer les suggestions basées sur les produits du panier
  const { data: suggestions } = useQuery({
    queryKey: ["cart-suggestions", items.map(item => item.id)],
    queryFn: async () => {
      if (!hasNonGiftItems) {
        console.log("No non-gift items in cart");
        return [];
      }

      console.log("Fetching suggestions for items:", nonGiftItems);

      // Récupérer les paramètres des suggestions
      const { data: settings, error: settingsError } = await supabase
        .from("suggestion_settings")
        .select("*")
        .single();

      if (settingsError) {
        console.error("Error fetching settings:", settingsError);
        throw settingsError;
      }
      
      console.log("Suggestion settings:", settings);
      
      if (!settings?.is_enabled) {
        console.log("Suggestions are disabled");
        return [];
      }

      // Pour chaque produit non-cadeau dans le panier, récupérer les suggestions
      const suggestionsPromises = nonGiftItems.map(async (item) => {
        console.log("Fetching suggestions for item:", item.id);
        
        // Debug: Afficher les paramètres de la requête
        console.log("Query parameters:", {
          main_product_id: item.id,
          table: "product_suggestions_view",
          conditions: {
            suggestion_active: true,
            group_active: true
          }
        });
        
        const { data, error } = await supabase
          .from("product_suggestions_view")
          .select("*")
          .eq("main_product_id", item.id)
          .eq("suggestion_active", true)
          .eq("group_active", true);

        if (error) {
          console.error("Error fetching suggestions:", error);
          // Logger l'erreur
          await supabase.rpc("log_suggestion_event", {
            p_event_type: "suggestion_error",
            p_main_product_id: item.id,
            p_suggested_products: [],
            p_success: false,
            p_error_message: error.message,
          });
          throw error;
        }

        console.log("Raw suggestions data:", data);

        // Logger le succès
        if (data && data.length > 0) {
          console.log("Found suggestions for item", item.id, ":", data);
          await supabase.rpc("log_suggestion_event", {
            p_event_type: "suggestions_generated",
            p_main_product_id: item.id,
            p_suggested_products: data,
          });
        } else {
          console.log("No suggestions found for item:", item.id);
        }

        return data || [];
      });

      const suggestionsArrays = await Promise.all(suggestionsPromises);
      console.log("All suggestions arrays:", suggestionsArrays);
      
      // Aplatir et dédupliquer les suggestions
      const uniqueSuggestions = Array.from(
        new Set(
          suggestionsArrays
            .flat()
            .map(sugg => sugg.suggested_product_id)
        )
      )
        .map(id => {
          const suggestion = suggestionsArrays
            .flat()
            .find(sugg => sugg.suggested_product_id === id);
          return {
            id: suggestion.suggested_product_id,
            title: suggestion.suggested_product_title,
            price: suggestion.suggested_product_price,
            image_url: suggestion.suggested_product_image,
          };
        })
        // Filtrer les produits déjà dans le panier
        .filter(sugg => !items.some(item => item.id === sugg.id));

      console.log("Final unique suggestions:", uniqueSuggestions);

      return uniqueSuggestions.slice(0, settings.max_suggestions);
    },
    enabled: hasNonGiftItems,
  });

  // Ne pas afficher de suggestions s'il y a pas de produits non-cadeaux ou pas de suggestions
  if (!hasNonGiftItems || !suggestions?.length) {
    console.log("No suggestions to display", { 
      hasNonGiftItems, 
      suggestionsLength: suggestions?.length,
      suggestions 
    });
    return null;
  }

  return (
    <div className="mt-6 space-y-4">
      <h3 className="font-medium text-lg">Suggestion pour vous</h3>
      <div className="grid gap-4">
        {suggestions.map((product) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center gap-4 p-3 bg-white rounded-lg border"
          >
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.title}
                className="w-16 h-16 object-cover rounded"
              />
            )}
            <div className="flex-grow">
              <h4 className="font-medium text-sm">{product.title}</h4>
              <p className="text-sm text-gray-500">{product.price}€</p>
            </div>
            <Button 
              size="sm"
              onClick={() => addItem({
                id: product.id,
                title: product.title,
                price: product.price,
                image_url: product.image_url || undefined,
              })}
            >
              Ajouter
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CartSuggestions;
