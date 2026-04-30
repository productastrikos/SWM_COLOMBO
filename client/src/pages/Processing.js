import React, { useState, useEffect } from 'react';
import { getFacilities } from '../services/api';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import KPICard from '../components/KPICard';
import KPIDetailModal from '../components/KPIDetailModal';
import { CHART_PALETTES } from '../components/chartUtils';
ChartJS.register(ArcElement, Tooltip);

function FacilityCard({ facility }) {
  const typeIcons = {
    recycling_center: '♻️',
    transfer_station: '🔄',
    composting: '🌱',
    material_recovery: '🏭',
  };
  // Known daily throughput values (t/day) keyed by facilityId — used as reliable fallback
  const KNOWN_THROUGHPUT = {
    'FAC-TS-01': 280, 'FAC-TS-02': 198, 'FAC-TS-03': 149,
    'FAC-RC-01':  140, 'FAC-RC-02':  94, 'FAC-RC-03':  53,
  };
  // Transfer stations expose `throughput`; recycling centers expose `dailyProcessed`
  const rawThroughput =
    facility.dailyThroughput ??
    facility.throughput ??
    facility.dailyProcessed ??
    KNOWN_THROUGHPUT[facility.facilityId];
  const utilization = facility.utilization != null ? facility.utilization : facility.capacityUsed ?? 0;

  return (
    <div className="bg-cwm-panel border border-cwm-border rounded-lg p-3 hover:border-cwm-accent/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{typeIcons[facility.type] || '🏭'}</span>
          <div>
            <p className="text-xs font-semibold text-white">{facility.name}</p>
            <p className="text-[10px] text-slate-500">{(facility.type || '').replace(/_/g, ' ')}</p>
          </div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
          facility.status === 'operational' ? 'bg-emerald-500/20 text-emerald-400' :
          facility.status === 'limited' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>{facility.status || 'operational'}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-slate-500">Daily Throughput</p>
          <p className="text-sm font-bold text-cyan-400">{rawThroughput != null ? Number(rawThroughput).toFixed(0) : '-'} <span className="text-[10px] text-slate-500">tons</span></p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Capacity</p>
          <p className="text-sm font-bold text-white">{facility.capacity?.toFixed(0) || '-'} <span className="text-[10px] text-slate-500">tons</span></p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-slate-500">Utilization</span>
          <span className="text-slate-400">{utilization.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
            style={{ width: `${utilization}%` }} />
        </div>
      </div>

      {facility.materials && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <p className="text-[10px] text-slate-500 mb-1">Material Streams</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(facility.materials).slice(0, 4).map(([k, v]) => (
              <span key={k} className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-slate-400">
                {k}: {typeof v === 'number' ? v.toFixed(0) + 't' : v}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Static data: Transfer Stations (627t total = 1247t collected - 620t WTE) ── */
const TRANSFER_STATIONS = [
  { id: 'TS-001', name: 'Kerawalapitiya Transfer Station', incoming: 280, outgoing: 268, delay: 18, capacity: 350,  utilization: 80.0 },
  { id: 'TS-002', name: 'Moratuwa Transfer Station',       incoming: 198, outgoing: 189, delay: 25, capacity: 250,  utilization: 79.2 },
  { id: 'TS-003', name: 'Nugegoda Transfer Station',       incoming: 149, outgoing: 141, delay: 12, capacity: 200,  utilization: 74.5 },
];

/* ── Static data: Recycling Plants (287t total = 23.4% of 1247t) ─── */
const RECYCLING_PLANTS = [
  {
    id: 'RC-001', name: 'Kolonnawa MRF', processed: 140, recoveryRate: 78.3, rejected: 30.7,
    outputs: { Plastic: 45, Paper: 38, Metal: 22, Glass: 14, Compost: 21 },
  },
  {
    id: 'RC-002', name: 'Muthurajawela Compost Plant', processed: 94, recoveryRate: 91.2, rejected: 8.3,
    outputs: { Compost: 85, 'Organic Residue': 9 },
  },
  {
    id: 'RC-003', name: 'Modara Plastic Recovery', processed: 53, recoveryRate: 82.4, rejected: 9.3,
    outputs: { HDPE: 18, LDPE: 14, PP: 12, PET: 9 },
  },
];

export default function Processing() {
  const [facilities, setFacilities] = useState([]);
  const [filter, setFilter]         = useState('all');
  const [selectedKPI, setSelectedKPI] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getFacilities();
        setFacilities(res.data?.facilities || res.data || []);
      } catch (e) { console.error(e); }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const filtered = facilities.filter(f => filter === 'all' || f.type === filter);

  const recoveryData = {
    labels: ['Compost/Organic', 'Plastic', 'Paper', 'Metal', 'Glass', 'Organic Residue'],
    datasets: [{
      data: [106, 98, 38, 22, 14, 9],
      backgroundColor: CHART_PALETTES.categorical.slice(0, 6),
      borderWidth: 0,
    }]
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {selectedKPI && <KPIDetailModal kpi={selectedKPI} onClose={() => setSelectedKPI(null)} />}
      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-cwm-border pb-3">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Processing & Recycling</h1>
          <p className="text-sm text-slate-500 mt-1">Recycling centers · Transfer stations · Composting facilities · Weighbridge data</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400">● LIVE</span>
          <span className="text-slate-500">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <KPICard icon="🔄" label="Transfer Stations" value="3 Active"
          desc="Kerawalapitiya, Moratuwa & Nugegoda — all operational today"
          color="text-emerald-400" rag="normal" trend={0} />
        <KPICard icon="📦" label="TS Throughput" value="627 t/day"
          desc="Total waste tonnage received across 3 transfer stations"
          color="text-white" rag="normal" trend={1.8}
          onClick={() => setSelectedKPI({
            icon: '📦', label: 'TS Throughput', value: '627', unit: 't/day',
            trend: 1.8, color: 'text-cyan-400',
            thresholds: { green: 700, amber: 500 }, inverted: false,
            definition: 'Total daily waste tonnage processed across all three transfer stations. Measured via weighbridge at intake. Throughput excludes WTE plant direct intake of ~620t/day.',
            subValues: [
              { label: 'Avg Processing Delay', value: '18 min (Kerawalapitiya)' },
              { label: 'Peak Load Hour', value: '08:00–10:00' },
              { label: 'Outgoing to Landfill', value: '598 t/day' },
              { label: 'Target', value: '700 t/day capacity' },
            ],
            analysis: 'Throughput is 73 t/day below capacity — the gap is partly driven by morning collection delays rippling downstream; afternoon volumes typically add 15–20% more inflow|Moratuwa\'s 25-min delay is the key bottleneck; a queuing issue at the compactor bay is suspected — a 30-min maintenance window this afternoon could recover throughput|If afternoon inflow from Zone 2 and Zone 4 increases as expected, Kerawalapitiya may approach 90% utilization; pre-position a diversion route to Nugegoda now',
            target: '700 t/day combined throughput at all 3 stations',
          })} />
        <KPICard icon="♻️" label="Recycling Plants" value="3 Active"
          desc="Kolonnawa MRF, Muthurajawela Compost & Modara Plastic Recovery"
          color="text-emerald-400" rag="normal" trend={0} />
        <KPICard icon="🔃" label="Diversion Rate" value="23.0%"
          desc="Share of total collected waste diverted from landfill via recycling"
          color="text-amber-400" rag="warning" trend={1.1}
          onClick={() => setSelectedKPI({
            icon: '🔃', label: 'Diversion Rate', value: '23.0', unit: '%',
            trend: 1.1, color: 'text-amber-400',
            thresholds: { green: 30, amber: 15 }, inverted: false,
            definition: 'Percentage of total collected waste (1,247 t/day) diverted from landfill through recycling or composting. Excludes WTE energy recovery. Target of 30% supports SDG 12 and extends Aruwakkalu landfill lifespan.',
            subValues: [
              { label: 'Recyclables', value: '287 t/day (23.0%)' },
              { label: 'Composted', value: '94 t/day (7.5%)' },
              { label: 'Revenue Generated', value: 'Rs. 2.1M/month' },
              { label: 'Target', value: '30% diversion rate' },
            ],
            analysis: 'At 23.4% diversion the operation is 6.6 pts short of the 30% SDG target — the gap is recoverable without new infrastructure if contamination is reduced and routing is adjusted|Redirecting 30 t/day of source-separated organics from Kerawalapitiya to Muthurajawela would raise the rate to approximately 26% with no capital cost|Kolonnawa contamination rejection of 30.7 t/day is the single biggest drag; resolving it would recover 2–3% diversion rate and reduce landfill intake by over 900 t/month',
            target: '30% landfill diversion rate (SDG 12)',
          })} />
      </div>

      {/* Material Recovery Chart */}
      <div className="bg-cwm-panel border border-cwm-border rounded-lg p-3">
        <h3 className="text-xs font-semibold text-white mb-2">Material Recovery Distribution — 287 t/day recycled (23.0% of 1,247t collected)</h3>
        <div className="flex items-center justify-center" style={{ height: 160 }}>
          <div style={{ width: 140, height: 140 }}>
            <Doughnut data={recoveryData} options={{
              responsive: true, maintainAspectRatio: false, cutout: '65%',
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1,
                  titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 8,
                  callbacks: {
                    label: (ctx) => {
                      const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0';
                      return ` ${ctx.label}: ${ctx.parsed}t (${pct}%)`;
                    }
                  }
                }
              }
            }} />
          </div>
          <div className="ml-6 space-y-1.5">
            {recoveryData.labels.map((l, i) => (
              <div key={l} className="flex items-center space-x-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: recoveryData.datasets[0].backgroundColor[i] }} />
                <span className="text-slate-400">{l}</span>
                <span className="text-slate-300 font-medium">{recoveryData.datasets[0].data[i]}t</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transfer Stations */}
      <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-cwm-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">🔄 Transfer Stations</h3>
          <span className="text-[10px] text-slate-500">Total incoming: 627 t/day</span>
        </div>
        <div className="divide-y divide-white/5">
          {TRANSFER_STATIONS.map(ts => (
            <div key={ts.id} className="px-4 py-3 hover:bg-white/[0.02]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[11px] font-bold text-white">{ts.name}</p>
                  <p className="text-[10px] text-slate-500">{ts.id}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                  ts.utilization > 85 ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                  ts.utilization > 75 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                  'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>{ts.utilization.toFixed(1)}% utilized</span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-[10px] mb-2">
                <div><p className="text-slate-500">Incoming</p><p className="text-cyan-400 font-bold">{ts.incoming} t</p></div>
                <div><p className="text-slate-500">Outgoing</p><p className="text-emerald-400 font-bold">{ts.outgoing} t</p></div>
                <div><p className="text-slate-500">Retained</p><p className="text-amber-400 font-bold">{ts.incoming - ts.outgoing} t</p></div>
                <div><p className="text-slate-500">Avg Delay</p><p className={`font-bold ${ts.delay > 20 ? 'text-red-400' : 'text-slate-300'}`}>{ts.delay} min</p></div>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${ts.utilization > 85 ? 'bg-red-500' : ts.utilization > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${ts.utilization}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                <span>0</span><span>Capacity: {ts.capacity} t/day</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recycling Plants */}
      <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-cwm-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">♻️ Recycling Plants</h3>
          <span className="text-[10px] text-slate-500">Total processed: 287 t/day · 23.0% diversion rate</span>
        </div>
        <div className="divide-y divide-white/5">
          {RECYCLING_PLANTS.map(rp => (
            <div key={rp.id} className="px-4 py-3 hover:bg-white/[0.02]">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[11px] font-bold text-white">{rp.name}</p>
                  <p className="text-[10px] text-slate-500">{rp.id}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                  rp.recoveryRate >= 88 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  rp.recoveryRate >= 80 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                  'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>{rp.recoveryRate}% recovery</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-[10px] mb-2">
                <div><p className="text-slate-500">Processed</p><p className="text-cyan-400 font-bold">{rp.processed} t</p></div>
                <div><p className="text-slate-500">Recovered</p><p className="text-emerald-400 font-bold">{(rp.processed - rp.rejected).toFixed(1)} t</p></div>
                <div><p className="text-slate-500">Rejected</p><p className="text-red-400 font-bold">{rp.rejected} t</p></div>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(rp.outputs).map(([mat, vol]) => (
                  <span key={mat} className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-slate-400">
                    {mat}: {vol}t
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="bg-cwm-panel border border-cwm-border rounded px-2 py-1.5 text-xs text-slate-300">
          <option value="all">All Types</option>
          <option value="recycling_center">Recycling Centers</option>
          <option value="transfer_station">Transfer Stations</option>
          <option value="composting">Composting</option>
        </select>
        <span className="text-[10px] text-slate-500 ml-auto">{filtered.length} facilities</span>
      </div>

      {/* Facility Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filtered.map(facility => (
          <FacilityCard key={facility.facilityId} facility={facility} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-slate-600 text-xs py-8">Loading facilities...</div>
        )}
      </div>
    </div>
  );
}
