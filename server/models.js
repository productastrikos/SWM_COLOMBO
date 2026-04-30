const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'operator', 'analyst', 'field_worker'], default: 'operator' },
  fullName: { type: String, required: true },
  department: String,
  avatar: String,
  lastLogin: Date,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const AlertSchema = new mongoose.Schema({
  alertId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['critical', 'warning', 'info'], required: true },
  category: { type: String, enum: ['bin_overflow', 'vehicle_breakdown', 'route_delay', 'emission_alert', 'landfill_capacity', 'maintenance', 'weather', 'illegal_dumping', 'system', 'compliance'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  zone: String,
  assetId: String,
  assetType: String,
  acknowledged: { type: Boolean, default: false },
  resolvedAt: Date,
  resolvedBy: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const SmartBinSchema = new mongoose.Schema({
  binId: { type: String, required: true, unique: true },
  location: {
    lat: Number,
    lng: Number,
    address: String,
    zone: String,
    ward: String
  },
  type: { type: String, enum: ['general', 'organic', 'recyclable', 'hazardous'] },
  capacity: { type: Number, default: 1100 },
  currentFillLevel: { type: Number, default: 0, min: 0, max: 100 },
  temperature: Number,
  humidity: Number,
  batteryLevel: { type: Number, default: 100 },
  lastCollection: Date,
  nextScheduledCollection: Date,
  status: { type: String, enum: ['active', 'maintenance', 'offline', 'overflow'], default: 'active' },
  wasteComposition: {
    organic: { type: Number, default: 0 },
    plastic: { type: Number, default: 0 },
    paper: { type: Number, default: 0 },
    metal: { type: Number, default: 0 },
    glass: { type: Number, default: 0 },
    hazardous: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  collectionHistory: [{
    timestamp: Date,
    fillLevelBefore: Number,
    fillLevelAfter: Number,
    collectedBy: String,
    weight: Number
  }]
}, { timestamps: true });

const VehicleSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true, unique: true },
  registrationNo: String,
  type: { type: String, enum: ['compactor', 'tipper', 'hook_loader', 'mini_truck', 'sweeper'] },
  capacity: Number,
  currentLoad: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'idle', 'maintenance', 'breakdown', 'returning'], default: 'idle' },
  driver: {
    name: String,
    employeeId: String,
    contact: String
  },
  currentLocation: {
    lat: Number,
    lng: Number
  },
  route: {
    routeId: String,
    zone: String,
    waypoints: [{
      lat: Number,
      lng: Number,
      binId: String,
      status: { type: String, enum: ['pending', 'completed', 'skipped'] }
    }],
    progress: { type: Number, default: 0 }
  },
  fuelLevel: { type: Number, default: 100 },
  mileage: Number,
  lastMaintenance: Date,
  nextMaintenance: Date,
  speed: { type: Number, default: 0 },
  engineTemp: Number,
  telemetry: {
    rpm: Number,
    oilPressure: Number,
    tirePressure: [Number],
    brakeHealth: Number
  }
}, { timestamps: true });

const ZoneSchema = new mongoose.Schema({
  zoneId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['residential', 'commercial', 'industrial', 'mixed'] },
  population: Number,
  area: Number,
  bounds: {
    north: Number,
    south: Number,
    east: Number,
    west: Number
  },
  center: {
    lat: Number,
    lng: Number
  },
  dailyWasteGeneration: Number,
  collectionFrequency: String,
  assignedVehicles: [String],
  assignedBins: [String],
  wasteComposition: {
    organic: Number,
    plastic: Number,
    paper: Number,
    metal: Number,
    glass: Number,
    hazardous: Number,
    other: Number
  },
  collectionEfficiency: { type: Number, default: 85 },
  illegalDumpingRisk: { type: String, enum: ['low', 'medium', 'high'] }
}, { timestamps: true });

const FacilitySchema = new mongoose.Schema({
  facilityId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['landfill', 'transfer_station', 'recycling_center', 'wte_plant', 'composting'] },
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  capacity: Number,
  currentUtilization: { type: Number, default: 0 },
  status: { type: String, enum: ['operational', 'maintenance', 'offline', 'at_capacity'] },
  dailyIntake: Number,
  dailyOutput: Number,
  operationalMetrics: mongoose.Schema.Types.Mixed,
  equipment: [{
    name: String,
    status: String,
    lastMaintenance: Date,
    health: Number
  }]
}, { timestamps: true });

const WTEPlantSchema = new mongoose.Schema({
  plantId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  location: { lat: Number, lng: Number, address: String },
  capacity: { type: Number, default: 500 },
  currentIntake: { type: Number, default: 0 },
  furnaceTemperature: { type: Number, default: 850 },
  targetTemperature: { type: Number, default: 850 },
  steamPressure: Number,
  turbineRPM: Number,
  energyOutput: { type: Number, default: 0 },
  maxEnergyOutput: { type: Number, default: 10 },
  emissions: {
    co2: Number,
    so2: Number,
    nox: Number,
    pm25: Number,
    dioxins: Number
  },
  emissionLimits: {
    co2: { type: Number, default: 500 },
    so2: { type: Number, default: 50 },
    nox: { type: Number, default: 200 },
    pm25: { type: Number, default: 10 },
    dioxins: { type: Number, default: 0.1 }
  },
  ashOutput: Number,
  waterUsage: Number,
  efficiency: Number,
  status: { type: String, enum: ['running', 'standby', 'maintenance', 'shutdown'] },
  units: [{
    unitId: String,
    status: String,
    load: Number,
    temperature: Number
  }]
}, { timestamps: true });

const KPIHistorySchema = new mongoose.Schema({
  kpiName: { type: String, required: true },
  value: { type: Number, required: true },
  unit: String,
  category: String,
  timestamp: { type: Date, default: Date.now },
  metadata: mongoose.Schema.Types.Mixed
});

KPIHistorySchema.index({ kpiName: 1, timestamp: -1 });
KPIHistorySchema.index({ timestamp: -1 });

const WorkOrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['collection', 'maintenance', 'cleanup', 'inspection', 'emergency', 'route_optimization'] },
  title: String,
  description: String,
  priority: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
  status: { type: String, enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  assignedTo: String,
  zone: String,
  relatedAssets: [String],
  createdBy: String,
  completedAt: Date,
  estimatedDuration: Number,
  actualDuration: Number,
  notes: String
}, { timestamps: true });

const AdvisorySchema = new mongoose.Schema({
  advisoryId: { type: String, required: true, unique: true },
  title: String,
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
  category: String,
  systemState: mongoose.Schema.Types.Mixed,
  rootCause: {
    immediate: String,
    secondary: String,
    systemLevel: String
  },
  evidence: [{
    metric: String,
    value: mongoose.Schema.Types.Mixed,
    trend: String,
    significance: String
  }],
  recommendations: {
    immediate: [String],
    shortTerm: [String],
    longTerm: [String]
  },
  impact: {
    quantifiedImprovement: String,
    tradeoffs: [String],
    riskReduction: String
  },
  actions: [{
    type: String,
    label: String,
    endpoint: String,
    payload: mongoose.Schema.Types.Mixed,
    executed: { type: Boolean, default: false },
    executedAt: Date
  }],
  acknowledged: { type: Boolean, default: false },
  expiresAt: Date
}, { timestamps: true });

module.exports = {
  User: mongoose.model('User', UserSchema),
  Alert: mongoose.model('Alert', AlertSchema),
  SmartBin: mongoose.model('SmartBin', SmartBinSchema),
  Vehicle: mongoose.model('Vehicle', VehicleSchema),
  Zone: mongoose.model('Zone', ZoneSchema),
  Facility: mongoose.model('Facility', FacilitySchema),
  WTEPlant: mongoose.model('WTEPlant', WTEPlantSchema),
  KPIHistory: mongoose.model('KPIHistory', KPIHistorySchema),
  WorkOrder: mongoose.model('WorkOrder', WorkOrderSchema),
  Advisory: mongoose.model('Advisory', AdvisorySchema)
};
