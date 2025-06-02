import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Liste des routes protégées qui nécessitent une authentification
      const protectedRoutes = [
        '/account',
        '/account/orders',
        '/account/addresses',
        '/account/favorites'
      ];

      // Vérifie si la route actuelle est protégée
      const isProtectedRoute = protectedRoutes.some(route => 
        location.pathname.startsWith(route)
      );

      // Redirige vers la page de connexion uniquement si :
      // 1. L'utilisateur n'est pas connecté
      // 2. La route actuelle est protégée
      // 3. L'utilisateur n'est pas déjà sur la page de connexion ou d'inscription
      if (!session && isProtectedRoute && 
          !location.pathname.includes('/account/login') && 
          !location.pathname.includes('/account/signup')) {
        navigate("/account/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location]);

  return <>{children}</>;
};

export default AuthProvider; 