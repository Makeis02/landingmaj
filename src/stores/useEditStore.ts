
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from "@/integrations/supabase/client";

interface EditStore {
  isEditMode: boolean;
  isAdmin: boolean;
  setEditMode: (isEditMode: boolean) => void;
  checkAdminStatus: () => Promise<void>;
}

export const useEditStore = create<EditStore>()(
  persist(
    (set) => ({
      isEditMode: false,
      isAdmin: false,
      setEditMode: (isEditMode) => {
        console.log('Setting edit mode:', isEditMode);
        set({ isEditMode });
      },
      checkAdminStatus: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: adminData } = await supabase
            .from("authorized_admin_emails")
            .select("email")
            .eq("email", session.user.email)
            .single();
          
          set({ isAdmin: !!adminData });
          // Si l'utilisateur n'est pas admin, on désactive le mode édition
          if (!adminData) {
            set({ isEditMode: false });
          }
        } else {
          set({ isAdmin: false, isEditMode: false });
        }
      }
    }),
    {
      name: 'edit-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
