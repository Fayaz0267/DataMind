import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useTheme } from '../../lib/ThemeContext';
import LogoutModal from './LogoutModal';

export default function Header({ user: userProp }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled]         = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [currentUser, setCurrentUser]   = useState(userProp || null);
  const [showLogout, setShowLogout]     = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser({
          uid:    firebaseUser.uid,
          name:   firebaseUser.displayName || userProp?.name || 'User',
          email:  firebaseUser.email,
          avatar: firebaseUser.photoURL || null,
        });
      } else if (userProp) {
        setCurrentUser(userProp);
      }
    });
    return () => unsub();
  }, [userProp]);

  const handleSignOut = async () => {
    await signOut(auth);
    localStorage.clear();
    sessionStorage.clear();
    router.push('/auth');
  };

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '◈';

  const navLinks = [
    { l: 'Dashboard',   p: '/dashboard' },
    { l: 'Upload Data', p: '/upload' },
    { l: 'Profile',     p: '/profile' },
  ];

  const isDark = theme === 'dark';

  return (
    <>
      {showLogout && (
        <LogoutModal
          onConfirm={handleSignOut}
          onCancel={() => setShowLogout(false)}
        />
      )}

      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: '68px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 36px',
        background: scrolled ? 'var(--header-bg)' : 'var(--header-bg-top)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderBottom: `1px solid ${scrolled ? 'var(--header-border)' : 'var(--border)'}`,
        transition: 'all .3s',
        fontFamily: 'var(--font-body)',
      }}>

        {/* Logo */}
        <div onClick={() => router.push('/')} style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '20px', background: 'linear-gradient(135deg,#6C63FF,#FF6B9D,#00D4AA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', cursor: 'pointer', userSelect: 'none', letterSpacing: '-0.02em' }}>
          ◈ DataMind
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {navLinks.map(({ l, p }) => (
            <a key={l} onClick={e => { e.preventDefault(); router.push(p); }} href={p}
              style={{ color: router.pathname === p ? 'var(--text)' : 'var(--muted)', fontSize: '14px', fontWeight: router.pathname === p ? 500 : 400, textDecoration: 'none', cursor: 'pointer', padding: '6px 14px', borderRadius: '10px', background: router.pathname === p ? 'rgba(108,99,255,0.12)' : 'transparent', border: router.pathname === p ? '1px solid rgba(108,99,255,0.22)' : '1px solid transparent', transition: 'all .2s' }}
              onMouseEnter={e => { if (router.pathname !== p) { e.target.style.color='var(--text)'; e.target.style.background='var(--glass2)'; }}}
              onMouseLeave={e => { if (router.pathname !== p) { e.target.style.color='var(--muted)'; e.target.style.background='transparent'; }}}
            >{l}</a>
          ))}
        </nav>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Live pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 14px', background: 'rgba(0,212,170,0.09)', border: '1px solid rgba(0,212,170,0.20)', borderRadius: '100px' }}>
            <div className="pulse-dot" />
            <span style={{ fontSize: '11px', color: 'var(--c3)', fontWeight: 500 }}>Live</span>
          </div>

          {/* Theme toggle */}
          <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'}>
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* New Query */}
          <button onClick={() => router.push('/upload')} className="btn btn-primary btn-sm" style={{ fontSize: '13px', padding: '9px 18px' }}>
            ✦ New Query
          </button>

          {/* Avatar dropdown */}
          <div style={{ position: 'relative' }}>
            <div onClick={() => setMenuOpen(p => !p)}
              style={{ width: '38px', height: '38px', borderRadius: '12px', background: currentUser?.avatar ? 'transparent' : 'linear-gradient(135deg,#6C63FF,#FF6B9D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: 'var(--font-head)', userSelect: 'none', overflow: 'hidden', transition: 'transform .15s, box-shadow .2s', transform: menuOpen ? 'scale(0.92)' : 'scale(1)', boxShadow: menuOpen ? '0 0 24px rgba(108,99,255,0.5)' : '0 4px 14px rgba(108,99,255,0.30)' }}
            >
              {currentUser?.avatar
                ? <img src={currentUser.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials
              }
            </div>

            {menuOpen && (
              <div onMouseLeave={() => setMenuOpen(false)}
                style={{ position: 'absolute', top: 'calc(100% + 12px)', right: 0, minWidth: '220px', background: 'var(--dropdown-bg)', backdropFilter: 'blur(24px)', border: '1px solid var(--border2)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-deep)', zIndex: 200, animation: 'scaleIn .15s ease' }}
              >
                {/* User info */}
                {currentUser && (
                  <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', background: 'rgba(108,99,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0, background: currentUser.avatar ? 'transparent' : 'linear-gradient(135deg,#6C63FF,#FF6B9D)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white' }}>
                      {currentUser.avatar ? <img src={currentUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-head)' }}>{currentUser.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted2)' }}>{currentUser.email}</div>
                    </div>
                  </div>
                )}

                {/* Theme toggle */}
                <div onClick={() => { toggleTheme(); setMenuOpen(false); }}
                  style={{ padding: '12px 18px', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all .15s', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.background='var(--glass2)'; e.currentTarget.style.color='var(--text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--muted)'; }}
                >
                  <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--glass2)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>{isDark ? '☀️' : '🌙'}</span>
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </div>

                {/* Nav items */}
                {[
                  { icon: '📊', label: 'Dashboard',  to: '/dashboard' },
                  { icon: '📁', label: 'Upload Data', to: '/upload' },
                  { icon: '👤', label: 'Profile',     to: '/profile' },
                ].map(item => (
                  <div key={item.label} onClick={() => { setMenuOpen(false); router.push(item.to); }}
                    style={{ padding: '12px 18px', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all .15s', borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.background='var(--glass2)'; e.currentTarget.style.color='var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--muted)'; }}
                  >
                    <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
                    {item.label}
                  </div>
                ))}

                {/* Sign out — triggers modal */}
                <div onClick={() => { setMenuOpen(false); setShowLogout(true); }}
                  style={{ padding: '12px 18px', fontSize: '13px', color: 'rgba(255,107,157,0.80)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,107,157,0.08)'; e.currentTarget.style.color='#FF6B9D'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,107,157,0.80)'; }}
                >
                  <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,107,157,0.10)', border: '1px solid rgba(255,107,157,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>⎋</span>
                  Sign Out
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}