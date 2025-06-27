import { Helmet, HelmetProvider } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "product";
  product?: {
    name: string;
    price: string;
    description: string;
    image: string;
    sku?: string;
    brand?: string;
    availability?: "InStock" | "OutOfStock" | "PreOrder";
    review?: {
      ratingValue: string;
      reviewCount: string;
    };
  };
}

const SEO = ({ 
  title, 
  description, 
  image = "/og-image.png",
  url = "https://aqua-reve.com",
  type = "website",
  product
}: SEOProps) => {
  const siteTitle = "Aqua Rêve - Votre spécialiste en aquariophilie";
  const fullTitle = `${title} | ${siteTitle}`;
  const fullDescription = description?.substring(0, 160) || "Découvrez nos produits pour aquarium d'eau douce et d'eau de mer.";
  const fullImage = image && image.startsWith('http') ? image : `https://aqua-reve.com${image}`;
  
  const productSchema = product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "image": product.image,
    "sku": product.sku,
    "brand": {
      "@type": "Brand",
      "name": product.brand || "Marque inconnue"
    },
    ...(product.review && product.review.reviewCount !== "0" && {
      "review": {
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": product.review.ratingValue,
          "bestRating": "5"
        },
        "author": {
          "@type": "Person",
          "name": "Clients Aqua Rêve"
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": product.review.ratingValue,
        "reviewCount": product.review.reviewCount
      }
    }),
    "offers": {
      "@type": "Offer",
      "url": url,
      "price": product.price,
      "priceCurrency": "EUR",
      "availability": `https://schema.org/${product.availability || 'InStock'}`
    }
  } : null;

  return (
    <HelmetProvider>
    <Helmet>
      {/* Balises de base */}
      <title>{fullTitle}</title>
        <meta name="description" content={fullDescription} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={fullDescription} />
        <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
        <meta property="og:site_name" content={siteTitle} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={fullDescription} />
        <meta name="twitter:image" content={fullImage} />
      
      {/* Schema.org */}
      {productSchema && (
        <script type="application/ld+json">
          {JSON.stringify(productSchema)}
        </script>
      )}
      
      {/* Autres métadonnées importantes */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0074b3" />
      <link rel="canonical" href={url} />
    </Helmet>
    </HelmetProvider>
  );
};

export default SEO; 