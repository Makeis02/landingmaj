import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import LuckyWheelPopup from './WheelPopup';

const FloatingWheelButton: React.FC = () => {
  const [isWheelOpen, setIsWheelOpen] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [wheelSettings, setWheelSettings] = useState({
    is_enabled: true,
    floating_button_text: 'Tentez votre chance !',
    floating_button_position: 'bottom_right'
  });

  // Charger les paramètres de la roue
  useEffect(() => {
    const loadWheelSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('wheel_settings')
          .select('*')
          .limit(1)
          .single();

        if (!error && data) {
          setWheelSettings({
            is_enabled: data.is_enabled !== false,
            floating_button_text: data.floating_button_text || 'Tentez votre chance !',
            floating_button_position: data.floating_button_position || 'bottom_right'
          });
        }
      } catch (error) {
        console.error('Erreur chargement paramètres roue:', error);
      }
    };

    loadWheelSettings();
  }, []);

  // Ne pas afficher le bouton si la roue est désactivée
  if (!wheelSettings.is_enabled) {
    return null;
  }

  // Déterminer la position du bouton
  const positionClasses = {
    bottom_right: 'bottom-6 right-6',
    bottom_left: 'bottom-6 left-6',
    top_right: 'top-6 right-6',
    top_left: 'top-6 left-6'
  };

  const positionClass = positionClasses[wheelSettings.floating_button_position] || positionClasses.bottom_right;

  return (
    <>
      {/* Style CSS personnalisé pour l'animation douce */}
      <style>{`
        @keyframes gentle-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        
        .gentle-pulse-animation {
          animation: gentle-pulse 3s ease-in-out infinite;
        }
        
        @keyframes gentle-glow {
          0%, 100% {
            box-shadow: 0 0 10px rgba(2, 119, 182, 0.3);
          }
          50% {
            box-shadow: 0 0 20px rgba(2, 119, 182, 0.6), 0 0 30px rgba(2, 119, 182, 0.4);
          }
        }
        
        .gentle-glow-animation {
          animation: gentle-glow 3s ease-in-out infinite;
        }
      `}</style>

      {/* Bouton flottant */}
      <button
        onClick={() => setIsWheelOpen(true)}
        data-wheel-button
        className={`fixed ${positionClass} z-40 w-16 h-16 rounded-full shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl group ${
          canSpin ? 'gentle-pulse-animation gentle-glow-animation' : ''
        }`}
        style={{ backgroundColor: '#0277b6' }}
        title={wheelSettings.floating_button_text}
      >
        {/* Icône roue animée */}
        <div className="w-full h-full flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            className="text-white group-hover:animate-spin"
          >
            {/* Roue de fortune simple */}
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              fill="rgba(255,255,255,0.1)"
            />
            <path
              d="M12 2 L12 12 L22 12"
              stroke="currentColor"
              strokeWidth="2"
              fill="rgba(255,255,255,0.2)"
            />
            <path
              d="M12 2 L12 12 L2 12"
              stroke="currentColor"
              strokeWidth="2"
              fill="rgba(255,255,255,0.3)"
            />
            <path
              d="M12 22 L12 12 L2 12"
              stroke="currentColor"
              strokeWidth="2"
              fill="rgba(255,255,255,0.1)"
            />
            <path
              d="M12 22 L12 12 L22 12"
              stroke="currentColor"
              strokeWidth="2"
              fill="rgba(255,255,255,0.2)"
            />
            <circle
              cx="12"
              cy="12"
              r="2"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Tooltip sur hover */}
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
          {wheelSettings.floating_button_text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </button>

      {/* Popup de la roue */}
      <LuckyWheelPopup
        isOpen={isWheelOpen}
        onClose={() => setIsWheelOpen(false)}
        onEligibilityChange={setCanSpin}
        isEditMode={false}
      />
    </>
  );
};

export default FloatingWheelButton; 