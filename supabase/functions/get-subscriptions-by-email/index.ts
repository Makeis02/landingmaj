import { serve } from 'https://deno.land/std/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0'
import "https://deno.land/std@0.168.0/dotenv/load.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 🔧 Fonction utilitaire pour nettoyer la description
const extractPlanNameFromDescription = (description: string): string => {
  const match = description.match(/×\s*(.*?)\s*\(at/i)
  return match ? match[1].trim() : description
}

console.log('⚡️ Function initialized')

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2022-11-15',
})

serve(async (req) => {
  console.group('🔄 New request received')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`📧 Recherche des abonnements pour : ${email}`)

    let customers = []
    let hasMore = true
    let startingAfter

    while (hasMore) {
      const response = await stripe.customers.list({
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      })

      const matched = response.data.filter(c => c.email?.toLowerCase() === email.toLowerCase())
      customers.push(...matched)

      response.data.forEach(c => console.log(`👤 Customer trouvé : ${c.id} (${c.email})`))

      hasMore = response.has_more
      if (hasMore) startingAfter = response.data[response.data.length - 1].id
    }

    if (customers.length === 0) {
      console.log('📭 Aucun customer trouvé')
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let allSubscriptions = []

    for (const customer of customers) {
      console.log(`🔍 Recherche des abonnements pour customer ${customer.id}`)

      let subHasMore = true
      let subStartingAfter

      while (subHasMore) {
        const subs = await stripe.subscriptions.list({
          customer: customer.id,
          status: 'all',
          limit: 100,
          ...(subStartingAfter && { starting_after: subStartingAfter }),
        })

        for (const sub of subs.data) {
          let plans = []

          if (sub.items.data.length > 0) {
            plans = await Promise.all(sub.items.data.map(async (item) => {
              const price = (item.price.unit_amount / 100).toFixed(2) + '€'
              let plan_name = item.price.nickname || extractPlanNameFromDescription(item.description || '')

              if (!plan_name || plan_name.toLowerCase().includes('sans nom')) {
                try {
                  const product = await stripe.products.retrieve(item.price.product as string)
                  plan_name = product.name
                  console.log(`✅ Nom du produit récupéré: ${product.name} pour ${item.price.product}`)
                } catch (e) {
                  console.warn(`⚠️ Impossible de récupérer le produit pour ${item.price.product}`, e)
                  plan_name = "Sans nom"
                }
              }

              return { price, plan_name }
            }))
          }

          // 🔎 Dernier paiement pour tous les abonnements
          let last_payment = null
          let no_more_payments = false

          if (sub.status === 'canceled') {
            no_more_payments = true
          }

          if (sub.latest_invoice) {
            try {
              const invoice = await stripe.invoices.retrieve(sub.latest_invoice as string)

              if (invoice.paid && invoice.created) {
                last_payment = new Date(invoice.created * 1000).toISOString()
                console.log(`💳 Dernier paiement trouvé pour ${sub.id}: ${last_payment}`)
              } else {
                console.log(`📭 Facture non payée ou incomplète pour ${sub.id}`)
              }
            } catch (e) {
              console.warn(`⚠️ Erreur récupération facture ${sub.latest_invoice}:`, e)
            }
          }

          const subscriptionWithPlans = {
            id: sub.id,
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            plans,
            customer_id: customer.id,
            last_payment,
            no_more_payments
          }

          // ⛔️ Filtrer les abonnements résiliés depuis plus de 2 mois
          if (
            sub.status === 'canceled' &&
            new Date(sub.current_period_end * 1000) < new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
          ) {
            console.log(`🧹 Abonnement ${sub.id} résilié depuis plus de 2 mois, ignoré.`)
            continue
          }

          allSubscriptions.push(subscriptionWithPlans)

          console.log(`📦 Abonnement avec plans multiples :`, subscriptionWithPlans)
          console.log('📋 Liste des packs dans cet abonnement :')
          plans.forEach((plan, index) => {
            console.log(`   ${index + 1}. ${plan.plan_name} (${plan.price})`)
          })
          console.log('---')
        }

        subHasMore = subs.has_more
        if (subHasMore) subStartingAfter = subs.data[subs.data.length - 1].id
      }
    }

    console.log(`✅ Total abonnements trouvés : ${allSubscriptions.length}`)
    console.log('📊 Récapitulatif de tous les abonnements :')
    allSubscriptions.forEach((sub, index) => {
      console.log(`\n🔸 Abonnement #${index + 1} :`)
      console.log(`   ID: ${sub.id}`)
      console.log(`   Status: ${sub.status}`)
      console.log(`   Fin de période: ${new Date(sub.current_period_end).toLocaleDateString('fr-FR')}`)
      console.log('   Plans:')
      sub.plans.forEach((plan, planIndex) => {
        console.log(`     ${planIndex + 1}. ${plan.plan_name} (${plan.price})`)
      })
    })

    return new Response(JSON.stringify(allSubscriptions), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('💥 Erreur inattendue :', err)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } finally {
    console.groupEnd()
  }
})
