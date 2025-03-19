import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EditableText } from "@/components/EditableText";
import { EditableURL } from "@/components/EditableURL";
import { EditableImage } from "@/components/EditableImage";
import { useEditStore } from "@/stores/useEditStore";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface ContentData {
  backgroundImage?: string;
  hero_title_landing?: string;
  hero_subtitle_landing?: string;
  hero_button_text_landing?: string;
  hero_button_url_landing?: string;
  [key: string]: string | undefined;
}

const Hero = () => {
  const { isEditMode } = useEditStore();
  const [heroTitle, setHeroTitle] = useState("Transforme ton aquarium en un écosystème parfait");
  const [heroSubtitle, setHeroSubtitle] = useState("Des équipements de qualité...");
  const [showPalette, setShowPalette] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [customColor, setCustomColor] = useState("#000000");
  const [colors, setColors] = useState(["#000000", "#FF0000", "#0000FF", "#008000", "#FFA500", "#800080"]);
  const [heroImage, setHeroImage] = useState("/images/default-hero.jpg");
  const [heroButtonText, setHeroButtonText] = useState("Je m'abonne maintenant →");
  const [refresh, setRefresh] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: content, refetch } = useQuery({
    queryKey: ["hero-content-landing"],
    queryFn: async () => {
      try {
        const { data: contentData } = await supabase
          .from("editable_content")
          .select("content_key, content")
          .in("content_key", [
            "hero_title_landing",
            "hero_subtitle_landing",
            "hero_button_text_landing",
            "hero_button_url_landing"
          ]);

        const { data: imageData } = await supabase
          .from("site_content_images")
          .select("*")
          .eq("key_name", "hero_background_landing")
          .maybeSingle();

        console.log("🛠️ Données récupérées après refresh :", { contentData, imageData });

        const result: ContentData = contentData?.reduce((acc, item) => {
          acc[item.content_key] = item.content;
          return acc;
        }, {} as ContentData) || {};

        if (imageData?.image_url) {
          result.backgroundImage = imageData.image_url;
        }

        return result;
      } catch (error) {
        console.error("Error fetching hero content:", error);
        return {} as ContentData;
      }
    },
  });

  // Synchroniser heroImage avec l'image de Supabase
  useEffect(() => {
    if (content?.backgroundImage) {
      setHeroImage(content.backgroundImage);
    }
  }, [content?.backgroundImage]); // Mettre à jour quand Supabase charge une image

  // Ajout d'un deuxième useEffect pour forcer la mise à jour après l'upload
  useEffect(() => {
    if (heroImage) {
      console.log("✅ Mise à jour forcée de EditableImage avec :", heroImage);
    }
  }, [heroImage]);

  const handleMouseUp = (setText: React.Dispatch<React.SetStateAction<string>>) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (!range.collapsed) {
        const rect = range.getBoundingClientRect();
        setPosition({ top: rect.bottom + window.scrollY + 5, left: rect.left + window.scrollX });
        setShowPalette(true);
      }
    }
  };

  const applyTextColor = (color: string, setText: React.Dispatch<React.SetStateAction<string>>) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const span = document.createElement("span");
      span.style.color = color;
      span.appendChild(range.extractContents());
      range.insertNode(span);
      setText((prev) => prev); // Trigger re-render
    }
  };

  const handleCustomColor = () => {
    if (customColor && !colors.includes(customColor)) {
      setColors((prevColors) => [...prevColors, customColor]);
    }
    setShowPalette(true); // Keep the palette open
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Générer un nom de fichier propre
      const filePath = `hero-images/${file.name.replace(/\s+/g, "_")}-${Date.now()}`;

      console.log("📂 Uploading file to:", filePath);

      // Upload du fichier sur Supabase Storage
      const { data, error } = await supabase.storage
        .from("images") // Vérifie que "images" est bien ton bucket
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (error) {
        console.error("❌ Erreur lors de l'upload :", error);
        return;
      }

      console.log("✅ Upload réussi :", data);

      // Récupérer l'URL publique de l'image
      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;

      console.log("🌍 URL publique obtenue :", publicUrl);

      if (!publicUrl) {
        console.error("❌ Impossible de récupérer l'URL de l'image.");
        return;
      }

      // Vérifier si l'image existe déjà dans la base
      const { data: existingImage } = await supabase
        .from("site_content_images")
        .select("id")
        .eq("key_name", "hero_background_landing")
        .maybeSingle();

      let dbError;
      if (existingImage) {
        console.log("🔄 Mise à jour de l'URL de l'image existante dans la base.");
        ({ error: dbError } = await supabase
          .from("site_content_images")
          .update({ image_url: publicUrl })
          .eq("key_name", "hero_background_landing"));
      } else {
        console.log("🆕 Insertion d'une nouvelle image dans la base.");
        ({ error: dbError } = await supabase
          .from("site_content_images")
          .insert([{ key_name: "hero_background_landing", image_url: publicUrl }]));
      }

      if (dbError) {
        console.error("❌ Erreur lors de la mise à jour/insertion de l'image dans la base :", dbError);
        return;
      }

      console.log("✅ Image bien mise à jour dans la base de données.");

      // Mettre à jour immédiatement l'image affichée dans le Hero
      setHeroImage(publicUrl);
      console.log("🖼️ Mise à jour immédiate de heroImage :", publicUrl);

      // Rafraîchissement des données Supabase
      console.log("🔄 Rafraîchissement des données Supabase...");
      refetch(); // Recharge les données en arrière-plan
    } catch (err) {
      console.error("❌ Erreur générale lors de l'upload :", err);
    }
  };

  return (
    <section 
      className="py-8 sm:py-16 px-4 sm:px-6 overflow-hidden"
      aria-labelledby="hero-title"
    >
      <div className="container mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-[1fr_auto] items-center gap-6">
          {/* Texte à gauche */}
          <div className="space-y-6 text-center sm:text-left flex flex-col items-center sm:items-start">
            <div className="w-full max-w-full mx-auto sm:mx-0 overflow-hidden pr-0 lg:pr-8">
              <h1 
                id="hero-title"
                className="text-5xl md:text-6xl lg:text-7xl font-bold text-text leading-tight w-full"
                role="heading"
                aria-level={1}
              >
                <EditableText
                  contentKey="hero_title_landing"
                  initialContent={content?.hero_title_landing || "Titre par défaut"}
                  onUpdate={() => refetch()}
                />
              </h1>
              <div className="w-full flex justify-center sm:justify-start">
                <div className="w-full">
                  <p 
                    className="text-lg md:text-xl lg:text-2xl text-text/80 mt-6 w-full" 
                    style={{ overflowWrap: 'break-word', wordBreak: 'normal', hyphens: 'auto' }}
                    role="doc-subtitle"
                  >
                    <EditableText
                      contentKey="hero_subtitle_landing"
                      initialContent={content?.hero_subtitle_landing || "Sous-titre par défaut"}
                      onUpdate={() => refetch()}
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Image à droite avec effet flottant */}
          <div 
            className="flex justify-center relative order-2 sm:order-none w-full"
            role="img"
          >
            {isEditMode && (
              <div
                className="absolute top-2 right-2 bg-black/50 text-white px-3 py-1 rounded-md cursor-pointer hover:bg-black transition z-10"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                aria-label="Changer l'image"
              >
                Changer l'image
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
              aria-label="Sélectionner une nouvelle image"
            />
            <motion.div
              animate={{ y: [0, -10, 0] }} 
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} 
              className="relative w-full h-full min-h-[300px] md:min-h-[400px] lg:min-h-[500px] flex items-center justify-center"
            >
              <EditableImage
                imageKey="hero_background_landing"
                initialUrl={heroImage || content?.backgroundImage || "/images/default-hero.jpg"}
                className="rounded-2xl shadow-lg w-full h-full object-contain md:object-cover max-w-lg lg:max-w-xl xl:max-w-2xl"
                onUpdate={() => refetch()}
                key={heroImage}
                alt="Image principale de la landing page"
                loading="lazy"
                decoding="async"
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Palette de couleurs */}
      {isEditMode && showPalette && (
        <div 
          ref={paletteRef} 
          className="absolute"
          role="dialog"
          aria-label="Palette de couleurs"
        >
          <button
            className="absolute top-0 right-0 p-1 text-red-500"
            onClick={() => setShowPalette(false)}
            aria-label="Fermer la palette"
          >
            &times;
          </button>
          {colors.map((color) => (
            <button
              key={color}
              className="w-6 h-6 rounded-full border-2 border-white"
              style={{ backgroundColor: color }}
              onClick={() => applyTextColor(color, setHeroTitle)}
              aria-label={`Choisir la couleur ${color}`}
            />
          ))}
          <button
            className="w-6 h-6 rounded-full border-2 border-white ml-2"
            onClick={() => setShowPalette(false)}
            aria-label="Ajouter une couleur personnalisée"
          >
            +
          </button>
          <input
            type="color"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            onBlur={handleCustomColor}
            className="ml-2"
            aria-label="Sélectionner une couleur personnalisée"
          />
        </div>
      )}
    </section>
  );
};

export default Hero;
