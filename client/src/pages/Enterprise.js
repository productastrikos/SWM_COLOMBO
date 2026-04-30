import React, { useState, useEffect } from 'react';
import { getHRData, getFinanceData, getProcurementData, getITSecurityData, getLegalData, getESGData, getCitizenData } from '../services/api';
import KPICard from '../components/KPICard';

const enterpriseApis = {
  hr: getHRData, finance: getFinanceData, procurement: getProcurementData,
  it: getITSecurityData, legal: getLegalData, esg: getESGData, citizen: getCitizenData
};

const modules = [
  { id: 'hr', name: 'Human Resources', icon: '👥', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30' },
  { id: 'finance', name: 'Finance & Budget', icon: '💰', color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30' },
  { id: 'procurement', name: 'Procurement', icon: '📦', color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30' },
  { id: 'it', name: 'IT & Security', icon: '🔒', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30' },
  { id: 'legal', name: 'Legal & Compliance', icon: '⚖️', color: 'from-red-500/20 to-red-600/10 border-red-500/30' },
  { id: 'esg', name: 'ESG Reporting', icon: '🌿', color: 'from-green-500/20 to-green-600/10 border-green-500/30' },
  { id: 'citizen', name: 'Citizen Services', icon: '📱', color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30' },
];

function renderCellValue(value) {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    // Render named fields: prefer common readable keys
    const keys = Object.keys(value);
    if (keys.length === 0) return '-';
    return keys.map(k => {
      const v = value[k];
      return `${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : String(v)}`;
    }).join(' · ');
  }
  return String(value);
}

function DataTable({ data, columns }) {
  if (!data || data.length === 0) return <div className="text-center text-slate-600 text-xs py-4">No data available</div>;
  const cols = columns || Object.keys(data[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10">
            {cols.map(c => (
              <th key={c} className="text-left py-2 px-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                {c.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((row, i) => (
            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
              {cols.map(c => (
                <td key={c} className="py-2 px-2 text-slate-400">
                  {renderCellValue(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModuleView({ moduleId, data }) {
  if (!data) return <div className="text-center text-slate-600 text-sm py-8">Loading module data...</div>;

  const renderContent = () => {
    switch(moduleId) {
      case 'hr':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Total Staff',     value: data.totalEmployees || data.totalStaff || 1247, color: 'text-cyan-400',    icon: '👥' },
                { label: 'Field Workers',   value: data.fieldWorkers || 890,                        color: 'text-emerald-400', icon: '🛠️' },
                { label: 'Attendance Rate', value: `${(data.attendanceRate || data.trainingCompliance || 94.2).toFixed(1)}%`, color: 'text-white', icon: '✅' },
                { label: 'Open Positions',  value: data.openPositions || 23,                        color: 'text-amber-400',   icon: '📋' },
              ].map((s, i) => (
                <KPICard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} />
              ))}
            </div>
            <DataTable data={data.recentHires || [
              { name: 'A. Perera', role: 'Field Supervisor', dept: 'Operations', startDate: '2024-01-15', status: 'Active' },
              { name: 'K. Silva', role: 'Collection Worker', dept: 'Zone 3', startDate: '2024-01-10', status: 'Training' },
              { name: 'M. Fernando', role: 'Driver', dept: 'Fleet', startDate: '2024-01-08', status: 'Active' },
            ]} />
          </div>
        );
      case 'finance':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Annual Budget', value: 'Rs. 4.2B', color: 'text-emerald-400', icon: '💰' },
                { label: 'YTD Spend',    value: 'Rs. 3.1B', color: 'text-white',        icon: '📊' },
                { label: 'Revenue (WTE)', value: 'Rs. 680M', color: 'text-cyan-400',    icon: '⚡'       },
                { label: 'Budget Util.', value: '73.8%',    color: 'text-amber-400',    icon: '📈' },
              ].map((s, i) => (
                <KPICard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} />
              ))}
            </div>
            <DataTable data={data.recentTransactions || [
              { date: '2024-01-20', description: 'Fuel - Fleet Operations', amount: 'Rs. 2.4M', category: 'Operations', status: 'Approved' },
              { date: '2024-01-19', description: 'Vehicle Maintenance', amount: 'Rs. 890K', category: 'Maintenance', status: 'Pending' },
              { date: '2024-01-18', description: 'PPE Procurement', amount: 'Rs. 450K', category: 'Equipment', status: 'Approved' },
            ]} />
          </div>
        );
      case 'procurement':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Active POs',       value: data.activeContracts || data.activePOs || 47,   color: 'text-cyan-400',    icon: '📦' },
                { label: 'Pending Approval', value: data.pendingOrders   || data.pending    || 12,   color: 'text-amber-400',   icon: '⏳'       },
                { label: 'YTD Savings',      value: 'Rs. 45M',                                       color: 'text-emerald-400', icon: '💹' },
                { label: 'Active Vendors',   value: data.topVendors?.length || data.vendors || 4,    color: 'text-white',       icon: '🤝' },
              ].map((s, i) => (
                <KPICard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} />
              ))}
            </div>
            <DataTable data={data.recentOrders || [
              { poNumber: 'PO-2024-0147', vendor: 'Lanka Equipment Ltd', item: 'Compactor Parts', value: 'Rs. 1.2M', status: 'Delivered' },
              { poNumber: 'PO-2024-0146', vendor: 'Green Solutions PLC', item: 'Smart Bin Sensors', value: 'Rs. 3.5M', status: 'In Transit' },
              { poNumber: 'PO-2024-0145', vendor: 'CeyChem Industries', item: 'Leachate Treatment', value: 'Rs. 780K', status: 'Approved' },
            ]} />
          </div>
        );
      case 'citizen':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Active Complaints', value: data.activeComplaints || 234,                                                                  color: 'text-red-400',     icon: '📋' },
                { label: 'Resolved (30d)',    value: data.resolvedThisMonth || data.resolved || 156,                                                color: 'text-emerald-400', icon: '✅' },
                { label: 'Avg Resolution',    value: `${(data.avgResolutionTime || data.avgResolution || 4.2).toFixed(1)}h`,                        color: 'text-cyan-400',    icon: '⏱️' },
                { label: 'Satisfaction',      value: `${(data.satisfactionRate || data.satisfaction || 73).toFixed(0)}%`,                           color: 'text-amber-400',   icon: '😊' },
              ].map((s, i) => (
                <KPICard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} />
              ))}
            </div>
            <DataTable data={data.recentComplaints || [
              { id: 'CMP-4521', citizen: 'R. Jayawardena', zone: 'Fort', issue: 'Missed Collection', status: 'In Progress', days: 1 },
              { id: 'CMP-4520', citizen: 'S. Bandara', zone: 'Pettah', issue: 'Bin Overflow', status: 'Assigned', days: 2 },
              { id: 'CMP-4519', citizen: 'N. De Silva', zone: 'Borella', issue: 'Odor Complaint', status: 'Resolved', days: 0 },
            ]} />
          </div>
        );
      case 'it':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'System Uptime',    value: `${(data.systemUptime || data.uptime || 99.7).toFixed(1)}%`, color: 'text-emerald-400', icon: '💻' },
                { label: 'Open Tickets',     value: data.openTickets || data.incidents || 14,                    color: 'text-amber-400',   icon: '🎫' },
                { label: 'Security Alerts',  value: data.securityAlerts || data.alerts || 3,                     color: 'text-red-400',     icon: '🔒' },
                { label: 'Data Sync Rate',   value: `${(data.syncRate || data.dataSync || 98.4).toFixed(1)}%`,   color: 'text-cyan-400',    icon: '🔄' },
              ].map((s, i) => (
                <KPICard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} />
              ))}
            </div>
            <DataTable data={data.recentIncidents || data.incidents_list || [
              { id: 'INC-0821', system: 'GPS Tracker API', severity: 'Medium', status: 'Investigating', opened: '09:14' },
              { id: 'INC-0820', system: 'RFID Scanner Z3',  severity: 'Low',    status: 'Resolved',      opened: '07:32' },
              { id: 'INC-0819', system: 'Firewall Rule',    severity: 'High',   status: 'Mitigated',     opened: '06:05' },
            ]} />
          </div>
        );
      case 'legal':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Active Cases',    value: data.activeCases    || 12, color: 'text-red-400',     icon: '⚖️' },
                { label: 'Compliance Rate', value: `${(data.complianceRate || 94.8).toFixed(1)}%`, color: 'text-emerald-400', icon: '✅' },
                { label: 'Pending Reviews', value: data.pendingReviews || 7,  color: 'text-amber-400',   icon: '📋' },
                { label: 'Contracts Due',   value: data.contractsDue   || 3,  color: 'text-cyan-400',    icon: '📄' },
              ].map((s, i) => (
                <KPICard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} />
              ))}
            </div>
            <DataTable data={data.recentCases || data.cases || [
              { caseId: 'LEGAL-042', type: 'Environmental Complaint', ward: 'Dehiwala', status: 'Under Review', due: '2024-02-15' },
              { caseId: 'LEGAL-041', type: 'Contractor Dispute',      ward: 'Pettah',   status: 'Resolved',     due: '2024-01-30' },
              { caseId: 'LEGAL-040', type: 'Permit Renewal',          ward: 'Borella',  status: 'Pending',      due: '2024-02-01' },
            ]} />
          </div>
        );
      case 'esg':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Carbon Footprint', value: `${(data.carbonFootprint || data.co2Tonnes || 142).toFixed(0)}t CO₂`, color: 'text-emerald-400', icon: '🌿' },
                { label: 'Recycling Rate',   value: `${(data.recyclingRate   || 38.4).toFixed(1)}%`,                       color: 'text-cyan-400',    icon: '♻️' },
                { label: 'Energy from WTE',  value: `${(data.wteEnergy       || data.energyMWh || 2.4).toFixed(1)} MWh`,  color: 'text-amber-400',   icon: '⚡' },
                { label: 'ESG Score',        value: `${(data.esgScore        || 72).toFixed(0)}/100`,                      color: 'text-white',       icon: '📊' },
              ].map((s, i) => (
                <KPICard key={i} icon={s.icon} label={s.label} value={s.value} color={s.color} />
              ))}
            </div>
            <DataTable data={data.esgMetrics || data.metrics || [
              { metric: 'GHG Emissions',      value: '142t CO₂e',  target: '<120t',      status: 'Needs Focus',  period: 'Jan 2024' },
              { metric: 'Recycling Rate',      value: '38.4%',      target: '45%',        status: 'On Track',     period: 'Jan 2024' },
              { metric: 'Landfill Diversion',  value: '61.6%',      target: '70%',        status: 'In Progress',  period: 'Jan 2024' },
              { metric: 'Community Awareness', value: '4 programs', target: '6 programs', status: 'In Progress',  period: 'Q1 2024'  },
            ]} />
          </div>
        );
      default:
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(data).slice(0, 6).filter(([, v]) => typeof v !== 'object' || v === null).map(([k, v]) => (
                <div key={k} className="bg-white/[0.02] rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-500 mb-1">{k.replace(/_/g, ' ')}</div>
                  <div className="text-sm font-bold text-white">{String(v ?? '-')}</div>
                </div>
              ))}
            </div>
            {Object.values(data).find(v => Array.isArray(v) && v.length > 0) && (
              <DataTable data={Object.values(data).find(v => Array.isArray(v) && v.length > 0)} />
            )}
          </div>
        );
    }
  };

  return renderContent();
}

export default function Enterprise() {
  const [activeModule, setActiveModule] = useState('hr');
  const [moduleData, setModuleData] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const apiFn = enterpriseApis[activeModule] || getHRData;
        const res = await apiFn();
        setModuleData(prev => ({ ...prev, [activeModule]: res.data }));
      } catch (e) { console.error(e); }
    };
    load();
  }, [activeModule]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-cwm-border pb-3">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Enterprise Management</h1>
          <p className="text-sm text-slate-500 mt-1">HR · Finance · Procurement · IT · Legal · ESG · Citizen Services</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-purple-400">MIS INTEGRATED</span>
        </div>
      </div>
      {/* Module Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {modules.map(mod => (
          <button
            key={mod.id}
            onClick={() => setActiveModule(mod.id)}
            className={`bg-gradient-to-br ${mod.color} border rounded-lg p-3 text-center transition-all ${
              activeModule === mod.id ? 'ring-1 ring-white/20 scale-[1.02]' : 'opacity-60 hover:opacity-80'
            }`}
          >
            <div className="text-xl mb-1">{mod.icon}</div>
            <p className="text-[10px] font-semibold text-white">{mod.name}</p>
          </button>
        ))}
      </div>

      {/* Active Module Content */}
      <div className="bg-cwm-panel border border-cwm-border rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-cwm-border">
          <span className="text-lg">{modules.find(m => m.id === activeModule)?.icon}</span>
          <h2 className="text-sm font-bold text-white">{modules.find(m => m.id === activeModule)?.name}</h2>
        </div>
        <ModuleView moduleId={activeModule} data={moduleData[activeModule] || {}} />
      </div>
    </div>
  );
}
