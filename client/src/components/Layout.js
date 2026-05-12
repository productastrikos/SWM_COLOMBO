import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../services/socket';
import AlertPanel from './AlertPanel';
import AdvisoryPanel from './AdvisoryPanel';

/* ─── Navigation structure ─────────────────────────────── */
const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { path: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4', label: 'Dashboard' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/collection', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', label: 'Collection' },
      { path: '/fleet',      icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', label: 'Fleet' },
      { path: '/wte',        icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'WTE Plant' },
      { path: '/processing', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', label: 'Recycling' },
      { path: '/landfills',  icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', label: 'Landfills' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { path: '/sustainability', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064', label: 'ESG' },
      { path: '/citizen',        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', label: 'Citizens' },
      { path: '/digital-twin',   icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', label: 'Digital Twin' },
    ],
  },
];

/* ─── Deep search index  ──────────────────────────────────
   Each entry: { label, path, breadcrumb, keywords, icon }
   breadcrumb = ['Page', 'Section', 'Item']  (shown in results)
   keywords   = extra words matched against (not displayed)
────────────────────────────────────────────────────────── */
const SEARCH_INDEX = [
  /* ── Dashboard ── */
  { label:'Dashboard',           path:'/',           breadcrumb:['Dashboard'],                              icon:'📊', keywords:'overview kpi summary home main' },
  { label:'Collection Rate',     path:'/',           breadcrumb:['Dashboard','KPI Cards'],                  icon:'📊', keywords:'coverage pickup waste collection daily percentage' },
  { label:'Missed Collections',  path:'/',           breadcrumb:['Dashboard','KPI Cards'],                  icon:'📊', keywords:'missed points failed uncollected wards' },
  { label:'Route Optimisation',  path:'/',           breadcrumb:['Dashboard','KPI Cards'],                  icon:'📊', keywords:'route fuel savings distance optimisation' },
  { label:'Total Waste Collected', path:'/',         breadcrumb:['Dashboard','KPI Cards'],                  icon:'📊', keywords:'tonnage total msw municipal solid waste tons' },
  { label:'Recycling Rate',      path:'/',           breadcrumb:['Dashboard','KPI Cards'],                  icon:'📊', keywords:'reuse diversion recycle percentage rate' },
  { label:'Bin Overflow Incidents', path:'/',        breadcrumb:['Dashboard','KPI Cards'],                  icon:'📊', keywords:'overflow smart bins incidents sensors' },
  { label:'Zone Summary Table',  path:'/',           breadcrumb:['Dashboard','Zone Table'],                  icon:'📊', keywords:'zones wards coverage missed zone breakdown' },
  { label:'Recent Activity',     path:'/',           breadcrumb:['Dashboard','Activity Feed'],               icon:'📊', keywords:'alerts events activity feed log' },
  { label:'Zone Filter',         path:'/',           breadcrumb:['Dashboard','Controls'],                    icon:'📊', keywords:'filter zone all z1 z2 z3 z4 z5' },

  /* ── Waste Collection ── */
  { label:'Waste Collection',         path:'/collection', breadcrumb:['Waste Collection'],                   icon:'🗑', keywords:'routes schedules pickups vehicles' },
  { label:'Overall Coverage',         path:'/collection', breadcrumb:['Waste Collection','KPIs'],             icon:'🗑', keywords:'coverage collection overall rate percent' },
  { label:'Points Collected',         path:'/collection', breadcrumb:['Waste Collection','KPIs'],             icon:'🗑', keywords:'collected points total' },
  { label:'Missed Points',            path:'/collection', breadcrumb:['Waste Collection','KPIs'],             icon:'🗑', keywords:'missed uncollected failed points' },
  { label:'Critical Wards',           path:'/collection', breadcrumb:['Waste Collection','KPIs'],             icon:'🗑', keywords:'critical wards grandpass kirulapone rajagiriya' },
  { label:'Scheduled Points',         path:'/collection', breadcrumb:['Waste Collection','KPIs'],             icon:'🗑', keywords:'scheduled planned points daily' },
  { label:'Collection Schedule Table',path:'/collection', breadcrumb:['Waste Collection','Schedule'],         icon:'🗑', keywords:'schedule table route vehicle time ward' },
  { label:'Vehicle Assignments',      path:'/collection', breadcrumb:['Waste Collection','Schedule'],         icon:'🗑', keywords:'vehicle driver assignment route dispatch' },
  { label:'Ward Breakdown',           path:'/collection', breadcrumb:['Waste Collection','Zone Detail'],      icon:'🗑', keywords:'ward zone grandpass kirulapone rajagiriya' },

  /* ── Fleet Management ── */
  { label:'Fleet Management',    path:'/fleet', breadcrumb:['Fleet Management'],                             icon:'🚛', keywords:'vehicles trucks dispatch tracking' },
  { label:'Active Units',        path:'/fleet', breadcrumb:['Fleet Management','KPIs'],                      icon:'🚛', keywords:'active vehicles trucks units' },
  { label:'Fuel Saved',          path:'/fleet', breadcrumb:['Fleet Management','Route Savings'],             icon:'🚛', keywords:'fuel saving cost rs efficiency' },
  { label:'Distance Saved',      path:'/fleet', breadcrumb:['Fleet Management','Route Savings'],             icon:'🚛', keywords:'distance km saved reduction route' },
  { label:'CO₂ Avoided',         path:'/fleet', breadcrumb:['Fleet Management','Route Savings'],             icon:'🚛', keywords:'co2 carbon avoided emission fleet' },
  { label:'Fleet Status',        path:'/fleet', breadcrumb:['Fleet Management','Fleet Status Tab'],          icon:'🚛', keywords:'fleet vehicle status active breakdown idle' },
  { label:'Route History',       path:'/fleet', breadcrumb:['Fleet Management','Route History Tab'],         icon:'🚛', keywords:'route history log past completed' },
  { label:'Attendance',          path:'/fleet', breadcrumb:['Fleet Management','Attendance Tab'],            icon:'🚛', keywords:'driver attendance present absent leave' },
  { label:'Primary/Secondary Coord.', path:'/fleet', breadcrumb:['Fleet Management','Coordination Tab'],    icon:'🚛', keywords:'coordination primary secondary dispatch' },

  /* ── WTE Plant ── */
  { label:'WTE Plant',           path:'/wte', breadcrumb:['WTE Plant'],                                     icon:'⚡', keywords:'waste to energy power generation plant' },
  { label:'Energy Output',       path:'/wte', breadcrumb:['WTE Plant','KPIs'],                              icon:'⚡', keywords:'energy output mw mwh power generation electricity' },
  { label:'Thermal Efficiency',  path:'/wte', breadcrumb:['WTE Plant','KPIs'],                              icon:'⚡', keywords:'thermal efficiency furnace boiler percent' },
  { label:'Furnace Utilization', path:'/wte', breadcrumb:['WTE Plant','KPIs'],                              icon:'⚡', keywords:'furnace utilization frn active offline' },
  { label:'Grid Export Rate',    path:'/wte', breadcrumb:['WTE Plant','KPIs'],                              icon:'⚡', keywords:'grid export rate electricity supply ceb' },
  { label:'Tonnes Processed',    path:'/wte', breadcrumb:['WTE Plant','Processing'],                        icon:'⚡', keywords:'tonnes processed waste burned combustion' },
  { label:'Actual Output vs Max', path:'/wte', breadcrumb:['WTE Plant','Output Breakdown'],                 icon:'⚡', keywords:'actual theoretical max output opportunity loss' },
  { label:'Flue Gas & Emissions', path:'/wte', breadcrumb:['WTE Plant','Emissions'],                        icon:'⚡', keywords:'flue gas emissions nox sox co2 stack' },

  /* ── Recycling & Processing ── */
  { label:'Recycling & Processing', path:'/processing', breadcrumb:['Recycling & Processing'],              icon:'♻', keywords:'mrf material recovery sorting recycling' },
  { label:'TS Throughput',          path:'/processing', breadcrumb:['Recycling & Processing','KPIs'],       icon:'♻', keywords:'throughput transfer station ts tons day' },
  { label:'Diversion Rate',         path:'/processing', breadcrumb:['Recycling & Processing','KPIs'],       icon:'♻', keywords:'diversion rate recycled composted landfill' },
  { label:'Recyclables',            path:'/processing', breadcrumb:['Recycling & Processing','Material Flow'],icon:'♻', keywords:'recyclables material paper plastic glass metal' },
  { label:'Composted',              path:'/processing', breadcrumb:['Recycling & Processing','Material Flow'],icon:'♻', keywords:'compost composted organic waste' },
  { label:'Revenue Generated',      path:'/processing', breadcrumb:['Recycling & Processing','Revenue'],    icon:'♻', keywords:'revenue income material recovery rs million' },
  { label:'Avg Processing Delay',   path:'/processing', breadcrumb:['Recycling & Processing','Operations'], icon:'♻', keywords:'delay processing time kerawalapitiya' },

  /* ── Landfills ── */
  { label:'Landfills',           path:'/landfills', breadcrumb:['Landfills'],                               icon:'📦', keywords:'landfill capacity aruwakkalu karadiyana' },
  { label:'Avg Capacity Used',   path:'/landfills', breadcrumb:['Landfills','KPIs'],                        icon:'📦', keywords:'capacity used percent full landfill' },
  { label:'Daily Intake',        path:'/landfills', breadcrumb:['Landfills','KPIs'],                        icon:'📦', keywords:'daily intake tons aruwakkalu' },
  { label:'Fill Rate Trend',     path:'/landfills', breadcrumb:['Landfills','Trends'],                      icon:'📦', keywords:'fill rate trend monthly growth' },
  { label:'Aruwakkalu Landfill', path:'/landfills', breadcrumb:['Landfills','Aruwakkalu'],                  icon:'📦', keywords:'aruwakkalu capacity liner groundwater odor' },
  { label:'Karadiyana Landfill', path:'/landfills', breadcrumb:['Landfills','Karadiyana'],                  icon:'📦', keywords:'karadiyana closed capacity liner' },
  { label:'Groundwater Quality', path:'/landfills', breadcrumb:['Landfills','Environmental'],               icon:'📦', keywords:'groundwater quality gw monitoring' },
  { label:'Liner Integrity',     path:'/landfills', breadcrumb:['Landfills','Environmental'],               icon:'📦', keywords:'liner integrity leachate containment' },

  /* ── Sustainability & ESG ── */
  { label:'Sustainability & ESG', path:'/sustainability', breadcrumb:['Sustainability & ESG'],               icon:'🌱', keywords:'carbon co2 esg emission green climate' },
  { label:'Carbon Score',         path:'/sustainability', breadcrumb:['Sustainability & ESG','KPIs'],        icon:'🌱', keywords:'carbon score rating index /100' },
  { label:'Waste Diversion',      path:'/sustainability', breadcrumb:['Sustainability & ESG','KPIs'],        icon:'🌱', keywords:'waste diversion recycled wte compost landfill' },
  { label:'CO₂ Reduction',        path:'/sustainability', breadcrumb:['Sustainability & ESG','KPIs'],        icon:'🌱', keywords:'co2 reduction percentage baseline emissions' },
  { label:'WTE Carbon Offset',    path:'/sustainability', breadcrumb:['Sustainability & ESG','Carbon Detail'],icon:'🌱', keywords:'wte carbon offset minus co2 recovery' },
  { label:'Fleet Emissions',      path:'/sustainability', breadcrumb:['Sustainability & ESG','Emissions'],    icon:'🌱', keywords:'fleet truck emissions co2 vehicle daily' },
  { label:'Landfill Gas Capture', path:'/sustainability', breadcrumb:['Sustainability & ESG','Emissions'],    icon:'🌱', keywords:'landfill gas capture methane aruwakkalu' },
  { label:'CO₂ Trend Chart',      path:'/sustainability', breadcrumb:['Sustainability & ESG','Charts'],       icon:'🌱', keywords:'co2 chart trend graph history' },

  /* ── Citizen Services ── */
  { label:'Citizen Services',    path:'/citizen', breadcrumb:['Citizen Services'],                           icon:'👥', keywords:'complaints requests feedback public service' },
  { label:'New Complaints',      path:'/citizen', breadcrumb:['Citizen Services','KPIs'],                    icon:'👥', keywords:'new complaints open unresolved requests' },
  { label:'Resolved Complaints', path:'/citizen', breadcrumb:['Citizen Services','KPIs'],                    icon:'👥', keywords:'resolved closed complaints rate' },
  { label:'Complaints Overview', path:'/citizen', breadcrumb:['Citizen Services','Overview Tab'],            icon:'👥', keywords:'overview summary complaint volume type' },
  { label:'By Type & Ward',      path:'/citizen', breadcrumb:['Citizen Services','By Type Tab'],             icon:'👥', keywords:'complaint type ward breakdown category' },
  { label:'Missed Collections (Citizen)', path:'/citizen', breadcrumb:['Citizen Services','Missed Tab'],    icon:'👥', keywords:'missed collections citizen reported ward' },
  { label:'Dispatch Vehicle',    path:'/citizen', breadcrumb:['Citizen Services','Actions'],                 icon:'👥', keywords:'dispatch vehicle action resolve complaint' },
  { label:'Escalate to Supervisor', path:'/citizen', breadcrumb:['Citizen Services','Actions'],              icon:'👥', keywords:'escalate supervisor complaint action' },

  /* ── Digital Twin ── */
  { label:'Digital Twin',        path:'/digital-twin', breadcrumb:['Digital Twin'],                         icon:'🗺', keywords:'map city simulation live twin colombo' },
  { label:'Live Vehicle Map',    path:'/digital-twin', breadcrumb:['Digital Twin','Map View'],               icon:'🗺', keywords:'map vehicles live tracking location route' },
  { label:'Bin Sensor Overlay',  path:'/digital-twin', breadcrumb:['Digital Twin','Map View'],               icon:'🗺', keywords:'bin sensor fill level map overlay' },
  { label:'Zone Boundaries',     path:'/digital-twin', breadcrumb:['Digital Twin','Map View'],               icon:'🗺', keywords:'zone boundary polygon map area' },
  { label:'Simulation Controls', path:'/digital-twin', breadcrumb:['Digital Twin','Simulation'],             icon:'🗺', keywords:'simulation play pause speed time' },

  /* ── Profile ── */
  { label:'Profile',             path:'/profile', breadcrumb:['Profile'],                                    icon:'👤', keywords:'account settings preferences user name email' },
  { label:'Account Settings',    path:'/profile', breadcrumb:['Profile','Settings'],                         icon:'👤', keywords:'account settings email password' },
];

/* ─── Icon helper ──────────────────────────────────────── */
function SvgIcon({ d, size = 'w-4 h-4', strokeWidth = 1.6 }) {
  return (
    <svg className={`${size} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d={d} />
    </svg>
  );
}

/* ─── Page title map ───────────────────────────────────── */
const PAGE_TITLES = {
  '/':            'Dashboard',
  '/collection':  'Waste Collection',
  '/fleet':       'Fleet Management',
  '/wte':         'WTE Plant',
  '/processing':  'Recycling & Processing',
  '/landfills':   'Landfills',
  '/sustainability': 'Sustainability & ESG',
  '/citizen':     'Citizen Services',
  '/digital-twin': 'Digital Twin',
};

export default function Layout({ children, user, onLogout, theme = 'dark', onThemeToggle }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { alerts, advisories } = useData();
  const [showAlerts,   setShowAlerts]   = useState(false);
  const [showAdvisory, setShowAdvisory] = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);
  const [time,         setTime]         = useState(new Date());
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [showSearch,   setShowSearch]   = useState(false);
  const profileRef   = React.useRef(null);
  const searchRef    = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowSearch(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!showSearch) return undefined;
    const onDocClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showSearch]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const words = q.split(/\s+/).filter(Boolean);
    const scored = SEARCH_INDEX.map(item => {
      const haystack = [
        item.label,
        ...(item.breadcrumb || []),
        item.keywords || '',
      ].join(' ').toLowerCase();
      const matchCount = words.filter(w => haystack.includes(w)).length;
      return { item, matchCount };
    }).filter(({ matchCount }) => matchCount > 0);
    scored.sort((a, b) => {
      // Prioritise full-word matches in label, then match count
      const aLabel = a.item.label.toLowerCase().includes(q) ? 1 : 0;
      const bLabel = b.item.label.toLowerCase().includes(q) ? 1 : 0;
      if (bLabel !== aLabel) return bLabel - aLabel;
      return b.matchCount - a.matchCount;
    });
    return scored.slice(0, 10).map(({ item }) => item);
  }, [searchQuery]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!showProfile) return undefined;
    const onDocClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setShowProfile(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [showProfile]);

  const unacknowledgedAlerts = alerts?.filter(a => !a.acknowledged)?.length || 0;
  const criticalAlerts       = alerts?.filter(a => a.type === 'critical' && !a.acknowledged)?.length || 0;
  const pageTitle            = PAGE_TITLES[location.pathname] || 'Dashboard';

  return (
    <div className={`theme-${theme} h-screen w-screen flex overflow-hidden bg-cwm-darker`}>

      {/* ── SIDEBAR ──────────────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0 overflow-hidden transition-all duration-200 bg-cwm-dark border-r border-cwm-border"
        style={{ width: sidebarOpen ? 'var(--cwm-sidebar-w, 244px)' : '60px' }}
      >
        {/* Logo row */}
        <div
          className="flex items-center gap-3 px-4 cursor-pointer shrink-0 border-b border-cwm-border"
          style={{ height: 'var(--cwm-header-h, 62px)' }}
          onClick={() => navigate('/')}
        >
          {/* Astrikos logo — clip transparent padding so visible content fills the container */}
          <div style={{
            height: sidebarOpen ? 76 : 60,
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'flex-start',
            transition: 'height 0.2s ease',
          }}>
            <img
              src="/Logo Transparent Horizontal.png"
              alt="Astrikos"
              style={{
                /* scale up so the ~63% visible-content band fills the container height */
                height: sidebarOpen ? 120 : 96,
                /* shift up to skip the ~17% top transparent padding */
                marginTop: sidebarOpen ? -20 : -16,
                width: 'auto',
                display: 'block',
                filter: 'var(--cwm-logo-filter, none)',
              }}
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {sidebarOpen && (
                <p className="nav-section-label">{section.label}</p>
              )}
              {!sidebarOpen && <div className="h-3" />}
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <div key={item.path} className="px-2">
                    <button
                      onClick={() => navigate(item.path)}
                      className={`nav-item w-full ${isActive ? 'active' : ''}`}
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      <SvgIcon d={item.icon} />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom: user + logout */}
        <div className="shrink-0 border-t border-cwm-border">
          {sidebarOpen && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className="w-8 h-8 rounded-lg bg-cwm-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              >
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate" style={{ color: 'var(--cwm-text)' }}>{user?.fullName}</div>
                <div className="text-[10px] truncate capitalize" style={{ color: 'var(--cwm-text-faint)' }}>
                  {user?.role?.replace('_', ' ')}
                </div>
              </div>
            </div>
          )}
          <div className="px-2 pb-3">
            <button
              onClick={onLogout}
              className="nav-item w-full text-red-400 hover:text-red-300"
              style={{ color: 'var(--cwm-text-faint)' }}
              title={!sidebarOpen ? 'Logout' : undefined}
            >
              <SvgIcon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              {sidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── TOPBAR ──────────────────────────────────────────── */}
        <header
          className="shrink-0 flex items-center gap-3 px-4 border-b border-cwm-border"
          style={{ height: 'var(--cwm-header-h, 62px)', background: 'var(--cwm-chrome-bg)' }}
        >
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="icon-btn"
            title="Toggle sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* CWM Command Center title */}
          <div className="hidden sm:flex flex-col ml-1">
            <span className="text-[11px] font-bold tracking-widest" style={{ color: 'var(--cwm-text)', letterSpacing: '0.10em' }}>CWM COMMAND CENTER</span>
            <span className="text-[9px]" style={{ color: 'var(--cwm-text-faint)' }}>{pageTitle}</span>
          </div>

          {/* Search */}
          <div className="header-search flex-1 max-w-xs ml-3" ref={searchRef} style={{ position: 'relative' }}>
            <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--cwm-text-faint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search anything… (Ctrl+K)"
              aria-label="Search"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); e.target.blur(); }
                if (e.key === 'Enter' && searchResults.length > 0) {
                  navigate(searchResults[0].path);
                  setShowSearch(false);
                  setSearchQuery('');
                  e.target.blur();
                }
              }}
            />
            {showSearch && searchQuery.trim() && (
              <div className="search-dropdown">
                {searchResults.length === 0 ? (
                  <div className="search-dropdown-empty">No results for "{searchQuery}"</div>
                ) : searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    className="search-dropdown-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      navigate(item.path);
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                  >
                    <div className="sdi-icon">{item.icon}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="sdi-label">{item.label}</div>
                      <div className="sdi-desc">
                        {item.breadcrumb.join(' › ')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Live time */}
          <div className="hidden md:block font-mono text-xs px-2 py-1 rounded-md"
            style={{ background: 'var(--cwm-surface-soft)', color: 'var(--cwm-text-muted)', border: '1px solid var(--cwm-border)', letterSpacing: '0.04em' }}>
            {time.toLocaleTimeString('en-LK', { hour12: false })}
          </div>

          {/* Theme toggle */}
          <button
            onClick={onThemeToggle}
            className="icon-btn"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="-1 -1 26 26">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1012 21a8.962 8.962 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* AI Advisory — wider purple action button */}
          <button
            onClick={() => { setShowAdvisory(!showAdvisory); setShowAlerts(false); }}
            className={`cwm-advisory-btn ${showAdvisory ? 'active' : ''}`}
            title="AI Advisory"
            aria-label="AI Advisory"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>S!AP Advisory</span>
          </button>

          {/* Alerts bell */}
          <button
            onClick={() => { setShowAlerts(!showAlerts); setShowAdvisory(false); }}
            className={`icon-btn ${showAlerts ? 'active' : ''}`}
            title="Alerts"
            aria-label="Alerts"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unacknowledgedAlerts > 0 && (
              <span
                className={`absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full text-[9px] flex items-center justify-center font-bold px-0.5 ${criticalAlerts > 0 ? 'animate-pulse' : ''}`}
                style={{
                  background: criticalAlerts > 0 ? 'var(--cwm-danger)' : 'var(--cwm-warning)',
                  color: 'var(--cwm-on-color)',
                }}
              >
                {unacknowledgedAlerts}
              </span>
            )}
          </button>

          {/* User avatar — icon only with dropdown menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              className="profile-trigger"
              onClick={() => setShowProfile((s) => !s)}
              aria-haspopup="menu"
              aria-expanded={showProfile}
              title={user?.fullName || 'Account'}
            >
              {user?.fullName?.charAt(0) || 'U'}
            </button>
            {showProfile && (
              <div className="profile-menu" role="menu">
                <div className="profile-menu-header">
                  <div className="avatar">{user?.fullName?.charAt(0) || 'U'}</div>
                  <div className="min-w-0">
                    <div className="name truncate">{user?.fullName || 'Account'}</div>
                    <div className="status">Online</div>
                  </div>
                </div>
                <div className="profile-menu-section">
                  <button className="profile-menu-item" role="menuitem" onClick={() => { setShowProfile(false); navigate('/profile'); }}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    Profile
                  </button>
                  <button className="profile-menu-item" role="menuitem" onClick={() => { setShowProfile(false); setShowAlerts(true); setShowAdvisory(false); }}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    Notification
                  </button>
                  <button className="profile-menu-item" role="menuitem" onClick={() => { setShowProfile(false); onThemeToggle && onThemeToggle(); }}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Settings
                  </button>
                </div>
                <div className="profile-menu-section">
                  <button className="profile-menu-item danger" role="menuitem" onClick={() => { setShowProfile(false); onLogout && onLogout(); }}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── CONTENT ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden">
          <main className={`h-full ${location.pathname === '/digital-twin' ? 'overflow-hidden' : 'overflow-auto p-4'}`}>
            {children}
          </main>
        </div>
      </div>

      {/* Alert panel — rendered outside flex flow, true fixed overlay */}
      {showAlerts && (
        <div className="w-80 overflow-hidden animate-slide-up border-l border-cwm-border bg-cwm-darker"
          style={{ position: 'fixed', top: 'var(--cwm-header-h, 62px)', right: 0, bottom: 0, zIndex: 200 }}>
          <AlertPanel alerts={alerts} onClose={() => setShowAlerts(false)} />
        </div>
      )}

      {/* AI Advisory panel — rendered outside flex flow, true fixed overlay */}
      {showAdvisory && (
        <div className="cwm-advisory-panel w-96 overflow-hidden animate-slide-up border-l border-cwm-border"
          style={{ position: 'fixed', top: 'var(--cwm-header-h, 62px)', right: 0, bottom: 0, zIndex: 200 }}>
          <AdvisoryPanel advisories={advisories} onClose={() => setShowAdvisory(false)} />
        </div>
      )}
    </div>
  );
}

