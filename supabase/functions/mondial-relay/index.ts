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

const ENSEIGNE = Deno.env.get("MONDIALRELAY_CODEENSEIGNE") || "BDTEST13";
const CLE_PRIVEE = Deno.env.get("MONDIALRELAY_PRIVATEKEY") || "TestAPI1key";
const PAYS = Deno.env.get("MONDIALRELAY_COUNTRY") || "FR";
const SOAP_URL = "https://api.mondialrelay.com/Web_Services.asmx";
const SOAP_ACTION = "http://www.mondialrelay.fr/webservice/WSI4_PointRelais_Recherche";

// Générateur de clé MD5 JS pur (compatible Deno/Edge, source: blueimp-md5)
function md5(s: string) {
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = (((a + q) | 0) + ((x + t) | 0)) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = (a + x[0]) | 0;
    x[1] = (b + x[1]) | 0;
    x[2] = (c + x[2]) | 0;
    x[3] = (d + x[3]) | 0;
  }
  function md51(s: string) {
    let n = s.length,
      state = [1732584193, -271733879, -1732584194, 271733878],
      i;
    for (i = 64; i <= n; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    let tail = Array(16).fill(0);
    for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    tail[s.length >> 2] |= 0x80 << ((s.length % 4) << 3);
    if (s.length > 55) {
      md5cycle(state, tail);
      tail = Array(16).fill(0);
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }
  function md5blk(s: string) {
    let md5blks = [], i;
    for (i = 0; i < 64; i += 4) {
      md5blks[i >> 2] =
        s.charCodeAt(i) +
        (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) +
        (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  function rhex(n: number) {
    let s = '', j = 0;
    for (; j < 4; j++) s += ('0' + ((n >> (j * 8)) & 0xff).toString(16)).slice(-2);
    return s;
  }
  function hex(x: number[]) {
    for (let i = 0; i < x.length; i++) x[i] = rhex(x[i]);
    return x.join('');
  }
  return hex(md51(s));
}

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

    // LOG XML envoyé
    console.log("📤 [DEBUG] XML envoyé à Mondial Relay :\n", body);

    const res = await fetch(SOAP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": SOAP_ACTION
      },
      body
    });

    const xml = await res.text();
    // LOG XML brut reçu
    console.log("📥 [DEBUG] XML brut reçu de Mondial Relay :\n", xml);

    // Simple parseur pour extraire les points relais
    const extractTags = (tag: string) => {
      const matches = Array.from(xml.matchAll(new RegExp(`<${tag}>(.*?)</${tag}>`, "g")));
      return matches.map((m) => m[1]);
    };
    const nums = extractTags("Num");
    const adrs1 = extractTags("LgAdr1");
    const adrs2 = extractTags("LgAdr2");
    const cps = extractTags("CP");
    const villes = extractTags("Ville");
    const pays = extractTags("Pays");
    const horaires = extractTags("Horaires");
    const latitudes = extractTags("Latitude");
    const longitudes = extractTags("Longitude");
    const distances = extractTags("Distance");

    // LOG des tags extraits
    console.log("🔎 [DEBUG] Tags extraits :", {
      nums, adrs1, adrs2, cps, villes, pays, horaires, latitudes, longitudes, distances
    });

    const result = nums.map((_, i) => ({
      Num: nums[i],
      LgAdr1: adrs1[i],
      LgAdr2: adrs2[i],
      CP: cps[i],
      Ville: villes[i],
      Pays: pays[i],
      Horaires: horaires[i],
      Latitude: latitudes[i],
      Longitude: longitudes[i],
      Distance: distances[i],
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