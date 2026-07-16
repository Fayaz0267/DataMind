// components/ui/LogoutModal.jsx
export default function LogoutModal({ onConfirm, onCancel }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          zIndex: 998, animation: 'fadeIn .2s ease',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 999,
        width: '100%', maxWidth: '380px',
        background: 'var(--bg3, #0D1225)',
        border: '1px solid rgba(255,107,157,0.25)',
        borderRadius: '22px', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
        animation: 'scaleIn .2s ease',
      }}>
        {/* Top accent */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg,#FF6B9D,#FF3CAC)' }} />

        <div style={{ padding: '32px 28px' }}>
          {/* Icon */}
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'rgba(255,107,157,0.12)', border: '1px solid rgba(255,107,157,0.24)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', margin: '0 auto 20px',
          }}>⎋</div>

          <h3 style={{
            fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '20px',
            color: 'var(--text)', textAlign: 'center', marginBottom: '10px',
          }}>
            Sign out?
          </h3>
          <p style={{
            fontSize: '14px', color: 'var(--muted)',
            textAlign: 'center', lineHeight: 1.65, marginBottom: '28px',
          }}>
            You'll need to sign back in to access your dashboard and pinned charts.
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: '12px', borderRadius: '12px',
                border: '1px solid var(--border2)', background: 'transparent',
                color: 'var(--muted)', fontFamily: 'var(--font-body)',
                fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass2)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                flex: 1, padding: '12px', borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg,#FF6B9D,#FF3CAC)',
                color: 'white', fontFamily: 'var(--font-body)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(255,107,157,0.35)',
                transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(255,107,157,0.50)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(255,107,157,0.35)'; }}
            >
              Yes, sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}