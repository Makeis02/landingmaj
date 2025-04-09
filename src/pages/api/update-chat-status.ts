import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userEmail, closedAt } = req.body;

    if (!userEmail || !closedAt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('📤 Mise à jour du statut de chat pour:', userEmail);

    const { error } = await supabase
      .from('client_chat_opened')
      .update({ closed_at: closedAt })
      .eq('user_email', userEmail)
      .is('closed_at', null);

    if (error) {
      console.error('❌ Erreur lors de la mise à jour du statut:', error);
      return res.status(500).json({ error: 'Failed to update chat status' });
    }

    console.log('✅ Statut de chat mis à jour avec succès');
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du statut:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 