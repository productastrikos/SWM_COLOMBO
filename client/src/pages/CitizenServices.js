import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Tooltip, Filler, Legend,
} from 'chart.js';
import KPICard, { IcoClipboard, IcoCheck, IcoClock, IcoSmile, IcoShield } from '../components/KPICard';
import { ChartTimeframeControl, TIMEFRAME_OPTIONS, getTimeframeOption, buildTimeframeLabels, resampleSeries, CHART_PALETTES, getChartTokens, chartTooltip, chartScales } from '../components/chartUtils';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Filler, Legend);

/* ── Channel SVG icon paths (blue) ───────────────────────────────── */
const CHANNEL_ICON_PATHS = {
  'SMS':        'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  'Phone Call': 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  'WhatsApp':   'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  'Twitter/X':  'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
  'Facebook':   'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  'Mobile App': 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  'Email':      'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  'Walk-in':    'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
};
function ChannelIcon({ channel }) {
  const d = CHANNEL_ICON_PATHS[channel] || CHANNEL_ICON_PATHS['SMS'];
  return (
    <svg className="w-4 h-4" fill="none" stroke="#3b82f6" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d={d} />
    </svg>
  );
}

/* ── Static data ──────────────────────────────────────────────────── */

// 431 total active complaints across all wards
const COMPLAINT_TYPES = [
  { type: 'Missed Collection', count: 187, pct: 43.4, avgResolutionH: 1.4,  color: 'var(--cwm-danger)',     sla: 85 },
  { type: 'Bin Overflow',      count: 98,  pct: 22.7, avgResolutionH: 1.75, color: 'var(--cwm-warning)',    sla: 91 },
  { type: 'Illegal Dumping',   count: 67,  pct: 15.5, avgResolutionH: 9.2,  color: '#10b981',              sla: 62 },
  { type: 'Odor / Hygiene',    count: 52,  pct: 12.1, avgResolutionH: 4.1,  color: 'var(--cwm-info)',       sla: 78 },
  { type: 'Property Damage',   count: 27,  pct: 6.3,  avgResolutionH: 18.05,color: 'var(--cwm-text-faint)', sla: 44 },
];

// Ward-level complaints — zones aligned with Digital Twin (Zone 1–5)
const WARD_COMPLAINTS = [
  { ward: 'Grandpass',     zone: 'Zone 2', complaints: 82,  resolved: 51, pending: 31, severity: 'critical', topType: 'Missed Collection' },
  { ward: 'Rajagiriya',    zone: 'Zone 5', complaints: 71,  resolved: 38, pending: 33, severity: 'critical', topType: 'Illegal Dumping'   },
  { ward: 'Kirulapone',    zone: 'Zone 5', complaints: 67,  resolved: 34, pending: 33, severity: 'critical', topType: 'Missed Collection' },
  { ward: 'Bambalapitiya', zone: 'Zone 4', complaints: 43,  resolved: 27, pending: 16, severity: 'warning',  topType: 'Bin Overflow'      },
  { ward: 'Wellawatta',    zone: 'Zone 4', complaints: 38,  resolved: 24, pending: 14, severity: 'warning',  topType: 'Missed Collection' },
  { ward: 'Pettah',        zone: 'Zone 1', complaints: 34,  resolved: 22, pending: 12, severity: 'warning',  topType: 'Missed Collection' },
  { ward: 'Borella',       zone: 'Zone 3', complaints: 31,  resolved: 22, pending: 9,  severity: 'normal',   topType: 'Odor / Hygiene'    },
  { ward: 'Maradana',      zone: 'Zone 2', complaints: 28,  resolved: 20, pending: 8,  severity: 'normal',   topType: 'Odor / Hygiene'    },
  { ward: 'Havelock Town', zone: 'Zone 5', complaints: 23,  resolved: 17, pending: 6,  severity: 'normal',   topType: 'Bin Overflow'      },
  { ward: 'Kotahena',      zone: 'Zone 1', complaints: 18,  resolved: 14, pending: 4,  severity: 'normal',   topType: 'Bin Overflow'      },
  { ward: 'Fort',          zone: 'Zone 1', complaints: 15,  resolved: 11, pending: 4,  severity: 'normal',   topType: 'Property Damage'   },
];

// 30-day service request trend (last entry = most recent day)
const TREND_30D = [
  { day: 'Mon 6 Apr',  newComplaints: 45, resolved: 41 },
  { day: 'Tue 7 Apr',  newComplaints: 49, resolved: 46 },
  { day: 'Wed 8 Apr',  newComplaints: 55, resolved: 52 },
  { day: 'Thu 9 Apr',  newComplaints: 62, resolved: 58 },
  { day: 'Fri 10 Apr', newComplaints: 71, resolved: 64 },
  { day: 'Sat 11 Apr', newComplaints: 68, resolved: 61 },
  { day: 'Sun 12 Apr', newComplaints: 52, resolved: 55 },
  { day: 'Mon 13 Apr', newComplaints: 50, resolved: 46 },
  { day: 'Tue 14 Apr', newComplaints: 53, resolved: 50 },
  { day: 'Wed 15 Apr', newComplaints: 60, resolved: 57 },
  { day: 'Thu 16 Apr', newComplaints: 68, resolved: 64 },
  { day: 'Fri 17 Apr', newComplaints: 79, resolved: 73 },
  { day: 'Sat 18 Apr', newComplaints: 74, resolved: 67 },
  { day: 'Sun 19 Apr', newComplaints: 58, resolved: 60 },
  { day: 'Mon 20 Apr', newComplaints: 52, resolved: 49 },
  { day: 'Tue 21 Apr', newComplaints: 57, resolved: 53 },
  { day: 'Wed 22 Apr', newComplaints: 65, resolved: 63 },
  { day: 'Thu 23 Apr', newComplaints: 72, resolved: 68 },
  { day: 'Fri 24 Apr', newComplaints: 84, resolved: 78 },
  { day: 'Sat 25 Apr', newComplaints: 81, resolved: 73 },
  { day: 'Sun 26 Apr', newComplaints: 62, resolved: 63 },
  { day: 'Mon 27 Apr', newComplaints: 55, resolved: 52 },
  { day: 'Tue 28 Apr', newComplaints: 58, resolved: 71 },
  { day: 'Wed 29 Apr', newComplaints: 62, resolved: 54 },
  { day: 'Thu 30 Apr', newComplaints: 74, resolved: 68 },
  { day: 'Fri 1 May',  newComplaints: 81, resolved: 77 },
  { day: 'Sat 2 May',  newComplaints: 93, resolved: 85 },
  { day: 'Sun 3 May',  newComplaints: 88, resolved: 79 },
  { day: 'Mon 4 May',  newComplaints: 67, resolved: 72 },
  { day: 'Tue 5 May',  newComplaints: 63, resolved: 68 },
];

// Missed collection reports — synced with WasteCollection.js MISSED_ALERTS
const MISSED_COLLECTION_REPORTS = [
  { id: 'MCR-041', ward: 'Grandpass',     zone: 'Zone 2', points: 125, vehicle: 'V-006', reason: 'Vehicle Breakdown', reportedAt: '08:15', status: 'dispatched',   priority: 'critical' },
  { id: 'MCR-042', ward: 'Rajagiriya',    zone: 'Zone 5', points: 78,  vehicle: 'V-021', reason: 'No RFID Scan',      reportedAt: '10:18', status: 'investigating', priority: 'high'     },
  { id: 'MCR-043', ward: 'Kirulapone',    zone: 'Zone 5', points: 76,  vehicle: 'V-014', reason: 'Driver Absence',    reportedAt: '09:44', status: 'dispatched',   priority: 'high'     },
  { id: 'MCR-044', ward: 'Wellawatta',    zone: 'Zone 4', points: 27,  vehicle: 'V-009', reason: 'Route Skipped',     reportedAt: '09:02', status: 'resolved',     priority: 'high'     },
  { id: 'MCR-045', ward: 'Bambalapitiya', zone: 'Zone 4', points: 27,  vehicle: 'V-011', reason: 'Route Skipped',     reportedAt: '10:45', status: 'resolved',     priority: 'medium'   },
  { id: 'MCR-046', ward: 'Pettah',        zone: 'Zone 1', points: 26,  vehicle: 'V-002', reason: 'No RFID Scan',      reportedAt: '07:42', status: 'pending',      priority: 'high'     },
  { id: 'MCR-047', ward: 'Borella',       zone: 'Zone 3', points: 25,  vehicle: 'V-003', reason: 'Access Denied',     reportedAt: '11:05', status: 'pending',      priority: 'medium'   },
  { id: 'MCR-048', ward: 'Maradana',      zone: 'Zone 2', points: 15,  vehicle: 'V-005', reason: 'No RFID Scan',      reportedAt: '10:30', status: 'resolved',     priority: 'medium'   },
];

// Satisfaction breakdown
const SATISFACTION = [
  { category: 'Collection Service',   score: 68.4, target: 80 },
  { category: 'Response Time',        score: 71.2, target: 80 },
  { category: 'Staff Conduct',        score: 86.5, target: 85 },
  { category: 'App / Reporting',      score: 63.1, target: 75 },
  { category: 'Issue Resolution',     score: 72.8, target: 80 },
];

// Live complaint feed templates — cycle through these every few seconds
const LIVE_TEMPLATES = [
  { channel: 'SMS', icon: '📱', type: 'Missed Collection', ward: 'Grandpass',     priority: 'high',     msg: 'Bin not collected since yesterday morning. Strong smell near Temple Road.' },
  { channel: 'Phone Call', icon: '📞', type: 'Bin Overflow', ward: 'Wellawatta',  priority: 'critical', msg: 'Multiple bins overflowing on Dharmapala Mawatha — waste spilling onto road.' },
  { channel: 'WhatsApp', icon: '💬', type: 'Illegal Dumping', ward: 'Rajagiriya', priority: 'high',     msg: 'Large construction waste dump near canal bank, photos attached.' },
  { channel: 'Twitter/X', icon: '𝕏', type: 'Odor / Hygiene', ward: 'Kirulapone', priority: 'medium',   msg: '@WasteCMC Strong odour from transfer station affecting residents this morning.' },
  { channel: 'Facebook', icon: '👤', type: 'Missed Collection', ward: 'Pettah',   priority: 'medium',   msg: 'No garbage collection for 2 days. Many residents affected — Fort/Pettah group.' },
  { channel: 'Mobile App', icon: '📲', type: 'Bin Overflow', ward: 'Borella',     priority: 'high',     msg: 'ColomboWaste App — reporting overflow at bus stand, bin #B-034.' },
  { channel: 'Email', icon: '📧', type: 'Property Damage', ward: 'Bambalapitiya', priority: 'medium',   msg: 'Collection truck damaged gate pillar at No. 12A. Requesting repair or reimbursement.' },
  { channel: 'Walk-in', icon: '🏢', type: 'Illegal Dumping', ward: 'Maradana',    priority: 'high',     msg: 'Resident visited CMC office to report dumping near Dematagoda canal. Ref photo supplied.' },
  { channel: 'SMS', icon: '📱', type: 'Odor / Hygiene', ward: 'Fort',             priority: 'low',      msg: 'Smell from uncollected bins near Lotus Road. Affecting tourist area.' },
  { channel: 'WhatsApp', icon: '💬', type: 'Missed Collection', ward: 'Kotahena', priority: 'medium',   msg: 'Area 4B skipped this morning — Route W04 seems to have bypassed our block.' },
  { channel: 'Phone Call', icon: '📞', type: 'Missed Collection', ward: 'Havelock Town', priority: 'high', msg: 'Truck came but drove past without collecting. Driver did not stop at Wijerama Rd.' },
  { channel: 'Mobile App', icon: '📲', type: 'Illegal Dumping', ward: 'Grandpass', priority: 'critical', msg: 'Large overnight dump of medical waste near Zone 2 parking ground. Hazard.' },
  { channel: 'SMS', icon: '📱', type: 'Bin Overflow', ward: 'Narahenpita',         priority: 'high',     msg: '3 bins overflowing near Sulaiman Terrace junction since last night.' },
  { channel: 'Twitter/X', icon: '𝕏', type: 'Property Damage', ward: 'Kollupitiya', priority: 'low',    msg: '@ColomboMC Compactor truck scraped parked car. Number plate WP CAH-8834.' },
  { channel: 'Facebook', icon: '👤', type: 'Odor / Hygiene', ward: 'Slave Island',  priority: 'medium',  msg: 'Pumpkin Lane garbage not collected for 3 days. Rodent sightings increasing.' },
  { channel: 'Email', icon: '📧', type: 'Missed Collection', ward: 'Dematagoda',    priority: 'high',    msg: 'Residents of Block C have filed 3 missed collection reports this week with no response.' },
  { channel: 'Mobile App', icon: '📲', type: 'Bin Overflow', ward: 'Borella',       priority: 'critical', msg: 'App Report #CR-8821 — public bin at Horton Place park has been full for 48 hrs.' },
  { channel: 'Phone Call', icon: '📞', type: 'Illegal Dumping', ward: 'Kirulapone', priority: 'medium',   msg: 'Caller reports 6 bags of industrial waste dumped on Kirulapone Avenue last night.' },
];
const PRIORITY_META = {
  critical: { label: 'CRITICAL', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  high:     { label: 'HIGH',     cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  medium:   { label: 'MEDIUM',   cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  low:      { label: 'LOW',      cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

function makeChartOpts() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: chartTooltip() },
    scales: chartScales(),
  };
}

/* ── Complaint Heatmap Cell ──────────────────────────────────────── */
function HeatCell({ ward, complaints, maxComplaints }) {
  const intensity = complaints / maxComplaints;
  const bg = intensity > 0.8 ? 'bg-red-500' : intensity > 0.5 ? 'bg-amber-500' : intensity > 0.3 ? 'bg-yellow-500' : 'bg-emerald-500';
  const opacity = Math.max(0.2, intensity);
  return (
    <div className="relative group cursor-default" title={`${ward}: ${complaints} complaints`}>
      <div className={`${bg} rounded-md flex items-center justify-center`} style={{ height: 36, opacity }}>
        <span className="text-[9px] text-white font-bold">{complaints}</span>
      </div>
      <p className="text-[8px] text-slate-500 text-center mt-0.5 truncate">{ward.split(' ')[0]}</p>
    </div>
  );
}

/* ── Resolution Time Bar ─────────────────────────────────────────── */
function ResolutionBar({ type, hours, sla, color }) {
  const target = 12; // 12h SLA target
  const pct = Math.min((hours / target) * 100, 100);
  const ragColor = hours <= 2 ? 'bg-emerald-500' : hours <= 6 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center space-x-3">
      <div className="w-32 text-[10px] text-slate-400 truncate flex-shrink-0">{type}</div>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${ragColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-12 text-right text-[10px] font-bold" style={{ color }}>
        {hours}h
      </div>
      <div className={`text-[9px] w-10 text-right font-medium ${sla >= 80 ? 'text-emerald-400' : sla >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
        {sla}% SLA
      </div>
    </div>
  );
}

/* ── Complaint Row ───────────────────────────────────────────────── */
function ComplaintRow({ report }) {
  const statusColor = {
    dispatched:    'bg-cyan-500/20 text-cyan-400',
    investigating: 'bg-amber-500/20 text-amber-400',
    resolved:      'bg-emerald-500/20 text-emerald-400',
    pending:       'bg-slate-500/20 text-slate-400',
  }[report.status] || 'bg-slate-500/20 text-slate-400';

  const priorityColor = {
    critical: 'bg-red-500/20 border-red-500/40 text-red-400',
    high:     'bg-amber-500/20 border-amber-500/40 text-amber-400',
    medium:   'bg-blue-500/20 border-blue-500/40 text-blue-400',
  }[report.priority] || 'bg-slate-500/20 border-slate-500/30 text-slate-400';

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
      <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{report.id}</td>
      <td className="px-3 py-2 font-medium text-white text-[11px]">{report.ward}</td>
      <td className="px-3 py-2 text-slate-400 text-[10px]">{report.zone}</td>
      <td className="px-3 py-2 text-right text-amber-400 font-bold text-[11px]">{report.points}</td>
      <td className="px-3 py-2 text-cyan-400 text-[10px]">{report.vehicle}</td>
      <td className="px-3 py-2 text-slate-400 text-[10px]">{report.reason}</td>
      <td className="px-3 py-2 text-slate-500 text-[10px]">{report.reportedAt}</td>
      <td className="px-3 py-2">
        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${priorityColor}`}>{report.priority.toUpperCase()}</span>
      </td>
      <td className="px-3 py-2">
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${statusColor}`}>{report.status.toUpperCase()}</span>
      </td>
    </tr>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
export default function CitizenServices() {
  const isLight = typeof document !== 'undefined' && document.body?.dataset?.theme === 'light';
  const [activeSection, setActiveSection] = useState('overview');
  const [trendFrame, setTrendFrame] = useState('7D');
  const activeTrendFrame = getTimeframeOption(TIMEFRAME_OPTIONS.weekly, trendFrame);

  // Live complaint feed — new entries arrive every 4 seconds, max 30 in list
  const feedIdRef = useRef(200);
  const [liveFeed, setLiveFeed] = useState(() =>
    LIVE_TEMPLATES.slice(0, 5).map((t, i) => {
      const now = new Date(); now.setMinutes(now.getMinutes() - (5 - i) * 4);
      return { ...t, id: 200 + i, time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    }).reverse()
  );

  useEffect(() => {
    let idx = 5;
    const timer = setInterval(() => {
      const template = LIVE_TEMPLATES[idx % LIVE_TEMPLATES.length];
      idx++;
      feedIdRef.current++;
      const entry = {
        ...template,
        id: feedIdRef.current,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setLiveFeed(prev => [entry, ...prev].slice(0, 30));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Action panel state
  const [actionPanel, setActionPanel]   = useState(null);   // feed item being actioned, or null
  const [actionType, setActionType]     = useState('');
  const [actionNotes, setActionNotes]   = useState('');
  const [actionExtra, setActionExtra]   = useState('');     // vehicle ID / supervisor name / date-time
  const [actionedItems, setActionedItems] = useState(new Set());
  const [actionToast, setActionToast]   = useState('');

  const ACTION_TYPES = [
    { value: 'dispatch',     label: 'Dispatch Vehicle',          extraLabel: 'Vehicle ID (e.g. V-012)',  extraPlaceholder: 'V-0xx' },
    { value: 'escalate',     label: 'Escalate to Supervisor',    extraLabel: 'Supervisor Name',          extraPlaceholder: 'Name...' },
    { value: 'investigate',  label: 'Mark Investigating',        extraLabel: null,                       extraPlaceholder: null },
    { value: 'schedule',     label: 'Schedule Collection',       extraLabel: 'Date & Time',              extraPlaceholder: 'dd/mm hh:mm' },
    { value: 'acknowledge',  label: 'Acknowledge',               extraLabel: null,                       extraPlaceholder: null },
    { value: 'resolve',      label: 'Resolve',                   extraLabel: null,                       extraPlaceholder: null },
  ];

  const handleOpenAction = (item) => {
    setActionPanel(item);
    setActionType('');
    setActionNotes('');
    setActionExtra('');
  };

  const handleConfirmAction = () => {
    if (!actionType) return;
    const at = ACTION_TYPES.find(a => a.value === actionType);
    setActionedItems(prev => new Set([...prev, actionPanel.id]));
    setActionToast(`${at.label} — submitted for complaint #${actionPanel.id}`);
    setTimeout(() => setActionToast(''), 4000);
    setActionPanel(null);
  };

  const filteredWardComplaints = WARD_COMPLAINTS;
  const filteredMissedReports  = MISSED_COLLECTION_REPORTS;

  const totalActive     = filteredWardComplaints.reduce((s, w) => s + w.pending, 0);
  const totalResolved30 = 506; // last 7 days resolved
  const avgResolution   = (COMPLAINT_TYPES.reduce((s, t) => s + t.avgResolutionH * t.count, 0) / COMPLAINT_TYPES.reduce((s, t) => s + t.count, 0)).toFixed(1);
  const satisfaction    = (SATISFACTION.reduce((s, c) => s + c.score, 0) / SATISFACTION.length).toFixed(1);
  const slaCompliance   = 78.4;

  const complaintTypeData = useMemo(() => {
    const tok = getChartTokens();
    const cols = [tok.danger, tok.warning, tok.info, tok.info, tok.tickColor];
    return {
      labels: COMPLAINT_TYPES.map(ct => ct.type),
      datasets: [{
        data: COMPLAINT_TYPES.map(ct => ct.count),
        backgroundColor: cols.map(c => c + 'cc'),
        borderColor: cols,
        borderWidth: 1.5,
        borderRadius: 4,
      }],
    };
  }, [isLight]); // eslint-disable-line react-hooks/exhaustive-deps

  const trendData = useMemo(() => {
    const base30New = TREND_30D.map(d => d.newComplaints);
    const base30Res = TREND_30D.map(d => d.resolved);
    const srcNew = activeTrendFrame.dataWindow ? base30New.slice(-activeTrendFrame.dataWindow) : base30New;
    const srcRes = activeTrendFrame.dataWindow ? base30Res.slice(-activeTrendFrame.dataWindow) : base30Res;
    return {
      labels: buildTimeframeLabels(activeTrendFrame.value, activeTrendFrame.points),
      datasets: [
        {
          label: 'New Complaints',
          data: resampleSeries(srcNew, activeTrendFrame.points),
          borderColor: CHART_PALETTES.area.cyan.border,
          backgroundColor: CHART_PALETTES.area.cyan.fill,
          fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2,
        },
        {
          label: 'Resolved',
          data: resampleSeries(srcRes, activeTrendFrame.points),
          borderColor: CHART_PALETTES.area.emerald.border,
          backgroundColor: CHART_PALETTES.area.emerald.fill,
          fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2,
        },
      ],
    };
  }, [activeTrendFrame]);

  const wardData = useMemo(() => {
    const tok = getChartTokens();
    return {
      labels: filteredWardComplaints.map(w => w.ward),
      datasets: [{
        data: filteredWardComplaints.map(w => w.complaints),
        backgroundColor: filteredWardComplaints.map(w =>
          w.severity === 'critical' ? tok.dangerBar :
          w.severity === 'warning'  ? tok.warningBar : tok.successBar),
        borderColor: filteredWardComplaints.map(w =>
          w.severity === 'critical' ? tok.danger :
          w.severity === 'warning'  ? tok.warning : tok.success),
        borderWidth: 1.5, borderRadius: 4,
      }],
    };
  }, [filteredWardComplaints, isLight]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxComplaints = Math.max(...filteredWardComplaints.map(w => w.complaints), 1);

  const satisfactionData = useMemo(() => {
    const tok = getChartTokens();
    return {
      labels: SATISFACTION.map(s => s.category),
      datasets: [{
        data: SATISFACTION.map(s => s.score),
        backgroundColor: SATISFACTION.map(s =>
          s.score >= s.target ? tok.successBar :
          s.score >= s.target * 0.85 ? tok.warningBar : tok.dangerBar),
        borderColor: SATISFACTION.map(s =>
          s.score >= s.target ? tok.success :
          s.score >= s.target * 0.85 ? tok.warning : tok.danger),
        borderWidth: 1.5, borderRadius: 4,
      }],
    };
  }, [isLight]); // eslint-disable-line react-hooks/exhaustive-deps


  const SECTIONS = [
    { key: 'overview',   label: 'Overview' },
    { key: 'complaints', label: 'By Type & Ward' },
    { key: 'missed',     label: 'Missed Collections' },
    { key: 'resolution', label: 'Resolution Times' },
    { key: 'satisfaction', label: 'Satisfaction' },
    { key: 'live_feed',    label: 'Live Feed' },
  ];

  return (
    <>
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-cwm-border pb-3">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Citizen Services</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complaint tracking · Resolution times · Missed collection reports · Citizen satisfaction
          </p>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
            <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400">● LIVE</span>
            <span className="text-slate-500">{new Date().toLocaleTimeString()}</span>
          </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <KPICard icon={<IcoClipboard />} label="Active Complaints"    value={totalActive}          color="text-red-400"     rag="critical" />
        <KPICard icon={<IcoCheck />} label="Resolved (7 days)"   value={totalResolved30}       color="text-emerald-400" rag="normal"   />
        <KPICard icon={<IcoClock />} label="Avg Resolution"      value={`${avgResolution}h`}   color={parseFloat(avgResolution) <= 4 ? 'text-emerald-400' : parseFloat(avgResolution) <= 10 ? 'text-amber-400' : 'text-red-400'} rag={parseFloat(avgResolution) <= 4 ? 'normal' : parseFloat(avgResolution) <= 10 ? 'warning' : 'critical'} />
        <KPICard icon={<IcoSmile />} label="Satisfaction Score"   value={`${satisfaction}%`}    color={parseFloat(satisfaction) >= 80 ? 'text-emerald-400' : parseFloat(satisfaction) >= 65 ? 'text-amber-400' : 'text-red-400'} rag={parseFloat(satisfaction) >= 80 ? 'normal' : parseFloat(satisfaction) >= 65 ? 'warning' : 'critical'} />
        <KPICard icon={<IcoShield />} label="SLA Compliance (24h)" value={`${slaCompliance}%`}   color={slaCompliance >= 90 ? 'text-emerald-400' : slaCompliance >= 75 ? 'text-amber-400' : 'text-red-400'} rag={slaCompliance >= 90 ? 'normal' : slaCompliance >= 75 ? 'warning' : 'critical'} />
      </div>

      {/* Section nav */}
      <div className="flex space-x-1 border-b border-cwm-border overflow-x-auto">
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className={`px-3 py-2 text-[11px] font-medium border-b-2 whitespace-nowrap transition-colors ${activeSection === s.key ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ────────────────────────────────────────────── */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 7-day trend */}
            <div className="bg-cwm-panel border border-cwm-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Service Request Trend</h3>
                <div className="flex items-center gap-3 text-[9px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> New</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Resolved</span>
                  <ChartTimeframeControl options={TIMEFRAME_OPTIONS.weekly} value={trendFrame} onChange={setTrendFrame} />
                </div>
              </div>
              <div style={{ height: 160 }}>
                <Line data={trendData} options={makeChartOpts()} />
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Net new last 7 days: <span className="text-amber-400 font-bold">+17</span> complaints added to backlog
              </p>
            </div>

            {/* Complaint by type */}
            <div className="bg-cwm-panel border border-cwm-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Complaints by Type — Today</h3>
              <div style={{ height: 160 }}>
                <Bar data={complaintTypeData} options={makeChartOpts()} />
              </div>
            </div>
          </div>

          {/* Heatmap */}
          <div className="bg-cwm-panel border border-cwm-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Complaint Density Heatmap — by Ward</h3>
            <div className="grid grid-cols-5 md:grid-cols-11 gap-2 mb-3">
              {filteredWardComplaints.map(w => (
                <HeatCell key={w.ward} ward={w.ward} complaints={w.complaints} maxComplaints={maxComplaints} />
              ))}
            </div>
            <div className="flex items-center gap-4 text-[9px] text-slate-500 mt-1">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-500 opacity-90 inline-block" /> &gt;70 Critical</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-amber-500 opacity-80 inline-block" /> 41–70 High</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-yellow-500 opacity-70 inline-block" /> 21–40 Medium</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-500 opacity-60 inline-block" /> ≤20 Low</span>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPLAINTS BY TYPE & WARD ───────────────────────────── */}
      {activeSection === 'complaints' && (
        <div className="space-y-4">
          {/* By type breakdown */}
          <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-cwm-border">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Complaint Type Breakdown</h3>
            </div>
            <div className="p-4 space-y-3">
              {COMPLAINT_TYPES.map((t, i) => {
                const pct = (t.count / COMPLAINT_TYPES.reduce((s, x) => s + x.count, 0) * 100).toFixed(1);
                return (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="w-28 text-[10px] text-slate-400 flex-shrink-0">{t.type}</div>
                    <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${t.pct}%`, backgroundColor: t.color }} />
                    </div>
                    <div className="w-8 text-right text-[10px] font-bold text-white">{t.count}</div>
                    <div className="w-10 text-right text-[9px] text-slate-500">{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By ward table */}
          <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-cwm-border flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ward-Level Complaint Summary</h3>
              <span className="text-[10px] text-slate-500">{filteredWardComplaints.length} wards</span>
            </div>
            <div style={{ height: 160 }} className="p-3">
              <Bar data={wardData} options={makeChartOpts()} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-cwm-border text-slate-500 text-[10px] uppercase">
                    <th className="px-3 py-2 text-left">Ward</th>
                    <th className="px-3 py-2 text-left">Zone</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Resolved</th>
                    <th className="px-3 py-2 text-right">Pending</th>
                    <th className="px-3 py-2 text-left">Resolution</th>
                    <th className="px-3 py-2 text-left">Top Issue</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWardComplaints.map((w, i) => {
                    const resPct = ((w.resolved / w.complaints) * 100).toFixed(0);
                    return (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-medium text-white">{w.ward}</td>
                        <td className="px-3 py-2 text-slate-500 text-[10px]">{w.zone}</td>
                        <td className="px-3 py-2 text-right text-slate-300 font-bold">{w.complaints}</td>
                        <td className="px-3 py-2 text-right text-emerald-400 font-medium">{w.resolved}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`font-bold ${w.pending > 20 ? 'text-red-400' : w.pending > 10 ? 'text-amber-400' : 'text-slate-300'}`}>{w.pending}</span>
                        </td>
                        <td className="px-3 py-2 w-28">
                          <div className="flex items-center space-x-1.5">
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${parseInt(resPct) >= 70 ? 'bg-emerald-500' : parseInt(resPct) >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${resPct}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400 w-7 text-right">{resPct}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[10px] text-slate-400">{w.topType}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            w.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                            w.severity === 'warning'  ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-emerald-500/20 text-emerald-400'}`}>
                            {w.severity.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MISSED COLLECTION REPORTS ────────────────────────────── */}
      {activeSection === 'missed' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Missed Points Today', value: filteredMissedReports.reduce((s, r) => s + r.points, 0), color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
              { label: 'Critical Reports',          value: filteredMissedReports.filter(r => r.priority === 'critical').length, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
              { label: 'Dispatched / Resolved',     value: filteredMissedReports.filter(r => ['dispatched','resolved'].includes(r.status)).length, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} border ${s.border} rounded-xl p-4 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-cwm-border">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Missed Collection Reports — Linked to Ward Coverage</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Citizen-reported missed pickups matched to fleet RFID scan gaps
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-cwm-border text-slate-500 text-[10px] uppercase">
                    <th className="px-3 py-2 text-left">Report ID</th>
                    <th className="px-3 py-2 text-left">Ward</th>
                    <th className="px-3 py-2 text-left">Zone</th>
                    <th className="px-3 py-2 text-right">Missed Pts</th>
                    <th className="px-3 py-2 text-left">Vehicle</th>
                    <th className="px-3 py-2 text-left">Reason</th>
                    <th className="px-3 py-2 text-left">Reported</th>
                    <th className="px-3 py-2 text-left">Priority</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMissedReports.map((r, i) => <ComplaintRow key={i} report={r} />)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── RESOLUTION TIMES ─────────────────────────────────────── */}
      {activeSection === 'resolution' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-cwm-panel border border-cwm-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Avg Resolution Time by Type</h3>
              <div className="space-y-3">
                {COMPLAINT_TYPES.map((t, i) => (
                  <ResolutionBar key={i} type={t.type} hours={t.avgResolutionH} sla={t.sla} color={t.color} />
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Overall SLA compliance (24h target)</span>
                  <span className="text-amber-400 font-bold">{slaCompliance}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${slaCompliance}%` }} />
                </div>
              </div>
            </div>
            <div className="bg-cwm-panel border border-cwm-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Resolution SLA Threshold Bands</h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Missed Collection', target: '2h',  actual: '1.4h',  rag: 'normal'  },
                  { label: 'Bin Overflow',      target: '3h',  actual: '1.75h', rag: 'normal'  },
                  { label: 'Odor / Hygiene',    target: '6h',  actual: '4.1h',  rag: 'normal'  },
                  { label: 'Illegal Dumping',   target: '12h', actual: '9.2h',  rag: 'warning' },
                  { label: 'Property Damage',   target: '24h', actual: '18.1h', rag: 'warning' },
                ].map((r, i) => (
                  <div key={i} className={`rounded-lg px-3 py-2 border flex items-center justify-between ${
                    r.rag === 'normal' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'
                  }`}>
                    <span className="text-[10px] text-slate-400">{r.label}</span>
                    <div className="flex items-center space-x-3 text-[10px]">
                      <span className="text-slate-500">Target: {r.target}</span>
                      <span className={`font-bold ${r.rag === 'normal' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        Actual: {r.actual}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${r.rag === 'normal' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {r.rag.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SATISFACTION ─────────────────────────────────────────── */}
      {activeSection === 'satisfaction' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-cwm-panel border border-cwm-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Satisfaction Score by Category</h3>
              <div style={{ height: 200 }}>
                <Bar data={satisfactionData} options={{
                  ...makeChartOpts(),
                  scales: chartScales({ x: { grid: { display: false } }, y: { min: 0, max: 100 } }),
                }} />
              </div>
            </div>

            <div className="bg-cwm-panel border border-cwm-border rounded-xl p-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Category Scores vs Target</h3>
              <div className="space-y-3">
                {SATISFACTION.map((s, i) => {
                  const rag = s.score >= s.target ? 'normal' : s.score >= s.target * 0.85 ? 'warning' : 'critical';
                  const barColor = rag === 'normal' ? 'bg-emerald-500' : rag === 'warning' ? 'bg-amber-500' : 'bg-red-500';
                  const textColor = rag === 'normal' ? 'text-emerald-400' : rag === 'warning' ? 'text-amber-400' : 'text-red-400';
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-400">{s.category}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-slate-500">Target: {s.target}%</span>
                          <span className={`text-[10px] font-bold ${textColor}`}>{s.score}%</span>
                        </div>
                      </div>
                      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${s.score}%` }} />
                        <div className="absolute top-0 h-full border-l-2 border-white/30" style={{ left: `${s.target}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Overall Citizen Satisfaction</span>
                  <span className="text-amber-400 font-bold text-sm">{satisfaction}%</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">
                  Based on 2,847 survey responses (last 30 days) · App rating: 3.8 / 5 · Call centre CSAT: 74%
                </p>
              </div>
            </div>
          </div>

          {/* Satisfaction drivers */}
          <div className="bg-cwm-panel border border-cwm-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Key Drivers of Low Satisfaction</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { driver: 'Inconsistent collection timing', impact: 'high', wards: 'Pettah, Grandpass, Kirulapone', action: 'Enforce vehicle departure schedule ±15 min' },
                { driver: 'Slow illegal dumping response', impact: 'high', wards: 'Grandpass, Rajagiriya', action: 'Deploy rapid-response teams 08:00–18:00' },
                { driver: 'App reporting not user-friendly', impact: 'medium', wards: 'All wards', action: 'Sinhala/Tamil language UI update required' },
              ].map((d, i) => (
                <div key={i} className={`rounded-xl p-3 border ${d.impact === 'high' ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${d.impact === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {d.impact.toUpperCase()} IMPACT
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white mb-1">{d.driver}</p>
                  <p className="text-[10px] text-slate-500 mb-2">Wards: {d.wards}</p>
                  <p className="text-[10px] text-cyan-400 font-medium">→ {d.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE COMPLAINTS FEED ─────────────────────────────────── */}
      {activeSection === 'live_feed' && (
        <div className="space-y-4">
          {/* Feed header stats */}
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: 'SMS / Text',    count: liveFeed.filter(c => c.channel === 'SMS').length,         cls: 'text-emerald-400', icon: 'SMS' },
              { label: 'Phone Calls',   count: liveFeed.filter(c => c.channel === 'Phone Call').length,  cls: 'text-cyan-400',    icon: 'TEL' },
              { label: 'Social Media',  count: liveFeed.filter(c => ['Twitter/X','Facebook'].includes(c.channel)).length, cls: 'text-blue-400', icon: 'WEB' },
              { label: 'App / Digital', count: liveFeed.filter(c => ['Mobile App','Email','WhatsApp'].includes(c.channel)).length, cls: 'text-cyan-400', icon: 'APP' },
            ].map((s, i) => (
              <div key={i} className="bg-cwm-panel border border-cwm-border rounded-xl p-3 text-center">
                <p className="text-xs font-bold text-slate-500 tracking-widest">{s.icon}</p>
                <p className={`text-xl font-bold ${s.cls} mt-0.5`}>{s.count}</p>
                <p className="text-[10px] text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Stream */}
          <div className="bg-cwm-panel border border-cwm-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-cwm-border flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Incoming Complaints</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Real-time intake across all citizen reporting channels · New complaint every ~4 seconds</p>
              </div>
              <span className="px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-[10px] font-bold animate-pulse">● LIVE</span>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-[520px] overflow-y-auto">
              {liveFeed.map(item => {
                const pm = PRIORITY_META[item.priority] || PRIORITY_META.medium;
                return (
                  <div key={item.id} className="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
                    {/* Channel icon */}
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center shrink-0 mt-0.5">
                      <ChannelIcon channel={item.channel} />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-bold text-slate-300">{item.channel}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${pm.cls}`}>{pm.label}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-slate-400">{item.type}</span>
                        <span className="text-[9px] text-slate-500">{item.ward}</span>
                        {actionedItems.has(item.id) && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">✓ Actioned</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">{item.msg}</p>
                    </div>
                    {/* Time + action */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-600">{item.time}</span>
                      <button
                        onClick={() => handleOpenAction(item)}
                        className={`text-[9px] px-2 py-0.5 rounded font-bold transition-colors ${actionedItems.has(item.id) ? 'bg-slate-700/50 border border-slate-600/30 text-slate-500' : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'}`}
                      >
                        Action
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Channel breakdown */}
          <div className="bg-cwm-panel border border-cwm-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Channel Distribution (Last 30 Complaints)</h3>
            <div className="space-y-2">
              {Object.entries(
                liveFeed.reduce((acc, c) => { acc[c.channel] = (acc[c.channel] || 0) + 1; return acc; }, {})
              ).sort((a, b) => b[1] - a[1]).map(([ch, cnt], i) => {
                const pct = ((cnt / liveFeed.length) * 100).toFixed(0);
                const icons = { 'SMS': 'SMS', 'Phone Call': 'Tel', 'WhatsApp': 'WA', 'Twitter/X': 'X', 'Facebook': 'FB', 'Mobile App': 'App', 'Email': 'Eml', 'Walk-in': 'WI' };
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[9px] font-mono font-bold text-slate-500 w-8 text-center">{icons[ch] || 'Ch'}</span>
                    <span className="text-[10px] text-slate-400 w-24">{ch}</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-8 text-right">{cnt}</span>
                    <span className="text-[10px] text-slate-600 w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* ── ACTION PANEL MODAL ───────────────────────────────────── */}
    {actionPanel && (() => {
      const pm = PRIORITY_META[actionPanel.priority] || PRIORITY_META.medium;
      const selectedAction = ACTION_TYPES.find(a => a.value === actionType);
      return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActionPanel(null)} />
          {/* Panel */}
          <div className="relative z-10 bg-cwm-panel border border-cwm-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-cwm-border">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <ChannelIcon channel={actionPanel.channel} />
                  <span className="text-xs font-bold text-white">{actionPanel.channel}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${pm.cls}`}>{pm.label}</span>
                  <span className="text-[9px] text-slate-500">#{actionPanel.id}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug mb-1">{actionPanel.msg}</p>
                <p className="text-[10px] text-slate-500">{actionPanel.ward} · {actionPanel.type} · {actionPanel.time}</p>
              </div>
              <button onClick={() => setActionPanel(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors text-lg shrink-0">
                ×
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              {/* Action type select */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Action Type</label>
                <select
                  value={actionType}
                  onChange={e => { setActionType(e.target.value); setActionExtra(''); }}
                  className="w-full bg-cwm-darker border border-cwm-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60 appearance-none"
                >
                  <option value="">— Select an action —</option>
                  {ACTION_TYPES.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              {/* Conditional extra input */}
              {selectedAction?.extraLabel && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{selectedAction.extraLabel}</label>
                  <input
                    type={actionType === 'schedule' ? 'text' : 'text'}
                    value={actionExtra}
                    onChange={e => setActionExtra(e.target.value)}
                    placeholder={selectedAction.extraPlaceholder}
                    className="w-full bg-cwm-darker border border-cwm-border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Notes (optional)</label>
                <textarea
                  value={actionNotes}
                  onChange={e => setActionNotes(e.target.value)}
                  placeholder="Add context or follow-up instructions..."
                  rows={3}
                  className="w-full bg-cwm-darker border border-cwm-border rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setActionPanel(null)}
                className="flex-1 py-2 rounded-lg bg-white/[0.03] border border-cwm-border text-xs text-slate-400 hover:bg-white/[0.06] transition-colors">
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={!actionType}
                className="flex-1 py-2 rounded-lg bg-cyan-600 text-xs font-bold text-white hover:bg-cyan-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionType ? ACTION_TYPES.find(a => a.value === actionType)?.label || 'Confirm' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      );
    })()}

    {/* ── ACTION TOAST ─────────────────────────────────────────── */}
    {actionToast && (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-emerald-900/90 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-medium shadow-xl backdrop-blur max-w-sm text-center">
        ✓ {actionToast}
      </div>
    )}
    </>
  );
}
