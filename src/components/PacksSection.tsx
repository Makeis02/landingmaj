import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, HelpCircle, Fish } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EditableText } from "@/components/EditableText";
import { EditableURL } from "@/components/EditableURL";
import Carousel from "@/components/Carousel";
import { useEditStore } from "@/stores/useEditStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Composant personnalisé pour les tooltips qui fonctionnent sur mobile
interface MobileTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

const MobileTooltip = ({ content, children }: MobileTooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Nettoyer le contenu
  const cleanedContent = React.useMemo(() => {
    if (typeof content === 'string') {
      const trimmed = content.trim();
      return trimmed === 'null' ? '' : trimmed;
    }
    return content;
  }, [content]);

  // Détecter si l'appareil est mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768 || ('ontouchstart' in window));
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Fermer le tooltip quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Si c'est un appareil desktop, utiliser le tooltip standard de Radix
  if (!isMobile) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {children}
          </TooltipTrigger>
          {cleanedContent && String(cleanedContent).trim() !== "" && (
            <TooltipContent className="bg-white p-3 text-sm rounded-xl shadow-xl w-[90vw] max-w-[280px] overflow-hidden border border-gray-100">
              <div className="max-h-[220px] overflow-y-auto">
                {cleanedContent}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Sinon, utiliser notre tooltip personnalisé pour mobile
  return (
    <div className="relative inline-block" ref={tooltipRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {children}
      </div>
      {isOpen && cleanedContent && String(cleanedContent).trim() !== "" && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 bg-white p-3 text-sm rounded-xl shadow-xl w-[90vw] max-w-[280px] overflow-hidden border border-gray-100">
          <div className="max-h-[220px] overflow-y-auto">
            {cleanedContent}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1 w-2 h-2 rotate-45 bg-white border-l border-t border-gray-100"></div>
        </div>
      )}
    </div>
  );
};

interface ImagesData {
  pack_basix_images: string[];
  pack_premium_images: string[];
  pack_discovery_images: string[];
  image_carousel_speed: number;
}

interface PacksSectionProps {
  homepageGlobalUrl?: string;
}

const PacksSection = ({ homepageGlobalUrl }: PacksSectionProps) => {
  const { isEditMode } = useEditStore();
  const [pricingData, setPricingData] = useState<any>({});
  const [basixImages, setBasixImages] = useState<string[]>([]);
  const [premiumImages, setPremiumImages] = useState<string[]>([]);
  const [discoveryImages, setDiscoveryImages] = useState<string[]>([]);
  const [carouselSpeed, setCarouselSpeed] = useState<number>(5000);
  const [buttonData, setButtonData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Récupération des données depuis Supabase
  const { data: imagesData, refetch: refetchImages } = useQuery({
    queryKey: ["pack-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content_images")
        .select("*")
        .in("key_name", ["pack_basix_images", "pack_premium_images", "pack_discovery_images"]);

      if (error) throw error;

      const result: ImagesData = {
        pack_basix_images: [],
        pack_premium_images: [],
        pack_discovery_images: [],
        image_carousel_speed: 5000,
      };

      data?.forEach((item) => {
        if (item.key_name === "pack_basix_images") {
          result.pack_basix_images.push(item.image_url);
        } else if (item.key_name === "pack_premium_images") {
          result.pack_premium_images.push(item.image_url);
        } else if (item.key_name === "pack_discovery_images") {
          result.pack_discovery_images.push(item.image_url);
        }
      });

      return result;
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  // Charger les données de pricing depuis Supabase
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("editable_content")
        .select("*");

      if (!error && data) {
        const pricingObj: any = {};
        const buttonObj: any = {};
        
        data.forEach((item) => {
          if (item.content_key.startsWith("pack_") || item.content_key.includes("pricing_") || item.content_key.startsWith("homepage_packs_")) {
            pricingObj[item.content_key] = item.content;
          }
          if (item.content_key.includes("button")) {
            buttonObj[item.content_key] = item.content;
          }
        });
        
        setPricingData(pricingObj);
        setButtonData(buttonObj);
      }
    };

    fetchData();
  }, []);

  // Mettre à jour les images locales quand les données changent
  useEffect(() => {
    if (imagesData) {
      setBasixImages(imagesData.pack_basix_images);
      setPremiumImages(imagesData.pack_premium_images);
      setDiscoveryImages(imagesData.pack_discovery_images);
      setCarouselSpeed(imagesData.image_carousel_speed);
    }
  }, [imagesData]);

  const containsRevePoints = (text: string): boolean => {
    return text.toLowerCase().includes("rêve points") || text.toLowerCase().includes("reve points");
  };

  const plans = [
    {
      id: "basix",
      name: pricingData?.pack_basix_name || "Pack Basix",
      price: pricingData?.pack_basix_price || "29,99",
      image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9",
      features: [
        pricingData?.pack_basix_features_1 || "3 variétés de nourriture",
        pricingData?.pack_basix_features_2 || "1 produit d'entretien",
        pricingData?.pack_basix_features_3 || "Livraison mensuelle",
        pricingData?.pack_basix_features_4 || "2 € offerts en rêve points chaque mois",
      ],
      noFeatures: [
        pricingData?.pack_basix_no_features_1 || "Produit surprise mensuel",
        pricingData?.pack_basix_no_features_2 || "Support prioritaire"
      ],
      ideal: "Débutants",
      buttonTextKey: "pricing_button_1_text",
      buttonUrlKey: "pricing_button_1_url",
      defaultButtonText: "Choisir ce pack",
      imageContentKey: "pack_basix_images",
    },
    {
      id: "premium",
      name: pricingData?.pack_premium_name || "Pack Premium",
      price: pricingData?.pack_premium_price || "49,99",
      image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901",
      features: [
        pricingData?.pack_premium_features_1 || "4 variétés exclusives",
        pricingData?.pack_premium_features_2 || "1 produit d'entretien premium",
        pricingData?.pack_premium_features_4 || "4 € offerts en rêve points chaque mois",
        pricingData?.pack_premium_features_5 || "Livraison mensuelle",
        pricingData?.pack_premium_features_6 || "Support prioritaire",
      ],
      noFeatures: [
        pricingData?.pack_premium_no_features_1 || "Produit surprise mensuel"
      ],
      ideal: "Passionnés",
      buttonTextKey: "pricing_button_2_text",
      buttonUrlKey: "pricing_button_2_url",
      defaultButtonText: "Choisir ce pack",
      imageContentKey: "pack_premium_images",
    },
    {
      id: "discovery",
      name: pricingData?.pack_discovery_name || "Pack Découverte",
      price: pricingData?.pack_discovery_price || "39,99",
      image: "https://images.unsplash.com/photo-1589897059239-4d2a7d0476a1",
      features: [
        pricingData?.pack_discovery_features_1 || "2 variétés mystère",
        pricingData?.pack_discovery_features_2 || "Mini surprise offerte",
        pricingData?.pack_discovery_features_3 || "Livraison en avril uniquement",
        pricingData?.pack_discovery_features_4 || "Quantité limitée",
        pricingData?.pack_discovery_features_5 || "Support prioritaire",
        pricingData?.pack_discovery_features_6 || "Nouvelle fonctionnalité"
      ],
      noFeatures: [],
      ideal: "Curieux",
      buttonTextKey: "pricing_button_3_text",
      buttonUrlKey: "pricing_button_3_url",
      defaultButtonText: "Choisir ce pack",
      imageContentKey: "pack_discovery_images",
    }
  ];

  const handleTextUpdate = async (newText: string, contentKey: string) => {
    try {
      const { data: existingData } = await supabase
        .from("editable_content")
        .select("content_key")
        .eq("content_key", contentKey)
        .limit(1);

      let error;
      
      if (existingData && existingData.length > 0) {
        const { error: updateError } = await supabase
          .from("editable_content")
          .update({ content: newText })
          .eq("content_key", contentKey);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("editable_content")
          .insert({ content_key: contentKey, content: newText });
        error = insertError;
      }

      if (!error) {
        // Mettre à jour l'état local
        if (contentKey.startsWith("pack_") || contentKey.includes("pricing_") || contentKey.startsWith("homepage_packs_")) {
          setPricingData(prev => ({ ...prev, [contentKey]: newText }));
        }
        if (contentKey.includes("button")) {
          setButtonData(prev => ({ ...prev, [contentKey]: newText }));
        }
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, packId: string) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      console.log("❌ Aucun fichier sélectionné");
      return;
    }

    const plan = plans.find(p => p.id === packId);
    if (!plan) {
      console.error("❌ Plan non trouvé pour l'ID:", packId);
      return;
    }
    const packName = plan.name;
    const contentKey = plan.imageContentKey;

    console.log("🚀 Démarrage de l'upload pour", packName, "avec", files.length, "fichiers");
    try {
      // Supprimer les anciennes images du pack
      const { data: oldImages } = await supabase
        .from("site_content_images")
        .select("image_url")
        .eq("key_name", contentKey);

      if (oldImages?.length) {
        console.log(`🗑️ Suppression de ${oldImages.length} anciennes images pour ${packName}`);
        for (const img of oldImages) {
          try {
            const url = new URL(img.image_url);
            const path = url.pathname.split('/').slice(6).join('/');
            await supabase.storage.from("images").remove([path]);
          } catch (error) {
            console.error("❌ Erreur lors de la suppression d'une ancienne image:", error);
          }
        }

        // Supprimer les entrées dans la table
        const { error: deleteError } = await supabase
          .from("site_content_images")
          .delete()
          .eq("key_name", contentKey);

        if (deleteError) {
          console.error("❌ Erreur lors de la suppression des entrées:", deleteError);
        }
      }

      let uploadedUrls: string[] = [];

      // Upload des nouvelles images
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = `carousel/${packId}/${Date.now()}-${file.name}`;
        
        console.log(`📸 Upload de l'image ${i + 1}/${files.length}:`, filePath);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("images")
          .upload(filePath, file, { cacheControl: "3600", upsert: true });

        if (uploadError) {
          console.error("❌ Erreur d'upload:", uploadError);
          continue;
        }

        console.log("✅ Image uploadée avec succès, récupération de l'URL publique");
        const { data: { publicUrl } } = supabase.storage
          .from("images")
          .getPublicUrl(filePath);

        if (publicUrl) {
          uploadedUrls.push(publicUrl);
          console.log("🔗 URL publique générée:", publicUrl);

          // Insert into site_content_images
          const { error: insertError } = await supabase
            .from("site_content_images")
            .insert({
              key_name: contentKey,
              image_url: publicUrl,
              created_at: new Date().toISOString()
            });

          if (insertError) {
            console.error("❌ Erreur lors de l'insertion dans site_content_images:", insertError);
          } else {
            console.log("✅ Image ajoutée à site_content_images");
          }
        } else {
           console.error("❌ URL publique non générée pour:", filePath);
        }
      }

      // Mettre à jour l'état local
      if (packId === "basix") {
        console.log("🔄 Mise à jour des images Basix:", uploadedUrls);
        setBasixImages(uploadedUrls);
      } else if (packId === "premium") {
        console.log("🔄 Mise à jour des images Premium:", uploadedUrls);
        setPremiumImages(uploadedUrls);
      } else {
        console.log("🔄 Mise à jour des images Discovery:", uploadedUrls);
        setDiscoveryImages(uploadedUrls);
      }

      // Forcer le rechargement des données
      await refetchImages();
      console.log("🔄 Données rechargées après upload");

      // Réinitialiser l'input file
      event.target.value = '';
    } catch (error) {
      console.error("❌ Erreur générale lors de l'upload:", error);
    }
  };

  return (
    <section className="py-16 px-4 sm:px-6 overflow-hidden bg-slate-50">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <EditableText
              contentKey="homepage_packs_title"
              initialContent={pricingData?.homepage_packs_title || "Choisis le pack qui te correspond"}
              onUpdate={(newText) => handleTextUpdate(newText, "homepage_packs_title")}
            />
          </h2>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto">
            <EditableText
              contentKey="homepage_packs_subtitle"
              initialContent={pricingData?.homepage_packs_subtitle || "Des formules adaptées à tous les besoins"}
              onUpdate={(newText) => handleTextUpdate(newText, "homepage_packs_subtitle")}
            />
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {isLoading || plans.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col h-full overflow-hidden bg-white rounded-lg shadow animate-pulse">
                <div className="h-56 bg-gray-200 w-full mb-4" />
                <div className="flex-1 p-4">
                  <div className="h-6 bg-gray-200 rounded mb-3" />
                  <div className="h-4 bg-gray-200 rounded mb-4" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              </div>
            ))
          ) : (
            plans.map((plan) => {
              let currentImages: string[];
              if (plan.id === "basix") {
                currentImages = basixImages;
              } else if (plan.id === "premium") {
                currentImages = premiumImages;
              } else {
                currentImages = discoveryImages;
              }

              const nameKey = `pack_${plan.id}_name`;
              const priceKey = `pack_${plan.id}_price`;

              return (
                <div 
                  key={plan.name}
                  className="relative flex flex-col h-full"
                >
                  <div className={`pricing-card flex flex-col p-6 rounded-xl shadow-lg hover:shadow-2xl transition-shadow duration-300 ${
                    plan.id === "discovery" ? "bg-gradient-to-br from-yellow-50 to-yellow-100" : "bg-white"
                  }`}>
                    <Carousel
                      packName={plan.name}
                      images={currentImages}
                      speed={carouselSpeed}
                      isEditMode={isEditMode}
                      contentKey={plan.imageContentKey}
                      onImagesUpdate={(newImages) => {
                        console.log(`🔄 Mise à jour des images pour ${plan.imageContentKey}:`, newImages.length);
                        if (plan.id === "basix") {
                          setBasixImages(newImages);
                        } else if (plan.id === "premium") {
                          setPremiumImages(newImages);
                        } else {
                          setDiscoveryImages(newImages);
                        }
                        refetchImages();
                      }}
                    />
                    {isEditMode && (
                      <div className="flex justify-center mt-4 mb-2">
                        <label htmlFor={`file-input-${plan.id}`} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition text-sm cursor-pointer">
                          Ajouter des images
                        </label>
                        <input
                          id={`file-input-${plan.id}`}
                          type="file"
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleImageUpload(e, plan.id)}
                        />
                      </div>
                    )}
                    <h3 className="text-2xl font-bold mb-2 mt-4 min-h-[40px] flex items-center justify-center text-center">
                      <EditableText
                        contentKey={nameKey}
                        initialContent={plan.name}
                        onUpdate={(newText) => handleTextUpdate(newText, nameKey)}
                      />
                    </h3>
                    <div className="flex items-center justify-center mb-4 px-2">
                      <div className="inline-flex items-center justify-center bg-blue-50 text-blue-700 text-[11px] sm:text-xs font-medium px-3 py-2 rounded-full w-full max-w-[95%] mx-auto">
                        <div className="flex items-center justify-center w-5 mr-1.5">
                          <Fish className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
                        </div>
                        <p className="text-center flex-1 leading-tight px-0.5">
                          {plan.name === "Pack Survie" && "Pour petits aquariums de 10 à 60L : bettas seuls, guppys, rasboras, néons, petits poissons rouges isolés."}
                          {plan.name === "Pack Basic" && "Pour aquariums communautaires de 60 à 150L : guppys, platies, rasboras, corydoras, petits cichlidés nains."}
                          {plan.name === "Pack Premium" && "Pour grands bacs de plus de 150L : cichlidés africains (Malawi, Tanganyika), scalaires, discus et aquariums très plantés."}
                        </p>
                      </div>
                    </div>
                    <div className="text-3xl font-bold mb-6 min-h-[40px] flex items-center justify-center">
                      <EditableText
                        contentKey={priceKey}
                        initialContent={plan.price}
                        onUpdate={(newText) => handleTextUpdate(newText, priceKey)}
                      />
                      <span className="text-base font-normal text-slate-600 ml-1">/mois</span>
                    </div>
                    <div className="space-y-4 mb-8 flex-grow">
                      {plan.features.map((feature, index) => {
                        const featureKey = `pack_${plan.id}_features_${index + 1}`;
                        let supabaseFeatureIndex = index + 1;
                        if (plan.id === 'premium' && supabaseFeatureIndex >= 3) {
                          supabaseFeatureIndex++;
                        }
                        const actualFeatureKey = `pack_${plan.id}_features_${supabaseFeatureIndex}`;

                        return (
                          <div key={`${plan.id}-feature-${index}`} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="flex items-center gap-1">
                              <EditableText
                                contentKey={actualFeatureKey}
                                initialContent={feature}
                                onUpdate={(newText) => handleTextUpdate(newText, actualFeatureKey)}
                              />
                              {containsRevePoints(feature) && (
                                <MobileTooltip
                                  content={
                                    <EditableText
                                      contentKey="reve_points_tooltip"
                                      initialContent="Les rêve points sont des points de fidélité que vous accumulez à chaque achat. Ils peuvent être utilisés pour obtenir des réductions sur vos prochaines commandes."
                                      onUpdate={(newText) => handleTextUpdate(newText, "reve_points_tooltip")}
                                    />
                                  }
                                >
                                  <span className="cursor-help">
                                    <HelpCircle className="h-4 w-4 text-slate-500 hover:text-primary transition-colors" />
                                  </span>
                                </MobileTooltip>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {plan.noFeatures.map((feature, index) => (
                        <div key={`${plan.id}-nofeature-${index}`} className="flex items-start gap-3 text-slate-400">
                          <X className="h-5 w-5 flex-shrink-0 mt-0.5" />
                          <EditableText
                            contentKey={`pack_${plan.id}_no_features_${index + 1}`}
                            initialContent={feature}
                            onUpdate={(newText) => handleTextUpdate(newText, `pack_${plan.id}_no_features_${index + 1}`)}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="text-sm text-slate-600 mb-6 text-center">
                      Idéal pour : <span className="font-semibold">{plan.ideal}</span>
                    </div>
                    <div className="mt-2 sm:mt-4 md:mt-auto">
                      {homepageGlobalUrl ? (
                        <a
                          href={homepageGlobalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button className={`w-full text-white bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all`}>
                            {buttonData?.[plan.buttonTextKey] || "Choisir ce pack"}
                          </Button>
                        </a>
                      ) : isEditMode ? (
                        <div className="flex flex-col items-center">
                          <Button className={`w-full text-white bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all`}>
                            <EditableText
                              contentKey={plan.buttonTextKey}
                              initialContent={buttonData?.[plan.buttonTextKey] || "Choisir ce pack"}
                              onUpdate={(newText) => handleTextUpdate(newText, plan.buttonTextKey)}
                            />
                          </Button>
                          <EditableURL
                            contentKey={plan.buttonUrlKey}
                            initialContent={buttonData?.[plan.buttonUrlKey] || "#"}
                            onUpdate={(newUrl) => handleTextUpdate(newUrl, plan.buttonUrlKey)}
                          />
                        </div>
                      ) : (
                        <a
                          href={buttonData?.[plan.buttonUrlKey]?.startsWith("http")
                            ? buttonData[plan.buttonUrlKey]
                            : `http://${buttonData?.[plan.buttonUrlKey] || "#"}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button className={`w-full text-white bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all`}>
                            {buttonData?.[plan.buttonTextKey] || "Choisir ce pack"}
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

export default PacksSection; 