# 🏋️ Sèche10Semaines - App de Coaching Nutrition

> Programme de sèche métabolique pour hommes 35-55 ans avec glycémie limite ou cholestérol élevé.

## 🎯 Objectif Business
**7,000€/mois** de revenu récurrent avec **143 clients** à 49€/mois.

## 🚀 Status Projet

### ✅ FONCTIONNEL
- Landing page complète (design + copy optimisé)
- Authentification Firebase (email + Google)
- Dashboard utilisateur avec suivi
- Génération de plan alimentaire personnalisé
- Journal quotidien des repas
- Design moderne et responsive

### 🔨 EN COURS
- Intégration Stripe (paiements récurrents)
- Déploiement Vercel
- Analytics Google

### 📋 À FAIRE
- Tests automatisés
- CI/CD GitHub Actions
- Email marketing (séquences d'onboarding)
- Programme d'affiliation

---

## 🛠️ Stack Technique

- **Frontend :** React 19 + TypeScript + Vite
- **Backend :** Firebase (Auth + Firestore + Storage)
- **Routing :** React Router DOM v7
- **Charts :** Recharts
- **Hosting :** Vercel (bientôt)
- **Paiements :** Stripe (à intégrer)

---

## 📂 Structure

```
src/
├── pages/
│   ├── Landing.tsx          # Landing page optimisée
│   ├── Auth.tsx             # Connexion/Inscription
│   ├── Dashboard.tsx        # Vue d'ensemble utilisateur
│   ├── SetupDiet.tsx        # Configuration plan alimentaire
│   ├── Journal.tsx          # Journal quotidien
│   └── Profile.tsx          # Profil utilisateur
├── components/
│   ├── Layout.tsx           # Layout principal
│   ├── BottomNav.tsx        # Navigation mobile
│   ├── LoadingScreen.tsx    # Écran de chargement
│   └── ErrorBoundary.tsx    # Gestion erreurs
├── utils/
│   ├── calculations.ts      # Calculs métabolisme, macros
│   ├── lipides.ts           # Calculs lipides
│   ├── constants.ts         # Constantes app
│   └── onboarding.ts        # Questions setup
├── App.tsx                  # App principale
├── AuthContext.tsx          # Context auth Firebase
├── firebase.ts              # Config Firebase
└── types.ts                 # Types TypeScript
```

---

## 🏃 Démarrage Local

### Prérequis
- Node.js 18+ (recommandé : 22+)
- npm ou pnpm

### Installation

```bash
# Cloner le repo
git clone https://github.com/huzine02/S-che-10-Semaines-robot-2.git
cd S-che-10-Semaines-robot-2

# Installer les dépendances
npm install

# Lancer en dev
npm run dev
```

L'app sera accessible sur `http://localhost:5173`

### Build production

```bash
npm run build
npm run preview  # Prévisualiser le build
```

---

## 🌐 Déploiement

**Voir :** [`DEPLOY-GUIDE.md`](./DEPLOY-GUIDE.md)

Quick start Vercel :
1. Connecte ton compte GitHub à Vercel
2. Importe ce repo
3. Configure les variables d'environnement Firebase
4. Deploy ! 🚀

---

## 💳 Intégration Stripe

**Voir :** [`STRIPE-INTEGRATION-PLAN.md`](./STRIPE-INTEGRATION-PLAN.md)

Plan d'action complet pour activer les paiements récurrents 49€/mois.

---

## 📊 Plan Marketing

**Voir :** [`../../../docs/SECHE10SEMAINES-MASTER-PLAN.md`](../../../docs/SECHE10SEMAINES-MASTER-PLAN.md)

Plan complet A→Z pour atteindre 7k€/mois en 24 semaines.

---

## 🔐 Sécurité

### Firebase Rules (Firestore)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

✅ **Sécurisé :** Chaque utilisateur ne peut accéder qu'à ses propres données.

---

## 🧪 Tests

*(À implémenter)*

```bash
# Tests unitaires
npm run test

# Tests E2E
npm run test:e2e
```

---

## 📈 Métriques Cibles

| Métrique | Cible Semaine 4 | Cible Mois 3 | Cible Mois 6 |
|----------|-----------------|--------------|--------------|
| Clients actifs | 5 | 50 | 143 |
| MRR | 245€ | 2,450€ | 7,007€ |
| Taux conversion | > 2% | > 3% | > 5% |
| Churn mensuel | < 15% | < 10% | < 8% |
| NPS | > 8/10 | > 9/10 | > 9/10 |

---

## 🤝 Contributeurs

- **Huzine** - Founder & Developer
- **OpenClaw IA** - Assistant technique & stratégie

---

## 📜 Licence

Propriétaire - © 2025 Sèche10Semaines

---

## 🔗 Liens Utiles

- **Master Plan :** [`docs/SECHE10SEMAINES-MASTER-PLAN.md`](../../../docs/SECHE10SEMAINES-MASTER-PLAN.md)
- **Deploy Guide :** [`DEPLOY-GUIDE.md`](./DEPLOY-GUIDE.md)
- **Stripe Integration :** [`STRIPE-INTEGRATION-PLAN.md`](./STRIPE-INTEGRATION-PLAN.md)
- **Landing Copy :** [`LANDING-COPY.md`](./LANDING-COPY.md)

---

**Let's build. 🔥**
