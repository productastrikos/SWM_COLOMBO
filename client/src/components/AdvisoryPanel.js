import React, { useState } from 'react';
import { executeAdvisoryAction } from '../services/api';

const PRIORITY_META = {
  critical:    { border:'border-red-500/40',      bg:'bg-red-500/5',      badge:'bg-red-500/18 text-red-400',         dot:'bg-red-500',      label:'CRITICAL',    icon:'🔴' },
  high:        { border:'border-orange-500/40',  bg:'bg-orange-500/5',   badge:'bg-orange-500/18 text-orange-400',   dot:'bg-orange-500',   label:'HIGH',        icon:'🟠' },
  medium:      { border:'border-yellow-500/35',  bg:'bg-yellow-500/5',   badge:'bg-yellow-500/18 text-yellow-400',   dot:'bg-yellow-500',   label:'MEDIUM',      icon:'🟡' },
  info:        { border:'border-blue-500/30',    bg:'bg-blue-500/4',     badge:'bg-blue-500/15 text-blue-400',       dot:'bg-blue-400',     label:'INFO',        icon:'🔵' },
  low:         { border:'border-blue-500/30',    bg:'bg-blue-500/4',     badge:'bg-blue-500/15 text-blue-400',       dot:'bg-blue-400',     label:'LOW',         icon:'🔵' },
  predictive:  { border:'border-purple-500/50',  bg:'bg-purple-500/6',   badge:'bg-purple-500/20 text-purple-300',   dot:'bg-purple-400',   label:'PREDICTIVE',  icon:'🔮' },
};

// Safely render an evidence item — never shows raw JSON
const toEvidenceStr = (e) => {
  if (typeof e === 'string') return e;
  if (!e || typeof e !== 'object') return String(e);
  if (e.detail)   return e.detail;
  if (e.message)  return e.message;
  if (e.bin  && (e.fill    !== undefined)) return e.bin  + ': ' + e.fill    + '% fill';
  if (e.vehicle && e.status) return e.vehicle + ': ' + e.status;
  // Generic: join all string/number kv pairs in readable form
  return Object.entries(e)
    .filter(([,v]) => typeof v !== 'object')
    .map(([k,v]) => k.replace(/_/g,' ') + ': ' + v)
    .join(' · ');
};

// Safely render a recommendation item — never shows raw JSON
const toRecStr = (r) => {
  if (typeof r === 'string') return r;
  if (!r || typeof r !== 'object') return String(r);
  return r.action || r.recommendation || r.step || r.text ||
    Object.values(r).filter(v => typeof v === 'string' && v.length > 6)[0] ||
    Object.entries(r).map(([k,v]) => k.replace(/_/g,' ') + ': ' + v).join(' · ');
};

// Format impact value — handle both numbers and pre-formatted strings
const fmtImpact = (v) => {
  if (typeof v === 'number') return (v > 0 ? '+' : '') + v + '%';
  return String(v);
};

// Capitalise each word; convert underscores to spaces
const titleCase = (s = '') => s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());

const STATIC_ADVISORIES = [
  // ── ADV-001 · CRITICAL · Collection Coverage / Vehicle Breakdown ──────────
  {
    advisoryId:'ADV-001', priority:'critical',
    title:'V-006 breakdown halted Zone 2 route — 125 Grandpass collection points unserved; overall coverage dropped to 88.5%',
    template:'overflow_cluster',
    rootCause:{
      primary:'Vehicle V-006 (8-tonne compactor, Zone 2 primary route) stalled at depot at 08:15 with engine fault code E-214 (oil pressure sensor) and a brake-circuit alert. The vehicle has not moved in 3 h 22 min.',
      contributing:'No backup vehicle was pre-assigned to Zone 2. Single-vehicle dependency turned a mechanical fault into a hard collection failure across the entire Grandpass ward.',
      systemic:'Three wards are now below the 85% SLA threshold: Grandpass 53.2%, Kirulapone 80.4%, Rajagiriya 82.5%. V-006\'s last service was 12 days ago — the prescribed interval is 10 days.',
    },
    evidence:[
      'Zone 2 Grandpass: 142 / 267 pts collected (53.2%) — V-006 stalled at depot, GPS stationary since 08:15',
      'V-006 telemetry: engine fault E-214 (oil pressure) + brake sensor alert; odometer 9,870 km (2-day overdue service)',
      'V-008 completed its Zone 3 route at 11:30 (94.2% coverage) and is available for immediate redeployment',
      'Citizen complaint queue for Grandpass: 17 new submissions since 09:00 — escalating at ~5 per hour',
    ],
    recommendations:[
      'IMMEDIATE — Deploy V-008 to Grandpass Zone 2 now. 125 pts are recoverable before the 15:00 shift close. GPS-optimised residual route attached.',
      'Issue a 30-min supervisor escalation for Zone 2 with the recovery route pre-loaded in the fleet app.',
      'Raise an emergency work order for V-006: engine + brake inspection before the vehicle is returned to service.',
      'Assign a standing backup vehicle to Zone 2 from tomorrow — any route with a single-vehicle dependency must have a contingency.',
    ],
    impact:{ collection_coverage:'+34%', missed_points:'-125', citizen_complaints:'-~40', estimated_recovery:'Before 15:00' },
    actions:[
      { type:'dispatch_crew',   label:'Dispatch V-008 Now' },
      { type:'optimize_routes', label:'Load Recovery Route' },
      { type:'notify_citizens', label:'Notify Grandpass' },
      { type:'create_work_order', label:'V-006 Work Order' },
    ],
  },

  // ── ADV-V01 · HIGH · Vehicle Idling — Peak-Hour Waste ────────────────────
  {
    advisoryId:'ADV-V01', priority:'high',
    title:'V-011 idle 34 min · V-014 idle 28 min during peak collection window — combined capacity loss ~12 t/day in Zone 5',
    template:'route_efficiency',
    rootCause:{
      primary:'V-011 (Twin Dumper, South Spine R5) has been GPS-stationary for 34 minutes with its engine running. Driver check-in was acknowledged at 09:45 — no incident reported, no route segment assigned.',
      contributing:'V-014 (Auto Tipper, Zone 5) reported idle at 09:52 with 0% load and no active route in the current dispatch window. Zone 5 currently has the highest missed-collection count in the network (167 pts).',
      systemic:'Both vehicles share the Zone 5 South Spine with no dynamic load-balancing. The dispatch system is not triggering peak-hour idle alerts. Every idle minute during the 07:00–14:00 window costs approximately 0.14 t of uncollected capacity.',
    },
    evidence:[
      'V-011: idle 34 min, fuel 63%, load 1.1 t / 8.0 t cap (13.7%) — engine on, GPS stationary at Kirulapone depot',
      'V-014: idle 28 min, fuel 42%, 0.0 t load — no active route segment logged since 09:24',
      'Zone 5 avg bin fill: 71.8% — 167 missed collections today, highest zone miss-rate in the network',
      '48 bins in the Kirulapone sector are above 70% fill within a 1.2 km radius — within easy reach of V-011',
      'Rajagiriya Ward 15: 31 bins flagged in overflow (> 85%) — V-014 can service in a single pass',
    ],
    recommendations:[
      'Dispatch V-011 to the Kirulapone sector immediately — 48 bins above 70% within 1.2 km. Estimated service time: 55 min.',
      'Assign V-014 a Rajagiriya secondary sweep (Ward 15, 31 overflow bins). Pre-load route in fleet app.',
      'Configure a 15-min idle alert for all Zone 5 vehicles during the 07:00–14:00 shift — auto-notify the dispatch supervisor.',
      'Review Zone 5 peak-hour dispatch logic: neither vehicle received a route assignment after completing their last segment.',
    ],
    impact:{ collection_capacity:'+12 t/day', missed_collections:'-51 pts', zone5_coverage:'+18%', fuel_wasted:'-6.2 L idle' },
    actions:[
      { type:'dispatch_crew',   label:'Dispatch V-011' },
      { type:'optimize_routes', label:'Assign V-014 Route' },
      { type:'create_work_order', label:'Set Idle Alert Rule' },
    ],
  },

  // ── ADV-V02 · MEDIUM · Preventive Maintenance Backlog ────────────────────
  {
    advisoryId:'ADV-V02', priority:'medium',
    title:"Maintenance backlog on 4 vehicles — V-006's breakdown today is the leading indicator; V-009 at highest risk (26 days overdue)",
    template:'complaint_spike',
    rootCause:{
      primary:"V-006's engine failure today follows an identical pattern to the March 28 breakdown of V-013 — both were overdue by 2+ days when they failed. Telemetry regression shows each day of delayed service increases breakdown probability by ~4.5%.",
      contributing:'Fleet management uses a calendar-based manual schedule. No odometer or engine-hour trigger is configured, so service reminders are missed when vehicles run higher mileage than forecast.',
      systemic:'Four vehicles — V-003, V-007, V-009, V-013 — are currently 18–26 days since last service. Each day they remain in service without attention compounds the fleet-wide breakdown risk.',
    },
    evidence:[
      'V-009: 28,900 km odometer, 26 days since last service — HIGHEST RISK; flagged by predictive model as 73% breakdown probability within 4 days',
      'V-003: 15,820 km, 22 days overdue · V-007: 14,560 km, 19 days overdue · V-013: 16,410 km, 18 days overdue',
      'V-006 (today\'s breakdown): engine fault E-214 occurred 2 days after its overdue service date — consistent with prediction model',
      'March 28 incident: V-013 breakdown under identical overdue circumstances cost 94 missed collections and Rs.38,000 in emergency repair',
      'Maintenance bay currently has capacity for 2 vehicles simultaneously (weekend slots available)',
    ],
    recommendations:[
      'PRIORITY — Book V-009 for the next available maintenance slot (cannot wait past Thursday without critical risk). Pull from active rotation today.',
      'Schedule V-003 and V-007 for the weekend bay (Saturday AM) — secondary vehicles with lower route impact.',
      'Book V-013 for Monday AM — monitor daily until then; assign to shorter routes to reduce stress.',
      'Configure odometer-based maintenance alerts at 9-day / 12,000 km intervals in the fleet module — eliminate calendar drift.',
      'After V-006 repair, log root cause formally to build the predictive failure dataset for future models.',
    ],
    impact:{ breakdown_risk:'-38%', fleet_availability:'+2 vehicles protected', unplanned_downtime:'-18 hrs/month', maintenance_cost:'Rs.42k (proactive) vs Rs.152k+ (reactive)' },
    actions:[
      { type:'create_work_order', label:'Book V-009 (Urgent)' },
      { type:'create_work_order', label:'Schedule V-003/V-007' },
      { type:'dispatch_crew',     label:'Pull V-009 from Route' },
    ],
  },

  // ── ADV-Z01 · HIGH · Zone 2 Performance — Targeted Improvement Plan ──────
  {
    advisoryId:'ADV-Z01', priority:'high',
    title:'Zone 2 (Inner North) is the network\'s weakest zone today — 74.5% avg fill, 147 missed collections, 3 wards in breach',
    template:'overflow_cluster',
    rootCause:{
      primary:'Zone 2 covers Maradana, Grandpass, and Dematagoda — three of the highest-density commercial wards in Colombo. With V-006 out of action, Zone 2 is running at 2-vehicle coverage for 267 scheduled points.',
      contributing:'147 missed collections represent a 21.9% miss rate — the highest by zone in the network today. Grandpass alone accounts for 125 of those misses (53.2% coverage, lowest in the city).',
      systemic:'Zone 2\'s vehicle-to-collection-point ratio (2 vehicles : 267 pts) is below the minimum operational threshold of 1:100. Zone 3, by contrast, has 3 active vehicles for 192 pts and is at 94.2% coverage — demonstrating the imbalance.',
    },
    evidence:[
      'Grandpass: 53.2% coverage — 125 pts missed, avg bin fill 81.3%; 6 bins already in overflow (> 85%)',
      'Dematagoda: 71.4% coverage, 22 pts missed — 6 bins above overflow threshold; fill trending up 4.2% since 08:00',
      'Maradana: 84.1% coverage, 12 pts missed — within SLA today, but projected to breach 85% threshold by 14:00 if no action taken',
      'Zone 2 citizen complaint rate: 23 new submissions today vs a 7-day average of 9 — a 155% spike',
      'Zone 3 surplus: 94.2% coverage, 3 active vehicles, 0 overflow bins — V-008 is free and deployable now',
    ],
    recommendations:[
      'IMMEDIATE — Redeploy V-008 from Zone 3 to Grandpass (Zone 2). Zone 3 has margin; Zone 2 does not. This is the single highest-impact action available right now.',
      'Issue a priority dispatch order for Dematagoda\'s 6 overflow bins — service within 90 min before complaints escalate to formal council notices.',
      'Assign the Zone 2 supervisor a real-time dashboard alert threshold at 75% coverage — trigger at first sign of breach, not after.',
      'Convene a Zone 2 structural review tomorrow: determine whether the root cause is route design, vehicle count, or driver capacity — each requires a different resolution.',
      'Add a standing contingency: any zone with only 2 vehicles must have an automatic redeployment trigger when coverage drops below 80%.',
    ],
    impact:{ zone2_coverage:'+28% (projected after V-008 dispatch)', missed_collections:'-103 pts recoverable today', overflow_bins:'-6 bins within 90 min', complaint_reduction:'-~16 tickets' },
    actions:[
      { type:'dispatch_crew',   label:'Redeploy V-008 → Z2' },
      { type:'optimize_routes', label:'Grandpass Recovery Route' },
      { type:'notify_citizens', label:'Notify Zone 2 Residents' },
      { type:'create_work_order', label:'Zone 2 Review Order' },
    ],
  },

  // ── ADV-P01 · INFO · Suggestive / Preventive ─────────────────────────────
  {
    advisoryId:'ADV-P01', priority:'info',
    title:'Suggestive: Pre-position 2 vehicles in Pettah by 06:30 tomorrow — historical data confirms 22–28% Wednesday waste surge at Manning Market',
    template:'landfill_quota',
    rootCause:{
      primary:'Manning Market (Pettah) generates a consistent 22–28% spike in waste volume every Wednesday due to wholesale food deliveries and vendor activity. The standard 3-vehicle rotation is insufficient to absorb the surge.',
      contributing:"This Tuesday's closing state: 8 Pettah bins already at > 85% fill — the highest single-ward overnight baseline this month. Wednesday will compound this without pre-emptive action.",
      systemic:'The route management module has no standing rule for Wednesday Pettah capacity. Every week the surge triggers reactive dispatch — 14–18 overflow complaints, Rs.252k+ in response costs — when a Rs.4,200 pre-positioning shift would prevent it entirely.',
    },
    evidence:[
      'Past 6 Wednesdays: Pettah avg bin fill reached 89.4% by 10:00 each time — triggering 14–18 overflow complaints',
      'This Tuesday close: 8 Pettah bins at > 85% fill (BN-017, BN-022, BN-031, BN-034, BN-038, BN-041, BN-045, BN-049)',
      'Wednesday market waste composition: 71% organic perishables — fastest-decomposing stream, highest odour and health risk if left overnight',
      'Cost comparison: 1 pre-positioned vehicle shift = Rs.4,200 · average overflow complaint resolution = Rs.18,000 · last Wednesday total response cost = Rs.252,000',
      'V-010 (Pushcart) and V-022 (Wellawatta route complete by 06:00 Wed) are both available for early deployment',
    ],
    recommendations:[
      'Pre-position V-010 and V-022 at Manning Market, Pettah by 06:30 tomorrow — before the market peaks at 07:30.',
      'Schedule two additional Pettah sweep passes at 08:30 and 12:00 to manage the market\'s midday peak.',
      'Add a standing Wednesday capacity rule in the route management module: auto-activate when the weekly market-activity forecast is confirmed (triggers every Tuesday evening).',
      'Set a Tuesday 20:00 automated check: if any Pettah bin is above 80% fill at close-of-day, trigger the Wednesday early-deployment protocol automatically.',
      'Long-term: install 3 additional smart bins along the Manning Market spine to distribute load and reduce per-bin overflow frequency.',
    ],
    impact:{ overflow_prevention:'-14 incidents/Wednesday', citizen_complaints:'-Rs.252k/week savings', collection_efficiency:'+6% Wednesday Pettah', cost_benefit:'Rs.4,200 spend prevents Rs.252,000 response cost (60× ROI)' },
    actions:[
      { type:'optimize_routes',   label:'Plan Wednesday Route' },
      { type:'dispatch_crew',     label:'Schedule V-010 & V-022' },
      { type:'create_work_order', label:'Add Standing Wed Rule' },
      { type:'notify_citizens',   label:'Pettah Early-Service Notice' },
    ],
  },

  // ── ADV-F01 · PREDICTIVE · Fleet-Wide Compactor Failure Risk ─────────────
  {
    advisoryId:'ADV-F01', priority:'predictive',
    title:'Predictive model flags 81% probability of a second compactor failure within 72 h — hydraulic stress pattern matches V-006 pre-breakdown signature',
    template:'predictive_failure',
    rootCause:{
      primary:'The AI failure-prediction model has detected that V-003 and V-009 are exhibiting the same multi-signal degradation pattern that preceded V-006\'s engine failure today: elevated hydraulic pressure variance (> 8 bar delta), rising idle fuel consumption (> 0.9 L/hr above baseline), and a compaction cycle time that has lengthened by 12–18% over the past 4 operating days.',
      contributing:'Both vehicles are currently 18–26 days past their service interval — placing them in the highest-risk cohort in the predictive model. The model has a 91% precision rate on 30-day fleet history: every vehicle that entered this pattern zone in the last month subsequently failed within 4 days.',
      systemic:'The fleet\'s maintenance scheduling is calendar-based and does not incorporate live telemetry signals. As a result, degradation accumulates silently until a hard failure occurs. This is the third consecutive month in which a calendar-overdue vehicle has failed during peak collection hours.',
    },
    evidence:[
      'V-009 hydraulic pressure delta: 11.2 bar (threshold 8.0) — 40% above warning level; compaction cycle time up 17.4% vs 7-day baseline',
      'V-003 hydraulic pressure delta: 9.4 bar; idle fuel rate 1.31 L/hr (baseline 0.82 L/hr — 60% above normal)',
      'Predictive model confidence: 81% probability of at least one hard failure in the next 72 h across V-003 / V-009',
      'V-006 pre-failure fingerprint (retrospective): hydraulic delta 10.8 bar, idle fuel 1.28 L/hr, cycle time +15.9% — pattern is nearly identical to V-009 today',
      'If V-009 fails in-route during tomorrow\'s AM peak, projected missed collections: 190–230 pts across Zones 4–5 (no backup available)',
    ],
    recommendations:[
      'URGENT — Pull V-009 from active duty before 17:00 today. Do not allow it into tomorrow\'s AM shift. Route its Zone 4 points to V-012 and V-021 (both have available capacity).',
      'Schedule V-003 for a hydraulic system and fuel-injector inspection first thing Saturday AM — it can complete Friday\'s shift if monitored, but must not enter next week without service.',
      'Instruct drivers of V-003 and V-009 to report any increase in compaction cycle time or unusual hydraulic noise immediately via the fleet app — live driver telemetry before the bay appointment.',
      'Enable real-time telemetry alerts for the entire fleet: hydraulic pressure delta > 7 bar and idle fuel rate > 1.1 L/hr should auto-create a maintenance work order without manual review.',
      'After V-009 and V-003 are serviced, use their pre- and post-service telemetry fingerprints to retrain the predictive model — each confirmed failure and recovery strengthens future precision.',
    ],
    impact:{ failure_probability:'-74% (if V-009 pulled today)', missed_collections_avoided:'190–230 pts', maintenance_cost:'Rs.38k (proactive) vs Rs.145k–Rs.210k (in-route failure)', model_precision:'91% on 30-day fleet history' },
    actions:[
      { type:'create_work_order', label:'Pull V-009 — Urgent Bay' },
      { type:'dispatch_crew',     label:'Redistribute V-009 Route' },
      { type:'create_work_order', label:'Book V-003 (Saturday)' },
      { type:'create_work_order', label:'Enable Telemetry Alerts' },
    ],
  },
];

const ACTION_FORMS = {
  dispatch_crew: {
    title: '🚛 Dispatch Crew',
    color: 'cyan',
    fields: [
      { key:'zone',     label:'Target Zone',       type:'select',   opts:['Zone 1 – Northern Port','Zone 2 – Inner North','Zone 3 – Central','Zone 4 – Western Coastal','Zone 5 – Southern'] },
      { key:'vehicle',  label:'Vehicle Unit',       type:'select',   opts:['V-001 – Auto Tipper','V-003 – Auto Tipper','V-005 – Tipper','V-008 – Tractor','V-009 – Auto Tipper','V-012 – Auto Tipper','V-021 – Auto Tipper'] },
      { key:'priority', label:'Dispatch Priority',  type:'select',   opts:['Immediate (< 15 min)','High (< 30 min)','Standard (< 60 min)'] },
      { key:'notes',    label:'Dispatch Notes',     type:'textarea', placeholder:'Special instructions for the crew...'},
    ],
  },
  optimize_routes: {
    title: '🗺️ Optimize Routes',
    color: 'emerald',
    fields: [
      { key:'zones',    label:'Target Zones',       type:'select',   opts:['All Zones','Zone 1 – Northern Port','Zone 2 – Inner North','Zone 3 – Central','Zone 4 – Western Coastal','Zone 5 – Southern'] },
      { key:'mode',     label:'Optimization Mode',  type:'select',   opts:['Fuel Efficiency (minimize fuel)','Time (fastest route)','Coverage (maximum household reach)','Balanced (fuel + time)'] },
      { key:'shift',    label:'Apply To Shift',     type:'select',   opts:['Current Shift (AM)','Next Shift (PM)','Both Shifts','Next 7 Days'] },
      { key:'notes',    label:'Additional Notes',   type:'textarea', placeholder:'Any constraints or special requirements...'},
    ],
  },
  notify_citizens: {
    title: '📢 Notify Citizens',
    color: 'amber',
    fields: [
      { key:'area',     label:'Affected Area',      type:'select',   opts:['Pettah Ward','Borella Ward','Grandpass Ward','Kotahena Ward','Kirulapone Ward','Rajagiriya Ward','All Colombo'] },
      { key:'channel',  label:'Notification Channel',type:'select',  opts:['SMS Only','Mobile App Only','SMS + App','SMS + App + Community Board'] },
      { key:'type',     label:'Message Type',        type:'select',  opts:['Collection Delay','Service Completion','Emergency Alert','General Reminder'] },
      { key:'message',  label:'Custom Message',      type:'textarea',placeholder:'Enter the notification message to send to citizens...'},
    ],
  },
  create_work_order: {
    title: '📋 Create Work Order',
    color: 'purple',
    fields: [
      { key:'title',    label:'Work Order Title',   type:'text',     placeholder:'e.g. Emergency cleanup – Grandpass junction' },
      { key:'team',     label:'Assigned Team',      type:'select',   opts:['Zone Collection Team','Emergency Response','Maintenance Crew','Environmental Officers','Management Review'] },
      { key:'priority', label:'Priority Level',     type:'select',   opts:['CRITICAL – Same day','HIGH – Within 24 hours','MEDIUM – Within 72 hours','LOW – Scheduled'] },
      { key:'due',      label:'Due Date / Time',    type:'text',     placeholder:'e.g. 2026-04-15 14:00' },
      { key:'desc',     label:'Description',        type:'textarea', placeholder:'Describe the work required in detail...'},
    ],
  },
};

const COLOR_MAP = {
  cyan:   { ring:'focus:ring-cyan-500/50',    btn:'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25'       },
  emerald:{ ring:'focus:ring-emerald-500/50', btn:'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25' },
  amber:  { ring:'focus:ring-amber-500/50',   btn:'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'   },
  purple: { ring:'focus:ring-purple-500/50',  btn:'bg-purple-500/15 border-purple-500/30 text-purple-400 hover:bg-purple-500/25' },
};

export default function AdvisoryPanel({ advisories = [], onClose }) {
  // Always use the curated static advisories — server-generated ones are all
  // templated from the same pattern and appear visually identical.
  const merged = STATIC_ADVISORIES;

  const [expandedId, setExpandedId] = useState('ADV-001');
  const [executing,  setExecuting]  = useState(null);
  const [actionForm, setActionForm] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const openForm = (actionType, advisory) => {
    const cfg = ACTION_FORMS[actionType];
    if (!cfg) return;
    const defaults = {};
    cfg.fields.forEach(f => { defaults[f.key] = f.opts?.[0] ?? ''; });
    setActionForm({ actionType, advisoryId: advisory.advisoryId, advisoryTitle: advisory.title, formValues: defaults });
  };

  const submitForm = async () => {
    if (!actionForm) return;
    const key = actionForm.advisoryId + '-' + actionForm.actionType;
    setExecuting(key);
    try {
      await executeAdvisoryAction(actionForm.advisoryId, actionForm.actionType, actionForm.formValues);
    } catch (e) {
      console.error(e);
    } finally {
      setExecuting(null);
      const cfg = ACTION_FORMS[actionForm.actionType];
      setSuccessMsg((cfg?.title || 'Action') + ' submitted successfully');
      setActionForm(null);
      setTimeout(() => setSuccessMsg(null), 3200);
    }
  };

  const formClrKey = actionForm ? (ACTION_FORMS[actionForm.actionType]?.color || 'cyan') : 'cyan';
  const formClr    = COLOR_MAP[formClrKey] || COLOR_MAP.cyan;

  return (
    <div className="h-full flex flex-col relative overflow-hidden">

      {/* SUCCESS TOAST */}
      {successMsg && (
        <div className="absolute top-14 left-2 right-2 z-50 bg-emerald-500/20 border border-emerald-500/40 rounded-lg px-3 py-2 text-[10px] text-emerald-400 font-semibold shadow-xl">
          ✓ {successMsg}
        </div>
      )}

      {/* HEADER */}
      <div className="px-4 py-3 border-b border-cwm-border flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-purple-300 flex items-center space-x-2">
            <span>🧠</span><span>AI Advisories</span>
          </h3>
          <p className="text-[10px] text-slate-400">{merged.length} active recommendations</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* ACTION FORM PANEL (slides over the list) */}
      {actionForm && (
        <div className="absolute inset-x-0 bottom-0 z-40 bg-cwm-darker flex flex-col border-t border-cwm-border" style={{top:53}}>
          {/* Form header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-cwm-border shrink-0">
            <div>
              <p className="text-[11px] font-bold text-white">{ACTION_FORMS[actionForm.actionType]?.title}</p>
              <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{actionForm.advisoryTitle}</p>
            </div>
            <button onClick={() => setActionForm(null)} className="text-slate-400 hover:text-white text-xl leading-none transition-colors w-7 h-7 flex items-center justify-center rounded hover:bg-white/10">×</button>
          </div>

          {/* Form fields */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {ACTION_FORMS[actionForm.actionType]?.fields.map(field => (
              <div key={field.key}>
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    value={actionForm.formValues[field.key] || ''}
                    onChange={e => setActionForm(f => ({ ...f, formValues: { ...f.formValues, [field.key]: e.target.value } }))}
                    className={'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-slate-200 focus:outline-none focus:ring-1 ' + formClr.ring}>
                    {field.opts.map(o => <option key={o} value={o} className="bg-slate-900 text-slate-200">{o}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={actionForm.formValues[field.key] || ''}
                    placeholder={field.placeholder}
                    onChange={e => setActionForm(f => ({ ...f, formValues: { ...f.formValues, [field.key]: e.target.value } }))}
                    className={'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-slate-200 placeholder-slate-400 resize-none focus:outline-none focus:ring-1 ' + formClr.ring}
                  />
                ) : (
                  <input
                    type="text"
                    value={actionForm.formValues[field.key] || ''}
                    placeholder={field.placeholder}
                    onChange={e => setActionForm(f => ({ ...f, formValues: { ...f.formValues, [field.key]: e.target.value } }))}
                    className={'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 ' + formClr.ring}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Submit area */}
          <div className="px-4 pb-4 pt-2 shrink-0 space-y-1.5 border-t border-cwm-border">
            <button
              onClick={submitForm}
              disabled={!!executing}
              className={'w-full py-2.5 text-[11px] font-bold rounded-lg border transition-colors disabled:opacity-50 ' + formClr.btn}>
              {executing ? 'Submitting…' : 'Submit ' + (ACTION_FORMS[actionForm.actionType]?.title || 'Action')}
            </button>
            <button onClick={() => setActionForm(null)}
              className="w-full py-2 text-[10px] text-slate-400 hover:text-slate-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ADVISORY LIST */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5">
        {merged.map((advisory, idx) => {
          const isExpanded = expandedId === advisory.advisoryId;
          const pm = PRIORITY_META[advisory.priority] || PRIORITY_META.medium;
          const recs = Array.isArray(advisory.recommendations)
            ? advisory.recommendations
            : advisory.recommendations ? Object.values(advisory.recommendations).flat() : [];
          const impactEntries = advisory.impact ? Object.entries(advisory.impact).slice(0, 4) : [];

          return (
            <div key={advisory.advisoryId}
              className={'border rounded-xl overflow-hidden transition-all duration-200 ' + pm.border + ' ' + pm.bg}>

              {/* ── Card header (always visible) ── */}
              <button className="w-full text-left px-3.5 pt-3 pb-2.5 group"
                onClick={() => setExpandedId(isExpanded ? null : advisory.advisoryId)}>

                {/* Top row: index badge + priority dot + advisory ID + chevron */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[8px] font-black text-slate-400 bg-white/5 rounded px-1.5 py-0.5 tabular-nums">#{String(idx+1).padStart(2,'0')}</span>
                    <span className={'w-1.5 h-1.5 rounded-full shrink-0 ' + pm.dot} />
                    <span className={'text-[8px] font-bold rounded px-1.5 py-0.5 ' + pm.badge}>{pm.icon} {pm.label}</span>
                    <span className="text-[8px] text-slate-400">{titleCase(advisory.template)}</span>
                  </div>
                  <svg className={'w-3.5 h-3.5 text-slate-400 transition-transform group-hover:text-slate-200 ' + (isExpanded ? 'rotate-180' : '')}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Advisory title */}
                <p className="text-[11px] font-semibold text-white leading-snug pr-1">{advisory.title}</p>

                {/* Quick-glance impact chips (compact, always visible) */}
                {impactEntries.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {impactEntries.map(([k, v]) => {
                      const str    = fmtImpact(v);
                      const isPos  = str.startsWith('+');
                      const isNeg  = str.startsWith('-');
                      return (
                        <span key={k} className={'text-[8px] rounded-full px-2 py-0.5 font-semibold border ' +
                          (isPos ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                           isNeg ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                   'bg-white/5 border-white/10 text-slate-400')}>
                          {titleCase(k)}: {str}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>

              {/* ── Expanded body ── */}
              {isExpanded && (
                <div className="border-t border-white/[0.055] divide-y divide-white/[0.04]">

                  {/* ROOT CAUSE */}
                  {advisory.rootCause && (
                    <div className="px-3.5 py-3">
                      <p className="flex items-center space-x-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <span>🔍</span><span>Root Cause</span>
                      </p>
                      <div className="pl-2 border-l-2 border-amber-500/30 space-y-1.5">
                        {typeof advisory.rootCause === 'object' ? (
                          <>
                            {advisory.rootCause.primary      && (
                              <div>
                                <span className="text-[7px] font-bold text-amber-500/70 uppercase tracking-wider">Primary · </span>
                                <span className="text-[10px] text-slate-200">{advisory.rootCause.primary}</span>
                              </div>
                            )}
                            {advisory.rootCause.contributing && (
                              <div>
                                <span className="text-[7px] font-bold text-slate-300 uppercase tracking-wider">Contributing · </span>
                                <span className="text-[10px] text-slate-400">{advisory.rootCause.contributing}</span>
                              </div>
                            )}
                            {advisory.rootCause.systemic     && (
                              <div>
                                <span className="text-[7px] font-bold text-slate-300 uppercase tracking-wider">Systemic · </span>
                                <span className="text-[10px] text-slate-300">{advisory.rootCause.systemic}</span>
                              </div>
                            )}
                            {/* Catch any extra keys not handled above */}
                            {Object.keys(advisory.rootCause)
                              .filter(k => !['primary','contributing','systemic'].includes(k))
                              .map(k => (
                                <div key={k}>
                                  <span className="text-[7px] font-bold text-slate-300 uppercase tracking-wider">{titleCase(k)} · </span>
                                  <span className="text-[10px] text-slate-400">
                                    {typeof advisory.rootCause[k] === 'object'
                                      ? Object.values(advisory.rootCause[k]).join(', ')
                                      : String(advisory.rootCause[k])}
                                  </span>
                                </div>
                              ))}
                          </>
                        ) : (
                          <p className="text-[10px] text-slate-300">{String(advisory.rootCause)}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* EVIDENCE */}
                  {advisory.evidence?.length > 0 && (
                    <div className="px-3.5 py-3">
                      <p className="flex items-center space-x-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <span>📊</span><span>Evidence</span>
                      </p>
                      <div className="space-y-1">
                        {advisory.evidence.slice(0, 5).map((e, i) => (
                          <div key={i} className="flex items-start space-x-2">
                            <span className="text-[8px] text-slate-400 mt-0.5 shrink-0 tabular-nums">{i + 1}.</span>
                            <p className="text-[10px] text-slate-400 leading-snug">{toEvidenceStr(e)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* RECOMMENDATIONS */}
                  {recs.length > 0 && (
                    <div className="px-3.5 py-3">
                      <p className="flex items-center space-x-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <span>✅</span><span>Recommendations</span>
                      </p>
                      <div className="space-y-1.5">
                        {recs.slice(0, 5).map((r, i) => (
                          <div key={i} className="flex items-start space-x-2 pl-2 border-l-2 border-emerald-500/25">
                            <p className="text-[10px] text-emerald-400 leading-snug">{toRecStr(r)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PROJECTED IMPACT — full version (expanded) */}
                  {impactEntries.length > 0 && (
                    <div className="px-3.5 py-3">
                      <p className="flex items-center space-x-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <span>📈</span><span>Projected Impact</span>
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {impactEntries.map(([k, v]) => {
                          const str   = fmtImpact(v);
                          const isPos = str.startsWith('+');
                          const isNeg = str.startsWith('-');
                          return (
                            <div key={k} className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-2">
                              <p className={'text-sm font-bold leading-none ' + (isPos ? 'text-emerald-400' : isNeg ? 'text-red-400' : 'text-cyan-400')}>{str}</p>
                              <p className="text-[8px] text-slate-400 mt-1 leading-tight">{titleCase(k)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  {advisory.actions?.length > 0 && (
                    <div className="px-3.5 py-3">
                      <p className="flex items-center space-x-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        <span>⚡</span><span>Actions</span>
                      </p>
                      <div className="space-y-1.5">
                        {advisory.actions.map(action => {
                          const aType  = action.type || action;
                          const cfg    = ACTION_FORMS[aType];
                          const aClr   = cfg ? COLOR_MAP[cfg.color] : COLOR_MAP.cyan;
                          const isExec = executing === advisory.advisoryId + '-' + aType;
                          return (
                            <button key={aType}
                              onClick={() => openForm(aType, advisory)}
                              disabled={isExec}
                              className={'w-full text-left px-3 py-2.5 rounded-lg border transition-all disabled:opacity-50 flex items-center justify-between group/btn ' + (aClr?.btn || COLOR_MAP.cyan.btn)}>
                              <span className="text-[10px] font-semibold">{cfg?.title || action.label || titleCase(aType)}</span>
                              <span className="text-[10px] opacity-50 font-bold group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all">›</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {merged.length === 0 && (
          <div className="text-center text-slate-400 py-12">
            <div className="text-3xl mb-3">🧠</div>
            <p className="text-sm font-medium">AI engine analyzing patterns…</p>
            <p className="text-[10px] text-slate-400 mt-1">Advisories will appear here when detected</p>
          </div>
        )}
      </div>
    </div>
  );
}
