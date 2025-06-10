import { useEffect } from 'react';
import { useCartStore } from '@/stores/useCartStore';
import { toast } from '@/hooks/use-toast';

export const useCartCleanup = () => {
  const { items, removeItem } = useCartStore();

  useEffect(() => {
    const cleanupExpiredGifts = () => {
      const now = new Date();
      let removedGifts = 0;

      items.forEach((item: any) => {
        // Vérifier uniquement les cadeaux de la roue
        if (item.type === 'wheel_gift' && item.expires_at) {
          const expiresAt = new Date(item.expires_at);
          
          if (now > expiresAt) {
            removeItem(item.id);
            removedGifts++;
          }
        }
      });

      // Notifier l'utilisateur si des cadeaux ont été retirés
      if (removedGifts > 0) {
        toast({
          title: "🎁 Cadeaux expirés retirés",
          description: `${removedGifts} cadeau${removedGifts > 1 ? 'x' : ''} expiré${removedGifts > 1 ? 's ont' : ' a'} été automatiquement retiré${removedGifts > 1 ? 's' : ''} de votre panier.`,
          variant: "destructive",
        });
      }
    };

    // Nettoyer immédiatement
    cleanupExpiredGifts();

    // Ensuite vérifier toutes les 30 secondes
    const interval = setInterval(cleanupExpiredGifts, 30000);

    return () => clearInterval(interval);
  }, [items, removeItem]);

  // Fonction utilitaire pour vérifier si un cadeau va bientôt expirer
  const checkSoonToExpire = () => {
    const now = new Date();
    const warningTime = 30 * 60 * 1000; // 30 minutes en millisecondes

    const soonToExpire = items.filter((item: any) => {
      if (item.type !== 'wheel_gift' || !item.expires_at) return false;
      
      const expiresAt = new Date(item.expires_at);
      const timeLeft = expiresAt.getTime() - now.getTime();
      
      return timeLeft > 0 && timeLeft <= warningTime;
    });

    return soonToExpire;
  };

  // Effet pour avertir des cadeaux qui vont bientôt expirer
  useEffect(() => {
    const checkWarnings = () => {
      const soonToExpire = checkSoonToExpire();
      
      if (soonToExpire.length > 0) {
        toast({
          title: "⚠️ Cadeaux bientôt expirés",
          description: `${soonToExpire.length} cadeau${soonToExpire.length > 1 ? 'x' : ''} va${soonToExpire.length > 1 ? 'ont' : ''} expirer dans moins de 30 minutes !`,
          variant: "destructive",
        });
      }
    };

    // Vérifier toutes les 5 minutes
    const warningInterval = setInterval(checkWarnings, 5 * 60 * 1000);

    return () => clearInterval(warningInterval);
  }, [items]);

  return {
    cleanupExpiredGifts: () => {
      const now = new Date();
      let removedGifts = 0;

      items.forEach((item: any) => {
        if (item.type === 'wheel_gift' && item.expires_at) {
          const expiresAt = new Date(item.expires_at);
          
          if (now > expiresAt) {
            removeItem(item.id);
            removedGifts++;
          }
        }
      });

      return removedGifts;
    },
    checkSoonToExpire
  };
}; 