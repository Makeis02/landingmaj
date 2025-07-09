
import React from 'react';
import { Gift, Clock, TrendingUp, Shield } from 'lucide-react';

const YourAdvantages = () => {
  const advantages = [
    {
      icon: Gift,
      title: "Réductions exclusives",
      description: "Jusqu'à 20 % de votre commande offerte grâce à vos points.",
      emoji: "🎁",
      color: "from-purple-400 to-pink-400"
    },
    {
      icon: Clock,
      title: "Valables 12 mois",
      description: "Les points expirent uniquement après 1 an sans commande.",
      emoji: "⏳",
      color: "from-amber-400 to-orange-400"
    },
    {
      icon: TrendingUp,
      title: "Plus vous achetez, plus vous gagnez",
      description: "Boostez vos points avec chaque achat.",
      emoji: "🚀",
      color: "from-green-400 to-emerald-400"
    },
    {
      icon: Shield,
      title: "Programme sécurisé",
      description: "Vos points sont automatiquement sauvegardés et protégés.",
      emoji: "🔒",
      color: "from-blue-400 to-cyan-400"
    }
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-cyan-50 to-blue-50">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Vos avantages
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Un programme pensé pour vous récompenser à chaque étape
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
          {advantages.map((advantage, index) => (
            <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group hover:scale-105">
              <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 w-16 h-16 bg-gradient-to-r ${advantage.color} rounded-xl flex items-center justify-center shadow-lg`}>
                  <span className="text-2xl">{advantage.emoji}</span>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-ocean transition-colors">
                    {advantage.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {advantage.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default YourAdvantages;
