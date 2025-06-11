import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Helper functions (can be in a separate utils file if needed)
const generateBrowserFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'no-canvas-support';
  
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
  
  const fingerprintString = JSON.stringify(fingerprint);
  let hash = 0;
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
};

const getClientIP = async () => {
  try {
    // Note: This relies on a third-party service and might not always be reliable.
    // For critical use cases, consider a server-side IP lookup.
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) return 'unknown';
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
};


export const useWheelEligibility = () => {
  const [isEligible, setIsEligible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const checkEligibility = useCallback(async (emailToCheck?: string, idToCheck?: string) => {
    setIsLoading(true);
    try {
      let currentEmail = emailToCheck;
      let currentUserId = idToCheck;

      if (!currentEmail) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          currentEmail = user.email;
          currentUserId = user.id;
        }
      }
      
      setUserEmail(currentEmail);
      setUserId(currentUserId);

      if (!currentEmail) {
        // No email provided and no user logged in, assume eligible to see form
        setIsEligible(true); 
        setIsLoading(false);
        return;
      }

      const { data: settings, error: settingsError } = await supabase
        .from('wheel_settings')
        .select('participation_delay')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (settingsError) throw settingsError;
      
      const participationHours = settings.participation_delay || 72;
      const hoursAgo = new Date(Date.now() - participationHours * 60 * 60 * 1000);

      // Check both guest and user tables for the most recent participation
      const { data: guestEntry } = await supabase
        .from('wheel_email_entries')
        .select('created_at')
        .eq('email', currentEmail.toLowerCase().trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let { data: userSpin } = await supabase
        .from('wheel_spins')
        .select('created_at')
        .eq('user_email', currentEmail.toLowerCase().trim())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (currentUserId) {
         const { data: userSpinById } = await supabase
          .from('wheel_spins')
          .select('created_at')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (userSpinById && (!userSpin || new Date(userSpinById.created_at) > new Date(userSpin.created_at))) {
            userSpin = userSpinById;
        }
      }

      const lastSpinDate = guestEntry?.created_at && (!userSpin || new Date(guestEntry.created_at) > new Date(userSpin.created_at))
        ? new Date(guestEntry.created_at)
        : userSpin?.created_at ? new Date(userSpin.created_at) : null;

      if (lastSpinDate && lastSpinDate > hoursAgo) {
        setIsEligible(false);
      } else {
        setIsEligible(true);
      }
    } catch (error) {
      console.error("Error checking wheel eligibility:", error);
      setIsEligible(false); // Default to not eligible on error
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    // Initial check for logged-in user
    checkEligibility();
  }, [checkEligibility]);

  return { isEligible, isLoading, userEmail, userId, checkEligibility, generateBrowserFingerprint, getClientIP };
}; 