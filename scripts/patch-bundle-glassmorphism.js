const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '../client/build/static/js/main.d6360bc0.js');
let js = fs.readFileSync(bundlePath, 'utf8');
const originalLen = js.length;
let patchCount = 0;

function patch(from, to, label) {
  if (!js.includes(from)) {
    console.error(`MISS [${label}]: "${from.slice(0, 80)}..."`);
    return;
  }
  js = js.replace(from, to);
  console.log(`OK   [${label}]`);
  patchCount++;
}

// ── 1. getRag return — replace alpha Tailwind classes with solid hex
patch(
  'normal:{color:pm("--cwm-success"),text:"text-emerald-400",bg:"bg-emerald-500/10",border:"border-emerald-500/30",dot:"bg-emerald-400",label:"NORMAL",badge:"bg-emerald-500/10 text-emerald-400 border-emerald-500/30"},warning:{color:pm("--cwm-warning"),text:"text-amber-400",bg:"bg-amber-500/10",border:"border-amber-500/30",dot:"bg-amber-400",label:"WARNING",badge:"bg-amber-500/10 text-amber-400 border-amber-500/30"},critical:{color:pm("--cwm-danger"),text:"text-red-400",bg:"bg-red-500/10",border:"border-red-500/30",dot:"bg-red-400",label:"CRITICAL",badge:"bg-red-500/10 text-red-400 border-red-500/30"}}',
  'normal:{color:pm("--cwm-success"),text:"text-emerald-400",dot:"bg-emerald-400",label:"NORMAL",solidBg:"#0f2b1f",solidBorder:"#1a4d33",badgeSolidBg:"#0d2218",badgeSolidBorder:"#1e5a3a"},warning:{color:pm("--cwm-warning"),text:"text-amber-400",dot:"bg-amber-400",label:"WARNING",solidBg:"#2b1f0a",solidBorder:"#4d3810",badgeSolidBg:"#221a08",badgeSolidBorder:"#4d3810"},critical:{color:pm("--cwm-danger"),text:"text-red-400",dot:"bg-red-400",label:"CRITICAL",solidBg:"#2b0f0f",solidBorder:"#4d1a1a",badgeSolidBg:"#220d0d",badgeSolidBorder:"#4d1a1a"}}',
  'getRag-return'
);

// ── 2. bandStyle — replace alpha backgrounds
patch(
  'T={emerald:{box:"bg-emerald-500/[0.07] border-emerald-500/30",title:"text-emerald-400"},amber:{box:"bg-amber-500/[0.07]   border-amber-500/30",title:"text-amber-400"},red:{box:"bg-red-500/[0.07]     border-red-500/30",title:"text-red-400"}}',
  'T={emerald:{title:"text-emerald-400",solidBg:"#0f2b1f",solidBorder:"#1a4d33"},amber:{title:"text-amber-400",solidBg:"#2b1f0a",solidBorder:"#4d3810"},red:{title:"text-red-400",solidBg:"#2b0f0f",solidBorder:"#4d1a1a"}}',
  'bandStyle'
);

// ── 3. Threshold bands JSX — use solidBg/solidBorder inline style
patch(
  'className:`${n.box} border rounded-xl p-4 text-center`',
  'className:"rounded-xl p-4 text-center",style:{background:n.solidBg,border:`1px solid ${n.solidBorder}`}',
  'bands-JSX'
);

// ── 4. Icon box — use solidBg/solidBorder inline style
patch(
  'className:`w-12 h-12 rounded-xl ${p.bg} border ${p.border} flex items-center justify-center text-2xl flex-shrink-0`',
  'className:"w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0",style:{background:p.solidBg,border:`1px solid ${p.solidBorder}`}',
  'icon-box'
);

// ── 5. RAG status badge — use solidBadgeBg/solidBadgeBorder inline style
patch(
  'className:`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${p.badge}`',
  'className:`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${p.text}`,style:{background:p.badgeSolidBg,borderColor:p.badgeSolidBorder}',
  'rag-badge'
);

// ── 6. Current Value card — use solidBg/solidBorder inline style
patch(
  'className:`${p.bg} border ${p.border} rounded-xl p-4`',
  'className:"rounded-xl p-4",style:{background:p.solidBg,border:`1px solid ${p.solidBorder}`}',
  'current-value-card'
);

// ── 7. Definition block
patch(
  'className:"bg-cyan-500/[0.04] border border-cyan-500/20 rounded-xl p-4"',
  'className:"rounded-xl p-4",style:{background:"#0a1f22",border:"1px solid #134040"}',
  'definition-block'
);

// ── 8. Anomaly events className
patch(
  'className:"flex items-start space-x-3 rounded-xl px-4 py-3 border "+("critical"===e.sev?"bg-red-500/[0.07] border-red-500/25":"warning"===e.sev?"bg-amber-500/[0.07] border-amber-500/25":"bg-blue-500/[0.05] border-blue-500/20")',
  'className:"flex items-start space-x-3 rounded-xl px-4 py-3",style:{background:"critical"===e.sev?"#2b0f0f":"warning"===e.sev?"#2b1f0a":"#0f1e2b",border:`1px solid ${"critical"===e.sev?"#4d1a1a":"warning"===e.sev?"#4d3810":"#1a3048"}`}',
  'anomaly-events'
);

// ── 9. AI Advisory block
patch(
  'className:"bg-violet-500/[0.06] border border-violet-500/20 rounded-xl p-4"',
  'className:"rounded-xl p-4",style:{background:"#1a0f2b",border:"1px solid #341a4d"}',
  'ai-advisory'
);

// ── 10. Predict Trend button active/inactive className
patch(
  '"flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all "+(c?"bg-violet-500/20 border-violet-500/40 text-violet-300":"bg-cwm-darker border-cwm-border text-slate-400 hover:text-violet-300 hover:border-violet-500/30")',
  '`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all bg-cwm-darker border-cwm-border ${c?"text-violet-300":"text-slate-400 hover:text-violet-300 hover:border-slate-500"}`',
  'predict-btn-class'
);

// ── 10b. Predict Trend button — add inline style for active state
// Need to add style prop to the button element
patch(
  '`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all bg-cwm-darker border-cwm-border ${c?"text-violet-300":"text-slate-400 hover:text-violet-300 hover:border-slate-500"}`',
  '`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all bg-cwm-darker border-cwm-border ${c?"text-violet-300":"text-slate-400 hover:text-violet-300 hover:border-slate-500"}`,style:c?{background:"#2d1a4d",borderColor:"#4d2d7a"}:{}',
  'predict-btn-style'
);

// ── 11. Close button hover
patch(
  'className:"p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"',
  'className:"p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"',
  'close-btn-hover'
);

// ── 12. Related Metrics — replace old simple cards with new color-coded + target split
patch(
  'E.length>0&&(0,_r.jsxs)("div",{className:"kpi-modal-card rounded-xl p-4",children:[(0,_r.jsx)("p",{className:"text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-3",children:"Related Metrics"}),(0,_r.jsx)("div",{className:"grid grid-cols-3 gap-3",children:E.map((e,t)=>(0,_r.jsxs)("div",{className:"kpi-modal-card rounded-lg p-3",children:[(0,_r.jsx)("p",{className:"text-[10px] text-slate-400 uppercase tracking-wider mb-1",children:e.label}),(0,_r.jsx)("p",{className:"text-sm font-bold text-slate-200",children:e.value})]},t))})]})',
  'E.length>0&&(0,_r.jsxs)("div",{className:"kpi-modal-card rounded-xl p-4",children:[(0,_r.jsxs)("p",{className:"text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-3 flex items-center gap-2",children:[(0,_r.jsx)("span",{style:{color:"var(--cwm-accent)"},children:"\u25c8"}),"\xa0Related Metrics"]}),E.filter(e=>!/target/i.test(e.label)).length>0&&(0,_r.jsx)("div",{className:"grid grid-cols-3 gap-3",children:E.filter(e=>!/target/i.test(e.label)).map((e,t)=>{const n=/critical|danger|error|failed/i.test(e.label),o=/miss|overdue|lost|excess|pending/i.test(e.label),a=n?"#2b0f0f":o?"#2b1f0a":"var(--cwm-surface-soft)",l=n?"#4d1a1a":o?"#4d3810":"var(--cwm-border)",u=n?"var(--cwm-danger)":o?"var(--cwm-warning)":"var(--cwm-text)";return(0,_r.jsxs)("div",{className:"rounded-xl p-4",style:{background:a,border:"1px solid "+l},children:[(0,_r.jsx)("p",{className:"text-[9px] font-bold uppercase tracking-widest mb-2",style:{color:"var(--cwm-text-faint)"},children:e.label}),(0,_r.jsx)("p",{className:"text-2xl font-bold leading-none",style:{color:u},children:e.value})]},t)})}),E.filter(e=>/target/i.test(e.label)).map((e,t)=>(0,_r.jsxs)("div",{className:"flex items-center gap-4 rounded-xl px-4 py-3 mt-3",style:{background:"#0f1e2b",border:"1px solid #1a3048"},children:[(0,_r.jsx)("span",{className:"text-[9px] font-bold uppercase tracking-widest",style:{color:"var(--cwm-accent)"},children:"Target"}),(0,_r.jsx)("span",{className:"text-sm font-bold",style:{color:"var(--cwm-text)"},children:e.value})]},t))]})',
  'related-metrics'
);

console.log(`\nPatched ${patchCount} items. Bundle length: ${originalLen} -> ${js.length}`);
fs.writeFileSync(bundlePath, js, 'utf8');
console.log('Bundle written successfully.');
