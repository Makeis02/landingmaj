
import React from 'react';
import { Euro, CreditCard, Package, Lock, X } from 'lucide-react';

const SimpleRules = () => {
  const rules = [
    {
      icon: Euro,
      title: "1 € = 1 Rêve Point",
      description: "Simple et transparent",
      color: "text-green-600"
    },
    {
      icon: CreditCard,
      title: "200 points = 5 € de remise",
      description: "Échangez vos points facilement",
      color: "text-blue-600"
    },
    {
      icon: Package,
      title: "Utilisables sur commandes entre 35 € et 100 €",
      description: "Pour la plupart de vos achats",
      color: "text-purple-600"
    },
    {
      icon: Lock,
      title: "Jusqu'à 20 % de votre panier déductible",
      description: "Économies maximales garanties",
      color: "text-orange-600"
    },
    {
      icon: X,
      title: "Non utilisables sur produits soldés ou promos",
      description: "Pour maintenir des prix équitables",
      color: "text-red-600"
    }
  ];

  const simulations = [
    { orderAmount: 50, maxDeduction: 10, pointsNeeded: 400 },
    { orderAmount: 80, maxDeduction: 16, pointsNeeded: 640 },
    { orderAmount: 100, maxDeduction: 20, pointsNeeded: 800 }
  ];

  return (
    <section className="py-20 px-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            Règles simples et transparentes
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Tout ce que vous devez savoir sur le fonctionnement des Rêve Points
          </p>
        </div>

        {/* Règles principales */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {rules.map((rule, index) => (
            <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start space-x-4">
                <rule.icon className={`h-6 w-6 mt-1 ${rule.color}`} />
                <div>
                  <h3 className="font-bold text-slate-800 mb-2">
                    {rule.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {rule.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Exemples de simulation */}
        <div className="bg-gradient-to-r from-ocean/5 to-ocean-light/5 rounded-2xl p-8 border border-ocean/20">
          <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">
            💡 Exemples de simulation
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ocean/20">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Commande</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Déduction max (20%)</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Points nécessaires</th>
                </tr>
              </thead>
              <tbody>
                {simulations.map((sim, index) => (
                  <tr key={index} className="border-b border-gray-100 last:border-b-0 hover:bg-ocean/5 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800">{sim.orderAmount} €</td>
                    <td className="py-3 px-4 text-green-600 font-medium">{sim.maxDeduction} €</td>
                    <td className="py-3 px-4 text-ocean font-medium">{sim.pointsNeeded} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SimpleRules;
