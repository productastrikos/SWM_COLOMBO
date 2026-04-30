// ============================================================================
// COLOMBO WASTE MANAGEMENT - MAIN SERVER
// Express + Socket.io + Simulation Engine + AI Advisory
// ============================================================================

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const operations = require('./operationsData');

const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
const app = express();
const server = isServerless ? null : http.createServer(app);
const io = isServerless
  ? { emit: () => {}, on: () => {} }
  : new Server(server, {
      cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
    });

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'cwm_jwt_secret_default';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client', 'build')));

const users = [
  { id: '1', username: 'admin', email: 'admin@cwm.lk', password: bcrypt.hashSync('admin123', 10), role: 'admin', fullName: 'System Administrator', department: 'IT & Operations' },
  { id: '2', username: 'operator', email: 'operator@cwm.lk', password: bcrypt.hashSync('operator123', 10), role: 'operator', fullName: 'Chaminda Bandara', department: 'Collection Operations' },
  { id: '3', username: 'analyst', email: 'analyst@cwm.lk', password: bcrypt.hashSync('analyst123', 10), role: 'analyst', fullName: 'Nethmi Perera', department: 'Data Analytics' },
  { id: '4', username: 'fieldworker', email: 'field@cwm.lk', password: bcrypt.hashSync('field123', 10), role: 'field_worker', fullName: 'Tharaka Silva', department: 'Field Operations' }
];

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function roleGuard(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function getSnapshot() {
  return operations.getDashboard();
}

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = users.find((entry) => entry.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      department: user.department,
    },
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = users.find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    department: user.department,
  });
});

app.get('/api/dashboard', authMiddleware, (req, res) => {
  res.json(getSnapshot());
});

app.get('/api/kpis', authMiddleware, (req, res) => {
  res.json(operations.getKPIs());
});

app.get('/api/kpis/history', authMiddleware, (req, res) => {
  res.json(operations.getHistoricalSeries());
});

app.get('/api/bins', authMiddleware, (req, res) => {
  let bins = operations.getBins();
  const { zone, status, type } = req.query;

  if (zone) bins = bins.filter((bin) => bin.zone === zone);
  if (status) bins = bins.filter((bin) => bin.status === status);
  if (type) bins = bins.filter((bin) => bin.type === type || bin.wasteType === type);

  res.json(bins);
});

app.get('/api/bins/:binId', authMiddleware, (req, res) => {
  const bin = operations.getBins().find((entry) => entry.binId === req.params.binId);
  if (!bin) {
    return res.status(404).json({ error: 'Bin not found' });
  }
  res.json(bin);
});

app.post('/api/bins/:binId/collect', authMiddleware, roleGuard('admin', 'operator'), (req, res) => {
  const bin = operations.getBins().find((entry) => entry.binId === req.params.binId);
  if (!bin) {
    return res.status(404).json({ error: 'Bin not found' });
  }

  res.json({ success: true, binId: bin.binId, status: 'scheduled_for_collection' });
});

app.get('/api/vehicles', authMiddleware, (req, res) => {
  let vehicles = operations.getVehicles();
  const { status, type } = req.query;

  if (status) vehicles = vehicles.filter((vehicle) => vehicle.status === status);
  if (type) vehicles = vehicles.filter((vehicle) => vehicle.type === type);

  res.json(vehicles);
});

app.get('/api/vehicles/:vehicleId', authMiddleware, (req, res) => {
  const vehicle = operations.getVehicles().find((entry) => entry.vehicleId === req.params.vehicleId);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }
  res.json(vehicle);
});

app.post('/api/vehicles/:vehicleId/dispatch', authMiddleware, roleGuard('admin', 'operator'), (req, res) => {
  const vehicle = operations.getVehicles().find((entry) => entry.vehicleId === req.params.vehicleId);
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  res.json({ success: true, vehicleId: vehicle.vehicleId, targetZone: req.body.zone || vehicle.zone });
});

app.get('/api/zones', authMiddleware, (req, res) => {
  res.json(operations.getZones());
});

app.get('/api/zones/:zoneId', authMiddleware, (req, res) => {
  const zone = operations.getZones().find((entry) => entry.zoneId === req.params.zoneId);
  if (!zone) {
    return res.status(404).json({ error: 'Zone not found' });
  }

  res.json({
    ...zone,
    bins: operations.getBins().filter((bin) => bin.zone === req.params.zoneId),
    vehicles: operations.getVehicles().filter((vehicle) => vehicle.zone === zone.ward),
  });
});

app.get('/api/facilities', authMiddleware, (req, res) => {
  let facilities = operations.getFacilities();
  if (req.query.type) {
    facilities = facilities.filter((facility) => facility.type === req.query.type);
  }
  res.json(facilities);
});

app.get('/api/wte', authMiddleware, (req, res) => {
  res.json(operations.getWTEData());
});

app.post('/api/wte/adjust-intake', authMiddleware, roleGuard('admin', 'operator'), (req, res) => {
  const amount = Number(req.body.amount || 0);
  res.json({ success: true, requestedAdjustmentTons: amount, note: 'Dashboard is running in deterministic planning mode.' });
});

app.get('/api/alerts', authMiddleware, (req, res) => {
  res.json(operations.getAlerts());
});

app.put('/api/alerts/:alertId/acknowledge', authMiddleware, (req, res) => {
  const alert = operations.getAlerts().find((entry) => entry.alertId === req.params.alertId);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  res.json({ ...alert, acknowledged: true });
});

app.get('/api/advisories', authMiddleware, (req, res) => {
  res.json(operations.getAdvisories());
});

app.put('/api/advisories/:advisoryId/acknowledge', authMiddleware, (req, res) => {
  const advisory = operations.getAdvisories().find((entry) => entry.advisoryId === req.params.advisoryId);
  if (!advisory) {
    return res.status(404).json({ error: 'Advisory not found' });
  }

  res.json({ ...advisory, acknowledged: true });
});

app.post('/api/advisories/:advisoryId/action', authMiddleware, roleGuard('admin', 'operator'), (req, res) => {
  const advisory = operations.getAdvisories().find((entry) => entry.advisoryId === req.params.advisoryId);
  if (!advisory) {
    return res.status(404).json({ error: 'Advisory not found' });
  }

  res.json({ success: true, advisoryId: advisory.advisoryId, actionType: req.body.actionType || 'recorded' });
});

app.post('/api/actions/dispatch', authMiddleware, roleGuard('admin', 'operator'), (req, res) => {
  res.json({ success: true, zone: req.body.zone || 'Pettah', mode: 'manual_dispatch' });
});

app.post('/api/actions/optimize-routes', authMiddleware, roleGuard('admin', 'operator'), (req, res) => {
  res.json({ success: true, zone: req.body.zone || 'Network', mode: 'schedule_rebalance' });
});

app.post('/api/actions/notify', authMiddleware, (req, res) => {
  res.json({
    success: true,
    notification: {
      zone: req.body.zone || 'Colombo Region',
      message: req.body.message || 'Service recovery update issued.',
      sentAt: new Date().toISOString(),
      recipientCount: 1240,
    },
  });
});

app.post('/api/actions/work-order', authMiddleware, roleGuard('admin', 'operator'), (req, res) => {
  res.json({
    success: true,
    workOrder: {
      id: `WO-${Date.now()}`,
      title: req.body.title || 'New work order',
      zone: req.body.zone || 'Network',
      priority: req.body.priority || 'medium',
      status: 'created',
      createdBy: req.user.fullName,
    },
  });
});

app.get('/api/work-orders', authMiddleware, (req, res) => {
  res.json(operations.getWorkOrders());
});

app.get('/api/weather', authMiddleware, (req, res) => {
  res.json(operations.getWeather());
});

app.get('/api/citizen', authMiddleware, (req, res) => {
  res.json(operations.getCitizenServices());
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
});

if (!isServerless) {
  io.on('connection', (socket) => {
    socket.emit('initial-state', getSnapshot());
    socket.emit('advisories', operations.getAdvisories());
    socket.emit('data:bins-summary', { bins: operations.getBins() });
    socket.emit('data:vehicles-summary', { vehicles: operations.getVehicles() });
    socket.emit('weather', operations.getWeather());
  });

  setInterval(() => {
    io.emit('tick', getSnapshot());
    io.emit('advisories', operations.getAdvisories());
    io.emit('data:bins-summary', { bins: operations.getBins() });
    io.emit('data:vehicles-summary', { vehicles: operations.getVehicles() });
  }, 30000);
}

if (!isServerless) {
  server.listen(PORT, () => {
    console.log(`Waste management server running on port ${PORT}`);
  });
}

module.exports = { app, server, io };
