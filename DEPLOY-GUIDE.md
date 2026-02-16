# 🚀 GUIDE DE DÉPLOIEMENT - Sèche10Semaines

## ✅ Ce qui est PRÊT

L'application est **fonctionnelle et complète** avec :
- ✅ Landing page optimisée (design + copy de vente)
- ✅ Authentification Firebase (email + Google)
- ✅ Dashboard utilisateur avec suivi poids/glycémie
- ✅ Génération de plan alimentaire personnalisé
- ✅ Journal quotidien des repas
- ✅ Design moderne et responsive

---

## 🎯 DÉPLOIEMENT SUR VERCEL (15 minutes)

### Étape 1 : Créer compte Vercel
1. Va sur https://vercel.com
2. Clique "Sign Up" → Connecte avec GitHub
3. Autorise Vercel à accéder à tes repos

### Étape 2 : Importer le projet
1. Dashboard Vercel → "Add New Project"
2. Sélectionne le repo `S-che-10-Semaines-robot-2`
3. Configure :
   - **Framework Preset :** Vite (détecté auto)
   - **Root Directory :** `.` (racine)
   - **Build Command :** `npm run build`
   - **Output Directory :** `dist`

### Étape 3 : Variables d'environnement
Dans l'onglet "Environment Variables", ajoute :

```
VITE_FIREBASE_API_KEY=AIzaSyBPg9qE-VMkjQmNLu7haNiuD3IeLscIWzI
VITE_FIREBASE_AUTH_DOMAIN=seche10semaines.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seche10semaines
VITE_FIREBASE_STORAGE_BUCKET=seche10semaines.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=179899198196
VITE_FIREBASE_APP_ID=1:179899198196:web:9ab82351b21f691c724ca1
```

*(Note : Ces clés sont publiques côté Firebase, c'est normal)*

### Étape 4 : Déployer
1. Clique "Deploy"
2. Attends 2-3 minutes
3. **Ton app sera en ligne !** 🎉

URL de prod : `https://seche10semaines.vercel.app` (ou similaire)

---

## 🌐 DOMAINE PERSONNALISÉ (Optionnel, 10 min)

### Option A : Acheter un domaine
1. Va sur [Namecheap](https://www.namecheap.com) ou [OVH](https://www.ovh.com/fr/)
2. Cherche `seche10semaines.fr` ou `.com`
3. Achète (~10-15€/an)

### Option B : Configurer le domaine sur Vercel
1. Dans Vercel Dashboard → Settings → Domains
2. Clique "Add Domain"
3. Entre ton domaine (ex: `seche10semaines.fr`)
4. Copie les DNS fournis par Vercel
5. Va dans ton registrar (Namecheap/OVH)
6. Remplace les DNS par ceux de Vercel
7. Attends 5-30 min pour propagation

**SSL (HTTPS) :** Activé automatiquement par Vercel ✅

---

## 📊 ANALYTICS (15 min)

### Google Analytics
1. Va sur https://analytics.google.com
2. Créer une propriété "Sèche10Semaines"
3. Copie ton `G-XXXXXXXXXX`
4. Dans le code, ajoute dans `index.html` :

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

5. Commit + push → redéploiement auto sur Vercel

---

## 🔐 SÉCURITÉ FIREBASE

### Vérifier les règles Firestore
Dans Firebase Console → Firestore Database → Rules :

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

**✅ Tes règles sont correctes !** Chaque user ne peut lire/écrire que ses propres données.

---

## 💳 INTÉGRATION STRIPE (Priorité suivante)

Une fois l'app déployée, la prochaine étape sera d'intégrer Stripe pour les paiements.

**Voir :** `STRIPE-INTEGRATION-PLAN.md`

---

## 🎯 CHECKLIST LANCEMENT

**Avant de partager l'app publiquement :**

- [ ] App déployée sur Vercel
- [ ] Domaine custom configuré (optionnel)
- [ ] Google Analytics installé
- [ ] Tester l'inscription + connexion
- [ ] Tester la génération de plan alimentaire
- [ ] Vérifier que le journal fonctionne
- [ ] Tester sur mobile (responsive)

**Une fois Stripe intégré :**
- [ ] Tester un paiement en mode test
- [ ] Activer mode production Stripe
- [ ] Configurer emails transactionnels (bienvenue, confirmation paiement)

---

## 🚨 TROUBLESHOOTING

**Erreur de build Vercel :**
- Vérifie que `package.json` a bien toutes les dépendances
- Check les logs de build dans Vercel Dashboard

**Firebase ne fonctionne pas :**
- Vérifie que les variables d'environnement sont bien configurées
- Check que les règles Firestore autorisent l'accès

**App blanche après déploiement :**
- Ouvre la console navigateur (F12)
- Regarde les erreurs réseau ou JS
- Vérifie que les routes sont bien configurées (`vercel.json` si besoin)

---

## 📞 SUPPORT

Si tu as un problème, envoie-moi :
- L'URL de l'app
- Screenshot de l'erreur
- Console navigateur (F12 → onglet Console)

**Prêt à déployer demain matin ! 🚀**

---

**Prochaines étapes après déploiement :**
1. Intégrer Stripe (paiements récurrents)
2. Lancer campagne de teasing (réseaux sociaux)
3. Recruter 5 beta-testeurs gratuits
4. Itérer sur feedback avant lancement officiel
