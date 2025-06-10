import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation, BrowserRouter } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import CategoriesPage from "./pages/admin/CategoriesPage";
import ProduitsPage from "./pages/admin/ProduitsPage";
import BrandsPage from "./pages/admin/BrandsPage";
import LandingPage from "./pages/Landing/index";
import DecorationPage from "@/pages/categories/DecorationPage";
import Modele from "@/pages/Product/Modele";
import DynamicProductPage from "@/pages/DynamicProductPage";


import EaucDouceDécorationPage from "@/pages/categories/EaucDouceDécorationPage";

import EauDeMerDecorationPage from "@/pages/categories/EauDeMerDecorationPage";

import DecorsRecifauxPage from "@/pages/categories/DecorsRecifauxPage";
import DecorationsResinePage from "@/pages/categories/DecorationsResinePage";
import OrnementsThematiquesPage from "@/pages/categories/OrnementsThematiquesPage";
import PlantesArtificiellesCompatiblesPage from "@/pages/categories/PlantesArtificiellesCompatiblesPage";
import UniverselsDecoPage from "@/pages/categories/UniverselsDecoPage";
import EaudoucePompesPage from "@/pages/categories/EaudoucePompesPage";
import EaudemerPompesPage from "@/pages/categories/EaudemerPompesPage";


// Import des pages de politiques
import CGV from "./pages/Policies/CGV";
import CGU from "./pages/Policies/CGU";
import Privacy from "./pages/Policies/Privacy";
import Legal from "./pages/Policies/Legal";
import Shipping from "./pages/Policies/Shipping";
import Refund from "./pages/Policies/Refund";
import Terms from "./pages/Policies/Terms";
import PoliciesIndex from "./pages/Policies/IndexPolicie";

import EaudouceEclairagePage from "@/pages/categories/EaudouceEclairagePage";
import EaudemerEclairagePage from "@/pages/categories/EaudemerEclairagePage";
import EaudouceEclairageLEDPage from "@/pages/categories/EaudouceEclairageLEDPage";


import EaudemerEclairageLEDPage from "@/pages/categories/EaudemerEclairageLEDPage";


import EclairageSpectreCompletPage from "@/pages/categories/EclairageSpectreCompletPage";

import EaudouceNourriturePage from "@/pages/categories/EaudouceNourriturePage";
import EaudemerNourriturePage from "@/pages/categories/EaudemerNourriturePage";


import EauDouceEntretienPage from "@/pages/categories/EauDouceEntretienPage";
import EauDeMerEntretienPage from "@/pages/categories/EauDeMerEntretienPage";
import EntretienGeneralPage from "@/pages/categories/EntretienGeneralPage";
import ProduitsSpecifiquesPage from "@/pages/categories/ProduitsSpecifiquesPage";

import EauDouceNettoyagePage from "@/pages/categories/EauDouceNettoyagePage";
import EauDouceTraitementsPage from "@/pages/categories/EauDouceTraitementsPage";
import EauDouceFiltrationPage from "@/pages/categories/EauDouceFiltrationPage";
import EauDouceAccessoiresPage from "@/pages/categories/EauDouceAccessoiresPage";

import EauDeMerNettoyagePage from "@/pages/categories/EauDeMerNettoyagePage";

import EauDeMerFiltrationPage from "@/pages/categories/EauDeMerFiltrationPage";
import EauDeMerAccessoiresPage from "@/pages/categories/EauDeMerAccessoiresPage";


import EntretienGeneralFiltrationPage from "@/pages/categories/EntretienGeneralFiltrationPage";
import EntretienGeneralOutilsPage from "@/pages/categories/EntretienGeneralOutilsPage";




import AccessoiresPage from "@/pages/categories/AccessoiresPage";
import EpuisettesPage from "@/pages/categories/EpuisettesPage";
import PincesCiseauxPage from "@/pages/categories/PincesCiseauxPage";
import VentousesPage from "@/pages/categories/VentousesPage";
import ChauffagesPage from "@/pages/categories/ChauffagesPage";
import ThermometresPage from "@/pages/categories/ThermometresPage";

import LoginPage from "@/pages/account/LoginPage";
import SignupPage from "@/pages/account/SignupPage";
import PasswordRecoveryPage from "@/pages/account/PasswordRecoveryPage";
import OrdersPage from "@/pages/account/OrdersPage";
import AccountPage from "@/pages/account/AccountPage";
import AddressesPage from "@/pages/account/AddressesPage";
import FavoritesPage from "@/pages/account/FavoritesPage";
import { useRestoreSession } from "@/hooks/useRestoreSession";
import Checkout from "@/pages/Checkout";
import SuccessPage from "@/pages/success";
import CheckoutSettings from "@/pages/admin/CheckoutSettings";
import CommandesPage from "@/pages/admin/CommandesPage";
import OrderConfirmation from "@/pages/OrderConfirmation";
import CookieBanner from "@/components/CookieBanner";
import LuckyWheelPopup from "@/components/WheelPopup";
import { useEditStore } from "@/stores/useEditStore";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/stores/useCartStore";

const queryClient = new QueryClient();

const WheelManager = () => {
  const location = useLocation();
  const { items: cartItems } = useCartStore();
  const [isWheelEnabled, setIsWheelEnabled] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const [wheelSettings, setWheelSettings] = useState(null);

  // Vérifier si la roue est activée et récupérer tous les paramètres
  useEffect(() => {
    const checkWheelStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('wheel_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const settings = data[0];
          setWheelSettings(settings);
          setIsWheelEnabled(settings.is_enabled || false);
          
          if (settings.is_enabled) {
            // Vérifier toutes les conditions d'affichage
            const shouldShow = await shouldShowWheel(settings);
            if (shouldShow) {
              // Utiliser le délai configurable au lieu de 5 secondes en dur
              const delay = Math.max(0, (settings.auto_show_delay || 5)) * 1000;
              setTimeout(() => setShowWheel(true), delay);
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du statut de la roue:', error);
        setIsWheelEnabled(false);
      }
    };

    // Only check wheel status if we have a location
    if (location?.pathname) {
      checkWheelStatus();
    }
  }, [location?.pathname]);

  // Fonction pour vérifier si la roue doit être affichée
  const shouldShowWheel = async (settings) => {
    try {
      // Validation des paramètres
      if (!settings || !location?.pathname) {
        return false;
      }

      // 1. Vérifier si on est sur une page autorisée
      if (!isPageAllowed(settings.show_on_pages, location.pathname)) {
        console.log('Page non autorisée pour la roue');
        return false;
      }

      // 2. Vérifier la condition du panier
      if (!isCartConditionMet(settings.show_when_cart, cartItems || [])) {
        console.log('Condition panier non remplie');
        return false;
      }

      // 3. Vérifier le cooldown anti-spam (localStorage)
      if (!isAntiSpamRespected(settings.popup_seen_cooldown)) {
        console.log('Cooldown anti-spam actif');
        return false;
      }

      // 4. Vérifier le ciblage utilisateur
      const userTargetMet = await isUserTargetMet(settings.show_to);
      if (!userTargetMet) {
        console.log('Ciblage utilisateur non rempli');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la vérification des conditions:', error);
      return false;
    }
  };

  // Vérifier si la page actuelle est autorisée
  const isPageAllowed = (allowedPages, currentPath) => {
    try {
      if (!allowedPages || !currentPath) return true;
      const pages = allowedPages.split(',').map(p => p.trim()).filter(p => p.length > 0);
      if (pages.length === 0) return true;
      
      return pages.some(page => {
        if (page.endsWith('*')) {
          return currentPath.startsWith(page.slice(0, -1));
        }
        return currentPath === page;
      });
    } catch (error) {
      console.error('Erreur dans isPageAllowed:', error);
      return true; // En cas d'erreur, autoriser par défaut
    }
  };

  // Vérifier la condition du panier
  const isCartConditionMet = (condition, items) => {
    try {
      if (!condition) return true;
      if (!Array.isArray(items)) items = [];
      
      switch (condition) {
        case 'empty':
          return items.length === 0;
        case 'full':
          return items.length > 0;
        case 'any':
        default:
          return true;
      }
    } catch (error) {
      console.error('Erreur dans isCartConditionMet:', error);
      return true;
    }
  };

  // Vérifier le cooldown anti-spam
  const isAntiSpamRespected = (cooldownDays) => {
    try {
      if (!cooldownDays || cooldownDays <= 0) return true;
      
      const lastSeen = localStorage.getItem('wheel_popup_last_seen');
      if (!lastSeen) return true;
      
      const lastDate = new Date(lastSeen);
      const now = new Date();
      
      // Vérifier que les dates sont valides
      if (isNaN(lastDate.getTime()) || isNaN(now.getTime())) {
        return true;
      }
      
      const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= cooldownDays;
    } catch (error) {
      console.error('Erreur dans isAntiSpamRespected:', error);
      return true;
    }
  };

  // Vérifier le ciblage utilisateur
  const isUserTargetMet = async (targetType) => {
    try {
      if (!targetType) return true;
      
      switch (targetType) {
        case 'new':
          // Vérifier si l'utilisateur n'a jamais joué
          const hasPlayed = localStorage.getItem('wheel_has_played');
          return !hasPlayed;
        case 'not_subscribed':
          // Vérifier si l'utilisateur n'est pas abonné à la newsletter
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) return true; // Non connecté = potentiellement non abonné
            
            const { data } = await supabase
              .from('newsletter_subscribers')
              .select('email')
              .eq('email', user.email)
              .single();
            
            return !data; // Pas dans la newsletter
          } catch (authError) {
            console.error('Erreur auth dans isUserTargetMet:', authError);
            return true; // En cas d'erreur, autoriser
          }
        case 'all':
        default:
          return true;
      }
    } catch (error) {
      console.error('Erreur dans isUserTargetMet:', error);
      return true;
    }
  };

  // Gérer la fermeture de la roue
  const handleCloseWheel = () => {
    try {
      setShowWheel(false);
      // Enregistrer la date de vue pour le cooldown anti-spam
      localStorage.setItem('wheel_popup_last_seen', new Date().toISOString());
    } catch (error) {
      console.error('Erreur lors de la fermeture de la roue:', error);
    }
  };

  // Ne rien rendre si les conditions ne sont pas remplies
  if (!isWheelEnabled || !wheelSettings) {
    return null;
  }

  return (
    <LuckyWheelPopup 
      isOpen={showWheel} 
      onClose={handleCloseWheel}
      wheelSettings={wheelSettings}
    />
  );
};

const App = () => {
  useRestoreSession();
  const { isEditMode } = useEditStore();
  const [showWheel, setShowWheel] = useState(false);
  const [editWheel, setEditWheel] = useState(false);

  useEffect(() => {
    const checkEditMode = () => {
      const urlParams = new URLSearchParams(window.location.search);
      setEditWheel(urlParams.get('edit') === 'true');
    };

    checkEditMode();
    window.addEventListener('popstate', checkEditMode);
    return () => window.removeEventListener('popstate', checkEditMode);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/categories" element={<CategoriesPage />} />
          <Route path="/admin/produits" element={<ProduitsPage />} />
          <Route path="/admin/brands" element={<BrandsPage />} />
          <Route path="/landing" element={<LandingPage />} />
          
          {/* Routes des politiques */}
          <Route path="/policies" element={<PoliciesIndex />} />
          <Route path="/policies/cgv" element={<CGV />} />
          <Route path="/policies/cgu" element={<CGU />} />
          <Route path="/policies/privacy" element={<Privacy />} />
          <Route path="/policies/legal" element={<Legal />} />
          <Route path="/policies/shipping" element={<Shipping />} />
          <Route path="/policies/refund" element={<Refund />} />
          <Route path="/policies/terms" element={<Terms />} />
          
          <Route path="/categories/decoration" element={<DecorationPage />} />
          <Route path="/categories/eaudoucedecoration" element={<EaucDouceDécorationPage />} />
          <Route path="/categories/eaucdoucedecoration" element={<EaucDouceDécorationPage />} />
          <Route path="/categories/eaudemerdecoration" element={<EauDeMerDecorationPage />} />
          <Route path="/categories/decorsrecifaux" element={<DecorsRecifauxPage />} />
          <Route path="/categories/decorationsresine" element={<DecorationsResinePage />} />
          <Route path="/categories/ornementsthematiques" element={<OrnementsThematiquesPage />} />
          <Route path="/categories/plantesartificiellescompatibles" element={<PlantesArtificiellesCompatiblesPage />} />
          <Route path="/categories/universelsdeco" element={<UniverselsDecoPage />} />
          <Route path="/categories/eaudoucepompes" element={<EaudoucePompesPage />} />
          <Route path="/categories/eaudemerpompes" element={<EaudemerPompesPage />} />
          <Route path="/categories/eaudouceeclairage" element={<EaudouceEclairagePage />} />
          <Route path="/categories/eaudemerclairage" element={<EaudemerEclairagePage />} />
          <Route path="/categories/eaudouceeclairageled" element={<EaudouceEclairageLEDPage />} />
          <Route path="/categories/eaudemereclairageled" element={<EaudemerEclairageLEDPage />} />
          <Route path="/categories/eclairagespectrecomplet" element={<EclairageSpectreCompletPage />} />
          <Route path="/categories/eaudoucenourriture" element={<EaudouceNourriturePage />} />
          <Route path="/categories/eaudemernourriture" element={<EaudemerNourriturePage />} />
          <Route path="/categories/eaudouceentretien" element={<EauDouceEntretienPage />} />
          <Route path="/categories/eaudemerentretien" element={<EauDeMerEntretienPage />} />
          <Route path="/categories/entretiengeneral" element={<EntretienGeneralPage />} />
          <Route path="/categories/produitsspecifiques" element={<ProduitsSpecifiquesPage />} />
          <Route path="/categories/eaudoucenettoyage" element={<EauDouceNettoyagePage />} />
          <Route path="/categories/eaudoucetraitements" element={<EauDouceTraitementsPage />} />
          <Route path="/categories/eaudoucefiltration" element={<EauDouceFiltrationPage />} />
          <Route path="/categories/eaudouceaccessoires" element={<EauDouceAccessoiresPage />} />
          <Route path="/categories/eaudemernettoyage" element={<EauDeMerNettoyagePage />} />
          <Route path="/categories/eaudemerfiltration" element={<EauDeMerFiltrationPage />} />
          <Route path="/categories/eaudemeraccessoires" element={<EauDeMerAccessoiresPage />} />
          <Route path="/categories/accessoires" element={<AccessoiresPage />} />
          <Route path="/categories/epuisettes" element={<EpuisettesPage />} />
          <Route path="/categories/pincesciseaux" element={<PincesCiseauxPage />} />
          <Route path="/categories/ventouses" element={<VentousesPage />} />
          <Route path="/categories/chauffages" element={<ChauffagesPage />} />
          <Route path="/categories/thermometres" element={<ThermometresPage />} />
          
          {/* Route générique pour toutes les catégories avec paramètres dynamiques */}
          <Route path="/categories/:slug" element={<EaucDouceDécorationPage />} />
          <Route path="/modele" element={<Modele categoryParam={null} />} />
          <Route path="/dynamic-product" element={<DynamicProductPage />} />
          <Route path="/produits/:slug" element={<Modele />} />

          <Route path="/account/login" element={<LoginPage />} />
          <Route path="/account/signup" element={<SignupPage />} />
          <Route path="/account/password-recovery" element={<PasswordRecoveryPage />} />
          <Route path="/account/orders" element={<OrdersPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/addresses" element={<AddressesPage />} />
          <Route path="/account/favorites" element={<FavoritesPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/success" element={<SuccessPage />} />

          <Route path="/admin/checkout-settings" element={<CheckoutSettings />} />

          <Route path="/admin/commandes" element={<CommandesPage />} />

          <Route path="/order-confirmation" element={<OrderConfirmation />} />

          <Route path="/lucky-wheel" element={
            <div className="flex flex-col items-center justify-center min-h-screen">
              <Button onClick={() => { setShowWheel(true); setEditWheel(false); }} className="mb-6">Tester la roue aquatique</Button>
              <LuckyWheelPopup isOpen={showWheel} onClose={() => setShowWheel(false)} isEditMode={editWheel} />
            </div>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
        {/* Gestionnaire de la roue automatique */}
        <WheelManager />
        {/* Bouton flottant pour ouvrir la roue en mode édition */}
        {isEditMode && (
          <button
            onClick={() => { setShowWheel(true); setEditWheel(true); }}
            className="fixed bottom-8 right-8 z-50 bg-cyan-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-cyan-700 transition"
          >
            🎡 Tester la roue
          </button>
        )}
        <LuckyWheelPopup isOpen={showWheel} onClose={() => setShowWheel(false)} isEditMode={editWheel} />
      </BrowserRouter>
      <CookieBanner />
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
