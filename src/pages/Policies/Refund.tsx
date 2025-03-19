import React, { useState, useEffect } from "react";
import PolicyLayout from "../../components/policy/PolicyLayout";
import { EditableText } from "@/components/EditableText";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, PlusCircle } from "lucide-react";
import { useEditStore } from "@/stores/useEditStore";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

interface Paragraph {
  id: number;
  content: string;
  initialContent: string;
}

interface Section {
  id: number;
  title: string;
  content: string;
  initialContent: string;
  paragraphs: Paragraph[];
}

const Refund = () => {
  const policyType = 'refund'; // Identifiant unique pour la politique de remboursement
  const { isEditMode } = useEditStore();
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);

  // Chargement initial des données depuis Supabase
  const { data: policyData, refetch } = useQuery({
    queryKey: ["policy-content", policyType],
    queryFn: async () => {
      try {
        console.log("🔄 Début du chargement des données");
        const { data, error } = await supabase
          .from("editable_content")
          .select("content_key, content")
          .or(`content_key.like.${policyType}_section_%,content_key.like.${policyType}_objet%`);

        if (error) throw error;

        console.log("📥 Données brutes reçues:", data?.length, "entrées");

        // Organiser les données en sections et paragraphes
        const sectionsMap = new Map<number, Section>();
        
        // Créer la première section (Objet)
        sectionsMap.set(1, {
          id: 1,
          title: "Objet",
          content: `${policyType}_objet`,
          initialContent: "La présente politique de remboursement",
          paragraphs: []
        });

        // Première passe : traiter les sections
        data?.forEach(item => {
          const key = item.content_key;
          if (key.includes("_title")) {
            const match = key.match(new RegExp(`${policyType}_section_(\\d+)_title`));
            if (match) {
              const sectionId = parseInt(match[1]);
              if (!isNaN(sectionId) && sectionId > 0) {
                const sectionKey = `${policyType}_section_${sectionId}`;
                if (!sectionsMap.has(sectionId)) {
                  sectionsMap.set(sectionId, {
                    id: sectionId,
                    title: item.content,
                    content: sectionKey,
                    initialContent: item.content,
                    paragraphs: []
                  });
                }
              }
            }
          }
        });

        // Deuxième passe : traiter les paragraphes
        data?.forEach(item => {
          const key = item.content_key;
          
          // Paragraphes de la première section (Objet)
          if (key.startsWith(`${policyType}_objet_para`)) {
            const match = key.match(new RegExp(`${policyType}_objet_para(\\d+)`));
            if (match) {
              const paraId = parseInt(match[1]);
              if (!isNaN(paraId)) {
                const section = sectionsMap.get(1);
                if (section) {
                  section.paragraphs.push({
                    id: paraId,
                    content: key,
                    initialContent: item.content
                  });
                }
              }
            }
          }
          // Paragraphes des autres sections
          else if (key.includes("_para")) {
            const match = key.match(new RegExp(`${policyType}_section_(\\d+)_para(\\d+)`));
            if (match) {
              const [_, sectionId, paraId] = match;
              const section = sectionsMap.get(parseInt(sectionId));
              if (section) {
                section.paragraphs.push({
                  id: parseInt(paraId),
                  content: key,
                  initialContent: item.content
                });
              }
            }
          }
        });

        // Trier les paragraphes par ID pour chaque section
        sectionsMap.forEach(section => {
          section.paragraphs.sort((a, b) => a.id - b.id);
        });

        return Array.from(sectionsMap.values()).sort((a, b) => a.id - b.id);
      } catch (error) {
        console.error("❌ Erreur lors du chargement des données:", error);
        return [];
      }
    }
  });

  // Synchroniser l'état local avec les données de Supabase
  useEffect(() => {
    if (policyData) {
      setSections(policyData);
    }
  }, [policyData]);

  // Fonction pour sauvegarder dans Supabase
  const saveToSupabase = async (contentKey: string, content: string) => {
    try {
      const { error } = await supabase
        .from('editable_content')
        .upsert({ 
          content_key: contentKey, 
          content,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder les modifications",
          variant: "destructive"
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      return false;
    }
  };

  // Fonction pour supprimer de Supabase
  const deleteFromSupabase = async (contentKey: string) => {
    try {
      const { error } = await supabase
        .from('editable_content')
        .delete()
        .eq('content_key', contentKey);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer l'élément",
          variant: "destructive"
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      return false;
    }
  };

  const addSection = async () => {
    try {
      // Récupérer toutes les sections existantes
      const { data: existingSections, error: fetchError } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .like('content_key', `${policyType}_section_%_title`);

      if (fetchError) throw fetchError;

      // Extraire et valider les IDs des sections
      const sectionIds = (existingSections || [])
        .map(item => {
          const match = item.content_key.match(new RegExp(`${policyType}_section_(\\d+)_title`));
          return match ? parseInt(match[1]) : 0;
        })
        .filter(id => id > 0)
        .sort((a, b) => a - b);

      // Trouver le prochain ID disponible
      let newId = 1;
      while (sectionIds.includes(newId)) {
        newId++;
      }

      const sectionKey = `${policyType}_section_${newId}`;
      const titleKey = `${sectionKey}_title`;
      const defaultTitle = "Nouvelle section";

      // Créer la nouvelle section dans Supabase
      const { error: insertError } = await supabase
        .from('editable_content')
        .insert([
          {
            content_key: titleKey,
            content: defaultTitle,
            updated_at: new Date().toISOString()
          }
        ]);

      if (insertError) throw insertError;

      // Créer la nouvelle section dans l'état local
      const newSection = {
        id: newId,
        title: defaultTitle,
        content: sectionKey,
        initialContent: defaultTitle,
        paragraphs: []
      };

      setSections(prev => [...prev, newSection].sort((a, b) => a.id - b.id));
      await refetch();

      toast({
        title: "Succès",
        description: "Nouvelle section ajoutée"
      });

      return newSection;
    } catch (error) {
      console.error('Erreur lors de la création de la section:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création de la section",
        variant: "destructive"
      });
      throw error;
    }
  };

  const removeSection = async (id: number) => {
    const sectionToRemove = sections.find(s => s.id === id);
    if (!sectionToRemove) return;

    // Supprimer tous les paragraphes de la section de Supabase
    for (const paragraph of sectionToRemove.paragraphs) {
      await deleteFromSupabase(paragraph.content);
    }

    // Supprimer le titre de la section de Supabase
    const deleted = await deleteFromSupabase(`${sectionToRemove.content}_title`);

    if (deleted) {
      setSections(prev => prev.filter(s => s.id !== id));
      refetch();
      toast({
        title: "Succès",
        description: "Section supprimée"
      });
    }
  };

  const addParagraph = async (sectionId: number) => {
    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) throw new Error("Section introuvable");

      // Déterminer la clé de base pour les paragraphes
      const baseKey = sectionId === 1 ? `${policyType}_objet` : `${policyType}_section_${sectionId}`;

      // Récupérer tous les paragraphes existants pour cette section
      const { data: existingParagraphs, error: fetchError } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .like('content_key', `${baseKey}_para%`);

      if (fetchError) throw fetchError;

      // Extraire et valider les IDs des paragraphes
      const paragraphIds = (existingParagraphs || [])
        .map(item => {
          const match = item.content_key.match(/_para(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(id => id > 0)
        .sort((a, b) => a - b);

      // Trouver le prochain ID disponible
      let newParagraphId = 1;
      while (paragraphIds.includes(newParagraphId)) {
        newParagraphId++;
      }

      const paragraphKey = `${baseKey}_para${newParagraphId}`;
      const defaultContent = "Nouveau paragraphe...";

      // Créer le nouveau paragraphe dans Supabase
      const { error: insertError } = await supabase
        .from('editable_content')
        .insert({
          content_key: paragraphKey,
          content: defaultContent,
          updated_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Mettre à jour l'état local
      setSections(prev => prev.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            paragraphs: [...s.paragraphs, {
              id: newParagraphId,
              content: paragraphKey,
              initialContent: defaultContent
            }].sort((a, b) => a.id - b.id)
          };
        }
        return s;
      }));

      await refetch();

      toast({
        title: "Succès",
        description: "Nouveau paragraphe ajouté"
      });
    } catch (error) {
      console.error('Erreur lors de la création du paragraphe:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du paragraphe",
        variant: "destructive"
      });
    }
  };

  const removeParagraph = async (sectionId: number, paragraphId: number) => {
    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) throw new Error("Section introuvable");

      const paragraphToRemove = section.paragraphs.find(p => p.id === paragraphId);
      if (!paragraphToRemove) throw new Error("Paragraphe introuvable");

      // Supprimer le paragraphe de Supabase
      const deleted = await deleteFromSupabase(paragraphToRemove.content);

      if (deleted) {
        setSections(prev => prev.map(s => {
          if (s.id === sectionId) {
            return {
              ...s,
              paragraphs: s.paragraphs.filter(p => p.id !== paragraphId)
            };
          }
          return s;
        }));

        await refetch();

        toast({
          title: "Succès",
          description: "Paragraphe supprimé"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du paragraphe:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression",
        variant: "destructive"
      });
    }
  };

  return (
    <PolicyLayout title="Politique de Remboursement" contentKey={policyType}>
      <div className={cn(
        "flex flex-col",
        isEditMode ? "gap-4" : "gap-2"
      )}>
        {sections.map((section, sectionIndex) => {
          const isFirstSection = sectionIndex === 0;
          const isLastSection = sectionIndex === sections.length - 1;
          const hasNextSectionWithParagraphs = !isLastSection && sections[sectionIndex + 1].paragraphs.length > 0;
          const hasPrevSectionWithParagraphs = !isFirstSection && sections[sectionIndex - 1].paragraphs.length > 0;

          return (
            <section 
              key={section.id} 
              className={cn(
                "relative group",
                !isEditMode && section.paragraphs.length === 0 && [
                  "transition-spacing duration-200",
                  !hasPrevSectionWithParagraphs && "mt-0",
                  !hasNextSectionWithParagraphs && "mb-0"
                ]
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h2 className={cn(
                    "text-2xl font-bold text-slate-900",
                    section.paragraphs.length === 0 && !isEditMode ? "mb-0" : "mb-3"
                  )}>
                    <EditableText
                      contentKey={`${section.content}_title`}
                      initialContent={`${sectionIndex + 1}. ${section.title}`}
                      className="block"
                    />
                  </h2>
                  {(section.paragraphs.length > 0 || isEditMode) && (
                    <div className={cn(
                      "prose max-w-none",
                      isEditMode ? "space-y-3" : "space-y-2"
                    )}>
                      {section.paragraphs.map((paragraph, paraIndex) => {
                        const isLastParagraph = paraIndex === section.paragraphs.length - 1;
                        
                        return (
                          <div 
                            key={paragraph.id} 
                            className={cn(
                              "relative group/para",
                              !isEditMode && isLastParagraph && !hasNextSectionWithParagraphs && "mb-0"
                            )}
                          >
                            <EditableText
                              contentKey={paragraph.content}
                              initialContent={paragraph.initialContent}
                              className="block"
                            />
                            {isEditMode && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/para:opacity-100 transition-opacity"
                                onClick={() => removeParagraph(section.id, paragraph.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {isEditMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "text-primary hover:text-primary/80",
                        section.paragraphs.length === 0 ? "mt-1" : "mt-2"
                      )}
                      onClick={() => addParagraph(section.id)}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Ajouter un paragraphe
                    </Button>
                  )}
                </div>
                {isEditMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeSection(section.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            </section>
          );
        })}
        
        {isEditMode && (
          <Button
            variant="outline"
            className="w-full py-6 border-dashed mt-4"
            onClick={addSection}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une section
          </Button>
        )}
      </div>
    </PolicyLayout>
  );
};

export default Refund;
