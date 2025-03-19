
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";

const CartThresholds = () => {
  const { data: thresholds } = useQuery({
    queryKey: ["cart-thresholds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_thresholds")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const cartTotal = useCartStore((state) => state.getTotal());

  return (
    <div className="space-y-4">
      {thresholds?.map((threshold) => {
        const progress = Math.min((cartTotal / threshold.value) * 100, 100);
        const isReached = cartTotal >= threshold.value;

        return (
          <div
            key={threshold.id}
            className="p-4 border rounded-lg bg-white shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{threshold.description}</h3>
              <span className="text-sm text-gray-500">{threshold.value}€</span>
            </div>

            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {isReached ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Seuil atteint !
                    </span>
                  ) : (
                    `${Math.ceil(threshold.value - cartTotal)}€ restants`
                  )}
                </span>
                <span className="text-gray-500">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
        );
      })}

      {!thresholds?.length && (
        <p className="text-center text-gray-500">
          Aucun seuil disponible
        </p>
      )}
    </div>
  );
};

export default CartThresholds;
