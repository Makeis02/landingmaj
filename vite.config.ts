import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import sitemap from 'vite-plugin-sitemap';
import { componentTagger } from "lovable-tagger";
import type { ViteDevServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import slugify from 'slugify';

// Plugin personnalisé pour servir l'API mock
const mockApiPlugin = () => ({
  name: 'mock-api',
  configureServer(server: ViteDevServer) {
    server.middlewares.use('/api/shopify/products', async (req, res) => {
      if (req.method === 'GET') {
        try {
          const { GET } = await import('./src/pages/api/shopify/products');
          const response = await GET();
          
          // Copier les headers de la réponse
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          
          // Envoyer le statut et le corps
          res.statusCode = response.status;
          res.end(await response.text());
        } catch (error) {
          console.error('Erreur API mock:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Erreur serveur' }));
        }
      } else {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Méthode non autorisée' }));
      }
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

  // 1. Fetch categories to determine hierarchy
  const { data: allCategories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, slug, parent_id');
  
  let categoryRoutes: string[] = [];
  if (categoriesError) {
    console.error('Sitemap: Error fetching categories', categoriesError);
  } else if (allCategories) {
    // Find all IDs that are used as a parent_id
    const parentIds = new Set(
      allCategories
        .map(cat => cat.parent_id)
        .filter((id): id is string => id !== null)
    );

    // Filter for categories that are parents (i.e., their ID is in the parentIds set)
    const parentCategories = allCategories.filter(cat => parentIds.has(cat.id));
    const excludedCategories = allCategories.filter(cat => !parentIds.has(cat.id));

    console.log(`Sitemap: Including ${parentCategories.length} parent categories.`);
    console.log(`Sitemap: Excluding ${excludedCategories.length} leaf categories.`);

    categoryRoutes = parentCategories.map(cat => `/categories/${cat.slug}`);
  }

  // 2. Fetch products
  const { data: productsData, error: productsError } = await supabase
    .from('editable_content')
    .select('content_key, content')
    .like('content_key', 'product_%_title');
  if (productsError) console.error('Sitemap: Error fetching products', productsError);
  const productRoutes = productsData?.map(item => {
    const id = item.content_key.replace('product_', '').replace('_title', '');
    const title = item.content;
    if (id && title) {
      // Note: On ne peut pas récupérer l'ID produit Stripe ici, donc on utilise l'ID de contenu.
      // Il faudra s'assurer que les pages produits peuvent être résolues avec cet ID.
      // D'après le code, c'est bien `?id=prod_...` qui est utilisé, donc ça devrait marcher.
      return `/produits/${slugify(title, { lower: true })}?id=${id}`;
    }
    return null;
  }).filter((route): route is string => route !== null) || [];
  
  const dynamicRoutes = [...categoryRoutes, ...productRoutes];
  console.log(`Sitemap: Found ${dynamicRoutes.length} dynamic routes to generate.`);

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: mode === 'production',
        }
      }
    },
    plugins: [
      react(),
      sitemap({ 
        hostname: 'https://aqua-reve.com',
        dynamicRoutes
      }),
      mode === 'development' && componentTagger(),
      mockApiPlugin(),
    ].filter(Boolean),
    define: {
      'process.env': env
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
});
