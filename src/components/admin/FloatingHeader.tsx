
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit, LogOut, Save } from "lucide-react";
import { useEditStore } from "@/stores/useEditStore";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const FloatingHeader = () => {
  const { isEditMode, setEditMode, checkAdminStatus, isAdmin } = useEditStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Vous pouvez ajouter ici toute logique de sauvegarde supplémentaire
      
      toast({
        title: "Modifications enregistrées",
        description: "Toutes les modifications ont été sauvegardées avec succès",
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erreur de déconnexion",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setEditMode(false);
    navigate("/");
    toast({
      title: "Déconnexion réussie",
      description: "Vous avez été déconnecté avec succès",
    });
  };

  // Ne montrer le header que si l'utilisateur est admin
  if (!isAdmin) return null;

  return (
    <div className="fixed top-24 right-4 z-50 flex gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-lg">
      <Button
        variant={isEditMode ? "default" : "outline"}
        size="sm"
        onClick={() => setEditMode(!isEditMode)}
        className="flex items-center gap-2"
      >
        <Edit className="h-4 w-4" />
        {isEditMode ? "Mode Édition Actif" : "Activer Mode Édition"}
      </Button>
      {isEditMode && (
        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        className="flex items-center gap-2"
      >
        <LogOut className="h-4 w-4" />
        Déconnexion
      </Button>
    </div>
  );
};

export default FloatingHeader;
