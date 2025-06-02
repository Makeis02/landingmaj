import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface CartActionsProps {
  total: number;
  items: any[];
  firstThresholdValue: number;
  onCheckout: () => void;
}

const CartActions = ({ total, items, firstThresholdValue, onCheckout }: CartActionsProps) => {
  const { toast } = useToast();
  const [discountCode, setDiscountCode] = useState("");
  const navigate = useNavigate();

  // Ajout : récupération du seuil de livraison gratuite et du prix de livraison
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null);
  const [shippingPrice, setShippingPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchThreshold = async () => {
      const { data, error } = await supabase
        .from("checkout_settings")
        .select("settings")
        .single();
      if (!error && data?.settings) {
        setFreeShippingThreshold(data.settings.colissimo.free_shipping_threshold);
        setShippingPrice(data.settings.colissimo.base_price);
      }
    };
    fetchThreshold();
  }, []);

  // Calculer les économies totales
  const totalSavings = items
    .filter(item => !item.is_gift && !item.threshold_gift && item.has_discount && item.original_price)
    .reduce((acc, item) => {
      const originalTotal = (item.original_price || 0) * item.quantity;
      const discountedTotal = item.price * item.quantity;
      return acc + (originalTotal - discountedTotal);
    }, 0);

  const handleApplyDiscount = () => {
    if (!discountCode) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un code de réduction",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Information",
      description: "Cette fonctionnalité n'est pas encore disponible",
    });
  };

  // Logique d'affichage livraison
  let shippingLabel = "À déterminer";
  let infoMessage = "";
  let showInfo = false;
  if (freeShippingThreshold !== null) {
    if (total >= freeShippingThreshold) {
      shippingLabel = "Gratuit";
      infoMessage = `Livraison gratuite à partir de ${freeShippingThreshold}€ d'achat !`;
      showInfo = false;
    } else {
      shippingLabel = "À déterminer";
      const diff = (freeShippingThreshold - total).toFixed(2);
      infoMessage = `Plus que ${diff}€ pour profiter de la livraison gratuite !`;
      showInfo = true;
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Code de réduction"
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value)}
        />
        <Button onClick={handleApplyDiscount}>Appliquer</Button>
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Sous-total</span>
          <span>{total.toFixed(2)}€</span>
        </div>
        {totalSavings > 0 && (
          <div className="flex justify-between mb-2">
            <span className="text-green-600">Économies</span>
            <span className="text-green-600 font-medium">-{totalSavings.toFixed(2)}€</span>
          </div>
        )}
        <div className="flex justify-between mb-4">
          <span className="text-gray-600">Livraison</span>
          <span className={shippingLabel === "Gratuit" ? "text-green-600 font-bold" : ""}>{shippingLabel}</span>
        </div>
        {showInfo && (
          <div className="mb-2 text-center font-bold text-[#0074b3] text-base animate-pulse">
            {infoMessage}
          </div>
        )}
            <div className="flex justify-between pt-3 border-t border-slate-200">
              <span className="text-base font-medium">Total</span>
              <span className="text-base font-bold">{total.toFixed(2)} €</span>
            </div>
        {items.length > 0 && (
          <div className="flex flex-col gap-3 mt-6">
            <Button 
              className="rounded-xl bg-[#0074b3] text-white hover:bg-[#005a8c] transition-colors px-6 py-2 font-semibold w-full flex items-center justify-center gap-2" 
              onClick={() => { onCheckout(); navigate("/checkout"); }}
            >
              Payer
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartActions;
