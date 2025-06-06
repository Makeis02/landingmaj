import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LuckyWheelPopupProps {
  isOpen: boolean;
  onClose: () => void;
  isEditMode?: boolean;
}

const LuckyWheelPopup: React.FC<LuckyWheelPopupProps> = ({ isOpen, onClose, isEditMode = false }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Textes éditables pour chaque segment
  const [segmentsTexts, setSegmentsTexts] = useState([
    "-15%",
    "🐠 Gratuit",
    "-10%", 
    "🌱 Offerte",
    "-20%",
    "💧 Perdu",
  ]);

  // Fonction pour ajuster la taille de police selon la longueur du texte
  const getFontSize = (text: string) => {
    if (text.length <= 4) return '1.1rem';
    if (text.length <= 8) return '0.9rem';
    if (text.length <= 12) return '0.75rem';
    return '0.65rem';
  };

  // Fonction pour ajuster la largeur du conteneur selon la longueur du texte
  const getTextWidth = (text: string) => {
    if (text.length <= 4) return '90px';
    if (text.length <= 8) return '120px';
    if (text.length <= 12) return '130px';
    return '140px';
  };

  // Segments de la roue : chaque segment a une nuance de bleu différente, pas de doublon
  const segments = [
    { text: segmentsTexts[0], color: "bg-ocean text-white" },           // Bleu principal
    { text: segmentsTexts[1], color: "bg-[#2563eb] text-white" }, // Bleu vif
    { text: segmentsTexts[2], color: "bg-[#60a5fa] text-ocean" },       // Bleu clair
    { text: segmentsTexts[3], color: "bg-[#1e40af] text-white" },  // Bleu foncé
    { text: segmentsTexts[4], color: "bg-[#3b82f6] text-white" },       // Bleu moyen
    { text: segmentsTexts[5], color: "bg-[#e0f2fe] text-ocean" },      // Bleu très pâle
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
      <div className="relative flex bg-white rounded-lg shadow-lg p-8">
        {/* Roue à gauche */}
        <div>
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
                        className="absolute top-1/2 left-1/2"
                        style={{
                          transform: `rotate(${midAngle}deg) translateY(-95px)`,
                          transformOrigin: 'center',
                        }}
                      >
                        <span
                          style={{
                            transform: `rotate(90deg)`,
                            display: 'inline-block',
                            width: getTextWidth(segment.text),
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: getFontSize(segment.text),
                            color: segment.color.includes('bg-[#e0f2fe]') || segment.color.includes('bg-[#60a5fa]') ? '#1e3a8a' : '#ffffff',
                            whiteSpace: 'normal',
                            overflow: 'visible',
                            lineHeight: 1.1,
                            textShadow: segment.color.includes('bg-[#e0f2fe]') || segment.color.includes('bg-[#60a5fa]') 
                              ? '1px 1px 2px rgba(0,0,0,0.3)' 
                              : '1px 1px 2px rgba(0,0,0,0.5)',
                            letterSpacing: '0.3px',
                            wordWrap: 'break-word',
                            hyphens: 'auto',
                            maxHeight: '60px',
                            padding: '2px 4px',
                          }}
                        >
                          {segment.text}
                        </span>
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

        {/* Panneau d'édition à droite si mode édition */}
        {isEditMode && (
          <div className="ml-8 w-64 bg-gray-50 border-l border-gray-200 rounded-lg p-4 flex flex-col gap-4">
            <h3 className="font-bold text-lg mb-2 text-ocean">Édition des segments</h3>
            {segmentsTexts.map((txt, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">Segment {idx + 1}</label>
                <input
                  type="text"
                  className="border rounded px-2 py-1 text-sm"
                  value={txt}
                  onChange={e => {
                    const arr = [...segmentsTexts];
                    arr[idx] = e.target.value;
                    setSegmentsTexts(arr);
                  }}
                />
              </div>
            ))}
          </div>
        )}
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