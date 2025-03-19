
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/layout/AdminHeader";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Categories from "@/components/Categories";
import Features from "@/components/Features";
import BlogSection from "@/components/BlogSection";
import Reviews from "@/components/Reviews";
import BestSellers from "@/components/BestSellers";
import FloatingHeader from "@/components/admin/FloatingHeader";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import Footer from "@/components/Footer";

const Index = () => {
  const [isAdmin, setIsAdmin] = useState(false);

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
    <div className="min-h-screen bg-surface-light flex flex-col">
      <Header />
      {isAdmin && <AdminHeader />}
      {isAdmin && <FloatingHeader />}
      <AnnouncementBanner />
      <Hero />
      <BestSellers />
      <Categories />
      <Reviews />
      <BlogSection />
      <Features />
      <Footer />
    </div>
  );
};

export default Index;
