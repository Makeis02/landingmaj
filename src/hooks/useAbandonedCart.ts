import { useEffect, useRef } from 'react';
import { useCartStore } from '@/stores/useCartStore';
import { useUserStore } from '@/stores/useUserStore';

interface UseAbandonedCartOptions {
  delayMinutes?: number; // Délai avant de considérer le panier comme abandonné
  checkIntervalMinutes?: number; // Intervalle de vérification
}

export const useAbandonedCart = (options: UseAbandonedCartOptions = {}) => {
  const { delayMinutes = 30, checkIntervalMinutes = 5 } = options;
  const { items, upsertAbandonedCart, markCartAsRecovered } = useCartStore();
  const { user } = useUserStore();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<Date>(new Date());

  // Mettre à jour l'activité quand l'utilisateur interagit
  const updateActivity = () => {
    lastActivityRef.current = new Date();
  };

  // Vérifier si le panier doit être marqué comme abandonné
  const checkAbandonedCart = () => {
    const now = new Date();
    const timeSinceLastActivity = (now.getTime() - lastActivityRef.current.getTime()) / (1000 * 60); // en minutes
    
    // Si pas d'activité depuis le délai et qu'il y a des items payants
    const payableItems = items.filter(item => !item.is_gift && !item.threshold_gift);
    if (timeSinceLastActivity >= delayMinutes && payableItems.length > 0) {
      console.log('🛒 [ABANDONED-CART] Détection panier abandonné:', {
        timeSinceLastActivity: Math.round(timeSinceLastActivity),
        delayMinutes,
        itemCount: payableItems.length
      });
      
      // Sauvegarder le panier abandonné
      upsertAbandonedCart();
    }
  };

  // Marquer comme récupéré si l'utilisateur passe une commande
  const markAsRecovered = () => {
    markCartAsRecovered();
  };

  useEffect(() => {
    // Écouter les événements d'activité utilisateur
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Démarrer la vérification périodique
    intervalRef.current = setInterval(checkAbandonedCart, checkIntervalMinutes * 60 * 1000);

    // Nettoyage
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [items, delayMinutes, checkIntervalMinutes]);

  // Réinitialiser l'activité quand le panier change
  useEffect(() => {
    updateActivity();
  }, [items]);

  return {
    markAsRecovered
  };
}; 