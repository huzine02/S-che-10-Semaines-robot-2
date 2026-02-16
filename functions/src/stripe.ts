import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialiser Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialiser Stripe avec la clé secrète
const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: '2024-11-20.acacia',
});

const db = admin.firestore();

/**
 * Créer une session Stripe Checkout
 */
export const createCheckoutSession = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { userId, email, successUrl, cancelUrl } = req.body;

    if (!userId || !email) {
      res.status(400).json({ error: 'userId et email requis' });
      return;
    }

    // Créer ou récupérer le customer Stripe
    let customer: Stripe.Customer;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData?.stripeCustomerId) {
      customer = await stripe.customers.retrieve(userData.stripeCustomerId) as Stripe.Customer;
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: {
          firebaseUID: userId,
        },
      });

      // Sauvegarder le customer ID dans Firestore
      await db.collection('users').doc(userId).set(
        {
          stripeCustomerId: customer.id,
        },
        { merge: true }
      );
    }

    // Créer la session Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: functions.config().stripe.price_id, // ID du prix Stripe (49€/mois)
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        firebaseUID: userId,
      },
      subscription_data: {
        metadata: {
          firebaseUID: userId,
        },
      },
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Erreur création session Stripe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Webhook Stripe pour gérer les événements
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    res.status(400).send('Signature manquante');
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      functions.config().stripe.webhook_secret
    );
  } catch (err) {
    console.error('Erreur signature webhook:', err);
    res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.firebaseUID;

        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          await db.collection('users').doc(userId).set(
            {
              subscription: {
                id: subscription.id,
                status: subscription.status,
                currentPeriodEnd: subscription.current_period_end,
                priceId: subscription.items.data[0].price.id,
              },
            },
            { merge: true }
          );
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.firebaseUID;

        if (userId) {
          await db.collection('users').doc(userId).set(
            {
              subscription: {
                id: subscription.id,
                status: subscription.status,
                currentPeriodEnd: subscription.current_period_end,
                priceId: subscription.items.data[0].price.id,
              },
            },
            { merge: true }
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const userId = subscription.metadata?.firebaseUID;

        if (userId) {
          await db.collection('users').doc(userId).set(
            {
              subscription: {
                status: 'past_due',
              },
            },
            { merge: true }
          );
        }
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erreur traitement webhook:', error);
    res.status(500).send('Erreur serveur');
  }
});

/**
 * Créer un portail client Stripe (pour gérer l'abonnement)
 */
export const createPortalSession = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { userId, returnUrl } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId requis' });
      return;
    }

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.stripeCustomerId) {
      res.status(400).json({ error: 'Aucun customer Stripe trouvé' });
      return;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripeCustomerId,
      return_url: returnUrl,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Erreur création portail:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
