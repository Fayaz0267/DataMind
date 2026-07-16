// pages/auth.jsx
import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

export default function Auth() {
  const router = useRouter();
  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]     = useState('');

  const saveUserToFirestore = async (user, extraName = '') => {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid:       user.uid,
        name:      user.displayName || extraName || email.split('@')[0],
        email:     user.email,
        avatar:    user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || extraName)}`,
        createdAt: serverTimestamp(),
        totalQueries: 0,
        totalCharts:  0,
        lastActive:   serverTimestamp(),
      });
    } else {
      await setDoc(ref, { lastActive: serverTimestamp() }, { merge: true });
    }
  };

  const storeSession = async (user) => {
    const token = await user.getIdToken();
    localStorage.setItem('dm_token', token);
    localStorage.setItem('dm_user', JSON.stringify({
      uid:   user.uid,
      name:  user.displayName || name || email.split('@')[0],
      email: user.email,
      avatar: user.photoURL,
    }));
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      let userCred;
      if (mode === 'register') {
        userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
      } else {
        userCred = await signInWithEmailAndPassword(auth, email, password);
      }
      await saveUserToFirestore(userCred.user, name);
      await storeSession(userCred.user);
      router.push('/upload');
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true); setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await saveUserToFirestore(result.user);
      await storeSession(result.user);
      router.push('/upload');
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <Head><title>DataMind — {mode === 'login' ? 'Sign In' : 'Create Account'}</title></Head>

      <div className="bg-orbs">
        <div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" /><div className="bg-orb bg-orb-4" />
      </div>
      <div className="bg-grid" />

      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', position: 'relative', zIndex: 1,
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{
              fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '28px',
              background: 'linear-gradient(135deg,#6C63FF,#FF6B9D,#00D4AA)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              marginBottom: '8px',
            }}>◈ DataMind</div>
            <p style={{ fontSize: '14px', color: 'rgba(240,240,255,0.45)' }}>
              {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '24px', padding: '36px',
            backdropFilter: 'blur(20px)',
          }}>

            {/* Mode toggle */}
            <div style={{
              display: 'flex', background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px', padding: '4px', marginBottom: '28px',
            }}>
              {['login', 'register'].map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  style={{
                    flex: 1, padding: '9px', borderRadius: '9px', border: 'none',
                    background: mode === m ? 'rgba(108,99,255,0.25)' : 'transparent',
                    color: mode === m ? '#A29BFE' : 'rgba(240,240,255,0.40)',
                    fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '13px',
                    cursor: 'pointer', transition: 'all .2s',
                    borderColor: mode === m ? 'rgba(108,99,255,0.35)' : 'transparent',
                  }}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Google button */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#F0F0FF', fontFamily: 'var(--font-body)',
                fontSize: '14px', fontWeight: 500,
                cursor: googleLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                transition: 'all .2s', marginBottom: '20px',
                opacity: googleLoading ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!googleLoading) e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            >
              {googleLoading ? '⏳' : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: '12px', color: 'rgba(240,240,255,0.30)' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Form */}
            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {mode === 'register' && (
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(240,240,255,0.45)', marginBottom: '6px', display: 'block' }}>Full Name</label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Your name" required
                    className="input-field"
                  />
                </div>
              )}
              <div>
                <label style={{ fontSize: '12px', color: 'rgba(240,240,255,0.45)', marginBottom: '6px', display: 'block' }}>Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="input-field"
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'rgba(240,240,255,0.45)', marginBottom: '6px', display: 'block' }}>Password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  className="input-field"
                />
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(255,107,157,0.10)', border: '1px solid rgba(255,107,157,0.24)',
                  fontSize: '13px', color: '#FF6B9D',
                }}>
                  ⚠ {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? '⏳ Please wait...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

function friendlyError(code) {
  const map = {
    'auth/user-not-found':       'No account found with this email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/email-already-in-use': 'Email already registered. Try signing in.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/invalid-email':        'Invalid email address.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/invalid-credential':   'Invalid email or password.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}