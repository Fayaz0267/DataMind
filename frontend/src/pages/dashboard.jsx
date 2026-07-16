import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, orderBy, query as fsQuery, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import Header from '../components/ui/Header';
import QueryInput from '../components/ui/QueryInput';
import DashboardCard from '../components/dashboard/DashboardCard';
import DashboardSkeleton from '../components/ui/DashboardSkeleton';
import HistoryPanel from '../components/ui/HistoryPanel';
import OnboardingTour from '../components/ui/OnboardingTour';
import ClarificationCard from '../components/ui/ClarificationCard';
import { submitQuery, getErrorMessage } from '../lib/api';

const STARTER_QUERIES = [
  'Show me monthly revenue as a line chart',
  'Which region has the highest total sales?',
  'Revenue by product category — pie chart',
  'Top 5 performing sales reps',
  'Show year-over-year growth as a bar chart',
  'Average order value by region',
];

const LOADING_PHRASES = [
  'Thinking...', 'Generating SQL...', 'Fetching data...', 'Rendering chart...', 'Almost done...',
];

// Chat bubble for conversational responses
function ChatBubble({ message, query, onDismiss }) {
  // Convert **bold** markdown to styled spans
  const formatMessage = (text) => {
    if (!text) return text;
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1
        ? <strong key={i} style={{ color: 'var(--text)', fontWeight: 600 }}>{part}</strong>
        : part.split('\n').map((line, j, arr) => (
            <span key={j}>{line}{j < arr.length - 1 ? <br /> : null}</span>
          ))
    );
  };

  return (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', animation: 'fadeUp .35s ease' }}>
      {/* Avatar */}
      <div style={{ width: '36px', height: '36px', borderRadius: '11px', flexShrink: 0, background: 'linear-gradient(135deg,#6C63FF,#FF6B9D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', boxShadow: '0 4px 12px rgba(108,99,255,0.30)' }}>✦</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Query echo */}
        <div style={{ fontSize: '11px', color: 'var(--muted2)', marginBottom: '6px' }}>You asked: "{query}"</div>
        {/* Message bubble */}
        <div style={{
          padding: '14px 18px',
          background: 'var(--glass)',
          border: '1px solid rgba(108,99,255,0.18)',
          borderRadius: '4px 18px 18px 18px',
          fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7,
          position: 'relative',
        }}>
          {formatMessage(message)}
          {/* Dismiss */}
          {onDismiss && (
            <button onClick={onDismiss} style={{ position: 'absolute', top: '10px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: '14px', lineHeight: 1, opacity: 0.6 }}
              onMouseEnter={e => e.currentTarget.style.opacity='1'}
              onMouseLeave={e => e.currentTarget.style.opacity='0.6'}
            >✕</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router    = useRouter();
  const resultRef = useRef(null);

  const [querying, setQuerying]                 = useState(false);
  const [items, setItems]                       = useState([]); // { id, type: 'chat'|'data', ... }
  const [history, setHistory]                   = useState([]);
  const [error, setError]                       = useState('');
  const [errorHint, setErrorHint]               = useState('');
  const [errorSuggestions, setErrorSuggestions] = useState([]);
  const [clarification, setClarification]       = useState(null);
  const [fileName, setFileName]                 = useState('');
  const [user, setUser]                         = useState(null);
  const [loadingPhrase, setLoadingPhrase]       = useState('');
  const [pinnedCharts, setPinnedCharts]         = useState([]);
  const [showPinned, setShowPinned]             = useState(true);
  const [showTour, setShowTour]                 = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { router.replace('/auth'); return; }
      setUser({ uid: firebaseUser.uid, name: firebaseUser.displayName || 'User', email: firebaseUser.email, avatar: firebaseUser.photoURL });
      try {
        const q    = fsQuery(collection(db, 'users', firebaseUser.uid, 'pinnedCharts'), orderBy('pinnedAt', 'desc'));
        const snap = await getDocs(q);
        setPinnedCharts(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      } catch (_) {}
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists() && !userDoc.data().onboardingDone) setTimeout(() => setShowTour(true), 800);
      } catch (_) {}
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const file = sessionStorage.getItem('dm_uploaded_file') || '';
    setFileName(file);
    if (file) {
      try { const r = sessionStorage.getItem('dm_items'); if (r) setItems(JSON.parse(r)); } catch {}
      try { const h = sessionStorage.getItem('dm_history'); if (h) setHistory(JSON.parse(h)); } catch {}
    }
  }, []);

  useEffect(() => { if (items.length) sessionStorage.setItem('dm_items', JSON.stringify(items)); }, [items]);
  useEffect(() => { if (history.length) sessionStorage.setItem('dm_history', JSON.stringify(history)); }, [history]);

  const query = useCallback(async (q) => {
    setQuerying(true);
    setError(''); setErrorHint(''); setErrorSuggestions([]);
    setClarification(null);
    let idx = 0;
    setLoadingPhrase(LOADING_PHRASES[0]);
    const phraseTimer = setInterval(() => {
      idx = (idx + 1) % LOADING_PHRASES.length;
      setLoadingPhrase(LOADING_PHRASES[idx]);
    }, 700);

    try {
      const result = await submitQuery(q, history);

      // ── Chat / conversational response ──
      if (result.type === 'chat' && result.message) {
        const item = { id: Date.now(), type: 'chat', message: result.message, query: q };
        setItems(p => [item, ...p]);
        setHistory(p => [...p, { role: 'user', query: q, content: q }, { role: 'assistant', content: result.message }]);
        clearInterval(phraseTimer); setQuerying(false);
        return;
      }

      // ── Clarification needed ──
      if (result.needsClarification) {
        setClarification({ question: result.question, options: result.options, originalQuery: q });
        clearInterval(phraseTimer); setQuerying(false);
        return;
      }

      // ── Cannot answer ──
      if (result.canAnswer === false) {
        setError(result.reason || "I couldn't answer that based on the available data.");
        setErrorHint(result.hint || '');
        setErrorSuggestions(result.suggestions || []);
        clearInterval(phraseTimer); setQuerying(false);
        return;
      }

      // ── Data / chart response ──
      const item = { id: Date.now(), type: 'data', query: q, ...result, timestamp: new Date().toISOString() };
      setItems(p => [item, ...p]);
      setHistory(p => [...p, { role: 'user', query: q, content: q, result, timestamp: item.timestamp }]);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      clearInterval(phraseTimer);
      setQuerying(false);
    }
  }, [history]);

  const dismissItem = useCallback((id) => {
    setItems(p => { const u = p.filter(r => r.id !== id); sessionStorage.setItem('dm_items', JSON.stringify(u)); return u; });
  }, []);

  const clearAll = () => {
    setItems([]); setHistory([]);
    sessionStorage.removeItem('dm_items');
    sessionStorage.removeItem('dm_history');
  };

  const handlePinChange = useCallback((action, pinId, pinData) => {
    if (action === 'pin') setPinnedCharts(p => [{ ...pinData, id: pinId }, ...p]);
    else setPinnedCharts(p => p.filter(c => c.id !== pinId));
  }, []);

  const unpinChart = async (pinId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try { await deleteDoc(doc(db, 'users', uid, 'pinnedCharts', pinId)); setPinnedCharts(p => p.filter(c => c.id !== pinId)); }
    catch (err) { console.error('Unpin error:', err); }
  };

  const greetName = user?.name?.split(' ')[0] || 'there';
  const dataItems = items.filter(i => i.type === 'data');

  return (
    <>
      <Head><title>{fileName ? `DataMind — ${fileName}` : 'DataMind — Dashboard'}</title></Head>
      <div className="bg-orbs"><div className="bg-orb bg-orb-1"/><div className="bg-orb bg-orb-2"/><div className="bg-orb bg-orb-3"/><div className="bg-orb bg-orb-4"/></div>
      <div className="bg-grid"/>
      {showTour && <OnboardingTour onComplete={() => setShowTour(false)}/>}

      <div className="page-wrap" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header user={user}/>

        <main style={{ flex: 1, maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '40px 28px 100px' }}>

          {/* Page header */}
          <div className="anim-fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '24px', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text)' }}>
                {fileName
                  ? <>📁 <span style={{ maxWidth: '500px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span></>
                  : <>✦ <span style={{ background: 'linear-gradient(135deg,#6C63FF,#FF6B9D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Dashboard</span></>
                }
              </h2>
              <p style={{ fontSize: '13px', margin: 0, color: 'var(--muted2)' }}>
                {dataItems.length > 0 ? `${dataItems.length} chart${dataItems.length > 1 ? 's' : ''} generated · Good morning, ${greetName} 👋` : `Ready to query · Good morning, ${greetName} 👋`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-ghost" onClick={() => setShowTour(true)}>? Tour</button>
              <button className="btn btn-ghost" onClick={() => router.push('/upload')}>← New Upload</button>
              {items.length > 0 && <button className="btn btn-ghost" onClick={clearAll}>Clear All</button>}
            </div>
          </div>

          {/* Query bar */}
          <div id="query-input" className="anim-fade-up anim-delay-1" style={{ marginBottom: '28px' }}>
            <QueryInput onSubmit={query} isLoading={querying} disabled={false}/>
          </div>

          {/* Loading */}
          {querying && (
            <div style={{ marginBottom: '20px' }}>
              <div className="loading-bar"><div className="loading-fill"/></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px', color: 'var(--muted2)' }}>
                {[0,1,2].map(i => <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--c1)', animation: `pulse 1.2s ${i*0.2}s ease-in-out infinite` }}/>)}
                {loadingPhrase}
              </div>
            </div>
          )}

          {/* Clarification */}
          {clarification && (
            <div style={{ marginBottom: '24px' }}>
              <ClarificationCard question={clarification.question} options={clarification.options} originalQuery={clarification.originalQuery}
                onSelect={(option) => { setClarification(null); query(option); }}
                onDismiss={() => setClarification(null)}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginBottom: '20px', animation: 'fadeUp .3s ease' }}>
              <div style={{ padding: '14px 20px', background: 'rgba(255,107,157,0.09)', border: '1px solid rgba(255,107,157,0.24)', borderRadius: errorHint ? '14px 14px 0 0' : '14px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: 'var(--c2)' }}>
                <span>⚠</span><span style={{ flex: 1 }}>{error}</span>
                <button onClick={() => { setError(''); setErrorHint(''); setErrorSuggestions([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: '18px' }}>✕</button>
              </div>
              {errorHint && (
                <div style={{ padding: '16px 20px', background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.18)', borderTop: 'none', borderRadius: errorSuggestions.length ? '0' : '0 0 14px 14px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.7 }}>
                    {errorHint.split('\n').map((line, i) => (
                      <span key={i}>{line.startsWith('•') ? <span style={{ color: 'var(--c6)' }}>{line}</span> : line.startsWith('Did you mean') ? <span style={{ color: '#FF9F43', fontWeight: 500 }}>{line}</span> : line}<br/></span>
                    ))}
                  </p>
                </div>
              )}
              {errorSuggestions.length > 0 && (
                <div style={{ padding: '14px 20px', background: 'rgba(108,99,255,0.04)', border: '1px solid rgba(108,99,255,0.18)', borderTop: 'none', borderRadius: '0 0 14px 14px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--muted2)', marginBottom: '10px' }}>💡 Try these queries with your data:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {errorSuggestions.map(s => (
                      <button key={s} onClick={() => { setError(''); setErrorHint(''); setErrorSuggestions([]); query(s); }} className="chip" style={{ fontSize: '12px' }}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {querying && <div style={{ marginBottom: '22px' }}><DashboardSkeleton/></div>}

          {/* Pinned */}
          {pinnedCharts.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <div onClick={() => setShowPinned(p => !p)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPinned ? '16px' : '0', cursor: 'pointer', userSelect: 'none', padding: '14px 18px', borderRadius: '14px', background: 'rgba(255,159,67,0.07)', border: '1px solid rgba(255,159,67,0.20)', transition: 'background .2s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,159,67,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,159,67,0.07)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📌</span>
                  <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', color: '#FF9F43' }}>Pinned Charts</span>
                  <span style={{ background: 'rgba(255,159,67,0.15)', color: '#FF9F43', fontSize: '11px', padding: '2px 9px', borderRadius: '100px', fontWeight: 600 }}>{pinnedCharts.length}</span>
                </div>
                <span style={{ color: '#FF9F43', fontSize: '18px', transform: showPinned ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .2s' }}>⌄</span>
              </div>
              {showPinned && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {pinnedCharts.map(chart => (
                    <DashboardCard key={chart.id} result={chart} query={chart.query} onFollowUp={query} isPinned={true}
                      onPinChange={(action, pinId) => { if (action === 'unpin') unpinChart(pinId); }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── All items (chat bubbles + chart cards) ── */}
          <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
            {items.map(item => (
              item.type === 'chat'
                ? <ChatBubble key={item.id} message={item.message} query={item.query} onDismiss={() => dismissItem(item.id)}/>
                : <DashboardCard key={item.id} result={item} query={item.query} onFollowUp={query}
                    isPinned={pinnedCharts.some(p => p.query === item.query)}
                    onPinChange={handlePinChange}
                    onDismiss={() => dismissItem(item.id)}
                  />
            ))}
          </div>

          {/* Empty state */}
          {items.length === 0 && !querying && !clarification && pinnedCharts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '72px 24px', animation: 'fadeUp .5s ease' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '22px', margin: '0 auto 28px', background: 'linear-gradient(135deg,rgba(108,99,255,0.16),rgba(255,107,157,0.12))', border: '1px solid rgba(108,99,255,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '34px', animation: 'glow 3s ease-in-out infinite' }}>✦</div>
              <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '24px', marginBottom: '12px', color: 'var(--text)' }}>Ask your first question</h3>
              <p style={{ fontSize: '15px', maxWidth: '420px', margin: '0 auto 32px', lineHeight: 1.75, color: 'var(--muted)' }}>
                Type any question — data analysis or just say hi! 👋
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                {STARTER_QUERIES.map(q => <button key={q} className="chip" onClick={() => query(q)}>{q}</button>)}
              </div>
            </div>
          )}

          {history.length > 0 && <HistoryPanel history={history} onRerun={query} onClear={clearAll}/>}
        </main>
      </div>

      <style>{`
        @keyframes glow { 0%,100%{box-shadow:0 0 30px rgba(108,99,255,0.20)} 50%{box-shadow:0 0 60px rgba(108,99,255,0.45)} }
      `}</style>
    </>
  );
}