import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';
import slugify from 'slugify';

interface ProductPageRequest {
  productId: string;
  title: string;
  description: string;
  price: number;
  image: string;
  brandName: string;
  brandId: string | null;
  categories: Array<{ id: string; name: string }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Méthode non autorisée' });
  }

  try {
    const params = req.body as ProductPageRequest;
    const slug = slugify(params.title, { lower: true });
    const pagesDir = path.join(process.cwd(), 'src', 'pages', 'products');
    const pagePath = path.join(pagesDir, `${slug}.tsx`);
    const modelPath = path.join(process.cwd(), 'src', 'pages', 'Product', 'Modele.tsx');

    // Vérifier si le dossier existe, sinon le créer
    await fs.ensureDir(pagesDir);

    // Lire le contenu du modèle
    const modelContent = await fs.readFile(modelPath, 'utf-8');

    // Remplacer les informations du produit dans le modèle
    let pageContent = modelContent;

    // Modifier le contenu pour remplacer les valeurs du produit démo
    pageContent = pageContent.replace(
      /const demoProduct = {[\s\S]*?};/,
      `const demoProduct = {
  id: "${params.productId}",
  title: "${params.title.replace(/"/g, '\\"')}",
  brand: "${params.brandName}",
  reference: "${params.productId}",
  description: "${(params.description || '').replace(/"/g, '\\"')}",
  price: ${params.price},
  image: "${params.image || '/placeholder.svg'}",
  badges: ${JSON.stringify(params.categories.map(cat => cat.name))},
  specifications: [
    { name: "Référence", value: "${params.productId}" },
    { name: "Marque", value: "${params.brandName}" }
  ],
  category: "${params.categories.length > 0 ? params.categories[0].id : ''}",
  categoryName: "${params.categories.length > 0 ? params.categories[0].name : ''}"
};`
    );

    // Modifier le nom du composant pour correspondre au nom de fichier
    const componentName = `Product${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())}`;
    pageContent = pageContent.replace('const ProductPage = () => {', `const ${componentName} = () => {`);
    pageContent = pageContent.replace('export default ProductPage;', `export default ${componentName};`);

    // Écrire le fichier
    await fs.writeFile(pagePath, pageContent);

    // Lire App.tsx pour ajouter la route
    const appTsxPath = path.join(process.cwd(), 'src', 'App.tsx');
    const appContent = await fs.readFile(appTsxPath, 'utf-8');

    // Vérifier si la route existe déjà
    if (appContent.includes(`path="/produits/${slug}"`)) {
      return res.status(200).json({ success: true, message: 'La page produit existe déjà', slug });
    }

    // Ajouter l'import du composant
    let updatedContent = appContent;
    const importStatement = `import ${componentName} from "@/pages/products/${slug}";`;

    // Trouver le dernier import
    const lastImportIndex = appContent.lastIndexOf('import ');
    const lastImportEndIndex = appContent.indexOf('\n', lastImportIndex);
    updatedContent = updatedContent.slice(0, lastImportEndIndex + 1) + 
                      importStatement + '\n' + 
                      updatedContent.slice(lastImportEndIndex + 1);

    // Ajouter la route
    const routesEndIndex = updatedContent.lastIndexOf("</Routes>");
    const beforeRoutesEnd = updatedContent.substring(0, routesEndIndex);
    const afterRoutesEnd = updatedContent.substring(routesEndIndex);

    const newRoute = `          <Route path="/produits/${slug}" element={<${componentName} />} />\n          `;

    updatedContent = beforeRoutesEnd + newRoute + afterRoutesEnd;

    // Écrire le fichier mis à jour
    await fs.writeFile(appTsxPath, updatedContent);

    return res.status(200).json({ success: true, message: 'Page produit créée avec succès', slug });
  } catch (error) {
    console.error('Erreur lors de la création de la page produit:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la création de la page produit' });
  }
} 