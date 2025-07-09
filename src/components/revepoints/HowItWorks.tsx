
import React from 'react';
import { ShoppingCart, Target, Gift } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: ShoppingCart,
      title: "Achetez",
      description: "Gagnez 1 Rêve Point pour chaque 1 € dépensé sur notre boutique.",
      color: "from-blue-400 to-cyan-400"
    },
    {
      icon: Target,
      title: "Cumulez",
      description: "Vos points s'accumulent automatiquement à chaque commande.",
      color: "from-ocean to-ocean-light"
    },
    {
      icon: Gift,
      title: "Économisez",
      description: "Utilisez vos Rêve Points sur vos prochaines commandes (jusqu'à 20 % de remise).",
      color: "from-emerald-400 to-teal-400"
    }
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Comment ça fonctionne ?
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Un système simple et transparent pour récompenser votre fidélité
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center group">
              {/* Flèche de connexion */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-0">
                  <div className="w-8 h-0.5 bg-gradient-to-r from-ocean/30 to-ocean-light/30"></div>
                  <div className="absolute -right-2 -top-1 w-0 h-0 border-l-4 border-l-ocean/30 border-t-2 border-b-2 border-t-transparent border-b-transparent"></div>
                </div>
              )}

              <div className="relative z-10 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${step.color} shadow-lg mb-6`}>
                  <step.icon className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-slate-800 mb-4">
                  {step.title}
                </h3>
                
                <p className="text-slate-600 leading-relaxed">
                  {step.description}
                </p>

                {/* Numéro d'étape */}
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-gradient-to-r from-ocean to-ocean-light rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">{index + 1}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
