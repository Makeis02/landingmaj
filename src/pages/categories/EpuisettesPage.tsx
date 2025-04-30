import React from "react";

const EpuisettesPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Catégorie : Épuisettes</h1>
      <p>Bienvenue sur la page dédiée aux épuisettes pour aquarium.</p>
      <p>Découvrez notre gamme d'épuisettes adaptées à tous vos besoins :</p>
      <ul className="list-disc ml-6 mt-2">
        <li>Épuisettes à mailles fines</li>
        <li>Épuisettes à mailles moyennes</li>
        <li>Épuisettes pour alevins</li>
        <li>Épuisettes pour poissons adultes</li>
      </ul>
      <p className="mt-4">Prochainement : produits spécifiques, guides de choix, conseils d'utilisation...</p>
    </div>
  );
};

export default EpuisettesPage; 