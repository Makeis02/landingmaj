
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Hero from "@/pages/Landing/components/Hero";
import Features from "@/pages/Landing/components/Features";
import Pricing from "@/pages/Landing/components/Pricing";
import Testimonials from "@/pages/Landing/components/Testimonials";
import Cta from "@/pages/Landing/components/Cta";
import FloatingHeader from "@/components/admin/FloatingHeader";

const LandingPage = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Vérifier si l'utilisateur est un admin
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: adminData } = await supabase
        .from("authorized_admin_emails")
        .select("email")
        .eq("email", session.user.email)
        .single();
      
      setIsAdmin(!!adminData);
    };

    checkAuth();
  }, []);

  return (
    <main className="min-h-screen">
      {isAdmin && <FloatingHeader />}
      <>
        <Hero />
        <Features />
        <Pricing />
        <Testimonials />
        <Cta />
      </>
    </main>
  );
};

export default LandingPage;
