import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

// ─── COLORS ─────────────────────────────────────────────
const C = {
  primary: '#0F2C59', accent: '#00B894', accentDark: '#008E72', accentBg: '#E0F2F1',
  bg: '#F8FAFC', surface: '#FFF', text: '#1E293B', textMuted: '#64748B', textLight: '#94A3B8',
  border: '#E2E8F0', borderLight: '#F1F5F9',
  orange: '#F59E0B', red: '#EF4444', blue: '#3B82F6', indigo: '#6366F1', purple: '#7C3AED',
};

// ─── WORKOUT DB ─────────────────────────────────────────
// Rotation-based: cycles through PUSH→PULL→LEGS based on session count
const WORKOUTS = [
  { type: 'PUSH', title: 'Pecs / Épaules / Triceps', exs: [
    { n: 'Développé Couché', s: '3×6-8' }, { n: 'Développé Militaire', s: '3×8-10' },
    { n: 'Dips ou Pompes', s: '3×Max' }, { n: 'Élévations Latérales', s: '3×12-15' },
    { n: 'Extensions Triceps', s: '3×10-12' },
  ]},
  { type: 'PULL', title: 'Dos / Biceps / Arrière Épaules', exs: [
    { n: 'Tractions', s: '3×Max' }, { n: 'Rowing Barre', s: '3×8-10' },
    { n: 'Tirage Horizontal', s: '3×10-12' }, { n: 'Oiseau (Haltères)', s: '3×12-15' },
    { n: 'Curl Biceps', s: '3×10-12' },
  ]},
  { type: 'LEGS', title: 'Jambes / Abdos', exs: [
    { n: 'Squat (ou Goblet)', s: '3×8-10' }, { n: 'Fentes Marchées', s: '3×10/jambe' },
    { n: 'Leg Curl (ou Glute Bridge)', s: '3×12' }, { n: 'Mollets Debout', s: '4×15' },
    { n: 'Gainage', s: '3×45sec' },
  ]},
];

// McGill Big 3 — daily spinal stability
const MCGILL = [
  { n: 'Curl-Up modifié', s: '3×10sec' },
  { n: 'Side Plank', s: '3×10sec/côté' },
  { n: 'Bird Dog', s: '3×10sec/côté' },
];

// ─── MEAL TEMPLATES ─────────────────────────────────────
// {p}=protein raw g, {pc}=protein cooked, {c}=carb raw g, {cc}=carb cooked
const MW: Record<number, string[]> = {
  1: [
    '{p}g Poulet grillé ({pc}g cuit) + {c}g Riz ({cc}g cuit) + Brocolis + Huile Olive',
    '{p}g Saumon ({pc}g cuit) + {c}g Riz ({cc}g cuit) + Épinards',
    '{p}g Viande Hachée 5% ({pc}g cuit) + {c}g Pâtes ({cc}g cuit) + Poivrons',
    '{p}g Dorade ({pc}g cuit) + {c}g Riz ({cc}g cuit) + Haricots Verts',
    '{p}g Poulet ({pc}g cuit) + {c}g Pâtes ({cc}g cuit) + Brocoli + Parmesan',
    'Sardines (boîte) + {c}g Riz ({cc}g cuit) + Épinards',
  ],
  2: [
    '40g Whey + 2 Tr. Pain Complet + 15g Beurre Cacahuète + Framboises',
    '40g Whey + {ch}g Riz Cuit + 100g Poulet + Framboises',
    '40g Whey + 2 Tr. Pain Complet + 15g Beurre Cacahuète + 1 Banane',
    '40g Whey + {ch}g Pâtes Cuites + Thon en conserve + Framboises',
    '40g Whey + 2 Tr. Pain Complet + 2 Oeufs Brouillés + Fruits',
    '40g Whey + {ch}g Riz Cuit + 2 Tr. Saumon Fumé',
  ],
  3: [
    '{p3}g Poulet Rôti ({p3c}g cuit) + Haricots Verts + Huile Olive',
    '{p3}g Saumon ({p3c}g cuit) + Brocoli + {cl}g Riz Cuit',
    '{p3}g Viande Hachée ({p3c}g cuit) + Courgettes/Poivrons',
    '{p3}g Dorade ({p3c}g cuit) + Épinards Ail + Huile',
    '{p3}g Brochettes Poulet ({p3c}g cuit) + Poivrons + Tzatziki',
    'Sardines Grillées + Salade + Huile Olive',
  ],
};
const MWE: Record<number, string[]> = {
  1: ['Grand Brunch : 3 Oeufs, 1/2 Avocat, Saumon fumé, Pain Complet'],
  2: ['Smoothie Whey, Fruits rouges, Amandes'],
  3: ['Repas Libre (Burger ou Pizza maison + Salade)'],
};

const TIPS = [
  '🔬 Fibres avant glucides = -30% pic glycémie (étude Jenkins).',
  '🌿 Cannelle (1g/j) améliore la sensibilité insuline de 18%.',
  '🫒 2 c.s. d\'huile d\'olive/jour réduisent le LDL oxydé.',
  '🚶 10min de marche post-repas lisse la glycémie de 22%.',
  '🥩 30g+ de protéines au 1er repas = satiété prolongée 4h.',
  '💤 7h de sommeil minimum — la leptine chute de 15% sinon.',
  '🧊 Douche froide 2min = boost noradrénaline +530% (Šrámek 2000).',
];

// ─── TYPES ──────────────────────────────────────────────
interface DayData {
  training: boolean;
  meals: Record<number, { validated: boolean; variantIndex: number }>;
  stacks: Record<string, boolean>;
  water: number;
  workoutIndex: number; // Tracks rotation
}

const DEFAULT_DAY: DayData = {
  training: false,
  meals: { 1: { validated: false, variantIndex: 0 }, 2: { validated: false, variantIndex: 0 }, 3: { validated: false, variantIndex: 0 } },
  stacks: { d3: false, vitc: false, creatine: false, mcgill: false, workout: false, omega3: false, magnesium: false },
  water: 0,
  workoutIndex: 0,
};

// ─── SUB-COMPONENTS ─────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: C.surface, borderRadius: 12, padding: 14, border: `1px solid ${C.borderLight}`, boxShadow: '0 2px 10px -2px rgba(15,44,89,0.04)', ...style }}>{children}</div>
);

const TBlock: React.FC<{ dot: string; glow?: boolean; label: string; time: string; children: React.ReactNode }> = ({ dot, glow, label, time, children }) => (
  <div style={{ paddingLeft: 22, position: 'relative', paddingBottom: 24 }}>
    <div style={{ width: 14, height: 14, borderRadius: '50%', background: dot, border: `2px solid ${C.bg}`, position: 'absolute', left: -8, top: 1, ...(glow ? { boxShadow: `0 0 8px ${dot}50` } : {}) }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontFamily: "'Cabinet Grotesk'", fontWeight: 700, color: C.primary, fontSize: 14 }}>{label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: C.textLight, background: C.bg, padding: '2px 7px', borderRadius: 5, border: `1px solid ${C.borderLight}` }}>{time}</span>
    </div>
    {children}
  </div>
);

// ─── MAIN COMPONENT ─────────────────────────────────────
export const Journal: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [date, setDate] = useState(new Date());
  const [day, setDay] = useState<DayData>(JSON.parse(JSON.stringify(DEFAULT_DAY)));
  const [modal, setModal] = useState(false);
  const [flash, setFlash] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile — use training/rest from new SetupDiet
  const diet = userProfile?.dietProfile;
  const isT = day.training;
  const isFri = date.getDay() === 5;
  const isWE = date.getDay() === 0 || date.getDay() === 6;

  // Use the actual training/rest macros if available, fallback to old format
  const macros = isT
    ? (diet?.training || { calories: Math.round((diet?.targetCalories || 2300) * 1.15), protein: diet?.macros?.protein || 180, carbs: Math.round((diet?.macros?.carbs || 200) * 1.3), fats: diet?.macros?.fats || 60 })
    : (diet?.rest || { calories: diet?.targetCalories || 2300, protein: diet?.macros?.protein || 180, carbs: diet?.macros?.carbs || 200, fats: diet?.macros?.fats || 60 });

  // Smarter protein distribution:
  // Meal 2 (whey snack) has ~35g protein fixed → distribute rest between meal 1 & 3
  const meal2ProtFixed = 35;
  const protForMainMeals = macros.protein - meal2ProtFixed;
  const meal1Prot = Math.round(protForMainMeals * 0.55); // Slightly more at lunch (breaking fast)
  const meal3Prot = protForMainMeals - meal1Prot;
  const carbsPerMeal = Math.round(macros.carbs / 3);

  const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtDate = (d: Date) => { const o = d.getTimezoneOffset(); return new Date(d.getTime() - o * 60000).toISOString().split('T')[0]; };

  // Workout rotation (not weekday-based)
  const wo = WORKOUTS[day.workoutIndex % 3];

  // Compliance score
  const vCount = Object.values(day.meals).filter((m: any) => m.validated).length;
  const stacksDone = Object.entries(day.stacks).filter(([k, v]) => v && k !== 'workout').length;
  const stacksTotal = Object.keys(day.stacks).filter(k => k !== 'workout').length;
  const mealScore = isFri ? (vCount >= 2 ? 3 : vCount) : vCount; // Friday: 2 validated = full meal score
  const compliancePct = Math.round(((mealScore / 3) * 0.5 + (stacksDone / stacksTotal) * 0.25 + (day.stacks.workout ? 0.15 : 0) + (day.water >= 2500 ? 0.10 : (day.water / 2500) * 0.10)) * 100);
  const calPct = Math.round((vCount / 3) * 100);

  // ─── DATA LOAD/SAVE ─────────────────────────────────────
  useEffect(() => { loadDay(); }, [date, user]);

  const loadDay = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'users', user.uid, 'journal', fmtDate(date)));
      if (snap.exists()) {
        const r = snap.data() as Partial<DayData>;
        setDay({
          training: r.training ?? false,
          meals: { 1: { ...DEFAULT_DAY.meals[1], ...(r.meals?.[1] || {}) }, 2: { ...DEFAULT_DAY.meals[2], ...(r.meals?.[2] || {}) }, 3: { ...DEFAULT_DAY.meals[3], ...(r.meals?.[3] || {}) } },
          stacks: { ...DEFAULT_DAY.stacks, ...(r.stacks || {}) },
          water: r.water || 0,
          workoutIndex: r.workoutIndex ?? 0,
        });
      } else {
        // Auto-calculate workout index from past sessions
        setDay(JSON.parse(JSON.stringify(DEFAULT_DAY)));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const persist = useCallback(async (updated: DayData) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'journal', fmtDate(date)), updated, { merge: true });
      setFlash(true); setTimeout(() => setFlash(false), 1500);
    } catch (e) { console.error(e); }
  }, [date, user]);

  const update = (fn: (d: DayData) => DayData) => { const n = fn(day); setDay(n); persist(n); };
  const toggleStack = (id: string) => update(d => ({ ...d, stacks: { ...d.stacks, [id]: !d.stacks[id] } }));
  const validateMeal = (id: number) => update(d => ({ ...d, meals: { ...d.meals, [id]: { ...d.meals[id], validated: !d.meals[id].validated } } }));
  const nextVariant = (id: number) => { const mdb = isWE ? MWE : MW; update(d => ({ ...d, meals: { ...d.meals, [id]: { ...d.meals[id], variantIndex: (d.meals[id].variantIndex + 1) % mdb[id].length } } })); };
  const addWater = () => update(d => ({ ...d, water: (d.water || 0) + 250 }));
  const changeDate = (delta: number) => { const d = new Date(date); d.setDate(d.getDate() + delta); setDate(d); };

  // Build meal text with correct protein distribution
  const mealText = (mealId: number) => {
    const mdb = isWE ? MWE : MW;
    const idx = day.meals[mealId].variantIndex % mdb[mealId].length;
    const raw = mdb[mealId][idx];

    if (mealId === 1) {
      const pRaw = Math.round(meal1Prot / 0.22);
      return raw.replace(/{p}/g, String(pRaw)).replace(/{pc}/g, String(Math.round(pRaw * 0.75)))
        .replace(/{c}/g, String(carbsPerMeal)).replace(/{cc}/g, String(Math.round(carbsPerMeal * 3)));
    }
    if (mealId === 2) {
      return raw.replace(/{ch}/g, String(Math.round(carbsPerMeal * 3)));
    }
    // Meal 3
    const p3Raw = Math.round(meal3Prot / 0.22);
    return raw.replace(/{p3}/g, String(p3Raw)).replace(/{p3c}/g, String(Math.round(p3Raw * 0.75)))
      .replace(/{p}/g, String(p3Raw)).replace(/{pc}/g, String(Math.round(p3Raw * 0.75)))
      .replace(/{c}/g, String(carbsPerMeal)).replace(/{cc}/g, String(Math.round(carbsPerMeal * 3)))
      .replace(/{cl}/g, String(Math.round(carbsPerMeal * 1.5)));
  };

  const tip = TIPS[date.getDate() % TIPS.length];

  // ─── LOADING STATE ──────────────────────────────────────
  if (loading) return (
    <div style={{ fontFamily: "'DM Sans'", background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.primary}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
        <p style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>Chargement...</p>
      </div>
    </div>
  );

  // ─── RENDER ─────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: C.bg, minHeight: '100vh', paddingBottom: 90, color: C.text }}>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,500,700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
      `}</style>

      {/* HEADER */}
      <header style={{ background: C.surface, padding: '32px 20px 12px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => changeDate(-1)} style={{ padding: 6, background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 15 }}>◀</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: 1.5 }}>Protocole 16/8</div>
          <h1 style={{ fontFamily: "'Cabinet Grotesk'", fontSize: '1.1rem', fontWeight: 700, color: C.primary }}>{dateStr}</h1>
        </div>
        <button onClick={() => changeDate(1)} style={{ padding: 6, background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 15 }}>▶</button>
        {flash && <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, fontWeight: 700, color: 'white', background: C.accent, padding: '3px 8px', borderRadius: 4, zIndex: 25 }}>✓ Sauvegardé</div>}
      </header>

      <main style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* MODE + COMPLIANCE */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 13, color: C.primary }}>Mode du Jour</span>
              <div style={{ fontSize: 11, color: C.textLight, marginTop: 1 }}>
                {isT ? `${macros.calories} kcal — Training` : `${macros.calories} kcal — Repos`}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Compliance badge */}
              <div style={{ background: compliancePct >= 80 ? C.accentBg : compliancePct >= 50 ? '#FFF7ED' : C.bg, padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: compliancePct >= 80 ? C.accentDark : compliancePct >= 50 ? C.orange : C.textMuted }}>
                {compliancePct}%
              </div>
              {/* Toggle */}
              <div onClick={() => update(d => ({ ...d, training: !d.training }))} style={{ width: 44, height: 22, borderRadius: 11, background: isT ? C.accent : '#CBD5E1', position: 'relative', cursor: 'pointer', transition: '0.3s' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: isT ? 24 : 2, transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: 6, borderRadius: 6, fontSize: 12, fontWeight: 700, color: isT ? C.accentDark : C.textMuted, background: isT ? C.accentBg : C.bg, marginBottom: 10 }}>
            {isT ? '🔥 Jour d\'Entraînement' : '😴 Jour de Repos'}
          </div>

          {/* Macro bars */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, marginBottom: 3 }}>
            <span style={{ color: C.textLight }}>CALORIES</span>
            <span style={{ color: C.primary }}>{Math.round(macros.calories * (vCount / 3))} / {macros.calories} kcal</span>
          </div>
          <div style={{ width: '100%', height: 7, background: C.bg, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', background: C.primary, borderRadius: 4, width: `${calPct}%`, transition: 'width 0.4s' }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { l: 'PROT', v: `${macros.protein}g`, c: C.accent },
              { l: 'GLUC', v: `${macros.carbs}g`, c: C.orange },
              { l: 'LIP', v: `${macros.fats}g`, c: C.red },
            ].map(m => (
              <div key={m.l} style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontWeight: 700, marginBottom: 2 }}>
                  <span style={{ color: C.textLight }}>{m.l}</span><span style={{ color: m.c }}>{m.v}</span>
                </div>
                <div style={{ width: '100%', height: 4, background: C.bg, borderRadius: 2 }}>
                  <div style={{ height: '100%', background: m.c, borderRadius: 2, width: `${calPct}%`, transition: 'width 0.4s' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* IF WINDOW */}
        <div style={{ background: C.primary, borderRadius: 10, padding: '12px 14px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Fenêtre 16/8</div>
            <div style={{ fontFamily: "'Cabinet Grotesk'", fontSize: '1.15rem', fontWeight: 700 }}>12h00 <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>→</span> 20h30</div>
          </div>
          <span style={{ fontSize: 22, opacity: 0.3 }}>⏳</span>
        </div>

        {/* WATER */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 13, color: C.primary }}>💧 Hydratation</span>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{((day.water || 0) / 1000).toFixed(1)}L / 3.0L</div>
            </div>
            <button onClick={addWater} style={{ padding: '6px 12px', background: C.blue, color: 'white', borderRadius: 7, border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>+ 250ml</button>
          </div>
          <div style={{ width: '100%', height: 4, background: C.bg, borderRadius: 2, marginTop: 6 }}>
            <div style={{ height: '100%', background: C.blue, borderRadius: 2, width: `${Math.min(((day.water || 0) / 3000) * 100, 100)}%`, transition: 'width 0.3s' }} />
          </div>
        </Card>

        {/* TIP */}
        <div style={{ background: '#F0FDF4', padding: '8px 10px', borderRadius: 7, borderLeft: `3px solid ${C.accent}`, fontSize: 11, color: C.accentDark, fontStyle: 'italic', lineHeight: 1.5 }}>{tip}</div>

        {/* ═══ TIMELINE ═══ */}
        <div style={{ position: 'relative', borderLeft: `2px solid ${C.border}`, marginLeft: 10, paddingTop: 6 }}>

          {/* MATIN (Jeûne) */}
          <TBlock dot="#CBD5E1" label="Matin (Jeûne)" time="~07h30">
            <Card>
              {[{ id: 'd3', l: 'Vitamine D3', d: '5000 UI' }, { id: 'vitc', l: 'Vitamine C', d: '1000 mg' }].map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
                  <input type="checkbox" checked={day.stacks[s.id]} onChange={() => toggleStack(s.id)} style={{ width: 16, height: 16, accentColor: C.accent }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{s.l} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: 11 }}>{s.d}</span></span>
                </label>
              ))}
              {/* McGill Big 3 */}
              <div style={{ borderTop: `1px solid ${C.borderLight}`, marginTop: 8, paddingTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={day.stacks.mcgill} onChange={() => toggleStack('mcgill')} style={{ width: 16, height: 16, accentColor: C.accent }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>McGill Big 3 <span style={{ fontWeight: 400, color: C.textMuted, fontSize: 11 }}>Stabilité spinale</span></span>
                </label>
                {!day.stacks.mcgill && (
                  <div style={{ marginTop: 6, paddingLeft: 24, fontSize: 10, color: C.textLight }}>
                    {MCGILL.map((e, i) => <div key={i}>{e.n} — {e.s}</div>)}
                  </div>
                )}
              </div>
            </Card>
          </TBlock>

          {/* REPAS 1 */}
          <TBlock dot={C.accent} glow label="Repas 1 — Rupture du Jeûne" time="12h00">
            <MealCardV2 id={1} text={mealText(1)} validated={day.meals[1].validated} onValidate={() => validateMeal(1)} onVariant={() => nextVariant(1)} />
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.borderLight}` }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={day.stacks.creatine} onChange={() => toggleStack('creatine')} style={{ width: 14, height: 14, accentColor: C.accent }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>Créatine <span style={{ fontWeight: 400, color: C.textMuted, fontSize: 11 }}>5g</span></span>
              </label>
            </div>
          </TBlock>

          {/* TRAINING */}
          {isT && (
            <TBlock dot={C.blue} label="Training" time="14h–15h30">
              <Card style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: C.blue, background: 'white', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>{wo.type}</span>
                    <h3 style={{ fontWeight: 700, color: '#1E3A8A', fontSize: 13, marginTop: 3 }}>{wo.title}</h3>
                  </div>
                  {day.stacks.workout && <span style={{ fontSize: 9, fontWeight: 700, background: '#D1FAE5', color: '#065F46', padding: '2px 7px', borderRadius: 20 }}>✅ FAIT</span>}
                </div>
                <button onClick={() => setModal(true)} style={{ width: '100%', padding: 10, background: 'white', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 700, fontSize: 13, borderRadius: 8, cursor: 'pointer' }}>
                  🏋️ Voir la séance
                </button>
              </Card>
            </TBlock>
          )}

          {/* REPAS 2 */}
          <TBlock dot={C.accent} label="Repas 2 — Post-Training" time="16h00">
            <MealCardV2 id={2} text={mealText(2)} validated={day.meals[2].validated} onValidate={() => validateMeal(2)} onVariant={() => nextVariant(2)} />
          </TBlock>

          {/* REPAS 3 / VENDREDI */}
          <TBlock dot={C.accent} label={isFri ? 'Repas 3 — Vendredi Détente' : 'Repas 3 — Dîner Volume'} time="20h00">
            {isFri ? (
              <Card style={{ background: '#FAF5FF', borderColor: '#E9D5FF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: C.purple, fontSize: 13 }}>🍔 Vendredi Détente</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>Viande grillée + Frites maison + Profite !</div>
                  </div>
                  <button onClick={() => validateMeal(3)} style={{ fontSize: 10, fontWeight: 700, color: day.meals[3].validated ? C.purple : 'white', background: day.meals[3].validated ? 'white' : C.purple, padding: '5px 10px', borderRadius: 6, border: day.meals[3].validated ? `1px solid ${C.purple}` : 'none', cursor: 'pointer' }}>
                    {day.meals[3].validated ? '✓ Fait' : 'Valider'}
                  </button>
                </div>
              </Card>
            ) : (
              <>
                <MealCardV2 id={3} text={mealText(3)} validated={day.meals[3].validated} onValidate={() => validateMeal(3)} onVariant={() => nextVariant(3)} />
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: `1px solid ${C.borderLight}` }}>
                  <span style={{ fontSize: 16 }}>🍨</span>
                  <div style={{ fontSize: 11 }}>
                    <div style={{ fontWeight: 700, color: C.primary }}>Dessert (20h30)</div>
                    <div style={{ color: C.textMuted }}>Skyr 200g + Miel 20g + Framboises 50g</div>
                  </div>
                </div>
              </>
            )}
          </TBlock>

          {/* STACK SOIR */}
          <TBlock dot={C.indigo} label="Stack Soir" time="22h00">
            <Card>
              {[{ id: 'omega3', l: 'Oméga-3', d: '3-4g' }, { id: 'magnesium', l: 'Magnésium', d: '400mg' }].map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
                  <input type="checkbox" checked={day.stacks[s.id]} onChange={() => toggleStack(s.id)} style={{ width: 16, height: 16, accentColor: C.accent }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{s.l} <span style={{ fontWeight: 400, color: C.textMuted, fontSize: 11 }}>{s.d}</span></span>
                </label>
              ))}
            </Card>
          </TBlock>
        </div>
      </main>

      {/* WORKOUT MODAL */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,44,89,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={() => setModal(false)}>
          <div style={{ background: 'white', width: '92%', maxWidth: 480, maxHeight: '85vh', borderRadius: 14, overflowY: 'auto', padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.blue, background: '#EFF6FF', padding: '3px 7px', borderRadius: 4, textTransform: 'uppercase' }}>{wo.type}</span>
                <h2 style={{ fontFamily: "'Cabinet Grotesk'", fontSize: '1.3rem', fontWeight: 700, color: C.primary, marginTop: 4 }}>{wo.title}</h2>
              </div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: C.textMuted, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {wo.exs.map((ex, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: C.bg, borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
                  <div><div style={{ fontWeight: 700, fontSize: 13 }}>{ex.n}</div><div style={{ fontSize: 11, color: C.textMuted }}>{ex.s}</div></div>
                  <a href={`https://www.youtube.com/results?search_query=technique+${ex.n.replace(/ /g, '+')}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 10, background: 'white', border: `1px solid ${C.border}`, padding: '3px 7px', borderRadius: 5, color: C.red, fontWeight: 700, textDecoration: 'none' }}>🎥</a>
                </div>
              ))}
            </div>
            <button onClick={() => { toggleStack('workout'); setModal(false); }}
              style={{ width: '100%', padding: 13, background: C.primary, color: 'white', fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14 }}>
              ✅ Terminer & Valider
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav style={{ position: 'fixed', bottom: 0, width: '100%', background: C.surface, borderTop: `1px solid ${C.borderLight}`, padding: '8px 24px 20px', display: 'flex', justifyContent: 'space-around', zIndex: 30, boxShadow: '0 -2px 12px rgba(0,0,0,0.03)' }}>
        {[
          { to: '/dashboard', icon: '🏠', label: 'Suivi', active: false },
          { to: '/journal', icon: '📖', label: 'Journal', active: true },
          { to: '/profile', icon: '👤', label: 'Profil', active: false },
        ].map(item => (
          <Link key={item.to} to={item.to} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: 8, textDecoration: 'none', color: item.active ? C.accent : '#CBD5E1' }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700 }}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

// ─── MEAL CARD V2 ───────────────────────────────────────
const MealCardV2: React.FC<{ id: number; text: string; validated: boolean; onValidate: () => void; onVariant: () => void }> = ({ id, text, validated, onValidate, onVariant }) => (
  <div style={{ background: validated ? '#F0FDF4' : C.surface, borderRadius: 10, padding: 12, borderLeft: `3px solid ${C.accent}`, border: `1px solid ${validated ? C.accent : C.borderLight}`, borderLeftWidth: 3, transition: 'all 0.3s' }}>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5, marginBottom: 6 }}>
      <button onClick={onVariant} style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, background: C.bg, padding: '3px 7px', borderRadius: 5, border: `1px solid ${C.border}`, cursor: 'pointer' }}>🔄</button>
      <button onClick={onValidate} style={{ fontSize: 9, fontWeight: 700, color: validated ? C.accentDark : 'white', background: validated ? 'white' : C.primary, padding: '3px 9px', borderRadius: 5, border: validated ? `1px solid ${C.accent}` : 'none', cursor: 'pointer' }}>
        {validated ? '✓ Fait' : 'Valider'}
      </button>
    </div>
    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.55, fontWeight: 500 }}>{text}</div>
  </div>
);

export default Journal;