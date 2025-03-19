
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const shopifyDomain = 'e77919-2.myshopify.com'
    const adminAccessToken = Deno.env.get('SHOPIFY_ADMIN_ACCESS_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!adminAccessToken || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables')
    }

    // Initialiser le client Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Récupérer les produits depuis Shopify
    const response = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/products.json`,
      {
        headers: {
          'X-Shopify-Access-Token': adminAccessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`)
    }

    const { products } = await response.json()

    // Pour chaque produit
    for (const product of products as ShopifyProduct[]) {
      const productData = {
        shopify_id: product.id,
        title: product.title,
        description: product.body_html,
        price: product.variants[0]?.price || null,
        compare_at_price: product.variants[0]?.compare_at_price || null,
        image_url: product.images[0]?.src || null,
        handle: product.handle,
        vendor: product.vendor,
        product_type: product.product_type,
        tags: product.tags ? product.tags.split(',') : [],
        variants: JSON.stringify(product.variants),
      }

      // Upsert le produit dans Supabase
      const { error } = await supabase
        .from('products')
        .upsert(
          productData,
          { onConflict: 'shopify_id' }
        )

      if (error) {
        console.error('Error upserting product:', error)
        throw error
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Synchronized ${products.length} products` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
