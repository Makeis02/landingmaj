import { useState } from "react";
import { useEditStore } from "@/stores/useEditStore";
import { UploadButton } from "./ui/upload-button";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useToast } from "@/components/ui/use-toast";

interface EditableImageProps {
  imageKey: string;
  initialUrl: string;
  className?: string;
  onUpdate?: (newUrl: string) => void;
  children?: ({ openFileDialog }: { openFileDialog: () => void }) => React.ReactElement;
  forceEditable?: boolean;
  disableDefaultPersistence?: boolean;
}

export const EditableImage = ({ 
  imageKey,
  initialUrl,
  className = "",
  onUpdate,
  children,
  forceEditable = false,
  disableDefaultPersistence = false
}: EditableImageProps) => {
  console.log("=== EditableImage Component Render ===");
  console.log("Props received:", { imageKey, initialUrl, className });
  
  const { isEditMode } = useEditStore();
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const { toast } = useToast();
  
  const { isUploading, isAuthenticated, handleImageUpload } = useImageUpload({
    imageKey,
    onUpdate: (newUrl) => {
      console.log("onUpdate callback received new URL:", newUrl);
      setImageUrl(newUrl);
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
