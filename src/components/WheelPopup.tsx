import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LuckyWheelPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const LuckyWheelPopup: React.FC<LuckyWheelPopupProps> = ({ isOpen, onClose }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Segments de la roue harmonisés avec des nuances de bleu du thème
  const segments = [
    { text: "-15%", color: "bg-ocean text-white" },           // Bleu principal
    { text: "Poisson gratuit", color: "bg-[#005a8c] text-white" }, // Bleu foncé
    { text: "-10%", color: "bg-[#00b4d8] text-ocean" },       // Bleu clair
    { text: "Plante offerte", color: "bg-[#60a5fa] text-ocean" },  // Bleu pastel
    { text: "-20%", color: "bg-[#2563eb] text-white" },       // Bleu vif
    { text: "Perdu", color: "bg-surface-light text-ocean" },  // Gris très clair tirant sur le bleu
    { text: "-5%", color: "bg-cyan-100" },
    { text: "Décor gratuit", color: "bg-emerald-100" },
    { text: "-25%", color: "bg-blue-300" },
    { text: "Perdu", color: "bg-slate-100" }
  ];

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    const randomRotation = Math.floor(Math.random() * 720) + 1440;
    setRotation(prev => prev + randomRotation);
    setTimeout(() => {
      setIsSpinning(false);
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-blue-100">
        {/* Header avec bouton fermer */}
        <div className="flex justify-between items-center p-6 border-b border-cyan-100">
          <h2 className="text-2xl font-bold text-blue-800 tracking-tight">🐠 Roue Aquatique</h2>
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
          <p className="text-blue-700 mb-8 text-base font-medium">
            🌊 Plongez dans l'aventure et gagnez des cadeaux aquatiques ! 🐟
          </p>

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
                return (
                  <div
                    key={index}
                    className={`absolute w-full h-full ${segment.color} flex items-center justify-center border-r border-white/30`}
                    style={{
                      clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((angle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((angle - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((nextAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((nextAngle - 90) * Math.PI / 180)}%)`,
                      transformOrigin: 'center'
                    }}
                  >
                    <div 
                      className="text-blue-900 font-bold text-sm drop-shadow-lg"
                      style={{
                        transform: `rotate(${angle + 18}deg) translateY(-60px)`,
                        transformOrigin: 'center'
                      }}
                    >
                      {segment.text}
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

          {/* Bouton pour lancer la roue */}
          <Button
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-lg rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSpinning ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                🌊 La roue tourne...
              </>
            ) : (
              '🎣 Lancer la roue aquatique'
            )}
          </Button>

          <p className="text-xs text-blue-500 mt-4">
            🐟 Une seule tentative par jour par aquariophile
          </p>
        </div>
      </div>

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
      `}</style>
    </div>
  );
};

export default LuckyWheelPopup;