
import { useState } from "react";
import { useEditStore } from "@/stores/useEditStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Check, Pencil, X } from "lucide-react";

interface EditableURLProps {
  contentKey: string;
  initialContent: string;
  onUpdate?: (newContent: string) => void;
  className?: string;
}

export const EditableURL = ({
  contentKey,
  initialContent,
  onUpdate,
  className = ""
}: EditableURLProps) => {
  const { isEditMode } = useEditStore();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('editable_content')
        .upsert({
          content_key: contentKey,
          content: content
        }, {
          onConflict: 'content_key'
        });

      if (error) throw error;

      toast({
        title: "URL mise à jour",
        description: "Les modifications ont été enregistrées avec succès",
      });

      setIsEditing(false);
      if (onUpdate) onUpdate(content);
    } catch (error) {
      console.error('Error updating URL:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour de l'URL",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setContent(initialContent);
    setIsEditing(false);
  };

  if (!isEditMode) {
    return null;
  }

  if (isEditing) {
    return (
      <div className={`bg-white p-4 rounded-lg shadow-md mt-2 ${className}`}>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Modifier l'URL</h3>
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mb-2"
          placeholder="Entrez l'URL"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={handleSave}
            className="flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            Sauvegarder
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center mt-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        className="bg-white/90 text-primary hover:bg-white flex items-center gap-1"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="w-3 h-3" />
        Modifier l'URL du bouton ({content})
      </Button>
    </div>
  );
};
