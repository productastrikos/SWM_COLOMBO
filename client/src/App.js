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

// Global Chart.js defaults — ensure tooltips appear on hover for all charts
ChartJS.defaults.interaction.mode = 'index';
ChartJS.defaults.interaction.intersect = false;
ChartJS.defaults.plugins.tooltip.enabled = true;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cwm_token');
    const userData = localStorage.getItem('cwm_user');
    if (token && userData) {
      try { setUser(JSON.parse(userData)); } catch (e) { /* ignore */ }
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

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-cwm-dark">
      <div className="text-cyan-400 text-xl animate-pulse">Loading CWM Platform...</div>
    </div>
  );

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <SocketProvider>
      <Router>
        <Layout user={user} onLogout={handleLogout}>
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
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </SocketProvider>
  );
}

export default App;
