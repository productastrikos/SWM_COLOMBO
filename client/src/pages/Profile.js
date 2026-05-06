import React, { useState } from 'react';

const FIELD = ({ label, value, type = 'text', editable = true, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--cwm-text-faint)' }}>
      {label}
    </label>
    <input
      type={type}
      defaultValue={value}
      readOnly={!editable}
      onChange={onChange}
      className="w-full rounded-lg px-3 py-2 text-sm font-medium outline-none transition-all"
      style={{
        background: editable ? 'var(--cwm-bg)' : 'var(--cwm-surface-soft)',
        border: '1px solid var(--cwm-border)',
        color: editable ? 'var(--cwm-text)' : 'var(--cwm-text-faint)',
        cursor: editable ? 'text' : 'default',
      }}
      onFocus={e => editable && (e.target.style.borderColor = 'var(--cwm-accent-border)')}
      onBlur={e => (e.target.style.borderColor = 'var(--cwm-border)')}
    />
  </div>
);

const StatCard = ({ label, value, icon, color }) => (
  <div
    className="flex items-center gap-4 rounded-xl p-4"
    style={{ background: 'var(--cwm-panel)', border: '1px solid var(--cwm-border)' }}
  >
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}22`, color }}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--cwm-text-faint)' }}>{label}</div>
      <div className="text-base font-bold leading-tight mt-0.5" style={{ color: 'var(--cwm-text)' }}>{value}</div>
    </div>
  </div>
);

const ACTIVITY = [
  { action: 'Acknowledged alert — Zone 3 bin overflow (85%)', time: '2 min ago', dot: '#dc2626' },
  { action: 'Reviewed Fleet Management dashboard', time: '18 min ago', dot: '#5b8de0' },
  { action: 'Exported sustainability report (PDF)', time: '1 hr ago', dot: '#16a34a' },
  { action: 'Adjusted collection route — V-009 Grandpass', time: '3 hr ago', dot: '#d97706' },
  { action: 'Logged in from 192.168.1.24', time: 'Today 06:41', dot: '#8b5cf6' },
  { action: 'Acknowledged advisory ADV-001', time: 'Yesterday 14:22', dot: '#0ea5e9' },
];

export default function Profile({ user }) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const initials = user?.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const role = (user?.role || 'operator').replace(/_/g, ' ');
  const joinDate = 'January 2024';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-6">

      {/* ── Page header ─────────────────────────────────────── */}
      <div className="page-header-block">
        <div>
          <h1 className="page-title">Account Profile</h1>
          <p className="page-subtitle">Manage your personal details, preferences and activity</p>
        </div>
      </div>

      {/* ── Hero card ───────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: 'var(--cwm-panel)', border: '1px solid var(--cwm-border)', boxShadow: 'var(--cwm-shadow-md)' }}
      >
        {/* Banner gradient */}
        <div
          className="h-28 w-full"
          style={{
            background: 'linear-gradient(135deg, var(--cwm-accent-strong) 0%, var(--cwm-advisory) 100%)',
            opacity: 0.85,
          }}
        />

        <div className="px-6 pb-5">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative flex-shrink-0">
              {/* Profile picture */}
              <div
                className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0"
                style={{ boxShadow: '0 0 0 4px var(--cwm-panel), 0 4px 16px rgba(0,0,0,0.35)' }}
              >
                <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" width="96" height="96">
                  <defs>
                    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#1e3a5f"/>
                      <stop offset="100%" stopColor="#0f2540"/>
                    </linearGradient>
                    <linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f5c5a3"/>
                      <stop offset="100%" stopColor="#e8a87c"/>
                    </linearGradient>
                    <linearGradient id="shirtGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6"/>
                      <stop offset="100%" stopColor="#1d4ed8"/>
                    </linearGradient>
                    <clipPath id="circle">
                      <rect width="96" height="96" rx="16"/>
                    </clipPath>
                  </defs>
                  <rect width="96" height="96" rx="16" fill="url(#bgGrad)"/>
                  {/* Shirt / body */}
                  <ellipse cx="48" cy="102" rx="34" ry="26" fill="url(#shirtGrad)"/>
                  {/* Collar */}
                  <path d="M38 82 Q48 90 58 82 L60 102 Q48 108 36 102 Z" fill="#2563eb"/>
                  {/* Neck */}
                  <rect x="43" y="66" width="10" height="14" rx="5" fill="url(#skinGrad)"/>
                  {/* Head */}
                  <ellipse cx="48" cy="52" rx="20" ry="22" fill="url(#skinGrad)"/>
                  {/* Hair */}
                  <path d="M28 46 Q28 26 48 26 Q68 26 68 46 Q66 36 48 36 Q30 36 28 46Z" fill="#1a0a00"/>
                  <path d="M28 46 Q27 54 30 58 Q28 50 28 46Z" fill="#1a0a00"/>
                  <path d="M68 46 Q69 54 66 58 Q68 50 68 46Z" fill="#1a0a00"/>
                  {/* Ears */}
                  <ellipse cx="28" cy="54" rx="3.5" ry="5" fill="#e8a87c"/>
                  <ellipse cx="68" cy="54" rx="3.5" ry="5" fill="#e8a87c"/>
                  {/* Eyes */}
                  <ellipse cx="40" cy="52" rx="3.5" ry="4" fill="white"/>
                  <ellipse cx="56" cy="52" rx="3.5" ry="4" fill="white"/>
                  <circle cx="41" cy="53" r="2.2" fill="#1a0a00"/>
                  <circle cx="57" cy="53" r="2.2" fill="#1a0a00"/>
                  <circle cx="41.8" cy="52.2" r="0.7" fill="white"/>
                  <circle cx="57.8" cy="52.2" r="0.7" fill="white"/>
                  {/* Eyebrows */}
                  <path d="M36.5 47 Q40 45.5 43.5 47" stroke="#1a0a00" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <path d="M52.5 47 Q56 45.5 59.5 47" stroke="#1a0a00" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  {/* Nose */}
                  <path d="M46 56 Q48 60 50 56" stroke="#c8895a" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                  {/* Smile */}
                  <path d="M42 64 Q48 69 54 64" stroke="#c8895a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
              {/* Online indicator */}
              <span
                className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2"
                style={{ background: 'var(--cwm-success)', borderColor: 'var(--cwm-panel)' }}
              />
            </div>
            <button
              onClick={handleSave}
              className="cwm-primary-btn px-5 py-2 text-xs rounded-lg"
              style={{ marginBottom: 4 }}
            >
              {saved ? '✓ Saved' : 'Save Changes'}
            </button>
          </div>

          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold leading-tight" style={{ color: 'var(--cwm-text)' }}>
                {user?.fullName || 'Nipun Bandara'}
              </h2>
              <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--cwm-text-muted)' }}>{role}</p>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--cwm-text-faint)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  Joined {joinDate}
                </span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--cwm-text-faint)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Colombo, Sri Lanka
                </span>
                <span
                  className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--cwm-success-bg)', color: 'var(--cwm-success)', border: '1px solid var(--cwm-success-border)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--cwm-success)' }} />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Sessions This Month" value="142" color="var(--cwm-accent)"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
        />
        <StatCard label="Alerts Actioned" value="38" color="var(--cwm-warning)"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>}
        />
        <StatCard label="Routes Optimised" value="17" color="var(--cwm-success)"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>}
        />
        <StatCard label="Reports Exported" value="9" color="var(--cwm-violet)"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
        />
      </div>

      {/* ── Two-column main content ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Personal details form */}
        <div
          className="lg:col-span-2 rounded-2xl p-6 space-y-5"
          style={{ background: 'var(--cwm-panel)', border: '1px solid var(--cwm-border)', boxShadow: 'var(--cwm-shadow-sm)' }}
        >
          <h3 className="text-sm font-bold" style={{ color: 'var(--cwm-text)' }}>Personal Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FIELD label="Full Name" value={user?.fullName || ''} />
            <FIELD label="Username" value={user?.username || user?.email?.split('@')[0] || 'admin'} />
            <FIELD label="Email Address" value={user?.email || 'nipun@cwm.lk'} type="email" />
            <FIELD label="Phone" value="+94 71 000 0000" type="tel" />
            <FIELD label="Department" value="Operations & Control" />
            <FIELD label="Role" value={role} editable={false} />
          </div>

          <div className="pt-2 border-t" style={{ borderColor: 'var(--cwm-border)' }}>
            <h4 className="text-xs font-bold mb-3" style={{ color: 'var(--cwm-text)' }}>Security</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FIELD label="Current Password" value="" type="password" />
              <FIELD label="New Password" value="" type="password" />
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--cwm-panel)', border: '1px solid var(--cwm-border)', boxShadow: 'var(--cwm-shadow-sm)' }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--cwm-text)' }}>Recent Activity</h3>
          <div className="space-y-0">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-3" style={{ borderBottom: i < ACTIVITY.length - 1 ? '1px solid var(--cwm-border-soft)' : 'none' }}>
                <div className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.dot }} />
                <div className="min-w-0">
                  <p className="text-xs leading-snug" style={{ color: 'var(--cwm-text-muted)' }}>{a.action}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--cwm-text-faint)' }}>{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Preferences ─────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: 'var(--cwm-panel)', border: '1px solid var(--cwm-border)', boxShadow: 'var(--cwm-shadow-sm)' }}
      >
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--cwm-text)' }}>Notification Preferences</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Critical Alerts', desc: 'Bin overflow, vehicle faults', on: true },
            { label: 'AI Advisories', desc: 'Route & operational recommendations', on: true },
            { label: 'Daily Digest', desc: 'Summary report at 08:00', on: false },
            { label: 'Fleet Updates', desc: 'Vehicle status changes', on: true },
            { label: 'ESG Reports', desc: 'Monthly sustainability summaries', on: false },
            { label: 'System Notices', desc: 'Maintenance & downtime alerts', on: true },
          ].map((pref) => (
            <div
              key={pref.label}
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
              style={{ background: 'var(--cwm-bg)', border: '1px solid var(--cwm-border)' }}
            >
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--cwm-text)' }}>{pref.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--cwm-text-faint)' }}>{pref.desc}</p>
              </div>
              <Toggle defaultOn={pref.on} />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function Toggle({ defaultOn }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn(s => !s)}
      className="flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200 relative"
      style={{
        background: on ? 'var(--cwm-accent)' : 'var(--cwm-surface-raised)',
        border: '1px solid ' + (on ? 'var(--cwm-accent-border)' : 'var(--cwm-border)'),
      }}
    >
      <span
        className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200"
        style={{ transform: on ? 'translateX(17px)' : 'translateX(2px)', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
      />
    </button>
  );
}
