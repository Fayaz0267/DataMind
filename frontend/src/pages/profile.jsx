import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import Header from '../components/ui/Header';
import ProfileEditModal from '../components/ui/ProfileEditModal';
import LogoutModal from '../components/ui/LogoutModal';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const CHART_COLORS_MAP = {
  bar: '#FF6B9D', line: '#6C63FF', pie: '#00D4AA',
  area: '#FF9F43', scatter: '#4ECDC4', table: '#A29BFE', donut: '#00D4AA',
};
const PIE_COLORS = ['#6C63FF','#FF6B9D','#00D4AA','#FF9F43','#4ECDC4','#A29BFE'];

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  });
}

function getLast30Days() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });
}

function formatLastActive(date) {
  if (!date) return 'Today';
  const now   = new Date();
  const diff  = Math.floor((now - date) / 1000); // seconds
  if (diff < 60)                  return 'Just now';
  if (diff < 3600)                return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)               return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 2)           return 'Yesterday';
  if (diff < 86400 * 7)           return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); // e.g. "18 Mar"
}

export default function Profile() {
  const router = useRouter();
  const [user, setUser]                   = useState(null);
  const [stats, setStats]                 = useState(null);
  const [history, setHistory]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [dailyData, setDailyData]         = useState([]);
  const [chartTypeData, setChartTypeData] = useState([]);
  const [heatmap, setHeatmap]             = useState({});
  const [showEdit, setShowEdit]           = useState(false);
  const [showLogout, setShowLogout]       = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { router.replace('/auth'); return; }

      const userDoc  = await getDoc(doc(db, 'users', firebaseUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      setUser({
        uid:         firebaseUser.uid,
        name:        firebaseUser.displayName || userData.name || 'User',
        email:       firebaseUser.email,
        avatar:      firebaseUser.photoURL || userData.avatar,
        avatarColor: userData.avatarColor || 'linear-gradient(135deg,#6C63FF,#FF6B9D)',
        createdAt:   userData.createdAt?.toDate?.()?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) || 'Today',
      });

      setStats({
        totalQueries:  userData.totalQueries  || 0,
        totalCharts:   userData.totalCharts   || 0,
        filesUploaded: userData.filesUploaded || 0,
        lastActive:    formatLastActive(userData.lastActive?.toDate?.()),
      });

      try {
        const q    = query(collection(db, 'users', firebaseUser.uid, 'queries'), orderBy('timestamp', 'desc'), limit(100));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setHistory(docs.slice(0, 10));

        const days      = getLast7Days();
        const dayCounts = {};
        days.forEach(d => { dayCounts[d] = 0; });
        docs.forEach(d => {
          const ts = d.timestamp?.toDate?.();
          if (!ts) return;
          const label = ts.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
          if (dayCounts[label] !== undefined) dayCounts[label]++;
        });
        setDailyData(days.map(d => ({ day: d, queries: dayCounts[d] })));

        const typeCounts = {};
        docs.forEach(d => {
          const t = d.chartType || 'unknown';
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
        setChartTypeData(Object.entries(typeCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value));

        const last30     = getLast30Days();
        const heatCounts = {};
        last30.forEach(d => { heatCounts[d] = 0; });
        docs.forEach(d => {
          const ts = d.timestamp?.toDate?.();
          if (!ts) return;
          const key = ts.toISOString().split('T')[0];
          if (heatCounts[key] !== undefined) heatCounts[key]++;
        });
        setHeatmap(heatCounts);
      } catch (_) {}

      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    localStorage.clear(); sessionStorage.clear();
    router.push('/auth');
  };

  const handleProfileSaved = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', margin: '0 auto 16px', background: 'linear-gradient(135deg,#6C63FF,#FF6B9D)', animation: 'spin 1.5s linear infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>◈</div>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading your profile...</p>
      </div>
    </div>
  );

  const STAT_CARDS = [
    { icon: '✦', label: 'Total Queries',  value: stats?.totalQueries,  color: '#6C63FF', bg: 'rgba(108,99,255,0.10)',  border: 'rgba(108,99,255,0.22)' },
    { icon: '📊', label: 'Charts Created', value: stats?.totalCharts,   color: '#FF6B9D', bg: 'rgba(255,107,157,0.10)', border: 'rgba(255,107,157,0.22)' },
    { icon: '📁', label: 'Files Uploaded', value: stats?.filesUploaded, color: '#00D4AA', bg: 'rgba(0,212,170,0.10)',   border: 'rgba(0,212,170,0.22)' },
    { icon: '📅', label: 'Last Active',    value: stats?.lastActive,    color: '#FF9F43', bg: 'rgba(255,159,67,0.10)',  border: 'rgba(255,159,67,0.22)' },
  ];

  const CHART_ICONS = { line:'📈', bar:'📊', pie:'🥧', area:'📉', scatter:'✦', table:'⊟' };
  const initials    = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';
  const maxHeat     = Math.max(...Object.values(heatmap), 1);

  const tooltipStyle = {
    contentStyle: { backgroundColor: 'var(--bg3,#0D1225)', border: '1px solid rgba(108,99,255,0.20)', borderRadius: '12px', fontFamily: 'var(--font-body)', fontSize: '12px' },
    labelStyle:   { color: 'var(--text,#F0F0FF)', fontWeight: 600 },
    itemStyle:    { color: 'rgba(240,240,255,0.65)' },
  };

  return (
    <>
      <Head><title>DataMind — Profile</title></Head>
      <div className="bg-orbs"><div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" /><div className="bg-orb bg-orb-3" /><div className="bg-orb bg-orb-4" /></div>
      <div className="bg-grid" />

      {showEdit && <ProfileEditModal user={user} onClose={() => setShowEdit(false)} onSaved={handleProfileSaved} />}
      {showLogout && <LogoutModal onConfirm={handleSignOut} onCancel={() => setShowLogout(false)} />}

      <div className="page-wrap" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header user={user} />

        <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', width: '100%', padding: '40px 28px 100px' }}>

          {/* Profile header */}
          <div className="anim-fade-up" style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '28px', borderRadius: '22px', marginBottom: '28px', background: 'linear-gradient(135deg,rgba(108,99,255,0.10),rgba(255,107,157,0.07))', border: '1px solid rgba(108,99,255,0.20)', flexWrap: 'wrap' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '20px', flexShrink: 0, background: user?.avatar ? 'transparent' : (user?.avatarColor || 'linear-gradient(135deg,#6C63FF,#FF6B9D)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 700, color: 'white', fontFamily: 'var(--font-head)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(108,99,255,0.30)', border: '2px solid rgba(108,99,255,0.28)', cursor: 'pointer', transition: 'transform .2s' }}
              onClick={() => setShowEdit(true)}
              onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'}
              onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
              title="Edit profile"
            >
              {user?.avatar ? <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '22px', marginBottom: '4px', color: 'var(--text)' }}>{user?.name}</h2>
              <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '10px' }}>{user?.email}</p>
              <span style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '100px', background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.24)', color: '#00D4AA' }}>✓ Active since {user?.createdAt}</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
              <button onClick={() => setShowEdit(true)} className="btn btn-secondary btn-sm">✏️ Edit Profile</button>
              <button onClick={() => router.push('/dashboard')} className="btn btn-secondary btn-sm">📊 Dashboard</button>
              <button onClick={() => setShowLogout(true)}
                style={{ background: 'rgba(255,107,157,0.10)', border: '1px solid rgba(255,107,157,0.22)', borderRadius: '10px', color: '#FF6B9D', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, padding: '8px 18px', cursor: 'pointer', transition: 'all .2s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,107,157,0.20)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,107,157,0.10)'}
              >⎋ Sign Out</button>
            </div>
          </div>

          {/* Stats */}
          <div className="anim-fade-up anim-delay-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '16px', marginBottom: '28px' }}>
            {STAT_CARDS.map(({ icon, label, value, color, bg, border }) => (
              <div key={label} style={{ padding: '20px', borderRadius: '18px', background: 'var(--glass)', border: '1px solid var(--border)', transition: 'transform .2s, border-color .2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=border; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='var(--border)'; }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', marginBottom: '14px' }}>{icon}</div>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '22px', color, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value ?? '—'}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Analytics */}
          <div className="anim-fade-up anim-delay-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '28px' }}>
            <div style={{ padding: '22px', borderRadius: '20px', background: 'var(--glass)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(108,99,255,0.14)', border: '1px solid rgba(108,99,255,0.26)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📈</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>Queries per Day</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted2)' }}>Last 7 days</div>
                </div>
              </div>
              {dailyData.every(d => d.queries === 0) ? (
                <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--muted2)', textAlign: 'center' }}>No queries yet!</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={dailyData} barCategoryGap="30%">
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6C63FF" stopOpacity={1} />
                        <stop offset="100%" stopColor="#FF6B9D" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fill: 'var(--muted2,rgba(240,240,255,0.30))', fontSize: 10, fontFamily: 'var(--font-body)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--muted2,rgba(240,240,255,0.30))', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="queries" fill="url(#barGrad)" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ padding: '22px', borderRadius: '20px', background: 'var(--glass)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(0,212,170,0.14)', border: '1px solid rgba(0,212,170,0.26)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🥧</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>Chart Types Used</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted2)' }}>All time breakdown</div>
                </div>
              </div>
              {chartTypeData.length === 0 ? (
                <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--muted2)', textAlign: 'center' }}>No chart data yet!</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={chartTypeData} cx="50%" cy="50%" innerRadius="45%" outerRadius="70%" paddingAngle={3} dataKey="value" nameKey="name">
                      {chartTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend formatter={v => <span style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'capitalize' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Heatmap */}
          <div className="anim-fade-up anim-delay-3" style={{ padding: '22px', borderRadius: '20px', background: 'var(--glass)', border: '1px solid var(--border)', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(255,159,67,0.14)', border: '1px solid rgba(255,159,67,0.26)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🗓</div>
              <div>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>Activity Heatmap</div>
                <div style={{ fontSize: '11px', color: 'var(--muted2)' }}>Last 30 days</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {Object.entries(heatmap).map(([date, count]) => {
                const intensity = count === 0 ? 0 : Math.min(count / maxHeat, 1);
                return (
                  <div key={date} title={`${date}: ${count} quer${count === 1 ? 'y' : 'ies'}`}
                    style={{ width: '26px', height: '26px', borderRadius: '6px', background: count === 0 ? 'var(--glass2)' : `rgba(108,99,255,${0.15 + intensity * 0.75})`, border: `1px solid ${count > 0 ? 'rgba(108,99,255,0.28)' : 'var(--border)'}`, transition: 'transform .15s', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: count > 0 ? 'rgba(255,255,255,0.80)' : 'transparent', fontWeight: 700 }}
                    onMouseEnter={e => e.currentTarget.style.transform='scale(1.25)'}
                    onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
                  >{count > 0 ? count : ''}</div>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted2)' }}>Less</span>
              {[0, 0.25, 0.5, 0.75, 1].map(i => (
                <div key={i} style={{ width: '14px', height: '14px', borderRadius: '4px', background: i === 0 ? 'var(--glass2)' : `rgba(108,99,255,${0.15 + i * 0.75})`, border: '1px solid var(--border)' }} />
              ))}
              <span style={{ fontSize: '11px', color: 'var(--muted2)' }}>More</span>
            </div>
          </div>

          {/* Recent Queries */}
          <div className="anim-fade-up anim-delay-4" style={{ background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '22px', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(108,99,255,0.14)', border: '1px solid rgba(108,99,255,0.26)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>⟳</div>
                <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>Recent Queries</span>
                <span style={{ background: 'rgba(108,99,255,0.15)', color: '#A29BFE', fontSize: '11px', padding: '2px 9px', borderRadius: '100px', fontWeight: 600 }}>{history.length}</span>
              </div>
              <button onClick={() => router.push('/dashboard')} className="btn btn-ghost btn-sm">New Query →</button>
            </div>

            {history.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>✦</div>
                <p style={{ fontSize: '14px', color: 'var(--muted)' }}>No queries yet — go ask your data something!</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={() => router.push('/upload')}>Get Started →</button>
              </div>
            ) : (
              <div style={{ padding: '8px' }}>
                {history.map((item) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', borderRadius: '13px', marginBottom: '3px', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--glass2)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >
                    <div style={{ width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0, background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>
                      {CHART_ICONS[item.chartType] || '✦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.query}</p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '3px' }}>
                        {item.chartType && (
                          <span style={{ fontSize: '11px', color: CHART_COLORS_MAP[item.chartType] || '#A29BFE', background: `${CHART_COLORS_MAP[item.chartType] || '#A29BFE'}18`, padding: '1px 8px', borderRadius: '100px', textTransform: 'capitalize' }}>
                            {item.chartType}
                          </span>
                        )}
                        {item.timestamp && <span style={{ fontSize: '11px', color: 'var(--muted2)' }}>· {item.timestamp?.toDate?.()?.toLocaleString?.() || ''}</span>}
                      </div>
                    </div>
                    {item.rowCount !== undefined && <span style={{ fontSize: '11px', color: 'var(--muted2)', flexShrink: 0 }}>{item.rowCount} rows</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </>
  );
}