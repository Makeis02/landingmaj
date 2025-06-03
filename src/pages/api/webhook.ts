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
      // LOG: Affiche le metadata reçu
      console.log('🔔 [WEBHOOK] checkout.session.completed reçu. Metadata Stripe:', session.metadata);
      // Récupérer les métadonnées de la session
      const {
        order_id, items, total,
        user_id,
        first_name, last_name, email, phone,
        address1, address2, postal_code, city, country,
        shipping_method, mondial_relay
      } = session.metadata;
      console.log('🔔 [WEBHOOK] order_id reçu:', order_id);
      const parsedItems = JSON.parse(items);

      // 1. Mettre à jour la commande existante
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .update({
          total: parseFloat(total),
          user_id: user_id || null,
          status: "active",
          stripe_session_id: session.id,
          payment_status: "paid",
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
          mondial_relay: mondial_relay ? JSON.stringify(mondial_relay) : null
        })
        .eq("id", order_id)
        .select()
        .single();
      console.log('🔔 [WEBHOOK] Résultat update commande:', { order, orderError });

      if (orderError) throw orderError;

      // 2. Supprimer les anciens order_items (optionnel mais recommandé)
      await supabase.from("order_items").delete().eq("order_id", order.id);

      // 3. Insérer les nouveaux order_items
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

      if (itemsError) {
        console.error('❌ [WEBHOOK] Erreur insertion order_items:', itemsError);
        throw itemsError;
      }

      console.log("✅ Commande mise à jour avec succès:", order.id);
      
      return new Response(JSON.stringify({ success: true, order_id: order.id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour de la commande:", error);
      return new Response(JSON.stringify({ error: "Failed to update order", details: error }), {
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