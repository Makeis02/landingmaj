import { Button } from "@/components/ui/button";
import { Check, X, Gift, HelpCircle, Fish } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EditableText } from "@/components/EditableText";
import { EditableURL } from "@/components/EditableURL";
import { useEffect, useRef, useState } from "react";
import Carousel from "@/components/Carousel";
import { EditableImage } from "@/components/EditableImage";
import { useEditStore } from "@/stores/useEditStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import Upcoming from "./Upcoming";
import React from "react";

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

// Interface pour les images de la section Box du mois en cours
interface BoxImagesData {
  [key: string]: string;
}

const monthlyPacks = [
  {
    name: "Pack Survie",
    type: "DOUBLE BOX FÉVRIER/MARS",
    basePrice: "29,99",
    promoPrice: "24,99",
    description: "Des flocons et chips de haute qualité, accompagnés d'Artemia naturel, pour assurer une nutrition variée.",
    shipping: "Expédition rapide : livraison sous 72h*",
    notes: [
      "JBL Spirulina 250 ml",
      "Amtra Clean Procult 50 ml"
    ],
    images: [],
    itemCount: 4
  },
  {
    name: "Pack Premium",
    type: "DOUBLE BOX FÉVRIER/MARS",
    basePrice: "24,99",
    promoPrice: "9,99",
    description: "2 box regroupées en une (février + mars)",
    shipping: "Expédition rapide : livraison sous 72h* en lettre suivie (5 €)",
    notes: [
      "Amtra Pro soft stick feed 250 ml",
      "Amtra Clean procult 50 ml",
      "Amtra Pro Color Flake 100 ml"
    ],
    images: [],
    itemCount: 6
  },
  {
    name: "Pack Découverte",
    type: "ÉDITION SPÉCIALE AVRIL",
    basePrice: "19,99",
    promoPrice: "7,99",
    description: "Une sélection inédite pour avril",
    shipping: "Livraison rapide offerte",
    notes: [
      "Contient des produits exclusifs non récurrents",
      "Quantités limitées !",
      "Livraison en lettre suivie",
      "Surprise incluse dans chaque pack",
      "Offre valable uniquement en avril",
      "Contient une notice illustrée"
    ],
    images: [],
    itemCount: 4
  }
];

const Pricing = () => {
  const { isEditMode } = useEditStore();
  const [pricingData, setPricingData] = useState<any>({});
  const [basixImages, setBasixImages] = useState<string[]>([]);
  const [premiumImages, setPremiumImages] = useState<string[]>([]);
  const [discoveryImages, setDiscoveryImages] = useState<string[]>([]);
  const [carouselSpeed, setCarouselSpeed] = useState<number>(5000);
  const [boxImages, setBoxImages] = useState<BoxImagesData>({});
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  
  // Check if it's mobile view (less than sm breakpoint)
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 640);
    };
    
    // Check on initial load
    checkMobileView();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobileView);
    
    // Clean up
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);
  
  const { data, refetch } = useQuery({
    queryKey: ["pricing-content"],
    queryFn: async () => {
      const { data: contentData } = await supabase
        .from("editable_content")
        .select("content_key, content")
        .in("content_key", [
          "pricing_title", "pricing_subtitle",
          "pack_basix_name", "pack_basix_price",
          "pack_premium_name", "pack_premium_price",
          "pack_basix_features_1", "pack_basix_features_2", "pack_basix_features_3", "pack_basix_features_4",
          "pack_basix_no_features_1", "pack_basix_no_features_2",
          "pack_premium_features_1", "pack_premium_features_2", "pack_premium_features_4",
          "pack_premium_features_5", "pack_premium_features_6",
          "pack_premium_no_features_1",
          "pack_discovery_name", "pack_discovery_price",
          "pack_discovery_features_1", "pack_discovery_features_2", "pack_discovery_features_3", "pack_discovery_features_4",
          "pack_discovery_features_5",
          "pack_discovery_features_6",
          "monthly_box_title", "monthly_box_subtitle", "monthly_box_shipping",
          "monthly_pack_pack_basix_name", "monthly_pack_pack_basix_description", "monthly_pack_pack_basix_price", "monthly_pack_pack_basix_shipping",
          "monthly_pack_pack_premium_name", "monthly_pack_pack_premium_description", "monthly_pack_pack_premium_price", "monthly_pack_pack_premium_shipping",
          "monthly_pack_pack_basix_type", "monthly_pack_pack_premium_type",
          "monthly_pack_pack_basix_note_0", "monthly_pack_pack_basix_note_1", "monthly_pack_pack_basix_note_2",
          "monthly_pack_pack_premium_note_0", "monthly_pack_pack_premium_note_1", "monthly_pack_pack_premium_note_2",
          "monthly_pack_pack_survie_note_0", "monthly_pack_pack_survie_note_1",
          "monthly_pack_pack_survie_type", "monthly_pack_pack_survie_description", "monthly_pack_pack_survie_price", "monthly_pack_pack_survie_base_price", "monthly_pack_pack_survie_shipping",
          "box_mois_pack_survie_image_1", "box_mois_pack_survie_image_2",
          "box_mois_pack_premium_image_1", "box_mois_pack_premium_image_2", "box_mois_pack_premium_image_3",
          "box_mois_pack_decouverte_image_1", "box_mois_pack_decouverte_image_2", "box_mois_pack_decouverte_image_3",
          "box_mois_pack_decouverte_image_4", "box_mois_pack_decouverte_image_5", "box_mois_pack_decouverte_image_6",
          "monthly_pack_survie_tooltip",
          "monthly_pack_premium_tooltip",
          "monthly_pack_decouverte_tooltip",
          "monthly_pack_survie_tooltip_title",
          "monthly_pack_premium_tooltip_title",
          "monthly_pack_decouverte_tooltip_title",
          "offer_validity",
        ]);
      return contentData?.reduce((acc, item) => {
        acc[item.content_key] = item.content;
        return acc;
      }, {}) || {};
    },
  });

  const { data: buttonData, refetch: refetchButtons } = useQuery({
    queryKey: ["button-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editable_content")
        .select("content_key, content")
        .in("content_key", [
          "pricing_button_1_text",
          "pricing_button_1_url",
          "pricing_button_2_text",
          "pricing_button_2_url",
          "pricing_button_3_text",
          "pricing_button_3_url",
        ]);

      if (error) {
        console.error("❌ Erreur de récupération des boutons :", error);
        return {};
      }

      return data?.reduce((acc, item) => {
        acc[item.content_key] = item.content;
        return acc;
      }, {}) || {};
    },
  });

  const { data: imagesData, refetch: refetchImages } = useQuery({
    queryKey: ["images-content"],
    queryFn: async () => {
      console.log("🔄 Démarrage de la récupération des images...");
      try {
        // Récupérer les images depuis site_content_images
        const { data: siteImages, error: siteImagesError } = await supabase
          .from("site_content_images")
          .select("*")
          .in("key_name", ["pack_basix_images", "pack_premium_images", "pack_discovery_images"])
          .order('created_at', { ascending: true }); // Order by creation date to maintain order

        if (siteImagesError) {
          console.error("❌ Erreur de récupération des images:", siteImagesError);
          return {
            pack_basix_images: [],
            pack_premium_images: [],
            pack_discovery_images: [],
            image_carousel_speed: 5000
          };
        }

        console.log("📦 Images récupérées depuis site_content_images:", siteImages);

        const imagesMap: ImagesData = {
          pack_basix_images: [],
          pack_premium_images: [],
          pack_discovery_images: [],
          image_carousel_speed: 5000
        };

        if (siteImages && siteImages.length > 0) {
          // Group images by key_name
          siteImages.forEach(item => {
            if (item.key_name === "pack_basix_images" && item.image_url) {
              imagesMap.pack_basix_images.push(item.image_url);
            } else if (item.key_name === "pack_premium_images" && item.image_url) {
              imagesMap.pack_premium_images.push(item.image_url);
            } else if (item.key_name === "pack_discovery_images" && item.image_url) {
              imagesMap.pack_discovery_images.push(item.image_url);
            }
          });
          
          console.log("📸 Images groupées par pack:", {
            basix: imagesMap.pack_basix_images.length,
            premium: imagesMap.pack_premium_images.length,
            discovery: imagesMap.pack_discovery_images.length
          });
        } else {
          console.log("⚠️ Aucune image trouvée dans site_content_images");
        }

        console.log("📸 Images Map final:", JSON.stringify(imagesMap, null, 2));
        return imagesMap;
      } catch (error) {
        console.error("❌ Erreur générale:", error);
        return {
          pack_basix_images: [],
          pack_premium_images: [],
          pack_discovery_images: [],
          image_carousel_speed: 5000
        };
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0
  });

  // Forcer le rechargement des images au montage et quand isEditMode change
  useEffect(() => {
    console.log("🔄 Forcer le rechargement des images...");
    refetchImages();
  }, [isEditMode]);

  useEffect(() => {
    console.log("🔄 useEffect déclenché avec imagesData:", imagesData);
    if (imagesData) {
      console.log("📸 Mise à jour des états locaux avec:", {
        basix: imagesData.pack_basix_images,
        premium: imagesData.pack_premium_images,
        discovery: imagesData.pack_discovery_images,
        speed: imagesData.image_carousel_speed
      });
      
      setBasixImages(imagesData.pack_basix_images || []);
      setPremiumImages(imagesData.pack_premium_images || []);
      setDiscoveryImages(imagesData.pack_discovery_images || []);
      setCarouselSpeed(imagesData.image_carousel_speed || 5000);
    }
  }, [imagesData]);

  const [showPalette, setShowPalette] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [position, setPosition] = useState({ top: 0, left: 0 });

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
      range.surroundContents(span);
      setShowPalette(false);
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
      if (event.target) {
        event.target.value = '';
      }

    } catch (error) {
      console.error("❌ Erreur générale lors de l'upload:", error);
    }
  };

  const { toast } = useToast();

  const handleTextUpdate = async (newText: string, contentKey: string) => {
    try {
      const trimmedText = newText.trim();
      
      const { error } = await supabase
        .from("editable_content")
        .update({ content: trimmedText })
        .eq("content_key", contentKey);

      if (!error) {
        // Forcer le rechargement des données après la mise à jour
        await refetch();
        console.log("Mise à jour réussie pour :", contentKey);
      } else {
        console.error("Erreur lors de la mise à jour :", error);
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la mise à jour du contenu",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erreur inattendue :", error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue est survenue",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (data) {
         setPricingData(data);
      }
    };
    fetchData();
  }, [data]);

  const monthlyPacksWithSurprise = monthlyPacks.map(pack => {
    const updatedNotes = [...pack.notes];

    if (pack.name === "Pack Premium") {
      updatedNotes.push(pricingData?.monthly_pack_pack_premium_note_3 || "Notice illustrée incluse");
    }

    if (pack.name === "Pack Basix") {
      updatedNotes.push(pricingData?.monthly_pack_pack_basix_note_3 || "Notice illustrée incluse");
    }

    if (pack.name === "Pack Survie") {
      updatedNotes.push(pricingData?.monthly_pack_pack_survie_note_3 || "Notice illustrée incluse");
    }

    return {
      ...pack,
      notes: updatedNotes
    };
  });

  const containsRevePoints = (text: string): boolean => {
    return text.toLowerCase().includes('rêve points');
  };

  // Ajout d'un useEffect pour le debug
  useEffect(() => {
    console.log("🔍 État actuel des images:", {
      basixImages,
      premiumImages,
      discoveryImages,
      carouselSpeed
    });
  }, [basixImages, premiumImages, discoveryImages, carouselSpeed]);

  // Requête pour récupérer les images de la section Box du mois en cours
  const { data: boxImagesData, refetch: refetchBoxImages } = useQuery({
    queryKey: ["box-images-content"],
    queryFn: async () => {
      console.log("🔄 Démarrage de la récupération des images de la Box du mois...");
      try {
        // Récupérer les images depuis site_content_images avec les clés spécifiques
        const { data: siteImages, error: siteImagesError } = await supabase
          .from("site_content_images")
          .select("*")
          .like("key_name", "box_mois_%");

        if (siteImagesError) {
          console.error("❌ Erreur de récupération des images de la Box du mois:", siteImagesError);
          return {};
        }

        console.log("📦 Images de la Box du mois récupérées:", siteImages);

        // Créer un objet avec les images récupérées
        const imagesMap: BoxImagesData = {};

        if (siteImages && siteImages.length > 0) {
          siteImages.forEach(item => {
            if (item.key_name && item.image_url) {
              imagesMap[item.key_name] = item.image_url;
            }
          });
          
          console.log("📸 Images de la Box du mois mappées:", imagesMap);
        } else {
          console.log("⚠️ Aucune image de Box du mois trouvée");
        }

        return imagesMap;
      } catch (error) {
        console.error("❌ Erreur générale lors de la récupération des images de la Box du mois:", error);
        return {};
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0
  });

  // Mettre à jour l'état local avec les images récupérées
  useEffect(() => {
    if (boxImagesData) {
      console.log("📸 Mise à jour des images de la Box du mois:", boxImagesData);
      setBoxImages(boxImagesData);
    }
  }, [boxImagesData]);

  // Forcer le rechargement des images de la Box du mois au montage et quand isEditMode change
  useEffect(() => {
    console.log("🔄 Forcer le rechargement des images de la Box du mois...");
    refetchBoxImages();
  }, [isEditMode]);

  // Composant personnalisé pour les images de la section Box du mois en cours
  interface BoxEditableImageProps {
    imageKey: string;
    initialUrl: string;
    onUpdate?: () => void;
  }

  const BoxEditableImage = ({ imageKey, initialUrl, onUpdate }: BoxEditableImageProps) => {
    const { isEditMode } = useEditStore();
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      
      if (file) {
        console.log("=== Fichier sélectionné pour la Box du mois ===");
        console.log("Fichier:", {
          name: file.name,
          size: file.size,
          type: file.type
        });
        
        setIsUploading(true);
        
        try {
          // Vérifier l'authentification
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user?.id) {
            toast({
              title: "Non autorisé",
              description: "Vous devez être connecté pour modifier les images. Veuillez vous connecter.",
              variant: "destructive",
            });
            return;
          }
          
          // Appeler la fonction handleBoxImageUpload
          await handleBoxImageUpload(file, imageKey);
          
          // Afficher un message de succès
          toast({
            title: "Succès",
            description: "L'image a été mise à jour avec succès.",
            variant: "default",
          });
          
          // Appeler la fonction onUpdate si elle existe
          if (onUpdate) {
            onUpdate();
          }
        } catch (error: any) {
          console.error("Erreur lors de l'upload:", error);
          
          // Déterminer le message d'erreur approprié
          let errorMessage = "Une erreur est survenue lors du téléversement de l'image. Veuillez réessayer.";
          
          if (error.message?.includes("duplicate key value")) {
            errorMessage = "Une erreur est survenue lors de la mise à jour de l'image. Veuillez réessayer.";
          } else if (error.message?.includes("5MB")) {
            errorMessage = "L'image ne doit pas dépasser 5MB.";
          } else if (error.message?.includes("authentifi")) {
            errorMessage = "Vous devez être connecté pour modifier les images.";
          }
          
          toast({
            title: "Erreur",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setIsUploading(false);
          // Réinitialiser l'input
          event.target.value = '';
        }
      }
    };

    if (!isEditMode) {
      return (
        <img 
          src={initialUrl || "https://via.placeholder.com/150?text=Image+non+disponible"} 
          alt="" 
          className="w-full h-full object-contain"
        />
      );
    }

    return (
      <div className="relative w-full h-full">
        <img
          src={initialUrl || "https://via.placeholder.com/150?text=Ajouter+une+image"}
          alt=""
          className="w-full h-full object-contain"
          onError={(e) => {
            if (initialUrl) {
              console.error("Image failed to load:", initialUrl);
            }
            // Remplacer par une image par défaut en cas d'erreur
            (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=Image+non+disponible";
          }}
        />
        <div 
          className="absolute inset-0 bg-black/10 hover:bg-black/50 transition-all duration-300 flex items-center justify-center cursor-pointer rounded-lg"
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
            style={{ cursor: 'pointer' }}
            disabled={isUploading}
          />
          <div className="text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded">
            {isUploading ? 'Chargement...' : initialUrl ? 'Modifier' : 'Ajouter'}
          </div>
        </div>
      </div>
    );
  };

  // Composant pour l'édition des prix des produits
  interface EditableProductPriceProps {
    contentKey: string;
    onUpdate: (newValue: string) => Promise<void>;
  }

  const EditableProductPrice = ({ contentKey, onUpdate }: EditableProductPriceProps) => {
    const [price, setPrice] = useState<string>("");
    const { isEditMode } = useEditStore();
    const { toast } = useToast();
    const [isInitialized, setIsInitialized] = useState(false);

    // Charger le prix initial
    useEffect(() => {
      const fetchPrice = async () => {
        try {
          const { data, error } = await supabase
            .from("editable_content")
            .select("content")
            .eq("content_key", `${contentKey}_product_price`)
            .limit(1);

          if (!error && data?.[0]) {
            setPrice(data[0].content);
          }
          setIsInitialized(true);
        } catch (error) {
          console.error("Erreur lors du chargement du prix:", error);
          setIsInitialized(true);
        }
      };

      if (!isInitialized) {
        fetchPrice();
      }
    }, [contentKey, isInitialized]);

    const handlePriceChange = async (newValue: string) => {
      try {
        // Nettoyer la valeur en gardant uniquement les chiffres, la virgule et le point
        const cleanValue = newValue.replace(/[^\d.,]/g, '');
        
        // Remplacer le point par une virgule si présent
        const normalizedValue = cleanValue.replace('.', ',');
        
        // Ne garder que la première virgule
        const parts = normalizedValue.split(',');
        let formattedValue = parts[0];
        if (parts.length > 1) {
          formattedValue += ',' + parts[1].slice(0, 2); // Limiter à 2 décimales
        }

        // Mettre à jour l'affichage immédiatement
        setPrice(formattedValue);

        const priceKey = `${contentKey}_product_price`;

        // Vérifier si l'entrée existe déjà
        const { data: existingEntry } = await supabase
          .from("editable_content")
          .select("content_key")
          .eq("content_key", priceKey)
          .limit(1);

        // Si la valeur est vide ou invalide, ne pas sauvegarder
        if (formattedValue === "" || formattedValue === ",") {
          return;
        }

        // Convertir en nombre pour validation
        const numericValue = parseFloat(formattedValue.replace(',', '.'));
        if (isNaN(numericValue)) {
          return;
        }

        if (existingEntry) {
          await supabase
            .from("editable_content")
            .update({ content: formattedValue })
            .eq("content_key", priceKey);
        } else {
          await supabase
            .from("editable_content")
            .insert({
              content_key: priceKey,
              content: formattedValue
            });
        }

        await onUpdate(formattedValue);
      } catch (error) {
        console.error("Erreur lors de la mise à jour du prix du produit:", error);
        toast({
          title: "Erreur",
          description: "Erreur lors de la mise à jour du prix",
          variant: "destructive",
        });
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Autoriser les touches de navigation, de suppression et les modificateurs
      if ([
        'Backspace',
        'Delete',
        'ArrowLeft',
        'ArrowRight',
        'Tab',
        'Enter',
        'Escape',
        ',',
        '.'
      ].includes(e.key) || e.ctrlKey || e.metaKey) {
        return;
      }
      
      // Bloquer les caractères non numériques
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    };

    const handleBlur = async () => {
      if (price !== "" && price !== ",") {
        let formattedPrice = price;
        
        // Ajouter ",00" si pas de décimales
        if (!price.includes(',')) {
          formattedPrice += ',00';
        } else {
          // Compléter avec des zéros si nécessaire
          const parts = price.split(',');
          if (parts[1]) {
            if (parts[1].length === 1) {
              formattedPrice += '0';
            }
          } else {
            formattedPrice += '00';
          }
        }
        
        await handlePriceChange(formattedPrice);
      }
    };

    if (!isEditMode) return null;

    return (
      <div className="relative flex items-center mt-1">
        <input
          type="text"
          value={price}
          onChange={(e) => handlePriceChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="0,00"
          className="w-20 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-primary pr-5 bg-white/50"
        />
        <span className="absolute right-2 text-xs text-gray-500">€</span>
      </div>
    );
  };

  // Fonction spécifique pour l'upload des images de la section Box du mois en cours
  const handleBoxImageUpload = async (file: File, imageKey: string) => {
    console.log("=== Démarrage de l'upload d'image pour la Box du mois ===");
    console.log("Image key:", imageKey);
    console.log("File details:", {
      name: file.name,
      size: file.size,
      type: file.type
    });

    try {
      // Vérifier l'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.log("Aucune session active trouvée");
        throw new Error("Utilisateur non authentifié");
      }
      console.log("Utilisateur authentifié:", session.user.id);

      // Vérifier la taille du fichier
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("L'image ne doit pas dépasser 5MB");
      }

      // Récupérer l'ancienne image pour la supprimer du stockage
      const { data: oldImageData } = await supabase
        .from('site_content_images')
        .select('image_url')
        .eq('key_name', imageKey)
        .order('created_at', { ascending: false })
        .limit(1);

      const oldImageUrl = oldImageData?.[0]?.image_url;

      if (oldImageUrl) {
        // Extraire le chemin du fichier à partir de l'URL
        try {
          const oldUrl = new URL(oldImageUrl);
          // Assuming path like /storage/v1/object/public/public-images/box_du_mois/.../image.jpg
          const pathSegments = oldUrl.pathname.split('/');
          const oldFilePath = pathSegments.slice(6).join('/'); // Get the path after bucket name

          if (oldFilePath) {
            console.log("Tentative de suppression de l'ancienne image:", oldFilePath);
            const { error: deleteError } = await supabase.storage
              .from('public-images') // Use the correct bucket name
              .remove([oldFilePath]);

            if (deleteError && deleteError.message !== 'The resource was not found') {
              console.error("Erreur lors de la suppression de l'ancienne image:", deleteError);
              // Optional: Decide if you want to proceed despite deletion error
            } else if (deleteError?.message === 'The resource was not found'){
              console.log("⚠️ Ancienne image non trouvée dans le stockage, suppression ignorée.");
            } else {
              console.log("✅ Ancienne image supprimée avec succès.");
            }
          } else {
             console.log("⚠️ Impossible d'extraire le chemin de l'ancienne image:", oldImageUrl);
          }
        } catch (urlError) {
          console.error("Erreur lors du traitement de l'URL de l'ancienne image:", urlError);
        }
      }

      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
      // Adjusted file path structure
      const filePath = `box_du_mois/${imageKey}/${fileName}.${fileExt}`;
      console.log("Chemin du fichier généré:", filePath);

      // Upload du fichier vers Supabase Storage
      console.log("Démarrage de l'upload vers storage...");
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('public-images') // Ensure this is your public bucket for these images
        .upload(filePath, file);

      if (uploadError) {
        console.error("Erreur d'upload:", uploadError);
        throw uploadError;
      }

      console.log("Fichier uploadé avec succès:", uploadData?.path);

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('public-images')
        .getPublicUrl(filePath);

       if (!publicUrl) {
         console.error("❌ Impossible de générer l'URL publique pour:", filePath);
         throw new Error("URL publique non générée");
       }

      console.log("URL publique générée:", publicUrl);

      // Utiliser insert au lieu de upsert
      const { error: insertError } = await supabase
        .from('site_content_images')
        .insert({
          key_name: imageKey,
          image_url: publicUrl,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("Erreur d'insertion dans site_content_images:", insertError);
        throw insertError;
      }

      console.log("Base de données mise à jour avec succès");

      // Forcer le rechargement des images
      refetchBoxImages(); // Make sure refetchBoxImages is defined in scope

      return publicUrl;
    } catch (error: any) {
      console.error('Détails de l\'erreur:', error);
      console.error('Stack d\'erreur:', error.stack);
      throw error;
    }
  };

  return (
    <>
      <section className="py-16 px-4 sm:px-6 overflow-hidden bg-slate-50">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <EditableText
                contentKey="pricing_title"
                initialContent={pricingData?.pricing_title || "Choisis le pack qui te correspond"}
                onUpdate={(newText) => handleTextUpdate(newText, "pricing_title")}
              />
            </h2>
            <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto">
              <EditableText
                contentKey="pricing_subtitle"
                initialContent={pricingData?.pricing_subtitle || "Des formules adaptées à tous les besoins"}
                onUpdate={(newText) => handleTextUpdate(newText, "pricing_subtitle")}
              />
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => {
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
                      {isEditMode ? (
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
            })}
          </div>
        </div>
      </section>

      <Upcoming />

      <section className="py-12 md:py-20 px-4 bg-white overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 md:mb-16 animate-fade-in">
            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-4">
              <EditableText 
                contentKey="monthly_box_title"
                initialContent={pricingData?.monthly_box_title || "Box du mois en cours"}
                onUpdate={(newText) => handleTextUpdate(newText, "monthly_box_title")} 
              />
            </h2>
            <p className="text-lg md:text-xl text-slate-600">
              <EditableText 
                contentKey="monthly_box_subtitle"
                initialContent={pricingData?.monthly_box_subtitle || "Promotions spéciales et offres limitées"}
                onUpdate={(newText) => handleTextUpdate(newText, "monthly_box_subtitle")} 
              />
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 items-stretch">
            {monthlyPacksWithSurprise.map((pack, packIndex) => (
              <div 
                key={pack.name}
                className="relative h-full"
              >
                <div className={`bg-gradient-to-br ${pack.name === "Pack Découverte" ? "from-yellow-50 to-yellow-100" : "from-blue-50 to-blue-100"} rounded-lg md:rounded-2xl p-4 md:p-8 shadow-lg hover:shadow-xl flex flex-col h-full min-h-[800px]`}>
                  {/* Section du haut - Badge + Images */}
                  <div className="mb-4">
                    {/* Badge */}
                    <div className="bg-primary text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold w-fit mx-auto mb-4 md:mb-6 h-[32px] flex items-center">
                      <EditableText 
                        contentKey={`monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_type`}
                        initialContent={pack.type}
                        onUpdate={(newText) => handleTextUpdate(newText, `monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_type`)}
                      />
                    </div>

                    {/* Grille d'images avec hauteur fixe */}
                    <div className="h-[180px] mb-4 sm:mb-6 md:mb-8">
                      <div className={`grid ${
                        pack.name === "Pack Basic" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
                      } gap-4 place-items-center h-full`}>
                        {pack.name === "Pack Survie" ? (
                          // Pack Survie - 3 images en 3 colonnes
                          [...Array(3)].map((_, index) => (
                            <div
                              key={`${pack.name}-image-${index}`}
                              className="flex items-center justify-center p-2 bg-white/70 backdrop-blur-sm rounded-xl shadow-md w-full max-w-[100px] mx-auto aspect-[3/4]"
                            >
                              <BoxEditableImage
                                imageKey={`box_mois_pack_survie_image_${index + 1}`}
                                initialUrl={boxImages[`box_mois_pack_survie_image_${index + 1}`] || ""}
                                onUpdate={() => refetchBoxImages()}
                              />
                            </div>
                          ))
                        ) : pack.name === "Pack Premium" ? (
                          // Pack Premium - 4 images en grille
                          [...Array(4)].map((_, index) => (
                            <div
                              key={`${pack.name}-image-${index}`}
                              className="flex items-center justify-center p-2 bg-white/70 backdrop-blur-sm rounded-xl shadow-md w-full max-w-[100px] mx-auto aspect-[3/4]"
                            >
                              <BoxEditableImage
                                imageKey={`box_mois_pack_premium_image_${index + 1}`}
                                initialUrl={boxImages[`box_mois_pack_premium_image_${index + 1}`] || ""}
                                onUpdate={() => refetchBoxImages()}
                              />
                            </div>
                          ))
                        ) : (
                          // Pack Découverte - 6 images
                          [...Array(6)].map((_, index) => (
                            <div
                              key={`${pack.name}-image-${index}`}
                              className="flex items-center justify-center p-2 bg-white/70 backdrop-blur-sm rounded-xl shadow-md w-full max-w-[100px] mx-auto aspect-[3/4]"
                            >
                              <BoxEditableImage
                                imageKey={`box_mois_pack_decouverte_image_${index + 1}`}
                                initialUrl={boxImages[`box_mois_pack_decouverte_image_${index + 1}`] || ""}
                                onUpdate={() => refetchBoxImages()}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section centrale - Titre, Prix, Description */}
                  <div className="mb-4 mt-8">
                    {/* Titre avec hauteur fixe */}
                    <div className="h-[60px] mb-2 sm:mb-4">
                      <h3 className="text-base sm:text-lg md:text-2xl font-bold text-center flex items-center justify-center h-full">
                        <EditableText 
                          contentKey={`monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_name`}
                          initialContent={pack.name}
                          onUpdate={(newText) => handleTextUpdate(newText, `monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_name`)}
                        />
                      </h3>
                    </div>

                    {/* Prix avec hauteur fixe */}
                    <div className="h-[50px] flex justify-center items-center gap-2 sm:gap-3 mb-2 sm:mb-4 md:mb-5">
                      <div className="flex items-baseline animate-pulse">
                        <span className="text-xl sm:text-2xl md:text-4xl font-bold text-primary">
                          <EditableText 
                            contentKey={`monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_price`}
                            initialContent={pack.promoPrice || "0"}
                            onUpdate={(newText) => handleTextUpdate(newText, `monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_price`)}
                          />
                        </span>
                        <span className="text-lg sm:text-xl md:text-2xl font-bold text-primary ml-1">€</span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-sm md:text-base line-through text-slate-400">
                          <EditableText 
                            contentKey={`monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_base_price`}
                            initialContent={pack.basePrice || "0"}
                            onUpdate={(newText) => handleTextUpdate(newText, `monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_base_price`)}
                          />
                        </span>
                        <span className="text-sm md:text-base line-through text-slate-400 ml-1">€</span>
                      </div>
                    </div>

                    {/* Description avec hauteur fixe */}
                    <div className="h-[70px] flex items-center justify-center mb-3 sm:mb-6 md:mb-8">
                      <p className="text-slate-600 text-center text-xs sm:text-sm px-2">
                        <EditableText 
                          contentKey={`monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_description`}
                          initialContent={pack.description.replace("?", ".")}
                          onUpdate={(newText) => handleTextUpdate(newText, `monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_description`)}
                        />
                      </p>
                    </div>
                  </div>

                  {/* Bloc blanc avec hauteur fixe et positionnement absolu */}
                  <div className="flex-grow mb-6">
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg md:rounded-xl px-3 sm:px-4 md:px-5 py-2 sm:py-3 md:py-4 h-[220px] overflow-y-auto">
                      <p className="text-xs md:text-sm text-slate-600 mb-2">
                        <EditableText 
                          contentKey={`monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_shipping`}
                          initialContent={pack.shipping}
                          onUpdate={(newText) => handleTextUpdate(newText, `monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_shipping`)}
                        />
                      </p>
                      <ul className="space-y-1 sm:space-y-1.5 [&>li:last-child]:mb-0">
                        {pack.name === "Pack Premium" 
                          ? pack.notes
                              .filter(note => typeof note === "string" && note.replace(/[\s\u200B-\u200D\uFEFF]/g, "") !== "")
                              .map((note, index) => {
                                const showGiftIcon = note.includes("Bambou Amtra");
                                const noteKey = `monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_note_${index}`;
                                // Remplacer index par un vrai index
                                // Ajoute une condition spécifique pour le nouveau 3e élément
                                const finalKey = (pack.name === "Pack Premium" && index === 3)
                                  ? "monthly_pack_pack_premium_note_3"
                                  : (pack.name === "Pack Basix" && index === 3)
                                  ? "monthly_pack_pack_basix_note_3"
                                  : (pack.name === "Pack Survie" && index === 3)
                                  ? "monthly_pack_pack_survie_note_3"
                                  : noteKey;

                                return (
                                  <li key={index} className="text-[11px] sm:text-xs md:text-sm">
                                    <div className="flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                                      <div className="flex items-center gap-1">
                                        {showGiftIcon && <Gift className="h-3 w-3 text-primary mr-1 flex-shrink-0" />}
                                        <EditableText 
                                          contentKey={finalKey}
                                          initialContent={note}
                                          onUpdate={(newText) => handleTextUpdate(newText, finalKey)}
                                        />
                                      </div>
                                    </div>
                                  </li>
                                );
                              })
                          : pack.notes
                              .filter(note => typeof note === "string" && note.replace(/[\s\u200B-\u200D\uFEFF]/g, "") !== "")
                              .map((note, index) => {
                                const showGiftIcon = note.includes("Bambou Amtra");
                                const noteKey = `monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_note_${index}`;
                                // Remplacer index par un vrai index
                                // Ajoute une condition spécifique pour le nouveau 3e élément
                                const finalKey = (pack.name === "Pack Premium" && index === 3)
                                  ? "monthly_pack_pack_premium_note_3"
                                  : (pack.name === "Pack Basix" && index === 3)
                                  ? "monthly_pack_pack_basix_note_3"
                                  : (pack.name === "Pack Survie" && index === 3)
                                  ? "monthly_pack_pack_survie_note_3"
                                  : noteKey;

                                return (
                                  <li key={index} className="text-[11px] sm:text-xs md:text-sm">
                                    <div className="flex items-start gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                                      <div className="flex items-center gap-1">
                                        {showGiftIcon && <Gift className="h-3 w-3 text-primary mr-1 flex-shrink-0" />}
                                        <EditableText 
                                          contentKey={finalKey}
                                          initialContent={note}
                                          onUpdate={(newText) => handleTextUpdate(newText, finalKey)}
                                        />
                                      </div>
                                    </div>
                                  </li>
                                );
                              })
                        }
                      </ul>
                    </div>
                  </div>

                  {/* Partie inférieure (bouton) - Position fixe en bas */}
                  <div className="mt-auto">
                    <div className="text-center mb-3">
                      <MobileTooltip
                        content={
                          <div className="bg-white p-4 rounded-xl shadow-xl max-w-[300px] border border-gray-100">
                            <div className="space-y-3">
                              <h4 className="font-semibold text-primary border-b pb-2">
                                <EditableText
                                  contentKey={`monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_tooltip_title`}
                                  initialContent={
                                    pricingData?.[`monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_tooltip_title`] ||
                                    pack.name
                                  }
                                  onUpdate={(newText) =>
                                    handleTextUpdate(
                                      newText,
                                      `monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_tooltip_title`
                                    )
                                  }
                                />
                              </h4>
                              <div className="text-sm text-slate-600 space-y-2">
                                <EditableText
                                  contentKey={`monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_tooltip`}
                                  initialContent={
                                    pricingData?.[`monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_tooltip`] ||
                                    "Ajoutez ici les détails de ce pack."
                                  }
                                  onUpdate={(newText) =>
                                    handleTextUpdate(
                                      newText,
                                      `monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_tooltip`
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        }
                      >
                        <span className="text-primary hover:text-primary/80 text-sm cursor-pointer underline transition-colors">
                          En savoir plus
                        </span>
                      </MobileTooltip>
                    </div>
                    {isEditMode ? (
                      <div className="flex flex-col items-center">
                        <Button className="w-full bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl">
                           <EditableText
                            contentKey={pack.name === "Pack Basix" ? "pricing_button_1_text" : pack.name === "Pack Premium" ? "pricing_button_2_text" : "pricing_button_3_text"}
                            initialContent={buttonData?.[pack.name === "Pack Basix" ? "pricing_button_1_text" : pack.name === "Pack Premium" ? "pricing_button_2_text" : "pricing_button_3_text"] || "Choisir ce pack"}
                            onUpdate={(newText) => handleTextUpdate(newText, pack.name === "Pack Basix" ? "pricing_button_1_text" : pack.name === "Pack Premium" ? "pricing_button_2_text" : "pricing_button_3_text")}
                          />
                        </Button>
                        <EditableURL
                          contentKey={pack.name === "Pack Basix" ? "pricing_button_1_url" : pack.name === "Pack Premium" ? "pricing_button_2_url" : "pricing_button_3_url"}
                          initialContent={buttonData?.[pack.name === "Pack Basix" ? "pricing_button_1_url" : pack.name === "Pack Premium" ? "pricing_button_2_url" : "pricing_button_3_url"] || "#"}
                          onUpdate={(newUrl) => handleTextUpdate(newUrl, pack.name === "Pack Basix" ? "pricing_button_1_url" : pack.name === "Pack Premium" ? "pricing_button_2_url" : "pricing_button_3_url")}
                        />
                      </div>
                    ) : (
                      <a
                        href={buttonData?.[pack.name === "Pack Basix" ? "pricing_button_1_url" : pack.name === "Pack Premium" ? "pricing_button_2_url" : "pricing_button_3_url"]?.startsWith("http")
                          ? buttonData[pack.name === "Pack Basix" ? "pricing_button_1_url" : pack.name === "Pack Premium" ? "pricing_button_2_url" : "pricing_button_3_url"]
                          : `http://${buttonData?.[pack.name === "Pack Basix" ? "pricing_button_1_url" : pack.name === "Pack Premium" ? "pricing_button_2_url" : "pricing_button_3_url"] || "#"}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button className="w-full bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl">
                          {buttonData?.[pack.name === "Pack Basix" ? "pricing_button_1_text" : pack.name === "Pack Premium" ? "pricing_button_2_text" : "pricing_button_3_text"] || "Choisir ce pack"}
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-6 md:mt-8 text-xs md:text-sm text-slate-500 animate-fade-in">
            <EditableText 
              contentKey="offer_validity"
              initialContent="* Offre valable uniquement jusqu'au 14/02/25"
              onUpdate={(newText) => handleTextUpdate(newText, "offer_validity")} 
            />
          </div>
        </div>
      </section>

      {showPalette && (
        <div className="absolute" style={{ top: position.top, left: position.left }}>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            onClick={() => applyTextColor(selectedColor, setSelectedColor)}
          />
        </div>
      )}
    </>
  );
};

export default Pricing;

