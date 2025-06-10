import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  category?: string;
}

interface PromoCodeApplication {
  code: string;
  cartItems: CartItem[];
  cartTotal: number;
  userId?: string;
  userEmail?: string;
}

interface PromoCodeResponse {
  valid: boolean;
  discount: number;
  finalTotal: number;
  appliedItems: CartItem[];
  message: string;
  promoCode?: any;
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
    logs.push('[APPLY-PROMO] ❌ Méthode non autorisée')
    return new Response(
      JSON.stringify({ error: 'Méthode non autorisée', logs }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  }

  try {
    const body: PromoCodeApplication = await req.json()
    const { code, cartItems, cartTotal, userId, userEmail } = body

    logs.push('[APPLY-PROMO] Payload reçu: ' + JSON.stringify({ 
      code, 
      itemsCount: cartItems.length, 
      cartTotal,
      userId: userId ? 'présent' : 'absent',
      userEmail: userEmail ? 'présent' : 'absent'
    }))

    if (!code || !cartItems || cartItems.length === 0) {
      logs.push('[APPLY-PROMO] ❌ Paramètres manquants')
      return new Response(
        JSON.stringify({ 
          valid: false,
          discount: 0,
          finalTotal: cartTotal,
          appliedItems: [],
          message: 'Paramètres manquants',
          logs 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    // Rechercher le code promo
    const { data: promoCode, error: fetchError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (fetchError || !promoCode) {
      logs.push('[APPLY-PROMO] ❌ Code promo non trouvé ou inactif')
      return new Response(
        JSON.stringify({ 
          valid: false,
          discount: 0,
          finalTotal: cartTotal,
          appliedItems: [],
          message: 'Code promo invalide ou expiré',
          logs 
        } as PromoCodeResponse),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    logs.push('[APPLY-PROMO] ✅ Code promo trouvé: ' + promoCode.code)

    // Vérifier l'expiration
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      logs.push('[APPLY-PROMO] ❌ Code promo expiré')
      return new Response(
        JSON.stringify({ 
          valid: false,
          discount: 0,
          finalTotal: cartTotal,
          appliedItems: [],
          message: 'Code promo expiré',
          logs 
        } as PromoCodeResponse),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    // Vérifier la limite d'utilisation
    if (promoCode.usage_limit && promoCode.used_count >= promoCode.usage_limit) {
      logs.push('[APPLY-PROMO] ❌ Limite d\'utilisation atteinte')
      return new Response(
        JSON.stringify({ 
          valid: false,
          discount: 0,
          finalTotal: cartTotal,
          appliedItems: [],
          message: 'Code promo épuisé',
          logs 
        } as PromoCodeResponse),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    // Vérifier le montant minimum
    if (promoCode.minimum_amount && cartTotal < promoCode.minimum_amount) {
      logs.push('[APPLY-PROMO] ❌ Montant minimum non atteint')
      return new Response(
        JSON.stringify({ 
          valid: false,
          discount: 0,
          finalTotal: cartTotal,
          appliedItems: [],
          message: `Montant minimum requis: ${promoCode.minimum_amount}€`,
          logs 
        } as PromoCodeResponse),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    // Déterminer les articles éligibles selon le type d'application
    let eligibleItems: CartItem[] = []
    
    switch (promoCode.application_type) {
      case 'all':
        eligibleItems = cartItems
        logs.push('[APPLY-PROMO] 🌐 Application sur tous les produits')
        break
        
      case 'specific_product':
        eligibleItems = cartItems.filter(item => item.id === promoCode.product_id)
        logs.push(`[APPLY-PROMO] 📦 Application sur produit spécifique: ${promoCode.product_id}`)
        break
        
      case 'category':
        eligibleItems = cartItems.filter(item => item.category === promoCode.category_name)
        logs.push(`[APPLY-PROMO] 🏷️ Application sur catégorie: ${promoCode.category_name}`)
        break
        
      default:
        eligibleItems = []
    }

    if (eligibleItems.length === 0) {
      logs.push('[APPLY-PROMO] ❌ Aucun produit éligible dans le panier')
      return new Response(
        JSON.stringify({ 
          valid: false,
          discount: 0,
          finalTotal: cartTotal,
          appliedItems: [],
          message: 'Aucun produit éligible pour ce code promo',
          logs 
        } as PromoCodeResponse),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    // Calculer la réduction
    const eligibleTotal = eligibleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    let discount = 0

    if (promoCode.type === 'percentage') {
      discount = (eligibleTotal * promoCode.value) / 100
    } else if (promoCode.type === 'fixed') {
      discount = Math.min(promoCode.value, eligibleTotal)
    }

    // Appliquer la réduction maximale si définie
    if (promoCode.maximum_discount && discount > promoCode.maximum_discount) {
      discount = promoCode.maximum_discount
      logs.push(`[APPLY-PROMO] 🛡️ Réduction limitée à ${promoCode.maximum_discount}€`)
    }

    // Arrondir la réduction
    discount = Math.round(discount * 100) / 100
    const finalTotal = Math.max(0, cartTotal - discount)

    logs.push(`[APPLY-PROMO] 💰 Réduction calculée: ${discount}€`)
    logs.push(`[APPLY-PROMO] 📊 Total final: ${finalTotal}€`)

    const response: PromoCodeResponse = {
      valid: true,
      discount,
      finalTotal,
      appliedItems: eligibleItems,
      message: `Code ${promoCode.code} appliqué avec succès !`,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        type: promoCode.type,
        value: promoCode.value,
        application_type: promoCode.application_type
      }
    }

    return new Response(
      JSON.stringify({ ...response, logs }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )

  } catch (err) {
    logs.push('[APPLY-PROMO] ❌ Erreur: ' + err.message)
    logs.push('[APPLY-PROMO] 📚 Stack: ' + (err.stack || 'N/A'))
    console.error('[APPLY-PROMO] ❌ Error:', err.message)
    
    return new Response(
      JSON.stringify({ 
        valid: false,
        discount: 0,
        finalTotal: 0,
        appliedItems: [],
        message: 'Erreur serveur lors de l\'application du code promo',
        error: err.message || 'Erreur inconnue', 
        logs 
      } as PromoCodeResponse),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      }
    )
  }
}) 