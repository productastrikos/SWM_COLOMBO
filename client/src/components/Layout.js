import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../services/socket';
import AlertPanel from './AlertPanel';
import AdvisoryPanel from './AdvisoryPanel';

const navItems = [
  { path: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4', label: 'Dashboard' },
  { path: '/collection', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', label: 'Collection' },
  { path: '/fleet', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', label: 'Fleet' },
  { path: '/wte', icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'WTE Plant' },
  { path: '/processing', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', label: 'Recycling' },
  { path: '/landfills', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', label: 'Landfills' },
  { path: '/sustainability', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064', label: 'ESG' },
  { path: '/citizen', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', label: 'Citizens' },
  { path: '/digital-twin', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', label: 'Digital Twin' },
];

export default function Layout({ children, user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { connected, alerts, advisories, weather } = useData();
  const [showAlerts, setShowAlerts] = useState(false);
  const [showAdvisory, setShowAdvisory] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const unacknowledgedAlerts = alerts?.filter(a => !a.acknowledged)?.length || 0;
  const criticalAlerts = alerts?.filter(a => a.type === 'critical' && !a.acknowledged)?.length || 0;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-cwm-dark">
      {/* LEFT SIDEBAR */}
      <div className="w-48 bg-cwm-darker border-r border-cwm-border flex flex-col py-3 shrink-0">
        {/* Logo */}
        <div className="flex items-center space-x-2 mb-5 px-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">CW</span>
          </div>
          <div>
            <p className="text-white font-bold text-xs leading-tight tracking-wide">ASTRIKOS</p>
            <p className="text-slate-500 text-[9px] leading-tight">Waste Management</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col gap-0.5 px-2 overflow-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex-1 min-h-0 w-full px-3 rounded-xl flex items-center space-x-3 transition-all text-left
                  ${isActive ? 'bg-cwm-accent text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-2 pt-1">
          <button
            onClick={onLogout}
            className="w-full px-3 py-2.5 rounded-xl flex items-center space-x-3 text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-all"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-xs font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="h-12 bg-cwm-darker border-b border-cwm-border flex items-center px-4 shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-cyan-400 font-bold text-sm">ASTRIKOS</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 text-sm font-medium">Waste Management Command Center</span>
            <span className="text-slate-600">—</span>
            <span className="text-slate-400 text-xs">Colombo Region, Sri Lanka</span>
          </div>

          <div className="flex-1" />

          {/* Weather */}
          {weather && (
            <div className="flex items-center space-x-2 mr-4 text-xs text-slate-400">
              <span>{weather.temperature?.toFixed(0)}°C</span>
              <span className="capitalize">{weather.condition?.replace('_', ' ')}</span>
              {weather.rainfall > 0 && <span className="text-blue-400">{weather.rainfall?.toFixed(0)}mm</span>}
            </div>
          )}

          {/* Live timestamp */}
          <div className="text-sm text-slate-400 mr-4 font-mono">
            {time.toLocaleTimeString('en-LK', { hour12: false })}
          </div>

          {/* System status */}
          <div className={`flex items-center space-x-1.5 mr-4 px-2 py-1 rounded-md text-xs
            ${connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span>{connected ? 'LIVE' : 'OFFLINE'}</span>
          </div>

          {/* AI Advisory Button */}
          <button
            onClick={() => { setShowAdvisory(!showAdvisory); setShowAlerts(false); }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-2
              ${showAdvisory ? 'bg-purple-600 text-white' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>AI Advisory</span>
          </button>

          {/* Alerts Button */}
          <button
            onClick={() => { setShowAlerts(!showAlerts); setShowAdvisory(false); }}
            className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all mr-3
              ${showAlerts ? 'bg-cwm-accent text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>Alerts</span>
            {unacknowledgedAlerts > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold
                ${criticalAlerts > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-500 text-black'}`}>
                {unacknowledgedAlerts}
              </span>
            )}
          </button>

          {/* User */}
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="hidden lg:block">
              <div className="text-xs text-white font-medium leading-tight">{user?.fullName}</div>
              <div className="text-[10px] text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
        </header>

        {/* CONTENT AREA WITH OPTIONAL SIDE PANELS */}
        <div className="flex-1 flex overflow-hidden">
          <main className={`flex-1 ${location.pathname === '/digital-twin' ? 'overflow-hidden' : 'overflow-auto p-4'}`}>
            {children}
          </main>

          {/* ALERT PANEL (RIGHT SIDE) */}
          {showAlerts && (
            <div className="w-80 border-l border-cwm-border bg-cwm-darker overflow-hidden shrink-0 animate-slide-up">
              <AlertPanel alerts={alerts} onClose={() => setShowAlerts(false)} />
            </div>
          )}

          {/* AI ADVISORY PANEL */}
          {showAdvisory && (
            <div className="w-96 border-l border-cwm-border bg-cwm-darker overflow-hidden shrink-0 animate-slide-up">
              <AdvisoryPanel advisories={advisories} onClose={() => setShowAdvisory(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
