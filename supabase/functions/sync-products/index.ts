import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ShopifyProduct {
  id: string;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  variants: any[];
  tags: string;
  images: { src: string }[];
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Pagination Stripe pour récupérer tous les produits
    let allProducts = [];
    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
      const response = await stripe.products.list({
        active: true,
        expand: ['data.default_price'],
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {})
      });
      allProducts = allProducts.concat(response.data);
      hasMore = response.has_more;
      if (hasMore) startingAfter = response.data[response.data.length - 1].id;
    }
    const products = { data: allProducts };

    const logs: string[] = []
    logs.push(`📦 Synchronisation de ${products.data.length} produits`)

    for (const product of products.data) {
      try {
        // Récupérer les prix (variantes) du produit
        const prices = await stripe.prices.list({
          product: product.id,
          active: true
        })

        // Construire l'objet variantStocks
        const variantStocks: Record<string, number> = {}
        const pricesData = prices.data.map(price => {
          // S'assurer que le lookup_key est bien formaté
          const lookupKey = price.lookup_key
          if (lookupKey && price.metadata?.stock) {
            const stock = Number(price.metadata.stock)
            if (!isNaN(stock)) {
              variantStocks[lookupKey] = stock
              logs.push(`✅ Stock trouvé pour ${lookupKey}: ${stock}`)
            } else {
              logs.push(`⚠️ Stock invalide pour ${lookupKey}: ${price.metadata.stock}`)
            }
          } else {
            logs.push(`⚠️ Pas de stock pour ${lookupKey || 'clé manquante'}`)
          }

          return {
            id: price.id,
            lookup_key: lookupKey,
            stock: price.metadata?.stock ? Number(price.metadata.stock) : null
          }
        })

        // Vérifier le stock général du produit
        const generalStock = Number(product.metadata?.stock)
        if (isNaN(generalStock)) {
          logs.push(`⚠️ Stock général invalide pour ${product.id}: ${product.metadata?.stock}`)
        } else {
          logs.push(`✅ Stock général pour ${product.id}: ${generalStock}`)
      }

        // Mettre à jour le produit dans Supabase
      const { error } = await supabase
        .from('products')
          .upsert({
            id: product.id,
            title: product.name,
            price: product.default_price?.unit_amount ? product.default_price.unit_amount / 100 : 0,
            image: product.images[0] || '',
            description: product.description || '',
            brand: product.metadata?.brand || '',
            reference: product.metadata?.reference || '',
            metadata: product.metadata,
            variantStocks,
            stock: generalStock || 0,
            prices: pricesData,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })

      if (error) {
          logs.push(`❌ Erreur Supabase pour ${product.id}: ${error.message}`)
        } else {
          logs.push(`✅ Produit ${product.id} synchronisé`)
        }

      } catch (error) {
        logs.push(`❌ Erreur sur le produit ${product.id}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        logs
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
