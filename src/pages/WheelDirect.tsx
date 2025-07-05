import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LuckyWheelPopup from '@/components/WheelPopup';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

const WheelDirect: React.FC = () => {
  const [isWheelOpen, setIsWheelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Ouvrir automatiquement la roue au chargement de la page
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsWheelOpen(true);
      setIsLoading(false);
    }, 500); // Petit délai pour un effet plus fluide

    return () => clearTimeout(timer);
  }, []);

  const handleCloseWheel = () => {
    setIsWheelOpen(false);
    // Rediriger vers la page d'accueil après fermeture
    setTimeout(() => {
      navigate('/');
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex flex-col">
      {/* Header simple */}
      <div className="bg-white shadow-sm border-b border-cyan-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-cyan-700 hover:text-cyan-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐠</span>
              <h1 className="text-xl font-bold text-cyan-800">Roue Aquatique</h1>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="text-cyan-700 border-cyan-300 hover:bg-cyan-50"
          >
            <Home className="h-4 w-4 mr-2" />
            Accueil
          </Button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex items-center justify-center p-4">
        {isLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-lg text-cyan-700 font-medium">Chargement de votre roue aquatique...</p>
            <p className="text-sm text-cyan-600 mt-2">🌊 Préparez-vous à plonger dans l'aventure !</p>
          </div>
        ) : (
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🎣</div>
            <h2 className="text-2xl font-bold text-cyan-800 mb-2">Votre roue est prête !</h2>
            <p className="text-cyan-700 mb-6">
              Si la roue ne s'est pas ouverte automatiquement, cliquez sur le bouton ci-dessous.
            </p>
            <Button
              onClick={() => setIsWheelOpen(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-lg px-8 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              🎡 Ouvrir la roue aquatique
            </Button>
          </div>
        )}
      </div>

      {/* Popup de la roue */}
      <LuckyWheelPopup
        isOpen={isWheelOpen}
        onClose={handleCloseWheel}
        isEditMode={false}
      />
    </div>
  );
};

export default WheelDirect; 