require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration Omnisend
const OMNISEND_API_KEY = process.env.OMNISEND_API_KEY;

if (!OMNISEND_API_KEY) {
  console.error('❌ Variables Omnisend manquantes (OMNISEND_API_KEY)');
  process.exit(1);
}

async function sendAbandonedCartAlert(fetch) {
  console.log('🛒 [ABANDONED-CART] Démarrage de l\'alerte paniers abandonnés...');
  
  try {
    // 1. Récupérer les paniers abandonnés éligibles pour l'envoi d'email
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 heures
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 heures
    
    console.log('🔍 [ABANDONED-CART] Recherche des paniers abandonnés...');
    console.log('   - Abandonnés depuis:', oneDayAgo.toISOString());
    console.log('   - Pas d\'email depuis:', twoHoursAgo.toISOString());
    
    const { data: abandonedCarts, error } = await supabase
      .from('abandoned_carts')
      .select('*')
      .eq('status', 'abandoned')
      .gte('abandoned_at', oneDayAgo.toISOString())
      .or(`last_email_sent_at.is.null,last_email_sent_at.lt.${twoHoursAgo.toISOString()}`)
      .lt('email_sent_count', 3) // Maximum 3 emails par panier
      .order('abandoned_at', { ascending: true });

    if (error) {
      console.error('❌ [ABANDONED-CART] Erreur récupération paniers:', error);
      return;
    }

    console.log(`✅ [ABANDONED-CART] ${abandonedCarts.length} paniers trouvés`);

    if (abandonedCarts.length === 0) {
      console.log('ℹ️ [ABANDONED-CART] Aucun panier à traiter');
      return;
    }

    // 2. Traiter chaque panier abandonné
    let successCount = 0;
    let errorCount = 0;

    for (const cart of abandonedCarts) {
      try {
        console.log(`\n🛒 [ABANDONED-CART] Traitement panier: ${cart.email}`);
        console.log(`   - Items: ${cart.item_count}`);
        console.log(`   - Total: ${cart.cart_total}€`);
        console.log(`   - Emails déjà envoyés: ${cart.email_sent_count}`);
        
        // 3. Préparer les données pour Omnisend
        const cartItems = cart.cart_items || [];
        const itemNames = cartItems.map(item => item.title).join(', ');
        
        // Créer un lien de récupération unique
        const recoveryUrl = `${process.env.SITE_URL || 'https://aqua-reve.com'}?recoverCart=${cart.id}`;
        
        // 4. Mettre à jour le contact et AJOUTER le tag (comme pour les cadeaux de la roue)
        const contactBody = {
          email: cart.email,
          status: "subscribed",
          statusDate: new Date().toISOString(),
          tags: ['abandoned_cart_alert'],
          customProperties: {
            cartId: cart.id,
            cartTotal: cart.cart_total,
            itemCount: cart.item_count,
            itemNames: itemNames,
            recoveryUrl: recoveryUrl,
            abandonedAt: cart.abandoned_at,
            emailCount: cart.email_sent_count + 1
          }
        };
        
        console.log('📧 [ABANDONED-CART] Contact envoyé à Omnisend:', JSON.stringify(contactBody, null, 2));
        
        const contactResponse = await fetch('https://api.omnisend.com/v3/contacts', {
          method: 'POST',
          headers: {
            'X-API-KEY': OMNISEND_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(contactBody)
        });

        const contactText = await contactResponse.text();
        console.log('📧 [ABANDONED-CART] Réponse contact Omnisend:', contactText);
        
        if (!contactResponse.ok) {
          console.error(`❌ [ABANDONED-CART] Erreur contact Omnisend pour ${cart.email}:`, {
            status: contactResponse.status,
            statusText: contactResponse.statusText,
            error: contactText
          });
        } else {
          console.log(`✅ [ABANDONED-CART] Contact mis à jour avec succès pour ${cart.email}`);
        }

        // 5. Envoyer l'événement personnalisé à Omnisend (comme pour les cadeaux de la roue)
        const eventBody = {
          email: cart.email,
          eventName: 'abandoned_cart_alert',
          SystemName: 'abandoned_cart_alert',
          data: {
            cartId: cart.id,
            cartTotal: cart.cart_total,
            itemCount: cart.item_count,
            itemNames: itemNames,
            recoveryUrl: recoveryUrl,
            abandonedAt: cart.abandoned_at,
            emailCount: cart.email_sent_count + 1
          }
        };

        console.log('📧 [ABANDONED-CART] Envoi événement Omnisend:', JSON.stringify(eventBody, null, 2));
        
        const eventResponse = await fetch('https://api.omnisend.com/v3/events', {
          method: 'POST',
          headers: {
            'X-API-KEY': OMNISEND_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventBody)
        });

        const eventText = await eventResponse.text();
        console.log('📧 [ABANDONED-CART] Réponse event Omnisend:', eventText);
        
        if (!eventResponse.ok) {
          console.error(`❌ [ABANDONED-CART] Erreur event Omnisend pour ${cart.email}:`, {
            status: eventResponse.status,
            statusText: eventResponse.statusText,
            error: eventText
          });
          errorCount++;
          continue;
        }

        // Parser la réponse JSON depuis le texte déjà lu
        let result;
        try {
          result = JSON.parse(eventText);
        } catch (parseError) {
          console.error(`❌ [ABANDONED-CART] Erreur parsing JSON pour ${cart.email}:`, parseError);
          errorCount++;
          continue;
        }
        console.log(`✅ [ABANDONED-CART] Événement envoyé pour ${cart.email}:`, result.eventID);

        // 5. Mettre à jour le panier dans Supabase
        const { error: updateError } = await supabase
          .from('abandoned_carts')
          .update({
            email_sent_count: cart.email_sent_count + 1,
            last_email_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', cart.id);

        if (updateError) {
          console.error(`❌ [ABANDONED-CART] Erreur mise à jour pour ${cart.email}:`, updateError);
        } else {
          console.log(`✅ [ABANDONED-CART] Panier mis à jour pour ${cart.email}`);
          successCount++;
        }

        // 6. Attendre un peu entre chaque envoi pour éviter le rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ [ABANDONED-CART] Erreur traitement panier ${cart.email}:`, error);
        errorCount++;
      }
    }

    // 7. Résumé final
    console.log(`\n🎉 [ABANDONED-CART] Traitement terminé:`);
    console.log(`   - Succès: ${successCount}`);
    console.log(`   - Erreurs: ${errorCount}`);
    console.log(`   - Total traité: ${abandonedCarts.length}`);

  } catch (error) {
    console.error('❌ [ABANDONED-CART] Erreur générale:', error);
  }
}

// Exporter la fonction pour être utilisée par run-all.cjs
module.exports = sendAbandonedCartAlert;

(async () => {
  console.log('--- DÉBUT ALERT ABANDONED CARTS ---');
  const fetch = (await import('node-fetch')).default;
  await sendAbandonedCartAlert(fetch);
  console.log('--- FIN ALERT ABANDONED CARTS ---');
})(); 