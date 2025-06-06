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
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [winningSegment, setWinningSegment] = useState<any>(null);
  const [showAddToCartAnimation, setShowAddToCartAnimation] = useState(false);
  const [animatingImage, setAnimatingImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [wheelSettings, setWheelSettings] = useState({ title: 'Roue Aquatique', description: 'Plongez dans l\'aventure et gagnez des cadeaux aquatiques !' });
  
  // 🆕 NOUVEAUX ÉTATS pour la saisie d'email
  const [email, setEmail] = useState('');
  const [emailValidated, setEmailValidated] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [isUserConnected, setIsUserConnected] = useState(false);
  
  // Importer la fonction addItem du store Zustand
  const { addItem } = useCartStore();

  // Structure pour gérer texte, images, pourcentages ET codes promo - maintenant chargée depuis Supabase
  const [segmentsData, setSegmentsData] = useState([
    { id: null, position: 0, text: "-15%", image_url: null, percentage: 16.67, promo_code: "", is_active: true },
    { id: null, position: 1, text: "🐠 Gratuit", image_url: null, percentage: 16.67, promo_code: "", is_active: true },
    { id: null, position: 2, text: "-10%", image_url: null, percentage: 16.67, promo_code: "", is_active: true },
    { id: null, position: 3, text: "🌱 Offerte", image_url: null, percentage: 16.67, promo_code: "", is_active: true },
    { id: null, position: 4, text: "-20%", image_url: null, percentage: 16.67, promo_code: "", is_active: true },
    { id: null, position: 5, text: "💧 Perdu", image_url: null, percentage: 16.65, promo_code: "", is_active: true },
  ]);

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
          description: settings.description || 'Plongez dans l\'aventure et gagnez des cadeaux aquatiques !'
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
    const giftItem = {
      id: `wheel_gift_${Date.now()}`,
      title: segment.text || 'Cadeau mystère',
      image_url: segment.image_url || segment.image,
      price: 0,
      quantity: 1,
      is_gift: true,
      segment_position: segment.position || 0
    };

    addItem(giftItem);
    toast.success(`🎁 ${segment.text} ajouté à votre panier !`, {
      style: { 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none'
      }
    });
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
    if (isSpinning) return;
    setIsSpinning(true);
    setShowResult(false); // Cache le résultat précédent
    
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
      
      // Enregistrer le tirage dans Supabase (si utilisateur connecté)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('wheel_spins')
            .insert({
              user_id: user.id,
              segment_won: winningSegmentData.position,
              winning_text: winningSegmentData.text,
              winning_image_url: winningSegmentData.image_url,
              winning_promo_code: winningSegmentData.promo_code
            });
        }
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement du tirage:', error);
      }
      
      // Si c'est une image, ajouter automatiquement au panier après 2 secondes
      if (winningSegmentData?.image_url) {
        setTimeout(() => {
          handleAddGiftToCart(winningSegmentData);
        }, 2000); // 2 secondes après l'affichage de la popup
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
  };

  // 🆕 FONCTION de validation d'email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 🆕 FONCTION pour valider et passer à l'étape suivante
  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      toast.error('Veuillez saisir votre adresse email');
      return;
    }
    
    if (!validateEmail(email)) {
      toast.error('Veuillez saisir une adresse email valide');
      return;
    }
    
    setIsValidatingEmail(true);
    
    // Optionnel : Enregistrer l'email en base de données
    try {
      await supabase
        .from('wheel_email_entries')
        .insert({ 
          email: email.toLowerCase().trim(),
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.log('Email déjà enregistré ou erreur:', error);
      // On continue même si l'email existe déjà
    }
    
    // Simuler une petite validation
    setTimeout(() => {
      setIsValidatingEmail(false);
      setEmailValidated(true);
      toast.success('🐠 Email validé ! Vous pouvez maintenant lancer la roue !');
    }, 1000);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className={`relative flex bg-white rounded-lg shadow-lg ${isEditMode ? 'max-w-5xl w-full p-4' : 'p-8'}`}>
        {/* Roue à gauche */}
        <div className={isEditMode ? "flex-shrink-0" : ""}>
        {/* Header avec bouton fermer */}
        <div className="flex justify-between items-center p-6 border-b border-cyan-100">
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

        {/* Contenu principal */}
          <div className="p-6 text-center">
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
          <div className="relative mx-auto mb-8" style={{ width: '320px', height: '320px' }}>
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
                width: '280px',
                height: '280px',
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
                              transform: `translate(-50%, -50%) rotate(${midAngle}deg) translateY(-80px)`,
                              width: segment.image_url ? '60px' : '120px',
                              height: segment.image_url ? '60px' : 'auto',
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
                                  width: '40px',
                                  height: '40px',
                                  objectFit: 'cover',
                                  borderRadius: '6px',
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
                  disabled={isValidatingEmail || !email.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isValidatingEmail ? (
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

          {/* Bouton pour lancer la roue */}
          <Button
            onClick={handleSpin}
            disabled={isSpinning || !emailValidated}
            className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-lg rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSpinning ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                🌊 La roue tourne...
              </>
            ) : !emailValidated ? (
              '📧 Saisissez votre email pour jouer'
            ) : (
              '🎣 Lancer la roue aquatique'
            )}
          </Button>

                <p className="text-xs text-blue-500 mt-4">
            🐟 Une seule tentative par jour par aquariophile
          </p>
              </>
            )}
          </div>
        </div>

        {/* Panneau d'édition à droite si mode édition */}
        {isEditMode && (
          <div className="ml-4 w-56 bg-gray-50 border-l border-gray-200 rounded-lg p-3 flex flex-col gap-2 max-h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm mb-1" style={{ color: '#0074b3' }}>Édition des segments</h3>
              {isSaving && (
                <div className="flex items-center gap-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                  <span className="text-xs text-blue-600">Sauvegarde...</span>
                </div>
              )}
            </div>
            
            {/* Indicateur du total des pourcentages */}
            <div className={`p-2 rounded text-xs font-medium ${
              Math.abs(totalPercentage - 100) < 0.1 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              Total: {totalPercentage.toFixed(1)}% 
              {Math.abs(totalPercentage - 100) < 0.1 ? ' ✅' : ' ⚠️'}
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
        @keyframes swim-clockwise {
          from {
            transform: translateX(-50%) rotate(0deg) translateX(140px) rotate(0deg);
          }
          to {
            transform: translateX(-50%) rotate(360deg) translateX(140px) rotate(-360deg);
          }
        }
        @keyframes swim-counter-clockwise {
          from {
            transform: rotate(0deg) translateX(140px) rotate(0deg);
          }
          to {
            transform: rotate(-360deg) translateX(140px) rotate(360deg);
          }
        }
        @keyframes swim-fast {
          from {
            transform: translateY(-50%) rotate(0deg) translateX(120px) rotate(0deg);
          }
          to {
            transform: translateY(-50%) rotate(360deg) translateX(120px) rotate(-360deg);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(-100px);
          }
          50% {
            opacity: 1;
            transform: scale(1.05) translateY(0px);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0px);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        @keyframes flyToCart {
          0% {
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2) rotate(180deg);
            opacity: 0.8;
          }
          100% {
            top: 20px;
            left: calc(100% - 60px);
            transform: translate(-50%, -50%) scale(0.3) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes sparkle-0 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(-20px, -30px); opacity: 0; }
        }
        @keyframes sparkle-1 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(20px, -25px); opacity: 0; }
        }
        @keyframes sparkle-2 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(-15px, 20px); opacity: 0; }
        }
        @keyframes sparkle-3 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(25px, 15px); opacity: 0; }
        }
        @keyframes sparkle-4 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(-30px, 10px); opacity: 0; }
        }
        @keyframes sparkle-5 {
          0% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(15px, -20px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LuckyWheelPopup;