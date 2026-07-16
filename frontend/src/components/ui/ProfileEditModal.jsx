// components/ui/ProfileEditModal.jsx
import { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

const AVATAR_COLORS = [
  { label: 'Purple', value: 'linear-gradient(135deg,#6C63FF,#A29BFE)' },
  { label: 'Pink',   value: 'linear-gradient(135deg,#FF6B9D,#FF3CAC)' },
  { label: 'Teal',   value: 'linear-gradient(135deg,#00D4AA,#4ECDC4)' },
  { label: 'Orange', value: 'linear-gradient(135deg,#FF9F43,#FF6B9D)' },
  { label: 'Blue',   value: 'linear-gradient(135deg,#74B9FF,#6C63FF)' },
  { label: 'Green',  value: 'linear-gradient(135deg,#00FF88,#00D4AA)' },
];

export default function ProfileEditModal({ user, onClose, onSaved }) {
  const [name, setName]           = useState(user?.name || '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || AVATAR_COLORS[0].value);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const initials = name.trim()
    ? name.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const handleSave = async () => {
    if (!name.trim()) { setError('Name cannot be empty.'); return; }
    setSaving(true); setError('');
    try {
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: name.trim() });
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          name: name.trim(),
          avatarColor,
        }, { merge: true });
      }
      onSaved?.({ name: name.trim(), avatarColor });
      onClose();
    } catch (err) {
      setError('Failed to save. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 998, animation: 'fadeIn .2s ease' }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        zIndex: 999, width: '100%', maxWidth: '420px',
        background: 'var(--bg3, #0D1225)',
        border: '1px solid rgba(108,99,255,0.28)',
        borderRadius: '24px', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
        animation: 'scaleIn .2s ease',
      }}>
        <div style={{ height: '3px', background: 'linear-gradient(90deg,#6C63FF,#FF6B9D)' }} />

        <div style={{ padding: '32px 28px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <h3 style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '20px', color: 'var(--text)', margin: 0 }}>
              Edit Profile
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '20px', lineHeight: 1 }}>✕</button>
          </div>

          {/* Avatar preview */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px',
              background: user?.avatar ? 'transparent' : avatarColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', fontWeight: 700, color: 'white',
              fontFamily: 'var(--font-head)', margin: '0 auto 12px',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(108,99,255,0.30)',
              border: '2px solid rgba(108,99,255,0.25)',
              transition: 'background .3s',
            }}>
              {user?.avatar
                ? <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials
              }
            </div>
            {!user?.avatar && (
              <p style={{ fontSize: '12px', color: 'var(--muted2)', margin: 0 }}>
                Avatar uses your initials
              </p>
            )}
          </div>

          {/* Name field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', display: 'block', fontWeight: 500 }}>
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="input-field"
              style={{ fontSize: '15px' }}
            />
          </div>

          {/* Avatar color picker — only show if no Google photo */}
          {!user?.avatar && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px', display: 'block', fontWeight: 500 }}>
                Avatar Color
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {AVATAR_COLORS.map(({ label, value }) => (
                  <div
                    key={value}
                    title={label}
                    onClick={() => setAvatarColor(value)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '9px',
                      background: value, cursor: 'pointer',
                      border: avatarColor === value ? '2px solid white' : '2px solid transparent',
                      boxShadow: avatarColor === value ? '0 0 12px rgba(108,99,255,0.60)' : 'none',
                      transition: 'all .2s', transform: avatarColor === value ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,107,157,0.10)', border: '1px solid rgba(255,107,157,0.24)', fontSize: '13px', color: 'var(--c2)', marginBottom: '16px' }}>
              ⚠ {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: '14px', cursor: 'pointer', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.background='var(--glass2)'; e.currentTarget.style.color='var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--muted)'; }}
            >Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#6C63FF,#FF6B9D)', color: 'white', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', boxShadow: '0 4px 18px rgba(108,99,255,0.35)', transition: 'all .2s', opacity: saving ? 0.7 : 1 }}
              onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(108,99,255,0.50)'; }}}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 18px rgba(108,99,255,0.35)'; }}
            >{saving ? '⏳ Saving...' : 'Save Changes'}</button>
          </div>
        </div>
      </div>
    </>
  );
}