
import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RevePointsHero from '@/components/revepoints/RevePointsHero';
import HowItWorks from '@/components/revepoints/HowItWorks';
import YourAdvantages from '@/components/revepoints/YourAdvantages';
import SimpleRules from '@/components/revepoints/SimpleRules';
import BoostYourPoints from '@/components/revepoints/BoostYourPoints';
import FinalCTA from '@/components/revepoints/FinalCTA';

const RevePointsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-blue-50">
      <Header />
      <main className="pt-32">
        <RevePointsHero />
        <HowItWorks />
        <YourAdvantages />
        <SimpleRules />
        <BoostYourPoints />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default RevePointsPage;
