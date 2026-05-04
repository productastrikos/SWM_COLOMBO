import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler, Legend,
} from 'chart.js';
import { CHART_PALETTES } from './chartUtils';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

/* ─── RAG Helper ──────────────────────────────────────────── */
function getRag(value, thresholds, inverted) {
  const num = parseFloat(value) || 0;
  let level = 'normal';
  if (thresholds) {
    const { green, amber } = thresholds;
    if (!inverted) level = num >= green ? 'normal' : num >= amber ? 'warning' : 'critical';
    else           level = num <= green ? 'normal' : num <= amber ? 'warning' : 'critical';
  } else {
    level = num >= 80 ? 'normal' : num >= 50 ? 'warning' : 'critical';
  }
  return {
    normal: {
      color: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30', dot: 'bg-emerald-400', label: 'NORMAL',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    },
    warning: {
      color: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-500/10',
      border: 'border-amber-500/30', dot: 'bg-amber-400', label: 'WARNING',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
    critical: {
      color: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/10',
      border: 'border-red-500/30', dot: 'bg-red-400', label: 'CRITICAL',
      badge: 'bg-red-500/10 text-red-400 border-red-500/30',
    },
  }[level];
}

/* ─── Deterministic series generators ────────────────────── */
function buildHist(numValue, trendPct, n) {
  const v0 = numValue || 50;
  const slope = (trendPct || 0) / 100 * v0 / n;
  return Array.from({ length: n }, (_, i) => {
    const v = v0 - slope * (n - i)
      + Math.sin(i * 0.8)       * v0 * 0.03
      + Math.sin(i * 0.3 + 1.2) * v0 * 0.015;
    return Math.max(0, parseFloat(v.toFixed(2)));
  });
}

function buildPred(hist, trendPct, n = 8) {
  const last = hist[hist.length - 1] || 50;
  const avg  = hist.reduce((a, b) => a + b, 0) / hist.length;
  const slope = (trendPct || 0) / 100 * avg / hist.length;
  return Array.from({ length: n }, (_, i) => {
    const v = last + slope * (i + 1) * 2 + Math.sin(i * 0.6) * avg * 0.02;
    return Math.max(0, parseFloat(v.toFixed(2)));
  });
}

/* ─── Time-range config ───────────────────────────────────── */
const TIME_CFG = {
  '1H':  { n: 12, lbl: (i) => `${i * 5}m`,                       title: '1-Hour (5-Min Intervals)'    },
  '6H':  { n: 24, lbl: (i) => `${i * 15}m`,                      title: '6-Hour (15-Min Intervals)'   },
  '24H': { n: 24, lbl: (i) => `${String(i).padStart(2,'0')}:00`, title: '24-Hour (1-Hr Intervals)'   },
  '7D':  { n: 28, lbl: (i) => `D${i + 1}`,                       title: '7-Day (6-Hr Intervals)'      },
  '30D': { n: 30, lbl: (i) => `${i + 1}`,                        title: '30-Day (Daily Intervals)'     },
};

function getKpiTimeRanges(kpi) {
  const label = (kpi?.label || '').toLowerCase();
  const unit = (kpi?.unit || '').toLowerCase();
  if (label.includes('carbon') || label.includes('co2') || label.includes('co₂') || label.includes('circular') || label.includes('landfill') || unit.includes('/100')) return ['7D', '30D'];
  if (label.includes('daily') || label.includes('ton') || label.includes('throughput') || label.includes('intake') || label.includes('scheduled') || label.includes('collected')) return ['24H', '7D', '30D'];
  if (label.includes('coverage') || label.includes('missed') || label.includes('overflow') || label.includes('route') || label.includes('vehicle')) return ['1H', '6H', '24H', '7D'];
  return ['6H', '24H', '7D', '30D'];
}

/* ─── Threshold side-label plugin (per-instance) ─────────── */
function makePlugin(target, warn) {
  return {
    id: 'threshLineLabels',
    afterDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales.y) return;
      const { right } = chartArea;
      const { y } = scales;
      ctx.save();
      ctx.font = '9px Inter,system-ui,sans-serif';
      ctx.textAlign = 'left';
      const draw = (val, color, text) => {
        if (val == null || isNaN(val) || val < y.min || val > y.max) return;
        ctx.fillStyle = color;
        ctx.fillText(text, right + 4, y.getPixelForValue(val) + 3);
      };
      draw(target, '#64748b', 'Target');
      draw(warn,   '#a78bfa', 'Warn');
      ctx.restore();
    },
  };
}

/* ─── Anomaly event generator ─────────────────────────────── */
function genEvents(label, ragLabel, inverted) {
  const breachDirection = inverted ? 'above' : 'below';
  if (ragLabel === 'CRITICAL') {
    return [
      { time: '03:22', sev: 'critical', text: `${label} anomaly detected — auto-escalation triggered to control room` },
      { time: '09:14', sev: 'warning',  text: `${label} ${breachDirection} warning threshold — alert dispatched to operations team` },
    ];
  }
  if (ragLabel === 'WARNING') {
    return [{ time: '09:14', sev: 'warning', text: `${label} ${breachDirection} warning threshold — monitoring interval increased to 5 min` }];
  }
  return [{ time: '14:30', sev: 'info', text: `${label} performing within optimal range — no immediate action required` }];
}

/* ─── Header code from label ─────────────────────────────── */
function toCode(label) {
  const words = (label || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0].slice(0, 4).toUpperCase()}-${words[1].slice(0, 3).toUpperCase()}`;
  return (label || 'KPI').slice(0, 7).toUpperCase();
}

/* ═══════════════════════════════════════════════════════════ */
export default function KPIDetailModal({ kpi, onClose, showAnalysis = true }) {
  const [timeRange, setTimeRange]           = useState('24H');
  const [showPrediction, setShowPrediction] = useState(false);

  const numValue    = useMemo(() => parseFloat(kpi?.value) || 0, [kpi]);
  const rag         = useMemo(() => getRag(numValue, kpi?.thresholds, kpi?.inverted), [numValue, kpi]);
  const ytdAvg       = useMemo(() => numValue > 0 ? parseFloat((numValue * 0.977).toFixed(1)) : 0, [numValue]);
  const thirtyDayAvg = useMemo(() => numValue > 0 ? parseFloat((numValue * 0.964).toFixed(1)) : 0, [numValue]);

  const targetNum = useMemo(() => {
    if (kpi?.thresholds?.green != null) return kpi.thresholds.green;
    const p = parseFloat(kpi?.target);
    return isNaN(p) ? parseFloat((numValue * 1.05).toFixed(1)) : p;
  }, [kpi, numValue]);

  /* Series */
  const availableRanges = useMemo(() => getKpiTimeRanges(kpi), [kpi]);
  const activeTimeRange = availableRanges.includes(timeRange) ? timeRange : availableRanges[0];
  const cfg = TIME_CFG[activeTimeRange] || TIME_CFG['24H'];

  const hist = useMemo(
    () => buildHist(numValue, kpi?.trend, cfg.n),
    [numValue, kpi?.trend, activeTimeRange], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const pred = useMemo(() => buildPred(hist, kpi?.trend), [hist, kpi?.trend]);

  const histLabels = useMemo(
    () => Array.from({ length: cfg.n }, (_, i) => cfg.lbl(i)),
    [activeTimeRange], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const predLabels = useMemo(() => Array.from({ length: 8 }, (_, i) => `+${i + 1}h`), []);
  const allLabels = useMemo(
    () => (showPrediction ? [...histLabels, ...predLabels] : histLabels),
    [showPrediction, histLabels, predLabels],
  );

  /* Threshold reference values */
  const warnVal = kpi?.thresholds ? kpi.thresholds.amber : null;

  const threshPlugin = useMemo(() => makePlugin(targetNum, warnVal), [targetNum, warnVal]);

  /* Threshold bands */
  const bands = useMemo(() => {
    const u = kpi?.unit || '';
    if (!kpi?.thresholds) {
      return [
        { label: 'NORMAL',   color: 'emerald', desc: `≥ 80${u}` },
        { label: 'WARNING',  color: 'amber',   desc: `50–80${u}` },
        { label: 'CRITICAL', color: 'red',     desc: `< 50${u}` },
      ];
    }
    const { green, amber } = kpi.thresholds;
    if (!kpi.inverted) {
      return [
        { label: 'NORMAL',   color: 'emerald', desc: `≥ ${green}${u}` },
        { label: 'WARNING',  color: 'amber',   desc: `${amber}–${green}${u}` },
        { label: 'CRITICAL', color: 'red',     desc: `< ${amber}${u}` },
      ];
    }
    return [
      { label: 'NORMAL',   color: 'emerald', desc: `≤ ${green}${u}` },
      { label: 'WARNING',  color: 'amber',   desc: `${green}–${amber}${u}` },
      { label: 'CRITICAL', color: 'red',     desc: `> ${amber}${u}` },
    ];
  }, [kpi]);

  const bandStyle = {
    emerald: { box: 'bg-emerald-500/[0.07] border-emerald-500/30', title: 'text-emerald-400' },
    amber:   { box: 'bg-amber-500/[0.07]   border-amber-500/30',   title: 'text-amber-400'   },
    red:     { box: 'bg-red-500/[0.07]     border-red-500/30',     title: 'text-red-400'     },
  };

  /* Chart datasets */
  const chartData = useMemo(() => {
    const actualData = showPrediction ? [...hist, ...Array(8).fill(null)] : hist;
    const datasets = [
      {
        label: `${activeTimeRange} Actual`,
        data: actualData,
        borderColor: CHART_PALETTES.area.cyan.border,
        backgroundColor: CHART_PALETTES.area.cyan.fill,
        fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2.5,
      },
      ...(kpi?.thresholds ? [{
        label: 'Target',
        data: Array(allLabels.length).fill(targetNum),
        borderColor: '#94a3b8', borderWidth: 1.5, borderDash: [6, 4],
        pointRadius: 0, fill: false, tension: 0,
      }] : []),
      ...(warnVal != null ? [{
        label: 'Warn',
        data: Array(allLabels.length).fill(warnVal),
        borderColor: '#a78bfa99', borderWidth: 1.5, borderDash: [3, 3],
        pointRadius: 0, fill: false, tension: 0,
      }] : []),
      ...(showPrediction ? [{
        label: 'Predicted',
        data: [...Array(hist.length).fill(null), ...pred],
        borderColor: '#818cf8',
        backgroundColor: 'rgba(129,140,248,0.06)',
        fill: true, tension: 0.4, pointRadius: 2.5,
        pointBackgroundColor: '#818cf8', pointBorderColor: '#312e81',
        borderWidth: 2, borderDash: [6, 4],
      }] : []),
    ];
    return { labels: allLabels, datasets };
  }, [hist, pred, allLabels, showPrediction, kpi, targetNum, warnVal, activeTimeRange]);

  const chartOpts = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    layout: { padding: { right: kpi?.thresholds ? 46 : 8 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a', borderColor: '#1e293b', borderWidth: 1,
        titleColor: '#e2e8f0', bodyColor: '#94a3b8', padding: 10,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(2) : '—'} ${kpi?.unit || ''}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#94a3b8', font: { size: 8 }, maxTicksLimit: 12 },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#94a3b8', font: { size: 8 } },
      },
    },
  }), [kpi]);

  const events   = useMemo(() => genEvents(kpi?.label, rag.label, kpi?.inverted), [kpi?.label, rag.label, kpi?.inverted]);
  const analyses = useMemo(() => (kpi?.analysis || '').split('|').map(s => s.trim()).filter(s => s.length > 3), [kpi?.analysis]);
  const subs     = kpi?.subValues || [];

  if (!kpi) return null;

  const code     = toCode(kpi.label);
  const category = kpi.category || 'SWM DASHBOARD';

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-[#0c1520] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-white/[0.07] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-xl ${rag.bg} border ${rag.border} flex items-center justify-center text-2xl flex-shrink-0`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase tracking-[0.2em] font-semibold mb-1">
                {code} · {category}
              </p>
              <h2 className="text-xl font-bold text-white leading-tight">{kpi.label}</h2>
            </div>
          </div>
          <div className="flex items-center space-x-3 flex-shrink-0">
            <span className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${rag.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${rag.dot} animate-pulse`} />
              <span>{rag.label}</span>
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── BODY ───────────────────────────────────────────── */}
        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">

          {/* 4-card metric row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`${rag.bg} border ${rag.border} rounded-xl p-4`}>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Current Value</p>
              <p className={`text-3xl font-bold leading-none ${rag.text}`}>
                {kpi.value}
                {kpi.unit && <span className="text-sm font-normal ml-1 text-slate-400">{kpi.unit}</span>}
              </p>
              <p className={`text-[10px] mt-2.5 font-medium ${(kpi.trend || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(kpi.trend || 0) >= 0 ? '▲' : '▼'} {Math.abs(kpi.trend || 0).toFixed(1)}% vs yesterday
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                <span>⊙</span><span>Target</span>
              </p>
              <p className="text-3xl font-bold leading-none text-white">
                {targetNum}
                {kpi.unit && <span className="text-sm font-normal ml-1 text-slate-400">{kpi.unit}</span>}
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                <span>📅</span><span>YTD Avg</span>
              </p>
              <p className="text-3xl font-bold leading-none text-white">
                {ytdAvg}
                {kpi.unit && <span className="text-sm font-normal ml-1 text-slate-400">{kpi.unit}</span>}
              </p>
              <p className="text-[10px] mt-2.5 text-slate-400">Year-to-date average</p>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                <span>◈</span><span>30-Day Avg</span>
              </p>
              <p className="text-3xl font-bold leading-none text-white">
                {thirtyDayAvg}
                {kpi.unit && <span className="text-sm font-normal ml-1 text-slate-400">{kpi.unit}</span>}
              </p>
              <p className="text-[10px] mt-2.5 text-slate-400">Rolling month average</p>
            </div>
          </div>

          {/* Definition & Methodology */}
          {kpi.definition && (
            <div className="bg-cyan-500/[0.04] border border-cyan-500/20 rounded-xl p-4">
              <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2 flex items-center space-x-2">
                <span>ℹ</span><span>Definition &amp; Methodology</span>
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">{kpi.definition}</p>
            </div>
          )}

          {/* Threshold Bands */}
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">Threshold Bands</p>
            <div className="grid grid-cols-3 gap-2">
              {bands.map((b, i) => {
                const s = bandStyle[b.color];
                return (
                  <div key={i} className={`${s.box} border rounded-xl p-4 text-center`}>
                    <p className={`text-[10px] font-bold ${s.title} uppercase tracking-wider mb-1`}>{b.label}</p>
                    <p className={`text-lg font-bold ${s.title}`}>{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart section */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="text-[10px] font-bold text-white uppercase tracking-wider">{cfg.title}</p>
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
                  {availableRanges.map((r) => (
                    <button
                      key={r}
                      onClick={() => { setTimeRange(r); setShowPrediction(false); }}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                        activeTimeRange === r ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowPrediction((p) => !p)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                    showPrediction
                      ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                      : 'bg-white/[0.04] border-white/[0.07] text-slate-400 hover:text-violet-300 hover:border-violet-500/30'
                  }`}
                >
                  <span>✦</span><span>Predict Trend</span>
                </button>
              </div>
            </div>

            <div style={{ height: 210 }}>
              <Line data={chartData} options={chartOpts} plugins={[threshPlugin]} />
            </div>

            {showPrediction && (
              <div className="mt-2 pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px]">
                <span className="text-slate-400">◄ {activeTimeRange} historical (3 parts)</span>
                <span className="text-violet-400">8h predicted trend (1 part) ►</span>
              </div>
            )}
          </div>

          {/* Detected Anomalies & Events */}
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
              Detected Anomalies &amp; Events
            </p>
            <div className="space-y-2">
              {events.map((e, i) => (
                <div
                  key={i}
                  className={`flex items-start space-x-3 rounded-xl px-4 py-3 border ${
                    e.sev === 'critical' ? 'bg-red-500/[0.07] border-red-500/25' :
                    e.sev === 'warning'  ? 'bg-amber-500/[0.07] border-amber-500/25' :
                                          'bg-blue-500/[0.05] border-blue-500/20'
                  }`}
                >
                  <span className={`text-sm mt-0.5 ${
                    e.sev === 'critical' ? 'text-red-400' :
                    e.sev === 'warning'  ? 'text-amber-400' : 'text-blue-400'
                  }`}>
                    {e.sev === 'critical' ? '⊘' : e.sev === 'warning' ? '⚠' : 'ℹ'}
                  </span>
                  <div>
                    <span className={`text-xs font-bold ${
                      e.sev === 'critical' ? 'text-red-400' :
                      e.sev === 'warning'  ? 'text-amber-400' : 'text-blue-400'
                    }`}>{e.time}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{e.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Related Metrics (subValues) */}
          {subs.length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-3">Related Metrics</p>
              <div className="grid grid-cols-3 gap-3">
                {subs.map((m, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-3">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="text-sm font-bold text-slate-200">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Advisory */}
          {showAnalysis && analyses.length > 0 && (
            <div className="bg-violet-500/[0.06] border border-violet-500/20 rounded-xl p-4">
              <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-3 flex items-center space-x-2">
                <span>ⓘ</span><span>AI Advisory</span>
              </p>
              <div className="space-y-2">
                {analyses.map((s, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <span className="text-violet-500 mt-0.5 font-bold text-xs">→</span>
                    <p className="text-xs text-slate-400 leading-relaxed">{s.trim()}.</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-white/[0.07] bg-white/[0.01] flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            Last updated: {new Date().toLocaleTimeString()} · Smart SWM Platform · Colombo
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-lg text-xs text-slate-300 hover:bg-white/10 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

