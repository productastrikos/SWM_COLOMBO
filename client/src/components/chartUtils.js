import React from 'react';

export const CHART_PALETTES = {
  categorical: ['#06b6d4', '#8b5cf6', '#3b82f6', '#ec4899', '#64748b', '#14b8a6', '#6366f1', '#a855f7'],
  area: {
    cyan: { border: '#06b6d4', fill: 'rgba(6,182,212,0.10)' },
    violet: { border: '#8b5cf6', fill: 'rgba(139,92,246,0.10)' },
    blue: { border: '#3b82f6', fill: 'rgba(59,130,246,0.10)' },
    pink: { border: '#ec4899', fill: 'rgba(236,72,153,0.10)' },
    slate: { border: '#94a3b8', fill: 'rgba(148,163,184,0.10)' },
  },
};

const LABEL_BUILDERS = {
  '6H': (n) => Array.from({ length: n }, (_, i) => `${String(i * 15).padStart(2, '0')}m`),
  '12H': (n) => Array.from({ length: n }, (_, i) => `${String(i).padStart(2, '0')}:00`),
  '24H': (n) => Array.from({ length: n }, (_, i) => `${String(i).padStart(2, '0')}:00`),
  '7D': (n) => Array.from({ length: n }, (_, i) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i % 7]),
  '30D': (n) => Array.from({ length: n }, (_, i) => `D${i + 1}`),
  '6M': (n) => ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].slice(-n),
  '12M': (n) => Array.from({ length: n }, (_, i) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i % 12]),
};

export const TIMEFRAME_OPTIONS = {
  intradayOps: [
    { value: '6H', label: '6H', points: 12 },
    { value: '12H', label: '12H', points: 12 },
    { value: '24H', label: '24H', points: 24 },
  ],
  dailyOps: [
    { value: '24H', label: '24H', points: 24 },
    { value: '7D', label: '7D', points: 7 },
  ],
  weekly: [
    { value: '7D', label: '7D', points: 7 },
    { value: '30D', label: '30D', points: 30 },
  ],
  monthly: [
    { value: '6M', label: '6M', points: 6 },
    { value: '12M', label: '12M', points: 12 },
  ],
};

export function ChartTimeframeControl({ options, value, onChange }) {
  if (!options || options.length < 2) return null;
  return (
    <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
            value === opt.value ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function getTimeframeOption(options, value) {
  return options.find((opt) => opt.value === value) || options[0];
}

export function buildTimeframeLabels(timeframe, points) {
  return (LABEL_BUILDERS[timeframe] || LABEL_BUILDERS['24H'])(points);
}

export function resampleSeries(base, points) {
  if (!Array.isArray(base) || base.length === 0) return [];
  if (base.length === points) return base;
  if (points === 1) return [base[base.length - 1]];
  return Array.from({ length: points }, (_, i) => {
    const pos = (i / (points - 1)) * (base.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(base.length - 1, Math.ceil(pos));
    const mix = pos - lo;
    return parseFloat((base[lo] + (base[hi] - base[lo]) * mix).toFixed(2));
  });
}
