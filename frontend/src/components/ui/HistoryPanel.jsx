import { useState } from 'react';

const ICONS  = { line:'📈', bar:'📊', pie:'🥧', area:'📉', scatter:'✦', table:'⊟' };
const COLORS = {
  line:    ['rgba(108,99,255', '#A29BFE'],
  bar:     ['rgba(255,107,157', '#FF6B9D'],
  pie:     ['rgba(0,212,170',   '#00D4AA'],
  area:    ['rgba(255,159,67',  '#FF9F43'],
  scatter: ['rgba(78,205,196',  '#4ECDC4'],
  table:   ['rgba(162,155,254', '#A29BFE'],
};

export default function HistoryPanel({ history = [], onRerun, onClear }) {
  const [open, setOpen] = useState(true);
  if (!history.length) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: '20px', overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', cursor: 'pointer',
          borderBottom: open ? '1px solid rgba(255,255,255,0.08)' : 'none',
          userSelect: 'none', transition: 'background .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* icon */}
          <div style={{
            width: '32px', height: '32px', borderRadius: '9px',
            background: 'rgba(108,99,255,0.14)', border: '1px solid rgba(108,99,255,0.26)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>⟳</div>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', color: '#F0F0FF' }}>
            Query History
          </span>
          <span style={{
            background: 'rgba(108,99,255,0.15)', color: '#A29BFE',
            fontSize: '11px', padding: '2px 9px', borderRadius: '100px', fontWeight: 600,
          }}>{history.length}</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onClear && (
            <button
              onClick={e => { e.stopPropagation(); onClear(); }}
              style={{
                background: 'transparent', border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '7px', color: 'rgba(240,240,255,0.38)',
                fontSize: '11px', padding: '3px 11px', cursor: 'pointer', fontFamily: 'var(--font-body)',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF6B9D'; e.currentTarget.style.color = '#FF6B9D'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'rgba(240,240,255,0.38)'; }}
            >
              Clear all
            </button>
          )}
          <span style={{
            color: 'rgba(240,240,255,0.35)', fontSize: '18px',
            display: 'inline-block',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform .2s',
          }}>⌄</span>
        </div>
      </div>

      {/* List */}
      {open && (
        <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '8px' }}>
          {[...history].reverse().map((item, i) => {
            const ct = (item.result?.chartType || 'bar').toLowerCase();
            const [base, accent] = COLORS[ct] || COLORS.bar;

            return (
              <div
                key={item.id || i}
                onClick={() => onRerun?.(item.query)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '12px', borderRadius: '13px', marginBottom: '3px',
                  cursor: 'pointer',
                  border: '1px solid transparent',
                  transition: 'all .15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                {/* Chart type icon */}
                <div style={{
                  width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px',
                  background: `${base},0.12)`,
                  border: `1px solid ${base},0.24)`,
                }}>
                  {ICONS[ct] || '✦'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '13px', color: '#F0F0FF', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.query}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {item.result?.chartType && (
                      <span style={{ fontSize: '11px', color: accent, textTransform: 'capitalize' }}>
                        {item.result.chartType}
                      </span>
                    )}
                    {item.timestamp && (
                      <span style={{ fontSize: '11px', color: 'rgba(240,240,255,0.25)' }}>
                        · {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={e => { e.stopPropagation(); onRerun?.(item.query); }}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: '8px', color: 'rgba(240,240,255,0.38)',
                    fontSize: '11px', padding: '5px 11px',
                    cursor: 'pointer', flexShrink: 0,
                    fontFamily: 'var(--font-body)', transition: 'all .15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(108,99,255,0.14)';
                    e.currentTarget.style.borderColor = 'rgba(108,99,255,0.32)';
                    e.currentTarget.style.color = '#A29BFE';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                    e.currentTarget.style.color = 'rgba(240,240,255,0.38)';
                  }}
                >
                  Re-run ↗
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}