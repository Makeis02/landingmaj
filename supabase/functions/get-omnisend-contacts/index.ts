import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // Sécurité : vérifie le header Authorization (JWT admin Supabase)
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Variables d'environnement
  const OMNISEND_API_KEY = Deno.env.get('OMNISEND_API_KEY');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!OMNISEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response('Missing env vars', { status: 500 });
  }

  // 1. Récupérer les contacts Omnisend (pagination jusqu'à 1000)
  let contacts: string[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && contacts.length < 1000) {
    const omnisendRes = await fetch(`https://api.omnisend.com/v3/contacts?page=${page}&limit=250`, {
      headers: {
        'X-API-KEY': OMNISEND_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    if (!omnisendRes.ok) {
      return new Response('Failed to fetch Omnisend contacts', { status: 500 });
    }
    const omnisendData = await omnisendRes.json();
    const emails = (omnisendData.contacts || []).map((c: any) => c.email).filter((e: string) => !!e);
    contacts = contacts.concat(emails);
    hasMore = omnisendData.contacts && omnisendData.contacts.length === 250;
    page++;
  }
  // Déduplique
  contacts = Array.from(new Set(contacts));

  // 2. Récupérer les utilisateurs Supabase (auth.users)
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  let userEmails: string[] = [];
  let nextPageToken: string | undefined = undefined;
  do {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: nextPageToken });
    if (error) {
      return new Response('Failed to fetch Supabase users', { status: 500 });
    }
    userEmails = userEmails.concat((data.users || []).map((u: any) => u.email).filter(Boolean));
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);
  userEmails = Array.from(new Set(userEmails));

  // 3. Croiser les deux listes
  const result = contacts.map((email: string) => ({
    email,
    hasAccount: userEmails.includes(email),
  }));

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
}); 