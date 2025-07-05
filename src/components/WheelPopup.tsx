import React, { useState, useEffect, lazy, Suspense } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/useCartStore';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

interface LuckyWheelPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onEligibilityChange?: (canSpin: boolean) => void; // 🆕 Prop pour communiquer l'éligibilité
  isEditMode?: boolean;
}

const LuckyWheelPopup: React.FC<LuckyWheelPopupProps> = ({ isOpen, onClose, onEligibilityChange, isEditMode = false }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [winningSegment, setWinningSegment] = useState<any>(null);
  const [showAddToCartAnimation, setShowAddToCartAnimation] = useState(false);
  const [animatingImage, setAnimatingImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [wheelSettings, setWheelSettings] = useState({ 
    title: 'Roue Aquatique', 
    description: 'Plongez dans l\'aventure et gagnez des cadeaux aquatiques !',
    is_enabled: true,
    auto_show_delay: 5,
    show_on_pages: '/',
    show_when_cart: 'any',
    show_to: 'all',
    participation_delay: 72,
    participation_frequency: 'per_3days',
    floating_button_text: 'Tentez votre chance !',
    floating_button_position: 'bottom_right',
    popup_seen_cooldown: 1,
    auto_show_popup: true,
    scroll_trigger_enabled: false,
    scroll_trigger_percentage: 50,
    updated_at: null as string | null
  });
  
  // 🆕 NOUVEAUX ÉTATS pour la saisie d'email
  const [email, setEmail] = useState('');
  const [emailValidated, setEmailValidated] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [isUserConnected, setIsUserConnected] = useState(false);
  
  // 🆕 NOUVEAUX ÉTATS pour le système de limitation 72h
  const [canSpin, setCanSpin] = useState(false);
  const [timeUntilNextSpin, setTimeUntilNextSpin] = useState(0);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [lastSpinData, setLastSpinData] = useState(null);
  const [nextSpinTimestamp, setNextSpinTimestamp] = useState<Date | null>(null);
  const [realTimeCountdown, setRealTimeCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
  // 🆕 Notifier le parent du changement d'éligibilité
  useEffect(() => {
    if (onEligibilityChange) {
      onEligibilityChange(canSpin);
    }
  }, [canSpin, onEligibilityChange]);
  
  // Importer les fonctions du store Zustand
  const { addItem, items: cartItems, clearWheelGifts } = useCartStore();

  // Structure pour gérer texte, images, pourcentages ET codes promo - maintenant chargée depuis Supabase
  const [segmentsData, setSegmentsData] = useState([
    { id: null, position: 0, text: "-15%", image_url: null, percentage: 16.67, promo_code: "", is_active: true },
    { id: null, position: 1, text: "🐠 Gratuit", image_url: null, percentage: 16.67, promo_code: "", is_active: true },
    { id: null, position: 2, text: "-10%", image_url: null, percentage: 16.67, promo_code: "", is_active: true },
    { id: null, position: 3, text: "🌱 Offerte", image_url: null, percentage: 16.67, promo_code: "", is_active: true },
    { id: null, position: 4, text: "-20%", image_url: null, percentage: 16.67, promo_code: "", is_active: true },
    { id: null, position: 5, text: "💧 Perdu", image_url: null, percentage: 16.65, promo_code: "", is_active: true },
  ]);

  const [showEmailForm, setShowEmailForm] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // 🛒 États pour le test des paniers abandonnés
  const [testProducts, setTestProducts] = useState<Array<{id: string, title: string, price: number}>>([]);
  const [testProductId, setTestProductId] = useState("");
  const [testAbandonedEmail, setTestAbandonedEmail] = useState("");
  const [isTestingAbandoned, setIsTestingAbandoned] = useState(false);
  const [testAbandonedResult, setTestAbandonedResult] = useState<{ success: boolean; message: string } | null>(null);

  // Charger les données depuis Supabase au montage du composant
  useEffect(() => {
    if (isOpen) {
      loadWheelData();
      checkUserAuth();
      
      // 🛒 Charger les produits pour le test des paniers abandonnés (mode édition uniquement)
      if (isEditMode) {
        loadTestProducts();
      }
    } else {
      // 🆕 Réinitialiser les états email quand la modale se ferme
      setEmail('');
      setEmailValidated(false);
      setIsValidatingEmail(false);
      setIsUserConnected(false);
      setShowResult(false);
      setWinningSegment(null);
    }
  }, [isOpen, isEditMode]);

  // Surveillance des paramètres - Recharger si modifiés en mode édition
  useEffect(() => {
    if (isOpen && !isEditMode) {
      const checkForUpdatedSettings = async () => {
        try {
          const { data: latestSettings, error } = await supabase
            .from('wheel_settings')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

          if (!error && latestSettings) {
            const currentTimestamp = wheelSettings.updated_at;
            const latestTimestamp = latestSettings.updated_at;
            
            // Si les paramètres ont été mis à jour
            if (latestTimestamp !== currentTimestamp) {
              setWheelSettings({
                 title: latestSettings.title || 'Roue Aquatique',
                 description: latestSettings.description || 'Plongez dans l\'aventure et gagnez des cadeaux aquatiques !',
                 is_enabled: latestSettings.is_enabled || true,
                 auto_show_delay: latestSettings.auto_show_delay || 5,
                 show_on_pages: latestSettings.show_on_pages || '/',
                 show_when_cart: latestSettings.show_when_cart || 'any',
                 show_to: latestSettings.show_to || 'all',
                 participation_delay: latestSettings.participation_delay || 72,
                 participation_frequency: latestSettings.participation_frequency || 'per_3days',
                 floating_button_text: latestSettings.floating_button_text || 'Tentez votre chance !',
                 floating_button_position: latestSettings.floating_button_position || 'bottom_right',
                 popup_seen_cooldown: latestSettings.popup_seen_cooldown || 1,
                 auto_show_popup: latestSettings.auto_show_popup !== false,
                 scroll_trigger_enabled: latestSettings.scroll_trigger_enabled || false,
                 scroll_trigger_percentage: latestSettings.scroll_trigger_percentage || 50,
                 updated_at: latestSettings.updated_at
               });

              // Recalculer le timer avec les nouveaux paramètres si email validé
              if (email && emailValidated) {
                await recalculateTimerWithNewSettings(email, latestSettings.participation_delay || 72);
              }
            }
          }
        } catch (error) {
          console.error('Erreur surveillance paramètres:', error);
        }
      };

      const interval = setInterval(checkForUpdatedSettings, 2000);
      
      return () => clearInterval(interval);
    }
  }, [isOpen, isEditMode, wheelSettings.updated_at, email, emailValidated]);

  // 🆕 TIMER EN TEMPS RÉEL - Met à jour le compte à rebours chaque seconde
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    console.log('⭐ ⏰ useEffect Timer - Démarrage avec:', {
      nextSpinTimestamp: nextSpinTimestamp?.toISOString(),
      canSpin,
      hasValidData: !!(nextSpinTimestamp && !canSpin)
    });
    
    if (nextSpinTimestamp && !canSpin) {
      console.log('⭐ ⏰ Démarrage du timer temps réel pour:', nextSpinTimestamp.toISOString());
      
      interval = setInterval(() => {
        const now = new Date();
        const timeDiff = nextSpinTimestamp.getTime() - now.getTime();
        
        if (timeDiff <= 0) {
          // Timer expiré - utilisateur peut maintenant jouer
          console.log('⭐ ⏰ Timer expiré - déblocage automatique');
          setCanSpin(true);
          setTimeUntilNextSpin(0);
          setNextSpinTimestamp(null);
          setRealTimeCountdown({ hours: 0, minutes: 0, seconds: 0 });
        } else {
          // Calculer heures, minutes, secondes restantes
          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
          
          setRealTimeCountdown({ hours, minutes, seconds });
          setTimeUntilNextSpin(hours); // Pour compatibilité avec l'affichage existant
        }
      }, 1000);
    } else {
      console.log('⭐ ⏰ Pas de timer à démarrer (nextSpinTimestamp manquant ou canSpin=true)');
    }
    
    return () => {
      if (interval) {
        console.log('⭐ ⏰ Nettoyage du timer');
        clearInterval(interval);
      }
    };
  }, [nextSpinTimestamp, canSpin]);

  // Fonction pour charger les données de la roue depuis Supabase
  const loadWheelData = async () => {
    setIsLoading(true);
    try {
      // Charger les segments
      const { data: segments, error: segmentsError } = await supabase
        .from('wheel_segments')
        .select('*')
        .eq('is_active', true)
        .order('position');

      if (segmentsError) throw segmentsError;

      // Charger les paramètres - CORRECTION : toujours récupérer la ligne la plus récente
      const { data: settings, error: settingsError } = await supabase
        .from('wheel_settings')
        .select('*')
        .order('updated_at', { ascending: false })  // ← TRIER PAR DATE DÉCROISSANTE
        .limit(1)
        .single();

      if (!settingsError && settings) {
        setWheelSettings({
          title: settings.title || 'Roue Aquatique',
          description: settings.description || 'Plongez dans l\'aventure et gagnez des cadeaux aquatiques !',
          is_enabled: settings.is_enabled || true,
          auto_show_delay: settings.auto_show_delay || 5,
          show_on_pages: settings.show_on_pages || '/',
          show_when_cart: settings.show_when_cart || 'any',
          show_to: settings.show_to || 'all',
          participation_delay: settings.participation_delay || 72,
          participation_frequency: settings.participation_frequency || 'per_3days',
          floating_button_text: settings.floating_button_text || 'Tentez votre chance !',
          floating_button_position: settings.floating_button_position || 'bottom_right',
          popup_seen_cooldown: settings.popup_seen_cooldown || 1,
          auto_show_popup: settings.auto_show_popup !== false, // true par défaut
          scroll_trigger_enabled: settings.scroll_trigger_enabled || false,
          scroll_trigger_percentage: settings.scroll_trigger_percentage || 50,
          updated_at: settings.updated_at || null
        });
      }

      if (segments && segments.length > 0) {
        setSegmentsData(segments);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de la roue:', error);
      toast.error('Erreur de chargement', {
        description: 'Impossible de charger les données de la roue'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour sauvegarder les modifications en mode édition
  const saveSegmentData = async (segmentData: any) => {
    if (!isEditMode) return;

    try {
      const { error } = await supabase
        .from('wheel_segments')
        .upsert({
          id: segmentData.id,
          position: segmentData.position,
          text: segmentData.text,
          image_url: segmentData.image_url,
          percentage: segmentData.percentage,
          promo_code: segmentData.promo_code,
          is_active: segmentData.is_active
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur de sauvegarde');
    }
  };

  // Calcul du total des pourcentages
  const totalPercentage = segmentsData.reduce((sum, segment) => sum + segment.percentage, 0);

  // Fonction pour calculer quel segment gagner selon les probabilités
  const calculateWinningSegment = () => {
    const random = Math.random() * 100;
    let cumulativePercentage = 0;
    
    for (let i = 0; i < segmentsData.length; i++) {
      cumulativePercentage += segmentsData[i].percentage;
      if (random <= cumulativePercentage) {
        return i;
      }
    }
    return 0; // Fallback
  };

  // Fonction pour modifier le pourcentage d'un segment
  const handlePercentageChange = async (index: number, newPercentage: number) => {
    if (newPercentage >= 0 && newPercentage <= 100) {
      const updatedSegments = segmentsData.map((item, i) => 
        i === index ? { ...item, percentage: newPercentage } : item
      );
      setSegmentsData(updatedSegments);
      
      // Sauvegarder en mode édition
      if (isEditMode) {
        await saveSegmentData(updatedSegments[index]);
      }
    }
  };

  // Fonction pour modifier le code promo d'un segment
  const handlePromoCodeChange = async (index: number, newPromoCode: string) => {
    const updatedSegments = segmentsData.map((item, i) => 
      i === index ? { ...item, promo_code: newPromoCode } : item
    );
    setSegmentsData(updatedSegments);
    
    // Sauvegarder en mode édition
    if (isEditMode) {
      await saveSegmentData(updatedSegments[index]);
    }
  };

  // Fonction pour modifier le texte
  const handleTextChange = async (index: number, newText: string) => {
    const updatedSegments = segmentsData.map((item, i) => 
      i === index ? { ...item, text: newText } : item
    );
    setSegmentsData(updatedSegments);
    
    // Sauvegarder en mode édition
    if (isEditMode) {
      await saveSegmentData(updatedSegments[index]);
    }
  };

  // Fonction pour copier le code promo dans le presse-papiers
  const copyPromoCode = async (promoCode: string) => {
    try {
      await navigator.clipboard.writeText(promoCode);
      toast.success('Code promo copié !', {
        description: `Le code "${promoCode}" a été copié dans votre presse-papiers`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      toast.error('Erreur lors de la copie du code');
    }
  };

  // Fonction pour ajuster la taille de police selon la longueur du texte
  const getFontSize = (text: string) => {
    if (text.length <= 4) return '1.2rem';
    if (text.length <= 8) return '1rem';
    if (text.length <= 12) return '0.85rem';
    return '0.7rem';
  };

  // Fonction pour ajuster la largeur du conteneur selon la longueur du texte
  const getTextWidth = (text: string) => {
    if (text.length <= 4) return '90px';
    if (text.length <= 8) return '120px';
    if (text.length <= 12) return '130px';
    return '140px';
  };

  // Segments de la roue : utilise les données avec texte ou image
  const segments = segmentsData.map((data, index) => ({
    ...data,
    color: [
      "bg-ocean text-white",
      "bg-[#2563eb] text-white",
      "bg-[#60a5fa] text-ocean",
      "bg-[#1e40af] text-white",
      "bg-[#3b82f6] text-white",
      "bg-[#e0f2fe] text-ocean"
    ][index]
  }));

  // Fonction pour uploader une image vers Supabase Storage
  const handleImageUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    try {
      // Générer un nom unique pour le fichier
      const fileExt = file.name.split('.').pop();
      const fileName = `wheel_segment_${index}_${Date.now()}.${fileExt}`;
      
      // Uploader vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('wheel-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('wheel-images')
        .getPublicUrl(fileName);

      // Mettre à jour le state local
      const updatedSegments = segmentsData.map((item, i) => 
        i === index ? { ...item, image_url: publicUrl } : item
      );
      setSegmentsData(updatedSegments);

      // Sauvegarder en base en mode édition
      if (isEditMode) {
        await saveSegmentData(updatedSegments[index]);
        toast.success('Image uploadée et sauvegardée !');
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload de l\'image:', error);
      toast.error('Erreur d\'upload', {
        description: 'Impossible d\'uploader l\'image'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Fonction pour supprimer une image
  const handleRemoveImage = async (index: number) => {
    const segment = segmentsData[index];
    
    // Supprimer le fichier de Supabase Storage si c'est une URL Supabase
    if (segment.image_url && segment.image_url.includes('supabase')) {
      try {
        const fileName = segment.image_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('wheel-images')
            .remove([fileName]);
        }
      } catch (error) {
        console.error('Erreur lors de la suppression du fichier:', error);
      }
    }

    const updatedSegments = segmentsData.map((item, i) => 
      i === index ? { ...item, image_url: null } : item
    );
    setSegmentsData(updatedSegments);
    
    // Sauvegarder en mode édition
    if (isEditMode) {
      await saveSegmentData(updatedSegments[index]);
      toast.success('Image supprimée !');
    }
  };

  // Fonction pour ajouter un cadeau au panier avec animation
  const handleAddGiftToCart = async (segment: any) => {
    if (!segment) return;

    // 🆕 Vérifier si le cadeau n'a pas expiré
    const wonAt = segment.won_at ? new Date(segment.won_at) : new Date();
    const now = new Date();
    const hoursSinceWin = (now.getTime() - wonAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceWin >= 72) {
      toast.error("⏰ Cadeau expiré : Ce cadeau n'est plus disponible. Vous devez rejouer à la roue pour obtenir un nouveau cadeau.");
      return;
    }

    // Créer un ID unique basé sur la position et le texte/image
    const uniqueId = segment.id || `wheel_segment_${segment.position}_${segment.text || 'image'}`;

    // Vérifier si le cadeau est déjà dans le panier
    const existingGift = cartItems.find((item: any) => 
      item.id === uniqueId && 
      item.type === 'wheel_gift'
    );

    if (existingGift) {
      toast.info("🎁 Ce cadeau est déjà dans votre panier !");
      return;
    }

    // Mapping conforme à CartItem
    const giftItem = {
      id: uniqueId,
      type: 'wheel_gift' as 'wheel_gift',
      title: segment.title || segment.text || 'Cadeau de la roue',
      image_url: segment.image_url,
      price: 0,
      quantity: 1,
      won_at: wonAt.toISOString(),
      expires_at: new Date(wonAt.getTime() + (wheelSettings.participation_delay || 72) * 60 * 60 * 1000).toISOString(),
      is_gift: true
    };
    
    console.log('🎁 Ajout cadeau au panier:', { uniqueId, title: giftItem.title, expires_at: giftItem.expires_at });

    addItem(giftItem);
    // Ajout du cadeau dans la table Supabase wheel_gift_in_cart
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing, error: fetchError } = await supabase
        .from('wheel_gift_in_cart')
        .select('id')
        .eq('email', email)
        .eq('gift_id', giftItem.id)
        .maybeSingle();
      if (!existing) {
        const { data, error } = await supabase
          .from('wheel_gift_in_cart')
          .insert([{
            email,
            user_id: user?.id || null,
            gift_id: giftItem.id,
            gift_title: giftItem.title,
            gift_image_url: giftItem.image_url,
            added_at: new Date().toISOString(),
            expires_at: giftItem.expires_at,
            notified_2h_before: false,
            cart_url: window.location.origin + '/cart'
          }]);
        if (error) {
          console.error("Erreur lors de l'insertion du cadeau dans wheel_gift_in_cart:", error);
        }
      }
    } catch (e) {
      console.error('Erreur Supabase wheel_gift_in_cart:', e);
    }
    toast.success("🎁 Cadeau ajouté ! Votre cadeau a été ajouté au panier. N'oubliez pas de finaliser votre commande avant l'expiration !");
  };

  // Fonction pour déterminer quel segment est réellement sous la flèche
  const getSegmentFromRotation = (rotation: number) => {
    const segmentAngle = 360 / segments.length;
    const normalized = ((rotation % 360) + 360) % 360;
    const angleUnderPointer = (360 - normalized) % 360;
    const index = Math.floor(angleUnderPointer / segmentAngle);
    return index;
  };

  const handleSpin = async () => {
    if (isSpinning || !canSpin) return;
    setIsSpinning(true);
    setShowResult(false); // Cache le résultat précédent
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const browserFingerprint = generateBrowserFingerprint();
      const clientIP = await getClientIP();
      
      // 🆕 Enregistrer la tentative pour invités (anti-contournement)
      if (!user) {
        await supabase
          .from('wheel_guest_attempts')
          .insert({
            email: email.toLowerCase().trim(),
            ip_address: clientIP,
            browser_fingerprint: browserFingerprint,
            created_at: new Date().toISOString()
          });
      }
      
      // Calcul du segment gagnant selon les probabilités
      const winningIndex = calculateWinningSegment();
      
      // Calcul de l'angle pour s'arrêter sur le segment gagnant
      const segmentAngle = 360 / segments.length;
      const targetAngle = 360 - (winningIndex * segmentAngle);
      
      // Ajout de rotations supplémentaires pour l'effet visuel
      const spins = 4 + Math.random() * 2; // 4-6 tours complets
      const finalRotation = (spins * 360) + targetAngle;
      
      const newRotation = rotation + finalRotation;
      setRotation(newRotation);
      
      setTimeout(async () => {
        setIsSpinning(false);
        
        const indexUnderArrow = getSegmentFromRotation(newRotation); // ✅ le vrai
        const winningSegmentData = segments[indexUnderArrow];         // ✅ visuel
        setWinningSegment(winningSegmentData);
        setShowResult(true);
        
        // Enregistrer le tirage dans Supabase
        try {
          // 1. Enregistrer dans wheel_email_entries (pour le système de limitation)
          await supabase
            .from('wheel_email_entries')
            .insert({
              email: email.toLowerCase().trim(),
              user_id: user?.id || null,
              ip_address: clientIP,
              browser_fingerprint: browserFingerprint,
              created_at: new Date().toISOString()
            });
          
          // 2. Enregistrer le résultat détaillé pour les utilisateurs connectés
          if (user) {
            await supabase
              .from('wheel_spins')
              .insert({
                user_id: user.id,
                segment_won: winningSegmentData.position,
                winning_text: winningSegmentData.text,
                winning_image_url: winningSegmentData.image_url,
                winning_promo_code: winningSegmentData.promo_code,
                user_email: user.email
              });
          }
          
          console.log('✅ Tirage enregistré pour l\'email:', email);
        } catch (error) {
          console.error('❌ Erreur lors de l\'enregistrement du tirage:', error);
        }
        
        // 🆕 Mettre à jour l'éligibilité après le spin
        setCanSpin(false);
        const participationHours = wheelSettings.participation_delay || 72;
        setTimeUntilNextSpin(participationHours);
        
        // 🆕 Définir le timestamp exact pour la prochaine tentative
        const nextAllowedTime = new Date(Date.now() + participationHours * 60 * 60 * 1000);
        setNextSpinTimestamp(nextAllowedTime);
        
        // 🆕 SAUVEGARDER dans localStorage pour synchroniser les timers
        const lastSpinKey = `last_wheel_spin_${email.toLowerCase().trim()}`;
        localStorage.setItem(lastSpinKey, new Date().toISOString());
        console.log('⭐ ✅ Timer localStorage enregistré:', lastSpinKey, '=', new Date().toISOString());
        
        // Ajout automatique si image_url
        if (winningSegmentData?.image_url) {
          handleAddGiftToCart({
            ...winningSegmentData,
            won_at: new Date().toISOString()
          });
        } else {
          // Si c'est du texte avec un code promo, laisser plus de temps pour le lire et copier
          const hasPromoCode = winningSegmentData?.promo_code && winningSegmentData.promo_code.trim() !== '';
          if (hasPromoCode) {
            // Toast d'information pour le code promo
    setTimeout(() => {
              toast.info('🎫 Code promo disponible !', {
                description: 'N\'oubliez pas de copier votre code promo avant de fermer',
                duration: 4000,
              });
            }, 1000);
          }
        }
      }, 3000);
    } catch (error) {
      console.error('Erreur lors du spin:', error);
      setIsSpinning(false);
      toast.error('Une erreur est survenue');
    }
  };

  // 🆕 FONCTION de validation d'email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Fonction pour s'abonner à la newsletter via Omisend
  const subscribeToNewsletter = async (email: string) => {
    try {
      const response = await fetch('https://btnyenoxsjtuydpzbapq.supabase.co/functions/v1/subscribe-to-newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0bnllbm94c2p0dXlkcHpiYXBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzk4MjU4NywiZXhwIjoyMDUzNTU4NTg3fQ.Mei4bM-eWHrgP_ZLFx7JAjpJxIlDxcxnt8LWIBwpA-k'
        },
        body: JSON.stringify({ 
          email,
          source: 'wheel_popup',
          tags: ['wheel_winner']
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de l\'inscription à la newsletter:', error);
      return { success: false, message: 'Erreur lors de l\'inscription à la newsletter' };
    }
  };

  // 🆕 FONCTION pour vérifier l'authentification de l'utilisateur
  const checkUserAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        // Utilisateur connecté : utiliser automatiquement son email
        setEmail(user.email);
        setEmailValidated(true);
        setIsUserConnected(true);
        console.log('Utilisateur connecté détecté:', user.email);
        
        // 🆕 Vérifier l'éligibilité pour jouer APRÈS avoir chargé les paramètres
        const eligibilityResult = await checkSpinEligibilityWithSettings(user.id, user.email);
        setCanSpin(eligibilityResult.canSpin);
        setTimeUntilNextSpin(eligibilityResult.timeUntilNextSpin);
        setNextSpinTimestamp(eligibilityResult.nextSpinTimestamp);
      } else {
        // Utilisateur non connecté : formulaire de saisie requis
        setEmail('');
        setEmailValidated(false);
        setIsUserConnected(false);
        console.log('Utilisateur non connecté : saisie email requise');
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error);
      // En cas d'erreur, demander la saisie d'email
      setEmail('');
      setEmailValidated(false);
      setIsUserConnected(false);
    }
  };

  // 🆕 FONCTION pour vérifier l'éligibilité avec les paramètres actuels
  const checkSpinEligibilityWithSettings = async (userId: string | null, userEmail: string): Promise<{
    canSpin: boolean;
    nextSpinTimestamp: Date | null;
    timeUntilNextSpin: number;
    participationHours: number;
  }> => {
    try {
      // Récupérer les paramètres les plus récents
      const { data: settings, error: settingsError } = await supabase
        .from('wheel_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (settingsError || !settings) {
        console.error('❌ Erreur récupération paramètres:', settingsError);
        return { canSpin: false, nextSpinTimestamp: null, timeUntilNextSpin: 0, participationHours: 72 };
      }

      const participationHours = settings.participation_delay || 72;
      const hoursAgo = new Date(Date.now() - participationHours * 60 * 60 * 1000);
      
      // Vérification simple et cohérente
      let existingEntry = null;
      let error = null;

      console.log('⭐ 🔍 Vérification éligibilité - Paramètres:', {
        userId,
        userEmail: userEmail.toLowerCase().trim(),
        participationHours,
        hoursAgo: hoursAgo.toISOString(),
        useWheelSpins: !!userId
      });

      // 🔍 DEBUG : Regarder TOUTES les entrées pour cet email/user (pas seulement dans la fenêtre)
      if (userId) {
        const { data: allSpins } = await supabase
          .from('wheel_spins')
          .select('created_at, user_email')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        console.log('⭐ 🔍 DEBUG - TOUTES les participations de ce user_id:', allSpins);
      } else {
        const { data: allEntries } = await supabase
          .from('wheel_email_entries')
          .select('created_at, email')
          .eq('email', userEmail.toLowerCase().trim())
          .order('created_at', { ascending: false });
        console.log('⭐ 🔍 DEBUG - TOUTES les participations de cet email:', allEntries);
      }

      if (userId) {
        // ✅ Utilisateur avec compte : utiliser wheel_spins (logique qui marche déjà)
        console.log('⭐ 🔍 Vérification wheel_spins pour user_id:', userId);
        const { data: spinsData, error: spinsError } = await supabase
          .from('wheel_spins')
          .select('created_at')
          .eq('user_id', userId)
          .gte('created_at', hoursAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);
        
        const data = spinsData && spinsData.length > 0 ? spinsData[0] : null;
        
        existingEntry = data;
        error = spinsError;
        console.log('⭐ 📊 Résultat wheel_spins:', { 
          spinsData, 
          error: spinsError?.message,
          foundEntry: !!data,
          entryDate: data?.created_at 
        });
      } else {
        // ✅ Utilisateur invité : utiliser wheel_email_entries (même logique exacte)
        console.log('⭐ 🔍 Vérification wheel_email_entries pour email:', userEmail.toLowerCase().trim());
        const { data: entriesData, error: entriesError } = await supabase
          .from('wheel_email_entries')
          .select('created_at')
          .eq('email', userEmail.toLowerCase().trim())
          .gte('created_at', hoursAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);
        
        const data = entriesData && entriesData.length > 0 ? entriesData[0] : null;
        
        existingEntry = data;
        error = entriesError;
        console.log('⭐ 📊 Résultat wheel_email_entries:', { 
          entriesData, 
          error: entriesError?.message,
          foundEntry: !!data,
          entryDate: data?.created_at 
        });
      }

      if (error) {
        console.error('❌ Erreur lors de la vérification:', error);
        return { canSpin: false, nextSpinTimestamp: null, timeUntilNextSpin: 0, participationHours };
      }

      if (existingEntry) {
        console.log(`⚠️ Utilisateur a déjà joué dans les dernières ${participationHours}h`);
        
        // Calculer le temps restant avant de pouvoir rejouer
        const lastPlayTime = new Date(existingEntry.created_at);
        const nextAllowedTime = new Date(lastPlayTime.getTime() + participationHours * 60 * 60 * 1000);
        const timeLeft = nextAllowedTime.getTime() - Date.now();
        
        if (timeLeft > 0) {
          const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
          return {
            canSpin: false,
            nextSpinTimestamp: nextAllowedTime,
            timeUntilNextSpin: hoursLeft,
            participationHours
          };
        } else {
          return {
            canSpin: true,
            nextSpinTimestamp: null,
            timeUntilNextSpin: 0,
            participationHours
          };
        }
      }

      return {
        canSpin: true,
        nextSpinTimestamp: null,
        timeUntilNextSpin: 0,
        participationHours
      };
    } catch (error) {
      console.error('❌ Erreur lors de la vérification d\'éligibilité:', error);
      return { canSpin: false, nextSpinTimestamp: null, timeUntilNextSpin: 0, participationHours: 72 };
    }
  };

  // 🆕 FONCTION pour valider et passer à l'étape suivante
  const handleEmailSubmit = async () => {
    if (!email || !validateEmail(email)) {
      toast.error("Veuillez entrer une adresse email valide");
      return;
    }

    // 🔍 DEBUG : Vérifier localStorage avant validation
    console.log('⭐ 🔍 localStorage actuel pour tous les éléments wheel:', {
      popupDismissed: localStorage.getItem('wheel_popup_dismissed'),
      lastSeen: localStorage.getItem('wheel_popup_last_seen'),
      emailEntries: localStorage.getItem('wheel_email_entries'),
      allWheelKeys: Object.keys(localStorage).filter(key => key.includes('wheel'))
    });

    setIsLoading(true);
    try {
      // 1. 🎯 NOUVELLE LOGIQUE : Chercher l'email dans TOUTES les tables pour mode invité
      console.log('⭐ 🔍 [INVITÉ] Recherche de participations pour email:', email.toLowerCase().trim());
      
      // 🎯 ÉTAPE 1: Chercher dans wheel_spins par email (même si pas connecté)
      console.log('⭐ 🔍 [INVITÉ] REQUÊTE wheel_spins par email...');
      const { data: spinsForEmail, error: spinsEmailError } = await supabase
        .from('wheel_spins')
        .select('user_id, created_at, user_email')
        .eq('user_email', email.toLowerCase().trim())
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('⭐ 📊 [INVITÉ] Résultat wheel_spins:', { 
        spinsForEmail, 
        error: spinsEmailError?.message,
        found: spinsForEmail?.length || 0
      });

      // 🎯 ÉTAPE 2: Chercher dans wheel_email_entries par email
      console.log('⭐ 🔍 [INVITÉ] REQUÊTE wheel_email_entries par email...');
      const { data: entriesForEmail, error: entriesEmailError } = await supabase
        .from('wheel_email_entries')
        .select('created_at, email')
        .eq('email', email.toLowerCase().trim())
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('⭐ 📊 [INVITÉ] Résultat wheel_email_entries:', { 
        entriesForEmail, 
        error: entriesEmailError?.message,
        found: entriesForEmail?.length || 0
      });

      // 🎯 DÉCISION: Prendre la participation la plus récente des DEUX tables
      let userId = null;
      let isExistingUser = false;
      let lastParticipation = null;
      let useWheelSpins = false;

      const hasSpins = !spinsEmailError && spinsForEmail && spinsForEmail.length > 0;
      const hasEntries = !entriesEmailError && entriesForEmail && entriesForEmail.length > 0;

      if (hasSpins && hasEntries) {
        // Les deux tables ont des données - prendre la plus récente
        const spinsDate = new Date(spinsForEmail[0].created_at);
        const entriesDate = new Date(entriesForEmail[0].created_at);
        
        if (spinsDate > entriesDate) {
          lastParticipation = spinsForEmail[0];
          userId = spinsForEmail[0].user_id;
          useWheelSpins = true;
          isExistingUser = true;
          console.log('⭐ ✅ [INVITÉ] Participation la plus récente: wheel_spins');
        } else {
          lastParticipation = entriesForEmail[0];
          useWheelSpins = false;
          isExistingUser = false;
          console.log('⭐ ✅ [INVITÉ] Participation la plus récente: wheel_email_entries');
        }
      } else if (hasSpins) {
        // Seulement wheel_spins a des données
        lastParticipation = spinsForEmail[0];
        userId = spinsForEmail[0].user_id;
        useWheelSpins = true;
        isExistingUser = true;
        console.log('⭐ ✅ [INVITÉ] Participation trouvée dans wheel_spins uniquement');
      } else if (hasEntries) {
        // Seulement wheel_email_entries a des données
        lastParticipation = entriesForEmail[0];
        useWheelSpins = false;
        isExistingUser = false;
        console.log('⭐ ✅ [INVITÉ] Participation trouvée dans wheel_email_entries uniquement');
      } else {
        // Aucune participation trouvée
        console.log('⭐ 🆕 [INVITÉ] Aucune participation trouvée - nouveau joueur');
        isExistingUser = false;
        useWheelSpins = false;
      }

      setIsUserConnected(isExistingUser);
      
      console.log('⭐ 🎯 [INVITÉ] DÉCISION FINALE:', {
        hasSpins,
        hasEntries,
        lastParticipation: lastParticipation?.created_at,
        useWheelSpins,
        isExistingUser,
        userId
      });

            // 2. 🎯 VÉRIFIER L'ÉLIGIBILITÉ selon la participation trouvée
      console.log('⭐ 🔍 [INVITÉ] Vérification éligibilité...');
      
             if (lastParticipation) {
         // On a trouvé une participation - calculer le timer à partir de celle-ci
         const lastSpinDate = new Date(lastParticipation.created_at);
         const now = new Date();
         // 🔄 Utiliser les paramètres actuels (soit ceux de la base, soit ceux du mode édition)
         const participationHours = wheelSettings.participation_delay || 72;
         console.log('⭐ 🔍 [INVITÉ] Utilisation des paramètres:', {
           wheelSettingsParticipationDelay: wheelSettings.participation_delay,
           participationHoursUsed: participationHours,
           isEditMode
         });
        const nextAllowedTime = new Date(lastSpinDate.getTime() + participationHours * 60 * 60 * 1000);
        const timeLeft = nextAllowedTime.getTime() - now.getTime();
        
        console.log('⭐ 🔍 [INVITÉ] Calcul timer depuis participation trouvée:', {
          lastSpinDate: lastSpinDate.toISOString(),
          now: now.toISOString(),
          nextAllowedTime: nextAllowedTime.toISOString(),
          timeLeft,
          canSpin: timeLeft <= 0,
          participationSource: useWheelSpins ? 'wheel_spins' : 'wheel_email_entries'
        });
        
        if (timeLeft > 0) {
          // Timer actif basé sur la vraie participation
          const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
          
          // 🔄 MISE À JOUR SYNCHRONE DES STATES
          setCanSpin(false);
          setTimeUntilNextSpin(hoursLeft);
          setNextSpinTimestamp(nextAllowedTime);
          console.log('⭐ ✅ [INVITÉ] Timer trouvé et appliqué:', hoursLeft, 'heures restantes');
          
          // Sauvegarder aussi dans localStorage pour cohérence
          const lastSpinKey = `last_wheel_spin_${email.toLowerCase().trim()}`;
          localStorage.setItem(lastSpinKey, lastSpinDate.toISOString());
          
          // 🎯 AFFICHAGE IMMÉDIAT avec les vraies valeurs calculées
          console.log('⭐ ✅ [INVITÉ] Valeurs appliquées:', {
            canSpin: false,
            timeUntilNextSpin: hoursLeft,
            nextSpinTimestamp: nextAllowedTime.toISOString(),
            participationSource: useWheelSpins ? 'wheel_spins' : 'wheel_email_entries'
          });
          
          // 3. S'abonner à la newsletter via Omisend (même si pas éligible pour jouer)
      const newsletterResult = await subscribeToNewsletter(email);
      if (!newsletterResult.success) {
        console.warn('⚠️ Échec de l\'inscription à la newsletter:', newsletterResult.message);
      }

          // 4. Sauvegarder l'email localement comme fallback
      const { error: saveError } = await supabase
        .from('newsletter_subscribers')
        .upsert([{ 
          email, 
          status: newsletterResult.success ? 'success_from_wheel' : 'fallback_save',
          source: 'wheel_popup',
          updated_at: new Date().toISOString() 
        }], {
          onConflict: 'email'
        });

      if (saveError) {
        console.error('❌ Erreur lors de la sauvegarde locale:', saveError);
      }

          // 5. Passer à l'étape suivante dans tous les cas
      setShowEmailForm(false);
          setEmailValidated(true);
          
          toast.info(`Email enregistré ! Vous pourrez rejouer dans ${hoursLeft}h`);
        } else {
          // Timer expiré - peut jouer
      setCanSpin(true);
          setTimeUntilNextSpin(0);
          setNextSpinTimestamp(null);
          console.log('⭐ ✅ [INVITÉ] Timer expiré - peut jouer');
          
          // 3. S'abonner à la newsletter via Omisend (même si pas éligible pour jouer)
          const newsletterResult = await subscribeToNewsletter(email);
          if (!newsletterResult.success) {
            console.warn('⚠️ Échec de l\'inscription à la newsletter:', newsletterResult.message);
          }

          // 4. Sauvegarder l'email localement comme fallback
          const { error: saveError } = await supabase
            .from('newsletter_subscribers')
            .upsert([{ 
              email, 
              status: newsletterResult.success ? 'success_from_wheel' : 'fallback_save',
              source: 'wheel_popup',
              updated_at: new Date().toISOString() 
            }], {
              onConflict: 'email'
            });

          if (saveError) {
            console.error('❌ Erreur lors de la sauvegarde locale:', saveError);
          }

          // 5. Passer à l'étape suivante dans tous les cas
          setShowEmailForm(false);
        setEmailValidated(true);
        
          toast.success("Email enregistré ! Vous pouvez maintenant faire tourner la roue !");
        }
      } else {
        // Aucune participation trouvée - nouveau joueur
        setCanSpin(true);
        setTimeUntilNextSpin(0);
        setNextSpinTimestamp(null);
        console.log('⭐ ✅ [INVITÉ] Nouveau joueur - peut jouer');
        
        // 3. S'abonner à la newsletter via Omisend (même si pas éligible pour jouer)
        const newsletterResult = await subscribeToNewsletter(email);
        if (!newsletterResult.success) {
          console.warn('⚠️ Échec de l\'inscription à la newsletter:', newsletterResult.message);
        }

        // 4. Sauvegarder l'email localement comme fallback
        const { error: saveError } = await supabase
          .from('newsletter_subscribers')
          .upsert([{ 
            email, 
            status: newsletterResult.success ? 'success_from_wheel' : 'fallback_save',
            source: 'wheel_popup',
            updated_at: new Date().toISOString() 
          }], {
            onConflict: 'email'
          });

        if (saveError) {
          console.error('❌ Erreur lors de la sauvegarde locale:', saveError);
        }

        // 5. Passer à l'étape suivante dans tous les cas
        setShowEmailForm(false);
        setEmailValidated(true);
        
        toast.success("Email enregistré ! Vous pouvez maintenant faire tourner la roue !");
      }
    } catch (error) {
      console.error('❌ Erreur lors de la soumission:', error);
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  // 🆕 FONCTION pour générer une empreinte du navigateur (anti-contournement)
  const generateBrowserFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL(),
      memory: (navigator as any).deviceMemory || 'unknown',
      cores: navigator.hardwareConcurrency || 'unknown'
    };
    
    // Créer un hash simple
    const fingerprintString = JSON.stringify(fingerprint);
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
      const char = fingerprintString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  };

  // 🆕 FONCTION pour obtenir l'IP approximative (côté client)
  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown'; // Fallback pour éviter le blocage CORS
    }
  };

  // Ajout d'une fonction pour débloquer la roue (reset timer)
  const handleForceUnlock = () => {
    setCanSpin(true);
    setTimeUntilNextSpin(0);
    setNextSpinTimestamp(null);
    setRealTimeCountdown({ hours: 0, minutes: 0, seconds: 0 });
    toast.success('La roue est débloquée pour test !');
  };

  // 🎁 Fonction pour vider le panier des cadeaux de la roue
  const handleClearWheelGifts = () => {
    const clearedCount = clearWheelGifts();
    if (clearedCount > 0) {
      toast.success(`🗑️ ${clearedCount} cadeau(x) de la roue supprimé(s) du panier !`);
    } else {
      toast.info('Aucun cadeau de la roue à supprimer dans le panier.');
    }
  };

  // Vérification de la somme des pourcentages
  useEffect(() => {
    const total = segmentsData.reduce((sum, seg) => sum + (Number(seg.percentage) || 0), 0);
    if (total !== 100) {
      console.warn(`⚠️ La somme des pourcentages de la roue est ${total}%. Corrigez pour obtenir 100%.`);
    }
  }, [segmentsData]);

  // 🔍 Debug - surveillance des états AVEC PROTECTION
  useEffect(() => {
    if (emailValidated) {
      console.log('⭐ 🔍 États React mis à jour:', {
        emailValidated,
        canSpin,
        timeUntilNextSpin,
        nextSpinTimestamp: nextSpinTimestamp?.toISOString(),
        showTimer: emailValidated && !canSpin && timeUntilNextSpin > 0,
        isEditMode
      });
      
      // 🚨 VÉRIFICATION : si les valeurs sont incohérentes, alerter
      if (!canSpin && timeUntilNextSpin === 0) {
        console.warn('⚠️ INCOHÉRENCE DÉTECTÉE: canSpin=false mais timeUntilNextSpin=0');
      }
      
      if (!canSpin && !nextSpinTimestamp) {
        console.warn('⚠️ INCOHÉRENCE DÉTECTÉE: canSpin=false mais nextSpinTimestamp=null');
      }
    }
  }, [emailValidated, canSpin, timeUntilNextSpin, nextSpinTimestamp, isEditMode]);

  // 🆕 Formulaire de test en mode édition
  const handleTestEmailSubmit = async () => {
    if (!testEmail || !validateEmail(testEmail)) {
      setTestEmailResult({ success: false, message: "Veuillez entrer une adresse email valide" });
      return;
    }

    try {
      const result = await subscribeToNewsletter(testEmail);
      setTestEmailResult(result);
      
      // 🆕 Modification de la structure pour correspondre à la table
      const { error: saveError } = await supabase
        .from('newsletter_subscribers')
        .upsert([{ 
          email: testEmail, 
          status: result.success ? 'success' : 'error',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'email'
        });

      if (saveError) {
        console.error('❌ Erreur lors de la sauvegarde locale:', saveError);
      }
    } catch (error) {
      console.error('❌ Erreur lors du test:', error);
      setTestEmailResult({ success: false, message: "Une erreur est survenue lors du test" });
    }
  };

  // 🛒 Fonction pour charger les produits de test
  const loadTestProducts = async () => {
    try {
      // Utiliser fetchStripeProducts comme dans le reste du code
      const { fetchStripeProducts } = await import('@/lib/api/stripe');
      const stripeProducts = await fetchStripeProducts();
      
      if (stripeProducts && stripeProducts.length > 0) {
        // Prendre les 10 premiers produits Stripe
        const limitedProducts = stripeProducts.slice(0, 10);
        
        setTestProducts(limitedProducts.map(p => ({
          id: p.id, // ID Stripe
          title: p.title,
          price: p.price
        })));
        
        console.log('🛒 [TEST] Produits Stripe chargés:', limitedProducts.length);
      } else {
        console.log('🛒 [TEST] Aucun produit Stripe trouvé');
      }
    } catch (error) {
      console.error('❌ Erreur chargement produits Stripe test:', error);
    }
  };

  // 🛒 Fonction pour tester les paniers abandonnés
  const handleTestAbandonedCart = async () => {
    if (!testProductId || !testAbandonedEmail || !validateEmail(testAbandonedEmail)) {
      setTestAbandonedResult({ 
        success: false, 
        message: "Veuillez sélectionner un produit et entrer un email valide" 
      });
      return;
    }

    setIsTestingAbandoned(true);
    setTestAbandonedResult(null);

    try {
      // Récupérer les détails du produit sélectionné
      const selectedProduct = testProducts.find(p => p.id === testProductId);
      if (!selectedProduct) {
        throw new Error('Produit non trouvé');
      }

      // Créer un panier abandonné de test
      const testCartItems = [{
        id: testProductId,
        title: selectedProduct.title,
        price: selectedProduct.price,
        quantity: 1,
        image_url: null,
        variant: null,
        stripe_price_id: null,
        is_gift: false,
        threshold_gift: false
      }];

      const cartTotal = selectedProduct.price;
      const itemCount = 1;

      console.log('🛒 [TEST] Création panier abandonné:', {
        email: testAbandonedEmail,
        product: selectedProduct.title,
        total: cartTotal
      });

      // Insérer dans la table abandoned_carts
      const { error } = await supabase
        .from('abandoned_carts')
        .upsert({
          email: testAbandonedEmail.toLowerCase().trim(),
          user_id: null,
          cart_items: testCartItems,
          cart_total: cartTotal,
          item_count: itemCount,
          abandoned_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          status: 'abandoned',
          email_sent_count: 0
        }, {
          onConflict: 'email'
        });

      if (error) {
        throw error;
      }

      setTestAbandonedResult({
        success: true,
        message: `Panier abandonné créé avec succès ! Produit: ${selectedProduct.title} (${cartTotal}€). Le prochain cron enverra l'email de récupération.`
      });

      // Réinitialiser les champs
      setTestProductId("");
      setTestAbandonedEmail("");

    } catch (error) {
      console.error('❌ [TEST] Erreur création panier abandonné:', error);
      setTestAbandonedResult({
        success: false,
        message: `Erreur lors de la création: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      });
    } finally {
      setIsTestingAbandoned(false);
    }
  };

  // Fonction pour sauvegarder les paramètres de la roue et re-vérifier l'éligibilité
  const saveWheelSettings = async (newSettings: any) => {
    if (!isEditMode) return;

    try {
      const { error } = await supabase
        .from('wheel_settings')
        .upsert({
          ...newSettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      // 🔄 IMPORTANT : Mettre à jour les paramètres AVANT le recalcul
      const oldParticipationDelay = wheelSettings.participation_delay;
      setWheelSettings(newSettings);
      
      // 🔄 Re-calculer le timer avec les nouveaux paramètres si un email est présent ET si participation_delay a changé
      if (email && emailValidated && newSettings.participation_delay !== oldParticipationDelay) {
        console.log('⭐ 🔄 [ÉDITION] participation_delay changé de', oldParticipationDelay, 'à', newSettings.participation_delay);
        console.log('⭐ 🔄 [ÉDITION] Recalcul IMMÉDIAT du timer pour:', email);
        await recalculateTimerWithNewSettings(email, newSettings.participation_delay || 72);
      }
      
      toast.success('Paramètres sauvegardés !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
      toast.error('Erreur de sauvegarde');
    }
  };

  // 🆕 Fonction pour recalculer le timer avec de nouveaux paramètres
  const recalculateTimerWithNewSettings = async (emailToCheck: string, newParticipationHours: number) => {
    try {
      console.log('⭐ 🔄 [ÉDITION] Recalcul en cours pour:', emailToCheck, 'avec', newParticipationHours, 'heures');
      
      // ⚠️ NE RECALCULER QUE SI CE N'EST PAS LA VALIDATION INITIALE
      if (!emailValidated) {
        console.log('⭐ 🔄 [ÉDITION] Email pas encore validé, on skip le recalcul');
        return;
      }
      
      // Rechercher la dernière participation (même logique que handleEmailSubmit)
      const { data: spinsForEmail } = await supabase
        .from('wheel_spins')
        .select('user_id, created_at, user_email')
        .eq('user_email', emailToCheck.toLowerCase().trim())
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: entriesForEmail } = await supabase
        .from('wheel_email_entries')
        .select('created_at, email')
        .eq('email', emailToCheck.toLowerCase().trim())
        .order('created_at', { ascending: false })
        .limit(1);

      let lastParticipation = null;
      const hasSpins = spinsForEmail && spinsForEmail.length > 0;
      const hasEntries = entriesForEmail && entriesForEmail.length > 0;

      if (hasSpins && hasEntries) {
        const spinsDate = new Date(spinsForEmail[0].created_at);
        const entriesDate = new Date(entriesForEmail[0].created_at);
        lastParticipation = spinsDate > entriesDate ? spinsForEmail[0] : entriesForEmail[0];
      } else if (hasSpins) {
        lastParticipation = spinsForEmail[0];
      } else if (hasEntries) {
        lastParticipation = entriesForEmail[0];
      }

      if (lastParticipation) {
        const lastSpinDate = new Date(lastParticipation.created_at);
        const now = new Date();
        const nextAllowedTime = new Date(lastSpinDate.getTime() + newParticipationHours * 60 * 60 * 1000);
        const timeLeft = nextAllowedTime.getTime() - now.getTime();

        console.log('⭐ 🔄 [ÉDITION] Nouveau calcul:', {
          lastSpinDate: lastSpinDate.toISOString(),
          newParticipationHours,
          nextAllowedTime: nextAllowedTime.toISOString(),
          timeLeft,
          canSpin: timeLeft <= 0
        });

        if (timeLeft > 0) {
          const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
          setCanSpin(false);
          setTimeUntilNextSpin(hoursLeft);
          setNextSpinTimestamp(nextAllowedTime);
          console.log('⭐ ✅ [ÉDITION] Timer RECALCULÉ avec nouveaux paramètres:', {
            ancienneValeur: '(dépend de la base)',
            nouvelleValeur: hoursLeft + 'h',
            nextSpinTimestamp: nextAllowedTime.toISOString(),
            participationHours: newParticipationHours
          });
        } else {
          setCanSpin(true);
          setTimeUntilNextSpin(0);
          setNextSpinTimestamp(null);
          console.log('⭐ ✅ [ÉDITION] Timer expiré avec nouveaux paramètres');
        }
      } else {
        setCanSpin(true);
        setTimeUntilNextSpin(0);
        setNextSpinTimestamp(null);
        console.log('⭐ ✅ [ÉDITION] Aucune participation - peut jouer');
      }
    } catch (error) {
      console.error('⭐ ❌ [ÉDITION] Erreur recalcul timer:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className={`relative flex bg-white rounded-lg shadow-lg ${isEditMode ? 'max-w-5xl w-full h-[95vh] sm:h-[90vh]' : 'max-w-lg w-full max-h-[95vh] sm:max-h-[90vh]'} overflow-hidden`}>
        {/* Roue à gauche */}
        <div className={`${isEditMode ? "flex-shrink-0" : "flex flex-col w-full"}`}>
        {/* Header avec bouton fermer - FIXE */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-cyan-100 flex-shrink-0">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#0074b3' }}>🐠 {wheelSettings.title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
              className="text-gray-400 hover:text-blue-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Contenu principal - SCROLLABLE */}
          <div className={`${isEditMode ? 'p-2 sm:p-4' : 'p-4 sm:p-6'} text-center overflow-y-auto flex-1`}>
            <p className="mb-8 text-base font-medium" style={{ color: '#0074b3' }}>
              🌊 {wheelSettings.description} 🐟
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center h-80">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                <span className="ml-4 text-cyan-700 font-medium">Chargement de la roue...</span>
              </div>
            ) : (
              <>
          {/* Container de la roue avec poissons animés */}
          <div className="relative mx-auto mb-6 sm:mb-8 flex-shrink-0" style={{ width: '280px', height: '280px' }}>
            {/* Poissons qui nagent autour de la roue */}
            <div className="absolute inset-0">
              {/* Poisson 1 - tourne dans le sens horaire */}
              <div 
                className={`absolute w-8 h-8 text-2xl ${isSpinning ? 'animate-spin' : ''}`}
                style={{
                  animation: isSpinning ? 'swim-clockwise 2s linear infinite' : 'float 3s ease-in-out infinite',
                  top: '10%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  transformOrigin: '50% 140px'
                }}
              >
                🐠
              </div>
              {/* Poisson 2 - tourne dans le sens antihoraire */}
              <div 
                className={`absolute w-8 h-8 text-2xl ${isSpinning ? 'animate-spin' : ''}`}
                style={{
                  animation: isSpinning ? 'swim-counter-clockwise 2.5s linear infinite' : 'float 4s ease-in-out infinite 1s',
                  bottom: '10%',
                  right: '20%',
                  transformOrigin: '0 -140px'
                }}
              >
                🐟
              </div>
              {/* Poisson 3 - plus petit, tourne plus vite */}
              <div 
                className={`absolute w-6 h-6 text-xl ${isSpinning ? 'animate-spin' : ''}`}
                style={{
                  animation: isSpinning ? 'swim-fast 1.5s linear infinite' : 'float 2.5s ease-in-out infinite 0.5s',
                  left: '15%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  transformOrigin: '120px 0'
                }}
              >
                🐡
              </div>
            </div>

            {/* Indicateur fixe (flèche) */}
            <div className="absolute top-5 left-1/2 transform -translate-x-1/2 -translate-y-1 z-10">
                    <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-b-[25px] border-l-transparent border-r-transparent border-b-orange-400 drop-shadow-lg"></div>
            </div>

            {/* La roue */}
            <div 
              className="relative w-full h-full rounded-full shadow-xl border-4 border-cyan-200 overflow-hidden"
              style={{
                width: '240px',
                height: '240px',
                margin: '20px auto',
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none'
              }}
            >
              {segments.map((segment, index) => {
                const angle = (360 / segments.length) * index;
                const nextAngle = (360 / segments.length) * (index + 1);
                      const midAngle = angle + (nextAngle - angle) / 2;
                return (
                  <div
                    key={index}
                          className={`absolute w-full h-full ${segment.color} border-r border-white/30`}
                    style={{
                      clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((angle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((angle - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((nextAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((nextAngle - 90) * Math.PI / 180)}%)`,
                            transformOrigin: 'center',
                    }}
                  >
                    <div 
                      style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: `translate(-50%, -50%) rotate(${midAngle}deg) translateY(-60px)`,
                              width: segment.image_url ? '50px' : '120px',
                              height: segment.image_url ? '50px' : 'auto',
                              textAlign: 'center',
                              fontWeight: 'bold',
                              fontSize: '0.9rem',
                              color: segment.color.includes('bg-[#e0f2fe]') || segment.color.includes('bg-[#60a5fa]') ? '#1e3a8a' : '#ffffff',
                              textShadow: '1px 1px 3px rgba(0,0,0,0.7)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                      }}
                    >
                            {segment.image_url ? (
                              <img
                                src={segment.image_url}
                                alt="Segment"
                                style={{
                                  width: '45px',
                                  height: '45px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  border: '2px solid rgba(255,255,255,0.9)',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                                  display: 'block',
                                  margin: '0 auto',
                                }}
                              />
                            ) : (
                              segment.text
                            )}
                    </div>
                  </div>
                );
              })}
              {/* Centre de la roue avec poisson */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-cyan-500 rounded-full border-4 border-white shadow-lg z-10 flex items-center justify-center">
                      <span className="text-white text-2xl">🐠</span>
              </div>
            </div>
          </div>

          {/* 🆕 FORMULAIRE D'EMAIL EN DESSOUS DE LA ROUE */}
          {!emailValidated ? (
            <div className="mb-6 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-4 border-2 border-cyan-200">
              <h3 className="text-lg font-bold text-cyan-800 mb-3">
                📧 Saisissez votre email pour participer
              </h3>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@example.com"
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:outline-none text-gray-700 font-medium transition-colors"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleEmailSubmit();
                    }
                  }}
                />
                <Button
                  onClick={handleEmailSubmit}
                  disabled={isValidatingEmail || !email.trim() || isCheckingEligibility}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isValidatingEmail || isCheckingEligibility ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    '✅'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Email validé - badge différent selon le statut */
            <div className="mb-4">
              {isUserConnected ? (
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-medium">
                  👤 Connecté en tant que {email}
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full font-medium">
                  ✅ Email validé : {email}
                </div>
              )}
            </div>
          )}

          {/* 🆕 AFFICHAGE DU TIMER SI PAS ÉLIGIBLE */}
          {emailValidated && !canSpin && nextSpinTimestamp && (
            <div className="mb-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200">
              <div className="text-center">
                <div className="text-3xl mb-2">⏰</div>
                <h3 className="text-lg font-bold text-orange-800 mb-2">
                  Patience, aquariophile !
                </h3>
                
                {/* 🆕 COMPTE À REBOURS EN TEMPS RÉEL */}
                <div className="bg-white rounded-lg p-3 mb-3 border border-orange-300">
                  <p className="text-sm text-orange-600 mb-1">Prochaine tentative dans :</p>
                  <div className="flex justify-center items-center gap-2 text-2xl font-bold text-orange-800">
                    <div className="flex flex-col items-center">
                      <span className="bg-orange-100 px-2 py-1 rounded min-w-[50px]">
                        {String(realTimeCountdown.hours).padStart(2, '0')}
                      </span>
                      <span className="text-xs text-orange-600 mt-1">heures</span>
                    </div>
                    <span className="text-orange-400">:</span>
                    <div className="flex flex-col items-center">
                      <span className="bg-orange-100 px-2 py-1 rounded min-w-[50px]">
                        {String(realTimeCountdown.minutes).padStart(2, '0')}
                      </span>
                      <span className="text-xs text-orange-600 mt-1">min</span>
                    </div>
                    <span className="text-orange-400">:</span>
                    <div className="flex flex-col items-center">
                      <span className="bg-orange-100 px-2 py-1 rounded min-w-[50px]">
                        {String(realTimeCountdown.seconds).padStart(2, '0')}
                      </span>
                      <span className="text-xs text-orange-600 mt-1">sec</span>
                    </div>
                  </div>
                </div>
                

              </div>
            </div>
          )}

          {/* Bouton pour lancer la roue */}
          <Button
            onClick={handleSpin}
            disabled={isSpinning || !emailValidated || !canSpin || isCheckingEligibility}
            className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-lg rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSpinning ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                🌊 La roue tourne...
              </>
            ) : isCheckingEligibility ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Vérification...
              </>
            ) : !emailValidated ? (
              '📧 Saisissez votre email pour jouer'
            ) : !canSpin ? (
              realTimeCountdown.hours > 0 
                ? `⏰ Attendez ${realTimeCountdown.hours}h ${realTimeCountdown.minutes}min`
                : realTimeCountdown.minutes > 0
                  ? `⏰ Attendez ${realTimeCountdown.minutes}min ${realTimeCountdown.seconds}s`
                  : `⏰ Attendez ${realTimeCountdown.seconds}s`
            ) : (
              '🎣 Lancer la roue aquatique'
            )}
          </Button>

                {isEditMode && (
                  <div className="text-xs text-blue-500 mt-4 space-y-1">
                    <div className="bg-blue-50 p-2 rounded border border-blue-200">
                      <p className="font-semibold text-blue-700 mb-1">⚙️ Configuration actuelle :</p>
                      <p>• Popup auto : {wheelSettings.auto_show_popup ? `✅ Oui (${wheelSettings.auto_show_delay}s)` : '❌ Non'}</p>
                      <p>• Scroll trigger : {wheelSettings.scroll_trigger_enabled ? `✅ Oui (${wheelSettings.scroll_trigger_percentage}%)` : '❌ Non'}</p>
                      <p>• Délai participation : {wheelSettings.participation_delay}h</p>
                      <p>• Mode fréquence : {
                        wheelSettings.participation_frequency === 'per_3days' ? `Personnalisé (${wheelSettings.participation_delay}h)` :
                        wheelSettings.participation_frequency === 'per_session' ? 'Par session' :
                        wheelSettings.participation_frequency === 'per_day' ? 'Quotidien (24h)' :
                        wheelSettings.participation_frequency === 'per_week' ? 'Hebdomadaire (168h)' :
                        'Personnalisé'
                      }</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Panneau d'édition à droite si mode édition */}
        {isEditMode && (
          <div className="ml-4 w-56 bg-gray-50 border-l border-gray-200 rounded-lg p-3 flex flex-col gap-2 overflow-y-auto flex-shrink-0">
            {/* Paramètres généraux */}
            <div className="mb-4 p-3 bg-white rounded border">
              <h3 className="font-bold text-sm mb-2" style={{ color: '#0074b3' }}>Paramètres généraux</h3>
              
              {/* Titre */}
              <div className="mb-2">
                <label className="text-xs text-gray-600">Titre</label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={wheelSettings.title}
                  onChange={e => saveWheelSettings({ ...wheelSettings, title: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="mb-2">
                <label className="text-xs text-gray-600">Description</label>
                <textarea
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={wheelSettings.description}
                  onChange={e => saveWheelSettings({ ...wheelSettings, description: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Toggle pour activer/désactiver */}
              <div className="flex items-center justify-between mt-2">
                <label className="text-xs text-gray-600">Activer la roue</label>
                <button
                  onClick={() => saveWheelSettings({ ...wheelSettings, is_enabled: !wheelSettings.is_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    wheelSettings.is_enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      wheelSettings.is_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Affichage automatique du popup */}
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-600">Affichage automatique</label>
                <button
                  onClick={() => saveWheelSettings({ ...wheelSettings, auto_show_popup: !wheelSettings.auto_show_popup })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    wheelSettings.auto_show_popup ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      wheelSettings.auto_show_popup ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Délai avant affichage - uniquement si auto_show_popup est activé */}
              {wheelSettings.auto_show_popup && (
                <div className="mb-2">
                  <label className="text-xs text-gray-600">Délai avant affichage (secondes)</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={wheelSettings.auto_show_delay}
                    onChange={e => saveWheelSettings({ ...wheelSettings, auto_show_delay: parseInt(e.target.value) })}
                    min={0}
                  />
                </div>
              )}

              {/* Déclenchement par scroll */}
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-600">Déclenchement au scroll</label>
                <button
                  onClick={() => saveWheelSettings({ ...wheelSettings, scroll_trigger_enabled: !wheelSettings.scroll_trigger_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    wheelSettings.scroll_trigger_enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      wheelSettings.scroll_trigger_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Pourcentage de scroll - uniquement si scroll_trigger_enabled est activé */}
              {wheelSettings.scroll_trigger_enabled && (
                <div className="mb-2">
                  <label className="text-xs text-gray-600">Déclenchement à {wheelSettings.scroll_trigger_percentage}% du scroll</label>
                  <input
                    type="range"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    min="10"
                    max="90"
                    step="5"
                    value={wheelSettings.scroll_trigger_percentage}
                    onChange={e => saveWheelSettings({ ...wheelSettings, scroll_trigger_percentage: parseInt(e.target.value) })}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10%</span>
                    <span className="font-semibold text-blue-600">{wheelSettings.scroll_trigger_percentage}%</span>
                    <span>90%</span>
                  </div>
                </div>
              )}

              {/* Pages où afficher */}
              <div className="mb-2">
                <label className="text-xs text-gray-600">Pages où afficher (séparées par ,)</label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={wheelSettings.show_on_pages}
                  onChange={e => saveWheelSettings({ ...wheelSettings, show_on_pages: e.target.value })}
                />
              </div>

              {/* Afficher uniquement si panier ... */}
              <div className="mb-2">
                <label className="text-xs text-gray-600">Afficher uniquement si</label>
                <select
                  className="w-full border rounded px-2 py-1 text-xs"
                  value={wheelSettings.show_when_cart}
                  onChange={e => saveWheelSettings({ ...wheelSettings, show_when_cart: e.target.value })}
                >
                  <option value="any">Peu importe le panier</option>
                  <option value="empty">Panier vide</option>
                  <option value="full">Panier plein</option>
                </select>
              </div>

              {/* Ciblage visiteurs */}
              <div className="mb-2">
                <label className="text-xs text-gray-600">Afficher uniquement aux</label>
                <select
                  className="w-full border rounded px-2 py-1 text-xs"
                  value={wheelSettings.show_to}
                  onChange={e => saveWheelSettings({ ...wheelSettings, show_to: e.target.value })}
                >
                  <option value="all">Tous</option>
                  <option value="new">Nouveaux visiteurs</option>
                  <option value="not_subscribed">Non-abonnés</option>
                </select>
              </div>

              {/* Délai entre participations */}
              <div className="mb-2">
                <label className="text-xs text-gray-600">Délai entre deux participations (heures)</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={wheelSettings.participation_delay}
                  onChange={e => saveWheelSettings({ ...wheelSettings, participation_delay: parseInt(e.target.value) })}
                  min={1}
                />
              </div>

              {/* Fréquence de participation */}
              <div className="mb-2">
                <label className="text-xs text-gray-600">Fréquence de participation (basée sur le délai ci-dessus)</label>
                <select
                  className="w-full border rounded px-2 py-1 text-xs"
                  value={wheelSettings.participation_frequency}
                  onChange={e => saveWheelSettings({ ...wheelSettings, participation_frequency: e.target.value })}
                >
                  <option value="per_3days">Toutes les {wheelSettings.participation_delay || 72}h (personnalisé)</option>
                  <option value="per_session">Par session de navigation</option>
                  <option value="per_day">Une fois par jour (24h)</option>
                  <option value="per_week">Une fois par semaine (168h)</option>
                </select>
                <div className="text-xs text-blue-600 mt-1">
                  ℹ️ Mode "{wheelSettings.participation_frequency === 'per_3days' ? 'personnalisé' : 
                         wheelSettings.participation_frequency === 'per_session' ? 'par session' :
                         wheelSettings.participation_frequency === 'per_day' ? 'quotidien' : 'hebdomadaire'}" activé
                </div>
              </div>

              {/* Texte du bouton flottant */}
              <div className="mb-2">
                <label className="text-xs text-gray-600">Texte du bouton flottant</label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={wheelSettings.floating_button_text}
                  onChange={e => saveWheelSettings({ ...wheelSettings, floating_button_text: e.target.value })}
                />
              </div>

              {/* Position du bouton flottant */}
              <div className="mb-2">
                <label className="text-xs text-gray-600">Position du bouton flottant</label>
                <select
                  className="w-full border rounded px-2 py-1 text-xs"
                  value={wheelSettings.floating_button_position}
                  onChange={e => saveWheelSettings({ ...wheelSettings, floating_button_position: e.target.value })}
                >
                  <option value="bottom_right">Bas droite</option>
                  <option value="bottom_left">Bas gauche</option>
                  <option value="top_right">Haut droite</option>
                  <option value="top_left">Haut gauche</option>
                </select>
              </div>

              {/* Cooldown anti-spam */}
              <div className="mb-2">
                <label className="text-xs text-gray-600">Ne pas réafficher le popup avant (jours)</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={wheelSettings.popup_seen_cooldown}
                  onChange={e => saveWheelSettings({ ...wheelSettings, popup_seen_cooldown: parseInt(e.target.value) })}
                  min={1}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm mb-1" style={{ color: '#0074b3' }}>Édition des segments</h3>
              {isSaving && (
                <div className="flex items-center gap-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                  <span className="text-xs text-blue-600">Sauvegarde...</span>
                </div>
              )}
            </div>
            
            {segmentsData.map((data, idx) => (
              <div key={idx} className="flex flex-col gap-1.5 p-2 bg-white rounded border text-xs">
                <label className="text-xs font-medium text-gray-700">Segment {idx + 1}</label>
                
                {!data.image_url ? (
                  <>
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Texte du segment"
                      value={data.text}
                      onChange={e => {
                        handleTextChange(idx, e.target.value);
                      }}
                    />
                    <label className="flex items-center justify-center px-2 py-1 bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100 transition-colors">
                      <span className="text-xs text-blue-700">📁 Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          handleImageUpload(idx, e);
                        }}
                      />
                    </label>
                  </>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Image</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleRemoveImage(idx);
                        }}
                        className="text-red-500 hover:text-red-700 h-4 w-4 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <img
                      src={data.image_url}
                      alt={`Segment ${idx + 1}`}
                      className="w-12 h-12 object-cover rounded border mx-auto"
                    />
                    <label className="flex items-center justify-center px-1 py-0.5 bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100 transition-colors">
                      <span className="text-xs text-blue-700">🔄</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          handleImageUpload(idx, e);
                        }}
                      />
                    </label>
                  </div>
                )}
                
                {/* Input pour le pourcentage */}
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-600">%:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="flex-1 border rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    value={data.percentage}
                    onChange={e => {
                      handlePercentageChange(idx, parseFloat(e.target.value) || 0);
                    }}
                  />
                </div>

                {/* Input pour le code promo (uniquement si pas d'image) */}
                {!data.image_url && (
                  <div className="flex flex-col gap-0.5">
                    <label className="text-xs text-gray-600">Code promo:</label>
                    <input
                      type="text"
                      className="border rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="PROMO2024..."
                      value={data.promo_code}
                      onChange={e => {
                        handlePromoCodeChange(idx, e.target.value);
                      }}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Bouton pour débloquer la roue (reset timer) */}
            <div className="mb-4 flex flex-col gap-2">
              <Button onClick={handleForceUnlock} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded shadow text-sm">
                🔓 Débloquer la roue (test admin)
              </Button>
              
              {/* 🎁 Bouton pour vider le panier des cadeaux de la roue */}
              <Button onClick={handleClearWheelGifts} className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded shadow text-sm">
                🗑️ Vider le panier des cadeaux ({cartItems.filter(item => item.type === 'wheel_gift').length})
              </Button>
              
               
            </div>

            {/* 🆕 Formulaire de test en mode édition */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">🔍 Tester la récupération d'emails</h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Entrez un email de test"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleTestEmailSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Tester
                </button>
              </div>
              {testEmailResult && (
                <div className={`mt-2 p-2 rounded ${
                  testEmailResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {testEmailResult.message}
                </div>
              )}
            </div>

            {/* 🛒 NOUVEAU : Test paniers abandonnés */}
            <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h3 className="text-lg font-semibold mb-4 text-orange-800">🛒 Tester les paniers abandonnés</h3>
              
              <div className="space-y-4">
                {/* Sélection du produit */}
                <div>
                  <label className="block text-sm font-medium text-orange-700 mb-2">
                    Produit à ajouter au panier test :
                  </label>
                  <select
                    value={testProductId}
                    onChange={(e) => setTestProductId(e.target.value)}
                    className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Sélectionner un produit...</option>
                    {testProducts.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.title} - {product.price}€
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email de test */}
                <div>
                  <label className="block text-sm font-medium text-orange-700 mb-2">
                    Email de test :
                  </label>
                  <input
                    type="email"
                    value={testAbandonedEmail}
                    onChange={(e) => setTestAbandonedEmail(e.target.value)}
                    placeholder="email@test.com"
                    className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                {/* Bouton de test */}
                <button
                  onClick={handleTestAbandonedCart}
                  disabled={!testProductId || !testAbandonedEmail || isTestingAbandoned}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTestingAbandoned ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Création du panier test...
                    </span>
                  ) : (
                    'Créer un panier abandonné test'
                  )}
                </button>

                {/* Résultat du test */}
                {testAbandonedResult && (
                  <div className={`p-3 rounded-lg ${
                    testAbandonedResult.success 
                      ? 'bg-green-100 text-green-800 border border-green-300' 
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    <div className="font-medium">{testAbandonedResult.success ? '✅ Succès' : '❌ Erreur'}</div>
                    <div className="text-sm mt-1">{testAbandonedResult.message}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Popup de résultat */}
      {showResult && winningSegment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 animate-fade-in">
          <div className="relative bg-gradient-to-br from-cyan-50 to-blue-100 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border-4 border-cyan-200 animate-bounce-in">
            {/* Bouton fermer */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowResult(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-blue-700 z-10"
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Header avec animation */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4 animate-pulse">🎉</div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#0074b3' }}>Félicitations !</h2>
              <p className="font-medium" style={{ color: '#0074b3' }}>🌊 Vous avez gagné :</p>
            </div>

            {/* Contenu du gain */}
            <div className="text-center mb-8">
              {winningSegment.image_url ? (
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={winningSegment.image_url}
                    alt="Votre gain"
                    className="w-32 h-32 object-cover rounded-xl border-4 border-cyan-300 shadow-lg animate-pulse"
                  />
                  {winningSegment.text && (
                    <p className="text-xl font-bold" style={{ color: '#0074b3' }}>{winningSegment.text}</p>
                  )}
                  <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                    <span className="text-2xl">🎁</span>
                    <span className="font-medium">Ajout automatique au panier...</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="p-6 bg-white rounded-xl border-2 border-cyan-300 shadow-inner">
                    <p className="text-4xl font-bold animate-pulse" style={{ color: '#0074b3' }}>
                      {winningSegment.text}
                    </p>
                  </div>
                  
                  {/* Affichage du code promo si présent */}
                  {winningSegment.promo_code && winningSegment.promo_code.trim() !== '' && (
                    <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-xl p-4 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🎫</span>
                        <p className="text-lg font-bold text-purple-800">Code promo :</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-white border-2 border-dashed border-purple-400 px-4 py-2 rounded-lg">
                          <span className="text-2xl font-mono font-bold text-purple-700 tracking-wider">
                            {winningSegment.promo_code}
                          </span>
                        </div>
                        <Button
                          onClick={() => copyPromoCode(winningSegment.promo_code)}
                          className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105"
                        >
                          📋 Copier
                        </Button>
                      </div>
                      <p className="text-xs text-purple-600 mt-2 animate-pulse">
                        ✨ Utilisez ce code lors de votre commande !
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer avec poissons animés */}
            <div className="text-center">
              <div className="flex justify-center gap-4 mb-4 text-3xl">
                <span className="animate-bounce delay-100">🐠</span>
                <span className="animate-bounce delay-200">🌊</span>
                <span className="animate-bounce delay-300">🐟</span>
              </div>
              
              {/* Boutons d'action */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowResult(false)}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-lg rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  🎣 Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animation de vol vers le panier */}
      {showAddToCartAnimation && animatingImage && (
        <div className="fixed inset-0 pointer-events-none z-70">
          <img
            src={animatingImage}
            alt="Gift flying to cart"
            className="absolute w-16 h-16 object-cover rounded-lg border-2 border-green-400 shadow-lg animate-fly-to-cart"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'flyToCart 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
            }}
          />
          
          {/* Particules d'effet */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-green-400 rounded-full animate-bounce"
                style={{
                  animation: `sparkle-${i} 1.5s ease-out forwards`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Styles CSS pour les animations des poissons */}
      <style jsx>{`
        /* ... (tes animations ici) ... */
      `}</style>

      {/* 🆕 Section de test admin pour l'alerte cadeau roue */}
      {isEditMode && (
        <div className="my-4 p-4 border rounded bg-blue-50">
          <h3 className="font-bold mb-2">Test alerte cadeau roue</h3>
          <Button
            onClick={async () => {
              const testEmail = prompt("Entrez l'email à tester (recevra l'alerte) :", email || "");
              if (!testEmail) return;
              // Supprime les anciens tests pour cet email
              await supabase
                .from('wheel_gift_in_cart')
                .delete()
                .eq('email', testEmail)
                .like('gift_id', 'test_gift_%');
              // Insère un cadeau test avec un gift_id vraiment unique
              const { error } = await supabase
                .from('wheel_gift_in_cart')
                .insert([{
                  email: testEmail,
                  user_id: null,
                  gift_id: `test_gift_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
                  gift_title: 'Test Cadeau Wheel',
                  gift_image_url: 'https://via.placeholder.com/150',
                  added_at: new Date().toISOString(),
                  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // expire dans 1h
                  notified_2h_before: false,
                  cart_url: window.location.origin + '/cart'
                }]);
              if (error) {
                toast.error("Erreur lors de l'insertion du test :", { description: error.message });
              } else {
                toast.success("Test inséré ! Lance le cron ou attends le prochain run pour recevoir l'email.");
              }
            }}
          >
            Tester l'alerte email cadeau roue
          </Button>
        </div>
      )}
    </div>
  );
};

export default LuckyWheelPopup;