
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { SuggestionGroupsList } from "./SuggestionGroupsList";
import { useState } from "react";
import { SuggestionGroupForm } from "./SuggestionGroupForm";
import { useToast } from "@/hooks/use-toast";

export const SuggestionsPanel = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings } = useQuery({
    queryKey: ["suggestion-settings"],
    queryFn: async () => {
      // Récupérer le premier enregistrement uniquement
      const { data, error } = await supabase
        .from("suggestion_settings")
        .select("*")
        .single();

      if (error) {
        // Si aucun enregistrement n'existe, en créer un avec les valeurs par défaut
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: createError } = await supabase
            .from("suggestion_settings")
            .insert({
              is_enabled: true,
              max_suggestions: 3,
              suggestion_source: 'manual',
              display_mode: 'all'
            })
            .select()
            .single();

          if (createError) throw createError;
          return newSettings;
        }
        throw error;
      }

      return data;
    },
  });

  const toggleSuggestions = async () => {
    try {
      if (!settings) {
        toast({
          title: "Erreur",
          description: "Impossible de modifier les paramètres",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("suggestion_settings")
        .update({ is_enabled: !settings.is_enabled })
        .eq("id", settings.id);

      if (error) throw error;

      // Invalider le cache pour recharger les données
      await queryClient.invalidateQueries({ queryKey: ["suggestion-settings"] });
      
      toast({
        title: "Succès",
        description: `Suggestions ${!settings.is_enabled ? "activées" : "désactivées"}`,
      });
    } catch (error) {
      console.error("Error toggling suggestions:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la modification",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Suggestions de produits</h2>
          <p className="text-sm text-gray-500">Gérez les suggestions de produits complémentaires</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={settings?.is_enabled || false}
              onCheckedChange={toggleSuggestions}
            />
            <span className="text-sm">
              {settings?.is_enabled ? "Activé" : "Désactivé"}
            </span>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau groupe
          </Button>
        </div>
      </div>

      <SuggestionGroupsList />

      <SuggestionGroupForm 
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </div>
  );
};
