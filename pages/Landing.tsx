import React, { useState, useEffect, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';

const { Link } = ReactRouterDOM;

export const Landing: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [scrollY, setScrollY] = useState(0);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const sectionRefs = useRef({});

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 15 * 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const isVisible = (id: string) => visibleSections.has(id);

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');

    :root {
      /* Palette App adaptée */
      --ink: #0F2C59;        /* Bleu Profond (App Primary) */
      --paper: #F8FAFC;      /* Slate-50 (App Bg) */
      --cream: #F1F5F9;      /* Slate-100 (Secondary Bg) */
      --sage: #00B894;       /* Emerald (App Accent) */
      --sage-light: #059669; /* Emerald Darker pour hover */
      --sage-glow: #34D399;  /* Emerald Lighter pour glow */
      --sage-muted: #ECFDF5; /* Emerald-50 pour fonds subtils */
      --warm: #CBD5E1;       /* Slate-300 */
      --warm-dark: #64748B;  /* Slate-500 */
      --accent: #F59E0B;     /* Amber-500 pour touches chaudes */
      --red-soft: #EF4444;   /* Red-500 */
      --text: #1E293B;       /* Slate-800 */
      --text-mid: #475569;   /* Slate-600 */
      --text-light: #94A3B8; /* Slate-400 */
      --border: #E2E8F0;     /* Slate-200 */
      --card: #FFFFFF;
      --shadow: 0 4px 60px rgba(15, 44, 89, 0.06);
      --shadow-hover: 0 12px 80px rgba(15, 44, 89, 0.1);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    html { scroll-behavior: smooth; }

    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--paper);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    .font-serif { font-family: 'Instrument Serif', serif; }

    /* ===== BANNER ===== */
    .top-banner {
      background: var(--ink);
      color: #fff;
      text-align: center;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.02em;
    }
    .top-banner .timer {
      display: inline-block;
      background: var(--sage);
      color: #fff;
      padding: 2px 10px;
      border-radius: 4px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      margin: 0 4px;
    }

    /* ===== HEADER ===== */
    .site-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(248,250,252,0.92);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      padding: 14px 24px;
    }
    .header-inner {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-family: 'Instrument Serif', serif;
      font-size: 24px;
      color: var(--ink);
      text-decoration: none;
      letter-spacing: -0.02em;
    }
    .logo span { color: var(--sage); }
    .btn-member {
      background: var(--ink);
      color: #fff;
      padding: 10px 22px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.3s;
      border: none;
      cursor: pointer;
    }
    .btn-member:hover { background: var(--sage); transform: translateY(-1px); }

    /* ===== HERO ===== */
    .hero {
      padding: 80px 24px 60px;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      top: -200px;
      right: -200px;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, var(--sage-muted) 0%, transparent 70%);
      opacity: 0.5;
      pointer-events: none;
    }
    .hero-inner {
      max-width: 1100px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      align-items: center;
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--sage-muted);
      color: var(--sage);
      padding: 6px 16px;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    .hero-badge .dot {
      width: 6px; height: 6px;
      background: var(--sage-glow);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .hero h1 {
      font-family: 'Instrument Serif', serif;
      font-size: clamp(36px, 5vw, 58px);
      line-height: 1.1;
      color: var(--ink);
      margin-bottom: 20px;
      letter-spacing: -0.02em;
    }
    .hero h1 em {
      font-style: italic;
      color: var(--sage);
    }
    .hero-sub {
      font-size: 17px;
      line-height: 1.7;
      color: var(--text-mid);
      margin-bottom: 36px;
      max-width: 480px;
    }
    .hero-cta-row {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--sage);
      color: #fff;
      padding: 16px 36px;
      border-radius: 100px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 20px rgba(0, 184, 148, 0.3);
    }
    .btn-primary:hover {
      background: var(--sage-light);
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0, 184, 148, 0.35);
    }
    .btn-primary .arrow { transition: transform 0.3s; }
    .btn-primary:hover .arrow { transform: translateX(3px); }
    .price-tag {
      font-size: 14px;
      color: var(--text-light);
    }
    .price-tag strong {
      font-size: 22px;
      color: var(--ink);
      font-weight: 700;
    }
    .price-tag .old {
      text-decoration: line-through;
      color: var(--text-light);
      font-size: 14px;
      margin-right: 4px;
    }

    /* Hero Visual */
    .hero-visual {
      position: relative;
    }
    .hero-phone {
      width: 280px;
      margin: 0 auto;
      background: var(--ink);
      border-radius: 36px;
      padding: 12px;
      box-shadow: 0 40px 100px rgba(15, 44, 89, 0.15);
      transform: perspective(1000px) rotateY(-5deg) rotateX(2deg);
      transition: transform 0.5s;
    }
    .hero-phone:hover {
      transform: perspective(1000px) rotateY(0deg) rotateX(0deg);
    }
    .phone-screen {
      background: #111;
      border-radius: 26px;
      overflow: hidden;
      aspect-ratio: 9/18;
      position: relative;
    }
    .phone-notch {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 120px;
      height: 28px;
      background: var(--ink);
      border-radius: 0 0 16px 16px;
      z-index: 2;
    }
    .app-preview {
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, #0F2C59 0%, #163A70 100%);
      padding: 40px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .app-header-mock {
      text-align: center;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .app-stat-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .app-stat-card {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 12px;
      text-align: center;
    }
    .app-stat-card .label {
      font-size: 9px;
      color: rgba(255,255,255,0.4);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .app-stat-card .value {
      font-size: 18px;
      font-weight: 700;
      color: var(--sage-glow);
    }
    .app-stat-card .value.white { color: #fff; }
    .app-progress-mock {
      background: rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 14px;
    }
    .app-progress-mock .title {
      font-size: 10px;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
    }
    .progress-bars {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .p-bar-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .p-bar-label {
      font-size: 10px;
      color: rgba(255,255,255,0.6);
      width: 60px;
      flex-shrink: 0;
    }
    .p-bar-track {
      flex: 1;
      height: 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
      overflow: hidden;
    }
    .p-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 1.5s ease;
    }
    .p-bar-fill.green { background: var(--sage-glow); }
    .p-bar-fill.blue { background: #60a5fa; }
    .p-bar-fill.orange { background: var(--accent); }
    .app-meal-mock {
      background: rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 14px;
    }
    .app-meal-mock .title {
      font-size: 10px;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .meal-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .meal-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: rgba(255,255,255,0.7);
      padding: 6px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .meal-item:last-child { border-bottom: none; }
    .meal-item .kcal { color: var(--sage-glow); font-weight: 600; }

    /* Floating badges around phone */
    .float-badge {
      position: absolute;
      background: var(--card);
      padding: 14px 18px;
      border-radius: 16px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      z-index: 2;
    }
    .float-badge .fb-label {
      font-size: 10px;
      color: var(--text-light);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .float-badge .fb-value {
      font-size: 22px;
      font-weight: 700;
    }
    .fb-glycemie {
      top: 40px;
      left: -20px;
      animation: floatA 4s ease-in-out infinite;
    }
    .fb-muscle {
      bottom: 60px;
      right: -20px;
      animation: floatB 4s ease-in-out infinite;
    }
    @keyframes floatA {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes floatB {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(8px); }
    }

    /* ===== TRUST STRIP ===== */
    .trust-strip {
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      padding: 20px 24px;
      background: var(--cream);
    }
    .trust-inner {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      justify-content: center;
      gap: 40px;
      flex-wrap: wrap;
    }
    .trust-item {
      font-size: 12px;
      color: var(--text-light);
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .trust-item::before {
      content: '';
      width: 5px; height: 5px;
      background: var(--sage-glow);
      border-radius: 50%;
    }

    /* ===== PROBLEMS ===== */
    .problems {
      padding: 100px 24px;
      position: relative;
    }
    .section-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--sage);
      margin-bottom: 16px;
    }
    .section-title {
      font-family: 'Instrument Serif', serif;
      font-size: clamp(30px, 4vw, 44px);
      color: var(--ink);
      line-height: 1.15;
      margin-bottom: 12px;
      letter-spacing: -0.02em;
    }
    .section-sub {
      font-size: 17px;
      color: var(--text-mid);
      line-height: 1.6;
      margin-bottom: 48px;
      max-width: 520px;
    }
    .problems-grid {
      max-width: 1100px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    .problem-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 36px 28px;
      position: relative;
      overflow: hidden;
      transition: all 0.4s;
      opacity: 0;
      transform: translateY(20px);
    }
    .problem-card.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .problem-card:hover {
      border-color: #fecaca;
      box-shadow: var(--shadow-hover);
      transform: translateY(-4px);
    }
    .problem-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--red-soft);
      opacity: 0.6;
    }
    .problem-num {
      font-size: 12px;
      font-weight: 700;
      color: var(--red-soft);
      letter-spacing: 0.05em;
      margin-bottom: 16px;
      opacity: 0.8;
    }
    .problem-card h3 {
      font-family: 'Instrument Serif', serif;
      font-size: 22px;
      color: var(--ink);
      margin-bottom: 12px;
    }
    .problem-card p {
      font-size: 15px;
      color: var(--text-mid);
      line-height: 1.65;
    }

    /* ===== SOLUTION ===== */
    .solution {
      padding: 100px 24px;
      background: var(--ink);
      color: #fff;
      position: relative;
      overflow: hidden;
    }
    .solution::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(ellipse at 30% 50%, rgba(0, 184, 148, 0.15) 0%, transparent 60%);
      pointer-events: none;
    }
    .solution-inner {
      max-width: 1100px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }
    .solution .section-tag { color: var(--sage-glow); }
    .solution .section-title { color: #fff; }
    .solution .section-sub { color: rgba(255,255,255,0.6); }
    .solution-features {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 48px;
    }
    .sol-feature {
      display: flex;
      gap: 16px;
      padding: 24px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      transition: all 0.3s;
      opacity: 0;
      transform: translateY(15px);
    }
    .sol-feature.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .sol-feature:hover {
      background: rgba(255,255,255,0.07);
      border-color: rgba(0, 184, 148, 0.2);
    }
    .sol-icon {
      width: 44px;
      height: 44px;
      background: rgba(0, 184, 148, 0.15);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .sol-feature h4 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .sol-feature p {
      font-size: 14px;
      color: rgba(255,255,255,0.5);
      line-height: 1.5;
    }

    /* ===== TIMELINE ===== */
    .timeline {
      padding: 100px 24px;
    }
    .timeline-inner {
      max-width: 1100px;
      margin: 0 auto;
    }
    .timeline-track {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0;
      position: relative;
      margin-top: 48px;
    }
    .timeline-track::before {
      content: '';
      position: absolute;
      top: 36px;
      left: 10%;
      right: 10%;
      height: 2px;
      background: linear-gradient(90deg, var(--sage-muted), var(--sage), var(--sage-muted));
    }
    .phase-card {
      text-align: center;
      position: relative;
      padding: 0 16px;
      opacity: 0;
      transform: translateY(20px);
    }
    .phase-card.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .phase-dot {
      width: 20px;
      height: 20px;
      background: var(--sage);
      border: 4px solid var(--paper);
      border-radius: 50%;
      margin: 26px auto 28px;
      box-shadow: 0 0 0 4px var(--sage-muted);
      position: relative;
      z-index: 1;
    }
    .phase-num {
      font-size: 11px;
      font-weight: 700;
      color: var(--sage);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .phase-card h3 {
      font-family: 'Instrument Serif', serif;
      font-size: 24px;
      color: var(--ink);
      margin-bottom: 4px;
    }
    .phase-weeks {
      font-size: 13px;
      color: var(--text-light);
      margin-bottom: 12px;
    }
    .phase-result {
      display: inline-block;
      background: var(--sage-muted);
      color: var(--sage);
      padding: 4px 14px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 600;
    }

    /* ===== TESTIMONIALS ===== */
    .testimonials {
      padding: 100px 24px;
      background: var(--cream);
    }
    .testimonials-inner {
      max-width: 1100px;
      margin: 0 auto;
    }
    .test-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-top: 48px;
    }
    .test-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 32px 28px;
      position: relative;
      transition: all 0.3s;
      opacity: 0;
      transform: translateY(15px);
    }
    .test-card.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .test-card:hover {
      box-shadow: var(--shadow-hover);
      transform: translateY(-3px);
    }
    .test-quote {
      font-family: 'Instrument Serif', serif;
      font-size: 44px;
      color: var(--sage-muted);
      line-height: 1;
      margin-bottom: 8px;
    }
    .test-text {
      font-size: 15px;
      color: var(--text);
      line-height: 1.65;
      margin-bottom: 20px;
      font-style: italic;
    }
    .test-divider {
      width: 30px;
      height: 2px;
      background: var(--sage-glow);
      margin-bottom: 16px;
    }
    .test-author {
      font-size: 14px;
      font-weight: 600;
      color: var(--ink);
    }
    .test-role {
      font-size: 12px;
      color: var(--text-light);
      margin-top: 2px;
    }
    .test-stats {
      display: flex;
      gap: 16px;
      margin-top: 12px;
    }
    .test-stat {
      font-size: 12px;
      font-weight: 600;
      color: var(--sage);
      background: var(--sage-muted);
      padding: 4px 10px;
      border-radius: 100px;
    }

    /* ===== PRICING ===== */
    .pricing {
      padding: 100px 24px;
    }
    .pricing-inner {
      max-width: 480px;
      margin: 0 auto;
      text-align: center;
    }
    .pricing-card {
      background: var(--card);
      border: 2px solid var(--sage);
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 30px 80px rgba(0, 184, 148, 0.12);
      margin-top: 48px;
      opacity: 0;
      transform: translateY(20px);
    }
    .pricing-card.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .pricing-ribbon {
      background: var(--sage);
      color: #fff;
      padding: 12px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .pricing-body {
      padding: 40px 32px;
    }
    .pricing-body h3 {
      font-family: 'Instrument Serif', serif;
      font-size: 28px;
      color: var(--ink);
      margin-bottom: 4px;
    }
    .pricing-body .subtitle {
      font-size: 14px;
      color: var(--text-light);
      margin-bottom: 28px;
    }
    .price-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 32px;
    }
    .price-old {
      font-size: 24px;
      color: var(--text-light);
      text-decoration: line-through;
    }
    .price-new {
      font-size: 64px;
      font-weight: 800;
      color: var(--ink);
      line-height: 1;
    }
    .price-new span {
      font-size: 24px;
      vertical-align: super;
      font-weight: 600;
    }

    .value-stack {
      text-align: left;
      margin-bottom: 32px;
    }
    .value-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
      font-size: 14px;
    }
    .value-item:last-child { border-bottom: none; }
    .value-item .check {
      color: var(--sage);
      font-weight: 700;
      margin-right: 8px;
    }
    .value-item .val {
      color: var(--text-light);
      font-size: 13px;
      text-decoration: line-through;
    }

    .btn-cta-big {
      display: block;
      width: 100%;
      background: var(--sage);
      color: #fff;
      padding: 18px;
      border: none;
      border-radius: 14px;
      font-size: 17px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 20px rgba(0, 184, 148, 0.3);
      text-decoration: none;
      text-align: center;
    }
    .btn-cta-big:hover {
      background: var(--sage-light);
      transform: translateY(-2px);
    }
    .guarantee-box {
      margin-top: 20px;
      padding: 16px;
      background: var(--sage-muted);
      border-radius: 12px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      text-align: left;
    }
    .guarantee-box .icon { font-size: 20px; flex-shrink: 0; }
    .guarantee-box p {
      font-size: 13px;
      color: var(--sage);
      line-height: 1.5;
    }
    .payment-info {
      margin-top: 16px;
      font-size: 12px;
      color: var(--text-light);
    }

    /* ===== FAQ ===== */
    .faq {
      padding: 100px 24px;
      background: var(--cream);
    }
    .faq-inner {
      max-width: 700px;
      margin: 0 auto;
    }
    .faq-item {
      border-bottom: 1px solid var(--border);
    }
    .faq-question {
      width: 100%;
      background: none;
      border: none;
      padding: 24px 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--ink);
      text-align: left;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: 'DM Sans', sans-serif;
    }
    .faq-question:hover { color: var(--sage); }
    .faq-chevron {
      transition: transform 0.3s;
      font-size: 14px;
      color: var(--text-light);
    }
    .faq-chevron.open { transform: rotate(180deg); }
    .faq-answer {
      overflow: hidden;
      max-height: 0;
      transition: max-height 0.3s ease, padding 0.3s ease;
    }
    .faq-answer.open {
      max-height: 200px;
      padding-bottom: 24px;
    }
    .faq-answer p {
      font-size: 15px;
      color: var(--text-mid);
      line-height: 1.65;
    }

    /* ===== FOOTER ===== */
    .site-footer {
      padding: 40px 24px;
      text-align: center;
      border-top: 1px solid var(--border);
    }
    .site-footer p {
      font-size: 13px;
      color: var(--text-light);
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 768px) {
      .hero-inner { grid-template-columns: 1fr; text-align: center; }
      .hero-sub { margin: 0 auto 36px; }
      .hero-cta-row { justify-content: center; }
      .hero-visual { margin-top: 40px; }
      .fb-glycemie { left: 10px; top: 20px; }
      .fb-muscle { right: 10px; bottom: 40px; }
      .problems-grid { grid-template-columns: 1fr; }
      .solution-features { grid-template-columns: 1fr; }
      .timeline-track { grid-template-columns: 1fr; gap: 32px; }
      .timeline-track::before { display: none; }
      .test-grid { grid-template-columns: 1fr; }
      .trust-inner { gap: 20px; }
    }

    /* ===== ANIMATIONS ===== */
    .fade-up {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .fade-up.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .delay-1 { transition-delay: 0.1s; }
    .delay-2 { transition-delay: 0.2s; }
    .delay-3 { transition-delay: 0.3s; }
    .delay-4 { transition-delay: 0.4s; }
  `;

  const problems = [
    {
      num: 'ERREUR #1',
      title: 'Régimes Low-Cal Classiques',
      desc: 'Vous perdez du poids, mais 40% vient de vos muscles. Résultat : métabolisme ralenti, effet yoyo garanti.'
    },
    {
      num: 'ERREUR #2',
      title: 'Ignorer Votre Glycémie',
      desc: 'Une glycémie instable = stockage permanent. Même avec un déficit, vous ne brûlez pas le gras viscéral.'
    },
    {
      num: 'ERREUR #3',
      title: 'Programmes Génériques',
      desc: 'Un plan conçu pour un homme de 25 ans ne fonctionne pas à 45 ans. Votre métabolisme a changé, votre approche doit suivre.'
    }
  ];

  const features = [
    { icon: '🎯', title: 'Adapté à votre profil', desc: 'Standard, Prédiabète ou Cholestérol — le protocole s\'ajuste.' },
    { icon: '📊', title: 'Cyclage calorique', desc: 'Plus de calories les jours training, moins au repos. Intelligent et efficace.' },
    { icon: '💪', title: 'Préservation musculaire', desc: 'Protéines optimisées et entraînement adapté pour garder chaque gramme de muscle.' },
    { icon: '🩸', title: 'Suivi glycémie intégré', desc: 'Suivez votre glycémie directement dans l\'application.' }
  ];

  const testimonials = [
    {
      text: 'Ma glycémie est passée de 1.12 à 0.92 g/L en 8 semaines. Mon médecin n\'en revenait pas. Et j\'ai gardé ma force.',
      name: 'Julien, 47 ans',
      role: 'Cadre',
      stats: ['-6.5kg', 'Glycémie 0.92g/L']
    },
    {
      text: 'Après 3 ans de muscu sans voir mes abdos, j\'ai enfin compris que le problème c\'était mon approche nutritionnelle.',
      name: 'Stéphane, 42 ans',
      role: 'Commercial',
      stats: ['-7.2kg', 'Tour de taille -8cm']
    },
    {
      text: 'Le cyclage calorique a tout changé. Je mange PLUS les jours d\'entraînement et je perds quand même.',
      name: 'Karim, 51 ans',
      role: 'Entrepreneur',
      stats: ['-5.8kg', 'Cholestérol -15%']
    }
  ];

  const faqData = [
    {
      q: 'Je suis sous traitement médical, c\'est compatible ?',
      a: 'Le programme est nutritionnel, pas médical. Consultez votre médecin, mais nos ratios sont conçus pour les profils métaboliques.'
    },
    {
      q: 'Je suis débutant en musculation, c\'est pour moi ?',
      a: 'Le programme est optimisé pour ceux qui s\'entraînent déjà (3+ mois). Si vous débutez, commencez par les bases.'
    },
    {
      q: 'Je n\'ai pas le temps de cuisiner des plats compliqués.',
      a: 'Les repas sont simples : viande/poisson + légumes + féculent. 15-20 min de préparation max. Options batch cooking incluses.'
    },
    {
      q: 'Et si ça ne marche pas pour moi ?',
      a: 'Garantie 30 jours. Si vous suivez le protocole sans résultats mesurables (poids OU glycémie OU tour de taille), remboursement intégral.'
    }
  ];

  const valueStack = [
    { label: 'Web App de Suivi Intelligent', val: '47€' },
    { label: 'Plan Alimentaire 10 Semaines', val: '49€' },
    { label: 'Guide Glycémie & Métabolisme', val: '29€' },
    { label: 'Protocole Anti-Catabolique', val: '39€' },
    { label: 'Communauté Privée Telegram', val: '34€' },
  ];

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <style>{styles}</style>
      <div>
        {/* Banner */}
        <div className="top-banner">
          🔥 Offre de lancement — Plus que <span className="timer">{formatTime(timeLeft)}</span> à ce prix
        </div>

        {/* Header */}
        <header className="site-header">
          <div className="header-inner">
            <Link to="/" className="logo">
              Sèche<span>10</span>Semaines
            </Link>
            <Link to="/login" className="btn-member">Espace Membre</Link>
          </div>
        </header>

        {/* Hero */}
        <section className="hero">
          <div className="hero-inner">
            <div>
              <div className="hero-badge">
                <span className="dot"></span>
                PROTOCOLE VALIDÉ PAR LA SCIENCE
              </div>
              <h1>
                Perdez 5-8kg de gras viscéral en 10 semaines.<br/>
                <em>Glycémie stabilisée. Muscle intact.</em>
              </h1>
              <p className="hero-sub">
                Le protocole métabolique pour hommes de 35-55 ans
                avec glycémie limite ou cholestérol élevé qui veulent
                des résultats visibles sans détruire leur métabolisme.
              </p>
              <div className="hero-cta-row">
                <a href="#pricing" className="btn-primary">
                  Démarrer ma transformation
                  <span className="arrow">→</span>
                </a>
                <div className="price-tag">
                  <span className="old">97€</span> <strong>29€</strong>
                  <br/><span style={{fontSize: '12px'}}>paiement unique</span>
                </div>
              </div>
            </div>

            {/* Phone Mockup with App Preview */}
            <div className="hero-visual">
              <div className="float-badge fb-glycemie">
                <div className="fb-label">Glycémie Moy.</div>
                <div className="fb-value" style={{color: 'var(--sage)'}}>{'< 0.95 g/L'}</div>
              </div>
              <div className="float-badge fb-muscle">
                <div className="fb-label">Muscle préservé</div>
                <div className="fb-value" style={{color: '#6366f1'}}>97%</div>
              </div>

              <div className="hero-phone">
                <div className="phone-screen">
                  <div className="phone-notch"></div>
                  <div className="app-preview">
                    <div className="app-header-mock">Sèche10Semaines — Semaine 4</div>
                    <div className="app-stat-row">
                      <div className="app-stat-card">
                        <div className="label">Poids</div>
                        <div className="value white">78.2 kg</div>
                      </div>
                      <div className="app-stat-card">
                        <div className="label">Glycémie</div>
                        <div className="value">0.94</div>
                      </div>
                    </div>
                    <div className="app-progress-mock">
                      <div className="title">Macros Aujourd'hui</div>
                      <div className="progress-bars">
                        <div className="p-bar-row">
                          <span className="p-bar-label">Protéines</span>
                          <div className="p-bar-track">
                            <div className="p-bar-fill green" style={{width: '82%'}}></div>
                          </div>
                        </div>
                        <div className="p-bar-row">
                          <span className="p-bar-label">Glucides</span>
                          <div className="p-bar-track">
                            <div className="p-bar-fill blue" style={{width: '60%'}}></div>
                          </div>
                        </div>
                        <div className="p-bar-row">
                          <span className="p-bar-label">Lipides</span>
                          <div className="p-bar-track">
                            <div className="p-bar-fill orange" style={{width: '45%'}}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="app-meal-mock">
                      <div className="title">Prochain repas</div>
                      <div className="meal-items">
                        <div className="meal-item">
                          <span>Poulet grillé 150g</span>
                          <span className="kcal">248 kcal</span>
                        </div>
                        <div className="meal-item">
                          <span>Riz basmati 80g</span>
                          <span className="kcal">286 kcal</span>
                        </div>
                        <div className="meal-item">
                          <span>Brocolis 200g</span>
                          <span className="kcal">68 kcal</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Strip */}
        <div className="trust-strip">
          <div className="trust-inner">
            <span className="trust-item">Études Peer-Reviewed</span>
            <span className="trust-item">Protocoles Validés</span>
            <span className="trust-item">Schoenfeld • Helms • McDonald</span>
          </div>
        </div>

        {/* Problems */}
        <section className="problems">
          <div style={{maxWidth: '1100px', margin: '0 auto'}}>
            <div className="section-tag">⚠ Le problème</div>
            <h2 className="section-title">Pourquoi vos sèches échouent</h2>
            <p className="section-sub">Ce n'est pas un manque de discipline. C'est une question de méthode.</p>
          </div>
          <div className="problems-grid">
            {problems.map((p, i) => (
              <div
                key={i}
                id={`problem-${i}`}
                data-animate
                className={`problem-card ${isVisible(`problem-${i}`) ? 'visible' : ''}`}
                style={{transitionDelay: `${i * 0.12}s`}}
              >
                <div className="problem-num">{p.num}</div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Solution */}
        <section className="solution">
          <div className="solution-inner">
            <div className="section-tag">✓ La solution</div>
            <h2 className="section-title">Le Protocole Sèche Métabolique</h2>
            <p className="section-sub">
              Un système complet qui s'adapte à votre profil santé et optimise chaque variable pour des résultats durables.
            </p>
            <div className="solution-features">
              {features.map((f, i) => (
                <div
                  key={i}
                  id={`feature-${i}`}
                  data-animate
                  className={`sol-feature ${isVisible(`feature-${i}`) ? 'visible' : ''}`}
                  style={{transitionDelay: `${i * 0.1}s`}}
                >
                  <div className="sol-icon">{f.icon}</div>
                  <div>
                    <h4>{f.title}</h4>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="timeline">
          <div className="timeline-inner">
            <div style={{textAlign: 'center'}}>
              <div className="section-tag">📅 Les 3 Phases</div>
              <h2 className="section-title">Votre parcours de 10 semaines</h2>
            </div>
            <div className="timeline-track">
              {[
                { num: 'Phase 1', title: 'Reset Métabolique', weeks: 'Semaines 1-3', result: '-2kg' },
                { num: 'Phase 2', title: 'Sèche Viscérale', weeks: 'Semaines 4-7', result: '-3 à 4kg' },
                { num: 'Phase 3', title: 'Définition', weeks: 'Semaines 8-10', result: '-1 à 2kg' }
              ].map((phase, i) => (
                <div
                  key={i}
                  id={`phase-${i}`}
                  data-animate
                  className={`phase-card ${isVisible(`phase-${i}`) ? 'visible' : ''}`}
                  style={{transitionDelay: `${i * 0.15}s`}}
                >
                  <div className="phase-num">{phase.num}</div>
                  <div className="phase-dot"></div>
                  <h3>{phase.title}</h3>
                  <div className="phase-weeks">{phase.weeks}</div>
                  <div className="phase-result">{phase.result}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="testimonials">
          <div className="testimonials-inner">
            <div style={{textAlign: 'center'}}>
              <div className="section-tag">💬 Témoignages</div>
              <h2 className="section-title">Ce qu'ils en disent</h2>
            </div>
            <div className="test-grid">
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  id={`test-${i}`}
                  data-animate
                  className={`test-card ${isVisible(`test-${i}`) ? 'visible' : ''}`}
                  style={{transitionDelay: `${i * 0.12}s`}}
                >
                  <div className="test-quote">"</div>
                  <p className="test-text">{t.text}</p>
                  <div className="test-divider"></div>
                  <div className="test-author">{t.name}</div>
                  <div className="test-role">{t.role}</div>
                  <div className="test-stats">
                    {t.stats.map((s, j) => (
                      <span key={j} className="test-stat">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="pricing">
          <div className="pricing-inner">
            <div className="section-tag">💰 Offre de lancement</div>
            <h2 className="section-title">Investissez dans votre santé</h2>
            <div
              id="pricing-card"
              data-animate
              className={`pricing-card ${isVisible('pricing-card') ? 'visible' : ''}`}
            >
              <div className="pricing-ribbon">Offre Limitée — Prix de Lancement</div>
              <div className="pricing-body">
                <h3>Programme Complet</h3>
                <p className="subtitle">Accès à vie à la plateforme</p>

                <div className="value-stack">
                  {valueStack.map((item, i) => (
                    <div key={i} className="value-item">
                      <span><span className="check">✓</span> {item.label}</span>
                      <span className="val">{item.val}</span>
                    </div>
                  ))}
                </div>

                <div className="price-display">
                  <span className="price-old">198€</span>
                  <span className="price-new">29<span>€</span></span>
                </div>

                <Link to="/login" className="btn-cta-big">
                  Commencer Maintenant →
                </Link>

                <div className="guarantee-box">
                  <span className="icon">🔒</span>
                  <p>
                    <strong>Garantie 30 jours.</strong> Si vous ne voyez pas de résultats sur vos bilans ou votre tour de taille, remboursement intégral. Sans condition.
                  </p>
                </div>

                <p className="payment-info">
                  🔒 Paiement sécurisé Stripe — CB | Apple Pay | Google Pay
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq">
          <div className="faq-inner">
            <div style={{textAlign: 'center', marginBottom: '48px'}}>
              <div className="section-tag">❓ Questions fréquentes</div>
              <h2 className="section-title">Vos questions, nos réponses</h2>
            </div>
            {faqData.map((item, i) => (
              <div key={i} className="faq-item">
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {item.q}
                  <span className={`faq-chevron ${openFaq === i ? 'open' : ''}`}>▼</span>
                </button>
                <div className={`faq-answer ${openFaq === i ? 'open' : ''}`}>
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="site-footer">
          <p>© 2025 Sèche 10 Semaines. Tous droits réservés.</p>
        </footer>
      </div>
    </>
  );
}