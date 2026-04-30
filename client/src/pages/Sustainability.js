import React, { useState, useContext } from 'react';
import { DataContext } from '../services/socket';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Filler, Legend } from 'chart.js';
import KPICard from '../components/KPICard';
import KPIDetailModal from '../components/KPIDetailModal';
import { ChartTimeframeControl, TIMEFRAME_OPTIONS, getTimeframeOption, buildTimeframeLabels, resampleSeries, CHART_PALETTES } from '../components/chartUtils';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Filler, Legend);

function SDGCard({ goal, title, score, target, icon }) {
  const pct = (score / target * 100).toFixed(0);
  const color = score >= target * 0.8 ? 'text-emerald-400' : score >= target * 0.5 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="bg-cwm-panel border border-cwm-border rounded-lg p-3">
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-[10px] text-slate-500">SDG {goal}</p>
          <p className="text-xs font-semibold text-white">{title}</p>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className={`text-xl font-bold ${color}`}>{score}</span>
        <span className="text-[10px] text-slate-500">/ {target}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-1.5">
        <div className={`h-full rounded-full ${score >= target * 0.8 ? 'bg-emerald-500' : score >= target * 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export default function Sustainability() {
  const { kpis } = useContext(DataContext);
  const k = kpis || {};
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [emissionsFrame, setEmissionsFrame] = useState('12M');
  const activeEmissionsFrame = getTimeframeOption(TIMEFRAME_OPTIONS.monthly, emissionsFrame);

  const emissionTrendData = {
    labels: buildTimeframeLabels(activeEmissionsFrame.value, activeEmissionsFrame.points),
    datasets: [
      {
        label: 'CO₂ Emissions (tons)',
        data: resampleSeries([180, 172, 165, 158, 152, 148, 145, 142, 140, 138, 136, k.co2Tons || 135], activeEmissionsFrame.points),
        borderColor: CHART_PALETTES.area.cyan.border, backgroundColor: CHART_PALETTES.area.cyan.fill,
        fill: true, tension: 0.4, pointRadius: 2, borderWidth: 1.5,
      },
      {
        label: 'Target',
        data: Array(activeEmissionsFrame.points).fill(130),
        borderColor: '#64748b', borderDash: [5, 5], borderWidth: 1, pointRadius: 0,
      }
    ]
  };

  const circularEconomyData = {
    labels: ['Recycled', 'Composted', 'Energy Recovery', 'Landfilled', 'Other'],
    datasets: [{
      data: [15, 8, 50, 20, 7],
      backgroundColor: CHART_PALETTES.categorical.slice(0, 5),
      borderWidth: 0,
    }]
  };

  const greenScoreVals = [72, 68, 55, 45, 78, 58];
  const greenScoreData = {
    labels: ['Air Quality', 'Water Quality', 'Soil Health', 'Biodiversity', 'Energy Eff.', 'Waste Diversion'],
    datasets: [{
      data: greenScoreVals,
      backgroundColor: greenScoreVals.map(v => v >= 70 ? 'rgba(16,185,129,0.65)' : v >= 55 ? 'rgba(245,158,11,0.65)' : 'rgba(239,68,68,0.65)'),
      borderColor: greenScoreVals.map(v => v >= 70 ? '#10b981' : v >= 55 ? '#f59e0b' : '#ef4444'),
      borderWidth: 1.5, borderRadius: 4,
    }]
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {selectedKPI && <KPIDetailModal kpi={selectedKPI} onClose={() => setSelectedKPI(null)} />}
      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-cwm-border pb-3">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Sustainability & ESG</h1>
          <p className="text-sm text-slate-500 mt-1">Carbon tracking · SDG alignment · Recycling diversion · Environmental compliance</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400">SDG ALIGNED</span>
        </div>
      </div>
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <KPICard icon="🌿" label="Carbon Score" value={`${(k.carbonScore || 72).toFixed(0)}/100`}
          desc="Composite carbon performance vs. 2030 net-zero pathway target"
          color={(k.carbonScore || 72) >= 75 ? 'text-emerald-400' : (k.carbonScore || 72) >= 50 ? 'text-amber-400' : 'text-red-400'}
          rag={(k.carbonScore || 72) >= 75 ? 'normal' : (k.carbonScore || 72) >= 50 ? 'warning' : 'critical'}
          trend={2.1}
          onClick={() => setSelectedKPI({
            icon: '🌿', label: 'Carbon Score', value: (k.carbonScore || 72).toFixed(0), unit: '/100',
            trend: 2.1, color: 'text-emerald-400',
            thresholds: { green: 75, amber: 50 }, inverted: false,
            definition: 'Composite ESG carbon performance index scored out of 100. Combines fleet emission intensity, WTE carbon offset, composting methane avoidance, and landfill gas capture rate. Aligned to CMC\'s 2030 net-zero pathway.',
            subValues: [
              { label: 'Fleet Emissions', value: '138 t CO₂ today' },
              { label: 'WTE Carbon Offset', value: '−62 t CO₂' },
              { label: 'Composting Offset', value: '−18 t CO₂' },
              { label: 'Landfill Gas Capture', value: '62% (Aruwakkalu)' },
            ],
            analysis: 'At 72/100 the carbon score is above the warning threshold of 60 but still 8 points short of the 80 target needed to stay on the 2030 pathway|Fleet emissions are the largest single driver — reducing the diesel fleet by 10 vehicles and replacing with CNG would add approximately 4 points to the score|Landfill gas capture at 62% is below the 75% target; upgrading the Aruwakkalu flare system would contribute 3–4 additional carbon score points at relatively low cost',
            target: '≥80/100 carbon score by 2025; 100 by 2030',
          })} />
        <KPICard icon="♻️" label="Waste Diversion" value={`${(k.diversionRate || 58).toFixed(0)}%`}
          desc="Share of collected waste diverted from landfill via recycling & energy recovery"
          color={(k.diversionRate || 58) >= 60 ? 'text-emerald-400' : (k.diversionRate || 58) >= 40 ? 'text-amber-400' : 'text-red-400'}
          rag={(k.diversionRate || 58) >= 60 ? 'normal' : (k.diversionRate || 58) >= 40 ? 'warning' : 'critical'}
          trend={1.4}
          onClick={() => setSelectedKPI({
            icon: '♻️', label: 'Waste Diversion', value: (k.diversionRate || 58).toFixed(0), unit: '%',
            trend: 1.4, color: 'text-amber-400',
            thresholds: { green: 60, amber: 40 }, inverted: false,
            definition: 'Percentage of total collected waste (1,247 t/day) diverted from landfill through recycling, composting, or WTE energy recovery. Target of 65% aligns with SDG 12 and reduces Aruwakkalu fill rate.',
            subValues: [
              { label: 'Recycled (MRF)', value: '287 t/day (23.0%)' },
              { label: 'WTE Energy Recovery', value: '620 t/day (49.7%)' },
              { label: 'Composted', value: '94 t/day (7.5%)' },
              { label: 'To Landfill', value: '246 t/day (19.7%)' },
            ],
            analysis: 'At 58% diversion, the operation is 7 pts short of the 65% target — WTE is carrying the bulk of diversion at 49.7% while recycling contributes only 23%|Recycling diversion is constrained by contamination at Kolonnawa MRF (30.7 t/day rejected); fixing this single issue is worth approximately 2.5% additional diversion|Increasing WTE intake from 620 to 820 t/day (within plant capacity) would push total diversion to approximately 73%, well above target',
            target: '65% landfill diversion (SDG 12)',
          })} />
        <KPICard icon="📉" label="CO₂ Reduction" value={`${(k.co2Reduction || 12.5).toFixed(1)}%`}
          desc="Year-on-year CO₂ emissions reduction vs. 2023 baseline (target: 15%)"
          color={(k.co2Reduction || 12.5) >= 10 ? 'text-emerald-400' : (k.co2Reduction || 12.5) >= 5 ? 'text-amber-400' : 'text-red-400'}
          rag={(k.co2Reduction || 12.5) >= 10 ? 'normal' : (k.co2Reduction || 12.5) >= 5 ? 'warning' : 'critical'}
          trend={0.8}
          onClick={() => setSelectedKPI({
            icon: '📉', label: 'CO₂ Reduction', value: (k.co2Reduction || 12.5).toFixed(1), unit: '%',
            trend: 0.8, color: 'text-amber-400',
            thresholds: { green: 10, amber: 5 }, inverted: false,
            definition: 'Year-on-year reduction in total CO₂-equivalent emissions from SWM operations vs. 2023 baseline of 168 t CO₂/day. Includes fleet fuel emissions, WTE stack, landfill gas, and avoided landfill methane.',
            subValues: [
              { label: 'vs Last Year (2023)', value: '−12.5% (−21 t CO₂/day)' },
              { label: 'vs 2020 Baseline', value: '−28.4%' },
              { label: 'Fleet Route Savings', value: '−334 kg CO₂ today' },
              { label: 'WTE Contribution', value: '−62 t CO₂/day offset' },
            ],
            analysis: 'CO₂ reduction is at 12.5% — 2.5 pts short of the 15% annual target. The gap is closing (+0.8% trend) but at the current pace will not reach 15% by year-end without intervention|Fleet route optimisation has already delivered 334 kg CO₂ savings today — scaling this to all routes could contribute an additional 1.5–2% annually|The biggest remaining lever is landfill gas capture at Aruwakkalu; increasing from 62% to 80% capture eliminates approximately 18 t CO₂e/day of unburnt methane',
            target: '15% CO₂ reduction YoY (SDG 13)',
          })} />
        <KPICard icon="🔄" label="Circular Economy" value={`${(k.circularIndex || 47).toFixed(0)}%`}
          desc="Circular economy index: materials re-entering productive use (target: 60%)"
          color={(k.circularIndex || 47) >= 40 ? 'text-emerald-400' : (k.circularIndex || 47) >= 25 ? 'text-amber-400' : 'text-red-400'}
          rag={(k.circularIndex || 47) >= 40 ? 'normal' : (k.circularIndex || 47) >= 25 ? 'warning' : 'critical'}
          trend={3.2}
          onClick={() => setSelectedKPI({
            icon: '🔄', label: 'Circular Economy', value: (k.circularIndex || 47).toFixed(0), unit: '%',
            trend: 3.2, color: 'text-amber-400',
            thresholds: { green: 40, amber: 25 }, inverted: false,
            definition: 'Circular economy index measuring the percentage of collected waste materials that re-enter productive use (recycling, composting, energy). Excludes landfill and inert disposal. Aligned to SDG 12 targets.',
            subValues: [
              { label: 'Materials Recovered', value: '587 t/day (47%)' },
              { label: 'Revenue from Materials', value: 'Rs. 2.1M/month' },
              { label: 'Recovery Rate (MRF)', value: '78.3–91.2% by stream' },
              { label: 'SDG 12 Target', value: '60% by 2030' },
            ],
            analysis: 'At 47%, the circular economy index is in the warning zone — 13 pts short of the 60% SDG target but trending upward at +3.2%/month which is the fastest-improving KPI this quarter|The strongest gains have come from WTE scaling (energy recovery) and Muthurajawela compost expansion; MRF recycling recovery rates are high but volume is limited by contamination at intake|Reaching 60% requires adding approximately 162 t/day of additional recovered material — achievable through contamination reduction, MRF intake expansion, and landfill gas energy recovery',
            target: '60% circular economy index by 2030 (SDG 12)',
          })} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="bg-cwm-panel border border-cwm-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-white">CO₂ Emissions Trend</h3>
            <ChartTimeframeControl options={TIMEFRAME_OPTIONS.monthly} value={emissionsFrame} onChange={setEmissionsFrame} />
          </div>
          <div style={{ height: 180 }}>
            <Line data={emissionTrendData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 9 } } },
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
          <h3 className="text-xs font-semibold text-white mb-2">Circular Economy Breakdown</h3>
          <div className="flex items-center justify-center" style={{ height: 180 }}>
            <div style={{ width: 150, height: 150 }}>
              <Doughnut data={circularEconomyData} options={{
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1,
                    titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 8,
                    callbacks: {
                      label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`
                    }
                  }
                }
              }} />
            </div>
            <div className="ml-4 space-y-1.5">
              {circularEconomyData.labels.map((l, i) => (
                <div key={l} className="flex items-center space-x-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: circularEconomyData.datasets[0].backgroundColor[i] }} />
                  <span className="text-slate-400">{l}</span>
                  <span className="text-slate-300 font-medium">{circularEconomyData.datasets[0].data[i]}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Green Score */}
      <div className="bg-cwm-panel border border-cwm-border rounded-lg p-3">
        <h3 className="text-xs font-semibold text-white mb-2">Environmental Performance Index</h3>
        <div style={{ height: 140 }}>
          <Bar data={greenScoreData} options={{
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1, titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 8 },
            },
            indexAxis: 'y',
            scales: {
              x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 9 } }, max: 100 },
              y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 9 } } }
            }
          }} />
        </div>
      </div>

      {/* SDG Alignment */}
      <div>
        <h3 className="text-xs font-semibold text-white mb-2">UN SDG Alignment</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <SDGCard goal={6} title="Clean Water" score={71} target={100} icon="💧" />
          <SDGCard goal={7} title="Clean Energy" score={62} target={100} icon="⚡" />
          <SDGCard goal={11} title="Sustainable Cities" score={74} target={100} icon="🏙️" />
          <SDGCard goal={12} title="Responsible Consumption" score={42} target={100} icon="♻️" />
          <SDGCard goal={13} title="Climate Action" score={61} target={100} icon="🌍" />
        </div>
      </div>
    </div>
  );
}
