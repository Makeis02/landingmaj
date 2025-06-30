// Ce fichier sert de modèle pour générer de nouvelles pages produit.
// NE PAS MODIFIER LE NOM DU COMPOSANT ET L'EXPORT - ils sont remplacés automatiquement lors de la génération.

import React from "react";
import { useParams, useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useMemo } from "react";
import { ShoppingCart, Heart, CircleDot, ArrowRight, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCartStore } from "@/stores/useCartStore";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { useEditStore } from "@/stores/useEditStore";
import { EditableText } from "@/components/EditableText";
import { EditableImage } from "@/components/EditableImage";
import { supabase } from "@/integrations/supabase/client";
import FloatingHeader from "@/components/admin/FloatingHeader";
import FloatingWheelButton from "@/components/FloatingWheelButton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { EditableDebugPanel } from "@/components/EditableDebugPanel";
import slugify from 'slugify';
import { fetchCategories } from "@/lib/api/categories";
import { fetchCategoriesForProducts } from "@/lib/api/product-categories";
import { fetchProductBrand, fetchBrands } from "@/lib/api/brands";
import Reviews from "@/pages/Landing/components/Reviews";
import { useImageUpload } from "@/hooks/useImageUpload";
import PromoBadge from "@/components/PromoBadge";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { fetchStripeProducts } from "@/lib/api/stripe";
import SEO from "@/components/SEO"; // Importer le composant SEO

// Types
interface Product {
  id: string;
  title: string;
  description: string;
  brand: string;
  price: number;
  image: string;
  specifications: Array<{ name: string; value: string }>;
  reference: string;
  badges: string[];
  category: string;
  show_logo_eaudouce: string;
  show_logo_eaudemer: string;
  variantStocks?: Record<string, number>;
  stock?: number;
  ddmExceeded?: boolean;
  ddmDate?: string;
  averageRating?: number;
  reviewCount?: number;
}

// Type étendu pour les produits similaires avec les données de variantes
interface SimilarProduct {
  id: string;
  title?: string;
  name?: string;
  price?: number;
  image?: string;
  default_price?: {
    unit_amount: number;
  };
  hasVariant?: boolean;
  variantPriceRange?: {
    min: number;
    max: number;
  };
  categories?: string[]; // Pour le debug
  hasDiscount?: boolean;
  ddmExceeded?: boolean; // <--- Ajout du flag DDM
}

// Ajout du type Variant
interface Variant {
  idx: number;
  label: string;
  options: string[];
  price_map: Record<string, number>;
  discount_map?: Record<string, number>; // Map des prix réduits par option
  reduction_percentage?: number; // Pourcentage de réduction pour toutes les options
}

// Utilitaire de debug
const logDebug = (label: string, data?: any) => {
  if (import.meta.env.DEV) {
    if (data !== undefined) {
      console.debug(`🛠️ ${label}:`, data);
    } else {
      console.debug(`🛠️ ${label}`);
    }
  }
};

// Fonction pour obtenir l'ID du produit depuis les query params
const getProductIdFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  
  if (!productId) {
    logDebug("ID produit manquant dans l'URL");
    return null;
  }
  
  logDebug("ID produit récupéré depuis l'URL", productId);
  return productId;
};

// Get API base URL from environment variables with fallback
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // En production, forcer Render
  if (import.meta.env.PROD) {
    return "https://landingmaj-production.up.railway.app";
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

// Fonction utilitaire pour générer des clés de contenu cohérentes
const generateContentKey = (id: string, field: string) => {
  if (!id || typeof id !== 'string') {
    console.warn("⛔ ID produit invalide ou vide :", id);
    return "product_invalidkey";
  }
  
  return `product_${id}_${field}`;
};

// Component for editable price
const EditablePrice = ({ productId, initialPrice }) => {
  const { isEditMode } = useEditStore();
  const [price, setPrice] = useState(initialPrice);
  const { toast } = useToast();

  const handlePriceUpdate = async (newValue) => {
    try {
      const contentKey = `product_${productId}_price`;
      const { data, error } = await supabase
        .from('editable_content')
        .select('id')
        .eq('content_key', contentKey)
        .single();

      if (data) {
        await supabase
          .from('editable_content')
          .update({ content: newValue })
          .eq('content_key', contentKey);
      } else {
        await supabase
          .from('editable_content')
          .insert({ content_key: contentKey, content: newValue });
      }

      setPrice(newValue);
      toast({
        title: "Prix mis à jour",
        description: "Le prix du produit a été mis à jour avec succès."
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du prix:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le prix. Veuillez réessayer."
      });
    }
  };

  if (!isEditMode) {
    return <span className="text-3xl font-bold mb-6 text-slate-900">{parseFloat(price).toFixed(2)} €</span>;
  }

  return (
    <div className="relative">
      <input
        type="number"
        step="0.01"
        min="0"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        onBlur={() => handlePriceUpdate(price)}
        className="text-3xl font-bold mb-6 text-slate-900 bg-blue-50 border border-blue-200 px-2 py-1 rounded"
      />
      <span className="text-3xl font-bold ml-1">€</span>
    </div>
  );
};

interface EditableTextProps {
  contentKey: string;
  initialContent: string;
  onUpdate: (newText: string) => void;
}

interface EditableImageProps {
  contentKey: string;
  initialUrl: string;
  onUpdate: (newUrl: string) => void;
}

// Composant DebugPanel amélioré
const DebugPanel = ({ product, productId, fetchStatus }) => {
  return (
    <div className="bg-yellow-100 p-4 text-sm rounded-lg border border-yellow-200">
      <h3 className="font-bold mb-2">🛠️ Debug Panel</h3>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div><strong>ID Produit:</strong></div>
          <div className="font-mono bg-yellow-200 px-2 py-1 rounded">{productId || 'non défini'}</div>
          
          <div><strong>ID localStorage:</strong></div>
          <div className="font-mono bg-yellow-200 px-2 py-1 rounded">{localStorage.getItem("last_product_id") || 'non défini'}</div>
          
          <div><strong>Produit trouvé:</strong></div>
          <div className="font-mono bg-yellow-200 px-2 py-1 rounded">{product ? '✅ OUI' : '❌ NON'}</div>
        </div>

        {/* Nouvelle section pour le statut de fetchProducts */}
        {fetchStatus && (
          <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
            <h4 className="font-bold mb-2">📡 Statut de fetchProducts :</h4>
            <div className="space-y-2">
              <div>
                <strong>Status HTTP :</strong>
                <span className={`ml-2 px-2 py-1 rounded ${
                  fetchStatus.status >= 200 && fetchStatus.status < 300 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {fetchStatus.status || 'N/A'}
                </span>
              </div>
              
              <div>
                <strong>Succès :</strong>
                <span className={`ml-2 px-2 py-1 rounded ${
                  fetchStatus.success 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {fetchStatus.success ? '✅ OUI' : '❌ NON'}
                </span>
              </div>
              
              {fetchStatus.error && (
                <div>
                  <strong>Erreur :</strong>
                  <div className="mt-1 font-mono bg-red-50 p-2 rounded text-red-700">
                    {fetchStatus.error}
                  </div>
                </div>
              )}
              
              {fetchStatus.response && (
                <div>
                  <strong>Réponse brute :</strong>
                  <div className="mt-1 font-mono bg-yellow-50 p-2 rounded overflow-x-auto">
                    <pre className="text-xs">
                      {JSON.stringify(fetchStatus.response, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-600">
          <p>🔍 URL actuelle : {window.location.href}</p>
        </div>
      </div>
    </div>
  );
};

// Composant Alert pour les erreurs de correspondance
const ProductNotFoundAlert = ({ productId }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <h3 className="text-red-800 font-bold mb-2">⚠️ Produit non trouvé</h3>
      <p className="text-red-700 mb-2">
        L'ID <code className="bg-red-100 px-1 rounded">{productId}</code> n'a pas été trouvé.
      </p>
    </div>
  );
};

// Composant résumé des avis pour un produit donné
const ProductReviewSummary = ({ productId, className = '' }) => {
  const [average, setAverage] = useState<number | null>(null);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (!productId) return;
    const fetchReviewStats = async () => {
      const { data, error } = await supabase
        .from("customer_reviews")
        .select("rating")
        .eq("product_id", productId);
      if (error || !data) {
        setAverage(null);
        setCount(0);
        return;
      }
      if (data.length === 0) {
        setAverage(null);
        setCount(0);
        return;
      }
      const avg = data.reduce((sum, r) => sum + (r.rating || 0), 0) / data.length;
      setAverage(avg);
      setCount(data.length);
    };
    fetchReviewStats();
  }, [productId]);

  return (
    <div className={`flex items-center text-sm ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`h-5 w-5 ${average && i < Math.round(average) ? 'text-[#0074b3] fill-[#0074b3]' : 'text-gray-200 fill-gray-200'}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-2 text-sm text-gray-500">
        ({count} avis)
      </span>
    </div>
  );
};

// Composant principal
const Modele = ({ categoryParam = null }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [stripeData, setStripeData] = useState<any[]>([]);
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const { addItem } = useCartStore();
  const [activeTab, setActiveTab] = useState("description");
  const [isLoading, setIsLoading] = useState(true);
  const { isEditMode } = useEditStore();
  const { toast } = useToast();
  const [fetchStatus, setFetchStatus] = useState(null);
  const [breadcrumbCategory, setBreadcrumbCategory] = useState(null);
  const [globalLogos, setGlobalLogos] = useState({
    eauDouce: '',
    eauMer: ''
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [optionInputs, setOptionInputs] = useState<string[]>([]);
  const [stripeLogs, setStripeLogs] = useState<string[]>([]);
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [relatedCategory, setRelatedCategory] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [debugSimilar, setDebugSimilar] = useState<any>({});
  const [similarProductImages, setSimilarProductImages] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [brand, setBrand] = useState<{ id: string; name: string } | null>(null);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [productReviewAverage, setProductReviewAverage] = useState<number | null>(null);
  const [productReviewCount, setProductReviewCount] = useState(0);
  const [variantDiscounts, setVariantDiscounts] = useState<Record<string, number>>({}); // Store des prix réduits par variante
  const [variantReductions, setVariantReductions] = useState<Record<number, number>>({}); // Store des pourcentages de réduction par variant idx
  const [productDiscount, setProductDiscount] = useState<number>(0); // Prix réduit du produit principal
  const [productReduction, setProductReduction] = useState<number>(0); // Pourcentage de réduction du produit principal
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const { addItem: addFavoriteItem, removeItem: removeFavoriteItem, isInFavorites } = useFavoritesStore();
  // 🎯 AJOUT : État pour les prix promotionnels des produits similaires
  const [similarProductPromoPrices, setSimilarProductPromoPrices] = useState<Record<string, any>>({});

  // Récupérer l'utilisateur connecté au montage
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  // Vérifier si le produit est en favoris au chargement
  useEffect(() => {
    if (product?.id) {
      setIsFavorite(isInFavorites(product.id));
    }
  }, [product?.id, isInFavorites]);

  // Handler pour ajouter/retirer des favoris
  const handleToggleFavorite = async () => {
    if (!product?.id) return;

    if (isFavorite) {
      await removeFavoriteItem(product.id);
    } else {
      await addFavoriteItem({
        id: product.id,
        title: product.title,
        price: product.price,
        image_url: product.image
      });
    }
    setIsFavorite(!isFavorite);
  };

  // Calcul dynamique du prix selon la variante sélectionnée
  const computedPrice = useMemo(() => {
    if (!product) return 0;
    
    // Si pas de variantes, utiliser le prix du produit principal avec réduction
    if (!variants || variants.length === 0) {
      // 🎯 CORRECTION : Calculer le prix réduit dynamiquement à partir du pourcentage
      if (productReduction > 0) {
        return product.price * (1 - productReduction / 100);
      }
      return product?.price ?? 0;
    }
    
    // Si variantes existent, utiliser la logique des variantes
    const selectedKeys = Object.entries(selectedVariants)
      .map(([label, value]) => `${label}:${value}`)
      .join('|');
    
    for (const variant of variants) {
      if (variant.price_map && typeof variant.price_map === 'object') {
        // Vérifier d'abord s'il y a un prix réduit
        const discountPrice = variant.discount_map?.[selectedKeys];
        if (discountPrice !== undefined && !isNaN(Number(discountPrice))) {
          return Number(discountPrice);
        }
        
        // Sinon utiliser le prix normal
        const price = variant.price_map[selectedKeys];
        if (price !== undefined && !isNaN(Number(price))) {
          return Number(price);
        }
      }
    }
    return product.price;
  }, [product, variants, selectedVariants, productReduction]); // 🎯 CORRECTION : Utiliser productReduction au lieu de productDiscount

  // Calcul du prix original (avant réduction) pour l'affichage
  const originalPrice = useMemo(() => {
    if (!product) return 0;
    
    // Si pas de variantes, retourner le prix du produit principal
    if (!variants || variants.length === 0) {
      return product?.price ?? 0;
    }
    
    // Si variantes existent, utiliser la logique des variantes
    const selectedKeys = Object.entries(selectedVariants)
      .map(([label, value]) => `${label}:${value}`)
      .join('|');
    
    for (const variant of variants) {
      if (variant.price_map && typeof variant.price_map === 'object') {
        const price = variant.price_map[selectedKeys];
        if (price !== undefined && !isNaN(Number(price))) {
          return Number(price);
        }
      }
    }
    return product.price;
  }, [product, variants, selectedVariants]);

  // Vérifier s'il y a une réduction active
  const hasDiscount = computedPrice < originalPrice;

  // Initialise les variantes sélectionnées par défaut après chargement du produit
  useEffect(() => {
    if (!variants || variants.length === 0) return;
    const defaults: Record<string, string> = {};
    for (const variant of variants) {
      if (variant.label && variant.options?.length > 0) {
        defaults[variant.label] = variant.options[0];
      }
    }
    setSelectedVariants(defaults);
  }, [variants]);

  // Log au montage du composant
  useEffect(() => {
    if (isEditMode) {
      console.group("🛠️ DEBUG PRODUIT");
      logDebug("Composant monté", { id, categoryParam });
      logDebug("URL actuelle", window.location.href);
    }
  }, []);

  // Fonction pour récupérer les produits depuis Stripe
  const fetchProducts = async () => {
    try {
      logDebug("Appel de fetchStripeProducts");
      const products = await fetchStripeProducts();
      
      const status = {
        status: 200,
        success: true,
        error: null,
        response: { products }
      };
      
      setFetchStatus(status);
      logDebug("Produits récupérés", {
        count: products?.length || 0,
        ids: products?.map(p => p.id)
      });
      
      setStripeData(products);
      return products;
    } catch (error) {
      const status = {
        status: null,
        success: false,
        error: error.message,
        response: null
      };
      setFetchStatus(status);
      logDebug("Erreur fetchStripeProducts", error);
      throw error;
    }
  };

  // Récupérer le contenu éditable depuis Supabase
  const fetchEditableContent = async (productId: string, productData: any) => {
    try {
      logDebug("Recherche du contenu éditable", productId);
      
      const searchKey = `product_${productId}_%`;
      logDebug("Clé de recherche Supabase", searchKey);
      
      const { data, error } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .like('content_key', searchKey);

      if (error) {
        logDebug("❌ Erreur Supabase", error);
        return productData;
      }

      logDebug("Contenu Supabase récupéré", {
        keys: data.map(item => item.content_key),
        count: data.length
      });
      
      const updatedProduct = { ...productData };
      updatedProduct.variantStocks = {};

      // 1. D'abord charger les variantes
      const variantLabelRegex = new RegExp(`^product_${productId}_variant_(\\d+)_label$`);
      const variantOptionsRegex = new RegExp(`^product_${productId}_variant_(\\d+)_options$`);
      const variantPriceMapRegex = new RegExp(`^product_${productId}_variant_(\\d+)_price_map$`);
      const variantIdxRegex = new RegExp(`^product_${productId}_variant_(\\d+)_idx$`);
      const variantReductionRegex = new RegExp(`^product_${productId}_variant_(\\d+)_reduction_percentage$`);
      const variantDiscountPriceRegex = new RegExp(`^product_${productId}_variant_(\\d+)_option_(.+)_discount_price$`);
      const variantOptionDiscountPercentageRegex = new RegExp(`^product_${productId}_variant_(\\d+)_option_(.+)_discount_percentage$`);
      const variantMap: Record<number, Variant> = {};
      
      // Store temporaire pour les réductions et prix discount
      const reductionsTemp: Record<number, number> = {};
      const discountsTemp: Record<string, number> = {};
      const optionReductionsTemp: Record<string, number> = {};
      
      // Première passe : charger les variantes
      data.forEach(item => {
        let match = item.content_key.match(variantLabelRegex);
        if (match) {
          const idx = parseInt(match[1]);
          if (!variantMap[idx]) variantMap[idx] = { idx, label: '', options: [], price_map: {} };
          variantMap[idx].label = item.content;
        }
        match = item.content_key.match(variantOptionsRegex);
        if (match) {
          const idx = parseInt(match[1]);
          if (!variantMap[idx]) variantMap[idx] = { idx, label: '', options: [], price_map: {} };
          variantMap[idx].options = (item.content || '').split('/').map(o => o.trim()).filter(Boolean);
        }
        match = item.content_key.match(variantPriceMapRegex);
        if (match) {
          const idx = parseInt(match[1]);
          if (!variantMap[idx]) variantMap[idx] = { idx, label: '', options: [], price_map: {} };
          try {
            variantMap[idx].price_map = item.content ? JSON.parse(item.content) : {};
          } catch {
            variantMap[idx].price_map = {};
          }
        }
        match = item.content_key.match(variantIdxRegex);
        if (match) {
          const idx = parseInt(match[1]);
          if (!variantMap[idx]) variantMap[idx] = { idx, label: '', options: [], price_map: {} };
          variantMap[idx].idx = parseInt(item.content);
        }
        match = item.content_key.match(variantReductionRegex);
        if (match) {
          const idx = parseInt(match[1]);
          if (!variantMap[idx]) variantMap[idx] = { idx, label: '', options: [], price_map: {} };
          reductionsTemp[idx] = Number(item.content);
        }
        match = item.content_key.match(variantDiscountPriceRegex);
        if (match) {
          const [_, idx, opt] = match;
          if (!variantMap[idx]) variantMap[idx] = { idx, label: '', options: [], price_map: {} };
          discountsTemp[`${idx}:${opt}`] = Number(item.content);
        }
        match = item.content_key.match(variantOptionDiscountPercentageRegex);
        if (match) {
          const [_, idx, opt] = match;
          if (!variantMap[idx]) variantMap[idx] = { idx, label: '', options: [], price_map: {} };
          optionReductionsTemp[`${idx}:${opt}`] = Number(item.content);
        }
      });

      const loadedVariants = Object.values(variantMap)
        .map((v, i) => {
          if (typeof v.idx !== 'number' || isNaN(v.idx)) {
            console.log('⚠️ Variant sans idx, utilisation de l\'index:', i);
            v.idx = i;
          }
          
          // Ajouter les données de réduction
          v.reduction_percentage = reductionsTemp[v.idx] || 0;
          v.discount_map = {};
          
          // Construire la discount_map avec les combinaisons de prix
          Object.keys(v.price_map).forEach(comboKey => {
            // Chercher les prix discount stockés individuellement
            const comboKeys = comboKey.split('|');
            for (const ck of comboKeys) {
              const [label, option] = ck.split(':');
              const discountKey = `${v.idx}:${option}`;
              if (discountsTemp[discountKey]) {
                v.discount_map![comboKey] = discountsTemp[discountKey];
                break;
              }
            }
          });
          
          return v;
        })
        .sort((a, b) => a.idx - b.idx);

      console.log('🔄 Variants chargées:', loadedVariants);
      setVariants(loadedVariants);
      
      // Mettre à jour les états des réductions - NOUVELLES réductions individuelles par option
      setVariantReductions(optionReductionsTemp);
      
      // Construire le store des prix discount pour l'affichage
      const discountStore: Record<string, number> = {};
      Object.entries(discountsTemp).forEach(([key, price]) => {
        const [idx, option] = key.split(':');
        const variant = variantMap[parseInt(idx)];
        if (variant && variant.label) {
          const comboKey = `${variant.label}:${option}`;
          discountStore[comboKey] = price;
        }
      });
      setVariantDiscounts(discountStore);

      // 2. Ensuite charger les stocks avec les labels corrects
      data.forEach(item => {
        if (!item.content_key.startsWith(`product_${productId}_`)) {
          logDebug("⚠️ Clé inattendue ignorée", item.content_key);
          return;
        }
        
        const field = item.content_key.replace(`product_${productId}_`, '');
        logDebug(`Mise à jour du champ ${field}`, item.content);
        
        if (field === 'description') {
          updatedProduct.description = item.content;
        } else if (field === 'title') {
          updatedProduct.title = item.content;
        } else if (field === 'stock') {
          updatedProduct.stock = Number(item.content);
        } else if (field.startsWith('specification_')) {
          const specIndex = parseInt(field.split('_')[1]);
          if (!isNaN(specIndex)) {
            if (!updatedProduct.specifications[specIndex]) {
              updatedProduct.specifications[specIndex] = { name: '', value: '' };
            }
            const specField = field.split('_')[2];
            updatedProduct.specifications[specIndex][specField] = item.content;
          }
        } else if (field.startsWith('variant_')) {
          const variantStockMatch = field.match(/^variant_(\d+)_option_(.+)_stock$/);
          if (variantStockMatch) {
            const [_, idx, val] = variantStockMatch;
            // Utiliser variantMap pour obtenir le label correct
            const variant = variantMap[parseInt(idx)];
            if (variant && variant.label) {
              const comboKey = `${variant.label}:${val}`;
              updatedProduct.variantStocks[comboKey] = Number(item.content);
              console.log("[fetchEditableContent] Stock variant injecté:", comboKey, Number(item.content));
            }
          }
        }
        if (field.toLowerCase() === 'show_logo_eaudouce') {
          updatedProduct.show_logo_eaudouce = String(item.content);
        }
        if (field.toLowerCase() === 'show_logo_eaudemer') {
          updatedProduct.show_logo_eaudemer = String(item.content);
        }
        // Charger les données de réduction du produit principal
        if (field === 'discount_percentage') {
          const percentage = Number(item.content);
          setProductReduction(percentage);
        }
        if (field === 'discount_price') {
          const discountPrice = Number(item.content);
          setProductDiscount(discountPrice);
        }
        if (field === 'ddm_exceeded') {
          updatedProduct.ddmExceeded = (item.content === 'true');
        }
        if (field === 'ddm_date') {
          updatedProduct.ddmDate = item.content;
        }
      });

      // Charger les images supplémentaires
      const imageKeys = data
        .filter(i => i.content_key.match(new RegExp(`^product_${productId}_image_\\d+$`)))
        .sort((a, b) => {
          const aIndex = parseInt(a.content_key.split("_").pop() || "0");
          const bIndex = parseInt(b.content_key.split("_").pop() || "0");
          return aIndex - bIndex;
        });

      const urls = imageKeys.map(i => i.content);
      setExtraImages(urls);

      updatedProduct.show_logo_eaudouce = String(updatedProduct.show_logo_eaudouce);
      updatedProduct.show_logo_eaudemer = String(updatedProduct.show_logo_eaudemer);

      console.log('🟢 [FETCH EDITABLE] Clés récupérées :', data?.map(item => item.content_key));
      console.log('🟢 [FETCH EDITABLE] updatedProduct final :', updatedProduct);
      console.log('🟢 [FETCH EDITABLE] variantStocks :', updatedProduct.variantStocks);
      
      return updatedProduct as Product;
    } catch (error) {
      console.error("❌ Erreur lors de la récupération du contenu éditable:", error);
      return productData;
    }
  };

  // Fonction pour s'assurer que le prix de base existe
  const ensureBasePriceId = async (productId: string, price: number) => {
    try {
      // Vérifier si le prix de base existe déjà
      const { data: existingPriceData } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', `product_${productId}_stripe_price_id`)
        .single();

      if (existingPriceData?.content) {
        console.log(`✅ Prix de base déjà existant: ${existingPriceData.content}`);
        return existingPriceData.content;
      }

      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.error("❌ Aucun token utilisateur trouvé.");
        return null;
      }

      // Créer le prix de base dans Stripe
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stripe-variant`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          stripeProductId: productId,
          label: "main",
          option: "default",
          price: price,
          isDiscount: false
        })
      });

      const data = await res.json();
      if (data?.logs) {
        setStripeLogs(prev => [...prev, ...data.logs]);
      }

      if (data && data.priceId) {
        // Sauvegarder le nouveau priceId Stripe
        await supabase.from('editable_content').upsert({
          content_key: `product_${productId}_stripe_price_id`,
          content: data.priceId
        }, { onConflict: 'content_key' });

        console.log(`✅ Nouveau prix de base créé: ${data.priceId}`);
        return data.priceId;
      }

      return null;
    } catch (err) {
      console.error('Erreur lors de la création du prix de base:', err);
      return null;
    }
  };

  // Charger les données du produit
  useEffect(() => {
    const loadProduct = async () => {
      if (isEditMode) console.group("🛠️ DEBUG PRODUIT");
      logDebug("Chargement du produit lancé");
      setIsLoading(true);
      try {
        const productId = getProductIdFromQuery();
        logDebug("ID produit détecté", productId);
        if (!productId) {
          logDebug("Aucun ID valide trouvé");
          toast({
            variant: "destructive",
            title: "Produit introuvable",
            description: "Aucun ID de produit valide trouvé dans l'URL.",
          });
          setIsLoading(false);
          setProduct(null);
          return;
        }
        localStorage.setItem("last_product_id", productId);
        logDebug("ID sauvegardé dans localStorage", productId);

        // --- NOUVEAU : Paralléliser le fetch Stripe et le fetch editable_content ---
        // 1. On lance le fetch Stripe (produits) et le fetch editable_content en même temps
        // 2. On attend les deux, puis on fusionne les données
        // 3. On affiche le bloc principal dès que possible

        // Lancer le fetch Stripe en parallèle
        const stripePromise = fetchProducts();
        // On ne peut pas lancer fetchEditableContent sans le produit, donc on attend Stripe, mais on prépare la suite
        const stripeData = await stripePromise;
        // Recherche du produit par ID
        const realProduct = stripeData.find(p => String(p.id) === String(productId));
        logDebug("Recherche du produit", {
          productId,
          found: !!realProduct,
          product: realProduct
        });
        if (!realProduct) {
          logDebug("Produit non trouvé");
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Le produit n'a pas été trouvé."
          });
          setProduct(null);
          setIsLoading(false);
          return;
        }
        const productData = {
          ...realProduct,
          id: productId,
          specifications: [],
          badges: [],
        };
        logDebug("Données produit préparées", productData);

        // Lancer le fetch editable_content en parallèle avec ensureBasePriceId
        const editablePromise = fetchEditableContent(productData.id, productData);
        // On attend le contenu éditable
        const updated = await editablePromise;
        // S'assurer que le prix de base existe (en parallèle)
        if (updated.price) {
          ensureBasePriceId(productData.id, updated.price); // on ne bloque pas l'affichage sur cette étape
        }
        setProduct(updated);
        setIsLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement du produit:", error);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger le produit."
        });
        setIsLoading(false);
      }
    };
    loadProduct();
  }, [location.search, toast, isEditMode]);

  // Charger les catégories pour le fil d'Ariane
  useEffect(() => {
    if (!product) return;

    const loadBreadcrumbFromLinkedCategories = async () => {
      console.log("[DEBUG] 🔗 Récupération des catégories liées via Supabase...");

      const [allCategories, productCategories] = await Promise.all([
        fetchCategories(),
        fetchCategoriesForProducts([product.id])
      ]);

      const categoryIds = productCategories[product.id] || [];

      if (categoryIds.length === 0) {
        console.warn("[DEBUG] ❌ Aucun lien de catégorie trouvé pour ce produit.");
        return;
      }

      const linkedCats = allCategories.filter(cat => categoryIds.includes(cat.id));

      // Calculer la profondeur hiérarchique
      const getDepth = (cat) => {
        let d = 1;
        let current = cat;
        while (current.parent_id) {
          current = allCategories.find(c => c.id === current.parent_id);
          if (!current) break;
          d++;
        }
        return d;
      };

      // Prendre la plus profonde
      const sortedByDepth = linkedCats
        .map(cat => ({ cat, depth: getDepth(cat) }))
        .sort((a, b) => b.depth - a.depth);

      const current = sortedByDepth[0]?.cat;
      const parent = current && allCategories.find(c => c.id === current.parent_id);
      const grandParent = parent && allCategories.find(c => c.id === parent.parent_id);

      console.log("[DEBUG] ✅ Fil d'Ariane généré :");
      console.log("  - Catégorie :", current?.name);
      console.log("  - Parent :", parent?.name);
      console.log("  - Grand-parent :", grandParent?.name);

      setBreadcrumbCategory({ current, parent, grandParent });
    };

    loadBreadcrumbFromLinkedCategories();
  }, [product]);

  // Chargement de la catégorie liée depuis Supabase
  useEffect(() => {
    if (!product) return;
    const fetchRelatedCategory = async () => {
      const { data } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', `product_${product.id}_related_category`)
        .single();
      if (data?.content) {
        setRelatedCategory(data.content.trim());
        if (import.meta.env.DEV) console.log('[MODELE] relatedCategory from Supabase:', data.content.trim());
      } else if (breadcrumbCategory?.parent?.id) {
        setRelatedCategory(breadcrumbCategory.parent.id);
        if (import.meta.env.DEV) console.log('[MODELE] relatedCategory fallback to parent.id:', breadcrumbCategory.parent.id);
      }
    };
    fetchRelatedCategory();
  }, [product, breadcrumbCategory]);

  // Charger toutes les catégories pour le menu (si ce n'est pas déjà fait)
  useEffect(() => {
    const loadCats = async () => {
      const cats = await fetchCategories();
      setAllCategories(cats);
    };
    loadCats();
  }, []);

  // Charger les marques et la marque du produit
  useEffect(() => {
    const loadBrands = async () => {
      if (!product?.id) return;
      
      try {
        setBrandsLoading(true);
        setBrandsError(null);
        
        // Charger toutes les marques
        const allBrands = await fetchBrands();
        setBrands(allBrands);
        
        // Charger la marque du produit
        const brandId = await fetchProductBrand(product.id);
        if (brandId) {
          const productBrand = allBrands.find(b => b.id === brandId);
          if (productBrand) {
            setBrand(productBrand);
          }
        }
      } catch (err) {
        console.error("Erreur lors du chargement des marques:", err);
        setBrandsError("Impossible de charger les marques.");
      } finally {
        setBrandsLoading(false);
      }
    };

    loadBrands();
  }, [product?.id]);

  // Ajouter l'effet pour calculer la moyenne des avis
  useEffect(() => {
    if (!product?.id) return;

    const fetchReviewStats = async () => {
      const { data, error } = await supabase
        .from("customer_reviews")
        .select("rating")
        .eq("product_id", product.id);

      if (error) {
        console.error("Erreur chargement avis:", error);
        return;
      }

      if (data.length === 0) {
        setProductReviewAverage(null);
        setProductReviewCount(0);
        return;
      }

      const avg = data.reduce((sum, r) => sum + (r.rating || 0), 0) / data.length;
      setProductReviewAverage(avg);
      setProductReviewCount(data.length);
    };

    fetchReviewStats();
  }, [product?.id]);

  // Récupération automatique des stripe_price_id pour produits sans variantes
  useEffect(() => {
    const fetchStripeDefaultPrice = async () => {
      if (!product || variants.length > 0) return;
      
      console.log("🔍 [MODELE DEBUG] Vérification stripe_price_id pour produit sans variantes:", product.id);
      
      // 1. Vérifier d'abord si le prix existe déjà dans editable_content
      const priceKey = `product_${product.id}_stripe_price_id`;
      const { data: existingPriceData } = await supabase
        .from("editable_content")
        .select("content")
        .eq("content_key", priceKey)
        .single();

      if (existingPriceData?.content) {
        console.log("✅ [MODELE DEBUG] Price ID déjà présent dans editable_content:", existingPriceData.content);
        return;
      }

      console.log("⚠️ [MODELE DEBUG] Aucun stripe_price_id trouvé, récupération depuis Stripe...");
      
      try {
        // Récupérer le token d'authentification
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          console.error("❌ [MODELE DEBUG] Token d'authentification manquant");
          return;
        }

        // 2. Appeler l'edge function pour récupérer les prix depuis Stripe
        console.log("🔄 [MODELE DEBUG] Appel de get-stripe-prices...");
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-stripe-prices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            stripeProductId: product.id,
          }),
        });

        const result = await response.json();
        console.log("📦 [MODELE DEBUG] Réponse get-stripe-prices:", result);

        if (!response.ok) {
          console.error("❌ [MODELE DEBUG] Erreur get-stripe-prices:", result.error);
          
          // 3. Fallback : essayer sync-stripe-variant avec des valeurs par défaut
          console.log("🔄 [MODELE DEBUG] Fallback vers sync-stripe-variant...");
          const fallbackResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stripe-variant`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              stripeProductId: product.id,
              label: 'default',
              option: 'standard',
              price: product.price,
              isDiscount: false
            }),
          });

          const fallbackResult = await fallbackResponse.json();
          console.log("📦 [MODELE DEBUG] Réponse sync-stripe-variant:", fallbackResult);

          if (fallbackResponse.ok && fallbackResult.success) {
            // Enregistrer le price_id dans editable_content
            await supabase.from('editable_content').insert({
              content_key: priceKey,
              content: fallbackResult.priceId
            });
            console.log("✅ [MODELE DEBUG] Price ID enregistré via fallback:", fallbackResult.priceId);
          } else {
            console.error("❌ [MODELE DEBUG] Échec du fallback:", fallbackResult.error);
          }
          return;
        }

        if (result.success && result.prices?.length > 0) {
          // 4. Logique de sélection intelligente : promo > normal > fallback
          console.log("🎯 [MODELE DEBUG] === SÉLECTION INTELLIGENTE DU PRIX ===");
          console.log("📋 [MODELE DEBUG] Prix disponibles:", result.prices.map(p => ({
            id: p.id,
            active: p.active,
            is_discount: p.metadata?.is_discount,
            amount: p.unit_amount,
            lookup_key: p.lookup_key
          })));

          // Recherche prioritaire : Prix promo actif d'abord !
          const promoPrice = result.prices.find(p => 
            p.active && p.metadata?.is_discount === 'true'
          );
          
          // Prix normal (non promo)
          const basePrice = result.prices.find(p => 
            p.active && p.metadata?.is_discount !== 'true'
          );
          
          // Fallback : n'importe quel prix actif
          const fallbackPrice = result.prices.find(p => p.active) || result.prices[0];

          // Sélection finale : PROMO en priorité !
          const selectedPrice = promoPrice || basePrice || fallbackPrice;

          console.log("🔍 [MODELE DEBUG] Analyse des prix:");
          console.log("  🎉 Prix promo trouvé:", promoPrice ? `${promoPrice.id} (${promoPrice.unit_amount/100}€)` : "❌ Aucun");
          console.log("  💰 Prix normal trouvé:", basePrice ? `${basePrice.id} (${basePrice.unit_amount/100}€)` : "❌ Aucun");
          console.log("  🔄 Fallback trouvé:", fallbackPrice ? `${fallbackPrice.id} (${fallbackPrice.unit_amount/100}€)` : "❌ Aucun");
          console.log("  🎯 Prix SÉLECTIONNÉ:", selectedPrice ? `${selectedPrice.id} (${selectedPrice.unit_amount/100}€) - ${selectedPrice.metadata?.is_discount === 'true' ? 'PROMO 🎉' : 'NORMAL 💰'}` : "❌ Aucun");

          if (!selectedPrice) {
            console.warn("⚠️ [MODELE DEBUG] Aucun prix actif trouvé pour le produit", product.id);
            return;
          }

          // 5. Déterminer la clé selon le type de prix sélectionné
          let targetKey;
          let priceType;
          
          if (selectedPrice.metadata?.is_discount === 'true') {
            // Prix promo sélectionné
            targetKey = `product_${product.id}_stripe_discount_price_id`;
            priceType = "PROMOTIONNEL";
            
            // S'assurer que le pourcentage de réduction existe dans editable_content
            const { data: discountPercentageData } = await supabase
              .from('editable_content')
              .select('content')
              .eq('content_key', `product_${product.id}_discount_percentage`)
              .single();
            
            if (!discountPercentageData?.content) {
              console.log("ℹ️ [MODELE DEBUG] Pas de pourcentage de réduction trouvé, prix promo ignoré");
              // Si pas de pourcentage de réduction défini, utiliser le prix normal
              const normalPrice = basePrice || fallbackPrice;
              if (normalPrice) {
                targetKey = priceKey; // product_{ID}_stripe_price_id
                priceType = "NORMAL (promo sans %)";
                await supabase.from('editable_content').insert({
                  content_key: targetKey,
                  content: normalPrice.id
                });
                console.log("✅ [MODELE DEBUG] Prix normal enregistré (promo sans %):", normalPrice.id);
                return;
              }
            } else {
              console.log("✅ [MODELE DEBUG] Pourcentage de réduction trouvé:", discountPercentageData.content + "%");
            }
          } else {
            // Prix normal sélectionné
            targetKey = priceKey; // product_{ID}_stripe_price_id
            priceType = "NORMAL";
          }

          // 6. Enregistrer dans editable_content
          try {
            await supabase.from('editable_content').insert({
              content_key: targetKey,
              content: selectedPrice.id
            });
            console.log(`✅ [MODELE DEBUG] Prix ${priceType} enregistré dans editable_content:`, selectedPrice.id);
            console.log(`📋 [MODELE DEBUG] Clé utilisée: ${targetKey}`);
            console.log("🎉 [MODELE DEBUG] === SÉLECTION TERMINÉE AVEC SUCCÈS ===");
          } catch (insertError) {
            console.error("❌ [MODELE DEBUG] Erreur lors de l'insertion:", insertError);
          }
        } else {
          console.warn("⚠️ [MODELE DEBUG] Aucun prix retourné par get-stripe-prices");
        }
      } catch (error) {
        console.error("❌ [MODELE DEBUG] Erreur lors de la récupération automatique:", error);
      }
    };

    fetchStripeDefaultPrice();
  }, [product, variants]);

  // Fonction utilitaire pour afficher la hiérarchie complète
  function getCategoryPath(cat, cats) {
    let path = [cat.name];
    let parent = cats.find(c => c.id === cat.parent_id);
    while (parent) {
      path.unshift(parent.name);
      parent = cats.find(c => c.id === parent.parent_id);
    }
    return path.join(' > ');
  }

  // Fonction utilitaire pour récupérer récursivement tous les IDs de sous-catégories
  function getAllSubCategoryIds(categoryId, cats) {
    const result = [categoryId];
    const children = cats.filter(cat => cat.parent_id === categoryId);
    for (const child of children) {
      result.push(...getAllSubCategoryIds(child.id, cats));
    }
    return result;
  }

  // Fonction utilitaire pour nettoyer les IDs de produit (supporte shopify_ et gid://shopify/Product/)
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

  // Fonction pour enrichir les produits similaires avec variantPriceRange
  const enrichSimilarProducts = async (products: any[]): Promise<SimilarProduct[]> => {
    if (!products || products.length === 0) return [];
    
    try {
      console.log(`🔍 [SIMILAR-PROMO] Enrichissement de ${products.length} produits similaires`);
      
      const productIds = products.map(p => p.id);
      // Utiliser getCleanProductId pour la cohérence
      const cleanIds = productIds.map(id => getCleanProductId(id?.toString() || ""));
      
      console.log(`🔍 [SIMILAR-PROMO] IDs originaux:`, productIds);
      console.log(`🔍 [SIMILAR-PROMO] IDs nettoyés:`, cleanIds);
      
      // Récupérer les price_maps des variantes pour tous les produits similaires
      // Générer plusieurs clés de variantes pour chaque produit (variant_0, variant_1, etc.)
      const priceKeys = [];
      cleanIds.forEach(id => {
        for (let i = 0; i < 3; i++) { // Chercher jusqu'à 3 variantes par produit
          priceKeys.push(`product_${id}_variant_${i}_price_map`);
        }
      });
      
      const { data: priceData, error: priceMapError } = await supabase
        .from("editable_content")
        .select("content_key, content")
        .in("content_key", priceKeys);

      console.log(`💰 [SIMILAR-PROMO] Price maps trouvées:`, priceData?.length || 0);

      // Rechercher TOUTES les réductions avec une requête plus large
      const { data: discountData, error: discountError } = await supabase
        .from("editable_content")
        .select("content_key, content")
        .like("content_key", "%discount_percentage")
        .not("content", "is", null)
        .neq("content", "0");

      console.log(`🎯 [SIMILAR-PROMO] Données de réduction trouvées:`, discountData?.length || 0);

      // Traiter les price_maps pour créer le priceMap
      const priceMap = {};
      if (!priceMapError && priceData) {
        priceData.forEach(({ content_key, content }) => {
          // Extraire l'ID du produit de la clé (ex: product_123_variant_0_price_map -> 123)
          const match = content_key.match(/^product_(.+?)_variant_\d+_price_map$/);
          if (match && match[1]) {
            const id = match[1];
          try {
            const parsed = JSON.parse(content);
            const prices = Object.values(parsed).map(v => parseFloat(String(v)));
            if (prices.length > 0) {
                // Si le produit a déjà des prix, on étend la fourchette
                if (priceMap[id]) {
                  const newMin = Math.min(priceMap[id].min, ...prices);
                  const newMax = Math.max(priceMap[id].max, ...prices);
                  priceMap[id] = { min: newMin, max: newMax };
                } else {
              const min = Math.min(...prices);
              const max = Math.max(...prices);
              priceMap[id] = { min, max };
                }
                console.log(`💰 [SIMILAR-PROMO] Prix pour ${id}: ${priceMap[id].min} - ${priceMap[id].max} €`);
            }
          } catch (e) {
              console.warn(`❌ [SIMILAR-PROMO] Erreur parsing price_map pour ${id}:`, e);
            }
          }
        });
      }

      // Calculer hasDiscount pour chaque produit
      const discountMap = {};
      if (!discountError && discountData) {
        for (const item of discountData) {
          // Détecter les réductions sur les variantes
          const variantMatch = item.content_key.match(/^product_(.+?)_variant_\d+_option_[^_]+_discount_percentage$/);
          if (variantMatch && variantMatch[1]) {
            const productId = variantMatch[1];
            const discountValue = parseFloat(item.content);
            
            if (!isNaN(discountValue) && discountValue > 0) {
              discountMap[productId] = true;
              console.log(`✅ [SIMILAR-PROMO] Produit ${productId} avec réduction variante: ${discountValue}%`);
            }
          }

          // Détecter les réductions globales
          const globalMatch = item.content_key.match(/^product_(.+?)_discount_percentage$/);
          if (globalMatch && globalMatch[1]) {
            const productId = globalMatch[1];
            const discountValue = parseFloat(item.content);
            
            if (!isNaN(discountValue) && discountValue > 0) {
              discountMap[productId] = true;
              console.log(`✅ [SIMILAR-PROMO] Produit ${productId} avec réduction globale: ${discountValue}%`);
            }
          }
        }
      }

      console.log(`🗂️ [SIMILAR-PROMO] discountMap final:`, discountMap);

      // Enrichir les produits avec les données de prix et réductions
      const enrichedProducts = products.map(product => {
        const cleanId = getCleanProductId(product.id?.toString() || "");
        const variantPriceRange = priceMap[cleanId];
        const hasDiscount = discountMap[cleanId] === true;
        
        console.log(`[SIMILAR-CHECK] Produit ${product.id} (clean: ${cleanId})`);
        console.log(`[SIMILAR-CHECK] - variantPriceRange:`, variantPriceRange);
        console.log(`[SIMILAR-CHECK] - hasDiscount: ${hasDiscount}`);
        console.log(`[SIMILAR-CHECK] - hasVariant: ${variantPriceRange && variantPriceRange.min !== variantPriceRange.max}`);
        
        return {
          ...product,
          hasVariant: variantPriceRange && variantPriceRange.min !== variantPriceRange.max,
          variantPriceRange,
          hasDiscount
        } as SimilarProduct;
      });

      console.log(`🎉 [SIMILAR-PROMO] Résumé enrichissement:`);
      console.log(`  - ${enrichedProducts.filter(p => p.hasVariant).length}/${enrichedProducts.length} avec variantes`);
      console.log(`  - ${enrichedProducts.filter(p => p.hasDiscount).length}/${enrichedProducts.length} en promo`);
      
      return enrichedProducts;
    } catch (error) {
      console.error("❌ [SIMILAR-PROMO] Erreur lors de l'enrichissement:", error);
      return products; // Retourner les produits non enrichis en cas d'erreur
    }
  };

  // Modifie le useEffect pour charger les produits similaires avec la catégorie liée ET ses sous-catégories
  useEffect(() => {
    if (!product) return;
    if (!relatedCategory && !breadcrumbCategory?.parent?.id) return;
    
    const loadSimilarProducts = async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        // Remplacement du fetch+json par bloc debug
        let data;
        try {
          const base = getApiBaseUrl().replace(/\/+$/, ''); // supprime les barres finales
          const response = await fetch(`${base}/api/stripe/products`);

          // 🔍 Log de l'URL utilisée
          console.log("🔗 [DEBUG] API URL utilisée:", `${base}/api/stripe/products`);

          // 🔍 Lire le contenu brut
          const text = await response.text();
          console.log("📦 [DEBUG] Réponse brute reçue:", text.slice(0, 200)); // affiche seulement les 200 premiers caractères

          // 🔄 Tente de parser
          data = JSON.parse(text);
        } catch (error) {
          console.error("❌ Erreur parsing JSON pour produits similaires:", error);
          setDebugSimilar({ error: error.message });
          return;
        }
        const productIds = data.products.map(p => p.id);
        const categoriesByProduct = await fetchCategoriesForProducts(productIds);
        const refCategoryId = relatedCategory || breadcrumbCategory?.parent?.id;
        // Récupère tous les IDs de sous-catégories (récursif)
        const allRelevantCategoryIds = getAllSubCategoryIds(refCategoryId, allCategories).map(String);
        // Filtre les produits qui ont au moins un de ces IDs dans leur tableau de catégories
        const filtered = data.products.filter(p => {
          if (p.id === product.id) return false;
          const productCategories = (categoriesByProduct[p.id] || []).map(String);
          return productCategories.some(catId => allRelevantCategoryIds.includes(catId));
        });

        // === AJOUT : Récupérer les flags DDM pour les produits similaires ===
        const ddmKeys = filtered.map(p => `product_${p.id}_ddm_exceeded`);
        let ddmFlags = {};
        if (ddmKeys.length > 0) {
          const { data: ddmData } = await supabase
            .from('editable_content')
            .select('content_key, content')
            .in('content_key', ddmKeys);
          if (ddmData) {
            ddmFlags = Object.fromEntries(
              ddmData.map(item => [item.content_key.replace(/^product_|_ddm_exceeded$/g, ''), item.content === 'true'])
            );
          }
        }

        // Enrichir les produits similaires avec variantPriceRange
        const enrichedProducts = await enrichSimilarProducts(filtered.slice(0, 4));
        // Injecter le flag DDM dans chaque produit similaire
        const enrichedWithDdm = enrichedProducts.map(p => ({
          ...p,
          ddmExceeded: ddmFlags[p.id] || false
        }));
        setSimilarProducts(enrichedWithDdm);
        
        setDebugSimilar({
          relatedCategory,
          refCategoryId,
          allRelevantCategoryIds,
          categoriesByProduct,
          filteredProducts: filtered.map(p => ({id: p.id, title: p.title || p.name, categories: categoriesByProduct[p.id]})),
          allProducts: data.products.map(p => ({id: p.id, title: p.title || p.name, categories: categoriesByProduct[p.id]})),
        });
      } catch (error) {
        console.error("Erreur lors du chargement des produits similaires:", error);
        setDebugSimilar({ error: error.message });
        setSimilarProducts([]);
      }
    };
    loadSimilarProducts();
  }, [product, relatedCategory, breadcrumbCategory?.parent?.id, allCategories]);

  useEffect(() => {
    if (!similarProducts.length) return;
    const fetchImages = async () => {
      const keys = similarProducts.map(p => `product_${p.id}_image_0`);
      const { data, error } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .in('content_key', keys);
      if (error) return;
      const imgMap = {};
      data.forEach(item => {
        const id = item.content_key.replace(/^product_/, '').replace(/_image_0$/, '');
        imgMap[id] = item.content;
      });
      setSimilarProductImages(imgMap);
    };
    fetchImages();
    
    // 🎯 AJOUT : Charger les prix promotionnels pour les produits similaires sans variante
    const fetchPromoPrices = async () => {
      const { getDiscountedPrice } = useCartStore.getState();
      const promos: Record<string, any> = {};
      
      for (const prod of similarProducts) {
        if (!prod.hasVariant) {
          try {
            const promo = await getDiscountedPrice(prod.id);
            if (promo && promo.discount_percentage) {
              promos[prod.id] = promo;
            }
          } catch (error) {
            console.error(`Erreur récupération prix promo pour ${prod.id}:`, error);
          }
        }
      }
      setSimilarProductPromoPrices(promos);
    };
    
    fetchPromoPrices();
  }, [similarProducts]);

  // Fonction utilitaire pour mettre à jour ou supprimer le contenu éditable
  const updateOrDeleteEditableContent = async ({ supabase, contentKey, newText, toast, onDelete, onUpdate }) => {
    const cleanValue = newText.replace(/&nbsp;|\s/g, '');

        const { data, error } = await supabase
          .from('editable_content')
      .select('id, content')
      .eq('content_key', contentKey)
      .single();

    if (!cleanValue || cleanValue.length === 0) {
      if (data) {
        await supabase.from('editable_content').delete().eq('content_key', contentKey);
        toast({ title: "Contenu supprimé", description: "Champ vidé et supprimé." });
      }
      if (onDelete) onDelete();
      return;
    }

    if (data && data.content === newText) {
      console.log("🔁 Aucun changement à sauvegarder.");
      return;
    }

    if (data) {
      await supabase.from('editable_content').update({ content: newText }).eq('content_key', contentKey);
    } else {
      await supabase.from('editable_content').insert({ content_key: contentKey, content: newText });
    }

    toast({ title: "Contenu mis à jour", description: "Modifications enregistrées." });
    if (onUpdate) onUpdate();
  };

  const handleAddToCart = async () => {
    if (!product) return;
    
    // Récupérer les informations sur les variantes sélectionnées
    let variant = null;
    let stripePriceId = null;
    let stripeDiscountPriceId = null;
    let finalPrice = computedPrice;
    let originalPrice = undefined;
    let discountPercentage = undefined;
    let hasDiscountApplied = false;
    let variantIdx = 0;
    let option = '';
    
    // Si des variantes existent, construire la chaîne de variante
    if (variants.length > 0) {
      const variantLabels = Object.entries(selectedVariants)
        .map(([label, value]) => `${label}:${value}`)
        .join('|');
      variant = variantLabels;
      
      // Pour les variantes, utiliser getDiscountedPrice du store
      const { getDiscountedPrice } = useCartStore.getState();
      const priceInfo = await getDiscountedPrice(product.id, variant);
      
      if (priceInfo) {
        finalPrice = priceInfo.price;
        if (priceInfo.discount_percentage) {
          originalPrice = priceInfo.original_price;
          discountPercentage = priceInfo.discount_percentage;
          stripeDiscountPriceId = priceInfo.stripe_discount_price_id;
          hasDiscountApplied = true;
        }
      }
      // Déterminer l'index et l'option pour la clé stripe_price_id
      const variantParts = variantLabels.split('|');
      if (variantParts.length > 0) {
        const [label, opt] = variantParts[0].split(':');
        option = opt;
        // Récupérer l'index de la variante depuis les labels
        const { data: labelData } = await supabase
          .from('editable_content')
          .select('content_key')
          .like('content_key', `product_${product.id}_variant_%_label`)
          .eq('content', label);
        if (labelData && labelData.length > 0) {
          const match = labelData[0].content_key.match(/variant_(\d+)_label/);
          if (match) {
            variantIdx = parseInt(match[1]);
          }
        }
        // Récupérer le stripe_price_id pour cette variante/option
        const { data: priceIdData } = await supabase
          .from('editable_content')
          .select('content')
          .eq('content_key', `product_${product.id}_variant_${variantIdx}_option_${option}_stripe_price_id`)
          .single();
        if (priceIdData?.content) {
          stripePriceId = priceIdData.content;
        }
      }
    } else {
      // Pour les produits sans variante, vérifier s'il y a une réduction
      const { getDiscountedPrice } = useCartStore.getState();
      const priceInfo = await getDiscountedPrice(product.id);
      
      if (priceInfo) {
        finalPrice = priceInfo.price;
        if (priceInfo.discount_percentage) {
          originalPrice = priceInfo.original_price;
          discountPercentage = priceInfo.discount_percentage;
          stripeDiscountPriceId = priceInfo.stripe_discount_price_id;
          hasDiscountApplied = true;
        }
      }
      // Récupérer le stripe_price_id pour le produit simple
      const { data: priceIdData } = await supabase
        .from('editable_content')
        .select('content')
        .eq('content_key', `product_${product.id}_stripe_price_id`)
        .single();
      if (priceIdData?.content) {
        stripePriceId = priceIdData.content;
      }
    }
    
    const stock = getSupabaseStock();
    if (stock === 0) {
      toast({
        variant: "destructive",
        title: "Rupture de stock",
        description: "Ce produit est en rupture de stock."
      });
      return;
    }
        
    // Décrémenter le stock côté Supabase
    const apiBaseUrl = getApiBaseUrl();
    fetch(`${apiBaseUrl}/api/stock/decrement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        variantLabel: variants.length ? Object.keys(selectedVariants)[0] : null,
        variantOption: variants.length ? Object.values(selectedVariants)[0] : null,
        quantity
      })
    }).then(() => {
      addItem({
        id: product.id,
        price: finalPrice, // Prix final (réduit si applicable)
        title: product.title,
        image_url: selectedImage || product.image,
        quantity: quantity,
        variant: variant,
        stripe_price_id: stripePriceId,
        stripe_discount_price_id: stripeDiscountPriceId, // ID du prix promotionnel si applicable
        original_price: originalPrice, // Prix original si réduction
        discount_percentage: discountPercentage, // Pourcentage de réduction
        has_discount: hasDiscountApplied // Indique si une réduction est active
      });

      // Tracking Facebook Pixel AddToCart
      if (window.fbq) {
        window.fbq('track', 'AddToCart', {
          content_ids: [product.id],
          content_name: product.title,
          content_type: variants.length > 0 ? 'product_group' : 'product',
          value: finalPrice,
          currency: 'EUR',
          quantity: quantity,
          ...(selectedVariants && Object.keys(selectedVariants).length > 0
            ? { variant: Object.entries(selectedVariants).map(([k, v]) => `${k}:${v}`).join('|') }
            : {})
        });
      }

      toast({
        title: "Produit ajouté au panier",
        description: hasDiscountApplied 
          ? `${product.title} a été ajouté à votre panier avec ${discountPercentage}% de réduction !`
          : `${product.title} a été ajouté à votre panier.`,
      });
    }).catch(error => {
      console.error("Erreur lors de la mise à jour du stock:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le stock, veuillez réessayer."
      });
    });
  };

  // Function to handle text updates
  const handleTextUpdate = async (newText: string, contentKey: string) => {
    try {
      console.log("📝 Mise à jour du texte pour la clé:", contentKey);
      
      // Vérifier que la clé est au format attendu
      if (!contentKey.startsWith('product_')) {
        console.error("❌ Format de clé invalide:", contentKey);
        return;
      }
      
      // Vérifier si le contenu existe déjà
      const { data: existingContent } = await supabase
        .from('editable_content')
        .select('content_key')
        .eq('content_key', contentKey)
        .single();

      if (existingContent) {
        // Mettre à jour le contenu existant
        await supabase
          .from('editable_content')
          .update({ content: newText })
          .eq('content_key', contentKey);
      } else {
        // Créer un nouveau contenu
        await supabase
          .from('editable_content')
          .insert({ content_key: contentKey, content: newText });
      }

      console.log("✅ Texte mis à jour avec succès");
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour du texte:", error);
    }
  };

  // Function to handle image updates
  const handleImageUpdate = async (newUrl, contentKey) => {
    if (!product) return;

    const cleanUrl = newUrl?.trim();

    try {
      await updateOrDeleteEditableContent({
        supabase,
        contentKey,
        newText: cleanUrl,
        toast,
        onDelete: () => {
          setProduct(prev => ({ ...prev, image: '' }));
        },
        onUpdate: () => {
          setProduct(prev => ({ ...prev, image: cleanUrl }));
        }
      });
    } catch (error) {
      console.error(`❌ Erreur image ${contentKey}:`, error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour l'image. Veuillez réessayer."
      });
    }
  };

  // Charger les logos globaux
  useEffect(() => {
    const fetchLogos = async () => {
      const { data } = await supabase
        .from('editable_content')
        .select("content_key, content")
        .in("content_key", ["global_logo_eaudouce_url", "global_logo_eaudemer_url"]);

      const logos = {
        eauDouce: data?.find(i => i.content_key === "global_logo_eaudouce_url")?.content || '',
        eauMer: data?.find(i => i.content_key === "global_logo_eaudemer_url")?.content || ''
      };

      setGlobalLogos(logos);
    };

    fetchLogos();
  }, []);

  // Met à jour l'image principale si extraImages change
  useEffect(() => {
    if (extraImages.length > 0) {
      setSelectedImage(extraImages[0]);
    } else if (product?.image) {
      setSelectedImage(product.image);
    } else {
      setSelectedImage(null);
    }
  }, [extraImages, product?.image]);

  // Fonction de scroll ou sélection selon le nombre d'images
  const scrollThumbnails = (dir: 'left' | 'right') => {
    if (extraImages.length <= 4) {
      // Sélection circulaire de l'image
      if (!selectedImage) return;
      const currentIndex = extraImages.indexOf(selectedImage);
      if (currentIndex === -1) return;
      let newIndex = dir === 'left' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0) newIndex = extraImages.length - 1;
      if (newIndex >= extraImages.length) newIndex = 0;
      setSelectedImage(extraImages[newIndex]);
    } else if (thumbnailsRef.current) {
      const scrollAmount = 120; // px
      thumbnailsRef.current.scrollBy({
        left: dir === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Afficher un état de chargement pendant que les données sont récupérées
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }
  
  // Si le produit n'est pas chargé, afficher un message d'erreur avec le debug panel
  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col p-4">
          <h1 className="text-2xl font-bold mb-4">Produit non trouvé</h1>
          <p className="text-gray-500 mb-6">Impossible de charger les détails du produit.</p>
          
          <div className="w-full max-w-2xl mb-6">
            <ProductNotFoundAlert 
              productId={getProductIdFromQuery() || ''}
            />
          </div>
          
          <Button asChild>
            <Link to="/categories">Retour aux catégories</Link>
          </Button>
          
          <div className="mt-8 w-full max-w-2xl">
            {isEditMode && (
            <Tabs defaultValue="debug">
              <TabsList className="mb-4">
                <TabsTrigger value="debug">🛠 Debug</TabsTrigger>
              </TabsList>
              <TabsContent value="debug">
                <DebugPanel 
                  product={product}
                    productId={getProductIdFromQuery()}
                  fetchStatus={fetchStatus}
                />
              </TabsContent>
            </Tabs>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  console.log('🟢 [MODELE] product:', product);
  console.log('🟢 [MODELE] show_logo_eaudouce:', product?.show_logo_eaudouce);
  console.log('🟢 [MODELE] show_logo_eaudemer:', product?.show_logo_eaudemer);
  console.log('🟢 [MODELE] globalLogos.eauDouce:', globalLogos.eauDouce);
  console.log('🟢 [MODELE] globalLogos.eauMer:', globalLogos.eauMer);
  console.log('🟢 [MODELE] Affiche logo eau douce ?', product?.show_logo_eaudouce === "true" && !!globalLogos.eauDouce);
  console.log('🟢 [MODELE] Affiche logo eau mer ?', product?.show_logo_eaudemer === "true" && !!globalLogos.eauMer);

  // Fonction utilitaire pour obtenir le stock depuis Supabase (corrigée)
  const getSupabaseStock = () => {
    if (!product) return null;
    if (!variants.length) return product.stock ?? null;
    const variant = variants[0];
    const variantLabel = variant.label;
    const variantValue = selectedVariants[variantLabel];
    if (!variantLabel || !variantValue) return null;
    const comboKey = `${variantLabel}:${variantValue}`;
    return product.variantStocks?.[comboKey] ?? null;
  };

  // Fonction pour sauvegarder le stock général
  const saveGeneralStock = async (productId: string, stock: string) => {
    try {
      const stockNum = Number(stock);
      if (isNaN(stockNum)) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Le stock doit être un nombre valide."
        });
        return;
      }

      await supabase.from('editable_content').upsert({
        content_key: `product_${productId}_stock`,
        content: stockNum.toString()
      });

      setProduct(prev => ({ ...prev, stock: stockNum }));
      toast({
        title: "Stock mis à jour",
        description: "Le stock a été mis à jour avec succès."
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du stock:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le stock."
      });
    }
  };

  // Fonction pour sauvegarder le stock d'une variante
  const saveVariantStock = async (productId: string, variantIdx: number, option: string, stock: string) => {
    try {
      const stockNum = Number(stock);
      if (isNaN(stockNum)) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Le stock doit être un nombre valide."
        });
        return;
      }

      const variant = variants.find(v => v.idx === variantIdx);
      if (!variant) {
        console.error("Variante non trouvée:", variantIdx);
        return;
      }

      const comboKey = `${variant.label}:${option}`;

      // Supprime d'abord les anciennes clés (basées sur d'anciens labels pour le même idx)
      const labelPattern = `product_${productId}_variant_${variantIdx}_option_${option}_stock`;
      await supabase
        .from('editable_content')
        .delete()
        .eq('content_key', labelPattern);

      console.log(`[VARIANT STOCK] Sauvegarde de ${comboKey} = ${stockNum}`);

      // Ajoute la nouvelle version propre
      await supabase.from('editable_content').insert({
        content_key: `product_${productId}_variant_${variantIdx}_option_${option}_stock`,
        content: stockNum.toString()
      });

      setProduct(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (!updated.variantStocks) updated.variantStocks = {};
        updated.variantStocks[comboKey] = stockNum;
        return updated as Product;
      });
      console.log("✅ Stock variant mis à jour dans le state:", comboKey, stockNum);

      toast({
        title: "Stock mis à jour",
        description: `Stock de ${variant.label} ${option} mis à jour.`
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du stock:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le stock."
      });
    }
  };

  // Fonction pour calculer et sauvegarder les prix réduits
  const saveVariantDiscount = async (productId: string, variantIdx: number, reductionPercentage: number) => {
    try {
      const variant = variants.find(v => v.idx === variantIdx);
      if (!variant) {
        console.error("Variante non trouvée:", variantIdx);
        return;
      }

      if (reductionPercentage < 0 || reductionPercentage > 100) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Le pourcentage de réduction doit être entre 0 et 100."
        });
        return;
      }

      // Sauvegarder le pourcentage de réduction
      await supabase.from('editable_content').upsert({
        content_key: `product_${productId}_variant_${variantIdx}_reduction_percentage`,
        content: reductionPercentage.toString()
      }, { onConflict: 'content_key' });

      // Calculer et sauvegarder les prix réduits pour chaque option
      for (const option of variant.options) {
        const comboKey = `${variant.label}:${option}`;
        const originalPrice = variant.price_map[comboKey];
        
        if (originalPrice && !isNaN(originalPrice)) {
          const discountPrice = originalPrice * (1 - reductionPercentage / 100);
          
          // Sauvegarder le prix réduit
          await supabase.from('editable_content').upsert({
            content_key: `product_${productId}_variant_${variantIdx}_option_${option}_discount_price`,
            content: discountPrice.toFixed(2)
          }, { onConflict: 'content_key' });

          // Créer/Mettre à jour le prix dans Stripe
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
              console.error("❌ Aucun token utilisateur trouvé.");
              setStripeLogs(prev => [...prev, '[DISCOUNT-STRIPE] ❌ Erreur: Aucun token utilisateur trouvé']);
              continue;
            }

            // D'abord supprimer l'ancien prix s'il existe
            const { data: existingPriceData } = await supabase
              .from('editable_content')
              .select('content')
              .eq('content_key', `product_${productId}_variant_${variantIdx}_option_${option}_stripe_discount_price_id`)
              .single();

            if (existingPriceData?.content) {
              const deleteRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stripe-variant?priceId=${existingPriceData.content}`, {
                method: 'DELETE',
                headers: { 
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (deleteRes.ok) {
                setStripeLogs(prev => [...prev, `[DISCOUNT-STRIPE] ✅ Ancien prix supprimé: ${existingPriceData.content}`]);
              }
            }

            // Si réduction = 0, supprimer le prix réduit
            if (reductionPercentage === 0) {
              const { data: existingPromoData } = await supabase
                .from('editable_content')
                .select('content')
                .eq('content_key', `product_${productId}_variant_${variantIdx}_option_${option}_stripe_discount_price_id`)
                .single();

              if (existingPromoData?.content) {
                const deleteRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stripe-variant?priceId=${existingPromoData.content}`, {
                  method: 'DELETE',
                  headers: { 
                    'Authorization': `Bearer ${token}`
                  }
                });
                
                if (deleteRes.ok) {
                  setStripeLogs(prev => [...prev, `[DISCOUNT-STRIPE] ✅ Prix promotionnel supprimé: ${existingPromoData.content}`]);
                  // Supprimer la clé de la base
                  await supabase.from('editable_content').delete()
                    .eq('content_key', `product_${productId}_variant_${variantIdx}_option_${option}_stripe_discount_price_id`);
                }
              }
            } else {
              // Créer le nouveau prix réduit
              const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stripe-variant`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  stripeProductId: productId,
                  label: variant.label,
                  option: option,
                  price: discountPrice,
                  isDiscount: true
                })
              });

              const data = await res.json();
              if (data?.logs) {
                setStripeLogs(prev => [...prev, ...data.logs]);
              }

              if (data && data.priceId) {
                // Sauvegarder le nouveau priceId Stripe
                await supabase.from('editable_content').upsert({
                  content_key: `product_${productId}_variant_${variantIdx}_option_${option}_stripe_discount_price_id`,
                  content: data.priceId
                }, { onConflict: 'content_key' });

                setStripeLogs(prev => [...prev, `[DISCOUNT-STRIPE] ✅ Nouveau prix réduit créé: ${data.priceId} (${discountPrice.toFixed(2)}€)`]);
              }
            }
          } catch (err) {
            console.error('Erreur lors de la synchronisation Stripe:', err);
            setStripeLogs(prev => [...prev, `[DISCOUNT-STRIPE] ❌ Erreur: ${err.message}`]);
          }
        }
      }

      // Mettre à jour l'état local
      setVariantReductions(prev => ({
        ...prev,
        [variantIdx]: reductionPercentage
      }));

      // Mettre à jour les variants avec les nouvelles données
      setVariants(prev => prev.map(v => {
        if (v.idx === variantIdx) {
          const updatedVariant = { ...v };
          updatedVariant.reduction_percentage = reductionPercentage;
          updatedVariant.discount_map = {};
          
          // Recalculer les prix réduits
          for (const option of v.options) {
            const comboKey = `${v.label}:${option}`;
            const originalPrice = v.price_map[comboKey];
            if (originalPrice && !isNaN(originalPrice)) {
              const discountPrice = originalPrice * (1 - reductionPercentage / 100);
              updatedVariant.discount_map[comboKey] = discountPrice;
            }
          }
          
          return updatedVariant;
        }
        return v;
      }));

      toast({
        title: "Réduction appliquée",
        description: `Réduction de ${reductionPercentage}% appliquée à ${variant.label}.`
      });
    } catch (error) {
      console.error("Erreur lors de l'application de la réduction:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'appliquer la réduction."
      });
    }
  };

  // Fonction pour calculer et sauvegarder les réductions du produit principal (sans variantes)
  const saveProductDiscount = async (productId: string, reductionPercentage: number) => {
    try {
      console.log("🎯 [PRODUCT-DISCOUNT] === DÉBUT saveProductDiscount ===");
      console.log("🎯 [PRODUCT-DISCOUNT] Paramètres:", { productId, reductionPercentage });
      setStripeLogs(prev => [...prev, `🎯 [PRODUCT-DISCOUNT] Début: ${reductionPercentage}% pour produit ${productId}`]);

      if (reductionPercentage < 0 || reductionPercentage > 100) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Le pourcentage de réduction doit être entre 0 et 100."
        });
        console.log("❌ [PRODUCT-DISCOUNT] Pourcentage invalide:", reductionPercentage);
        setStripeLogs(prev => [...prev, `❌ [PRODUCT-DISCOUNT] Pourcentage invalide: ${reductionPercentage}%`]);
        return;
      }

      if (reductionPercentage === 0) {
        console.log("🗑️ [PRODUCT-DISCOUNT] Suppression des réductions...");
        setStripeLogs(prev => [...prev, `🗑️ [PRODUCT-DISCOUNT] Suppression des réductions`]);
        
        // 1️⃣ Récupérer le stripe_discount_price_id s'il existe
        const { data: existingDiscountPriceData } = await supabase
          .from('editable_content')
          .select('content')
          .eq('content_key', `product_${productId}_stripe_discount_price_id`)
          .single();

        // 2️⃣ Désactiver le prix Stripe promotionnel s'il existe
        if (existingDiscountPriceData?.content) {
          console.log("🔧 [PRODUCT-DISCOUNT] Désactivation prix Stripe:", existingDiscountPriceData.content);
          setStripeLogs(prev => [...prev, `🔧 [PRODUCT-DISCOUNT] Désactivation Stripe: ${existingDiscountPriceData.content}`]);
          
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (token) {
              const deleteRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stripe-variant?priceId=${existingDiscountPriceData.content}`, {
                method: 'DELETE',
                headers: { 
                  'Authorization': `Bearer ${token}`
                }
              });

              const deleteResult = await deleteRes.json();
              console.log("📞 [PRODUCT-DISCOUNT] DELETE Response:", deleteRes.status, deleteResult);
              setStripeLogs(prev => [...prev, `📞 [PRODUCT-DISCOUNT] DELETE Status: ${deleteRes.status} (${deleteRes.ok ? 'OK' : 'FAILED'})`]);
              
              if (deleteRes.ok && deleteResult.success) {
                console.log("✅ [PRODUCT-DISCOUNT] Prix Stripe désactivé avec succès");
                setStripeLogs(prev => [...prev, `✅ [PRODUCT-DISCOUNT] Prix Stripe désactivé: ${existingDiscountPriceData.content}`]);
              } else {
                console.error("❌ [PRODUCT-DISCOUNT] Erreur désactivation Stripe:", deleteResult);
                setStripeLogs(prev => [...prev, `❌ [PRODUCT-DISCOUNT] Erreur Stripe: ${deleteResult.error || 'Inconnue'}`]);
              }
            } else {
              console.warn("⚠️ [PRODUCT-DISCOUNT] Pas de token pour désactiver le prix Stripe");
              setStripeLogs(prev => [...prev, `⚠️ [PRODUCT-DISCOUNT] Pas de token pour Stripe`]);
            }
          } catch (stripeError) {
            console.error("❌ [PRODUCT-DISCOUNT] Erreur lors de la désactivation Stripe:", stripeError);
            setStripeLogs(prev => [...prev, `❌ [PRODUCT-DISCOUNT] Erreur réseau Stripe: ${stripeError.message}`]);
          }
        }

        // 3️⃣ Supprimer les entrées de la table product_prices
        const { error: deleteProductPricesError } = await supabase
          .from('product_prices')
          .delete()
          .eq('product_id', productId)
          .eq('variant_label', 'main')
          .eq('variant_value', 'default')
          .eq('is_discount', true);

        if (deleteProductPricesError) {
          console.error('❌ [PRODUCT-DISCOUNT] Erreur suppression product_prices:', deleteProductPricesError);
          setStripeLogs(prev => [...prev, `❌ [PRODUCT-DISCOUNT] Erreur product_prices: ${deleteProductPricesError.message}`]);
        } else {
          console.log('✅ [PRODUCT-DISCOUNT] Entrées product_prices supprimées');
          setStripeLogs(prev => [...prev, `✅ [PRODUCT-DISCOUNT] Entrées product_prices supprimées`]);
        }
        
        // 4️⃣ Supprimer les réductions existantes dans editable_content (legacy)
        await supabase.from('editable_content').delete()
          .eq('content_key', `product_${productId}_discount_percentage`);
        await supabase.from('editable_content').delete()
          .eq('content_key', `product_${productId}_discount_price`);
        await supabase.from('editable_content').delete()
          .eq('content_key', `product_${productId}_stripe_discount_price_id`);

        console.log('✅ [PRODUCT-DISCOUNT] Nettoyage editable_content terminé');
        setStripeLogs(prev => [...prev, `✅ [PRODUCT-DISCOUNT] Nettoyage local terminé`]);

        // 5️⃣ Mettre à jour l'état local
        setProductReduction(0);
        setProductDiscount(0);

        console.log('🎉 [PRODUCT-DISCOUNT] Suppression complète terminée');
        setStripeLogs(prev => [...prev, `🎉 [PRODUCT-DISCOUNT] === SUPPRESSION TERMINÉE ===`]);

        toast({
          title: "Réduction supprimée",
          description: "La réduction du produit a été supprimée et désactivée dans Stripe."
        });
        return;
      }

      console.log("🧮 [PRODUCT-DISCOUNT] Calcul du prix réduit...");
      setStripeLogs(prev => [...prev, `🧮 [PRODUCT-DISCOUNT] Calcul prix réduit...`]);

      // Calculer le prix réduit
      const originalPrice = product.price;
      const discountPrice = originalPrice * (1 - reductionPercentage / 100);
      
      console.log("💰 [PRODUCT-DISCOUNT] Prix calculés:", { originalPrice, reductionPercentage, discountPrice });
      setStripeLogs(prev => [...prev, `💰 [PRODUCT-DISCOUNT] ${originalPrice}€ → ${discountPrice.toFixed(2)}€ (-${reductionPercentage}%)`]);

      console.log("💾 [PRODUCT-DISCOUNT] Sauvegarde en base...");
      setStripeLogs(prev => [...prev, `💾 [PRODUCT-DISCOUNT] Sauvegarde en base...`]);

      // Sauvegarder le pourcentage et le prix réduit
      await supabase.from('editable_content').upsert([
        {
          content_key: `product_${productId}_discount_percentage`,
          content: reductionPercentage.toString()
        },
        {
          content_key: `product_${productId}_discount_price`,
          content: discountPrice.toFixed(2)
        }
      ], { onConflict: 'content_key' });
      
      console.log("✅ [PRODUCT-DISCOUNT] Sauvegarde terminée");
      setStripeLogs(prev => [...prev, `✅ [PRODUCT-DISCOUNT] Données sauvegardées en base`]);

      // Créer/Mettre à jour le prix dans Stripe
      try {
        console.log("🚀 [PRODUCT-DISCOUNT] === DÉBUT STRIPE ===");
        setStripeLogs(prev => [...prev, `🚀 [PRODUCT-DISCOUNT] === DÉBUT STRIPE ===`]);
        
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        console.log("🔑 [PRODUCT-DISCOUNT] Token:", token ? "✅ OK" : "❌ MANQUANT");
        setStripeLogs(prev => [...prev, `🔑 [PRODUCT-DISCOUNT] Token: ${token ? "✅ OK" : "❌ MANQUANT"}`]);

        if (!token) {
          console.error("❌ Aucun token utilisateur trouvé.");
          setStripeLogs(prev => [...prev, '[PRODUCT-DISCOUNT-STRIPE] ❌ Erreur: Aucun token utilisateur trouvé']);
        } else {
          console.log("🔍 [PRODUCT-DISCOUNT] Recherche ancien prix...");
          setStripeLogs(prev => [...prev, `🔍 [PRODUCT-DISCOUNT] Recherche ancien prix...`]);
          
          // D'abord supprimer l'ancien prix s'il existe
          const { data: existingPriceData } = await supabase
            .from('editable_content')
            .select('content')
            .eq('content_key', `product_${productId}_stripe_discount_price_id`)
            .single();
          
          console.log("📋 [PRODUCT-DISCOUNT] Prix existant:", existingPriceData?.content || "AUCUN");
          setStripeLogs(prev => [...prev, `📋 [PRODUCT-DISCOUNT] Prix existant: ${existingPriceData?.content || "AUCUN"}`]);

          if (existingPriceData?.content) {
            console.log("🗑️ [PRODUCT-DISCOUNT] Suppression ancien prix:", existingPriceData.content);
            setStripeLogs(prev => [...prev, `🗑️ [PRODUCT-DISCOUNT] Suppression: ${existingPriceData.content}`]);
            
            const deleteRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stripe-variant?priceId=${existingPriceData.content}`, {
              method: 'DELETE',
              headers: { 
                'Authorization': `Bearer ${token}`
              }
            });
            
            console.log("📞 [PRODUCT-DISCOUNT] DELETE Response:", deleteRes.status, deleteRes.ok);
            setStripeLogs(prev => [...prev, `📞 [PRODUCT-DISCOUNT] DELETE Status: ${deleteRes.status} (${deleteRes.ok ? 'OK' : 'FAILED'})`]);
            
            if (deleteRes.ok) {
              setStripeLogs(prev => [...prev, `[PRODUCT-DISCOUNT-STRIPE] ✅ Ancien prix supprimé: ${existingPriceData.content}`]);
            } else {
              const deleteError = await deleteRes.text();
              console.log("❌ [PRODUCT-DISCOUNT] DELETE Error:", deleteError);
              setStripeLogs(prev => [...prev, `❌ [PRODUCT-DISCOUNT] DELETE Error: ${deleteError}`]);
            }
          }

          console.log("🛠️ [PRODUCT-DISCOUNT] Création nouveau prix...");
          setStripeLogs(prev => [...prev, `🛠️ [PRODUCT-DISCOUNT] Création nouveau prix...`]);
          
          const payload = {
            stripeProductId: productId,
            label: "main",
            option: "default",
            price: discountPrice,
            isDiscount: true
          };
          
          console.log("📦 [PRODUCT-DISCOUNT] Payload:", payload);
          setStripeLogs(prev => [...prev, `📦 [PRODUCT-DISCOUNT] Payload: ${JSON.stringify(payload)}`]);

          // Créer le nouveau prix réduit
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stripe-variant`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          console.log("📞 [PRODUCT-DISCOUNT] POST Response:", res.status, res.ok);
          setStripeLogs(prev => [...prev, `📞 [PRODUCT-DISCOUNT] POST Status: ${res.status} (${res.ok ? 'OK' : 'FAILED'})`]);

          const data = await res.json();
          console.log("📄 [PRODUCT-DISCOUNT] Response Data:", data);
          setStripeLogs(prev => [...prev, `📄 [PRODUCT-DISCOUNT] Response: ${JSON.stringify(data, null, 2)}`]);
          
          if (data?.logs) {
            setStripeLogs(prev => [...prev, ...data.logs]);
          }

          if (data && data.priceId) {
            console.log("✅ [PRODUCT-DISCOUNT] Prix créé:", data.priceId);
            setStripeLogs(prev => [...prev, `✅ [PRODUCT-DISCOUNT] Prix créé: ${data.priceId}`]);
            
            // Sauvegarder le nouveau priceId Stripe
            await supabase.from('editable_content').upsert({
              content_key: `product_${productId}_stripe_discount_price_id`,
              content: data.priceId
            }, { onConflict: 'content_key' });

            setStripeLogs(prev => [...prev, `[PRODUCT-DISCOUNT-STRIPE] ✅ Nouveau prix réduit créé: ${data.priceId} (${discountPrice.toFixed(2)}€)`]);
          } else {
            console.error("❌ [PRODUCT-DISCOUNT] Pas de priceId dans la réponse");
            setStripeLogs(prev => [...prev, `❌ [PRODUCT-DISCOUNT] Pas de priceId dans la réponse`]);
          }
        }
      } catch (err) {
        console.error('❌ [PRODUCT-DISCOUNT] Erreur Stripe:', err);
        setStripeLogs(prev => [...prev, `[PRODUCT-DISCOUNT-STRIPE] ❌ Erreur: ${err.message}`]);
      }

      // Mettre à jour l'état local
      setProductReduction(reductionPercentage);
      setProductDiscount(discountPrice);

      console.log("🎉 [PRODUCT-DISCOUNT] === FIN saveProductDiscount ===");
      setStripeLogs(prev => [...prev, `🎉 [PRODUCT-DISCOUNT] === TERMINÉ ===`]);

      toast({
        title: "Réduction appliquée",
        description: `Réduction de ${reductionPercentage}% appliquée au produit.`
      });
    } catch (error) {
      console.error("❌ [PRODUCT-DISCOUNT] Erreur globale:", error);
      setStripeLogs(prev => [...prev, `❌ [PRODUCT-DISCOUNT] Erreur globale: ${error.message}`]);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'appliquer la réduction."
      });
    }
  };

  // Fonction pour calculer et sauvegarder les réductions du produit principal (sans variantes)
  const saveVariantOptionDiscount = async (productId: string, variantIdx: number, option: string, reductionPercentage: number) => {
    try {
      console.log(`🎯 [DISCOUNT-LOG] Début de saveVariantOptionDiscount`, { productId, variantIdx, option, reductionPercentage });
      setStripeLogs(prev => [...prev, `🎯 [DISCOUNT-LOG] Début réduction: ${reductionPercentage}% pour ${variantIdx}:${option}`]);

      const variant = variants.find(v => v.idx === variantIdx);
      if (!variant) {
        console.error("Variante non trouvée:", variantIdx);
        setStripeLogs(prev => [...prev, `❌ [DISCOUNT-LOG] Variante non trouvée: ${variantIdx}`]);
        return;
      }

      if (reductionPercentage < 0 || reductionPercentage > 100) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Le pourcentage de réduction doit être entre 0 et 100."
        });
        setStripeLogs(prev => [...prev, `❌ [DISCOUNT-LOG] Pourcentage invalide: ${reductionPercentage}%`]);
        return;
      }

      console.log(`📊 [DISCOUNT-LOG] Variante trouvée:`, { label: variant.label, options: variant.options, price_map: variant.price_map });
      setStripeLogs(prev => [...prev, `📊 [DISCOUNT-LOG] Variante: ${variant.label}, Options: ${variant.options.join(', ')}`]);

      // Sauvegarder le pourcentage de réduction pour cette option spécifique
      console.log(`💾 [DISCOUNT-LOG] Sauvegarde pourcentage en base...`);
      await supabase.from('editable_content').upsert({
        content_key: `product_${productId}_variant_${variantIdx}_option_${option}_discount_percentage`,
        content: reductionPercentage.toString()
      }, { onConflict: 'content_key' });
      setStripeLogs(prev => [...prev, `💾 [DISCOUNT-LOG] Pourcentage sauvegardé: product_${productId}_variant_${variantIdx}_option_${option}_discount_percentage = ${reductionPercentage}`]);

      // Calculer et sauvegarder le prix réduit pour cette option uniquement
      const comboKey = `${variant.label}:${option}`;
      const originalPrice = variant.price_map[comboKey];
      
      console.log(`🧮 [DISCOUNT-LOG] Calcul du prix`, { comboKey, originalPrice, reductionPercentage });
      setStripeLogs(prev => [...prev, `🧮 [DISCOUNT-LOG] Prix original pour ${comboKey}: ${originalPrice}€`]);
      
      if (originalPrice && !isNaN(originalPrice)) {
        if (reductionPercentage === 0) {
          console.log(`🗑️ [DISCOUNT-LOG] Suppression de la réduction...`);
          setStripeLogs(prev => [...prev, `🗑️ [DISCOUNT-LOG] Suppression réduction pour ${comboKey}`]);
          
          // Si réduction = 0, supprimer le prix réduit
          await supabase.from('editable_content').delete()
            .eq('content_key', `product_${productId}_variant_${variantIdx}_option_${option}_discount_price`);
        } else {
          const discountPrice = originalPrice * (1 - reductionPercentage / 100);
          console.log(`💰 [DISCOUNT-LOG] Prix réduit calculé:`, { originalPrice, reductionPercentage, discountPrice });
          setStripeLogs(prev => [...prev, `💰 [DISCOUNT-LOG] Prix réduit calculé: ${originalPrice}€ → ${discountPrice.toFixed(2)}€`]);
          
          // Sauvegarder le prix réduit
          await supabase.from('editable_content').upsert({
            content_key: `product_${productId}_variant_${variantIdx}_option_${option}_discount_price`,
            content: discountPrice.toFixed(2)
          }, { onConflict: 'content_key' });
          setStripeLogs(prev => [...prev, `💾 [DISCOUNT-LOG] Prix réduit sauvegardé: product_${productId}_variant_${variantIdx}_option_${option}_discount_price = ${discountPrice.toFixed(2)}`]);

          // Créer/Mettre à jour le prix dans Stripe
          try {
            console.log(`🚀 [DISCOUNT-LOG] Début interaction Stripe...`);
            setStripeLogs(prev => [...prev, `🚀 [DISCOUNT-LOG] === DÉBUT INTERACTION STRIPE ===`]);
            
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
              console.error("❌ Aucun token utilisateur trouvé.");
              setStripeLogs(prev => [...prev, '[DISCOUNT-STRIPE] ❌ Erreur: Aucun token utilisateur trouvé']);
              return;
            }
            setStripeLogs(prev => [...prev, `🔑 [DISCOUNT-LOG] Token récupéré: ${token ? '✅ OK' : '❌ MANQUANT'}`]);

            // Si réduction = 0, supprimer seulement le prix promotionnel (pas le prix de base)
            if (reductionPercentage === 0) {
              console.log(`🔍 [DISCOUNT-LOG] Recherche prix promotionnel existant...`);
              setStripeLogs(prev => [...prev, `🔍 [DISCOUNT-LOG] Recherche prix promotionnel existant...`]);
              
              const { data: existingPromoData } = await supabase
                .from('editable_content')
                .select('content')
                .eq('content_key', `product_${productId}_variant_${variantIdx}_option_${option}_stripe_discount_price_id`)
                .single();

              console.log(`📋 [DISCOUNT-LOG] Prix promotionnel trouvé:`, existingPromoData);
              setStripeLogs(prev => [...prev, `📋 [DISCOUNT-LOG] Prix promotionnel existant: ${existingPromoData?.content || 'AUCUN'}`]);

              if (existingPromoData?.content) {
                console.log(`🗑️ [DISCOUNT-LOG] Suppression du prix Stripe: ${existingPromoData.content}`);
                setStripeLogs(prev => [...prev, `🗑️ [DISCOUNT-LOG] Suppression prix Stripe: ${existingPromoData.content}`]);
                
                const deleteRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stripe-variant?priceId=${existingPromoData.content}`, {
                  method: 'DELETE',
                  headers: { 
                    'Authorization': `Bearer ${token}`
                  }
                });
                
                console.log(`📞 [DISCOUNT-LOG] Réponse DELETE Stripe:`, { status: deleteRes.status, ok: deleteRes.ok });
                setStripeLogs(prev => [...prev, `📞 [DISCOUNT-LOG] DELETE Stripe: Status ${deleteRes.status} (${deleteRes.ok ? 'SUCCESS' : 'FAILED'})`]);
                
                if (deleteRes.ok) {
                  setStripeLogs(prev => [...prev, `[DISCOUNT-STRIPE] ✅ Prix promotionnel supprimé: ${existingPromoData.content}`]);
                  // Supprimer la clé de la base
                  await supabase.from('editable_content').delete()
                    .eq('content_key', `product_${productId}_variant_${variantIdx}_option_${option}_stripe_discount_price_id`);
                }
              }
            } else {
              console.log(`🛠️ [DISCOUNT-LOG] Création nouveau prix promotionnel...`);
              setStripeLogs(prev => [...prev, `🛠️ [DISCOUNT-LOG] Création prix promotionnel pour ${discountPrice.toFixed(2)}€`]);
              
              // Préparer le payload
              const payload = {
                stripeProductId: productId,
                label: variant.label,
                option: option,
                price: discountPrice,
                isDiscount: true
              };
              console.log(`📦 [DISCOUNT-LOG] Payload Stripe:`, payload);
              setStripeLogs(prev => [...prev, `📦 [DISCOUNT-LOG] Payload: ${JSON.stringify(payload)}`]);
              
              // Créer le nouveau prix réduit
              const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stripe-variant`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
              });

              console.log(`📞 [DISCOUNT-LOG] Réponse POST Stripe:`, { status: res.status, ok: res.ok });
              setStripeLogs(prev => [...prev, `📞 [DISCOUNT-LOG] POST Stripe: Status ${res.status} (${res.ok ? 'SUCCESS' : 'FAILED'})`]);

              const data = await res.json();
              console.log(`📄 [DISCOUNT-LOG] Data reçue de Stripe:`, data);
              setStripeLogs(prev => [...prev, `📄 [DISCOUNT-LOG] Réponse Stripe: ${JSON.stringify(data, null, 2)}`]);

              if (data?.logs) {
                console.log(`📋 [DISCOUNT-LOG] Logs Stripe reçus:`, data.logs);
                setStripeLogs(prev => [...prev, ...data.logs]);
              }

              if (data && data.priceId) {
                console.log(`✅ [DISCOUNT-LOG] Prix créé avec succès: ${data.priceId}`);
                setStripeLogs(prev => [...prev, `✅ [DISCOUNT-LOG] Prix Stripe créé: ${data.priceId}`]);
                
                // Sauvegarder le priceId promotionnel dans une clé séparée
                await supabase.from('editable_content').upsert({
                  content_key: `product_${productId}_variant_${variantIdx}_option_${option}_stripe_discount_price_id`,
                  content: data.priceId
                }, { onConflict: 'content_key' });

                setStripeLogs(prev => [...prev, `[DISCOUNT-STRIPE] ✅ Prix promotionnel créé: ${data.priceId} (${discountPrice.toFixed(2)}€)`]);
                setStripeLogs(prev => [...prev, `💾 [DISCOUNT-LOG] priceId sauvegardé: product_${productId}_variant_${variantIdx}_option_${option}_stripe_discount_price_id = ${data.priceId}`]);
              } else {
                console.error(`❌ [DISCOUNT-LOG] Pas de priceId dans la réponse:`, data);
                setStripeLogs(prev => [...prev, `❌ [DISCOUNT-LOG] Pas de priceId reçu de Stripe!`]);
              }
              
              setStripeLogs(prev => [...prev, `🚀 [DISCOUNT-LOG] === FIN INTERACTION STRIPE ===`]);
            }
          } catch (err) {
            console.error('❌ [DISCOUNT-LOG] Erreur lors de la synchronisation Stripe:', err);
            setStripeLogs(prev => [...prev, `[DISCOUNT-STRIPE] ❌ Erreur: ${err.message}`]);
          }
        }
      } else {
        console.error(`❌ [DISCOUNT-LOG] Prix original invalide pour ${comboKey}:`, originalPrice);
        setStripeLogs(prev => [...prev, `❌ [DISCOUNT-LOG] Prix original invalide pour ${comboKey}: ${originalPrice}`]);
      }

      // Mettre à jour l'état local pour cette option spécifique
      setVariantReductions(prev => ({
        ...prev,
        [`${variantIdx}:${option}`]: reductionPercentage
      }));

      // Mettre à jour les variants avec les nouvelles données
      setVariants(prev => prev.map(v => {
        if (v.idx === variantIdx) {
          const updatedVariant = { ...v };
          if (!updatedVariant.discount_map) {
            updatedVariant.discount_map = {};
          }
          
          // Mettre à jour uniquement cette option
          if (reductionPercentage === 0) {
            delete updatedVariant.discount_map[comboKey];
          } else {
            const discountPrice = originalPrice * (1 - reductionPercentage / 100);
            updatedVariant.discount_map[comboKey] = discountPrice;
          }
          
          return updatedVariant;
        }
        return v;
      }));

      console.log(`✅ [DISCOUNT-LOG] Fin de saveVariantOptionDiscount avec succès`);
      setStripeLogs(prev => [...prev, `✅ [DISCOUNT-LOG] === RÉDUCTION APPLIQUÉE AVEC SUCCÈS ===`]);

      toast({
        title: "Réduction appliquée",
        description: `Réduction de ${reductionPercentage}% appliquée à ${variant.label}:${option}.`
      });
    } catch (error) {
      console.error("❌ [DISCOUNT-LOG] Erreur lors de l'application de la réduction:", error);
      setStripeLogs(prev => [...prev, `❌ [DISCOUNT-LOG] ERREUR GÉNÉRALE: ${error.message}`]);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'appliquer la réduction."
      });
    }
  };

  // Fonction pour supprimer toutes les réductions d'une variante
  const removeAllVariantReductions = async (productId: string, variantIdx: number) => {
    try {
      const variant = variants.find(v => v.idx === variantIdx);
      if (!variant) {
        console.error("Variante non trouvée:", variantIdx);
        return;
      }

      console.log(`🗑️ [REMOVE-VARIANT-PROMO] Début suppression pour ${variant.label}`);

      // 1️⃣ Récupérer les stripe_price_id des prix promotionnels à supprimer
      const { data: promotionalPrices, error: fetchError } = await supabase
        .from('product_prices')
        .select('stripe_price_id, variant_label, variant_value')
        .eq('product_id', productId)
        .eq('variant_label', variant.label)
        .eq('is_discount', true);

      if (fetchError) {
        console.error('❌ Erreur récupération prix promotionnels:', fetchError);
      } else {
        console.log(`💰 [REMOVE-VARIANT-PROMO] ${promotionalPrices?.length || 0} prix promotionnels trouvés:`, promotionalPrices);
      }

      // 2️⃣ Désactiver chaque prix promotionnel dans Stripe via l'edge function
      if (promotionalPrices && promotionalPrices.length > 0) {
        for (const priceData of promotionalPrices) {
          try {
            console.log(`🔧 [REMOVE-VARIANT-PROMO] Désactivation Stripe: ${priceData.stripe_price_id}`);
            
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/functions/v1/sync-stripe-variant?priceId=' + priceData.stripe_price_id, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
              },
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
              console.log(`✅ [REMOVE-VARIANT-PROMO] Prix Stripe désactivé: ${priceData.stripe_price_id}`);
              console.log(`📋 [REMOVE-VARIANT-PROMO] Détails:`, result);
            } else {
              console.error(`❌ [REMOVE-VARIANT-PROMO] Erreur Stripe pour ${priceData.stripe_price_id}:`, result);
            }
          } catch (stripeError) {
            console.error(`❌ [REMOVE-VARIANT-PROMO] Erreur réseau Stripe:`, stripeError);
          }
        }

        // 3️⃣ Supprimer les entrées de la table product_prices
        const { error: deleteProductPricesError } = await supabase
          .from('product_prices')
          .delete()
          .eq('product_id', productId)
          .eq('variant_label', variant.label)
          .eq('is_discount', true);

        if (deleteProductPricesError) {
          console.error('❌ Erreur suppression product_prices:', deleteProductPricesError);
        } else {
          console.log('✅ [REMOVE-VARIANT-PROMO] Entrées product_prices supprimées');
        }
      }

      // 4️⃣ Supprimer toutes les réductions existantes pour chaque option de cette variante (legacy)
      for (const option of variant.options) {
        await supabase.from('editable_content').delete()
          .eq('content_key', `product_${productId}_variant_${variantIdx}_option_${option}_discount_percentage`);
        await supabase.from('editable_content').delete()
          .eq('content_key', `product_${productId}_variant_${variantIdx}_option_${option}_discount_price`);
      }

      // 5️⃣ Supprimer aussi l'ancienne réduction globale pour cette variante si elle existe (legacy)
      await supabase.from('editable_content').delete()
        .eq('content_key', `product_${productId}_variant_${variantIdx}_reduction_percentage`);

      console.log('✅ [REMOVE-VARIANT-PROMO] Nettoyage editable_content terminé');

      // 6️⃣ Mettre à jour l'état local en supprimant toutes les réductions de cette variante
      setVariantReductions(prev => {
        const newReductions = { ...prev };
        // Supprimer toutes les clés qui commencent par "variantIdx:"
        Object.keys(newReductions).forEach(key => {
          if (key.startsWith(`${variantIdx}:`)) {
            delete newReductions[key];
          }
        });
        return newReductions;
      });

      // 7️⃣ Mettre à jour les variants en supprimant toutes les données de réduction
      setVariants(prev => prev.map(v => {
        if (v.idx === variantIdx) {
          const updatedVariant = { ...v };
          updatedVariant.reduction_percentage = 0;
          updatedVariant.discount_map = {};
          return updatedVariant;
        }
        return v;
      }));

      console.log('🎉 [REMOVE-VARIANT-PROMO] Suppression complète terminée');

      toast({
        title: "Réductions supprimées",
        description: `Toutes les réductions de ${variant.label} ont été supprimées et désactivées dans Stripe.`
      });
    } catch (error) {
      console.error("❌ [REMOVE-VARIANT-PROMO] Erreur lors de la suppression des réductions:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer les réductions. Vérifiez la console pour plus de détails."
      });
    }
  };

  const handleAddSpecification = () => {
    if (!product) return;
    const newSpec = { name: "Nouvelle caractéristique", value: "Nouvelle valeur" };
    const updatedSpecs = [...(product.specifications || []), newSpec];
    setProduct({ ...product, specifications: updatedSpecs });
  };

  const handleRemoveSpecification = async (indexToRemove: number) => {
    if (!product) return;

    const originalSpecs = [...(product.specifications || [])];
    const newSpecs = originalSpecs.filter((_, index) => index !== indexToRemove);

    setProduct({ ...product, specifications: newSpecs }); // Optimistic update

    try {
      const allSpecKeysForProductQuery = supabase
        .from('editable_content')
        .select('content_key')
        .like('content_key', `product_${product.id}_specification_%`);
      
      const { data: allSpecKeysForProduct, error: queryError } = await allSpecKeysForProductQuery;

      if (queryError) throw queryError;

      const keysToDelete = allSpecKeysForProduct.map(k => k.content_key);

      if (keysToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('editable_content')
          .delete()
          .in('content_key', keysToDelete);
        if (deleteError) throw deleteError;
      }

      const newContentToUpsert = newSpecs.flatMap((spec, index) => [
        { content_key: generateContentKey(product.id, `specification_${index}_name`), content: spec.name },
        { content_key: generateContentKey(product.id, `specification_${index}_value`), content: spec.value }
      ]);
      
      if (newContentToUpsert.length > 0) {
        const { error: upsertError } = await supabase.from('editable_content').upsert(newContentToUpsert);
        if (upsertError) throw upsertError;
      }

      toast({ title: "Caractéristique supprimée", description: "La liste des caractéristiques a été mise à jour." });
    } catch (error) {
      console.error("Erreur lors de la synchronisation de la suppression de la caractéristique:", error);
      toast({
        variant: "destructive",
        title: "Erreur de synchronisation",
        description: "La caractéristique n'a pas pu être supprimée du serveur. L'interface est mise à jour.",
      });
      setProduct(prev => ({ ...prev, specifications: originalSpecs })); // Rollback
    }
  };

  // Construction de l'objet SEO, maintenant que `product` est garanti d'exister.
  const productSeoData = {
    name: product.title,
    price: computedPrice.toFixed(2),
    description: product.description?.replace(/<[^>]+>/g, '') || "Découvrez ce produit sur Aqua Rêve.",
    image: extraImages[0] || product.image,
    sku: product.id,
    brand: brand?.name || "Marque inconnue",
    availability: ((product.stock ?? 0) > 0 ? "InStock" : "OutOfStock") as "InStock" | "OutOfStock",
    review: {
      ratingValue: productReviewAverage?.toFixed(1) || "0",
      reviewCount: productReviewCount.toString(),
    },
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={product?.title || "Produit"}
        description={product?.description || "Découvrez ce produit sur aqua rêve"}
        image={product?.image || "/og-image.png"}
        url={typeof window !== "undefined" ? window.location.href : undefined}
        type="product"
        product={product && {
          name: product.title,
          price: product.price?.toString(),
          description: product.description,
          image: product.image || "/og-image.png",
          sku: product.reference,
          brand: brand?.name || "Marque inconnue",
          availability: product.stock && product.stock > 0 ? "InStock" : "OutOfStock",
          review: product.averageRating && product.reviewCount ? {
            ratingValue: product.averageRating.toString(),
            reviewCount: product.reviewCount.toString()
          } : undefined
        }}
      />
      {/* --- BREADCRUMB JSON-LD POUR GOOGLE --- */}
      {breadcrumbCategory && product && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              ...(breadcrumbCategory.parent ? [{
                "@type": "ListItem",
                position: 1,
                name: breadcrumbCategory.parent.name,
                item: `${typeof window !== 'undefined' ? window.location.origin : ''}/categories/${breadcrumbCategory.parent.slug}`
              }] : []),
              ...(breadcrumbCategory.current ? [{
                "@type": "ListItem",
                position: 2,
                name: breadcrumbCategory.current.name,
                item: `${typeof window !== 'undefined' ? window.location.origin : ''}/categories/${breadcrumbCategory.parent?.slug || breadcrumbCategory.current.slug}?souscategorie=${breadcrumbCategory.current.slug}`
              }] : []),
              {
                "@type": "ListItem",
                position: 3,
                name: product.title,
                item: typeof window !== 'undefined' ? window.location.href : ''
              }
            ]
          })}
        </script>
      )}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": product?.title,
          "image": [product?.image || "/og-image.png"],
          "description": product?.description,
          "sku": product?.reference,
          "brand": {
            "@type": "Brand",
            "name": product?.brand
          },
          "offers": {
            "@type": "Offer",
            "priceCurrency": "EUR",
            "price": product?.price,
            "availability": product?.stock && product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "url": typeof window !== "undefined" ? window.location.href : ""
          }
        })}
      </script>

      <Header />
      {isEditMode && <FloatingHeader />}
      
      {/* Debug Panel en mode admin */}
      {isEditMode && (
        <div className="container mx-auto px-4 py-2">
          <DebugPanel 
            product={product}
            productId={getProductIdFromQuery()}
            fetchStatus={fetchStatus}
          />
        </div>
      )}
      
      {/* Simple Breadcrumb Navigation */}
      <div className="bg-gray-100 py-3">
        <div className="container mx-auto px-4">
          <Breadcrumb>
            <BreadcrumbList>
              {/* Commencer le fil d'Ariane au niveau du parent uniquement */}
              {breadcrumbCategory?.parent && (
                    <>
                      <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                      <Link to={`/categories/${breadcrumbCategory.parent.slug}`}>
                        {breadcrumbCategory.parent.name}
                          </Link>
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                    </>
                  )}
                  
              {breadcrumbCategory?.current && (
                <>
                  {breadcrumbCategory?.parent && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to={`/categories/${breadcrumbCategory.parent?.slug || breadcrumbCategory.current.slug}?souscategorie=${breadcrumbCategory.current.slug}`}
                      >
                        {breadcrumbCategory.current.name}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {product.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          {/* Debug info pour le fil d'Ariane */}
          {isEditMode && (
            <pre className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded border">
              [DEBUG] Fil d'Ariane :<br />
              Catégorie : {breadcrumbCategory?.current?.name}<br />
              Parent : {breadcrumbCategory?.parent?.name}<br />
              Grand-parent : {breadcrumbCategory?.grandParent?.name}
            </pre>
          )}
        </div>
      </div>
      
      {/* Product Information */}
      <main className="container mx-auto px-4 py-8">
        {/* Product Details - 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Left Column - Image */}
          <div className="bg-white rounded-lg shadow-md p-4">
            {/* Image principale (galerie) */}
            {selectedImage ? (
              <div className="relative">
                {/* Badge DDM prioritaire sur promo */}
                {product.ddmExceeded && product.ddmDate ? (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg z-30 border border-orange-700 pointer-events-none animate-pulse">
                      DDM DÉPASSÉE
                    </span>
                </div>
                ) : hasDiscount ? (
                  <PromoBadge />
                ) : null}
                <img
                  src={selectedImage}
                  alt={product.title}
                  width={300}
                  height={300}
                  decoding="async"
                  style={{ objectFit: 'contain' }}
                  className="w-full h-auto object-contain mx-auto max-h-[400px] rounded-lg border border-gray-200 shadow mb-4"
                />
              </div>
            ) : (
              <div className="w-full h-[300px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 mb-4">
                <span className="text-gray-400">Aucune image</span>
              </div>
            )}

            {/* Carrousel de miniatures */}
            {extraImages.length > 0 && (
              <div className="relative flex items-center">
                {/* Flèche gauche */}
                <button
                  type="button"
                  className="absolute left-0 z-10 h-10 w-10 flex items-center justify-center bg-white/80 hover:bg-white/100 rounded-full shadow border transition-all hover:scale-105 backdrop-blur text-gray-700"
                  style={{ transform: 'translateX(-50%)' }}
                  onClick={() => scrollThumbnails('left')}
                  tabIndex={-1}
                >
                  <ChevronLeft size={20} />
                </button>
                {/* Thumbnails */}
                <div
                  ref={thumbnailsRef}
                  className="flex gap-2 overflow-x-auto px-10 py-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {extraImages.map((url, index) => (
                    <div key={index} className="relative group flex-shrink-0">
                      <img
                        src={url}
                        alt={`Image ${index + 1}`}
                        width={80}
                        height={80}
                        loading="lazy"
                        decoding="async"
                        style={{ objectFit: 'contain' }}
                        className={`h-20 w-20 object-cover rounded border-2 shadow cursor-pointer transition-all duration-150 ${selectedImage === url ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'}`}
                        onClick={() => setSelectedImage(url)}
                      />
                      {isEditMode && (
                        <button
                          onClick={async () => {
                            // Supprime l'image du storage
                            const filePath = url.split('/storage/v1/object/public/site-images/')[1];
                            if (filePath) {
                              const { error: delError } = await supabase.storage.from('site-images').remove([filePath]);
                              console.log('[LOG] Suppression du fichier storage:', filePath, delError);
                            }
                            // Supprime la clé editable_content
                            const contentKey = `product_${product.id}_image_${index}`;
                            const { error: dbError } = await supabase.from('editable_content').delete().eq('content_key', contentKey);
                            console.log('[LOG] Suppression clé editable_content:', contentKey, dbError);
                            // Met à jour le state local
                            let newImages = [...extraImages];
                            newImages.splice(index, 1);
                            // Réindexe les clés editable_content restantes
                            for (let i = 0; i < newImages.length; i++) {
                              const expectedKey = `product_${product.id}_image_${i}`;
                              const currentKey = `product_${product.id}_image_${extraImages.indexOf(newImages[i])}`;
                              if (expectedKey !== currentKey) {
                                // Met à jour la clé dans la base
                                await supabase.from('editable_content')
                                  .update({ content_key: expectedKey })
                                  .eq('content_key', currentKey);
                                console.log('[LOG] Réindexation clé:', currentKey, '->', expectedKey);
                              }
                            }
                            setExtraImages(newImages);
                            // Si l'image supprimée était sélectionnée, sélectionne la suivante
                            if (selectedImage === url) {
                              setSelectedImage(newImages[0] || product.image || null);
                            }
                          }}
                          className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full px-1 py-0.5 shadow opacity-80 hover:opacity-100"
                          title="Supprimer l'image"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {/* Flèche droite */}
                <button
                  type="button"
                  className="absolute right-0 z-10 h-10 w-10 flex items-center justify-center bg-white/80 hover:bg-white/100 rounded-full shadow border transition-all hover:scale-105 backdrop-blur text-gray-700"
                  style={{ transform: 'translateX(50%)' }}
                  onClick={() => scrollThumbnails('right')}
                  tabIndex={-1}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            {/* Bouton ajout image (mode édition uniquement) */}
            {isEditMode && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={async () => {
                  console.log("[LOG] Début du processus d'upload");
                  
                  // Créer un input file caché
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) {
                      console.log("[LOG] Aucun fichier sélectionné");
                      return;
                    }

                    console.log("[LOG] Fichier sélectionné:", {
                      name: file.name,
                      type: file.type,
                      size: file.size
                    });

                    try {
                      // Générer un nom de fichier unique dans le dossier produits/<product.id>/
                      const fileName = `${Date.now()}_${file.name}`;
                      const filePath = `produits/${product.id}/${fileName}`;
                      console.log("[LOG] Chemin d'upload généré:", filePath);

                      // Upload vers Supabase Storage dans le bucket site-images
                      console.log("[LOG] Début upload vers bucket 'site-images'...");
                      const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('site-images')
                        .upload(filePath, file, {
                          cacheControl: '3600',
                          upsert: false
                        });
                      console.log("[LOG] Résultat upload:", uploadData, uploadError);

                      if (uploadError) {
                        console.error("[LOG] Erreur d'upload détaillée:", {
                          message: uploadError.message,
                          name: uploadError.name,
                          error: uploadError
                        });
                        throw uploadError;
                      }

                      // Récupérer l'URL publique depuis site-images
                      console.log("[LOG] Récupération de l'URL publique pour:", filePath);
                      const { data: publicUrlData } = supabase.storage
                        .from('site-images')
                        .getPublicUrl(filePath);
                      console.log("[LOG] Résultat getPublicUrl:", publicUrlData);

                      // getPublicUrl doesn't return errors in the new Supabase client version
                      if (!publicUrlData) {
                        console.error("[LOG] Erreur lors de la récupération de l'URL publique");
                        throw new Error("Failed to get public URL");
                      }

                      const publicUrl = publicUrlData.publicUrl;
                      console.log("[LOG] URL publique obtenue:", publicUrl);

                      // Sauvegarder la référence dans editable_content
                      const index = extraImages.length;
                      const contentKey = `product_${product.id}_image_${index}`;
                      console.log("[LOG] Insertion dans editable_content:", { contentKey, publicUrl });
                      const { error: insertError } = await supabase.from('editable_content').insert({
                        content_key: contentKey,
                        content: publicUrl
                      });
                      console.log("[LOG] Résultat insertion editable_content:", insertError);

                      if (insertError) {
                        console.error("[LOG] Erreur lors de la sauvegarde dans editable_content:", insertError);
                        throw insertError;
                      }

                      // Mettre à jour l'état
                      setExtraImages([...extraImages, publicUrl]);
                      console.log("[LOG] État mis à jour avec la nouvelle image");
                      toast({
                        title: "Image ajoutée",
                        description: "L'image a été uploadée avec succès."
                      });
                    } catch (error) {
                      console.error("[LOG] Erreur complète:", error);
                      toast({
                        variant: "destructive",
                        title: "Erreur",
                        description: "Impossible d'uploader l'image. Veuillez réessayer."
                      });
                    }
                  };

                  input.click();
                  console.log("[LOG] Sélecteur de fichiers ouvert");
                }}
              >
                + Ajouter une image
              </Button>
            )}
          </div>
          
          {/* Right Column - Details */}
          <div className="flex flex-col space-y-4">
            {/* Titre et Marque */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-2xl font-bold">
              {isEditMode ? (
                <EditableText
                  contentKey={generateContentKey(product.id, 'title')}
                  initialContent={product.title}
                  onUpdate={(newText) => handleTextUpdate(newText, generateContentKey(product.id, 'title'))}
                />
              ) : (
                product.title
              )}
            </h2>
            
              {/* Note moyenne */}
              <ProductReviewSummary productId={product.id} />
              
              <div className="flex items-center gap-3">
                {brandsLoading ? (
                  <div className="animate-pulse bg-gray-200 h-6 w-24 rounded"></div>
                ) : isEditMode ? (
                  <div className="flex items-center gap-2">
                    <select
                      className="bg-white border border-gray-300 rounded-lg px-3 py-1 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={brand?.id || ''}
                      onChange={async (e) => {
                        const brandId = e.target.value;
                        try {
                          await supabase
                            .from('product_brands')
                            .delete()
                            .eq('product_id', product.id);
                          
                          if (brandId) {
                            await supabase
                              .from('product_brands')
                              .insert({
                                product_id: product.id,
                                brand_id: brandId
                              });
                          }
                          
                          const selectedBrand = brands.find(b => b.id === brandId);
                          setBrand(selectedBrand || null);
                          
                          toast({
                            title: "Marque mise à jour",
                            description: "La marque du produit a été mise à jour avec succès."
                          });
                        } catch (err) {
                          console.error("Erreur lors de la mise à jour de la marque:", err);
                          toast({
                            variant: "destructive",
                            title: "Erreur",
                            description: "Impossible de mettre à jour la marque. Veuillez réessayer."
                          });
                        }
                      }}
                    >
                      <option value="">Sélectionner une marque</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : brand ? (
                  <Badge variant="secondary" className="text-sm font-medium px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 shadow-sm hover:bg-blue-100 transition-colors duration-200">
                    {brand.name}
                  </Badge>
                ) : null}
              </div>
              {/* Logos Eau Douce/Mer */}
              <div className="flex items-center gap-3">
              {product.show_logo_eaudouce === "true" && globalLogos.eauDouce && (
                <img
                  src={globalLogos.eauDouce}
                  alt="Logo Eau Douce"
                    className="h-12 w-12 object-contain rounded-full bg-white border border-gray-200 shadow"
                />
              )}
              {product.show_logo_eaudemer === "true" && globalLogos.eauMer && (
                <img
                  src={globalLogos.eauMer}
                  alt="Logo Eau de Mer"
                    className="h-12 w-12 object-contain rounded-full bg-white border border-gray-200 shadow"
                />
              )}
            </div>
            </div>
            
            {/* Prix et Stock */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-3">
                {hasDiscount ? (
                  <>
                    <span className="text-3xl font-bold text-slate-900">{computedPrice.toFixed(2)} €</span>
                    <span className="text-xl line-through text-gray-400">{originalPrice.toFixed(2)} €</span>
                    <Badge variant="destructive" className="text-sm">
                      -{Math.round(((originalPrice - computedPrice) / originalPrice) * 100)}%
                    </Badge>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-slate-900">{computedPrice.toFixed(2)} €</span>
                )}
              </div>
              {/* Section DDM informative SOUS le prix, bien visible, sans casser la disposition */}
              {product.ddmExceeded && product.ddmDate && (
                <div className="mt-2 bg-orange-50 border border-orange-200 rounded px-4 py-2 text-sm text-orange-900 max-w-xs">
                  <b>Déstockage DDM :</b><br />
                  Ce produit est proposé en déstockage car sa Date de Durabilité Minimale (DDM) est fixée au <b>{new Date(product.ddmDate).toLocaleDateString()}</b>.<br />
                  Il reste parfaitement consommable et sans danger pour vos poissons, conformément à la réglementation.
                </div>
              )}
              {/* Stock badge stylisé */}
              {(() => {
                const stock = getSupabaseStock();
                return (
                  <div>
                    {stock > 3 ? (
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full shadow-sm whitespace-nowrap">
                        En stock&nbsp;({stock})
                      </span>
                    ) : stock > 0 ? (
                      <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full shadow-sm whitespace-nowrap">
                        Bientôt épuisé&nbsp;({stock})
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full shadow-sm whitespace-nowrap">
                        ❌ Rupture de stock
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
            
            {/* Sélecteurs de variantes */}
            {variants.length > 0 && (
              <div className="space-y-4">
                {variants.map((variant, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <label className="font-medium min-w-[80px]">{variant.label}</label>
                    <select
                      className="bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={selectedVariants[variant.label] || (variant.options[0] || '')}
                      onChange={e => setSelectedVariants(v => ({ ...v, [variant.label]: e.target.value }))}
                    >
                      {variant.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Compteur de quantité */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="border px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                disabled={quantity <= 1}
                aria-label="Diminuer la quantité"
              >–</button>
              <span className="min-w-[24px] text-center select-none">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="border px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                disabled={(() => {
                  const stock = getSupabaseStock();
                  return stock !== null && quantity >= stock;
                })()}
                aria-label="Augmenter la quantité"
              >+</button>
            </div>
            
            {/* Boutons d'action */}
            <div className="flex gap-3">
              <Button onClick={handleAddToCart} className="flex-grow">
                <ShoppingCart className="mr-2" size={18} />
                Ajouter au panier
              </Button>
              <Button 
                variant="outline"
                size="icon" 
                onClick={() => {
                  // Ouvrir la roue directement
                  const wheelButton = document.querySelector('[data-wheel-button]') as HTMLElement;
                  if (wheelButton) {
                    wheelButton.click();
                  }
                }}
                aria-label="Tenter votre chance à la roue aquatique"
                title="🎡 Tentez votre chance à la roue aquatique !"
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
              >
                🎡
              </Button>
              <Button 
                variant={isFavorite ? "default" : "outline"} 
                size="icon" 
                onClick={handleToggleFavorite} 
                aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                <Heart 
                  fill={isFavorite ? "#fff" : "none"} 
                  stroke={isFavorite ? "#0074b3" : "#cbd5e1"} 
                  className={isFavorite ? "text-[#0074b3]" : "text-gray-400"} 
                />
              </Button>
            </div>
            
            {/* Quick Info */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="flex items-start gap-2 mb-4">
                <CircleDot className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Livraison gratuite à partir de 35€</span>
              </div>
              <div className="flex items-start gap-2 mb-4">
                <CircleDot className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Sélection des meilleures marques</span>
              </div>
              <div className="flex items-start gap-2">
                <CircleDot className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Expédition sous 48h</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs: Description, Specifications and Debug */}
        <div className="mb-12">
          <Tabs defaultValue="description" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="specifications">Caractéristiques</TabsTrigger>
              {isEditMode && (
                <>
              <TabsTrigger value="debug">🛠 Debug</TabsTrigger>
                  <TabsTrigger value="stripe">🚀 Stripe</TabsTrigger>
                  <TabsTrigger value="debug-similar">🐞 Debug Catégories similaires</TabsTrigger>
                  <TabsTrigger value="debug-stock">📦 Stock</TabsTrigger>
                </>
              )}
            </TabsList>
            
            <TabsContent value="description" className="p-4 bg-white rounded-lg shadow-sm">
              <div className="prose max-w-none">
                {isEditMode ? (
                  <EditableText
                    contentKey={generateContentKey(product.id, 'description')}
                    initialContent={product.description}
                    onUpdate={(newText) => handleTextUpdate(newText, generateContentKey(product.id, 'description'))}
                  />
                ) : (
                  product.description?.replace(/&nbsp;|\s/g, '') ? (
                    <div
                      className="whitespace-pre-line"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  ) : (
                    <p className="italic text-gray-400">Aucune description définie.</p>
                  )
                )}
                
                {/* Bloc de débogage amélioré */}
                {isEditMode && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 mt-6 text-sm text-gray-700 rounded">
                    <strong>🛠 Debug Description</strong><br />
                    <span className="block mt-1"><strong>Clé générée :</strong> {generateContentKey(product.id, 'description')}</span>
                    <span className="block mt-1"><strong>ID produit :</strong> {product.id}</span>
                    <span className="block mt-1"><strong>Contenu brut :</strong> {JSON.stringify(product.description)}</span>
                    <span className="block mt-1"><strong>Contenu nettoyé :</strong> {product.description?.replace(/&nbsp;|\s/g, '') || 'vide'}</span>
                    <span className="block mt-1"><strong>Affiché ? :</strong> {product.description?.replace(/&nbsp;|\s/g, '') ? '✅ OUI' : '❌ NON'}</span>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="specifications" className="p-4 bg-white rounded-lg shadow-sm">
              {/* Header grid */}
              
              {/* Grid des caractéristiques */}
              <div className="rounded-lg border overflow-hidden">
                {product.specifications?.map((spec, index) => (
                  <div
                    key={index}
                    className={
                      `grid ${isEditMode ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-2'} items-center text-sm text-gray-700 ` +
                      (index % 2 === 0 ? "bg-gray-50" : "bg-white") +
                      " border-b last:border-b-0"
                    }
                  >
                    <div className="font-semibold py-3 px-4">
                      {isEditMode ? (
                        <EditableText
                          contentKey={generateContentKey(product.id, `specification_${index}_name`)}
                          initialContent={spec.name}
                          onUpdate={(newText) => handleTextUpdate(newText, generateContentKey(product.id, `specification_${index}_name`))}
                        />
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: spec.name }} />
                      )}
                    </div>
                    <div className="py-3 px-4">
                      {isEditMode ? (
                        <EditableText
                          contentKey={generateContentKey(product.id, `specification_${index}_value`)}
                          initialContent={spec.value}
                          onUpdate={(newText) => handleTextUpdate(newText, generateContentKey(product.id, `specification_${index}_value`))}
                        />
                      ) : (
                        <span dangerouslySetInnerHTML={{ __html: spec.value }} />
                      )}
                    </div>
                    {isEditMode && (
                        <div className="pr-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveSpecification(index)}
                                title="Supprimer la caractéristique"
                            >
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    )}
                  </div>
                ))}
              </div>

              {isEditMode && (
                <div className="mt-4">
                  <Button onClick={handleAddSpecification}>
                    Ajouter une caractéristique
                  </Button>
                </div>
              )}

              {isEditMode && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-2">Variantes</h4>
                  <table className="w-full text-sm border rounded">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-2 text-left">Label</th>
                        <th className="p-2 text-left">Options (CSV)</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">
                            <input
                              type="text"
                              className="border rounded px-2 py-1 w-full"
                              value={variant.label}
                              onChange={e => setVariants(v => v.map((v, i) => i === idx ? { ...v, label: e.target.value } : v))}
                              placeholder="Label"
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex flex-col gap-1">
                              {/* Liste des options déjà ajoutées */}
                              <div className="flex flex-wrap gap-2 mb-1">
                                {variant.options.map((opt, oIdx) => (
                                  <span key={oIdx} className="inline-flex items-center bg-gray-100 border rounded px-2 py-0.5 text-xs">
                                    {opt}
                                    <button
                                      className="ml-1 text-red-500 hover:text-red-700"
                                      onClick={async () => {
                                        const priceKey = `product_${product.id}_variant_${idx}_option_${opt}_stripe_discount_price_id`;
                                        const { data: existing } = await supabase
                                          .from('editable_content')
                                          .select('content')
                                          .eq('content_key', priceKey)
                                          .single();

                                        if (existing?.content) {
                                          // Supprimer dans Stripe (désactiver)
                                          const {
                                            data: { session },
                                            error: sessionError
                                          } = await supabase.auth.getSession();

                                          const token = session?.access_token;

                                          if (!token) {
                                            console.error("❌ Aucun token utilisateur trouvé.");
                                            setStripeLogs(prev => [...prev, '[SYNC-STRIPE] ❌ Erreur: Aucun token utilisateur trouvé']);
                                            return;
                                          }

                                          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stripe-variant?priceId=${existing.content}`, {
                                            method: 'DELETE',
                                            headers: {
                                              'Authorization': `Bearer ${token}`
                                            }
                                          });
                                          // Optionnel : log Stripe
                                          try {
                                            const text = await res.text();
                                            const data = JSON.parse(text);
                                            if (data?.logs) setStripeLogs(prev => [...prev, ...data.logs]);
                                          } catch {}
                                        }

                                        // Supprimer localement dans Supabase
                                        await supabase.from('editable_content').delete().eq('content_key', priceKey);

                                        // Supprimer du state local
                                        setVariants(prev =>
                                          prev.map(v =>
                                            v.idx === idx
                                              ? { ...v, options: v.options.filter(o => o !== opt) }
                                              : v
                                          )
                                        );
                                      }}
                                      title="Supprimer cette option"
                                      type="button"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                              </div>
                              {/* Champ d'ajout d'option */}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  className="border rounded px-2 py-1 flex-1"
                                  value={optionInputs[idx] || ''}
                                  onChange={e => setOptionInputs(inputs => {
                                    const newInputs = [...inputs];
                                    newInputs[idx] = e.target.value;
                                    return newInputs;
                                  })}
                                  placeholder="Nouvelle option"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  onClick={() => {
                                    const val = (optionInputs[idx] || '').trim();
                                    if (!val) return;
                                    setVariants(v => v.map((v, i) => i === idx ? { ...v, options: [...v.options, val] } : v));
                                    setOptionInputs(inputs => {
                                      const newInputs = [...inputs];
                                      newInputs[idx] = '';
                                      return newInputs;
                                    });
                                  }}
                                >Ajouter</Button>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 flex gap-2 items-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                // Empêche la sauvegarde si idx ou label est vide
                                if (typeof idx !== 'number' || isNaN(idx)) {
                                  toast({ variant: "destructive", title: "Erreur", description: "L'index de la variante est invalide." });
                                  return;
                                }
                                // Toujours sauvegarder label, options, idx et price_map
                                const { error } = await supabase.from('editable_content').upsert([
                                  { content_key: `product_${product.id}_variant_${idx}_idx`, content: idx },
                                  { content_key: `product_${product.id}_variant_${idx}_label`, content: variant.label || '' },
                                  { content_key: `product_${product.id}_variant_${idx}_options`, content: (variant.options || []).join('/') },
                                  { content_key: `product_${product.id}_variant_${idx}_price_map`, content: JSON.stringify(variant.price_map || {}) },
                                ], { onConflict: 'content_key' });
                                if (error) {
                                  toast({ variant: "destructive", title: "Erreur Supabase", description: error.message });
                                  console.error("❌ Erreur Supabase upsert variante:", error);
                                } else {
                                  toast({ title: 'Variante sauvegardée', description: `Variante ${variant.label || idx + 1} enregistrée.` });
                                  // ... (reste du code inchangé)
                                }
                              }}
                            >
                              💾 Sauvegarder
                            </Button>
                            <button
                              className="text-red-600 hover:text-red-800"
                              onClick={async () => {
                                const variantToDelete = variants[idx];
                                // Supprimer les Price Stripe liés
                                for (const opt of variantToDelete.options) {
                                  const comboKey = `${variantToDelete.label}:${opt}`;
                                  const { data } = await supabase
                                    .from('editable_content')
                                    .select('content')
                                    .eq('content_key', `product_${product.id}_variant_${idx}_option_${opt}_stripe_discount_price_id`)
                                    .single();
                                  const priceId = data?.content;
                                  if (priceId) {
                                    try {
                                      const {
                                        data: { session },
                                        error: sessionError
                                      } = await supabase.auth.getSession();

                                      const token = session?.access_token;

                                      if (!token) {
                                        console.error("❌ Aucun token utilisateur trouvé.");
                                        setStripeLogs(prev => [...prev, '[SYNC-STRIPE] ❌ Erreur: Aucun token utilisateur trouvé']);
                                        return;
                                      }

                                      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stripe-variant`, {
                                        method: 'DELETE',
                                        headers: {
                                          'Authorization': `Bearer ${token}`
                                        }
                                      });
                                      const json = await res.json();
                                      console.log('[🧾 Stripe] Suppression Price', priceId, json);
                                      if (json?.logs) setStripeLogs(prev => [...prev, ...json.logs]);
                                    } catch (err) {
                                      console.error('[❌ Stripe] Échec suppression price', priceId, err);
                                    }
                                  }
                                  // Supprimer le price_id dans Supabase
                                  await supabase.from('editable_content').delete().eq('content_key', `product_${product.id}_variant_${idx}_option_${opt}_stripe_discount_price_id`);
                                }
                                // Supprimer toutes les clés liées à la variante
                                await supabase.from('editable_content').delete().eq('content_key', `product_${product.id}_variant_${idx}_label`);
                                await supabase.from('editable_content').delete().eq('content_key', `product_${product.id}_variant_${idx}_options`);
                                await supabase.from('editable_content').delete().eq('content_key', `product_${product.id}_variant_${idx}_price_map`);
                                await supabase.from('editable_content').delete().eq('content_key', `product_${product.id}_variant_${idx}_idx`);
                                setVariants(v => v.filter((_, i) => i !== idx));
                              }}
                              title="Supprimer la variante"
                              type="button"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {/* Ligne vide pour ajout rapide */}
                      <tr>
                        <td colSpan={3} className="p-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const idx = variants.length;
                              await supabase.from('editable_content').upsert([
                                { content_key: `product_${product.id}_variant_${idx}_label`, content: '' },
                                { content_key: `product_${product.id}_variant_${idx}_options`, content: '' },
                                { content_key: `product_${product.id}_variant_${idx}_idx`, content: idx.toString() }
                              ]);
                              setVariants(v => [...v, { idx, label: '', options: [], price_map: {} }]);
                            }}
                          >
                            + Ajouter une variante
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* UI édition des prix par combinaison (dans le tableau de variantes, mode admin) */}
              {isEditMode && variants.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-semibold mb-2">Prix par combinaison</h5>
                  {variants.map((variant, vIdx) => (
                    <div key={vIdx} className="mb-4">
                      <div className="font-medium mb-1">{variant.label}</div>
                      {variant.options.length > 0 && (
                        <table className="w-full text-sm border rounded">
                          <thead>
                            <tr className="bg-gray-50">
                              {variants.slice(0, vIdx + 1).map((v, i) => (
                                <th key={i} className="p-2 text-left">{v.label}</th>
                              ))}
                              <th className="p-2 text-left">Prix (€)</th>
                              <th className="p-2 text-left">Stock</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Générer toutes les combinaisons jusqu'à ce niveau */}
                            {(() => {
                              // Génère le cartésien des options jusqu'à vIdx inclus
                              const getCombinations = (arr) => arr.reduce((a, b) => a.flatMap(d => b.map(e => [].concat(d, e))), [[]]);
                              const optionArrays = variants.slice(0, vIdx + 1).map(v => v.options);
                              const combos = optionArrays.length > 0 ? getCombinations(optionArrays) : [];
                              return combos.map((combo, cIdx) => {
                                const comboKey = variants.slice(0, vIdx + 1).map((v, i) => `${v.label}:${combo[i]}`).join('|');
                                return (
                                  <tr key={cIdx}>
                                    {combo.map((opt, i) => (
                                      <td key={i} className="p-2">{opt}</td>
                                    ))}
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        step="0.01"
                                        className="border rounded px-2 py-1 w-24"
                                        value={variant.price_map[comboKey] ?? ''}
                                        onChange={e => {
                                          const newPrice = e.target.value === '' ? undefined : Number(e.target.value);
                                          setVariants(vs => vs.map((v, vi) =>
                                            vi === vIdx
                                              ? { ...v, price_map: { ...v.price_map, [comboKey]: newPrice } }
                                              : v
                                          ));
                                        }}
                                        placeholder="Prix"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        min="0"
                                        className="border rounded px-2 py-1 w-20"
                                        value={product.variantStocks?.[comboKey] ?? 0}
                                        onChange={e => {
                                          saveVariantStock(product.id, vIdx, combo[vIdx], e.target.value);
                                        }}
                                        placeholder="Stock"
                                      />
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      )}
                      {/* Bouton sauvegarder le price_map */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={async () => {
                          if (typeof variant.idx !== 'number' || isNaN(variant.idx)) {
                            toast({ variant: "destructive", title: "Erreur", description: "Index de variante invalide." });
                            return;
                          }
                          // Nettoie le price_map pour ne garder que les prix valides (number)
                          const cleanedPriceMap = Object.fromEntries(
                            Object.entries(variant.price_map).filter(([_, v]) => typeof v === 'number' && !isNaN(v))
                          );
                          const { error } = await supabase.from('editable_content').upsert([
                            {
                              content_key: `product_${product.id}_variant_${variant.idx}_price_map`,
                              content: JSON.stringify(cleanedPriceMap)
                            }
                          ], { onConflict: 'content_key' });
                          if (error) {
                            toast({ variant: "destructive", title: "Erreur Supabase", description: error.message });
                          } else {
                            toast({ title: 'Prix sauvegardés', description: `Prix pour ${variant.label} enregistrés.` });
                            // Synchronisation Stripe pour chaque option (1D)
                            for (const opt of variant.options) {
                              const comboKey = `${variant.label}:${opt}`;
                              const price = variant.price_map[comboKey];
                              if (!price || isNaN(price)) continue;
                              try {
                                const {
                                  data: { session },
                                  error: sessionError
                                } = await supabase.auth.getSession();

                                const token = session?.access_token;

                                if (!token) {
                                  console.error("❌ Aucun token utilisateur trouvé.");
                                  setStripeLogs(prev => [...prev, '[SYNC-STRIPE] ❌ Erreur: Aucun token utilisateur trouvé']);
                                  return;
                                }

                                const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-stripe-variant`, {
                                  method: 'POST',
                                  headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                  },
                                  body: JSON.stringify({
                                    stripeProductId: product.id,
                                    label: variant.label,
                                    option: opt,
                                    price: price,
                                    isDiscount: false
                                  })
                                });
                                let data;
                                try {
                                  const text = await res.text();
                                  try {
                                    data = JSON.parse(text);
                                  } catch (e) {
                                    console.error("❌ Impossible de parser JSON :", e);
                                    setStripeLogs(prev => [...prev, '[SYNC-STRIPE] ❌ Erreur JSON: ' + e.message]);
                                    console.error("❌ Contenu reçu (non JSON) :", text);
                                    return;
                                  }
                                } catch (e) {
                                  console.error("❌ Erreur réseau ou fetch:", e);
                                  setStripeLogs(prev => [...prev, '[SYNC-STRIPE] ❌ Erreur réseau: ' + e.message]);
                                  return;
                                }
                                if (data?.logs) {
                                  setStripeLogs(prev => [...prev, ...data.logs]);
                                }
                                if (data && data.priceId) {
                                  // Sauvegarde le priceId Stripe dans Supabase
                                  await supabase.from('editable_content').upsert({
                                    content_key: `product_${product.id}_variant_${variant.idx}_option_${opt}_stripe_discount_price_id`,
                                    content: data.priceId
                                  }, { onConflict: 'content_key' });
                                }
                              } catch (err) {
                                console.error('Erreur lors de la synchronisation Stripe:', err);
                                setStripeLogs(prev => [...prev, `[SYNC-STRIPE] ❌ Erreur: ${err.message}`]);
                              }
                            }
                          }
                        }}
                      >
                        💾 Sauvegarder les prix
                      </Button>
                      
                      {/* Interface de réduction INDIVIDUELLE par option */}
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
                        <h6 className="font-medium text-sm mb-2 text-orange-800">🎯 Réduction par option pour {variant.label}</h6>
                        <div className="space-y-2">
                          {variant.options.map((option, optionIdx) => {
                            const currentReduction = variantReductions[`${variant.idx}:${option}`] || 0;
                            const originalPrice = variant.price_map[`${variant.label}:${option}`];
                            
                            return (
                              <div key={optionIdx} className="flex items-center gap-2 p-2 bg-white rounded border">
                                <span className="font-medium text-sm min-w-16">{option}:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  className="border rounded px-2 py-1 w-16 text-sm"
                                  value={currentReduction}
                                  onChange={(e) => {
                                    const newReduction = Number(e.target.value);
                                    setVariantReductions(prev => ({
                                      ...prev,
                                      [`${variant.idx}:${option}`]: newReduction
                                    }));
                                  }}
                                  placeholder="0"
                                />
                                <span className="text-sm text-gray-600">%</span>
                                {originalPrice && (
                                  <span className="text-xs text-gray-500">
                                    ({originalPrice}€ → {(originalPrice * (1 - currentReduction / 100)).toFixed(2)}€)
                                  </span>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="ml-auto"
                                  onClick={() => saveVariantOptionDiscount(product.id, variant.idx, option, currentReduction)}
                                >
                                  💾
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeAllVariantReductions(product.id, variant.idx)}
                          >
                            🗑️ Supprimer toutes les réductions
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            {isEditMode && (
            <TabsContent value="stripe" className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-bold mb-3">📦 Logs API Stripe</h3>
              {stripeLogs.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Aucun appel Stripe encore effectué.</p>
              ) : (
                <ul className="text-xs space-y-1 max-h-[300px] overflow-auto bg-gray-50 border p-3 rounded">
                  {stripeLogs.map((log, i) => (
                    <li key={i} className="text-gray-700 whitespace-pre-wrap font-mono">{log}</li>
                  ))}
                </ul>
              )}
            </TabsContent>
            )}
            {isEditMode && (
              <TabsContent value="debug-similar">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-sm">
                  <h3 className="font-bold mb-2">🐞 Debug Catégories similaires</h3>
                  <div className="mb-2">
                    <strong>Catégorie sélectionnée (relatedCategory):</strong> {relatedCategory || '(parente par défaut)'}
                  </div>
                  <div className="mb-2">
                    <strong>Catégorie parente du fil d'Ariane:</strong> {breadcrumbCategory?.parent?.id} / {breadcrumbCategory?.parent?.name}
                  </div>
                  <div className="mb-2">
                    <strong>Catégories liées à ce produit:</strong> <pre>{JSON.stringify(allCategories.filter(cat => (breadcrumbCategory?.parent && cat.id === breadcrumbCategory.parent.id) || (relatedCategory && cat.id === relatedCategory)), null, 2)}</pre>
                  </div>
                  <div className="mb-2">
                    <strong>Produits similaires trouvés:</strong> {similarProducts.length}
                    <ul className="list-disc ml-6">
                      {similarProducts.map(p => (
                        <li key={p.id}>
                          <span className="font-mono">{p.id}</span> - {p.title || p.name} (catégories liées: <span className="font-mono">{JSON.stringify(p.categories || [])}</span>)
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mb-2">
                    <strong>Debug complet catégories liées à chaque produit Stripe :</strong>
                    <pre className="overflow-x-auto bg-yellow-100 p-2 rounded text-xs max-h-64">{JSON.stringify(similarProducts.map(p => ({id: p.id, title: p.title || p.name, categories: p.categories})), null, 2)}</pre>
                  </div>
                </div>
            </TabsContent>
            )}
            {isEditMode && (
              <TabsContent value="debug-stock" className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-bold mb-2">📦 Debug Stock</h3>
                <p><strong>ID produit courant :</strong> {product.id}</p>
                
                <div className="mt-4">
                  <p><strong>VariantStocks complets :</strong></p>
                  <pre className="bg-gray-100 p-2 text-sm rounded overflow-x-auto text-xs leading-tight">
                    {JSON.stringify(product.variantStocks, null, 2)}
                  </pre>
                </div>

                <div className="mt-4">
                  <p><strong>Variantes sélectionnées :</strong></p>
                  <pre className="bg-gray-100 p-2 text-sm rounded overflow-x-auto text-xs leading-tight">
                    {JSON.stringify(selectedVariants, null, 2)}
                  </pre>
                </div>

                <div className="mt-4">
                  <p><strong>Clé recherchée :</strong></p>
                  <pre className="bg-gray-100 p-2 text-sm rounded overflow-x-auto text-xs leading-tight">
                    {Object.entries(selectedVariants)
                      .map(([label, value]) => `${label}:${value}`)
                      .join('|')}
                  </pre>
                </div>

                <div className="mt-4">
                  <p><strong>🔍 Analyse détaillée des variantes et options :</strong></p>
                  <ul className="list-disc ml-6 text-xs">
                    {variants.map((variant, vIdx) => (
                      <li key={vIdx}>
                        <b>Variante {vIdx}</b>: label=<code>{variant.label}</code>, options=<code>{JSON.stringify(variant.options)}</code>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <p><strong>🧪 Matching Supabase vs Clé calculée :</strong></p>
                  <ul className="list-disc ml-6 text-xs">
                    {Object.entries(product.variantStocks || {}).map(([key, val], i) => (
                      <li key={i}>
                        <code>{key}</code> =&gt; stock = <b>{val}</b> {key === Object.entries(selectedVariants).map(([label, opt]) => `${label}:${opt}`).join('|') ? '✅ (match)' : ''}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4">
                  <p><strong>Stock trouvé :</strong></p>
                  <pre className="bg-gray-100 p-2 text-sm rounded overflow-x-auto text-xs leading-tight">
                    {(() => {
                      const stock = getSupabaseStock();
                      if (stock === null) {
                        return "❌ Aucun stock trouvé pour cette combinaison";
                      }
                      return stock > 0 ? `✅ ${stock} en stock` : '❌ Rupture de stock';
                    })()}
                  </pre>
                </div>

                {(() => {
                  const key = Object.entries(selectedVariants)
                    .map(([label, value]) => `${label}:${value}`)
                    .join('|');
                  const stock = product.variantStocks?.[key];
                  if (typeof stock === 'undefined') {
                    return (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm">
                        <p className="font-bold text-red-700">⚠️ Clé non trouvée dans variantStocks</p>
                        <p className="text-red-600 mt-1">
                          La clé "{key}" n'existe pas dans l'objet variantStocks.
                          Vérifiez que le lookup_key dans Stripe correspond exactement à ce format.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </TabsContent>
            )}
            {/* Interface de réduction pour produits SANS variantes */}
            {isEditMode && variants.length === 0 && (
              <div className="mt-4">
                <h5 className="font-semibold mb-2">Réduction du produit</h5>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <div className="mb-3">
                    <div className="font-medium text-blue-800 mb-2">Prix original : {product.price?.toFixed(2) || '0.00'} €</div>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className="border rounded px-2 py-1 w-20 text-sm"
                      value={productReduction}
                      onChange={e => setProductReduction(Number(e.target.value))}
                      placeholder="0"
                    />
                    <span className="text-sm">% de réduction</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2 bg-blue-100 hover:bg-blue-200 text-blue-800"
                      onClick={() => saveProductDiscount(product.id, productReduction)}
                    >
                      {productReduction === 0 ? '🗑️ Supprimer réduction' : '💰 Appliquer réduction'}
                    </Button>
                  </div>
                  
                  {/* Aperçu du prix réduit */}
                  {productReduction > 0 && product.price && (
                    <div className="mt-3 p-2 bg-white rounded border">
                      <div className="font-medium text-blue-700 mb-1">Aperçu du prix réduit :</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-red-600">
                          {(product.price * (1 - productReduction / 100)).toFixed(2)} €
                        </span>
                        <span className="line-through text-gray-400">
                          {product.price.toFixed(2)} €
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          -{productReduction}%
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Interface de gestion du stock pour produits SANS variantes */}
            {isEditMode && variants.length === 0 && (
              <div className="mt-4">
                <h5 className="font-semibold mb-2">📦 Gestion du stock</h5>
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <div className="mb-3">
                    <div className="font-medium text-green-800 mb-2">Stock actuel : {product.stock ?? 0} unités</div>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="border rounded px-2 py-1 w-24 text-sm"
                      value={product.stock ?? 0}
                      onChange={e => {
                        const newStock = Number(e.target.value);
                        setProduct(prev => ({ ...prev, stock: newStock }));
                      }}
                      placeholder="0"
                    />
                    <span className="text-sm">unités en stock</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2 bg-green-100 hover:bg-green-200 text-green-800"
                      onClick={() => saveGeneralStock(product.id, String(product.stock ?? 0))}
                    >
                      💾 Sauvegarder stock
                    </Button>
                  </div>
                  
                  {/* Aperçu du statut de stock */}
                  <div className="mt-3 p-2 bg-white rounded border">
                    <div className="font-medium text-green-700 mb-1">Statut de stock :</div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const currentStock = product.stock ?? 0;
                        if (currentStock > 3) {
                          return (
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                              ✅ En stock ({currentStock})
                            </span>
                          );
                        } else if (currentStock > 0) {
                          return (
                            <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                              ⚠️ Bientôt épuisé ({currentStock})
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                              ❌ Rupture de stock
                            </span>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Tabs>
        </div>
        
        {/* Avis clients */}
        {activeTab === "description" && (
          <div className="mb-8">
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Avis clients</h2>
              {productReviewAverage === null && productReviewCount === 0 ? (
                <div className="animate-pulse h-6 w-32 bg-gray-100 rounded mb-2" />
              ) : (
                <Reviews productId={product?.id} />
              )}
            </div>
          </div>
        )}
        
        {/* Dans la même catégorie */}
        {(isEditMode || similarProducts.length > 0) && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Dans la même catégorie</h2>
                {isEditMode && (
                  <div className="mb-0">
                    <label className="font-medium mr-2">Catégorie de référence :</label>
                    <select
                      className="border rounded px-2 py-1"
                      value={relatedCategory || ''}
                      onChange={async (e) => {
                        setRelatedCategory(e.target.value);
                        await supabase.from('editable_content').upsert({
                          content_key: `product_${product.id}_related_category`,
                          content: e.target.value
                        }, { onConflict: 'content_key' });
                      }}
                    >
                      <option value="">(Catégorie parente par défaut)</option>
                      {allCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {getCategoryPath(cat, allCategories)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <Link
                to={`/categories/${relatedCategory || breadcrumbCategory?.parent?.slug || ''}`}
                className="text-blue-600 hover:underline flex items-center text-sm"
              >
                Voir tout
                <ArrowRight size={14} className="ml-1" />
              </Link>
            </div>
            {/* Loader pour produits similaires */}
            {similarProducts.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 items-stretch">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 p-4 shadow-sm bg-white animate-pulse h-64" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 items-stretch">
                {similarProducts.map((prod) => (
                  <Link
                    to={`/produits/${slugify(prod.title || prod.name || 'produit', { lower: true })}?id=${prod.id}`}
                    className="block h-full"
                    key={prod.id}
                  >
                    <div className="rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-200 bg-white flex flex-col gap-2 h-full">
                      <div className="relative">
                        {/* Affichage prioritaire du badge DDM, sinon promo */}
                        {prod.ddmExceeded ? (
                          <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-transparent uppercase absolute top-1 left-1 z-10 text-[10px] px-1.5 py-0.5 rounded shadow-sm">
                            DDM DÉPASSÉE
                          </Badge>
                        ) : prod.hasDiscount ? (
                          <span className="absolute top-1 left-1 z-10 text-[10px] px-1.5 py-0.5 rounded shadow-sm uppercase bg-red-500 text-white border-transparent flex items-center">
                            <PromoBadge />
                          </span>
                        ) : null}
                        <img
                          src={similarProductImages[prod.id] || prod.image || 'https://placehold.co/300x300?text=Image'}
                          alt={prod.name || prod.title}
                          width={300}
                          height={300}
                          loading="lazy"
                          decoding="async"
                          style={{ objectFit: 'contain' }}
                          className="mx-auto h-32 object-contain"
                        />
                      </div>
                      <div className="flex flex-col gap-1 mt-2 flex-grow">
                        <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
                          {prod.name || prod.title}
                        </h3>
                        <ProductReviewSummary productId={prod.id} />
                        <div className="text-lg font-semibold text-gray-800 min-h-[2.5rem] flex items-center">
                          {prod.variantPriceRange ? (
                            `De ${prod.variantPriceRange.min.toFixed(2)} € à ${prod.variantPriceRange.max.toFixed(2)} €`
                          ) : (
                            (() => {
                              const promo = similarProductPromoPrices[prod.id];
                              const isPromo = !!promo && promo.discount_percentage;
                              if (isPromo) {
                                return (
                                  <div className="flex flex-row items-center gap-2">
                                    <span className="text-gray-500 line-through text-sm">{promo.original_price.toFixed(2)}€</span>
                                    <span className="text-red-600 font-bold">{promo.price.toFixed(2)}€</span>
                                    <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">-{promo.discount_percentage}%</span>
                                  </div>
                                );
                              }
                              const price = prod.default_price?.unit_amount 
                                ? (prod.default_price.unit_amount / 100).toFixed(2) 
                                : prod.price 
                                  ? Number(prod.price).toFixed(2) 
                                  : '—';
                              return (
                                <div className="flex flex-row items-center">
                                  <span>{price} €</span>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </div>
                      <button
                        className="mt-auto bg-[#0074b3] text-white py-2 rounded-md hover:bg-[#00639c] transition font-semibold flex items-center justify-center gap-2 w-full"
                        type="button"
                        tabIndex={-1}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // 🎯 AJOUT : Logique d'ajout au panier avec gestion des promotions
                          if (prod.hasVariant) {
                            // Pour les produits avec variantes, rediriger vers la page produit
                            window.location.href = `/produits/${slugify(prod.title || prod.name || 'produit', { lower: true })}?id=${prod.id}`;
                            return;
                          }
                          // Pour les produits sans variante, ajouter directement au panier
                          const { addItem } = useCartStore.getState();
                          const promo = similarProductPromoPrices[prod.id];
                          const isPromo = !!promo && promo.discount_percentage;
                          try {
                            if (isPromo) {
                              await addItem({
                                id: prod.id,
                                title: prod.title || prod.name || 'Produit',
                                price: promo.price,
                                original_price: promo.original_price,
                                discount_percentage: promo.discount_percentage,
                                has_discount: true,
                                image_url: similarProductImages[prod.id] || prod.image || '',
                                quantity: 1,
                                stripe_price_id: promo.stripe_price_id,
                                stripe_discount_price_id: promo.stripe_discount_price_id
                              });
                              toast({
                                title: "Produit ajouté au panier",
                                description: `${prod.title || prod.name} ajouté avec ${promo.discount_percentage}% de réduction !`,
                              });
                            } else {
                              const price = prod.default_price?.unit_amount 
                                ? prod.default_price.unit_amount / 100 
                                : prod.price || 0;
                              await addItem({
                                id: prod.id,
                                title: prod.title || prod.name || 'Produit',
                                price: price,
                                image_url: similarProductImages[prod.id] || prod.image || '',
                                quantity: 1
                              });
                              toast({
                                title: "Produit ajouté au panier",
                                description: `${prod.title || prod.name} ajouté au panier.`,
                              });
                            }
                          } catch (error) {
                            console.error("Erreur ajout au panier:", error);
                            toast({
                              variant: "destructive",
                              title: "Erreur",
                              description: "Impossible d'ajouter le produit au panier."
                            });
                          }
                        }}
                      >
                        {prod.hasVariant ? 'Voir le produit' : (
                          <>
                            <ShoppingCart size={16} />
                            Ajouter
                          </>
                        )}
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* Ajouter le panneau de débogage en mode édition */}
      {isEditMode && product && (
        <EditableDebugPanel productId={product.id} />
      )}
      
      {/* Bouton flottant de la roue pour les pages produit */}
      <FloatingWheelButton />
      
      <Footer />
    </div>
  );
};

// IMPORTANT: Cet export est remplacé automatiquement lors de la génération
export default Modele;