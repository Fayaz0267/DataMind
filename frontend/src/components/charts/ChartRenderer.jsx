import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS, TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE, formatAxisTick } from '../../lib/chartConfig';

export default function ChartRenderer({ chartType, data, chartConfig }) {
  if (!data?.length) return <Empty />;

  const type  = (chartType || 'bar').toLowerCase();
  const xKey  = chartConfig?.xKey || Object.keys(data[0])[0];
  const yKeys = chartConfig?.yKeys || Object.keys(data[0]).filter(k => k !== xKey);

  const common = { data, margin: { top: 10, right: 20, left: 4, bottom: 8 } };

  if (type === 'table') return <DataTable data={data} />;

  /* ── PIE / DONUT ── */
  if (type === 'pie' || type === 'donut') return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%" cy="50%"
          innerRadius={type === 'donut' ? '52%' : 0}
          outerRadius="74%"
          paddingAngle={3}
          dataKey={yKeys[0]}
          nameKey={xKey}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1 }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.90} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend formatter={v => (
          <span style={{ color: 'rgba(240,240,255,0.55)', fontSize: '12px' }}>{v}</span>
        )} />
      </PieChart>
    </ResponsiveContainer>
  );

  /* ── AREA ── */
  if (type === 'area') return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart {...common}>
        <defs>
          {yKeys.map((k, i) => (
            <linearGradient key={k} id={`ag${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.32} />
              <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey={xKey} {...AXIS_STYLE} tickFormatter={formatAxisTick} />
        <YAxis {...AXIS_STYLE} tickFormatter={formatAxisTick} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend formatter={v => <span style={{ color: 'rgba(240,240,255,0.55)', fontSize: '12px' }}>{v}</span>} />
        {yKeys.map((k, i) => (
          <Area
            key={k} type="monotone" dataKey={k}
            stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.5}
            fill={`url(#ag${i})`}
            dot={false} activeDot={{ r: 5, strokeWidth: 0 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );

  /* ── LINE ── */
  if (type === 'line') return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart {...common}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey={xKey} {...AXIS_STYLE} tickFormatter={formatAxisTick} />
        <YAxis {...AXIS_STYLE} tickFormatter={formatAxisTick} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend formatter={v => <span style={{ color: 'rgba(240,240,255,0.55)', fontSize: '12px' }}>{v}</span>} />
        {yKeys.map((k, i) => (
          <Line
            key={k} type="monotone" dataKey={k}
            stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.5}
            dot={false} activeDot={{ r: 5, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  /* ── SCATTER ── */
  if (type === 'scatter') return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart {...common}>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey={Object.keys(data[0])[0]} {...AXIS_STYLE} />
        <YAxis dataKey={Object.keys(data[0])[1]} {...AXIS_STYLE} />
        <Tooltip {...TOOLTIP_STYLE} />
        <Scatter data={data} fill={CHART_COLORS[0]} fillOpacity={0.85} />
      </ScatterChart>
    </ResponsiveContainer>
  );

  /* ── BAR (default) ── */
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart {...common} barCategoryGap="30%">
        <defs>
          {yKeys.map((k, i) => (
            <linearGradient key={k} id={`bg${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={1} />
              <stop offset="100%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.50} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey={xKey} {...AXIS_STYLE} tickFormatter={formatAxisTick} />
        <YAxis {...AXIS_STYLE} tickFormatter={formatAxisTick} />
        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Legend formatter={v => <span style={{ color: 'rgba(240,240,255,0.55)', fontSize: '12px' }}>{v}</span>} />
        {yKeys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={`url(#bg${i})`} radius={[7, 7, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Data Table ── */
function DataTable({ data }) {
  const cols = Object.keys(data[0]);
  return (
    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.09)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: 'rgba(108,99,255,0.08)' }}>
            {cols.map(c => (
              <th key={c} style={{
                padding: '11px 16px', textAlign: 'left',
                fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '11px',
                color: 'rgba(240,240,255,0.50)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                borderBottom: '1px solid rgba(255,255,255,0.10)',
              }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {cols.map(c => (
                <td key={c} style={{ padding: '10px 16px', color: '#F0F0FF', fontSize: '13px' }}>
                  {typeof row[c] === 'number' ? row[c].toLocaleString() : String(row[c] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Empty state ── */
function Empty() {
  return (
    <div style={{
      height: '200px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '12px',
    }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: '14px',
        background: 'rgba(108,99,255,0.10)', border: '1px solid rgba(108,99,255,0.20)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', opacity: .5,
      }}>📊</div>
      <p style={{ fontSize: '13px', color: 'rgba(240,240,255,0.30)', margin: 0 }}>
        No data available for this query
      </p>
    </div>
  );
}