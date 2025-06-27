import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import CategoriesPage from "./pages/admin/CategoriesPage";
import ProduitsPage from "./pages/admin/ProduitsPage";
import PromoCodesPage from "./pages/admin/PromoCodesPage";
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
import FloatingWheelButton from "@/components/FloatingWheelButton";
import { useEditStore } from "@/stores/useEditStore";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import FacebookPixel from "@/components/FacebookPixel";

const queryClient = new QueryClient();

const App = () => {
  useRestoreSession();
  const { isEditMode } = useEditStore();
  const [showWheel, setShowWheel] = useState(false);
  const [editWheel, setEditWheel] = useState(false);
  const [isWheelEnabled, setIsWheelEnabled] = useState(true);
  
  // Fonction de debug pour réinitialiser les paramètres de la roue
  const resetWheelState = () => {
    console.log('🔄 [DEBUG] État localStorage AVANT reset:', {
      dismissed: localStorage.getItem('wheel_popup_dismissed'),
      lastSeen: localStorage.getItem('wheel_popup_last_seen'),
      emailEntries: localStorage.getItem('wheel_email_entries')
    });
    
    localStorage.removeItem('wheel_popup_dismissed');
    localStorage.removeItem('wheel_popup_last_seen');
    localStorage.removeItem('wheel_email_entries');
    
    console.log('🔄 [DEBUG] État localStorage APRÈS reset:', {
      dismissed: localStorage.getItem('wheel_popup_dismissed'),
      lastSeen: localStorage.getItem('wheel_popup_last_seen'),
      emailEntries: localStorage.getItem('wheel_email_entries')
    });
    
    console.log('🔄 État de la roue réinitialisé - Ouverture forcée du popup');
    setShowWheel(true);
  };

  // 🆕 États pour les nouveaux déclencheurs
  const [wheelSettings, setWheelSettings] = useState(null);
  const [scrollTriggerSet, setScrollTriggerSet] = useState(false);

  // 🆕 Fonction pour afficher la roue (centralisée)
  const showWheelPopup = () => {
    if (!showWheel) {
      console.log('🎡 Affichage de la roue !');
      setShowWheel(true);
    }
  };

  // Vérifier si la roue est activée et configurer les déclencheurs
  useEffect(() => {
    const loadWheelSettings = async () => {
      console.log('🔍 [DEBUG] Démarrage de la vérification de la roue...');
      try {
        const { data, error } = await supabase
          .from('wheel_settings')
          .select('*') // Récupère tous les paramètres
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        console.log('🔍 [DEBUG] Données de la roue récupérées:', { data, error });

        // Si pas de paramètres ou erreur, utiliser des valeurs par défaut
        const settings = data || {
          is_enabled: true,
          popup_seen_cooldown: 1,
          show_on_pages: '/',
          auto_show_delay: 5,
          auto_show_popup: true,
          scroll_trigger_enabled: false,
          scroll_trigger_percentage: 50
        };

        if (error && error.code !== 'PGRST116') {
          console.warn('⚠️ Erreur lors de la récupération des paramètres de la roue:', error);
          console.log('🔄 Utilisation des paramètres par défaut');
        }
        
        console.log('🔍 [DEBUG] Paramètres finaux de la roue:', settings);
        setWheelSettings(settings);
        
        // Vérifie si la roue est activée
        if (!settings.is_enabled) {
          console.log('❌ Roue désactivée par l\'admin');
          setIsWheelEnabled(false);
          return;
        }
        
        setIsWheelEnabled(true);
        console.log('✅ Roue activée, vérification des conditions...');
        
        // 🆕 Logique anti-spam
        const userDismissed = localStorage.getItem('wheel_popup_dismissed');
        const lastSeen = localStorage.getItem('wheel_popup_last_seen');
        const cooldownDays = settings.popup_seen_cooldown || 1;
        
        console.log('🔍 [DEBUG] Anti-spam check:', { userDismissed, lastSeen, cooldownDays });
        
        if (userDismissed && lastSeen) {
          const lastDate = new Date(lastSeen);
          const now = new Date();
          const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
          
          console.log('🔍 [DEBUG] Calcul cooldown:', {
            lastDate: lastDate.toISOString(),
            now: now.toISOString(),
            diffDays: diffDays.toFixed(2),
            cooldownDays,
            shouldBlock: diffDays < cooldownDays
          });
          
          if (diffDays < cooldownDays) {
            console.log(`⏰ Anti-spam activé: popup fermé il y a ${diffDays.toFixed(1)} jours, cooldown de ${cooldownDays} jours`);
            return; // Ne pas afficher le popup
          } else {
            // Cooldown expiré, on peut réafficher
            localStorage.removeItem('wheel_popup_dismissed');
            localStorage.removeItem('wheel_popup_last_seen');
            console.log('🔄 Cooldown expiré, popup peut être réaffiché');
          }
        }
        
        // Vérifie si on est sur la bonne page
        const currentPath = window.location.pathname;
        const allowedPagesStr = settings.show_on_pages || '/';
        const allowedPages = allowedPagesStr.split(',').map(p => p.trim());
        
        const pageMatches = allowedPages.some(page => {
          if (page === '/' && currentPath === '/') return true;
          if (page === '*') return true;
          if (page.endsWith('*')) {
            const basePath = page.slice(0, -1);
            return currentPath.startsWith(basePath);
          }
          return currentPath === page || currentPath.startsWith(page + '/');
        });
        
        if (!pageMatches) {
          console.log(`📍 Page non autorisée: ${currentPath}, pages autorisées: ${allowedPages.join(', ')}`);
          return;
        }
        
        console.log(`📍 Page autorisée: ${currentPath}`);
        
        // 🆕 NOUVEAU : Logique d'affichage automatique
        if (settings.auto_show_popup) {
          const delay = Math.max((settings.auto_show_delay || 5) * 1000, 1000);
          console.log(`⏱️ [AUTO] Affichage automatique dans ${delay/1000} secondes...`);
          
          setTimeout(() => {
            showWheelPopup();
          }, delay);
        } else {
          console.log('🚫 [AUTO] Affichage automatique désactivé');
        }
        
      } catch (err) {
        console.error('❌ Erreur lors de la vérification de la roue:', err);
      }
    };

    // Ne pas vérifier en mode admin
    console.log('🔍 [DEBUG] Chemin actuel:', window.location.pathname);
    if (!window.location.pathname.includes('/admin')) {
      console.log('🔍 [DEBUG] Pas en mode admin, démarrage vérification roue...');
      loadWheelSettings();
    } else {
      console.log('🔍 [DEBUG] Mode admin détecté, pas de vérification roue');
    }
  }, []);

  // 🆕 Gestionnaire de scroll pour le déclenchement
  useEffect(() => {
    if (!wheelSettings?.scroll_trigger_enabled || scrollTriggerSet || showWheel) {
      return;
    }

    console.log(`📜 [SCROLL] Configuration du déclenchement à ${wheelSettings.scroll_trigger_percentage}%`);

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / documentHeight) * 100;
      
      console.log(`📜 [SCROLL] Position actuelle: ${scrollPercent.toFixed(1)}% (trigger: ${wheelSettings.scroll_trigger_percentage}%)`);
      
      if (scrollPercent >= wheelSettings.scroll_trigger_percentage) {
        console.log(`📜 [SCROLL] Déclenchement atteint ! Affichage de la roue`);
        showWheelPopup();
        setScrollTriggerSet(true); // Éviter de déclencher plusieurs fois
        window.removeEventListener('scroll', handleScroll);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [wheelSettings, scrollTriggerSet, showWheel]);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FacebookPixel />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/categories" element={<CategoriesPage />} />
          <Route path="/admin/produits" element={<ProduitsPage />} />
          <Route path="/admin/promo-codes" element={<PromoCodesPage />} />
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
        {/* Boutons admin pour les tests en mode édition */}
        {isEditMode && (
          <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2">
            <button
              onClick={() => { setShowWheel(true); setEditWheel(true); }}
              className="bg-cyan-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-cyan-700 transition"
            >
              🎡 Tester la roue
            </button>
          </div>
        )}
        
        {/* Bouton flottant de la roue pour les clients */}
        <FloatingWheelButton />
        <LuckyWheelPopup 
          isOpen={showWheel} 
          onClose={() => {
            setShowWheel(false);
            // 🆕 Reset du trigger de scroll pour permettre un nouveau déclenchement
            setScrollTriggerSet(false);
            // Enregistrer que l'utilisateur a fermé explicitement le popup
            localStorage.setItem('wheel_popup_dismissed', 'true');
            localStorage.setItem('wheel_popup_last_seen', new Date().toISOString());
            console.log('❌ Popup fermé par l\'utilisateur, anti-spam activé, scroll trigger réinitialisé');
          }} 
          isEditMode={editWheel} 
        />
      <CookieBanner />
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
