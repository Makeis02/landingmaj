import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface UseImageUploadProps {
  imageKey: string;
  onUpdate?: (newUrl: string) => void;
}

export const useImageUpload = ({ imageKey, onUpdate }: UseImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      console.log("=== Checking Authentication Status ===");
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Session status:", session ? "Present" : "Not present");
      setIsAuthenticated(!!session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed. Session:", session ? "Present" : "Not present");
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleImageUpload = async (file: File) => {
    console.log("=== Starting Image Upload Process ===");
    console.log("Image key:", imageKey);
    console.log("File details:", {
      name: file.name,
      size: file.size,
      type: file.type
    });

    if (!file) {
      console.log("No file provided");
      return;
    }

    try {
      if (!isAuthenticated) {
        console.log("User not authenticated, redirecting to login");
        toast({
          title: "Non autorisé",
          description: "Vous devez être connecté pour modifier les images",
          variant: "destructive",
        });
        navigate("/admin-login");
        return;
      }

      setIsUploading(true);
      console.log("Upload state set to true");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.log("No active session found");
        throw new Error("User not authenticated");
      }
      console.log("User authenticated:", session.user.id);

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("L'image ne doit pas dépasser 5MB");
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const filePath = `${fileName}.${fileExt}`;
      console.log("Generated file path:", filePath);

      console.log("Starting file upload to storage...");
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('public-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("File uploaded successfully:", uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('public-images')
        .getPublicUrl(filePath);

      console.log("Public URL generated:", publicUrl);

      const { error: dbError } = await supabase
        .from('site_content_images')
        .upsert({
          key_name: imageKey,
          image_url: publicUrl,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'key_name,image_url'
        });

      if (dbError) {
        console.error("Content update error:", dbError);
        throw dbError;
      }

      console.log("Successfully updated site_content_images table");

      if (onUpdate) {
        console.log("Calling onUpdate with new URL:", publicUrl);
        onUpdate(publicUrl);
      }

      toast({
        title: "Succès",
        description: "L'image a été mise à jour",
      });

      console.log("=== Image upload process completed successfully ===");
      return publicUrl;

    } catch (error: any) {
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      
      let errorMessage = "Une erreur est survenue lors du téléversement de l'image";
      if (error.message?.includes('Authentication')) {
        errorMessage = "Session expirée, veuillez vous reconnecter";
        navigate("/admin-login");
      } else if (error.message?.includes('permission')) {
        errorMessage = "Vous n'avez pas les permissions nécessaires";
      } else if (error.message?.includes('5MB')) {
        errorMessage = "L'image ne doit pas dépasser 5MB";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
      console.log("Upload state reset to false");
    }
  };

  return {
    isUploading,
    isAuthenticated,
    handleImageUpload
  };
};
