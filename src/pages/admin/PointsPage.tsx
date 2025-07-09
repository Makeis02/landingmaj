import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminHeader from '@/components/admin/layout/AdminHeader';
import { CheckCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Client {
  email: string;
  hasAccount: boolean;
}

const PointsPage = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      // 1. Récupérer tous les emails de la table auth.users (comptes créés)
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      const userEmails = users?.users?.map(u => u.email).filter(Boolean) || [];
      // 2. Récupérer tous les emails collectés (ex: roue, popups, newsletter, etc.)
      // On suppose une table 'collected_emails' avec une colonne 'email'
      let collectedEmails: string[] = [];
      try {
        const { data, error } = await supabase.from('collected_emails').select('email');
        if (!error && data) {
          collectedEmails = data.map((row: any) => row.email);
        }
      } catch {}
      // Fusionner et dédupliquer
      const allEmails = Array.from(new Set([...userEmails, ...collectedEmails]));
      // Mapper pour indiquer si c'est un compte ou juste un email
      const clientList: Client[] = allEmails.map(email => ({
        email,
        hasAccount: userEmails.includes(email)
      }));
      setClients(clientList);
      setLoading(false);
    };
    fetchClients();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="max-w-5xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-8">Gestion des Points Clients</h1>
        {loading ? (
          <div>Chargement...</div>
        ) : (
          <table className="w-full bg-white rounded-lg shadow border">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left">Email</th>
                <th className="py-3 px-4 text-left">Compte</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, idx) => (
                <tr key={client.email} className="border-b last:border-b-0">
                  <td className="py-2 px-4 font-mono text-sm">{client.email}</td>
                  <td className="py-2 px-4">
                    {client.hasAccount ? (
                      <span className="inline-flex items-center text-green-600 font-semibold"><CheckCircle className="w-4 h-4 mr-1" /> Oui</span>
                    ) : (
                      <span className="inline-flex items-center text-gray-400"><Mail className="w-4 h-4 mr-1" /> Email seul</span>
                    )}
                  </td>
                  <td className="py-2 px-4">
                    {/* Placeholder pour ajout de points manuel */}
                    <Button size="sm" variant="outline" disabled>Ajouter des points</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PointsPage; 