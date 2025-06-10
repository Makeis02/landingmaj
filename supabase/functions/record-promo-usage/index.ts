import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface PromoUsageRecord {
  promoCodeId: string;
  orderId: string;
  userId?: string;
  userEmail?: string;
  discountAmount: number;
  orderTotal: number;
  appliedToProducts: any[];
}

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const logs: string[] = []

  // Vérifier la méthode
  if (req.method !== 'POST') {
    logs.push('[RECORD-PROMO] ❌ Méthode non autorisée')
    return new Response(
      JSON.stringify({ error: 'Méthode non autorisée', logs }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  }

  try {
    const body: PromoUsageRecord = await req.json()
    const { promoCodeId, orderId, userId, userEmail, discountAmount, orderTotal, appliedToProducts } = body

    logs.push('[RECORD-PROMO] Payload reçu: ' + JSON.stringify({ 
      promoCodeId, 
      orderId, 
      userId: userId ? 'présent' : 'absent',
      userEmail: userEmail ? 'présent' : 'absent',
      discountAmount,
      orderTotal,
      productsCount: appliedToProducts.length
    }))

    if (!promoCodeId || !orderId || discountAmount === undefined || orderTotal === undefined) {
      logs.push('[RECORD-PROMO] ❌ Paramètres manquants')
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants', logs }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    // Vérifier que le code promo existe toujours
    const { data: promoCode, error: fetchError } = await supabase
      .from('promo_codes')
      .select('code, usage_limit, used_count')
      .eq('id', promoCodeId)
      .single()

    if (fetchError || !promoCode) {
      logs.push('[RECORD-PROMO] ❌ Code promo non trouvé')
      return new Response(
        JSON.stringify({ error: 'Code promo non trouvé', logs }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    logs.push('[RECORD-PROMO] ✅ Code promo validé: ' + promoCode.code)

    // Vérifier si l'utilisation a déjà été enregistrée pour cette commande
    const { data: existingUsage, error: existingError } = await supabase
      .from('promo_code_usages')
      .select('id')
      .eq('promo_code_id', promoCodeId)
      .eq('order_id', orderId)
      .single()

    if (existingUsage) {
      logs.push('[RECORD-PROMO] ⚠️ Utilisation déjà enregistrée pour cette commande')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Utilisation déjà enregistrée',
          logs 
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    // Enregistrer l'utilisation du code promo
    const { data: usage, error: insertError } = await supabase
      .from('promo_code_usages')
      .insert({
        promo_code_id: promoCodeId,
        order_id: orderId,
        user_id: userId || null,
        user_email: userEmail || null,
        discount_amount: discountAmount,
        order_total: orderTotal,
        applied_to_products: appliedToProducts
      })
      .select()
      .single()

    if (insertError) {
      logs.push('[RECORD-PROMO] ❌ Erreur lors de l\'insertion: ' + insertError.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'enregistrement', logs }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    logs.push('[RECORD-PROMO] ✅ Utilisation enregistrée avec succès')
    logs.push(`[RECORD-PROMO] 📋 ID utilisation: ${usage.id}`)
    
    // Le trigger increment_usage_count se charge automatiquement d'incrémenter used_count

    return new Response(
      JSON.stringify({ 
        success: true, 
        usageId: usage.id,
        message: 'Utilisation du code promo enregistrée avec succès',
        logs 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )

  } catch (err) {
    logs.push('[RECORD-PROMO] ❌ Erreur: ' + err.message)
    logs.push('[RECORD-PROMO] 📚 Stack: ' + (err.stack || 'N/A'))
    console.error('[RECORD-PROMO] ❌ Error:', err.message)
    
    return new Response(
      JSON.stringify({ 
        error: err.message || 'Erreur inconnue', 
        logs 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  }
}) 