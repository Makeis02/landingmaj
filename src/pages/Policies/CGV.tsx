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

const CGV = () => {
  const { isEditMode } = useEditStore();
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);

  // Chargement initial des données depuis Supabase
  const { data: cgvData, refetch } = useQuery({
    queryKey: ["cgv-content"],
    queryFn: async () => {
      try {
        console.log("🔄 Début du chargement des données");
        const { data, error } = await supabase
          .from("editable_content")
          .select("content_key, content")
          .or('content_key.like.cgv_section_%,content_key.like.cgv_objet%');

        if (error) throw error;

        console.log("📥 Données brutes reçues:", data?.length, "entrées");

        // Organiser les données en sections et paragraphes
        const sectionsMap = new Map<number, Section>();
        
        // Créer la première section (Objet)
        sectionsMap.set(1, {
          id: 1,
          title: "Objet",
          content: "cgv_objet",
          initialContent: "Les présentes conditions générales de vente",
          paragraphs: []
        });

        // Première passe : traiter les sections
        console.log("📑 Traitement des sections...");
        data?.forEach(item => {
          const key = item.content_key;
          if (key.includes("_title")) {
            const match = key.match(/cgv_section_(\d+)_title/);
            if (match) {
              const sectionId = parseInt(match[1]);
              if (!isNaN(sectionId) && sectionId > 0) {
                console.log(`➕ Section ${sectionId} trouvée:`, key);
                const sectionKey = `cgv_section_${sectionId}`;
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
        console.log("📝 Traitement des paragraphes...");
        data?.forEach(item => {
          const key = item.content_key;
          
          // Paragraphes de la première section (Objet)
          if (key.startsWith('cgv_objet_para')) {
            const match = key.match(/cgv_objet_para(\d+)/);
            if (match) {
              const paraId = parseInt(match[1]);
              if (!isNaN(paraId)) {
                console.log(`📌 Paragraphe ${paraId} pour la section Objet`);
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
            const match = key.match(/cgv_section_(\d+)_para(\d+)/);
            if (match) {
              const [_, sectionId, paraId] = match;
              const section = sectionsMap.get(parseInt(sectionId));
              if (section) {
                console.log(`📌 Paragraphe ${paraId} pour la section ${sectionId}`);
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
        console.log("🔄 Tri final des données...");
        sectionsMap.forEach((section, id) => {
          section.paragraphs.sort((a, b) => a.id - b.id);
          console.log(`📊 Section ${id}:`, {
            id: section.id,
            titre: section.title,
            nombreParagraphes: section.paragraphs.length,
            paragraphes: section.paragraphs.map(p => ({id: p.id, key: p.content}))
          });
        });

        const sortedSections = Array.from(sectionsMap.values())
          .sort((a, b) => a.id - b.id);

        console.log("✅ Organisation finale:", 
          sortedSections.map(s => ({
            id: s.id,
            titre: s.title,
            nombreParagraphes: s.paragraphs.length
          }))
        );

        return sortedSections;
      } catch (error) {
        console.error("❌ Erreur lors du chargement des CGV:", error);
        return [];
      }
    }
  });

  // Synchroniser l'état local avec les données de Supabase
  useEffect(() => {
    if (cgvData) {
      setSections(cgvData);
    }
  }, [cgvData]);

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
      console.log("🚀 Début de la création d'une nouvelle section");
      
      // Récupérer toutes les sections existantes avec une requête plus précise
      const { data: existingSections, error: fetchError } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .like('content_key', 'cgv_section_%_title');

      if (fetchError) {
        console.error("❌ Erreur lors de la récupération des sections:", fetchError);
        throw fetchError;
      }

      console.log("📑 Sections existantes:", existingSections);

      // Extraire et valider les IDs des sections
      const sectionIds = (existingSections || [])
        .map(item => {
          const match = item.content_key.match(/cgv_section_(\d+)_title/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(id => id > 0)
        .sort((a, b) => a - b);

      console.log("🔢 IDs des sections existantes:", sectionIds);

      // Trouver le prochain ID disponible
      let newId = 1;
      while (sectionIds.includes(newId)) {
        newId++;
      }

      console.log("✨ Nouvel ID de section:", newId);

      const sectionKey = `cgv_section_${newId}`;
      const titleKey = `${sectionKey}_title`;
      const defaultTitle = "Nouvelle section";
      
      console.log("📝 Création de la section:", {
        sectionKey,
        titleKey,
        defaultTitle
      });

      // Vérifier d'abord qu'aucune entrée n'existe avec ces clés
      const { data: existingCheck } = await supabase
        .from('editable_content')
        .select('content_key')
        .or(`content_key.eq.${sectionKey},content_key.eq.${titleKey}`);

      if (existingCheck && existingCheck.length > 0) {
        console.log("⚠️ Nettoyage des entrées existantes...");
        await supabase
          .from('editable_content')
          .delete()
          .or(`content_key.eq.${sectionKey},content_key.eq.${titleKey}`);
      }

      // Créer la nouvelle section
      const { data: insertedData, error: insertError } = await supabase
        .from('editable_content')
        .insert([
          {
            content_key: titleKey,
            content: defaultTitle,
            updated_at: new Date().toISOString()
          },
          {
            content_key: sectionKey,
            content: defaultTitle,
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (insertError) {
        console.error("❌ Erreur lors de l'insertion:", insertError);
        throw insertError;
      }

      if (!insertedData || insertedData.length !== 2) {
        throw new Error("Les données n'ont pas été correctement insérées");
      }

      console.log("✅ Section créée:", insertedData);

      // Vérifier que la section a bien été créée
      const { data: verifyData, error: verifyError } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .or(`content_key.eq.${sectionKey},content_key.eq.${titleKey}`);

      if (verifyError || !verifyData || verifyData.length !== 2) {
        console.error("❌ Erreur lors de la vérification:", verifyError);
        throw new Error("La section n'a pas été correctement créée");
      }

      // Créer la nouvelle section dans l'état local
      const newSection = {
        id: newId,
        title: defaultTitle,
        content: sectionKey,
        initialContent: defaultTitle,
        paragraphs: []
      };

      // Mettre à jour l'état local
      setSections(prev => {
        const updated = [...prev, newSection].sort((a, b) => a.id - b.id);
        console.log("📊 État mis à jour:", updated);
        return updated;
      });
      
      // Recharger les données
      await refetch();
      
      toast({
        title: "Succès",
        description: "Nouvelle section ajoutée"
      });

      return newSection;
    } catch (error) {
      console.error('❌ Erreur lors de la création de la section:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la création de la section",
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
      refetch(); // Recharger les données
      toast({
        title: "Succès",
        description: "Section supprimée"
      });
    }
  };

  const addParagraph = async (sectionId: number) => {
    try {
      console.log("🚀 Début de l'ajout d'un paragraphe");
      console.log("📌 Section cible:", sectionId);

      // Vérifier la section
      const section = sections.find(s => s.id === sectionId);
      if (!section) {
        throw new Error(`Section ${sectionId} introuvable`);
      }

      // Déterminer la clé de base pour les paragraphes
      const baseKey = sectionId === 1 ? 'cgv_objet' : `cgv_section_${sectionId}`;
      console.log("🔑 Clé de base:", baseKey);

      // Récupérer tous les paragraphes existants pour cette section spécifique
      const { data: existingParagraphs, error: fetchError } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .like('content_key', `${baseKey}_para%`);

      if (fetchError) {
        console.error("❌ Erreur lors de la récupération des paragraphes:", fetchError);
        throw fetchError;
      }

      console.log("📑 Paragraphes existants:", existingParagraphs);

      // Extraire et valider les IDs des paragraphes
      const paragraphIds = (existingParagraphs || [])
        .map(item => {
          const match = item.content_key.match(/_para(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(id => id > 0)
        .sort((a, b) => a - b);

      console.log("🔢 IDs des paragraphes:", paragraphIds);

      // Trouver le prochain ID disponible
      let newParagraphId = 1;
      while (paragraphIds.includes(newParagraphId)) {
        newParagraphId++;
      }

      const paragraphKey = `${baseKey}_para${newParagraphId}`;
      const defaultContent = "Nouveau paragraphe...";

      console.log("✨ Création du paragraphe:", {
        key: paragraphKey,
        id: newParagraphId,
        content: defaultContent
      });

      // Insérer le nouveau paragraphe
      const { data: insertedData, error: insertError } = await supabase
        .from('editable_content')
        .insert({
          content_key: paragraphKey,
          content: defaultContent,
          updated_at: new Date().toISOString()
        })
        .select();

      if (insertError) {
        console.error("❌ Erreur lors de l'insertion:", insertError);
        throw insertError;
      }

      if (!insertedData || insertedData.length === 0) {
        throw new Error("Aucune donnée n'a été insérée");
      }

      console.log("✅ Paragraphe inséré:", insertedData[0]);

      // Vérifier que le paragraphe a bien été créé
      const { data: verifyData, error: verifyError } = await supabase
        .from('editable_content')
        .select('content_key, content')
        .eq('content_key', paragraphKey)
        .single();

      if (verifyError || !verifyData) {
        console.error("❌ Erreur lors de la vérification:", verifyError);
        throw new Error("Le paragraphe n'a pas été correctement créé");
      }

      // Créer l'objet paragraphe pour l'état local
      const newParagraph = {
        id: newParagraphId,
        content: paragraphKey,
        initialContent: defaultContent
      };

      // Mettre à jour l'état local
      setSections(prev => {
        const updated = prev.map(s => {
          if (s.id === sectionId) {
            return {
              ...s,
              paragraphs: [...s.paragraphs, newParagraph].sort((a, b) => a.id - b.id)
            };
          }
          return s;
        });
        console.log("📊 État mis à jour:", updated);
        return updated;
      });

      // Recharger les données
      await refetch();

      toast({
        title: "Succès",
        description: "Nouveau paragraphe ajouté"
      });

      return newParagraph;
    } catch (error) {
      console.error('❌ Erreur lors de la création du paragraphe:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la création du paragraphe",
        variant: "destructive"
      });
      throw error;
    }
  };

  const removeParagraph = async (sectionId: number, paragraphId: number) => {
    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) {
        throw new Error("Section introuvable");
      }

      const paragraphToRemove = section.paragraphs.find(p => p.id === paragraphId);
      if (!paragraphToRemove) {
        throw new Error("Paragraphe introuvable");
      }

      // Supprimer le paragraphe de Supabase
      const { error: deleteError } = await supabase
        .from('editable_content')
        .delete()
        .eq('content_key', paragraphToRemove.content);

      if (deleteError) {
        throw deleteError;
      }

      // Vérifier que le paragraphe a bien été supprimé
      const { data: verifyDelete } = await supabase
        .from('editable_content')
        .select('content_key')
        .eq('content_key', paragraphToRemove.content);

      if (verifyDelete && verifyDelete.length > 0) {
        throw new Error("Le paragraphe n'a pas été correctement supprimé");
      }

      // Mettre à jour l'état local
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
    } catch (error) {
      console.error('Erreur lors de la suppression du paragraphe:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive"
      });
    }
  };

  return (
    <PolicyLayout title="Conditions Générales de Vente" contentKey="cgv">
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

export default CGV;
