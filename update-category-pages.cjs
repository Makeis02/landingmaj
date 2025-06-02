const fs = require('fs');
const path = require('path');

// Fonction pour lire le contenu d'un fichier
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// Fonction pour écrire dans un fichier
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

// Fonction pour mettre à jour une page catégorie
function updateCategoryPage(filePath) {
  console.log(`Mise à jour de ${filePath}...`);
  
  let content = readFile(filePath);
  
  // Ajouter les imports nécessaires s'ils n'existent pas
  if (!content.includes('useCartStore')) {
    content = content.replace(
      /import { useState, useEffect } from "react";/,
      `import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/useCartStore";
import { useToast } from "@/components/ui/use-toast";`
    );
  }
  
  // Ajouter le hook useToast s'il n'existe pas
  if (!content.includes('const { toast } = useToast();')) {
    content = content.replace(
      /const CategoryPage = () => {/,
      `const CategoryPage = () => {
  const { toast } = useToast();
  const { addItem } = useCartStore();`
    );
  }
  
  // Ajouter la fonction handleAddToCart
  if (!content.includes('handleAddToCart')) {
    const handleAddToCart = `
  const handleAddToCart = async (product) => {
    // Récupérer les informations sur les variantes sélectionnées
    let variant = null;
    let stripePriceId = null;
    let stripeDiscountPriceId = null;
    let finalPrice = product.price;
    let originalPrice = undefined;
    let discountPercentage = undefined;
    let hasDiscountApplied = false;
    
    // Vérifier s'il y a une réduction
    const { getDiscountedPrice } = useCartStore.getState();
    const priceInfo = await getDiscountedPrice(product.id);
    
    if (priceInfo) {
      finalPrice = priceInfo.price;
      if (priceInfo.discount_percentage) {
        originalPrice = priceInfo.original_price;
        discountPercentage = priceInfo.discount_percentage;
        stripeDiscountPriceId = priceInfo.stripe_discount_price_id;
        hasDiscountApplied = true;
      }
    }
    
    // Récupérer le stripe_price_id pour le produit
    const { data: priceIdData } = await supabase
      .from('editable_content')
      .select('content')
      .eq('content_key', \`product_\${product.id}_stripe_price_id\`)
      .single();
    if (priceIdData?.content) {
      stripePriceId = priceIdData.content;
    }
    
    // Vérifier le stock
    const { data: stockData } = await supabase
      .from('editable_content')
      .select('content')
      .eq('content_key', \`product_\${product.id}_stock\`)
      .single();
    
    const stock = stockData ? parseInt(stockData.content) : 0;
    if (stock === 0) {
      toast({
        variant: "destructive",
        title: "Rupture de stock",
        description: "Ce produit est en rupture de stock."
      });
      return;
    }
    
    // Décrémenter le stock côté Supabase
    fetch('/api/stock/decrement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        quantity: 1
      })
    }).then(() => {
      addItem({
        id: product.id,
        price: finalPrice,
        title: product.title,
        image_url: product.image,
        quantity: 1,
        variant: variant,
        stripe_price_id: stripePriceId,
        stripe_discount_price_id: stripeDiscountPriceId,
        original_price: originalPrice,
        discount_percentage: discountPercentage,
        has_discount: hasDiscountApplied
      });

      toast({
        title: "Produit ajouté au panier",
        description: hasDiscountApplied 
          ? \`\${product.title} a été ajouté à votre panier avec \${discountPercentage}% de réduction !\`
          : \`\${product.title} a été ajouté à votre panier.\`,
      });
    }).catch(error => {
      console.error("Erreur lors de la mise à jour du stock:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour le stock, veuillez réessayer."
      });
    });
  };`;
    
    content = content.replace(
      /const CategoryPage = \(\) => {/,
      `const CategoryPage = () => {${handleAddToCart}`
    );
  }
  
  // Mettre à jour le bouton d'ajout au panier
  content = content.replace(
    /<Button[^>]*onClick=\{\(\) => addItem\([^}]*\)\}[^>]*>/g,
    `<Button 
      onClick={() => handleAddToCart(product)}
      className="w-full bg-[#0074b3] text-white hover:bg-[#005a8c] transition-colors"
    >`
  );
  
  writeFile(filePath, content);
  console.log(`✅ ${filePath} mis à jour avec succès`);
}

// Dossier contenant les pages catégories
const categoriesDir = path.join(__dirname, 'src', 'pages', 'categories');

// Lire tous les fichiers .tsx du dossier
const files = fs.readdirSync(categoriesDir)
  .filter(file => file.endsWith('.tsx') && !file.includes('.backup') && !file.includes('.debug'));

// Mettre à jour chaque fichier
files.forEach(file => {
  const filePath = path.join(categoriesDir, file);
  updateCategoryPage(filePath);
});

console.log('🎉 Mise à jour terminée !'); 