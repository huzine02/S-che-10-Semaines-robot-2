import { loadStripe, Stripe } from '@stripe/stripe-js';

// Clés Stripe (à remplacer par les vraies clés depuis dashboard.stripe.com)
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY_HERE';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

export const PRICE_ID = import.meta.env.VITE_STRIPE_PRICE_ID || 'price_YOUR_PRICE_ID_HERE';
export const PRODUCT_NAME = 'Sèche10Semaines - Programme Complet';
export const PRODUCT_PRICE = 49; // €/mois
