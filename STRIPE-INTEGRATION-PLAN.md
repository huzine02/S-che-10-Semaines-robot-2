# 💳 STRIPE INTEGRATION - Plan d'action

## Objectif
Activer les abonnements récurrents 49€/mois via Stripe

## Étapes techniques

### 1. Setup Stripe (30 min)
- [ ] Créer compte Stripe (https://stripe.com)
- [ ] Activer mode Test
- [ ] Créer produit "Sèche10Semaines Standard" à 49€/mois
- [ ] Récupérer clés API (publishable + secret)

### 2. Installation dépendances (5 min)
```bash
npm install @stripe/stripe-js stripe
```

### 3. Variables d'environnement (5 min)
Créer `.env.local` :
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### 4. Backend : Cloud Functions Firebase (2h)
Créer `functions/src/stripe.ts` :
- `createCheckoutSession` : Génère session de paiement
- `createPortalSession` : Gestion abonnement utilisateur
- `handleWebhook` : Webhook Stripe → mise à jour Firestore

### 5. Frontend : Composant Checkout (1h)
Créer `components/StripeCheckout.tsx` :
- Bouton "S'abonner 49€/mois"
- Redirection vers Stripe Checkout
- Gestion success/cancel URLs

### 6. Gestion état abonnement (1h)
Modifier `types.ts` pour ajouter :
```typescript
interface User {
  // ... existant
  subscription?: {
    status: 'active' | 'canceled' | 'past_due';
    currentPeriodEnd: number;
    stripeCustomerId: string;
  }
}
```

### 7. Protection des routes (30 min)
Wrapper `PrivateRoute.tsx` :
- Si `subscription.status !== 'active'` → redirect `/subscribe`

### 8. Tests (1h)
- [ ] Test paiement carte test Stripe
- [ ] Test webhook (stripe CLI)
- [ ] Test accès après paiement
- [ ] Test annulation abonnement

## Total : ~6h de dev

## Activation PROD
1. Passer Stripe en mode Live
2. Remplacer clés test par clés live
3. Activer webhook en prod
4. 🚀 LAUNCH

---

**Prêt à démarrer ? Je peux créer les fichiers si tu veux.**
