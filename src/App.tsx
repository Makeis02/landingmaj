import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, BrowserRouter } from "react-router-dom";
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
import { useLocation } from "react-router-dom";
import { useCartStore } from "@/stores/useCartStore";

const queryClient = new QueryClient();

const App = () => {
  useRestoreSession();
  const { isEditMode } = useEditStore();
  const [showWheel, setShowWheel] = useState(false);
  const [editWheel, setEditWheel] = useState(false);
  const [isWheelEnabled, setIsWheelEnabled] = useState(true);
  const [wheelSettings, setWheelSettings] = useState(null);
  const location = useLocation();
  const { items: cartItems } = useCartStore();

  // Vérifier si la roue est activée et récupérer tous les paramètres
  useEffect(() => {
    const checkWheelStatus = async () => {
      const { data, error } = await supabase
        .from('wheel_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const settings = data[0];
        setWheelSettings(settings);
        setIsWheelEnabled(settings.is_enabled);
        
        if (settings.is_enabled) {
          // Vérifier toutes les conditions avant d'afficher
          if (await shouldShowWheel(settings)) {
            setTimeout(() => setShowWheel(true), (settings.auto_show_delay || 5) * 1000);
          }
        }
      }
    };

    checkWheelStatus();
  }, [location.pathname]); // Re-vérifier à chaque changement de page

  // Fonction pour vérifier si la roue doit être affichée
  const shouldShowWheel = async (settings) => {
    // 1. Vérifier les pages autorisées
    if (!checkPageMatch(settings.show_on_pages || '/', location.pathname)) {
      console.log('🚫 Page non autorisée pour la roue');
      return false;
    }

    // 2. Vérifier la condition du panier
    if (!checkCartCondition(settings.show_when_cart || 'any', cartItems)) {
      console.log('🚫 Condition panier non respectée');
      return false;
    }

    // 3. Vérifier l'anti-spam (localStorage)
    if (!checkAntiSpam(settings.popup_seen_cooldown || 1)) {
      console.log('🚫 Popup déjà vu récemment (anti-spam)');
      return false;
    }

    // 4. Vérifier le ciblage utilisateur (TODO: implémenter selon besoins)
    if (!await checkUserTargeting(settings.show_to || 'all')) {
      console.log('🚫 Ciblage utilisateur non respecté');
      return false;
    }

    return true;
  };

  // Vérifier si la page actuelle correspond aux pages autorisées
  const checkPageMatch = (allowedPages, currentPath) => {
    const pages = allowedPages.split(',').map(p => p.trim());
    return pages.some(page => {
      if (page === '/') return currentPath === '/';
      if (page.endsWith('*')) {
        const prefix = page.slice(0, -1);
        return currentPath.startsWith(prefix);
      }
      return currentPath === page;
    });
  };

  // Vérifier la condition du panier
  const checkCartCondition = (condition, cartItems) => {
    switch (condition) {
      case 'empty':
        return !cartItems || cartItems.length === 0;
      case 'full':
        return cartItems && cartItems.length > 0;
      case 'any':
      default:
        return true;
    }
  };

  // Vérifier l'anti-spam via localStorage
  const checkAntiSpam = (cooldownDays) => {
    const lastSeen = localStorage.getItem('wheel_popup_last_seen');
    if (!lastSeen) return true;
    
    const lastDate = new Date(lastSeen);
    const now = new Date();
    const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return diffDays >= cooldownDays;
  };

  // Vérifier le ciblage utilisateur
  const checkUserTargeting = async (targetType) => {
    switch (targetType) {
      case 'new':
        // Vérifier si c'est un nouveau visiteur (jamais joué)
        const { data } = await supabase
          .from('wheel_spins')
          .select('id')
          .limit(1);
        return !data || data.length === 0;
      case 'not_subscribed':
        // TODO: vérifier si pas abonné à la newsletter
        return true; // Pour l'instant, on accepte tout le monde
      case 'all':
      default:
        return true;
    }
  };

  // Fonction appelée quand le popup se ferme
  const handleWheelClose = () => {
    setShowWheel(false);
    // Marquer comme vu pour l'anti-spam
    localStorage.setItem('wheel_popup_last_seen', new Date().toISOString());
  };

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
        {/* Bouton flottant pour ouvrir la roue en mode édition */}
        {isEditMode && (
          <button
            onClick={() => { setShowWheel(true); setEditWheel(true); }}
            className="fixed bottom-8 right-8 z-50 bg-cyan-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-cyan-700 transition"
          >
            🎡 Tester la roue
          </button>
        )}
        {isWheelEnabled && wheelSettings && (
          <LuckyWheelPopup 
            isOpen={showWheel} 
            onClose={handleWheelClose}
            wheelSettings={wheelSettings}
          />
        )}
      <CookieBanner />
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
