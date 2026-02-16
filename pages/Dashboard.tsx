import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { UserProfile } from '../types';

// ─── COLORS ─────────────────────────────────────────────
const C = {
  primary: '#0F2C59', primaryLight: '#163A70', primaryBg: '#F0F4F8',
  accent: '#00B894', accentDark: '#008E72', accentBg: '#E0F2F1',
  bg: '#F8FAFC', surface: '#FFFFFF', text: '#1E293B',
  textMuted: '#64748B', textLight: '#94A3B8',
  border: '#E2E8F0', borderLight: '#F1F5F9',
  orange: '#F59E0B', red: '#EF4444', blue: '#3B82F6', purple: '#A855F7',
};

// ─── PHASES ─────────────────────────────────────────────
// Loss values are proportional multipliers (of projected total)
const PHASES: Record<number, { name: string; desc: string; lossPct: number }> = {
  1:  { name: 'Reset Métabolique', desc: 'Détox & Sensibilité Insuline', lossPct: 0.10 },
  2:  { name: 'Reset Métabolique', desc: 'Adaptation Métabolique', lossPct: 0.18 },
  3:  { name: 'Reset Métabolique', desc: 'Intensification', lossPct: 0.28 },
  4:  { name: 'Sèche Viscérale', desc: 'Accélération Déficit', lossPct: 0.40 },
  5:  { name: 'Sèche Viscérale', desc: 'Brûlage Viscéral', lossPct: 0.52 },
  6:  { name: 'Sèche Viscérale', desc: 'Optimisation', lossPct: 0.64 },
  7:  { name: 'Sèche Viscérale', desc: 'Pic de Sèche', lossPct: 0.76 },
  8:  { name: 'Définition', desc: 'Affinement', lossPct: 0.85 },
  9:  { name: 'Définition', desc: 'Dernière Ligne Droite', lossPct: 0.93 },
  10: { name: 'Maintien', desc: 'Sortie de Sèche', lossPct: 1.00 },
};

// Glycemia feedback (same logic as SetupDiet, in g/L)
function glucoseColor(val: number): string {
  if (val <= 0.99) return C.accent;
  if (val <= 1.25) return C.orange;
  return C.red;
}

// ─── COMPONENT ──────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const { user, userProfile: ctxProfile, refreshProfile } = useAuth();
  const timelineRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<UserProfile | null>(ctxProfile);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showTraining, setShowTraining] = useState(false); // Toggle for daily targets
  const [glucoseInput, setGlucoseInput] = useState('');
  const [poidsInput, setPoidsInput] = useState('');
  const [tailleInput, setTailleInput] = useState('');
  const [lipidesOpen, setLipidesOpen] = useState(false);
  const [lipides, setLipides] = useState({ total: '', ldl: '', hdl: '', triglycerides: '', date: '' });
  const [saving, setSaving] = useState('');
  const [flash, setFlash] = useState('');

  const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // ─── DATA LOADING ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setData(snap.data() as UserProfile);
      } catch (e) { console.error('[Dashboard] fetch error:', e); }
    })();
  }, [user]);

  useEffect(() => { if (ctxProfile) setData(ctxProfile); }, [ctxProfile]);

  // Week calculation
  useEffect(() => {
    if (data?.createdAt) {
      const diff = Math.ceil(Math.abs(Date.now() - new Date(data.createdAt).getTime()) / 864e5);
      let w = Math.max(1, Math.min(10, Math.ceil(diff / 7)));
      setCurrentWeek(w);
      if (selectedWeek === 1 && w !== 1) setSelectedWeek(w);
    }
  }, [data]);

  // Auto-scroll timeline
  useEffect(() => {
    if (timelineRef.current) {
      const node = timelineRef.current.children[currentWeek - 1] as HTMLElement;
      if (node) setTimeout(() => node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 300);
    }
  }, [currentWeek]);

  // ─── DERIVED DATA ───────────────────────────────────────
  const userName = data?.firstName || 'Athlète';
  const diet = data?.dietProfile;
  const pesees = data?.pesees || [];
  const tailles = data?.tourDeTaille || [];
  const initialWeight = data?.initialWeight || diet?.biometrics?.weight || 0;
  const initialWaist = data?.initialWaistline || diet?.biometrics?.waistline || 0;

  // Projected total loss from SetupDiet calculation
  const projectedTotalLoss = diet?.projectedLoss?.weight || 5;
  const phase = PHASES[selectedWeek] || PHASES[1];
  const phaseLossTarget = Math.round(projectedTotalLoss * phase.lossPct * 10) / 10;

  // Current weight & waist (last entry)
  const lastPesee = pesees.length > 0
    ? [...pesees].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;
  const lastTaille = tailles.length > 0
    ? [...tailles].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  const weightDelta = lastPesee ? Math.round((lastPesee.poids - initialWeight) * 10) / 10 : null;
  const waistDelta = lastTaille && initialWaist ? Math.round((lastTaille.value - initialWaist) * 10) / 10 : null;

  // Last glucose (in g/L)
  const glucoseReadings = data?.glucoseReadings || [];
  const lastGlucose = glucoseReadings.length > 0
    ? [...glucoseReadings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  // Training vs Rest macros
  const macrosToShow = showTraining ? diet?.training : (diet?.rest || { calories: diet?.targetCalories, protein: diet?.macros?.protein, carbs: diet?.macros?.carbs, fats: diet?.macros?.fats });
  const displayCal = macrosToShow?.calories || diet?.targetCalories || 0;
  const displayProt = macrosToShow?.protein || diet?.macros?.protein || 0;
  const displayCarbs = macrosToShow?.carbs || diet?.macros?.carbs || 0;
  const displayFats = macrosToShow?.fats || diet?.macros?.fats || 0;

  // ─── SAVE HANDLERS ──────────────────────────────────────
  const doFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(''), 2000); };

  const saveGlucose = async () => {
    if (!glucoseInput || !user) return;
    setSaving('glucose');
    try {
      const entry = { date: new Date().toISOString(), value: parseFloat(glucoseInput) };
      await updateDoc(doc(db, 'users', user.uid), { glucoseReadings: arrayUnion(entry) });
      setData(prev => prev ? { ...prev, glucoseReadings: [...(prev.glucoseReadings || []), entry] } : null);
      setGlucoseInput('');
      doFlash('Glycémie enregistrée');
      refreshProfile();
    } catch (e) { alert('Erreur sauvegarde'); }
    finally { setSaving(''); }
  };

  const savePoids = async () => {
    if (!poidsInput || !user) return;
    setSaving('poids');
    try {
      const entry = { date: new Date().toISOString(), poids: parseFloat(poidsInput) };
      await updateDoc(doc(db, 'users', user.uid), { pesees: arrayUnion(entry) });
      setData(prev => prev ? { ...prev, pesees: [...(prev.pesees || []), entry] } : null);
      setPoidsInput('');
      doFlash('Poids enregistré');
      refreshProfile();
    } catch (e) { alert('Erreur sauvegarde'); }
    finally { setSaving(''); }
  };

  const saveTaille = async () => {
    if (!tailleInput || !user) return;
    setSaving('taille');
    try {
      const entry = { date: new Date().toISOString(), value: parseFloat(tailleInput) };
      await updateDoc(doc(db, 'users', user.uid), { tourDeTaille: arrayUnion(entry) });
      setData(prev => prev ? { ...prev, tourDeTaille: [...(prev.tourDeTaille || []), entry] } : null);
      setTailleInput('');
      doFlash('Tour de taille enregistré');
      refreshProfile();
    } catch (e) { alert('Erreur sauvegarde'); }
    finally { setSaving(''); }
  };

  const saveLipides = async () => {
    if (!user) return;
    setSaving('lipides');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        lipidesReadings: arrayUnion({
          dateAnalyse: lipides.date || new Date().toISOString().split('T')[0],
          total: parseInt(lipides.total) || 0,
          ldl: parseInt(lipides.ldl) || 0,
          hdl: parseInt(lipides.hdl) || 0,
          triglycerides: parseInt(lipides.triglycerides) || 0,
        })
      });
      setLipides({ total: '', ldl: '', hdl: '', triglycerides: '', date: '' });
      doFlash('Analyse lipides enregistrée');
      refreshProfile();
    } catch (e) { alert('Erreur sauvegarde'); }
    finally { setSaving(''); }
  };

  // ─── WEIGHT CHART ───────────────────────────────────────
  const renderWeightChart = () => {
    const sorted = [...pesees].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // Include initial weight as first point if no pesees match it
    const allVals = initialWeight && (sorted.length === 0 || sorted[0].poids !== initialWeight)
      ? [{ date: data?.createdAt || '', poids: initialWeight }, ...sorted]
      : sorted;

    if (allVals.length < 2) return (
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, fontSize: 12 }}>
        Ajoutez votre premier poids pour voir la courbe
      </div>
    );

    const vals = allVals.map(p => p.poids);
    const goalWeight = initialWeight - projectedTotalLoss;
    const allNums = [...vals, goalWeight];
    const min = Math.min(...allNums) - 1;
    const max = Math.max(...allNums) + 1;
    const w = 300, h = 110, pad = 24;

    const toX = (i: number) => pad + (i / (vals.length - 1)) * (w - pad * 2);
    const toY = (v: number) => pad + ((max - v) / (max - min)) * (h - pad * 2);

    const points = vals.map((v, i) => ({ x: toX(i), y: toY(v) }));
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;
    const goalY = toY(goalWeight);

    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 120 }}>
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.accent} stopOpacity="0.15" />
            <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Goal line */}
        <line x1={pad} y1={goalY} x2={w - pad} y2={goalY} stroke={C.accent} strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
        <text x={w - pad + 4} y={goalY + 3} fontSize="7" fill={C.accent} fontWeight="700">Obj: {goalWeight.toFixed(1)}</text>
        {/* Area + line */}
        <path d={areaD} fill="url(#wg)" />
        <path d={pathD} fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 3} fill={C.surface} stroke={C.accent} strokeWidth="2" />
            {(i === 0 || i === points.length - 1) && (
              <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="8" fill={C.primary} fontWeight="700">{vals[i]}</text>
            )}
          </g>
        ))}
      </svg>
    );
  };

  // ─── CARD COMPONENT ─────────────────────────────────────
  const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <section style={{ background: C.surface, borderRadius: 14, padding: 18, border: `1px solid ${C.borderLight}`, boxShadow: '0 2px 12px -2px rgba(15,44,89,0.04)', ...style }}>
      {children}
    </section>
  );

  const SectionTitle: React.FC<{ icon: string; iconBg: string; iconColor: string; children: React.ReactNode; right?: React.ReactNode }> = ({ icon, iconBg, iconColor, children, right }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <h3 style={{ fontFamily: "'Cabinet Grotesk'", fontWeight: 700, fontSize: '1.05rem', color: C.primary, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ background: iconBg, color: iconColor, padding: 4, borderRadius: 6, fontSize: 13, lineHeight: 1 }}>{icon}</span>
        {children}
      </h3>
      {right}
    </div>
  );

  // ─── RENDER ─────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: C.bg, minHeight: '100vh', paddingBottom: 90, color: C.text }}>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,500,700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
        .tl-scroll{overflow-x:auto;display:flex;gap:10px;padding:12px 20px;background:white;border-bottom:1px solid ${C.border};scrollbar-width:none}
        .tl-scroll::-webkit-scrollbar{display:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp 0.35s ease-out}
      `}</style>

      {/* FLASH */}
      {flash && (
        <div style={{ position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', background: C.accent, color: 'white', padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, zIndex: 50, boxShadow: '0 4px 12px rgba(0,184,148,0.3)' }}>
          ✓ {flash}
        </div>
      )}

      {/* HEADER */}
      <header style={{ background: C.surface, padding: '40px 20px 10px', borderBottom: `1px solid ${C.borderLight}`, position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 }}>Tableau de bord</div>
            <h1 style={{ fontFamily: "'Cabinet Grotesk'", fontSize: '1.5rem', fontWeight: 800, color: C.primary, lineHeight: 1.1 }}>
              Bonjour, {userName}
            </h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 11, color: C.textMuted, background: C.bg, padding: '3px 8px', borderRadius: 6 }}>{dateStr}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.accent }}>Semaine {currentWeek}/10</span>
          </div>
        </div>
      </header>

      {/* TIMELINE */}
      <div className="tl-scroll" ref={timelineRef}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(w => {
          const done = w < currentWeek;
          const cur = w === currentWeek;
          const sel = w === selectedWeek;
          return (
            <div key={w} onClick={() => setSelectedWeek(w)}
              style={{ minWidth: 54, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: done || cur ? 1 : 0.4, cursor: 'pointer', transition: '0.2s', transform: sel ? 'scale(1.05)' : '' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 13, marginBottom: 3,
                background: cur ? C.primary : done ? C.accentBg : 'white',
                border: `2px solid ${cur ? C.primary : done ? C.accent : C.border}`,
                color: cur ? 'white' : done ? C.accent : C.textMuted,
                boxShadow: cur ? '0 3px 10px rgba(15,44,89,0.25)' : 'none',
              }}>
                {done ? '✓' : w}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: cur ? C.primary : C.textLight }}>S{w}</span>
            </div>
          );
        })}
      </div>

      {/* WEEK FOCUS */}
      <div style={{ padding: '14px 16px 0' }} className="fu">
        <div style={{ background: C.primary, borderRadius: 14, padding: '16px 18px', color: 'white', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ background: C.accent, fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Phase {Math.ceil(selectedWeek / 3)} — {phase.name}
              </span>
            </div>
            <h3 style={{ fontFamily: "'Cabinet Grotesk'", fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>
              Semaine {selectedWeek} : {phase.desc}
            </h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', padding: '8px 12px', borderRadius: 8, flex: 1 }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 2 }}>Perte prévue (cumulé)</div>
                <div style={{ fontWeight: 700, color: '#6EE7B7', fontSize: 15 }}>-{phaseLossTarget} kg</div>
              </div>
              {weightDelta !== null && (
                <div style={{ background: 'rgba(255,255,255,0.08)', padding: '8px 12px', borderRadius: 8, flex: 1 }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 2 }}>Perte réelle</div>
                  <div style={{ fontWeight: 700, color: weightDelta <= 0 ? '#6EE7B7' : C.orange, fontSize: 15 }}>
                    {weightDelta > 0 ? '+' : ''}{weightDelta} kg
                  </div>
                </div>
              )}
            </div>
          </div>
          <div style={{ position: 'absolute', right: -12, bottom: -12, width: 80, height: 80, background: C.accent, opacity: 0.12, borderRadius: '50%', filter: 'blur(16px)' }} />
        </div>
      </div>

      <main style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ═══ PROGRESS DELTAS ═══ */}
        {(weightDelta !== null || waistDelta !== null) && (
          <div style={{ display: 'flex', gap: 10 }}>
            {weightDelta !== null && (
              <div style={{ flex: 1, background: C.accentBg, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.accentDark, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Poids</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.accentDark }}>{weightDelta > 0 ? '+' : ''}{weightDelta} kg</div>
                <div style={{ fontSize: 10, color: C.accentDark, opacity: 0.7 }}>{initialWeight} → {lastPesee!.poids} kg</div>
              </div>
            )}
            {waistDelta !== null && (
              <div style={{ flex: 1, background: '#FAF5FF', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.purple, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Tour de taille</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.purple }}>{waistDelta > 0 ? '+' : ''}{waistDelta} cm</div>
                <div style={{ fontSize: 10, color: C.purple, opacity: 0.7 }}>{initialWaist} → {lastTaille!.value} cm</div>
              </div>
            )}
          </div>
        )}

        {/* ═══ GLYCÉMIE (g/L) ═══ */}
        <Card>
          <SectionTitle icon="🩸" iconBg={C.accentBg} iconColor={C.accentDark}
            right={lastGlucose ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: glucoseColor(lastGlucose.value), background: C.bg, padding: '4px 10px', borderRadius: 6 }}>
                {lastGlucose.value.toFixed(2)} g/L
              </span>
            ) : null}>
            Suivi Glycémie
          </SectionTitle>
          <div style={{ display: 'flex', gap: 8, height: 42 }}>
            <input type="number" inputMode="decimal" step="0.01" placeholder="Glycémie à jeun (g/L)" value={glucoseInput}
              onChange={e => setGlucoseInput(e.target.value)}
              style={{ flex: 1, padding: '0 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontWeight: 600, outline: 'none', fontFamily: "'DM Sans'" }} />
            <button onClick={saveGlucose}
              style={{ padding: '0 18px', background: C.accent, color: 'white', fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13 }}>
              {saving === 'glucose' ? '...' : 'OK'}
            </button>
          </div>
          {glucoseInput && parseFloat(glucoseInput) > 0 && parseFloat(glucoseInput) <= 1.25 && parseFloat(glucoseInput) >= 1.0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: C.orange, background: '#FFF7ED', padding: '6px 10px', borderRadius: 6, border: '1px solid #FDE68A' }}>
              ⚠️ Zone prédiabète. Le protocole cible ce profil — continuez.
            </div>
          )}
        </Card>

        {/* ═══ LIPIDES (Collapsible) ═══ */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setLipidesOpen(!lipidesOpen)}>
            <SectionTitle icon="❤️" iconBg="#FEF2F2" iconColor={C.red}>
              Suivi Lipides
              <span style={{ fontSize: 9, color: C.textLight, background: C.bg, padding: '2px 7px', borderRadius: 20, fontWeight: 500, marginLeft: 6 }}>Optionnel</span>
            </SectionTitle>
            <span style={{ color: C.textLight, transition: 'transform 0.3s', transform: lipidesOpen ? 'rotate(180deg)' : '', fontSize: 12 }}>▼</span>
          </div>
          {lipidesOpen && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.borderLight}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                {[
                  { id: 'total', label: 'Total (mg/dL)', ph: '< 200' },
                  { id: 'ldl', label: 'LDL', ph: '< 100' },
                  { id: 'hdl', label: 'HDL', ph: '> 40' },
                  { id: 'triglycerides', label: 'Triglycérides', ph: '< 150' },
                ].map(f => (
                  <div key={f.id}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase' }}>{f.label}</label>
                    <input type="number" placeholder={f.ph} value={(lipides as any)[f.id]}
                      onChange={e => setLipides({ ...lipides, [f.id]: e.target.value })}
                      style={{ width: '100%', padding: 9, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 700, outline: 'none', fontFamily: "'DM Sans'", marginTop: 3 }} />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase' }}>Date Analyse</label>
                <input type="date" value={lipides.date} onChange={e => setLipides({ ...lipides, date: e.target.value })}
                  style={{ width: '100%', padding: 9, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: "'DM Sans'", marginTop: 3 }} />
              </div>
              <button onClick={saveLipides}
                style={{ width: '100%', padding: 12, background: C.primary, color: 'white', fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13 }}>
                {saving === 'lipides' ? 'Enregistrement...' : 'Enregistrer Analyse'}
              </button>
            </div>
          )}
        </Card>

        {/* ═══ CIBLES DU JOUR (Training/Rest toggle) ═══ */}
        <Card>
          <SectionTitle icon="🎯" iconBg="#FFF7ED" iconColor={C.orange}
            right={diet?.training ? (
              <div onClick={() => setShowTraining(!showTraining)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: showTraining ? C.accentBg : C.bg, padding: '4px 10px', borderRadius: 20, border: `1px solid ${showTraining ? C.accent : C.border}`, transition: '0.2s' }}>
                <span style={{ fontSize: 11 }}>{showTraining ? '🔥' : '😴'}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: showTraining ? C.accentDark : C.textMuted }}>
                  {showTraining ? 'Training' : 'Repos'}
                </span>
              </div>
            ) : null}>
            Cibles du jour
          </SectionTitle>

          <div style={{ fontSize: 22, fontWeight: 800, color: C.primary, marginBottom: 12 }}>
            {displayCal} <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>kcal</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'PROT', value: displayProt, unit: 'g', color: C.accent },
              { label: 'GLUC', value: displayCarbs, unit: 'g', color: C.orange },
              { label: 'LIP', value: displayFats, unit: 'g', color: C.red },
            ].map(m => (
              <div key={m.label} style={{ background: C.bg, padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
                <div style={{ fontSize: 9, color: C.textLight, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>{m.label}</div>
                <span style={{ fontWeight: 800, color: m.color, fontSize: 15 }}>{m.value}{m.unit}</span>
              </div>
            ))}
          </div>

          {diet?.training && (
            <div style={{ marginTop: 8, fontSize: 10, color: C.textLight, textAlign: 'center' }}>
              Appuyez sur le badge pour basculer entre Training ({diet.training.calories} kcal) et Repos ({diet.rest?.calories || diet.targetCalories} kcal)
            </div>
          )}
        </Card>

        {/* ═══ POIDS ═══ */}
        <Card>
          <SectionTitle icon="⚖️" iconBg="#EFF6FF" iconColor={C.blue}>
            Courbe de Poids
          </SectionTitle>
          <div style={{ background: C.bg, borderRadius: 10, border: `1px solid ${C.borderLight}`, overflow: 'hidden', padding: 6, marginBottom: 12 }}>
            {renderWeightChart()}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input type="number" inputMode="decimal" placeholder="Poids (kg)" step="0.1" value={poidsInput}
              onChange={e => setPoidsInput(e.target.value)}
              style={{ padding: 12, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: "'DM Sans'" }} />
            <button onClick={savePoids}
              style={{ background: C.primary, color: 'white', fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13 }}>
              {saving === 'poids' ? '...' : 'Enregistrer'}
            </button>
          </div>
        </Card>

        {/* ═══ TOUR DE TAILLE (fonctionnel) ═══ */}
        <Card>
          <SectionTitle icon="📏" iconBg="#FAF5FF" iconColor={C.purple}>
            Tour de Taille
          </SectionTitle>
          <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>
            Mesurez au nombril, le matin à jeun. C'est le marqueur #1 du gras viscéral.
          </p>
          {initialWaist > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1, background: C.bg, padding: '6px 10px', borderRadius: 6, fontSize: 11, textAlign: 'center' }}>
                <div style={{ color: C.textLight, fontWeight: 600 }}>Départ</div>
                <div style={{ fontWeight: 700, color: C.primary }}>{initialWaist} cm</div>
              </div>
              {lastTaille && (
                <div style={{ flex: 1, background: C.accentBg, padding: '6px 10px', borderRadius: 6, fontSize: 11, textAlign: 'center' }}>
                  <div style={{ color: C.accentDark, fontWeight: 600 }}>Actuel</div>
                  <div style={{ fontWeight: 700, color: C.accentDark }}>{lastTaille.value} cm</div>
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input type="number" inputMode="decimal" placeholder="Tour de taille (cm)" step="0.5" value={tailleInput}
              onChange={e => setTailleInput(e.target.value)}
              style={{ padding: 12, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: "'DM Sans'" }} />
            <button onClick={saveTaille}
              style={{ background: C.primary, color: 'white', fontWeight: 700, borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13 }}>
              {saving === 'taille' ? '...' : 'Enregistrer'}
            </button>
          </div>
        </Card>
      </main>

      {/* ═══ BOTTOM NAV ═══ */}
      <nav style={{ position: 'fixed', bottom: 0, width: '100%', background: C.surface, borderTop: `1px solid ${C.borderLight}`, padding: '8px 24px 20px', display: 'flex', justifyContent: 'space-around', zIndex: 30, boxShadow: '0 -2px 12px rgba(0,0,0,0.03)' }}>
        {[
          { to: '/dashboard', icon: '🏠', label: 'Suivi', active: true },
          { to: '/journal', icon: '📖', label: 'Journal', active: false },
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

export default Dashboard;