import { useState, useRef } from 'react';
import ChartRenderer from '../charts/ChartRenderer';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useExport } from '../../lib/useExport';
import { useShare } from '../../lib/useShare';

const TYPE_META = {
  line:    { icon: '📈', label: 'Line Chart',   color: '#A29BFE' },
  bar:     { icon: '📊', label: 'Bar Chart',    color: '#FF6B9D' },
  pie:     { icon: '🥧', label: 'Pie Chart',    color: '#00D4AA' },
  donut:   { icon: '⭕', label: 'Donut Chart',  color: '#00D4AA' },
  area:    { icon: '📉', label: 'Area Chart',   color: '#FF9F43' },
  scatter: { icon: '✦',  label: 'Scatter Plot', color: '#4ECDC4' },
  table:   { icon: '⊟',  label: 'Data Table',  color: '#A29BFE' },
};

// All chart types user can switch between
const CHART_SWITCHER = [
  { type: 'bar',     icon: '📊', label: 'Bar' },
  { type: 'line',    icon: '📈', label: 'Line' },
  { type: 'pie',     icon: '🥧', label: 'Pie' },
  { type: 'area',    icon: '📉', label: 'Area' },
  { type: 'scatter', icon: '✦',  label: 'Scatter' },
  { type: 'table',   icon: '⊟',  label: 'Table' },
];

// Generate varied stat pills per chart type
function getStatPills(chartType, data, chartConfig) {
  const type   = (chartType || 'bar').toLowerCase();
  const yKey   = chartConfig?.yKey;
  const xKey   = chartConfig?.xKey;
  if (!data || data.length === 0) return [];
  const values = yKey ? data.map(r => Number(r[yKey])).filter(v => !isNaN(v)) : [];
  if (values.length === 0) return [];

  const max    = Math.max(...values);
  const min    = Math.min(...values);
  const sum    = values.reduce((a, b) => a + b, 0);
  const avg    = sum / values.length;
  const maxRow = data.find(r => Number(r[yKey]) === max);
  const minRow = data.find(r => Number(r[yKey]) === min);
  const fmt    = n => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : n.toFixed(0);

  switch (type) {
    case 'line': case 'area': {
      const first = values[0], last = values[values.length - 1];
      const pct   = first > 0 ? (((last - first) / first) * 100).toFixed(1) : null;
      return [
        { label: 'Trend',   value: last > first ? '📈 Upward' : last < first ? '📉 Downward' : '➡ Stable' },
        { label: 'Peak',    value: `${fmt(max)}${maxRow?.[xKey] ? ` (${maxRow[xKey]})` : ''}` },
        { label: 'Change',  value: pct ? `${pct > 0 ? '+' : ''}${pct}%` : '—' },
        { label: 'Average', value: fmt(avg) },
      ];
    }
    case 'bar': return [
      { label: 'Highest', value: `${maxRow?.[xKey] || '—'} (${fmt(max)})` },
      { label: 'Lowest',  value: `${minRow?.[xKey] || '—'} (${fmt(min)})` },
      { label: 'Average', value: fmt(avg) },
      { label: 'Total',   value: fmt(sum) },
    ];
    case 'pie': case 'donut': return [
      { label: 'Largest',  value: `${maxRow?.[xKey] || '—'} (${((max/sum)*100).toFixed(1)}%)` },
      { label: 'Total',    value: fmt(sum) },
      { label: 'Segments', value: `${data.length}` },
      { label: 'Avg',      value: fmt(avg) },
    ];
    case 'scatter': return [
      { label: 'Points', value: `${data.length}` },
      { label: 'Max Y',  value: fmt(max) },
      { label: 'Min Y',  value: fmt(min) },
      { label: 'Avg Y',  value: fmt(avg) },
    ];
    case 'table': return [
      { label: 'Rows',    value: `${data.length}` },
      { label: 'Columns', value: `${Object.keys(data[0] || {}).length}` },
      ...(values.length > 0 ? [{ label: 'Max', value: fmt(max) }, { label: 'Sum', value: fmt(sum) }] : []),
    ];
    default: return [];
  }
}

// Generate smart insight text based on data
function generateInsightText(chartType, data, chartConfig, query) {
  const type   = (chartType || 'bar').toLowerCase();
  const yKey   = chartConfig?.yKey;
  const xKey   = chartConfig?.xKey;
  if (!data || data.length === 0) return null;
  const values = yKey ? data.map(r => Number(r[yKey])).filter(v => !isNaN(v)) : [];
  if (values.length === 0) return null;

  const max    = Math.max(...values);
  const min    = Math.min(...values);
  const sum    = values.reduce((a, b) => a + b, 0);
  const avg    = sum / values.length;
  const maxRow = data.find(r => Number(r[yKey]) === max);
  const minRow = data.find(r => Number(r[yKey]) === min);
  const fmt    = n => n >= 1e6 ? `${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : n.toFixed(0);

  switch (type) {
    case 'line': case 'area': {
      const first = values[0], last = values[values.length - 1];
      const pct   = first > 0 ? (((last - first) / first) * 100).toFixed(1) : null;
      const trend = last > first ? 'increased' : last < first ? 'decreased' : 'remained stable';
      return pct
        ? `${yKey || 'Value'} ${trend} by ${Math.abs(pct)}% from ${data[0]?.[xKey] || 'start'} to ${data[data.length-1]?.[xKey] || 'end'}. Peak was ${fmt(max)}${maxRow?.[xKey] ? ` in ${maxRow[xKey]}` : ''}.`
        : `${yKey || 'Value'} ${trend} over the period. Peak reached ${fmt(max)}${maxRow?.[xKey] ? ` in ${maxRow[xKey]}` : ''}.`;
    }
    case 'bar':
      return `${maxRow?.[xKey] || 'Top entry'} leads with ${fmt(max)}, which is ${avg > 0 ? ((max/avg - 1)*100).toFixed(0) + '% above average' : 'the highest'}. ${minRow?.[xKey] || 'Bottom entry'} is the lowest at ${fmt(min)}.`;
    case 'pie': case 'donut':
      return `${maxRow?.[xKey] || 'Top segment'} accounts for ${((max/sum)*100).toFixed(1)}% of the total ${fmt(sum)}. The top 3 segments together make up ${data.slice(0,3).reduce((a,r)=>a+Number(r[yKey]||0),0)/sum*100 > 0 ? (data.slice(0,3).reduce((a,r)=>a+Number(r[yKey]||0),0)/sum*100).toFixed(0)+'%' : 'majority'} of all values.`;
    case 'scatter':
      return `Scatter plot shows ${data.length} data points. Y values range from ${fmt(min)} to ${fmt(max)} with an average of ${fmt(avg)}.`;
    case 'table':
      return `Showing ${data.length} records with ${Object.keys(data[0]||{}).length} columns. ${values.length > 0 ? `Values range from ${fmt(min)} to ${fmt(max)}.` : ''}`;
    default:
      return null;
  }
}

const FOLLOW_UPS = [
  'Filter by top 5 only',
  'Show as a different chart type',
  'Compare with previous period',
  'Break down further',
];

export default function DashboardCard({ result, query, onFollowUp, isPinned = false, onPinChange, onDismiss }) {
  const [activeChartType, setActiveChartType] = useState(result.chartType || 'bar');
  const [showSQL, setShowSQL]                 = useState(false);
  const [copied, setCopied]                   = useState(false);
  const [pinned, setPinned]                   = useState(isPinned);
  const [pinning, setPinning]                 = useState(false);
  const [showExport, setShowExport]           = useState(false);
  const [exporting, setExporting]             = useState('');
  const [shareToast, setShareToast]           = useState(false);
  const cardRef = useRef(null);

  const { exportPNG, exportPDF } = useExport();
  const { shareChart, sharing }  = useShare();

  const { data, chartConfig, insight, sql, rowCount } = result;
  const meta       = TYPE_META[activeChartType] || TYPE_META.bar;
  const filename   = (chartConfig?.title || query || 'chart').replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40);
  const statPills  = getStatPills(activeChartType, data, chartConfig);
  const insightTxt = generateInsightText(activeChartType, data, chartConfig, query);

  const copySQL = () => { navigator.clipboard.writeText(sql || ''); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  const togglePin = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setPinning(true);
    try {
      const pinId  = `pin_${result.id || Date.now()}`;
      const pinRef = doc(db, 'users', uid, 'pinnedCharts', pinId);
      if (pinned) {
        await deleteDoc(pinRef);
        setPinned(false);
        onPinChange?.('unpin', pinId, null);
      } else {
        const pinData = { id: pinId, query, chartType: activeChartType, chartConfig, data, insight, sql, rowCount, pinnedAt: serverTimestamp() };
        await setDoc(pinRef, pinData);
        setPinned(true);
        onPinChange?.('pin', pinId, pinData);
      }
    } catch (err) { console.error('Pin error:', err); }
    finally { setPinning(false); }
  };

  const handleExport = async (fmt) => {
    if (!cardRef.current) return;
    setExporting(fmt); setShowExport(false);
    try {
      if (fmt === 'png') await exportPNG(cardRef.current, filename);
      else await exportPDF(cardRef.current, filename, chartConfig?.title || query);
    } finally { setExporting(''); }
  };

  const handleShare = async () => {
    const url = await shareChart({ query, chartType: activeChartType, chartConfig, data, insight, sql, rowCount });
    if (url) { setShareToast(true); setTimeout(() => setShareToast(false), 3000); }
  };

  return (
    <div ref={cardRef} style={{
      background: 'var(--card-bg)', border: `1px solid ${pinned ? 'rgba(255,159,67,0.35)' : 'var(--card-border)'}`,
      borderRadius: '22px', overflow: 'hidden', animation: 'fadeUp .45s ease',
      transition: 'border-color .25s, box-shadow .25s', position: 'relative',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = pinned ? 'rgba(255,159,67,0.50)' : 'var(--card-border-hover)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = pinned ? 'rgba(255,159,67,0.35)' : 'var(--card-border)'; e.currentTarget.style.boxShadow = 'none'; setShowExport(false); }}
    >
      {/* Share toast */}
      {shareToast && (
        <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,212,170,0.15)', border: '1px solid rgba(0,212,170,0.35)', borderRadius: '100px', padding: '8px 20px', fontSize: '13px', color: '#00D4AA', fontWeight: 500, zIndex: 50, animation: 'fadeUp .3s ease', backdropFilter: 'blur(12px)', whiteSpace: 'nowrap' }}>
          ✓ Link copied to clipboard!
        </div>
      )}

      <div style={{ height: '2px', background: `linear-gradient(90deg,${meta.color},transparent)`, opacity: .7 }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 20px 14px', gap: '12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: `${meta.color}18`, border: `1px solid ${meta.color}40`, borderRadius: '100px', padding: '3px 11px', fontSize: '11px', fontWeight: 600, color: meta.color }}>
              {meta.icon} {meta.label}
            </span>
            {rowCount !== undefined && <span style={{ fontSize: '11px', color: 'var(--muted2)' }}>{rowCount} rows</span>}
            {pinned && <span style={{ fontSize: '11px', color: '#FF9F43', background: 'rgba(255,159,67,0.10)', border: '1px solid rgba(255,159,67,0.22)', borderRadius: '100px', padding: '2px 9px' }}>📌</span>}
          </div>
          <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', color: 'var(--text)', margin: 0, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{query}</h3>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '5px', flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={togglePin} disabled={pinning} title={pinned ? 'Unpin' : 'Pin'}
            style={{ background: pinned ? 'rgba(255,159,67,0.15)' : 'transparent', border: `1px solid ${pinned ? 'rgba(255,159,67,0.35)' : 'var(--border2)'}`, borderRadius: '8px', color: pinned ? '#FF9F43' : 'var(--muted)', fontSize: '13px', padding: '5px 9px', cursor: 'pointer', transition: 'all .2s' }}
            onMouseEnter={e => { if (!pinned) { e.currentTarget.style.background='rgba(255,159,67,0.10)'; e.currentTarget.style.color='#FF9F43'; }}}
            onMouseLeave={e => { if (!pinned) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--muted)'; }}}
          >{pinning ? '⏳' : pinned ? '📌' : '📍'}</button>

          <button onClick={handleShare} disabled={sharing}
            style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--muted)', fontSize: '11px', padding: '5px 11px', cursor: 'pointer', transition: 'all .2s', fontFamily: 'var(--font-body)' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(108,99,255,0.10)'; e.currentTarget.style.color='#A29BFE'; }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--muted)'; }}
          >{sharing ? '⏳' : '🔗'} Share</button>

          {sql && (
            <button onClick={() => setShowSQL(p => !p)}
              style={{ background: showSQL ? 'rgba(108,99,255,0.18)' : 'transparent', border: `1px solid ${showSQL ? 'rgba(108,99,255,0.35)' : 'var(--border2)'}`, borderRadius: '8px', color: showSQL ? '#A29BFE' : 'var(--muted)', fontSize: '11px', padding: '5px 11px', cursor: 'pointer', transition: 'all .2s', fontFamily: 'var(--font-body)' }}
            >{'{ }'} SQL</button>
          )}

          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowExport(p => !p)}
              style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--muted)', fontSize: '11px', padding: '5px 11px', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.background='var(--glass2)'; e.currentTarget.style.color='var(--text)'; }}
              onMouseLeave={e => { if (!showExport) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--muted)'; }}}
            >{exporting ? '⏳' : '↓'} Export</button>
            {showExport && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: '150px', background: 'var(--dropdown-bg)', backdropFilter: 'blur(20px)', border: '1px solid var(--border2)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-deep)', zIndex: 50 }}>
                {[{ fmt: 'png', icon: '🖼', label: 'Export as PNG' }, { fmt: 'pdf', icon: '📄', label: 'Export as PDF' }].map(({ fmt, icon, label }, i) => (
                  <div key={fmt} onClick={() => handleExport(fmt)}
                    style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all .15s', borderBottom: i === 0 ? '1px solid var(--border)' : 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.background='var(--glass2)'; e.currentTarget.style.color='var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--muted)'; }}
                  ><span>{icon}</span>{label}</div>
                ))}
              </div>
            )}
          </div>

          {onDismiss && (
            <button onClick={onDismiss} title="Remove"
              style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: '8px', color: 'var(--muted2)', fontSize: '13px', padding: '5px 9px', cursor: 'pointer', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(255,107,157,0.10)'; e.currentTarget.style.color='#FF6B9D'; e.currentTarget.style.borderColor='rgba(255,107,157,0.28)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--muted2)'; e.currentTarget.style.borderColor='var(--border2)'; }}
            >✕</button>
          )}
        </div>
      </div>

      {/* ── Chart type switcher ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexWrap: 'nowrap' }}>
        <span style={{ fontSize: '11px', color: 'var(--muted2)', marginRight: '4px', flexShrink: 0 }}>View as:</span>
        {CHART_SWITCHER.map(({ type, icon, label }) => (
          <button key={type} onClick={() => setActiveChartType(type)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 500,
              cursor: 'pointer', transition: 'all .2s', flexShrink: 0, fontFamily: 'var(--font-body)',
              background: activeChartType === type ? `${(TYPE_META[type]?.color || '#6C63FF')}20` : 'transparent',
              border: `1px solid ${activeChartType === type ? (TYPE_META[type]?.color || '#6C63FF') + '60' : 'var(--border2)'}`,
              color: activeChartType === type ? (TYPE_META[type]?.color || '#A29BFE') : 'var(--muted)',
              boxShadow: activeChartType === type ? `0 0 12px ${(TYPE_META[type]?.color || '#6C63FF')}25` : 'none',
            }}
            onMouseEnter={e => { if (activeChartType !== type) { e.currentTarget.style.background='var(--glass2)'; e.currentTarget.style.color='var(--text)'; }}}
            onMouseLeave={e => { if (activeChartType !== type) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--muted)'; }}}
          >
            <span style={{ fontSize: '13px' }}>{icon}</span> {label}
          </button>
        ))}
      </div>

      {/* ── Stat pills row ── */}
      {statPills.length > 0 && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {statPills.map(({ label, value }, i) => (
            <div key={label} style={{ flex: 1, minWidth: '90px', padding: '10px 14px', textAlign: 'center', borderRight: i < statPills.length - 1 ? '1px solid var(--border)' : 'none', background: i === 0 ? `${meta.color}08` : 'transparent' }}>
              <div style={{ fontSize: '9px', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px', fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: i === 0 ? meta.color : 'var(--text)', fontFamily: 'var(--font-head)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* SQL block */}
      {showSQL && sql && (
        <div style={{ margin: '14px 20px 0' }}>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--glass)' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted2)', fontFamily: 'monospace' }}>Generated SQL</span>
              <button onClick={copySQL} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: copied ? '#00D4AA' : 'var(--muted)', fontFamily: 'var(--font-body)' }}>{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
            <pre style={{ margin: 0, padding: '12px 14px', fontSize: '12px', lineHeight: 1.7, color: 'var(--muted)', fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{sql}</pre>
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ padding: '16px 20px' }}>
        <ChartRenderer chartType={activeChartType} data={data} chartConfig={chartConfig} />
      </div>

      {/* ── Smart insight block ── */}
      {(insightTxt || insight) && (
        <div style={{ margin: '0 20px 16px', padding: '12px 16px', background: 'linear-gradient(135deg,rgba(108,99,255,0.07),rgba(255,107,157,0.04))', border: '1px solid rgba(108,99,255,0.15)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>✦</span>
            <div>
              {insightTxt && (
                <p style={{ fontSize: '13px', color: 'var(--text)', margin: '0 0 4px', lineHeight: 1.6, fontWeight: 500 }}>
                  {insightTxt}
                </p>
              )}
              {insight && insight !== insightTxt && (
                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                  {insight}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Follow-ups */}
      {onFollowUp && (
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '11px', color: 'var(--muted2)', marginBottom: '8px' }}>Follow up:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {FOLLOW_UPS.map(c => (
              <button key={c} onClick={() => onFollowUp(c)} className="chip" style={{ fontSize: '12px' }}>{c}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}