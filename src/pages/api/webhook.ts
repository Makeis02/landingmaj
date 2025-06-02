import Stripe from "stripe";
import { supabase } from "@/integrations/supabase/client";

const stripe = new Stripe(import.meta.env.VITE_STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15" as any,
});

const webhookSecret = import.meta.env.VITE_STRIPE_WEBHOOK_SECRET;

export const POST = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("❌ Erreur de signature webhook:", err.message);
    return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Gérer uniquement l'événement de paiement réussi
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    
    try {
      // Récupérer les métadonnées de la session
      const { user_id, items, total } = session.metadata;
      const parsedItems = JSON.parse(items);

      // 1. Créer la commande
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          total: parseFloat(total),
          user_id: user_id || null,
          status: "active",
          stripe_session_id: session.id,
          payment_status: "paid",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Créer les order_items
      const orderItems = parsedItems
        .filter(item => !item.price_data)
        .map(item => ({
          order_id: order.id,
          product_id: item.id,
          quantity: item.quantity,
          price: item.price,
          original_price: item.original_price || item.price,
          discount_percentage: item.discount_percentage || null,
          has_discount: item.has_discount || false
        }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      console.log("✅ Commande créée avec succès:", order.id);
      
      return new Response(JSON.stringify({ success: true, order_id: order.id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Erreur lors de la création de la commande:", error);
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Répondre avec succès pour les autres événements
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}; 