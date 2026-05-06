import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './services/socket';
import { Chart as ChartJS } from 'chart.js';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WasteCollection from './pages/WasteCollection';
import FleetManagement from './pages/FleetManagement';
import WTEPlant from './pages/WTEPlant';
import Processing from './pages/Processing';
import Landfills from './pages/Landfills';
import Sustainability from './pages/Sustainability';
import CitizenServices from './pages/CitizenServices';
import DigitalTwin from './pages/DigitalTwin';
import Layout from './components/Layout';
import Profile from './pages/Profile';

// Global Chart.js defaults — ensure tooltips appear on hover for all charts
ChartJS.defaults.interaction.mode = 'index';
ChartJS.defaults.interaction.intersect = false;
ChartJS.defaults.plugins.tooltip.enabled = true;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('cwm_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('cwm_theme', theme);
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem('cwm_token');
    const userData = localStorage.getItem('cwm_user');
    if (token && userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.fullName === 'System Administrator') {
          parsed.fullName = 'Nipun Bandara';
          parsed.email = parsed.email === 'admin@cwm.lk' ? 'nipun@cwm.lk' : parsed.email;
          localStorage.setItem('cwm_user', JSON.stringify(parsed));
        }
        setUser(parsed);
      } catch (e) { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('cwm_token', token);
    localStorage.setItem('cwm_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('cwm_token');
    localStorage.removeItem('cwm_user');
    setUser(null);
  };

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  if (loading) return (
    <div className={`theme-${theme} h-screen w-screen flex items-center justify-center bg-cwm-dark`}>
      <div className="app-loading">
        <div className="app-loading-orbit" />
        <div className="app-loading-text">Loading CWM Platform...</div>
      </div>
    </div>
  );

  if (!user) return <Login onLogin={handleLogin} theme={theme} onThemeToggle={handleThemeToggle} />;

  return (
    <SocketProvider>
      <Router>
        <Layout user={user} onLogout={handleLogout} theme={theme} onThemeToggle={handleThemeToggle}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/collection" element={<WasteCollection />} />
            <Route path="/fleet" element={<FleetManagement />} />
            <Route path="/wte" element={<WTEPlant />} />
            <Route path="/processing" element={<Processing />} />
            <Route path="/landfills" element={<Landfills />} />
            <Route path="/sustainability" element={<Sustainability />} />
            <Route path="/citizen" element={<CitizenServices />} />
            <Route path="/digital-twin" element={<DigitalTwin />} />
            <Route path="/profile" element={<Profile user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </SocketProvider>
  );
}

export default App;
