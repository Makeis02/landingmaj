import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const AddressesPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: null, label: "", address: "", city: "", zip: "", country: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (user?.id) fetchAddresses();
  }, [user]);

  const fetchAddresses = async () => {
    const { data } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAddresses(data || []);
  };

  const handleEdit = (addr: any) => {
    setForm(addr);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("user_addresses").delete().eq("id", id);
    fetchAddresses();
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    if (form.id) {
      await supabase.from("user_addresses").update(form).eq("id", form.id);
    } else {
      await supabase.from("user_addresses").insert({ ...form, user_id: user.id });
    }
    setShowForm(false);
    setForm({ id: null, label: "", address: "", city: "", zip: "", country: "" });
    setLoading(false);
    fetchAddresses();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Mes adresses</h1>
        <Button onClick={() => { setForm({ id: null, label: "", address: "", city: "", zip: "", country: "" }); setShowForm(true); }} className="mb-4">Ajouter une adresse</Button>
        <div className="space-y-4">
          {addresses.map((addr: any) => (
            <Card key={addr.id} className="flex flex-col md:flex-row md:items-center justify-between">
              <CardContent className="flex-1">
                <div className="font-semibold">{addr.label}</div>
                <div>{addr.address}, {addr.city} {addr.zip}, {addr.country}</div>
              </CardContent>
              <div className="flex gap-2 p-4 md:p-0">
                <Button variant="outline" onClick={() => handleEdit(addr)}>Éditer</Button>
                <Button variant="destructive" onClick={() => handleDelete(addr.id)}>Supprimer</Button>
              </div>
            </Card>
          ))}
        </div>
        {showForm && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg space-y-4 min-w-[320px]">
              <h2 className="text-lg font-bold mb-2">{form.id ? "Modifier l'adresse" : "Ajouter une adresse"}</h2>
              <input className="w-full border p-2 rounded" placeholder="Libellé (ex: Domicile)" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required />
              <input className="w-full border p-2 rounded" placeholder="Adresse" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required />
              <input className="w-full border p-2 rounded" placeholder="Ville" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} required />
              <input className="w-full border p-2 rounded" placeholder="Code postal" value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} required />
              <input className="w-full border p-2 rounded" placeholder="Pays" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} required />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button type="submit" disabled={loading}>{loading ? "Enregistrement..." : "Enregistrer"}</Button>
              </div>
            </form>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AddressesPage; 