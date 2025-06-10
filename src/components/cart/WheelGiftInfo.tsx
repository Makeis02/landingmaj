import React from 'react';
import { Gift, Clock, AlertTriangle, Info } from 'lucide-react';

interface WheelGiftInfoProps {
  wheelGiftsCount: number;
  hasExpiredGifts?: boolean;
  hasUrgentGifts?: boolean;
}

const WheelGiftInfo: React.FC<WheelGiftInfoProps> = ({ 
  wheelGiftsCount, 
  hasExpiredGifts = false, 
  hasUrgentGifts = false 
}) => {
  if (wheelGiftsCount === 0) return null;

  return (
    <div className="space-y-3">
      {/* Bannière principale */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-full shrink-0">
            <Gift className="h-5 w-5 text-blue-600" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-blue-800">
                🎡 {wheelGiftsCount} cadeau{wheelGiftsCount > 1 ? 'x' : ''} de la roue
              </h3>
            </div>
            
            <div className="text-sm text-blue-600 space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Validité : 72h après l'obtention</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span>Prix : Gratuit (ajout automatique au panier)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerte pour cadeaux expirés */}
      {hasExpiredGifts && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-red-800 font-medium text-sm">
              ⚠️ Certains cadeaux ont expiré et seront automatiquement retirés
            </span>
          </div>
        </div>
      )}

      {/* Alerte pour cadeaux urgents */}
      {hasUrgentGifts && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-orange-800 font-medium text-sm">
              ⏰ Certains cadeaux expirent bientôt ! Finalisez votre commande rapidement
            </span>
          </div>
        </div>
      )}

      {/* Conseil */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-gray-500 mt-0.5" />
          <div className="text-xs text-gray-600">
            <strong>💡 Astuce :</strong> Les cadeaux de la roue sont automatiquement ajoutés à votre commande 
            sans frais supplémentaires. Assurez-vous de commander avant expiration !
          </div>
        </div>
      </div>
    </div>
  );
};

export default WheelGiftInfo; 