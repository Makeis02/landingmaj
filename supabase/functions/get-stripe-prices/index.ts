import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.1.0'

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

  // Vérifier la méthode
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Méthode non autorisée' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2022-11-15',
  })

  const logs: string[] = []

  try {
    const body = await req.json()
    const { stripeProductId } = body

    logs.push('[GET-STRIPE-PRICES] Demande reçue pour produit: ' + stripeProductId)

    if (!stripeProductId) {
      logs.push('[GET-STRIPE-PRICES] ❌ stripeProductId manquant')
      return new Response(
        JSON.stringify({ error: 'stripeProductId manquant', logs }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    // Récupérer tous les prix pour ce produit
    logs.push('[GET-STRIPE-PRICES] 🔍 Récupération des prix depuis Stripe...')
    const prices = await stripe.prices.list({ 
      product: stripeProductId, 
      limit: 100,
      expand: ['data.product']
    })

    logs.push(`[GET-STRIPE-PRICES] 📊 ${prices.data.length} prix trouvés`)
    
    // Logs détaillés des prix trouvés
    if (prices.data.length > 0) {
      logs.push('[GET-STRIPE-PRICES] 📋 Détails des prix:')
      prices.data.forEach((price, index) => {
        logs.push(`[GET-STRIPE-PRICES]   ${index + 1}. ID: ${price.id}`)
        logs.push(`[GET-STRIPE-PRICES]      - lookup_key: ${price.lookup_key || 'N/A'}`)
        logs.push(`[GET-STRIPE-PRICES]      - amount: ${price.unit_amount} ${price.currency}`)
        logs.push(`[GET-STRIPE-PRICES]      - active: ${price.active}`)
        logs.push(`[GET-STRIPE-PRICES]      - nickname: ${price.nickname || 'N/A'}`)
      })
    }

    // Formater les données pour le retour
    const formattedPrices = prices.data.map(price => ({
      id: price.id,
      lookup_key: price.lookup_key,
      unit_amount: price.unit_amount,
      currency: price.currency,
      active: price.active,
      nickname: price.nickname,
      metadata: price.metadata
    }))

    logs.push('[GET-STRIPE-PRICES] ✅ Prix récupérés avec succès')

    return new Response(
      JSON.stringify({ 
        success: true, 
        prices: formattedPrices,
        total: prices.data.length,
        logs 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  } catch (err) {
    logs.push('[GET-STRIPE-PRICES] ❌ Erreur: ' + err.message)
    console.error('[GET-STRIPE-PRICES] ❌ Erreur:', err.message)
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur inconnue', logs }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  }
}) 