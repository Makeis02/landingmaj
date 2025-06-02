
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ShoppingCart, Heart, CircleDot, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCartStore } from "@/stores/useCartStore";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Dummy product data for demo purposes
const demoProduct = {
  id: "1",
  title: "Filtre extérieur Fluval 307",
  brand: "Seachem",
  reference: "SE31395",
  description: "Le filtre extérieur Fluval 307 est conçu pour les aquariums jusqu'à 330 litres. Sa conception avancée offre une filtration puissante et silencieuse pour maintenir une eau cristalline. Le système de démarrage instantané facilite l'amorçage après nettoyage, évitant les problèmes courants d'autres filtres. Ses nombreux compartiments de filtration permettent d'optimiser le cycle de l'azote et d'offrir une eau parfaitement adaptée à vos poissons et plantes.",
  price: 149.99,
  image: "/placeholder.svg",
  badges: ["Eau douce", "Eau de mer", "Basse consommation"],
  specifications: [
    { name: "Débit", value: "1150 L/h" },
    { name: "Puissance", value: "15W" },
    { name: "Volume max", value: "330L" },
    { name: "Dimensions", value: "23 x 23 x 40 cm" },
    { name: "Garantie", value: "3 ans" }
  ],
  category: "filtration",
  categoryName: "Filtration"
};

// Similar products data for demo purposes
const similarProducts = [
  {
    id: "2",
    name: "Filtre JBL CristalProfi e1502",
    brand: "JBL",
    price: 179.99,
    image: "/placeholder.svg",
  },
  {
    id: "3",
    name: "Filtre Eheim Professional 4+ 350",
    brand: "Eheim",
    price: 224.99,
    image: "/placeholder.svg",
  },
  {
    id: "4",
    name: "Filtre Oase BioMaster 350",
    brand: "Oase",
    price: 189.99,
    image: "/placeholder.svg",
  },
  {
    id: "5",
    name: "Filtre Aquael Ultramax 2000",
    brand: "Aquael",
    price: 159.99,
    image: "/placeholder.svg",
  },
];

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState(demoProduct);
  const { addItem } = useCartStore();
  const [activeTab, setActiveTab] = useState("description");

  // This would normally fetch data from an API
  useEffect(() => {
    // In a real app, we would fetch the product data here
    // const fetchProductData = async () => {
    //   const response = await fetchProductById(id);
    //   setProduct(response);
    // };
    // 
    // fetchProductData();

    // For demo, we're just using the hardcoded data
    setProduct(demoProduct);
  }, [id]);

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      price: product.price,
      title: product.title,
      image_url: product.image
    });

    toast({
      title: "Produit ajouté au panier",
      description: `${product.title} a été ajouté à votre panier.`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Simple Breadcrumb Navigation */}
      <div className="bg-gray-100 py-3">
        <div className="container mx-auto px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Accueil</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/category/materiel">Matériel</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/category/eau-douce">Eau douce</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/category/accessoire">Accessoire</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/category/nettoyage">Nettoyage</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{product.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>
      
      {/* Product Information */}
      <main className="container mx-auto px-4 py-8">
        {/* Product Details - 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Left Column - Image */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <img 
              src={product.image} 
              alt={product.title} 
              className="w-full h-auto object-contain mx-auto"
              style={{ maxHeight: "500px" }}
            />
          </div>
          
          {/* Right Column - Details */}
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold mb-1">{product.title}</h2>
            
            <div className="flex items-center gap-2 mb-3 text-gray-600">
              <span className="font-medium">{product.brand}</span>
              <span>•</span>
              <span>Réf : {product.reference}</span>
            </div>
            
            {/* Water Type Badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              <div className="flex items-center rounded-md px-3 py-1 bg-[#D3E4FD] text-blue-700">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
                  <path d="M7 18C4.79086 18 3 16.2091 3 14C3 10.5 7 3 12 3C17 3 21 10.5 21 14C21 16.2091 19.2091 18 17 18C15 18 14 17 12 17C10 17 9 18 7 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#D3E4FD"/>
                </svg>
                <span className="text-xs font-medium">EAU DOUCE</span>
              </div>
              <div className="flex items-center rounded-md px-3 py-1 bg-[#0EA5E9] text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
                  <path d="M12 3L13.4328 8.50886H19.1271L14.5486 11.9822L16.2813 17.4911L12 13.7644L7.71869 17.4911L9.45138 11.9822L4.87293 8.50886H10.5672L12 3Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#0EA5E9"/>
                </svg>
                <span className="text-xs font-medium">EAU DE MER</span>
              </div>
              {product.badges.filter(badge => badge !== "Eau douce" && badge !== "Eau de mer").map((badge, index) => (
                <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                  {badge}
                </Badge>
              ))}
            </div>
            
            {/* Price */}
            <div className="text-3xl font-bold mb-6 text-slate-900">
              {product.price.toFixed(2)} €
            </div>
            
            {/* Buttons */}
            <div className="flex gap-3 mb-8">
              <Button onClick={handleAddToCart} className="flex-grow">
                <ShoppingCart className="mr-2" size={18} />
                Ajouter au panier
              </Button>
              <Button variant="outline" size="icon">
                <Heart />
              </Button>
            </div>
            
            {/* Quick Info */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="flex items-start gap-2 mb-2">
                <CircleDot className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Livraison gratuite à partir de 49€</span>
              </div>
              <div className="flex items-start gap-2 mb-2">
                <CircleDot className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>14 jours satisfait ou remboursé</span>
              </div>
              <div className="flex items-start gap-2">
                <CircleDot className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Garantie 3 ans</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs: Description and Specifications */}
        <div className="mb-12">
          <Tabs defaultValue="description" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="specifications">Caractéristiques</TabsTrigger>
            </TabsList>
            
            <TabsContent value="description" className="p-4 bg-white rounded-lg shadow-sm">
              <div className="prose max-w-none">
                <p className="mb-4">{product.description}</p>
                <p>
                  Adapté pour les aquariums d'eau douce et d'eau de mer, ce filtre assure une filtration mécanique, 
                  biologique et chimique complète. Son système de préfiltre facilite la maintenance tout en 
                  préservant la colonie bactérienne bénéfique dans les médias biologiques.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="specifications" className="p-4 bg-white rounded-lg shadow-sm">
              <table className="w-full border-collapse">
                <tbody>
                  {product.specifications.map((spec, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="py-3 px-4 font-medium">{spec.name}</td>
                      <td className="py-3 px-4">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Similar Products */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Dans la même catégorie</h2>
            <Link to={`/category/${product.category}`} className="text-blue-600 hover:underline flex items-center text-sm">
              Voir tout
              <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow duration-300 group">
                <div className="relative h-48 bg-gray-100">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium line-clamp-2 mb-1 h-12">{product.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">{product.brand}</p>
                  
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-bold text-slate-900">{product.price.toFixed(2)}€</span>
                    
                    <Button variant="ghost" size="sm">
                      <ShoppingCart size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProductPage;