
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RevePointsHero from '@/components/revepoints/RevePointsHero';
import HowItWorks from '@/components/revepoints/HowItWorks';
import YourAdvantages from '@/components/revepoints/YourAdvantages';
import SimpleRules from '@/components/revepoints/SimpleRules';
import FinalCTA from '@/components/revepoints/FinalCTA';

const RevePointsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-blue-50">
      <Header />
      <main className="pt-8">
        <div className="animate-fade-in-up duration-700">
          <RevePointsHero />
        </div>
        <div className="animate-fade-in-up duration-700 delay-100">
          <HowItWorks />
        </div>
        <div className="animate-fade-in-up duration-700 delay-200">
          <YourAdvantages />
        </div>
        <div className="animate-fade-in-up duration-700 delay-300">
          <SimpleRules />
        </div>
        <div className="animate-fade-in-up duration-700 delay-400">
          <FinalCTA />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RevePointsPage;
