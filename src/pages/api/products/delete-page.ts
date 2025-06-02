import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';

interface DeleteProductRequest {
  productId: string;
  slug: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Méthode non autorisée' });
  }

  try {
    const { productId, slug } = req.body as DeleteProductRequest;
    const pagePath = path.join(process.cwd(), 'src', 'pages', 'products', `${slug}.tsx`);

    // Vérifier si la page existe
    if (!await fs.pathExists(pagePath)) {
      return res.status(404).json({ success: false, message: 'La page produit n\'existe pas' });
    }

    // Supprimer le fichier
    await fs.remove(pagePath);

    // Mettre à jour App.tsx pour supprimer la route
    const appTsxPath = path.join(process.cwd(), 'src', 'App.tsx');
    const appContent = await fs.readFile(appTsxPath, 'utf-8');

    // Supprimer l'import du composant
    const componentName = `Product${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`;
    const importRegex = new RegExp(`import ${componentName} from "@/pages/products/${slug}";\\n`, 'g');
    let updatedContent = appContent.replace(importRegex, '');

    // Supprimer la route
    const routeRegex = new RegExp(`\\s*<Route path="/produits/${slug}" element={<${componentName} />} />\\n`, 'g');
    updatedContent = updatedContent.replace(routeRegex, '');

    // Écrire le fichier mis à jour
    await fs.writeFile(appTsxPath, updatedContent);

    return res.status(200).json({ success: true, message: 'Page produit supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la page produit:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la suppression de la page produit' });
  }
} 