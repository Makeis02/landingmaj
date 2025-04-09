import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useEffect } from "react";
import { AdminHeader } from "@/components/admin/layout/AdminHeader";
import { ThresholdsList } from "@/components/admin/thresholds/ThresholdsList";
import { GiftSettingsForm } from "@/components/admin/GiftSettingsForm";
import { SuggestionsPanel } from "@/components/admin/suggestions/SuggestionsPanel";
import { MessagesPanel } from "@/components/admin/MessagesPanel";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/admin-login");
      return;
    }

    const { data: adminData, error: adminError } = await supabase
      .from("authorized_admin_emails")
      .select("email, role")
      .eq("email", session.user.email)
      .single();

    if (adminError || !adminData) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les autorisations nécessaires",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <ThresholdsList />
        
        <div className="mt-8">
          <GiftSettingsForm />
        </div>

        <div className="mt-8">
          <SuggestionsPanel />
        </div>

        <MessagesPanel />
      </main>
    </div>
  );
};

export default Admin;
