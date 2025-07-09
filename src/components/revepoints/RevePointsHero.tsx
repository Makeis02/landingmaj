
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

const RevePointsHero = () => {
  const scrollToHowItWorks = () => {
    const element = document.getElementById('how-it-works');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative py-20 px-4 text-center overflow-hidden">
      {/* Animations de fond aquatiques */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 text-4xl animate-float">🐠</div>
        <div className="absolute top-32 right-20 text-3xl animate-float" style={{ animationDelay: '1s' }}>🐟</div>
        <div className="absolute bottom-20 left-1/4 text-2xl animate-float" style={{ animationDelay: '2s' }}>🌊</div>
        <div className="absolute top-1/2 right-10 text-3xl animate-float" style={{ animationDelay: '0.5s' }}>🐡</div>
        <div className="absolute bottom-32 right-1/3 text-2xl animate-float" style={{ animationDelay: '1.5s' }}>💙</div>
      </div>

      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="mb-8">
          <div className="inline-block p-4 bg-gradient-to-r from-ocean to-ocean-light rounded-full mb-6 shadow-lg">
            <span className="text-4xl">🌙</span>
          </div>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold text-slate-800 mb-6 leading-tight">
          Gagnez des <span className="text-ocean bg-gradient-to-r from-ocean to-ocean-light bg-clip-text text-transparent">Rêve Points</span> à chaque achat
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
          Transformez vos commandes en récompenses. Profitez de vos achats, et laissez les Rêve Points faire le reste.
        </p>
        
        <Button 
          onClick={scrollToHowItWorks}
          className="bg-gradient-to-r from-ocean to-ocean-light hover:from-ocean-light hover:to-ocean text-white px-8 py-4 text-lg rounded-full shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          Comment ça marche ?
          <ChevronDown className="ml-2 h-5 w-5 animate-bounce" />
        </Button>
      </div>
    </section>
  );
};

export default RevePointsHero;
