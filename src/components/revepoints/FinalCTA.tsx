
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star } from 'lucide-react';

const FinalCTA = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-r from-ocean to-ocean-light text-white relative overflow-hidden">
      {/* Animations de fond */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 text-3xl animate-float">⭐</div>
        <div className="absolute top-20 right-20 text-2xl animate-float" style={{ animationDelay: '1s' }}>💎</div>
        <div className="absolute bottom-20 left-1/4 text-4xl animate-float" style={{ animationDelay: '2s' }}>🌟</div>
        <div className="absolute top-1/2 right-10 text-2xl animate-float" style={{ animationDelay: '0.5s' }}>✨</div>
        <div className="absolute bottom-32 right-1/3 text-3xl animate-float" style={{ animationDelay: '1.5s' }}>🎁</div>
      </div>

      <div className="container mx-auto max-w-4xl text-center relative z-10">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6 backdrop-blur-sm">
            <Star className="h-10 w-10 text-white" />
          </div>
        </div>

        <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Je commence à cumuler
        </h2>
        
        <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-2xl mx-auto leading-relaxed">
          Vos achats méritent plus. Rejoignez le programme Rêve Points dès maintenant.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <a href="/account/signup" className="inline-block px-8 py-3 rounded-full bg-[#0074b3] text-white font-bold text-lg shadow hover:bg-[#005f8e] transition">
            Je m'inscris
          </a>
          <a href="/account/login" className="inline-block px-8 py-3 rounded-full bg-white text-[#0074b3] font-bold text-lg shadow border border-[#0074b3] hover:bg-[#e6f4fa] transition">
            J'ai déjà un compte
          </a>
        </div>

        {/* Statistiques attrayantes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">50+</div>
            <div className="text-white/80">Points de bienvenue</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">20%</div>
            <div className="text-white/80">Réduction maximum</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">12</div>
            <div className="text-white/80">Mois de validité</div>
          </div>
        </div>

        {/* Message de rappel */}
        <div className="mt-12 bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/20">
          <p className="text-lg font-medium mb-2">🎯 Rappel important</p>
          <p className="text-white/90">
            Chaque euro dépensé = 1 point gagné. Plus vous achetez, plus vous économisez !
          </p>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
