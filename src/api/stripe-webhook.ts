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

    res.status(200).send('Event reçu');
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Méthode non autorisée');
  }
};

export default cors(handler);
