import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/api/shopify";
import { useEditStore } from "@/stores/useEditStore";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories, Category } from "@/lib/api/categories";
import { fetchCategoriesForProducts, updateProductCategories } from "@/lib/api/product-categories";
import { fetchBrands, Brand } from "@/lib/api/brands";
import { fetchBrandsForProducts, updateProductBrand } from "@/lib/api/brands";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const ProduitsPage = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkedCategories, setLinkedCategories] = useState<Record<string, string[]>>({});
  const [linkedBrands, setLinkedBrands] = useState<Record<string, string | null>>({});
  const [updatingProduct, setUpdatingProduct] = useState<string | null>(null);
  const [updatingBrand, setUpdatingBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { isAdmin } = useEditStore();
  const { toast } = useToast();
  
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
  
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        
        // Utilisation de l'API Shopify réelle
        const data = await fetchShopifyProducts();
        
        setProducts(data);
        setError(null);
      } catch (err) {
        console.error("Erreur lors du chargement des produits:", err);
        setError("Impossible de charger les produits. Veuillez réessayer plus tard.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProducts();
  }, []);
  
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
  
  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      const data = await fetchShopifyProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      console.error("Erreur lors du rafraîchissement :", err);
      setError("Impossible de rafraîchir les produits.");
    } finally {
      setIsLoading(false);
    }
  };
  
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
  
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Produits Shopify</h1>
        <p className="text-gray-500">Gérez vos produits directement depuis Shopify</p>
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
        
        {/* Colonne droite - Produits Shopify */}
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
                        <TableHead>Marque</TableHead>
                        <TableHead>Catégories</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Aucun produit trouvé
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
                                <img 
                                  src={product.image || "https://placehold.co/100x100?text=No+Image"} 
                                  alt={product.title} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{product.title}</TableCell>
                            <TableCell>{parseFloat(product.price).toFixed(2)} €</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                product.stock > 10 
                                  ? 'bg-green-100 text-green-800' 
                                  : product.stock > 0 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-red-100 text-red-800'
                              }`}>
                                {product.stock > 0 ? `${product.stock} en stock` : 'Rupture de stock'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <Select
                                  value={linkedBrands[product.id.toString()] || "none"}
                                  onValueChange={(value) => handleBrandChange(product.id.toString(), value === "none" ? null : value)}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Sélectionner une marque" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Aucune marque</SelectItem>
                                    {brands.filter(brand => brand.id && brand.id.trim() !== "").map((brand) => (
                                      <SelectItem key={brand.id} value={brand.id}>
                                        {brand.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                {/* Afficher la marque sélectionnée avec son image si disponible */}
                                {linkedBrands[product.id.toString()] && (
                                  <div className="flex items-center gap-2 mt-2">
                                    {(() => {
                                      const brand = getBrandById(linkedBrands[product.id.toString()]);
                                      return brand ? (
                                        <>
                                          {brand.image_url && (
                                            <div className="w-6 h-6 bg-gray-100 rounded overflow-hidden">
                                              <img
                                                src={brand.image_url}
                                                alt={brand.name}
                                                className="w-full h-full object-contain"
                                              />
                                            </div>
                                          )}
                                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                                            {brand.name}
                                          </span>
                                        </>
                                      ) : null;
                                    })()}
                                  </div>
                                )}
                                
                                {updatingBrand === product.id.toString() && (
                                  <div className="text-xs text-blue-500">Mise à jour...</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <MultiSelect 
                                  options={categories.map((cat) => ({ 
                                    label: cat.name, 
                                    value: cat.id 
                                  }))}
                                  selectedValues={linkedCategories[product.id.toString()] || []}
                                  onChange={(selected) => handleCategoryChange(product.id.toString(), selected)}
                                  placeholder="Sélectionner des catégories"
                                  className="w-48"
                                />
                                
                                {/* Afficher les badges des catégories sélectionnées */}
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {(linkedCategories[product.id.toString()] || []).map((catId) => {
                                    const category = categories.find(c => c.id === catId);
                                    return category ? (
                                      <span 
                                        key={catId} 
                                        className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800"
                                      >
                                        {category.name}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                                
                                {updatingProduct === product.id.toString() && (
                                  <div className="text-xs text-blue-500">Mise à jour...</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">Éditer</Button>
                                <Button variant="destructive" size="sm">Supprimer</Button>
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
  );
};

export default ProduitsPage; 