
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {/* Première ligne : 3 règles */}
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
            <span className="text-3xl mb-2 text-green-600">€</span>
            <div className="font-bold text-lg mb-1">1 € = 1 Rêve Point</div>
            <div className="text-gray-500 text-sm">Simple et transparent</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
            <span className="text-3xl mb-2 text-blue-600">📦</span>
            <div className="font-bold text-lg mb-1">200 points = 5 € de remise</div>
            <div className="text-gray-500 text-sm">Échangez vos points facilement</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
            <span className="text-3xl mb-2 text-purple-600">📦</span>
            <div className="font-bold text-lg mb-1">Utilisables sur commandes entre 35 € et 100 €</div>
            <div className="text-gray-500 text-sm">Pour la plupart de vos achats</div>
          </div>
        </div>
        {/* Deuxième ligne : 2 règles centrées */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center md:col-start-2">
            <span className="text-3xl mb-2 text-orange-500">��</span>
            <div className="font-bold text-lg mb-1">Jusqu'à 20 % de votre panier déductible</div>
            <div className="text-gray-500 text-sm">Économies maximales garanties</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center">
            <span className="text-3xl mb-2 text-red-500">❌</span>
            <div className="font-bold text-lg mb-1">Non utilisables sur produits soldés ou promos</div>
            <div className="text-gray-500 text-sm">Pour maintenir des prix équitables</div>
          </div>
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
