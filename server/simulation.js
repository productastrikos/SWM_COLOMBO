// ============================================================================
// COLOMBO WASTE MANAGEMENT - ADVANCED DATA SIMULATION ENGINE
// Models real-world waste management patterns for the Colombo Region
// ============================================================================

const { v4: uuidv4 } = require('uuid');

// ============================================================================
// COLOMBO RESEARCH-BASED CONSTANTS
// ============================================================================
const COLOMBO_CONFIG = {
  // Colombo Metropolitan Region generates ~1,400 tons/day
  // Colombo city proper: ~700 tons/day, suburbs: ~700 tons/day
  dailyWasteGeneration: { base: 1400, variance: 200 },
  population: 752993, // Colombo city
  metroPopulation: 5648000, // Greater Colombo
  area: 37.31, // sq km city proper

  // Waste composition (Sri Lanka national averages adjusted for Colombo urban)
  wasteComposition: {
    organic: 0.62,
    plastic: 0.12,
    paper: 0.09,
    metal: 0.03,
    glass: 0.04,
    hazardous: 0.02,
    other: 0.08
  },

  // Kerawalapitiya WTE Plant
  wtePlant: {
    name: 'Kerawalapitiya Waste-to-Energy Plant',
    capacity: 500, // tons/day design capacity
    energyCapacity: 10, // MW
    efficiency: 0.78,
    location: { lat: 6.9578, lng: 79.8882 }
  },

  // Key facilities
  landfills: [
    { name: 'Aruwakkalu Sanitary Landfill', capacity: 2400000, lat: 7.9333, lng: 79.8167, dailyCapacity: 800 },
    { name: 'Karadiyana Disposal Site', capacity: 500000, lat: 6.8131, lng: 79.9042, dailyCapacity: 300 }
  ],

  transferStations: [
    { name: 'Bloemendhal Transfer Station', lat: 6.9499, lng: 79.8663 },
    { name: 'Wellawatte Transfer Station', lat: 6.8747, lng: 79.8614 },
    { name: 'Borella Transfer Station', lat: 6.9147, lng: 79.8780 }
  ],

  recyclingCenters: [
    { name: 'Colombo Recycling Center - Mattakkuliya', lat: 6.9621, lng: 79.8598 },
    { name: 'Southern Recycling Hub - Mt. Lavinia', lat: 6.8278, lng: 79.8656 }
  ],

  // 15 Collection zones based on Colombo's municipal wards
  zones: [
    { id: 'Z01', name: 'Fort & Pettah', type: 'commercial', pop: 28500, area: 2.1, lat: 6.9340, lng: 79.8428, wasteRate: 85, illegalDumping: 'medium' },
    { id: 'Z02', name: 'Slave Island & Kompannavidiya', type: 'mixed', pop: 42000, area: 2.8, lat: 6.9250, lng: 79.8500, wasteRate: 72, illegalDumping: 'high' },
    { id: 'Z03', name: 'Kollupitiya & Bambalapitiya', type: 'commercial', pop: 55000, area: 3.5, lat: 6.9060, lng: 79.8520, wasteRate: 95, illegalDumping: 'low' },
    { id: 'Z04', name: 'Wellawatte & Dehiwela North', type: 'residential', pop: 68000, area: 4.2, lat: 6.8740, lng: 79.8600, wasteRate: 65, illegalDumping: 'medium' },
    { id: 'Z05', name: 'Havelock Town & Kirulapone', type: 'residential', pop: 52000, area: 3.8, lat: 6.8900, lng: 79.8700, wasteRate: 58, illegalDumping: 'low' },
    { id: 'Z06', name: 'Borella & Narahenpita', type: 'mixed', pop: 63000, area: 4.0, lat: 6.9150, lng: 79.8780, wasteRate: 70, illegalDumping: 'medium' },
    { id: 'Z07', name: 'Cinnamon Gardens & Independence Sq', type: 'commercial', pop: 31000, area: 2.5, lat: 6.9100, lng: 79.8620, wasteRate: 110, illegalDumping: 'low' },
    { id: 'Z08', name: 'Maradana & Dematagoda', type: 'mixed', pop: 72000, area: 3.2, lat: 6.9350, lng: 79.8700, wasteRate: 68, illegalDumping: 'high' },
    { id: 'Z09', name: 'Kotahena & Bloemendhal', type: 'residential', pop: 85000, area: 3.5, lat: 6.9500, lng: 79.8650, wasteRate: 62, illegalDumping: 'high' },
    { id: 'Z10', name: 'Mattakkuliya & Modara', type: 'industrial', pop: 58000, area: 3.0, lat: 6.9600, lng: 79.8600, wasteRate: 88, illegalDumping: 'high' },
    { id: 'Z11', name: 'Grandpass & Aluthkade', type: 'mixed', pop: 49000, area: 2.7, lat: 6.9450, lng: 79.8550, wasteRate: 66, illegalDumping: 'medium' },
    { id: 'Z12', name: 'Nugegoda & Gangodawila', type: 'residential', pop: 72000, area: 5.0, lat: 6.8700, lng: 79.8900, wasteRate: 55, illegalDumping: 'low' },
    { id: 'Z13', name: 'Maharagama & Kottawa', type: 'residential', pop: 95000, area: 8.0, lat: 6.8450, lng: 79.9200, wasteRate: 48, illegalDumping: 'medium' },
    { id: 'Z14', name: 'Rajagiriya & Battaramulla', type: 'mixed', pop: 67000, area: 6.5, lat: 6.9100, lng: 79.9100, wasteRate: 60, illegalDumping: 'low' },
    { id: 'Z15', name: 'Moratuwa & Ratmalana', type: 'mixed', pop: 82000, area: 7.0, lat: 6.7800, lng: 79.8800, wasteRate: 56, illegalDumping: 'medium' }
  ],

  // Time patterns (multipliers)
  hourlyPattern: {
    0: 0.15, 1: 0.10, 2: 0.08, 3: 0.05, 4: 0.05, 5: 0.12,
    6: 0.35, 7: 0.65, 8: 0.85, 9: 1.0, 10: 0.95, 11: 0.90,
    12: 0.85, 13: 0.80, 14: 0.75, 15: 0.70, 16: 0.65, 17: 0.70,
    18: 0.80, 19: 0.75, 20: 0.55, 21: 0.40, 22: 0.30, 23: 0.20
  },

  // Day of week multiplier (0=Sunday)
  dailyPattern: {
    0: 0.70, 1: 1.10, 2: 1.05, 3: 1.00, 4: 1.05, 5: 1.15, 6: 0.80
  },

  // Monthly seasonal multiplier (0=Jan, 11=Dec)
  monthlyPattern: {
    0: 0.95, 1: 0.90, 2: 0.92, 3: 1.05, 4: 1.10, 5: 0.95,
    6: 0.88, 7: 0.90, 8: 0.92, 9: 0.98, 10: 1.05, 11: 1.15
  },

  // Traffic congestion by hour (affects collection timing)
  trafficPattern: {
    0: 0.1, 1: 0.05, 2: 0.05, 3: 0.05, 4: 0.1, 5: 0.2,
    6: 0.4, 7: 0.75, 8: 0.95, 9: 0.80, 10: 0.55, 11: 0.50,
    12: 0.55, 13: 0.50, 14: 0.55, 15: 0.65, 16: 0.80, 17: 0.95,
    18: 0.85, 19: 0.60, 20: 0.40, 21: 0.30, 22: 0.20, 23: 0.15
  },

  // Sri Lankan festivals that increase waste (month-day)
  festivals: [
    { name: 'Sinhala & Tamil New Year', month: 3, day: 14, duration: 3, multiplier: 1.65 },
    { name: 'Vesak', month: 4, day: 23, duration: 2, multiplier: 1.45 },
    { name: 'Poson', month: 5, day: 20, duration: 1, multiplier: 1.25 },
    { name: 'Kandy Esala Perahera', month: 7, day: 15, duration: 10, multiplier: 1.15 },
    { name: 'Christmas Season', month: 11, day: 20, duration: 15, multiplier: 1.40 },
    { name: 'Independence Day', month: 1, day: 4, duration: 1, multiplier: 1.10 }
  ],

  weather: {
    // Southwest monsoon May-September
    // Northeast monsoon December-February
    rainyMonths: [4, 5, 6, 7, 8, 10, 11],
    avgTemp: { min: 24, max: 32 },
    avgHumidity: { min: 65, max: 90 }
  }
};

// ============================================================================
// NOISE & RANDOM UTILITY FUNCTIONS
// ============================================================================
class NoiseGenerator {
  constructor(seed = Date.now()) {
    this.seed = seed;
  }

  // Seeded pseudo-random
  random() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  // Gaussian noise
  gaussian(mean = 0, stddev = 1) {
    let u1 = Math.random();
    let u2 = Math.random();
    let z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stddev;
  }

  // Perlin-like smooth noise for time series
  smoothNoise(t, frequency = 1) {
    const t0 = Math.floor(t * frequency);
    const t1 = t0 + 1;
    const frac = (t * frequency) - t0;
    const smooth = frac * frac * (3 - 2 * frac); // smoothstep
    const v0 = this.hashFloat(t0);
    const v1 = this.hashFloat(t1);
    return v0 + smooth * (v1 - v0);
  }

  hashFloat(n) {
    let x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  // Bounded random
  range(min, max) {
    return min + Math.random() * (max - min);
  }

  // Random integer
  rangeInt(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  // Weighted random selection
  weightedChoice(options, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < options.length; i++) {
      r -= weights[i];
      if (r <= 0) return options[i];
    }
    return options[options.length - 1];
  }
}

const noise = new NoiseGenerator();

// ============================================================================
// STATE MANAGEMENT - Tracks all simulation state
// ============================================================================
class SimulationState {
  constructor() {
    this.startTime = Date.now();
    this.tickCount = 0;
    this.bins = new Map();
    this.vehicles = new Map();
    this.zones = new Map();
    this.facilities = new Map();
    this.wtePlant = null;
    this.kpis = {};
    this.alerts = [];
    this.advisories = [];
    this.workOrders = [];
    this.events = [];
    this.weather = { condition: 'clear', temperature: 28, humidity: 72, rainfall: 0, windSpeed: 12 };
    this.trendFactors = {
      wasteGrowth: 1.0,
      recyclingImprovement: 1.0,
      collectionEfficiency: 1.0,
      landfillPressure: 1.0
    };
    this.initialized = false;
  }
}

const state = new SimulationState();

// ============================================================================
// INITIALIZATION - Generate all assets with real Colombo data
// ============================================================================
function initializeSimulation() {
  if (state.initialized) return state;

  // Initialize zones
  COLOMBO_CONFIG.zones.forEach(z => {
    state.zones.set(z.id, {
      ...z,
      currentWaste: 0,
      collectedToday: 0,
      missedCollections: 0,
      segregationRate: noise.range(55, 74),
      collectionEfficiency: noise.range(95.5, 98.2),
      citizenComplaints: 0,
      lastUpdated: new Date()
    });
  });

  // Initialize smart bins (20-40 per zone)
  let binCount = 0;
  state.zones.forEach((zone, zoneId) => {
    const numBins = Math.floor(noise.range(20, 40));
    for (let i = 0; i < numBins; i++) {
      const binId = `BIN-${zoneId}-${String(i + 1).padStart(3, '0')}`;
      const types = ['general', 'organic', 'recyclable', 'hazardous'];
      const typeWeights = [0.4, 0.3, 0.25, 0.05];
      const binType = noise.weightedChoice(types, typeWeights);

      state.bins.set(binId, {
        binId,
        location: {
          lat: zone.lat + noise.range(-0.008, 0.008),
          lng: zone.lng + noise.range(-0.008, 0.008),
          zone: zoneId,
          ward: zone.name
        },
        type: binType,
        capacity: binType === 'hazardous' ? 240 : noise.weightedChoice([660, 1100, 2200], [0.3, 0.5, 0.2]),
        currentFillLevel: noise.range(5, 45),
        temperature: noise.range(26, 34),
        humidity: noise.range(60, 88),
        batteryLevel: noise.range(45, 100),
        lastCollection: new Date(Date.now() - noise.range(3600000, 86400000)),
        status: noise.weightedChoice(['active', 'active', 'active', 'maintenance', 'offline'], [0.8, 0.05, 0.05, 0.07, 0.03]),
        fillRate: noise.range(0.5, 3.5), // % per hour base rate
        wasteComposition: generateWasteComposition(binType)
      });
      binCount++;
    }
  });

  // Initialize vehicles (45 collection vehicles)
  const vehicleTypes = [
    { type: 'compactor', count: 20, capacity: 12000 },
    { type: 'tipper', count: 10, capacity: 8000 },
    { type: 'hook_loader', count: 5, capacity: 15000 },
    { type: 'mini_truck', count: 8, capacity: 3000 },
    { type: 'sweeper', count: 2, capacity: 2000 }
  ];

  const driverNames = [
    'Kamal Perera', 'Nimal Fernando', 'Sunil Rathnayake', 'Pradeep Silva', 'Roshan Jayawardena',
    'Asanka De Silva', 'Chaminda Bandara', 'Dinesh Kumara', 'Eranga Wickramasinghe', 'Faisal Ismail',
    'Gamini Dissanayake', 'Harsha Abeywickrama', 'Isuru Navarathna', 'Janaka Maheepala', 'Kapila Weerasinghe',
    'Lakshan Gunawardena', 'Mahesh Abeykoon', 'Nalin Samaraweera', 'Palitha Ranasinghe', 'Ravindu Karunaratne',
    'Sampath Thilakarathna', 'Tharaka Liyanage', 'Upul Tharanga', 'Viraj Mendis', 'Wasantha Kumara',
    'Amal Fonseka', 'Buddhika Pathirana', 'Chathura Atapattu', 'Dasun Shanaka', 'Eshan Wijeratne',
    'Gayan Wickramasekara', 'Hasitha Boyagoda', 'Ishan Malalgoda', 'Jayantha Premadasa', 'Kasun Thirimanne',
    'Lasith Embuldeniya', 'Minod Bhanuka', 'Niroshan Dickwella', 'Oshada Fernando', 'Pathum Nissanka'
  ];

  let driverIdx = 0;
  const zoneIds = Array.from(state.zones.keys());

  vehicleTypes.forEach(vt => {
    for (let i = 0; i < vt.count; i++) {
      const vehicleId = `VEH-${vt.type.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;
      const assignedZone = zoneIds[driverIdx % zoneIds.length];
      const zoneData = state.zones.get(assignedZone);

      state.vehicles.set(vehicleId, {
        vehicleId,
        registrationNo: `WP-${noise.weightedChoice(['CA', 'CB', 'KC', 'KD'], [0.3, 0.3, 0.2, 0.2])}-${noise.rangeInt(1000, 9999)}`,
        type: vt.type,
        capacity: vt.capacity,
        currentLoad: noise.range(0, vt.capacity * 0.3),
        status: noise.weightedChoice(['active', 'idle', 'maintenance', 'returning'], [0.56, 0.25, 0.06, 0.13]),
        driver: {
          name: driverNames[driverIdx % driverNames.length],
          employeeId: `EMP-${String(driverIdx + 1).padStart(4, '0')}`,
          contact: `+94 7${noise.rangeInt(1, 9)} ${noise.rangeInt(100, 999)} ${noise.rangeInt(1000, 9999)}`
        },
        currentLocation: {
          lat: zoneData.lat + noise.range(-0.005, 0.005),
          lng: zoneData.lng + noise.range(-0.005, 0.005)
        },
        route: {
          routeId: `RT-${assignedZone}-${i}`,
          zone: assignedZone,
          progress: noise.range(0, 80),
          totalStops: noise.rangeInt(15, 35),
          completedStops: 0
        },
        fuelLevel: noise.range(30, 100),
        speed: 0,
        mileage: noise.range(15000, 120000),
        engineTemp: noise.range(75, 95),
        lastMaintenance: new Date(Date.now() - noise.range(86400000 * 5, 86400000 * 30)),
        telemetry: {
          rpm: 0,
          oilPressure: noise.range(25, 65),
          tirePressure: [noise.range(30, 36), noise.range(30, 36), noise.range(30, 36), noise.range(30, 36)],
          brakeHealth: noise.range(60, 100)
        }
      });
      driverIdx++;
    }
  });

  // Initialize facilities
  COLOMBO_CONFIG.landfills.forEach((lf, i) => {
    const facilityId = `FAC-LF-${String(i + 1).padStart(2, '0')}`;
    state.facilities.set(facilityId, {
      facilityId,
      name: lf.name,
      type: 'landfill',
      location: { lat: lf.lat, lng: lf.lng },
      totalCapacity: lf.capacity,
      usedCapacity: lf.capacity * noise.range(0.35, 0.58),
      dailyCapacity: lf.dailyCapacity,
      currentDailyIntake: 0,
      status: 'operational',
      leachateLevel: noise.range(20, 60),
      methaneCapture: noise.range(40, 70),
      remainingLifeYears: noise.range(3, 12),
      compactionRatio: noise.range(2.5, 4.0)
    });
  });

  COLOMBO_CONFIG.transferStations.forEach((ts, i) => {
    const facilityId = `FAC-TS-${String(i + 1).padStart(2, '0')}`;
    state.facilities.set(facilityId, {
      facilityId,
      name: ts.name,
      type: 'transfer_station',
      location: { lat: ts.lat, lng: ts.lng },
      capacity: noise.range(150, 300),
      currentLoad: 0,
      throughput: 0,
      vehiclesProcessed: 0,
      status: 'operational',
      queueLength: noise.rangeInt(0, 5)
    });
  });

  COLOMBO_CONFIG.recyclingCenters.forEach((rc, i) => {
    const facilityId = `FAC-RC-${String(i + 1).padStart(2, '0')}`;
    state.facilities.set(facilityId, {
      facilityId,
      name: rc.name,
      type: 'recycling_center',
      location: { lat: rc.lat, lng: rc.lng },
      capacity: noise.range(80, 200),
      currentLoad: 0,
      dailyProcessed: noise.range(145, 225),
      recoveryRate: noise.range(55, 78),
      materialsSorted: {
        plastic: 0, paper: 0, metal: 0, glass: 0, ewaste: 0
      },
      status: 'operational'
    });
  });

  // Initialize WTE Plant
  state.wtePlant = {
    plantId: 'WTE-KWP-001',
    name: COLOMBO_CONFIG.wtePlant.name,
    location: COLOMBO_CONFIG.wtePlant.location,
    designCapacity: COLOMBO_CONFIG.wtePlant.capacity,
    currentIntake: noise.range(200, 400),
    furnaceTemp: noise.range(830, 880),
    targetTemp: 850,
    steamPressure: noise.range(38, 45),
    turbineRPM: noise.range(2950, 3050),
    energyOutput: noise.range(5, 8),
    maxEnergyOutput: COLOMBO_CONFIG.wtePlant.energyCapacity,
    efficiency: noise.range(72, 82),
    emissions: {
      co2: noise.range(180, 320),
      so2: noise.range(15, 35),
      nox: noise.range(80, 150),
      pm25: noise.range(3, 7),
      dioxins: noise.range(0.01, 0.06)
    },
    emissionLimits: { co2: 500, so2: 50, nox: 200, pm25: 10, dioxins: 0.1 },
    ashOutput: noise.range(40, 80),
    waterUsage: noise.range(800, 1200),
    status: 'running',
    units: [
      { unitId: 'WTE-U1', status: 'running', load: noise.range(70, 95), temperature: noise.range(840, 870) },
      { unitId: 'WTE-U2', status: 'running', load: noise.range(65, 90), temperature: noise.range(835, 865) }
    ],
    dailyEnergyGenerated: noise.range(100, 180),
    totalWasteProcessed: noise.range(150000, 250000),
    uptime: noise.range(92, 98)
  };

  // Initialize KPIs
  state.kpis = generateCurrentKPIs();

  // Generate initial historical data
  state.historicalKPIs = generateHistoricalData();

  state.initialized = true;
  console.log(`[SimEngine] Initialized: ${state.bins.size} bins, ${state.vehicles.size} vehicles, ${state.zones.size} zones, ${state.facilities.size} facilities`);
  return state;
}

// ============================================================================
// WASTE COMPOSITION GENERATION
// ============================================================================
function generateWasteComposition(binType) {
  if (binType === 'organic') {
    return { organic: noise.range(75, 90), plastic: noise.range(2, 8), paper: noise.range(2, 5), metal: noise.range(0, 2), glass: noise.range(0, 2), hazardous: 0, other: noise.range(2, 8) };
  }
  if (binType === 'recyclable') {
    return { organic: noise.range(5, 15), plastic: noise.range(25, 40), paper: noise.range(20, 35), metal: noise.range(8, 15), glass: noise.range(10, 20), hazardous: 0, other: noise.range(2, 5) };
  }
  if (binType === 'hazardous') {
    return { organic: noise.range(0, 5), plastic: noise.range(5, 15), paper: noise.range(2, 8), metal: noise.range(5, 10), glass: noise.range(5, 10), hazardous: noise.range(50, 75), other: noise.range(5, 15) };
  }
  return { ...COLOMBO_CONFIG.wasteComposition };
}

// ============================================================================
// TIME-BASED MULTIPLIERS
// ============================================================================
function getTimeMultiplier() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const month = now.getMonth();

  let mult = COLOMBO_CONFIG.hourlyPattern[hour] || 0.5;
  mult *= COLOMBO_CONFIG.dailyPattern[day] || 1.0;
  mult *= COLOMBO_CONFIG.monthlyPattern[month] || 1.0;

  // Check for festivals
  COLOMBO_CONFIG.festivals.forEach(f => {
    if (now.getMonth() === f.month && Math.abs(now.getDate() - f.day) <= f.duration) {
      mult *= f.multiplier;
    }
  });

  // Weather impact
  if (state.weather.condition === 'heavy_rain') mult *= 0.7;
  else if (state.weather.condition === 'rain') mult *= 0.85;
  else if (state.weather.condition === 'storm') mult *= 0.5;

  return mult;
}

function getTrafficMultiplier() {
  const hour = new Date().getHours();
  return COLOMBO_CONFIG.trafficPattern[hour] || 0.3;
}

// ============================================================================
// CORE SIMULATION TICK - Called every 5-15 seconds
// ============================================================================
function simulationTick() {
  state.tickCount++;
  const timeMult = getTimeMultiplier();
  const trafficMult = getTrafficMultiplier();
  const tickMinutes = 1; // Each tick simulates ~1 minute of real time (accelerated)

  // Update weather periodically
  if (state.tickCount % 60 === 0) updateWeather();

  // Update trend factors slowly
  if (state.tickCount % 300 === 0) updateTrends();

  // ---- UPDATE BINS ----
  state.bins.forEach((bin, binId) => {
    if (bin.status === 'offline') return;

    // Fill rate affected by time, zone type, and weather
    const zone = state.zones.get(bin.location.zone);
    const zoneTypeMult = zone?.type === 'commercial' ? 1.3 :
                          zone?.type === 'industrial' ? 1.5 :
                          zone?.type === 'mixed' ? 1.1 : 1.0;

    const fillIncrement = bin.fillRate * timeMult * zoneTypeMult * tickMinutes / 60;
    const randomJitter = noise.gaussian(0, fillIncrement * 0.15);

    bin.currentFillLevel = Math.min(100, Math.max(0, bin.currentFillLevel + fillIncrement + randomJitter));

    // Temperature variation
    bin.temperature = Math.max(20, Math.min(42, bin.temperature + noise.gaussian(0, 0.3)));
    bin.humidity = Math.max(40, Math.min(98, bin.humidity + noise.gaussian(0, 0.5)));

    // Battery drain
    bin.batteryLevel = Math.max(0, bin.batteryLevel - noise.range(0, 0.02));

    // Status updates
    if (bin.currentFillLevel >= 90) {
      bin.status = 'overflow';
    } else if (bin.batteryLevel < 10) {
      bin.status = 'offline';
    } else if (bin.status === 'overflow' && bin.currentFillLevel < 90) {
      bin.status = 'active';
    }
  });

  // ---- UPDATE VEHICLES ----
  state.vehicles.forEach((vehicle, vehicleId) => {
    if (vehicle.status === 'maintenance' || vehicle.status === 'breakdown') {
      // Small chance of returning from maintenance
      if (Math.random() < 0.005) {
        vehicle.status = 'idle';
        vehicle.fuelLevel = 100;
      }
      return;
    }

    if (vehicle.status === 'active') {
      // Simulate movement
      const speedFactor = 1 - (trafficMult * 0.6); // Higher traffic = slower
      vehicle.speed = Math.max(5, noise.range(15, 40) * speedFactor);

      // Move toward next waypoint
      const zone = state.zones.get(vehicle.route.zone);
      if (zone) {
        const wobble = 0.0003;
        vehicle.currentLocation.lat += noise.gaussian(0, wobble);
        vehicle.currentLocation.lng += noise.gaussian(0, wobble);

        // Keep within zone bounds
        vehicle.currentLocation.lat = Math.max(zone.lat - 0.01, Math.min(zone.lat + 0.01, vehicle.currentLocation.lat));
        vehicle.currentLocation.lng = Math.max(zone.lng - 0.01, Math.min(zone.lng + 0.01, vehicle.currentLocation.lng));
      }

      // Progress route
      vehicle.route.progress = Math.min(100, vehicle.route.progress + noise.range(0.1, 0.8) * speedFactor);

      // Fuel consumption
      vehicle.fuelLevel = Math.max(0, vehicle.fuelLevel - noise.range(0.01, 0.05));

      // Load changes (collecting waste)
      if (Math.random() < 0.15) {
        vehicle.currentLoad = Math.min(vehicle.capacity, vehicle.currentLoad + noise.range(50, 300));
      }

      // Engine telemetry
      vehicle.engineTemp = Math.max(70, Math.min(110, vehicle.engineTemp + noise.gaussian(0, 0.5)));
      vehicle.telemetry.rpm = noise.range(1200, 2800);

      // Chance of breakdown
      if (Math.random() < 0.0002) {
        vehicle.status = 'breakdown';
        vehicle.speed = 0;
        generateAlert('warning', 'vehicle_breakdown', `Vehicle ${vehicle.registrationNo} breakdown`, `Vehicle ${vehicle.registrationNo} has reported a breakdown in ${zone?.name || 'unknown zone'}`, vehicle.route.zone, vehicleId, 'vehicle');
      }

      // Return to depot when full or route complete
      if (vehicle.route.progress >= 95 || vehicle.currentLoad >= vehicle.capacity * 0.9) {
        vehicle.status = 'returning';
      }
    } else if (vehicle.status === 'returning') {
      vehicle.speed = noise.range(20, 45) * (1 - trafficMult * 0.4);
      vehicle.route.progress = Math.min(100, vehicle.route.progress + 0.5);

      if (vehicle.route.progress >= 100) {
        // Unload at transfer station
        vehicle.status = 'idle';
        vehicle.currentLoad = 0;
        vehicle.route.progress = 0;
        vehicle.speed = 0;

        // Update transfer station load
        const transferStations = Array.from(state.facilities.values()).filter(f => f.type === 'transfer_station');
        if (transferStations.length > 0) {
          const ts = transferStations[Math.floor(Math.random() * transferStations.length)];
          ts.currentLoad = Math.min(ts.capacity, ts.currentLoad + vehicle.currentLoad * 0.001);
          ts.vehiclesProcessed++;
        }
      }
    } else if (vehicle.status === 'idle') {
      vehicle.speed = 0;
      vehicle.telemetry.rpm = 0;

      // Start new route based on time
      const hour = new Date().getHours();
      if (hour >= 5 && hour <= 18 && Math.random() < 0.03) {
        vehicle.status = 'active';
        vehicle.route.progress = 0;
        // Assign to zone with highest bin fill levels
        const zones = Array.from(state.zones.entries());
        const targetZone = zones[Math.floor(Math.random() * zones.length)];
        vehicle.route.zone = targetZone[0];
        const zoneData = targetZone[1];
        vehicle.currentLocation = { lat: zoneData.lat + noise.range(-0.003, 0.003), lng: zoneData.lng + noise.range(-0.003, 0.003) };
      }
    }
  });

  // ---- UPDATE FACILITIES ----
  state.facilities.forEach((facility, facilityId) => {
    if (facility.type === 'landfill') {
      const dailyRate = facility.dailyCapacity * timeMult * noise.range(0.7, 1.0);
      facility.currentDailyIntake = dailyRate;
      facility.usedCapacity += dailyRate * (tickMinutes / 1440) * state.trendFactors.landfillPressure;
      facility.leachateLevel = Math.max(10, Math.min(95, facility.leachateLevel + noise.gaussian(0, 0.3)));
      facility.methaneCapture = Math.max(30, Math.min(85, facility.methaneCapture + noise.gaussian(0, 0.2)));

      const utilizationPct = (facility.usedCapacity / facility.totalCapacity) * 100;
      if (utilizationPct > 90) facility.status = 'at_capacity';
    }

    if (facility.type === 'transfer_station') {
      // Throughput processing
      if (facility.currentLoad > 0) {
        const processed = Math.min(facility.currentLoad, noise.range(2, 8));
        facility.currentLoad = Math.max(0, facility.currentLoad - processed);
        facility.throughput += processed;
      }
      facility.queueLength = Math.max(0, Math.min(15, facility.queueLength + noise.rangeInt(-1, 2)));
    }

    if (facility.type === 'recycling_center') {
      facility.dailyProcessed += noise.range(0.1, 0.5) * timeMult;
      facility.recoveryRate = Math.max(45, Math.min(90, facility.recoveryRate + noise.gaussian(0, 0.1)));
      facility.materialsSorted.plastic += noise.range(0.01, 0.1);
      facility.materialsSorted.paper += noise.range(0.01, 0.08);
      facility.materialsSorted.metal += noise.range(0.005, 0.05);
      facility.materialsSorted.glass += noise.range(0.005, 0.04);
    }
  });

  // ---- UPDATE WTE PLANT ----
  if (state.wtePlant && state.wtePlant.status === 'running') {
    const wte = state.wtePlant;
    wte.currentIntake = Math.max(100, Math.min(wte.designCapacity, wte.currentIntake + noise.gaussian(0, 5)));
    wte.furnaceTemp = Math.max(750, Math.min(950, wte.furnaceTemp + noise.gaussian(0, 3)));
    wte.steamPressure = Math.max(30, Math.min(50, wte.steamPressure + noise.gaussian(0, 0.5)));
    wte.turbineRPM = Math.max(2800, Math.min(3200, wte.turbineRPM + noise.gaussian(0, 10)));
    wte.energyOutput = Math.max(2, Math.min(wte.maxEnergyOutput, wte.energyOutput + noise.gaussian(0, 0.2)));
    wte.efficiency = Math.max(65, Math.min(92, wte.efficiency + noise.gaussian(0, 0.1)));
    wte.ashOutput = Math.max(20, Math.min(120, wte.ashOutput + noise.gaussian(0, 1)));
    wte.waterUsage = Math.max(500, Math.min(1500, wte.waterUsage + noise.gaussian(0, 5)));

    // Emissions
    wte.emissions.co2 = Math.max(100, Math.min(480, wte.emissions.co2 + noise.gaussian(0, 3)));
    wte.emissions.so2 = Math.max(5, Math.min(48, wte.emissions.so2 + noise.gaussian(0, 0.5)));
    wte.emissions.nox = Math.max(40, Math.min(195, wte.emissions.nox + noise.gaussian(0, 2)));
    wte.emissions.pm25 = Math.max(1, Math.min(9.5, wte.emissions.pm25 + noise.gaussian(0, 0.2)));
    wte.emissions.dioxins = Math.max(0.005, Math.min(0.09, wte.emissions.dioxins + noise.gaussian(0, 0.003)));

    // Unit updates
    wte.units.forEach(unit => {
      unit.load = Math.max(40, Math.min(100, unit.load + noise.gaussian(0, 1)));
      unit.temperature = Math.max(780, Math.min(920, unit.temperature + noise.gaussian(0, 2)));
    });

    wte.dailyEnergyGenerated += wte.energyOutput * (tickMinutes / 60);
    wte.totalWasteProcessed += wte.currentIntake * (tickMinutes / 1440);

    // Emission alerts
    Object.keys(wte.emissions).forEach(key => {
      if (wte.emissions[key] > wte.emissionLimits[key] * 0.85) {
        generateAlert('warning', 'emission_alert', `WTE ${key.toUpperCase()} emission high`, `${key.toUpperCase()} at ${wte.emissions[key].toFixed(1)} approaching limit of ${wte.emissionLimits[key]}`, null, wte.plantId, 'wte_plant');
      }
    });
  }

  // ---- UPDATE ZONE STATISTICS ----
  state.zones.forEach((zone, zoneId) => {
    const zoneBins = Array.from(state.bins.values()).filter(b => b.location.zone === zoneId);
    const avgFill = zoneBins.reduce((s, b) => s + b.currentFillLevel, 0) / (zoneBins.length || 1);
    const overflowBins = zoneBins.filter(b => b.currentFillLevel >= 85).length;

    zone.avgFillLevel = avgFill;
    zone.overflowBins = overflowBins;
    zone.totalBins = zoneBins.length;
    zone.currentWaste += zone.wasteRate * timeMult * (tickMinutes / 1440);
    zone.segregationRate = Math.max(20, Math.min(85, zone.segregationRate + noise.gaussian(0, 0.1)));
    zone.collectionEfficiency = Math.max(55, Math.min(98, zone.collectionEfficiency + noise.gaussian(0, 0.1)));

    if (overflowBins > zoneBins.length * 0.3) {
      generateAlert('critical', 'bin_overflow', `Multiple bins overflowing in ${zone.name}`, `${overflowBins} of ${zoneBins.length} bins above 85% capacity in ${zone.name}`, zoneId, null, 'zone');
    }
  });

  // ---- GENERATE KPIs ----
  state.kpis = generateCurrentKPIs();

  // ---- DYNAMIC EVENTS ----
  if (Math.random() < 0.008) generateRandomEvent();

  return getSimulationSnapshot();
}

// ============================================================================
// KPI GENERATION
// ============================================================================
function generateCurrentKPIs() {
  const allBins = Array.from(state.bins.values());
  const allVehicles = Array.from(state.vehicles.values());
  const allFacilities = Array.from(state.facilities.values());
  const timeMult = getTimeMultiplier();

  const activeBins = allBins.filter(b => b.status !== 'offline');
  const avgFillLevel = activeBins.reduce((s, b) => s + b.currentFillLevel, 0) / (activeBins.length || 1);
  const overflowBins = activeBins.filter(b => b.currentFillLevel >= 85).length;
  const activeVehicles = allVehicles.filter(v => v.status === 'active' || v.status === 'returning').length;
  const breakdownVehicles = allVehicles.filter(v => v.status === 'breakdown').length;

  const landfills = allFacilities.filter(f => f.type === 'landfill');
  const totalLandfillUsed = landfills.reduce((s, l) => s + (l.usedCapacity || 0), 0);
  const totalLandfillCapacity = landfills.reduce((s, l) => s + (l.totalCapacity || 0), 0);

  const recyclingCenters = allFacilities.filter(f => f.type === 'recycling_center');
  const totalRecycled = recyclingCenters.reduce((s, r) => s + (r.dailyProcessed || 0), 0);

  const zones = Array.from(state.zones.values());
  const avgSegregation = zones.reduce((s, z) => s + z.segregationRate, 0) / (zones.length || 1);
  const avgCollectionEff = zones.reduce((s, z) => s + z.collectionEfficiency, 0) / (zones.length || 1);

  const totalDailyWaste = COLOMBO_CONFIG.dailyWasteGeneration.base * timeMult + noise.gaussian(0, 30);
  const wasteCollected = totalDailyWaste * (avgCollectionEff / 100);
  const wasteDiverted = totalDailyWaste * (avgSegregation / 100) * 0.6;

  return {
    // Primary KPIs
    totalDailyWaste: { value: Math.round(totalDailyWaste), unit: 'tons/day', trend: noise.range(-3, 3), status: totalDailyWaste > 1500 ? 'warning' : 'normal' },
    collectionRate: { value: Math.round(avgCollectionEff * 10) / 10, unit: '%', trend: noise.range(-1, 2), status: avgCollectionEff < 82 ? 'critical' : avgCollectionEff < 90 ? 'warning' : 'good' },
    recyclingRate: { value: Math.round(Math.min(38, Math.max(26, (totalRecycled / Math.max(1, totalDailyWaste)) * 100 + noise.range(4, 8))) * 10) / 10, unit: '%', trend: noise.range(-0.5, 2), status: 'normal' },
    avgBinFillLevel: { value: Math.round(avgFillLevel * 10) / 10, unit: '%', trend: noise.range(-3, 3), status: avgFillLevel > 85 ? 'critical' : avgFillLevel > 70 ? 'warning' : 'good' },
    overflowBins: { value: overflowBins, unit: 'bins', trend: noise.range(-3, 3), status: overflowBins > 20 ? 'critical' : overflowBins > 10 ? 'warning' : 'good' },
    activeVehicles: { value: activeVehicles, unit: 'vehicles', trend: 0, status: activeVehicles < 15 ? 'warning' : 'good' },
    vehicleBreakdowns: { value: breakdownVehicles, unit: 'vehicles', trend: 0, status: breakdownVehicles > 3 ? 'critical' : breakdownVehicles > 1 ? 'warning' : 'good' },
    landfillUtilization: { value: Math.round((totalLandfillUsed / Math.max(1, totalLandfillCapacity)) * 1000) / 10, unit: '%', trend: noise.range(0, 0.5), status: (totalLandfillUsed / totalLandfillCapacity) > 0.85 ? 'critical' : (totalLandfillUsed / totalLandfillCapacity) > 0.7 ? 'warning' : 'normal' },
    wasteSegregation: { value: Math.round(avgSegregation * 10) / 10, unit: '%', trend: noise.range(-0.5, 1.5), status: avgSegregation < 45 ? 'critical' : avgSegregation < 58 ? 'warning' : 'good' },
    wasteDiversion: { value: Math.round(wasteDiverted * 10) / 10, unit: 'tons/day', trend: noise.range(-2, 3), status: 'normal' },
    wteEnergyOutput: { value: state.wtePlant ? Math.round(state.wtePlant.energyOutput * 100) / 100 : 0, unit: 'MW', trend: noise.range(-0.5, 0.5), status: 'good' },
    wteFurnaceTemp: { value: state.wtePlant ? Math.round(state.wtePlant.furnaceTemp) : 0, unit: '°C', trend: noise.range(-5, 5), status: state.wtePlant && (state.wtePlant.furnaceTemp < 800 || state.wtePlant.furnaceTemp > 900) ? 'warning' : 'good' },
    fleetUtilization: { value: Math.round((activeVehicles / Math.max(1, allVehicles.length)) * 1000) / 10, unit: '%', trend: noise.range(-2, 3), status: (activeVehicles / allVehicles.length) < 0.45 ? 'warning' : 'good' },
    citizenComplaints: { value: Math.round(noise.range(5, 35)), unit: 'today', trend: noise.range(-5, 5), status: 'normal' },
    co2Emissions: { value: state.wtePlant ? Math.round(state.wtePlant.emissions.co2) : 0, unit: 'mg/Nm³', trend: noise.range(-5, 5), status: state.wtePlant && state.wtePlant.emissions.co2 > 400 ? 'warning' : 'good' },
    routeOptimization: { value: Math.round(noise.range(72, 92) * 10) / 10, unit: '%', trend: noise.range(-2, 3), status: 'good' },

    // Financial KPIs
    dailyOperatingCost: { value: Math.round(noise.range(1800000, 2500000)), unit: 'LKR', trend: noise.range(-50000, 50000), status: 'normal' },
    costPerTon: { value: Math.round(noise.range(1200, 1800)), unit: 'LKR/ton', trend: noise.range(-50, 50), status: 'normal' },
    revenueFromRecycling: { value: Math.round(noise.range(350000, 650000)), unit: 'LKR/day', trend: noise.range(-20000, 30000), status: 'good' },
    energyRevenue: { value: Math.round(noise.range(450000, 780000)), unit: 'LKR/day', trend: noise.range(-15000, 25000), status: 'good' },

    // Sustainability KPIs
    carbonFootprint: { value: Math.round(noise.range(140, 240)), unit: 'tCO2e/day', trend: noise.range(-5, 2), status: 'normal' },
    circularEconomyIndex: { value: Math.round(noise.range(46, 62) * 10) / 10, unit: '%', trend: noise.range(0, 1.5), status: 'normal' },
    wasteToLandfillReduction: { value: Math.round(noise.range(12, 25) * 10) / 10, unit: '% YoY', trend: noise.range(0, 2), status: 'good' }
  };
}

// ============================================================================
// HISTORICAL DATA GENERATION
// ============================================================================
function generateHistoricalData() {
  const history = { hourly: [], daily: [], monthly: [] };

  // Last 24 hours (hourly)
  for (let h = 23; h >= 0; h--) {
    const timestamp = new Date(Date.now() - h * 3600000);
    const hourMult = COLOMBO_CONFIG.hourlyPattern[timestamp.getHours()] || 0.5;
    history.hourly.push({
      timestamp: timestamp.toISOString(),
      wasteCollected: Math.round(COLOMBO_CONFIG.dailyWasteGeneration.base * hourMult / 24 * noise.range(0.85, 1.15)),
      collectionRate: Math.round(noise.range(72, 95) * 10) / 10,
      recyclingRate: Math.round(noise.range(14, 24) * 10) / 10,
      avgBinFill: Math.round(noise.range(30, 70) * 10) / 10,
      activeVehicles: noise.rangeInt(10, 35),
      energyOutput: Math.round(noise.range(4, 9) * 100) / 100,
      complaints: noise.rangeInt(0, 8)
    });
  }

  // Last 30 days (daily)
  for (let d = 29; d >= 0; d--) {
    const timestamp = new Date(Date.now() - d * 86400000);
    const dayMult = COLOMBO_CONFIG.dailyPattern[timestamp.getDay()] || 1.0;
    const monthMult = COLOMBO_CONFIG.monthlyPattern[timestamp.getMonth()] || 1.0;
    history.daily.push({
      timestamp: timestamp.toISOString(),
      date: timestamp.toLocaleDateString('en-LK'),
      totalWaste: Math.round(COLOMBO_CONFIG.dailyWasteGeneration.base * dayMult * monthMult * noise.range(0.88, 1.12)),
      collected: Math.round(COLOMBO_CONFIG.dailyWasteGeneration.base * dayMult * monthMult * noise.range(0.75, 0.95)),
      recycled: Math.round(COLOMBO_CONFIG.dailyWasteGeneration.base * dayMult * monthMult * noise.range(0.12, 0.22)),
      composted: Math.round(COLOMBO_CONFIG.dailyWasteGeneration.base * dayMult * monthMult * noise.range(0.04, 0.10)),
      landfilled: Math.round(COLOMBO_CONFIG.dailyWasteGeneration.base * dayMult * monthMult * noise.range(0.35, 0.55)),
      wteProcessed: Math.round(noise.range(200, 480)),
      energyGenerated: Math.round(noise.range(100, 200)),
      collectionRate: Math.round(noise.range(75, 95) * 10) / 10,
      recyclingRate: Math.round(noise.range(14, 24) * 10) / 10,
      complaints: noise.rangeInt(5, 40),
      cost: Math.round(noise.range(1800000, 2600000))
    });
  }

  // Last 12 months
  for (let m = 11; m >= 0; m--) {
    const timestamp = new Date();
    timestamp.setMonth(timestamp.getMonth() - m);
    const monthMult = COLOMBO_CONFIG.monthlyPattern[timestamp.getMonth()] || 1.0;
    history.monthly.push({
      timestamp: timestamp.toISOString(),
      month: timestamp.toLocaleDateString('en-LK', { month: 'long', year: 'numeric' }),
      totalWaste: Math.round(COLOMBO_CONFIG.dailyWasteGeneration.base * 30 * monthMult * noise.range(0.9, 1.1)),
      recyclingRate: Math.round(noise.range(14, 24) * 10) / 10,
      collectionRate: Math.round(noise.range(78, 93) * 10) / 10,
      landfillUtilization: Math.round(noise.range(58, 78) * 10) / 10,
      revenue: Math.round(noise.range(20000000, 35000000)),
      cost: Math.round(noise.range(55000000, 75000000)),
      complaints: noise.rangeInt(150, 500)
    });
  }

  return history;
}

// ============================================================================
// WEATHER SIMULATION
// ============================================================================
function updateWeather() {
  const month = new Date().getMonth();
  const isRainy = COLOMBO_CONFIG.weather.rainyMonths.includes(month);

  const conditions = isRainy
    ? ['clear', 'cloudy', 'rain', 'rain', 'heavy_rain', 'storm']
    : ['clear', 'clear', 'clear', 'cloudy', 'cloudy', 'rain'];

  state.weather.condition = conditions[Math.floor(Math.random() * conditions.length)];
  state.weather.temperature = noise.range(COLOMBO_CONFIG.weather.avgTemp.min, COLOMBO_CONFIG.weather.avgTemp.max);
  state.weather.humidity = noise.range(COLOMBO_CONFIG.weather.avgHumidity.min, COLOMBO_CONFIG.weather.avgHumidity.max);
  state.weather.rainfall = state.weather.condition === 'heavy_rain' ? noise.range(15, 40) :
                           state.weather.condition === 'rain' ? noise.range(2, 15) :
                           state.weather.condition === 'storm' ? noise.range(30, 80) : 0;
  state.weather.windSpeed = state.weather.condition === 'storm' ? noise.range(40, 70) : noise.range(5, 25);
}

// ============================================================================
// TREND UPDATES
// ============================================================================
function updateTrends() {
  state.trendFactors.wasteGrowth = Math.max(0.9, Math.min(1.15, state.trendFactors.wasteGrowth + noise.gaussian(0, 0.002)));
  state.trendFactors.recyclingImprovement = Math.max(0.95, Math.min(1.2, state.trendFactors.recyclingImprovement + noise.gaussian(0.001, 0.002)));
  state.trendFactors.collectionEfficiency = Math.max(0.9, Math.min(1.1, state.trendFactors.collectionEfficiency + noise.gaussian(0, 0.001)));
  state.trendFactors.landfillPressure = Math.max(0.8, Math.min(1.2, state.trendFactors.landfillPressure + noise.gaussian(0.001, 0.002)));
}

// ============================================================================
// RANDOM EVENT GENERATION
// ============================================================================
function generateRandomEvent() {
  const events = [
    { type: 'vehicle_breakdown', weight: 0.2, generate: () => {
      const vehicles = Array.from(state.vehicles.values()).filter(v => v.status === 'active');
      if (vehicles.length > 0) {
        const v = vehicles[Math.floor(Math.random() * vehicles.length)];
        v.status = 'breakdown';
        v.speed = 0;
        return { title: `Vehicle ${v.registrationNo} breakdown`, desc: `Engine failure reported. Vehicle stranded in ${state.zones.get(v.route.zone)?.name || 'field'}.`, severity: 'warning', category: 'vehicle_breakdown' };
      }
    }},
    { type: 'illegal_dumping', weight: 0.15, generate: () => {
      const highRiskZones = Array.from(state.zones.values()).filter(z => z.illegalDumping === 'high');
      if (highRiskZones.length > 0) {
        const z = highRiskZones[Math.floor(Math.random() * highRiskZones.length)];
        return { title: `Illegal dumping detected in ${z.name}`, desc: `Sensor/camera alert: Unauthorized waste deposit near ${z.name}. Estimated 2-5 tons of mixed waste.`, severity: 'warning', category: 'illegal_dumping', zone: z.id };
      }
    }},
    { type: 'bin_sensor_failure', weight: 0.1, generate: () => {
      const active = Array.from(state.bins.values()).filter(b => b.status === 'active');
      if (active.length > 0) {
        const b = active[Math.floor(Math.random() * active.length)];
        b.status = 'offline';
        return { title: `Bin sensor offline: ${b.binId}`, desc: `IoT sensor at ${b.location.ward} lost connectivity.`, severity: 'info', category: 'system' };
      }
    }},
    { type: 'weather_impact', weight: 0.1, generate: () => {
      if (state.weather.condition === 'heavy_rain' || state.weather.condition === 'storm') {
        return { title: 'Weather affecting operations', desc: `Heavy ${state.weather.condition} expected to delay collection routes by 30-60 minutes. Alternative routing recommended.`, severity: 'warning', category: 'weather' };
      }
    }},
    { type: 'emission_spike', weight: 0.08, generate: () => {
      if (state.wtePlant) {
        return { title: 'WTE emission fluctuation', desc: `Brief NOx spike detected at Kerawalapitiya plant. Current: ${state.wtePlant.emissions.nox.toFixed(1)} mg/Nm³`, severity: 'info', category: 'emission_alert' };
      }
    }},
    { type: 'citizen_complaint', weight: 0.2, generate: () => {
      const zones = Array.from(state.zones.values());
      const z = zones[Math.floor(Math.random() * zones.length)];
      const complaints = ['Missed collection', 'Bin overflow', 'Bad odor', 'Stray animals at dump site', 'Collection truck noise early morning'];
      return { title: `Citizen complaint: ${z.name}`, desc: `${complaints[Math.floor(Math.random() * complaints.length)]} reported by resident in ${z.name}.`, severity: 'info', category: 'system', zone: z.id };
    }},
    { type: 'maintenance_due', weight: 0.1, generate: () => {
      const vehicles = Array.from(state.vehicles.values());
      const v = vehicles[Math.floor(Math.random() * vehicles.length)];
      return { title: `Maintenance due: ${v.registrationNo}`, desc: `Scheduled maintenance overdue for ${v.type} ${v.registrationNo}. Mileage: ${Math.round(v.mileage)} km`, severity: 'info', category: 'maintenance' };
    }}
  ];

  const weights = events.map(e => e.weight);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (const event of events) {
    r -= event.weight;
    if (r <= 0) {
      const result = event.generate();
      if (result) {
        generateAlert(result.severity, result.category, result.title, result.desc, result.zone);
      }
      break;
    }
  }
}

// ============================================================================
// ALERT GENERATION
// ============================================================================
function generateAlert(type, category, title, message, zone = null, assetId = null, assetType = null) {
  const duplicateKey = [category, title, zone || '', assetId || ''].join('|').toLowerCase();
  const existingActive = state.alerts.find(a =>
    !a.acknowledged &&
    [a.category, a.title, a.zone || '', a.assetId || ''].join('|').toLowerCase() === duplicateKey
  );
  if (existingActive) return existingActive;

  const alert = {
    alertId: `ALT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    type,
    category,
    title,
    message,
    zone,
    assetId,
    assetType,
    acknowledged: false,
    createdAt: new Date().toISOString()
  };

  state.alerts.unshift(alert);
  if (state.alerts.length > 200) state.alerts = state.alerts.slice(0, 200);

  return alert;
}

// ============================================================================
// SNAPSHOT - Returns current state for API/Socket
// ============================================================================
function getSimulationSnapshot() {
  const allBins = Array.from(state.bins.values());
  const allVehicles = Array.from(state.vehicles.values());
  const k = state.kpis;

  // Flatten nested KPI structure for direct UI consumption
  const flatKpis = {
    dailyCollectionTons: k.totalDailyWaste?.value,
    collectionCoverage: k.collectionRate?.value,
    collectionRate: k.collectionRate?.value,
    collectionTrend: k.collectionRate?.trend,
    missedCollections: Math.max(0, Math.round((100 - (k.collectionRate?.value || 0)) * 10) / 10),
    missedTrend: k.collectionRate?.trend ? -k.collectionRate.trend : 0,
    missedPoints: Math.round(Math.max(0, 100 - (k.collectionRate?.value || 0)) * 43),
    overdueAlerts: state.alerts.filter(a => !a.acknowledged && (a.type === 'critical' || a.type === 'warning')).length,
    routeSavings: k.routeOptimization?.value ? Math.round((k.routeOptimization.value / 4) * 10) / 10 : 22,
    routeTrend: k.routeOptimization?.trend,
    fuelSaved: 54,
    kmSaved: 386,
    recyclingRate: k.recyclingRate?.value,
    recyclingTrend: k.recyclingRate?.trend,
    avgBinFillLevel: k.avgBinFillLevel?.value,
    overflowBins: k.overflowBins?.value,
    fleetUtilization: k.fleetUtilization?.value,
    fleetTrend: k.fleetUtilization?.trend,
    activeRoutes: Math.round((allVehicles.filter(v => v.status === 'active' || v.status === 'en_route').length / Math.max(1, allVehicles.length)) * 38),
    wteOutput: k.wteEnergyOutput?.value,
    wteTrend: k.wteEnergyOutput?.trend,
    wteIntake: state.wtePlant?.currentIntake || 620,
    wteEfficiency: state.wtePlant?.efficiency || 82,
    landfillCapacity: k.landfillUtilization?.value,
    landfillTrend: k.landfillUtilization?.trend,
    landfillYears: 4.8,
    carbonScore: Math.max(0, Math.min(100, 100 - (k.carbonFootprint?.value || 500) / 10)),
    carbonTrend: k.wasteToLandfillReduction?.trend,
    co2Tons: k.carbonFootprint?.value,
    carbonFootprint: k.carbonFootprint?.value,
    circularEconomyIndex: k.circularEconomyIndex?.value,
    wasteSegregation: k.wasteSegregation?.value,
    wasteDiversion: k.wasteDiversion?.value,
    citizenComplaints: k.citizenComplaints?.value,
    composition: [62, 12, 9, 6, 3, 2, 6],
  };

  const zones = Array.from(state.zones.values()).map(z => ({
    zoneId: z.zoneId,
    name: z.name,
    avgFillLevel: Math.round((z.avgFillLevel || 0) * 10) / 10,
    overflowBins: z.overflowBins || 0,
    totalBins: z.totalBins || 0,
    collectionEfficiency: Math.round((z.collectionEfficiency || 80) * 10) / 10,
    segregationRate: Math.round((z.segregationRate || 50) * 10) / 10,
    status: (z.overflowBins || 0) > (z.totalBins || 1) * 0.3 ? 'critical' : (z.avgFillLevel || 0) > 70 ? 'attention' : 'normal',
  }));

  return {
    timestamp: new Date().toISOString(),
    tickCount: state.tickCount,
    kpis: flatKpis,
    weather: state.weather,
    alerts: state.alerts.slice(0, 50),
    zones,
    summary: {
      totalBins: state.bins.size,
      activeBins: allBins.filter(b => b.status !== 'offline').length,
      overflowBins: allBins.filter(b => b.currentFillLevel >= 85).length,
      totalVehicles: state.vehicles.size,
      activeVehicles: allVehicles.filter(v => v.status === 'active' || v.status === 'collecting').length,
      idleVehicles: allVehicles.filter(v => v.status === 'idle').length,
      breakdownVehicles: allVehicles.filter(v => v.status === 'breakdown').length
    },
    trendFactors: state.trendFactors
  };
}

function getBins() { return Array.from(state.bins.values()); }
function getVehicles() { return Array.from(state.vehicles.values()); }
function getZones() { return Array.from(state.zones.values()); }
function getFacilities() { return Array.from(state.facilities.values()); }
function getWTEPlant() { return state.wtePlant; }
function getAlerts() { return state.alerts; }
function getKPIs() { return state.kpis; }
function getHistoricalData() { return state.historicalKPIs; }
function getWeather() { return state.weather; }

function getBinById(binId) { return state.bins.get(binId); }
function getVehicleById(vehicleId) { return state.vehicles.get(vehicleId); }
function getZoneById(zoneId) { return state.zones.get(zoneId); }

// ============================================================================
// ACTION HANDLERS - Modify simulation state
// ============================================================================
function collectBin(binId) {
  const bin = state.bins.get(binId);
  if (!bin) return null;
  const prevFill = bin.currentFillLevel;
  bin.currentFillLevel = noise.range(0, 5);
  bin.lastCollection = new Date();
  bin.status = 'active';
  return { binId, previousFill: prevFill, newFill: bin.currentFillLevel };
}

function dispatchVehicle(vehicleId, zone) {
  const vehicle = state.vehicles.get(vehicleId);
  if (!vehicle || vehicle.status !== 'idle') return null;
  const targetZone = state.zones.get(zone);
  if (!targetZone) return null;
  vehicle.status = 'active';
  vehicle.route.zone = zone;
  vehicle.route.progress = 0;
  vehicle.currentLocation = { lat: targetZone.lat + noise.range(-0.003, 0.003), lng: targetZone.lng + noise.range(-0.003, 0.003) };
  return { vehicleId, dispatched: true, zone };
}

function optimizeRoutes(zone) {
  const zoneData = state.zones.get(zone);
  if (!zoneData) return null;
  zoneData.collectionEfficiency = Math.min(98, zoneData.collectionEfficiency + noise.range(3, 8));
  return { zone, newEfficiency: zoneData.collectionEfficiency };
}

function acknowledgeAlert(alertId) {
  const alert = state.alerts.find(a => a.alertId === alertId);
  if (alert) {
    alert.acknowledged = true;
    alert.resolvedAt = new Date().toISOString();
    return alert;
  }
  return null;
}

function createWorkOrder(data) {
  const order = {
    orderId: `WO-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  state.workOrders.unshift(order);
  return order;
}

function adjustWTEIntake(amount) {
  if (!state.wtePlant) return null;
  state.wtePlant.currentIntake = Math.max(50, Math.min(state.wtePlant.designCapacity, amount));
  return { newIntake: state.wtePlant.currentIntake };
}

function getWorkOrders() { return state.workOrders; }

module.exports = {
  initializeSimulation,
  simulationTick,
  getSimulationSnapshot,
  getBins, getVehicles, getZones, getFacilities,
  getWTEPlant, getAlerts, getKPIs, getHistoricalData, getWeather,
  getBinById, getVehicleById, getZoneById,
  collectBin, dispatchVehicle, optimizeRoutes,
  acknowledgeAlert, createWorkOrder, adjustWTEIntake, getWorkOrders,
  COLOMBO_CONFIG, state
};
