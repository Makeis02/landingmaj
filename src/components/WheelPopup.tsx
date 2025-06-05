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

    // Simuler un résultat après 3 secondes
    setTimeout(() => {
      const prizes = ['-10%', '-15%', '-20%', '-25%', 'Gratuit !', 'Essaie encore'];
      const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
      setResult(randomPrize);
      setIsSpinning(false);
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 relative shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Roue de la Chance</h2>
          <p className="text-gray-600">Tentez votre chance pour gagner une réduction !</p>
        </div>

        <div className="relative w-64 h-64 mx-auto mb-6">
          <div className={`wheel ${isSpinning ? 'spinning' : ''}`}>
            <div className="wheel-section" style={{ '--i': 0, '--clr': '#e2e8f0' } as any}>
              <span>-10%</span>
            </div>
            <div className="wheel-section" style={{ '--i': 1, '--clr': '#cbd5e1' } as any}>
              <span>-15%</span>
            </div>
            <div className="wheel-section" style={{ '--i': 2, '--clr': '#f1f5f9' } as any}>
              <span>-20%</span>
            </div>
            <div className="wheel-section" style={{ '--i': 3, '--clr': '#d1fae5' } as any}>
              <span>-25%</span>
            </div>
            <div className="wheel-section" style={{ '--i': 4, '--clr': '#fef9c3' } as any}>
              <span>Gratuit !</span>
            </div>
            <div className="wheel-section" style={{ '--i': 5, '--clr': '#e2e8f0' } as any}>
              <span>Essaie encore</span>
            </div>
          </div>
          <div className="pointer"></div>
        </div>

        {result && (
          <div className="text-center mb-6">
            <p className="text-lg font-medium text-gray-800">Votre résultat :</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">{result}</p>
          </div>
        )}

        <button
          onClick={handleSpin}
          disabled={isSpinning}
          className={`w-full py-3 px-6 rounded-lg text-white font-medium transition-colors
            ${isSpinning 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {isSpinning ? 'En cours...' : 'Tourner la roue'}
        </button>

        <style jsx>{`
          .wheel {
            position: relative;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 8px solid #f8fafc;
            box-shadow: 0 4px 24px rgba(30, 41, 59, 0.08);
            transition: transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99);
            transform: rotate(0deg);
          }

          .wheel.spinning {
            transform: rotate(1800deg);
          }

          .wheel-section {
            position: absolute;
            width: 50%;
            height: 50%;
            transform-origin: bottom right;
            transform: rotate(calc(60deg * var(--i)));
            clip-path: polygon(0 0, 100% 0, 100% 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            user-select: none;
            cursor: default;
          }

          .wheel-section span {
            position: relative;
            transform: rotate(30deg);
            font-size: 1.2em;
            font-weight: 500;
            color: #334155;
            text-shadow: 2px 2px 0 rgba(255, 255, 255, 0.5);
          }

          .wheel-section::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            background: var(--clr);
            transform: rotate(60deg);
            transform-origin: bottom right;
          }

          .pointer {
            position: absolute;
            top: -20px;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 40px;
            background: #64748b;
            clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
            z-index: 10;
          }

          @keyframes spin {
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
    </div>
  );
};

export default LuckyWheelPopup;