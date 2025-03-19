import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EditableText } from "@/components/EditableText";

const features = [
  { id: 1, titleKey: "feature_title_1", descKey: "feature_desc_1", icon: "📦" },
  { id: 2, titleKey: "feature_title_2", descKey: "feature_desc_2", icon: "💰" },
  { id: 3, titleKey: "feature_title_3", descKey: "feature_desc_3", icon: "🎯" },
  { id: 4, titleKey: "feature_title_4", descKey: "feature_desc_4", icon: "✨" },
];

const Features = () => {
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const paletteRef = useRef<HTMLDivElement>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [customColor, setCustomColor] = useState("#000000");
  const [hexInput, setHexInput] = useState("#000000");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState<Range | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [featureTitles, setFeatureTitles] = useState<{ [key: string]: string }>({
    feature_title_1: "Titre par défaut 1",
    feature_title_2: "Titre par défaut 2",
    feature_title_3: "Titre par défaut 3", 
    feature_title_4: "Titre par défaut 4",
  });
  const [featureDescriptions, setFeatureDescriptions] = useState<{ [key: string]: string }>({
    feature_desc_1: "Description par défaut 1",
    feature_desc_2: "Description par défaut 2",
    feature_desc_3: "Description par défaut 3",
    feature_desc_4: "Description par défaut 4",
  });

  // Couleurs par défaut
  const colors = [
    "#000000",
    "#1EAEDB",
    "#8B5CF6",
    "#D946EF",
    "#F97316",
    "#0EA5E9",
    "#10B981",
    "#FF0000"
  ];

  // État pour les couleurs personnalisées
  const [customColors, setCustomColors] = useState<string[]>([]);

  // Charger les couleurs personnalisées depuis Supabase
  const { data: savedColors } = useQuery({
    queryKey: ['features-custom-colors'],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from('editable_content')
          .select('content')
          .eq('content_key', 'features_custom_colors')
          .single();

        if (data?.content) {
          const parsedColors = JSON.parse(data.content);
          setCustomColors(parsedColors);
          return parsedColors;
        }
        return [];
      } catch (error) {
        console.error('Erreur lors du chargement des couleurs:', error);
        return [];
      }
    },
  });

  // Sauvegarder les couleurs dans Supabase
  const saveCustomColorsToSupabase = async (colors: string[]) => {
    try {
      const { data, error } = await supabase
        .from('editable_content')
        .upsert({
          content_key: 'features_custom_colors',
          content: JSON.stringify(colors)
        });

      if (error) throw error;
      console.log('✅ Couleurs sauvegardées dans Supabase');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des couleurs:', error);
    }
  };

  const addCustomColor = async (color: string) => {
    const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    if (!isValidHex) return;
    
    if (colors.includes(color) || customColors.includes(color)) return;
    
    const updatedColors = [...customColors, color];
    setCustomColors(updatedColors);
    await saveCustomColorsToSupabase(updatedColors);
  };

  const removeCustomColor = async (colorToRemove: string) => {
    const updatedColors = customColors.filter(color => color !== colorToRemove);
    setCustomColors(updatedColors);
    await saveCustomColorsToSupabase(updatedColors);
  };

  const { data: featuresData, refetch } = useQuery({
    queryKey: ["features-content"],
    queryFn: async () => {
      const { data } = await supabase
        .from("editable_content")
        .select("content_key, content")
        .in("content_key", features.flatMap((f) => [f.titleKey, f.descKey]));

      const contentMap = data?.reduce((acc, item) => {
        acc[item.content_key] = item.content;
        return acc;
      }, {} as Record<string, string>) || {};

      // Initialize titles and descriptions from the data
      const titleDefaults = {
        feature_title_1: "Titre par défaut 1",
        feature_title_2: "Titre par défaut 2",
        feature_title_3: "Titre par défaut 3",
        feature_title_4: "Titre par défaut 4",
      };
      
      const descDefaults = {
        feature_desc_1: "Description par défaut 1",
        feature_desc_2: "Description par défaut 2",
        feature_desc_3: "Description par défaut 3",
        feature_desc_4: "Description par défaut 4",
      };

      setFeatureTitles({
        feature_title_1: contentMap.feature_title_1 || titleDefaults.feature_title_1,
        feature_title_2: contentMap.feature_title_2 || titleDefaults.feature_title_2,
        feature_title_3: contentMap.feature_title_3 || titleDefaults.feature_title_3,
        feature_title_4: contentMap.feature_title_4 || titleDefaults.feature_title_4,
      });

      setFeatureDescriptions({
        feature_desc_1: contentMap.feature_desc_1 || descDefaults.feature_desc_1,
        feature_desc_2: contentMap.feature_desc_2 || descDefaults.feature_desc_2,
        feature_desc_3: contentMap.feature_desc_3 || descDefaults.feature_desc_3,
        feature_desc_4: contentMap.feature_desc_4 || descDefaults.feature_desc_4,
      });

      return contentMap;
    },
  });

  useEffect(() => {
    console.log("📌 Initialisation de l'IntersectionObserver");

    const observer = new IntersectionObserver(
      (entries) => {
        console.log("📌 Entries détectées :", entries);

        entries.forEach((entry) => {
          console.log(`🎯 Élément ${entry.target} détecté - isIntersecting: ${entry.isIntersecting}`);

          if (entry.isIntersecting) {
            console.log("✅ Ajout des classes d'animation");
            entry.target.classList.add("animate-fade-in", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-10");
            console.log("🎨 Classes appliquées :", entry.target.classList);
          }
        });
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.2, // Vérifie si ce seuil est correct
      }
    );

    setTimeout(() => {
      featureRefs.current.forEach((ref) => {
        if (ref) {
          console.log(`👀 Observation de l'élément :`, ref);
          observer.observe(ref);
        }
      });
    }, 300);

    return () => {
      featureRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  useEffect(() => {
    console.log("🔄 showPalette mis à jour :", showPalette);
  }, [showPalette]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        console.log("⌛ Fermeture de la palette dans 500ms...");
        setTimeout(() => {
          if (document.activeElement !== paletteRef.current) {
            setShowPalette(false);
          }
        }, 500); // Ajout d'un délai
      }
    };

    if (showPalette) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPalette]);

  const handleMouseUp = (key: string) => {
    console.log("🖱️ handleMouseUp déclenché pour", key);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.toString().trim().length === 0) {
      console.log("⚠️ Aucun texte sélectionné, fermeture de la palette.");
      setTimeout(() => setShowPalette(false), 300); // Délai pour éviter un re-render trop rapide
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    console.log("📍 Position détectée avant correction :", rect);

    // Récupération de la section Features
    const featuresContainer = document.getElementById("features-section");
    if (!featuresContainer) {
      console.error("❌ Impossible de trouver la section Features");
      return;
    }
    
    // Calcul de la position absolue en tenant compte du scroll
    let newTop = rect.bottom + window.scrollY - featuresContainer.offsetTop + 5; // Ajout de window.scrollY
    let newLeft = rect.left + window.scrollX - featuresContainer.offsetLeft; // Ajout de window.scrollX

    // Empêche la palette de sortir de la section Features
    newTop = Math.max(featuresContainer.offsetTop, Math.min(newTop, featuresContainer.clientHeight + featuresContainer.offsetTop - 80));
    newLeft = Math.max(featuresContainer.offsetLeft, Math.min(newLeft, featuresContainer.clientWidth + featuresContainer.offsetLeft - 150));

    console.log("📍 Nouvelle position ajustée :", { top: newTop, left: newLeft });

    setPosition({ top: newTop, left: newLeft });
    setSelectedKey(key);
    setSelectedText(range);
    setShowPalette(true); // Affichage immédiat
  };

  // Update this function to handle content updates properly
  const handleContentUpdate = async (newContent: string, contentKey: string) => {
    try {
      await supabase
        .from("editable_content")
        .upsert({ content_key: contentKey, content: newContent });
      
      // This is fine since we're not passing any options
      refetch();
    } catch (error) {
      console.error("Error updating content:", error);
    }
  };

  const applyTextColor = async (color: string) => {
    if (!selectedKey || !selectedText) {
      console.log("❌ Pas de clé ou de texte sélectionné");
      return;
    }

    console.log("🎨 Application de la couleur :", color, "à", selectedKey);

    const span = document.createElement("span");
    span.style.color = color;
    span.appendChild(selectedText.extractContents());
    selectedText.insertNode(span);

    // Récupérer le contenu HTML complet de l'élément parent
    const parentElement = span.closest('[data-content-key]');
    if (!parentElement) {
      console.error("❌ Impossible de trouver l'élément parent");
      return;
    }

    try {
      const updatedContent = parentElement.innerHTML;
      await supabase
        .from("editable_content")
        .upsert({ 
          content_key: selectedKey, 
          content: updatedContent 
        });

      console.log("✅ Couleur appliquée et sauvegardée");
      setShowPalette(false);
      refetch();
    } catch (error) {
      console.error("Error applying color:", error);
    }
  };

  return (
    <section id="features-section" className="pt-4 sm:pt-8 pb-16 sm:pb-20 px-4 bg-white md:px-8">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 animate-fade-in">
          <h2 
            className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
            data-content-key="features_title"
          >
            <EditableText
              contentKey="features_title"
              initialContent="Pourquoi choisir nos packs ?"
              onUpdate={(newContent) => handleContentUpdate(newContent, "features_title")}
              onMouseUp={() => handleMouseUp("features_title")}
            />
          </h2>
          <p 
            className="text-xl text-slate-600"
            data-content-key="features_subtitle"
          >
            <EditableText
              contentKey="features_subtitle"
              initialContent="Des solutions complètes pour un aquarium toujours impeccable"
              onUpdate={(newContent) => handleContentUpdate(newContent, "features_subtitle")}
              onMouseUp={() => handleMouseUp("features_subtitle")}
            />
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div
              key={feature.id}
              ref={(el) => (featureRefs.current[feature.id] = el)}
              className="feature-card opacity-0 translate-y-10 transition-all duration-700 ease-out shadow-lg rounded-xl bg-white p-6 flex flex-col items-center text-center gap-2"
            >
              <div className="text-5xl mb-2">{feature.icon}</div>
              <h3 
                className="text-xl font-semibold mb-2"
                data-content-key={feature.titleKey}
              >
                <EditableText
                  contentKey={feature.titleKey}
                  initialContent={featuresData?.[feature.titleKey] || featureTitles[feature.titleKey] || "Titre par défaut"}
                  onUpdate={(newContent) => handleContentUpdate(newContent, feature.titleKey)}
                  onMouseUp={() => handleMouseUp(feature.titleKey)}
                />
              </h3>
              <p 
                className="text-slate-600"
                data-content-key={feature.descKey}
              >
                <EditableText
                  contentKey={feature.descKey}
                  initialContent={featuresData?.[feature.descKey] || featureDescriptions[feature.descKey] || "Description par défaut"}
                  onUpdate={(newContent) => handleContentUpdate(newContent, feature.descKey)}
                  onMouseUp={() => handleMouseUp(feature.descKey)}
                />
              </p>
            </div>
          ))}
        </div>
      </div>

      {showPalette && (
        <div 
          ref={paletteRef}
          className="fixed bg-white shadow-lg rounded-lg p-4 border border-gray-200 z-[9999]"
          style={{ 
            top: position.top + "px", 
            left: position.left + "px",
            visibility: "visible",
            opacity: 1,
            transition: "opacity 0.2s ease-in-out",
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <button
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowPalette(false)}
          >
            ✕
          </button>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {colors.map(color => (
              <button
                key={color}
                className="w-8 h-8 rounded-full border-2 border-gray-200 hover:scale-110 transition-transform shadow-sm hover:shadow-md"
                style={{
                  backgroundColor: color
                }}
                onClick={() => applyTextColor(color)}
                title="Appliquer cette couleur"
              />
            ))}
            {customColors.map(color => (
              <div key={color} className="relative group">
                <button
                  className="w-8 h-8 rounded-full border-2 border-gray-200 hover:scale-110 transition-transform shadow-sm hover:shadow-md"
                  style={{
                    backgroundColor: color
                  }}
                  onClick={() => applyTextColor(color)}
                  title="Appliquer cette couleur personnalisée"
                />
                <button
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCustomColor(color);
                  }}
                  title="Supprimer cette couleur"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-gray-600">Personnalisée:</label>
            <input
              type="color"
              className="w-8 h-8"
              value={customColor}
              onChange={e => {
                setCustomColor(e.target.value);
                setHexInput(e.target.value);
                applyTextColor(e.target.value);
              }}
              title="Choisir une couleur personnalisée"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="w-20 text-xs border border-gray-300 rounded px-1 py-0.5"
              value={hexInput}
              onChange={e => {
                let value = e.target.value;
                if (value && !value.startsWith('#')) {
                  value = '#' + value;
                }
                setHexInput(value);
              }}
              placeholder="#RRGGBB"
            />
            <button
              className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-300"
              onClick={() => {
                const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hexInput);
                if (isValidHex) {
                  addCustomColor(hexInput);
                  setCustomColor(hexInput);
                  applyTextColor(hexInput);
                }
              }}
            >
              Ajouter
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Features;
