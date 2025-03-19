import React, { useState, useRef, useEffect } from 'react';
import { useEditStore } from '@/stores/useEditStore';
import { supabase } from '@/integrations/supabase/client';

interface EditableTextProps {
  contentKey: string;
  initialContent: string;
  className?: string;
  onUpdate?: (newContent: string) => void;
  onMouseUp?: () => void;
}

export const EditableText: React.FC<EditableTextProps> = ({
  contentKey,
  initialContent,
  className = '',
  onUpdate,
  onMouseUp
}) => {
  const { isEditMode } = useEditStore();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [isHovered, setIsHovered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [palettePosition, setPalettePosition] = useState({
    top: 0,
    left: 0
  });
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  
  // Utiliser une clé unique basée sur contentKey pour le localStorage
  const localStorageKey = `editableTextCustomColors_${contentKey || 'global'}`;
  
  const [customColors, setCustomColors] = useState<string[]>(() => {
    // Charger les couleurs personnalisées depuis localStorage
    try {
      const savedColors = localStorage.getItem(localStorageKey);
      return savedColors ? JSON.parse(savedColors) : [];
    } catch (error) {
      console.error('Erreur lors du chargement des couleurs personnalisées:', error);
      return [];
    }
  });
  const [newColorInput, setNewColorInput] = useState("#000000");
  const [hexInput, setHexInput] = useState("#000000");

  const colors = [
    "#000000",
    "#1EAEDB",
    "#8B5CF6",
    "#D946EF",
    "#F97316",
    "#0EA5E9",
    "#10B981",
    "#FF0000"
  ];

  useEffect(() => {
    const fetchContent = async () => {
      const { data, error } = await supabase.from('editable_content').select('content').eq('content_key', contentKey).single();
      if (error) {
        if (error.code === 'PGRST116') {
          await supabase.from('editable_content').insert({
            content_key: contentKey,
            content: initialContent
          });
        } else {
          console.error(`Error fetching content for ${contentKey}:`, error);
        }
        return;
      }
      if (data) {
        setContent(data.content);
      }
    };
    if (contentKey) {
      fetchContent();
    }
  }, [contentKey, initialContent]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        // Ne pas fermer la palette automatiquement, laisser ouverte
      }
    }
    if (showPalette) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPalette]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        return range.cloneRange();
      }
    }
    return null;
  };

  const handleClick = () => {
    if (isEditMode && !isEditing) {
      setIsEditing(true);
      setIsDirty(false);
    }
  };

  const handleBlur = async (e: React.FocusEvent) => {
    if (paletteRef.current && paletteRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    
    setTimeout(() => {
      if (isEditing && isDirty) {
        saveContent();
      }
      if (!paletteRef.current?.contains(document.activeElement)) {
        setIsEditing(false);
        setShowPalette(false);
      }
    }, 100);
  };

  const saveContent = async () => {
    if (!contentKey || !editorRef.current) return;
    const newContent = editorRef.current?.innerHTML || content;
    setIsSaving(true);
    try {
      const { data, error } = await supabase.from('editable_content').select('id').eq('content_key', contentKey).single();
      if (error && error.code !== 'PGRST116') {
        console.error(`Error checking for existing content (${contentKey}):`, error);
        return;
      }
      if (data) {
        await supabase.from('editable_content').update({
          content: newContent
        }).eq('content_key', contentKey);
      } else {
        await supabase.from('editable_content').insert({
          content_key: contentKey,
          content: newContent
        });
      }
      setContent(newContent);
      if (onUpdate) {
        onUpdate(newContent);
      }
    } catch (error) {
      console.error(`Error saving content for ${contentKey}:`, error);
    } finally {
      setIsSaving(false);
      setIsDirty(false);
    }
  };

  const handleInput = () => {
    setIsDirty(true);
  };

  const handleSelectionChange = () => {
    if (!isEditing) return;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        const rect = range.getBoundingClientRect();
        setPalettePosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX
        });
        setSelectedRange(range.cloneRange());
        setShowPalette(true);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      editorRef.current?.blur();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setIsDirty(true);
      return;
    }

    if (e.key === 'Escape') {
      setShowPalette(false);
      editorRef.current?.blur();
    }
  };

  const safeNodeLength = (node: Node | null): number => {
    if (!node) return 0;
    if (node.textContent) return node.textContent.length;
    return 0;
  };

  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.focus();
      const range = document.createRange();
      const selection = window.getSelection();
      if (editorRef.current.childNodes.length > 0) {
        const lastChild = editorRef.current.childNodes[editorRef.current.childNodes.length - 1];
        if (lastChild.nodeType === Node.TEXT_NODE) {
          range.setStart(lastChild, safeNodeLength(lastChild));
          range.collapse(true);
        } else {
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
        }
      } else {
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      }
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) {
      document.addEventListener('selectionchange', handleSelectionChange);
    } else {
      document.removeEventListener('selectionchange', handleSelectionChange);
      setShowPalette(false);
    }
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [isEditing]);

  const applyColor = (color: string) => {
    if (!selectedRange) return;
    
    const selection = window.getSelection();
    if (selection) {
      // Restaurer la sélection précédente
      selection.removeAllRanges();
      selection.addRange(selectedRange);
      
      // Appliquer la couleur
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, color);
      setIsDirty(true);
      
      // Sauvegarder la nouvelle sélection
      setSelectedRange(selection.getRangeAt(0).cloneRange());
      
      // Garder le focus sur l'éditeur
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isEditMode && isEditing) {
      handleSelectionChange();
    }
    if (onMouseUp) {
      onMouseUp();
    }
  };

  const addCustomColor = (color: string) => {
    // Vérifier si la couleur est valide (format hexadécimal)
    const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    if (!isValidHex) return;
    
    // Vérifier si la couleur existe déjà
    if (colors.includes(color) || customColors.includes(color)) return;
    
    // Ajouter la couleur à la liste des couleurs personnalisées
    const updatedColors = [...customColors, color];
    setCustomColors(updatedColors);
    
    // Sauvegarder dans localStorage
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(updatedColors));
      
      // Optionnel: sauvegarder dans Supabase pour une persistance côté serveur
      if (contentKey) {
        saveCustomColorsToSupabase(updatedColors);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des couleurs personnalisées:', error);
    }
  };

  const removeCustomColor = (colorToRemove: string) => {
    const updatedColors = customColors.filter(color => color !== colorToRemove);
    setCustomColors(updatedColors);
    
    // Mettre à jour localStorage
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(updatedColors));
      
      // Optionnel: mettre à jour dans Supabase
      if (contentKey) {
        saveCustomColorsToSupabase(updatedColors);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des couleurs personnalisées:', error);
    }
  };
  
  // Fonction pour sauvegarder les couleurs dans Supabase
  const saveCustomColorsToSupabase = async (colors: string[]) => {
    if (!contentKey) return;
    
    try {
      const colorKey = `${contentKey}_custom_colors`;
      const { data, error } = await supabase
        .from('editable_content')
        .select('id')
        .eq('content_key', colorKey)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors de la vérification des couleurs existantes:', error);
        return;
      }
      
      if (data) {
        // Mettre à jour les couleurs existantes
        await supabase
          .from('editable_content')
          .update({
            content: JSON.stringify(colors)
          })
          .eq('content_key', colorKey);
      } else {
        // Insérer de nouvelles couleurs
        await supabase
          .from('editable_content')
          .insert({
            content_key: colorKey,
            content: JSON.stringify(colors)
          });
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des couleurs dans Supabase:', error);
    }
  };
  
  // Charger les couleurs depuis Supabase au démarrage
  useEffect(() => {
    const loadCustomColorsFromSupabase = async () => {
      if (!contentKey) return;
      
      try {
        const colorKey = `${contentKey}_custom_colors`;
        const { data, error } = await supabase
          .from('editable_content')
          .select('content')
          .eq('content_key', colorKey)
          .single();
          
        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Erreur lors du chargement des couleurs depuis Supabase:', error);
          }
          return;
        }
        
        if (data && data.content) {
          try {
            const colors = JSON.parse(data.content);
            if (Array.isArray(colors)) {
              setCustomColors(colors);
              localStorage.setItem(localStorageKey, data.content);
            }
          } catch (parseError) {
            console.error('Erreur lors du parsing des couleurs:', parseError);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des couleurs depuis Supabase:', error);
      }
    };
    
    loadCustomColorsFromSupabase();
  }, [contentKey, localStorageKey]);

  if (!isEditMode) {
    return (
      <div className={`block min-h-[1.5em] ${className}`}>
        <span dangerouslySetInnerHTML={{ __html: content || '&nbsp;' }} />
      </div>
    );
  }

  return (
    <div
      className={`relative group min-h-[1.5em] ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={editorRef}
        contentEditable={isEditMode}
        onInput={handleInput}
        onBlur={handleBlur}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseUp={handleMouseUp}
        dangerouslySetInnerHTML={{ __html: content || '&nbsp;' }}
        className={`outline-none focus:outline-none w-full min-h-[1.5em] p-2 ${
          isEditMode ? 'cursor-text hover:bg-gray-50/50 rounded-md' : ''
        } ${
          isEditMode && (isHovered || isEditing) ? 'ring-1 ring-primary ring-opacity-50' : ''
        }`}
      />
      {isEditMode && (
        <button
          onClick={handleClick}
          className="absolute -right-10 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          title="Éditer"
        >
          <span className="text-sm">✎</span>
        </button>
      )}

      {showPalette && isEditing && (
        <div
          ref={paletteRef}
          className="fixed z-[9999] bg-white shadow-xl rounded-lg border border-gray-200 p-4"
          style={{
            top: `${palettePosition.top}px`,
            left: `${palettePosition.left}px`,
            minWidth: '200px'
          }}
          onClick={e => {
            if (!(e.target instanceof HTMLInputElement)) {
              e.stopPropagation();
            }
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button
                className="p-2 hover:bg-gray-100 rounded-md"
                onClick={(e) => {
                  e.preventDefault();
                  document.execCommand('insertUnorderedList', false);
                  setIsDirty(true);
                }}
                title="Liste à puces"
              >
                • Liste
              </button>
              <button
                className="p-2 hover:bg-gray-100 rounded-md"
                onClick={(e) => {
                  e.preventDefault();
                  document.execCommand('insertOrderedList', false);
                  setIsDirty(true);
                }}
                title="Liste numérotée"
              >
                1. Liste
              </button>
            </div>
            <button 
              onClick={() => setShowPalette(false)} 
              className="text-gray-500 hover:text-red-500 transition-colors"
              title="Fermer la palette"
            >
              ❌
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {colors.map(color => (
              <button
                key={color}
                className="w-8 h-8 rounded-full border-2 border-gray-200 hover:scale-110 transition-transform shadow-sm hover:shadow-md"
                style={{
                  backgroundColor: color
                }}
                onClick={(e) => {
                  e.preventDefault();
                  applyColor(color);
                }}
                title="Appliquer cette couleur"
              />
            ))}
            {customColors.map(color => (
              <div key={color} className="relative group">
                <button
                  className="w-8 h-8 rounded-full border-2 border-gray-200 hover:scale-110 transition-transform shadow-sm hover:shadow-md"
                  style={{
                    backgroundColor: color
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    applyColor(color);
                  }}
                  title="Appliquer cette couleur personnalisée"
                />
                <button
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.preventDefault();
                    removeCustomColor(color);
                  }}
                  title="Supprimer cette couleur"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-gray-600">Custom:</label>
            <input
              type="color"
              className="w-6 h-6"
              value={newColorInput}
              onChange={e => {
                setNewColorInput(e.target.value);
                setHexInput(e.target.value);
                applyColor(e.target.value);
              }}
              title="Choisir une couleur personnalisée"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="w-20 text-xs border border-gray-300 rounded px-1 py-0.5"
              value={hexInput}
              onChange={e => {
                let value = e.target.value;
                // S'assurer que la valeur commence par #
                if (value && !value.startsWith('#')) {
                  value = '#' + value;
                }
                setHexInput(value);
              }}
              placeholder="#RRGGBB"
            />
            <button
              className="bg-gray-200 text-gray-700 text-xs px-1 py-0.5 rounded hover:bg-gray-300 mr-1"
              onClick={(e) => {
                e.preventDefault();
                setHexInput('#');
              }}
              title="Effacer"
            >
              ✕
            </button>
            <button
              className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded hover:bg-blue-600"
              onClick={(e) => {
                e.preventDefault();
                // Vérifier si la couleur est valide
                const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hexInput);
                if (isValidHex) {
                  addCustomColor(hexInput);
                  // Mettre à jour le sélecteur de couleur
                  setNewColorInput(hexInput);
                }
              }}
              title="Ajouter cette couleur"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      {isSaving && (
        <span className="ml-2 text-blue-500 text-xs animate-pulse">
          Enregistrement...
        </span>
      )}
    </div>
  );
};
