import { useState, useEffect, Suspense, lazy } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HelmetProvider } from "react-helmet-async";
import SEO from "@/components/SEO";
import FloatingHeader from "@/components/admin/FloatingHeader";
import Footer from "@/components/Footer";
import Clarity from "@microsoft/clarity";


// 🔄 Identifiants Facebook et Clarity
const FACEBOOK_PIXEL_ID = "408487235316215";
const ACCESS_TOKEN = process.env.REACT_APP_FACEBOOK_ACCESS_TOKEN || "";
const CLARITY_ID = "qng4a1wbn4"; // Remplace par ton vrai ID Clarity

// URL de l'API Facebook Conversions
const API_URL = `https://graph.facebook.com/v13.0/${FACEBOOK_PIXEL_ID}/events`;

// 📌 Initialiser Clarity et Facebook Pixel
const initTrackingScripts = () => {
  if (typeof window !== "undefined") {
    // Microsoft Clarity via NPM
    Clarity.init(CLARITY_ID);

    // Facebook Pixel
    if (!window.fbq) {
      (function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = true;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/fr_FR/fbevents.js");

      window.fbq("init", FACEBOOK_PIXEL_ID);
      window.fbq("track", "PageView");
    }
  }
};

// 📌 Suivi des événements Facebook
const trackFacebookEvent = (eventName: string, params = {}) => {
  if (typeof window !== "undefined" && window.fbq) {
    console.log(`📊 Tracking Facebook: "${eventName}"`);
    window.fbq("track", eventName, params);
  }
};

// 📌 Envoyer un événement à l'API Facebook Conversions
const sendEventToAPI = async (eventName: string, eventData = {}) => {
  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: window.location.href,
        user_data: {
          client_user_agent: navigator.userAgent,
        },
        ...eventData,
      },
    ],
    access_token: ACCESS_TOKEN,
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(`✅ Facebook API: "${eventName}" envoyé`, await response.json());
  } catch (error) {
    console.error(`❌ Erreur Facebook API: "${eventName}"`, error);
  }
};

// 📌 Suivi d'un abonnement réussi via Stripe Webhook
const handleStripeSubscription = async () => {
  try {
    const response = await fetch("/api/stripe-webhook");
    const data = await response.json();
    if (data.success) {
      console.log("✅ Abonnement Stripe détecté :", data);
      const subscriptionData = { custom_data: { currency: "EUR", value: data.amount / 100 } };

      trackFacebookEvent("Subscribe", subscriptionData);
      sendEventToAPI("Subscribe", subscriptionData);
    }
  } catch (error) {
    console.error("❌ Erreur abonnement Stripe :", error);
  }
};

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
    initTrackingScripts();
    sendEventToAPI("PageView");
  }, []);

  useEffect(() => {
    handleStripeSubscription();
  }, []);

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
