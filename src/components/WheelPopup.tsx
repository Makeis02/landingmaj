import React, { useState } from 'react';

interface LuckyWheelPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const LuckyWheelPopup: React.FC<LuckyWheelPopupProps> = ({ isOpen, onClose }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSpin = () => {
    setIsSpinning(true);
    setResult(null);
    setTimeout(() => {
      const prizes = ['-10%', '-15%', '-20%', '-25%', 'Gratuit !', 'Essaie encore', '-5%', '-30%'];
      const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
      setResult(randomPrize);
      setIsSpinning(false);
    }, 3000);
  };

  if (!isOpen) return null;

  // Palette harmonisée avec le site, nuances de bleu/cyan/sky/indigo/gris
  const segmentColors = [
    '#f0f9ff', // sky-50
    '#e0f2fe', // blue-50
    '#bae6fd', // blue-100
    '#7dd3fc', // blue-200
    '#a5f3fc', // cyan-100
    '#67e8f9', // cyan-200
    '#dbeafe', // indigo-100
    '#f1f5f9', // gris-100
  ];
  const segmentLabels = [
    '-10%',
    '-15%',
    '-20%',
    '-25%',
    'Gratuit !',
    'Essaie encore',
    '-5%',
    '-30%'
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-2xl max-w-md w-full mx-4 relative border border-blue-100 backdrop-blur-md">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-blue-700 text-2xl"
          aria-label="Fermer"
        >
          ✕
        </button>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-blue-800 mb-2">🐟 Roue de la Chance</h2>
          <p className="text-blue-700">Tentez votre chance pour gagner une réduction !</p>
        </div>
        <div className="relative w-64 h-64 mx-auto mb-6">
          <div className={`wheel ${isSpinning ? 'spinning' : ''}`}> 
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="wheel-section"
                style={{
                  '--i': i,
                  '--clr': segmentColors[i % segmentColors.length],
                  '--angle': `${360 / 8}deg`,
                } as React.CSSProperties}
              >
                <span>{segmentLabels[i]}</span>
              </div>
            ))}
            {/* Centre de la roue avec poisson */}
            <div className="wheel-center">
              <span className="text-3xl">🐠</span>
            </div>
          </div>
          <div className="pointer"></div>
        </div>
        {result && (
          <div className="text-center mb-6">
            <p className="text-lg font-medium text-blue-800">Votre résultat :</p>
            <p className="text-2xl font-bold text-blue-700 mt-2">{result}</p>
          </div>
        )}
        <button
          onClick={handleSpin}
          disabled={isSpinning}
          className={`w-full py-3 px-6 rounded-lg text-white font-semibold transition-colors shadow-md
            ${isSpinning 
              ? 'bg-blue-200 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'}
          `}
        >
          {isSpinning ? 'En cours...' : 'Tourner la roue'}
        </button>
        <style jsx>{`
          .wheel {
            position: relative;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 8px solid #e0e7ef;
            box-shadow: 0 4px 24px rgba(30, 41, 59, 0.08);
            transition: transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99);
            transform: rotate(0deg);
            background: #f8fafc;
          }
          .wheel.spinning {
            transform: rotate(1800deg);
          }
          .wheel-section {
            position: absolute;
            width: 50%;
            height: 50%;
            transform-origin: bottom right;
            transform: rotate(calc((360deg / 8) * var(--i)));
            clip-path: polygon(0 0, 100% 0, 100% 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            user-select: none;
            cursor: default;
          }
          .wheel-section span {
            position: relative;
            transform: rotate(22.5deg);
            font-size: 1.1em;
            font-weight: 600;
            color: #1e293b;
            text-shadow: 1px 1px 0 rgba(255,255,255,0.5);
            letter-spacing: 0.5px;
          }
          .wheel-section::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            background: var(--clr);
            border-radius: 0 0 100% 0 / 0 0 100% 0;
            z-index: 0;
          }
          .wheel-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 56px;
            height: 56px;
            background: #2563eb;
            border-radius: 50%;
            border: 4px solid #fff;
            box-shadow: 0 2px 8px rgba(30,41,59,0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
          }
          .wheel-center span {
            color: #fff;
          }
          .pointer {
            position: absolute;
            top: -18px;
            left: 50%;
            transform: translateX(-50%);
            width: 36px;
            height: 36px;
            background: #2563eb;
            clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
            box-shadow: 0 2px 8px rgba(30,41,59,0.10);
            z-index: 10;
            border-radius: 0 0 12px 12px;
          }
        `}</style>
      </div>
    </div>
  );
};

export default LuckyWheelPopup;