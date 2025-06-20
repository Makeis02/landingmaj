import { useCartStore } from "@/stores/useCartStore";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const CartProducts = () => {
  const { items, updateQuantity, removeItem, updateItem, updateWheelGiftExpiration, cleanupExpiredGifts } = useCartStore();
  const [now, setNow] = useState(new Date());
  const [wheelSettings, setWheelSettings] = useState<any>(null);
  const [hasRecalculated, setHasRecalculated] = useState(false);

  // 🎁 Timer en temps réel pour les cadeaux de la roue
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
      // Nettoyage automatique des cadeaux expirés
      cleanupExpiredGifts();
    }, 1000);

    return () => clearInterval(interval);
  }, [cleanupExpiredGifts]);

  // 🎁 Surveillance des paramètres de la roue pour recalculer les timers
  useEffect(() => {
    const loadWheelSettings = async () => {
      try {
        const { data: settings, error } = await supabase
          .from('wheel_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (!error && settings) {
          const previousParticipationDelay = wheelSettings?.participation_delay;
          console.log('🎁 🔄 Surveillance paramètres roue:', {
            previousDelay: previousParticipationDelay,
            newDelay: settings.participation_delay,
            hasWheelGifts: items.some(item => item.type === 'wheel_gift'),
            isFirstLoad: wheelSettings === null
          });
          setWheelSettings(settings);

          // 🔄 Si le délai de participation a changé ET qu'on a des cadeaux de la roue
          if (wheelSettings !== null && // S'assurer que ce n'est pas la première fois
              previousParticipationDelay !== undefined && 
              settings.participation_delay !== previousParticipationDelay &&
              items.some(item => item.type === 'wheel_gift')) {
            
            console.log('🎁 ⏰ RECALCUL DÉCLENCHÉ - Délai de participation changé:', previousParticipationDelay, '->', settings.participation_delay);
            
            // Recalculer l'expiration de tous les cadeaux de la roue
            const wheelGifts = items.filter(item => item.type === 'wheel_gift');
            console.log('🎁 ⏰ Cadeaux à recalculer:', wheelGifts.map(g => ({ id: g.id, title: g.title, expires_at: g.expires_at })));
            
            wheelGifts.forEach(giftItem => {
              console.log(`🎁 ⏰ Recalcul pour cadeau ${giftItem.id} avec ${settings.participation_delay}h`);
              updateWheelGiftExpiration(giftItem.id, settings.participation_delay || 72);
            });
            
            // Notification utilisateur
            toast({
              title: "🎁 Timers des cadeaux mis à jour",
              description: `${wheelGifts.length} cadeau(s) de la roue synchronisé(s) avec les nouveaux paramètres (${settings.participation_delay}h)`,
              variant: "default",
            });
            
            setHasRecalculated(true);
            setTimeout(() => setHasRecalculated(false), 3000); // Reset après 3s
          }
        }
      } catch (error) {
        console.error('🎁 ❌ Erreur chargement paramètres roue:', error);
      }
    };

    // Charger immédiatement
    loadWheelSettings();

    // Puis surveiller toutes les 2 secondes
    const interval = setInterval(loadWheelSettings, 2000);
    
    return () => clearInterval(interval);
  }, [wheelSettings?.participation_delay, items, updateWheelGiftExpiration]);

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
  const isGiftExpired = (item: any) => {
    if (item.type !== 'wheel_gift') return false;
    if (!item.expires_at) return false;
    
    const expiresAt = new Date(item.expires_at);
    return now.getTime() > expiresAt.getTime();
  };

  // 🆕 Fonction pour calculer le temps restant (heures, minutes, secondes)
  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - now.getTime();
    if (diff <= 0) return 'Expiré';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Séparer les produits normaux et les cadeaux de la roue
  const wheelGifts = items.filter(item => item.type === 'wheel_gift');
  const regularItems = items.filter(item => item.type !== 'wheel_gift');

  return (
    <div className="space-y-4">
      {/* 🎁 Section spéciale pour les cadeaux de la roue */}
      {wheelGifts.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border-2 border-cyan-200">
          <h3 className="text-lg font-bold text-cyan-800 mb-3 flex items-center gap-2">
            🎁 Cadeaux de la roue de la fortune
          </h3>
          <div className="space-y-3">
      <AnimatePresence>
              {wheelGifts.map((item) => {
          const isExpired = isGiftExpired(item);
          
          return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
                    className={`flex items-center gap-4 p-3 rounded-lg border-2 ${
                isExpired 
                        ? 'bg-red-50 border-red-300' 
                        : 'bg-white border-cyan-300'
              }`}
            >
                    {/* Timer et statut */}
                    {!isExpired && (
                <div className="flex flex-col items-center mr-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded mb-1 ${
                          hasRecalculated 
                            ? 'text-green-700 bg-green-100 animate-pulse' 
                            : 'text-orange-700 bg-orange-100'
                        }`}>
                          {hasRecalculated ? '🔄 Timer recalculé' : '⏰ Expire dans'}
                  </span>
                  <span className="text-sm font-mono text-orange-800 bg-orange-50 px-2 py-1 rounded shadow">
                          {item.expires_at ? getTimeRemaining(item.expires_at) : 'Pas de limite'}
                        </span>
                        {hasRecalculated && (
                          <span className="text-xs text-green-600 mt-1">
                            Sync avec la roue
                  </span>
                        )}
                </div>
              )}

                    {/* Badge d'expiration */}
              {isExpired && (
                      <div className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-semibold">
                  ⏰ Expiré
                </div>
              )}

                    {/* Image du cadeau */}
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-16 h-16 object-contain rounded bg-white p-1 border border-cyan-200"
                      />
                    )}

                    {/* Informations du cadeau */}
                    <div className="flex-grow">
                      <h4 className="font-medium text-cyan-900">
                        {item.title}
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-2 inline-block px-2 py-1 bg-cyan-100 text-cyan-800 text-xs rounded-full"
                        >
                          🎁 Cadeau gratuit
                        </motion.span>
                      </h4>
                      
                      {item.won_at && (
                        <p className="text-xs text-cyan-600 mt-1">
                          🌟 Gagné le {new Date(item.won_at).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'long', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      )}
                      
                      <div className="text-sm font-semibold text-green-700 mt-1">
                        Gratuit - Valeur: {item.price > 0 ? `${item.price.toFixed(2)}€` : 'Cadeau'}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          
          {/* Informations sur les cadeaux de la roue */}
          <div className="mt-3 p-2 bg-cyan-100 rounded text-xs text-cyan-700">
            <p className="font-semibold">ℹ️ À propos des cadeaux de la roue :</p>
            <p>• Les cadeaux expirent après {wheelSettings?.participation_delay || 72}h</p>
            <p>• Les timers se synchronisent automatiquement avec les paramètres de la roue</p>
            <p>• Finalisez votre commande avant l'expiration pour conserver vos cadeaux</p>
          </div>
        </div>
      )}

      {/* 🛒 Section des produits normaux */}
      {regularItems.length > 0 && (
        <div>
          {wheelGifts.length > 0 && (
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              🛒 Vos produits
            </h3>
          )}
          <AnimatePresence>
            {regularItems.map((item) => {
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 mb-3"
                >
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
                    onClick={() => {
                      if (typeof item.stock === 'number' && item.quantity >= item.stock) {
                        toast({
                          title: "Stock maximum atteint",
                          description: `Stock disponible : ${item.stock}`,
                          variant: "destructive",
                        });
                        return;
                      }
                      handleQuantityChange(item.id, 1, item.is_gift || false, item.threshold_gift || false);
                    }}
                    className="h-8 w-8"
                    disabled={typeof item.stock === 'number' && item.quantity >= item.stock}
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
        </div>
      )}

      {items.length === 0 && (
        <p className="text-center text-gray-500">
          Votre panier est vide
        </p>
      )}
    </div>
  );
};

export default CartProducts;
