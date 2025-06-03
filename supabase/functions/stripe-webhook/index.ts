import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

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
    console.log("✅ Paiement reçu, session:", session.id, "metadata:", session.metadata);
    // ... ta logique métier ici ...
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}); 