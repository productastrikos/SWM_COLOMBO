import React, { useState, useEffect, useContext } from 'react';
import { DataContext } from '../services/socket';
import { getWTE } from '../services/api';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Tooltip, Filler } from 'chart.js';
import { ChartTimeframeControl, TIMEFRAME_OPTIONS, getTimeframeOption, buildTimeframeLabels, resampleSeries, CHART_PALETTES } from '../components/chartUtils';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Tooltip, Filler);

function GaugeCard({ label, value, max, unit, icon }) {
  const pct = Math.min((value / max) * 100, 100);
  const ragKey = pct >= 70 ? 'normal' : pct >= 40 ? 'warning' : 'critical';
  const gaugeColor = ragKey === 'critical' ? '#ef4444' : ragKey === 'warning' ? '#f59e0b' : '#10b981';
  const borderColor = ragKey === 'critical' ? 'border-l-red-500' : ragKey === 'warning' ? 'border-l-amber-500' : 'border-l-emerald-500';
  const dotColor    = ragKey === 'critical' ? 'bg-red-400'       : ragKey === 'warning' ? 'bg-amber-400'       : 'bg-emerald-400';
  const badgeStyle  = ragKey === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/25' : ragKey === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
  const badgeLabel  = ragKey === 'critical' ? 'CRITICAL' : ragKey === 'warning' ? 'WARNING' : 'NORMAL';
  return (
    <div className={`bg-[#0c1520] border border-white/[0.07] border-l-2 ${borderColor} rounded-xl p-3.5 text-center shadow-sm`}>
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-base leading-none">{icon}</div>
        <div className={`w-2 h-2 rounded-full mt-1 ${dotColor}`} />
      </div>
      <div className="relative w-14 h-14 mx-auto mb-2">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <circle cx="32" cy="32" r="28" fill="none" stroke={gaugeColor} strokeWidth="4"
            strokeDasharray={`${pct * 1.76} 176`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white">{typeof value === 'number' ? value.toFixed(1) : value}</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 font-medium mb-1">{label}</p>
      <p className="text-[10px] text-slate-600 mb-2">{unit}</p>
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeStyle}`}>{badgeLabel}</span>
    </div>
  );
}

function FurnaceStatus({ furnace }) {
  const isOp = furnace.status === 'operating';
  const isStandby = furnace.status === 'standby';
  const statusColor = isOp ? 'bg-emerald-500' : isStandby ? 'bg-amber-500' : 'bg-red-500';
  const statusText  = isOp ? 'text-emerald-400' : isStandby ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="bg-cwm-panel border border-cwm-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🔥</span>
          <p className="text-xs font-semibold text-white">{furnace.name || furnace.furnaceId}</p>
        </div>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className={`text-[10px] ${statusText} font-medium`}>{furnace.status}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className={`text-sm font-bold ${furnace.temperature > 1000 ? 'text-red-400' : furnace.temperature > 700 ? 'text-amber-400' : 'text-slate-400'}`}>{furnace.temperature?.toFixed(0) || '-'}°C</p>
          <p className="text-[10px] text-slate-500">Temp</p>
        </div>
        <div>
          <p className={`text-sm font-bold ${furnace.throughput > 10 ? 'text-emerald-400' : furnace.throughput > 5 ? 'text-amber-400' : 'text-slate-400'}`}>{furnace.throughput?.toFixed(1) || '-'} t/h</p>
          <p className="text-[10px] text-slate-500">Throughput</p>
        </div>
        <div>
          <p className={`text-sm font-bold ${furnace.efficiency >= 80 ? 'text-emerald-400' : furnace.efficiency >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{furnace.efficiency?.toFixed(0) || '-'}%</p>
          <p className="text-[10px] text-slate-500">Efficiency</p>
        </div>
      </div>
    </div>
  );
}

/* ── Static data: Waste input breakdown (total 620t) ── */
const WASTE_INPUT = [
  { material: 'Organic',   tonnes: 359.6, pct: 58 },
  { material: 'Plastic',   tonnes: 86.8,  pct: 14 },
  { material: 'Paper',     tonnes: 68.2,  pct: 11 },
  { material: 'Glass',     tonnes: 31.0,  pct: 5  },
  { material: 'Metal',     tonnes: 24.8,  pct: 4  },
  { material: 'Hazardous', tonnes: 12.4,  pct: 2  },
  { material: 'Other',     tonnes: 37.2,  pct: 6  },
];

/* ── Static data: 7-day daily energy output (MWh/day) ── */
const SEVEN_DAY_ENERGY = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  values: [191, 196, 188, 203, 197, 180, 186], // MWh/day (8.2 MW * 24h ≈ 196.8 MWh baseline)
};

/* ── Static data: Downtime log (3.2% = ~46 min/day) ── */
const DOWNTIME_LOG = [
  { event: 'FRN-02 feed rate adjustment',   duration: 18, date: 'Today 06:20',    category: 'maintenance' },
  { event: 'Ash removal procedure — Pit 2', duration: 14, date: 'Today 08:45',    category: 'scheduled'   },
  { event: 'Emission sensor calibration',   duration: 9,  date: 'Today 11:00',    category: 'maintenance' },
  { event: 'FRN-03 standby warm-down',      duration: 5,  date: 'Today 05:55',    category: 'operational' },
];

export default function WTEPlant() {
  const { kpis } = useContext(DataContext);
  const [wte, setWte] = useState(null);
  const [expanded, setExpanded] = useState(new Set(['efficiency', 'waste_input', 'energy_7day']));
  const [powerFrame, setPowerFrame] = useState('24H');
  const [energyFrame, setEnergyFrame] = useState('7D');
  const activePowerFrame = getTimeframeOption(TIMEFRAME_OPTIONS.intradayOps, powerFrame);
  const activeEnergyFrame = getTimeframeOption(TIMEFRAME_OPTIONS.weekly, energyFrame);
  const toggle = (key) => setExpanded(prev => {
    const n = new Set(prev);
    n.has(key) ? n.delete(key) : n.add(key);
    return n;
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getWTE();
        setWte(res.data?.wte || res.data);
      } catch (e) { console.error(e); }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const plant = wte || {};
  const k = kpis || {};

  const basePowerVals = Array.from({ length: 24 }, (_, i) => {
    // Simulate power output peaking mid-day; RAG: <6 red, 6-8 amber, >=8 green
    const base = 7 + Math.sin((i - 6) * Math.PI / 12) * 2;
    return Math.max(3, parseFloat((base + (Math.random() - 0.5) * 1.2).toFixed(2)));
  });
  const powerVals = resampleSeries(basePowerVals, activePowerFrame.points);
  const powerOutputData = {
    labels: buildTimeframeLabels(activePowerFrame.value, activePowerFrame.points),
    datasets: [{
      label: 'MW Output',
      data: powerVals,
      borderColor: CHART_PALETTES.area.cyan.border, backgroundColor: CHART_PALETTES.area.cyan.fill,
      fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5,
    }]
  };

  const sevenDayData = {
    labels: buildTimeframeLabels(activeEnergyFrame.value, activeEnergyFrame.points),
    datasets: [{
      label: 'Energy Output (MWh)',
      data: resampleSeries(SEVEN_DAY_ENERGY.values, activeEnergyFrame.points),
      backgroundColor: 'rgba(6,182,212,0.65)',
      borderColor: CHART_PALETTES.area.cyan.border,
      borderRadius: 4,
    }]
  };

  const wasteInputData = {
    labels: WASTE_INPUT.map(w => w.material),
    datasets: [{
      label: 'Tonnes',
      data: WASTE_INPUT.map(w => w.tonnes),
      backgroundColor: 'rgba(6,182,212,0.55)',
      borderColor: CHART_PALETTES.area.cyan.border,
      borderWidth: 1,
      borderRadius: 4,
    }]
  };

  const emissionData = {
    labels: ['CO₂', 'SO₂', 'NOₓ', 'PM', 'Dioxins'],
    datasets: [{
      data: [65, 42, 55, 30, 20],
      backgroundColor: CHART_PALETTES.categorical.slice(0, 5),
      borderWidth: 0,
    }]
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-cwm-border pb-3">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">WTE Plant Operations</h1>
          <p className="text-sm text-slate-500 mt-1">Waste-to-Energy incineration · Energy output · Emission monitoring · Weighbridge data</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400">● OPERATING</span>
          <span className="text-slate-500">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
      {/* Plant Header */}
      <div className="bg-cwm-panel border border-cwm-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Kerawalapitiya WTE Facility</h2>
            <p className="text-[10px] text-slate-500">Waste-to-Energy Incineration Plant • Capacity: 700 tons/day</p>
          </div>
          <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${plant.status === 'operational' || plant.status === 'running' ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
            <span className="text-xs text-slate-300">{plant.status || 'operational'}</span>
          </div>
        </div>
      </div>

      {/* KPI Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <GaugeCard icon="⚡" label="Power Output" value={k.wteOutput || plant.powerOutput || plant.energyOutput || 8.2} max={12} unit="MW" />
        <GaugeCard icon="🗑️" label="Daily Intake" value={k.wteIntake || plant.dailyIntake || plant.currentIntake || 620} max={700} unit="tons" />
        <GaugeCard icon="📊" label="Efficiency" value={k.wteEfficiency || plant.efficiency || 82} max={100} unit="%" />
        <GaugeCard icon="🌡️" label="Avg Temp" value={plant.avgTemperature || plant.furnaceTemp || 850} max={1200} unit="°C" />
        <GaugeCard icon="💨" label="Emission Index" value={plant.emissionIndex || 72} max={100} unit="/100" />
        <GaugeCard icon="🔄" label="Uptime" value={plant.uptime || 96.8} max={100} unit="%" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="bg-cwm-panel border border-cwm-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-white">Power Output</h3>
            <ChartTimeframeControl options={TIMEFRAME_OPTIONS.intradayOps} value={powerFrame} onChange={setPowerFrame} />
          </div>
          <div style={{ height: 160 }}>
            <Line data={powerOutputData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 8 },
              },
              scales: {
                x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 } } },
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 9 } } }
              }
            }} />
          </div>
        </div>
        <div className="bg-cwm-panel border border-cwm-border rounded-lg p-3">
          <h3 className="text-xs font-semibold text-white mb-2">Emissions (% of Limit)</h3>
          <div className="flex items-center justify-center" style={{ height: 160 }}>
            <div style={{ width: 140, height: 140 }}>
              <Doughnut data={emissionData} options={{
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: {
                  legend: { display: false },
                  tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 8, callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}% of limit` } }
                }
              }} />
            </div>
            <div className="ml-4 space-y-1">
              {['CO₂', 'SO₂', 'NOₓ', 'PM', 'Dioxins'].map((e, i) => (
                <div key={e} className="flex items-center space-x-1.5 text-[10px]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: emissionData.datasets[0].backgroundColor[i] }} />
                  <span className="text-slate-400">{e}: {emissionData.datasets[0].data[i]}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Furnaces */}
      <div>
        <h3 className="text-xs font-semibold text-white mb-2">Furnace Units</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {(plant.furnaces || [
            { furnaceId: 'FRN-01', name: 'Furnace A', status: 'operating', temperature: 870, throughput: 12.5, efficiency: 84 },
            { furnaceId: 'FRN-02', name: 'Furnace B', status: 'operating', temperature: 845, throughput: 11.8, efficiency: 81 },
            { furnaceId: 'FRN-03', name: 'Furnace C', status: 'standby', temperature: 420, throughput: 0, efficiency: 0 },
          ]).map(f => <FurnaceStatus key={f.furnaceId} furnace={f} />)}
        </div>
      </div>

      {/* Plant Efficiency Panel */}
      <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
        <button onClick={() => toggle('efficiency')}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-cwm-border hover:bg-white/[0.02]">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">⚡ Plant Efficiency Analysis</h3>
          <span className="text-slate-500 text-xs">{expanded.has('efficiency') ? '▲' : '▼'}</span>
        </button>
        {expanded.has('efficiency') && (
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Actual Output',     value: '8.2 MW',   sub: 'current generation',     color: 'text-emerald-400' },
                { label: 'Theoretical Max',   value: '10.0 MW',  sub: 'at 82% thermal eff.',     color: 'text-white'       },
                { label: 'Efficiency',        value: '82.0%',    sub: 'vs. 87% target',          color: 'text-amber-400'  },
                { label: 'Opportunity Loss',  value: '1.8 MW',   sub: 'FRN-03 offline impact',   color: 'text-red-400'    },
              ].map((s, i) => (
                <div key={i} className="bg-cwm-darker border border-cwm-border rounded-lg p-3 text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] font-medium text-white mt-0.5">{s.label}</p>
                  <p className="text-[9px] text-slate-500">{s.sub}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                { label: 'Thermal Efficiency',  value: 82,  target: 87,  unit: '%' },
                { label: 'Furnace Utilization', value: 66.7,target: 100, unit: '% (2/3 active)' },
                { label: 'Grid Export Rate',    value: 96.8,target: 98,  unit: '%' },
              ].map((r, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400">{r.label}</span>
                    <span className={r.value >= r.target ? 'text-emerald-400' : 'text-amber-400'}>{r.value}{r.unit.startsWith('%') ? '' : ' '}{r.unit.startsWith('%') ? '%' : r.unit} <span className="text-slate-600">/ {r.target}{r.unit.startsWith('%') ? '%' : ''} target</span></span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${r.value >= r.target ? 'bg-emerald-500' : r.value >= r.target * 0.9 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min((r.value / r.target) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Waste Input Breakdown */}
      <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
        <button onClick={() => toggle('waste_input')}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-cwm-border hover:bg-white/[0.02]">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">🗑️ Waste Input Breakdown — 620 t/day</h3>
          <span className="text-slate-500 text-xs">{expanded.has('waste_input') ? '▲' : '▼'}</span>
        </button>
        {expanded.has('waste_input') && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div style={{ height: 180 }}>
              <Bar data={wasteInputData} options={{
                responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                plugins: {
                  legend: { display: false },
                  tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 8 },
                },
                scales: {
                  x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 9 } } },
                  y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                }
              }} />
            </div>
            <div className="space-y-1.5">
              {WASTE_INPUT.map((w, i) => (
                <div key={w.material} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: wasteInputData.datasets[0].backgroundColor[i] }} />
                    <span className="text-slate-400">{w.material}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-slate-300 font-medium">{w.tonnes} t</span>
                    <span className="text-slate-500 w-8 text-right">{w.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 7-Day Energy Output */}
      <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
        <button onClick={() => toggle('energy_7day')}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-cwm-border hover:bg-white/[0.02]">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">📊 Energy Output Trend</h3>
          <span className="text-slate-500 text-xs">{expanded.has('energy_7day') ? '▲' : '▼'}</span>
        </button>
        {expanded.has('energy_7day') && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3 text-[10px]">
              <div className="flex items-center space-x-1"><div className="w-2 h-2 rounded bg-cyan-500/70" /><span className="text-slate-400">Energy output</span></div>
              <ChartTimeframeControl options={TIMEFRAME_OPTIONS.weekly} value={energyFrame} onChange={setEnergyFrame} />
            </div>
            <div style={{ height: 160 }}>
              <Bar data={sevenDayData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 8 },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                  y: { min: 170, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 9 }, callback: v => `${v}` } }
                }
              }} />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">Weekly avg: {(SEVEN_DAY_ENERGY.values.reduce((a, b) => a + b, 0) / 7).toFixed(1)} MWh/day · Baseline target: 196.8 MWh/day (8.2 MW × 24h)</p>
          </div>
        )}
      </div>

      {/* Downtime Tracking */}
      <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
        <button onClick={() => toggle('downtime')}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-cwm-border hover:bg-white/[0.02]">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">🔧 Downtime Tracking — 3.2% (≈46 min/day)</h3>
          <span className="text-slate-500 text-xs">{expanded.has('downtime') ? '▲' : '▼'}</span>
        </button>
        {expanded.has('downtime') && (
          <div className="divide-y divide-white/5">
            {DOWNTIME_LOG.map((d, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02]">
                <div>
                  <p className="text-[11px] font-medium text-white">{d.event}</p>
                  <p className="text-[10px] text-slate-500">{d.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-amber-400">{d.duration} min</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                    d.category === 'maintenance' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    d.category === 'scheduled'   ? 'bg-slate-500/10 border-slate-500/30 text-slate-400' :
                    'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}>{d.category}</span>
                </div>
              </div>
            ))}
            <div className="px-4 py-2 bg-white/[0.02] flex items-center justify-between text-[10px]">
              <span className="text-slate-500">Total downtime today</span>
              <span className="font-bold text-white">{DOWNTIME_LOG.reduce((s, d) => s + d.duration, 0)} min ({(DOWNTIME_LOG.reduce((s, d) => s + d.duration, 0) / (24 * 60) * 100).toFixed(1)}% of capacity)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

