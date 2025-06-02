import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.1.0'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('OK', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2022-11-15',
  })

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const logs: string[] = []

  // Vérifier la méthode
  if (req.method !== 'POST') {
    logs.push('[CREATE-SHIPPING] ❌ Méthode non autorisée')
    return new Response(
      JSON.stringify({ error: 'Méthode non autorisée', logs }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  }

  try {
    const body = await req.json()
    const { productId, amount } = body

    logs.push('[CREATE-SHIPPING] Payload reçu: ' + JSON.stringify({ productId, amount }))

    if (!productId || !amount) {
      logs.push('[CREATE-SHIPPING] ❌ Paramètres manquants')
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants', logs }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    // Créer un nouveau prix Stripe pour les frais de port
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(amount * 100), // Convertir en centimes
      currency: 'eur',
      metadata: {
        type: 'shipping',
        created_at: new Date().toISOString()
      }
    })

    logs.push('[CREATE-SHIPPING] ✅ Nouveau prix créé: ' + price.id)
    logs.push(`[CREATE-SHIPPING] 📋 Détails: ${price.unit_amount} centimes`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        priceId: price.id,
        amount: amount,
        logs 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )

  } catch (err) {
    logs.push('[CREATE-SHIPPING] ❌ Erreur: ' + err.message)
    logs.push('[CREATE-SHIPPING] 📚 Stack: ' + (err.stack || 'N/A'))
    console.error('[CREATE-SHIPPING] ❌ Error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur inconnue', logs }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  }
}) 