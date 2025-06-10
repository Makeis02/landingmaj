import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/useCartStore";
import { X } from "lucide-react";

interface CartActionsProps {
  total: number;
  items: any[];
  firstThresholdValue: number;
  onCheckout: () => void;
}

const CartActions = ({ total, items, firstThresholdValue, onCheckout }: CartActionsProps) => {
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState("");
  const navigate = useNavigate();
  
  // 🎫 NOUVEAU : Utilisation du store pour les codes promo
  const { 
    items: cartItems, 
    appliedPromoCode, 
    isApplyingPromo, 
    applyPromoCode, 
    removePromoCode, 
    getTotalWithPromo 
  } = useCartStore();
  
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
    if (item.type !== 'wheel_gift') return false;
    if (!item.expires_at) return false;
    return new Date(item.expires_at) < now;
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

  // 🎫 NOUVEAU : Utiliser les totaux avec promo
  const { subtotal, discount, total: finalTotal } = getTotalWithPromo();

  // Calculer les économies totales des réductions produits (différent des codes promo)
  const totalSavings = items
    .filter(item => !item.is_gift && !item.threshold_gift && item.has_discount && item.original_price)
    .reduce((acc, item) => {
      const originalTotal = (item.original_price || 0) * item.quantity;
      const discountedTotal = item.price * item.quantity;
      return acc + (originalTotal - discountedTotal);
    }, 0);

  // 🎫 NOUVELLE FONCTION : Appliquer le code promo
  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un code promo",
        variant: "destructive",
      });
      return;
    }

    const result = await applyPromoCode(promoCode.trim());
    
    if (result.success) {
      setPromoCode(""); // Réinitialiser le champ
      toast({
        title: "✅ Code promo appliqué !",
        description: result.message,
      });
    } else {
      toast({
        title: "❌ Code promo invalide",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  // 🎫 NOUVELLE FONCTION : Supprimer le code promo
  const handleRemovePromoCode = () => {
    removePromoCode();
    toast({
      title: "Code promo retiré",
      description: "Le code promo a été supprimé de votre panier",
    });
  };

  // Logique d'affichage livraison (utiliser finalTotal au lieu de total)
  let shippingLabel = "À déterminer";
  let infoMessage = "";
  let showInfo = false;
  if (freeShippingThreshold !== null) {
    if (finalTotal >= freeShippingThreshold) {
      shippingLabel = "Gratuit";
      infoMessage = `Livraison gratuite à partir de ${freeShippingThreshold}€ d'achat !`;
      showInfo = false;
    } else {
      shippingLabel = "À déterminer";
      const diff = (freeShippingThreshold - finalTotal).toFixed(2);
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
        variant: "destructive",
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

      {/* 🎫 NOUVELLE SECTION : Gestion des codes promo */}
      {appliedPromoCode ? (
        // Code promo appliqué
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">%</span>
              </div>
              <div>
                <p className="font-medium text-green-800">Code promo appliqué</p>
                <p className="text-sm text-green-600">
                  {appliedPromoCode.code} - {appliedPromoCode.type === 'percentage' ? `${appliedPromoCode.value}%` : `${appliedPromoCode.value}€`} de réduction
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemovePromoCode}
              className="text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        // Saisie du code promo
        <div className="flex gap-2">
          <Input
            placeholder="Code promo"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleApplyPromoCode();
              }
            }}
            disabled={isApplyingPromo}
          />
          <Button 
            onClick={handleApplyPromoCode}
            disabled={isApplyingPromo || !promoCode.trim()}
          >
            {isApplyingPromo ? "..." : "Appliquer"}
          </Button>
        </div>
      )}

      <div className="border-t pt-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Sous-total</span>
          <span>{subtotal.toFixed(2)}€</span>
        </div>
        {totalSavings > 0 && (
          <div className="flex justify-between mb-2">
            <span className="text-green-600">Économies produits</span>
            <span className="text-green-600 font-medium">-{totalSavings.toFixed(2)}€</span>
          </div>
        )}
        {/* 🎫 NOUVEAU : Affichage de la réduction du code promo */}
        {discount > 0 && (
          <div className="flex justify-between mb-2">
            <span className="text-blue-600">Code promo ({appliedPromoCode?.code})</span>
            <span className="text-blue-600 font-medium">-{discount.toFixed(2)}€</span>
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
              <span className="text-base font-bold">{finalTotal.toFixed(2)} €</span>
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
