import React, { useState } from 'react';
import { getStripe, PRODUCT_NAME, PRODUCT_PRICE } from '../stripe-config';
import { useAuth } from '../AuthContext';

export const StripeCheckout: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleCheckout = async () => {
    if (!user) {
      setError('Vous devez être connecté pour vous abonner');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Appel à la Cloud Function Firebase pour créer la session Stripe
      const response = await fetch(
        'https://us-central1-seche10semaines.cloudfunctions.net/createCheckoutSession',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            email: user.email,
            successUrl: `${window.location.origin}/dashboard?success=true`,
            cancelUrl: `${window.location.origin}/pricing?canceled=true`,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la création de la session de paiement');
      }

      const { sessionId } = await response.json();

      // Redirection vers Stripe Checkout
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe non initialisé');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

      if (stripeError) {
        throw stripeError;
      }
    } catch (err) {
      console.error('Erreur checkout:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.ribbon}>Offre de Lancement</div>
        <h2 style={styles.title}>{PRODUCT_NAME}</h2>
        <p style={styles.subtitle}>Accès complet à la plateforme</p>

        <div style={styles.priceBox}>
          <span style={styles.priceOld}>97€</span>
          <span style={styles.priceNew}>
            {PRODUCT_PRICE}€<span style={styles.pricePeriod}>/mois</span>
          </span>
        </div>

        <ul style={styles.features}>
          <li>✅ Plan alimentaire personnalisé</li>
          <li>✅ Ajustements hebdomadaires</li>
          <li>✅ Support IA 24/7</li>
          <li>✅ Suivi glycémie intégré</li>
          <li>✅ Communauté privée</li>
          <li>✅ Sans engagement</li>
        </ul>

        <button
          onClick={handleCheckout}
          disabled={loading || !user}
          style={{
            ...styles.button,
            ...(loading || !user ? styles.buttonDisabled : {}),
          }}
        >
          {loading ? '⏳ Chargement...' : '🚀 Commencer Maintenant'}
        </button>

        {error && <p style={styles.error}>{error}</p>}

        {!user && (
          <p style={styles.warning}>
            Vous devez être connecté pour vous abonner.
          </p>
        )}

        <div style={styles.guarantee}>
          <span style={styles.guaranteeIcon}>🔒</span>
          <p style={styles.guaranteeText}>
            <strong>Garantie 30 jours</strong> - Satisfait ou remboursé
          </p>
        </div>

        <p style={styles.info}>
          🔒 Paiement sécurisé Stripe • Annulation en 1 clic
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '480px',
    margin: '0 auto',
    padding: '20px',
  },
  card: {
    background: '#fff',
    border: '2px solid #00B894',
    borderRadius: '28px',
    overflow: 'hidden',
    boxShadow: '0 30px 80px rgba(0, 184, 148, 0.12)',
  },
  ribbon: {
    background: '#00B894',
    color: '#fff',
    padding: '12px',
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0F2C59',
    margin: '24px 24px 8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748B',
    margin: '0 24px 24px',
  },
  priceBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    margin: '24px',
  },
  priceOld: {
    fontSize: '24px',
    color: '#94A3B8',
    textDecoration: 'line-through',
  },
  priceNew: {
    fontSize: '56px',
    fontWeight: 800,
    color: '#0F2C59',
  },
  pricePeriod: {
    fontSize: '20px',
    fontWeight: 600,
  },
  features: {
    listStyle: 'none',
    padding: '0 24px',
    margin: '24px 0',
  },
  button: {
    width: 'calc(100% - 48px)',
    margin: '0 24px 20px',
    padding: '18px',
    background: '#00B894',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    fontSize: '17px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  buttonDisabled: {
    background: '#CBD5E1',
    cursor: 'not-allowed',
  },
  error: {
    color: '#EF4444',
    fontSize: '14px',
    textAlign: 'center',
    margin: '0 24px 16px',
  },
  warning: {
    color: '#F59E0B',
    fontSize: '14px',
    textAlign: 'center',
    margin: '0 24px 16px',
  },
  guarantee: {
    background: '#ECFDF5',
    margin: '0 24px 16px',
    padding: '16px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  guaranteeIcon: {
    fontSize: '20px',
  },
  guaranteeText: {
    fontSize: '13px',
    color: '#00B894',
    margin: 0,
  },
  info: {
    fontSize: '12px',
    color: '#94A3B8',
    textAlign: 'center',
    margin: '0 24px 24px',
  },
};
