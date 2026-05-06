import React, { useState } from 'react';
import { login } from '../services/api';

const demoUsers = {
  admin:       { password: 'admin123',    role: 'admin',       fullName: 'Nipun Bandara',         department: 'IT & Operations' },
  operator:    { password: 'operator123', role: 'operator',    fullName: 'Chaminda Bandara',       department: 'Collection Operations' },
  analyst:     { password: 'analyst123',  role: 'analyst',     fullName: 'Nethmi Perera',          department: 'Data Analytics' },
  fieldworker: { password: 'field123',    role: 'field_worker',fullName: 'Tharaka Silva',          department: 'Field Operations' },
};

function getDemoLogin(username, password) {
  const normalized = username.trim().toLowerCase();
  const demo = demoUsers[normalized];
  if (!demo || demo.password !== password) return null;
  return {
    token: `static-demo-token-${normalized}`,
    user: {
      id: normalized,
      username: normalized,
      email: `${normalized}@cwm.lk`,
      role: demo.role,
      fullName: demo.fullName,
      department: demo.department,
    },
  };
}

export default function Login({ onLogin, theme = 'dark', onThemeToggle }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(username, password);
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      const demoLogin = getDemoLogin(username, password);
      if (demoLogin) {
        onLogin(demoLogin.user, demoLogin.token);
      } else {
        setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`theme-${theme} h-screen w-screen flex`}
      style={{ background: 'var(--cwm-bg)', fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}
    >
      {/* ── LEFT BRANDING PANEL ────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10"
        style={{ background: 'var(--cwm-bg-elevated)', borderRight: '1px solid var(--cwm-border)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--cwm-accent)' }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--cwm-text)' }}>CWM Platform</div>
            <div className="text-xs" style={{ color: 'var(--cwm-text-faint)' }}>Colombo Smart Waste</div>
          </div>
        </div>

        {/* Hero text */}
        <div>
          <h2
            className="text-3xl font-bold mb-4 leading-tight"
            style={{ color: 'var(--cwm-text)', letterSpacing: '-0.02em' }}
          >
            Colombo Waste Management<br />
            <span style={{ color: 'var(--cwm-accent)' }}>Command Center</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--cwm-text-muted)' }}>
            Real-time operations monitoring, fleet dispatch, sustainability tracking and AI-powered advisory for Colombo Municipal Council's smart waste ecosystem.
          </p>

          {/* Feature list */}
          <ul className="mt-6 space-y-3">
            {[
              { icon: '🗺️', text: 'Digital twin with live vehicle tracking' },
              { icon: '♻️', text: 'Circular economy & ESG dashboard' },
              { icon: '🤖', text: 'AI advisory and anomaly detection' },
              { icon: '📊', text: 'Real-time KPIs and operations analytics' },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: 'var(--cwm-surface-raised)' }}>
                  {f.icon}
                </span>
                <span className="text-xs" style={{ color: 'var(--cwm-text-muted)' }}>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="text-xs" style={{ color: 'var(--cwm-text-faint)' }}>
          © 2025 Colombo Municipal Council · Powered by Astrikos
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ───────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Theme toggle row */}
        <div className="flex items-center justify-end p-5">
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1012 21a8.962 8.962 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-[380px]">

            {/* Mobile logo (hidden on lg) */}
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--cwm-accent)' }}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: 'var(--cwm-text)' }}>CWM Command Center</div>
                <div className="text-xs" style={{ color: 'var(--cwm-text-faint)' }}>Colombo Smart Waste Management</div>
              </div>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--cwm-text)', letterSpacing: '-0.02em' }}>
                Sign in
              </h1>
              <p className="text-sm" style={{ color: 'var(--cwm-text-muted)' }}>
                Enter your credentials to access the platform
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  className="px-4 py-3 rounded-lg text-sm"
                  style={{
                    background: 'var(--cwm-danger-bg)',
                    border: '1px solid var(--cwm-danger-border)',
                    color: 'var(--cwm-danger)',
                  }}
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="cwm-username"
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: 'var(--cwm-text-muted)' }}
                >
                  Username
                </label>
                <input
                  id="cwm-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="app-input"
                  placeholder="Enter username"
                  required
                  autoComplete="username"
                  autoFocus
                  style={{
                    background: 'var(--cwm-surface-soft)',
                    border: '1px solid var(--cwm-border)',
                    color: 'var(--cwm-text)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    width: '100%',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--cwm-accent)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--cwm-border)'}
                />
              </div>

              <div>
                <label
                  htmlFor="cwm-password"
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: 'var(--cwm-text-muted)' }}
                >
                  Password
                </label>
                <input
                  id="cwm-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="app-input"
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                  style={{
                    background: 'var(--cwm-surface-soft)',
                    border: '1px solid var(--cwm-border)',
                    color: 'var(--cwm-text)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    width: '100%',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--cwm-accent)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--cwm-border)'}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="cwm-primary-btn w-full"
                style={{ padding: '11px 0', fontSize: 14, borderRadius: 8, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Authenticating…' : 'Sign In'}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6">
              <div
                className="flex items-center gap-3 mb-3"
                style={{ color: 'var(--cwm-text-faint)' }}
              >
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--cwm-border)' }} />
                <span className="text-xs whitespace-nowrap">Demo accounts</span>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--cwm-border)' }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { user: 'admin',       pass: 'admin123',    role: 'Admin' },
                  { user: 'operator',    pass: 'operator123', role: 'Operator' },
                  { user: 'analyst',     pass: 'analyst123',  role: 'Analyst' },
                  { user: 'fieldworker', pass: 'field123',    role: 'Field Worker' },
                ].map((cred) => (
                  <button
                    key={cred.user}
                    type="button"
                    onClick={() => { setUsername(cred.user); setPassword(cred.pass); }}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-center transition-all"
                    style={{
                      background: 'var(--cwm-surface-soft)',
                      border: '1px solid var(--cwm-border)',
                      color: 'var(--cwm-text-muted)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--cwm-surface-raised)';
                      e.currentTarget.style.color = 'var(--cwm-text)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--cwm-surface-soft)';
                      e.currentTarget.style.color = 'var(--cwm-text-muted)';
                    }}
                  >
                    {cred.role}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

