import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserStore } from "@/stores/useUserStore";

export const useRestoreSession = () => {
  const setUser = useUserStore((s) => s.setUser);

  useEffect(() => {
    const restore = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
      }
    };
    restore();
  }, []);
}; 