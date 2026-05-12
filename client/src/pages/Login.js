import React, { useState } from 'react';
import { login } from '../services/api';

export default function Login({ onLogin, theme = 'dark', onThemeToggle }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(username, password);
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      setError('Invalid username or password.');
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
        className="hidden lg:flex flex-col justify-between w-[640px] shrink-0 p-10 relative overflow-hidden"
        style={{
          background: 'var(--cwm-bg-elevated)',
          borderRight: '1px solid var(--cwm-border)',
        }}
      >
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full">

          {/* Spacer to push content below top */}
          <div />

          {/* Hero text — vertically centred, slightly below middle */}
          <div className="flex flex-col items-center text-center" style={{ marginTop: '8%' }}>
            {/* Council emblem */}
            <img src="/swmlogo.png" alt="Municipal Council of Colombo" className="w-36 h-36 object-contain opacity-95 mb-6" />
            <h2
              className="text-3xl font-bold mb-4 leading-tight"
              style={{ color: 'var(--cwm-text)', letterSpacing: '-0.02em' }}
            >
              Colombo Waste Management<br />
              <span style={{ color: 'var(--cwm-accent)' }}>Command Center</span>
            </h2>
          </div>

          {/* Footer */}
          <div className="text-xs text-center" style={{ color: 'var(--cwm-text-faint)' }}>
            © 2025 Colombo Municipal Council · Powered by Astrikos
          </div>

        </div>
      </div>

      {/* ── RIGHT FORM PANEL ───────────────────────────────── */}
      <div className="flex-1 flex flex-col relative overflow-hidden"
        style={{
          backgroundImage: 'url(/download.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0" style={{ background: 'rgba(5, 18, 20, 0.82)' }} />
        {/* Theme toggle row */}
        <div className="relative z-10 flex items-center justify-end p-5">
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
        <div className="relative z-10 flex-1 flex items-center justify-center px-6">
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
                <div style={{ position: 'relative' }}>
                <input
                  id="cwm-password"
                  type={showPassword ? 'text' : 'password'}
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
                    padding: '10px 40px 10px 14px',
                    fontSize: 13,
                    width: '100%',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--cwm-accent)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--cwm-border)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    color: 'var(--cwm-text-faint)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
                </div>
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


          </div>
        </div>
      </div>
    </div>
  );
}

