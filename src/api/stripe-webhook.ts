import { buffer } from 'micro';
import Cors from 'micro-cors';

const cors = Cors({
  allowMethods: ['POST', 'HEAD'],
});

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const handler = async (req, res) => {
  if (req.method === 'POST') {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    let event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
      console.error('❌ Erreur de vérification du webhook:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'customer.subscription.created') {
      const subscription = event.data.object;

      // 🔄 Envoie l'événement d'abonnement à l'API Facebook
      const payload = {
        data: [
          {
            event_name: 'Subscribe',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            event_source_url: 'https://tonsite.com/landing',
            user_data: {
              client_user_agent: req.headers['user-agent'],
            },
            custom_data: {
              currency: subscription.currency.toUpperCase(),
              value: subscription.plan.amount / 100,
            },
          },
        ],
        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
      };

      await fetch(`https://graph.facebook.com/v13.0/${process.env.FACEBOOK_PIXEL_ID}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('✅ Événement "Subscribe" envoyé à l\'API Conversions de Facebook');
    }

    res.status(200).send('Event reçu');
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Méthode non autorisée');
  }
};

export default cors(handler);
