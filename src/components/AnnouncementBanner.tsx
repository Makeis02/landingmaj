"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EditableText } from "./EditableText";
import { useEditStore } from "@/stores/useEditStore";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { MessageSquare, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";

interface AnnouncementSettings {
  id: string;
  is_enabled: boolean;
  scroll_speed: number;
  background_color: string;
  text_color: string;
  created_at?: string;
  updated_at?: string;
  title_spacing?: number;
}

interface AnnouncementMessage {
  id: string;
  content: string;
  display_order: number;
  is_enabled: boolean;
  url?: string;
}

const AnnouncementBanner = () => {
  const { isEditMode } = useEditStore();
  const { toast: useToastToast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [localScrollSpeed, setLocalScrollSpeed] = useState<number>(30);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [renderedMessages, setRenderedMessages] = useState<any[]>([]);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [spacing, setSpacing] = useState<number>(10);
  const [settings, setSettings] = useState<AnnouncementSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState<string>('#0077b6');
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isPublicEnabled, setIsPublicEnabled] = useState(false);

  // Vérification du statut admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: adminData } = await supabase
          .from("authorized_admin_emails")
          .select("email")
          .eq("email", session.user.email)
          .single();
        
        setIsAdmin(!!adminData);
      }
    };

    checkAdminStatus();
  }, []);

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ["announcement-messages"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("announcement_messages")
          .select("*")
          .order("display_order", { ascending: true });

        if (error) throw error;
        return (data || []).map(message => ({
          ...message,
          is_enabled: message.is_enabled ?? true
        }));
      } catch (error) {
        console.error("Error fetching announcement messages:", error);
        return [];
      }
    }
  });

  const { data: settingsData, error: queryError, refetch: refetchSettings } = useQuery({
    queryKey: ["announcement-settings"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("announcement_banner_settings")
          .select("*");

        if (error) {
          console.error("❌ Erreur lors de la récupération des données :", error);
          throw error;
        }

        if (data.length === 0) {
          console.log('Aucune donnée trouvée, création d\'une nouvelle ligne par défaut.');
          const { data: newSettings, error: insertError } = await supabase
            .from("announcement_banner_settings")
            .insert({
              is_enabled: true,
              scroll_speed: 30,
              background_color: "#0077b6",
              text_color: "#ffffff",
              title_spacing: 10,
            })
            .select()
            .single();

          if (insertError) {
            console.error("❌ Erreur lors de l'insertion des données :", insertError);
            throw insertError;
          }
          return newSettings;
        }

        // Add title_spacing if it doesn't exist yet
        if (data[0]) {
          if (!('title_spacing' in data[0])) {
            data[0].title_spacing = 10;
          }
          return data[0];
        }
        
        return null;
      } catch (error) {
        console.error("Error fetching settings:", error);
        return {
          is_enabled: true,
          scroll_speed: 30,
          background_color: "#0077b6",
          text_color: "#ffffff",
          title_spacing: 10,
          id: "default",
        } as AnnouncementSettings;
      }
    }
  });

  useEffect(() => {
    if (settingsData?.scroll_speed) {
      setLocalScrollSpeed(settingsData.scroll_speed);
    }
    
    // Ensure we handle title_spacing correctly
    if (settingsData) {
      setIsPublicEnabled(settingsData.is_enabled);
      
      // If settingsData doesn't have title_spacing, provide a default
      if (settingsData.title_spacing !== undefined) {
        setSpacing(settingsData.title_spacing);
      } else {
        setSpacing(10); // Default value
      }
    }
  }, [settingsData]);

  // Synchroniser les messages de la base de données avec l'état local
  useEffect(() => {
    if (messages) {
      setLocalMessages(messages);
    }
  }, [messages]);

  useEffect(() => {
    // Calcul dynamique de la hauteur du header
    const headerElement = document.querySelector('header');
    if (headerElement) {
      setHeaderHeight(headerElement.offsetHeight);
    }
  }, []);

  useEffect(() => {
    // Filtrer les messages activés
    const activeMessages = localMessages.filter(msg => msg.is_enabled);

    // Cas : Un seul texte activé
    if (activeMessages.length === 1) {
      setRenderedMessages(activeMessages); // Pas de duplication
    } 
    // Cas : Plusieurs textes activés
    else if (activeMessages.length > 1) {
      const duplicationCount = Math.ceil(10 / activeMessages.length); // Ajuste en fonction du seuil
      const duplicatedMessages = Array(duplicationCount)
        .fill(activeMessages)
        .flat(); // Duplique les textes activés
      setRenderedMessages(duplicatedMessages);
    } else {
      setRenderedMessages([]); // Aucun message actif
    }
  }, [localMessages]);

  useEffect(() => {
    console.log('État actuel de settingsData :', settingsData);
    console.log('Erreur de requête :', queryError);
    if (settingsData) {
      console.log("🔄 Données Supabase récupérées après update :", settingsData);
      
      const updatedSettings: AnnouncementSettings = {
        ...settingsData,
        title_spacing: settingsData.title_spacing !== undefined ? settingsData.title_spacing : 10,
      };
      
      setSettings(updatedSettings);
      setBackgroundColor(settingsData.background_color || '#0077b6');
      setTextColor(settingsData.text_color || '#ffffff');
      console.log('🎨 `settings` mis à jour avec :', updatedSettings);
    } else {
      console.warn('settingsData est null ou indéfini.');
    }
  }, [settingsData, queryError]);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('announcement_banner_settings')
          .select('*')
          .single();

        if (error) throw error;

        // Set default title_spacing if it doesn't exist
        const titleSpacing = data?.title_spacing ?? 10;
        setSpacing(titleSpacing);
      } catch (error) {
        console.error("Erreur lors de la récupération des paramètres :", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<AnnouncementSettings>) => {
    if (!settings?.id || !isAdmin) return;

    try {
      if (newSettings.scroll_speed !== undefined) {
        setLocalScrollSpeed(newSettings.scroll_speed);
      }

      const { error } = await supabase
        .from("announcement_banner_settings")
        .update(newSettings)
        .eq("id", settings.id);

      if (error) throw error;

      await refetchSettings();
      
      useToastToast({
        title: "Paramètres mis à jour",
        description: "Les modifications ont été enregistrées avec succès",
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour des paramètres:", error);
      useToastToast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour des paramètres",
        variant: "destructive",
      });
    }
  };

  const toggleBanner = () => {
    if (!settings || !isAdmin) return;
    updateSettings({ is_enabled: !settings.is_enabled });
  };

  const handleBannerClick = () => {
    if (isEditMode && isAdmin) {
      setIsMenuOpen(!isMenuOpen);
    }
  };

  const toggleMessageActive = async (messageId: string, currentState: boolean) => {
    if (!isAdmin) return;

    try {
      // Mettre à jour l'état local immédiatement pour un feedback instantané
      setLocalMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, is_enabled: !currentState }
            : msg
        )
      );

      // Mettre à jour la base de données
      const { error } = await supabase
        .from("announcement_messages")
        .update({ is_enabled: !currentState })
        .eq("id", messageId);

      if (error) throw error;

      // Rafraîchir les données
      await refetchMessages();
      
      useToastToast({
        title: "Message mis à jour",
        description: `Le message a été ${!currentState ? 'activé' : 'désactivé'} avec succès`,
      });
    } catch (error) {
      // En cas d'erreur, restaurer l'état précédent
      setLocalMessages(messages || []);
      console.error("Erreur lors de la mise à jour du message:", error);
      useToastToast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du message",
        variant: "destructive",
      });
    }
  };

  // Fonction pour vérifier si les doublons sont autorisés
  const canDuplicatePhrase = (content: string) => {
    // Vérifier si le contenu existe déjà
    const isDuplicate = localMessages.some(msg => msg.content === content);
    if (!isDuplicate) return true;

    const activePhrases = localMessages.filter(msg => msg.is_enabled).length;
    const totalPhrases = localMessages.length;

    return activePhrases === 2 || totalPhrases === 3;
  };

  // Modifier la fonction handleMessageUpdate pour gérer l'URL
  const handleMessageUpdate = async (messageId: string, newContent: string, newUrl?: string) => {
    if (!isAdmin) return;

    if (!canDuplicatePhrase(newContent)) {
      useToastToast({
        title: "Action non autorisée",
        description: "Les doublons sont autorisés uniquement si deux phrases sont activées ou si trois phrases sont présentes.",
        variant: "destructive",
      });
      return;
    }

    try {
      const updateData: { content: string; url?: string } = { 
        content: newContent
      };
      
      if (newUrl !== undefined) {
        updateData.url = newUrl;
      }
      
      const { error } = await supabase
        .from("announcement_messages")
        .update(updateData)
        .eq("id", messageId);

      if (error) throw error;

      setLocalMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: newContent, url: newUrl }
            : msg
        )
      );

      await refetchMessages();
      
      useToastToast({
        title: "Message mis à jour",
        description: "Le message a été modifié avec succès",
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du message:", error);
      useToastToast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du message",
        variant: "destructive",
      });
    }
  };

  // Ajouter une nouvelle fonction pour gérer spécifiquement la mise à jour de l'URL
  const handleUrlUpdate = async (messageId: string, newUrl: string) => {
    if (!isAdmin) return;

    try {
      // Mettre à jour l'état local immédiatement
      setLocalMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, url: newUrl }
            : msg
        )
      );

      const { error } = await supabase
        .from("announcement_messages")
        .update({ url: newUrl })
        .eq("id", messageId);

      if (error) throw error;

      await refetchMessages();
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'URL:", error);
      useToastToast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour de l'URL",
        variant: "destructive",
      });
    }
  };

  const handleUrlChange = (index: number, newUrl: string) => {
    const updatedMessages = [...localMessages];
    updatedMessages[index].url = newUrl;
    setLocalMessages(updatedMessages);
  };

  const isValidUrl = (url: string) => {
    try {
      // Ajoutez "http://" si l'URL ne commence pas par "http://" ou "https://"
      if (!/^https?:\/\//i.test(url)) {
        url = 'http://' + url;
      }
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Fonction pour normaliser les URLs
  const normalizeUrl = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  };

  const saveChanges = async () => {
    console.log('Tentative d\'enregistrement. settings :', settings);

    if (!settings) {
      console.error('Impossible de sauvegarder : settings est undefined.');
      return;
    }

    console.log('Settings actuels avant la sauvegarde :', settings);
    console.log('Valeur de title_spacing à sauvegarder :', spacing);
    console.log('Valeur de scroll_speed à sauvegarder :', localScrollSpeed);
    console.log('État de la bannière à sauvegarder :', settings.is_enabled);

    try {
      const { error } = await supabase
        .from('announcement_banner_settings')
        .update({
          title_spacing: spacing,
          scroll_speed: localScrollSpeed,
          is_enabled: settings.is_enabled,
        })
        .eq('id', settings.id);

      if (error) {
        console.error('Erreur lors de la sauvegarde dans Supabase :', error);
      } else {
        console.log('Sauvegarde réussie.');
        await refetchSettings();
      }
    } catch (err) {
      console.error('Erreur inattendue lors de la sauvegarde :', err);
    }
  };

  const handleSaveClick = () => {
    if (loading) {
      console.error('Impossible d\'enregistrer : les paramètres sont en cours de chargement.');
      return;
    }

    if (!settings) {
      console.error('Impossible d\'enregistrer : les paramètres ne sont pas chargés.');
      return;
    }

    console.log('Tentative d\'enregistrement avec settings:', settings);
    saveChanges();
  };

  const handleSpacingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpacing = Number(e.target.value);
    console.log("🔧 Nouvelle valeur de title_spacing sélectionnée :", newSpacing);
    setSpacing(newSpacing);

    if (settings) {
      saveChanges();
    } else {
      console.warn("⚠️ settings est undefined, mise à jour annulée.");
    }
  };

  const handleColorChange = async (color: string) => {
    setBackgroundColor(color);

    if (settings?.id && isAdmin) {
      try {
        const { error } = await supabase
          .from('announcement_banner_settings')
          .update({ background_color: color })
          .eq('id', settings.id);

        if (error) {
          console.error('Erreur lors de la mise à jour de la couleur de fond :', error);
        } else {
          console.log('Couleur de fond mise à jour avec succès.');
          await refetchSettings();
        }
      } catch (err) {
        console.error('Erreur inattendue lors de la mise à jour de la couleur de fond :', err);
      }
    }
  };

  const handleTextColorChange = async (color: string) => {
    const newColor = color;
    setTextColor(newColor);

    if (settings?.id && isAdmin) {
      try {
        const { error } = await supabase
          .from('announcement_banner_settings')
          .update({ text_color: newColor })
          .eq('id', settings.id);

        if (error) {
          console.error('Erreur lors de la mise à jour de la couleur du texte :', error);
        } else {
          console.log('Couleur du texte mise à jour avec succès.');
          await refetchSettings();
        }
      } catch (err) {
        console.error('Erreur inattendue lors de la mise à jour de la couleur du texte :', err);
      }
    }
  };

  const updateBackgroundColor = async (newColor: string) => {
    if (!settings?.id) return;

    console.log("🎨 Nouvelle couleur de fond sélectionnée :", newColor);

    const { error } = await supabase
      .from('announcement_banner_settings')
      .update({ background_color: newColor })
      .eq('id', settings.id);

    if (error) {
      console.error("❌ Erreur lors de la mise à jour de la couleur de fond :", error);
      return;
    }

    console.log("✅ Couleur de fond enregistrée avec succès !");
    await refetchSettings();

    console.log("🔄 Après mise à jour, settingsData devrait contenir :", settingsData);
  };

  const updateTextColor = async (newColor: string) => {
    if (!settings?.id) return;

    console.log("🎨 Nouvelle couleur de texte sélectionnée :", newColor);

    const { error } = await supabase
      .from('announcement_banner_settings')
      .update({ text_color: newColor })
      .eq('id', settings.id);

    if (error) {
      console.error("❌ Erreur lors de la mise à jour de la couleur du texte :", error);
      return;
    }

    console.log("✅ Couleur du texte enregistrée avec succès !");
    await refetchSettings();

    // 🔄 Forcer un re-render
    setForceUpdate(prev => prev + 1);
  };

  const togglePublicMode = async () => {
    if (!settings?.id || !isAdmin) return;

    const newStatus = !isPublicEnabled;
    setIsPublicEnabled(newStatus);

    try {
      const { error } = await supabase
        .from("announcement_banner_settings")
        .update({ is_enabled: newStatus })
        .eq("id", settings.id);

      if (error) throw error;

      console.log("✅ Mode public mis à jour :", newStatus);
      await refetchSettings();
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour du mode public :", error);
      setIsPublicEnabled(!newStatus); // Restaurer l'ancien état en cas d'erreur
    }
  };

  if (!isEditMode && (!settings?.is_enabled || !messages?.length)) return null;

  const scrollDuration = messages?.length ? (messages.length * (100 / localScrollSpeed)) : 0;

  console.log("🎨 Couleur appliquée à la bannière :", settings?.background_color, settings?.text_color);

  return (
    <div
      className="top-0 left-0 w-full z-50"
      style={{ 
        height: '40px',
        backgroundColor: backgroundColor,
        color: textColor
      }}
    >
      {isEditMode && isMenuOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-60" onClick={() => setIsMenuOpen(false)}>
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-3xl bg-white rounded-xl shadow-xl p-8 space-y-6 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-ocean" />
                <h3 className="text-lg font-medium">Messages de la bannière</h3>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-lg"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-gray-50/80 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-medium text-gray-700">Paramètres de défilement</h4>
                <span className="text-sm text-ocean font-medium">
                  Vitesse : {localScrollSpeed}
                </span>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Vitesse de défilement</Label>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">Lent</span>
                  <Slider
                    defaultValue={[localScrollSpeed]}
                    value={[localScrollSpeed]}
                    min={10}
                    max={100}
                    step={5}
                    className="flex-1"
                    onValueChange={(values) => {
                      const newSpeed = values[0];
                      setLocalScrollSpeed(newSpeed);
                      updateSettings({ scroll_speed: newSpeed });
                    }}
                  />
                  <span className="text-xs text-gray-500">Rapide</span>
                </div>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto pr-4 space-y-6">
              <h4 className="text-base font-medium text-gray-700">Messages</h4>
              {localMessages?.map((message, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={message.content}
                    onChange={(e) => handleMessageUpdate(message.id, e.target.value, message.url)}
                    className="border border-gray-300 rounded p-2 text-black"
                    placeholder="Entrez le texte du message"
                  />
                  <input
                    type="text"
                    value={message.url || ""}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    className="border border-gray-300 rounded p-2 text-black"
                    placeholder="URL associée (optionnelle)"
                  />
                  <button onClick={() => toggleMessageActive(message.id, message.is_enabled)} className="text-blue-500">
                    {message.is_enabled ? 'Désactiver' : 'Activer'}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 space-x-4">
              <button
                onClick={handleSaveClick}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                disabled={loading}
              >
                Enregistrer
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="spacing">Espace entre les titres :</label>
              <input
                type="range"
                id="spacing"
                min="0"
                max="50"
                step="5"
                value={spacing}
                onChange={handleSpacingChange}
                disabled={loading}
              />
              <p>Espacement actuel : {spacing}px</p>
              {loading && <p>Chargement des paramètres...</p>}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="backgroundColor">Couleur de fond :</label>
              <input
                type="color"
                id="backgroundColor"
                value={backgroundColor}
                onChange={(e) => {
                  setBackgroundColor(e.target.value);
                  updateBackgroundColor(e.target.value);
                }}
              />
              <Input
                type="text"
                value={backgroundColor}
                onChange={(e) => {
                  setBackgroundColor(e.target.value);
                  updateBackgroundColor(e.target.value);
                }}
                placeholder="#RRGGBB"
                className="w-28"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="textColor">Couleur du texte :</label>
              <input
                type="color"
                id="textColor"
                value={textColor}
                onChange={(e) => {
                  const newColor = e.target.value;
                  setTextColor(newColor);
                  updateTextColor(newColor);
                }}
              />
              <Input
                type="text"
                value={textColor}
                onChange={(e) => {
                  setTextColor(e.target.value);
                  updateTextColor(e.target.value);
                }}
                placeholder="#RRGGBB"
                className="w-28"
              />
            </div>

            <button 
              onClick={togglePublicMode} 
              className={`px-4 py-2 rounded ${isPublicEnabled ? 'bg-green-500' : 'bg-gray-500'} text-white`}
            >
              {isPublicEnabled ? "Désactiver la bannière" : "Activer la bannière"}
            </button>
          </div>
        </div>
      )}
      
      <div 
        className="relative overflow-hidden py-2.5 whitespace-nowrap shadow-sm"
        style={{ 
          height: '40px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <div 
          className="inline-flex animate-marquee"
          style={{ 
            animationDuration: `${scrollDuration}s`,
            animationPlayState: isMenuOpen ? 'paused' : 'running',
            position: 'absolute',
            right: localMessages?.filter(msg => msg.is_enabled === true).length === 1 ? '0' : 'auto',
            whiteSpace: 'nowrap',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            gap: `${spacing}px`
          }}
        >
          {renderedMessages.map((message, index) => (
            <a 
              key={index} 
              href={message.url ? normalizeUrl(message.url) : '#'} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`mx-4 ${message.url ? 'hover:underline' : ''}`}
            >
              {message.content}
            </a>
          ))}
        </div>
        {isEditMode && (
          <div
            className="absolute top-2 right-2 cursor-pointer"
            onClick={handleBannerClick}
            title="Ouvrir le menu d'édition"
          >
            <img src="/path/to/your/key-icon.png" alt="Ouvrir le menu d'édition" className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementBanner;
