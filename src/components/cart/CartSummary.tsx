import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/useCartStore";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CartSummary = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { items, getTotal } = useCartStore();
  const total = getTotal();
  
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
          original_price: item.original_price
        }));
      
      // Appeler l'API pour créer une session de paiement Stripe
      const response = await fetch('/api/stripe/create-checkout', {
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

        <Button 
          className="w-full mt-6"
          disabled={isLoading || items.length === 0}
          onClick={handleCheckout}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirection...
            </>
          ) : "Procéder au paiement"}
        </Button>
      </div>
    </div>
  );
};

export default CartSummary;

