import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';
import slugify from 'slugify';

interface CheckPagesRequest {
  productIds: string[];
  titles?: Record<string, string>;
}

interface ProductPageStatus {
  exists: boolean;
  slug?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Méthode non autorisée' });
  }

  try {
    const { productIds, titles = {} } = req.body as CheckPagesRequest;
    const pagesDir = path.join(process.cwd(), 'src', 'pages', 'products');
    
    // Vérifier si le dossier existe
    if (!await fs.pathExists(pagesDir)) {
      return res.status(200).json({ success: true, exists: {} });
    }
    
    // Obtenir la liste des fichiers dans le répertoire
    const files = await fs.readdir(pagesDir);
    
    // Créer un objet pour stocker les résultats
    const results: Record<string, ProductPageStatus> = {};
    
    // Vérifier chaque ID de produit
    for (const productId of productIds) {
      const title = titles[productId];
      
      if (title) {
        // Si nous avons le titre, nous pouvons vérifier directement le fichier correspondant
        const slug = slugify(title, { lower: true });
        const fileExists = files.includes(`${slug}.tsx`);
        
        results[productId] = {
          exists: fileExists,
          slug: fileExists ? slug : undefined
        };
      } else {
        // Sinon, nous devons chercher un fichier qui contient l'ID du produit
        let foundSlug: string | undefined;
        
        for (const file of files) {
          // Vérifier si ce fichier contient l'ID du produit
          const filePath = path.join(pagesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          
          if (content.includes(`id: "${productId}"`)) {
            foundSlug = file.replace('.tsx', '');
            break;
          }
        }
        
        results[productId] = {
          exists: !!foundSlug,
          slug: foundSlug
        };
      }
    }
    
    return res.status(200).json({ success: true, exists: results });
  } catch (error) {
    console.error('Erreur lors de la vérification des pages produit:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la vérification des pages produit' });
  }
} 