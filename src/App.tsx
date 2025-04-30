import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import CategoriesPage from "./pages/admin/CategoriesPage";
import ProduitsPage from "./pages/admin/ProduitsPage";
import BrandsPage from "./pages/admin/BrandsPage";
import LandingPage from "./pages/Landing/index";
import DecorationPage from "@/pages/categories/DecorationPage";
import RacinesNaturellesPage from "@/pages/categories/RacinesNaturellesPage";
import EaucDouceDécorationPage from "@/pages/categories/EaucDouceDécorationPage";
import RochesNonCalcairesPage from "@/pages/categories/RochesNonCalcairesPage";
import PlantesArtificiellesPage from "@/pages/categories/PlantesArtificiellesPage";
import PostersDeFondPage from "@/pages/categories/PostersDeFondPage";
import SubstratsDecoratifsPage from "@/pages/categories/SubstratsDecoratifsPage";
import EauDeMerDecorationPage from "@/pages/categories/EauDeMerDecorationPage";
import PierresVivantesPage from "@/pages/categories/PierresVivantesPage";
import RochesCoralliennesPage from "@/pages/categories/RochesCoralliennesPage";
import SablesAragonitiquesPage from "@/pages/categories/SablesAragonitiquesPage";
import DecorsRecifauxPage from "@/pages/categories/DecorsRecifauxPage";
import DecorationsResinePage from "@/pages/categories/DecorationsResinePage";
import OrnementsThematiquesPage from "@/pages/categories/OrnementsThematiquesPage";
import PlantesArtificiellesCompatiblesPage from "@/pages/categories/PlantesArtificiellesCompatiblesPage";
import UniverselsDecoPage from "@/pages/categories/UniverselsDecoPage";
import EaudoucePompesPage from "@/pages/categories/EaudoucePompesPage";
import EaudemerPompesPage from "@/pages/categories/EaudemerPompesPage";
import PompesFiltrationPage from "@/pages/categories/PompesFiltrationPage";
import PompesCirculationPage from "@/pages/categories/PompesCirculationPage";
import PompesAirPage from "@/pages/categories/PompesAirPage";
import PompesRemonteePage from "@/pages/categories/PompesRemonteePage";
import PompesBrassagePage from "@/pages/categories/PompesBrassagePage";
import PompesDoseusesPage from "@/pages/categories/PompesDoseusesPage";

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
import EaudouceTubesFluorescentsPage from "@/pages/categories/EaudouceTubesFluorescentsPage";
import EaudouceSpotsLampesHQIPage from "@/pages/categories/EaudouceSpotsLampesHQIPage";
import EaudemerEclairageLEDPage from "@/pages/categories/EaudemerEclairageLEDPage";
import EaudemerRampesLEDPage from "@/pages/categories/EaudemerRampesLEDPage";
import EaudemerEclairageActiniquePage from "@/pages/categories/EaudemerEclairageActiniquePage";
import EaudemerLampesHQIPage from "@/pages/categories/EaudemerLampesHQIPage";
import EclairageSpectreCompletPage from "@/pages/categories/EclairageSpectreCompletPage";

import EaudouceNourriturePage from "@/pages/categories/EaudouceNourriturePage";
import EaudemerNourriturePage from "@/pages/categories/EaudemerNourriturePage";
import EaudouceNourritureTropicauxPage from "@/pages/categories/EaudouceNourritureTropicauxPage";
import EaudouceNourritureFondPage from "@/pages/categories/EaudouceNourritureFondPage";
import EaudouceNourritureViviparesPage from "@/pages/categories/EaudouceNourritureViviparesPage";
import EaudouceNourritureHerbivoresPage from "@/pages/categories/EaudouceNourritureHerbivoresPage";
import EaudouceNourritureCarnivoresPage from "@/pages/categories/EaudouceNourritureCarnivoresPage";
import EaudemerNourriturePoissonsMarinsPage from "@/pages/categories/EaudemerNourriturePoissonsMarinsPage";
import EaudemerNourritureCorauxPage from "@/pages/categories/EaudemerNourritureCorauxPage";
import EaudemerNourritureCrustacesPage from "@/pages/categories/EaudemerNourritureCrustacesPage";
import EaudemerNourritureInvertébrésPage from "@/pages/categories/EaudemerNourritureInvertébrésPage";

import EauDouceEntretienPage from "@/pages/categories/EauDouceEntretienPage";
import EauDeMerEntretienPage from "@/pages/categories/EauDeMerEntretienPage";
import EntretienGeneralPage from "@/pages/categories/EntretienGeneralPage";
import ProduitsSpecifiquesPage from "@/pages/categories/ProduitsSpecifiquesPage";

import EauDouceNettoyagePage from "@/pages/categories/EauDouceNettoyagePage";
import EauDouceTraitementsPage from "@/pages/categories/EauDouceTraitementsPage";
import EauDouceFiltrationPage from "@/pages/categories/EauDouceFiltrationPage";
import EauDouceAccessoiresPage from "@/pages/categories/EauDouceAccessoiresPage";

import EauDeMerNettoyagePage from "@/pages/categories/EauDeMerNettoyagePage";
import EauDeMerTraitementsPage from "@/pages/categories/EauDeMerTraitementsPage";
import EauDeMerFiltrationPage from "@/pages/categories/EauDeMerFiltrationPage";
import EauDeMerAccessoiresPage from "@/pages/categories/EauDeMerAccessoiresPage";

import EntretienGeneralTestsDeauPage from "@/pages/categories/EntretienGeneralTestsDeauPage";
import EntretienGeneralFiltrationPage from "@/pages/categories/EntretienGeneralFiltrationPage";
import EntretienGeneralOutilsPage from "@/pages/categories/EntretienGeneralOutilsPage";

import EntretienAntibacteriensPage from "@/pages/categories/EntretienAntibacteriensPage";
import EntretienSoinsPourPoissonsPage from "@/pages/categories/EntretienSoinsPourPoissonsPage";

import AccessoiresPage from "@/pages/categories/AccessoiresPage";
import EpuisettesPage from "@/pages/categories/EpuisettesPage";
import PincesCiseauxPage from "@/pages/categories/PincesCiseauxPage";
import VentousesPage from "@/pages/categories/VentousesPage";
import ChauffagesPage from "@/pages/categories/ChauffagesPage";
import ThermometresPage from "@/pages/categories/ThermometresPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Router>
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
          <Route path="/categories/racinesnaturelles" element={<RacinesNaturellesPage />} />
          <Route path="/categories/eaudoucedecoration" element={<EaucDouceDécorationPage />} />
          <Route path="/categories/eaucdoucedecoration" element={<EaucDouceDécorationPage />} />
          <Route path="/categories/rochesnoncalcaires" element={<RochesNonCalcairesPage />} />
          <Route path="/categories/plantesartificielles" element={<PlantesArtificiellesPage />} />
          <Route path="/categories/postersdefond" element={<PostersDeFondPage />} />
          <Route path="/categories/substratsdecoratifs" element={<SubstratsDecoratifsPage />} />
          <Route path="/categories/eaudemerdecoration" element={<EauDeMerDecorationPage />} />
          <Route path="/categories/pierresvivantes" element={<PierresVivantesPage />} />
          <Route path="/categories/rochescoralliennes" element={<RochesCoralliennesPage />} />
          <Route path="/categories/sablesaragonitiques" element={<SablesAragonitiquesPage />} />
          <Route path="/categories/decorsrecifaux" element={<DecorsRecifauxPage />} />
          <Route path="/categories/decorationsresine" element={<DecorationsResinePage />} />
          <Route path="/categories/ornementsthematiques" element={<OrnementsThematiquesPage />} />
          <Route path="/categories/plantesartificiellescompatibles" element={<PlantesArtificiellesCompatiblesPage />} />
          <Route path="/categories/universelsdeco" element={<UniverselsDecoPage />} />
          <Route path="/categories/eaudoucepompes" element={<EaudoucePompesPage />} />
          <Route path="/categories/eaudemerpompes" element={<EaudemerPompesPage />} />
          <Route path="/categories/pompesfiltration" element={<PompesFiltrationPage />} />
          <Route path="/categories/pompescirculation" element={<PompesCirculationPage />} />
          <Route path="/categories/pompesair" element={<PompesAirPage />} />
          <Route path="/categories/pompesremontee" element={<PompesRemonteePage />} />
          <Route path="/categories/pompesbrassage" element={<PompesBrassagePage />} />
          <Route path="/categories/pompesdoseuses" element={<PompesDoseusesPage />} />
          <Route path="/categories/eaudouceeclairage" element={<EaudouceEclairagePage />} />
          <Route path="/categories/eaudemerclairage" element={<EaudemerEclairagePage />} />
          <Route path="/categories/eaudouceeclairageled" element={<EaudouceEclairageLEDPage />} />
          <Route path="/categories/eaudoucefluo" element={<EaudouceTubesFluorescentsPage />} />
          <Route path="/categories/eaudoucespotslampeshqi" element={<EaudouceSpotsLampesHQIPage />} />
          <Route path="/categories/eaudemereclairageled" element={<EaudemerEclairageLEDPage />} />
          <Route path="/categories/eaudemerrampesled" element={<EaudemerRampesLEDPage />} />
          <Route path="/categories/eaudemereclairageactinique" element={<EaudemerEclairageActiniquePage />} />
          <Route path="/categories/eaudemerlampeshqi" element={<EaudemerLampesHQIPage />} />
          <Route path="/categories/eclairagespectrecomplet" element={<EclairageSpectreCompletPage />} />
          <Route path="/categories/eaudoucenourriture" element={<EaudouceNourriturePage />} />
          <Route path="/categories/eaudemernourriture" element={<EaudemerNourriturePage />} />
          <Route path="/categories/eaudoucenourrituretropicaux" element={<EaudouceNourritureTropicauxPage />} />
          <Route path="/categories/eaudoucenourriturefond" element={<EaudouceNourritureFondPage />} />
          <Route path="/categories/eaudoucenourriturevivipares" element={<EaudouceNourritureViviparesPage />} />
          <Route path="/categories/eaudoucenourritureherbivores" element={<EaudouceNourritureHerbivoresPage />} />
          <Route path="/categories/eaudoucenourriturecarnivores" element={<EaudouceNourritureCarnivoresPage />} />
          <Route path="/categories/eaudemernourriturepoissonsmarins" element={<EaudemerNourriturePoissonsMarinsPage />} />
          <Route path="/categories/eaudemernourriturecoraux" element={<EaudemerNourritureCorauxPage />} />
          <Route path="/categories/eaudemernourriturecrustaces" element={<EaudemerNourritureCrustacesPage />} />
          <Route path="/categories/eaudemernourritureinvertebres" element={<EaudemerNourritureInvertébrésPage />} />
          <Route path="/categories/eaudouceentretien" element={<EauDouceEntretienPage />} />
          <Route path="/categories/eaudemerentretien" element={<EauDeMerEntretienPage />} />
          <Route path="/categories/entretiengeneral" element={<EntretienGeneralPage />} />
          <Route path="/categories/produitsspecifiques" element={<ProduitsSpecifiquesPage />} />
          <Route path="/categories/eaudoucenettoyage" element={<EauDouceNettoyagePage />} />
          <Route path="/categories/eaudoucetraitements" element={<EauDouceTraitementsPage />} />
          <Route path="/categories/eaudoucefiltration" element={<EauDouceFiltrationPage />} />
          <Route path="/categories/eaudouceaccessoires" element={<EauDouceAccessoiresPage />} />
          <Route path="/categories/eaudemernettoyage" element={<EauDeMerNettoyagePage />} />
          <Route path="/categories/eaudemertraitements" element={<EauDeMerTraitementsPage />} />
          <Route path="/categories/eaudemerfiltration" element={<EauDeMerFiltrationPage />} />
          <Route path="/categories/eaudemeraccessoires" element={<EauDeMerAccessoiresPage />} />
          <Route path="/categories/entretiengeneraltestsdeau" element={<EntretienGeneralTestsDeauPage />} />
          <Route path="/categories/entretiengeneralfiltres" element={<EntretienGeneralFiltrationPage />} />
          <Route path="/categories/entretiengenerauxoutils" element={<EntretienGeneralOutilsPage />} />
          <Route path="/categories/entretienantibacteriens" element={<EntretienAntibacteriensPage />} />
          <Route path="/categories/entretiensoinspourpoissons" element={<EntretienSoinsPourPoissonsPage />} />
          <Route path="/categories/accessoires" element={<AccessoiresPage />} />
          <Route path="/categories/epuisettes" element={<EpuisettesPage />} />
          <Route path="/categories/pincesciseaux" element={<PincesCiseauxPage />} />
          <Route path="/categories/ventouses" element={<VentousesPage />} />
          <Route path="/categories/chauffages" element={<ChauffagesPage />} />
          <Route path="/categories/thermometres" element={<ThermometresPage />} />
          
          {/* Route générique pour toutes les catégories avec paramètres dynamiques */}
          <Route path="/categories/:slug" element={<EaucDouceDécorationPage />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
