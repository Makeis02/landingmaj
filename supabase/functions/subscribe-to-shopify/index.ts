// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("CORS preflight request received");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Admin key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request body
    const requestData = await req.json();
    console.log("Requête parsée avec succès:", requestData);
    
    const { 
      email, 
      debug = false, 
      shopifyDomain = "e77919-2.myshopify.com",
      shopifyAccessToken = Deno.env.get('SHOPIFY_ADMIN_ACCESS_TOKEN') || '',
      tag = "pack_mensuel_retargeting"
    } = requestData;
    
    // Log details for debugging
    console.log(`📧 Processing subscription request for: ${email}`);
    console.log(`🔧 Debug mode: ${debug ? 'Enabled' : 'Disabled'}`);
    console.log(`🏪 Shopify domain: ${shopifyDomain}`);
    console.log(`🔑 Using provided token: ${Boolean(shopifyAccessToken)}`);
    console.log(`🏷️ Using tag: ${tag}`);
    
    // Input validation
    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      console.error('❌ Invalid email format:', email);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Adresse email invalide' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!shopifyAccessToken) {
      console.error('❌ Missing Shopify access token');
      
      // Store the email in Supabase as a fallback
      try {
        const { error: insertError } = await supabase
          .from('newsletter_subscribers')
          .upsert([{ 
            email, 
            status: 'error_missing_token',
            error_message: 'Shopify API token missing',
            updated_at: new Date().toISOString() 
          }], {
            onConflict: 'email'
          });
          
        if (insertError) {
          console.error('❌ Error storing email in Supabase:', insertError);
        } else {
          console.log('✅ Email stored in Supabase as fallback');
        }
      } catch (supabaseError) {
        console.error('❌ Exception while storing email in Supabase:', supabaseError);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Votre email a été enregistré localement. La synchronisation avec notre boutique sera effectuée ultérieurement.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Attempting to create customer in Shopify');
    
    // Construct the request URL and body
    // Using Customer API v2023-10 (update de la version de l'API)
    const apiVersion = '2023-10';
    const shopifyApiUrl = `https://${shopifyDomain}/admin/api/${apiVersion}/customers.json`;
    
    console.log(`🔗 Shopify API URL: ${shopifyApiUrl}`);
    
    const customerData = {
      customer: {
        email,
        tags: tag,
        send_email_welcome: false,
        email_marketing_consent: {
          state: "subscribed",
          opt_in_level: "single_opt_in",
          consent_updated_at: new Date().toISOString()
        }
      }
    };

    // Log the payload for debugging
    console.log(`📦 Request payload:`, JSON.stringify(customerData, null, 2));

    // Make request to Shopify API
    console.log(`🚀 Sending request to Shopify API...`);
    const response = await fetch(shopifyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shopifyAccessToken
      },
      body: JSON.stringify(customerData)
    });

    // Get the response status and log
    const responseStatus = response.status;
    console.log(`🔔 Shopify API response status: ${responseStatus}`);

    // Try to parse response body (might not be JSON in case of errors)
    let responseBody;
    try {
      responseBody = await response.json();
      console.log(`📥 Shopify API response body:`, JSON.stringify(responseBody, null, 2));
    } catch (e) {
      const textResponse = await response.text();
      console.error(`❌ Failed to parse response as JSON. Raw response:`, textResponse);
      responseBody = { error: 'Failed to parse response', text: textResponse };
    }
    
    // Store the result in Supabase regardless of success
    try {
      // Determine status based on response
      let status = 'unknown';
      let errorMessage = null;
      
      if (responseStatus >= 200 && responseStatus < 300) {
        status = 'success_from_shopify';
      } else {
        status = `error_shopify_${responseStatus}`;
        errorMessage = responseBody.errors ? JSON.stringify(responseBody.errors) : 
                      (responseBody.error ? responseBody.error : `HTTP ${responseStatus}`);
      }
      
      // Store attempt in Supabase
      const { error: insertError } = await supabase
        .from('newsletter_subscribers')
        .upsert([{ 
          email, 
          status,
          shopify_customer_id: responseBody.customer?.id?.toString() || null,
          error_message: errorMessage,
          updated_at: new Date().toISOString() 
        }], {
          onConflict: 'email'
        });
        
      if (insertError) {
        console.error('❌ Error storing result in Supabase:', insertError);
      } else {
        console.log('✅ Result stored in Supabase');
      }
    } catch (supabaseError) {
      console.error('❌ Exception while storing result in Supabase:', supabaseError);
    }

    // Handle successful response
    if (responseStatus >= 200 && responseStatus < 300) {
      const customerId = responseBody.customer?.id;
      console.log(`✅ SUCCESS: Customer created with ID: ${customerId}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Inscription réussie !',
          customerId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    
    // If the user already exists or another 400-level error
    if (responseStatus >= 400 && responseStatus < 500) {
      console.log(`⚠️ Client error (${responseStatus}): Email might already exist or invalid request`);
      
      // Special handling for different error cases
      if (responseBody.errors && responseBody.errors.email && 
          responseBody.errors.email.includes('has already been taken')) {
            
        console.log('👤 Customer already exists in Shopify');
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Cet email est déjà inscrit.',
            existingCustomer: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // For 404 Not Found errors - likely API URL or version issue
      if (responseStatus === 404) {
        console.error('❌ API endpoint not found (404). Check Shopify domain and API version.');
        console.error('Domain used:', shopifyDomain);
        console.error('API URL attempted:', shopifyApiUrl);
        
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Erreur de configuration API (404). Votre email a été enregistré localement.',
            error: 'api_not_found',
            debug_info: {
              domain: shopifyDomain,
              api_url: shopifyApiUrl,
              api_version: apiVersion
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Handle unauthorized access
      if (responseStatus === 401) {
        console.error('❌ Unauthorized access (401). Invalid API credentials.');
        
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Erreur d\'accès à l\'API (401). Votre email a été enregistré localement.',
            error: 'api_unauthorized'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Generic client error handling
      return new Response(
        JSON.stringify({
          success: false,
          message: `Impossible d'inscrire cet email (${responseStatus}). Votre email a été enregistré localement.`,
          error: responseBody.errors || `client_error_${responseStatus}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Server error (500+)
    console.error(`❌ Server error (${responseStatus}): Shopify API issue`, responseBody);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Erreur serveur lors de l\'inscription. Votre email a été enregistré localement.',
        error: responseBody.errors || `server_error_${responseStatus}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Catch any other exceptions
    console.error('❌ UNHANDLED EXCEPTION:', error);
    console.error('Stack trace:', error.stack || 'No stack trace available');
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Une erreur interne s\'est produite. Votre email a été enregistré localement.',
        error: error.message || 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
