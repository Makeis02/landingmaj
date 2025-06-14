import { useState } from "react";
import { useEditStore } from "@/stores/useEditStore";
import { UploadButton } from "./ui/upload-button";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/integrations/supabase/client';

interface EditableImageProps {
  imageKey: string;
  initialUrl: string;
  className?: string;
  onUpdate?: (newUrl: string) => void;
  children?: ({ openFileDialog }: { openFileDialog: () => void }) => React.ReactElement;
  forceEditable?: boolean;
}

export const EditableImage = ({ 
  imageKey,
  initialUrl,
  className = "",
  onUpdate,
  children,
  forceEditable = false
}: EditableImageProps) => {
  console.log("=== EditableImage Component Render ===");
  console.log("Props received:", { imageKey, initialUrl, className });
  
  const { isEditMode } = useEditStore();
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const { toast } = useToast();
  
  const { isUploading, isAuthenticated, handleImageUpload } = useImageUpload({
    imageKey,
    onUpdate: async (newUrl) => {
      console.log("onUpdate callback received new URL:", newUrl);
      setImageUrl(newUrl);
      
      // Sauvegarder l'URL dans editable_content en utilisant upsert avec onConflict
      try {
        const { error } = await supabase
          .from('editable_content')
          .upsert(
            { content_key: imageKey, content: newUrl },
            { onConflict: 'content_key' } // Indique à upsert d'utiliser content_key pour détecter les conflits
          );
        
        if (error) {
          console.error("Error saving image URL:", error);
          toast({
            title: "Erreur",
            description: "L'image a été uploadée mais n'a pas pu être sauvegardée",
            variant: "destructive",
          });
        } else {
          console.log("Image URL saved successfully in editable_content");
          toast({
            title: "Succès",
            description: "L'image a été sauvegardée avec succès",
          });
        }
      } catch (error) {
        console.error("Error in onUpdate:", error);
        toast({
          title: "Erreur",
          description: "Une erreur inattendue est survenue lors de la sauvegarde de l'image",
          variant: "destructive",
        });
      }

      if (onUpdate) {
        console.log("Calling parent onUpdate with new URL");
        onUpdate(newUrl);
      }
    }
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("=== File Change Event Triggered ===");
    const file = event.target.files?.[0];
    
    if (file) {
      console.log("File selected:", {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      if (!isAuthenticated) {
        console.log("User not authenticated!");
        toast({
          title: "Non autorisé",
          description: "Vous devez être connecté pour modifier les images. Veuillez vous connecter.",
          variant: "destructive",
        });
        return;
      }
      
      try {
        console.log("Starting upload process...");
        await handleImageUpload(file);
      } catch (error) {
        console.error("Upload failed:", error);
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors du téléversement de l'image. Veuillez réessayer.",
          variant: "destructive",
        });
      }
      
      // Reset input
      event.target.value = '';
    } else {
      console.log("No file selected");
    }
  };

  const openFileDialog = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e) => {
      const event = e as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(event);
    };
    fileInput.click();
  };

  console.log("Component state:", {
    isEditMode,
    isUploading,
    isAuthenticated,
    currentImageUrl: imageUrl
  });

  if (!isEditMode && !forceEditable) {
    return <img src={imageUrl} alt="" className={className} />;
  }

  if (children) {
    return children({ openFileDialog });
  }

  return (
    <div className="relative group">
      <img
        src={imageUrl}
        alt=""
        className={className}
        onError={() => {
          console.error("Image failed to load:", imageUrl);
          toast({
            title: "Erreur",
            description: "L'image n'a pas pu être chargée",
            variant: "destructive",
          });
        }}
      />
      <div 
        className="absolute inset-0 bg-black/10 hover:bg-black/50 transition-all duration-300 flex items-center justify-center cursor-pointer"
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
          style={{ cursor: 'pointer' }}
          disabled={isUploading}
        />
        <UploadButton isUploading={isUploading} />
      </div>
    </div>
  );
};
