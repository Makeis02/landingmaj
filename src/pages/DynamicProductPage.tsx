import { useParams, useSearchParams } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, ComponentType } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEditStore } from "@/stores/useEditStore";
import FloatingHeader from "@/components/admin/FloatingHeader";

// Définir le type pour les props des pages produit
interface ProductPageProps {
  categoryParam: string | null;
}

const DynamicProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('categorie');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [Component, setComponent] = useState<React.LazyExoticComponent<ComponentType<ProductPageProps>> | null>(null);
  const { toast } = useToast();
  const { isEditMode } = useEditStore();

  useEffect(() => {
    if (!slug) {
      setError("Slug non défini");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setComponent(null);

    import(/* @vite-ignore */ `../pages/products/${slug}`)
      .then((module) => {
        setComponent(lazy(() => Promise.resolve({ default: module.default })));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur de chargement de la page produit:", err);
        setError(`La page produit "${slug}" n'existe pas ou ne peut pas être chargée.`);
        setLoading(false);
        
        // Notification d'erreur
        toast({
          variant: "destructive",
          title: "Erreur de chargement",
          description: `La page produit "${slug}" n'a pas pu être chargée.`
        });
      });
  }, [slug, toast]);

  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <Header />
        <FloatingHeader />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-blue-500" />
            <h2 className="text-xl font-semibold">Chargement de la page produit...</h2>
          </div>
        </div>
        <Footer />
      </div>
    }>
      {error ? (
        <div className="min-h-screen flex flex-col">
          <Header />
          <FloatingHeader />
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6 bg-red-50 rounded-lg">
              <h2 className="text-xl font-semibold text-red-600 mb-4">
                Erreur de chargement
              </h2>
              <p className="mb-4">{error}</p>
              <p className="text-sm text-gray-600">
                Veuillez vérifier l'URL ou contacter l'administrateur du site.
              </p>
            </div>
          </div>
          <Footer />
        </div>
      ) : Component ? (
        <Component categoryParam={categoryParam} />
      ) : null}
    </Suspense>
  );
};

export default DynamicProductPage; 