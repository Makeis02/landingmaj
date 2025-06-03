import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Utilitaire pour vérifier la signature Stripe (HMAC SHA256)
async function verifyStripeSignature(payload: Uint8Array, sigHeader: string, secret: string): Promise<boolean> {
  // Stripe envoie plusieurs signatures, on prend la v1
  const match = sigHeader.match(/v1=([a-f0-9]+)/);
  if (!match) return false;
  const signature = match[1];

  // Stripe demande un timestamp + le payload
  const timestamp = sigHeader.match(/t=(\d+)/)?.[1];
  if (!timestamp) return false;

  const signedPayload = `${timestamp}.${new TextDecoder().decode(payload)}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );
  const signatureHex = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  return signatureHex === signature;
}

serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const body = new Uint8Array(await req.arrayBuffer());

  // Vérifie la signature Stripe
  const valid = await verifyStripeSignature(body, sig, STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    console.error("❌ Erreur de signature webhook: Signature invalide");
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  // Parse le body JSON
  const event = JSON.parse(new TextDecoder().decode(body));

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const metadata = session.metadata || {};
    const order_id = metadata.order_id;
    if (!order_id) {
      console.error("❌ Pas d'order_id dans metadata Stripe");
      return new Response("order_id manquant dans metadata", { status: 400 });
    }
    // Prépare les champs à mettre à jour
    const updateFields = {
      status: "active",
      payment_status: "paid",
      stripe_session_id: session.id,
      first_name: metadata.first_name,
      last_name: metadata.last_name,
      email: metadata.email,
      phone: metadata.phone,
      address1: metadata.address1,
      address2: metadata.address2,
      postal_code: metadata.postal_code,
      city: metadata.city,
      country: metadata.country,
      shipping_method: metadata.shipping_method,
      mondial_relay: metadata.mondial_relay ? metadata.mondial_relay : null,
      total: parseFloat(metadata.total || "0")
    };
    // Appel PATCH Supabase REST API
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order_id}`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(updateFields)
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Erreur update commande:", errorText);
      return new Response("Failed to update order", { status: 500 });
    }
    const updatedOrder = await res.json();
    console.log("✅ Commande mise à jour avec succès:", order_id, updatedOrder);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}); 