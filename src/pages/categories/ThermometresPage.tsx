import React from "react";

const ThermometresPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Catégorie : Thermomètres</h1>
      <p>Bienvenue sur la page dédiée aux thermomètres pour aquarium.</p>
      <p>Découvrez notre gamme d'instruments de mesure de température :</p>
      <ul className="list-disc ml-6 mt-2">
        <li>Thermomètres digitaux</li>
        <li>Thermomètres à cristaux liquides</li>
        <li>Thermomètres flottants</li>
        <li>Sondes de température</li>
      </ul>
      <p className="mt-4">Prochainement : produits spécifiques, guides d'utilisation, conseils de placement...</p>
    </div>
  );
};

export default ThermometresPage; 