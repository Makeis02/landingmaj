import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/useCartStore';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

interface LuckyWheelPopupProps {
  isOpen: boolean;
  onClose: () => void;
  isEditMode?: boolean;
}

const LuckyWheelPopup: React.FC<LuckyWheelPopupProps> = ({ isOpen, onClose, isEditMode = false }) => {
  console.log("WheelPopup rendered with isOpen:", isOpen);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [winningSegment, setWinningSegment] = useState<any>(null);
  const [showAddToCartAnimation, setShowAddToCartAnimation] = useState(false);
  const [animatingImage, setAnimatingImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [wheelSettings, setWheelSettings] = useState({ 
    title: 'Roue Aquatique', 
    description: 'Plongez dans l\'aventure et gagnez des cadeaux aquatiques !',
    is_enabled: true 
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
  
  // Importer la fonction addItem du store Zustand
  const { addItem, items: cartItems } = useCartStore();

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

  // Charger les données depuis Supabase au montage du composant
  useEffect(() => {
    if (isOpen) {
      loadWheelData();
      // 🆕 Vérifier si l'utilisateur est connecté
      checkUserAuth();
    } else {
      // 🆕 Réinitialiser les états email quand la modale se ferme
      setEmail('');
      setEmailValidated(false);
      setIsValidatingEmail(false);
      setIsUserConnected(false);
      setShowResult(false);
      setWinningSegment(null);
    }
  }, [isOpen]);

  // 🆕 TIMER EN TEMPS RÉEL - Met à jour le compte à rebours chaque seconde
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (nextSpinTimestamp && !canSpin) {
      interval = setInterval(() => {
        const now = new Date();
        const timeDiff = nextSpinTimestamp.getTime() - now.getTime();
        
        if (timeDiff <= 0) {
          // Timer expiré - utilisateur peut maintenant jouer
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
    }
    
    return () => {
      if (interval) clearInterval(interval);
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

      // Charger les paramètres
      const { data: settings, error: settingsError } = await supabase
        .from('wheel_settings')
        .select('*')
        .limit(1)
        .single();

      if (!settingsError && settings) {
        setWheelSettings({
          title: settings.title || 'Roue Aquatique',
          description: settings.description || 'Plongez dans l\'aventure et gagnez des cadeaux aquatiques !',
          is_enabled: settings.is_enabled || true
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

    // Vérifier si le cadeau est déjà dans le panier
    const existingGift = cartItems.find((item: any) => 
      item.id === segment.id && 
      item.type === 'wheel_gift'
    );

    if (existingGift) {
      toast.info("🎁 Ce cadeau est déjà dans votre panier !");
      return;
    }

    // Mapping conforme à CartItem
    const giftItem = {
      id: segment.id,
      type: 'wheel_gift',
      title: segment.title || segment.text || 'Cadeau de la roue',
      image_url: segment.image_url,
      price: 0,
      quantity: 1,
      won_at: wonAt.toISOString(),
      expires_at: new Date(wonAt.getTime() + 72 * 60 * 60 * 1000).toISOString(),
      is_gift: true
    };

    addItem(giftItem);
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
        } catch (error) {
          console.error('Erreur lors de l\'enregistrement du tirage:', error);
        }
        
        // 🆕 Mettre à jour l'éligibilité après le spin
        setCanSpin(false);
        setTimeUntilNextSpin(72); // 72 heures d'attente
        // 🆕 Définir le timestamp exact pour la prochaine tentative
        const nextAllowedTime = new Date(Date.now() + 72 * 60 * 60 * 1000);
        setNextSpinTimestamp(nextAllowedTime);
        
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

  // 🆕 FONCTION pour valider et passer à l'étape suivante
  const handleEmailSubmit = async () => {
    if (!email || !validateEmail(email)) {
      toast.error("Veuillez entrer une adresse email valide");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Vérifier l'éligibilité au spin
      const isEligible = await checkSpinEligibility(null, email);
      if (!isEligible) {
        toast.error("Vous avez déjà joué aujourd'hui. Revenez demain !");
        setIsLoading(false);
        return;
      }

      // 2. S'abonner à la newsletter via Omisend
      const newsletterResult = await subscribeToNewsletter(email);
      if (!newsletterResult.success) {
        console.warn('⚠️ Échec de l\'inscription à la newsletter:', newsletterResult.message);
        // On continue quand même, ce n'est pas bloquant
      }

      // 3. Sauvegarder l'email localement comme fallback
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

      // 4. Continuer avec le spin
      setShowEmailForm(false);
      setCanSpin(true);
      toast.success("Email enregistré ! Vous pouvez maintenant faire tourner la roue !");
    } catch (error) {
      console.error('❌ Erreur lors de la soumission:', error);
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
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
        
        // 🆕 Vérifier l'éligibilité pour jouer
        await checkSpinEligibility(user.id, user.email);
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

  // 🆕 FONCTION pour vérifier l'éligibilité à jouer (72h rule)
  const checkSpinEligibility = async (userId: string | null, userEmail: string): Promise<boolean> => {
    try {
      // Vérifier si l'utilisateur a déjà joué aujourd'hui
      const { data: existingEntry, error } = await supabase
        .from('wheel_email_entries')
        .select('created_at')
        .eq('email', userEmail.toLowerCase().trim())
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erreur lors de la vérification:', error);
        return false;
      }

      if (existingEntry) {
        console.log('⚠️ Utilisateur a déjà joué aujourd\'hui');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification d\'éligibilité:', error);
      return false;
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

  // Vérification de la somme des pourcentages
  useEffect(() => {
    const total = segmentsData.reduce((sum, seg) => sum + (Number(seg.percentage) || 0), 0);
    if (total !== 100) {
      console.warn(`⚠️ La somme des pourcentages de la roue est ${total}%. Corrigez pour obtenir 100%.`);
    }
  }, [segmentsData]);

  // 🆕 Fonction pour tester l'inscription à la newsletter
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

  // Fonction pour sauvegarder les paramètres de la roue
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
      
      setWheelSettings(newSettings);
      toast.success('Paramètres sauvegardés !');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
      toast.error('Erreur de sauvegarde');
    }
  };

  if (!isOpen) {
    console.log("WheelPopup not showing because isOpen is false");
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl p-4 sm:p-6 bg-white rounded-lg shadow-xl mx-4">
        {/* Bouton de fermeture mobile */}
        <button 
          onClick={onClose}
          className="absolute -top-3 -right-3 sm:top-2 sm:right-2 bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600 transition-colors z-10"
          aria-label="Fermer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Contenu de la popup */}
        <div className="relative">
          {isEditMode ? (
            <>
              <div className="text-center mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{wheelSettings.title}</h2>
                <p className="text-sm sm:text-base text-gray-600">{wheelSettings.description}</p>
              </div>

              {/* Zone de la roue */}
              <div className="relative w-full max-w-[300px] sm:max-w-[400px] mx-auto mb-4">
                {/* ... existing wheel content ... */}
              </div>

              {/* Zone de l'email */}
              {!emailValidated && !showResult && (
                <div className="mt-4 space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Votre email"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleEmailSubmit}
                    disabled={!validateEmail(email)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Valider mon email
                  </button>
                </div>
              )}

              {/* Bouton de fermeture en bas */}
              <div className="mt-4 text-center">
                <button
                  onClick={onClose}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Je ne veux pas jouer maintenant
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{wheelSettings.title}</h2>
                <p className="text-sm sm:text-base text-gray-600">{wheelSettings.description}</p>
              </div>

              {/* Zone de la roue */}
              <div className="relative w-full max-w-[300px] sm:max-w-[400px] mx-auto mb-4">
                {/* ... existing wheel content ... */}
              </div>

              {/* Zone de l'email */}
              {!emailValidated && !showResult && (
                <div className="mt-4 space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Votre email"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleEmailSubmit}
                    disabled={!validateEmail(email)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Valider mon email
                  </button>
                </div>
              )}

              {/* Bouton de fermeture en bas */}
              <div className="mt-4 text-center">
                <button
                  onClick={onClose}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Je ne veux pas jouer maintenant
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LuckyWheelPopup;