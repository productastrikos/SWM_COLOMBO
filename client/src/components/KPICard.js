import React from 'react';

const RAG_CONFIG = {
  normal: {
    cardBorder: 'border-emerald-500/[0.22]',
    border:     'border-l-emerald-500',
    iconBg:     'bg-emerald-500/[0.12]',
    dot:        'bg-emerald-400',
    badge:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    label:      'NORMAL',
  },
  warning: {
    cardBorder: 'border-amber-500/[0.22]',
    border:     'border-l-amber-500',
    iconBg:     'bg-amber-500/[0.12]',
    dot:        'bg-amber-400',
    badge:      'bg-amber-500/10 text-amber-400 border-amber-500/25',
    label:      'WARNING',
  },
  critical: {
    cardBorder: 'border-red-500/[0.28]',
    border:     'border-l-red-500',
    iconBg:     'bg-red-500/[0.12]',
    dot:        'bg-red-400',
    badge:      'bg-red-500/10 text-red-400 border-red-500/25',
    label:      'CRITICAL',
  },
};

export function deriveRag(color) {
  if (!color) return 'normal';
  if (color.includes('red'))                                                   return 'critical';
  if (color.includes('amber') || color.includes('yellow') || color.includes('orange')) return 'warning';
  return 'normal';
}

/**
 * Shared KPI card used across Dashboard (clickable) and all subsystem stat strips.
 *
 * Props:
 *   label    — card label text
 *   value    — main displayed value
 *   unit     — optional unit string
 *   icon     — emoji or JSX icon
 *   color    — Tailwind text-* class used to derive RAG and color the value
 *   rag      — explicit rag key ('normal' | 'warning' | 'critical'), overrides color-derived
 *   trend    — percent change as number (omit to hide trend row)
 *   onClick  — makes card clickable and shows hover effect
 */
export default function KPICard({ label, value, unit, icon, color, rag: ragProp, trend, onClick }) {
  const ragKey = ragProp || deriveRag(color);
  const r = RAG_CONFIG[ragKey] || RAG_CONFIG.normal;
  const hasTrend = trend !== null && trend !== undefined;
  const isPos    = (trend || 0) >= 0;

  return (
    <div
      onClick={onClick}
      className={[
        'bg-[#0c1520] border border-l-2',
        r.cardBorder,
        r.border,
        'rounded-xl p-3.5 transition-all duration-200 shadow-sm',
        onClick ? 'cursor-pointer hover:brightness-[1.08] hover:shadow-lg' : '',
      ].join(' ')}
    >
      {/* Icon row */}
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${r.iconBg} flex items-center justify-center text-base leading-none flex-shrink-0`}>
          {icon || '▣'}
        </div>
        <div className={`w-2 h-2 rounded-full mt-0.5 ${r.dot}`} />
      </div>

      {/* Value */}
      <div className="mb-0.5 leading-none">
        <span className={`text-2xl font-bold ${color?.startsWith('text-') ? color : 'text-white'}`}>
          {value}
        </span>
        {unit && <span className="text-xs text-slate-500 ml-1">{unit}</span>}
      </div>

      {/* Label */}
      <p className="text-[11px] text-slate-400 font-medium mb-2.5 leading-snug">{label}</p>

      {/* Badge + optional trend */}
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${r.badge}`}>
          {r.label}
        </span>
        {hasTrend && (
          <span className={`text-[10px] font-semibold ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPos ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
