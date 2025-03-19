import React from "react";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { EditableText } from "@/components/EditableText";
import FloatingHeader from "@/components/admin/FloatingHeader";

interface PolicyLayoutProps {
  title: string;
  children: React.ReactNode;
  contentKey: string;
}

const PolicyLayout: React.FC<PolicyLayoutProps> = ({ title, children, contentKey }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Utilisation du FloatingHeader existant */}
      <FloatingHeader />

      {/* Hero section with gradient background */}
      <div className="hero-gradient py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            <EditableText
              contentKey={`${contentKey}_title`}
              initialContent={title}
            />
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-6">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>
          <Link 
            to="/" 
            className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Retour au site
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-4xl mx-auto prose prose-slate">
          {children}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PolicyLayout; 