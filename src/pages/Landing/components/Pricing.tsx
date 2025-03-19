import { Button } from "@/components/ui/button";
import { Check, X, Gift, HelpCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EditableText } from "@/components/EditableText";
import { EditableURL } from "@/components/EditableURL";
import { useEffect, useRef, useState } from "react";
import Carousel from "@/components/Carousel";
import { EditableImage } from "@/components/EditableImage";
import { useEditStore } from "@/stores/useEditStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";

// Composant personnalisé pour les tooltips qui fonctionnent sur mobile
interface MobileTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

const MobileTooltip = ({ content, children }: MobileTooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

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
          <TooltipContent className="max-w-[250px] bg-white p-3 text-sm rounded shadow-lg">
            {content}
          </TooltipContent>
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
      {isOpen && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 bg-white p-3 text-sm rounded-lg shadow-lg max-w-[250px] animate-in fade-in-0 zoom-in-95">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-1 w-2 h-2 rotate-45 bg-white"></div>
        </div>
      )}
    </div>
  );
};

interface ImagesData {
  pack_basix_images: string[];
  pack_premium_images: string[];
  image_carousel_speed: number;
}

// Interface pour les images de la section Box du mois en cours
interface BoxImagesData {
  [key: string]: string;
}

const monthlyPacks = [
  {
    name: "Pack Basix",
    type: "DOUBLE BOX FÉVRIER/MARS",
    basePrice: "14,99",
    promoPrice: "5,99",
    description: "2 box regroupées en une (février + mars)",
    shipping: "Expédition rapide : livraison sous 72h* en lettre suivie (5 €)",
    notes: [
      "Nous serons fermés pour congés en mars",
      "En février : 2 box regroupées en une (février + mars)",
      "Un prélèvement le mois suivant pour la box de mars",
      "Aucun envoi en mars"
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
      "Nous serons fermés pour congés en mars",
      "En février : 2 box regroupées en une (février + mars)",
      "Un prélèvement le mois suivant pour la box de mars",
      "Aucun envoi en mars"
    ],
    images: [
      "/public/lovable-uploads/dd2ef217-a321-430d-890b-a706fa49905a.png",
      "/public/lovable-uploads/dd2ef217-a321-430d-890b-a706fa49905a.png",
      "/public/lovable-uploads/dd2ef217-a321-430d-890b-a706fa49905a.png",
      "/public/lovable-uploads/dd2ef217-a321-430d-890b-a706fa49905a.png",
      "/public/lovable-uploads/dd2ef217-a321-430d-890b-a706fa49905a.png",
      "/public/lovable-uploads/dd2ef217-a321-430d-890b-a706fa49905a.png"
    ],
    itemCount: 6
  }
];

const Pricing = () => {
  const { isEditMode } = useEditStore();
  const [pricingData, setPricingData] = useState<any>({});
  const [basixImages, setBasixImages] = useState<string[]>([]);
  const [premiumImages, setPremiumImages] = useState<string[]>([]);
  const [carouselSpeed, setCarouselSpeed] = useState<number>(5000);
  const [boxImages, setBoxImages] = useState<BoxImagesData>({});
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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
          "pack_premium_features_1", "pack_premium_features_2", "pack_premium_features_3", "pack_premium_features_4",
          "monthly_box_title", "monthly_box_subtitle", "monthly_box_shipping",
          "monthly_pack_pack_basix_name", "monthly_pack_pack_basix_description", "monthly_pack_pack_basix_price", "monthly_pack_pack_basix_shipping",
          "monthly_pack_pack_premium_name", "monthly_pack_pack_premium_description", "monthly_pack_pack_premium_price", "monthly_pack_pack_premium_shipping",
          "monthly_pack_pack_basix_type", "monthly_pack_pack_premium_type",
          "offer_validity",
          "pricing_button_1_text", "pricing_button_1_url",
          "pricing_button_2_text", "pricing_button_2_url"
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
          .in("key_name", ["pack_basix_images", "pack_premium_images"]);

        if (siteImagesError) {
          console.error("❌ Erreur de récupération des images:", siteImagesError);
          return {
            pack_basix_images: [],
            pack_premium_images: [],
            image_carousel_speed: 5000
          };
        }

        console.log("📦 Images récupérées depuis site_content_images:", siteImages);

        const imagesMap: ImagesData = {
          pack_basix_images: [],
          pack_premium_images: [],
          image_carousel_speed: 5000
        };

        if (siteImages && siteImages.length > 0) {
          // Grouper les images par key_name
          siteImages.forEach(item => {
            if (item.key_name === "pack_basix_images" && item.image_url) {
              imagesMap.pack_basix_images.push(item.image_url);
            } else if (item.key_name === "pack_premium_images" && item.image_url) {
              imagesMap.pack_premium_images.push(item.image_url);
            }
          });
          
          console.log("📸 Images groupées par pack:", {
            basix: imagesMap.pack_basix_images.length,
            premium: imagesMap.pack_premium_images.length
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
        speed: imagesData.image_carousel_speed
      });
      
      setBasixImages(imagesData.pack_basix_images || []);
      setPremiumImages(imagesData.pack_premium_images || []);
      setCarouselSpeed(imagesData.image_carousel_speed || 5000);
    }
  }, [imagesData]);

  const [showPalette, setShowPalette] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const plans = [
    {
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
    },
    {
      name: pricingData?.pack_premium_name || "Pack Premium",
      price: pricingData?.pack_premium_price || "49,99",
      image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901",
      features: [
        pricingData?.pack_premium_features_1 || "4 variétés exclusives",
        pricingData?.pack_premium_features_2 || "1 produit d'entretien premium",
        pricingData?.pack_premium_features_3 || "Produit surprise mensuel",
        pricingData?.pack_premium_features_4 || "4 € offerts en rêve points chaque mois",
        "Livraison mensuelle",
        "Support prioritaire",
      ],
      noFeatures: [],
      ideal: "Passionnés",
    },
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, packName: string) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      console.log("❌ Aucun fichier sélectionné");
      return;
    }

    console.log("🚀 Démarrage de l'upload pour", packName, "avec", files.length, "fichiers");
    try {
      let uploadedUrls: string[] = [];
      const contentKey = `pack_${packName.toLowerCase().replace(" ", "_")}_images`;
      console.log("📝 Content key généré:", contentKey);

      // Upload des nouvelles images
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = `carousel/${packName.toLowerCase().replace(" ", "_")}/${Date.now()}-${file.name}`;
        
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

          // Ajouter l'image à site_content_images
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
        }
      }

      // Mettre à jour l'état local
      if (packName === "Pack Basix") {
        console.log("🔄 Mise à jour des images Basix:", uploadedUrls);
        setBasixImages(prev => [...prev, ...uploadedUrls]);
      } else if (packName === "Pack Premium") {
        console.log("🔄 Mise à jour des images Premium:", uploadedUrls);
        setPremiumImages(prev => [...prev, ...uploadedUrls]);
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
        .single();

      if (oldImageData?.image_url) {
        // Extraire le chemin du fichier à partir de l'URL
        const oldUrl = new URL(oldImageData.image_url);
        const oldFilePath = oldUrl.pathname.split('/').pop();
        
        if (oldFilePath) {
          // Supprimer l'ancienne image du stockage
          const { error: deleteError } = await supabase.storage
            .from('public-images')
            .remove([`box_du_mois/${imageKey.split('_').slice(0, 3).join('_')}/${oldFilePath}`]);
          
          if (deleteError) {
            console.error("Erreur lors de la suppression de l'ancienne image:", deleteError);
          } else {
            console.log("✅ Ancienne image supprimée avec succès.");
          }
        }
      }

      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const filePath = `box_du_mois/${imageKey.split('_').slice(0, 3).join('_')}/${fileName}.${fileExt}`;
      console.log("Chemin du fichier généré:", filePath);

      // Upload du fichier vers Supabase Storage
      console.log("Démarrage de l'upload vers storage...");
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('public-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error("Erreur d'upload:", uploadError);
        throw uploadError;
      }

      console.log("Fichier uploadé avec succès:", uploadData);

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('public-images')
        .getPublicUrl(filePath);

      console.log("URL publique générée:", publicUrl);

      // Utiliser upsert au lieu de insert/delete
      const { error: upsertError } = await supabase
        .from('site_content_images')
        .upsert({
          key_name: imageKey,
          image_url: publicUrl,
          created_at: new Date().toISOString()
        }, { 
          onConflict: 'key_name' 
        });

      if (upsertError) {
        console.error("Erreur d'upsert dans la base de données:", upsertError);
        throw upsertError;
      }

      console.log("Base de données mise à jour avec succès");
      
      // Forcer le rechargement des images
      refetchBoxImages();
      
      return publicUrl;
    } catch (error: any) {
      console.error('Détails de l\'erreur:', error);
      console.error('Stack d\'erreur:', error.stack);
      throw error;
    }
  };

  const { data: packImages, refetch: refetchPackImages } = useQuery({
    queryKey: ["pack-images"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content_images").select("*").in("key_name", ["pack_basix", "pack_premium"]);
      return data || [];
    },
  });

  const handleTextUpdate = async (newText: string, contentKey: string) => {
    const { error } = await supabase
      .from("editable_content")
      .update({ content: newText })
      .eq("content_key", contentKey);

    if (!error) {
      refetch();
      console.log("Mise à jour réussie pour :", contentKey);
    } else {
      console.error("Erreur lors de la mise à jour :", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("editable_content")
        .select("content_key, content")
        .in("content_key", ["pricing_title", "pricing_subtitle"]);
      const pricingData = data?.reduce((acc, item) => {
        acc[item.content_key] = item.content;
        return acc;
      }, {});
      setPricingData(pricingData);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (isEditMode) {
      refetch();
    }
  }, [isEditMode, refetch]);

  const monthlyPacksWithSurprise = monthlyPacks.map(pack => {
    if (pack.name === "Pack Premium") {
      const updatedNotes = [...pack.notes];
      updatedNotes.splice(1, 0, "Surprise offerte chaque mois");
      return {
        ...pack,
        notes: updatedNotes
      };
    }
    return pack;
  });

  const containsRevePoints = (text: string): boolean => {
    return text.toLowerCase().includes('rêve points');
  };

  // Ajout d'un useEffect pour le debug
  useEffect(() => {
    console.log("🔍 État actuel des images:", {
      basixImages,
      premiumImages,
      carouselSpeed
    });
  }, [basixImages, premiumImages, carouselSpeed]);

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
          className="w-full h-[90px] md:h-[110px] object-cover aspect-square rounded-lg shadow-md transition-transform duration-500"
        />
      );
    }

    return (
      <div className="relative w-full">
        <img
          src={initialUrl || "https://via.placeholder.com/150?text=Ajouter+une+image"}
          alt=""
          className="w-full h-[90px] md:h-[110px] object-cover aspect-square rounded-lg shadow-md transition-transform duration-500"
          onError={(e) => {
            console.error("Image failed to load:", initialUrl);
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
            .single();

          if (!error && data) {
            setPrice(data.content);
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
          .single();

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
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div key={plan.name} className="pricing-card flex flex-col">
                <Carousel
                  packName={plan.name}
                  images={(plan.name === "Pack Basix" ? basixImages : premiumImages) || []}
                  speed={carouselSpeed}
                  isEditMode={isEditMode}
                  onImagesUpdate={(newImages) => {
                    console.log("🔄 Mise à jour des images du carousel:", {
                      pack: plan.name,
                      newImages
                    });
                    
                    if (plan.name === "Pack Basix") {
                      setBasixImages(newImages);
                    } else {
                      setPremiumImages(newImages);
                    }
                    
                    refetchImages();
                  }}
                />
                {isEditMode && (
                  <div className="flex justify-center mt-2">
                    <button
                      onClick={() => fileInputRefs.current[plan.name]?.click()}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                    >
                      Ajouter des images
                    </button>
                    <input
                      type="file"
                      ref={el => fileInputRefs.current[plan.name] = el}
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(e, plan.name)}
                    />
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2 min-h-[40px] flex items-center justify-center">
                  <EditableText
                    contentKey={plan.name === "Pack Basix" ? "pack_basix_name" : "pack_premium_name"}
                    initialContent={plan.name}
                    onUpdate={(newText) => handleTextUpdate(newText, plan.name === "Pack Basix" ? "pack_basix_name" : "pack_premium_name")}
                  />
                </h3>
                <div className="text-3xl font-bold mb-6 min-h-[40px] flex items-center justify-center">
                  <EditableText
                    contentKey={plan.name === "Pack Basix" ? "pack_basix_price" : "pack_premium_price"}
                    initialContent={plan.price}
                    onUpdate={(newText) => handleTextUpdate(newText, plan.name === "Pack Basix" ? "pack_basix_price" : "pack_premium_price")}
                  />
                  <span className="text-base font-normal text-slate-600">/mois</span>
                </div>
                <div className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, index) => (
                    <div key={`${feature}-${index}`} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex items-center gap-1">
                        <EditableText
                          contentKey={plan.name === "Pack Basix" ? `pack_basix_features_${index + 1}` : `pack_premium_features_${index + 1}`}
                          initialContent={feature}
                          onUpdate={(newText) => handleTextUpdate(newText, plan.name === "Pack Basix" ? `pack_basix_features_${index + 1}` : `pack_premium_features_${index + 1}`)}
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
                  ))}
                  {plan.noFeatures.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-slate-400">
                      <X className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <EditableText
                        contentKey={plan.name === "Pack Basix" ? `pack_basix_no_features_${plan.noFeatures.indexOf(feature) + 1}` : `pack_premium_no_features_${plan.noFeatures.indexOf(feature) + 1}`}
                        initialContent={feature}
                        onUpdate={(newText) => handleTextUpdate(newText, plan.name === "Pack Basix" ? `pack_basix_no_features_${plan.noFeatures.indexOf(feature) + 1}` : `pack_premium_no_features_${plan.noFeatures.indexOf(feature) + 1}`)}
                      />
                    </div>
                  ))}
                </div>
                <div className="text-sm text-slate-600 mb-6">
                  Idéal pour : <span className="font-semibold">{plan.ideal}</span>
                </div>
                <div className="mt-auto">
                  {isEditMode ? (
                    <div className="flex flex-col items-center">
                      <Button className="w-full bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all">
                        <EditableText
                          contentKey={plan.name === "Pack Basix" ? "pricing_button_1_text" : "pricing_button_2_text"}
                          initialContent={buttonData?.[plan.name === "Pack Basix" ? "pricing_button_1_text" : "pricing_button_2_text"] || "Choisir ce pack"}
                          onUpdate={(newText) => handleTextUpdate(newText, plan.name === "Pack Basix" ? "pricing_button_1_text" : "pricing_button_2_text")}
                        />
                      </Button>
                      <EditableURL
                        contentKey={plan.name === "Pack Basix" ? "pricing_button_1_url" : "pricing_button_2_url"}
                        initialContent={buttonData?.[plan.name === "Pack Basix" ? "pricing_button_1_url" : "pricing_button_2_url"] || "#"}
                        onUpdate={(newUrl) => handleTextUpdate(newUrl, plan.name === "Pack Basix" ? "pricing_button_1_url" : "pricing_button_2_url")}
                      />
                    </div>
                  ) : (
                    <a
                      href={buttonData?.[plan.name === "Pack Basix" ? "pricing_button_1_url" : "pricing_button_2_url"]?.startsWith("http") 
                        ? buttonData[plan.name === "Pack Basix" ? "pricing_button_1_url" : "pricing_button_2_url"]
                        : `http://${buttonData?.[plan.name === "Pack Basix" ? "pricing_button_1_url" : "pricing_button_2_url"] || "#"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button className="w-full bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all">
                        {buttonData?.[plan.name === "Pack Basix" ? "pricing_button_1_text" : "pricing_button_2_text"] || "Choisir ce pack"}
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
          <div 
            className="grid md:grid-cols-2 gap-6 md:gap-8" 
            style={{ animationDelay: '0.3s' }}
          >
            {monthlyPacksWithSurprise.map((pack, packIndex) => (
              <div 
                key={pack.name}
                className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg md:rounded-2xl p-4 md:p-8 shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 animate-scale-in min-h-[450px] flex flex-col"
              >
                <div className="bg-primary text-white px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold w-fit mx-auto mb-4 md:mb-6 hover:scale-105 transition-transform duration-300">
                  <EditableText 
                    contentKey={`monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_type`}
                    initialContent={pack.type}
                    onUpdate={(newText) => handleTextUpdate(newText, `monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_type`)}
                  />
                </div>

                <div className={`grid ${pack.name === "Pack Basix" ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"} gap-2 md:gap-4 mb-6 md:mb-8`}>
                  {pack.name === "Pack Basix" ? (
                    // Pack Basix - 4 images en 2x2
                    [...Array(4)].map((_, index) => (
                      <div
                        key={`${pack.name}-image-${index}`}
                        className="relative overflow-hidden rounded-lg flex items-center transform transition-all duration-500 hover:scale-105"
                      >
                        <BoxEditableImage
                          imageKey={`box_mois_pack_basix_image_${index + 1}`}
                          initialUrl={boxImages[`box_mois_pack_basix_image_${index + 1}`] || ""}
                          onUpdate={() => refetchBoxImages()}
                        />
                      </div>
                    ))
                  ) : (
                    // Pack Premium - 6 images en 2x3 sur mobile, 3x2 sur desktop
                    [...Array(6)].map((_, index) => (
                      <div
                        key={`${pack.name}-image-${index}`}
                        className="relative overflow-hidden rounded-lg flex items-center transform transition-all duration-500 hover:scale-105"
                      >
                        <BoxEditableImage
                          imageKey={`box_mois_pack_premium_image_${index + 1}`}
                          initialUrl={boxImages[`box_mois_pack_premium_image_${index + 1}`] || ""}
                          onUpdate={() => refetchBoxImages()}
                        />
                      </div>
                    ))
                  )}
                </div>

                <h3 className="text-lg md:text-2xl font-bold mb-4 min-h-[40px] md:min-h-[50px] text-center">
                  <EditableText 
                    contentKey={`monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_name`}
                    initialContent={pack.name}
                    onUpdate={(newText) => handleTextUpdate(newText, `monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_name`)}
                  />
                </h3>
                <div className="flex justify-center items-baseline gap-3 mb-4 md:mb-5">
                  <div className="flex items-baseline animate-pulse">
                    <span className="text-2xl md:text-4xl font-bold text-primary">
                      <EditableText 
                        contentKey={`monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_price`}
                        initialContent={pack.promoPrice || "0"}
                        onUpdate={(newText) => handleTextUpdate(newText, `monthly_pack_${pack.name.toLowerCase().replace(" ", "_")}_price`)}
                      />
                    </span>
                    <span className="text-xl md:text-2xl font-bold text-primary ml-1">€</span>
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
                <p className="text-slate-600 text-center text-xs md:text-sm flex items-center justify-center px-3 md:px-6 mb-6 md:mb-8">
                  <EditableText 
                    contentKey={`monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_description`}
                    initialContent={pack.description.replace("?", ".")}
                    onUpdate={(newText) => handleTextUpdate(newText, `monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_description`)}
                  />
                </p>
                <div className="bg-white/80 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4 mb-4 md:mb-6 min-h-[180px] md:min-h-[200px]">
                  <p className="text-xs md:text-sm text-slate-600 mb-2 md:mb-4">
                    <EditableText 
                      contentKey={`monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_shipping`}
                      initialContent={pack.shipping}
                      onUpdate={(newText) => handleTextUpdate(newText, `monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_shipping`)}
                    />
                  </p>
                  <ul className="space-y-1.5 md:space-y-2">
                    {pack.notes.map((note, index) => {
                      const showGiftIcon = note.includes("Bambou Amtra");
                      const isSecondToLast = index === pack.notes.length - 2;
                      const noteKey = `monthly_pack_${pack.name.replace(" ", "_").toLowerCase()}_note_${index}`;

                      return (
                        <li key={index} className="text-xs md:text-sm flex flex-col">
                          <div className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>
                            <div className="flex flex-col gap-1 flex-grow">
                              <span className="flex items-center gap-1">
                                {showGiftIcon && <Gift className="h-3 w-3 text-primary mr-1 flex-shrink-0" />}
                                <EditableText 
                                  contentKey={noteKey}
                                  initialContent={note}
                                  onUpdate={(newText) => handleTextUpdate(newText, noteKey)}
                                />
                                {isSecondToLast && !note.includes("JBL Pronova") && pack.name !== "Pack Basix" && (
                                  <MobileTooltip
                                    content={
                                      <EditableText
                                        contentKey="monthly_pack_help_tooltip"
                                        initialContent="Information importante concernant votre commande"
                                        onUpdate={(newText) => handleTextUpdate(newText, "monthly_pack_help_tooltip")}
                                      />
                                    }
                                  >
                                    <span className="cursor-help">
                                      <HelpCircle className="h-4 w-4 text-slate-500 hover:text-primary transition-colors" />
                                    </span>
                                  </MobileTooltip>
                                )}
                              </span>
                              <EditableProductPrice
                                contentKey={noteKey}
                                onUpdate={async (newValue) => {
                                  await handleTextUpdate(newValue, `${noteKey}_product_price`);
                                }}
                              />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="mt-auto">
                  <a
                    href={buttonData?.[pack.name === "Pack Basix" ? "pricing_button_1_url" : "pricing_button_2_url"]?.startsWith("http") 
                      ? buttonData[pack.name === "Pack Basix" ? "pricing_button_1_url" : "pricing_button_2_url"]
                      : `http://${buttonData?.[pack.name === "Pack Basix" ? "pricing_button_1_url" : "pricing_button_2_url"] || "#"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all">
                      <EditableText 
                        contentKey={pack.name === "Pack Basix" ? "pricing_button_1_text" : "pricing_button_2_text"}
                        initialContent={buttonData?.[pack.name === "Pack Basix" ? "pricing_button_1_text" : "pricing_button_2_text"] || "Commander maintenant"}
                        onUpdate={(newText) => handleTextUpdate(newText, pack.name === "Pack Basix" ? "pricing_button_1_text" : "pricing_button_2_text")}
                      />
                    </Button>
                  </a>
                  <EditableURL
                    contentKey={pack.name === "Pack Basix" ? "pricing_button_1_url" : "pricing_button_2_url"}
                    initialContent={buttonData?.[pack.name === "Pack Basix" ? "pricing_button_1_url" : "pricing_button_2_url"] || "#"}
                    onUpdate={(newUrl) => handleTextUpdate(newUrl, pack.name === "Pack Basix" ? "pricing_button_1_url" : "pricing_button_2_url")}
                  />
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