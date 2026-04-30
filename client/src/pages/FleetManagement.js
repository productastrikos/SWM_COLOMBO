import React, { useState, useEffect } from 'react';
import { getVehicles, dispatchVehicle } from '../services/api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import KPICard from '../components/KPICard';
import { ChartTimeframeControl, TIMEFRAME_OPTIONS, getTimeframeOption, buildTimeframeLabels, resampleSeries } from '../components/chartUtils';
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

// Maps server simulation zone IDs (Z01–Z15) to the 5 Digital-Twin zone labels
const SERVER_ZONE_TO_DT = {
  'Z01': 'Zone 1', 'Z09': 'Zone 1', 'Z10': 'Zone 1',
  'Z08': 'Zone 2', 'Z11': 'Zone 2',
  'Z02': 'Zone 3', 'Z06': 'Zone 3', 'Z07': 'Zone 3',
  'Z03': 'Zone 4', 'Z04': 'Zone 4',
  'Z05': 'Zone 5', 'Z12': 'Zone 5', 'Z13': 'Zone 5', 'Z14': 'Zone 5', 'Z15': 'Zone 5',
};

// Returns the DT zone label for a vehicle (handles both server and DT data shapes)
function vehicleDTZone(vehicle) {
  if (!vehicle) return null;
  // DT/static vehicles may carry a plain zone string like 'Zone 1'
  if (vehicle.zone && vehicle.zone.startsWith('Zone')) return vehicle.zone;
  // Server vehicles store zone inside route.zone as 'Z01' etc.
  const serverZone = vehicle.route?.zone || vehicle.zone;
  return SERVER_ZONE_TO_DT[serverZone] || null;
}

/* ─── DEPLOY MODAL ────────────────────────────────────────────────── */
function DeployModal({ row, onClose }) {
  const [confirmed, setConfirmed] = useState(false);
  const handleDeploy = () => { setConfirmed(true); setTimeout(onClose, 2000); };
  if (confirmed) return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-cwm-panel border border-emerald-500/40 rounded-xl p-6 w-full max-w-sm text-center shadow-2xl">
        <div className="text-3xl mb-3">🚛</div>
        <p className="text-white font-bold text-sm mb-1">Deployed Successfully</p>
        <p className="text-slate-400 text-xs"><span className="text-cyan-400 font-semibold">{row.secondary}</span> dispatched to cover <span className="text-amber-400">{row.zone}</span></p>
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-cwm-panel border border-cwm-border rounded-xl p-5 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">🚨 Deploy Secondary Vehicle</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg">×</button>
        </div>
        <div className="space-y-3 mb-5">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs">
            <p className="text-red-400 font-semibold">Primary vehicle {row.primary} reported breakdown</p>
            <p className="text-slate-400 mt-0.5">Zone: {row.zone} · Route progress: {row.progress}%</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white/[0.03] rounded-lg p-3">
              <p className="text-slate-500 text-[10px] mb-1">Secondary Vehicle</p>
              <p className="text-cyan-400 font-bold">{row.secondary}</p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <p className="text-slate-500 text-[10px] mb-1">Estimated Arrival</p>
              <p className="text-white font-bold">~12 min</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500">Deploying <span className="text-cyan-400">{row.secondary}</span> to resume collection from {row.progress}% route completion point. Remaining {100 - row.progress}% of route will be covered.</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-cwm-border text-xs text-slate-400 hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={handleDeploy} className="flex-1 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-xs text-red-300 font-semibold hover:bg-red-500/30 transition-colors">
            Confirm Deploy {row.secondary}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── SCHEDULE ROUTE MODAL ────────────────────────────────────────── */
function ScheduleRouteModal({ row, onClose }) {
  const [time, setTime]   = useState('06:00');
  const [stops, setStops] = useState(140);
  const [saved, setSaved] = useState(false);
  const handleSave = () => { setSaved(true); setTimeout(onClose, 2000); };
  if (saved) return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-cwm-panel border border-emerald-500/40 rounded-xl p-6 w-full max-w-sm text-center shadow-2xl">
        <div className="text-3xl mb-3">📋</div>
        <p className="text-white font-bold text-sm mb-1">Route Scheduled</p>
        <p className="text-slate-400 text-xs"><span className="text-cyan-400 font-semibold">{row.primary}</span> on <span className="text-amber-400">{row.zone}</span> at {time}</p>
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-cwm-panel border border-cwm-border rounded-xl p-5 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">📋 Schedule Route</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg">×</button>
        </div>
        <div className="space-y-3 mb-5">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs">
            <p className="text-amber-400 font-semibold">Zone: {row.zone}</p>
            <p className="text-slate-400 mt-0.5">Vehicle: {row.primary} · Secondary: {row.secondary}</p>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Departure Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="w-full bg-cwm-darker border border-cwm-border rounded-lg px-3 py-2 text-xs text-slate-300" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Estimated Stops</label>
            <input type="number" value={stops} min={50} max={400} onChange={e => setStops(e.target.value)}
              className="w-full bg-cwm-darker border border-cwm-border rounded-lg px-3 py-2 text-xs text-slate-300" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Route Type</label>
            <select className="w-full bg-cwm-darker border border-cwm-border rounded-lg px-3 py-2 text-xs text-slate-300">
              <option>Full Zone Coverage</option>
              <option>Priority (Overflow bins first)</option>
              <option>Express (Main roads only)</option>
            </select>
          </div>
        </div>
        <div className="flex space-x-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-cwm-border text-xs text-slate-400 hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-xs text-amber-300 font-semibold hover:bg-amber-500/30 transition-colors">
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── DISPATCH MODAL ──────────────────────────────────────────────── */
function DispatchModal({ alert, onClose }) {
  const [vehicle, setVehicle] = useState('V-022');
  const [sent, setSent] = useState(false);
  const handleDispatch = () => { setSent(true); setTimeout(onClose, 2000); };
  if (sent) return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-cwm-panel border border-emerald-500/40 rounded-xl p-6 w-full max-w-sm text-center shadow-2xl">
        <div className="text-3xl mb-3">✅</div>
        <p className="text-white font-bold text-sm mb-1">Vehicle Dispatched</p>
        <p className="text-slate-400 text-xs"><span className="text-cyan-400 font-semibold">{vehicle}</span> en route to <span className="text-amber-400">{alert.ward}</span></p>
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-cwm-panel border border-cwm-border rounded-xl p-5 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">🚛 Dispatch Vehicle</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg">×</button>
        </div>
        <div className="space-y-3 mb-5">
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-2 text-xs">
            <p className="text-cyan-400 font-semibold">Miss: {alert.ward}</p>
            <p className="text-slate-400 mt-0.5">{alert.address} · Reason: {alert.type}</p>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Assign Vehicle</label>
            <select value={vehicle} onChange={e => setVehicle(e.target.value)}
              className="w-full bg-cwm-darker border border-cwm-border rounded-lg px-3 py-2 text-xs text-slate-300">
              {['V-022','V-023','V-024','V-025','V-026'].map(v => (
                <option key={v}>{v} — Reserve</option>
              ))}
            </select>
          </div>
          <p className="text-[10px] text-slate-500">Vehicle will be dispatched immediately. Estimated arrival: 15–20 min. Driver will be notified via in-cab terminal.</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-cwm-border text-xs text-slate-400 hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={handleDispatch} className="flex-1 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-xs text-cyan-300 font-semibold hover:bg-cyan-500/30 transition-colors">
            Dispatch Now
          </button>
        </div>
      </div>
    </div>
  );
}

function VehicleRow({ vehicle, onDispatch }) {
  const statusColors = {
    active: 'bg-emerald-500/20 text-emerald-400',
    en_route: 'bg-cyan-500/20 text-cyan-400',
    collecting: 'bg-blue-500/20 text-blue-400',
    returning: 'bg-purple-500/20 text-purple-400',
    idle: 'bg-slate-500/20 text-slate-400',
    maintenance: 'bg-orange-500/20 text-orange-400',
    breakdown: 'bg-red-500/20 text-red-400',
  };
  const fuel = vehicle.fuelLevel || 0;
  const load = vehicle.currentLoad || 0;
  const capacity = vehicle.capacity || 1;
  const loadPct = (load / capacity * 100).toFixed(0);

  return (
    <div className="bg-cwm-panel border border-cwm-border rounded-lg p-3 hover:border-cwm-accent/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🚛</span>
          <div>
            <p className="text-xs font-semibold text-white">{vehicle.vehicleId}</p>
            <p className="text-[10px] text-slate-500">{vehicle.type || 'Compactor'} • {vehicleDTZone(vehicle) || vehicle.zone || '-'}</p>
          </div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusColors[vehicle.status] || statusColors.idle}`}>
          {(vehicle.status || 'idle').replace(/_/g, ' ')}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <p className="text-[10px] text-slate-500">Fuel</p>
          <div className="flex items-center space-x-1">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${fuel < 20 ? 'bg-red-500' : fuel < 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                style={{ width: `${fuel}%` }} />
            </div>
            <span className="text-[10px] text-slate-400">{fuel.toFixed(0)}%</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Load</p>
          <div className="flex items-center space-x-1">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-cyan-500" style={{ width: `${loadPct}%` }} />
            </div>
            <span className="text-[10px] text-slate-400">{loadPct}%</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Speed</p>
          <p className="text-xs text-slate-300">{(vehicle.speed || 0).toFixed(0)} km/h</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-500">Driver: {(typeof vehicle.driver === 'object' ? vehicle.driver?.name : vehicle.driver) || 'Unassigned'}</span>
        {vehicle.status === 'idle' && (
          <button onClick={() => onDispatch(vehicle.vehicleId)}
            className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30">
            Dispatch
          </button>
        )}
      </div>
    </div>
  );
}

// Static coordination data (primary → secondary vehicle pairs per zone)
const COORDINATION = [
  { zone: 'Zone 1 – Northern Port',   primary: 'V-001', secondary: 'V-015', status: 'active',     progress: 62 },
  { zone: 'Zone 2 – Inner North',     primary: 'V-009', secondary: 'V-006', status: 'breakdown',  progress: 34 },
  { zone: 'Zone 3 – Central',         primary: 'V-004', secondary: 'V-008', status: 'active',     progress: 55 },
  { zone: 'Zone 4 – Western Coastal', primary: 'V-018', secondary: 'V-028', status: 'collecting', progress: 68 },
  { zone: 'Zone 5 – Southern',        primary: 'V-023', secondary: 'V-011', status: 'en_route',   progress: 41 },
];

const ROUTE_HISTORY = [
  { vehicle: 'V-001', driver: 'K. Perera',    zone: 'Zone 1',  depart: '05:30', complete: '—',     stops: 142, load: '2.6t', status: 'active',    fuel: 82, kmDriven: 38.4 },
  { vehicle: 'V-002', driver: 'S. Silva',     zone: 'Zone 1',  depart: '05:45', complete: '—',     stops: 118, load: '3.1t', status: 'active',    fuel: 67, kmDriven: 31.8 },
  { vehicle: 'V-003', driver: 'R. Fernando',  zone: 'Zone 2',  depart: '06:00', complete: '—',     stops: 87,  load: '2.0t', status: 'active',    fuel: 58, kmDriven: 24.2 },
  { vehicle: 'V-005', driver: 'M. Dias',      zone: 'Zone 3',  depart: '06:15', complete: '—',     stops: 152, load: '4.4t', status: 'active',    fuel: 46, kmDriven: 31.2 },
  { vehicle: 'V-006', driver: 'A. Bandara',   zone: 'Zone 2',  depart: '06:00', complete: '—',     stops: 37,  load: '1.8t', status: 'breakdown', fuel: 24, kmDriven: 12.4 },
  { vehicle: 'V-009', driver: 'T. Wijeratne', zone: 'Zone 2',  depart: '05:45', complete: '—',     stops: 88,  load: '4.3t', status: 'active',    fuel: 72, kmDriven: 24.6 },
];

export default function FleetManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('fleet');
  const [deployTarget, setDeployTarget]     = useState(null);
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const [dispatchAlert, setDispatchAlert]   = useState(null);
  const [activityFrame, setActivityFrame] = useState('24H');
  const activeActivityFrame = getTimeframeOption(TIMEFRAME_OPTIONS.intradayOps, activityFrame);

  const filteredCoordination = COORDINATION;
  const filteredRouteHistory = ROUTE_HISTORY;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getVehicles();
        setVehicles(res.data?.vehicles || res.data || []);
      } catch (e) { console.error(e); }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDispatch = async (vehicleId) => {
    try { await dispatchVehicle(vehicleId); } catch (e) { console.error(e); }
  };

  const filtered = vehicles.filter(v => filter === 'all' || v.status === filter);

  // Consistent KPI counts — all derived from the same vehicles array (static fallbacks when empty)
  const kTotal       = vehicles.length       || 30;
  const kMaintenance = vehicles.filter(v => v.status === 'maintenance' || v.status === 'breakdown').length || 1;
  const kIdle        = vehicles.filter(v => v.status === 'idle').length        || 3;
  const kEnRoute     = vehicles.filter(v => v.status === 'en_route').length    || 12;
  const kCollecting  = vehicles.filter(v => v.status === 'collecting').length  || 14;
  // Active = en route + collecting so the three cards always add up correctly
  const kActive      = kEnRoute + kCollecting;

  // Activity chart values — RAG coloured per bar
  const actVals = [22, 25, 28, 30, 32, 35, 38, 37, 34, 31, 28, 24];
  const displayedActVals = resampleSeries(actVals, activeActivityFrame.points);
  const fleetActivityData = {
    labels: buildTimeframeLabels(activeActivityFrame.value, activeActivityFrame.points),
    datasets: [{
      label: 'Active Units',
      data: displayedActVals,
      backgroundColor: displayedActVals.map(v => v >= 30 ? 'rgba(16,185,129,0.65)' : v >= 22 ? 'rgba(245,158,11,0.65)' : 'rgba(239,68,68,0.65)'),
      borderColor: displayedActVals.map(v => v >= 30 ? '#10b981' : v >= 22 ? '#f59e0b' : '#ef4444'),
      borderWidth: 1.5, borderRadius: 4,
    }],
  };

  const statusColor = (s) => ({
    active: 'text-emerald-400', collecting: 'text-blue-400', en_route: 'text-cyan-400',
    breakdown: 'text-red-400', idle: 'text-slate-400', done: 'text-emerald-400',
  }[s] || 'text-slate-400');

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {deployTarget   && <DeployModal        row={deployTarget}   onClose={() => setDeployTarget(null)} />}
      {scheduleTarget && <ScheduleRouteModal row={scheduleTarget} onClose={() => setScheduleTarget(null)} />}
      {dispatchAlert  && <DispatchModal      alert={dispatchAlert} onClose={() => setDispatchAlert(null)} />}
      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-cwm-border pb-3">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Fleet Management</h1>
          <p className="text-sm text-slate-500 mt-1">GPS/AVL vehicle tracking · Route optimization · Dispatch management</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400">● LIVE GPS</span>
          <span className="text-slate-500">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
        <KPICard icon="🚛" label="Total Fleet" value={kTotal}
          desc="All registered CMC waste collection vehicles (compactors, tippers & special)"
          color="text-white" rag="normal" />
        <KPICard icon="✅" label="Active" value={kActive}
          desc="Vehicles currently on route, collecting, or returning to depot"
          color="text-emerald-400" rag="normal" trend={6.7} />
        <KPICard icon="🗺️" label="En Route" value={kEnRoute}
          desc="Vehicles traveling to assigned collection zones or transfer stations"
          color="text-emerald-400" rag="normal" />
        <KPICard icon="🗑️" label="Collecting" value={kCollecting}
          desc="Actively servicing bin collection stops along their route"
          color="text-emerald-400" rag="normal" />
        <KPICard icon="⏸️" label="Idle" value={kIdle}
          desc="Vehicles at depot awaiting dispatch or assignment"
          color="text-amber-400" rag="warning" />
        <KPICard icon="🔧" label="Maintenance" value={kMaintenance}
          desc="Off-road for scheduled servicing, breakdown repair or inspection"
          color="text-amber-400" rag="warning" />
      </div>

      {/* Route Optimisation KPIs */}
      <div className="bg-cwm-panel border border-cwm-border rounded-xl p-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center space-x-2">
          <span>🛣️</span><span>Route Optimisation — Today's Savings</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Fuel Saved',     value: 'Rs. 42,300',  sub: 'vs. unoptimised route', rag: 'green',  icon: '⛽' },
            { label: 'Distance Saved', value: '312 km',      sub: '18.4% reduction',        rag: 'amber',  icon: '📍' },
            { label: 'Time Saved',     value: '3.2 hrs',     sub: 'fleet-wide today',        rag: 'green',  icon: '⏱️' },
            { label: 'CO₂ Avoided',   value: '334 kg',      sub: 'vs. baseline routes',    rag: 'green',  icon: '🌿' },
          ].map((m, i) => (
            <div key={i} className={`rounded-xl p-3 border ${m.rag === 'green' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-base">{m.icon}</span>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{m.label}</p>
              </div>
              <p className={`text-lg font-bold ${m.rag === 'green' ? 'text-emerald-400' : 'text-amber-400'}`}>{m.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex space-x-1 border-b border-cwm-border">
        {[
          { key: 'fleet',    label: '🚛 Fleet Status' },
          { key: 'routes',   label: '📋 Route History' },
          { key: 'coord',    label: '🔗 Primary/Secondary Coord.' },

          { key: 'attendance', label: '🧑‍💼 Attendance' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-3 py-2 text-[11px] font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Fleet Status tab */}
      {activeTab === 'fleet' && (
        <>
          {/* Fleet activity chart (RAG-coloured bars) */}
          <div className="bg-cwm-panel border border-cwm-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Fleet Activity — Active Units per Hour</h3>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70 inline-block" />&#8203; ≥30 Optimal</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/70 inline-block" />&#8203; 22–29 Attention</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/70 inline-block" />&#8203; &lt;22 Critical</span>
                <ChartTimeframeControl options={TIMEFRAME_OPTIONS.intradayOps} value={activityFrame} onChange={setActivityFrame} />
              </div>
            </div>
            <div style={{ height: 140 }}>
              <Bar data={fleetActivityData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8' } },
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 } } },
                  y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 9 } }, min: 0, max: 45 }
                }
              }} />
            </div>
          </div>

          {/* Vehicle filter + grid */}
          <div className="flex items-center gap-2">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="bg-cwm-panel border border-cwm-border rounded px-2 py-1.5 text-xs text-slate-300">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="en_route">En Route</option>
              <option value="collecting">Collecting</option>
              <option value="idle">Idle</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <span className="text-[10px] text-slate-500 ml-auto">{filtered.length} vehicles</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filtered.length > 0 ? filtered.map(vehicle => (
              <VehicleRow key={vehicle.vehicleId} vehicle={vehicle} onDispatch={handleDispatch} />
            )) : (
              <div className="col-span-3 text-center text-slate-500 text-xs py-8">No vehicles loaded — backend may be starting up</div>
            )}
          </div>
        </>
      )}

      {/* Route History tab */}
      {activeTab === 'routes' && (
        <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-cwm-border flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">📋 Route History — Today's Trips</h3>
            <span className="text-[10px] text-slate-500">{ROUTE_HISTORY.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-cwm-border text-slate-500 text-[10px] uppercase">
                  <th className="px-3 py-2 text-left">Vehicle</th>
                  <th className="px-3 py-2 text-left">Driver</th>
                  <th className="px-3 py-2 text-left">Zone</th>
                  <th className="px-3 py-2 text-left">Depart</th>
                  <th className="px-3 py-2 text-left">Complete</th>
                  <th className="px-3 py-2 text-right">Stops</th>
                  <th className="px-3 py-2 text-right">Load</th>
                  <th className="px-3 py-2 text-right">km</th>
                  <th className="px-3 py-2 text-right">Fuel %</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRouteHistory.map((r, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-bold text-white">{r.vehicle}</td>
                    <td className="px-3 py-2 text-slate-300">{r.driver}</td>
                    <td className="px-3 py-2 text-slate-400">{r.zone}</td>
                    <td className="px-3 py-2 text-slate-400">{r.depart}</td>
                    <td className="px-3 py-2 text-slate-400">{r.complete}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{r.stops}</td>
                    <td className="px-3 py-2 text-right text-cyan-400 font-medium">{r.load}</td>
                    <td className="px-3 py-2 text-right text-slate-300">{r.kmDriven}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-medium ${r.fuel < 25 ? 'text-red-400' : r.fuel < 50 ? 'text-amber-400' : 'text-emerald-400'}`}>{r.fuel}%</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 ${statusColor(r.status)}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Primary/Secondary Coordination tab */}
      {activeTab === 'coord' && (
        <div className="space-y-3">
          <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-cwm-border">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">🔗 Primary / Secondary Vehicle Coordination by Zone</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Secondary vehicle auto-dispatches when primary reports breakdown or &gt;90min delay</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-cwm-border text-slate-500 text-[10px] uppercase">
                    <th className="px-4 py-2 text-left">Zone</th>
                    <th className="px-4 py-2 text-left">Primary</th>
                    <th className="px-4 py-2 text-left">Secondary</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Route Progress</th>
                    <th className="px-4 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoordination.map((row, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-slate-300 font-medium">{row.zone}</td>
                      <td className="px-4 py-3 font-bold text-cyan-400">{row.primary}</td>
                      <td className="px-4 py-3 text-slate-400">{row.secondary}</td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 ${statusColor(row.status)}`}>
                          {row.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 w-40">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${row.progress >= 70 ? 'bg-emerald-500' : row.progress >= 40 ? 'bg-amber-500' : row.status === 'breakdown' ? 'bg-red-500' : 'bg-slate-600'}`}
                              style={{ width: `${row.progress}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-400 w-8 text-right">{row.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.status === 'breakdown' ? (
                          <button
                            onClick={() => setDeployTarget(row)}
                            className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-[10px] text-red-400 hover:bg-red-500/30">
                            Deploy {row.secondary}
                          </button>
                        ) : row.status === 'idle' ? (
                          <button
                            onClick={() => setScheduleTarget(row)}
                            className="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-[10px] text-amber-400 hover:bg-amber-500/30">
                            Schedule Route
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600">On track</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {/* Attendance tab */}
      {activeTab === 'attendance' && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Drivers', value: 48, color: 'text-white' },
              { label: 'Present',       value: 43, color: 'text-emerald-400' },
              { label: 'Absent',        value: 3,  color: 'text-red-400' },
              { label: 'Leave Approved', value: 2, color: 'text-amber-400' },
            ].map((s, i) => (
              <div key={i} className="bg-cwm-panel border border-cwm-border rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-cwm-border">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">🧑‍💼 Driver Attendance — Today</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-cwm-border text-slate-500 text-[10px] uppercase">
                    <th className="px-4 py-2 text-left">Driver</th>
                    <th className="px-4 py-2 text-left">Vehicle</th>
                    <th className="px-4 py-2 text-left">Zone</th>
                    <th className="px-4 py-2 text-left">Check-In</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-right">Trips</th>
                    <th className="px-4 py-2 text-right">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'K. Perera',    vehicle: 'V-001', zone: 'Zone 1', checkin: '05:28', status: 'present',   trips: 1, compliance: 98 },
                    { name: 'S. Silva',     vehicle: 'V-002', zone: 'Zone 1', checkin: '05:43', status: 'present',   trips: 1, compliance: 96 },
                    { name: 'R. Fernando',  vehicle: 'V-003', zone: 'Zone 3', checkin: '05:58', status: 'present',   trips: 1, compliance: 99 },
                    { name: 'M. Dias',      vehicle: 'V-005', zone: 'Zone 2', checkin: '06:12', status: 'present',   trips: 1, compliance: 94 },
                    { name: 'A. Bandara',   vehicle: 'V-006', zone: 'Zone 2', checkin: '06:01', status: 'present',   trips: 0, compliance: 72 },
                    { name: 'P. Jayantha',  vehicle: 'V-007', zone: 'Zone 2', checkin: '—',     status: 'absent',    trips: 0, compliance: 61 },
                    { name: 'T. Wijeratne', vehicle: 'V-009', zone: 'Zone 4', checkin: '05:44', status: 'present',   trips: 1, compliance: 97 },
                    { name: 'N. Rajapaksa', vehicle: 'V-012', zone: 'Zone 5', checkin: '—',     status: 'leave',     trips: 0, compliance: 88 },
                  ].map((d, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-2 font-medium text-white">{d.name}</td>
                      <td className="px-4 py-2 text-cyan-400">{d.vehicle}</td>
                      <td className="px-4 py-2 text-slate-400">{d.zone}</td>
                      <td className="px-4 py-2 text-slate-400">{d.checkin}</td>
                      <td className="px-4 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 ${
                          d.status === 'present' ? 'text-emerald-400' : d.status === 'absent' ? 'text-red-400' : d.status === 'leave' ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          {d.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-slate-300">{d.trips}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`font-bold ${d.compliance >= 90 ? 'text-emerald-400' : d.compliance >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                          {d.compliance}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
