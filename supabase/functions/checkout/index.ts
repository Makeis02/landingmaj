// 🟢 Cette fonction doit être configurée comme "Invoke without authentication" (publique) dans Supabase Studio.
// Cela permet le checkout invité ET connecté sans header Authorization.
// Aucune donnée sensible n'est exposée, la sécurité repose sur la validation des entrées et la logique métier.

// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// 🔐 Configuration Supabase
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ✅ En-têtes CORS
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// 🚦 Gestion OPTIONS
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  const debug: any = {
    received: {},
    validated: {},
    supabase: {},
    stripe: {},
  };

  try {
    const body = await req.json();
    const { items, user_id, mondial_relay, promo_code } = body;
    // Ajout des nouveaux champs de contact/adresse/mode livraison
    const {
      first_name,
      last_name,
      email,
      phone,
      address1,
      address2,
      postal_code,
      city,
      country,
      shipping_method
    } = body;
    debug.received = { items, user_id, mondial_relay, promo_code, first_name, last_name, email, phone, address1, address2, postal_code, city, country, shipping_method };

    // 🛒 Vérification panier
    if (!items || !Array.isArray(items) || items.length === 0) {
      debug.validated.error = "Panier vide";
      console.log("📦 DEBUG FINAL :", JSON.stringify(debug, null, 2));
      return new Response(JSON.stringify({ error: "Panier vide", debug }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...headers }
      });
    }

    // 🎁 SÉPARATION : Produits payants vs Cadeaux
    const payableItems = items.filter((item: any) => !item.is_gift && !item.threshold_gift);
    const wheelGifts = items.filter((item: any) => item.is_gift === true && (item.image_url || item.segment_position !== undefined));
    const allGifts = items.filter((item: any) => item.is_gift === true || item.threshold_gift === true);

    console.log("💰 [CHECKOUT] Produits payants:", payableItems.length);
    console.log("🎁 [CHECKOUT] Cadeaux roue:", wheelGifts.length); 
    console.log("🎁 [CHECKOUT] Total cadeaux:", allGifts.length);

    // Vérification qu'il y a au moins un produit payant
    if (payableItems.length === 0) {
      debug.validated.error = "Aucun produit payant";
      console.log("📦 DEBUG FINAL :", JSON.stringify(debug, null, 2));
      return new Response(JSON.stringify({ error: "Impossible de créer une commande sans produits payants", debug }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...headers }
      });
    }

    // ❌ Vérification Stripe price ID (SEULEMENT pour les produits payants)
    const invalid = payableItems.filter((i: any) => !i.stripe_price_id);
    if (invalid.length > 0) {
      debug.validated.invalid_items = invalid;
      console.log("📦 DEBUG FINAL :", JSON.stringify(debug, null, 2));
      return new Response(JSON.stringify({ error: "Produit(s) payants sans stripe_price_id", debug }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...headers }
      });
    }

    // 💰 Calcul du sous-total (SEULEMENT les produits payants)
    const subtotal = payableItems.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
    
    // 🎫 Application du code promo
    let promoDiscount = 0;
    if (promo_code && promo_code.discount_amount) {
      promoDiscount = parseFloat(promo_code.discount_amount) || 0;
      console.log(`🎫 Code promo appliqué: ${promo_code.code} = -${promoDiscount}€`);
    }
    
    // Calcul du total final avec réduction
    const total = Math.max(0, subtotal - promoDiscount);
    
    console.log(`💰 Calcul: Sous-total: ${subtotal}€ - Promo: ${promoDiscount}€ = Total: ${total}€`);
    
    debug.validated.subtotal = subtotal;
    debug.validated.promoDiscount = promoDiscount;
    debug.validated.total = total;
    debug.validated.payableItems = payableItems.length;
    debug.validated.wheelGifts = wheelGifts.length;

    // 📦 Création commande Supabase
    const orderPayload = {
      total,
      ...(user_id ? { user_id } : {}),
      ...(mondial_relay ? { mondial_relay } : {}),
      first_name,
      last_name,
      email,
      phone,
      address1,
      address2,
      postal_code,
      city,
      country,
      shipping_method,
      status: "pending_payment"
    };
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();

    debug.supabase.order = { payload: orderPayload, response: order, error: orderError };

    if (orderError) {
      console.log("📦 DEBUG FINAL :", JSON.stringify(debug, null, 2));
      return new Response(JSON.stringify({ error: "Création commande échouée", debug }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...headers }
      });
    }

    // 🧾 Insertion des produits
    const orderItems = payableItems.map((i: any) => ({
      order_id: order.id,
      product_id: i.id,
      quantity: i.quantity,
      price: i.price,
      variant: i.variant || null,
      product_title: i.title || null,
    }));
    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    debug.supabase.items = { input: orderItems, error: itemsError };

    if (itemsError) {
      console.log("📦 DEBUG FINAL :", JSON.stringify(debug, null, 2));
      return new Response(JSON.stringify({ error: "Erreur produits", debug }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...headers }
      });
    }

    // 💳 Création session Stripe via HTTP (pas SDK)
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const siteUrl = Deno.env.get("SITE_URL");

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `https://majemsiteteste.netlify.app/order-confirmation?order_id=${order.id}`);
    params.append("cancel_url", `https://majemsiteteste.netlify.app/checkout?canceled=true`);
    
    // 🎫 NOUVEAU : Utiliser price_data pour appliquer les codes promo
    payableItems.forEach((item: any, idx: number) => {
      // Calculer le prix unitaire avec réduction proportionnelle du code promo
      let unitPrice = item.price;
      
      if (promoDiscount > 0 && subtotal > 0) {
        const promoReductionRatio = promoDiscount / subtotal;
        const itemPromoReduction = unitPrice * promoReductionRatio;
        unitPrice = Math.max(0, unitPrice - itemPromoReduction);
        console.log(`🎫 Item ${item.title}: Prix original: ${item.price}€, après promo: ${unitPrice}€`);
      }
      
      // Utiliser price_data au lieu de price_id pour les prix dynamiques
      params.append(`line_items[${idx}][price_data][currency]`, "eur");
      params.append(`line_items[${idx}][price_data][product_data][name]`, item.title || "Produit");
      params.append(`line_items[${idx}][price_data][unit_amount]`, String(Math.round(unitPrice * 100))); // Stripe utilise les centimes
      if (item.image_url) {
        params.append(`line_items[${idx}][price_data][product_data][images][0]`, item.image_url);
      }
      params.append(`line_items[${idx}][quantity]`, String(item.quantity));
    });
    params.append("metadata[supabase_order_id]", order.id);
    if (user_id) params.append("metadata[user_id]", user_id);
    // Ajout des cadeaux de la roue dans les métadonnées
    if (wheelGifts.length > 0) {
      params.append("metadata[wheel_gifts]", JSON.stringify(wheelGifts));
    }
    // Ajout de TOUS les champs client à plat dans metadata
    if (first_name) params.append("metadata[first_name]", first_name);
    if (last_name) params.append("metadata[last_name]", last_name);
    if (email) params.append("metadata[email]", email);
    if (phone) params.append("metadata[phone]", phone);
    if (address1) params.append("metadata[address1]", address1);
    if (address2) params.append("metadata[address2]", address2);
    if (postal_code) params.append("metadata[postal_code]", postal_code);
    if (city) params.append("metadata[city]", city);
    if (country) params.append("metadata[country]", country);
    if (shipping_method) params.append("metadata[shipping_method]", shipping_method);
    if (mondial_relay) params.append("metadata[mondial_relay]", typeof mondial_relay === 'string' ? mondial_relay : JSON.stringify(mondial_relay));
    // Ajout des informations du code promo dans les métadonnées
    if (promo_code) {
      params.append("metadata[promo_code]", JSON.stringify(promo_code));
      params.append("metadata[subtotal]", subtotal.toString());
      params.append("metadata[promo_discount]", promoDiscount.toString());
    }
    params.append("metadata[order_id]", order.id);
    params.append("metadata[total]", total.toString());

    debug.stripe.payload = Object.fromEntries(params.entries());

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params
    });

    const rawBody = await stripeResponse.text();
    debug.stripe.rawResponse = rawBody;
    let session;
    try {
      session = JSON.parse(rawBody);
    } catch (e) {
      debug.stripe.parseError = e.message || e;
      console.log("📦 DEBUG FINAL :", JSON.stringify(debug, null, 2));
      return new Response(JSON.stringify({ error: "Réponse Stripe non JSON", debug }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...headers }
      });
    }
    debug.stripe.session = session;

    if (!session?.url) {
      console.log("📦 DEBUG FINAL :", JSON.stringify(debug, null, 2));
      return new Response(JSON.stringify({ error: "Stripe n'a pas renvoyé d'URL", debug }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...headers }
      });
    }

    console.log("📦 DEBUG FINAL :", JSON.stringify(debug, null, 2));
    return new Response(JSON.stringify({ url: session.url, debug }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...headers }
    });

  } catch (error) {
    debug.global_error = error.message || error;
    console.log("📦 DEBUG FINAL :", JSON.stringify(debug, null, 2));
    return new Response(JSON.stringify({ error: "Erreur serveur", debug }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...headers }
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/checkout' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
