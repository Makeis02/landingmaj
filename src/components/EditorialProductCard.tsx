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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EditableText } from "@/components/EditableText";

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
  const [isLoading, setIsLoading] = useState(false);
  const [showSelect, setShowSelect] = useState(false);
  const [variantPriceRange, setVariantPriceRange] = useState<{min: number, max: number} | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [hasPromo, setHasPromo] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryPaths, setCategoryPaths] = useState<Record<string, string>>({});
  const [promoPrice, setPromoPrice] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: productImage } = useQuery({
    queryKey: ['editorial-card-product-image', cardIndex, selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return '/placeholder.svg';
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', `product_${selectedProductId}_image_0`)
        .maybeSingle();
      return data?.content || '/placeholder.svg';
    },
    enabled: !!selectedProductId,
  });

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

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .order('order', { ascending: true });

        if (categoriesData) {
          setCategories(categoriesData);
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

  useEffect(() => {
    fetchStripeProducts().then(setAllProducts);
  }, []);

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

  useEffect(() => {
    if (!selectedProductId || allProducts.length === 0) {
      setSelectedProduct(null);
      setVariantPriceRange(null);
      return;
    }
    const prod = allProducts.find(p => p.id === selectedProductId);
    setSelectedProduct(prod || null);
    
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
        setHasPromo(false);
      } else {
        setAverageRating(0);
        setReviewCount(0);
        setHasPromo(false);
      }
    };
    fetchReviews();
    const fetchPromo = async () => {
      const key = `product_${selectedProductId}_promo_price`;
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', key)
        .maybeSingle();
      if (data?.content) {
        setPromoPrice(parseFloat(data.content));
        setHasPromo(true);
      } else {
        setPromoPrice(null);
        setHasPromo(false);
      }
    };
    fetchPromo();
  }, [selectedProductId, allProducts]);

  const handleAddToCart = async () => {
    if (!selectedProduct) return;

    const priceId = getPriceIdForProduct(selectedProduct, variantPriceRange?.min, promoPrice);

    if (!priceId) {
      toast({
        title: "Erreur",
        description: "Impossible de trouver le prix de ce produit.",
        variant: "destructive",
      });
      return;
    }

    addItem({ 
      id: selectedProduct.id,
      title: selectedProduct.name,
      image_url: productImage || '/placeholder.svg',
      price: promoPrice || variantPriceRange?.min || parseFloat(selectedProduct.unit_amount_decimal) / 100,
      quantity: 1,
      price_id: priceId,
      description: selectedProduct.description,
      categories: selectedProduct.categories
    });
    toast({
      title: "Produit ajouté",
      description: `${selectedProduct.name} a été ajouté à votre panier.`,
    });
  };

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

  const handleCtaUrlUpdate = async (newUrl: string) => {
    const key = `editorial_card_${cardIndex}_cta_url`;
    const { data: existing } = await supabase
      .from('editable_content')
      .select('id')
      .eq('content_key', key)
      .maybeSingle();
    if (existing) {
      await supabase
        .from('editable_content')
        .update({ content: newUrl })
        .eq('content_key', key);
    } else {
      await supabase
        .from('editable_content')
        .insert({ content_key: key, content: newUrl });
    }
    toast({ title: 'URL mise à jour', description: 'L\'URL du bouton a été mise à jour.' });
  };

  const handleCtaTextUpdate = async (newText: string) => {
    const key = `editorial_card_${cardIndex}_cta_text`;
    const { data: existing } = await supabase
      .from('editable_content')
      .select('id')
      .eq('content_key', key)
      .maybeSingle();
    if (existing) {
      await supabase
        .from('editable_content')
        .update({ content: newText })
        .eq('content_key', key);
    } else {
      await supabase
        .from('editable_content')
        .insert({ content_key: key, content: newText });
    }
    toast({ title: 'Texte mis à jour', description: 'Le texte du bouton a été mis à jour.' });
  };

  const [customCtaUrl, setCustomCtaUrl] = useState<string | null>(null);
  const [customCtaText, setCustomCtaText] = useState<string | null>(null);

  useEffect(() => {
    const fetchCtaData = async () => {
      const urlKey = `editorial_card_${cardIndex}_cta_url`;
      const textKey = `editorial_card_${cardIndex}_cta_text`;
      const { data } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .in('content_key', [urlKey, textKey]);
      if (data) {
        const urlData = data.find(d => d.content_key === urlKey);
        const textData = data.find(d => d.content_key === textKey);
        if (urlData) setCustomCtaUrl(urlData.content);
        if (textData) setCustomCtaText(textData.content);
      }
    };
    fetchCtaData();
  }, [cardIndex, isEditMode]);

  if (selectedProduct || isSpecialCard) {
    const priceToDisplay = hasPromo ? promoPrice : (variantPriceRange?.min || (selectedProduct ? parseFloat(selectedProduct.unit_amount_decimal) / 100 : 0));
    const originalPrice = selectedProduct ? parseFloat(selectedProduct.unit_amount_decimal) / 100 : 0;
    const ctaUrl = customCtaUrl || (selectedProduct?.name ? `/products/${slugify(selectedProduct.name, { lower: true })}` : '#');
    const ctaText = customCtaText || editorialData.cta;

    return (
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-500 group cursor-pointer">
        <div className="relative">
          <div className={`h-2 ${editorialData.categoryColor}`}></div>
          <div className="relative h-48 overflow-hidden">
            {isEditMode ? (
              <EditableImage
                imageKey={`editorial_card_${cardIndex}_image`}
                initialUrl={productImage || editorialData.image || '/placeholder.svg'}
                className="w-full h-full object-cover"
                onUpdate={() => queryClient.invalidateQueries({ queryKey: ['editorial-card-product-image', cardIndex, selectedProductId] })}
              />
            ) : (
              <img 
                src={productImage || editorialData.image || '/placeholder.svg'}
                alt={selectedProduct?.name || editorialData.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            )}
            {hasPromo && <PromoBadge text="PROMO" className="absolute top-4 left-4" />}
          </div>
          <div className="absolute top-4 left-4">
            <Badge className={`${editorialData.categoryColor} text-white text-xs font-medium px-3 py-1 rounded-full`}>
              {selectedProduct?.categories?.[0] ? categories.find(cat => cat.id === selectedProduct.categories?.[0])?.name : editorialData.category}
            </Badge>
          </div>
        </div>
        <CardContent className="p-6">
          <h3 className="font-bold text-lg mb-2 transition-colors group-hover:text-[#0074b3] leading-tight">
            {selectedProduct?.name || editorialData.title}
          </h3>
          {selectedProduct && (
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <div className="flex text-yellow-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} fill={i < averageRating ? "currentColor" : "none"} stroke="currentColor" />
                ))}
              </div>
              <span className="ml-1">({reviewCount})</span>
            </div>
          )}
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {selectedProduct?.description || 'Aucune description disponible.'}
          </p>
          <div className="flex items-baseline mb-4">
            <span className="text-xl font-bold text-gray-900">
              {priceToDisplay.toFixed(2)} €
            </span>
            {hasPromo && originalPrice > 0 && priceToDisplay < originalPrice && (
              <span className="text-sm text-gray-500 line-through ml-2">
                {originalPrice.toFixed(2)} €
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Button 
              className="rounded-xl bg-[#0074b3] text-white hover:bg-[#005a8c] transition-colors px-6 py-2 font-semibold w-full"
              onClick={handleAddToCart}
            >
              Ajouter au panier
              <ShoppingCart className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-500 group cursor-pointer">
      <div className="relative">
        <div className={`h-2 ${editorialData.categoryColor}`}></div>
        <div className="relative h-48 overflow-hidden">
          {isEditMode ? (
            <EditableImage
              imageKey={`editorial_card_${cardIndex}_image`}
              initialUrl={productImage || editorialData.image || '/placeholder.svg'}
              className="w-full h-full object-cover"
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['editorial-card-product-image', cardIndex, selectedProductId] })}
            />
          ) : (
            <img 
              src={productImage || editorialData.image || '/placeholder.svg'}
              alt={editorialData.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          )}
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
        <Button 
          variant="outline" 
          className="group-hover:bg-[#0074b3] group-hover:text-white transition-colors rounded-xl border-[#0074b3] text-[#0074b3]"
          asChild
        >
          <a href="#">{editorialData.cta}</a>
        </Button>
      </CardContent>
    </Card>
  );
};

interface EditorialCategoryCardProps {
  cardIndex: number;
  editorialData: {
    category: string;
    categoryColor: string;
    title: string;
    image: string;
    cta: string;
    redirectUrl?: string;
  };
}

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
  const queryClient = useQueryClient();

  const { data: imageUrl } = useQuery({
    queryKey: ['editorial-card-category-image', cardIndex],
    queryFn: async () => {
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', `editorial_card_${cardIndex}_image`)
        .maybeSingle();
      return data?.content || editorialData.image || '/placeholder.svg';
    },
  });

  useEffect(() => {
    if (!isEditMode && !isAdmin) return;
    fetchCategories().then(setAllCategories);
  }, [isEditMode, isAdmin]);

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

  useEffect(() => {
    if (!selectedCategoryId || allCategories.length === 0) {
      setSelectedCategory(null);
      return;
    }
    const cat = allCategories.find(c => c.id === selectedCategoryId);
    setSelectedCategory(cat || null);
  }, [selectedCategoryId, allCategories]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*');
      if (data) {
        setLeafCategories(data.filter((cat: Category) => !data.some((child: Category) => child.parent_id === cat.id)));
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) return;
    const cat = leafCategories.find((c) => c.id === selectedCategoryId);
    setSelectedCategory(cat || null);
  }, [selectedCategoryId, leafCategories]);

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

  if (!selectedCategory && !isEditMode) {
    return (
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-500 group cursor-pointer">
        <div className="relative">
          <div className={`h-2 ${editorialData.categoryColor}`}></div>
          <div className="relative h-48 overflow-hidden">
            <img 
              src={imageUrl || editorialData.image || '/placeholder.svg'}
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

  const linkUrl = selectedCategory ? `/categories/${selectedCategory.slug}` : editorialData.redirectUrl || '#';

  return (
    <Card className="flex flex-row h-full overflow-hidden rounded-2xl shadow-md">
      <div className="relative w-32 h-full bg-white border-r border-gray-200 flex-shrink-0">
        {isEditMode ? (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            <EditableImage
              imageKey={`editorial_card_${cardIndex}_image`}
              initialUrl={imageUrl || editorialData.image || '/placeholder.svg'}
              className="w-full h-full object-cover"
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['editorial-card-category-image', cardIndex] })}
            />
          </div>
        ) : (
          <img
            src={imageUrl || editorialData.image || '/placeholder.svg'}
            alt={editorialData.title}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className={`flex-1 flex flex-col justify-center px-6 py-6 bg-gradient-to-br ${gradient} relative`}>
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
            <a href={linkUrl}>Voir la catégorie</a>
          </Button>
          {isEditMode && (
            <Button variant="outline" className="mt-4 w-full" onClick={() => setShowSelect(true)}>
              Modifier la catégorie affichée
            </Button>
          )}
        </div>
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
  const queryClient = useQueryClient();

  const { data: imageUrl } = useQuery({
    queryKey: ['editorial-card-pack-image', cardIndex],
    queryFn: async () => {
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', `editorial_card_${cardIndex}_image`)
        .maybeSingle();
      return data?.content || editorialData.image || '/placeholder.svg';
    },
  });

  useEffect(() => {
    const fetchImage = async () => {
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', `editorial_card_${cardIndex}_image`)
        .maybeSingle();
      if (data && data.content) setImageUrl(data.content);
      else setImageUrl(editorialData.image || '/placeholder.svg');
    };
    fetchImage();
  }, [cardIndex, editorialData.image]);

  const handleImageUpdate = async (newUrl: string) => {
    queryClient.invalidateQueries({ queryKey: ['editorial-card-pack-image', cardIndex] });
  };

  const handleLinkUpdate = async (newLink: string) => {
    const key = `editorial_pack_card_${cardIndex}_link`;
    const { data: existing } = await supabase
      .from('editable_content')
      .select('id')
      .eq('content_key', key)
      .maybeSingle();
    if (existing) {
      await supabase
        .from('editable_content')
        .update({ content: newLink })
        .eq('content_key', key);
    } else {
      await supabase
        .from('editable_content')
        .insert({ content_key: key, content: newLink });
    }
    setLink(newLink);
    toast({ title: 'Lien mis à jour', description: 'Le lien du pack a été mis à jour.' });
  };

  useEffect(() => {
    const fetchLink = async () => {
      const key = `editorial_pack_card_${cardIndex}_link`;
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', key)
        .maybeSingle();
      if (data?.content) setLink(data.content);
    };
    fetchLink();
  }, [cardIndex, isEditMode]);

  const packSlug = editorialData.title ? slugify(editorialData.title, { lower: true }) : '#';
  const finalLink = link || (editorialData.link ? editorialData.link : packSlug);

  return (
    <Card className="flex flex-row h-full overflow-hidden rounded-2xl shadow-md">
      <div className="relative w-32 h-full bg-white border-r border-gray-200 flex-shrink-0">
        {isEditMode ? (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            <EditableImage
              imageKey={`editorial_card_${cardIndex}_image`}
              initialUrl={imageUrl || editorialData.image || '/placeholder.svg'}
              className="w-full h-full object-cover"
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['editorial-card-pack-image', cardIndex] })}
            />
          </div>
        ) : (
          <img
            src={imageUrl || editorialData.image || '/placeholder.svg'}
            alt={editorialData.title}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className={`flex-1 flex flex-col justify-center px-6 py-6 bg-gradient-to-br ${gradients[cardIndex % gradients.length]} relative`}>
        <Badge className="absolute top-6 left-6 bg-white/90 text-[#0074b3] font-bold text-xs px-3 py-1 rounded-full shadow-md">
          {editorialData.category}
        </Badge>
        <div className="pl-0 pt-10 pb-2">
          <h3 className="font-bold text-2xl text-white mb-2 drop-shadow-lg">
            <EditableText
              contentKey={`editorial_pack_card_${cardIndex}_title`}
              initialContent={editorialData.title}
              className="inline leading-tight"
            />
          </h3>
          {isEditMode && (
            <div className="mb-4">
              <EditableURL
                contentKey={`editorial_pack_card_${cardIndex}_link`}
                initialContent={link}
                onUpdate={handleLinkUpdate}
                className="mt-2"
              />
            </div>
          )}
          <Button
            variant="outline"
            className="bg-white text-[#0074b3] font-bold rounded-xl px-6 py-2 mt-2 shadow hover:bg-blue-100 hover:text-[#005a8c] transition"
            asChild
          >
            <a href={finalLink}>Voir les packs</a>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default EditorialProductCard; 