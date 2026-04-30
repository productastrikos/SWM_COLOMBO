import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import KPICard from '../components/KPICard';
import KPIDetailModal from '../components/KPIDetailModal';
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function EscalationModal({ ward, onClose }) {
  const [target, setTarget]     = useState('Zone Supervisor');
  const [priority, setPriority] = useState('high');
  const [reason, setReason]     = useState(`Missed collection — coverage ${ward.coverage}% below threshold`);
  const [sent, setSent]         = useState(false);

  if (sent) return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-cwm-panel border border-emerald-500/40 rounded-xl p-6 w-full max-w-sm text-center shadow-2xl">
        <div className="text-3xl mb-3">✅</div>
        <p className="text-white font-bold text-sm mb-1">Escalation Sent</p>
        <p className="text-slate-400 text-xs">Notified <span className="text-emerald-400">{target}</span> — response expected within 30 min</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-cwm-panel border border-cwm-border rounded-xl p-5 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">🚨 Escalate: {ward.ward}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
        </div>
        <div className="space-y-3 mb-5">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs">
            <span className="text-amber-400 font-semibold">Coverage: {ward.coverage}%</span>
            <span className="text-slate-400 ml-2">— {ward.missed} missed points in {ward.zone}</span>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Escalate To</label>
            <select value={target} onChange={e => setTarget(e.target.value)}
              className="w-full bg-cwm-darker border border-cwm-border rounded-lg px-3 py-2 text-xs text-slate-300">
              <option>Zone Supervisor</option>
              <option>Control Center</option>
              <option>Emergency Response Team</option>
              <option>Operations Manager</option>
              <option>Municipal Commissioner</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Priority</label>
            <div className="flex space-x-2">
              {['critical','high','low'].map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  className={`flex-1 py-1.5 rounded text-[10px] font-semibold border transition-colors ${priority === p
                    ? p === 'critical' ? 'bg-red-500/30 border-red-500/60 text-red-300'
                      : p === 'high'   ? 'bg-amber-500/30 border-amber-500/60 text-amber-300'
                      :                  'bg-slate-500/30 border-slate-500/60 text-slate-300'
                    : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Reason / Notes</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              className="w-full bg-cwm-darker border border-cwm-border rounded-lg px-3 py-2 text-xs text-slate-300 resize-none" />
          </div>
        </div>
        <div className="flex space-x-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-cwm-border text-xs text-slate-400 hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={() => setSent(true)}
            className="flex-1 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-xs text-amber-300 font-semibold hover:bg-amber-500/30 transition-colors">
            Send Escalation
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Missed collection alerts — causes aligned with WARD_COVERAGE ── */
const MISSED_ALERTS = [
  { id: 'MCR-041', ward: 'Grandpass',     zone: 'Zone 2',  missed: 125, vehicle: 'V-006', reason: 'Vehicle Breakdown', time: '08:15', priority: 'critical' },
  { id: 'MCR-042', ward: 'Rajagiriya',    zone: 'Zone 5',  missed: 78,  vehicle: 'V-021', reason: 'No RFID Scan',      time: '10:18', priority: 'high'     },
  { id: 'MCR-043', ward: 'Kirulapone',    zone: 'Zone 5',  missed: 76,  vehicle: 'V-014', reason: 'Driver Absence',    time: '09:44', priority: 'high'     },
  { id: 'MCR-044', ward: 'Wellawatta',    zone: 'Zone 4',  missed: 27,  vehicle: 'V-009', reason: 'Route Skipped',     time: '09:02', priority: 'high'     },
  { id: 'MCR-045', ward: 'Bambalapitiya', zone: 'Zone 4',  missed: 27,  vehicle: 'V-011', reason: 'Route Skipped',     time: '10:45', priority: 'low'      },
  { id: 'MCR-046', ward: 'Pettah',        zone: 'Zone 1',  missed: 26,  vehicle: 'V-002', reason: 'No RFID Scan',      time: '07:42', priority: 'high'     },
  { id: 'MCR-047', ward: 'Borella',       zone: 'Zone 3',  missed: 25,  vehicle: 'V-003', reason: 'Access Denied',     time: '11:05', priority: 'low'      },
  { id: 'MCR-048', ward: 'Maradana',      zone: 'Zone 2',  missed: 15,  vehicle: 'V-005', reason: 'No RFID Scan',      time: '10:30', priority: 'low'      },
];

const WARD_COVERAGE = [
  { ward: 'Fort',           zone: 'Zone 1',  total: 284, collected: 277, missed: 7,   coverage: 97.5, tonnage: '3.8t', vehicle: 'V-001' },
  { ward: 'Pettah',         zone: 'Zone 1',  total: 412, collected: 386, missed: 26,  coverage: 93.7, tonnage: '5.4t', vehicle: 'V-002' },
  { ward: 'Kotahena',       zone: 'Zone 1',  total: 318, collected: 307, missed: 11,  coverage: 96.5, tonnage: '4.3t', vehicle: 'V-008' },
  { ward: 'Maradana',       zone: 'Zone 2',  total: 298, collected: 283, missed: 15,  coverage: 95.0, tonnage: '4.1t', vehicle: 'V-005' },
  { ward: 'Grandpass',      zone: 'Zone 2',  total: 267, collected: 142, missed: 125, coverage: 53.2, tonnage: '2.0t', vehicle: 'V-006' },
  { ward: 'Dematagoda',     zone: 'Zone 2',  total: 251, collected: 244, missed: 7,   coverage: 97.2, tonnage: '3.5t', vehicle: 'V-010' },
  { ward: 'Slave Island',   zone: 'Zone 3',  total: 196, collected: 190, missed: 6,   coverage: 96.9, tonnage: '2.7t', vehicle: 'V-004' },
  { ward: 'Borella',        zone: 'Zone 3',  total: 356, collected: 331, missed: 25,  coverage: 93.0, tonnage: '4.6t', vehicle: 'V-003' },
  { ward: 'Narahenpita',    zone: 'Zone 3',  total: 274, collected: 267, missed: 7,   coverage: 97.4, tonnage: '3.8t', vehicle: 'V-007' },
  { ward: 'Kollupitiya',    zone: 'Zone 4',  total: 312, collected: 305, missed: 7,   coverage: 97.8, tonnage: '4.3t', vehicle: 'V-001' },
  { ward: 'Bambalapitiya',  zone: 'Zone 4',  total: 276, collected: 249, missed: 27,  coverage: 90.2, tonnage: '3.6t', vehicle: 'V-011' },
  { ward: 'Wellawatta',     zone: 'Zone 4',  total: 241, collected: 214, missed: 27,  coverage: 88.8, tonnage: '3.0t', vehicle: 'V-009' },
  { ward: 'Havelock Town',  zone: 'Zone 5',  total: 302, collected: 289, missed: 13,  coverage: 95.7, tonnage: '4.2t', vehicle: 'V-012' },
  { ward: 'Kirulapone',     zone: 'Zone 5',  total: 387, collected: 311, missed: 76,  coverage: 80.4, tonnage: '3.3t', vehicle: 'V-014' },
  { ward: 'Rajagiriya',     zone: 'Zone 5',  total: 445, collected: 367, missed: 78,  coverage: 82.5, tonnage: '3.9t', vehicle: 'V-021' },
];

export default function WasteCollection() {
  const [escalateWard, setEscalateWard] = useState(null);
  const [selectedKPI, setSelectedKPI]   = useState(null);

  const filteredWardCoverage = WARD_COVERAGE;
  const filteredMissedAlerts = MISSED_ALERTS;

  // KPIs derived from filtered WARD_COVERAGE
  const totalScheduled  = filteredWardCoverage.reduce((s, w) => s + w.total, 0);
  const totalCollected  = filteredWardCoverage.reduce((s, w) => s + w.collected, 0);
  const totalMissed     = filteredWardCoverage.reduce((s, w) => s + w.missed, 0);
  const overallCoverage = totalScheduled > 0 ? ((totalCollected / totalScheduled) * 100).toFixed(1) : '0.0';
  const criticalWards   = filteredWardCoverage.filter(w => w.coverage < 85).length;

  const wardChartData = {
    labels: filteredWardCoverage.map(w => w.ward.split('/')[0].trim().split(' ').slice(0, 2).join(' ')),
    datasets: [{
      data: filteredWardCoverage.map(w => w.coverage),
      backgroundColor: filteredWardCoverage.map(w =>
        w.coverage >= 95 ? 'rgba(16,185,129,0.65)' :
        w.coverage >= 85 ? 'rgba(245,158,11,0.65)' : 'rgba(239,68,68,0.65)'),
      borderColor: filteredWardCoverage.map(w =>
        w.coverage >= 95 ? '#10b981' : w.coverage >= 85 ? '#f59e0b' : '#ef4444'),
      borderWidth: 1.5, borderRadius: 4,
    }],
  };

  const priorityBadge = p => ({
    critical: 'bg-red-500/20 border-red-500/40 text-red-400',
    high:     'bg-amber-500/20 border-amber-500/40 text-amber-400',
    low:      'bg-slate-500/20 border-slate-500/40 text-slate-400',
  }[p] || 'bg-slate-500/20 border-slate-500/30 text-slate-400');

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {escalateWard && <EscalationModal ward={escalateWard} onClose={() => setEscalateWard(null)} />}
      {selectedKPI && <KPIDetailModal kpi={selectedKPI} onClose={() => setSelectedKPI(null)} />}

      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-cwm-border pb-3">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Waste Collection</h1>
          <p className="text-sm text-slate-500 mt-1">Ward coverage · Missed collections · Route performance · Escalation management</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400">● LIVE</span>
          <span className="text-slate-500">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <KPICard icon="🗺️" label="Overall Coverage" value={`${overallCoverage}%`}
          desc="Collection points visited vs scheduled across all 15 wards"
          color={parseFloat(overallCoverage) >= 95 ? 'text-emerald-400' : parseFloat(overallCoverage) >= 85 ? 'text-amber-400' : 'text-red-400'}
          rag={parseFloat(overallCoverage) >= 95 ? 'normal' : parseFloat(overallCoverage) >= 85 ? 'warning' : 'critical'}
          trend={-1.2}
          onClick={() => setSelectedKPI({
            icon: '🗺️', label: 'Overall Coverage', value: overallCoverage, unit: '%',
            trend: -1.2, color: 'text-amber-400',
            thresholds: { green: 95, amber: 85 }, inverted: false,
            definition: 'Percentage of scheduled door-to-door collection points attended today. Measured via RFID scan logs and GPS route confirmation across all 15 wards in Colombo Municipal Council.',
            subValues: [
              { label: 'Points Collected', value: totalCollected.toLocaleString() },
              { label: 'Missed Points', value: totalMissed.toLocaleString() },
              { label: 'Critical Wards', value: criticalWards },
              { label: 'Target', value: '≥95% daily' },
            ],
            analysis: 'Coverage is 4.9pts below the 95% SLA — 3 wards are in active breach: Grandpass (53.2%), Kirulapone (80.4%), Rajagiriya (82.5%)|V-006 breakdown at 08:15 is the root cause for Grandpass; driver absence for Kirulapone; route skipping for Rajagiriya — each requires a different response|Deploy standby vehicles to Grandpass Zone 2 immediately — 125 points are recoverable before shift end at 15:00',
            target: '95%+ daily door-to-door coverage',
          })} />
        <KPICard icon="✅" label="Points Collected" value={totalCollected.toLocaleString()}
          desc="RFID-confirmed household and commercial pickups today"
          color="text-emerald-400" rag="normal" trend={2.3}
          onClick={() => setSelectedKPI({
            icon: '✅', label: 'Points Collected', value: totalCollected, unit: 'pts',
            trend: 2.3, color: 'text-emerald-400',
            thresholds: { green: 4200, amber: 3500 }, inverted: false,
            definition: 'Total RFID-confirmed collection stops completed today across all 15 wards. Each scan represents a verified household or commercial pickup logged by on-board scanner.',
            subValues: [
              { label: 'Scheduled', value: totalScheduled.toLocaleString() },
              { label: 'Completion Rate', value: `${overallCoverage}%` },
              { label: 'Avg per Vehicle', value: `${Math.round(totalCollected / 14)} pts` },
              { label: 'Target', value: `${totalScheduled.toLocaleString()} pts/day` },
            ],
            analysis: `Collections are tracking +2.3% vs yesterday — Zone 1 and Zone 3 are leading performance while Zone 2 (Grandpass) drags the overall total|${totalMissed.toLocaleString()} missed points represent an ${((totalMissed / totalScheduled) * 100).toFixed(0)}% gap that is fully recoverable this afternoon if standby vehicles are deployed now|Zones 3, 4, and 5 are all above 90% — the systemic issue is confined to three wards in Zone 2 and Zone 5`,
            target: `${totalScheduled.toLocaleString()} confirmed pickups per day`,
          })} />
        <KPICard icon="⚠️" label="Missed Points" value={totalMissed.toLocaleString()}
          desc="Scheduled stops not serviced — pending follow-up dispatch"
          color="text-red-400" rag="critical" trend={8.5}
          onClick={() => setSelectedKPI({
            icon: '⚠️', label: 'Missed Points', value: totalMissed, unit: 'pts',
            trend: 8.5, color: 'text-red-400',
            thresholds: { green: 50, amber: 200 }, inverted: true,
            definition: 'Scheduled collection stops not attended within the planned time window. Detected via RFID non-scan events and GPS geo-fence miss analysis. Each unresolved miss escalates to a citizen complaint within 4 hours.',
            subValues: [
              { label: 'Critical Priority', value: '125 pts (Grandpass)' },
              { label: 'High Priority', value: '154 pts (3 wards)' },
              { label: 'Vehicle Breakdown', value: '125 pts (V-006)' },
              { label: 'Auto-Dispatched', value: '3 vehicles' },
            ],
            analysis: 'Three failure modes are driving today\'s misses: mechanical breakdown (V-006, 125 pts in Grandpass), driver absence (76 pts in Kirulapone), route skipping (27 pts each in Wellawatta and Rajagiriya)|Each failure type needs a different fix — deploy standby for breakdown, confirm roster cover for absence, issue accountability report for route skip|Resolving Grandpass alone recovers 30% of all missed points; prioritise it above all other interventions',
            target: '<50 missed points per day (<1.2% of schedule)',
          })} />
        <KPICard icon="🚨" label="Critical Wards" value={criticalWards}
          desc="Wards with <85% coverage requiring urgent intervention"
          color="text-red-400" rag="critical"
          onClick={() => setSelectedKPI({
            icon: '🚨', label: 'Critical Wards', value: criticalWards, unit: 'wards',
            trend: 1, color: 'text-red-400',
            thresholds: { green: 0, amber: 2 }, inverted: true,
            definition: 'Wards where collection coverage has fallen below the 85% SLA threshold. Each critical ward triggers a formal escalation and mandatory supervisor response within 2 hours.',
            subValues: [
              { label: 'Grandpass (Z2)', value: '53.2% — V-006 breakdown' },
              { label: 'Kirulapone (Z5)', value: '80.4% — driver absence' },
              { label: 'Rajagiriya (Z5)', value: '82.5% — route skip' },
              { label: 'SLA Threshold', value: '≥85% per ward' },
            ],
            analysis: 'Grandpass is in severe breach at 53.2% — the V-006 breakdown stranded 125 points at 08:15 and no standby deployment has been confirmed|Kirulapone and Rajagiriya are both above 80% — recoverable with afternoon dispatch but need supervisor sign-off|Zero critical wards is the daily target; 3 active breaches is a major operational failure that must be closed before 15:00',
            target: '0 wards below 85% coverage SLA',
          })} />
        <KPICard icon="📅" label="Scheduled Points" value={totalScheduled.toLocaleString()}
          desc="Total collection stops planned across all active routes today"
          color="text-white" rag="normal"
          onClick={() => setSelectedKPI({
            icon: '📅', label: 'Scheduled Points', value: totalScheduled, unit: 'pts',
            trend: 0, color: 'text-slate-300',
            thresholds: { green: 4000, amber: 3500 }, inverted: false,
            definition: 'Total planned collection stops across all 15 wards today, derived from route plans assigned to active vehicles. Each stop corresponds to a registered RFID tag at a household or commercial premises.',
            subValues: [
              { label: 'Zone 1 (3 wards)', value: '1,014 pts' },
              { label: 'Zone 2 (3 wards)', value: '816 pts' },
              { label: 'Zone 3 (3 wards)', value: '826 pts' },
              { label: 'Zone 4–5 (6 wards)', value: '1,963 pts' },
            ],
            analysis: `Schedule is fully loaded at ${totalScheduled.toLocaleString()} points across 14 active vehicles — average ${Math.round(totalScheduled / 14)} stops per vehicle which is within normal operating range|Zone 2's Grandpass ward has the highest density of missed stops relative to schedule; Zone 1 Fort and Zone 2 Dematagoda are achieving near-perfect completion|No schedule changes are required; the gap between scheduled and collected is an execution issue, not a planning one`,
            target: `Full schedule completion — ${totalScheduled.toLocaleString()} pts/day`,
          })} />
      </div>

      {/* ── MAIN: Ward Coverage + Missed Collections side-by-side ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* LEFT: Ward Coverage */}
        <div className="space-y-3">
          <div className="bg-cwm-panel border border-cwm-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">🗺️ Ward Coverage Rate — RAG Status</h3>
              <div className="flex items-center gap-2 text-[9px]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/70 inline-block" /> ≥95%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500/70 inline-block" /> 85–94%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/70 inline-block" /> &lt;85%</span>
              </div>
            </div>
            <div style={{ height: 150 }}>
              <Bar data={wardChartData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8' } },
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 8 } } },
                  y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 9 } }, min: 0, max: 100 },
                },
              }} />
            </div>
          </div>

          <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-cwm-border">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ward-by-Ward Collection Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-cwm-border text-slate-500 text-[10px] uppercase">
                    <th className="px-3 py-2 text-left">Ward</th>
                    <th className="px-3 py-2 text-right">Sched.</th>
                    <th className="px-3 py-2 text-right">Collected</th>
                    <th className="px-3 py-2 text-right">Missed</th>
                    <th className="px-3 py-2 text-left">Coverage</th>
                    <th className="px-3 py-2 text-right">Load</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredWardCoverage].sort((a, b) => a.coverage - b.coverage).map((w, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-3 py-2">
                        <div className="font-medium text-white text-[11px]">{w.ward}</div>
                        <div className="text-[9px] text-slate-500">{w.zone} · {w.vehicle}</div>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-400">{w.total}</td>
                      <td className="px-3 py-2 text-right text-emerald-400 font-medium">{w.collected}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-bold ${w.missed > 50 ? 'text-red-400' : w.missed > 15 ? 'text-amber-400' : 'text-slate-400'}`}>{w.missed}</span>
                      </td>
                      <td className="px-3 py-2 w-32">
                        <div className="flex items-center space-x-1.5">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${w.coverage >= 95 ? 'bg-emerald-500' : w.coverage >= 85 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${w.coverage}%` }} />
                          </div>
                          <span className={`text-[10px] font-bold w-9 text-right ${w.coverage >= 95 ? 'text-emerald-400' : w.coverage >= 85 ? 'text-amber-400' : 'text-red-400'}`}>{w.coverage}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-cyan-400 font-medium">{w.tonnage}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-cwm-border bg-white/[0.02]">
                    <td className="px-3 py-2 text-[10px] font-bold text-white">TOTAL</td>
                    <td className="px-3 py-2 text-right text-[10px] font-bold text-white">{totalScheduled}</td>
                    <td className="px-3 py-2 text-right text-[10px] font-bold text-emerald-400">{totalCollected}</td>
                    <td className="px-3 py-2 text-right text-[10px] font-bold text-red-400">{totalMissed}</td>
                    <td className="px-3 py-2"><span className="text-[10px] font-bold text-amber-400">{overallCoverage}%</span></td>
                    <td className="px-3 py-2 text-right text-[10px] font-bold text-cyan-400">
                      {filteredWardCoverage.reduce((s, w) => s + parseFloat(w.tonnage), 0).toFixed(1)}t
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT: Missed Collections */}
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: 'Total Missed Points', value: totalMissed,                                                    color: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/30'   },
              { label: 'Wards Below 85%',     value: filteredWardCoverage.filter(w => w.coverage < 85).length,  color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
              { label: 'Critical Alerts',     value: filteredMissedAlerts.filter(a => a.priority === 'critical').length, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center`}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-500 mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-cwm-border">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">⚠️ Missed Collections — Ranked by Impact</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Causes matched to fleet vehicle status · Total: {totalMissed} pts</p>
            </div>
            <div className="divide-y divide-white/5">
              {[...filteredMissedAlerts].sort((a, b) => b.missed - a.missed).map((a, i) => (
                <div key={i} className="flex items-start space-x-3 px-4 py-3 hover:bg-white/[0.02]">
                  <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${a.priority === 'critical' ? 'bg-red-500 animate-pulse' : a.priority === 'high' ? 'bg-amber-500' : 'bg-slate-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-[11px] font-bold text-white">{a.ward}</span>
                      <span className="text-[10px] text-slate-500">{a.zone}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${priorityBadge(a.priority)}`}>{a.priority.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center space-x-3 mt-1 text-[10px] text-slate-500 flex-wrap gap-y-0.5">
                      <span>Missed: <span className={`font-bold ${a.missed > 50 ? 'text-red-400' : a.missed > 15 ? 'text-amber-400' : 'text-slate-300'}`}>{a.missed} pts</span></span>
                      <span>Vehicle: <span className="text-cyan-400">{a.vehicle}</span></span>
                      <span>Cause: <span className="text-slate-300">{a.reason}</span></span>
                      <span>At: <span className="text-slate-400">{a.time}</span></span>
                    </div>
                  </div>
                  {a.priority !== 'low' && (
                    <button
                      onClick={() => {
                        const ward = WARD_COVERAGE.find(w => w.ward.toLowerCase().startsWith(a.ward.toLowerCase().split(' ')[0]));
                        setEscalateWard(ward || { ward: a.ward, zone: a.zone, missed: a.missed, coverage: '—', vehicle: a.vehicle });
                      }}
                      className="px-2 py-1 bg-amber-500/15 border border-amber-500/30 rounded text-[10px] text-amber-400 hover:bg-amber-500/25 flex-shrink-0 mt-0.5">
                      Escalate
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Root cause analysis */}
          <div className="bg-cwm-panel border border-cwm-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Root Cause Analysis</h3>
            <div className="space-y-2">
              {[
                { cause: 'Vehicle Breakdown', pts: 125, bar: 'bg-red-500',    color: 'text-red-400'   },
                { cause: 'No RFID Scan',      pts: 104, bar: 'bg-amber-500',  color: 'text-amber-400' },
                { cause: 'Driver Absence',    pts: 76,  bar: 'bg-amber-500',  color: 'text-amber-400' },
                { cause: 'Route Skipped',     pts: 54,  bar: 'bg-blue-500',   color: 'text-blue-400'  },
                { cause: 'Access Denied',     pts: 25,  bar: 'bg-slate-500',  color: 'text-slate-400' },
              ].map((c, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-28 text-[10px] text-slate-400 flex-shrink-0">{c.cause}</div>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${(c.pts / totalMissed * 100)}%` }} />
                  </div>
                  <span className={`text-[10px] font-bold w-8 text-right ${c.color}`}>{c.pts}</span>
                  <span className="text-[9px] text-slate-500 w-8 text-right">{(c.pts / totalMissed * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
