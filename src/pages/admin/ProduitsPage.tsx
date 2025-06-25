import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { fetchStripeProducts, StripeProduct } from "@/lib/api/stripe";
import { useEditStore } from "@/stores/useEditStore";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories, Category } from "@/lib/api/categories";
import { fetchCategoriesForProducts, updateProductCategories } from "@/lib/api/product-categories";
import { fetchBrands, Brand } from "@/lib/api/brands";
import { fetchBrandsForProducts, updateProductBrand } from "@/lib/api/brands";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import slugify from 'slugify';
import { createProductPage, deleteProductPage, checkProductPageExists, PageGenerationParams } from "@/lib/api/products";
import { Switch } from "@/components/ui/switch";
import { EditableImage } from "@/components/EditableImage";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { VariantStockManager } from "@/components/admin/VariantStockManager";

// Get API base URL from environment variables with fallback
const getApiBaseUrl = () => {
  // Use environment variable if available
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Fallback to current origin if in browser
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Default fallback for SSR or other contexts
  return '';
};

// Types pour la gestion des pages produit
type ProductPageStatus = {
  [productId: string]: {
    exists: boolean;
    isLoading: boolean;
    slug?: string;
  }
};

// Fonction utilitaire pour formater l'ID Stripe
const formatStripeId = (id: string | number) => `stripe_${id}`;

const ProduitsPage = () => {
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkedCategories, setLinkedCategories] = useState<Record<string, string[]>>({});
  const [linkedBrands, setLinkedBrands] = useState<Record<string, string | null>>({});
  const [updatingProduct, setUpdatingProduct] = useState<string | null>(null);
  const [updatingBrand, setUpdatingBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [productPages, setProductPages] = useState<ProductPageStatus>({});
  const [creatingPage, setCreatingPage] = useState<string | null>(null);
  const [deletingPage, setDeletingPage] = useState<string | null>(null);
  const { isAdmin } = useEditStore();
  const { toast } = useToast();
  const [globalLogos, setGlobalLogos] = useState({
    eauDouce: '',
    eauMer: ''
  });
  const lastFlagsRef = useRef<string>("");
  const [productDetails, setProductDetails] = useState<Record<string, {
    image?: string;
    stock?: number;
    hasVariants?: boolean;
  }>>({});
  const [stockModal, setStockModal] = useState<{ open: boolean; productId: string | null; productTitle: string | null }>({ open: false, productId: null, productTitle: null });
  
  // Fonction pour générer une page produit
  const handleCreateProductPage = async (product: StripeProduct) => {
    try {
      setIsLoading(true);
      
      // Générer le slug à partir du titre
      const slug = slugify(product.title, { lower: true });
      
      // Récupérer les informations de catégorie
      const categoryIds = linkedCategories[product.id.toString()] || [];
      const categoryObjects = categoryIds.map(id => {
        const category = categories.find(c => c.id === id);
        return category ? { id, name: category.name } : null;
      }).filter(Boolean) as Array<{ id: string; name: string }>;
      
      // Récupérer les informations de marque
      const brandId = linkedBrands[product.id.toString()] || null;
      const brand = brandId ? getBrandById(brandId) : null;
      
      // Créer la page produit avec tous les paramètres requis
      const params: PageGenerationParams = {
        productId: product.id.toString(),
        title: product.title,
        description: product.description || '',
        price: product.price,
        image: product.image || '/placeholder.svg',
        brandName: brand?.name || 'Non spécifié',
        brandId: brandId,
        categories: categoryObjects
      };
      
      const result = await createProductPage(params);
      
      // Mettre à jour le statut local avec le slug retourné par l'API
      setProductPages(prev => ({
        ...prev,
        [product.id.toString()]: {
          exists: true,
          isLoading: false,
          slug: result.slug || slug // Utiliser le slug de l'API ou celui généré localement
        }
      }));
      
      toast({
        title: "Page créée",
        description: "La page produit a été créée avec succès."
      });
    } catch (error) {
      console.error("Erreur lors de la création de la page:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer la page produit."
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour supprimer une page produit
  const handleDeleteProductPage = async (product: StripeProduct) => {
    try {
      const productId = product.id.toString();
      
      // Met à jour le state pour montrer le chargement
      setDeletingPage(productId);
      setProductPages(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          isLoading: true
        }
      }));
      
      // Appeler l'API pour supprimer la page
      const result = await deleteProductPage(productId, product.title);
      
      if (result.success) {
        // Mise à jour du statut
        setProductPages(prev => ({
          ...prev,
          [productId]: {
            exists: false,
            isLoading: false
          }
        }));
        
        toast({
          title: "Succès",
          description: `Page produit pour "${product.title}" supprimée avec succès.`,
        });
      } else {
        // Mise à jour du statut en cas d'échec
        setProductPages(prev => ({
          ...prev,
          [productId]: {
            ...prev[productId],
            isLoading: false
          }
        }));
        
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.message || "Impossible de supprimer la page produit.",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la page produit:", error);
      
      // Mise à jour du statut en cas d'erreur
      setProductPages(prev => ({
        ...prev,
        [product.id.toString()]: {
          ...prev[product.id.toString()],
          isLoading: false
        }
      }));
      
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur s'est produite lors de la suppression de la page produit.",
      });
    } finally {
      setDeletingPage(null);
    }
  };
  
  // Charger les catégories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  
  // Charger les marques
  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: fetchBrands,
  });
  
  // Fonction pour rendre les catégories en hiérarchie
  const renderCategoriesHierarchy = (parentId: string | null = null, level: number = 0) => {
    return categories
      .filter((cat) => cat.parent_id === parentId)
      .sort((a, b) => a.order - b.order)
      .map((cat) => (
        <div
          key={cat.id}
          onClick={(e) => {
            e.stopPropagation(); // Empêcher la propagation du clic
            setSelectedCategory(cat.id);
          }}
          style={{ marginLeft: `${level * 16}px` }}
          className={`border rounded p-2 hover:bg-gray-100 cursor-pointer mb-2 ${
            selectedCategory === cat.id ? "bg-blue-100" : ""
          }`}
        >
          {cat.name}
          {/* Appel récursif pour afficher les sous-catégories */}
          {renderCategoriesHierarchy(cat.id, level + 1)}
        </div>
      ));
  };
  
  // Si l'utilisateur n'est pas admin, rediriger ou afficher un message
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Accès non autorisé</h1>
        <p>Vous devez être connecté en tant qu'administrateur pour accéder à cette page.</p>
      </div>
    );
  }
  
  const loadProductData = async () => {
    try {
      setIsLoading(true);
      const stripeProducts = await fetchStripeProducts();
      setProducts(stripeProducts);

      if (stripeProducts.length > 0) {
        const productIds = stripeProducts.map(p => p.id.toString());
        
        // Fetch details (image, stock, variant flag)
        const imageKeys = productIds.map(id => `product_${id}_image_0`);
        const stockKeys = productIds.map(id => `product_${id}_stock`);
        const variantLabelKeys = productIds.map(id => `product_${id}_variant_0_label`);

        const { data: detailData, error: detailError } = await supabase
          .from('editable_content')
          .select('content_key, content')
          .in('content_key', [...imageKeys, ...stockKeys, ...variantLabelKeys]);

        if (detailError) throw detailError;

        // Fetch all variant stocks to calculate totals
        const { data: variantStockData, error: variantStockError } = await supabase
          .from('editable_content')
          .select('content_key, content')
          .like('content_key', '%_variant_%_stock');

        if (variantStockError) throw variantStockError;

        const newDetails = {};
        for (const p of stripeProducts) {
          const id = p.id.toString();
          const hasVariants = !!detailData.find(d => d.content_key === `product_${id}_variant_0_label`);
          let stockValue;

          if (hasVariants) {
            stockValue = variantStockData
              .filter(d => d.content_key.startsWith(`product_${id}_`))
              .reduce((sum, item) => sum + (Number(item.content) || 0), 0);
          } else {
            const generalStock = detailData.find(d => d.content_key === `product_${id}_stock`)?.content;
            stockValue = generalStock !== undefined ? Number(generalStock) : p.stock;
          }

          newDetails[id] = {
            image: detailData.find(d => d.content_key === `product_${id}_image_0`)?.content,
            stock: stockValue,
            hasVariants,
          };
        }
        setProductDetails(newDetails);
      }
      setError(null);
    } catch (err) {
      console.error("Erreur chargement produits:", err);
      setError("Impossible de charger les produits.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProductData();
  }, []);

  const handleRefresh = () => {
    loadProductData();
  };
  
  const handleStockChange = async (productId: string, newStock: string) => {
    const stockValue = parseInt(newStock, 10);
    if (isNaN(stockValue) || stockValue < 0) {
      toast({ variant: "destructive", title: "Stock invalide", description: "Veuillez entrer un nombre positif." });
      return;
    }

    if (productDetails[productId]?.hasVariants) {
      toast({ variant: "destructive", title: "Action non supportée", description: "Utilisez le bouton 'Gérer' pour les produits avec variantes." });
      return;
    }

    try {
      const { error } = await supabase.from('editable_content').upsert(
        { content_key: `product_${productId}_stock`, content: stockValue.toString() },
        { onConflict: 'content_key' }
      );
      if (error) throw error;

      setProductDetails(prev => ({
        ...prev,
        [productId]: { ...prev[productId], stock: stockValue }
      }));
      toast({ title: "Stock mis à jour" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de sauvegarder le stock." });
    }
  };
  
  // Charger les catégories liées aux produits
  useEffect(() => {
    const loadLinkedCategories = async () => {
      if (products.length === 0) return;
      
      try {
        const productIds = products.map(p => p.id.toString());
        const categoriesByProduct = await fetchCategoriesForProducts(productIds);
        setLinkedCategories(categoriesByProduct);
      } catch (err) {
        console.error("Erreur lors du chargement des catégories liées:", err);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger les catégories des produits.",
        });
      }
    };
    
    loadLinkedCategories();
  }, [products, toast]);
  
  // Charger les marques liées aux produits
  useEffect(() => {
    const loadLinkedBrands = async () => {
      if (products.length === 0) return;
      
      try {
        const productIds = products.map(p => p.id.toString());
        const brandsByProduct = await fetchBrandsForProducts(productIds);
        setLinkedBrands(brandsByProduct);
      } catch (err) {
        console.error("Erreur lors du chargement des marques liées:", err);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger les marques des produits.",
        });
      }
    };
    
    loadLinkedBrands();
  }, [products, toast]);
  
  // Vérifier l'existence des pages produit
  useEffect(() => {
    if (products.length === 0) return;
    
    const checkAllProductPages = async () => {
      try {
        console.log("🔍 Vérification de l'existence des pages produit...");
        const productIds = products.map(p => p.id.toString());
        
        // Créer un dictionnaire des titres pour aider à la vérification par slug
        const productTitles = {};
        products.forEach(p => {
          productTitles[p.id.toString()] = p.title;
        });
        
        console.log(`📦 Envoi de ${productIds.length} IDs et leurs titres pour vérification`);
        const pagesStatus = await checkProductPageExists(productIds, productTitles);
        
        console.log("📊 Résultats de la vérification:", pagesStatus);
        
        const status: ProductPageStatus = {};
        
        productIds.forEach(id => {
          const page = pagesStatus[id];
          status[id] = {
            exists: page?.exists === true, // Vérifie explicitement si la page existe
            isLoading: false,
            slug: page?.slug // Utilise le slug retourné par l'API
          };
        });
        
        setProductPages(status);
      } catch (error) {
        console.error("❌ Erreur lors de la vérification des pages produit:", error);
      }
    };
    
    checkAllProductPages();
  }, [products]);
  
  // Gérer la modification des catégories d'un produit
  const handleCategoryChange = async (productId: string, selectedCategoryIds: string[]) => {
    try {
      setUpdatingProduct(productId);
      await updateProductCategories(productId, selectedCategoryIds);
      setLinkedCategories((prev) => ({
        ...prev,
        [productId]: selectedCategoryIds,
      }));
      toast({
        title: "Succès",
        description: "Catégories mises à jour avec succès.",
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour des catégories:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour les catégories.",
      });
    } finally {
      setUpdatingProduct(null);
    }
  };
  
  // Gérer la modification de la marque d'un produit
  const handleBrandChange = async (productId: string, brandId: string | null) => {
    try {
      setUpdatingBrand(productId);
      await updateProductBrand(productId, brandId);
      setLinkedBrands((prev) => ({
        ...prev,
        [productId]: brandId,
      }));
      toast({
        title: "Succès",
        description: "Marque mise à jour avec succès.",
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la marque:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour la marque.",
      });
    } finally {
      setUpdatingBrand(null);
    }
  };
  
  // Filtrer les produits en fonction du terme de recherche et de la catégorie sélectionnée
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Si aucune catégorie n'est sélectionnée, on filtre uniquement par recherche
    if (!selectedCategory) {
      return matchesSearch;
    }
    
    // Vérifier si le produit appartient à la catégorie sélectionnée
    const categoriesOfProduct = linkedCategories[product.id.toString()] || [];
    const matchesCategory = categoriesOfProduct.includes(selectedCategory);
    
    // Retourner vrai seulement si le produit correspond au filtre de recherche ET à la catégorie
    return matchesSearch && matchesCategory;
  });
  
  // Trouver la marque correspondant à un ID
  const getBrandById = (brandId: string | null) => {
    if (!brandId) return null;
    return brands.find((brand) => brand.id === brandId) || null;
  };
  
  // Déclare fetchLogos dans le scope du composant
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

  useEffect(() => {
    fetchLogos();
  }, []);
  
  // Mettre à jour un logo
  const handleLogoUpdate = async (logoType: 'eauDouce' | 'eauMer', url: string) => {
    try {
      const contentKey = logoType === 'eauDouce' ? 'global_logo_eaudouce_url' : 'global_logo_eaudemer_url';
      
      const { data: existingData } = await supabase
        .from('editable_content')
        .select('content_key')
        .eq('content_key', contentKey)
        .single();

      if (existingData) {
        await supabase
          .from('editable_content')
          .update({ content: url })
          .eq('content_key', contentKey);
      } else {
        await supabase
          .from('editable_content')
          .insert({ content_key: contentKey, content: url });
      }

      setGlobalLogos(prev => ({
        ...prev,
        [logoType]: url
      }));

      toast({
        title: "Logo mis à jour",
        description: `Le logo ${logoType === 'eauDouce' ? 'Eau Douce' : 'Eau de Mer'} a été mis à jour avec succès.`
      });

      await fetchLogos();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du logo:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le logo. Veuillez réessayer."
      });
    }
  };

  const handleLogoVisibilityChange = async (productId: string, logoType: 'eaudouce' | 'eaudemer', checked: boolean) => {
    try {
      const contentKey = `product_${productId}_show_logo_${logoType}`;
      const { error } = await supabase
        .from('editable_content')
        .upsert(
          { content_key: contentKey, content: checked.toString() },
          { onConflict: 'content_key', ignoreDuplicates: false }
        );

      if (error) throw error;

      setProducts(prevProducts =>
        prevProducts.map(product =>
          product.id === productId
            ? {
                ...product,
                [`show_logo_${logoType}`]: checked.toString()
              }
            : product
        )
      );

      toast({
        title: "Visibilité mise à jour",
        description: `La visibilité du logo ${logoType === 'eaudouce' ? 'Eau Douce' : 'Eau de Mer'} a été mise à jour.`
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la visibilité du logo:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour la visibilité du logo."
      });
    }
  };
  
  // On ne fetch les flags qu'une seule fois après le chargement initial pour éviter d'écraser la MAJ locale lors du cochage
  useEffect(() => {
    if (products.length === 0) return;
    const fetchLogoFlags = async () => {
      const productIds = products.map(p => p.id.toString());
      // Récupère toutes les variantes de show_logo_eaudouce et show_logo_eaudemer
      const { data: dataDouce } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .ilike('content_key', '%show_logo_eaudouce%');
      const { data: dataMer } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .ilike('content_key', '%show_logo_eaudemer%');
      const data = [...(dataDouce || []), ...(dataMer || [])];
      console.log('🟢 [ADMIN FETCH FLAGS] Toutes les clés lues :', data);
      setProducts(prevProducts => {
        return prevProducts.map(product => {
          const douceKey = `product_${product.id}_show_logo_eaudouce`;
          const merKey = `product_${product.id}_show_logo_eaudemer`;
          const douce = data.find(d => d.content_key === douceKey)?.content || "false";
          const mer = data.find(d => d.content_key === merKey)?.content || "false";
          return {
            ...product,
            show_logo_eaudouce: douce,
            show_logo_eaudemer: mer
          };
        });
      });
    };
    fetchLogoFlags();
  }, [products]);
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des Produits</h1>
        <Button onClick={handleRefresh} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Rafraîchir
        </Button>
      </div>

      {/* Section des logos globaux */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Logos Globaux</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-2">Logo Eau Douce</h3>
              <EditableImage
                key={globalLogos.eauDouce}
                imageKey="global_logo_eaudouce_url"
                initialUrl={globalLogos.eauDouce}
                className="w-32 h-32 object-contain border rounded-lg p-2"
                onUpdate={(url) => handleLogoUpdate('eauDouce', url)}
                forceEditable={true}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Logo Eau de Mer</h3>
              <EditableImage
                key={globalLogos.eauMer}
                imageKey="global_logo_eaudemer_url"
                initialUrl={globalLogos.eauMer}
                className="w-32 h-32 object-contain border rounded-lg p-2"
                onUpdate={(url) => handleLogoUpdate('eauMer', url)}
                forceEditable={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>

    <div className="container mx-auto p-6">
      <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Produits Stripe</h1>
          <p className="text-gray-500">Gérez vos produits directement depuis Stripe</p>
      </div>
      
      {/* Layout en deux colonnes */}
      <div className="flex gap-6">
        {/* Colonne gauche - Catégories */}
        <div className="w-1/4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold mb-4">Catégories</h2>
                <Button
                  variant={!selectedCategory ? "default" : "outline"}
                  onClick={() => setSelectedCategory(null)}
                  className="w-full mb-4 justify-start"
                >
                  Toutes les catégories
                </Button>
                {categories.length === 0 ? (
                  <p className="text-gray-500 text-sm">Aucune catégorie disponible</p>
                ) : (
                  renderCategoriesHierarchy()
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
          {/* Colonne droite - Produits Stripe */}
        <div className="flex-1">
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <Input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
                <Button variant="outline" onClick={handleRefresh}>Rafraîchir</Button>
                <Button className="ml-auto">Ajouter un produit</Button>
                <Button asChild>
                  <Link to="/admin/brands">Gérer les marques</Link>
                </Button>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-md">
                  {error}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Image</TableHead>
                        <TableHead>Nom du produit</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Page</TableHead>
                          <TableHead>Catégories</TableHead>
                        <TableHead>Marque</TableHead>
                          <TableHead>Logo Eau Douce</TableHead>
                          <TableHead>Logo Eau de Mer</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            Aucun produit trouvé
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                                <img 
                                  src={productDetails[product.id]?.image || product.image || "https://placehold.co/100x100?text=No+Image"} 
                                  alt={product.title} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{product.title}</TableCell>
                              <TableCell>{product.price.toFixed(2)} €</TableCell>
                            <TableCell>
                              {productDetails[product.id] === undefined ? <Loader2 className="h-4 w-4 animate-spin"/> :
                                productDetails[product.id]?.hasVariants ? (
                                  <div className="flex flex-col items-start gap-1">
                                    <span className="text-xs text-gray-500">Total: {productDetails[product.id]?.stock ?? 0}</span>
                                    <Button variant="outline" size="xs" onClick={() => setStockModal({ open: true, productId: product.id.toString(), productTitle: product.title })}>
                                      Gérer
                                    </Button>
                                  </div>
                                ) : (
                                  <Input
                                    type="number"
                                    min="0"
                                    className="w-20 h-8"
                                    defaultValue={productDetails[product.id]?.stock}
                                    onBlur={(e) => handleStockChange(product.id.toString(), e.target.value)}
                                  />
                                )
                              }
                            </TableCell>
                            <TableCell>
                              {productPages[product.id.toString()]?.isLoading ? (
                                <div className="flex items-center">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  <span className="text-xs text-gray-500">Chargement...</span>
                                </div>
                              ) : productPages[product.id.toString()]?.exists ? (
                                <div className="flex items-center">
                                  <span className="text-green-500 font-bold text-xl">✓</span>
                                  <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Page créée</span>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <span className="text-red-500 font-bold text-xl">✗</span>
                                  <span className="ml-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">Pas de page</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                                <MultiSelect
                                  options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                                  selectedValues={linkedCategories[product.id] || []}
                                  onChange={(selected) => handleCategoryChange(product.id, selected)}
                                  placeholder="Sélectionner des catégories"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={linkedBrands[product.id] || "none"}
                                  onValueChange={(value) => handleBrandChange(product.id, value === "none" ? null : value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner une marque" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Aucune marque</SelectItem>
                                    {brands.map((brand) => (
                                      <SelectItem key={brand.id} value={brand.id}>
                                        {brand.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={product.show_logo_eaudouce === "true"}
                                  disabled={false}
                                  onCheckedChange={(checked) => handleLogoVisibilityChange(product.id.toString(), 'eaudouce', checked)}
                                />
                            </TableCell>
                            <TableCell>
                                <Switch
                                  checked={product.show_logo_eaudemer === "true"}
                                  disabled={false}
                                  onCheckedChange={(checked) => handleLogoVisibilityChange(product.id.toString(), 'eaudemer', checked)}
                                />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-2">
                                <Button variant="outline" size="sm">Éditer</Button>
                                <Button variant="destructive" size="sm">Supprimer</Button>
                                
                                {/* Boutons de gestion des pages produit */}
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="border-blue-500 text-blue-500 hover:bg-blue-50"
                                  disabled={creatingPage === product.id.toString() || productPages[product.id.toString()]?.exists === true}
                                  onClick={() => handleCreateProductPage(product)}
                                >
                                  {creatingPage === product.id.toString() ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      Création en cours...
                                    </>
                                  ) : productPages[product.id.toString()]?.exists ? (
                                    "✓ Page déjà créée"
                                  ) : (
                                    "✨ Créer page produit"
                                  )}
                                </Button>
                                
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  className="border-red-500 text-red-500 hover:bg-red-50"
                                  disabled={deletingPage === product.id.toString() || productPages[product.id.toString()]?.exists === false}
                                  onClick={() => handleDeleteProductPage(product)}
                                >
                                  {deletingPage === product.id.toString() ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      Suppression en cours...
                                    </>
                                  ) : !productPages[product.id.toString()]?.exists ? (
                                    "❌ Pas de page à supprimer"
                                  ) : (
                                    "🗑️ Supprimer page produit"
                                  )}
                                </Button>
                                
                                <Button 
                                  variant="link" 
                                  size="sm"
                                  onClick={() => {
                                      const slug = slugify(product.title, { lower: true });
                                      window.open(`/produits/${slug}?id=${product.id}`, '_blank');
                                  }}
                                >
                                  Voir la page
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} sur {products.length}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Précédent</Button>
              <Button variant="outline" size="sm">1</Button>
              <Button variant="outline" size="sm" disabled>Suivant</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={stockModal.open} onOpenChange={(isOpen) => setStockModal({ ...stockModal, open: isOpen })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gérer les stocks des variantes</DialogTitle>
          </DialogHeader>
          {stockModal.productId && (
            <VariantStockManager
              productId={stockModal.productId}
              productTitle={stockModal.productTitle || ''}
              onSave={() => {
                setStockModal({ open: false, productId: null, productTitle: null });
                handleRefresh(); // Re-fetch data to show updated total
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProduitsPage; 