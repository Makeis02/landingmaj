import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Get API base URL from environment variables with fallback
const getApiBaseUrl = () => {
  // Use environment variable if available
  if (import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Fallback to current origin if in browser
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Default fallback for SSR or other contexts
  return '';
};

interface UseBeforeUnloadProps {
  userEmail: string;
  enabled?: boolean;
}

export const useBeforeUnload = ({ userEmail, enabled = true }: UseBeforeUnloadProps) => {
  useEffect(() => {
    if (!enabled || !userEmail) return;

    console.log('🔍 Mise en place des listeners de fermeture pour:', userEmail);

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        console.log('👋 L\'utilisateur quitte la page, mise à jour du statut de chat');
        try {
          const apiBaseUrl = getApiBaseUrl();
          // Utiliser fetch avec keepalive pour éviter les NetworkError
          const response = await fetch(`${apiBaseUrl}/api/update-chat-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userEmail,
              closedAt: new Date().toISOString()
            }),
            keepalive: true // Important pour beforeunload
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          console.log('✅ Statut de chat mis à jour avec succès');
        } catch (error) {
          console.error('❌ Erreur lors de la mise à jour du statut de chat:', error);
        }
      }
    };

    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      console.log('👋 L\'utilisateur ferme l\'onglet, mise à jour du statut de chat');
      try {
        const apiBaseUrl = getApiBaseUrl();
        // Utiliser fetch avec keepalive pour éviter les NetworkError
        const response = await fetch(`${apiBaseUrl}/api/update-chat-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userEmail,
            closedAt: new Date().toISOString()
          }),
          keepalive: true // Important pour beforeunload
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('✅ Statut de chat mis à jour avec succès');
      } catch (error) {
        console.error('❌ Erreur lors de la mise à jour du statut de chat:', error);
      }
    };

    // Ajouter les listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      console.log('🧹 Nettoyage des listeners de fermeture');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userEmail, enabled]);
}; 