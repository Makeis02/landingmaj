import { useEffect, useState } from "react";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link as RouterLink } from "react-router-dom";
import slugify from "slugify";
import PromoBadge from "@/components/PromoBadge";
import { checkMultiplePromotions } from "@/lib/promotions/checkActivePromotion";

interface ExtendedFavorite {
  id: string;
  title: string;
  price: number;
  image: string;
  description?: string;
  averageRating?: number;
  reviewCount?: number;
  hasVariant?: boolean;
  isInStock?: boolean;
  hasDiscount?: boolean;
  variantPriceRange?: { min: number; max: number };
}

const FavoriteProductsGrid = () => {
  const { items: favorites } = useFavoritesStore();
  const { addItem } = useCartStore();
  const { toast } = useToast();
  const [enrichedFavorites, setEnrichedFavorites] = useState<ExtendedFavorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const enrichFavorites = async () => {
      setLoading(true);
      if (favorites.length === 0) {
        setEnrichedFavorites([]);
        setLoading(false);
        return;
      }
      const ids = favorites.map(f => f.id);
      // Récupérer les infos enrichies comme dans PopularProducts
      // 1. Images principales
      const imageKeys = ids.map(id => `product_${id}_image_0`);
      const { data: imageData } = await supabase
        .from("editable_content")
        .select("content_key, content")
        .in("content_key", imageKeys);
      const imageMap: Record<string, string> = {};
      imageData?.forEach(item => {
        const id = item.content_key.replace("product_", "").replace("_image_0", "");
        imageMap[id] = item.content;
      });
      // 2. Descriptions
      const descKeys = ids.map(id => `product_${id}_description`);
      const { data: descData } = await supabase
        .from("editable_content")
        .select("content_key, content")
        .in("content_key", descKeys);
      const descMap: Record<string, string> = {};
      descData?.forEach(item => {
        const id = item.content_key.replace("product_", "").replace("_description", "");
        descMap[id] = item.content;
      });
      // 3. Notes et avis
      const { data: reviewData } = await supabase
        .from("customer_reviews")
        .select("product_id, rating");
      const reviewMap: Record<string, { avg: number; count: number }> = {};
      ids.forEach(pid => {
        const ratings = reviewData?.filter(r => r.product_id === pid).map(r => r.rating) || [];
        if (ratings.length > 0) {
          const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          reviewMap[pid] = { avg, count: ratings.length };
        }
      });
      // 🎯 4. Promotions - NOUVELLE LOGIQUE
      const promoMap = await checkMultiplePromotions(ids);
      console.log('🎯 [FAVORITES] Promotions actives détectées:', Object.keys(promoMap).filter(id => promoMap[id]).length);
      
      // 5. Price range variantes
      const priceKeys = ids.map(id => `product_${id}_variant_0_price_map`);
      const { data: priceData } = await supabase
        .from("editable_content")
        .select("content_key, content")
        .in("content_key", priceKeys);
      const priceMap: Record<string, { min: number; max: number }> = {};
      priceData?.forEach(item => {
        const id = item.content_key.replace("product_", "").replace("_variant_0_price_map", "");
        try {
          const parsed = JSON.parse(item.content);
          const prices = Object.values(parsed).map((v: any) => parseFloat(String(v)));
          if (prices.length > 0) {
            priceMap[id] = { min: Math.min(...prices), max: Math.max(...prices) };
          }
        } catch {}
      });
      // 6. Stock
      const stockKeys = ids.map(id => `product_${id}_stock`);
      const { data: stockData } = await supabase
        .from("editable_content")
        .select("content_key, content")
        .in("content_key", stockKeys);
      const stockMap: Record<string, number> = {};
      stockData?.forEach(item => {
        const id = item.content_key.replace("product_", "").replace("_stock", "");
        stockMap[id] = parseInt(item.content || "0");
      });
      // Construction finale
      const enriched = favorites.map(fav => {
        const id = fav.id;
        return {
          id,
          title: fav.title,
          price: fav.price,
          image: imageMap[id] || fav.image_url || "/placeholder.svg",
          description: descMap[id] || "",
          averageRating: reviewMap[id]?.avg || 0,
          reviewCount: reviewMap[id]?.count || 0,
          hasVariant: !!priceMap[id] && priceMap[id].min !== priceMap[id].max,
          isInStock: (stockMap[id] || 0) > 0,
          hasDiscount: promoMap[id] === true,
          variantPriceRange: priceMap[id] || null,
        };
      });
      setEnrichedFavorites(enriched);
      setLoading(false);
    };
    enrichFavorites();
  }, [favorites]);

  if (loading) {
    return <div className="text-center py-12">Chargement des favoris...</div>;
  }
  if (enrichedFavorites.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">Vous n'avez pas encore de favoris</p>
        <Button asChild>
          <RouterLink to="/">Découvrir nos produits</RouterLink>
        </Button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {enrichedFavorites.map(product => (
        <Card key={product.id} className="flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow duration-300 group">
          <div className="relative h-56 bg-white flex items-center justify-center">
            {(product.hasDiscount) && <PromoBadge />}
            <RouterLink to={`/produits/${slugify(product.title, { lower: true })}?id=${product.id}`}>
              <img
                src={product.image || "/placeholder.svg"}
                alt={product.title}
                className="max-h-44 max-w-[90%] object-contain p-2 bg-white rounded"
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
            <div className="font-medium text-lg text-gray-900 mb-3 truncate" style={{ minHeight: '1.8em' }}>
              {product.variantPriceRange
                ? `De ${product.variantPriceRange.min.toFixed(2)} € à ${product.variantPriceRange.max.toFixed(2)} €`
                : `${product.price?.toFixed(2)} €`}
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
                  onClick={() => {
                    addItem({
                      id: product.id,
                      title: product.title,
                      price: product.price,
                      image_url: product.image || "",
                    });
                    toast({
                      title: "Produit ajouté",
                      description: `${product.title} a été ajouté au panier.`,
                    });
                  }}
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
  );
};

export default FavoriteProductsGrid; 