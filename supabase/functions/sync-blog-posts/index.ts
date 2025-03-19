
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ShopifyArticle {
  id: string;
  title: string;
  body_html: string;
  excerpt: string;
  image: { src: string } | null;
  published_at: string;
  tags: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔄 Début de la synchronisation des articles')
    const shopifyDomain = 'e77919-2.myshopify.com'
    const adminAccessToken = Deno.env.get('SHOPIFY_ADMIN_ACCESS_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!adminAccessToken || !supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variables d\'environnement manquantes')
      throw new Error('Missing environment variables')
    }

    // Initialiser le client Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('✅ Client Supabase initialisé')

    // Récupérer les articles depuis Shopify
    console.log('🔍 Récupération des articles depuis Shopify...')
    const response = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/articles.json`,
      {
        headers: {
          'X-Shopify-Access-Token': adminAccessToken,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error('❌ Erreur API Shopify:', response.statusText)
      throw new Error(`Shopify API error: ${response.statusText}`)
    }

    const { articles } = await response.json()
    console.log(`✅ ${articles.length} articles récupérés depuis Shopify`)

    // Pour chaque article
    for (const article of articles as ShopifyArticle[]) {
      console.log(`📝 Traitement de l'article: ${article.title}`)
      const articleData = {
        shopify_id: article.id,
        title: article.title,
        content: article.body_html,
        excerpt: article.excerpt,
        image_url: article.image?.src || null,
        published_at: article.published_at,
        tag: article.tags ? article.tags.split(',')[0] : null,
      }

      // Upsert l'article dans Supabase
      const { error } = await supabase
        .from('blog_posts')
        .upsert(
          articleData,
          { onConflict: 'shopify_id' }
        )

      if (error) {
        console.error('❌ Erreur lors de l\'upsert de l\'article:', error)
        throw error
      }
      console.log(`✅ Article "${article.title}" synchronisé avec succès`)
    }

    console.log('🎉 Synchronisation terminée avec succès')
    return new Response(
      JSON.stringify({ success: true, message: `Synchronized ${articles.length} articles` }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
