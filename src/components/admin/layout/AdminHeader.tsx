import { LogOut, Home, Settings, FolderTree, Package, Percent } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEditStore } from "@/stores/useEditStore";

export const AdminHeader = () => {
  const navigate = useNavigate();
  const { isEditMode, isAdmin, setEditMode } = useEditStore();

  // Ne pas afficher le header si l'utilisateur n'est pas admin ou n'est pas en mode édition
  if (!isAdmin || !isEditMode) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setEditMode(false); // Désactiver le mode édition lors de la déconnexion
    navigate("/admin-login");
  };

  const handleGoToSite = () => {
    navigate("/");
  };

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Mode Administrateur</h1>
          <div className="flex gap-4">
            <Link
              to="/admin/categories"
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FolderTree className="w-4 h-4 mr-2" />
              Catégories
            </Link>
            <Link
              to="/admin/produits"
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Package className="w-4 h-4 mr-2" />
              Produits
            </Link>
            <Link
              to="/admin/promo-codes"
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Percent className="w-4 h-4 mr-2" />
              Codes Promo
            </Link>
            <Link
              to="/admin/checkout-settings"
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Livraison
            </Link>
            <Link
              to="/admin/commandes"
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Package className="w-4 h-4 mr-2" />
              Commandes
            </Link>
            <Button onClick={handleGoToSite} variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Accéder au site
            </Button>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
