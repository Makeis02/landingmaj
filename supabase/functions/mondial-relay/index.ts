// Désactiver la vérification JWT (fonction publique)
// @ts-ignore
Deno.supabaseFunction = { verifyJWT: false };

// Edge Function Supabase : Recherche de points relais Mondial Relay
// POST { codePostal: string, ville?: string }
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

// LOGS DEBUG ENV
console.log("🔧 [DEBUG] Valeurs brutes des variables d'environnement Mondial Relay :");
console.log("  MONDIALRELAY_CODEENSEIGNE =", Deno.env.get("MONDIALRELAY_CODEENSEIGNE"));
console.log("  MONDIALRELAY_PRIVATEKEY   =", Deno.env.get("MONDIALRELAY_PRIVATEKEY"));
console.log("  MONDIALRELAY_CODEMARQUE   =", Deno.env.get("MONDIALRELAY_CODEMARQUE"));
console.log("  MONDIALRELAY_COUNTRY      =", Deno.env.get("MONDIALRELAY_COUNTRY"));

const ENSEIGNE = "BDTEST13";
const CLE_PRIVEE = "TestAPI1key";
const PAYS = "FR";
const SOAP_URL = "https://api.mondialrelay.com/Web_Services.asmx";
const SOAP_ACTION = "http://www.mondialrelay.fr/webservice/WSI4_PointRelais_Recherche";

// Générateur de clé MD5 natif Deno
function md5(text: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  // @ts-ignore
  const hashBuffer = crypto.subtle.digestSync("MD5", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Fonction pour générer des points relais fictifs
const generateMockPointsRelais = (cp: string) => {
  const points = [];
  const noms = [
    "Boutique AquaPlus",
    "Magasin AquaStyle",
    "Point Relais AquaShop",
    "Boutique AquaWorld",
    "Magasin AquaPro",
    "Point Relais AquaStore",
    "Boutique AquaLife",
    "Magasin AquaZone",
    "Point Relais AquaPoint",
    "Boutique AquaSpot"
  ];

  const villes = ["Paris", "Boulogne-Billancourt", "Issy-les-Moulineaux", "Vanves", "Clamart", "Malakoff", "Montrouge", "Sèvres", "Meudon", "Châtillon"];
  const rues = [
    "rue de l'Aquarium",
    "avenue des Poissons",
    "boulevard des Coraux",
    "place des Récifs",
    "rue des Plantes Aquatiques",
    "avenue des Tortues",
    "boulevard des Requins",
    "place des Étoiles de Mer",
    "rue des Coquillages",
    "avenue des Méduses"
  ];

  const horaires = [
    "Lun-Ven: 9h-19h, Sam: 9h-12h",
    "Lun-Sam: 9h-19h",
    "Lun-Ven: 8h30-19h30, Sam: 9h-13h",
    "Lun-Sam: 10h-20h",
    "Lun-Ven: 9h-18h30, Sam: 9h-12h30",
    "Lun-Sam: 8h45-19h15",
    "Lun-Ven: 9h-19h, Sam: 9h-13h",
    "Lun-Sam: 9h30-19h30",
    "Lun-Ven: 8h-19h, Sam: 9h-12h",
    "Lun-Sam: 9h-20h"
  ];

  // Coordonnées centrales pour Paris et sa banlieue
  const centerLat = 48.8566;
  const centerLng = 2.3522;
  const radius = 0.1; // Rayon de dispersion (environ 10km)

  for (let i = 0; i < 10; i++) {
    // Générer des coordonnées aléatoires dans un rayon autour du centre
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radius;
    const lat = centerLat + distance * Math.cos(angle);
    const lng = centerLng + distance * Math.sin(angle);

    points.push({
      Num: `PR${i + 1}`,
      LgAdr1: noms[i],
      LgAdr2: `${Math.floor(Math.random() * 100)} ${rues[i]}`,
      CP: cp,
      Ville: villes[i],
      Pays: "FR",
      Horaires: horaires[i],
      Latitude: lat.toFixed(6),
      Longitude: lng.toFixed(6),
      // Ajout d'informations supplémentaires pour l'UI
      Distance: `${(Math.random() * 5).toFixed(1)} km`,
      Note: (4 + Math.random()).toFixed(1),
      Services: ["Retrait", "Dépôt", "Emballage"].filter(() => Math.random() > 0.3),
      Parking: Math.random() > 0.5 ? "Gratuit" : "Payant",
      Accessibilite: Math.random() > 0.7 ? "PMR" : "Standard"
    });
  }

  return points;
};

serve(async (req) => {
  console.log("🚀 Nouvelle requête reçue");

  // Log des headers reçus
  const headers = Object.fromEntries(req.headers.entries());
  console.log("🔑 [DEBUG] Headers reçus :", headers);
  
  // Log spécifique pour l'authentification
  if (headers['authorization']) {
    console.log("🔐 Auth token reçu :", headers['authorization']);
  } else {
    console.log("❌ Aucune autorisation reçue.");
  }
  
  if (headers['apikey']) {
    console.log("✅ [DEBUG] Header apikey reçu :", headers['apikey']);
  } else {
    console.log("❌ [DEBUG] Header apikey manquant !");
  }
  
  // Headers CORS à utiliser partout
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, apikey, authorization",
    "Content-Type": "application/json"
  };

  if (req.method === "OPTIONS") {
    console.log("🔄 Requête OPTIONS, retour CORS");
    return new Response("ok", {
      status: 200,
      headers: corsHeaders
    });
  }
  
  if (req.method !== "POST") {
    console.log("❌ Méthode non autorisée:", req.method);
    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
      status: 405,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("📦 Début du traitement de la requête");
    const { codePostal, ville = "", action = "24R", rayon = 50, nombre = 10 } = await req.json();
    console.log("📝 Données reçues:", { codePostal, ville, action, rayon, nombre });
    
    if (!codePostal) {
      console.log("❌ Code postal manquant");
      return new Response(JSON.stringify({ error: "Code postal requis" }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // Concaténation pour la clé Security (voir doc Mondial Relay)
    const chaine = `${ENSEIGNE}${PAYS}${""}${codePostal}${""}${""}${""}${""}${action}${""}${rayon}${nombre}${CLE_PRIVEE}`;
    const security = md5(chaine);

    const body = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                   xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <WSI4_PointRelais_Recherche xmlns="http://www.mondialrelay.fr/webservice/">
          <Enseigne>${ENSEIGNE}</Enseigne>
          <Pays>${PAYS}</Pays>
          <CP>${codePostal}</CP>
          ${ville ? `<Ville>${ville}</Ville>` : ""}
          <Action>${action}</Action>
          <RayonRecherche>${rayon}</RayonRecherche>
          <NombreResultats>${nombre}</NombreResultats>
          <Security>${security}</Security>
        </WSI4_PointRelais_Recherche>
      </soap:Body>
    </soap:Envelope>`;

    const res = await fetch(SOAP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": SOAP_ACTION
      },
      body
    });

    const xml = await res.text();
    // Simple parseur pour extraire les points relais
    const extractTags = (tag: string) => {
      const matches = Array.from(xml.matchAll(new RegExp(`<${tag}>(.*?)</${tag}>`, "g")));
      return matches.map((m) => m[1]);
    };
    const result = extractTags("Num").map((_, i) => ({
      Num: extractTags("Num")[i],
      LgAdr1: extractTags("LgAdr1")[i],
      LgAdr2: extractTags("LgAdr2")[i],
      CP: extractTags("CP")[i],
      Ville: extractTags("Ville")[i],
      Pays: extractTags("Pays")[i],
      Horaires: extractTags("Horaires")[i],
      Latitude: extractTags("Latitude")[i],
      Longitude: extractTags("Longitude")[i],
      Distance: extractTags("Distance")[i],
    }));
    console.log(`✅ ${result.length} points relais trouvés`);
    return new Response(JSON.stringify({ points: result }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (e) {
    console.error("❌ Erreur:", e);
    if (e && e.stack) {
      console.error("❌ Stack trace:", e.stack);
    }
    // LOG ERREUR FETCH
    if (e && e.response) {
      console.error("❌ Erreur HTTP Mondial Relay :", e.response.status, e.response.statusText);
      const errText = await e.response.text?.();
      if (errText) console.error("❌ Réponse erreur brute :", errText);
    }
    return new Response(JSON.stringify({ error: e.message || e }), {
      status: 500,
      headers: corsHeaders
    });
  }
}); 