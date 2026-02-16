import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

// ─── TYPES ──────────────────────────────────────────────
interface Bio {
  firstName: string;
  gender: 'male' | 'female' | '';
  age: string;
  weight: string;
  height: string;
  waistline: string;
  neck: string;
  activity: string;
}

interface Health {
  profile: 'standard' | 'prediabetes' | 'cholesterol';
  glucose: string;
}

interface DietResult {
  tdee: number;
  deficitPercent: number;
  training: { calories: number; protein: number; carbs: number; fats: number };
  rest: { calories: number; protein: number; carbs: number; fats: number };
  bodyFatEstimate: number | null;
  biometrics: { gender: string; age: number; weight: number; height: number; waistline: number; neck: number; activity: number };
  healthProfile: string;
  glucose: number | null;
  projectedLoss: { weight: number; waist: number };
  // Compat fields for existing Dashboard/Journal
  targetCalories: number;
  macros: { protein: number; carbs: number; fats: number };
}

// ─── COLORS ─────────────────────────────────────────────
const C = {
  primary: '#0F2C59', primaryLight: '#163A70', primaryBg: '#F0F4F8',
  accent: '#00B894', accentDark: '#008E72', accentBg: '#E0F2F1',
  bg: '#F8FAFC', surface: '#FFFFFF', text: '#1E293B',
  textMuted: '#64748B', textLight: '#94A3B8',
  border: '#E2E8F0', borderLight: '#F1F5F9',
  red: '#EF4444', orange: '#F59E0B', blue: '#3B82F6',
};

// ─── SCIENCE ENGINE ─────────────────────────────────────

// Mifflin-St Jeor (gold standard — Mifflin 1990)
function calcBMR(gender: string, weight: number, height: number, age: number): number {
  const base = (10 * weight) + (6.25 * height) - (5 * age);
  return gender === 'male' ? base + 5 : base - 161;
}

// US Navy BF% (Hodgdon & Beckett 1984)
function calcBodyFat(gender: string, waist: number, neck: number, height: number): number | null {
  if (!waist || !neck || waist <= neck) return null;
  if (gender === 'male') {
    return Math.round(495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450);
  }
  return null; // Male-only target for v1
}

// Adaptive deficit: 20% if high BF, 25% if leaner (Helms 2014)
function calcDeficitPct(bodyFat: number | null): number {
  if (bodyFat === null) return 0.22;
  if (bodyFat >= 25) return 0.20;
  if (bodyFat >= 18) return 0.22;
  return 0.25;
}

// Protein: 2.0-2.2g/kg in deficit (Morton 2018, Helms 2014)
function calcProtein(weight: number, bodyFat: number | null): number {
  const factor = bodyFat !== null && bodyFat >= 25 ? 2.0 : 2.2;
  return Math.round(weight * factor);
}

// Full computation
function computeDiet(bio: Bio, health: Health): DietResult {
  const age = parseInt(bio.age);
  const weight = parseFloat(bio.weight);
  const height = parseFloat(bio.height);
  const waist = parseFloat(bio.waistline) || 0;
  const neck = parseFloat(bio.neck) || 0;
  const activity = parseFloat(bio.activity);

  const bmr = calcBMR(bio.gender, weight, height, age);
  const tdee = Math.round(bmr * activity);
  const bodyFat = calcBodyFat(bio.gender, waist, neck, height);
  const deficitPct = calcDeficitPct(bodyFat);

  // REST DAY (full deficit)
  const restCal = Math.round(tdee * (1 - deficitPct));
  const protein = calcProtein(weight, bodyFat);

  // Fat % per health profile
  let fatPct: number;
  if (health.profile === 'cholesterol') fatPct = 0.25;
  else if (health.profile === 'prediabetes') fatPct = 0.30;
  else fatPct = 0.28;

  const restFat = Math.round((restCal * fatPct) / 9);
  const restCarbs = Math.round((restCal - protein * 4 - restFat * 9) / 4);

  // TRAINING DAY (half deficit — extra cals go to carbs)
  const trainCal = Math.round(tdee * (1 - deficitPct * 0.5));
  const trainFat = restFat;
  const trainCarbs = Math.round((trainCal - protein * 4 - trainFat * 9) / 4);

  // Projection: 3 training + 4 rest per week × 10 weeks
  const weeklyDeficit = 3 * (tdee - trainCal) + 4 * (tdee - restCal);
  const projWeight = Math.round((weeklyDeficit * 10 / 7700) * 10) / 10;
  const projWaist = waist ? Math.round(projWeight * 1.0) : 0;

  const glucose = health.glucose ? parseFloat(health.glucose) : null;

  return {
    tdee,
    deficitPercent: Math.round(deficitPct * 100),
    training: { calories: trainCal, protein, carbs: trainCarbs, fats: trainFat },
    rest: { calories: restCal, protein, carbs: restCarbs, fats: restFat },
    bodyFatEstimate: bodyFat,
    biometrics: { gender: bio.gender, age, weight, height, waistline: waist, neck, activity },
    healthProfile: health.profile,
    glucose,
    projectedLoss: { weight: projWeight, waist: projWaist },
    targetCalories: restCal,
    macros: { protein, carbs: restCarbs, fats: restFat },
  };
}

// Glycemia feedback (ADA 2024 norms, in g/L)
function glucoseFeedback(val: number | null): { text: string; color: string; bg: string } | null {
  if (val === null) return null;
  if (val < 0.70) return { text: 'En dessous de la normale — consultez votre médecin.', color: C.red, bg: '#FEF2F2' };
  if (val <= 0.99) return { text: 'Glycémie normale. Le protocole optimisera votre sensibilité insuline.', color: C.accent, bg: C.accentBg };
  if (val <= 1.25) return { text: 'Zone prédiabète (1.00–1.25 g/L). Le protocole cible exactement ce profil.', color: C.orange, bg: '#FFF7ED' };
  return { text: 'Glycémie élevée (> 1.25 g/L). Consultez votre médecin en parallèle du programme.', color: C.red, bg: '#FEF2F2' };
}

// ─── COMPONENT ──────────────────────────────────────────
export const SetupDiet: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const [bio, setBio] = useState<Bio>({
    firstName: '', gender: '', age: '', weight: '', height: '', waistline: '', neck: '', activity: '',
  });
  const [health, setHealth] = useState<Health>({ profile: 'standard', glucose: '' });
  const [diet, setDiet] = useState<DietResult | null>(null);

  const step1Valid = bio.firstName && bio.gender && bio.age && bio.weight && bio.height && bio.activity;
  const progressPct = step === 1 ? '33%' : step === 2 ? '66%' : '100%';
  const glucoseVal = health.glucose ? parseFloat(health.glucose) : null;
  const glucoseInfo = glucoseFeedback(glucoseVal);

  const launchCalc = () => {
    setLoading(true);
    const msgs = [
      'Calcul du métabolisme basal (Mifflin-St Jeor)...',
      'Estimation composition corporelle (Navy)...',
      'Calibrage du déficit adaptatif...',
      'Protéines optimisées par kg de poids...',
      'Cyclage calorique Training / Repos...',
    ];
    let i = 0;
    setLoadMsg(msgs[0]);
    const iv = setInterval(() => { i++; if (i < msgs.length) setLoadMsg(msgs[i]); }, 800);
    setTimeout(() => {
      clearInterval(iv);
      setDiet(computeDiet(bio, health));
      setLoading(false);
      setStep(3);
    }, 4000);
  };

  const saveAndStart = async () => {
    if (!diet || !user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        firstName: bio.firstName,
        gender: bio.gender,
        dietProfile: diet,
        initialWaistline: parseFloat(bio.waistline) || null,
        initialWeight: parseFloat(bio.weight),
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
      }, { merge: true });
      await refreshProfile();
      navigate('/dashboard');
    } catch (e: any) {
      console.error(e);
      alert('Erreur : ' + e.message);
      setSaving(false);
    }
  };

  const profileNote = () => {
    if (!diet) return '';
    if (diet.healthProfile === 'prediabetes')
      return 'Glucides modérés et répartis pour lisser les pics d\'insuline. Fibres en début de repas. Marche 10min post-repas recommandée.';
    if (diet.healthProfile === 'cholesterol')
      return 'Lipides à 25% avec sources protectrices : huile d\'olive, oméga-3, amandes. Graisses saturées limitées, pas supprimées.';
    return 'Répartition performance : protéines élevées pour l\'anabolisme, glucides concentrés autour de l\'entraînement.';
  };

  // ─── STYLES ─────────────────────────────────────────────
  const s = {
    page: { fontFamily: "'DM Sans', sans-serif", background: C.bg, color: C.text, minHeight: '100vh', display: 'flex', flexDirection: 'column' as const },
    header: { background: C.surface, padding: '16px 20px', textAlign: 'center' as const, borderBottom: `1px solid ${C.border}` },
    logo: { fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 800, color: C.primary, fontSize: '1.15rem', letterSpacing: '-0.02em' },
    logoA: { color: C.accent },
    wrap: { flex: 1, maxWidth: 560, margin: '0 auto', width: '100%', padding: '24px 20px 40px' },
    progBg: { background: C.border, height: 5, borderRadius: 10, overflow: 'hidden' as const, marginBottom: 8 },
    progFill: { height: '100%', background: `linear-gradient(90deg, ${C.accent}, ${C.accentDark})`, transition: 'width 0.5s', width: progressPct, borderRadius: 10 },
    steps: { display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 28, color: C.textLight },
    stepAct: { color: C.accent },
    h1: { fontFamily: "'Cabinet Grotesk'", fontSize: '1.6rem', fontWeight: 800, color: C.primary, marginBottom: 6, lineHeight: 1.15 },
    sub: { color: C.textMuted, fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.6 },
    label: { display: 'block', fontWeight: 700, fontSize: 10, marginBottom: 6, color: C.primary, textTransform: 'uppercase' as const, letterSpacing: 1 },
    labelOpt: { color: C.textLight, fontWeight: 500 as const, textTransform: 'none' as const, letterSpacing: 0 },
    input: { width: '100%', padding: '13px 14px', border: `2px solid ${C.border}`, borderRadius: 10, fontSize: '1rem', fontFamily: "'DM Sans'", background: C.surface, color: C.primary, fontWeight: 600, outline: 'none', transition: '0.2s', boxSizing: 'border-box' as const },
    formG: { marginBottom: 16 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
    card: { background: C.surface, border: `2px solid ${C.border}`, padding: '13px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 12, position: 'relative' as const },
    cardOn: { borderColor: C.accent, background: '#F0FDF4', boxShadow: '0 3px 12px rgba(0,184,148,0.12)' },
    cardTitle: { fontWeight: 700, color: C.primary, fontSize: '0.88rem', display: 'block' },
    cardDesc: { fontSize: '0.76rem', color: C.textMuted, lineHeight: 1.35, marginTop: 2 },
    check: { position: 'absolute' as const, top: 8, right: 8, color: C.accent, fontWeight: 700, fontSize: 16 },
    icon: { fontSize: '1.3rem', flexShrink: 0 },
    btnNext: { width: '100%', padding: 15, borderRadius: 50, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', border: 'none', background: C.primary, color: 'white', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: '0.2s', boxShadow: '0 8px 24px -4px rgba(15,44,89,0.25)' },
    btnDis: { opacity: 0.4, cursor: 'not-allowed', boxShadow: 'none' },
    btnBack: { background: 'transparent', border: 'none', padding: '10px 16px', color: C.textMuted, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' },
    btnRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 },
    hint: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 8, fontSize: '0.76rem', lineHeight: 1.5, marginTop: 8, border: '1px solid' },
    spinner: { width: 44, height: 44, border: `4px solid ${C.border}`, borderTop: `4px solid ${C.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' },
  };

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,500,700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
        @keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .slide{animation:slideUp 0.35s ease-out}
        input:focus{border-color:${C.primary} !important}
      `}</style>

      <header style={s.header}>
        <div style={s.logo}>Sèche<span style={s.logoA}>10</span>Semaines</div>
      </header>

      <div style={s.wrap}>
        {!loading && (
          <div style={{ marginBottom: 24 }}>
            <div style={s.progBg}><div style={s.progFill} /></div>
            <div style={s.steps}>
              <span style={step >= 1 ? s.stepAct : {}}>1. Biométrie</span>
              <span style={step >= 2 ? s.stepAct : {}}>2. Métabolique</span>
              <span style={step >= 3 ? s.stepAct : {}}>3. Votre Plan</span>
            </div>
          </div>
        )}

        {/* ═══════ STEP 1 ═══════ */}
        {step === 1 && (
          <div className="slide" key="s1">
            <h1 style={s.h1}>Profil Physiologique</h1>
            <p style={s.sub}>Données pour le calcul précis de votre métabolisme et composition corporelle.</p>

            <div style={s.formG}>
              <label style={s.label}>Prénom</label>
              <input style={s.input} placeholder="Thomas" value={bio.firstName} onChange={e => setBio({ ...bio, firstName: e.target.value })} />
            </div>

            <div style={s.formG}>
              <label style={s.label}>Sexe biologique</label>
              <div style={s.grid2}>
                {(['male', 'female'] as const).map(g => (
                  <div key={g} style={{ ...s.card, ...(bio.gender === g ? s.cardOn : {}) }} onClick={() => setBio({ ...bio, gender: g })}>
                    <span style={s.icon}>{g === 'male' ? '♂️' : '♀️'}</span>
                    <span style={s.cardTitle}>{g === 'male' ? 'Homme' : 'Femme'}</span>
                    {bio.gender === g && <span style={s.check}>✓</span>}
                  </div>
                ))}
              </div>
            </div>

            <div style={s.grid3}>
              <div style={s.formG}>
                <label style={s.label}>Âge</label>
                <input style={s.input} type="number" inputMode="numeric" placeholder="42" value={bio.age} onChange={e => setBio({ ...bio, age: e.target.value })} />
              </div>
              <div style={s.formG}>
                <label style={s.label}>Poids (kg)</label>
                <input style={s.input} type="number" inputMode="decimal" step="0.1" placeholder="85.5" value={bio.weight} onChange={e => setBio({ ...bio, weight: e.target.value })} />
              </div>
              <div style={s.formG}>
                <label style={s.label}>Taille (cm)</label>
                <input style={s.input} type="number" inputMode="numeric" placeholder="178" value={bio.height} onChange={e => setBio({ ...bio, height: e.target.value })} />
              </div>
            </div>

            {/* Body measurements block */}
            <div style={{ background: C.primaryBg, borderRadius: 12, padding: '14px 14px', marginBottom: 16, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 15 }}>📏</span>
                <span style={{ fontWeight: 700, fontSize: 12, color: C.primary }}>Mesures corporelles</span>
                <span style={{ fontSize: 9, color: C.textLight, background: C.surface, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Pour estimation masse grasse</span>
              </div>
              <div style={s.grid2}>
                <div>
                  <label style={s.label}>Tour de taille (cm)</label>
                  <input style={s.input} type="number" inputMode="decimal" placeholder="92" value={bio.waistline} onChange={e => setBio({ ...bio, waistline: e.target.value })} />
                  <div style={{ fontSize: 9, color: C.textLight, marginTop: 3 }}>Au nombril, matin à jeun</div>
                </div>
                <div>
                  <label style={s.label}>Tour de cou (cm)</label>
                  <input style={s.input} type="number" inputMode="decimal" placeholder="40" value={bio.neck} onChange={e => setBio({ ...bio, neck: e.target.value })} />
                  <div style={{ fontSize: 9, color: C.textLight, marginTop: 3 }}>Sous la pomme d'Adam</div>
                </div>
              </div>
              {!bio.waistline && !bio.neck && (
                <div style={{ ...s.hint, background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' }}>
                  <span>💡</span><span>Sans ces mesures, le déficit utilisera des valeurs par défaut — résultats moins personnalisés.</span>
                </div>
              )}
            </div>

            <div style={s.formG}>
              <label style={s.label}>Niveau d'Activité <span style={s.labelOpt}>(hors musculation)</span></label>
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { val: '1.2', t: 'Sédentaire', d: 'Bureau, voiture, < 4 000 pas/jour' },
                  { val: '1.375', t: 'Légèrement Actif', d: '4 000–7 000 pas/jour' },
                  { val: '1.55', t: 'Modérément Actif', d: '7 000–10 000 pas/jour ou métier debout' },
                  { val: '1.725', t: 'Très Actif', d: '> 10 000 pas ou métier physique' },
                ].map(o => (
                  <div key={o.val} style={{ ...s.card, ...(bio.activity === o.val ? s.cardOn : {}) }} onClick={() => setBio({ ...bio, activity: o.val })}>
                    <div><span style={s.cardTitle}>{o.t}</span><span style={s.cardDesc}>{o.d}</span></div>
                    {bio.activity === o.val && <span style={s.check}>✓</span>}
                  </div>
                ))}
              </div>
            </div>

            <button style={{ ...s.btnNext, ...(!step1Valid ? s.btnDis : {}) }} onClick={() => step1Valid && setStep(2)} disabled={!step1Valid}>
              Étape Suivante →
            </button>
          </div>
        )}

        {/* ═══════ STEP 2 ═══════ */}
        {step === 2 && !loading && (
          <div className="slide" key="s2">
            <h1 style={s.h1}>Contexte Métabolique</h1>
            <p style={s.sub}>Vos macros seront optimisés selon votre profil — c'est ce qui différencie ce protocole d'un régime générique.</p>

            <div style={s.formG}>
              <label style={s.label}>Votre profil santé</label>
              <div style={{ display: 'grid', gap: 10 }}>
                {([
                  { v: 'standard' as const, i: '⚡', t: 'Standard / Performance', d: 'Bilans normaux. Priorité composition corporelle.' },
                  { v: 'prediabetes' as const, i: '🩸', t: 'Contrôle Glycémie', d: 'Glycémie ≥ 1.00 g/L, résistance insuline, ou gras abdominal tenace.' },
                  { v: 'cholesterol' as const, i: '❤️', t: 'Santé Cardiovasculaire', d: 'LDL élevé, triglycérides, ou traitement en cours.' },
                ]).map(o => (
                  <div key={o.v} style={{ ...s.card, ...(health.profile === o.v ? s.cardOn : {}) }} onClick={() => setHealth({ ...health, profile: o.v })}>
                    <span style={s.icon}>{o.i}</span>
                    <div style={{ flex: 1 }}><span style={s.cardTitle}>{o.t}</span><span style={s.cardDesc}>{o.d}</span></div>
                    {health.profile === o.v && <span style={s.check}>✓</span>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...s.formG, marginTop: 20 }}>
              <label style={s.label}>Glycémie à jeun (g/L) <span style={s.labelOpt}>— sur votre dernière prise de sang</span></label>
              <input style={s.input} type="number" inputMode="decimal" step="0.01" placeholder="Ex: 1.05"
                value={health.glucose} onChange={e => setHealth({ ...health, glucose: e.target.value })} />
              {glucoseInfo && (
                <div style={{ ...s.hint, background: glucoseInfo.bg, borderColor: glucoseInfo.color + '40', color: glucoseInfo.color }}>
                  <span>{glucoseInfo.color === C.accent ? '✅' : '⚠️'}</span><span>{glucoseInfo.text}</span>
                </div>
              )}
              {!health.glucose && (
                <div style={{ fontSize: 11, color: C.textLight, marginTop: 6, lineHeight: 1.4 }}>
                  💡 Laissez vide si non disponible — le protocole appliquera les réglages par défaut de votre profil.
                </div>
              )}
            </div>

            <div style={s.btnRow}>
              <button style={s.btnBack} onClick={() => setStep(1)}>← Retour</button>
              <button style={{ ...s.btnNext, width: 'auto', marginTop: 0, padding: '13px 24px' }} onClick={launchCalc}>
                Calculer mon Protocole →
              </button>
            </div>
          </div>
        )}

        {/* ═══════ LOADER ═══════ */}
        {loading && (
          <div style={{ textAlign: 'center', paddingTop: 56 }} className="slide" key="load">
            <div style={s.spinner} />
            <h2 style={{ fontFamily: "'Cabinet Grotesk'", fontSize: '1.25rem', color: C.primary, marginBottom: 8 }}>Analyse de votre profil...</h2>
            <p style={{ fontSize: '0.88rem', color: C.accent, fontWeight: 600 }}>{loadMsg}</p>
            <div style={{ marginTop: 32, padding: '12px 16px', background: C.primaryBg, borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 11, color: C.textMuted, lineHeight: 1.6, textAlign: 'left' }}>
              <strong style={{ color: C.primary }}>Ce qui se passe :</strong> Calcul via Mifflin-St Jeor (métabolisme) + Navy (composition corporelle) + recommandations Helms & Schoenfeld 2024 pour la préservation musculaire en déficit.
            </div>
          </div>
        )}

        {/* ═══════ STEP 3: RÉSULTATS ═══════ */}
        {step === 3 && diet && (
          <div className="slide" key="s3">
            <h1 style={s.h1}>Votre Protocole Personnalisé</h1>
            <p style={s.sub}>Deux sets de macros : entraînement vs repos. C'est le cyclage calorique.</p>

            {/* Projection */}
            <div style={{ background: C.primary, borderRadius: 14, padding: '16px 18px', color: 'white', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Projection à 10 semaines</div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>-{diet.projectedLoss.weight} kg</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Perte de gras</div>
                  </div>
                  {diet.projectedLoss.waist > 0 && <div>
                    <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>-{diet.projectedLoss.waist} cm</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Tour de taille</div>
                  </div>}
                  {diet.bodyFatEstimate !== null && <div>
                    <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{diet.bodyFatEstimate}%</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Masse grasse</div>
                  </div>}
                </div>
              </div>
              <div style={{ position: 'absolute', right: -16, bottom: -16, width: 80, height: 80, background: C.accent, opacity: 0.12, borderRadius: '50%', filter: 'blur(16px)' }} />
            </div>

            {/* TDEE / Deficit / Protein per kg */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[
                { l: 'TDEE', v: String(diet.tdee), u: 'kcal/j', bg: C.primaryBg, c: C.primary },
                { l: 'Déficit', v: `${diet.deficitPercent}%`, u: 'adaptatif', bg: C.accentBg, c: C.accentDark },
                { l: 'Protéines', v: (diet.rest.protein / diet.biometrics.weight).toFixed(1), u: 'g/kg', bg: '#EFF6FF', c: C.blue },
              ].map(b => (
                <div key={b.l} style={{ flex: 1, background: b.bg, padding: '10px 10px', borderRadius: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: b.c, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{b.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: b.c }}>{b.v}</div>
                  <div style={{ fontSize: 9, color: b.c, opacity: 0.7 }}>{b.u}</div>
                </div>
              ))}
            </div>

            {/* Dual macro cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { label: '🔥 Training', data: diet.training, borderColor: C.accent, badgeBg: C.accent },
                { label: '😴 Repos', data: diet.rest, borderColor: C.border, badgeBg: C.textLight },
              ].map(col => (
                <div key={col.label} style={{ background: C.surface, border: `2px solid ${col.borderColor}`, borderRadius: 12, padding: '14px 12px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -9, left: 12, background: col.badgeBg, color: 'white', fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {col.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.primary, marginTop: 4, marginBottom: 8 }}>
                    {col.data.calories} <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>kcal</span>
                  </div>
                  {[
                    { l: 'Prot', v: col.data.protein, c: C.accent },
                    { l: 'Gluc', v: col.data.carbs, c: C.orange },
                    { l: 'Lip', v: col.data.fats, c: C.red },
                  ].map(m => (
                    <div key={m.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.textLight, textTransform: 'uppercase', width: 30 }}>{m.l}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: m.c }}>{m.v}g</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Profile note */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '11px 13px', borderRadius: 10, fontSize: '0.8rem', color: C.primary, marginBottom: 12, display: 'flex', gap: 8, lineHeight: 1.5 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{diet.healthProfile === 'prediabetes' ? '🩸' : diet.healthProfile === 'cholesterol' ? '❤️' : '⚡'}</span>
              <span>{profileNote()}</span>
            </div>

            {/* Science box */}
            <div style={{ background: C.primaryBg, border: `1px solid ${C.border}`, padding: '10px 13px', borderRadius: 10, fontSize: '0.72rem', color: C.textMuted, marginBottom: 20, lineHeight: 1.6 }}>
              <strong style={{ color: C.primary }}>Base scientifique :</strong> Protéines {(diet.rest.protein / diet.biometrics.weight).toFixed(1)}g/kg (Helms 2014, Morton 2018). Déficit {diet.deficitPercent}% TDEE.
              {diet.bodyFatEstimate !== null && <> BF estimé {diet.bodyFatEstimate}% (Navy/Hodgdon).</>}
              {' '}Cyclage : +{diet.training.calories - diet.rest.calories} kcal training (glucides).
            </div>

            {/* CTA */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: 13, borderRadius: 50, fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', background: C.surface, color: C.textMuted, border: `2px solid ${C.border}` }}>
                Modifier
              </button>
              <button onClick={saveAndStart} disabled={saving} style={{ flex: 2, padding: 13, borderRadius: 50, fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', border: 'none', background: C.accent, color: 'white', boxShadow: '0 8px 24px -4px rgba(0,184,148,0.3)' }}>
                {saving ? 'Sauvegarde...' : "Démarrer le Protocole 🚀"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupDiet;