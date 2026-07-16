// components/ui/ClarificationCard.jsx
export default function ClarificationCard({ question, options, originalQuery, onSelect, onDismiss }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,rgba(108,99,255,0.08),rgba(255,107,157,0.05))',
      border: '1px solid rgba(108,99,255,0.28)',
      borderRadius: '20px', overflow: 'hidden',
      animation: 'fadeUp .4s ease',
    }}>
      {/* Top accent */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg,#6C63FF,#FF6B9D)', opacity: 0.8 }} />

      <div style={{ padding: '22px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: 'linear-gradient(135deg,rgba(108,99,255,0.20),rgba(255,107,157,0.14))',
              border: '1px solid rgba(108,99,255,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}>🤔</div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--c6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>
                Clarification needed
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted2)' }}>
                Original: "{originalQuery}"
              </div>
            </div>
          </div>
          {onDismiss && (
            <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: '16px', lineHeight: 1 }}>✕</button>
          )}
        </div>

        {/* Question */}
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px', fontFamily: 'var(--font-head)', lineHeight: 1.4 }}>
          {question}
        </p>

        {/* Option chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {options.map((option, i) => (
            <button
              key={i}
              onClick={() => onSelect(option)}
              style={{
                padding: '10px 18px',
                background: 'var(--glass2)',
                border: '1px solid rgba(108,99,255,0.25)',
                borderRadius: '100px',
                fontSize: '13px', fontWeight: 500,
                color: 'var(--c6)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'all .2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg,#6C63FF,#FF6B9D)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(108,99,255,0.40)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--glass2)';
                e.currentTarget.style.color = 'var(--c6)';
                e.currentTarget.style.borderColor = 'rgba(108,99,255,0.25)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {option}
            </button>
          ))}
        </div>

        <p style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '12px' }}>
          💡 Click an option above to generate the chart
        </p>
      </div>
    </div>
  );
}