// components/ui/OnboardingTour.jsx
import { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to DataMind! 🎉',
    desc: 'Your AI-powered BI dashboard. Let\'s take a quick tour to get you started in under a minute.',
    icon: '◈',
    position: 'center',
  },
  {
    id: 'upload',
    title: 'Upload your data 📁',
    desc: 'Click "New Upload" to upload any CSV or Excel file. It becomes a queryable database instantly — no configuration needed.',
    icon: '📁',
    target: 'upload-btn',
    position: 'bottom',
  },
  {
    id: 'query',
    title: 'Ask in plain English ✦',
    desc: 'Type any business question here. For example: "Show monthly revenue as a line chart" or "Top 5 customers by order value".',
    icon: '✦',
    target: 'query-input',
    position: 'bottom',
  },
  {
    id: 'charts',
    title: 'Get instant charts 📊',
    desc: 'Your results appear as interactive charts. You can pin favourites, export as PNG/PDF, or share a public link.',
    icon: '📊',
    position: 'center',
  },
  {
    id: 'theme',
    title: 'Light & Dark mode 🌙',
    desc: 'Toggle between dark and light mode using the ☀️/🌙 button in the header. Your preference is saved automatically.',
    icon: '🌙',
    position: 'center',
  },
];

export default function OnboardingTour({ onComplete }) {
  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(true);

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const isFirst = step === 0;

  const dismiss = async (completed = false) => {
    setVisible(false);
    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', uid), { onboardingDone: true }, { merge: true });
      } catch (_) {}
    }
    onComplete?.();
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)', zIndex: 998,
        animation: 'fadeIn .3s ease',
      }} onClick={() => dismiss()} />

      {/* Tour card */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 999,
        width: '100%', maxWidth: '440px',
        background: 'var(--bg3, #0D1225)',
        border: '1px solid rgba(108,99,255,0.35)',
        borderRadius: '24px', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.70), 0 0 0 1px rgba(108,99,255,0.15)',
        animation: 'scaleIn .25s ease',
      }}>
        {/* Top gradient bar */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg,#6C63FF,#FF3CAC,#FF6B9D)' }} />

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '16px 24px 0' }}>
          {STEPS.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: i === step ? '20px' : '6px', height: '6px',
              borderRadius: '3px',
              background: i === step ? 'linear-gradient(90deg,#6C63FF,#FF6B9D)' : i < step ? 'rgba(108,99,255,0.40)' : 'rgba(255,255,255,0.12)',
              transition: 'all .3s', cursor: 'pointer',
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px' }}>
          {/* Icon */}
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 20px',
            background: 'linear-gradient(135deg,rgba(108,99,255,0.20),rgba(255,107,157,0.14))',
            border: '1px solid rgba(108,99,255,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px',
            boxShadow: '0 0 30px rgba(108,99,255,0.20)',
          }}>
            {current.icon}
          </div>

          {/* Step label */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--c1,#6C63FF)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Step {step + 1} of {STEPS.length}
            </span>
          </div>

          <h3 style={{
            fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '20px',
            color: 'var(--text, #F0F0FF)', textAlign: 'center', marginBottom: '12px', lineHeight: 1.2,
          }}>
            {current.title}
          </h3>
          <p style={{
            fontSize: '14px', color: 'var(--muted, rgba(240,240,255,0.55))',
            textAlign: 'center', lineHeight: 1.75, margin: '0 0 28px',
          }}>
            {current.desc}
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {!isFirst && (
              <button onClick={() => setStep(p => p - 1)}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border2, rgba(255,255,255,0.13))', background: 'transparent', color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '14px', cursor: 'pointer', transition: 'all .2s' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--glass2)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >← Back</button>
            )}
            <button
              onClick={() => isLast ? dismiss(true) : setStep(p => p + 1)}
              style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#6C63FF,#FF6B9D)', color: 'white', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all .2s', boxShadow: '0 4px 18px rgba(108,99,255,0.40)' }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(108,99,255,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 18px rgba(108,99,255,0.40)'; }}
            >
              {isLast ? "Let's go! 🚀" : 'Next →'}
            </button>
          </div>

          {/* Skip */}
          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            <button onClick={() => dismiss()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--muted2)', fontFamily: 'var(--font-body)', transition: 'color .2s' }}
              onMouseEnter={e => e.currentTarget.style.color='var(--muted)'}
              onMouseLeave={e => e.currentTarget.style.color='var(--muted2)'}
            >
              Skip tour
            </button>
          </div>
        </div>
      </div>
    </>
  );
}