// pages/share/[id].jsx
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ChartRenderer from '../../components/charts/ChartRenderer';

export default function SharedChart() {
  const router = useRouter();
  const { id } = router.query;
  const [chart, setChart]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'sharedCharts', id));
        if (!snap.exists()) { setNotFound(true); setLoading(false); return; }
        setChart(snap.data());
        // Increment view count
        await updateDoc(doc(db, 'sharedCharts', id), { views: increment(1) });
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TYPE_META = {
    line:    { icon: '📈', label: 'Line Chart',   tx: '#A29BFE' },
    bar:     { icon: '📊', label: 'Bar Chart',    tx: '#FF6B9D' },
    pie:     { icon: '🥧', label: 'Pie Chart',    tx: '#00D4AA' },
    donut:   { icon: '⭕', label: 'Donut Chart',  tx: '#00D4AA' },
    area:    { icon: '📉', label: 'Area Chart',   tx: '#FF9F43' },
    scatter: { icon: '✦',  label: 'Scatter Plot', tx: '#4ECDC4' },
    table:   { icon: '⊟',  label: 'Data Table',  tx: '#A29BFE' },
  };

  const meta = TYPE_META[(chart?.chartType || 'bar').toLowerCase()] || TYPE_META.bar;

  return (
    <>
      <Head>
        <title>{chart?.query ? `${chart.query} — DataMind` : 'Shared Chart — DataMind'}</title>
        <meta name="description" content={chart?.insight || 'Interactive chart shared from DataMind'} />
        <meta property="og:title" content={chart?.query || 'DataMind Chart'} />
        <meta property="og:description" content={chart?.insight || 'View this interactive chart'} />
      </Head>

      {/* Background */}
      <div className="bg-orbs">
        <div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" /><div className="bg-orb bg-orb-4" />
      </div>
      <div className="bg-grid" />

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 36px', height: '64px',
        background: 'var(--header-bg)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div
          onClick={() => router.push('/')}
          style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '20px', background: 'linear-gradient(135deg,#6C63FF,#FF6B9D,#00D4AA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', cursor: 'pointer' }}
        >
          ◈ DataMind
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted2)', padding: '4px 12px', background: 'var(--glass2)', border: '1px solid var(--border)', borderRadius: '100px' }}>
            📤 Shared Chart
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => router.push('/auth')}>
            Try DataMind Free →
          </button>
        </div>
      </nav>

      <div className="page-wrap" style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>

        {loading && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', margin: '0 auto 16px', background: 'linear-gradient(135deg,#6C63FF,#FF6B9D)', animation: 'spin 1.5s linear infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>◈</div>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading chart...</p>
          </div>
        )}

        {notFound && !loading && (
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔍</div>
            <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '24px', color: 'var(--text)', marginBottom: '12px' }}>Chart not found</h2>
            <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>This shared chart may have been deleted or the link is invalid.</p>
            <button className="btn btn-primary" onClick={() => router.push('/')}>Go to DataMind →</button>
          </div>
        )}

        {chart && !loading && (
          <div style={{ width: '100%', maxWidth: '800px' }}>

            {/* Shared by banner */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted2)' }}>Shared via</span>
                <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '13px', background: 'linear-gradient(135deg,#6C63FF,#FF6B9D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>◈ DataMind</span>
                {chart.views > 1 && (
                  <span style={{ fontSize: '11px', color: 'var(--muted2)', background: 'var(--glass2)', border: '1px solid var(--border)', borderRadius: '100px', padding: '2px 10px' }}>
                    👁 {chart.views} views
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={copyLink}
                  style={{ background: copied ? 'rgba(0,212,170,0.12)' : 'var(--glass2)', border: `1px solid ${copied ? 'rgba(0,212,170,0.28)' : 'var(--border2)'}`, borderRadius: '9px', color: copied ? '#00D4AA' : 'var(--muted)', fontSize: '12px', padding: '7px 14px', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {copied ? '✓ Copied!' : '🔗 Copy Link'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => router.push('/auth')}>
                  Create your own →
                </button>
              </div>
            </div>

            {/* Chart card */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '22px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
              {/* Accent line */}
              <div style={{ height: '2px', background: `linear-gradient(90deg,${meta.tx},transparent)`, opacity: .6 }} />

              {/* Header */}
              <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: meta.tx, background: `${meta.tx}20`, border: `1px solid ${meta.tx}44`, borderRadius: '100px', padding: '4px 12px' }}>
                    {meta.icon} {meta.label}
                  </span>
                  {chart.rowCount !== undefined && (
                    <span style={{ fontSize: '11px', color: 'var(--muted2)' }}>{chart.rowCount} rows</span>
                  )}
                </div>
                <h2 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '18px', color: 'var(--text)', margin: 0, lineHeight: 1.35 }}>
                  {chart.query}
                </h2>
              </div>

              {/* Insight */}
              {chart.insight && (
                <div style={{ margin: '18px 24px 0', padding: '14px 18px', background: 'linear-gradient(135deg,rgba(108,99,255,0.08),rgba(255,107,157,0.05))', border: '1px solid rgba(108,99,255,0.18)', borderRadius: '14px', display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0, background: 'linear-gradient(135deg,#6C63FF,#FF6B9D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>✦</span>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.65 }}>{chart.insight}</p>
                </div>
              )}

              {/* Chart */}
              <div style={{ padding: '20px 24px 24px' }}>
                <ChartRenderer chartType={chart.chartType} data={chart.data} chartConfig={chart.chartConfig} />
              </div>
            </div>

            {/* CTA footer */}
            <div style={{ textAlign: 'center', marginTop: '32px', padding: '28px', borderRadius: '18px', background: 'linear-gradient(135deg,rgba(108,99,255,0.08),rgba(255,107,157,0.05))', border: '1px solid rgba(108,99,255,0.16)' }}>
              <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>
                Want to create charts like this from your own data?
              </p>
              <button className="btn btn-primary" onClick={() => router.push('/auth')}>
                ✦ Try DataMind Free
              </button>
            </div>

          </div>
        )}
      </div>
    </>
  );
}