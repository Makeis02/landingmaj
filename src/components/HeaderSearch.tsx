import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchActiveCategories } from "@/lib/api/categories";
import { fetchStripeProducts } from "@/lib/api/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/useCartStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useUserStore } from "@/stores/useUserStore";
import { useEditStore } from "@/stores/useEditStore";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useNavigate, useLocation } from "react-router-dom";
import slugify from 'slugify';

// Place ici toute la logique de recherche avancée extraite du Header
// (états, hooks, chargement des produits, catégories, images, prix, etc.)

const HeaderSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHasFocus, setSearchHasFocus] = useState(false);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [productPriceRanges, setProductPriceRanges] = useState<Record<string, { min: number, max: number }>>({});

  const { data: categories = [] } = useQuery({
    queryKey: ["active-categories"],
    queryFn: fetchActiveCategories,
  });
  const { data: allProducts = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ["all-products-for-search"],
    queryFn: fetchStripeProducts,
  });
  const { data: productCategories = {} } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_categories')
        .select('product_id, category_id');
      return data?.reduce((acc, curr) => {
        if (!acc[curr.product_id]) acc[curr.product_id] = [];
        acc[curr.product_id].push(curr.category_id);
        return acc;
      }, {}) || {};
    }
  });

  useEffect(() => {
    const loadProductPriceRanges = async () => {
      if (allProducts.length === 0) return;
      const productIds = allProducts.map(p => p.id.toString());
      const keys = productIds.map(id => `product_${getCleanProductId(id)}_variant_0_price_map`);
      const { data } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .in('content_key', keys);
      if (data) {
        const priceMap: Record<string, { min: number, max: number }> = {};
        data.forEach(({ content_key, content }) => {
          const id = content_key.replace(/^product_/, '').replace(/_variant_0_price_map$/, '');
          try {
            const parsed = JSON.parse(content);
            const prices = Object.values(parsed).map(v => parseFloat(String(v)));
            if (prices.length > 0) {
              priceMap[id] = { min: Math.min(...prices), max: Math.max(...prices) };
            }
          } catch {}
        });
        setProductPriceRanges(priceMap);
      }
    };
    loadProductPriceRanges();
  }, [allProducts]);

  useEffect(() => {
    const loadProductImages = async () => {
      if (allProducts.length === 0) return;
      const productIds = allProducts.map(p => p.id.toString());
      const imageKeys = productIds.map(id => `product_${getCleanProductId(id)}_image_0`);
      const { data } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .in('content_key', imageKeys);
      if (data) {
        const imagesMap = data.reduce((acc, curr) => {
          const productId = curr.content_key.replace(/^product_/, '').replace(/_image_0$/, '');
          acc[productId] = curr.content;
          return acc;
        }, {});
        setProductImages(imagesMap);
      }
    };
    loadProductImages();
  }, [allProducts]);

  const getCleanProductId = (id: string) => {
    if (!id || typeof id !== "string") return "";
    if (id.startsWith("prod_")) return id;
    if (id.startsWith("shopify_")) return id.replace("shopify_", "");
    if (id.includes("/")) return id.split("/").pop() || "";
    return id;
  };

  const filteredProducts = searchQuery.length > 0
    ? allProducts.filter(p => {
        const hasCategories = productCategories[p.id.toString()]?.length > 0;
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return hasCategories && matchesSearch;
      })
    : [];

  return (
    <div className="fixed top-0 left-0 w-full h-screen bg-white z-50 p-4 overflow-y-auto animate-slide-in flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xl font-bold text-ocean">Recherche</span>
        {/* Le bouton de fermeture doit être géré par le parent (Header) */}
      </div>
      <input
        type="text"
        placeholder="Rechercher un produit, une catégorie..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring focus:border-ocean"
        autoFocus
        onFocus={() => setSearchHasFocus(true)}
        onBlur={() => setSearchHasFocus(false)}
      />
      {searchQuery.length > 0 && (
        <div className="bg-white rounded-xl shadow-xl border z-50 max-h-[60vh] overflow-y-auto animate-fade-in">
          {isProductsLoading || allProducts.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">Chargement...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">Aucun produit trouvé</div>
          ) : (
            filteredProducts.slice(0, 12).map(product => (
              <a
                key={product.id}
                href={`/produits/${slugify(product.title, { lower: true })}?id=${product.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#f0f8ff] transition group cursor-pointer"
                style={{ textDecoration: 'none' }}
              >
                <img 
                  src={productImages[getCleanProductId(product.id)] || '/placeholder.svg'} 
                  alt={product.title} 
                  className="w-12 h-12 object-cover rounded-md border" 
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate group-hover:text-[#0074b3] transition-colors">{product.title}</div>
                  <div className="font-semibold text-[#0074b3] text-sm mt-1">
                    {productPriceRanges[getCleanProductId(product.id)]
                      ? `De ${productPriceRanges[getCleanProductId(product.id)].min.toFixed(2)}€ à ${productPriceRanges[getCleanProductId(product.id)].max.toFixed(2)}€`
                      : `${product.price?.toFixed(2)}€`}
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderSearch; 