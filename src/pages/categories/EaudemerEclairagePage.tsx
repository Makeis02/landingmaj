// Ajout des types pour les propriétés ajoutées à la fenêtre globale
declare global {
  interface Window {
    DEBUG_PRODUCTS?: ExtendedStripeProduct[];
    DEBUG_DESCRIPTIONS?: Record<string, string>;
  }
}

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CheckCircle, ChevronDown, Filter, Star, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { fetchStripeProducts, StripeProduct } from "@/lib/api/stripe";
import { fetchCategoriesForProducts } from "@/lib/api/product-categories";
import { fetchCategories, Category } from "@/lib/api/categories";
import { fetchBrands, Brand, fetchBrandsForProducts } from "@/lib/api/brands";
import { fetchProductDescriptions } from "@/lib/api/products";
import { EditableText } from "@/components/EditableText";
import { EditableImage } from "@/components/EditableImage";
import { useEditStore } from "@/stores/useEditStore";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import FloatingHeader from "@/components/admin/FloatingHeader";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useCartStore } from "@/stores/useCartStore";
import { Link as RouterLink } from "react-router-dom";
import slugify from 'slugify';
import { EditableDebugPanel } from "@/components/EditableDebugPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PromoBadge from "@/components/PromoBadge";
import { checkMultiplePromotions } from "@/lib/promotions/checkActivePromotion";
import { getPriceIdForProduct } from "@/lib/stripe/getPriceIdFromSupabase";

// Nouvelle version simplifiée de la fonction utilitaire
function getSafeHtmlDescription(description: string | undefined | null) {
  if (!description) return "Description non disponible";

  // Cas où le contenu est HTML encodé (ex: &lt;div&gt;)
  if (description.includes('&lt;') || description.includes('&gt;')) {
    // Décode les entités HTML
    return description
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  return description;
}

// 🔍 Trouve la sous-catégorie à partir du paramètre `souscategorie` dans l'URL ou du slug direct
const findMatchingSubCategory = (subCategories: Category[], slugParam: string): Category | undefined => {
  return subCategories.find(cat => {
    const cleanSlug = cat.slug?.split("?")[0];
    const redirectSlug = cat.redirect_url?.split("souscategorie=")[1];
    return slugParam === cleanSlug || slugParam === redirectSlug;
  });
};

// Type étendu pour les produits Stripe dans cette page
type ExtendedStripeProduct = StripeProduct & {
  // Propriétés optionnelles supplémentaires pour l'affichage
  description?: string;
  onSale?: boolean;
  salePrice?: string;
  averageRating?: number;
  reviewCount?: number;
  hasVariant?: boolean;
  image?: string;
  isInStock?: boolean;
  stock?: number;
  priceRange?: [number, number];
  variantPriceRange?: { min: number, max: number }; // ← AJOUT pour les prix des variantes
  hasDiscount?: boolean; // ← AJOUT pour la détection des promotions
};

// Données de filtres
const filters = {
  price: { min: 0, max: 300 },
  stock: true,
  promos: false,
};

// Types de catégories
const categories = {
  "decorations": {
    title: "Décorations",
    description: "Embellissez votre aquarium avec notre sélection de décorations naturelles et artificielles.",
    bannerImage: "/placeholder.svg"
  },
  "pumps": {
    title: "Pompes & Filtration",
    description: "Solutions de filtration et pompes pour maintenir une eau propre et bien oxygénée.",
    bannerImage: "/placeholder.svg"
  },
  "heating": {
    title: "Chauffages & Ventilation",
    description: "Maintenez la température idéale pour vos espèces aquatiques.",
    bannerImage: "/placeholder.svg"
  },
  "biochemical": {
    title: "Produits Bio-Chimiques",
    description: "Produits de traitement d'eau et solutions pour l'équilibre biologique de votre aquarium.",
    bannerImage: "/placeholder.svg"
  },
  "lighting": {
    title: "Éclairages",
    description: "Systèmes d'éclairage adaptés pour la croissance des plantes et le bien-être des poissons.",
    bannerImage: "/placeholder.svg"
  },
  "maintenance": {
    title: "Entretiens & Nettoyages",
    description: "Accessoires et produits pour l'entretien facile de votre aquarium.",
    bannerImage: "/placeholder.svg"
  },
  "food": {
    title: "Alimentation",
    description: "Nourriture de qualité pour tous types de poissons et invertébrés.",
    bannerImage: "/placeholder.svg"
  },
  "packs": {
    title: "Packs Mensuels",
    description: "Abonnements pratiques pour recevoir régulièrement vos produits essentiels.",
    bannerImage: "/placeholder.svg"
  }
};

// Fonction pour trouver les sous-catégories
const findSubCategories = (allCategories: Category[], parentId: string | null) => {
  return allCategories.filter(cat => cat.parent_id === parentId);
};

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

// Fonction pour récupérer toutes les descriptions Supabase pour une liste de produits
const fetchEditableDescriptions = async (productList) => {
  const ids = productList.map(p =>
    p.id?.toString().startsWith('shopify_')
      ? p.id.toString()
      : `shopify_${getCleanProductId(p.id?.toString() || '')}`
  );
  const keys = ids.map(id => `product_${getCleanProductId(id)}_description`);
  console.log("🔍 Recherche Supabase pour clés:", keys);

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

const fetchMainImages = async (productList) => {
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
  
  // Organiser les stocks par produit pour faciliter la détection
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
      
      // Log détaillé pour debug
      console.log(`📊 Produit ${cleanId} (${originalId})`);
      console.log(`   - Stock de base: ${baseStock}`);
      console.log(`   - Variantes trouvées: ${variantStockKeys.length}`);
      console.log(`   - Valeurs variantes: [${variantStocks.join(', ')}]`);
      console.log(`   - Total stocks: ${allStocks.length}`);
      console.log(`   - En stock?: ${allStocks.some(s => s > 0) ? "✅ OUI" : "❌ NON"}`);
    }
  }
  
  // Test de vérification finale
  console.log("🧪 Test stock final produit:", stockMap);
  
  return stockMap;
};

// Fonction pour enrichir les produits avec la détection des promotions
const enrichProductsWithPromotions = async (products: ExtendedStripeProduct[]): Promise<ExtendedStripeProduct[]> => {
  if (!products || products.length === 0) return products;
  
  try {
    console.log(`🔍 [PROMO-CATEGORY] Recherche réductions pour ${products.length} produits avec nouvelle logique`);
    
    // 🎯 NOUVEAU: Utiliser la fonction utilitaire pour vérifier les promotions actives
    const productIds = products.map(p => p.id);
    const promotionMap = await checkMultiplePromotions(productIds);
    
    console.log(`💰 [PROMO-CATEGORY] Promotions actives détectées:`, Object.keys(promotionMap).filter(id => promotionMap[id]).length);

    // Enrichir les produits avec les données de réductions
    const enrichedProducts = products.map(product => {
      const hasDiscount = promotionMap[product.id] === true;
      
      console.log(`[CHECK-CATEGORY] Produit ${product.id} -> hasDiscount = ${hasDiscount}`);
      
      return {
        ...product,
        onSale: hasDiscount, // Mettre à jour onSale avec la vraie détection
        hasDiscount // Ajouter aussi hasDiscount pour compatibilité
      };
    });

    console.log(`🎉 [PROMO-CATEGORY] Résumé: ${enrichedProducts.filter(p => p.hasDiscount).length}/${enrichedProducts.length} produits en promo`);
    
    return enrichedProducts;
  } catch (error) {
    console.error("Erreur lors de l'enrichissement des produits avec les promotions:", error);
    return products.map(p => ({ ...p, onSale: false, hasDiscount: false }));
  }
};;

// Fonction pour récupérer les price_maps des variantes
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
  
  // Stocker dans localStorage
  data.forEach(item => {
    const { content_key, content } = item;
    if (content && typeof content === 'string') {
      try {
        // Vérifier si c'est un JSON valide avant de stocker
        JSON.parse(content);
        localStorage.setItem(content_key, content);
        console.log(`✅ Price map stocké: ${content_key}`);
      } catch (e) {
        console.error(`❌ Format invalide pour ${content_key}:`, e);
      }
    }
  });
  
  return data.length;
};

// Fonction pour obtenir un emoji basé sur le slug de la catégorie
const getEmojiForCategory = (slug: string) => {
  const normalized = slug.toLowerCase();
  if (normalized.includes("eau-douce") || normalized.includes("eaudouce")) return "🐟";
  if (normalized.includes("eau-de-mer") || normalized.includes("eaudemer")) return "🌊";
  if (normalized.includes("universel")) return "🔄";
  if (normalized.includes("entretien") || normalized.includes("maintenance") || normalized.includes("nettoyage")) return "🧹";
  if (normalized.includes("produits-specifiques") || normalized.includes("produitsspecifiques")) return "🧪";
  if (normalized.includes("pompes") || normalized.includes("filtration")) return "⚙️";
  if (normalized.includes("chauffage") || normalized.includes("ventilation")) return "🔥";
  if (normalized.includes("eclairage")) return "💡";
  if (normalized.includes("alimentation") || normalized.includes("nourriture")) return "🍲";
  if (normalized.includes("sante") || normalized.includes("maladie")) return "💊";
  if (normalized.includes("decoration")) return "✨";
  if (normalized.includes("sol")) return "🏜️";
  if (normalized.includes("aquarium")) return "🏠";
  return "🏷️"; // Emoji par défaut
};

const EaudemerEclairagePage = () => {
  // Nettoyage et normalisation du slug pour éviter les problèmes de comparaison
  const rawSlug = useParams<{ slug: string }>()?.slug || "eaudemerclairage";
  const currentSlug = rawSlug.split("?")[0]; // on enlève les éventuels paramètres
  
  // Ajoute ceci :
  const normalizedSlug = currentSlug.trim().toLowerCase().replace(/\W+/g, "");

  console.log("🔎 currentSlug =", currentSlug);
  console.log("🧽 normalizedSlug =", normalizedSlug);

  // Et modifie les conditions comme ceci :
  const isEauDouce = normalizedSlug.includes("eaudouce");
  const isEauMer = normalizedSlug.includes("eaudemer");
  const isUniversel = normalizedSlug.includes("universel");

  console.log("💧 isEauDouce:", isEauDouce);
  console.log("🌊 isEauMer:", isEauMer);
  console.log("🔁 isUniversel:", isUniversel);
  
  // Test logs
  console.log("🧪 Normalized slug = ", normalizedSlug);
  console.log("🧪 isEauDouce:", isEauDouce);
  console.log("🧪 isEauMer:", isEauMer); 
  console.log("🧪 isUniversel:", isUniversel);
  
  const [searchParams] = useSearchParams();
  const initialSubCategorySlug = searchParams.get("souscategorie");
  console.log("📥 Paramètre 'souscategorie' de l'URL:", initialSubCategorySlug);
   
  const [priceRange, setPriceRange] = useState<number[]>([0, 800]);
  const [priceInput, setPriceInput] = useState<number[]>([0, 800]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [inStock, setInStock] = useState(true);
  const [promoOnly, setPromoOnly] = useState(false);
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  
  // États pour les produits Stripe
  const [products, setProducts] = useState<ExtendedStripeProduct[]>([]);
  const [linkedCategories, setLinkedCategories] = useState<Record<string, string[]>>({});
  const [linkedBrands, setLinkedBrands] = useState<Record<string, string | null>>({});
  const [filteredProducts, setFilteredProducts] = useState<ExtendedStripeProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [productDescriptions, setProductDescriptions] = useState<Record<string, string>>({});
  const [debugLoaded, setDebugLoaded] = useState<boolean>(false);
  
  // Nouvelle état pour les catégories de navigation en haut
  const [headerNavCategories, setHeaderNavCategories] = useState<Category[]>([]);
  // Nouvelle état pour gérer l'affichage complet de la description mobile
  const [showFullDescription, setShowFullDescription] = useState(false);
  // État pour détecter si l'utilisateur est sur un appareil mobile
  const [isMobile, setIsMobile] = useState(false);
  
  // Pour le débogage, afficher les descriptions dans la console à chaque rendu
  useEffect(() => {
    if (!debugLoaded && Object.keys(productDescriptions).length > 0) {
      console.log("🔍 [DEBUG] productDescriptions chargées:", Object.keys(productDescriptions).length);
      console.log("🔑 [DEBUG] Clés des productDescriptions:", Object.keys(productDescriptions));
      setDebugLoaded(true);
    }
  }, [productDescriptions, debugLoaded]);

  // Détecter la taille de l'écran pour la description mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // Ex: 768px pour les écrans md: de Tailwind
    };

    if (typeof window !== 'undefined') { // S'assurer que window est disponible (côté client)
      handleResize(); // Appeler une fois au montage
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Add this near the other state declarations
  const hasAppliedInitialSubCategory = useRef(false);
  
  // Pagination states
  const ITEMS_PER_PAGE = 12; // Ajuste selon ton design
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProducts]);

  // État pour le mode édition et toast notifications
  const { isEditMode } = useEditStore();
  const { toast } = useToast();
  
  // État pour stocker le contenu éditable
  const [categoryTitle, setCategoryTitle] = useState<string>("Éclairage pour Aquarium d'Eau de Mer");
  const [categoryDescription, setCategoryDescription] = useState<string>(
    "Découvrez notre gamme d'éclairages LED et systèmes d'éclairage spécialement conçus pour les aquariums d'eau de mer et récifaux."
  );
  const [categoryBannerImage, setCategoryBannerImage] = useState<string>("/placeholder.svg");
  
  // Obtenir les informations de la catégorie
  const categoryInfo = {
    title: categoryTitle,
    description: categoryDescription,
    bannerImage: categoryBannerImage
  };

  // Log au montage du composant
  useEffect(() => {
    console.log("🔁 CategoryPage monté - slug =", currentSlug);
  }, []);
  
  // Debug useEffect pour confirmer le chargement avec les paramètres URL
  useEffect(() => {
    console.log("📍 CategoryPage chargé avec slug =", currentSlug, "et souscategorie =", initialSubCategorySlug);
  }, [currentSlug, initialSubCategorySlug]);

  // Charger les marques depuis Supabase
  useEffect(() => {
    const loadBrands = async () => {
      try {
        setBrandsLoading(true);
        const brandsData = await fetchBrands();
        setBrands(brandsData);
        setBrandsError(null);
      } catch (err) {
        console.error("Erreur lors du chargement des marques:", err);
        setBrandsError("Impossible de charger les marques.");
      } finally {
        setBrandsLoading(false);
      }
    };

    loadBrands();
  }, []);

  // Charger les produits et les catégories liées
  useEffect(() => {
    console.log("🚀 Début du chargement des produits pour le slug:", currentSlug);
    const loadProductsAndCategories = async () => {
      try {
        setIsLoading(true);
        // Charger tous les produits Stripe
        const allProducts = await fetchStripeProducts();
        const extendedProducts = Array.isArray(allProducts) 
          ? allProducts.map(product => ({
              ...product,
              onSale: false,
              description: "",
              averageRating: 0,
              reviewCount: 0,
              hasVariant: false,
              image: product.image || "/placeholder.svg",
            }))
          : [];
        setProducts(extendedProducts);
        if (extendedProducts.length === 0) {
          setError("Aucun produit disponible.");
          setIsLoading(false);
          return;
        }
        // Charger les catégories liées pour ces produits
        const productIds = extendedProducts.map(p => p.id.toString());
        const categoriesByProduct = await fetchCategoriesForProducts(productIds);
        setLinkedCategories(categoriesByProduct);
        const brandsByProduct = await fetchBrandsForProducts(productIds);
        setLinkedBrands(brandsByProduct);
        const categoriesData = await fetchCategories();
        setAllCategories(categoriesData);
        const parentCategory = categoriesData.find(
          (cat) => cat.slug === currentSlug
        );
        if (!parentCategory) {
          setError("Catégorie non trouvée.");
          setIsLoading(false);
          return;
        }
        setParentCategory(parentCategory);
        const childCategories = findSubCategories(categoriesData, parentCategory.id);
        const cleanedChildCategories = childCategories.map((cat) => ({
          ...cat,
          slug: cat.slug.split("?")[0],
        }));
        setSubCategories(cleanedChildCategories);
        const categoryIds = [parentCategory.id, ...cleanedChildCategories.map(cat => cat.id)].filter(Boolean);
        
        // Logique pour déterminer les catégories de navigation du header
        let mainNavCats: Category[] = [];
        if (parentCategory) {
            if (parentCategory.parent_id) {
                // Si la catégorie actuelle a un parent, trouver son grand-parent
                const grandParent = categoriesData.find(cat => cat.id === parentCategory.parent_id);
                if (grandParent) {
                    // Obtenir tous les enfants du grand-parent
                    const childrenOfGrandparent = categoriesData.filter(cat => cat.parent_id === grandParent.id);
                    mainNavCats = childrenOfGrandparent;
                } else {
                    // Si la catégorie actuelle a un parent mais pas de grand-parent direct, 
                    // cela signifie qu'elle est une enfant de premier niveau.
                    // Dans ce cas, les catégories de navigation devraient être les enfants de son parent.
                    mainNavCats = categoriesData.filter(cat => cat.parent_id === parentCategory.parent_id);
                }
            } else {
                // Si la catégorie actuelle n'a pas de parent, c'est une catégorie racine.
                // On affiche alors ses propres enfants pour la navigation.
                mainNavCats = cleanedChildCategories;
            }
        }
        setHeaderNavCategories(mainNavCats);
        
        // 🔥 Ajoute les images principales Supabase
        const imageMap = await fetchMainImages(extendedProducts);
        let updatedWithImages = extendedProducts.map(p => ({
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
        const priceKeys = productIds.map(id => `product_${getCleanProductId(id)}_variant_0_price_map`);
        const { data: priceData, error: priceMapError } = await supabase
          .from("editable_content")
          .select("content_key, content")
          .in("content_key", priceKeys);

        // Crée un mapping des prix min/max par produit
        const priceMap = {};
        if (!priceMapError && priceData) {
          priceData.forEach(({ content_key, content }) => {
            const id = content_key.replace(/^product_/, "").replace(/_variant_0_price_map$/, "");
            try {
              const parsed = JSON.parse(content);
              const prices = Object.values(parsed).map(v => parseFloat(String(v)));
              if (prices.length > 0) {
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                priceMap[id] = { min, max };
                console.log(`💰 Prix variantes pour ${id}: ${min} - ${max} €`);
              }
            } catch (e) {
              console.warn("Erreur parsing price_map pour", id);
            }
          });
        }
        
        // 💰 Récupère et stocke les price_maps des variantes (localStorage)
        await fetchVariantPriceMaps(productIds);
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

        // Log de débogage final pour confirmer les valeurs d'isInStock
        console.log("🧪 isInStock par produit (debug final):", finalProducts.map(p => ({
          id: p.id,
          title: p.title,
          stock: p.stock,
          isInStock: p.isInStock,
          variantPriceRange: p.variantPriceRange
        })));

        // 🎯 Enrichir les produits avec la détection des promotions
        const productsWithPromotions = await enrichProductsWithPromotions(finalProducts);

        // 🔁 Finalisation de produits avec isInStock, variantPriceRange ET promotions
        setProducts(productsWithPromotions);

        // ✅ Appliquer filtrage MAINTENANT, après setProducts
        const filtered = productsWithPromotions.filter((product) => {
          const productId = product.id;
          const linked = categoriesByProduct[productId] || [];
          const productBrandId = brandsByProduct[productId];
          
          const matchSubCategory = selectedSubCategories.length === 0
            ? linked.some((catId) => categoryIds.includes(catId))
            : linked.some((catId) => selectedSubCategories.includes(catId));
          
          const matchBrand = selectedBrandIds.length === 0
            ? true
            : productBrandId && selectedBrandIds.includes(productBrandId);
          
          const matchPrice = 
            product.price >= priceRange[0] &&
            product.price <= priceRange[1];

          const matchStock = !inStock || product.isInStock;

          // 🎯 Corrigé: utiliser hasDiscount au lieu de onSale pour le filtre promotions
          const matchPromo = !promoOnly || (product.hasDiscount === true);
          
          return matchSubCategory && matchBrand && matchPrice && matchStock && matchPromo;
        });

        setFilteredProducts(filtered);
        setError(null);
      } catch (err) {
        setError("Impossible de charger les produits. Veuillez réessayer plus tard.");
      } finally {
        setIsLoading(false);
      }
    };
    loadProductsAndCategories();
  }, [currentSlug, selectedSubCategories, selectedBrandIds, priceRange, inStock, promoOnly]);

  // Récupérer les descriptions des produits
  useEffect(() => {
    if (products.length === 0) return;

    const loadProductDescriptions = async () => {
      try {
        console.log("🟢 Chargement des descriptions de produits - DÉBUT");
        console.log(`🔢 Nombre de produits dans la page: ${products.length}`);
        
        // Extraire les IDs de tous les produits affichés (nettoyés, supporte gid://...)
        const productIds = products.map(p => getCleanProductId(p.id?.toString() || ""));
        console.log(`🔑 IDs des produits nettoyés: [${productIds.slice(0, 5).join(', ')}${productIds.length > 5 ? '...' : ''}]`);
        
        // Appel de la fonction fetchProductDescriptions avec les IDs spécifiques
        console.log(`📡 Appel de fetchProductDescriptions() avec ${productIds.length} IDs...`);
        const startTime = Date.now();
        
        // Passer les IDs à la fonction modifiée
        const descriptions = await fetchProductDescriptions(productIds);
        
        const endTime = Date.now();
        console.log(`⏱️ Temps d'exécution: ${endTime - startTime}ms`);
        
        // Analyse des résultats
        const nbDescriptionsReceived = Object.keys(descriptions).length;
        console.log(`📊 ${nbDescriptionsReceived} descriptions reçues sur ${productIds.length} demandées (${Math.round(nbDescriptionsReceived/productIds.length*100)}%)`);
        console.log("📦 Contenus Supabase chargés :", Object.keys(descriptions));
        
        // Nettoyer les clés des descriptions
        const cleanedDescriptions: Record<string, string> = {};
        Object.entries(descriptions).forEach(([key, value]) => {
          const cleanKey = getCleanProductId(key);
          cleanedDescriptions[cleanKey] = value;
          });
          
        setProductDescriptions(cleanedDescriptions);
        
        // Injection dans products
        setProducts(prev =>
          prev.map(product => {
            const cleanId = getCleanProductId(product.id?.toString() || "");
            return {
              ...product,
              description: cleanedDescriptions[cleanId] || "",
            };
          })
        );
        // Injection dans filteredProducts
        setFilteredProducts(prev =>
          prev.map(product => {
            const cleanId = getCleanProductId(product.id?.toString() || "");
            return {
              ...product,
              description: cleanedDescriptions[cleanId] || "",
            };
          })
        );
        
        // Stockage pour debug
        window.DEBUG_DESCRIPTIONS = cleanedDescriptions;
      } catch (error) {
        console.error("❌ ERREUR lors du chargement des descriptions:", error);
        console.error("📚 Stack trace:", error.stack);
      }
    };

    loadProductDescriptions();
  }, [products]);

  // Sélectionner automatiquement la sous-catégorie depuis l'URL
  useEffect(() => {
    if (hasAppliedInitialSubCategory.current) return;
    if (!initialSubCategorySlug) {
      console.log("⚠️ Aucun slug 'souscategorie' trouvé dans l'URL.");
      return;
    }

    if (!Array.isArray(subCategories) || subCategories.length === 0) {
      console.log("⏳ En attente de sous-catégories valides...");
      return;
    }

    console.log("📥 Paramètre 'souscategorie' de l'URL:", initialSubCategorySlug);
    console.log("📋 Liste des slugs disponibles:", subCategories.map(c => c.slug));

    // 🔁 Patiente un peu avant de chercher la sous-catégorie
    const timeout = setTimeout(() => {
      const match = findMatchingSubCategory(subCategories, initialSubCategorySlug);

      if (match) {
        console.log("✅ Sous-catégorie trouvée :", match);
        if (!selectedSubCategories.includes(match.id)) {
          setSelectedSubCategories([match.id]);
          hasAppliedInitialSubCategory.current = true;
        }
      } else {
        console.warn("❌ Aucune correspondance pour la sous-catégorie slug :", initialSubCategorySlug);
        console.log("📊 Détails de recherche :");
        subCategories.forEach(cat => {
          const cleanSlug = cat.slug?.split("?")[0];
          const redirectSlug = cat.redirect_url?.split("souscategorie=")[1];
          console.log(`  - ${cat.name}: slug=${cleanSlug}, redirectSlug=${redirectSlug}`);
        });
      }
    }, 300); // attends 300ms

    return () => clearTimeout(timeout);
  }, [initialSubCategorySlug, subCategories, selectedSubCategories]);

  // Les filtres sont désactivés pour l'instant
  useEffect(() => {
    // Volontairement vide pour désactiver les filtres
    // tout en conservant l'interface utilisateur
  }, [products]);

  // Effet pour appliquer le debounce au changement de prix
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPriceRange(priceInput);
    }, 500); // 500ms après l'arrêt

    return () => clearTimeout(timeout);
  }, [priceInput]);

  // Gérer les changements de filtres
  const handleBrandToggle = (brandId: string) => {
    setSelectedBrandIds(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  const handleSubCategoryToggle = (subCatId: string) => {
    setSelectedSubCategories((prev) =>
      prev.includes(subCatId)
        ? prev.filter((id) => id !== subCatId)
        : [...prev, subCatId]
    );
  };

  const toggleMobileFilters = () => {
    setMobileFiltersOpen(!mobileFiltersOpen);
  };

  // Fonction pour mettre à jour le prix
  const handlePriceChange = (value: number[]) => {
    setPriceInput(value);
  };

  // Rendu des étoiles pour les notes
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`h-5 w-5 ${i < Math.round(rating) ? 'text-[#0074b3] fill-[#0074b3]' : 'text-gray-200 fill-gray-200'}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  // Fonction pour mettre à jour le contenu éditable
  const handleTextUpdate = async (newText: string, contentKey: string) => {
    try {
      const trimmedText = newText.trim();
      
      // Mettre à jour l'état local immédiatement
      if (contentKey === `category_${currentSlug}_title`) {
        setCategoryTitle(trimmedText);
      } else if (contentKey === `category_${currentSlug}_description`) {
        setCategoryDescription(trimmedText);
      }
      
      // Vérifier si l'entrée existe déjà
      const { data: existingData } = await supabase
        .from("editable_content")
        .select("content_key")
        .eq("content_key", contentKey)
        .limit(1);
      
      let error;
      
      if (existingData && existingData.length > 0) {
        // Mettre à jour l'entrée existante
        const { error: updateError } = await supabase
          .from("editable_content")
          .update({ content: trimmedText })
          .eq("content_key", contentKey);
          
        error = updateError;
      } else {
        // Créer une nouvelle entrée
        const { error: insertError } = await supabase
          .from("editable_content")
          .insert({ content_key: contentKey, content: trimmedText });
          
        error = insertError;
      }

      if (!error) {
        console.log("Mise à jour réussie pour :", contentKey);
      } else {
        console.error("Erreur lors de la mise à jour :", error);
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la mise à jour du contenu",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erreur inattendue :", error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue est survenue",
        variant: "destructive"
      });
    }
  };
  
  // Charger le contenu éditable depuis Supabase
  useEffect(() => {
    const fetchEditableContent = async () => {
      try {
        const { data, error } = await supabase
          .from("editable_content")
          .select("*")
          .in("content_key", [
            `category_${currentSlug}_title`, 
            `category_${currentSlug}_description`,
            `category_${currentSlug}_banner_image`
          ]);
        
        if (!error && data) {
          data.forEach(item => {
            if (item.content_key === `category_${currentSlug}_title`) {
              setCategoryTitle(item.content);
            } else if (item.content_key === `category_${currentSlug}_description`) {
              setCategoryDescription(item.content);
            } else if (item.content_key === `category_${currentSlug}_banner_image`) {
              setCategoryBannerImage(item.content);
            }
          });
        }
      } catch (error) {
        console.error("Erreur lors du chargement du contenu éditable :", error);
      }
    };

    fetchEditableContent();
  }, [currentSlug, isEditMode]);

  // Fonction pour mettre à jour l'URL de l'image
  const handleImageUpdate = async (newUrl: string, contentKey: string) => {
    try {
      // Mettre à jour l'état local
      if (contentKey === `category_${currentSlug}_banner_image`) {
        setCategoryBannerImage(newUrl);
      }
      
      // Vérifier si l'entrée existe déjà
      const { data: existingData } = await supabase
        .from("editable_content")
        .select("content_key")
        .eq("content_key", contentKey)
        .limit(1);
      
      let error;
      
      if (existingData && existingData.length > 0) {
        // Mettre à jour l'entrée existante
        const { error: updateError } = await supabase
          .from("editable_content")
          .update({ content: newUrl })
          .eq("content_key", contentKey);
          
        error = updateError;
      } else {
        // Créer une nouvelle entrée
        const { error: insertError } = await supabase
          .from("editable_content")
          .insert({ content_key: contentKey, content: newUrl });
          
        error = insertError;
      }

      if (!error) {
        console.log("Mise à jour de l'image réussie pour :", contentKey);
        toast({
          title: "Image mise à jour",
          description: "L'image d'arrière-plan a été mise à jour avec succès",
        });
      } else {
        console.error("Erreur lors de la mise à jour de l'image :", error);
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la mise à jour de l'image",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erreur inattendue :", error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue est survenue",
        variant: "destructive"
      });
    }
  };

  // Cart functionality
  const { getDiscountedPrice, addItem } = useCartStore();
  // Ajout d'un état local pour stocker les prix promos des produits sans variante
  const [promoPrices, setPromoPrices] = useState<Record<string, any>>({});

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <FloatingHeader />
      
      <div>
      {/* Hero Banner */}
      <div 
        className="relative bg-cover bg-center py-16"
      >
        {isEditMode ? (
          <div className="absolute inset-0 z-0 flex items-center justify-center">
            <EditableImage
              imageKey={`category_${currentSlug}_banner_image`}
              initialUrl={categoryBannerImage}
              className="w-full max-h-[320px] h-[320px] object-cover rounded-lg shadow"
              onUpdate={(newUrl) => handleImageUpdate(newUrl, `category_${currentSlug}_banner_image`)}
            />
            <div className="absolute inset-0 bg-black/50 rounded-lg"></div>
          </div>
        ) : (
          <div 
            className="absolute inset-0 bg-cover bg-center" 
            style={{ 
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${categoryInfo.bannerImage})` 
            }}
          ></div>
        )}
        
        <div className="container mx-auto text-center text-white relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            <EditableText
              contentKey={`category_${currentSlug}_title`}
              initialContent={categoryTitle}
              onUpdate={(newText) => handleTextUpdate(newText, `category_${currentSlug}_title`)}
            />
          </h1>
          <p className={`max-w-2xl mx-auto mb-8 ${isMobile && !showFullDescription ? 'line-clamp-3' : ''}`}>
            <EditableText
              contentKey={`category_${currentSlug}_description`}
              initialContent={categoryDescription}
              onUpdate={(newText) => handleTextUpdate(newText, `category_${currentSlug}_description`)}
            />
          </p>
          {isMobile && categoryDescription.length > 0 && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="text-primary hover:text-primary/90 text-sm font-semibold mb-4"
            >
              {showFullDescription ? "Lire moins" : "Lire la suite"}
            </button>
          )}
          
          {/* Navigation Eau Douce / Eau de Mer / Universel */}
          <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-6 mb-6">
            {headerNavCategories.map((navCat) => (
              <Button
                key={navCat.id}
                asChild
                // Mettre en surbrillance si le slug de la catégorie de navigation correspond au slug de la page actuelle
                variant={navCat.slug === currentSlug ? "default" : "outline"}
                className={`min-w-48 h-16 md:h-20 text-lg rounded-xl shadow-md transition-all ${
                  navCat.slug === currentSlug
                    ? "bg-primary hover:bg-primary/90"
                    : "bg-background/80 hover:bg-background/90 border-2 text-white hover:text-white"
                }`}
              >
                <a href={`/categories/${navCat.slug}`} className="flex flex-col items-center justify-center">
                  <div className="text-2xl mb-1">{getEmojiForCategory(navCat.slug)}</div>
                  <span>{navCat.name}</span>
                </a>
              </Button>
            ))}
          </div>
          
          {/* Breadcrumb navigation removed as requested */}
          </div>
        </div>
      </div>
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Nouvelle section de débogage des filtres */}
        {isEditMode && (
          <div className="mb-6">
            <Tabs defaultValue="products">
              <TabsList>
                <TabsTrigger value="products">Produits</TabsTrigger>
                <TabsTrigger value="debug-filter">🛠️ Debug Filtres</TabsTrigger>
                <TabsTrigger value="debug-slugs">🔍 Debug Slugs</TabsTrigger>
                <TabsTrigger value="debug-all">🪵 Debug Tous</TabsTrigger>
                <TabsTrigger value="debug-supabase">📊 Analyse Supabase</TabsTrigger>
              </TabsList>
              <TabsContent value="products">
                {/* Contenu vide - sera géré par le reste du composant */}
              </TabsContent>
              <TabsContent value="debug-filter" className="p-4 bg-white rounded-lg border shadow-sm">
                <h3 className="font-bold text-lg mb-4">Débogage des filtres</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Statistiques générales */}
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <h4 className="font-semibold mb-2">Statistiques globales</h4>
                    <ul className="space-y-1 text-sm">
                      <li>Produits total: <span className="font-mono">{products.length}</span></li>
                      <li>Produits filtrés: <span className="font-mono">{filteredProducts.length}</span></li>
                      <li>Produits en stock: <span className="font-mono">{products.filter(p => p.isInStock).length}</span></li>
                      <li>Produits hors stock: <span className="font-mono">{products.filter(p => !p.isInStock).length}</span></li>
                    </ul>
          </div>
                  
                  {/* État des filtres */}
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <h4 className="font-semibold mb-2">État des filtres</h4>
                    <ul className="space-y-1 text-sm">
                      <li>Filtre "En stock uniquement": <span className="font-mono font-semibold">{inStock ? '✅ ACTIVÉ' : '❌ DÉSACTIVÉ'}</span></li>
                      <li>Filtre prix: <span className="font-mono">{priceRange[0]}€ - {priceRange[1]}€</span></li>
                      <li>Catégories sélectionnées: <span className="font-mono">{selectedSubCategories.length}</span></li>
                      <li>Marques sélectionnées: <span className="font-mono">{selectedBrandIds.length}</span></li>
                      <li>Promos uniquement: <span className="font-mono">{promoOnly ? '✅ ACTIVÉ' : '❌ DÉSACTIVÉ'}</span></li>
                    </ul>
                  </div>
                  
                  {/* NOUVELLE SECTION: Debug Stock Détaillé */}
                  <div className="col-span-1 md:col-span-2 p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                    <h4 className="font-semibold mb-2 text-blue-800">🔍 Debug Stock Détaillé</h4>
                    <div className="space-y-2 text-xs">
                      <p><strong>Format des clés de stock dans Supabase:</strong></p>
                      <ul className="list-disc ml-5 text-blue-700">
                        <li>Stock général: <code className="bg-white px-1 py-0.5 rounded">product_PRODUCT_ID_stock</code></li>
                        <li>Stock variante: <code className="bg-white px-1 py-0.5 rounded">product_PRODUCT_ID_variant_IDX_option_VALUE_stock</code></li>
                      </ul>
                      <p className="mt-4"><strong>Formats d'IDs produits:</strong></p>
                      <div className="bg-white p-2 rounded overflow-auto max-h-36 text-xs">
                        {products.slice(0, 3).map(p => (
                          <div key={p.id} className="mb-2 pb-2 border-b">
                            <div><strong>Titre:</strong> {p.title}</div>
                            <div><strong>ID original:</strong> <code className="bg-gray-100 px-1">{p.id}</code></div>
                            <div><strong>ID nettoyé:</strong> <code className="bg-gray-100 px-1">{getCleanProductId(p.id)}</code></div>
                            <div><strong>Clé stock:</strong> <code className="bg-gray-100 px-1">product_{getCleanProductId(p.id)}_stock</code></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Détails des produits filtrés par stock */}
                  <div className="col-span-1 md:col-span-2 p-3 bg-gray-50 rounded-lg border">
                    <h4 className="font-semibold mb-2">Produits filtrés par stock {inStock && "(uniquement ceux hors stock)"}</h4>
                    <div className="max-h-60 overflow-y-auto text-sm">
                      {inStock ? (
                        products.filter(p => !p.isInStock).length > 0 ? (
                          <table className="min-w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border p-1 text-left">Produit</th>
                                <th className="border p-1 text-left">ID</th>
                                <th className="border p-1 text-left">isInStock</th>
                                <th className="border p-1 text-left">Stock</th>
                              </tr>
                            </thead>
                            <tbody>
                              {products.filter(p => !p.isInStock).map(product => (
                                <tr key={product.id} className="hover:bg-gray-100">
                                  <td className="border p-1">{product.title}</td>
                                  <td className="border p-1 font-mono text-xs">{getCleanProductId(product.id)}</td>
                                  <td className="border p-1 text-center">{product.isInStock ? '✅' : '❌'}</td>
                                  <td className="border p-1 text-center">{product.stock}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="italic text-gray-500">Aucun produit n'est filtré par le stock (tous sont en stock)</p>
                        )
                      ) : (
                        <p className="italic text-gray-500">Le filtre "En stock uniquement" est désactivé</p>
                      )}
                    </div>
                  </div>

                  {/* NOUVELLE SECTION: État de tous les produits et leurs stocks */}
                  <div className="col-span-1 md:col-span-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h4 className="font-semibold mb-2 text-yellow-800">📦 État de tous les produits et leurs stocks</h4>
                    <div className="max-h-80 overflow-y-auto">
                      <table className="min-w-full border-collapse text-xs">
                        <thead>
                          <tr className="bg-yellow-100">
                            <th className="border p-1 text-left">Produit</th>
                            <th className="border p-1 text-left">ID Clean</th>
                            <th className="border p-1 text-left">Stock</th>
                            <th className="border p-1 text-left">isInStock</th>
                            <th className="border p-1 text-left">hasVariant</th>
                            <th className="border p-1 text-left">Prix variantes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map(product => (
                            <tr key={product.id} className="border-b hover:bg-yellow-100">
                              <td className="border p-1">{product.title}</td>
                              <td className="border p-1 font-mono">{getCleanProductId(product.id)}</td>
                              <td className="border p-1 text-center">{product.stock || 0}</td>
                              <td className="border p-1 text-center bg-opacity-20" 
                                  style={{backgroundColor: product.isInStock ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)'}}>
                                {product.isInStock ? '✅' : '❌'}
                              </td>
                              <td className="border p-1 text-center">{product.hasVariant ? '✅' : '❌'}</td>
                              <td className="border p-1 text-sm text-gray-600">
                                {product.variantPriceRange
                                  ? `${product.variantPriceRange.min} - ${product.variantPriceRange.max} €`
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="debug-slugs" className="p-4 bg-white rounded-lg border shadow-sm">
                <h3 className="font-bold text-lg mb-4">Débogage des Slugs</h3>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="py-1 font-semibold">Slug brut :</td>
                        <td className="py-1 font-mono bg-gray-200 px-2 rounded">{rawSlug}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold">Slug nettoyé :</td>
                        <td className="py-1 font-mono bg-gray-200 px-2 rounded">{currentSlug}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold">Slug normalisé :</td>
                        <td className="py-1 font-mono bg-gray-200 px-2 rounded">{normalizedSlug}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold">isEauDouce :</td>
                        <td className="py-1 font-mono bg-gray-200 px-2 rounded">{isEauDouce.toString()}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold">isEauMer :</td>
                        <td className="py-1 font-mono bg-gray-200 px-2 rounded">{isEauMer.toString()}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold">isUniversel :</td>
                        <td className="py-1 font-mono bg-gray-200 px-2 rounded">{isUniversel.toString()}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold">Slug sous-catégorie URL :</td>
                        <td className="py-1 font-mono bg-gray-200 px-2 rounded">{initialSubCategorySlug || '(aucun)'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold">Sous-catégories chargées :</td>
                        <td className="py-1 font-mono bg-gray-200 px-2 rounded">{subCategories.length}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold">Sous-catégories IDs sélectionnées :</td>
                        <td className="py-1 font-mono bg-gray-200 px-2 rounded">{selectedSubCategories.join(", ") || '(aucune)'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold">Slugs disponibles :</td>
                        <td className="py-1 font-mono bg-gray-200 px-2 rounded">{subCategories.map(s => s.slug).join(", ") || '(aucun)'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              <TabsContent value="debug-all" className="p-4 bg-white rounded-lg border shadow-sm">
                <h3 className="font-bold text-lg mb-4">Débogage Supabase</h3>
                <div className="max-h-[50vh] overflow-auto">
                  {filteredProducts.slice(0, 5).map((product) => (
                    <div key={product.id} className="mb-4 p-2 border-b">
                      <h4 className="font-semibold">{product.title}</h4>
                      <EditableDebugPanel
                        productId={`stripe_${getCleanProductId(product.id?.toString() || "")}`}
                      />
                    </div>
                  ))}
                  {filteredProducts.length > 5 && (
                    <div className="text-gray-500 text-sm italic">
                      Affichage limité aux 5 premiers produits sur {filteredProducts.length}
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="debug-supabase" className="p-4 bg-white rounded-lg border shadow-sm">
                <h3 className="font-bold text-lg mb-4">Analyse Supabase</h3>
                <SupabaseStockDebugger productIds={products.map(p => p.id)} />
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Bouton filtre mobile */}
          <div className="md:hidden mb-4">
            <Button 
              onClick={toggleMobileFilters}
              variant="outline" 
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center">
                <Filter size={18} className="mr-2" />
                Filtres
              </div>
              <ChevronDown size={18} />
            </Button>
          </div>

          {/* Filtres (mobile) */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 md:hidden">
              <div className="bg-white h-full w-4/5 max-w-md p-4 overflow-auto animate-slide-in-right">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg">Filtres</h2>
                  <Button variant="ghost" size="sm" onClick={toggleMobileFilters}>
                    <X size={24} />
                  </Button>
                </div>
                {/* Contenu des filtres (même que bureau) */}
                <div className="space-y-6">
                  {/* Prix */}
                  <div>
                    <h3 className="font-medium mb-3">Prix</h3>
                    <div className="px-2">
                      <Slider 
                        defaultValue={[0, 800]} 
                        max={800} 
                        step={1} 
                        value={priceInput}
                        onValueChange={handlePriceChange}
                      />
                      <div className="flex justify-between mt-2 text-sm">
                        <span>{priceInput[0]}€</span>
                        <span>{priceInput[1]}€</span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Sous-catégories */}
                  {subCategories.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3">Sous-catégories</h3>
                      <div className="space-y-2">
                        {subCategories.map((subCat) => (
                          <div key={subCat.id} className="flex items-center">
                            <Checkbox
                              id={`subcat-mobile-${subCat.id}`}
                              checked={selectedSubCategories.includes(subCat.id)}
                              onCheckedChange={() => handleSubCategoryToggle(subCat.id)}
                            />
                            <label htmlFor={`subcat-mobile-${subCat.id}`} className="ml-2 text-sm flex-grow">
                              {subCat.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* Marques */}
                  <div>
                    <h3 className="font-medium mb-3">Marques</h3>
                    <div className="space-y-2">
                      {brandsLoading ? (
                        <div className="text-center py-2">
                          <div className="animate-spin h-4 w-4 border-b-2 border-primary rounded-full mx-auto"></div>
                          <p className="text-xs text-gray-500 mt-1">Chargement...</p>
                        </div>
                      ) : brandsError ? (
                        <div className="text-xs text-red-500 py-2">{brandsError}</div>
                      ) : brands.length === 0 ? (
                        <div className="text-xs text-gray-500 py-2">Aucune marque disponible</div>
                      ) : (
                        brands.map((brand) => (
                        <div key={brand.id} className="flex items-center">
                          <Checkbox 
                            id={`brand-mobile-${brand.id}`}
                              checked={selectedBrandIds.includes(brand.id)}
                            onCheckedChange={() => handleBrandToggle(brand.id)}
                          />
                          <label 
                            htmlFor={`brand-mobile-${brand.id}`}
                            className="ml-2 text-sm flex-grow"
                          >
                            {brand.name}
                          </label>
                        </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Disponibilité */}
                  <div>
                    <h3 className="font-medium mb-3">Disponibilité</h3>
                    <div className="flex items-center justify-between">
                      <label htmlFor="stock-mobile" className="text-sm">
                        En stock uniquement
                      </label>
                      <Switch 
                        id="stock-mobile"
                        checked={inStock}
                        onCheckedChange={setInStock}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Promotions */}
                  <div>
                    <h3 className="font-medium mb-3">Promotions</h3>
                    <div className="flex items-center justify-between">
                      <label htmlFor="promos-mobile" className="text-sm">
                        Articles en promotion
                      </label>
                      <Switch 
                        id="promos-mobile"
                        checked={promoOnly}
                        onCheckedChange={setPromoOnly}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button className="w-full" onClick={toggleMobileFilters}>
                      Appliquer les filtres
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filtres (desktop) */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-white rounded-lg border p-5 shadow-sm space-y-6">
              <h2 className="font-bold">Filtres</h2>
              
              {/* Prix */}
              <div>
                <h3 className="font-medium mb-3">Prix</h3>
                <div className="px-2">
                  <Slider 
                    defaultValue={[0, 800]} 
                    max={800} 
                    step={1} 
                    value={priceInput}
                    onValueChange={handlePriceChange}
                  />
                  <div className="flex justify-between mt-2 text-sm">
                    <span>{priceInput[0]}€</span>
                    <span>{priceInput[1]}€</span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Sous-catégories */}
              {subCategories.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Sous-catégories</h3>
                  <div className="space-y-2">
                    {subCategories.map((subCat) => (
                      <div key={subCat.id} className="flex items-center">
                        <Checkbox
                          id={`subcat-${subCat.id}`}
                          checked={selectedSubCategories.includes(subCat.id)}
                          onCheckedChange={() => handleSubCategoryToggle(subCat.id)}
                        />
                        <label htmlFor={`subcat-${subCat.id}`} className="ml-2 text-sm flex-grow">
                          {subCat.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <Separator />
              
              {/* Marques */}
              <div>
                <h3 className="font-medium mb-3">Marques</h3>
                <div className="space-y-2">
                  {brandsLoading ? (
                    <div className="text-center py-2">
                      <div className="animate-spin h-4 w-4 border-b-2 border-primary rounded-full mx-auto"></div>
                      <p className="text-xs text-gray-500 mt-1">Chargement...</p>
                    </div>
                  ) : brandsError ? (
                    <div className="text-xs text-red-500 py-2">{brandsError}</div>
                  ) : brands.length === 0 ? (
                    <div className="text-xs text-gray-500 py-2">Aucune marque disponible</div>
                  ) : (
                    brands.map((brand) => (
                    <div key={brand.id} className="flex items-center">
                      <Checkbox 
                        id={`brand-${brand.id}`}
                          checked={selectedBrandIds.includes(brand.id)}
                        onCheckedChange={() => handleBrandToggle(brand.id)}
                      />
                      <label 
                        htmlFor={`brand-${brand.id}`}
                        className="ml-2 text-sm flex-grow"
                      >
                        {brand.name}
                      </label>
                    </div>
                    ))
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Disponibilité */}
              <div>
                <h3 className="font-medium mb-3">Disponibilité</h3>
                <div className="flex items-center justify-between">
                  <label htmlFor="stock" className="text-sm">
                    En stock uniquement
                  </label>
                  <Switch 
                    id="stock"
                    checked={inStock}
                    onCheckedChange={setInStock}
                  />
                </div>
              </div>
              
              <Separator />
              
              {/* Promotions */}
              <div>
                <h3 className="font-medium mb-3">Promotions</h3>
                <div className="flex items-center justify-between">
                  <label htmlFor="promos" className="text-sm">
                    Articles en promotion
                  </label>
                  <Switch 
                    id="promos"
                    checked={promoOnly}
                    onCheckedChange={setPromoOnly}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Produits */}
          <div className="flex-grow">
            {/* En-tête de résultats */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold">Tous les produits</h2>
                <p className="text-gray-500 text-sm">{filteredProducts.length} produits trouvés</p>
              </div>
              <div className="flex items-center gap-2">
                <select className="text-sm border rounded p-2 bg-white">
                  <option>Tri par défaut</option>
                  <option>Prix croissant</option>
                  <option>Prix décroissant</option>
                  <option>Meilleures ventes</option>
                  <option>Nouveautés</option>
                </select>
              </div>
            </div>
            
            {/* Grille de produits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isLoading ? (
                <div className="col-span-full flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="col-span-full bg-red-50 text-red-600 p-4 rounded-md">
                  {error}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-lg text-gray-500">Aucun produit trouvé pour cette catégorie.</p>
                </div>
              ) : (
                paginatedProducts.map((product) => (
                <Card className="flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow duration-300 group">
                  <div className="relative h-56 bg-white flex items-center justify-center">
                    {(product.hasDiscount || product.onSale) && <PromoBadge />}
                    <RouterLink to={`/produits/${slugify(product.title, { lower: true })}?id=${product.id}&categorie=${currentSlug}`}>
                    <img 
                        src={product.image || "/placeholder.svg"} 
                        alt={product.title} 
                        className="max-h-44 max-w-[90%] object-contain p-2 bg-white rounded"
                    />
                    </RouterLink>
                  </div>
                  <CardContent className="flex flex-col flex-1 p-4">
                    <h3 className="font-semibold text-base leading-snug mb-1 line-clamp-1">{product.title}</h3>
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
                      {product.variantPriceRange
                        ? `De ${product.variantPriceRange.min.toFixed(2)} € à ${product.variantPriceRange.max.toFixed(2)} €`
                        : `${product.price?.toFixed(2)} €`}
                    </div>
                    <div className="mt-auto">
                      {product.hasVariant ? (
                    <RouterLink
                      to={`/produits/${slugify(product.title, { lower: true })}?id=${product.id}&categorie=${currentSlug}`}
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
                ))
              )}
            </div>
            
            {/* Pagination */}
            {!isLoading && !error && filteredProducts.length > 0 && totalPages > 1 && (
            <div className="mt-10 flex justify-center">
              <nav className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Précédent
                </Button>
                
                {[...Array(totalPages)].map((_, index) => (
                  <Button
                    key={index}
                    variant={currentPage === index + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(index + 1)}
                  >
                    {index + 1}
                  </Button>
                ))}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Suivant
                </Button>
              </nav>
            </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Section debug produits avec description trouvée */}
      {isEditMode && (
        <div className="mt-8 bg-green-50 border border-green-200 p-3 text-sm rounded">
          <h3 className="font-bold mb-2">📚 Produits avec description trouvée :</h3>
          <ul className="list-disc ml-6">
            {products.filter(p => !!p.description?.trim()).map(p => (
              <li key={p.id}>{p.title} ({p.id})</li>
            ))}
          </ul>
        </div>
      )}
      
      <Footer />
    </div>
  );
};

// Petit composant pour gérer le lien
function Link({ to, children, className = "" }) {
  return (
    <a href={to} className={`text-white hover:underline ${className}`}>
      {children}
    </a>
  );
}

export default EaudemerEclairagePage;

const SupabaseStockDebugger = ({ productIds }) => {
  const [stockData, setStockData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllStockData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Récupération des données brutes de stock général
        const { data: generalData, error: generalError } = await supabase
          .from("editable_content")
          .select("content_key, content")
          .like("content_key", "%_stock");

        if (generalError) throw generalError;

        // Récupération des données de variantes
        const { data: variantData, error: variantError } = await supabase
          .from("editable_content")
          .select("content_key, content")
          .like("content_key", "%_variant_%_option_%_stock");

        if (variantError) throw variantError;

        // Organiser les données par produit
        const allData = [...(generalData || []), ...(variantData || [])];
        const stockByProduct = {};

        // Organiser par préfixe de produit
        allData.forEach(item => {
          const prefixMatch = item.content_key.match(/^product_([^_]+)/);
          if (prefixMatch && prefixMatch[1]) {
            const productId = prefixMatch[1];
            if (!stockByProduct[productId]) {
              stockByProduct[productId] = [];
            }
            stockByProduct[productId].push({
              key: item.content_key,
              value: item.content,
              isVariant: item.content_key.includes("_variant_")
            });
          }
        });

        // Analyse des correspondances
        const productMatchAnalysis = productIds.map(id => {
          const cleanId = getCleanProductId(id);
          const stocksFound = stockByProduct[cleanId] || [];
          return {
            originalId: id,
            cleanId,
            stocksFound: stocksFound.length,
            variantsFound: stocksFound.filter(s => s.isVariant).length,
            generalFound: stocksFound.filter(s => !s.isVariant).length,
            hasAnyStock: stocksFound.some(s => parseInt(s.value) > 0),
            stockDetails: stocksFound,
          };
        });

        setStockData({
          generalCount: generalData?.length || 0,
          variantCount: variantData?.length || 0,
          productMatchAnalysis,
          stockByProduct
        });
      } catch (err) {
        console.error("Erreur d'analyse Supabase:", err);
        setError("Une erreur s'est produite lors de l'analyse des données de stock.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllStockData();
  }, [productIds]);

  if (isLoading) return <div className="text-center py-10">Chargement des données...</div>;
  if (error) return <div className="text-red-500 py-10">{error}</div>;
  if (!stockData) return <div className="text-gray-500 py-10">Aucune donnée disponible</div>;

  const { generalCount, variantCount, productMatchAnalysis } = stockData;
  const productsWithStock = productMatchAnalysis.filter(p => p.stocksFound > 0);
  const productsWithoutStock = productMatchAnalysis.filter(p => p.stocksFound === 0);

  return (
    <div className="space-y-6">
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold mb-2">Résumé des données Supabase</h4>
        <ul className="space-y-1 text-sm">
          <li>Total entrées de stocks: <span className="font-mono">{generalCount + variantCount}</span></li>
          <li>Stocks généraux: <span className="font-mono">{generalCount}</span></li>
          <li>Stocks de variantes: <span className="font-mono">{variantCount}</span></li>
          <li>Produits avec stock trouvé: <span className="font-mono">{productsWithStock.length} / {productMatchAnalysis.length}</span></li>
        </ul>
      </div>

      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
        <h4 className="font-semibold mb-2">Produits avec stock en base ({productsWithStock.length})</h4>
        <div className="max-h-60 overflow-y-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-green-100">
                <th className="border p-1 text-left">ID Clean</th>
                <th className="border p-1 text-left">Stock Général</th>
                <th className="border p-1 text-left">Variantes</th>
                <th className="border p-1 text-left">Stock {'>'} 0</th>
              </tr>
            </thead>
            <tbody>
              {productsWithStock.map(product => (
                <tr key={product.cleanId} className="border-b hover:bg-green-100">
                  <td className="border p-1 font-mono">{product.cleanId}</td>
                  <td className="border p-1 text-center">{product.generalFound}</td>
                  <td className="border p-1 text-center">{product.variantsFound}</td>
                  <td className="border p-1 text-center">{product.hasAnyStock ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {productsWithoutStock.length > 0 && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <h4 className="font-semibold mb-2">Produits sans stock trouvé ({productsWithoutStock.length})</h4>
          <div className="max-h-40 overflow-y-auto">
            <ul className="list-disc ml-5 text-sm">
              {productsWithoutStock.map(product => (
                <li key={product.cleanId}>
                  <code className="bg-white px-1">{product.cleanId}</code>
                  <span className="text-gray-500"> (Original: {product.originalId})</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <h4 className="font-semibold mb-2">Détails bruts des stocks</h4>
        <div className="max-h-96 overflow-y-auto">
          {productsWithStock.slice(0, 5).map(product => (
            <div key={product.cleanId} className="mb-4 bg-white p-2 rounded border">
              <div className="font-medium mb-1">{product.cleanId}</div>
              <ul className="list-none space-y-1 text-xs">
                {product.stockDetails.map((detail, idx) => (
                  <li key={idx} className={`p-1 ${parseInt(detail.value) > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <span className="font-mono">{detail.key}</span>: 
                    <span className="font-bold ml-1">{detail.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {productsWithStock.length > 5 && (
            <div className="text-center text-gray-500 text-sm mt-2">
              + {productsWithStock.length - 5} autres produits non affichés
            </div>
          )}
        </div>
      </div>
    </div>
  );
};