
import React from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import Footer from "@/components/Footer";

const policies = [
  {
    title: "Conditions Générales de Vente",
    description: "Détails sur les modalités d'achat, les prix, les paiements, et les conditions d'annulation.",
    path: "/policies/cgv"
  },
  {
    title: "Conditions Générales d'Utilisation",
    description: "Informations sur l'utilisation du site, les droits et obligations des utilisateurs.",
    path: "/policies/cgu"
  },
  {
    title: "Politique de Confidentialité",
    description: "Explication de la collecte, de l'utilisation et de la protection des données personnelles.",
    path: "/policies/privacy"
  },
  {
    title: "Mentions Légales",
    description: "Informations légales obligatoires sur l'entreprise et l'hébergeur.",
    path: "/policies/legal"
  },
  {
    title: "Politique d'Expédition",
    description: "Détails sur les délais de livraison, les frais d'expédition, et les zones desservies.",
    path: "/policies/shipping"
  },
  {
    title: "Droit de Rétractation",
    description: "Conditions pour annuler une commande et obtenir un remboursement.",
    path: "/policies/withdrawal"
  },
  {
    title: "Politique de Retour et de Remboursement",
    description: "Procédures et conditions pour retourner des produits et obtenir un remboursement.",
    path: "/policies/refund"
  },
  {
    title: "Conditions d'Utilisation",
    description: "Règles générales d'accès et d'utilisation du site.",
    path: "/policies/terms"
  }
];

const PoliciesIndex = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero section with gradient background */}
      <div className="hero-gradient py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Nos Politiques</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Découvrez nos politiques et conditions d'utilisation pour une expérience transparente.
          </p>
        </div>
      </div>

      {/* Policies grid */}
      <div className="container mx-auto px-4 py-12 flex-grow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {policies.map((policy) => (
            <Link 
              key={policy.path} 
              to={policy.path} 
              className="feature-card hover:translate-y-[-4px] transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <h2 className="font-semibold text-lg mb-2 text-slate-900">{policy.title}</h2>
                  <p className="text-slate-600">{policy.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PoliciesIndex;
