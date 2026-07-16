import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import Header from '../components/ui/Header';
import { uploadCSV, getErrorMessage, getSessionId, resetSession } from '../lib/api';

function Step({ n, label, done, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0, background: done ? 'linear-gradient(135deg,#6C63FF,#FF6B9D)' : active ? 'rgba(108,99,255,0.18)' : 'var(--glass2)', border: active ? '1px solid rgba(108,99,255,0.42)' : done ? 'none' : '1px solid var(--border)', color: done ? 'white' : active ? '#A29BFE' : 'var(--muted2)', fontFamily: 'var(--font-head)', boxShadow: done ? '0 0 16px rgba(108,99,255,0.40)' : active ? '0 0 10px rgba(108,99,255,0.20)' : 'none', transition: 'all .3s' }}>
        {done ? '✓' : n}
      </div>
      <span style={{ fontSize: '13px', fontWeight: 500, color: done ? 'var(--muted)' : active ? 'var(--text)' : 'var(--muted2)', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

function Connector({ active }) {
  return <div style={{ width: '48px', height: '2px', borderRadius: '1px', background: active ? 'linear-gradient(90deg,#6C63FF,#FF6B9D)' : 'var(--border2)', transition: 'background .4s' }} />;
}

export default function Upload() {
  const router = useRouter();
  const [user, setUser]               = useState(null);
  const [files, setFiles]             = useState([]); // { name, status: 'pending'|'uploading'|'done'|'error', error, sessionId }
  const [activeSession, setActiveSession] = useState(null); // { sessionId, fileName }
  const [dragging, setDragging]       = useState(false);
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) { router.replace('/auth'); return; }
      setUser({ uid: firebaseUser.uid, name: firebaseUser.displayName, email: firebaseUser.email, avatar: firebaseUser.photoURL });
    });
    return () => unsub();
  }, []);

  // Restore active session if any
  useEffect(() => {
    const savedFile = sessionStorage.getItem('dm_uploaded_file');
    const savedSession = sessionStorage.getItem('dm_session_id');
    if (savedFile && savedSession) {
      setActiveSession({ sessionId: savedSession, fileName: savedFile });
    }
  }, []);

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f =>
      f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );
    if (!valid.length) { setGlobalError('Only CSV and Excel files are supported.'); return; }
    setGlobalError('');
    setFiles(prev => [
      ...prev,
      ...valid.map(f => ({ file: f, name: f.name, status: 'pending', error: '', sessionId: null }))
    ]);
  };

  const uploadFile = async (index) => {
    const entry = files[index];
    if (!entry || entry.status === 'uploading' || entry.status === 'done') return;

    // Generate new session for this file
    resetSession();
    const newSessionId = getSessionId();

    setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'uploading', error: '' } : f));

    try {
      await uploadCSV(entry.file);
      sessionStorage.setItem('dm_uploaded_file', entry.name);
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'done', sessionId: newSessionId } : f));
      setActiveSession({ sessionId: newSessionId, fileName: entry.name });
    } catch (err) {
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: 'error', error: getErrorMessage(err) } : f));
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const switchTo = (entry) => {
    sessionStorage.setItem('dm_uploaded_file', entry.fileName || entry.name);
    sessionStorage.setItem('dm_session_id', entry.sessionId);
    setActiveSession({ sessionId: entry.sessionId, fileName: entry.fileName || entry.name });
    router.push('/dashboard');
  };

  const uploadAll = async () => {
    const pending = files.map((f, i) => ({ ...f, index: i })).filter(f => f.status === 'pending');
    for (const f of pending) await uploadFile(f.index);
  };

  const STATUS_COLORS = { pending: 'var(--muted2)', uploading: '#A29BFE', done: '#00D4AA', error: '#FF6B9D' };
  const STATUS_ICONS  = { pending: '○', uploading: '⟳', done: '✓', error: '⚠' };

  return (
    <>
      <Head><title>DataMind — Upload Data</title></Head>
      <div className="bg-orbs"><div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" /><div className="bg-orb bg-orb-3" /><div className="bg-orb bg-orb-4" /></div>
      <div className="bg-grid" />

      <div className="page-wrap" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header user={user} />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px' }}>

          {/* Steps */}
          <div className="anim-fade-up" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '52px' }}>
            <Step n={1} label="Sign In"       done />
            <Connector active />
            <Step n={2} label="Upload Data"   active />
            <Connector />
            <Step n={3} label="Ask Questions" />
          </div>

          {/* Title */}
          <div className="anim-fade-up anim-delay-1" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 18px', borderRadius: '100px', background: 'rgba(108,99,255,0.10)', border: '1px solid rgba(108,99,255,0.22)', fontSize: '12px', color: 'var(--c1)', marginBottom: '20px' }}>
              <div className="pulse-dot" style={{ width: '6px', height: '6px' }} />
              Step 2 of 3
            </div>
            <h2 style={{ marginBottom: '14px', color: 'var(--text)' }}>
              Upload Your{' '}
              <span style={{ background: 'linear-gradient(135deg,#6C63FF,#FF6B9D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Data</span>
            </h2>
            <p style={{ fontSize: '16px', maxWidth: '460px', lineHeight: 1.75, margin: '0 auto', color: 'var(--muted)' }}>
              Upload one or multiple CSV/Excel files. Switch between them anytime on the dashboard.
            </p>
          </div>

          <div style={{ width: '100%', maxWidth: '760px' }}>

            {/* Active session banner */}
            {activeSession && (
              <div className="anim-fade-up" style={{ padding: '14px 20px', borderRadius: '14px', background: 'rgba(0,212,170,0.09)', border: '1px solid rgba(0,212,170,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>✓</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#00D4AA' }}>Active dataset</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted2)' }}>{activeSession.fileName}</div>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => router.push('/dashboard')}>
                  Go to Dashboard →
                </button>
              </div>
            )}

            {/* Drop zone */}
            <div
              onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => document.getElementById('file-input').click()}
              style={{ border: `2px dashed ${dragging ? 'var(--c1)' : 'var(--border2)'}`, borderRadius: '20px', padding: '48px 36px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(108,99,255,0.07)' : 'var(--glass)', transition: 'all .25s', transform: dragging ? 'scale(1.01)' : 'scale(1)', marginBottom: files.length ? '20px' : '0' }}
            >
              <input id="file-input" type="file" accept=".csv,.xlsx,.xls" multiple style={{ display: 'none' }} onChange={e => addFiles(e.target.files)} />
              <div style={{ width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 20px', background: 'linear-gradient(135deg,rgba(108,99,255,0.20),rgba(255,107,157,0.14))', border: '1px solid rgba(108,99,255,0.26)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', transition: 'transform .2s', transform: dragging ? 'scale(1.12) rotate(-5deg)' : 'scale(1)' }}>
                {dragging ? '📂' : '📁'}
              </div>
              <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '20px', color: 'var(--text)', marginBottom: '10px' }}>
                {dragging ? 'Drop files here!' : 'Drop your files here'}
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
                or <span style={{ color: 'var(--c6)', fontWeight: 500 }}>click to browse</span> — CSV & Excel supported, up to 15MB each
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {['.csv', '.xlsx', '.xls', 'Multiple files', 'Any schema'].map(t => (
                  <span key={t} style={{ fontSize: '12px', padding: '4px 14px', background: 'var(--glass2)', border: '1px solid var(--border)', borderRadius: '100px', color: 'var(--muted)' }}>{t}</span>
                ))}
              </div>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div style={{ borderRadius: '18px', border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--glass)', marginBottom: '16px' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                    Files ({files.length})
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {files.some(f => f.status === 'pending') && (
                      <button onClick={uploadAll} className="btn btn-primary btn-sm">⬆ Upload All</button>
                    )}
                    {files.some(f => f.status === 'done') && (
                      <button onClick={() => router.push('/dashboard')} className="btn btn-ghost btn-sm">Dashboard →</button>
                    )}
                  </div>
                </div>
                {files.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderBottom: i < files.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--glass2)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >
                    {/* Icon */}
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: entry.status === 'done' ? 'rgba(0,212,170,0.12)' : entry.status === 'error' ? 'rgba(255,107,157,0.12)' : 'var(--glass2)', border: `1px solid ${entry.status === 'done' ? 'rgba(0,212,170,0.24)' : entry.status === 'error' ? 'rgba(255,107,157,0.24)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: STATUS_COLORS[entry.status], animation: entry.status === 'uploading' ? 'spin 1.5s linear infinite' : 'none' }}>
                      {STATUS_ICONS[entry.status]}
                    </div>

                    {/* Name + status */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{entry.name}</p>
                      <p style={{ fontSize: '11px', color: STATUS_COLORS[entry.status], margin: '2px 0 0', textTransform: 'capitalize' }}>
                        {entry.status === 'error' ? entry.error : entry.status}
                      </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {entry.status === 'pending' && (
                        <button onClick={() => uploadFile(i)} className="btn btn-primary btn-sm" style={{ fontSize: '12px', padding: '6px 14px' }}>Upload</button>
                      )}
                      {entry.status === 'done' && (
                        <button onClick={() => switchTo({ sessionId: entry.sessionId, fileName: entry.name })} className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }}>
                          {activeSession?.sessionId === entry.sessionId ? '✓ Active' : 'Switch to'}
                        </button>
                      )}
                      {entry.status === 'error' && (
                        <button onClick={() => setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'pending', error: '' } : f))} className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }}>Retry</button>
                      )}
                      {entry.status !== 'uploading' && (
                        <button onClick={() => removeFile(i)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--muted2)', fontSize: '13px', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,107,157,0.10)'; e.currentTarget.style.color='#FF6B9D'; e.currentTarget.style.borderColor='rgba(255,107,157,0.28)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--muted2)'; e.currentTarget.style.borderColor='var(--border)'; }}
                        >✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {globalError && (
              <div style={{ padding: '12px 18px', borderRadius: '12px', background: 'rgba(255,107,157,0.09)', border: '1px solid rgba(255,107,157,0.24)', fontSize: '13px', color: 'var(--c2)', marginBottom: '16px' }}>
                ⚠ {globalError}
              </div>
            )}

            {/* Info pills */}
            <div className="anim-fade-up anim-delay-3" style={{ display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { ic: '🔒', t: 'Session-only storage' },
                { ic: '⚡', t: 'Processed in under 2s' },
                { ic: '📂', t: 'Multiple files at once' },
                { ic: '🔄', t: 'Switch datasets anytime' },
              ].map(p => (
                <div key={p.t} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', background: 'var(--glass2)', border: '1px solid var(--border)', borderRadius: '100px', fontSize: '12px', color: 'var(--muted)' }}>
                  <span style={{ fontSize: '13px' }}>{p.ic}</span>{p.t}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}