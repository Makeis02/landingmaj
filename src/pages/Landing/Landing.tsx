import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/layout/AdminHeader";
import EditableContent from "@/components/EditableContent";

// 🔄 Remplace par ton Pixel ID et ton Token d'Accès API Conversions
const FACEBOOK_PIXEL_ID = "408487235316215";
const ACCESS_TOKEN = "EAB1V1J3aADsBOzFSthXYjucmCkmOBJURzQV7EgZBFI1vGf1iMnKJZBEa44mcDmU4ugxXXE1QCG7IZBXeFZBBh7tk9SN8hmokuZCg5BFEkMwqZCKZCzIDhxCUICx6WKxqI7LFJ6EnBMj2TCERcnqzJiPtr1uW30LCZBFLmlKw2Ytfzc0P8VZCC2nBmgF1svV09ddbeNwZDZD";

// URL de l'API Conversions
const API_URL = `https://graph.facebook.com/v13.0/${FACEBOOK_PIXEL_ID}/events`;

// Initialiser le Pixel Facebook
const initFacebookPixel = () => {
  if (typeof window !== "undefined" && !window.fbq) {
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
    console.log("✅ Pixel Facebook initialisé !");
  } else {
    console.log("❌ Le Pixel Facebook n'a pas pu être initialisé !");
  }
};

// Suivre les événements via le Pixel (Navigateur)
const trackFacebookEvent = (eventName: string, params = {}) => {
  if (typeof window !== "undefined" && window.fbq) {
    console.log(`📊 Envoi de l'événement "${eventName}" au Pixel (Navigateur)`);
    window.fbq("track", eventName, params);
  } else {
    console.log(`❌ fbq n'est pas défini pour l'événement "${eventName}"`);
  }
};

// Envoyer un événement à l’API Conversions (Serveur)
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    console.log(`✅ Événement "${eventName}" envoyé à l'API Conversions:`, result);
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi de l'événement "${eventName}":`, error);
  }
};

const Landing = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Initialiser le Pixel et envoyer PageView
  useEffect(() => {
    initFacebookPixel();
    trackFacebookEvent("PageView");         // Pixel (Navigateur)
    sendEventToAPI("PageView");             // API Conversions (Serveur)
  }, []);

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: adminData } = await supabase
        .from("authorized_admin_emails")
        .select("email")
        .eq("email", session.user.email)
        .single();

      const isAdminUser = !!adminData;
      setIsAdmin(isAdminUser);
      console.log("Is Admin:", isAdminUser);
    };

    checkAuth();
  }, []);

  // Suivre un achat réussi
  const handlePurchase = () => {
    const purchaseData = {
      custom_data: {
        currency: "EUR",
        value: 19.99,
      },
    };
    trackFacebookEvent("Purchase", purchaseData);    // Pixel (Navigateur)
    sendEventToAPI("Purchase", purchaseData);         // API Conversions (Serveur)
    alert("Achat simulé et envoyé à l'API Conversions !");
  };

  return (
    <div>
      {isAdmin && <AdminHeader />}
      <EditableContent isEditing={isEditing} />

      <button
        onClick={handlePurchase}
        className="fixed bottom-20 right-5 bg-green-600 text-white px-4 py-2 rounded shadow-lg"
      >
        Simuler un Achat
      </button>
    </div>
  );
};

export default Landing;
