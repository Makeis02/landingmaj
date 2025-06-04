import { useEffect, useState } from "react";

const COOKIE_KEY = "cookie_consent";

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) setVisible(true);
  }, []);

  const handleConsent = (value: "accepted" | "refused") => {
    localStorage.setItem(COOKIE_KEY, value);
    setVisible(false);
    // Espace pour activer/désactiver les cookies tiers plus tard
    // if (value === "accepted") { ... }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 flex justify-center px-2 py-4 bg-white/95 border-t border-blue-200 shadow-lg backdrop-blur-sm">
      <div className="max-w-2xl w-full flex flex-col md:flex-row items-center gap-4 md:gap-6 p-4 rounded-lg bg-white border border-blue-100 shadow-md">
        <div className="flex-1 text-sm text-gray-700 text-left">
          Ce site utilise des cookies pour améliorer votre expérience. Aucun cookie tiers (ex : analytics) ne sera activé sans votre consentement.
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <button
            className="px-4 py-2 rounded bg-blue-700 text-white font-semibold hover:bg-blue-800 transition"
            onClick={() => handleConsent("accepted")}
          >
            Accepter
          </button>
          <button
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
            onClick={() => handleConsent("refused")}
          >
            Refuser
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner; 