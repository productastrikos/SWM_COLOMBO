import React, { useState, useEffect, useContext } from 'react';
import { DataContext } from '../services/socket';
import { getFacilities } from '../services/api';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler } from 'chart.js';
import KPICard from '../components/KPICard';
import KPIDetailModal from '../components/KPIDetailModal';
import { ChartTimeframeControl, TIMEFRAME_OPTIONS, getTimeframeOption, buildTimeframeLabels, resampleSeries, CHART_PALETTES } from '../components/chartUtils';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler);

/* ── Static baseline landfill data (shown when API returns no landfill records) ── */
const STATIC_LANDFILLS = [
  {
    facilityId: 'LF-ARW', name: 'Aruwakkalu Sanitary Landfill', location: 'Puttalam District (120 km north)',
    status: 'active', capacityUsed: 34.2, dailyIntake: 800, totalCapacity: 2000000, remainingYears: 4.8,
    leachateLevel: 45, methaneLevel: 18, groundwaterQuality: 'Normal', odorIndex: 3, type: 'landfill',
    gasCaptureRate: 62, complianceScore: 87, operator: 'CMC / NSWMSC',
    cellsActive: 3, cellsTotal: 8, ashVolume: 120, linerIntegrity: 'Good',
    leachateTreatmentCap: 800, leachateTreatedToday: 510,
  },
  {
    facilityId: 'LF-KRD', name: 'Karadiyana (Remediation)', location: 'Colombo South — Boralesgamuwa',
    status: 'closed', capacityUsed: 98.5, dailyIntake: 0, totalCapacity: 500000, remainingYears: 0,
    leachateLevel: 78, methaneLevel: 35, groundwaterQuality: 'Monitoring', odorIndex: 7, type: 'landfill',
    gasCaptureRate: 41, complianceScore: 54, operator: 'CMC Remediation Unit',
    cellsActive: 0, cellsTotal: 4, ashVolume: 0, linerIntegrity: 'Degraded',
    leachateTreatmentCap: 300, leachateTreatedToday: 215,
  },
];

function LandfillCard({ landfill }) {
  const capacity = landfill.capacityUsed || landfill.utilization || 0;
  const remaining = landfill.remainingYears || 0;
  const capColor = capacity > 85 ? 'text-red-400' : capacity > 65 ? 'text-amber-400' : 'text-emerald-400';
  const barColor = capacity > 85 ? 'bg-red-500' : capacity > 65 ? 'bg-amber-500' : 'bg-emerald-500';
  const isActive = landfill.status === 'active' || landfill.status === 'operational';

  return (
    <div className="bg-cwm-panel border border-cwm-border rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🏔️</span>
          <div>
            <h3 className="text-sm font-bold text-white">{landfill.name}</h3>
            <p className="text-[10px] text-slate-500">{typeof landfill.location === 'string' ? landfill.location : 'Colombo Region'}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">Operator: {landfill.operator || 'CMC'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
            isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
            landfill.status === 'near_capacity' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
            'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>{(landfill.status || 'active').replace(/_/g, ' ').toUpperCase()}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
            (landfill.complianceScore || 80) >= 80 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            (landfill.complianceScore || 80) >= 60 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
            'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>Compliance: {landfill.complianceScore || 80}%</span>
        </div>
      </div>

      {/* Capacity bar */}
      <div>
        <div className="flex items-end justify-between mb-1">
          <div>
            <span className={`text-2xl font-bold ${capColor}`}>{capacity.toFixed(1)}%</span>
            <span className="text-[10px] text-slate-500 ml-2">capacity used</span>
          </div>
          <span className="text-[10px] text-slate-500">{(landfill.totalCapacity || 0).toLocaleString()} m³ total</span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(capacity, 100)}%` }} />
        </div>
        <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
          <span>0%</span><span>Active cells: {landfill.cellsActive || 0}/{landfill.cellsTotal || 0}</span><span>100%</span>
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
          <p className={`text-lg font-bold ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>{(landfill.dailyIntake || 0).toFixed(0)}<span className="text-[10px] text-slate-500 ml-0.5">t</span></p>
          <p className="text-[10px] text-slate-500">Daily Intake</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
          <p className={`text-lg font-bold ${remaining > 3 ? 'text-emerald-400' : remaining > 1 ? 'text-amber-400' : 'text-red-400'}`}>{remaining.toFixed(1)}<span className="text-[10px] text-slate-500 ml-0.5">yrs</span></p>
          <p className="text-[10px] text-slate-500">Est. Life Left</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
          <p className={`text-lg font-bold ${(landfill.gasCaptureRate || 0) >= 75 ? 'text-emerald-400' : (landfill.gasCaptureRate || 0) >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{(landfill.gasCaptureRate || 0).toFixed(2)}<span className="text-[10px] text-slate-500 ml-0.5">%</span></p>
          <p className="text-[10px] text-slate-500">Gas Capture</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
          <p className={`text-lg font-bold ${(landfill.leachateLevel || 0) < 60 ? 'text-emerald-400' : (landfill.leachateLevel || 0) < 80 ? 'text-amber-400' : 'text-red-400'}`}>{(landfill.leachateLevel || 0).toFixed(0)}<span className="text-[10px] text-slate-500 ml-0.5">%</span></p>
          <p className="text-[10px] text-slate-500">Leachate Level</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
          <p className={`text-lg font-bold ${(landfill.methaneLevel || 0) < 25 ? 'text-emerald-400' : 'text-red-400'}`}>{(landfill.methaneLevel || 0).toFixed(0)}<span className="text-[10px] text-slate-500 ml-0.5">ppm</span></p>
          <p className="text-[10px] text-slate-500">Methane</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
          <p className={`text-lg font-bold ${(landfill.odorIndex || 0) < 5 ? 'text-emerald-400' : (landfill.odorIndex || 0) < 7 ? 'text-amber-400' : 'text-red-400'}`}>{(landfill.odorIndex || 0).toFixed(0)}<span className="text-[10px] text-slate-500 ml-0.5">/10</span></p>
          <p className="text-[10px] text-slate-500">Odor Index</p>
        </div>
      </div>

      {/* Leachate Treatment */}
      <div>
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-slate-500">Leachate Treatment ({landfill.leachateTreatedToday || 0} / {landfill.leachateTreatmentCap || 0} m³/day)</span>
          <span className={`font-bold ${
            ((landfill.leachateTreatedToday || 0) / (landfill.leachateTreatmentCap || 1) * 100) > 90 ? 'text-red-400' : 'text-emerald-400'
          }`}>{(((landfill.leachateTreatedToday || 0) / (landfill.leachateTreatmentCap || 1)) * 100).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${
            ((landfill.leachateTreatedToday || 0) / (landfill.leachateTreatmentCap || 1)) > 0.9 ? 'bg-red-500' : 'bg-emerald-500'
          }`} style={{ width: `${Math.min(((landfill.leachateTreatedToday || 0) / (landfill.leachateTreatmentCap || 1)) * 100, 100)}%` }} />
        </div>
      </div>

      {/* Environmental monitoring */}
      <div className="pt-3 border-t border-white/5">
        <p className="text-[10px] text-slate-500 mb-2">Environmental Monitoring</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'GW Quality', value: landfill.groundwaterQuality || 'Normal', ok: (landfill.groundwaterQuality || 'Normal') === 'Normal' },
            { label: 'Liner',      value: landfill.linerIntegrity || 'Good',       ok: (landfill.linerIntegrity || 'Good') === 'Good' },
            { label: 'Odor',       value: `${(landfill.odorIndex || 0).toFixed(0)}/10`,              ok: (landfill.odorIndex || 0) < 6 },
          ].map((m, i) => (
            <div key={i} className="text-center bg-white/[0.02] rounded-lg p-2">
              <div className={`w-2 h-2 rounded-full mx-auto mb-1 ${m.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <p className="text-[11px] text-slate-300 font-medium">{m.value}</p>
              <p className="text-[10px] text-slate-600">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Normalise API-returned landfill objects to the shape expected by LandfillCard.
// Falls back to STATIC_LANDFILLS values when the API returns 0 or null for any field.
function normalizeLandfill(lf) {
  const fb = STATIC_LANDFILLS.find(s => s.facilityId === lf.facilityId)
    || STATIC_LANDFILLS.find(s => (lf.name || '').toLowerCase().includes(s.name.split(' ')[0].toLowerCase()))
    || STATIC_LANDFILLS.find(s => (lf.facilityId || '').toUpperCase().includes(s.facilityId.split('-')[1]))
    || {};
  const totalCap = lf.totalCapacity || fb.totalCapacity || 1;
  // Use API value when it is non-zero/non-null, else use static baseline
  const num = (apiVal, fbKey) => (apiVal != null && apiVal !== 0) ? apiVal : (fb[fbKey] ?? 0);
  const str = (apiVal, fbKey) => (apiVal && apiVal !== '') ? apiVal : (fb[fbKey] ?? '');
  const capUsed = lf.capacityUsed != null && lf.capacityUsed > 0
    ? lf.capacityUsed
    : lf.usedCapacity != null && lf.usedCapacity > 0
      ? parseFloat(((lf.usedCapacity / totalCap) * 100).toFixed(1))
      : fb.capacityUsed ?? 0;
  return {
    ...fb,
    ...lf,
    totalCapacity:        totalCap,
    capacityUsed:         capUsed,
    dailyIntake:          num(lf.dailyIntake ?? lf.currentDailyIntake ?? lf.dailyCapacity, 'dailyIntake'),
    remainingYears:       num(lf.remainingYears ?? lf.remainingLifeYears, 'remainingYears'),
    gasCaptureRate:       num(lf.gasCaptureRate ?? lf.methaneCapture, 'gasCaptureRate'),
    methaneLevel:         num(lf.methaneLevel, 'methaneLevel'),
    leachateLevel:        num(lf.leachateLevel, 'leachateLevel'),
    odorIndex:            num(lf.odorIndex, 'odorIndex'),
    complianceScore:      num(lf.complianceScore, 'complianceScore'),
    cellsActive:          (lf.cellsActive != null && lf.cellsActive !== 0) ? lf.cellsActive : (fb.cellsActive ?? 0),
    cellsTotal:           (lf.cellsTotal  != null && lf.cellsTotal  !== 0) ? lf.cellsTotal  : (fb.cellsTotal  ?? 0),
    ashVolume:            lf.ashVolume    ?? fb.ashVolume    ?? 0,
    linerIntegrity:       str(lf.linerIntegrity, 'linerIntegrity'),
    groundwaterQuality:   str(lf.groundwaterQuality, 'groundwaterQuality'),
    leachateTreatmentCap: num(lf.leachateTreatmentCap, 'leachateTreatmentCap'),
    leachateTreatedToday: num(lf.leachateTreatedToday, 'leachateTreatedToday'),
    operator:             str(lf.operator, 'operator'),
    location: typeof lf.location === 'string' && lf.location ? lf.location : fb.location || 'Colombo Region',
  };
}

export default function Landfills() {
  const { kpis } = useContext(DataContext);
  const [landfills, setLandfills] = useState(STATIC_LANDFILLS);
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [capacityFrame, setCapacityFrame] = useState('12M');
  const [intakeFrame, setIntakeFrame] = useState('7D');
  const activeCapacityFrame = getTimeframeOption(TIMEFRAME_OPTIONS.monthly, capacityFrame);
  const activeIntakeFrame = getTimeframeOption(TIMEFRAME_OPTIONS.weekly, intakeFrame);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getFacilities();
        const all = res.data?.facilities || res.data || [];
        const lfs = all.filter(f => f.type === 'landfill');
        if (lfs.length > 0) setLandfills(lfs.map(normalizeLandfill));
      } catch (e) { /* keep static data */ }
    };
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  const capacityTrendData = {
    labels: buildTimeframeLabels(activeCapacityFrame.value, activeCapacityFrame.points),
    datasets: [
      {
        label: 'Aruwakkalu',
        data: resampleSeries([25.2,26.4,27.8,28.6,29.4,30.2,31.0,31.9,32.7,33.4,34.0,34.2], activeCapacityFrame.points),
        borderColor: CHART_PALETTES.area.cyan.border, backgroundColor: CHART_PALETTES.area.cyan.fill,
        fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5,
      },
      {
        label: 'Karadiyana',
        data: resampleSeries([93.1,94.2,95.0,95.8,96.4,96.9,97.2,97.6,97.9,98.1,98.3,98.5], activeCapacityFrame.points),
        borderColor: CHART_PALETTES.area.violet.border, backgroundColor: CHART_PALETTES.area.violet.fill,
        fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5,
      }
    ]
  };

  const intakeVals = [780, 820, 810, 850, 790, 400, 350];
  const displayedIntakeVals = resampleSeries(intakeVals, activeIntakeFrame.points);
  const intakeData = {
    labels: buildTimeframeLabels(activeIntakeFrame.value, activeIntakeFrame.points),
    datasets: [{
      label: 'Daily Intake (tons)',
      data: displayedIntakeVals,
      backgroundColor: displayedIntakeVals.map(v => v > 750 ? 'rgba(239,68,68,0.65)' : v > 600 ? 'rgba(245,158,11,0.65)' : 'rgba(16,185,129,0.65)'),
      borderColor: displayedIntakeVals.map(v => v > 750 ? '#ef4444' : v > 600 ? '#f59e0b' : '#10b981'),
      borderWidth: 1.5, borderRadius: 4,
    }]
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {selectedKPI && <KPIDetailModal kpi={selectedKPI} onClose={() => setSelectedKPI(null)} />}
      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-cwm-border pb-3">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Landfill Management</h1>
          <p className="text-sm text-slate-500 mt-1">Capacity monitoring · Leachate control · Environmental compliance · Gas capture</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400">● MONITORING</span>
          <span className="text-slate-500">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <KPICard icon="🏔️" label="Active Sites" value={landfills.filter(l => l.status === 'active' || l.status === 'operational').length}
          desc="Landfills currently accepting Colombo Municipal waste"
          color="text-emerald-400" rag="normal" />
        <KPICard icon="📊" label="Avg Capacity Used"
          value={`${(kpis?.landfillCapacity || (landfills.reduce((a, l) => a + (l.capacityUsed || 0), 0) / (landfills.length || 1))).toFixed(1)}%`}
          desc="Weighted average fill level across all registered landfill cells"
          color="text-amber-400" rag="warning" trend={0.8}
          onClick={() => setSelectedKPI({
            icon: '📊', label: 'Avg Capacity Used',
            value: (kpis?.landfillCapacity || (landfills.reduce((a, l) => a + (l.capacityUsed || 0), 0) / (landfills.length || 1))).toFixed(1),
            unit: '%',
            trend: 0.8, color: 'text-amber-400',
            thresholds: { green: 60, amber: 80 }, inverted: true,
            definition: 'Weighted average fill level across all registered landfill cells, measured by volumetric survey and daily intake accumulation. Rising trend indicates accelerating fill rate.',
            subValues: [
              { label: 'Aruwakkalu', value: '34.2% used' },
              { label: 'Karadiyana', value: '98.5% used (closed)' },
              { label: 'Daily Intake (Active)', value: '800 t/day' },
              { label: 'Fill Rate Trend', value: '+0.8%/month' },
            ],
            analysis: 'The average is skewed by Karadiyana\'s 98.5% fill — the operational Aruwakkalu site is at a manageable 34.2% and growing ~0.4% per month at current intake|If WTE diversion increases by 200 t/day, Aruwakkalu fill rate drops by 0.2% per month, extending life by approximately 1.5 additional years|Karadiyana cell integrity is degraded; leachate treatment must continue at 215 t/day to prevent groundwater contamination',
            target: '<60% avg fill level; Aruwakkalu <80%',
          })} />
        <KPICard icon="⏱️" label="Est. Life Remaining"
          value={`${(kpis?.landfillYears || 4.8).toFixed(1)} yrs`}
          desc="Projected years until Aruwakkalu primary landfill reaches capacity"
          color="text-amber-400" rag="warning" />
        <KPICard icon="🗑️" label="Daily Intake"
          value={`${landfills.filter(l => l.status === 'active' || l.status === 'operational').reduce((a, l) => a + (l.dailyIntake || 0), 0).toFixed(0)} t`}
          desc="Total waste received at active landfill sites today"
          color="text-white" rag="normal" trend={-3.2}
          onClick={() => setSelectedKPI({
            icon: '🗑️', label: 'Daily Intake',
            value: landfills.filter(l => l.status === 'active' || l.status === 'operational').reduce((a, l) => a + (l.dailyIntake || 0), 0).toFixed(0),
            unit: 't/day',
            trend: -3.2, color: 'text-slate-300',
            thresholds: { green: 600, amber: 900 }, inverted: true,
            definition: 'Total waste tonnage received at active landfill sites today, measured at the Aruwakkalu weighbridge. Includes compacted transfer loads and direct haul trucks from Colombo.',
            subValues: [
              { label: 'Aruwakkalu Intake', value: '800 t/day' },
              { label: 'Karadiyana Intake', value: '0 t/day (closed)' },
              { label: 'Peak Load Time', value: '10:00–14:00' },
              { label: 'WTE Diversion Today', value: '~620 t/day' },
            ],
            analysis: 'Daily intake is down 3.2% vs yesterday — partly due to the V-006 breakdown reducing Zone 2 collection volumes; this is a temporary improvement, not a structural trend|WTE is diverting ~620 t/day from the landfill; if WTE capacity is expanded by 200 t/day, landfill intake drops to below 600 t/day and site life extends significantly|Weekday intake averages 820 t/day; weekends drop to ~375 t/day — consider scheduling non-critical maintenance during low-intake windows',
            target: '<800 t/day sustained intake',
          })} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="bg-cwm-panel border border-cwm-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-white">Capacity Trend</h3>
            <ChartTimeframeControl options={TIMEFRAME_OPTIONS.monthly} value={capacityFrame} onChange={setCapacityFrame} />
          </div>
          <div style={{ height: 160 }}>
            <Line data={capacityTrendData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 9 } } },
                tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 8 },
              },
              scales: {
                x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 } } },
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 9 } }, max: 100, title: { display: true, text: '% Used', color: '#64748b', font: { size: 9 } } }
              }
            }} />
          </div>
        </div>
        <div className="bg-cwm-panel border border-cwm-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-white">Intake Pattern</h3>
            <ChartTimeframeControl options={TIMEFRAME_OPTIONS.weekly} value={intakeFrame} onChange={setIntakeFrame} />
          </div>
          <div style={{ height: 160 }}>
            <Bar data={intakeData} options={{
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
      </div>

      {/* Landfill Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {landfills.map(lf => <LandfillCard key={lf.facilityId} landfill={lf} />)}
      </div>
    </div>
  );
}
