import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EditableText } from "./EditableText";
import { EditableURL } from "./EditableURL";
import { EditableImage } from "./EditableImage";
import { Link } from "react-router-dom";

type HeroContent = {
  hero_title?: string;
  hero_subtitle?: string;
  hero_button_1?: string;
  hero_button_2?: string;
  hero_button_1_url?: string;
  hero_button_2_url?: string;
}

const Hero = () => {
  const { data: content, refetch } = useQuery({
    queryKey: ["hero-content"],
    queryFn: async () => {
      const { data: contentData } = await supabase
        .from("editable_content")
        .select("content_key, content")
        .in("content_key", [
          "hero_title",
          "hero_subtitle",
          "hero_button_1",
          "hero_button_2",
          "hero_button_1_url",
          "hero_button_2_url"
        ]);

      const { data: imageData } = await supabase
        .from("site_content_images")
        .select("*")
        .eq("key_name", "hero_background")
        .maybeSingle();

      const combinedData: HeroContent & { backgroundImage?: string } = {
        ...contentData?.reduce((acc, item) => {
          acc[item.content_key as keyof HeroContent] = item.content;
          return acc;
        }, {} as HeroContent),
        backgroundImage: imageData?.image_url
      };

      return combinedData;
    },
  });

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-ocean/10 to-surface-light">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <EditableImage
          imageKey="hero_background"
          initialUrl={content?.backgroundImage || "https://images.unsplash.com/photo-1500375592092-40eb2168fd21"}
          className="w-full h-full object-cover opacity-30"
          onUpdate={() => refetch()}
        />
      </div>

      {/* Content */}
      <div className="container relative z-10">
        <div className="flex flex-col items-center justify-center space-y-8">
          <EditableText
            contentKey="hero_title"
            initialContent={content?.hero_title || "Transforme ton aquarium en un écosystème parfait"}
            className="text-4xl md:text-7xl font-bold text-text text-center w-full max-w-none px-4 animate-float"
            onUpdate={() => refetch()}
          />
          <EditableText
            contentKey="hero_subtitle"
            initialContent={content?.hero_subtitle || 
              "Des équipements de qualité, des conseils d'experts et des packs sur-mesure pour un entretien facile de ton aquarium 🐠"}
            className="text-xl md:text-2xl text-text/80 text-center max-w-3xl mx-auto px-4"
            onUpdate={() => refetch()}
          />
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <div className="flex flex-col items-center w-full sm:w-auto">
              <Link 
                to={content?.hero_button_1_url || "/packs"}
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-ocean hover:bg-ocean-light text-white px-8 min-w-[200px]"
                >
                  <EditableText
                    contentKey="hero_button_1"
                    initialContent={content?.hero_button_1 || "Découvrir les packs 📦"}
                    onUpdate={() => refetch()}
                    className="text-white"
                  />
                </Button>
              </Link>
              <EditableURL
                contentKey="hero_button_1_url"
                initialContent={content?.hero_button_1_url || "/packs"}
                onUpdate={() => refetch()}
              />
            </div>
            <div className="flex flex-col items-center w-full sm:w-auto">
              <Link 
                to={content?.hero_button_2_url || "/subscribe"}
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-ocean text-ocean hover:bg-ocean hover:text-white min-w-[200px]"
                >
                  <EditableText
                    contentKey="hero_button_2"
                    initialContent={content?.hero_button_2 || "S'abonner maintenant 🚀"}
                    onUpdate={() => refetch()}
                    className="group-hover:text-white"
                  />
                </Button>
              </Link>
              <EditableURL
                contentKey="hero_button_2_url"
                initialContent={content?.hero_button_2_url || "/subscribe"}
                onUpdate={() => refetch()}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
