import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Récupérer l'email du body
    const { email } = await req.json();

    if (!email) {
      throw new Error('Email requis');
    }

    // Initialiser Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Récupérer le customer Stripe associé à cet email
    const customers = await stripe.customers.list({ email });
    
    if (!customers.data.length) {
      throw new Error('Aucun client Stripe trouvé pour cet email');
    }

    // Créer la session du portail de facturation
    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: 'https://aquabox.app',
    });

    // Retourner l'URL de redirection
    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('❌ Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
}); 