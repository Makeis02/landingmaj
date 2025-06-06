import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/useCartStore";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

const CartSummary = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { items, getTotal } = useCartStore();
  const total = getTotal();
  
  // 🎁 NOUVEAU : Calcul des produits payants vs cadeaux
  const payableItems = items.filter(item => !item.is_gift && !item.threshold_gift);
  const hasOnlyGifts = items.length > 0 && payableItems.length === 0;
  const canCheckout = payableItems.length > 0; // Peut checkout seulement s'il y a des produits payants
  
  // Ajout : récupération du seuil de livraison gratuite depuis Supabase
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null);
  const [shippingPrice, setShippingPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchThreshold = async () => {
      const { data, error } = await supabase
        .from("checkout_settings")
        .select("settings")
        .single();
      if (!error && data?.settings) {
        // On prend le seuil global (colissimo ou mondial_relay, c'est le même)
        setFreeShippingThreshold(data.settings.colissimo.free_shipping_threshold);
        // On prend le prix de base du transporteur par défaut (colissimo)
        setShippingPrice(data.settings.colissimo.base_price);
      }
    };
    fetchThreshold();
  }, []);

  let shippingLabel = "À déterminer";
  let infoMessage = "";
  if (freeShippingThreshold !== null) {
    if (total >= freeShippingThreshold) {
      shippingLabel = "Gratuit";
      infoMessage = `Livraison gratuite à partir de ${freeShippingThreshold}€ d'achat !`;
    } else {
      shippingLabel = shippingPrice !== null ? `${shippingPrice.toFixed(2)}€` : "À déterminer";
      const diff = (freeShippingThreshold - total).toFixed(2);
      infoMessage = `Plus que ${diff}€ pour profiter de la livraison gratuite !`;
    }
  }

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      
      // Préparer les données pour la session Stripe
      const lineItems = items
        .filter(item => !item.is_gift && !item.threshold_gift)
        .map(item => ({
          price_id: item.has_discount && item.stripe_discount_price_id 
            ? item.stripe_discount_price_id  // Utiliser le prix promotionnel si disponible
            : item.stripe_price_id,          // Sinon utiliser le prix de base
          product_id: item.id,
          quantity: item.quantity,
          variant: item.variant,
          // Informations supplémentaires pour le suivi
          has_discount: item.has_discount,
          discount_percentage: item.discount_percentage,
          original_price: item.original_price,
          price: item.price // ✅ on ajoute le prix unitaire ici
        }));
      
      // Appeler l'API pour créer une session de paiement Stripe
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          items: lineItems,
          success_url: `${window.location.origin}/commande/confirmation`,
          cancel_url: `${window.location.origin}/panier`
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la création de la session de paiement');
      }

      const { checkoutUrl } = await response.json();

      // Rediriger vers la page de paiement Stripe
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Erreur lors de la création de la session:', error);
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg bg-white">
        <h3 className="font-medium mb-4">Résumé de votre commande</h3>
        
        <div className="space-y-3 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div>
                <h4 className="font-medium">{item.title}</h4>
                <p className="text-sm text-gray-500">Quantité: {item.quantity}</p>
                {item.variant && (
                  <p className="text-xs text-gray-500">{item.variant}</p>
                )}
              </div>
              <span>{(item.price * item.quantity).toFixed(2)}€</span>
            </div>
          ))}
        </div>
        
        <div className="border-t pt-4 mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Sous-total</span>
            <span>{total.toFixed(2)}€</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Frais de livraison</span>
            <span className={shippingLabel === "Gratuit" ? "text-green-600 font-bold" : ""}>{shippingLabel}</span>
          </div>
          
          <div className="flex justify-between font-medium text-lg mt-4">
            <span>Total</span>
            <span>{(total + (shippingLabel === "Gratuit" ? 0 : shippingPrice || 0)).toFixed(2)}€</span>
          </div>
        </div>

        {infoMessage && (
          <div className="mt-2 text-xs text-center text-blue-700 font-medium">
            {infoMessage}
          </div>
        )}

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

        <Button 
          className={`w-full mt-6 ${
            !canCheckout 
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed hover:bg-gray-400' 
              : ''
          }`}
          disabled={isLoading || items.length === 0 || !canCheckout}
          onClick={handleCheckout}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirection...
            </>
          ) : !canCheckout ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.18 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Ajoutez des produits pour commander
            </>
          ) : (
            "Procéder au paiement"
          )}
        </Button>
      </div>
    </div>
  );
};

export default CartSummary;

