import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/layout/AdminHeader";
import EditableContent from "@/components/EditableContent";

const Landing = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Vérifier si l'utilisateur est admin
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: adminData } = await supabase
        .from("authorized_admin_emails")
        .select("email")
        .eq("email", session.user.email)
        .single();

      const isAdminUser = !!adminData;
      setIsAdmin(isAdminUser);
      console.log("Is Admin:", isAdminUser);
    };

    checkAuth();
  }, []);

  return (
    <div>
      {isAdmin && <AdminHeader />}
      <EditableContent isEditing={isEditing} />
    </div>
  );
};

export default Landing;
