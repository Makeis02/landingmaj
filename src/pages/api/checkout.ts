import Stripe from "stripe";
import { supabase } from "@/integrations/supabase/client";

console.log("🔐 Stripe Secret Key utilisée :", import.meta.env.VITE_STRIPE_SECRET_KEY);

const stripe = new Stripe(import.meta.env.VITE_STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15" as any, // version stable et validée
});

// Interface pour le debug object
interface CheckoutDebug {
  user_id?: any;
  items?: any;
  validated: {
    panier_valide?: boolean;
    prix_manquant?: any[];
    error?: string;
  };
  supabase: {
    order_insert?: {
      input?: any;
      result?: any;
      error?: any;
    };
    items_insert?: {
      input?: any;
      error?: any;
    };
  };
  stripe: {
    session?: any;
    error?: any;
  };
  global_error?: any;
}

export const POST = async ({ request }) => {
  let debug: CheckoutDebug = {
    user_id: undefined,
    items: undefined,
    validated: {},
    supabase: {},
    stripe: {}
  };
  
  try {
    const body = await request.json();
    const { items, user_id } = body;
    debug.user_id = user_id;
    debug.items = items;

    console.log("✅ [CHECKOUT] Début du traitement");
    console.log("👤 User ID:", user_id);
    console.log("🧾 Items reçus:", items);

    // Validation du panier
    if (!items || !Array.isArray(items) || items.length === 0) {
      debug.validated.error = "Panier vide";
      return new Response(JSON.stringify({ error: "Panier vide", debug }), { status: 400 });
    }

    // Vérifier que tous les produits ont un stripe_price_id
    const invalid = items.filter(
      item =>
        !item.price_data &&
        !item.stripe_price_id &&
        !item.stripe_discount_price_id
    );
    if (invalid.length > 0) {
      debug.validated.error = "Produits sans stripe_price_id ni price_data";
      return new Response(JSON.stringify({ error: "Produits sans stripe_price_id ni price_data", debug }), { status: 400 });
    }

    // Calculer le total
    const total = items.reduce((acc, item) => {
      const finalPrice = item.has_discount && item.price ? item.price : item.price;
      return acc + (finalPrice * item.quantity);
    }, 0);
    
    // Validation du montant minimum
    const STRIPE_MINIMUM_EUR = 0.50;
    if (total < STRIPE_MINIMUM_EUR) {
      debug.validated.error = `Montant trop faible: ${total}€ < ${STRIPE_MINIMUM_EUR}€`;
      return new Response(JSON.stringify({ 
        error: `Le montant total doit être d'au moins ${STRIPE_MINIMUM_EUR}€`, 
        debug 
      }), { status: 400 });
    }

    // Créer les line items Stripe
    const lineItems = items.map(item => {
      const priceId = (item.has_discount && item.stripe_discount_price_id)
        ? item.stripe_discount_price_id
        : item.stripe_price_id;
      return {
        price: priceId,
        quantity: item.quantity,
      };
    });

    // Créer la session Stripe avec les métadonnées nécessaires
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${import.meta.env.VITE_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${import.meta.env.VITE_SITE_URL}/checkout`,
        line_items: lineItems,
        metadata: {
          user_id: user_id || null,
          items: JSON.stringify(items), // Stocker les items pour la création de la commande après paiement
          total: total.toString(),
        },
      });
      console.log("✅ Stripe session créée avec succès :", session?.url);
      debug.stripe.session = session;
    } catch (err) {
      console.error("❌ Erreur Stripe session:", err);
      debug.stripe.error = err;
      return new Response(JSON.stringify({ error: "Stripe session failed", debug }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!session?.url) {
      debug.stripe.error = "Pas d'URL Stripe retournée";
      return new Response(JSON.stringify({ error: "Pas d'URL Stripe retournée", debug }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: session.url, debug }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("🔥 [CHECKOUT] Erreur inattendue:", error);
    debug.global_error = error;
    return new Response(JSON.stringify({ error: error.message || "Erreur inconnue", debug }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}; 