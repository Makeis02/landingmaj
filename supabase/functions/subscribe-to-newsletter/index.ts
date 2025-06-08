import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Remplace par ta clé API Omisend dans les variables d'environnement Supabase
const OMISEND_API_KEY = Deno.env.get("OMISEND_API_KEY") || "<TA_CLE_OMISEND>";
const OMISEND_API_URL = "https://api.omisend.com/v3/contacts";

serve(async (req) => {
  // GESTION CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, message: "Corps de requête invalide" }), {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  }

  const email = body.email;
  const tags = body.tags || [];
  const source = body.source || "wheel_popup";

  if (!email || typeof email !== "string") {
    return new Response(JSON.stringify({ success: false, message: "Email manquant ou invalide" }), {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  }

  // Prépare le payload Omisend
  const omisendPayload = {
    identifiers: [{ type: "email", id: email }],
    tags: [...tags, source],
    status: "subscribed",
  };

  // Appel Omisend
  let omisendRes, omisendData;
  try {
    omisendRes = await fetch(OMISEND_API_URL, {
      method: "POST",
      headers: {
        "X-API-KEY": OMISEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(omisendPayload),
    });
    omisendData = await omisendRes.json();
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: "Erreur réseau Omisend", error: String(err) }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  }

  if (!omisendRes.ok) {
    return new Response(JSON.stringify({ success: false, message: "Erreur Omisend", omisend: omisendData }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  }

  // Succès
  return new Response(JSON.stringify({ success: true, omisend: omisendData }), {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  });
}); 