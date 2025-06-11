import React, { useState, useEffect } from 'react';
import { Gift } from 'lucide-react';
import LuckyWheelPopup from './WheelPopup';
import { supabase } from '@/integrations/supabase/client';
import { useWheelEligibility } from '@/hooks/useWheelEligibility';

const FloatingWheelButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const { isEligible, isLoading: isEligibilityLoading } = useWheelEligibility();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('wheel_settings')
          .select('*')
          .limit(1)
          .single();
        if (error) throw error;
        setSettings(data);
      } catch (error) {
        console.error("Error fetching wheel settings for button:", error);
      }
    };
    fetchSettings();
  }, []);

  if (!settings || !settings.is_enabled) {
    return null;
  }
  
  const positionClasses = {
    bottom_right: 'bottom-8 right-8',
    bottom_left: 'bottom-8 left-8',
    top_right: 'top-8 right-8',
    top_left: 'top-8 left-8',
  };

  const buttonClass = `
    fixed ${positionClasses[settings.floating_button_position] || 'bottom-8 right-8'} 
    bg-gradient-to-r from-cyan-500 to-blue-600 
    text-white 
    rounded-full 
    p-4 
    shadow-lg 
    hover:scale-110 
    transition-transform 
    duration-300 
    z-40
    flex items-center gap-2
    ${isEligible && !isEligibilityLoading ? 'animate-pulse' : ''}
  `;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={buttonClass}
        aria-label="Ouvrir la roue de la fortune"
      >
        <Gift className="h-6 w-6" />
        <span className="font-semibold hidden md:inline">{settings.floating_button_text || "Tentez votre chance !"}</span>
      </button>
      
      <LuckyWheelPopup isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default FloatingWheelButton; 