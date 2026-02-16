#!/bin/bash
# 🚀 SCRIPT DE DÉPLOIEMENT ONE-CLICK
# Usage: ./deploy.sh

set -e

echo "🚀 Déploiement Sèche10Semaines..."

# 1. Build local
echo "📦 Build de l'app..."
npm run build

# 2. Test que le build fonctionne
if [ ! -d "dist" ]; then
  echo "❌ Erreur: Le dossier dist n'existe pas"
  exit 1
fi

echo "✅ Build OK"

# 3. Push sur GitHub
echo "📤 Push sur GitHub..."
git add .
git commit -m "🚀 Deploy: $(date '+%Y-%m-%d %H:%M')" || echo "Rien à committer"
git push origin main

echo "✅ Push OK"

# 4. Deploy sur Vercel (si CLI installé)
if command -v vercel &> /dev/null; then
  echo "🌐 Déploiement Vercel..."
  vercel --prod
  echo "✅ DÉPLOYÉ SUR VERCEL !"
else
  echo "⚠️  Vercel CLI non installé"
  echo "👉 Installe avec: npm install -g vercel"
  echo "👉 Ou déploie via dashboard: https://vercel.com"
fi

echo ""
echo "🎉 TERMINÉ !"
echo "📱 Ton app est en ligne (ou prête à l'être)"
