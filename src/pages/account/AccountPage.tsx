import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Calendar, LogOut, Edit, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { EditableText } from "@/components/EditableText";
import { useEditStore } from "@/stores/useEditStore";
import RevePointsBanner from "@/components/RevePointsBanner";
import { useFavoritesStore } from "@/stores/useFavoritesStore";

const AccountPage = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isEditMode } = useEditStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({ full_name: "", phone_number: "" });
  const { items: favorites, syncWithSupabase } = useFavoritesStore();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    getUser();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setEditFields({
        full_name: profile.full_name || "",
        phone_number: profile.phone_number || ""
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchOrders = async () => {
      setOrdersLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false });
      if (!error && data) setOrders(data);
      setOrdersLoading(false);
    };
    fetchOrders();
  }, [user]);

  useEffect(() => {
    syncWithSupabase();
  }, [syncWithSupabase]);

  const getUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        navigate("/account/login");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      navigate("/account/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select()
        .eq('id', user.id)
        .single();
      setProfile(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil utilisateur",
        variant: "destructive",
      });
    }
  };

  const updateProfile = async (fields: any) => {
    try {
      await supabase
        .from('user_profiles')
        .update(fields)
        .eq('id', user.id);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées.",
      });
      fetchProfile();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Déconnexion réussie",
          description: "À bientôt !",
        });
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <RevePointsBanner />
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? (
                <EditableText
                  contentKey="account_welcome_title"
                  initialContent="Mon Compte"
                />
              ) : (
                "Mon Compte"
              )}
            </h1>
            <p className="text-gray-600">
              {isEditMode ? (
                <EditableText
                  contentKey="account_welcome_subtitle"
                  initialContent="Gérez vos informations personnelles et vos commandes"
                />
              ) : (
                "Gérez vos informations personnelles et vos commandes"
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Informations utilisateur */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <User className="h-5 w-5 text-blue-600" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <form onSubmit={async (e) => { e.preventDefault(); await updateProfile(editFields); setIsEditing(false); }} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nom complet</label>
                      <input className="w-full border p-2 rounded" value={editFields.full_name} onChange={e => setEditFields(f => ({ ...f, full_name: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Téléphone</label>
                      <input className="w-full border p-2 rounded" value={editFields.phone_number} onChange={e => setEditFields(f => ({ ...f, phone_number: e.target.value }))} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Annuler</Button>
                      <Button type="submit">Enregistrer</Button>
                    </div>
                  </form>
                ) : (
                  <>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Adresse e-mail</p>
                      <p className="font-medium">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Membre depuis</p>
                      <p className="font-medium">{formatDate(user?.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Statut du compte</p>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Vérifié
                      </Badge>
                    </div>
                  </div>
                </div>
                    <Button variant="outline" className="w-full border-[#0074b3] text-[#0074b3] hover:bg-[#e6f4fa] hover:border-[#005a8c] mt-4" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier mes informations
                </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Package className="h-5 w-5 text-blue-600" />
                  Actions rapides
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => navigate("/account/orders")}
                  className="w-full h-12 justify-start bg-[#0074b3] hover:bg-[#005a8c] text-white font-semibold rounded-xl shadow transition-all"
                >
                  <Package className="mr-3 h-5 w-5" />
                  Mes commandes
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12 justify-start border-[#0074b3] text-[#0074b3] hover:bg-[#e6f4fa] hover:border-[#005a8c]"
                  onClick={() => navigate("/account/addresses")}
                >
                  <Edit className="mr-3 h-5 w-5" />
                  Mes adresses
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12 justify-start border-[#0074b3] text-[#0074b3] hover:bg-[#e6f4fa] hover:border-[#005a8c]"
                  onClick={() => navigate("/account/favorites")}
                >
                  <User className="mr-3 h-5 w-5" />
                  Mes favoris
                </Button>

                <div className="pt-4 border-t border-gray-200">
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full h-12 justify-start text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    Se déconnecter
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-0">
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-blue-600">{ordersLoading ? '...' : orders.length}</div>
                <p className="text-sm text-gray-600">Commandes passées</p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-0">
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-purple-600">
                  €{ordersLoading ? '...' : orders.reduce((sum, order) => sum + (order.total && order.total > 0 ? order.total : (order.order_items ? order.order_items.reduce((s, i) => s + (i.price * i.quantity), 0) : 0)), 0).toFixed(2)}
                </div>
                <p className="text-sm text-gray-600">Total dépensé</p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 bg-gradient-to-br from-green-50 to-blue-50 border-0">
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-green-600">{favorites.length}</div>
                <p className="text-sm text-gray-600">Articles favoris</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AccountPage;