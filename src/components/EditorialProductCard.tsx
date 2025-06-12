import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEditStore } from '@/stores/useEditStore';
import { useCartStore } from '@/stores/useCartStore';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import slugify from 'slugify';
import { fetchStripeProducts, StripeProduct } from '@/lib/api/stripe';
import PromoBadge from '@/components/PromoBadge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { fetchCategories, Category } from '@/lib/api/categories';
import { EditableImage } from '@/components/EditableImage';
import { Heart } from 'lucide-react';
import { getPriceIdForProduct } from '@/lib/stripe/getPriceIdFromSupabase';

interface EditorialProductCardProps {
  cardIndex: number;
  isSpecialCard: boolean;
  editorialData: {
    category: string;
    categoryColor: string;
    title: string;
    image: string;
    cta: string;
  };
}

interface ExtendedStripeProduct extends StripeProduct {
  categories?: string[];
}

const gradients = [
  'from-[#0074b3] to-blue-400',
  'from-[#0074b3] to-cyan-500',
  'from-[#0074b3] to-indigo-500',
  'from-[#0074b3] to-teal-400',
  'from-[#0074b3] to-sky-500',
  'from-[#0074b3] to-blue-600',
  'from-[#0074b3] to-blue-300',
  'from-[#0074b3] to-cyan-400',
  'from-[#0074b3] to-indigo-400',
];

const EditorialProductCard: React.FC<EditorialProductCardProps> = ({ cardIndex, isSpecialCard, editorialData }) => {
  const { isEditMode, isAdmin } = useEditStore();
  const { addItem, getDiscountedPrice } = useCartStore();
  const { toast } = useToast();
  const [allProducts, setAllProducts] = useState<ExtendedStripeProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ExtendedStripeProduct | null>(null);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSelect, setShowSelect] = useState(false);
  const [variantPriceRange, setVariantPriceRange] = useState<{min: number, max: number} | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [hasPromo, setHasPromo] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryPaths, setCategoryPaths] = useState<Record<string, string>>({});
  const [promoPrice, setPromoPrice] = useState<any>(null);

  // Fonction pour construire le chemin complet d'une catégorie
  const buildCategoryPath = (category: Category, allCategories: Category[]): string => {
    const path: string[] = [category.name];
    let currentCategory = category;

    while (currentCategory.parent_id) {
      const parent = allCategories.find(cat => cat.id === currentCategory.parent_id);
      if (parent) {
        path.unshift(parent.name);
        currentCategory = parent;
      } else {
        break;
      }
    }

    return path.join(' > ');
  };

  // Charger les catégories et construire les chemins
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .order('order', { ascending: true });

        if (categoriesData) {
          setCategories(categoriesData);
          // Construire les chemins pour chaque catégorie
          const paths: Record<string, string> = {};
          categoriesData.forEach(category => {
            paths[category.id] = buildCategoryPath(category, categoriesData);
          });
          setCategoryPaths(paths);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
      }
    };

    loadCategories();
  }, []);

  // Charger tous les produits Stripe
  useEffect(() => {
    fetchStripeProducts().then(setAllProducts);
  }, []);

  // Charger le produit sélectionné depuis editable_content
  useEffect(() => {
    const fetchSelected = async () => {
      setIsLoading(true);
      const key = `editorial_card_${cardIndex}_product_id`;
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', key)
        .maybeSingle();
      if (data?.content) {
        setSelectedProductId(data.content);
      } else {
        setSelectedProductId(null);
      }
      setIsLoading(false);
    };
    fetchSelected();
  }, [cardIndex, isEditMode]);

  // Charger le produit sélectionné dans la liste
  useEffect(() => {
    if (!selectedProductId || allProducts.length === 0) {
      setSelectedProduct(null);
      setProductImage(null);
      setVariantPriceRange(null);
      return;
    }
    const prod = allProducts.find(p => p.id === selectedProductId);
    setSelectedProduct(prod || null);
    // Récupérer l'image du produit via Supabase
    const fetchImage = async () => {
      const key = `product_${selectedProductId}_image_0`;
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', key)
        .maybeSingle();
      setProductImage(data?.content || '/placeholder.svg');
    };
    fetchImage();
    // Récupérer le price_map des variantes
    const fetchPriceMap = async () => {
      const key = `product_${selectedProductId}_variant_0_price_map`;
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', key)
        .maybeSingle();
      if (data?.content) {
        try {
          const parsed = JSON.parse(data.content);
          const prices = Object.values(parsed).map(v => parseFloat(String(v))).filter(v => !isNaN(v));
          if (prices.length > 0) {
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            if (min !== max) {
              setVariantPriceRange({ min, max });
            } else {
              setVariantPriceRange(null);
            }
          } else {
            setVariantPriceRange(null);
          }
        } catch {
          setVariantPriceRange(null);
        }
      } else {
        setVariantPriceRange(null);
      }
    };
    fetchPriceMap();
    // Récupérer les avis pour le produit sélectionné
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('customer_reviews')
        .select('rating')
        .eq('product_id', selectedProductId);
      if (error || !data) {
        setAverageRating(0);
        setReviewCount(0);
        return;
      }
      const ratings = data.map(r => r.rating).filter(r => typeof r === 'number' && !isNaN(r));
      if (ratings.length > 0) {
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        setAverageRating(avg);
        setReviewCount(ratings.length);
      } else {
        setAverageRating(0);
        setReviewCount(0);
      }
    };
    fetchReviews();
    // Récupérer la promo (badge)
    const fetchPromo = async () => {
      // 🎯 AJOUT : Récupération des prix promotionnels avec getDiscountedPrice
      if (!variantPriceRange) {
        try {
          const promo = await getDiscountedPrice(selectedProductId);
          if (promo && promo.discount_percentage) {
            setPromoPrice(promo);
            setHasPromo(true);
            return;
          } else {
            setPromoPrice(null);
          }
        } catch (error) {
          console.error('Erreur récupération prix promo:', error);
          setPromoPrice(null);
        }
      }
      
      // Vérifie la promo globale (pour le badge)
      const globalKey = `product_${selectedProductId}_discount_percentage`;
      const { data: globalPromo } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', globalKey)
        .maybeSingle();
      if (globalPromo?.content && parseFloat(globalPromo.content) > 0) {
        setHasPromo(true);
        return;
      }
      // Vérifie les promos variantes
      const { data: variantPromos } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .like('content_key', `product_${selectedProductId}_variant_0_option_%_discount_percentage`);
      if (variantPromos && variantPromos.some(v => parseFloat(v.content) > 0)) {
        setHasPromo(true);
        return;
      }
      setHasPromo(false);
    };
    fetchPromo();
  }, [selectedProductId, allProducts]);

  // 🎯 NOUVELLE FONCTION : Gestion complète de l'ajout au panier avec promotions
  const handleAddToCart = async () => {
    if (!selectedProduct) return;
    
    // Récupérer les informations sur les variantes sélectionnées
    let variant = null;
    let stripePriceId = null;
    let stripeDiscountPriceId = null;
    let finalPrice = selectedProduct.price;
    let originalPrice = undefined;
    let discountPercentage = undefined;
    let hasDiscountApplied = false;
    
    // Vérifier s'il y a une réduction avec getDiscountedPrice
    const priceInfo = await getDiscountedPrice(selectedProduct.id);
    
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
        .eq('content_key', `product_${selectedProduct.id}_stripe_price_id`)
        .single();
      if (priceIdData?.content) {
        stripePriceId = priceIdData.content;
      }
    }
    
    // Vérifier que nous avons un stripe_price_id valide
    if (!stripePriceId || stripePriceId === "null") {
      console.error(`❌ Aucun stripe_price_id trouvé pour le produit ${selectedProduct.id}`);
      toast({
        variant: "destructive",
        title: "Erreur de configuration",
        description: "Ce produit n'a pas de prix Stripe configuré."
      });
      return;
    }
    
    console.log(`✅ stripe_price_id trouvé pour ${selectedProduct.id}: ${stripePriceId}`);
    
    // Vérifier le stock
    const { data: stockData } = await supabase
      .from('editable_content')
      .select('content')
      .eq('content_key', `product_${selectedProduct.id}_stock`)
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
        id: selectedProduct.id,
        price: finalPrice,
        title: selectedProduct.title,
        image_url: productImage || '',
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
          ? `${selectedProduct.title} a été ajouté à votre panier avec ${discountPercentage}% de réduction !`
          : `${selectedProduct.title} a été ajouté à votre panier.`,
      });
      
      console.log(`✅ Produit ajouté au panier:`, {
        id: selectedProduct.id,
        title: selectedProduct.title,
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

  // Sauvegarder la sélection dans editable_content
  const saveSelection = async (productId: string) => {
    const key = `editorial_card_${cardIndex}_product_id`;
    const { data: existing } = await supabase
      .from('editable_content')
      .select('id')
      .eq('content_key', key)
      .maybeSingle();
    if (existing) {
      await supabase
        .from('editable_content')
        .update({ content: productId })
        .eq('content_key', key);
    } else {
      await supabase
        .from('editable_content')
        .insert({ content_key: key, content: productId });
    }
    setSelectedProductId(productId);
    toast({ title: 'Produit sélectionné', description: 'Le produit a été associé à la carte.' });
    setShowSelect(false);
  };

  // Affichage carte éditoriale classique
  if (isSpecialCard || (!selectedProduct && !isEditMode)) {
    return (
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-500 group cursor-pointer">
        <div className="relative">
          <div className={`h-2 ${editorialData.categoryColor}`}></div>
          <div className="relative h-48 overflow-hidden">
            <img 
              src={editorialData.image} 
              alt={editorialData.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          </div>
        </div>
        <CardContent className="p-6">
          <div className="mb-3">
            <Badge className={`${editorialData.categoryColor} text-white text-xs font-medium px-3 py-1 rounded-full`}>
              {editorialData.category}
            </Badge>
          </div>
          <h3 className="font-bold text-lg mb-4 transition-colors group-hover:text-[#0074b3] leading-tight">
            {editorialData.title}
          </h3>
          <Button variant="outline" className="group-hover:bg-[#0074b3] group-hover:text-white transition-colors rounded-xl border-[#0074b3] text-[#0074b3]">
            {editorialData.cta}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Affichage carte produit avec structure éditoriale
  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-500 group cursor-pointer">
      <div className="relative">
        <div className={`h-2 ${editorialData.categoryColor}`}></div>
        <a href={`/produits/${slugify(selectedProduct?.title || '', { lower: true })}?id=${selectedProduct?.id}`} className="block">
          <div className="relative h-48 overflow-hidden flex items-center justify-center bg-white cursor-pointer group-hover:scale-105 transition-transform duration-300">
            {hasPromo && (
              <div className="absolute top-2 left-2 z-10">
                <PromoBadge />
              </div>
            )}
            <img 
              src={productImage || '/placeholder.svg'} 
              alt={selectedProduct?.title}
              className="max-h-44 max-w-[90%] object-contain p-2 bg-white rounded"
            />
            <div className="absolute top-2 right-2 z-10">
              <Heart className="h-6 w-6 text-[#2596be] opacity-80 hover:opacity-100 transition" />
            </div>
          </div>
        </a>
      </div>
      <CardContent className="p-6">
        <div className="mb-3">
          <Badge className={`${editorialData.categoryColor} text-white text-xs font-medium px-3 py-1 rounded-full`}>
            {editorialData.category}
          </Badge>
        </div>
        <h3 className="font-bold text-lg mb-1 transition-colors group-hover:text-[#0074b3] leading-tight line-clamp-1">
          {selectedProduct?.title}
        </h3>
        {/* Avis étoiles + nombre d'avis */}
        <div className="flex items-center mb-2">
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              className={`h-5 w-5 ${i < Math.round(averageRating) ? 'text-[#0074b3] fill-[#0074b3]' : 'text-gray-200 fill-gray-200'}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          <span className="text-xs ml-1 text-gray-500">
            ({reviewCount})
          </span>
        </div>
        <div className="text-xs text-gray-600 mb-2 line-clamp-2 min-h-[2.5em]">
          {selectedProduct?.description
            ? selectedProduct.description.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
            : <span className="italic text-gray-400">Aucune description</span>}
        </div>
        <div className="font-medium text-lg text-gray-900 mb-4 truncate" style={{minHeight: '1.8em'}}>
          {variantPriceRange ? (
            `De ${variantPriceRange.min.toFixed(2)} € à ${variantPriceRange.max.toFixed(2)} €`
          ) : promoPrice && promoPrice.discount_percentage ? (
            <>
              <span className="text-gray-500 line-through mr-2">{promoPrice.original_price.toFixed(2)}€</span>
              <span className="text-red-600 font-semibold">{promoPrice.price.toFixed(2)}€</span>
              <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">-{promoPrice.discount_percentage}%</span>
            </>
          ) : (
            selectedProduct?.price?.toFixed(2) + ' €'
          )}
        </div>
        {variantPriceRange ? (
          <Button
            asChild
            variant="outline"
            className="group-hover:bg-[#0074b3] group-hover:text-white transition-colors rounded-xl border-[#0074b3] text-[#0074b3] w-full font-bold"
          >
            <a href={`/produits/${slugify(selectedProduct?.title || '', { lower: true })}?id=${selectedProduct?.id}`}>
              Voir le produit
            </a>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="group-hover:bg-[#0074b3] group-hover:text-white transition-colors rounded-xl border-[#0074b3] text-[#0074b3] w-full font-bold"
            onClick={handleAddToCart}
          >
            Ajouter au panier
          </Button>
        )}
        {isEditMode && (
          <Button variant="outline" className="mt-4 w-full" onClick={() => setShowSelect(true)}>
            Modifier le produit affiché
          </Button>
        )}
      </CardContent>
      {/* Modal de sélection de produit */}
      {isEditMode && showSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold">Sélectionner un produit</h3>
              <p className="text-gray-600">Choisissez le produit à afficher dans cette carte</p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <Select value={selectedProductId || ''} onValueChange={saveSelection}>
                <SelectTrigger className="w-full mb-4">
                  <SelectValue placeholder="Choisir un produit..." />
                </SelectTrigger>
                <SelectContent>
                  {allProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <img 
                          src={product.image || '/placeholder.svg'} 
                          alt={product.title}
                          className="w-8 h-8 object-contain"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{product.title}</div>
                          <div className="text-xs text-gray-500/70 truncate">
                            {product.categories?.map(catId => categoryPaths[catId] || '').filter(Boolean).join(' | ')}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-6 border-t flex justify-end">
              <Button variant="outline" onClick={() => setShowSelect(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

// Interface pour la carte catégorie éditoriale
interface EditorialCategoryCardProps {
  cardIndex: number;
  editorialData: {
    category: string;
    categoryColor: string;
    title: string;
    image: string;
    cta: string;
  };
}

// --- EditorialCategoryCard ---
export const EditorialCategoryCard: React.FC<EditorialCategoryCardProps> = ({ cardIndex, editorialData }) => {
  const { isEditMode, isAdmin } = useEditStore();
  const { toast } = useToast();
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSelect, setShowSelect] = useState(false);
  const [leafCategories, setLeafCategories] = useState<Category[]>([]);
  const gradient = gradients[cardIndex % gradients.length];
  const [imageUrl, setImageUrl] = useState<string>(editorialData.image || '/placeholder.svg');

  // Charger toutes les catégories
  useEffect(() => {
    if (!isEditMode && !isAdmin) return;
    fetchCategories().then(setAllCategories);
  }, [isEditMode, isAdmin]);

  // Charger la catégorie sélectionnée depuis editable_content
  useEffect(() => {
    const fetchSelected = async () => {
      setIsLoading(true);
      const key = `editorial_card_${cardIndex}_category_id`;
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', key)
        .maybeSingle();
      if (data?.content) {
        setSelectedCategoryId(data.content);
      } else {
        setSelectedCategoryId(null);
      }
      setIsLoading(false);
    };
    fetchSelected();
  }, [cardIndex, isEditMode]);

  // Charger la catégorie sélectionnée dans la liste
  useEffect(() => {
    if (!selectedCategoryId || allCategories.length === 0) {
      setSelectedCategory(null);
      return;
    }
    const cat = allCategories.find(c => c.id === selectedCategoryId);
    setSelectedCategory(cat || null);
  }, [selectedCategoryId, allCategories]);

  // Filtrer les catégories feuilles (pas de children)
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*');
      if (data) {
        setLeafCategories(data.filter((cat: Category) => !data.some((child: Category) => child.parent_id === cat.id)));
      }
    };
    fetchCategories();
  }, []);

  // Charger la catégorie sélectionnée
  useEffect(() => {
    if (!selectedCategoryId) return;
    const cat = leafCategories.find((c) => c.id === selectedCategoryId);
    setSelectedCategory(cat || null);
  }, [selectedCategoryId, leafCategories]);

  // Charger l'image depuis Supabase editable_content
  useEffect(() => {
    const fetchImage = async () => {
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', `editorial_card_${cardIndex}_image`)
        .single();
      if (data && data.content) setImageUrl(data.content);
    };
    fetchImage();
  }, [cardIndex]);

  // Sauvegarder la sélection dans editable_content
  const saveSelection = async (categoryId: string) => {
    const key = `editorial_card_${cardIndex}_category_id`;
    const { data: existing } = await supabase
      .from('editable_content')
      .select('id')
      .eq('content_key', key)
      .maybeSingle();
    if (existing) {
      await supabase
        .from('editable_content')
        .update({ content: categoryId })
        .eq('content_key', key);
    } else {
      await supabase
        .from('editable_content')
        .insert({ content_key: key, content: categoryId });
    }
    setSelectedCategoryId(categoryId);
    toast({ title: 'Catégorie sélectionnée', description: 'La catégorie a été associée à la carte.' });
    setShowSelect(false);
  };

  // Affichage carte éditoriale classique si pas de catégorie sélectionnée
  if (!selectedCategory && !isEditMode) {
    return (
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-500 group cursor-pointer">
        <div className="relative">
          <div className={`h-2 ${editorialData.categoryColor}`}></div>
          <div className="relative h-48 overflow-hidden">
            <img 
              src={editorialData.image} 
              alt={editorialData.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          </div>
        </div>
        <CardContent className="p-6">
          <div className="mb-3">
            <Badge className={`${editorialData.categoryColor} text-white text-xs font-medium px-3 py-1 rounded-full`}>
              {editorialData.category}
            </Badge>
          </div>
          <h3 className="font-bold text-lg mb-4 transition-colors group-hover:text-[#0074b3] leading-tight">
            {editorialData.title}
          </h3>
          <Button variant="outline" className="group-hover:bg-[#0074b3] group-hover:text-white transition-colors rounded-xl border-[#0074b3] text-[#0074b3]">
            {editorialData.cta}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Affichage carte catégorie avec structure éditoriale
  return (
    <Card className="flex flex-row h-full overflow-hidden rounded-2xl shadow-md">
      {/* Colonne image */}
      <div className="relative w-32 h-full bg-white border-r border-gray-200 flex-shrink-0">
        {isEditMode ? (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            <EditableImage
              imageKey={`editorial_card_${cardIndex}_image`}
              initialUrl={imageUrl}
              className="w-full h-full object-cover"
              onUpdate={setImageUrl}
            />
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={editorialData.title}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {/* Colonne contenu avec fond dégradé bleu */}
      <div className={`flex-1 flex flex-col justify-center px-6 py-6 bg-gradient-to-br ${gradient} relative`}>
        {/* Badge */}
        <Badge className="absolute top-6 left-6 bg-white/90 text-[#0074b3] font-bold text-xs px-3 py-1 rounded-full shadow-md">
          {editorialData.category}
        </Badge>
        <div className="pl-0 pt-10 pb-2">
          <h3 className="font-bold text-2xl text-white mb-2 drop-shadow-lg">{selectedCategory?.name || editorialData.title}</h3>
          <Button
            variant="outline"
            className="bg-white text-[#0074b3] font-bold rounded-xl px-6 py-2 mt-2 shadow hover:bg-blue-100 hover:text-[#005a8c] transition"
            asChild
          >
            <a href={selectedCategory ? `/categories/${selectedCategory.slug}` : '#'}>Voir la catégorie</a>
          </Button>
          {isEditMode && (
            <Button variant="outline" className="mt-4 w-full" onClick={() => setShowSelect(true)}>
              Modifier la catégorie affichée
            </Button>
          )}
        </div>
        {/* Modal de sélection de catégorie */}
        {isEditMode && showSelect && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold">Sélectionner une catégorie</h3>
                <p className="text-gray-600">Choisissez la catégorie à afficher dans cette carte</p>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <Select value={selectedCategoryId || ''} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="w-full mb-4">
                    <SelectValue placeholder="Choisir une catégorie..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leafCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-6 border-t flex justify-end">
                <Button variant="outline" onClick={() => setShowSelect(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

interface EditorialPackCardProps {
  cardIndex: number;
  editorialData: {
    category: string;
    categoryColor: string;
    title: string;
    image: string;
    cta: string;
    link?: string;
  };
}

export const EditorialPackCard: React.FC<EditorialPackCardProps> = ({ cardIndex, editorialData }) => {
  const { isEditMode } = useEditStore();
  const [link, setLink] = useState(editorialData.link || '');
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(editorialData.image || '/placeholder.svg');

  useEffect(() => {
    const fetchImage = async () => {
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', `editorial_card_${cardIndex}_image`)
        .single();
      if (data && data.content) setImageUrl(data.content);
    };
    fetchImage();
  }, [cardIndex]);

  const gradients = [
    'from-[#0074b3] to-blue-400',
    'from-[#0074b3] to-cyan-500',
    'from-[#0074b3] to-indigo-500',
    'from-[#0074b3] to-teal-400',
    'from-[#0074b3] to-sky-500',
    'from-[#0074b3] to-blue-600',
    'from-[#0074b3] to-blue-300',
    'from-[#0074b3] to-cyan-400',
    'from-[#0074b3] to-indigo-400',
  ];
  const gradient = gradients[cardIndex % gradients.length];

  const handleImageUpdate = async (newUrl: string) => {
    setImageUrl(newUrl);
    await supabase
      .from('editable_content')
      .upsert({ content_key: `editorial_card_${cardIndex}_image`, content: newUrl });
  };

  return (
    <Card className="flex flex-row h-full overflow-hidden rounded-2xl shadow-md">
      {/* Colonne image */}
      <div className="relative w-32 h-full bg-white border-r border-gray-200 flex-shrink-0">
        {isEditMode ? (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            <EditableImage
              imageKey={`editorial_card_${cardIndex}_image`}
              initialUrl={imageUrl}
              className="w-full h-full object-cover"
              onUpdate={handleImageUpdate}
            />
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={editorialData.title}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {/* Colonne contenu avec fond dégradé bleu */}
      <div className={`flex-1 flex flex-col justify-center px-6 py-6 bg-gradient-to-br ${gradient} relative`}>
        {/* Badge */}
        <Badge className="absolute top-6 left-6 bg-white/90 text-[#0074b3] font-bold text-xs px-3 py-1 rounded-full shadow-md">
          {editorialData.category}
        </Badge>
        <div className="pl-0 pt-10 pb-2">
          <h3 className="font-bold text-2xl text-white mb-2 drop-shadow-lg">{editorialData.title}</h3>
          <Button
            variant="outline"
            className="bg-white text-[#0074b3] font-bold rounded-xl px-6 py-2 mt-2 shadow hover:bg-blue-100 hover:text-[#005a8c] transition"
            asChild
            disabled={!link}
          >
            <a href={link || '#'} target="_blank" rel="noopener noreferrer">Voir les packs</a>
          </Button>
          {isEditMode && (
            <div className="mt-4">
              {isEditingLink ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={link}
                    onChange={e => setLink(e.target.value)}
                    className="px-2 py-1 rounded border text-sm w-64"
                    placeholder="/packs/mon-pack"
                  />
                  <Button size="sm" onClick={() => setIsEditingLink(false)}>OK</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditingLink(true)}>
                  Modifier le lien de redirection
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default EditorialProductCard; 