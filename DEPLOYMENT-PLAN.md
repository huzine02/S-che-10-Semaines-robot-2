# 🚀 DÉPLOIEMENT VERCEL - Plan d'action

## Objectif
App en ligne à `seche10semaines.vercel.app` (puis domaine custom)

## Étapes

### 1. Setup Vercel (10 min)
- [ ] Créer compte Vercel (https://vercel.com)
- [ ] Connecter GitHub
- [ ] Importer repo `S-che-10-Semaines-robot-2`

### 2. Configuration build (5 min)
Vercel détecte automatiquement Vite, mais vérifier :
- Build Command : `npm run build`
- Output Directory : `dist`
- Install Command : `npm install`

### 3. Variables d'environnement (5 min)
Dans Vercel Dashboard → Settings → Environment Variables :
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_GEMINI_API_KEY` (si utilisé)

### 4. Domaine custom (optionnel, 15 min)
- [ ] Acheter domaine (ex: `seche10semaines.com` sur Namecheap)
- [ ] Configurer DNS dans Vercel
- [ ] Activer SSL automatique

### 5. CI/CD automatique
✅ **Déjà activé par défaut** :
- Push sur `main` → deploy auto en prod
- Pull Request → preview deploy

### 6. Environnements
- **Production** : `main` branch
- **Staging** : `develop` branch (à créer si besoin)

## Total : ~35 min

## Commandes utiles
```bash
# Installer Vercel CLI (optionnel)
npm i -g vercel

# Deploy depuis CLI
vercel --prod
```

---

**Dès que Stripe est intégré, on déploie en PROD ! 🔥**
