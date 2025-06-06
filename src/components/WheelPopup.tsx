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

  // Structure pour gérer texte, images ET pourcentages de chance
  const [segmentsData, setSegmentsData] = useState([
    { text: "-15%", image: null, chance: 15 },
    { text: "🐠 Gratuit", image: null, chance: 5 },
    { text: "-10%", image: null, chance: 20 },
    { text: "🌱 Offerte", image: null, chance: 10 },
    { text: "-20%", image: null, chance: 25 },
    { text: "💧 Perdu", image: null, chance: 25 },
  ]);

  // Calcul du total des pourcentages
  const totalChance = segmentsData.reduce((sum, segment) => sum + segment.chance, 0);

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

  // Segments de la roue : utilise les données avec texte, image et chance
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

  // Fonction pour uploader une image
  const handleImageUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setSegmentsData(prev => 
          prev.map((item, i) => 
            i === index ? { ...item, image: imageUrl } : item
          )
        );
      };
      reader.readAsDataURL(file);
    }
  };

  // Fonction pour supprimer une image et revenir au texte
  const handleRemoveImage = (index: number) => {
    setSegmentsData(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, image: null } : item
      )
    );
  };

  // Fonction pour modifier le texte
  const handleTextChange = (index: number, newText: string) => {
    setSegmentsData(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, text: newText } : item
      )
    );
  };

  // Fonction pour modifier le pourcentage de chance
  const handleChanceChange = (index: number, newChance: number) => {
    if (newChance >= 0 && newChance <= 100) {
      setSegmentsData(prev => 
        prev.map((item, i) => 
          i === index ? { ...item, chance: newChance } : item
        )
      );
    }
  };

  // Fonction pour normaliser les pourcentages à 100%
  const normalizeChances = () => {
    if (totalChance === 0) return;
    
    setSegmentsData(prev => 
      prev.map(item => ({
        ...item,
        chance: Math.round((item.chance / totalChance) * 100)
      }))
    );
  };

  const handleSpin = () => {
    if (isSpinning || totalChance !== 100) return;
    
    setIsSpinning(true);
    
    // Génère un nombre aléatoire entre 0 et 100
    const randomValue = Math.random() * 100;
    
    // Détermine le segment gagnant selon les pourcentages
    let cumulativeChance = 0;
    let winningSegmentIndex = 0;
    
    for (let i = 0; i < segmentsData.length; i++) {
      cumulativeChance += segmentsData[i].chance;
      if (randomValue <= cumulativeChance) {
        winningSegmentIndex = i;
        break;
      }
    }
    
    // Calcule l'angle du segment gagnant
    const segmentAngle = 360 / segments.length;
    const targetAngle = winningSegmentIndex * segmentAngle;
    
    // Ajoute plusieurs tours + l'angle cible pour un effet visuel
    const spinRotation = 1440 + (360 - targetAngle) + Math.random() * 60 - 30; // ±30° de variation
    
    setRotation(prev => prev + spinRotation);
    
    setTimeout(() => {
      setIsSpinning(false);
      // Ici on peut ajouter une callback pour afficher le résultat
      console.log(`🎯 Segment gagnant: ${segmentsData[winningSegmentIndex].text} (${segmentsData[winningSegmentIndex].chance}% de chance)`);
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
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: `translate(-50%, -50%) rotate(${midAngle}deg) translateY(-55px)`,
                          width: segment.image ? '60px' : '120px',
                          height: segment.image ? '60px' : 'auto',
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
                        {segment.image ? (
                          <img
                            src={segment.image}
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

            {/* Bouton pour lancer la roue */}
            <Button
              onClick={handleSpin}
              disabled={isSpinning || totalChance !== 100}
              className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-lg rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSpinning ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  🌊 La roue tourne...
                </>
              ) : totalChance !== 100 ? (
                `⚠️ Total: ${totalChance}% (doit être 100%)`
              ) : (
                '🎣 Lancer la roue aquatique'
              )}
            </Button>

            <p className="text-xs text-blue-500 mt-4">
              🐟 {totalChance === 100 ? 'Une seule tentative par jour par aquariophile' : 'Ajustez les pourcentages pour activer la roue'}
            </p>
          </div>
        </div>

        {/* Panneau d'édition à droite si mode édition */}
        {isEditMode && (
          <div className="ml-8 w-64 bg-gray-50 border-l border-gray-200 rounded-lg p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-ocean">Édition des segments</h3>
              <div className={`text-sm font-medium ${totalChance === 100 ? 'text-green-600' : 'text-red-600'}`}>
                Total: {totalChance}%
              </div>
            </div>
            
            {totalChance !== 100 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm text-yellow-800">
                ⚠️ Le total doit être de 100% pour pouvoir lancer la roue
                <Button
                  size="sm"
                  onClick={normalizeChances}
                  className="ml-2 h-6 text-xs bg-yellow-600 hover:bg-yellow-700"
                >
                  Normaliser
                </Button>
              </div>
            )}

            {segmentsData.map((data, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-3 bg-white rounded border">
                <label className="text-sm font-medium text-gray-700">
                  Segment {idx + 1} - {data.chance}% de chance
                </label>
                
                {!data.image ? (
                  <>
                    <input
                      type="text"
                      className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Texte du segment"
                      value={data.text}
                      onChange={e => {
                        handleTextChange(idx, e.target.value);
                      }}
                    />
                    <label className="flex items-center justify-center px-3 py-2 bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100 transition-colors">
                      <span className="text-sm text-blue-700">📁 Uploader une image</span>
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
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Image uploadée</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleRemoveImage(idx);
                        }}
                        className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <img
                      src={data.image}
                      alt={`Segment ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded border-2 border-gray-200"
                    />
                    <label className="flex items-center justify-center px-2 py-1 bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100 transition-colors">
                      <span className="text-xs text-blue-700">🔄 Changer l'image</span>
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
                
                {/* Contrôle du pourcentage de chance */}
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-xs text-gray-600">Chance:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="border rounded px-2 py-1 text-sm w-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={data.chance}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      handleChanceChange(idx, value);
                    }}
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
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