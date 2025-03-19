
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

const Products = () => {
  const { toast } = useToast();

  // Fetch products from Supabase
  const { data: products, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Sync products from Shopify
  const syncProducts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("sync-products");
      
      if (error) throw error;
      
      toast({
        title: "Succès",
        description: "Les produits ont été synchronisés avec succès",
      });
      
      // Refetch products after sync
      refetch();
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la synchronisation des produits",
        variant: "destructive",
      });
    }
  };

  return (
    <section className="py-16 bg-white">
      <div className="container">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Nos Produits</h2>
          <Button onClick={syncProducts}>
            Synchroniser les produits
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products?.map((product) => (
            <div
              key={product.id}
              className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="font-semibold mb-2">{product.title}</h3>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-ocean">
                    {product.price} €
                  </span>
                  {product.compare_at_price && (
                    <span className="text-sm text-gray-500 line-through">
                      {product.compare_at_price} €
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Products;
