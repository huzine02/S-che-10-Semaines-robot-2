# 🔧 CONFIGURATION STRIPE - Guide Complet

## ✅ CE QUI EST DÉJÀ FAIT

Tout le code est écrit et prêt :
- ✅ Composant de paiement (`StripeCheckout.tsx`)
- ✅ Page pricing (`Pricing.tsx`)
- ✅ Cloud Functions Firebase (`functions/src/stripe.ts`)
- ✅ Types TypeScript mis à jour
- ✅ Routes configurées

**Il ne reste QUE la configuration des clés API.**

---

## 🚀 ÉTAPES DE CONFIGURATION (15 minutes)

### 1. Créer un compte Stripe (3 min)

1. Va sur https://dashboard.stripe.com/register
2. Inscris-toi avec ton email
3. Confirme ton email
4. Active le mode Test (on commencera par ça)

### 2. Créer le produit "Sèche10Semaines" (2 min)

1. Dashboard Stripe → **Products** → **Add product**
2. Remplis :
   - Name : `Sèche10Semaines - Programme Complet`
   - Description : `Accès complet à la plateforme de coaching nutrition`
   - Pricing model : `Recurring`
   - Price : `49` EUR
   - Billing period : `Monthly`
3. Clique **Save product**
4. **COPIE le Price ID** (commence par `price_...`)

### 3. Récupérer les clés API (2 min)

1. Dashboard Stripe → **Developers** → **API keys**
2. Tu verras :
   - **Publishable key** (commence par `pk_test_...`)
   - **Secret key** (clique "Reveal" puis copie, commence par `sk_test_...`)

### 4. Configurer le Webhook (3 min)

1. Dashboard Stripe → **Developers** → **Webhooks**
2. Clique **Add endpoint**
3. Endpoint URL : `https://us-central1-seche10semaines.cloudfunctions.net/stripeWebhook`
4. Select events :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Clique **Add endpoint**
6. **COPIE le Signing secret** (commence par `whsec_...`)

### 5. Ajouter les clés dans Vercel (3 min)

1. Va sur Vercel Dashboard → ton projet
2. Settings → **Environment Variables**
3. Ajoute :
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXX
   VITE_STRIPE_PRICE_ID=price_XXXXX
   ```
4. **Redéploie** l'app (Deployments → ... → Redeploy)

### 6. Configurer Firebase Functions (2 min)

Dans ton terminal :

```bash
cd functions
npm install
firebase functions:config:set stripe.secret_key="sk_test_XXXXX"
firebase functions:config:set stripe.price_id="price_XXXXX"
firebase functions:config:set stripe.webhook_secret="whsec_XXXXX"
firebase deploy --only functions
```

---

## ✅ TESTER LE PAIEMENT (Mode Test)

### Cartes de test Stripe

**Carte qui fonctionne :**
- Numéro : `4242 4242 4242 4242`
- Date : n'importe quelle date future (ex: 12/34)
- CVC : n'importe quel 3 chiffres (ex: 123)
- Code postal : n'importe quel code

**Carte qui échoue :**
- `4000 0000 0000 0002`

### Procédure de test

1. Va sur ton app : https://robot-2-huzine02s-projects.vercel.app/#/pricing
2. Clique "Commencer Maintenant"
3. Entre les infos de la carte test
4. Valide le paiement
5. Tu es redirigé vers `/dashboard?success=true`
6. Vérifie dans Stripe Dashboard → **Payments** que le paiement est passé

---

## 🔴 PASSER EN MODE PRODUCTION

Une fois les tests OK :

### 1. Activer le compte Stripe

1. Dashboard Stripe → **Activate account**
2. Remplis les infos légales (SIRET, RIB, etc.)
3. Stripe valide ton compte (1-2 jours)

### 2. Récupérer les clés LIVE

1. Dashboard Stripe → Toggle "Test mode" → **OFF**
2. Developers → API keys
3. Copie les clés **LIVE** :
   - `pk_live_...`
   - `sk_live_...`

### 3. Créer le webhook LIVE

1. Dashboard Stripe (mode Live) → Webhooks → Add endpoint
2. Même URL : `https://us-central1-seche10semaines.cloudfunctions.net/stripeWebhook`
3. Mêmes events
4. Copie le nouveau `whsec_...` (mode Live)

### 4. Remplacer les clés dans Vercel + Firebase

Vercel :
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXX
VITE_STRIPE_PRICE_ID=price_XXXXX (le price ID en mode Live)
```

Firebase :
```bash
firebase functions:config:set stripe.secret_key="sk_live_XXXXX"
firebase functions:config:set stripe.webhook_secret="whsec_XXXXX"
firebase deploy --only functions
```

### 5. Redéployer

```bash
# Vercel
git push origin main  # Auto-deploy

# Ou force redeploy via dashboard
```

---

## 🎯 CHECKLIST FINALE

**Mode Test :**
- [ ] Compte Stripe créé
- [ ] Produit 49€/mois créé
- [ ] Clés API récupérées
- [ ] Webhook configuré
- [ ] Variables Vercel ajoutées
- [ ] Functions déployées
- [ ] Test paiement avec carte 4242...

**Mode Production :**
- [ ] Compte Stripe activé
- [ ] Clés LIVE récupérées
- [ ] Webhook LIVE configuré
- [ ] Variables Vercel mises à jour
- [ ] Functions redéployées
- [ ] Test paiement réel

---

## 🚨 TROUBLESHOOTING

**Erreur "Stripe non initialisé" :**
- Vérifie que `VITE_STRIPE_PUBLISHABLE_KEY` est bien dans Vercel
- Redéploie l'app après avoir ajouté la variable

**Erreur "Session de paiement échouée" :**
- Vérifie les logs Firebase Functions
- Vérifie que les clés `stripe.secret_key` et `stripe.price_id` sont configurées

**Webhook ne se déclenche pas :**
- Vérifie l'URL du webhook dans Stripe Dashboard
- Vérifie que la fonction `stripeWebhook` est bien déployée
- Vérifie les logs Stripe → Webhooks → Attempts

**Abonnement non mis à jour dans Firestore :**
- Vérifie les logs de la fonction `stripeWebhook`
- Vérifie que le `firebaseUID` est bien dans les metadata Stripe

---

## 📞 SUPPORT

Si un problème persiste, envoie-moi :
- Screenshot de l'erreur
- Logs Firebase Functions
- Logs Stripe Webhook (Dashboard → Webhooks → ton endpoint → Attempts)

---

**Tout est prêt. Il ne reste QUE la config des clés. 🔥**
