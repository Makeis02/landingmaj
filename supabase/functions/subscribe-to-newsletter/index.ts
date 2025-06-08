import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Remplace par ta clé API Omisend dans les variables d'environnement Supabase
const OMISEND_API_KEY = Deno.env.get("OMISEND_API_KEY") || "<TA_CLE_OMISEND>";
const OMISEND_API_URL = "https://api.omisend.com/v3/contacts";

serve(async (req) => {
  console.log("🔥 Fonction appelée ! Méthode:", req.method);
  console.log("Headers reçus:", Object.fromEntries(req.headers.entries()));

  // CORS preflight
  if (req.method === "OPTIONS") {
    console.log("🔄 Réponse OPTIONS avec headers CORS");
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
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
    identifiers: [{ type: "email", id: email }],
    tags: [...tags, source],
    status: "subscribed",
  };
  console.log("📤 Payload Omisend:", omisendPayload);

  // Appel Omisend
  let omisendRes, omisendData;
  try {
    console.log("🚀 Appel API Omisend...");
    omisendRes = await fetch(OMISEND_API_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": OMISEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(omisendPayload),
    });
    omisendData = await omisendRes.json();
    console.log("📥 Réponse Omisend:", omisendData);
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

  if (!omisendRes.ok) {
    console.error("❌ Erreur Omisend:", omisendData);
    return new Response(
      JSON.stringify({ success: false, message: "Erreur Omisend", omisend: omisendData }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  // Succès
  console.log("✅ Inscription réussie pour:", email);
  return new Response(
    JSON.stringify({ success: true, omisend: omisendData }), 
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}); 