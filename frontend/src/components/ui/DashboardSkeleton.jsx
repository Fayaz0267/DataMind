export default function DashboardSkeleton() {
  return (
    <div style={{
      background: 'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: '20px', padding: '26px',
      animation: 'fadeIn .3s ease',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div className="skeleton" style={{ width: '34px', height: '34px', borderRadius: '10px' }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: '14px', width: '55%', borderRadius: '6px', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '11px', width: '32%', borderRadius: '6px' }} />
        </div>
        <div className="skeleton" style={{ height: '28px', width: '72px', borderRadius: '8px' }} />
      </div>

      {/* Insight bar */}
      <div className="skeleton" style={{ height: '44px', borderRadius: '12px', marginBottom: '22px' }} />

      {/* Fake chart bars */}
      <div style={{
        height: '220px', display: 'flex', alignItems: 'flex-end',
        gap: '8px', padding: '0 4px', marginBottom: '16px',
      }}>
        {[65, 85, 55, 95, 70, 80, 60, 90, 75, 50, 88, 72].map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: `${h}%`, borderRadius: '5px 5px 0 0',
              background: `linear-gradient(to top, rgba(108,99,255,${0.12 + i * 0.006}), rgba(255,107,157,${0.06 + i * 0.003}))`,
              animation: `shimmer 1.6s ${i * 0.07}s infinite`,
              backgroundSize: '800px 100%',
            }}
          />
        ))}
      </div>

      {/* X-axis skeleton */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 4px', marginBottom: '20px' }}>
        {[...Array(12)].map((_, i) => (
          <div key={i} className="skeleton" style={{ flex: 1, height: '8px', borderRadius: '4px' }} />
        ))}
      </div>

      {/* Loading indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '10px', paddingTop: '8px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[0, 0.15, 0.30].map((d, i) => (
          <div
            key={i}
            style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'linear-gradient(135deg,#6C63FF,#FF6B9D)',
              animation: `pulse ${1.2}s ${d}s ease-in-out infinite`,
            }}
          />
        ))}
        <span style={{ fontSize: '12px', color: 'rgba(240,240,255,0.28)', marginLeft: '4px' }}>
          Generating dashboard...
        </span>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.35)} }
      `}</style>
    </div>
  );
}