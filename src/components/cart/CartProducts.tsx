import { useCartStore } from "@/stores/useCartStore";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const CartProducts = () => {
  const { items, updateQuantity, removeItem } = useCartStore();
  const now = new Date();

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

  // Fonction pour formater l'affichage des variantes
  const formatVariant = (variant: string | undefined) => {
    if (!variant) return null;
    
    // Diviser les différentes variantes s'il y en a plusieurs
    const variants = variant.split('|');
    
    return variants.map(v => {
      const [name, value] = v.split(':');
      return (
        <span key={v} className="text-xs bg-gray-100 px-2 py-1 rounded mr-1">
          {name}: {value}
        </span>
      );
    });
  };

  // 🆕 Fonction pour vérifier si un cadeau est expiré
  const isGiftExpired = (item) => {
    if (item.type !== 'wheel_gift') return false;
    if (!item.expires_at) return false;
    
    const expiresAt = new Date(item.expires_at);
    return now > expiresAt;
  };

  // 🆕 Fonction pour calculer le temps restant (heures, minutes, secondes)
  const getTimeRemaining = (expiresAt) => {
    const diff = new Date(expiresAt) - now;
    if (diff <= 0) return 'Expiré';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {items.map((item) => {
          const isExpired = isGiftExpired(item);
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex items-center gap-4 p-4 bg-white rounded-lg border ${
                isExpired 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-white border-gray-200'
              }`}
            >
              {/* 🆕 Timer explicite pour les cadeaux de la roue */}
              {item.type === 'wheel_gift' && !isExpired && (
                <div className="flex flex-col items-center mr-4">
                  <span className="text-xs text-orange-700 font-semibold bg-orange-100 px-2 py-1 rounded mb-1">
                    ⏰ Temps restant
                  </span>
                  <span className="text-sm font-mono text-orange-800 bg-orange-50 px-2 py-1 rounded shadow">
                    {getTimeRemaining(item.expires_at)}
                  </span>
                </div>
              )}

              {/* 🆕 Badge d'expiration */}
              {isExpired && (
                <div className="absolute top-2 right-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                  ⏰ Expiré
                </div>
              )}

              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-20 h-20 object-contain rounded bg-white p-1"
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
                
                {/* Afficher la variante si elle existe */}
                {item.variant && (
                  <div className="mt-1 mb-2 flex flex-wrap gap-1">
                    {formatVariant(item.variant)}
                  </div>
                )}
                
                {/* Affichage du prix avec gestion des réductions */}
                {!item.is_gift && !item.threshold_gift && (
                  <div className="text-sm mb-1">
                    {item.has_discount && item.original_price ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 line-through text-xs">
                          {item.original_price.toFixed(2)}€
                        </span>
                        <span className="text-slate-900 font-medium">
                          {item.price.toFixed(2)}€
                        </span>
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
                          -{item.discount_percentage}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500">{item.price.toFixed(2)}€</span>
                    )}
                  </div>
                )}
                
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
          );
        })}
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
