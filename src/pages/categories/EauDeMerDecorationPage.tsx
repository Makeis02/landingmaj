import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, ChevronDown, Filter, Star, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { fetchShopifyProducts, ShopifyProduct } from "@/lib/api/shopify";
import { fetchCategoriesForProducts } from "@/lib/api/product-categories";
import { fetchCategories, Category } from "@/lib/api/categories";

// Type étendu pour les produits Shopify dans cette page
type ExtendedShopifyProduct = ShopifyProduct & {
  // Propriétés optionnelles supplémentaires pour l'affichage
  description?: string;
  onSale?: boolean;
  salePrice?: string;
};

// Données de filtres
const filters = {
  price: { min: 0, max: 300 },
  brands: [
    { id: 1, name: "Tetra", count: 45 },
    { id: 2, name: "JBL", count: 32 },
    { id: 3, name: "Fluval", count: 28 },
    { id: 4, name: "Sera", count: 24 },
    { id: 5, name: "Aquael", count: 19 },
  ],
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

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const currentSlug = slug || "eaudemerdecoration";
  const [priceRange, setPriceRange] = useState([0, 300]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<number[]>([]);
  const [inStock, setInStock] = useState(true);
  const [promoOnly, setPromoOnly] = useState(false);
  
  // Nouveaux états pour les produits Shopify
  const [products, setProducts] = useState<ExtendedShopifyProduct[]>([]);
  const [linkedCategories, setLinkedCategories] = useState<Record<string, string[]>>({});
  const [filteredProducts, setFilteredProducts] = useState<ExtendedShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [subCategories, setSubCategories] = useState<Category[]>([]);

  // Obtenir les informations de la catégorie
  const categoryInfo = {
    title: "Décorations Eau Douce",
    description: "Embellissez votre aquarium d'eau douce avec nos décorations spécialement sélectionnées.",
    bannerImage: "/placeholder.svg"
  };
  
  // Charger les produits et les catégories liées
  useEffect(() => {
    console.log("🚀 Début du chargement des produits pour le slug:", currentSlug);
    
    const loadProductsAndCategories = async () => {
      console.log("🚀 Début de loadProductsAndCategories()");
      try {
        setIsLoading(true);

        // Charger tous les produits Shopify
        console.log("📤 Avant l'appel fetchShopifyProducts()");
        const allProducts = await fetchShopifyProducts();
        console.log("🛒 Produits Shopify récupérés:", allProducts);
        
        // Convertir les produits au format étendu
        const extendedProducts: ExtendedShopifyProduct[] = Array.isArray(allProducts) 
          ? allProducts.map(product => ({
              ...product,
              onSale: false, // Par défaut, pas en promotion
              description: "", // Description vide par défaut
            }))
          : [];
        
        console.log("📦 Produits étendus:", extendedProducts);
        setProducts(extendedProducts);

        if (extendedProducts.length === 0) {
          console.warn("⚠️ Aucun produit récupéré de Shopify !");
          setError("Aucun produit disponible.");
          setIsLoading(false);
          return;
        }

        // Charger les catégories liées pour ces produits
        const productIds = extendedProducts.map(p => p.id.toString());
        console.log("🔑 IDs des produits à rechercher:", productIds);
        const categoriesByProduct = await fetchCategoriesForProducts(productIds);
        console.log("🔗 Catégories par produit:", categoriesByProduct);
        setLinkedCategories(categoriesByProduct);

        // Charger toutes les catégories depuis Supabase
        const categoriesData = await fetchCategories();
        console.log("📚 Toutes les catégories récupérées:", categoriesData);
        setAllCategories(categoriesData);

        // Trouver la catégorie mère par son slug
        const parentCategory = categoriesData.find(
          (cat) => cat.slug === currentSlug
        );
        
        console.log("🎯 Catégorie mère trouvée via slug:", parentCategory);
        
        if (!parentCategory) {
          console.error("❌ Catégorie non trouvée pour ce slug:", currentSlug);
          // Pour aider au débogage, affichons les slugs disponibles
          console.log("🔍 Slugs disponibles:", categoriesData.map(cat => cat.slug));
          setError("Catégorie non trouvée.");
          setIsLoading(false);
          return;
        }
        
        setParentCategory(parentCategory);
        
        // Trouver les sous-catégories par parent_id
        const childCategories = findSubCategories(categoriesData, parentCategory.id);
        console.log("🌿 Sous-catégories trouvées:", childCategories);
        setSubCategories(childCategories);
        
        // Récupérer les IDs des sous-catégories ET du parent
        // Pour accepter les produits liés soit au parent soit aux enfants
        const categoryIds = [parentCategory.id, ...childCategories.map(cat => cat.id)].filter(Boolean);
        console.log("🔑 IDs des catégories (parent + enfants):", categoryIds);

        // Filtrer les produits qui appartiennent à la catégorie parent ou à ses sous-catégories
        const filtered = extendedProducts.filter(product => {
          const productId = product.id.toString();
          const linked = categoriesByProduct[productId] || [];
          console.log(`🔎 Produit ${product.title} (ID: ${productId}):`);
          console.log(`🔗 Lié aux catégories:`, linked);
          const shouldKeep = linked.some(catId => categoryIds.includes(catId));
          console.log(`✅ Garder ce produit ? ${shouldKeep}`);
          return shouldKeep;
        });

        console.log("🛒 Produits filtrés:", filtered);
        setFilteredProducts(filtered);
        setError(null);
      } catch (err) {
        console.error("❌ Erreur lors du chargement:", err);
        setError("Impossible de charger les produits. Veuillez réessayer plus tard.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProductsAndCategories();
  }, [currentSlug]);

  // Les filtres sont désactivés pour l'instant
  useEffect(() => {
    // Volontairement vide pour désactiver les filtres
    // tout en conservant l'interface utilisateur
  }, [products]);

  // Gérer les changements de filtres
  const handleBrandToggle = (brandId: number) => {
    setSelectedBrands(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  const toggleMobileFilters = () => {
    setMobileFiltersOpen(!mobileFiltersOpen);
  };

  // Rendu des étoiles pour les notes
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={`${
              i < Math.floor(rating) 
                ? "text-yellow-500 fill-yellow-500" 
                : i < rating 
                  ? "text-yellow-500 fill-yellow-500 opacity-50" 
                  : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div>
        {/* Hero Banner */}
        <div 
          className="relative bg-cover bg-center py-16" 
          style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${categoryInfo.bannerImage})` }}
        >
          <div className="container mx-auto text-center text-white">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{categoryInfo.title}</h1>
            <p className="max-w-2xl mx-auto">{categoryInfo.description}</p>
            
            <div className="flex items-center justify-center gap-2 mt-4 text-sm">
              <Link to="/">Accueil</Link>
              <span>/</span>
              <span className="font-medium">Catégories</span>
              <span>/</span>
              <span className="font-medium">{categoryInfo.title}</span>
            </div>
          </div>
        </div>
      </div>
      
      <main className="flex-grow container mx-auto px-4 py-8">
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
                        defaultValue={[0, 300]} 
                        max={300} 
                        step={1} 
                        value={priceRange}
                        onValueChange={setPriceRange}
                      />
                      <div className="flex justify-between mt-2 text-sm">
                        <span>{priceRange[0]}€</span>
                        <span>{priceRange[1]}€</span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Marques */}
                  <div>
                    <h3 className="font-medium mb-3">Marques</h3>
                    <div className="space-y-2">
                      {filters.brands.map((brand) => (
                        <div key={brand.id} className="flex items-center">
                          <Checkbox 
                            id={`brand-mobile-${brand.id}`}
                            checked={selectedBrands.includes(brand.id)}
                            onCheckedChange={() => handleBrandToggle(brand.id)}
                          />
                          <label 
                            htmlFor={`brand-mobile-${brand.id}`}
                            className="ml-2 text-sm flex-grow"
                          >
                            {brand.name}
                          </label>
                          <span className="text-xs text-gray-500">({brand.count})</span>
                        </div>
                      ))}
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
                    defaultValue={[0, 300]} 
                    max={300} 
                    step={1} 
                    value={priceRange}
                    onValueChange={setPriceRange}
                  />
                  <div className="flex justify-between mt-2 text-sm">
                    <span>{priceRange[0]}€</span>
                    <span>{priceRange[1]}€</span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Marques */}
              <div>
                <h3 className="font-medium mb-3">Marques</h3>
                <div className="space-y-2">
                  {filters.brands.map((brand) => (
                    <div key={brand.id} className="flex items-center">
                      <Checkbox 
                        id={`brand-${brand.id}`}
                        checked={selectedBrands.includes(brand.id)}
                        onCheckedChange={() => handleBrandToggle(brand.id)}
                      />
                      <label 
                        htmlFor={`brand-${brand.id}`}
                        className="ml-2 text-sm flex-grow"
                      >
                        {brand.name}
                      </label>
                      <span className="text-xs text-gray-500">({brand.count})</span>
                    </div>
                  ))}
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
                filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow duration-300 group">
                    {/* Désactiver l'affichage des promos pour l'instant */}
                    {false && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        PROMO
                      </div>
                    )}
                    <div className="relative h-48 bg-gray-100">
                      <img 
                        src={product.image || "/placeholder.svg"} 
                        alt={product.title} 
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium line-clamp-2 mb-1 h-12">{product.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-2 h-10">{"Description non disponible"}</p>
                      
                      <div className="flex items-center mb-3">
                        {renderStars(4.5)} {/* Par défaut, ou remplacer par une vraie note */}
                        <span className="text-xs ml-1 text-gray-500">(4.5)</span>
                      </div>
                      
                      <div className="flex items-baseline mb-3">
                        {/* Afficher simplement le prix sans promotion pour l'instant */}
                        <span className="text-lg font-bold text-slate-900">{parseFloat(product.price).toFixed(2)}€</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" className="flex-grow">
                          <ShoppingCart size={16} className="mr-1" />
                          Ajouter
                        </Button>
                        <Button variant="outline" size="icon">
                          <CheckCircle size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            
            {/* Pagination */}
            {!isLoading && !error && filteredProducts.length > 0 && (
              <div className="mt-10 flex justify-center">
                <nav className="flex items-center gap-1">
                  <Button variant="outline" size="sm" disabled>Précédent</Button>
                  <Button variant="default" size="sm">1</Button>
                  <Button variant="outline" size="sm">2</Button>
                  <Button variant="outline" size="sm">3</Button>
                  <span className="mx-1">...</span>
                  <Button variant="outline" size="sm">8</Button>
                  <Button variant="outline" size="sm">Suivant</Button>
                </nav>
              </div>
            )}
          </div>
        </div>
      </main>
      
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

export default CategoryPage;