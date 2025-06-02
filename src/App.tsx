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

const queryClient = new QueryClient();

const App = () => {
  useRestoreSession();

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

          <Route path="*" element={<NotFound />} />
          </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
