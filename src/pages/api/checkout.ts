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
    const { items, user_id, shipping_info, promo_code } = body;
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

    // Séparer les produits payants des cadeaux de la roue
    // FILTRAGE STRICT : un produit est payant SEULEMENT s'il n'est PAS un cadeau
    const payableItems = items.filter(item => {
      const isGift = item.is_gift === true || item.threshold_gift === true;
      const isWheelGift = item.is_gift === true && (item.image_url || item.segment_position !== undefined);
      return !isGift; // Exclure TOUS les cadeaux
    });
    
    const wheelGifts = items.filter(item => item.is_gift === true && (item.image_url || item.segment_position !== undefined));
    const allGifts = items.filter(item => item.is_gift === true || item.threshold_gift === true);

    console.log("💳 Produits payants:", payableItems);
    console.log("🎁 Cadeaux roue (avec image):", wheelGifts);
    console.log("🎁 TOUS les cadeaux:", allGifts);
    console.log("📦 Items totaux:", items.length, "| Payants:", payableItems.length, "| Cadeaux:", allGifts.length);

    // Debug spécifique : vérifier chaque item
    items.forEach((item, index) => {
      console.log(`Item ${index}:`, {
        id: item.id,
        title: item.title,
        is_gift: item.is_gift,
        threshold_gift: item.threshold_gift,
        image_url: item.image_url,
        segment_position: item.segment_position,
        stripe_price_id: item.stripe_price_id,
        price: item.price,
        isPayable: !item.is_gift && !item.threshold_gift
      });
    });

    // S'assurer qu'il y a au moins un produit payant
    if (payableItems.length === 0) {
      debug.validated.error = "Aucun produit payant dans le panier";
      return new Response(JSON.stringify({ 
        error: "Impossible de créer une commande sans produits payants", 
        debug 
      }), { status: 400 });
    }

    // Vérifier que tous les produits payants ont un stripe_price_id
    const invalid = payableItems.filter(
      item =>
        !item.price_data &&
        !item.stripe_price_id &&
        !item.stripe_discount_price_id
    );
    
    if (invalid.length > 0) {
      console.error("❌ Items sans stripe_price_id ni price_data:", invalid);
      debug.validated.error = "Produits sans stripe_price_id ni price_data";
      debug.validated.prix_manquant = invalid;
      return new Response(JSON.stringify({ 
        error: "Items sans stripe_price_id ni price_data", 
        invalid_items: invalid,
        debug 
      }), { status: 400 });
    }

    // Calculer le sous-total (uniquement produits payants)
    const subtotal = payableItems.reduce((acc, item) => {
      const finalPrice = item.has_discount && item.price ? item.price : item.price;
      return acc + (finalPrice * item.quantity);
    }, 0);
    
    // 🎫 NOUVEAU : Appliquer la réduction du code promo
    let promoDiscount = 0;
    if (promo_code && promo_code.discount_amount) {
      promoDiscount = parseFloat(promo_code.discount_amount) || 0;
      console.log(`🎫 Code promo appliqué: ${promo_code.code} = -${promoDiscount}€`);
    }
    
    // Calculer le total final avec la réduction du code promo
    const total = Math.max(0, subtotal - promoDiscount);
    
    console.log(`💰 Calcul total: Sous-total: ${subtotal}€ - Promo: ${promoDiscount}€ = Total: ${total}€`);
    
    // Validation du montant minimum
    const STRIPE_MINIMUM_EUR = 0.50;
    if (total < STRIPE_MINIMUM_EUR) {
      debug.validated.error = `Montant trop faible: ${total}€ < ${STRIPE_MINIMUM_EUR}€`;
      return new Response(JSON.stringify({ 
        error: `Le montant total doit être d'au moins ${STRIPE_MINIMUM_EUR}€`, 
        debug 
      }), { status: 400 });
    }

    // 🎫 NOUVEAU : Créer les line items Stripe avec price_data pour gérer les codes promo
    const lineItems = payableItems.map(item => {
      // Calculer le prix unitaire avec la réduction proportionnelle du code promo
      let unitPrice = item.price; // Prix déjà avec réductions produit
      
      if (promoDiscount > 0 && subtotal > 0) {
        // Appliquer la réduction proportionnelle du code promo
        const promoReductionRatio = promoDiscount / subtotal;
        const itemPromoReduction = unitPrice * promoReductionRatio;
        unitPrice = Math.max(0, unitPrice - itemPromoReduction);
        console.log(`🎫 Item ${item.title}: Prix original: ${item.price}€, après promo: ${unitPrice}€`);
      }
      
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.title || 'Produit',
            ...(item.image_url && { images: [item.image_url] })
          },
          unit_amount: Math.round(unitPrice * 100), // Stripe utilise les centimes
        },
        quantity: item.quantity,
      };
    });

    // Créer la session Stripe avec les métadonnées nécessaires
    let session;
    try {
      // Mettre tous les champs shipping_info à plat dans metadata
      const flatMetadata = {
        user_id: user_id || null,
        items: JSON.stringify(payableItems), // Seulement les produits payants
        wheel_gifts: JSON.stringify(wheelGifts), // Cadeaux de la roue séparément
        subtotal: subtotal.toString(),
        promo_discount: promoDiscount.toString(),
        promo_code: promo_code ? JSON.stringify(promo_code) : null,
        total: total.toString(),
        ...(shipping_info || {})
      };
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${import.meta.env.VITE_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${import.meta.env.VITE_SITE_URL}/checkout`,
        line_items: lineItems,
        metadata: flatMetadata,
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