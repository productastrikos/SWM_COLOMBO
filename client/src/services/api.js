import axios from 'axios';

const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const isLocalOrigin = /localhost|127\.0\.0\.1|192\.168\.|^10\.|172\.(1[6-9]|2[0-9]|3[01])\./.test(browserOrigin);
const localApiBase = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:5000/api`
  : 'http://localhost:5000/api';
const API_BASE = process.env.REACT_APP_API_URL || (isLocalOrigin ? localApiBase : `${browserOrigin}/.netlify/functions/api`);

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cwm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cwm_token');
      localStorage.removeItem('cwm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (username, password) => api.post('/auth/login', { username, password });
export const getMe = () => api.get('/auth/me');

// Dashboard
export const getDashboard = () => api.get('/dashboard');
export const getKPIs = () => api.get('/kpis');
export const getKPIHistory = () => api.get('/kpis/history');

// Bins
export const getBins = (params) => api.get('/bins', { params });
export const getBin = (binId) => api.get(`/bins/${binId}`);
export const collectBin = (binId) => api.post(`/bins/${binId}/collect`);

// Vehicles
export const getVehicles = (params) => api.get('/vehicles', { params });
export const getVehicle = (vehicleId) => api.get(`/vehicles/${vehicleId}`);
export const dispatchVehicle = (vehicleId, zone) => api.post(`/vehicles/${vehicleId}/dispatch`, { zone });

// Zones
export const getZones = () => api.get('/zones');
export const getZone = (zoneId) => api.get(`/zones/${zoneId}`);

// Facilities
export const getFacilities = (params) => api.get('/facilities', { params });

// WTE
export const getWTE = () => api.get('/wte');
export const adjustWTEIntake = (amount) => api.post('/wte/adjust-intake', { amount });

// Alerts
export const getAlerts = (params) => api.get('/alerts', { params });
export const acknowledgeAlert = (alertId) => api.put(`/alerts/${alertId}/acknowledge`);

// Advisories
export const getAdvisories = () => api.get('/advisories');
export const acknowledgeAdvisory = (id) => api.put(`/advisories/${id}/acknowledge`);
export const executeAdvisoryAction = (advisoryId, actionType) => api.post(`/advisories/${advisoryId}/action`, { actionType });

// Actions
export const dispatchCrew = (zone) => api.post('/actions/dispatch', { zone });
export const optimizeRoutes = (zone) => api.post('/actions/optimize-routes', { zone });
export const notifyCitizens = (zone, message) => api.post('/actions/notify', { zone, message });
export const createWorkOrder = (data) => api.post('/actions/work-order', data);

// Work Orders
export const getWorkOrders = () => api.get('/work-orders');

// Weather
export const getWeather = () => api.get('/weather');

// Enterprise
export const getHRData = () => api.get('/enterprise/hr');
export const getFinanceData = () => api.get('/enterprise/finance');
export const getProcurementData = () => api.get('/enterprise/procurement');
export const getITSecurityData = () => api.get('/enterprise/it-security');
export const getLegalData = () => api.get('/enterprise/legal');
export const getESGData = () => api.get('/enterprise/esg');
export const getCitizenData = () => api.get('/enterprise/citizen');

export default api;
