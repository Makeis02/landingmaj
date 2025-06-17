import { useState, useEffect } from "react";
import { Heart, User, Search, Menu, X, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import CartDrawer from "./cart/CartDrawer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { fetchActiveCategories } from "@/lib/api/categories";
import { useCartStore } from "@/stores/useCartStore";
import { Badge } from "@/components/ui/badge";
import { fetchStripeProducts } from "@/lib/api/stripe";
import slugify from 'slugify';
import { supabase } from "@/integrations/supabase/client";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useUserStore } from "@/stores/useUserStore";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { useEditStore } from "@/stores/useEditStore";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/useImageUpload";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { items, openDrawer } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownResults, setDropdownResults] = useState([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [dropdownError, setDropdownError] = useState(null);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [productPriceRanges, setProductPriceRanges] = useState<Record<string, { min: number, max: number }>>({});
  const [searchHasFocus, setSearchHasFocus] = useState(false);
  const { items: favorites } = useFavoritesStore();
  const totalFavorites = favorites.length;
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const location = useLocation();
  const { isEditMode } = useEditStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoUrl, setLogoUrl] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ["active-categories"],
    queryFn: fetchActiveCategories,
  });

  // Charger tous les produits pour la recherche
  const { data: allProducts = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ["all-products-for-search"],
    queryFn: fetchStripeProducts,
  });

  // Charger les catégories des produits
  const { data: productCategories = {} } = useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_categories')
        .select('product_id, category_id');
      
      // Transformer en Record<productId, categoryIds[]>
      return data?.reduce((acc, curr) => {
        if (!acc[curr.product_id]) acc[curr.product_id] = [];
        acc[curr.product_id].push(curr.category_id);
        return acc;
      }, {}) || {};
    }
  });

  // Charger les price_maps des produits (clé product_{cleanId}_variant_0_price_map dans editable_content)
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

  // Fonction utilitaire pour nettoyer les IDs de produit (identique à PopularProducts)
  const getCleanProductId = (id: string) => {
    if (!id || typeof id !== "string") return "";
    if (id.startsWith("prod_")) return id;
    if (id.startsWith("shopify_")) return id.replace("shopify_", "");
    if (id.includes("/")) return id.split("/").pop() || "";
    return id;
  };

  // Charger les images des produits (clé product_${getCleanProductId(id)}_image_0 dans editable_content)
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

  // Filtrer les produits selon la recherche et les catégories (dès la première lettre)
  const filteredProducts = searchQuery.length > 0
    ? allProducts.filter(p => {
        const hasCategories = productCategories[p.id.toString()]?.length > 0;
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return hasCategories && matchesSearch;
      })
    : [];

  // Gestion du dropdown (desktop)
  const handleInputFocus = () => {
    setSearchHasFocus(true);
  };
  const handleInputBlur = () => {
    setTimeout(() => setSearchHasFocus(false), 150);
  };

  // Fonction pour corriger les URLs de redirection
  const getRedirectUrl = (subSub, allCategories) => {
    if (subSub.redirect_url?.startsWith("/?souscategorie=")) {
      const parent = allCategories.find(c => c.id === subSub.parent_id);
      const grandParent = parent && allCategories.find(c => c.id === parent.parent_id);
      const parentSlug = grandParent ? grandParent.slug : parent?.slug;

      if (parentSlug) {
        // Remplace /? par ? pour le combiner avec le chemin de catégorie
        const queryParams = subSub.redirect_url.substring(1);
        const redirectUrl = `/categories/${parentSlug}${queryParams}`;
        console.log("🔧 URL corrigée :", redirectUrl, "pour", subSub.name);
        return redirectUrl;
      }
    }

    return subSub.redirect_url || `/categories/${subSub.slug}`;
  };

  const infoPages = [
    { title: "À propos de nous", href: "/about" },
    { title: "Suivi colis", href: "/tracking" },
    { title: "Contact", href: "/contact" },
  ];

  const handleAccountClick = async () => {
    // Priorité à Zustand, fallback sur supabase
    if (user) {
      navigate("/account");
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      navigate("/account");
    } else {
      navigate("/account/login");
    }
  };

  // Afficher la bannière rouge uniquement sur les fiches produit
  const isProductPage = /^\/produits\//.test(location.pathname);

  // Fetch header settings
  const { data: headerSettings = {} } = useQuery({
    queryKey: ['header-settings'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('header_settings')
          .select('*')
          .single();

        if (error) {
          console.error('Error fetching header settings:', error);
          return {};
        }

        return data || { header_logo_url: '' };
      } catch (error) {
        console.error('Unexpected error fetching header settings:', error);
        return { header_logo_url: '' };
      }
    },
  });

  useEffect(() => {
    if (headerSettings) {
      setLogoUrl(headerSettings.header_logo_url || '');
    }
  }, [headerSettings]);

  // Setup image upload hook
  const { isUploading, handleImageUpload } = useImageUpload({
    imageKey: 'header_logo',
    onUpdate: (newUrl) => {
      setLogoUrl(newUrl);
      updateHeaderSettingsMutation.mutate({
        header_logo_url: newUrl
      });
    }
  });

  // Update header settings mutation
  const updateHeaderSettingsMutation = useMutation({
    mutationFn: async (updates: any) => {
      try {
        const { data: existingSettings } = await supabase
          .from('header_settings')
          .select('id')
          .single();

        let result;
        if (existingSettings) {
          result = await supabase
            .from('header_settings')
            .update(updates)
            .eq('id', existingSettings.id);
        } else {
          result = await supabase
            .from('header_settings')
            .insert([updates]);
        }

        if (result.error) throw result.error;
      } catch (error) {
        console.error('Error updating header settings:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['header-settings'] });
      toast({
        title: "Logo mis à jour",
        description: "Le logo du header a été mis à jour avec succès",
      });
    },
  });

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await handleImageUpload(file);
    } catch (error) {
      console.error('Error in handleLogoUpload:', error);
    }
  };

  return (
    <>
      {/* Bannière modifiable : visible partout sauf sur les fiches produit */}
      {!isProductPage && <AnnouncementBanner />}
      {/* Bannière rouge statique : visible uniquement sur les fiches produit */}
      {isProductPage && (
      <div className="w-full bg-red-500 text-white text-center text-sm font-semibold py-1">
        Livraison gratuite à partir de 50€ – -10% sur votre 1ère commande avec le code WELCOME
      </div>
      )}
      <div className="h-2" />

      {/* Header principal */}
      <header className="relative bg-white/80 backdrop-blur-md z-40 border-b border-gray-200">
        <div className="container mx-auto px-4">
          {/* 🔧 Header Mobile */}
          <div className="flex items-center justify-between lg:hidden py-4">
            {/* Menu hamburger à gauche */}
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(true)}>
              <Menu className="h-6 w-6 text-gray-700" />
            </Button>

            {/* Logo centré et Upload */}
            <div className="flex-grow text-center flex flex-col items-center">
              <Link to="/" >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo AquaShop"
                    className="h-12 mx-auto object-contain"
                  />
                ) : (
                <span className="text-2xl font-bold text-ocean">AquaShop</span>
                )}
              </Link>
              {isEditMode && (
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary file:text-white
                      hover:file:bg-primary/90"
                  />
                  {isUploading && <p className="text-xs mt-1 text-gray-500">Chargement...</p>}
                </div>
              )}
            </div>

            {/* Icônes à droite */}
            <div className="flex items-center space-x-4 pr-1">
              <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
                <Search className="h-5 w-5 text-gray-600" />
              </Button>
              <Link to="/account/favorites">
                <Button variant="ghost" size="icon" aria-label="Voir mes favoris" className="relative">
                  <Heart className="h-5 w-5 text-gray-600" />
                  {totalFavorites > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0"
                    >
                      {totalFavorites}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleAccountClick}>
                <User className="h-5 w-5 text-gray-600" />
              </Button>
              {/* Bouton du panier (réutilise le même cartDrawer) */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={openDrawer}
              >
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0"
                  >
                    {totalItems}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between gap-2 h-16">
            {/* Logo et Upload */}
            <div className="flex items-center gap-2">
              <Link to="/" className="text-2xl font-bold text-ocean">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo AquaShop"
                    className="h-20 object-contain"
                  />
                ) : (
                  <span className="text-2xl font-bold text-ocean">AquaShop</span>
                )}
              </Link>
              {isEditMode && (
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary file:text-white
                      hover:file:bg-primary/90"
                  />
                  {isUploading && <p className="text-xs mt-1 text-gray-500">Chargement...</p>}
                </div>
              )}
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4">
              <NavigationMenu>
                <NavigationMenuList>
                  {categories
                    .filter((cat) => !cat.parent_id)
                    .map((category) => {
                      const hasChildren = categories.some((c) => c.parent_id === category.id);

                      return (
                        <NavigationMenuItem key={category.id}>
                          {hasChildren ? (
                            <>
                              <NavigationMenuTrigger>
                                <span className="text-sm font-semibold text-ocean">
                                  {category.name}
                                </span>
                              </NavigationMenuTrigger>
                              {hasChildren && (
                                <NavigationMenuContent className="absolute left-1/2 transform -translate-x-1/2">
                                  {(() => {
                                    const subCategories = categories.filter((sub) => sub.parent_id === category.id);
                                    const validColumns = subCategories.filter((sub) => {
                                      return sub.slug || categories.some((child) => child.parent_id === sub.id);
                                    });

                                    const columnCount = Math.min(validColumns.length, 3); // max 3 colonnes
                                    
                                    const columnWidths = {
                                      1: 'grid-cols-1 justify-center',
                                      2: 'grid-cols-2 justify-center',
                                      3: 'grid-cols-3 justify-between',
                                    };

                                    const columnClass = columnWidths[columnCount] || 'grid-cols-3 justify-between';

                                    return (
                                      <ul
                                        className={`grid ${columnClass} gap-4 p-6 max-h-[800px] overflow-y-auto w-full`}
                                        style={{ minWidth: "600px", maxWidth: "900px" }}
                                      >
                                        {validColumns.map((subCategory) => (
                                          <li key={subCategory.id} className="mb-6">
                                            {subCategory.slug ? (
                                              <NavigationMenuLink asChild>
                                                <NavLink
                                                  to={`/categories/${subCategory.slug}`}
                                                  className="block font-medium text-base text-gray-900 hover:underline mb-2"
                                                >
                                                  {subCategory.name}
                                                </NavLink>
                                              </NavigationMenuLink>
                                            ) : (
                                              <span className="block font-medium text-base text-gray-900 mb-2">
                                                {subCategory.name}
                                              </span>
                                            )}

                                            <ul className="space-y-2">
                                              {categories
                                                .filter((subSub) => subSub.parent_id === subCategory.id)
                                                .map((subSub) =>
                                                  subSub.slug ? (
                                                    <li key={subSub.id}>
                                                      <NavigationMenuLink asChild>
                                                        <NavLink
                                                          to={getRedirectUrl(subSub, categories)}
                                                          className="block select-none rounded-md py-2 px-3 text-sm text-gray-600 hover:bg-accent hover:text-accent-foreground"
                                                        >
                                                          {subSub.name}
                                                        </NavLink>
                                                      </NavigationMenuLink>
                                                    </li>
                                                  ) : (
                                                    <li key={subSub.id}>
                                                      <span className="block select-none rounded-md py-2 px-3 text-sm text-gray-600">
                                                        {subSub.name}
                                                      </span>
                                                    </li>
                                                  )
                                                )}
                                            </ul>
                                          </li>
                                        ))}
                                      </ul>
                                    );
                                  })()}
                                </NavigationMenuContent>
                              )}
                            </>
                          ) : (
                            <NavigationMenuLink asChild>
                              <NavLink
                                to={`/categories/${category.slug}`}
                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold text-ocean h-10 px-4 py-2 bg-background hover:bg-accent hover:text-accent-foreground"
                              >
                                {category.name}
                              </NavLink>
                            </NavigationMenuLink>
                          )}
                        </NavigationMenuItem>
                      );
                    })}
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            {/* Desktop Search and Icons */}
            <div className="hidden lg:flex items-center space-x-4 ml-6">
              <div className="relative">
                <input
                  type="search"
                  placeholder="Rechercher..."
                  className="pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:border-ocean"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  autoComplete="off"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                {/* Dropdown résultats */}
                {(searchQuery.length > 0 && searchHasFocus) && (
                  <div className="absolute left-0 mt-2 w-[340px] bg-white rounded-xl shadow-xl border z-50 max-h-96 overflow-y-auto animate-fade-in">
                    {isProductsLoading || allProducts.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">Chargement...</div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">Aucun produit trouvé</div>
                    ) : (
                      filteredProducts.slice(0, 8).map(product => (
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
              <Link to="/account/favorites">
                <Button variant="ghost" size="icon" aria-label="Voir mes favoris">
                  <Heart className="h-5 w-5 text-gray-600" />
              </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleAccountClick}>
                <User className="h-5 w-5" />
              </Button>
              {/* Bouton du panier (desktop) */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={openDrawer}
              >
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0"
                  >
                    {totalItems}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Menu Mobile */}
          <div
            className={`
              fixed left-0 w-full max-h-screen z-50 overflow-y-auto overscroll-contain transition-transform duration-300
              ${isMenuOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'}
            `}
            style={{ background: 'linear-gradient(to bottom, #e6f2f8, #ffffff)', top: 32 }}
          >
            {/* Barre supérieure avec logo + bouton de fermeture */}
            <div className="sticky top-0 left-0 right-0 flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b">
              <Link to="/" className="text-xl font-bold text-ocean">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo AquaShop" 
                    className="h-10 object-contain" 
                  />
                ) : (
                  <span className="text-xl font-bold text-ocean">AquaShop</span>
                )}
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                <X className="h-6 w-6 text-gray-600" />
              </Button>
            </div>

            {/* 🧭 Arborescence responsive */}
            <nav className="flex flex-col gap-4 text-sm px-6 py-6">
              {categories
                .filter((cat) => !cat.parent_id)
                .map((category) => (
                  <div key={category.id}>
                    <NavLink
                      to={`/categories/${category.slug}`}
                      className="block font-semibold text-lg text-ocean mb-1"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {category.name}
                    </NavLink>

                    {/* Sous-catégories */}
                    <div className="ml-4 mb-2">
                      {categories
                        .filter((sub) => sub.parent_id === category.id)
                        .map((sub) => (
                          <div key={sub.id}>
                            <NavLink
                              to={`/categories/${sub.slug}`}
                              className="block text-gray-700 mb-1 hover:text-ocean"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              {sub.name}
                            </NavLink>

                            {/* Sous-sous-catégories */}
                            <div className="ml-4 mb-1">
                              {categories
                                .filter((subSub) => subSub.parent_id === sub.id)
                                .map((subSub) => (
                                  <NavLink
                                    key={subSub.id}
                                    to={getRedirectUrl(subSub, categories)}
                                    className="block text-gray-500 hover:text-ocean mb-0.5"
                                    onClick={() => setIsMenuOpen(false)}
                                  >
                                    {subSub.name}
                                  </NavLink>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}

              {/* 🔗 Liens de navigation classiques */}
              <div className="mt-6 border-t pt-4">
                {infoPages.map((page) => (
                  <NavLink
                    key={page.title}
                    to={page.href}
                    className="block text-gray-500 hover:text-ocean"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {page.title}
                  </NavLink>
                ))}
              </div>
            </nav>
          </div>

          {/* SearchDrawer */}
          {isSearchOpen && (
            <>
              {/* Overlay */}
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={() => setIsSearchOpen(false)}
              />

              {/* Drawer */}
              <div className="fixed top-0 left-0 w-full h-screen bg-white z-50 p-4 overflow-y-auto animate-slide-in flex flex-col">
                {/* Barre du haut */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-bold text-ocean">Recherche</span>
                  <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(false)}>
                    <X className="h-6 w-6 text-gray-600" />
                  </Button>
                </div>

                {/* Champ de recherche */}
                <input
                  type="text"
                  placeholder="Rechercher un produit, une catégorie..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring focus:border-ocean"
                  autoFocus
                />
                {/* Résultats mobile */}
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
                          onClick={() => setIsSearchOpen(false)}
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
            </>
          )}

          {/* Overlay du menu mobile */}
          <div
            className={`
              fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300
              ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
            `}
            onClick={() => setIsMenuOpen(false)}
          />
        </div>
      </header>

      {/* Un seul CartDrawer sans bouton (le drawer s'ouvre via le state global) */}
      <CartDrawer />
    </>
  );
};

export default Header;
