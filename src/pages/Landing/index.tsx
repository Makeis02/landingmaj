import { useState, useEffect, Suspense, lazy } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HelmetProvider } from "react-helmet-async";
import SEO from "@/components/SEO";
import FloatingHeader from "@/components/admin/FloatingHeader";
import Footer from "@/components/Footer";

// 🔄 Chargement différé des composants
const HeroComponent = lazy(() => import("./components/Hero"));
const FeaturesComponent = lazy(() => import("./components/Features"));
const PricingComponent = lazy(() => import("./components/Pricing"));
const ReviewsComponent = lazy(() => import("./components/Reviews"));
const CtaComponent = lazy(() => import("./components/Cta"));
const FishComponent = lazy(() => import("./components/ui/fish"));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const LandingPage = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: adminData } = await supabase
        .from("authorized_admin_emails")
        .select("email")
        .eq("email", session.user.email)
        .single();

      setIsAdmin(!!adminData);
    };

    checkAuth();
  }, []);

  return (
    <HelmetProvider>
      <SEO 
        title="Box mensuelle pour aquarium"
        description="Découvrez nos box mensuelles pour aquarium : nourriture, entretien et produits de qualité pour vos poissons. Abonnement flexible et livraison rapide."
        image="/images/hero-image.jpg"
      />
      
      <main className="min-h-screen">
        {isAdmin && <FloatingHeader />}
        <>
          <Suspense fallback={<LoadingFallback />}>
            <HeroComponent />
          </Suspense>
          <Suspense fallback={<LoadingFallback />}>
            <FeaturesComponent />
          </Suspense>
          <Suspense fallback={<LoadingFallback />}>
            <PricingComponent />
          </Suspense>
          <Suspense fallback={<LoadingFallback />}>
            <ReviewsComponent />
          </Suspense>
          <Suspense fallback={<LoadingFallback />}>
            <CtaComponent />
          </Suspense>
          <Suspense fallback={<LoadingFallback />}>
            <FishComponent />
          </Suspense>
          <Footer />
        </>
      </main>
    </HelmetProvider>
  );
};

export default LandingPage;
