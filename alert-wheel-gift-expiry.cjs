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
    const omnisendRes = await fetch('https://api.omnisend.com/v3/contacts', {
      method: 'POST',
      headers: {
        'X-API-KEY': OMNISEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
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
      })
    });
    if (!omnisendRes.ok) {
      console.error('Erreur Omnisend pour', gift.email, await omnisendRes.text());
      continue;
    }

    await supabase
      .from('wheel_gift_in_cart')
      .update({ notified_2h_before: true })
      .eq('id', gift.id);
    console.log('Notifié:', gift.email, gift.gift_title);
  }
}

(async () => {
  console.log('--- DÉBUT ALERT WHEEL GIFT EXPIRY ---');
  const fetch = (await import('node-fetch')).default;
  await alertWheelGiftExpiry(fetch);
  console.log('--- FIN ALERT WHEEL GIFT EXPIRY ---');
})(); 