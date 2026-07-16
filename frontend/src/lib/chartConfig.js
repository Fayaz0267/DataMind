export const CHART_COLORS = [
  '#6C63FF', '#FF6B9D', '#00D4AA', '#FF9F43',
  '#4ECDC4', '#A29BFE', '#FD79A8', '#55EFC4',
  '#FDCB6E', '#74B9FF', '#E17055', '#81ECEC',
];

export const formatAxisTick = (v) => {
  if (typeof v === 'number') {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1e6).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000)     return `${(v / 1e3).toFixed(0)}K`;
    return v.toLocaleString();
  }
  if (typeof v === 'string' && v.length > 10) return v.slice(0, 10) + '…';
  return v;
};

export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: '#0D1225',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '14px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
    fontFamily: "'DM Sans',sans-serif",
    padding: '12px 16px',
  },
  labelStyle: {
    fontFamily: "'Syne',sans-serif",
    fontWeight: 700,
    color: '#F0F0FF',
    marginBottom: '6px',
  },
  itemStyle: {
    color: 'rgba(240,240,255,0.65)',
    fontSize: '13px',
  },
};

export const AXIS_STYLE = {
  tick:     { fill: 'rgba(240,240,255,0.36)', fontSize: 11, fontFamily: "'DM Sans',sans-serif" },
  axisLine: { stroke: 'rgba(255,255,255,0.06)' },
  tickLine: false,
};

export const GRID_STYLE = {
  strokeDasharray: '3 6',
  stroke: 'rgba(255,255,255,0.05)',
  vertical: false,
};