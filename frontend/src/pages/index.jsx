import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTheme } from '../lib/ThemeContext';

const FEATURES = [
  {
    icon: '📁',
    title: 'Upload Any CSV',
    desc: 'Drop any CSV or Excel file — it becomes a fully queryable SQLite database in under 2 seconds. No config, no schema setup.',
    color: '#6C63FF', bg: 'rgba(108,99,255,0.10)', border: 'rgba(108,99,255,0.22)',
  },
  {
    icon: '✦',
    title: 'Ask in Plain English',
    desc: 'Type any business question naturally. Our AI converts it to precise SQL and picks the best chart type automatically.',
    color: '#FF6B9D', bg: 'rgba(255,107,157,0.10)', border: 'rgba(255,107,157,0.22)',
  },
  {
    icon: '📊',
    title: 'Instant Dashboards',
    desc: 'Get beautiful interactive charts — bar, line, pie, area, scatter — rendered instantly with AI-generated insights.',
    color: '#00D4AA', bg: 'rgba(0,212,170,0.10)', border: 'rgba(0,212,170,0.22)',
  },
  {
    icon: '🔒',
    title: 'Secure & Private',
    desc: 'Your data stays in your session only. Firebase auth keeps your account secure. Nothing is stored permanently.',
    color: '#FF9F43', bg: 'rgba(255,159,67,0.10)', border: 'rgba(255,159,67,0.22)',
  },
  {
    icon: '⚡',
    title: 'Lightning Fast',
    desc: 'SQL runs locally in your browser via SQLite. No round trips for data — just instant query results.',
    color: '#4ECDC4', bg: 'rgba(78,205,196,0.10)', border: 'rgba(78,205,196,0.22)',
  },
  {
    icon: '🔄',
    title: 'Conversational',
    desc: 'Follow-up queries retain full context. Refine, filter, and explore your data through natural conversation.',
    color: '#A29BFE', bg: 'rgba(162,155,254,0.10)', border: 'rgba(162,155,254,0.22)',
  },
];

const STEPS = [
  { n: '01', title: 'Sign Up Free',     desc: 'Create your account in seconds with email or Google.',           icon: '👤' },
  { n: '02', title: 'Upload Your Data', desc: 'Drop any CSV or Excel file — any schema, any size up to 15MB.', icon: '📁' },
  { n: '03', title: 'Ask Questions',    desc: 'Type natural language questions about your data.',               icon: '💬' },
  { n: '04', title: 'Get Insights',     desc: 'Receive beautiful charts and AI-generated business insights.',   icon: '📊' },
];

const STATS = [
  { value: '55K+', label: 'Rows processed',     color: '#6C63FF' },
  { value: '< 2s', label: 'Average query time',  color: '#FF6B9D' },
  { value: '6',    label: 'Chart types',          color: '#00D4AA' },
  { value: '100%', label: 'Private & secure',     color: '#FF9F43' },
];

const SAMPLE_QUERIES = [
  'Show monthly revenue as a line chart',
  'Top 5 customers by total order value',
  'Revenue distribution by category — pie chart',
  'Compare sales by region as a bar chart',
  'Show year-over-year growth trend',
  'Average order value by product segment',
];

export default function Landing() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [user, setUser]         = useState(null);
  const [queryIdx, setQueryIdx] = useState(0);
  const [typed, setTyped]       = useState('');
  const [scrollY, setScrollY]   = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Typewriter
  useEffect(() => {
    let timer;
    let charIdx = 0;
    let deleting = false;
    const phrase = SAMPLE_QUERIES[queryIdx];
    const tick = () => {
      if (!deleting) {
        charIdx++;
        setTyped(phrase.slice(0, charIdx));
        if (charIdx === phrase.length) { deleting = true; timer = setTimeout(tick, 2000); return; }
      } else {
        charIdx--;
        setTyped(phrase.slice(0, charIdx));
        if (charIdx === 0) { deleting = false; setQueryIdx(i => (i + 1) % SAMPLE_QUERIES.length); }
      }
      timer = setTimeout(tick, deleting ? 18 : 44);
    };
    timer = setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, [queryIdx]);

  return (
    <>
      <Head>
        <title>DataMind — AI-Powered BI Dashboard</title>
        <meta name="description" content="Upload any CSV and ask questions in plain English. Get instant interactive charts powered by AI." />
      </Head>

      <div className="bg-orbs">
        <div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" /><div className="bg-orb bg-orb-4" />
      </div>
      <div className="bg-grid" />

      <div className="page-wrap" style={{ minHeight: '100vh' }}>

        {/* ── NAV ── */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 48px', height: '68px',
          background: scrollY > 20 ? 'var(--header-bg)' : 'var(--header-bg-top)',
          backdropFilter: 'blur(28px)',
          borderBottom: `1px solid ${scrollY > 20 ? 'var(--header-border)' : 'var(--border)'}`,
          transition: 'all .3s',
        }}>
          <div style={{
            fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '22px',
            background: 'linear-gradient(135deg,#6C63FF,#FF6B9D,#00D4AA)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            cursor: 'pointer',
          }} onClick={() => router.push('/')}>
            ◈ DataMind
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Theme toggle */}
            <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
              {isDark ? '☀️' : '🌙'}
            </button>

            {user ? (
              <button className="btn btn-primary btn-sm" onClick={() => router.push('/dashboard')}>
                Go to Dashboard →
              </button>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => router.push('/auth')}>Sign In</button>
                <button className="btn btn-primary btn-sm" onClick={() => router.push('/auth')}>Get Started Free →</button>
              </>
            )}
          </div>
        </nav>

        {/* ── HERO ── */}
        <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '100px 28px 80px', textAlign: 'center' }}>
          <div className="anim-fade-up" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '7px 20px', borderRadius: '100px',
            background: 'rgba(108,99,255,0.10)', border: '1px solid rgba(108,99,255,0.24)',
            fontSize: '12px', color: 'var(--c6)', marginBottom: '28px',
          }}>
            <div className="pulse-dot" style={{ width: '6px', height: '6px' }} />
            AI-Powered Business Intelligence — No SQL Required
          </div>

          <h1 className="anim-fade-up anim-delay-1" style={{
            fontFamily: 'var(--font-head)', fontWeight: 800,
            fontSize: 'clamp(40px,6vw,72px)', lineHeight: 1.08,
            color: 'var(--text)',
            marginBottom: '24px', letterSpacing: '-0.03em',
          }}>
            Turn your CSV into{' '}
            <span style={{
              background: 'linear-gradient(135deg,#6C63FF,#FF3CAC,#FF6B9D)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>instant insights</span>
          </h1>

          <p className="anim-fade-up anim-delay-2" style={{
            fontSize: 'clamp(16px,2vw,20px)', color: 'var(--muted)',
            maxWidth: '580px', margin: '0 auto 40px', lineHeight: 1.75,
          }}>
            Upload any data file, ask questions in plain English, and get beautiful interactive dashboards in seconds — powered by AI.
          </p>

          <div className="anim-fade-up anim-delay-3" style={{
            display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '64px',
          }}>
            <button className="btn btn-primary btn-lg" onClick={() => router.push('/auth')} style={{ fontSize: '16px', padding: '16px 36px' }}>
              ✦ Start for Free
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })} style={{ fontSize: '16px', padding: '16px 36px' }}>
              See How It Works ↓
            </button>
          </div>

          {/* Animated query bar mockup */}
          <div className="anim-fade-up anim-delay-4" style={{
            maxWidth: '700px', margin: '0 auto',
            background: 'var(--glass)',
            border: '1px solid rgba(108,99,255,0.30)',
            borderRadius: '22px', padding: '18px 20px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 80px rgba(108,99,255,0.12)',
            display: 'flex', alignItems: 'center', gap: '14px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
              background: 'linear-gradient(135deg,#6C63FF,#FF6B9D)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', boxShadow: '0 0 20px rgba(108,99,255,0.45)',
            }}>✦</div>
            <div style={{
              flex: 1, textAlign: 'left',
              fontSize: '15px', color: 'var(--text)',
              fontFamily: 'var(--font-body)', minHeight: '24px',
            }}>
              {typed}
              <span style={{
                display: 'inline-block', width: '2px', height: '16px',
                background: 'var(--c1)', marginLeft: '2px', verticalAlign: 'middle',
                animation: 'pulse 1s ease-in-out infinite',
              }} />
            </div>
            <div style={{
              background: 'linear-gradient(135deg,#6C63FF,#FF6B9D)',
              borderRadius: '11px', padding: '10px 20px',
              fontSize: '13px', fontWeight: 600, color: 'white', flexShrink: 0,
            }}>Generate →</div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '0 28px 80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '16px' }}>
            {STATS.map(({ value, label, color }) => (
              <div key={label} className="anim-fade-up" style={{
                padding: '24px 20px', borderRadius: '20px', textAlign: 'center',
                background: 'var(--glass)',
                border: '1px solid var(--border)',
                transition: 'transform .2s, border-color .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--border2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '36px', color, marginBottom: '6px' }}>{value}</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 28px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div className="section-label">How It Works</div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(28px,4vw,42px)', marginBottom: '14px', color: 'var(--text)' }}>
              From CSV to dashboard{' '}
              <span style={{ background: 'linear-gradient(135deg,#00D4AA,#4ECDC4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                in 4 steps
              </span>
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--muted)', maxWidth: '460px', margin: '0 auto' }}>
              No SQL knowledge needed. No configuration. Just upload and ask.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '20px' }}>
            {STEPS.map(({ n, title, desc, icon }, i) => (
              <div key={n} className="anim-fade-up" style={{
                padding: '28px 22px', borderRadius: '22px', position: 'relative',
                background: 'var(--glass)',
                border: '1px solid var(--border)',
                transition: 'transform .25s, border-color .25s, box-shadow .25s',
                animationDelay: `${i * 0.1}s`,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'rgba(108,99,255,0.35)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(108,99,255,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ position: 'absolute', top: '18px', right: '18px', fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '11px', color: 'var(--c1)', opacity: 0.5, letterSpacing: '0.05em' }}>{n}</div>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: 'linear-gradient(135deg,rgba(108,99,255,0.18),rgba(255,107,157,0.12))',
                  border: '1px solid rgba(108,99,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', marginBottom: '18px',
                }}>{icon}</div>
                <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '16px', marginBottom: '10px', color: 'var(--text)' }}>{title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '0 28px 100px' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div className="section-label">Features</div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(28px,4vw,42px)', marginBottom: '14px', color: 'var(--text)' }}>
              Everything you need to{' '}
              <span style={{ background: 'linear-gradient(135deg,#6C63FF,#FF6B9D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                understand your data
              </span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '18px' }}>
            {FEATURES.map(({ icon, title, desc, color, bg, border }, i) => (
              <div key={title} className="anim-fade-up" style={{
                padding: '26px', borderRadius: '20px',
                background: 'var(--glass)',
                border: '1px solid var(--border)',
                transition: 'transform .25s, border-color .25s',
                animationDelay: `${i * 0.08}s`,
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = border; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>{icon}</div>
                <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px', color, marginBottom: '8px' }}>{title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '0 28px 100px' }}>
          <div style={{
            padding: '64px 48px', borderRadius: '28px', textAlign: 'center',
            background: 'linear-gradient(135deg,rgba(108,99,255,0.14),rgba(255,107,157,0.08))',
            border: '1px solid rgba(108,99,255,0.24)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(#6C63FF,transparent 70%)', opacity: 0.12, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(#FF6B9D,transparent 70%)', opacity: 0.10, pointerEvents: 'none' }} />

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 18px', borderRadius: '100px',
              background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.26)',
              fontSize: '12px', color: 'var(--c6)', marginBottom: '22px',
            }}>
              <div className="pulse-dot" style={{ width: '6px', height: '6px' }} />
              Free to use · No credit card required
            </div>

            <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 'clamp(26px,4vw,42px)', marginBottom: '16px', lineHeight: 1.1, color: 'var(--text)' }}>
              Ready to unlock your{' '}
              <span style={{ background: 'linear-gradient(135deg,#6C63FF,#FF3CAC,#FF6B9D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                data's potential?
              </span>
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--muted)', marginBottom: '36px', maxWidth: '420px', margin: '0 auto 36px' }}>
              Start turning your spreadsheets into insights in under 60 seconds.
            </p>

            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-lg" onClick={() => router.push('/auth')} style={{ fontSize: '16px' }}>
                ✦ Get Started Free
              </button>
              {user && (
                <button className="btn btn-secondary btn-lg" onClick={() => router.push('/dashboard')} style={{ fontSize: '16px' }}>
                  Go to Dashboard →
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{
          borderTop: '1px solid var(--border)',
          padding: '32px 48px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '16px',
        }}>
          <div style={{
            fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '16px',
            background: 'linear-gradient(135deg,#6C63FF,#FF6B9D)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>◈ DataMind</div>

          <div style={{ display: 'flex', gap: '24px' }}>
            {[
              { l: 'Dashboard', p: '/dashboard' },
              { l: 'Upload',    p: '/upload' },
              { l: 'Profile',   p: '/profile' },
              { l: 'Sign In',   p: '/auth' },
            ].map(({ l, p }) => (
              <span key={l} onClick={() => router.push(p)} style={{ fontSize: '13px', color: 'var(--muted2)', cursor: 'pointer', transition: 'color .2s' }}
                onMouseEnter={e => e.target.style.color = 'var(--text)'}
                onMouseLeave={e => e.target.style.color = 'var(--muted2)'}
              >{l}</span>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'} style={{ width: '32px', height: '32px', fontSize: '14px' }}>
              {isDark ? '☀️' : '🌙'}
            </button>
            <span style={{ fontSize: '12px', color: 'var(--muted2)' }}>
              © {new Date().getFullYear()} DataMind. Built with ✦
            </span>
          </div>
        </footer>

      </div>
    </>
  );
}