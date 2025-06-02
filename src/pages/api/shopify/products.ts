// Mock de l'API Shopify pour les produits
export async function GET() {
  // Simuler un délai réseau
  await new Promise(resolve => setTimeout(resolve, 500));

  return new Response(
    JSON.stringify({
      products: [
        {
          id: "9301297627401",
          title: "Ampoules - Éclairage de croissance",
          price: 49.99,
          image: "https://cdn.shopify.com/s/files/1/0719/1530/7273/files/CopiedeBlueWhiteModernElectronicProductListingAmazonProductImage_16.png?v=1727764055",
          stock: 42,
          description: "Ampoules LED spéciales pour la croissance des plantes aquatiques. Spectre optimisé pour la photosynthèse.",
          brand: "AquaTech",
          reference: "LED-GROW-01",
          specifications: [
            { name: "Puissance", value: "15W" },
            { name: "Spectre", value: "Rouge + Bleu" },
            { name: "Durée de vie", value: "50,000 heures" }
          ]
        },
        {
          id: "9301297627402",
          title: "Filtre Externe Premium",
          price: 129.99,
          image: "https://cdn.shopify.com/s/files/1/0719/1530/7273/files/CopiedeBlueWhiteModernElectronicProductListingAmazonProductImage_17.png?v=1727764055",
          stock: 15,
          description: "Filtre externe haute performance pour aquarium jusqu'à 300L. Système multi-chambres.",
          brand: "AquaTech",
          reference: "FILT-EXT-300",
          specifications: [
            { name: "Débit", value: "1200L/h" },
            { name: "Volume", value: "300L max" },
            { name: "Pompe", value: "Silencieuse" }
          ]
        },
        {
          id: "9301297627403",
          title: "Nourriture Premium Poissons",
          price: 24.99,
          image: "https://cdn.shopify.com/s/files/1/0719/1530/7273/files/CopiedeBlueWhiteModernElectronicProductListingAmazonProductImage_18.png?v=1727764055",
          stock: 50,
          description: "Nourriture complète pour poissons tropicaux. Riche en protéines et vitamines.",
          brand: "AquaTech",
          reference: "FOOD-PREMIUM",
          specifications: [
            { name: "Poids", value: "200g" },
            { name: "Type", value: "Flocons" },
            { name: "Âge", value: "Tous âges" }
          ]
        }
      ]
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
} 