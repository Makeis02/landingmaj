"use client";

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useEditStore } from "@/stores/useEditStore";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, Facebook, Instagram, Linkedin, ExternalLink, ArrowRight } from "lucide-react";
import { EditableText } from "@/components/EditableText";
import { EditableURL } from "@/components/EditableURL";
import { useImageUpload } from "@/hooks/useImageUpload";

// 🔍 Panneau de debug pour les données Footer (comme dans Modele.tsx)
const FooterDebugPanel = ({ footerLinks, footerSettings, legalLinks, usefulLinks, socialLinks }) => {
  const [showDebug, setShowDebug] = useState(false);
  
  if (!showDebug) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setShowDebug(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1"
        >
          🔍 Debug Footer
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-2xl w-full">
      <div className="bg-white border-2 border-purple-500 rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-purple-700">🔍 Debug Footer Data</h3>
          <Button
            onClick={() => setShowDebug(false)}
            variant="ghost"
            className="text-purple-600 hover:text-purple-800 p-1"
          >
            ✕
          </Button>
        </div>

        <div className="space-y-4 text-xs">
          {/* 📊 Données brutes footer_links */}
          <div className="border border-gray-200 rounded p-3">
            <h4 className="font-semibold text-gray-800 mb-2">📊 Raw footer_links ({footerLinks?.length || 0})</h4>
            <div className="bg-gray-50 p-2 rounded text-xs font-mono max-h-32 overflow-auto">
              {footerLinks?.length > 0 ? (
                <pre>{JSON.stringify(footerLinks, null, 2)}</pre>
              ) : (
                <span className="text-red-500">Aucune donnée dans footer_links</span>
              )}
            </div>
          </div>

          {/* 📊 Données footer_settings */}
          <div className="border border-gray-200 rounded p-3">
            <h4 className="font-semibold text-gray-800 mb-2">⚙️ Footer Settings</h4>
            <div className="bg-gray-50 p-2 rounded text-xs font-mono max-h-32 overflow-auto">
              <pre>{JSON.stringify(footerSettings, null, 2)}</pre>
            </div>
          </div>

          {/* 🏷️ Sections filtrées */}
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-blue-200 rounded p-2">
              <h5 className="font-semibold text-blue-700 mb-1">⚖️ Mentions Légales ({legalLinks?.length || 0})</h5>
              <div className="bg-blue-50 p-1 rounded text-xs max-h-20 overflow-auto">
                {legalLinks?.length > 0 ? (
                  legalLinks.map((link, i) => (
                    <div key={i} className="mb-1">
                      <strong>{link.label}</strong>: {link.url}
                      <br />
                      <span className="text-gray-500">Section: "{link.section}"</span>
                    </div>
                  ))
                ) : (
                  <span className="text-red-500">Aucune mention légale</span>
                )}
              </div>
            </div>

            <div className="border border-green-200 rounded p-2">
              <h5 className="font-semibold text-green-700 mb-1">🔗 Liens Utiles ({usefulLinks?.length || 0})</h5>
              <div className="bg-green-50 p-1 rounded text-xs max-h-20 overflow-auto">
                {usefulLinks?.length > 0 ? (
                  usefulLinks.map((link, i) => (
                    <div key={i} className="mb-1">
                      <strong>{link.label}</strong>: {link.url}
                    </div>
                  ))
                ) : (
                  <span className="text-red-500">Aucun lien utile</span>
                )}
              </div>
            </div>

            <div className="border border-orange-200 rounded p-2">
              <h5 className="font-semibold text-orange-700 mb-1">📱 Réseaux Sociaux ({socialLinks?.length || 0})</h5>
              <div className="bg-orange-50 p-1 rounded text-xs max-h-20 overflow-auto">
                {socialLinks?.length > 0 ? (
                  socialLinks.map((link, i) => (
                    <div key={i} className="mb-1">
                      <strong>{link.label}</strong>: {link.url}
                    </div>
                  ))
                ) : (
                  <span className="text-red-500">Aucun réseau social</span>
                )}
              </div>
            </div>
          </div>

          {/* 🚨 Tests de normalisation */}
          <div className="border border-red-200 rounded p-3">
            <h4 className="font-semibold text-red-700 mb-2">🧪 Test Normalisation</h4>
            <div className="space-y-1 text-xs">
              {footerLinks?.map((link, i) => {
                const normalized = link.section?.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
                const isMatching = normalized.includes("mentions legales");
                return (
                  <div key={i} className={`p-1 rounded ${isMatching ? 'bg-green-100' : 'bg-red-100'}`}>
                    <strong>#{i}</strong> "{link.section}" → "{normalized}" 
                    {isMatching ? ' ✅ MATCH' : ' ❌ NO MATCH'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Footer = () => {
  const { isEditMode } = useEditStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for newsletter form
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State for footer content
  const [logoUrl, setLogoUrl] = useState('');
  const [copyrightText, setCopyrightText] = useState('© 2025 Votre Entreprise. Tous droits réservés.');
  const [gdprText, setGdprText] = useState('Nous respectons votre vie privée et sommes conformes aux normes RGPD.');
  const [trustpilotUrl, setTrustpilotUrl] = useState('https://fr.trustpilot.com/');
  
  // State for draft links
  const [draftLegalLinks, setDraftLegalLinks] = useState<{ label: string; url: string }[]>([]);
  const [draftUsefulLinks, setDraftUsefulLinks] = useState<{ label: string; url: string }[]>([]);
  
  // Setup image upload hook
  const { isUploading, handleImageUpload } = useImageUpload({
    imageKey: 'footer_logo',
    onUpdate: (newUrl) => {
      setLogoUrl(newUrl);
      updateFooterSettingsMutation.mutate({
        footer_logo_url: newUrl
      });
    }
  });

  // Fetch footer links from Supabase
  const { data: footerLinks = [], isLoading: isLoadingLinks } = useQuery({
    queryKey: ['footer-links'],
    queryFn: async () => {
      console.log("Fetching footer_links...");
      const { data, error } = await supabase
        .from('footer_links')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Debug: log complet des données brutes
  useEffect(() => {
    if (!footerLinks.length) return;

    console.log("🧾 Toutes les données brutes de footerLinks:");
    footerLinks.forEach((link, i) => {
      console.log(`#${i}`, {
        id: link.id,
        label: link.label,
        section: link.section,
        sectionNormalized: normalize(link.section),
        url: link.url,
      });
    });
  }, [footerLinks]);

  // Fetch footer settings from Supabase
  const { data: footerSettings = {}, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['footer-settings'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('footer_settings')
          .select('*')
          .single();

        if (error) {
          console.error('Error fetching footer settings:', error);
          return {};
        }

        return data || { 
          footer_logo_url: '', 
          copyright_text: '© 2025 Votre Entreprise. Tous droits réservés.', 
          gdpr_text: 'Nous respectons votre vie privée et sommes conformes aux normes RGPD.', 
          trustpilot_logo_url: 'https://fr.trustpilot.com/' 
        };
      } catch (error) {
        console.error('Unexpected error fetching footer settings:', error);
        return { 
          footer_logo_url: '', 
          copyright_text: '© 2025 Votre Entreprise. Tous droits réservés.', 
          gdpr_text: 'Nous respectons votre vie privée et sommes conformes aux normes RGPD.', 
          trustpilot_logo_url: 'https://fr.trustpilot.com/' 
        };
      }
    },
  });

  useEffect(() => {
    if (footerSettings) {
      setLogoUrl(footerSettings.footer_logo_url || '');
      setCopyrightText(footerSettings.copyright_text || '© 2025 Votre Entreprise. Tous droits réservés.');
      setGdprText(footerSettings.gdpr_text || 'Nous respectons votre vie privée et sommes conformes aux normes RGPD.');
      setTrustpilotUrl(footerSettings.trustpilot_logo_url || 'https://fr.trustpilot.com/');
    }
  }, [footerSettings]);

  // Fonction pour formater l'URL
  const formatUrl = (url: string, section: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return '';

    if (section === 'Mentions Légales') {
      return cleanUrl;
    }

    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return cleanUrl;
    }

    return `http://${cleanUrl}`;
  };

  // Fonction de normalisation (accents, casse, espaces)
  const normalize = (s?: string) =>
    (s || '').normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

  // Debug: afficher toutes les sections
  useEffect(() => {
    if (footerLinks) {
      console.log("🏷 Toutes les sections dans footerLinks:", 
        footerLinks.map(l => ({
          section: l.section,
          label: l.label,
          url: l.url
        }))
      );

      // Warning pour les sections inconnues
      footerLinks.forEach((link) => {
        const norm = normalize(link.section);
        if (!['mentions legales', 'liens utiles', 'reseaux sociaux'].includes(norm)) {
          console.warn("⚠️ Section inconnue détectée:", link);
        }
      });
    }
  }, [footerLinks]);

  // Sections filtrées sans useMemo
  const legalLinks = footerLinks.filter(link => {
    const raw = link.section;
    const norm = normalize(link.section);
    const isMatch = norm.includes("mentions legales") && link.label && link.url;
    console.log("🔎 Test section:", { raw, norm, isMatch, label: link.label });

    return isMatch;
  });

  // 🔍 DEBUG en temps réel
  console.log("📊 [FILTRAGE] footerLinks total:", footerLinks?.length || 0);
  console.log("📊 [FILTRAGE] legalLinks trouvés:", legalLinks?.length || 0);
  if (legalLinks?.length > 0) {
    console.log("📊 [FILTRAGE] legalLinks détail:", legalLinks);
  }

  const usefulLinks = footerLinks
    ?.filter(link => normalize(link.section) === normalize('Liens Utiles'))
    .filter(link => link.label && link.url) || [];

  const socialLinks = footerLinks
    ?.filter(link => normalize(link.section) === normalize('Réseaux Sociaux'))
    .filter(link => link.label && link.url) || [];

  // Debug: log avant chaque rendu
  console.log("📊 État actuel des liens:", {
    total: footerLinks?.length || 0,
    legal: legalLinks.length,
    useful: usefulLinks.length,
    social: socialLinks.length
  });

  // Add new link mutation
  const addLinkMutation = useMutation({
    mutationFn: async (newLink: { label: string; url: string; section: string; display_order: number }) => {
      console.log('📝 [mutationFn] Start adding new link:', newLink);
      const formattedUrl = formatUrl(newLink.url, newLink.section);
      console.log('🔗 [mutationFn] Formatted URL:', formattedUrl);
      
      // 🔍 DEBUG : Vérifier la table avant insertion
      const { data: beforeData, error: beforeError } = await supabase
        .from('footer_links')
        .select('*')
        .order('id');
      console.log('📊 [DEBUG] Table footer_links AVANT insertion:', { beforeData, beforeError });
      
      const { data, error } = await supabase
        .from('footer_links')
        .insert([{ ...newLink, url: formattedUrl }])
        .select('*');

      if (error) {
        console.error('❌ [mutationFn] Error inserting link:', error);
        throw error;
      }

      console.log('✅ [mutationFn] Link inserted successfully:', data);
      
      // 🔍 DEBUG : Vérifier la table après insertion
      const { data: afterData, error: afterError } = await supabase
        .from('footer_links')
        .select('*')
        .order('id');
      console.log('📊 [DEBUG] Table footer_links APRÈS insertion:', { afterData, afterError });
      return data[0];
    },
    onSuccess: async (data) => {
      try {
        console.log('🎯 [onSuccess] Link added successfully:', data);
        console.log('🔄 [onSuccess] Invalidating & refetching footer-links...');
        await queryClient.invalidateQueries({ queryKey: ['footer-links'] });
        await queryClient.refetchQueries({ queryKey: ['footer-links'] });
        console.log('✅ [onSuccess] footer-links invalidated & refetched');

        // Gestion sécurisée des sections
        const normalizedSection = normalize(data.section);
        if (normalizedSection.includes('mentions legales')) {
          setDraftLegalLinks([]);
        } else if (normalizedSection.includes('liens utiles')) {
          setDraftUsefulLinks([]);
        } else if (normalizedSection.includes('reseaux sociaux')) {
          console.log('🎯 Rien à faire pour Réseaux Sociaux');
        } else {
          console.warn('⚠️ Section inconnue:', data.section);
        }

        toast({
          title: "Lien ajouté",
          description: "Le lien a été ajouté avec succès",
        });
        console.log('🎉 [onSuccess] Toast shown');

      } catch (err) {
        console.error('❌ [onSuccess] Unexpected error:', err);
      }
    },
    onError: (error) => {
      console.error('❌ [onError] Mutation error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout du lien",
        variant: "destructive"
      });
    }
  });

  // Delete link mutation
  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ [mutationFn] Start deleting link:', id);
      
      const { error } = await supabase
        .from('footer_links')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ [mutationFn] Error deleting link:', error);
        throw error;
      }

      console.log('✅ [mutationFn] Link deleted successfully');
    },
    onSuccess: () => {
      console.log('🔄 [onSuccess] Invalidating footer-links...');
      queryClient.invalidateQueries({ queryKey: ['footer-links'] });
      console.log('✅ [onSuccess] footer-links invalidated');

      toast({
        title: "Lien supprimé",
        description: "Le lien a été supprimé avec succès",
      });
      console.log('🎉 [onSuccess] Toast shown');
    },
    onError: (error) => {
      console.error('❌ [onError] Mutation error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression du lien",
        variant: "destructive"
      });
    }
  });

  // Update link mutation
  const updateLinkMutation = useMutation({
    mutationFn: async ({ id, updatedLink }: { id: string; updatedLink: any }) => {
      console.log('📝 [mutationFn] Start updating link:', { id, updatedLink });
      const formattedUrl = formatUrl(updatedLink.url, updatedLink.section);
      console.log('🔗 [mutationFn] Formatted URL:', formattedUrl);
      
      const { error } = await supabase
        .from('footer_links')
        .update({ ...updatedLink, url: formattedUrl })
        .eq('id', id);

      if (error) {
        console.error('❌ [mutationFn] Error updating link:', error);
        throw error;
      }

      console.log('✅ [mutationFn] Link updated successfully');
    },
    onSuccess: () => {
      console.log('🔄 [onSuccess] Invalidating footer-links...');
      queryClient.invalidateQueries({ queryKey: ['footer-links'] });
      console.log('✅ [onSuccess] footer-links invalidated');

      toast({
        title: "Lien mis à jour",
        description: "Le lien a été mis à jour avec succès",
      });
      console.log('🎉 [onSuccess] Toast shown');
    },
    onError: (error) => {
      console.error('❌ [onError] Mutation error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du lien",
        variant: "destructive"
      });
    }
  });

  // Update footer settings mutation
  const updateFooterSettingsMutation = useMutation({
    mutationFn: async (updates: any) => {
      try {
        const { data: existingSettings } = await supabase
          .from('footer_settings')
          .select('id')
          .single();

        let result;
        if (existingSettings) {
          result = await supabase
            .from('footer_settings')
            .update(updates)
            .eq('id', existingSettings.id);
        } else {
          result = await supabase
            .from('footer_settings')
            .insert([updates]);
        }

        if (result.error) throw result.error;
      } catch (error) {
        console.error('Error updating footer settings:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['footer-settings'] });
      toast({
        title: "Paramètres mis à jour",
        description: "Les paramètres du footer ont été mis à jour avec succès",
      });
    },
  });

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await handleImageUpload(file);
    } catch (error) {
      console.error('Error in handleLogoUpload:', error);
      // Toast is already handled by useImageUpload hook
    }
  };

  // Handle newsletter subscription
  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Email invalide",
        description: "Veuillez entrer une adresse email valide",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .upsert({ 
          email, 
          status: 'subscribed',
          updated_at: new Date().toISOString() 
        }, {
          onConflict: 'email'
        });

      if (error) throw error;

      toast({
        title: "Inscription réussie !",
        description: "Merci de vous être inscrit à notre newsletter.",
      });
      
      setEmail("");
    } catch (error) {
      console.error("Erreur lors de l'inscription:", error);
      toast({
        title: "Erreur lors de l'inscription",
        description: "Une erreur s'est produite. Veuillez réessayer ultérieurement",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update Trustpilot URL
  const updateTrustpilotUrl = async (newUrl: string) => {
    try {
      await updateFooterSettingsMutation.mutateAsync({
        trustpilot_logo_url: newUrl
      });
      setTrustpilotUrl(newUrl);
      toast({
        title: "URL mise à jour",
        description: "L'URL Trustpilot a été mise à jour avec succès",
      });
    } catch (error) {
      console.error('Error updating Trustpilot URL:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour de l'URL",
        variant: "destructive",
      });
    }
  };

  // Render the social media icon based on the label
  const renderSocialIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'facebook':
        return <Facebook className="h-5 w-5" />;
      case 'instagram':
        return <Instagram className="h-5 w-5" />;
      case 'linkedin':
        return <Linkedin className="h-5 w-5" />;
      default:
        return <ExternalLink className="h-5 w-5" />;
    }
  };

  const [defaultSocialLinks] = useState({
    facebook: 'https://www.facebook.com/profile.php?id=61560324459916',
    instagram: 'https://www.instagram.com/aquareveoff/'
  });

  // Composant pour les icônes sociales fixes
  const SocialIcons = () => {
    return (
      <div className="flex space-x-3">
        <a
          href={defaultSocialLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-200 hover:bg-primary hover:text-white text-gray-700 p-2 rounded-full transition-colors"
        >
          <Facebook className="h-5 w-5" />
        </a>
        <a
          href={defaultSocialLinks.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-200 hover:bg-primary hover:text-white text-gray-700 p-2 rounded-full transition-colors"
        >
          <Instagram className="h-5 w-5" />
        </a>
      </div>
    );
  };

  // Ajouter ou mettre à jour les liens sociaux au chargement du composant
  useEffect(() => {
    if (!isEditMode || socialLinks.length > 0) return; // Ne pas exécuter si déjà des liens sociaux

    const updateSocialLinks = async () => {
      try {
        // Ajouter Facebook s'il n'existe pas
        await addLinkMutation.mutateAsync({
          label: 'Facebook',
          url: defaultSocialLinks.facebook,
          section: 'Réseaux Sociaux',
          display_order: 1
        });

        // Ajouter Instagram s'il n'existe pas
        await addLinkMutation.mutateAsync({
          label: 'Instagram',
          url: defaultSocialLinks.instagram,
          section: 'Réseaux Sociaux',
          display_order: 2
        });

        console.log("✅ Liens sociaux ajoutés avec succès");
      } catch (error) {
        console.error("❌ Erreur lors de l'ajout des liens sociaux:", error);
      }
    };

    updateSocialLinks();
  }, [isEditMode]); // Plus de dépendance à socialLinks

  return (
    <footer className="bg-gray-50 text-gray-700 border-t border-gray-200">
      <div className="container mx-auto pt-12 pb-8 px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Logo and Company Info */}
          <div className="flex flex-col">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo du footer" 
                className="h-20 mb-4 object-contain" 
              />
            ) : (
              <div className="font-bold text-xl mb-4 text-primary">
                <EditableText
                  contentKey="footer_company_name"
                  initialContent="Aqua Accessoires"
                  className="inline"
                />
              </div>
            )}
            
            <p className="text-sm text-gray-600 mb-6">
              <EditableText
                contentKey="footer_company_description"
                initialContent="Votre destination pour tous les accessoires aquatiques de qualité. Nous proposons une large gamme de produits pour embellir votre aquarium."
                className="inline"
              />
            </p>
            
            {/* Image upload in edit mode */}
            {isEditMode && (
              <div className="mb-4">
                <p className="text-sm mb-1 font-medium text-gray-700">Logo du footer</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-white
                    hover:file:bg-primary/90"
                />
                {isUploading && <p className="text-xs mt-1 text-gray-500">Chargement...</p>}
              </div>
            )}

            {/* Trustpilot Logo avec le nouveau logo agrandi */}
            <div className="mt-2">
              <a 
                href={trustpilotUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center transition-transform hover:scale-105"
              >
                <img 
                  src="/lovable-uploads/4553bf22-1089-44bf-9ee7-59efa13e2b3f.png" 
                  alt="Trustpilot" 
                  className="h-20 w-auto"
                />
              </a>
              {isEditMode && (
                <EditableURL
                  contentKey="trustpilot_url"
                  initialContent={trustpilotUrl}
                  onUpdate={updateTrustpilotUrl}
                  className="mt-2"
                />
              )}
            </div>
          </div>

          {/* Column 2: Legal Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-gray-900">
              <EditableText
                contentKey="footer_legal_title"
                initialContent="Mentions Légales"
                className="inline"
              />
            </h3>
            <ul className="space-y-2">
              {legalLinks.map(link => (
                <li key={link.id}>
                  {isEditMode ? (
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateLinkMutation.mutate({
                          id: link.id,
                          updatedLink: { ...link, label: e.target.value }
                        })}
                        className="h-8 text-sm"
                      />
                      <Input
                        type="text"
                        value={link.url}
                        onChange={(e) => updateLinkMutation.mutate({
                          id: link.id,
                          updatedLink: { ...link, url: e.target.value }
                        })}
                        className="h-8 text-sm"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => deleteLinkMutation.mutate(link.id)}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <a
                      href={formatUrl(link.url, link.section)}
                      className="text-gray-600 hover:text-primary transition-colors hover:underline text-sm"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}

              {/* Afficher les drafts */}
              {isEditMode && draftLegalLinks.map((draft, index) => (
                <li key={`draft-${index}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      type="text"
                      value={draft.label}
                      onChange={(e) => {
                        const updatedDrafts = [...draftLegalLinks];
                        updatedDrafts[index].label = e.target.value;
                        setDraftLegalLinks(updatedDrafts);
                      }}
                      placeholder="Label du lien"
                      className="h-8 text-sm"
                    />
                    <Input
                      type="text"
                      value={draft.url}
                      onChange={(e) => {
                        const updatedDrafts = [...draftLegalLinks];
                        updatedDrafts[index].url = e.target.value;
                        setDraftLegalLinks(updatedDrafts);
                      }}
                      placeholder="URL du lien"
                      className="h-8 text-sm"
                    />
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        if (!draft.label.trim() || !draft.url.trim()) {
                          toast({
                            title: "Erreur",
                            description: "Le label et l'URL doivent être remplis",
                            variant: "destructive",
                          });
                          return;
                        }
                        console.log("🧪 Tentative ajout lien Mentions Légales :", draft.label, draft.url);
                        const maxOrder = Math.max(...legalLinks.map(l => l.display_order || 0), 0);
                        addLinkMutation.mutate({
                          label: draft.label,
                          url: draft.url,
                          section: 'Mentions Légales',
                          display_order: maxOrder + 1
                        });
                        setDraftLegalLinks(d => d.filter((_, i) => i !== index));
                      }}
                    >
                      ✓
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setDraftLegalLinks(d => d.filter((_, i) => i !== index));
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            
            {/* Add new link in edit mode */}
            {isEditMode && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => setDraftLegalLinks([...draftLegalLinks, { label: '', url: '' }])}
              >
                + Ajouter un lien
              </Button>
            )}
          </div>

          {/* Column 3: Useful Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-gray-900">
              <EditableText
                contentKey="footer_useful_title"
                initialContent="Liens Utiles"
                className="inline"
              />
            </h3>
            <ul className="space-y-2">
              {usefulLinks.map(link => (
                <li key={link.id}>
                  {isEditMode ? (
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateLinkMutation.mutate({
                          id: link.id,
                          updatedLink: { ...link, label: e.target.value }
                        })}
                        className="h-8 text-sm"
                      />
                      <Input
                        type="text"
                        value={link.url}
                        onChange={(e) => updateLinkMutation.mutate({
                          id: link.id,
                          updatedLink: { ...link, url: e.target.value }
                        })}
                        className="h-8 text-sm"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => deleteLinkMutation.mutate(link.id)}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <a
                      href={formatUrl(link.url, link.section)}
                      className="text-gray-600 hover:text-primary transition-colors hover:underline text-sm"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}

              {/* Afficher les drafts */}
              {isEditMode && draftUsefulLinks.map((draft, index) => (
                <li key={`draft-${index}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      type="text"
                      value={draft.label}
                      onChange={(e) => {
                        const updatedDrafts = [...draftUsefulLinks];
                        updatedDrafts[index].label = e.target.value;
                        setDraftUsefulLinks(updatedDrafts);
                      }}
                      placeholder="Label du lien"
                      className="h-8 text-sm"
                    />
                    <Input
                      type="text"
                      value={draft.url}
                      onChange={(e) => {
                        const updatedDrafts = [...draftUsefulLinks];
                        updatedDrafts[index].url = e.target.value;
                        setDraftUsefulLinks(updatedDrafts);
                      }}
                      placeholder="URL du lien"
                      className="h-8 text-sm"
                    />
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        if (!draft.label.trim() || !draft.url.trim()) {
                          toast({
                            title: "Erreur",
                            description: "Le label et l'URL doivent être remplis",
                            variant: "destructive",
                          });
                          return;
                        }
                        addLinkMutation.mutate({
                          label: draft.label,
                          url: draft.url,
                          section: 'Liens Utiles',
                          display_order: usefulLinks.length + index + 1
                        });
                        setDraftUsefulLinks(d => d.filter((_, i) => i !== index));
                      }}
                    >
                      ✓
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setDraftUsefulLinks(d => d.filter((_, i) => i !== index));
                      }}
                    >
                      ✕
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            
            {/* Add new link in edit mode */}
            {isEditMode && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => setDraftUsefulLinks([...draftUsefulLinks, { label: '', url: '' }])}
              >
                + Ajouter un lien
              </Button>
            )}
          </div>

          {/* Column 4: Newsletter Signup */}
          <div>
            <h3 className="font-semibold text-lg mb-4 text-gray-900">
              <EditableText
                contentKey="footer_newsletter_title"
                initialContent="Restez informé"
                className="inline"
              />
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              <EditableText
                contentKey="footer_newsletter_text"
                initialContent="Inscrivez-vous à notre newsletter pour recevoir nos dernières offres et nouveautés."
                className="inline"
              />
            </p>
            
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <div className="flex">
                <Input
                  type="email"
                  placeholder="Votre email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-r-none border-r-0"
                />
                <Button 
                  type="submit"
                  disabled={isLoading} 
                  className="rounded-l-none"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>

            {/* Social Media Links */}
            <div className="mt-6">
              <h4 className="font-medium text-sm mb-3 text-gray-800">
                <EditableText
                  contentKey="footer_social_title"
                  initialContent="Suivez-nous"
                  className="inline"
                />
              </h4>
              <SocialIcons />
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-gray-300" />
        
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <div>
            <EditableText
              contentKey="footer_copyright"
              initialContent={copyrightText}
              onUpdate={(newText) => {
                setCopyrightText(newText);
                updateFooterSettingsMutation.mutate({
                  copyright_text: newText
                });
              }}
              className="inline"
            />
          </div>
          <div className="mt-4 md:mt-0 flex items-center">
            <Mail className="h-4 w-4 mr-2" />
            <EditableText
              contentKey="footer_gdpr"
              initialContent={gdprText}
              onUpdate={(newText) => {
                setGdprText(newText);
                updateFooterSettingsMutation.mutate({
                  gdpr_text: newText
                });
              }}
              className="inline"
            />
          </div>
        </div>
      </div>

      {/* 🔍 Panneau de debug en mode édition */}
      {isEditMode && (
        <FooterDebugPanel
          footerLinks={footerLinks}
          footerSettings={footerSettings}
          legalLinks={legalLinks}
          usefulLinks={usefulLinks}
          socialLinks={socialLinks}
        />
      )}
    </footer>
  );
};

export default Footer;