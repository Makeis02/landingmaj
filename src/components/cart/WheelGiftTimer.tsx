import React, { useState, useEffect } from 'react';
import { Clock, Gift } from 'lucide-react';

interface WheelGiftTimerProps {
  expiresAt: string;
  title: string;
  isExpired?: boolean;
}

const WheelGiftTimer: React.FC<WheelGiftTimerProps> = ({ expiresAt, title, isExpired = false }) => {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds });

      // Clignote si moins d'une heure
      setIsBlinking(hours === 0 && minutes < 60);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (isExpired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
        <div className="bg-red-100 p-2 rounded-full">
          <Clock className="h-4 w-4 text-red-600" />
        </div>
        <div className="flex-1">
          <div className="text-red-800 font-semibold text-sm">🎁 Cadeau expiré</div>
          <div className="text-red-600 text-xs">Ce cadeau n'est plus valide</div>
        </div>
      </div>
    );
  }

  const { hours, minutes, seconds } = timeRemaining;
  const isUrgent = hours === 0 && minutes <= 30;

  return (
    <div className={`border rounded-lg p-3 transition-all duration-300 ${
      isUrgent 
        ? 'bg-orange-50 border-orange-200' 
        : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${
          isUrgent ? 'bg-orange-100' : 'bg-blue-100'
        }`}>
          <Gift className={`h-4 w-4 ${
            isUrgent ? 'text-orange-600' : 'text-blue-600'
          }`} />
        </div>
        
        <div className="flex-1">
          <div className={`font-semibold text-sm ${
            isUrgent ? 'text-orange-800' : 'text-blue-800'
          }`}>
            🎁 Cadeau de la roue
          </div>
          <div className={`text-xs ${
            isUrgent ? 'text-orange-600' : 'text-blue-600'
          }`}>
            {title}
          </div>
        </div>

        <div className="text-right">
          <div className={`text-xs font-medium ${
            isUrgent ? 'text-orange-700' : 'text-blue-700'
          }`}>
            Expire dans
          </div>
          <div className={`font-mono text-sm font-bold ${
            isUrgent ? 'text-orange-800' : 'text-blue-800'
          } ${isBlinking ? 'animate-pulse' : ''}`}>
            {hours.toString().padStart(2, '0')}:
            {minutes.toString().padStart(2, '0')}:
            {seconds.toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      {isUrgent && (
        <div className="mt-2 text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded font-medium text-center">
          ⚠️ Attention : Ce cadeau expire bientôt !
        </div>
      )}
    </div>
  );
};

export default WheelGiftTimer; 