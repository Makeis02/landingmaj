import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OMISEND_API_URL = "https://api.omnisend.com/v3/contacts";

serve(async (req) => {
  console.log("🔥 Fonction appelée ! Méthode:", req.method);
  console.log("Headers reçus:", Object.fromEntries(req.headers.entries()));

  // CORS preflight
  if (req.method === "OPTIONS") {
    console.log("🔄 Réponse OPTIONS avec headers CORS");
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Vérification de la clé API Omisend
  const OMISEND_API_KEY = Deno.env.get("OMNISEND_API_KEY");
  console.log("🔑 OMISEND_API_KEY:", OMISEND_API_KEY ? "✅ Présente" : "❌ Manquante");
  console.log("🔍 Toutes les variables d'environnement:", Object.keys(Deno.env.toObject()));
  
  if (!OMISEND_API_KEY) {
    console.error("❌ OMISEND_API_KEY manquante");
    return new Response(
      JSON.stringify({ error: "Clé API Omisend manquante" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  if (req.method !== "POST") {
    console.log("❌ Méthode non autorisée:", req.method);
    return new Response(
      JSON.stringify({ error: "Méthode non autorisée" }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  let body;
  try {
    body = await req.json();
    console.log("📦 Body reçu:", body);
  } catch (err) {
    console.error("❌ Erreur parsing body:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Corps de requête invalide" }), 
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  const email = body.email;
  const tags = body.tags || [];
  const source = body.source || "wheel_popup";

  if (!email || typeof email !== "string") {
    console.log("❌ Email manquant ou invalide:", email);
    return new Response(
      JSON.stringify({ success: false, message: "Email manquant ou invalide" }), 
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  // Prépare le payload Omisend
  const omisendPayload = {
    identifiers: [{
      type: "email",
      id: email,
      channels: {
        email: {
          status: "subscribed",
          statusDate: new Date().toISOString()
        }
      }
    }],
    tags: [...tags, source]
  };
  console.log("📤 Payload Omisend:", omisendPayload);

  // Appel Omisend
  try {
    console.log("🚀 Appel API Omisend...");
    console.log("URL:", OMISEND_API_URL);
    console.log("Headers:", {
      "X-API-KEY": "***" + OMISEND_API_KEY.slice(-4),
      "Content-Type": "application/json",
    });

    const omisendRes = await fetch(OMISEND_API_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": OMISEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(omisendPayload),
    });

    console.log("📥 Status Omisend:", omisendRes.status);
    console.log("📥 Headers Omisend:", Object.fromEntries(omisendRes.headers.entries()));

    const contentType = omisendRes.headers.get("content-type") || "";
    console.log("📥 Content-Type:", contentType);

    if (!omisendRes.ok) {
      const errorText = await omisendRes.text();
      console.error("❌ Erreur Omisend (raw):", errorText);
      
      let errorPayload;
      try {
        errorPayload = JSON.parse(errorText);
      } catch (e) {
        errorPayload = { raw: errorText };
      }

      return new Response(
        JSON.stringify({ success: false, message: "Erreur Omisend", omisend: errorPayload }),
        {
          status: omisendRes.status || 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const omisendData = await omisendRes.json();
    console.log("📥 Réponse Omisend:", omisendData);

    // Succès
    console.log("✅ Inscription réussie pour:", email);
    return new Response(
      JSON.stringify({ success: true, omisend: omisendData }), 
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (err) {
    console.error("❌ Erreur réseau Omisend:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Erreur réseau Omisend", error: String(err) }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
}); 