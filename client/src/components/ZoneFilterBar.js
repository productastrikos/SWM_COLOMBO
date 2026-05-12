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
    <div className={`flex items-center flex-wrap gap-1.5 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide mr-0.5"
        style={{ color: 'var(--cwm-text-faint)' }}>Zone:</span>
      {ZONES.map(z => {
        const active = value === z.id;
        return (
          <button
            key={z.id}
            onClick={() => onChange(z.id)}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all"
            style={{
              background:  active ? 'rgba(59, 125, 232, 0.15)' : 'transparent',
              borderColor: active ? 'rgba(59, 125, 232, 0.45)' : 'var(--cwm-border)',
              color:       active ? '#3b7de8'                   : 'var(--cwm-text-faint)',
            }}
          >
            {z.label}
          </button>
        );
      })}
    </div>
  );
}

