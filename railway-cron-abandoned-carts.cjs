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

// Fonction pour générer un code promo unique
async function generateUniquePromoCode(email, cartId) {
  const baseCode = `RECUP${cartId.slice(-6).toUpperCase()}`;
  const timestamp = Date.now().toString(36).toUpperCase();
  const emailHash = email.split('@')[0].slice(0, 3).toUpperCase();
  
  let code = `${baseCode}${timestamp}${emailHash}`;
  
  // Vérifier que le code n'existe pas déjà
  let attempts = 0;
  while (attempts < 10) {
    const { data: existingCode } = await supabase
      .from('promo_codes')
      .select('id')
      .eq('code', code)
      .single();
    
    if (!existingCode) {
      return code;
    }
    
    // Si le code existe, générer un nouveau
    code = `${baseCode}${timestamp}${emailHash}${attempts}`;
    attempts++;
  }
  
  // Fallback avec timestamp complet
  return `RECUP${Date.now()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

// Fonction pour créer un code promo de récupération
async function createRecoveryPromoCode(email, cartId, cartTotal) {
  try {
    console.log(`🎫 [ABANDONED-CART] Création code promo pour ${email}`);
    
    const promoCode = await generateUniquePromoCode(email, cartId);
    
    // SUPPRIME les conditions de plafond et de minimum
    const promoData = {
      code: promoCode,
      description: `Code de récupération panier abandonné - ${email}`,
      type: 'percentage',
      value: 20, // 20% de réduction
      application_type: 'all',
      product_id: null,
      product_title: null,
      category_name: null,
      minimum_amount: null, // <-- plus de minimum
      maximum_discount: null, // <-- plus de plafond
      usage_limit: 1, // Utilisable une seule fois
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Expire dans 7 jours
      is_active: true,
      one_time_per_client: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: newPromoCode, error } = await supabase
      .from('promo_codes')
      .insert(promoData)
      .select()
      .single();
    
    if (error) {
      console.error(`❌ [ABANDONED-CART] Erreur création code promo:`, error);
      return null;
    }
    
    console.log(`✅ [ABANDONED-CART] Code promo créé: ${promoCode}`);
    return newPromoCode;
    
  } catch (error) {
    console.error(`❌ [ABANDONED-CART] Erreur création code promo:`, error);
    return null;
  }
}

// 🆕 Fonction utilitaire pour récupérer l'image principale d'un produit
async function getProductMainImage(productId) {
  // Cherche d'abord dans Supabase
  const { data, error } = await supabase
    .from('editable_content')
    .select('content')
    .eq('content_key', `product_${productId}_image_0`)
    .single();
  if (data && data.content) return data.content;
  // Sinon, fallback Stripe (optionnel, si tu as l'info dans le cart)
  return null;
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
        const itemImages = [];
        const itemNamesArr = [];
        const itemTitles = [];
        for (const item of cartItems) {
          const productId = item.product_id || item.id;
          let imageUrl = await getProductMainImage(productId);
          if (!imageUrl && item.image_url) imageUrl = item.image_url;
          if (!imageUrl && item.image) imageUrl = item.image;
          if (imageUrl) itemImages.push(imageUrl);
          if (item.title) {
            itemNamesArr.push(item.title);
            itemTitles.push(item.title);
          }
        }
        const itemNames = itemNamesArr.join(', ');
        
        // Créer un lien de récupération unique
        let recoveryUrl = `${process.env.SITE_URL || 'https://aqua-reve.com'}?recoverCart=${cart.id}`;
        if (recoveryUrl.endsWith(';')) recoveryUrl = recoveryUrl.slice(0, -1);
        
        // 🆕 Préparer le code promo dès le début (si pas déjà généré)
        let promoCodeData = null;
        if (!cart.promo_code) {
          promoCodeData = await createRecoveryPromoCode(cart.email, cart.id, cart.cart_total);
          if (promoCodeData && promoCodeData.code) {
            await supabase
              .from('abandoned_carts')
              .update({
                promo_code: promoCodeData.code,
                promo_expires_at: promoCodeData.expires_at
              })
              .eq('id', cart.id);
          }
        } else {
          promoCodeData = {
            code: cart.promo_code,
            expires_at: cart.promo_expires_at
          };
        }
        
        // 5. Mettre à jour le contact et AJOUTER le tag
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
            emailCount: cart.email_sent_count + 1,
            hasPromoCode: !!promoCodeData?.code,
            promoCode: promoCodeData?.code || '',
            promoDiscount: '20%',
            promoExpiresAt: promoCodeData?.expires_at ? new Date(promoCodeData.expires_at).toLocaleDateString('fr-FR') : '',
            promoMaxDiscount: promoCodeData?.maximum_discount ? `${promoCodeData.maximum_discount}€` : '',
            isThirdEmail: cart.email_sent_count === 2,
            // 🆕 Ajoute les images ici
            itemImages: itemImages,
            itemNames: itemNames,
            itemTitles: itemTitles,
            // 🆕 Champs individuels pour Omnisend
            itemImage1: itemImages[0] || '',
            itemImage2: itemImages[1] || '',
            itemImage3: itemImages[2] || '',
            itemTitle1: itemTitles[0] || '',
            itemTitle2: itemTitles[1] || '',
            itemTitle3: itemTitles[2] || '',
            // 🆕 Date formatée pour affichage humain
            abandonedAtFormatted: formatDateFr(cart.abandoned_at)
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
          if (!contactText || contactText.trim() === '') {
            console.log(`⚠️ [ABANDONED-CART] Réponse contact vide mais status OK pour ${cart.email}`);
          }
        }

        // 6. Envoyer l'événement personnalisé à Omnisend
        let eventData;
        if (cart.email.includes('test') || cart.email.includes('trigger')) {
          eventData = {
            cartId: 'ABC123',
            cartTotal: 99.99,
            itemCount: 3,
            itemNames: 'Produit Test A, Produit Test B',
            recoveryUrl: 'https://aqua-reve.com/recoverCart?cart=ABC123',
            abandonedAt: '2025-07-07T10:00:00Z',
            emailCount: 1,
            hasPromoCode: true,
            promoCode: 'RECUPTEST123',
            promoDiscount: '20%',
            promoExpiresAt: '14/07/2025',
            promoMaxDiscount: '20€',
            isThirdEmail: false,
            // 🆕 Champ test pour mapping Omnisend
            itemImages: [
              'https://placehold.co/200x200?text=Produit+1',
              'https://placehold.co/200x200?text=Produit+2'
            ],
            itemNames: 'Produit Test A, Produit Test B',
            itemTitles: ['Produit Test A', 'Produit Test B'],
            // 🆕 Champs individuels pour Omnisend
            itemImage1: 'https://placehold.co/200x200?text=Produit+1',
            itemImage2: 'https://placehold.co/200x200?text=Produit+2',
            itemImage3: '',
            itemTitle1: 'Produit Test A',
            itemTitle2: 'Produit Test B',
            itemTitle3: '',
            // 🆕 Date formatée pour affichage humain
            abandonedAtFormatted: '08 juillet 2025 à 09:26'
          };
        } else {
          eventData = {
            cartId: cart.id,
            cartTotal: cart.cart_total,
            itemCount: cart.item_count,
            itemNames: itemNames,
            recoveryUrl: recoveryUrl,
            abandonedAt: cart.abandoned_at,
            emailCount: cart.email_sent_count + 1,
            hasPromoCode: !!promoCodeData?.code,
            promoCode: promoCodeData?.code || '',
            promoDiscount: '20%',
            promoExpiresAt: promoCodeData?.expires_at ? new Date(promoCodeData.expires_at).toLocaleDateString('fr-FR') : '',
            promoMaxDiscount: promoCodeData?.maximum_discount ? `${promoCodeData.maximum_discount}€` : '',
            isThirdEmail: cart.email_sent_count === 2,
            // 🆕 Ajoute les images ici
            itemImages: itemImages,
            itemNames: itemNames,
            itemTitles: itemTitles,
            // 🆕 Champs individuels pour Omnisend
            itemImage1: itemImages[0] || '',
            itemImage2: itemImages[1] || '',
            itemImage3: itemImages[2] || '',
            itemTitle1: itemTitles[0] || '',
            itemTitle2: itemTitles[1] || '',
            itemTitle3: itemTitles[2] || '',
            // 🆕 Date formatée pour affichage humain
            abandonedAtFormatted: formatDateFr(cart.abandoned_at)
          };
        }
        const eventBody = {
          eventName: 'abandoned_cart_alert',
          origin: 'api',
          eventVersion: 'v1',
          SystemName: 'abandoned_cart_alert',
          email: cart.email,
          contact: { email: cart.email },
          properties: eventData
        };
        // 🟢 LOG DEBUG : Afficher le body JSON envoyé à Omnisend
        console.log('EVENT BODY ENVOYÉ À OMNISEND:', JSON.stringify(eventBody, null, 2));
        
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
          // Vérifier que la réponse n'est pas vide
          if (!eventText || eventText.trim() === '') {
            console.log(`⚠️ [ABANDONED-CART] Réponse vide d'Omnisend pour ${cart.email}, mais status OK`);
            result = { eventID: 'no-id-provided' };
          } else {
            result = JSON.parse(eventText);
          }
        } catch (parseError) {
          console.error(`❌ [ABANDONED-CART] Erreur parsing JSON pour ${cart.email}:`, parseError);
          console.error(`📧 [ABANDONED-CART] Contenu de la réponse: "${eventText}"`);
          errorCount++;
          continue;
        }
        console.log(`✅ [ABANDONED-CART] Événement envoyé pour ${cart.email}:`, result.eventID || 'ID non fourni');

        // 7. Mettre à jour le panier dans Supabase
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

        // 8. Attendre un peu entre chaque envoi pour éviter le rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ [ABANDONED-CART] Erreur traitement panier ${cart.email}:`, error);
        errorCount++;
      }
    }

    // 9. Résumé final
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

// 🆕 Formater la date d'abandon pour affichage humain (français)
function formatDateFr(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} à ${hours}:${minutes}`;
} 