
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/useCartStore";
import { supabase } from "@/integrations/supabase/client";

const CartSummary = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { items, getTotal } = useCartStore();
  const total = getTotal();
  
  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      
      // Call edge function to create Shopify checkout
      const { data: { checkoutUrl }, error } = await supabase.functions.invoke('create-shopify-checkout', {
        body: { items: items.map(item => ({
          id: item.id,
          quantity: item.quantity
        })) }
      });

      if (error) throw error;

      // Redirect to Shopify checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error creating checkout:', error);
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
            <span className="text-green-600">Gratuit</span>
          </div>
          
          <div className="flex justify-between font-medium text-lg mt-4">
            <span>Total</span>
            <span>{total.toFixed(2)}€</span>
          </div>
        </div>

        <Button 
          className="w-full mt-6"
          disabled={isLoading || items.length === 0}
          onClick={handleCheckout}
        >
          {isLoading ? "Redirection..." : "Procéder au paiement"}
        </Button>
      </div>
    </div>
  );
};

export default CartSummary;
