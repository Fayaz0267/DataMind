import { useState, useRef, useCallback } from 'react';

const SAMPLE_QUERIES = [
  'Show me monthly revenue as a line chart',
  'Which region has the highest total sales? Bar chart',
  'Revenue distribution by product category',
  'Top 5 performing sales reps',
];

export default function CSVDropzone({ onFileUploaded, isUploading }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError]       = useState('');
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setError('Only .csv files are supported.'); return; }
    setError(''); setFileName(file.name);
    await onFileUploaded(file);
  }, [onFileUploaded]);

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        style={{
          border: `2px dashed ${dragging ? 'var(--c1)' : error ? 'var(--c2)' : 'var(--border2)'}`,
          borderRadius: '24px', padding: '60px 36px', textAlign: 'center',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          background: dragging ? 'rgba(108,99,255,0.09)' : 'var(--glass)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          transition: 'all .25s ease',
          transform: dragging ? 'scale(1.012)' : 'scale(1)',
          boxShadow: dragging
            ? '0 0 80px rgba(108,99,255,0.20), inset 0 0 50px rgba(108,99,255,0.06)'
            : 'var(--shadow-card)',
        }}
      >
        <input
          ref={inputRef} type="file" accept=".csv"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />

        {/* Icon */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '22px', margin: '0 auto 28px',
          background: 'linear-gradient(135deg,rgba(108,99,255,0.22),rgba(255,107,157,0.16))',
          border: '1px solid rgba(108,99,255,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px',
          transition: 'transform .2s, box-shadow .2s',
          transform: dragging ? 'scale(1.12) rotate(-5deg)' : 'scale(1)',
          boxShadow: dragging ? '0 0 40px rgba(108,99,255,0.35)' : '0 8px 24px rgba(0,0,0,0.15)',
        }}>
          {isUploading ? '⏳' : dragging ? '📂' : '📁'}
        </div>

        {isUploading ? (
          <>
            <h3 style={{
              fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '22px',
              color: 'var(--text)', marginBottom: '18px',
            }}>
              Processing your CSV...
            </h3>
            <div style={{
              width: '100%', maxWidth: '280px', margin: '0 auto 14px',
              height: '4px', background: 'var(--glass2)', borderRadius: '100px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg,#6C63FF,#FF3CAC,#FF6B9D)',
                borderRadius: '100px',
                animation: 'loadBar 1.8s ease-in-out infinite',
              }} />
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
              Converting to SQLite · Building schema · Ready to query
            </p>
          </>
        ) : fileName ? (
          <>
            <h3 style={{
              fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '22px',
              background: 'linear-gradient(135deg,#00FF88,#00D4AA)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              marginBottom: '10px',
            }}>
              ✓ {fileName}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
              Upload successful — your data is ready to query
            </p>
            <button
              onClick={e => { e.stopPropagation(); setFileName(''); setError(''); }}
              className="btn btn-ghost btn-sm"
            >
              Upload different file
            </button>
          </>
        ) : (
          <>
            <h3 style={{
              fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '24px',
              color: 'var(--text)', marginBottom: '12px',
            }}>
              {dragging ? 'Drop it here!' : 'Drop your CSV here'}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '24px' }}>
              or{' '}
              <span style={{ color: 'var(--c6)', fontWeight: 500 }}>click to browse</span>
              {' '}— any CSV becomes a queryable database instantly
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {['.csv files', 'Any schema', 'Instant SQL', 'No config'].map(t => (
                <span key={t} style={{
                  fontSize: '12px', padding: '5px 16px',
                  background: 'var(--glass2)', border: '1px solid var(--border)',
                  borderRadius: '100px', color: 'var(--muted)',
                }}>
                  {t}
                </span>
              ))}
            </div>
          </>
        )}

        {error && (
          <p style={{ color: 'var(--c2)', fontSize: '13px', marginTop: '14px' }}>⚠ {error}</p>
        )}
      </div>

      {/* Sample query chips */}
      <div style={{ marginTop: '28px' }}>
        <p style={{ fontSize: '12px', color: 'var(--muted2)', marginBottom: '12px', textAlign: 'center' }}>
          Try these once uploaded:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {SAMPLE_QUERIES.map(q => (
            <span key={q} className="chip">{q}</span>
          ))}
        </div>
      </div>
    </div>
  );
}