require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OMNISEND_API_KEY = process.env.OMNISEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OMNISEND_API_KEY) {
  console.error('❌ Variables d\'environnement manquantes (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OMNISEND_API_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function alertWheelGiftExpiry(fetch) {
  const now = new Date();
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const { data: gifts, error } = await supabase
    .from('wheel_gift_in_cart')
    .select('*')
    .lte('expires_at', in2h.toISOString())
    .gte('expires_at', now.toISOString())
    .eq('notified_2h_before', false);

  if (error) {
    console.error('Erreur Supabase:', error);
    return;
  }

  for (const gift of gifts) {
    console.log('Début traitement cadeau pour', gift.email);
    // 1. Mettre à jour le contact et AJOUTER le tag
    const contactBody = {
      email: gift.email,
      status: "subscribed",
      statusDate: new Date().toISOString(),
      tags: ['wheel_gift_expiring_2h'],
      customProperties: {
        wheelGiftTitle: gift.gift_title,
        wheelGiftImage: gift.gift_image_url,
        wheelGiftExpiresAt: gift.expires_at,
        cartUrl: gift.cart_url
      }
    };
    await fetch('https://api.omnisend.com/v3/contacts', {
      method: 'POST',
      headers: {
        'X-API-KEY': OMNISEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactBody)
    });

    // 2. Envoyer l'event custom Omnisend pour déclencher le workflow
    const eventBody = {
      email: gift.email,
      eventName: 'wheel_gift_expiring_2h',
      SystemName: 'wheel_gift_expiring_2h',
      data: {
        wheelGiftTitle: gift.gift_title,
        wheelGiftImage: gift.gift_image_url,
        wheelGiftExpiresAt: gift.expires_at,
        cartUrl: gift.cart_url
      }
    };
    console.log('Event envoyé à Omnisend:', JSON.stringify(eventBody, null, 2));
    const eventRes = await fetch('https://api.omnisend.com/v3/events', {
      method: 'POST',
      headers: {
        'X-API-KEY': OMNISEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventBody)
    });
    const eventText = await eventRes.text();
    console.log('Réponse event Omnisend:', eventText);
    if (!eventRes.ok) {
      console.error('Erreur event Omnisend pour', gift.email);
      continue;
    }
    await supabase
      .from('wheel_gift_in_cart')
      .update({ notified_2h_before: true })
      .eq('id', gift.id);
    console.log('Event envoyé avec succès à', gift.email);
  }
}

(async () => {
  console.log('--- DÉBUT ALERT WHEEL GIFT EXPIRY ---');
  const fetch = (await import('node-fetch')).default;
  await alertWheelGiftExpiry(fetch);
  console.log('--- FIN ALERT WHEEL GIFT EXPIRY ---');
})(); 