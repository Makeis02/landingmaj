
import { Card } from "@/components/ui/card";
import { Package, Droplet, Fan, Beaker, Lightbulb, Brush, Fish, Gem } from "lucide-react";
import { EditableText } from "./EditableText";
import { EditableURL } from "./EditableURL";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EditableImage } from "./EditableImage";
import { useEditStore } from "@/stores/useEditStore";
import { Button } from "./ui/button";

const categories = [
  {
    title: "Décorations",
    description: "Embellissez votre aquarium",
    imageKey: "category_decorations",
    icon: Gem,
  },
  {
    title: "Pompes",
    description: "Filtration & circulation",
    imageKey: "category_pumps",
    icon: Droplet,
  },
  {
    title: "Chauffages et Ventilation",
    description: "Température optimale",
    imageKey: "category_heating",
    icon: Fan,
  },
  {
    title: "Bio-Chimique",
    description: "Équilibre parfait",
    imageKey: "category_biochemical",
    icon: Beaker,
  },
  {
    title: "Éclairages",
    description: "Luminosité adaptée",
    imageKey: "category_lighting",
    icon: Lightbulb,
  },
  {
    title: "Entretiens et Nettoyages",
    description: "Maintenance facile",
    imageKey: "category_maintenance",
    icon: Brush,
  },
  {
    title: "Alimentation",
    description: "Nutrition équilibrée",
    imageKey: "category_food",
    icon: Fish,
  },
  {
    title: "Packs mensuels",
    description: "Abonnements pratiques",
    imageKey: "category_packs",
    icon: Package,
  },
];

const Categories = () => {
  const { isEditMode } = useEditStore();
  const queryClient = useQueryClient();
  
  const { data: content } = useQuery({
    queryKey: ["categories-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editable_content")
        .select("*")
        .eq("content_key", "categories_cta_url")
        .maybeSingle();

      if (error) throw error;
      return data?.content || "/categories";
    },
  });

  const { data: categoryImages } = useQuery({
    queryKey: ["category-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content_images")
        .select("*")
        .in("key_name", categories.map(cat => cat.imageKey));

      if (error) {
        console.error("Error fetching category images:", error);
        throw error;
      }
      
      const imageMap: Record<string, string> = {};
      data?.forEach(item => {
        if (item.key_name && item.image_url) {
          imageMap[item.key_name] = item.image_url;
        }
      });
      
      return imageMap;
    },
  });

  return (
    <section className="py-20 bg-white">
      <div className="container">
        <EditableText
          contentKey="categories_title"
          initialContent="Nos Catégories"
          className="text-3xl font-bold text-center mb-4"
        />
        <EditableText
          contentKey="categories_subtitle"
          initialContent="Tout ce dont vous avez besoin pour votre aquarium, en un seul endroit"
          className="text-center text-gray-600 mb-12 max-w-2xl mx-auto"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {categories.map((category, index) => (
            <Card
              key={category.imageKey}
              className="group overflow-hidden transition-all duration-300 hover:shadow-xl"
            >
              <div className="relative h-48">
                <img
                  src={categoryImages?.[category.imageKey] || "/placeholder.svg"}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <category.icon className="w-6 h-6" />
                    <EditableText
                      contentKey={`category_${index}_title`}
                      initialContent={category.title}
                      className="text-xl font-bold"
                    />
                  </div>
                  <EditableText
                    contentKey={`category_${index}_description`}
                    initialContent={category.description}
                    className="text-sm text-white/80"
                  />
                  <div className="mt-4">
                    <Link 
                      to={content || "/categories"}
                      className="inline-block bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded hover:bg-white/30 transition-all"
                    >
                      <EditableText
                        contentKey={`category_${index}_cta`}
                        initialContent="Voir la catégorie"
                        className="text-white hover:text-white"
                      />
                    </Link>
                    <EditableURL
                      contentKey={`category_${index}_url`}
                      initialContent="/categories"
                    />
                  </div>
                </div>
              </div>
              {isEditMode && (
                <div className="p-4 border-t">
                  <EditableImage
                    imageKey={category.imageKey}
                    initialUrl={categoryImages?.[category.imageKey] || "/placeholder.svg"}
                    className="hidden"
                    onUpdate={() => {
                      queryClient.invalidateQueries({ queryKey: ["category-images"] });
                    }}
                  >
                    {({ openFileDialog }) => (
                      <Button
                        onClick={openFileDialog}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        Modifier l'image
                      </Button>
                    )}
                  </EditableImage>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
