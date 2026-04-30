import React from 'react';

const ZONES = [
  { id: 'all',    label: 'All Zones' },
  { id: 'Zone 1', label: 'Z1 – N. Port'  },
  { id: 'Zone 2', label: 'Z2 – Inner N.' },
  { id: 'Zone 3', label: 'Z3 – Central'  },
  { id: 'Zone 4', label: 'Z4 – W. Coast' },
  { id: 'Zone 5', label: 'Z5 – Southern' },
];

export default function ZoneFilterBar({ value, onChange, className = '' }) {
  return (
    <div className={`flex items-center flex-wrap gap-1 ${className}`}>
      <span className="text-[10px] text-slate-500 mr-0.5">Zone:</span>
      {ZONES.map(z => (
        <button
          key={z.id}
          onClick={() => onChange(z.id)}
          className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-colors ${
            value === z.id
              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
              : 'bg-white/[0.02] border-white/[0.05] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
          }`}
        >
          {z.label}
        </button>
      ))}
    </div>
  );
}
