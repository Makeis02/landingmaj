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
        'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
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

  // Gestion de la suppression d'un Price
  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const priceId = url.searchParams.get('priceId')
    
    logs.push('[SYNC-STRIPE] 🗑️ DELETE: Demande de suppression reçue')
    logs.push(`[SYNC-STRIPE] 🔑 Price ID à supprimer: ${priceId}`)

    if (!priceId) {
      logs.push('[SYNC-STRIPE] ❌ DELETE: Aucun priceId fourni')
      return new Response(
        JSON.stringify({ error: 'Price ID manquant', logs }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    try {
      // Récupérer les détails du Price avant suppression
      logs.push('[SYNC-STRIPE] 🔍 DELETE: Récupération des détails du Price...')
      const priceDetails = await stripe.prices.retrieve(priceId)
      logs.push(`[SYNC-STRIPE] 📋 DELETE: Price trouvé: ${priceDetails.id}`)
      logs.push(`[SYNC-STRIPE] 📋 DELETE: Détails - lookup_key: ${priceDetails.lookup_key}, amount: ${priceDetails.unit_amount}, active: ${priceDetails.active}`)
      logs.push(`[SYNC-STRIPE] 📋 DELETE: Metadata: ${JSON.stringify(priceDetails.metadata)}`)
      
      // Vérifier si c'est un prix promotionnel UNIQUEMENT via les metadata
      const isPromotionalPrice = priceDetails.metadata?.is_discount === 'true'
      logs.push(`[SYNC-STRIPE] 🎯 DELETE: Prix promotionnel? ${isPromotionalPrice ? 'OUI' : 'NON'}`)
      logs.push(`[SYNC-STRIPE] 🔍 DELETE: Metadata is_discount: ${priceDetails.metadata?.is_discount}`)
      logs.push(`[SYNC-STRIPE] 🔍 DELETE: Lookup key: ${priceDetails.lookup_key}`)
      
      if (!isPromotionalPrice) {
        logs.push('[SYNC-STRIPE] ⚠️ DELETE: ATTENTION! Tentative de suppression d\'un prix de base ou variante normale - BLOQUÉ')
        return new Response(
          JSON.stringify({ 
            error: 'Suppression d\'un prix de base ou variante normale non autorisée. Seuls les prix promotionnels (metadata.is_discount=true) peuvent être supprimés.', 
            priceType: 'base_or_variant',
            metadata: priceDetails.metadata,
            lookup_key: priceDetails.lookup_key,
            logs 
          }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          }
        )
      }

      // Désactiver le Price (pas de suppression physique avec Stripe)
      logs.push('[SYNC-STRIPE] 🔧 DELETE: Désactivation du Price...')
      const updatedPrice = await stripe.prices.update(priceId, { active: false })
      logs.push(`[SYNC-STRIPE] ✅ DELETE: Price désactivé: ${updatedPrice.id}`)
      logs.push(`[SYNC-STRIPE] 📋 DELETE: Nouveau statut active: ${updatedPrice.active}`)
      logs.push(`[SYNC-STRIPE] 🎉 DELETE: Suppression réussie du prix promotionnel`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          priceId: updatedPrice.id, 
          active: updatedPrice.active,
          action: 'deactivated',
          logs 
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    } catch (err) {
      logs.push('[SYNC-STRIPE] ❌ DELETE: Erreur lors de la suppression: ' + err.message)
      logs.push('[SYNC-STRIPE] 📚 DELETE: Stack: ' + (err.stack || 'N/A'))
      console.error('[SYNC-STRIPE] ❌ DELETE Error:', err.message)
      return new Response(
        JSON.stringify({ error: err.message || 'Erreur inconnue lors de la suppression', logs }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }
  }

  // Vérifier la méthode
  if (req.method !== 'POST') {
    logs.push('[SYNC-STRIPE] ❌ Méthode non autorisée')
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
    const { stripeProductId, label, option, price, isDiscount = false } = body

    logs.push('[SYNC-STRIPE] Payload reçu: ' + JSON.stringify({ stripeProductId, label, option, price, isDiscount }))
    logs.push(`[SYNC-STRIPE] 🎯 Type de prix: ${isDiscount ? 'PROMOTIONNEL' : 'NORMAL'}`)

    if (!stripeProductId || !label || !option || !price) {
      logs.push('[SYNC-STRIPE] ❌ Paramètres manquants')
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants', logs }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    // ✅ Fallback intelligent si label ou option vides
    const baseLabel = (label || "default").trim().replace(/\s+/g, "-")
    const baseOption = (option || "standard").trim().replace(/\s+/g, "-")

    const comboKey = `${baseLabel}:${baseOption}`
    
    // 🎯 NOUVEAU: Générer un lookup_key unique pour les promotions avec timestamp
    let lookupKey: string;
    let nickname: string;
    
    if (isDiscount) {
      // Pour les promotions, ajouter un timestamp pour garantir l'unicité
      const timestamp = Date.now();
      lookupKey = `${stripeProductId}_${comboKey}_promo_${timestamp}`;
      nickname = `${baseOption}_promo_${timestamp}`;
      logs.push(`[SYNC-STRIPE] 🎯 Prix promotionnel: ajout timestamp ${timestamp} pour unicité`);
    } else {
      // Pour les prix normaux, garder la logique existante
      lookupKey = `${stripeProductId}_${comboKey}`;
      nickname = baseOption;
    }

    logs.push(`[SYNC-STRIPE] 🔑 Clés générées:`)
    logs.push(`[SYNC-STRIPE]   - comboKey: ${comboKey}`)
    logs.push(`[SYNC-STRIPE]   - lookupKey: ${lookupKey}`)
    logs.push(`[SYNC-STRIPE]   - nickname: ${nickname}`)
    logs.push(`[SYNC-STRIPE] 💰 Prix: ${price} (${Math.round(price * 100)} centimes)`)

    // Vérifie si un Price existe déjà pour ce lookup_key et ce montant
    logs.push('[SYNC-STRIPE] 🔍 Recherche de Price existant...')
    logs.push(`[SYNC-STRIPE] 📋 Critères: product=${stripeProductId}, lookup_key=${lookupKey}, amount=${Math.round(price * 100)}`)
    
    const prices = await stripe.prices.list({ product: stripeProductId, limit: 100 })
    logs.push(`[SYNC-STRIPE] 📊 Total prices trouvés pour ce produit: ${prices.data.length}`)
    
    // Log de tous les prices existants pour debug
    if (prices.data.length > 0) {
      logs.push(`[SYNC-STRIPE] 📋 Prices existants:`)
      prices.data.forEach((p, idx) => {
        logs.push(`[SYNC-STRIPE]   ${idx + 1}. ${p.id} | ${p.lookup_key} | ${p.unit_amount} | active:${p.active} | nickname:${p.nickname}`)
      })
    }
    
    const alreadyExists = prices.data.find(
      (p) => p.lookup_key === lookupKey && p.unit_amount === Math.round(price * 100) && p.active
    )
    
    logs.push('[SYNC-STRIPE] Recherche Price existant: ' + JSON.stringify({ lookupKey, found: !!alreadyExists, isDiscount }))
    
    if (alreadyExists) {
      logs.push('[SYNC-STRIPE] ✅ Price déjà existant: ' + alreadyExists.id)
      logs.push(`[SYNC-STRIPE] 📋 Détails: ${alreadyExists.lookup_key} | ${alreadyExists.unit_amount} centimes`)
      
      // Enregistrer dans Supabase
      try {
        await supabase.from("product_prices").insert({
          product_id: stripeProductId,
          stripe_price_id: alreadyExists.id,
          lookup_key: alreadyExists.lookup_key,
          variant_label: baseLabel,
          variant_value: baseOption,
          is_discount: isDiscount,
          active: true
        })
        logs.push('[SYNC-STRIPE] ✅ Price enregistré dans Supabase')
      } catch (err) {
        logs.push('[SYNC-STRIPE] ⚠️ Erreur lors de l\'enregistrement dans Supabase: ' + err.message)
      }

      return new Response(
        JSON.stringify({ success: true, priceId: alreadyExists.id, alreadyExists: true, logs }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    // Vérifie si un prix avec ce lookup_key existe déjà globalement (tous produits confondus)
    const conflictingPrices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 5 });

    if (conflictingPrices.data.length > 0) {
      const existing = conflictingPrices.data[0];
      logs.push(`[LOOKUP-KEY] ⚠️ lookup_key "${lookupKey}" déjà utilisé globalement.`);
      logs.push(`[LOOKUP-KEY] Price ID: ${existing.id}, produit: ${existing.product}, montant: ${existing.unit_amount}, actif: ${existing.active}`);

      // Si même produit, même montant, même état → OK
      if (
        existing.product === stripeProductId &&
        existing.unit_amount === Math.round(price * 100) &&
        existing.active
      ) {
        logs.push(`[LOOKUP-KEY] ✅ Même produit et même montant, on le réutilise.`);
        
        // Enregistrer dans Supabase
        try {
          await supabase.from("product_prices").insert({
            product_id: stripeProductId,
            stripe_price_id: existing.id,
            lookup_key: existing.lookup_key,
            variant_label: baseLabel,
            variant_value: baseOption,
            is_discount: isDiscount,
            active: true
          })
          logs.push('[SYNC-STRIPE] ✅ Price enregistré dans Supabase')
        } catch (err) {
          logs.push('[SYNC-STRIPE] ⚠️ Erreur lors de l\'enregistrement dans Supabase: ' + err.message)
        }

        return new Response(
          JSON.stringify({ success: true, priceId: existing.id, logs }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          }
        );
      }

      // Sinon on stoppe
      return new Response(
        JSON.stringify({
          error: `Le lookup_key "${lookupKey}" est déjà utilisé dans un autre produit ou montant.`,
          lookupKey,
          existingPrice: existing,
          logs
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // Crée le Price Stripe
    logs.push(`[SYNC-STRIPE] 🛠️ Création d'un nouveau Price ${isDiscount ? 'promotionnel' : 'de base'}...`)
    logs.push(`[SYNC-STRIPE] 📦 Paramètres de création:`)
    logs.push(`[SYNC-STRIPE]   - unit_amount: ${Math.round(price * 100)}`)
    logs.push(`[SYNC-STRIPE]   - currency: eur`)
    logs.push(`[SYNC-STRIPE]   - product: ${stripeProductId}`)
    logs.push(`[SYNC-STRIPE]   - nickname: ${nickname}`)
    logs.push(`[SYNC-STRIPE]   - lookup_key: ${lookupKey}`)
    logs.push(`[SYNC-STRIPE]   - metadata.is_discount: ${isDiscount ? 'true' : 'false'}`)
    
    const response = await stripe.prices.create({
      unit_amount: Math.round(price * 100),
      currency: 'eur',
      product: stripeProductId,
      nickname: nickname,
      lookup_key: lookupKey,
      metadata: {
        variant_label: baseLabel,
        variant_value: baseOption,
        is_discount: isDiscount ? 'true' : 'false'
      }
    })
    
    logs.push('[SYNC-STRIPE] ✅ Price créé: ' + response.id)
    
    // Enregistrer dans Supabase
    try {
      await supabase.from("product_prices").insert({
        product_id: stripeProductId,
        stripe_price_id: response.id,
        lookup_key: response.lookup_key,
        variant_label: baseLabel,
        variant_value: baseOption,
        is_discount: isDiscount,
        active: true
      })
      logs.push('[SYNC-STRIPE] ✅ Price enregistré dans Supabase')
    } catch (err) {
      logs.push('[SYNC-STRIPE] ⚠️ Erreur lors de l\'enregistrement dans Supabase: ' + err.message)
    }

    logs.push('[SYNC-STRIPE] 📝 Détails du Price: ' + JSON.stringify({
      id: response.id,
      amount: response.unit_amount,
      currency: response.currency,
      nickname: response.nickname,
      lookup_key: response.lookup_key,
      metadata: response.metadata,
      isDiscount: isDiscount,
      active: response.active
    }))

    // Vérification supplémentaire
    if (response.lookup_key !== lookupKey) {
      logs.push(`[SYNC-STRIPE] ⚠️ ATTENTION: lookup_key différent! Attendu: ${lookupKey}, Reçu: ${response.lookup_key}`)
    }
    if (response.unit_amount !== Math.round(price * 100)) {
      logs.push(`[SYNC-STRIPE] ⚠️ ATTENTION: unit_amount différent! Attendu: ${Math.round(price * 100)}, Reçu: ${response.unit_amount}`)
    }

    logs.push(`[SYNC-STRIPE] 🎉 SUCCÈS: Prix ${isDiscount ? 'promotionnel' : 'normal'} créé avec succès!`)

    return new Response(
      JSON.stringify({ success: true, priceId: response.id, logs }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  } catch (err) {
    logs.push('[SYNC-STRIPE] ❌ Erreur Stripe: ' + err.message)
    logs.push('[SYNC-STRIPE] 📚 Stack: ' + (err.stack || 'N/A'))
    console.error('[SYNC-STRIPE] ❌ Erreur Stripe:', err.message)
    return new Response(
      JSON.stringify({ error: err.message || 'Erreur inconnue', logs }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  }
}) 