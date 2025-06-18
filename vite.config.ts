import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { ViteDevServer } from 'vite';

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
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: process.env.NODE_ENV === 'production'
          ? 'https://landingmaj-production.up.railway.app'
          : 'http://localhost:3000',
        changeOrigin: true,
        secure: process.env.NODE_ENV === 'production',
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    mockApiPlugin(),
  ].filter(Boolean),
  define: {
    'process.env': process.env
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
