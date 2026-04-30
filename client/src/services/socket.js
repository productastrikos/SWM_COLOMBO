import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { getAdvisories, getBins, getDashboard, getVehicles, getWeather } from './api';

const SocketContext = createContext(null);
const DataContext = createContext(null);

// ── SEED DATA — shown immediately (before server connects) ────────────────────
const _t = Date.now();
const _ago = (min) => new Date(_t - min * 60000).toISOString();

const SEED_ALERTS = [
  { alertId:'SA-001', type:'critical', category:'fleet',      title:'Vehicle V-006 Engine Failure',      message:'V-006 engine fault — breakdown at Grandpass freight corridor. Secondary unit V-009 dispatched.',                         zone:'Z2',  assetId:'VEH-COM-006', acknowledged:false, createdAt:_ago(18) },
  { alertId:'SA-002', type:'critical', category:'bins',       title:'Overflow — Pettah Manning Market',  message:'BN-002 at 91% fill — overflow threshold exceeded at Pettah Manning Market. Immediate collection required.',           zone:'Z1',  assetId:'BIN-Z01-002', acknowledged:false, createdAt:_ago(32) },
  { alertId:'SA-003', type:'warning',  category:'collection', title:'Missed Collection — Grandpass',     message:'Route R7 incomplete — 125 collection points missed due to V-006 vehicle breakdown. Ward SLA at risk.',               zone:'Z2',  assetId:'VEH-COM-006', acknowledged:false, createdAt:_ago(45) },
  { alertId:'SA-004', type:'warning',  category:'bins',       title:'High Fill — Rajagiriya Cluster',    message:'BN-027 and 3 adjacent bins above 78% fill in Rajagiriya sector. Schedule priority collection before 16:00.',           zone:'Z5',  assetId:'BIN-Z05-027', acknowledged:false, createdAt:_ago(52) },
  { alertId:'SA-005', type:'warning',  category:'cctv',       title:'Unauthorized Activity — CAM-004',   message:'CAM-004 Grandpass Freight Edge — suspected unauthorized dumping near service road. Inspection dispatched.',           zone:'Z2',  assetId:'CAM-004',     acknowledged:false, createdAt:_ago(68) },
  { alertId:'SA-006', type:'warning',  category:'fleet',      title:'Low Fuel — V-021 (9%)',             message:'V-021 Nugegoda recycling haul reporting 9% fuel — vehicle must refuel before next assignment.',                     zone:'Z5',  assetId:'VEH-COM-021', acknowledged:false, createdAt:_ago(74) },
  { alertId:'SA-007', type:'info',     category:'facility',   title:'WTE Gate — 4-Vehicle Queue',        message:'Kerawalapitiya WTE weighbridge queue at 4 vehicles. Average processing time 14 min. No backlog risk until 17:00.', zone:'Z1',  assetId:'FAC-WTE-01',  acknowledged:true,  createdAt:_ago(90) },
  { alertId:'SA-008', type:'info',     category:'collection', title:'Route R1 Completed — 100% Coverage',message:'V-001 completed Galle Road Primary Corridor with full 100% coverage. Returning to Borella TS depot.',               zone:'Z3',  assetId:'VEH-COM-001', acknowledged:true,  createdAt:_ago(102) },
];

// 5-zone system matching the Digital Twin (Z1–Z5)
// Fill levels and collection counts derived from WasteCollection ward data
const SEED_ZONES = [
  { zoneId:'Z1', name:'Zone 1 – Northern Port',   wards:['Fort','Pettah','Kotahena'],              avgFillLevel:68.2, status:'attention', collectedToday:970,  missedCollections:44  },
  { zoneId:'Z2', name:'Zone 2 – Inner North',      wards:['Maradana','Grandpass','Dematagoda'],     avgFillLevel:74.5, status:'critical',  collectedToday:669,  missedCollections:147 },
  { zoneId:'Z3', name:'Zone 3 – Central',          wards:['Slave Island','Borella','Narahenpita'], avgFillLevel:55.8, status:'normal',    collectedToday:788,  missedCollections:38  },
  { zoneId:'Z4', name:'Zone 4 – Western Coastal',  wards:['Kollupitiya','Bambalapitiya','Wellawatta'], avgFillLevel:62.4, status:'attention', collectedToday:768,  missedCollections:61  },
  { zoneId:'Z5', name:'Zone 5 – Southern',         wards:['Kirulapone','Havelock Town','Rajagiriya'], avgFillLevel:71.8, status:'attention', collectedToday:967,  missedCollections:167 },
];

const SEED_KPIS = {
  collectionCoverage:90.1, coverageTrend:-1.2, missedCollections:9.9, missedTrend:0.4, missedPoints:457,
  overdueAlerts:8, routeSavings:18.4, routeTrend:2.3, fuelSaved:42, kmSaved:312,
  dailyCollectionTons:1247, collectionTrend:3.2, collectionRate:90.1, recyclingRate:23.4,
  recyclingTrend:1.8, overflowTrend:0.3, composition:[62,12,9,6,3,2,6],
  zonesServed:5, rfidScans:'4,162', fleetUtilization:72, carbonScore:68,
  wteOutput:12.4, wteIntake:247, wteEfficiency:78.2, landfillCapacity:72,
};

const SEED_WEATHER = { temperature:29, humidity:78, condition:'partly_cloudy', windSpeed:12, rainfall:0, icon:'⛅' };

const SEED_DASHBOARD = {
  timestamp: new Date().toISOString(),
  kpis: SEED_KPIS,
  alerts: SEED_ALERTS,
  zones: SEED_ZONES,
  weather: SEED_WEATHER,
};

const SEED_BINS_SUMMARY = { total:445, ok:406, overflow:8, needsCollection:31, overflowPct:1.8, bins:[] };

SEED_ALERTS.splice(
  0,
  SEED_ALERTS.length,
  { alertId:'SA-001', type:'warning',  category:'bins',       title:'High Fill - Rajagiriya Cluster',      message:'BN-027 and adjacent bins are above 78% fill. Priority collection is queued before 16:00.',      zone:'Z5', assetId:'BIN-Z05-027', acknowledged:false, createdAt:_ago(28) },
  { alertId:'SA-002', type:'critical', category:'fleet',      title:'Vehicle V-006 Maintenance Hold',     message:'V-006 is held for brake inspection. Standby capacity is covering the Grandpass route.',         zone:'Z2', assetId:'VEH-COM-006', acknowledged:false, createdAt:_ago(42) },
  { alertId:'SA-003', type:'info',     category:'facility',   title:'WTE Gate Flow Normal',               message:'Kerawalapitiya WTE weighbridge queue is at 2 vehicles with no backlog risk.',                  zone:'Z1', assetId:'FAC-WTE-01',  acknowledged:false, createdAt:_ago(56) },
  { alertId:'SA-004', type:'info',     category:'collection', title:'Route R1 Completed - 100% Coverage', message:'V-001 completed Galle Road Primary Corridor with full coverage and is returning to depot.',     zone:'Z3', assetId:'VEH-COM-001', acknowledged:true,  createdAt:_ago(102) },
);

SEED_ZONES.splice(
  0,
  SEED_ZONES.length,
  { zoneId:'Z1', name:'Zone 1 - Northern Port',   wards:['Fort','Pettah','Kotahena'],                 avgFillLevel:58.2, status:'normal',    collectedToday:1012, missedCollections:18 },
  { zoneId:'Z2', name:'Zone 2 - Inner North',     wards:['Maradana','Grandpass','Dematagoda'],        avgFillLevel:63.5, status:'attention', collectedToday:812,  missedCollections:34 },
  { zoneId:'Z3', name:'Zone 3 - Central',         wards:['Slave Island','Borella','Narahenpita'],     avgFillLevel:50.8, status:'normal',    collectedToday:818,  missedCollections:12 },
  { zoneId:'Z4', name:'Zone 4 - Western Coastal', wards:['Kollupitiya','Bambalapitiya','Wellawatta'], avgFillLevel:56.4, status:'normal',    collectedToday:804,  missedCollections:21 },
  { zoneId:'Z5', name:'Zone 5 - Southern',        wards:['Kirulapone','Havelock Town','Rajagiriya'],  avgFillLevel:69.8, status:'attention', collectedToday:984,  missedCollections:38 },
);

Object.assign(SEED_KPIS, {
  collectionCoverage:96.2, coverageTrend:1.1, missedCollections:1.8, missedTrend:-0.6, missedPoints:83,
  overdueAlerts:2, routeSavings:22.4, routeTrend:2.3, fuelSaved:54, kmSaved:386,
  dailyCollectionTons:1325, collectionTrend:3.2, collectionRate:96.2, recyclingRate:31.4,
  recyclingTrend:1.8, overflowTrend:-0.3,
  rfidScans:'4,430', fleetUtilization:84, carbonScore:82,
  wteIntake:382, wteEfficiency:82.2, landfillCapacity:58,
});

Object.assign(SEED_BINS_SUMMARY, { ok:420, overflow:3, needsCollection:22, overflowPct:0.7 });

function dedupeAlerts(list = []) {
  const seen = new Set();
  return list.filter((alert) => {
    const key = [
      alert.assetId || '',
      alert.category || '',
      alert.title || '',
      alert.message || '',
      alert.zone || '',
    ].join('|').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
// ─────────────────────────────────────────────────────────────────────────────

const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const isLocalOrigin = /localhost|127\.0\.0\.1/.test(browserOrigin);
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || (isLocalOrigin ? 'http://localhost:5000' : browserOrigin);
const REALTIME_MODE = process.env.REACT_APP_REALTIME_MODE || (isLocalOrigin ? 'socket' : 'polling');
const POLL_INTERVAL_MS = Number(process.env.REACT_APP_POLL_INTERVAL_MS || 15000);

// Compute summary stats from bins array for easy UI consumption
// Handles both fillLevel (client) and currentFillLevel (server) field names
function computeBinsStats(binsArray) {
  if (!Array.isArray(binsArray) || binsArray.length === 0) return SEED_BINS_SUMMARY;
  const stats = {
    bins: binsArray,
    total: binsArray.length,
    ok: binsArray.filter(b => {
      const fl = b.fillLevel ?? b.currentFillLevel ?? 0;
      return fl < 65 && !['overflow', 'maintenance', 'offline'].includes(b.status);
    }).length,
    overflow: binsArray.filter(b => {
      const fl = b.fillLevel ?? b.currentFillLevel ?? 0;
      return b.status === 'overflow' || fl >= 85;
    }).length,
    needsCollection: binsArray.filter(b => {
      const fl = b.fillLevel ?? b.currentFillLevel ?? 0;
      return b.status === 'needs_collection' || (fl >= 65 && fl < 85);
    }).length,
  };
  stats.overflowPct = stats.total > 0 ? +(stats.overflow / stats.total * 100).toFixed(1) : 0;
  return stats;
}

function computeVehiclesStats(vehiclesArray) {
  if (!Array.isArray(vehiclesArray) || vehiclesArray.length === 0) return { total: 0, active: 0, idle: 0, maintenance: 0, vehicles: [] };
  return {
    vehicles: vehiclesArray,
    total: vehiclesArray.length,
    active: vehiclesArray.filter(v => ['active', 'collecting', 'en_route', 'returning'].includes(v.status)).length,
    idle: vehiclesArray.filter(v => v.status === 'idle').length,
    maintenance: vehiclesArray.filter(v => v.status === 'maintenance').length,
  };
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [dashboardData, setDashboardData] = useState(SEED_DASHBOARD);
  const [kpis, setKpis] = useState(SEED_KPIS);
  const [alerts, setAlerts] = useState(dedupeAlerts(SEED_ALERTS));
  const [advisories, setAdvisories] = useState([]);
  const [weather, setWeather] = useState(SEED_WEATHER);
  const [binsSummary, setBinsSummary] = useState(SEED_BINS_SUMMARY);
  const [vehiclesSummary, setVehiclesSummary] = useState({ total: 45, active: 32, idle: 8, maintenance: 5, vehicles: [] });
  const [lastUpdate, setLastUpdate] = useState(null);
  const socketRef = useRef(null);
  const refreshRef = useRef(async () => {});

  useEffect(() => {
    let pollTimer = null;
    let isMounted = true;

    const syncSnapshot = (data) => {
      setDashboardData(prev => {
        const incoming = data.zones;
        // Server zones use old Z01–Z15 format (or have undefined zoneId).
        // Preserve the DT-canonical Z1–Z5 seed zones so zone filtering works.
        const hasValidZones = Array.isArray(incoming) && incoming.length > 0
          && /^Z\d$/.test(incoming[0]?.zoneId || '');
        return { ...data, zones: hasValidZones ? incoming : prev.zones };
      });
      setKpis(data.kpis || {});
      // Only replace alerts when the server actually returns some — otherwise keep seeds
      if (Array.isArray(data.alerts) && data.alerts.length > 0) setAlerts(dedupeAlerts(data.alerts));
      if (data.weather) setWeather(data.weather);
      setLastUpdate(new Date());
    };

    const refreshPollingData = async () => {
      try {
        const [dashboardRes, advisoriesRes, binsRes, vehiclesRes, weatherRes] = await Promise.all([
          getDashboard(),
          getAdvisories(),
          getBins(),
          getVehicles(),
          getWeather(),
        ]);

        if (!isMounted) return;

        syncSnapshot(dashboardRes.data || {});
        setAdvisories(Array.isArray(advisoriesRes.data) ? advisoriesRes.data : []);
        setBinsSummary(computeBinsStats(binsRes.data || []));
        setVehiclesSummary(computeVehiclesStats(vehiclesRes.data || []));
        setWeather(weatherRes.data || dashboardRes.data?.weather || null);
        setConnected(true);
      } catch (error) {
        if (!isMounted) return;
        setConnected(false);
      }
    };

    refreshRef.current = refreshPollingData;

    if (REALTIME_MODE === 'polling') {
      refreshPollingData();
      pollTimer = setInterval(refreshPollingData, POLL_INTERVAL_MS);

      return () => {
        isMounted = false;
        if (pollTimer) clearInterval(pollTimer);
      };
    }

    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    });
    socketRef.current = s;

    s.on('connect', () => {
      setConnected(true);
      setSocket(s);
    });

    s.on('disconnect', () => setConnected(false));

    s.on('initial-state', (data) => {
      syncSnapshot(data);
    });

    s.on('tick', (data) => {
      syncSnapshot(data);
    });

    s.on('advisories', (data) => {
      setAdvisories(Array.isArray(data) ? data : []);
    });

    s.on('data:bins-summary', (data) => {
      setBinsSummary(computeBinsStats(data.bins || []));
    });

    s.on('data:vehicles-summary', (data) => {
      setVehiclesSummary(computeVehiclesStats(data.vehicles || []));
    });

    s.on('weather', (data) => {
      setWeather(data);
    });

    s.on('alert:acknowledged', (alert) => {
      setAlerts(prev => dedupeAlerts(prev.map(a => a.alertId === alert.alertId ? alert : a)));
    });

    s.on('connect_error', () => {
      setConnected(false);
    });

    return () => {
      isMounted = false;
      s.disconnect();
    };
  }, []);

  const requestData = useCallback((event) => {
    if (socketRef.current && REALTIME_MODE === 'socket') {
      socketRef.current.emit(event);
      return;
    }
    refreshRef.current(event);
  }, []);

  const dataValue = {
    dashboardData, kpis, alerts, advisories, weather,
    binsSummary, vehiclesSummary, lastUpdate, connected, requestData
  };

  return (
    <SocketContext.Provider value={socket}>
      <DataContext.Provider value={dataValue}>
        {children}
      </DataContext.Provider>
    </SocketContext.Provider>
  );
}

export { DataContext };
export const useSocket = () => useContext(SocketContext);
export const useData = () => useContext(DataContext);
