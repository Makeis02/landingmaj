import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Flame, Plus, Check } from "lucide-react";
import { EditableText } from "./EditableText";
import { EditableURL } from "./EditableURL";
import { Link } from "react-router-dom";
import { EditableImage } from "./EditableImage";
import { useCartStore } from "@/stores/useCartStore";
import { useToast } from "@/components/ui/use-toast";

const BestSellers = () => {
  const { toast } = useToast();
  const { items: cartItems, addItem } = useCartStore();

  const { data: bestSellers } = useQuery({
    queryKey: ["bestSellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_bestseller", true)
        .order("monthly_orders", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const { data: content } = useQuery({
    queryKey: ["bestseller-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editable_content")
        .select("*")
        .eq("content_key", "bestseller_cta_url")
        .single();

      if (error) throw error;
      return data?.content || "/products";
    },
  });

  const handleAddToCart = async (product: any) => {
    await addItem({
      id: product.shopify_id,
      title: product.title,
      price: product.price,
      quantity: 1,
      image_url: product.image_url,
    });
    
    toast({
      title: "Produit ajouté",
      description: `${product.title} a été ajouté à votre panier`,
    });
  };

  if (!bestSellers?.length) return null;

  return (
    <section className="py-20 bg-white">
      <div className="container">
        <div className="flex items-center gap-2 mb-12">
          <EditableText
            contentKey="bestsellers_title"
            initialContent="Nos Best-Sellers"
            className="text-3xl font-bold"
          />
          <Flame className="h-8 w-8 text-orange-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
          {bestSellers.map((product) => {
            const isInCart = cartItems.some(item => item.id === product.shopify_id);
            
            return (
              <Card key={product.id} className="group hover:shadow-lg transition-shadow flex flex-col">
                <div className="relative">
                  <EditableImage
                    imageKey={`product_${product.id}`}
                    initialUrl={product.image_url || "https://images.unsplash.com/photo-1584267651117-32aacc26307b"}
                    className="w-full aspect-square object-cover rounded-t-lg"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Flame className="h-4 w-4" />
                      Best-Seller
                    </span>
                  </div>
                </div>

                <CardContent className="p-6 flex-grow">
                  <h3 className="font-semibold mb-3 text-lg line-clamp-2 min-h-[3.5rem]">{product.title}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-ocean">
                      {product.price} €
                    </span>
                    {product.monthly_orders > 0 && (
                      <span className="text-sm text-gray-600">
                        {product.monthly_orders} fois commandé ce mois-ci
                      </span>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="p-6 pt-0 flex-shrink-0 space-y-3 flex flex-col">
                  <Button 
                    onClick={() => handleAddToCart(product)}
                    className="w-full"
                    variant={isInCart ? "secondary" : "default"}
                    size="lg"
                  >
                    {isInCart ? (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        Dans le panier
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-5 w-5" />
                        Ajouter au panier
                      </>
                    )}
                  </Button>
                  <Link to={content || "/products"} className="w-full">
                    <Button variant="outline" className="w-full" size="lg">
                      <EditableText
                        contentKey="bestseller_cta"
                        initialContent="Voir le produit"
                        className="text-foreground"
                      />
                    </Button>
                  </Link>
                  <EditableURL
                    contentKey="bestseller_cta_url"
                    initialContent="/products"
                  />
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BestSellers;