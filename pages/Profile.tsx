import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { useAuth } from '../AuthContext';
import { UserProfile } from '../types';

// ─── DESIGN SYSTEM ───
const C = {
  primary: '#0F2C59',
  accent: '#00B894',
  accentDark: '#008E72',
  accentBg: '#E0F2F1',
  bg: '#F8FAFC',
  surface: '#FFF',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  red: '#EF4444',
  orange: '#F59E0B',
  blue: '#3B82F6',
  blueBg: '#EFF6FF',
};

// ─── HELPERS ───
const cardStyle: React.CSSProperties = {
  background: C.surface,
  borderRadius: 12,
  padding: 16,
  border: `1px solid ${C.borderLight}`,
  boxShadow: '0 2px 12px -2px rgba(15,44,89,0.04)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: C.textMuted,
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 12,
};

const statBox = (bg = C.bg): React.CSSProperties => ({
  background: bg,
  padding: 10,
  borderRadius: 8,
  textAlign: 'center',
  flex: 1,
});

const statLabel: React.CSSProperties = { fontSize: 10, color: C.textMuted, fontWeight: 600, marginBottom: 4 };
const statValue: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: C.primary };

function getPhase(createdAt?: string): { name: string; label: string; color: string; bg: string } {
  if (!createdAt) return { name: 'Démarrage', label: 'S1', color: C.blue, bg: C.blueBg };
  
  const start = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.max(1, Math.floor(diffDays / 7) + 1);

  if (week <= 3) return { name: 'Reset Métabolique', label: `Phase 1 — S${week}/3`, color: '#0EA5E9', bg: '#F0F9FF' };
  if (week <= 7) return { name: 'Sèche Viscérale', label: `Phase 2 — S${week - 3}/4`, color: '#F59E0B', bg: '#FFFBEB' };
  if (week <= 10) return { name: 'Définition', label: `Phase 3 — S${week - 7}/3`, color: '#10B981', bg: '#ECFDF5' };
  return { name: 'Maintenance', label: `Post-prog — S${week}`, color: '#8B5CF6', bg: '#F5F3FF' };
}

function getLatest(arr: { date: string; value: number }[] | undefined) {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const item = sorted[0];
  const d = new Date(item.date);
  return { 
    value: item.value, 
    dateStr: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) 
  };
}

function DeltaBadge({ initial, current, unit, invert = false }: { initial?: number, current?: number, unit: string, invert?: boolean }) {
  if (initial == null || current == null) return null;
  const diff = current - initial;
  if (Math.abs(diff) < 0.1) return <span style={{ fontSize: 11, color: C.textMuted }}>= Stable</span>;

  const isPositive = diff > 0;
  const isGood = invert ? isPositive : !isPositive;
  const color = isGood ? C.accent : C.red;
  const arrow = isPositive ? '↑' : '↓';
  const sign = isPositive ? '+' : '';

  return (
    <span style={{ fontSize: 11, fontWeight: 700, color }}>
      {arrow} {sign}{diff.toFixed(1)} {unit}
    </span>
  );
}

export const Profile: React.FC = () => {
  const { user, userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const profile = userProfile;
  const diet = profile?.dietProfile;

  const [uploadStatus, setUploadStatus] = useState('');
  const [showTraining, setShowTraining] = useState(true);
  
  // États locaux pour affichage immédiat après upload
  const [localPhotoStart, setLocalPhotoStart] = useState<string | undefined>(undefined);
  const [localPhotoCurrent, setLocalPhotoCurrent] = useState<string | undefined>(undefined);

  const startRef = useRef<HTMLInputElement>(null);
  const currentRef = useRef<HTMLInputElement>(null);

  // Synchronisation initiale
  useEffect(() => {
    if (profile?.photoStart) setLocalPhotoStart(profile.photoStart);
    if (profile?.photoCurrent) setLocalPhotoCurrent(profile.photoCurrent);
  }, [profile]);

  // ─── CALCULS & DATA ───
  const phase = useMemo(() => getPhase(profile?.createdAt), [profile?.createdAt]);
  
  const latestWeight = getLatest(profile?.pesees?.map(p => ({ date: p.date, value: p.poids })));
  const startWeight = profile?.initialWeight || diet?.biometrics?.weight;

  const latestWaist = getLatest(profile?.tourDeTaille);
  const startWaist = profile?.initialWaistline || diet?.biometrics?.waistline;

  const projectedLoss = diet?.projectedLoss?.weight || 0;
  
  const hasDualMacros = diet?.training && diet?.rest;
  // Correction: utiliser 'fats' de manière cohérente avec le type défini dans SetupDiet
  const activeMacros = hasDualMacros 
    ? (showTraining ? diet!.training : diet!.rest) 
    : { 
        calories: diet?.targetCalories, 
        protein: diet?.macros?.protein, 
        carbs: diet?.macros?.carbs, 
        fats: diet?.macros?.fats 
      };

  const latestGlucose = getLatest(profile?.glucoseReadings);
  const latestLipids = profile?.lipidesReadings && profile.lipidesReadings.length > 0 
    ? profile.lipidesReadings[profile.lipidesReadings.length - 1] 
    : null;

  // ─── ACTIONS ───
  
  // 1. GENERATION GUIDE PDF (Format Web/Print)
  const openDynamicGuide = () => {
    const w = window.open('', '_blank');
    if (!w) {
      alert("Veuillez autoriser les pop-ups pour voir le guide.");
      return;
    }
    
    // Contenu extrait du guide officiel fourni
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Guide Sèche 10 Semaines - Officiel</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&family=Cabinet+Grotesk:wght@800&display=swap');
          body { font-family: 'DM Sans', sans-serif; line-height: 1.6; color: #1E293B; max-width: 800px; margin: 0 auto; padding: 40px; background: #fff; }
          h1, h2, h3, h4 { font-family: 'Cabinet Grotesk', sans-serif; color: #0F2C59; }
          h1 { border-bottom: 4px solid #00B894; padding-bottom: 20px; margin-bottom: 40px; font-size: 2.5rem; }
          h2 { margin-top: 40px; border-left: 4px solid #00B894; padding-left: 15px; font-size: 1.8rem; background: #F8FAFC; padding: 10px 15px; }
          h3 { color: #00B894; margin-top: 30px; font-size: 1.4rem; }
          .highlight { background: #E0F2F1; padding: 2px 6px; border-radius: 4px; color: #008E72; font-weight: bold; }
          .box { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 20px; border-radius: 12px; margin: 20px 0; }
          .warning { background: #FFF7ED; color: #9A3412; border: 1px solid #FED7AA; padding: 15px; border-radius: 8px; font-size: 0.9rem; margin-bottom: 30px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 8px; }
          .footer { margin-top: 60px; text-align: center; font-size: 0.8rem; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 20px; }
          
          @media print { 
            body { padding: 0; } 
            .no-print { display: none; } 
            h2 { page-break-before: always; margin-top: 0; }
            h2:first-of-type { page-break-before: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align:right; margin-bottom:20px;">
          <button onclick="window.print()" style="background:#0F2C59; color:white; padding:10px 20px; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Imprimer / Enregistrer en PDF</button>
        </div>

        <h1>SÈCHE 10 SEMAINES <br><span style="font-size:1.2rem; color:#00B894; font-weight:500;">Protocole Métabolique Complet</span></h1>

        <div class="warning">
          <strong>⚠️ AVERTISSEMENT MÉDICAL</strong><br>
          Ce guide est un outil d'hygiène de vie. Il ne remplace pas un avis médical. Consultez votre médecin avant de commencer, surtout en cas de diabète ou pathologie cardiaque.
        </div>

        <p>Ce programme repose sur une approche métabolique globale qui cible simultanément trois objectifs : la perte de masse grasse, la préservation de ta masse musculaire, et l'amélioration de tes marqueurs de santé (glycémie, cholestérol LDL/HDL).</p>

        <h2>1. LES 3 PILIERS DU PROGRAMME</h2>
        
        <h3>Pilier 1 : Nutrition Anti-Inflammatoire</h3>
        <p>Une alimentation riche en protéines, en fibres, avec des glucides à index glycémique bas consommés au bon moment pour stabiliser l'insuline.</p>
        
        <h3>Pilier 2 : Entraînement Anti-Catabolique</h3>
        <p>Maintenir la tension mécanique sur tes muscles pour envoyer un signal clair à ton corps : "Ce muscle est indispensable, ne le dégrade pas".</p>
        
        <h3>Pilier 3 : Gestion du Stress et du Sommeil</h3>
        <p>Le cortisol (stress) favorise le stockage abdominal. Un sommeil insuffisant (< 7h) augmente la faim. Ces facteurs sont cruciaux.</p>

        <h2>2. NUTRITION MÉTABOLIQUE</h2>
        <div class="box">
          <strong>Répartition Macros :</strong>
          <ul>
            <li><strong>Protéines :</strong> 1.8 à 2.2g par kg de poids de corps.</li>
            <li><strong>Lipides :</strong> 0.8 à 1g par kg (Essentiel pour les hormones).</li>
            <li><strong>Glucides :</strong> Variable selon l'activité (Cyclage Calorique).</li>
          </ul>
        </div>

        <h3>Aliments à Privilégier</h3>
        <ul>
          <li><strong>Protéines :</strong> Poulet, dinde, bœuf 5%, poissons blancs, saumon, œufs, tofu.</li>
          <li><strong>Glucides IG Bas :</strong> Riz basmati, patate douce, avoine, quinoa, légumineuses.</li>
          <li><strong>Lipides Sains :</strong> Huile d'olive, avocat, noix, amandes, oméga-3.</li>
          <li><strong>Légumes :</strong> À volonté (Verts, crucifères, salades).</li>
        </ul>

        <h2>3. L'ENTRAÎNEMENT (PPL)</h2>
        <p>Fréquence idéale : 3 séances de musculation + 2 cardio basse intensité (LISS).</p>
        
        <ul>
          <li><strong>PUSH (Lundi) :</strong> Pectoraux, Épaules, Triceps. (Dev. Couché, Militaire, Dips...)</li>
          <li><strong>PULL (Mercredi) :</strong> Dos, Biceps, Arrière d'épaule. (Tractions, Rowing, Curl...)</li>
          <li><strong>LEGS (Vendredi) :</strong> Jambes, Abdos. (Squat, Fentes, Leg Curl...)</li>
        </ul>
        <p><em>Retrouvez les vidéos de démonstration directement dans l'application, onglet "Journal" > "Voir la séance".</em></p>

        <h2>4. PROTOCOLE SEMAINE PAR SEMAINE</h2>
        
        <div class="box">
          <strong>Phase 1 : Reset Métabolique (Semaines 1-3)</strong><br>
          Objectif : Détox et sensibilité à l'insuline. Déficit modéré (-300 kcal).<br>
          <em>Focus : Mise en place des habitudes et sommeil.</em>
        </div>
        
        <div class="box">
          <strong>Phase 2 : Sèche Viscérale (Semaines 4-7)</strong><br>
          Objectif : Brûlage maximal. Déficit accéléré (-500 kcal).<br>
          <em>Focus : C'est là que le tour de taille diminue le plus. Intensité maximale.</em>
        </div>
        
        <div class="box">
          <strong>Phase 3 : Définition (Semaines 8-10)</strong><br>
          Objectif : Finition et stabilisation.<br>
          <em>Focus : Réintroduction progressive des glucides ("Reverse Diet") pour éviter l'effet yo-yo.</em>
        </div>

        <h2>5. FAQ & TROUBLESHOOTING</h2>
        <p><strong>J'ai faim :</strong> Augmente les légumes verts et l'eau. Vérifie tes protéines.</p>
        <p><strong>Je stagne :</strong> C'est normal d'avoir des paliers. Si > 2 semaines, augmente le cardio de 15min.</p>
        <p><strong>Écart alimentaire :</strong> Ne culpabilise pas. Reprends le plan au repas suivant. Ne saute pas de repas pour compenser.</p>

        <div class="footer">
          © 2025 Sèche 10 Semaines - Guide Officiel.<br>
          Généré depuis votre espace membre.
        </div>
      </body>
      </html>
    `;
    w.document.write(htmlContent);
    w.document.close();
  };

  // 2. CORRECTION UPLOAD PHOTOS
  const resizeImage = (file: File, maxW: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target!.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > maxW) { h *= maxW / w; w = maxW; }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error("Canvas failed")); return; }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleUpload = async (file: File, field: 'photoStart' | 'photoCurrent') => {
    if (!user) return;
    setUploadStatus('Traitement...');
    
    try {
      // 1. Resize client-side
      const base64 = await resizeImage(file, 1024, 0.7);
      
      setUploadStatus('Envoi...');
      
      // 2. Upload to Firebase Storage
      // Important : Chemin unique avec timestamp pour éviter le cache
      const path = `users/${user.uid}/${field}_${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      
      await uploadString(storageRef, base64, 'data_url');
      const url = await getDownloadURL(storageRef);
      
      console.log('Upload success, url:', url);

      // 3. Update Firestore
      await updateDoc(doc(db, 'users', user.uid), { [field]: url });
      
      // 4. Update Local State immediately (Feedback instantané)
      if (field === 'photoStart') setLocalPhotoStart(url);
      if (field === 'photoCurrent') setLocalPhotoCurrent(url);
      
      // 5. Refresh Context in background
      refreshProfile();
      
      setUploadStatus('✅ Sauvegardé');
      setTimeout(() => setUploadStatus(''), 2500);
      
    } catch (e: any) {
      console.error("Upload error:", e);
      alert('Erreur lors de l\'upload : ' + e.message);
      setUploadStatus('');
    }
  };

  const logout = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: C.bg, minHeight: '100vh', paddingBottom: 100, color: C.text }}>
      <style>{`@import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,500&display=swap');`}</style>

      {/* HEADER */}
      <header style={{ background: C.surface, padding: '32px 20px 16px', borderBottom: `1px solid ${C.border}` }}>
        <h1 style={{ fontFamily: "'Cabinet Grotesk'", fontSize: '1.5rem', fontWeight: 800, color: C.primary }}>Mon Profil</h1>
      </header>

      <main style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 1. INFO UTILISATEUR & PHASE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: C.accentBg, border: `2px solid ${C.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden' }}>
            {localPhotoCurrent ? <img src={localPhotoCurrent} alt="Profil" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : '👤'}
          </div>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 18, color: C.primary, lineHeight: 1.2 }}>{profile?.firstName || 'Athlète'}</h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: phase.bg, padding: '4px 10px', borderRadius: 20, marginTop: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: phase.color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: phase.color }}>{phase.label} — {phase.name}</span>
            </div>
          </div>
        </div>

        {/* 2. BILAN PROGRESSION (DELTAS) */}
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>📉 Bilan Progression</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={statBox()}>
              <div style={statLabel}>Poids Actuel</div>
              <div style={statValue}>{latestWeight ? `${latestWeight.value} kg` : '--'}</div>
              <DeltaBadge initial={startWeight} current={latestWeight?.value} unit="kg" />
            </div>
            <div style={statBox()}>
              <div style={statLabel}>Tour de Taille</div>
              <div style={statValue}>{latestWaist ? `${latestWaist.value} cm` : '--'}</div>
              <DeltaBadge initial={startWaist} current={latestWaist?.value} unit="cm" />
            </div>
            <div style={statBox()}>
              <div style={statLabel}>Objectif Atteint</div>
              <div style={statValue}>
                {startWeight && latestWeight && projectedLoss 
                  ? `${Math.min(100, Math.round(((startWeight - latestWeight.value) / projectedLoss) * 100))}%` 
                  : '0%'}
              </div>
              <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>Cible: -{projectedLoss}kg</div>
            </div>
          </div>
        </div>

        {/* 3. PROFIL MÉTABOLIQUE (DUAL MACROS) */}
        {diet && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ ...sectionTitleStyle, marginBottom: 0 }}>⚡ Métabolisme</h3>
              {hasDualMacros && (
                <div style={{ display: 'flex', background: C.borderLight, borderRadius: 8, padding: 2 }}>
                  <button onClick={() => setShowTraining(true)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, border: 'none', background: showTraining ? C.primary : 'transparent', color: showTraining ? 'white' : C.textMuted, cursor: 'pointer' }}>Training</button>
                  <button onClick={() => setShowTraining(false)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, border: 'none', background: !showTraining ? C.orange : 'transparent', color: !showTraining ? 'white' : C.textMuted, cursor: 'pointer' }}>Repos</button>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={statBox(C.bg)}>
                <div style={statLabel}>TDEE</div>
                <div style={statValue}>{diet.tdee} <span style={{fontSize:9, fontWeight:400}}>kcal</span></div>
              </div>
              <div style={statBox(C.bg)}>
                <div style={statLabel}>Déficit</div>
                <div style={statValue}>{diet.deficitPercent || 20}%</div>
              </div>
              <div style={statBox(C.bg)}>
                <div style={statLabel}>BF% Navy</div>
                <div style={statValue}>{diet.bodyFatEstimate ? `${diet.bodyFatEstimate}%` : '--'}</div>
              </div>
            </div>

            {/* Daily Target Box */}
            <div style={{ background: showTraining ? '#EFF6FF' : '#FFF7ED', border: `1px solid ${showTraining ? '#BFDBFE' : '#FED7AA'}`, borderRadius: 10, padding: 12 }}>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: showTraining ? C.primary : C.orange, textTransform: 'uppercase' }}>
                  Cible {showTraining ? 'Entraînement' : 'Repos'}
                </span>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
                  {activeMacros?.calories || '--'} <span style={{ fontSize: 12, color: C.textMuted }}>kcal</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, paddingTop: 8, borderTop: `1px solid ${showTraining ? '#DBEAFE' : '#FFEDD5'}` }}>
                <div style={{ textAlign: 'center', flex: 1 }}><div style={{fontWeight:700, color: C.blue}}>Prot</div>{activeMacros?.protein}g</div>
                <div style={{ textAlign: 'center', flex: 1 }}><div style={{fontWeight:700, color: C.orange}}>Gluc</div>{activeMacros?.carbs}g</div>
                <div style={{ textAlign: 'center', flex: 1 }}><div style={{fontWeight:700, color: C.red}}>Lip</div>{activeMacros?.fats}g</div>
              </div>
            </div>
          </div>
        )}

        {/* 4. BILAN SANTÉ */}
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>🩺 Santé Métabolique</h3>
          
          {/* Glycémie */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.borderLight}` }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>Glycémie à jeun</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {latestGlucose ? latestGlucose.value.toFixed(2) : '--'} <span style={{fontSize:11, fontWeight:400}}>g/L</span>
              </div>
              {latestGlucose && <div style={{fontSize:9, color:C.textMuted}}>{latestGlucose.dateStr}</div>}
            </div>
            {latestGlucose && (
              <div style={{ 
                padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, 
                background: latestGlucose.value < 0.95 ? C.accentBg : latestGlucose.value > 1.10 ? '#FEF2F2' : '#FFF7ED',
                color: latestGlucose.value < 0.95 ? C.accentDark : latestGlucose.value > 1.10 ? C.red : C.orange 
              }}>
                {latestGlucose.value < 0.95 ? 'Optimal' : latestGlucose.value < 1.00 ? 'Normal' : latestGlucose.value < 1.26 ? 'Pré-diabète' : 'Élevé'}
              </div>
            )}
          </div>

          {/* Lipides */}
          {latestLipids ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={statBox(C.bg)}>
                <div style={statLabel}>LDL (Mauvais)</div>
                <div style={{ ...statValue, color: latestLipids.ldl < 130 ? C.primary : C.red }}>{latestLipids.ldl}</div>
              </div>
              <div style={statBox(C.bg)}>
                <div style={statLabel}>HDL (Bon)</div>
                <div style={{ ...statValue, color: latestLipids.hdl > 40 ? C.accent : C.orange }}>{latestLipids.hdl}</div>
              </div>
              <div style={statBox(C.bg)}>
                <div style={statLabel}>Triglycérides</div>
                <div style={{ ...statValue, color: latestLipids.triglycerides < 150 ? C.primary : C.orange }}>{latestLipids.triglycerides}</div>
              </div>
              <div style={statBox(C.bg)}>
                <div style={statLabel}>Chol. Total</div>
                <div style={statValue}>{latestLipids.total || '--'}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic', textAlign: 'center' }}>Aucune analyse lipidique enregistrée.</div>
          )}
        </div>

        {/* 5. PHOTOS & UPLOAD */}
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>📸 Transformation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Début', ref: startRef, field: 'photoStart' as const, src: localPhotoStart },
              { label: 'Actuel', ref: currentRef, field: 'photoCurrent' as const, src: localPhotoCurrent }
            ].map((p, i) => (
              <div key={i} onClick={() => p.ref.current?.click()} style={{ aspectRatio: '3/4', background: C.bg, borderRadius: 8, border: `2px dashed ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
                {p.src ? <img src={p.src} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20 }}>📷</span>}
                <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 10, textAlign: 'center', padding: 4 }}>{p.label}</div>
                <input type="file" ref={p.ref} hidden accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], p.field)} />
              </div>
            ))}
          </div>
          {uploadStatus && <div style={{ fontSize: 11, color: C.accent, textAlign: 'center', marginTop: 8, fontWeight: 600 }}>{uploadStatus}</div>}
        </div>

        {/* 6. LIENS & GUIDE */}
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>📚 Ressources</h3>
          <div onClick={openDynamicGuide} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.borderLight}`, cursor: 'pointer' }}>
            <span style={{ fontSize: 20 }}>📕</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>Guide Sèche 10 Semaines</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Ouvrir le Guide Complet</div>
            </div>
            <span style={{ color: C.textMuted }}>→</span>
          </div>
          <a href="https://t.me/+dOa-aLAck3c2Mjk0" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', textDecoration: 'none' }}>
            <span style={{ fontSize: 20 }}>💬</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>Communauté Telegram</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Groupe Privé</div>
            </div>
            <span style={{ color: C.textMuted }}>→</span>
          </a>
        </div>

        {/* 7. ACTIONS COMPTE */}
        <div>
          <h3 style={sectionTitleStyle}>Zone de danger</h3>
          <Link to="/setup" style={{ display: 'block', padding: 12, background: C.surface, borderRadius: 8, textAlign: 'center', fontSize: 12, fontWeight: 700, color: C.textMuted, textDecoration: 'none', border: `1px solid ${C.border}`, marginBottom: 12 }}>
            ⚙️ Recalibrer mon programme
          </Link>
          <button onClick={logout} style={{ width: '100%', padding: 12, background: '#FEF2F2', color: C.red, border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Déconnexion
          </button>
        </div>

      </main>
    </div>
  );
};