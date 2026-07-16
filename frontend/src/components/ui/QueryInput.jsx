import { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  'Show me monthly revenue for Q3 broken down by region',
  'Which product category has the highest profit margin?',
  'Compare sales rep performance as a bar chart',
  'Top 5 customers by total order value',
  'Revenue trend over the last 6 months',
  'Distribution of orders by category — pie chart',
];

export default function QueryInput({ onSubmit, isLoading, disabled }) {
  const [query, setQuery]             = useState('');
  const [focused, setFocused]         = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [showDrop, setShowDrop]       = useState(false);
  const inputRef = useRef(null);

  // Typewriter effect
  useEffect(() => {
    let timer, pIdx = 0, cIdx = 0, del = false;
    const type = () => {
      const phrase = SUGGESTIONS[pIdx];
      if (!del) {
        cIdx++; setPlaceholder(phrase.slice(0, cIdx));
        if (cIdx === phrase.length) { del = true; timer = setTimeout(type, 2200); return; }
      } else {
        cIdx--; setPlaceholder(phrase.slice(0, cIdx));
        if (cIdx === 0) { del = false; pIdx = (pIdx + 1) % SUGGESTIONS.length; }
      }
      timer = setTimeout(type, del ? 20 : 46);
    };
    timer = setTimeout(type, 900);
    return () => clearTimeout(timer);
  }, []);

  const filtered = query.length > 0
    ? SUGGESTIONS.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 4)
    : [];

  const submit = () => {
    if (!query.trim() || isLoading || disabled) return;
    onSubmit(query.trim());
    setQuery('');
    setShowDrop(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* ── Input bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 12px 10px 16px',
        background: focused ? 'rgba(108,99,255,0.07)' : 'var(--glass2)',
        border: `1px solid ${focused ? 'rgba(108,99,255,0.50)' : 'var(--border2)'}`,
        borderRadius: showDrop && filtered.length > 0 ? '18px 18px 0 0' : '18px',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        transition: 'all .2s',
        boxShadow: focused ? '0 0 40px rgba(108,99,255,0.10)' : 'none',
      }}>
        {/* Icon */}
        <div style={{
          width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
          background: isLoading ? 'linear-gradient(135deg,#00D4AA,#4ECDC4)' : 'linear-gradient(135deg,#6C63FF,#FF6B9D)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px',
          animation: isLoading ? 'spin 1.8s linear infinite' : 'none',
          boxShadow: isLoading ? '0 0 20px rgba(0,212,170,0.40)' : '0 0 14px rgba(108,99,255,0.35)',
        }}>{isLoading ? '⟳' : '✦'}</div>

        {/* Input */}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDrop(e.target.value.length > 0); }}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setTimeout(() => setShowDrop(false), 180); }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
            if (e.key === 'Escape') setShowDrop(false);
          }}
          placeholder={placeholder || 'Ask anything about your data...'}
          disabled={disabled || isLoading}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '14px' }}
        />

        {query && !isLoading && (
          <span style={{ fontSize: '11px', color: 'var(--muted2)', flexShrink: 0, background: 'var(--glass2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 8px' }}>
            ↵ Enter
          </span>
        )}

        {/* Generate button */}
        <button onClick={submit} disabled={!query.trim() || isLoading || disabled}
          style={{
            flexShrink: 0,
            background: query.trim() && !isLoading && !disabled ? 'linear-gradient(135deg,#6C63FF,#FF6B9D)' : 'var(--glass2)',
            border: `1px solid ${query.trim() && !isLoading ? 'transparent' : 'var(--border)'}`,
            borderRadius: '11px', color: query.trim() && !isLoading ? 'white' : 'var(--muted2)',
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '13px',
            padding: '10px 22px', cursor: query.trim() && !isLoading && !disabled ? 'pointer' : 'not-allowed',
            transition: 'all .2s',
            boxShadow: query.trim() && !isLoading ? '0 4px 18px rgba(108,99,255,0.38)' : 'none',
          }}
          onMouseEnter={e => { if (query.trim() && !isLoading) { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(108,99,255,0.55)'; }}}
          onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=query.trim()?'0 4px 18px rgba(108,99,255,0.38)':'none'; }}
        >{isLoading ? 'Thinking...' : 'Generate →'}</button>
      </div>

      {/* ── Dropdown — inline, directly below input bar, never overlaps ── */}
      {showDrop && filtered.length > 0 && (
        <div style={{
          background: 'var(--bg3, #0D1225)',
          border: '1px solid rgba(108,99,255,0.22)',
          borderTop: 'none',
          borderRadius: '0 0 18px 18px',
          overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(0,0,0,0.50)',
          // No position:absolute, no z-index — sits naturally in flow below the bar
        }}>
          {filtered.map((s, i) => (
            <div key={s}
              onMouseDown={() => { setQuery(s); setShowDrop(false); inputRef.current?.focus(); }}
              style={{
                padding: '13px 18px', fontSize: '13px', color: 'var(--muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                borderTop: i > 0 ? '1px solid rgba(108,99,255,0.08)' : 'none',
                transition: 'background .15s, color .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(108,99,255,0.10)'; e.currentTarget.style.color='var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--muted)'; }}
            >
              <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'rgba(108,99,255,0.14)', border: '1px solid rgba(108,99,255,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#A29BFE', flexShrink: 0 }}>✦</span>
              {s}
            </div>
          ))}
        </div>
      )}

      {/* Hints */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
        {[{ k: 'Enter', l: 'submit query' }, { k: 'Follow-ups', l: 'context retained' }, { k: 'Vague prompts', l: 'handled gracefully' }].map(({ k, l }) => (
          <span key={k} style={{ fontSize: '11px', color: 'var(--muted2)' }}>
            <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{k}</span> · {l}
          </span>
        ))}
      </div>
    </div>
  );
}