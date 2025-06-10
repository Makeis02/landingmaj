import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/useCartStore";

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
  const { items: cartItems } = useCartStore();
  const now = new Date();

  // 🎁 NOUVEAU : Calcul des produits payants vs cadeaux
  const payableItems = items.filter(item => !item.is_gift && !item.threshold_gift);
  const hasOnlyGifts = items.length > 0 && payableItems.length === 0;
  const canCheckout = payableItems.length > 0; // Peut checkout seulement s'il y a des produits payants

  // Ajout : récupération du seuil de livraison gratuite et du prix de livraison
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null);
  const [shippingPrice, setShippingPrice] = useState<number | null>(null);

  // 🆕 Vérifier si des cadeaux sont expirés
  const hasExpiredGifts = items.some(item => {
    if ((item as any).type !== 'wheel_gift') return false;
    if (!(item as any).expires_at) return false;
    return new Date((item as any).expires_at) < now;
  });

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

  // 🆕 Filtrer les cadeaux expirés
  const handleCheckout = () => {
    if (hasExpiredGifts) {
      toast({
        title: "⏰ Cadeaux expirés",
        description: "Certains cadeaux de votre panier ont expiré. Veuillez les retirer avant de continuer.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    onCheckout();
  };

  return (
    <div className="mt-6 space-y-4">
      {hasExpiredGifts && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Cadeaux expirés dans votre panier
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  Certains cadeaux de votre panier ont expiré. Veuillez les retirer avant de continuer.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
        
        {/* 🎁 Message informatif si seulement des cadeaux */}
        {hasOnlyGifts && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-center text-amber-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="text-xs">
                <span className="font-medium">Panier contenant uniquement des cadeaux</span>
                <br />
                <span>Ajoutez des produits payants pour commander</span>
              </div>
            </div>
          </div>
        )}
        
        {items.length > 0 && (
          <div className="flex flex-col gap-3 mt-6">
            <Button 
              className={`rounded-xl transition-colors px-6 py-2 font-semibold w-full flex items-center justify-center gap-2 ${
                !canCheckout 
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed hover:bg-gray-400' 
                  : 'bg-[#0074b3] text-white hover:bg-[#005a8c]'
              }`}
              disabled={!canCheckout}
              onClick={handleCheckout}
            >
              {!canCheckout ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Ajoutez des produits pour commander
                </>
              ) : (
                <>
              Payer
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartActions;
