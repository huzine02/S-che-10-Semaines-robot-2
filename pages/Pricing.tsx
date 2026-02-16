import React from 'react';
import { StripeCheckout } from '../components/StripeCheckout';
import { Layout } from '../components/Layout';

export const Pricing: React.FC = () => {
  return (
    <Layout>
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.badge}>💰 Offre de lancement</span>
          <h1 style={styles.title}>Investissez dans votre santé</h1>
          <p style={styles.subtitle}>
            Le protocole métabolique complet pour transformer votre corps en 10 semaines
          </p>
        </div>

        <StripeCheckout />

        <div style={styles.faq}>
          <h3 style={styles.faqTitle}>Questions fréquentes</h3>
          
          <details style={styles.faqItem}>
            <summary style={styles.faqQuestion}>Puis-je annuler à tout moment ?</summary>
            <p style={styles.faqAnswer}>
              Oui, vous pouvez annuler votre abonnement en 1 clic depuis votre profil. 
              Aucun engagement, aucune condition.
            </p>
          </details>

          <details style={styles.faqItem}>
            <summary style={styles.faqQuestion}>Comment fonctionne la garantie 30 jours ?</summary>
            <p style={styles.faqAnswer}>
              Si vous ne voyez pas de résultats mesurables (poids, glycémie, tour de taille) 
              après 30 jours, nous vous remboursons intégralement. Sans condition.
            </p>
          </details>

          <details style={styles.faqItem}>
            <summary style={styles.faqQuestion}>Quels moyens de paiement acceptez-vous ?</summary>
            <p style={styles.faqAnswer}>
              Carte bancaire, Apple Pay, Google Pay. Tous les paiements sont sécurisés par Stripe.
            </p>
          </details>

          <details style={styles.faqItem}>
            <summary style={styles.faqQuestion}>Est-ce que je paye chaque mois ?</summary>
            <p style={styles.faqAnswer}>
              Oui, c'est un abonnement mensuel à 49€. Vous êtes prélevé automatiquement 
              chaque mois jusqu'à annulation.
            </p>
          </details>
        </div>
      </div>
    </Layout>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  badge: {
    display: 'inline-block',
    background: '#ECFDF5',
    color: '#00B894',
    padding: '6px 16px',
    borderRadius: '100px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '16px',
  },
  title: {
    fontSize: '44px',
    fontWeight: 700,
    color: '#0F2C59',
    margin: '0 0 12px',
  },
  subtitle: {
    fontSize: '17px',
    color: '#475569',
    lineHeight: 1.6,
  },
  faq: {
    marginTop: '64px',
  },
  faqTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0F2C59',
    textAlign: 'center',
    marginBottom: '32px',
  },
  faqItem: {
    borderBottom: '1px solid #E2E8F0',
    padding: '20px 0',
  },
  faqQuestion: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0F2C59',
    cursor: 'pointer',
    listStyle: 'none',
  },
  faqAnswer: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.65,
    marginTop: '12px',
  },
};
