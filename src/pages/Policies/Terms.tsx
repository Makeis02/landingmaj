import React, { useState } from "react";
import PolicyLayout from "../../components/policy/PolicyLayout";
import { EditableText } from "@/components/EditableText";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, PlusCircle } from "lucide-react";
import { useEditStore } from "@/stores/useEditStore";

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

const Terms = () => {
  const { isEditMode } = useEditStore();
  const [sections, setSections] = useState<Section[]>([
    {
      id: 1,
      title: "Acceptation des conditions",
      content: "terms_acceptation",
      initialContent: "En accédant à ce site, vous acceptez d'être lié par les présentes Conditions d'Utilisation.",
      paragraphs: [
        {
          id: 1,
          content: "terms_acceptation_para1",
          initialContent: "En accédant à ce site, vous acceptez d'être lié par les présentes Conditions d'Utilisation, toutes les lois et réglementations applicables, et vous acceptez que vous êtes responsable du respect des lois locales applicables. Si vous n'acceptez pas l'une de ces conditions, vous n'êtes pas autorisé à utiliser ou accéder à ce site. Les documents contenus dans ce site sont protégés par le droit d'auteur et les lois sur les marques."
        }
      ]
    },
    {
      id: 2,
      title: "Utilisation de la licence",
      content: "terms_licence",
      initialContent: "La permission est accordée de télécharger temporairement une copie des documents.",
      paragraphs: [
        {
          id: 1,
          content: "terms_licence_para1",
          initialContent: "La permission est accordée de télécharger temporairement une copie des documents (informations ou logiciels) sur le site de [Nom de votre entreprise] pour une visualisation transitoire personnelle et non commerciale uniquement. Il s'agit de l'octroi d'une licence, non d'un transfert de titre, et sous cette licence, vous ne pouvez pas :"
        }
      ]
    },
    {
      id: 3,
      title: "Modification des conditions",
      content: "terms_modification",
      initialContent: "[Nom de votre entreprise] peut réviser ces conditions d'utilisation de son site Web à tout moment.",
      paragraphs: [
        {
          id: 1,
          content: "terms_modification_para1",
          initialContent: "[Nom de votre entreprise] peut réviser ces conditions d'utilisation de son site Web à tout moment sans préavis. En utilisant ce site, vous acceptez d'être lié par la version alors en vigueur de ces Conditions d'Utilisation."
        }
      ]
    }
  ]);

  const addSection = () => {
    const newId = Math.max(...sections.map(s => s.id)) + 1;
    setSections([...sections, {
      id: newId,
      title: "Nouvelle section",
      content: `terms_section_${newId}`,
      initialContent: "Contenu de la nouvelle section...",
      paragraphs: [
        {
          id: 1,
          content: `terms_section_${newId}_para1`,
          initialContent: "Contenu du premier paragraphe..."
        }
      ]
    }]);
  };

  const removeSection = (id: number) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const addParagraph = (sectionId: number) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const newParagraphId = Math.max(...section.paragraphs.map(p => p.id)) + 1;
        return {
          ...section,
          paragraphs: [
            ...section.paragraphs,
            {
              id: newParagraphId,
              content: `${section.content}_para${newParagraphId}`,
              initialContent: "Contenu du nouveau paragraphe..."
            }
          ]
        };
      }
      return section;
    }));
  };

  const removeParagraph = (sectionId: number, paragraphId: number) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          paragraphs: section.paragraphs.filter(p => p.id !== paragraphId)
        };
      }
      return section;
    }));
  };

  return (
    <PolicyLayout title="Conditions d'Utilisation" contentKey="terms">
      <div className="space-y-8">
        {sections.map((section, sectionIndex) => (
          <section key={section.id} className="relative group">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-4 text-slate-900">
                  <EditableText
                    contentKey={`${section.content}_title`}
                    initialContent={`${sectionIndex + 1}. ${section.title}`}
                    className="block"
                  />
                </h2>
                <div className="prose max-w-none space-y-4">
                  {section.paragraphs.map((paragraph, paraIndex) => (
                    <div key={paragraph.id} className="relative group/para">
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
                  ))}
                </div>
                {isEditMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-primary hover:text-primary/80"
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
        ))}
        
        {isEditMode && (
          <Button
            variant="outline"
            className="w-full py-6 border-dashed"
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

export default Terms;
