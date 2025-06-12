import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEditStore } from '@/stores/useEditStore';
import { EditableImage } from '@/components/EditableImage';
import { EditableText } from "@/components/EditableText";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  order: number;
  is_active: boolean;
  redirect_url?: string;
}

interface UniverseCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  image: string;
  redirectUrl: string;
}

const DynamicUniverseGrid = () => {
  const [universes, setUniverses] = useState<UniverseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const itemsPerSlide = 4; // Nombre de catégories visibles à la fois
  const { isEditMode } = useEditStore();
  const [customImages, setCustomImages] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  console.log("📸 DynamicUniverseGrid: Rendu du composant...");

  // Mapping des icônes et couleurs par type de catégorie
  const getCategoryStyle = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    
    if (name.includes('eau douce') || name.includes('eaudouce')) {
      return {
        icon: '🐠',
        color: 'bg-green-500',
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
      };
    } else if (name.includes('eau de mer') || name.includes('eaudemer') || name.includes('marin')) {
      return {
        icon: '🐡',
        color: 'bg-blue-500',
        image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
      };
    } else if (name.includes('bassin')) {
      return {
        icon: '🦆',
        color: 'bg-cyan-500',
        image: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
      };
    } else if (name.includes('universel') || name.includes('général')) {
      return {
        icon: '⚡',
        color: 'bg-purple-500',
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
      };
    } else if (name.includes('décoration') || name.includes('decoration')) {
      return {
        icon: '🌿',
        color: 'bg-emerald-500',
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
      };
    } else if (name.includes('entretien') || name.includes('maintenance')) {
      return {
        icon: '🔧',
        color: 'bg-orange-500',
        image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
      };
    } else if (name.includes('alimentation') || name.includes('nourriture')) {
      return {
        icon: '🐟',
        color: 'bg-yellow-500',
        image: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
      };
    } else if (name.includes('éclairage') || name.includes('eclairage') || name.includes('lighting')) {
      return {
        icon: '💡',
        color: 'bg-amber-500',
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
      };
    } else {
      return {
        icon: '🌊',
        color: 'bg-blue-500',
        image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
      };
    }
  };

  const generateDescription = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    
    if (name.includes('eau douce') && name.includes('décoration')) {
      return 'Décorations et accessoires pour aquariums d\'eau douce';
    } else if (name.includes('eau de mer') && name.includes('décoration')) {
      return 'Décorations et accessoires pour aquariums marins';
    } else if (name.includes('eau douce') && name.includes('entretien')) {
      return 'Produits d\'entretien pour aquariums d\'eau douce';
    } else if (name.includes('eau de mer') && name.includes('entretien')) {
      return 'Produits d\'entretien pour aquariums marins';
    } else if (name.includes('bassin')) {
      return 'Équipements et accessoires pour bassins extérieurs';
    } else if (name.includes('universel')) {
      return 'Produits compatibles avec tous types d\'aquariums';
    } else if (name.includes('décoration')) {
      return 'Décorations et accessoires pour aquariums';
    } else if (name.includes('entretien')) {
      return 'Produits et équipements d\'entretien';
    } else if (name.includes('alimentation')) {
      return 'Nourriture et compléments pour poissons';
    } else if (name.includes('éclairage')) {
      return 'Systèmes d\'éclairage pour aquariums';
    } else {
      return 'Découvrez notre gamme de produits aquatiques';
    }
  };
  
  // Nouvelle fonction pour générer l'URL de redirection intelligente
  const generateRedirectUrl = (categoryName: string, categorySlug: string) => {
    const name = categoryName.toLowerCase();
    
    // Mapping intelligent vers les catégories parents qui existent réellement
    if (name.includes('décoration') || name.includes('decoration')) {
      // Pour "Décoration", rediriger vers "Décoration Eau Douce" par défaut
      return '/categories/eaudoucedecoration';
    } else if (name.includes('entretien')) {
      // Pour "Entretien", rediriger vers "Entretien Eau Douce" par défaut
      return '/categories/eaudouceentretien';
    } else if (name.includes('éclairage') || name.includes('eclairage')) {
      // Pour "Éclairage", rediriger vers "Éclairage Eau Douce" par défaut
      return '/categories/eaudouceeclairage';
    } else if (name.includes('alimentation') || name.includes('nourriture')) {
      // Pour "Alimentation", rediriger vers "Nourriture Eau Douce" par défaut
      return '/categories/eaudoucenourriture';
    } else if (name.includes('pompe')) {
      // Pour "Pompes", rediriger vers "Pompes Eau Douce" par défaut
      return '/categories/eaudoucepompes';
    } else if (name.includes('universel')) {
      // Pour "Universel", rediriger vers "Décoration Universelle"
      return '/categories/universelsdeco';
    } else if (name.includes('bassin')) {
      // Pour "Bassin", garder la redirection vers bassin si elle existe
      return `/categories/${categorySlug}`;
    } else if (name.includes('eau douce')) {
      // Pour les catégories spécifiques eau douce, garder leur slug
      return `/categories/${categorySlug}`;
    } else if (name.includes('eau de mer') || name.includes('marin')) {
      // Pour les catégories spécifiques eau de mer, garder leur slug
      return `/categories/${categorySlug}`;
    } else {
      // Par défaut, utiliser le slug de la catégorie
      return `/categories/${categorySlug}`;
    }
  };

  // Fonctions de navigation
  const nextSlide = () => {
    setCurrentSlide((prev) => 
      prev + itemsPerSlide >= universes.length ? 0 : prev + itemsPerSlide
    );
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => 
      prev === 0 ? Math.max(0, universes.length - itemsPerSlide) : prev - itemsPerSlide
    );
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      
      // Récupérer toutes les catégories actives
      const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('order', { ascending: true });

      if (error) throw error;

      // Filtrer les catégories parentes (celles qui n'ont pas de parent_id)
      const parentCategories = categories?.filter(cat => cat.parent_id === null) || [];

      // Transformer en format UniverseCategory
      const transformedUniverses: UniverseCategory[] = parentCategories.map(category => {
        const style = getCategoryStyle(category.name);
        
        return {
          id: category.id,
          title: category.name,
          description: generateDescription(category.name),
          icon: style.icon,
          color: style.color,
          image: style.image,
          redirectUrl: category.redirect_url || generateRedirectUrl(category.name, category.slug)
        };
      });

      setUniverses(transformedUniverses);

    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      // En cas d'erreur, afficher des catégories par défaut
      setUniverses([
        {
          id: 'default-1',
          title: 'Eau Douce',
          description: 'Aquariums tropicaux et d\'eau douce',
          icon: '🐠',
          color: 'bg-green-500',
          image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
          redirectUrl: '/categories'
        },
        {
          id: 'default-2',
          title: 'Eau de Mer',
          description: 'Aquariums marins et récifaux',
          icon: '🐡',
          color: 'bg-blue-500',
          image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
          redirectUrl: '/categories'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les images custom uploadées depuis Supabase
  useEffect(() => {
    const fetchCustomImages = async () => {
      if (!universes.length) return;
      const keys = universes.map(u => `universe_card_${u.id}_image`);
      const { data, error } = await supabase
        .from('site_content_images')
        .select('key_name, image_url')
        .in('key_name', keys);
      if (data) {
        const imgMap: Record<string, string> = {};
        data.forEach(item => {
          const id = item.key_name.replace('universe_card_', '').replace('_image', '');
          imgMap[id] = item.image_url;
        });
        setCustomImages(imgMap);
      }
    };
    fetchCustomImages();
  }, [universes]);

  // Charger les univers depuis la base de données
  const { data: fetchedUniverses, error: queryError } = useQuery<UniverseCategory[]>({
    queryKey: ["universes"],
    queryFn: async () => {
      console.log("📸 DynamicUniverseGrid: 🔍 Début du fetch des univers...");
      const { data, error } = await supabase
        .from("universes")
        .select("*")
        .order("category_order", { ascending: true });

      if (error) {
        console.error("📸 DynamicUniverseGrid: ❌ Erreur lors du fetch des univers:", error);
        throw error;
      }
      console.log("📸 DynamicUniverseGrid: ✅ Univers récupérés:", data);
      return data || [];
    },
  });

  // Charger les images customisées depuis site_content_images
  const { data: customImagesContent } = useQuery({
    queryKey: ["universe-images", fetchedUniverses?.map(u => u.id)],
    enabled: !!fetchedUniverses?.length,
    queryFn: async () => {
      if (!fetchedUniverses || fetchedUniverses.length === 0) {
        console.log("📸 DynamicUniverseGrid: ⏩ Pas d'univers, pas de fetch d'images customisées.");
        return {};
      }
      const keysToFetch = fetchedUniverses.map(u => `universe_card_${u.id}_image`);
      console.log("📸 DynamicUniverseGrid: 🔍 Début du fetch des images customisées pour les clés:", keysToFetch);
      const { data, error } = await supabase
        .from("site_content_images")
        .select("key_name, image_url");

      if (error) {
        console.error("📸 DynamicUniverseGrid: ❌ Erreur lors du fetch des images customisées depuis Supabase:", error);
        throw error;
      }

      const result: Record<string, string> = {};
      data.forEach(img => {
        result[img.key_name] = img.image_url;
      });

      console.log("📸 DynamicUniverseGrid: 📊 Images customisées récupérées depuis Supabase:", result);
      return result;
    }
  });

  // Synchroniser l'état local avec les données fetched une fois qu'elles sont disponibles
  useEffect(() => {
    if (fetchedUniverses) {
      console.log("📸 DynamicUniverseGrid: Mise à jour de l'état local des univers.");
      setUniverses(fetchedUniverses);
      setIsLoading(false);
    }
  }, [fetchedUniverses]);

  // Mutation pour mettre à jour l'URL de l'image de l'univers
  const updateUniverseImageMutation = useMutation({
    mutationFn: async ({ universeId, imageUrl }: { universeId: string; imageUrl: string }) => {
      const keyName = `universe_card_${universeId}_image`;
      console.log(`📸 DynamicUniverseGrid: ➡️ Début mutation pour sauvegarder l'image pour l'univers ${universeId}. Nouvelle URL: ${imageUrl}`);
      const { error } = await supabase
        .from('site_content_images')
        .upsert(
          { key_name: keyName, image_url: imageUrl },
          { onConflict: 'key_name' }
        );
      
      if (error) {
        console.error(`📸 DynamicUniverseGrid: ❌ Erreur Supabase lors de la sauvegarde de l'image pour l'univers ${universeId}:`, error);
        throw error;
      }
      console.log(`📸 DynamicUniverseGrid: ✅ Image de l'univers ${universeId} sauvegardée avec succès dans Supabase.`);
    },
    onSuccess: () => {
      console.log("📸 DynamicUniverseGrid: 🎉 Mutation réussie. Invalidation des requêtes 'universe-images'...");
      queryClient.invalidateQueries({ queryKey: ["universe-images"] });
      console.log("📸 DynamicUniverseGrid: 🔄 Requêtes 'universe-images' invalidées, le composant devrait recharger les données.");
    },
    onError: (err) => {
      console.error("📸 DynamicUniverseGrid: 🔴 Échec de la mutation pour la sauvegarde de l'image:", err);
    }
  });

  if (isLoading) {
    return (
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-slate-900">
            Explorez Nos Univers Aquatiques
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-48 rounded-t-lg"></div>
                <div className="bg-gray-100 p-6 rounded-b-lg">
                  <div className="h-6 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (queryError) {
    return (
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <p className="text-red-500">Erreur lors du chargement des univers.</p>
        </div>
      </section>
    );
  }

  // Calculer les catégories visibles
  const visibleUniverses = universes.slice(currentSlide, currentSlide + itemsPerSlide);
  const canGoNext = currentSlide + itemsPerSlide < universes.length;
  const canGoPrev = currentSlide > 0;

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-16">
          <h2 className="text-4xl font-bold text-slate-900">
            Explorez Nos Univers Aquatiques
          </h2>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={prevSlide} 
              disabled={!canGoPrev}
              className="w-12 h-12 rounded-xl disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={nextSlide} 
              disabled={!canGoNext}
              className="w-12 h-12 rounded-xl disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {visibleUniverses.map((universe) => {
            // Déterminer l'URL de l'image à afficher, en priorité celle de Supabase
            const imageUrl = customImagesContent?.[`universe_card_${universe.id}_image`] || universe.image || "/placeholder.jpg";
            console.log(`📸 DynamicUniverseGrid: 🖼️ Rendu de l'univers ${universe.id}. URL affichée:`, imageUrl);

            return (
              <Card key={universe.id} className="overflow-hidden hover:shadow-xl transition-all duration-500 group cursor-pointer transform hover:-translate-y-2 flex flex-col h-full">
                <div className="relative">
                  <div className={`h-3 ${universe.color}`}></div>
                  <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                    {isEditMode ? (
                      <EditableImage
                        imageKey={`universe_card_${universe.id}_image`}
                        initialUrl={imageUrl}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onUpdate={(newUrl) => {
                          console.log(`📸 DynamicUniverseGrid: 🟢 onUpdate de EditableImage déclenché pour l'univers ${universe.id} avec la nouvelle URL: ${newUrl}`);
                          updateUniverseImageMutation.mutate({
                            universeId: universe.id,
                            imageUrl: newUrl
                          });
                        }}
                      />
                    ) : (
                      <img
                        src={imageUrl}
                        alt={universe.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute top-4 left-4">
                      <div className="text-4xl">{universe.icon}</div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="font-bold text-xl mb-3 transition-colors group-hover:text-[#0074b3]">
                      {universe.title}
                    </h3>
                    {isEditMode ? (
                      <EditableText
                        contentKey={`universe_description_${universe.id}`}
                        initialContent={universe.description}
                        className="text-gray-600 text-base leading-relaxed mb-4"
                        onUpdate={(newText) => {
                          // Mettre à jour l'état local
                          const updatedUniverses = universes.map(u => 
                            u.id === universe.id ? { ...u, description: newText } : u
                          );
                          setUniverses(updatedUniverses);
                        }}
                      />
                    ) : (
                      <p className="text-gray-600 text-base leading-relaxed mb-4">
                        {universe.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-auto flex items-end">
                    <Button 
                      className="rounded-xl bg-[#0074b3] text-white hover:bg-[#005a8c] transition-colors px-6 py-2 font-semibold w-full"
                      onClick={() => window.location.href = universe.redirectUrl}
                    >
                      Explorer
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Indicateurs de pagination */}
        {universes.length > itemsPerSlide && (
          <div className="flex justify-center mt-8 gap-2">
            {Array.from({ length: Math.ceil(universes.length / itemsPerSlide) }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index * itemsPerSlide)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  Math.floor(currentSlide / itemsPerSlide) === index 
                    ? 'bg-blue-600' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default DynamicUniverseGrid; 