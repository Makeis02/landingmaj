
import React from 'react';
import { UserPlus, Users, Star, Gift } from 'lucide-react';

const BoostYourPoints = () => {
  const bonusActions = [
    {
      icon: UserPlus,
      action: "Créer un compte",
      points: "+50 pts",
      color: "from-green-400 to-emerald-400",
      emoji: "🎉"
    },
    {
      icon: Users,
      action: "Parrainer un ami",
      points: "+150 pts",
      color: "from-purple-400 to-pink-400",
      emoji: "👥"
    },
    {
      icon: Star,
      action: "Laisser un avis",
      points: "+30 pts",
      color: "from-yellow-400 to-orange-400",
      emoji: "⭐"
    },
    {
      icon: Gift,
      action: "Commande anniversaire",
      points: "+100 pts",
      color: "from-blue-400 to-cyan-400",
      emoji: "🎂"
    }
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            🚀 Boostez vos points !
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Gagnez des points bonus avec ces actions simples et amusantes
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {bonusActions.map((action, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group hover:scale-105">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${action.color} shadow-lg mb-4 group-hover:scale-110 transition-transform`}>
                  <span className="text-2xl">{action.emoji}</span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-ocean transition-colors">
                  {action.action}
                </h3>
                
                <div className="bg-gradient-to-r from-ocean/10 to-ocean-light/10 rounded-full px-4 py-2 border border-ocean/20">
                  <span className="text-ocean font-bold text-lg">
                    {action.points}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Section bonus avec animation */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-ocean to-ocean-light rounded-2xl p-8 text-white shadow-xl">
            <div className="mb-4">
              <span className="text-4xl animate-bounce inline-block">🎁</span>
            </div>
            <h3 className="text-2xl font-bold mb-4">
              Offre de bienvenue spéciale !
            </h3>
            <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
              Inscrivez-vous maintenant et recevez 50 points de bienvenue + 30 points pour votre premier avis = 80 points offerts !
            </p>
            <div className="inline-flex items-center space-x-2 bg-white/20 rounded-full px-6 py-3 backdrop-blur-sm">
              <span className="text-xl">💎</span>
              <span className="font-bold">80 points = 2€ de réduction</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BoostYourPoints;
