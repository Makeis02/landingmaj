
import { useCartStore } from "@/stores/useCartStore";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const CartProducts = () => {
  const { items, updateQuantity, removeItem } = useCartStore();

  const handleQuantityChange = async (productId: string, change: number, isGift: boolean, isThresholdGift: boolean) => {
    if (isGift || isThresholdGift) {
      toast({
        title: "Action non autorisée",
        description: "Les articles cadeaux ne peuvent pas être modifiés",
        variant: "destructive",
      });
      return;
    }

    const item = items.find((i) => i.id === productId);
    if (!item) return;

    const newQuantity = Math.max(0, item.quantity + change);
    if (newQuantity === 0) {
      await removeItem(productId);
      toast({
        title: "Produit retiré",
        description: "Le produit a été retiré de votre panier",
      });
    } else {
      await updateQuantity(productId, newQuantity);
    }
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`flex items-center gap-4 p-4 bg-white rounded-lg border ${
              item.is_gift || item.threshold_gift ? 'border-blue-200 bg-blue-50' : ''
            }`}
          >
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.title}
                className="w-20 h-20 object-cover rounded"
              />
            )}

            <div className="flex-grow">
              <h3 className="font-medium">
                {item.title}
                {(item.is_gift || item.threshold_gift) && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-2 inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    Cadeau offert
                  </motion.span>
                )}
              </h3>
              
              {!item.is_gift && !item.threshold_gift && <p className="text-sm text-gray-500">{item.price}€</p>}
              
              {!item.is_gift && !item.threshold_gift && (
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(item.id, -1, item.is_gift || false, item.threshold_gift || false)}
                    className="h-8 w-8"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>

                  <span className="w-8 text-center font-medium">
                    {item.quantity}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(item.id, 1, item.is_gift || false, item.threshold_gift || false)}
                    className="h-8 w-8"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="h-8 w-8 ml-2 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {!item.is_gift && !item.threshold_gift && (
              <div className="text-right">
                <p className="font-medium">
                  {(item.price * item.quantity).toFixed(2)}€
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {items.length === 0 && (
        <p className="text-center text-gray-500">
          Votre panier est vide
        </p>
      )}
    </div>
  );
};

export default CartProducts;
