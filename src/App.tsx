import React, { Suspense, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { useRestoreSession } from "@/hooks/useRestoreSession";
import { useEditStore } from "@/stores/useEditStore";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import FacebookPixel from "@/components/FacebookPixel";
import CookieBanner from "@/components/CookieBanner";
import LuckyWheelPopup from "@/components/WheelPopup";
import FloatingWheelButton from "@/components/FloatingWheelButton";

// Lazy loading UNIQUEMENT pour les pages
const Index = React.lazy(() => import("./pages/Index"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const AdminLogin = React.lazy(() => import("./pages/AdminLogin"));
const Admin = React.lazy(() => import("./pages/Admin"));
const CategoriesPage = React.lazy(() => import("./pages/admin/CategoriesPage"));
const ProduitsPage = React.lazy(() => import("./pages/admin/ProduitsPage"));
const PromoCodesPage = React.lazy(() => import("./pages/admin/PromoCodesPage"));
const BrandsPage = React.lazy(() => import("./pages/admin/BrandsPage"));
const LandingPage = React.lazy(() => import("./pages/Landing/index"));
const DecorationPage = React.lazy(() => import("@/pages/categories/DecorationPage"));
const Modele = React.lazy(() => import("@/pages/Product/Modele"));
const DynamicProductPage = React.lazy(() => import("@/pages/DynamicProductPage"));
const EaucDouceDécorationPage = React.lazy(() => import("@/pages/categories/EaucDouceDécorationPage"));
const EauDeMerDecorationPage = React.lazy(() => import("@/pages/categories/EauDeMerDecorationPage"));
const DecorsRecifauxPage = React.lazy(() => import("@/pages/categories/DecorsRecifauxPage"));
const DecorationsResinePage = React.lazy(() => import("@/pages/categories/DecorationsResinePage"));
const OrnementsThematiquesPage = React.lazy(() => import("@/pages/categories/OrnementsThematiquesPage"));
const PlantesArtificiellesCompatiblesPage = React.lazy(() => import("@/pages/categories/PlantesArtificiellesCompatiblesPage"));
const UniverselsDecoPage = React.lazy(() => import("@/pages/categories/UniverselsDecoPage"));
const EaudoucePompesPage = React.lazy(() => import("@/pages/categories/EaudoucePompesPage"));
const EaudemerPompesPage = React.lazy(() => import("@/pages/categories/EaudemerPompesPage"));
const CGV = React.lazy(() => import("./pages/Policies/CGV"));
const CGU = React.lazy(() => import("./pages/Policies/CGU"));
const Privacy = React.lazy(() => import("./pages/Policies/Privacy"));
const Legal = React.lazy(() => import("./pages/Policies/Legal"));
const Shipping = React.lazy(() => import("./pages/Policies/Shipping"));
const Refund = React.lazy(() => import("./pages/Policies/Refund"));
const Terms = React.lazy(() => import("./pages/Policies/Terms"));
const PoliciesIndex = React.lazy(() => import("./pages/Policies/IndexPolicie"));
const EaudouceEclairagePage = React.lazy(() => import("@/pages/categories/EaudouceEclairagePage"));
const EaudemerEclairagePage = React.lazy(() => import("@/pages/categories/EaudemerEclairagePage"));
const EaudouceEclairageLEDPage = React.lazy(() => import("@/pages/categories/EaudouceEclairageLEDPage"));
const EaudemerEclairageLEDPage = React.lazy(() => import("@/pages/categories/EaudemerEclairageLEDPage"));
const EclairageSpectreCompletPage = React.lazy(() => import("@/pages/categories/EclairageSpectreCompletPage"));
const EaudouceNourriturePage = React.lazy(() => import("@/pages/categories/EaudouceNourriturePage"));
const EaudemerNourriturePage = React.lazy(() => import("@/pages/categories/EaudemerNourriturePage"));
const EauDouceEntretienPage = React.lazy(() => import("@/pages/categories/EauDouceEntretienPage"));
const EauDeMerEntretienPage = React.lazy(() => import("@/pages/categories/EauDeMerEntretienPage"));
const EntretienGeneralPage = React.lazy(() => import("@/pages/categories/EntretienGeneralPage"));
const ProduitsSpecifiquesPage = React.lazy(() => import("@/pages/categories/ProduitsSpecifiquesPage"));
const EauDouceNettoyagePage = React.lazy(() => import("@/pages/categories/EauDouceNettoyagePage"));
const EauDouceTraitementsPage = React.lazy(() => import("@/pages/categories/EauDouceTraitementsPage"));
const EauDouceFiltrationPage = React.lazy(() => import("@/pages/categories/EauDouceFiltrationPage"));
const EauDouceAccessoiresPage = React.lazy(() => import("@/pages/categories/EauDouceAccessoiresPage"));
const EauDeMerNettoyagePage = React.lazy(() => import("@/pages/categories/EauDeMerNettoyagePage"));
const EauDeMerFiltrationPage = React.lazy(() => import("@/pages/categories/EauDeMerFiltrationPage"));
const EauDeMerAccessoiresPage = React.lazy(() => import("@/pages/categories/EauDeMerAccessoiresPage"));
const EntretienGeneralFiltrationPage = React.lazy(() => import("@/pages/categories/EntretienGeneralFiltrationPage"));
const EntretienGeneralOutilsPage = React.lazy(() => import("@/pages/categories/EntretienGeneralOutilsPage"));
const AccessoiresPage = React.lazy(() => import("@/pages/categories/AccessoiresPage"));
const EpuisettesPage = React.lazy(() => import("@/pages/categories/EpuisettesPage"));
const PincesCiseauxPage = React.lazy(() => import("@/pages/categories/PincesCiseauxPage"));
const VentousesPage = React.lazy(() => import("@/pages/categories/VentousesPage"));
const ChauffagesPage = React.lazy(() => import("@/pages/categories/ChauffagesPage"));
const ThermometresPage = React.lazy(() => import("@/pages/categories/ThermometresPage"));
const LoginPage = React.lazy(() => import("@/pages/account/LoginPage"));
const SignupPage = React.lazy(() => import("@/pages/account/SignupPage"));
const PasswordRecoveryPage = React.lazy(() => import("@/pages/account/PasswordRecoveryPage"));
const ResetPasswordPage = React.lazy(() => import("@/pages/account/ResetPasswordPage"));
const OrdersPage = React.lazy(() => import("@/pages/account/OrdersPage"));
const AccountPage = React.lazy(() => import("@/pages/account/AccountPage"));
const AddressesPage = React.lazy(() => import("@/pages/account/AddressesPage"));
const FavoritesPage = React.lazy(() => import("@/pages/account/FavoritesPage"));
const Checkout = React.lazy(() => import("@/pages/Checkout"));
const SuccessPage = React.lazy(() => import("@/pages/success"));
const CheckoutSettings = React.lazy(() => import("@/pages/admin/CheckoutSettings"));
const CommandesPage = React.lazy(() => import("@/pages/admin/CommandesPage"));
const OrderConfirmation = React.lazy(() => import("@/pages/OrderConfirmation"));

const queryClient = new QueryClient();

// Loader simple pour le suspense
const FullPageLoader = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

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
          .maybeSingle(); // Utilise maybeSingle() au lieu de single() pour gérer les cas multiples
        
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
        
        // Si on a une erreur PGRST116 (plusieurs lignes), on utilise quand même les données
        if (error && error.code === 'PGRST116') {
          console.warn('⚠️ Plusieurs lignes trouvées dans wheel_settings, utilisation de la plus récente');
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
        <FacebookPixel />
        <Suspense fallback={<FullPageLoader />}>
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
            <Route path="/produits/:slug" element={<DynamicProductPage />} />

            <Route path="/account/login" element={<LoginPage />} />
            <Route path="/account/signup" element={<SignupPage />} />
            <Route path="/account/password-recovery" element={<PasswordRecoveryPage />} />
            <Route path="/account/reset-password" element={<ResetPasswordPage />} />
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
        </Suspense>

        {/* Composants flottants chargés normalement */}
        <CookieBanner />
        {isWheelEnabled && <FloatingWheelButton onClick={showWheelPopup} isEditMode={isEditMode} />}
        {showWheel && (
            <LuckyWheelPopup 
              isOpen={showWheel} 
              onClose={() => setShowWheel(false)} 
              isEditMode={editWheel} 
            />
        )}
        
        {isEditMode && (
          <div className="fixed bottom-4 left-4 z-[1000] flex gap-2">
            <Button onClick={() => setEditWheel(!editWheel)}>
              {editWheel ? "Quitter l'édition de la Roue" : "Editer la Roue"}
            </Button>
            <Button variant="destructive" onClick={resetWheelState}>
              Réinitialiser la Roue (Debug)
            </Button>
          </div>
        )}
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
