import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Polygon, Marker, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import roadCenterlines from '../data/colomboRoads.json';
import precomputedRoutePaths from '../data/colomboRoutePaths.json';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─────────────────────────────────────────────────────────────────────────────
// HARDCODED topology-correct boundaries for Colombo Municipal Area
//
// Design: 6 horizontal seams × 4 longitude columns define a clean grid.
// Each ward is a simple polygon whose shared edges are IDENTICAL in both
// adjacent wards — guaranteeing zero gaps and zero overlaps.
// Each zone polygon = exact union of its 3 ward polygons.
//
// Seam grid  | lat   | COAST   | V1      | V2      | EAST
//  NORTH     | 6.975 | 79.852  | 79.874  | 79.908  | 79.920
//  AB (Z1/2) | 6.949 | 79.854  | 79.872  | 79.906  | 79.926
//  BC (Z2/3) | 6.916 | 79.850  | 79.864  | 79.901  | 79.930
//  CD (Z3/4) | 6.888 | 79.849  | 79.862  | 79.899  | 79.934
//  DE (Z4/5) | 6.868 | 79.849  | 79.863  | 79.901  | 79.928
//  SOUTH     | 6.848 | 79.851  | 79.864  | 79.897  | 79.924
//
// Intermediate coastline points are inserted on the west edge of each zone
// for a more organic coastal appearance.
// ─────────────────────────────────────────────────────────────────────────────

// ── Accurate Colombo shoreline coordinates (south → north) ─────────────────────
// Derived from known landmarks:
//   Dehiwala border ≈ [6.848, 79.862]   Wellawatta beach ≈ [6.868, 79.857]
//   Bambalapitiya   ≈ [6.878, 79.852]   Galle Face Green ≈ [6.902, 79.846]
//   Union Place     ≈ [6.916, 79.850]   Fort Point (lighthouse) ≈ [6.932, 79.843]
//   Colombo Harbour ≈ [6.941, 79.843]   North harbour ≈ [6.962, 79.852]
const C_N   = [6.975, 79.858];  // NW coast (Kelani River / Wattala boundary)
const C_AB  = [6.949, 79.845];  // coast at Z1/Z2 seam (Colombo Harbour)
const C_BC  = [6.916, 79.850];  // coast at Z2/Z3 seam (Union Place / Kollupitiya)
const C_CD  = [6.888, 79.849];  // coast at Z3/Z4 seam (Kollupitiya / Bambalapitiya)
const C_DE  = [6.868, 79.857];  // coast at Z4/Z5 seam (Wellawatta)
const C_S   = [6.848, 79.862];  // SW coast (Dehiwala border)

// Intermediate shoreline points — one per zone mid-latitude
const C_Z1  = [6.962, 79.852];  // Zone 1 mid-coast (north harbour area)
const C_Z2a = [6.924, 79.847];  // Zone 2 lower coast (approaching Colombo Fort)
const C_Z2  = [6.932, 79.843];  // Zone 2 mid-coast — Fort Point (westernmost!)
const C_Z2b = [6.941, 79.843];  // Zone 2 upper coast (harbour entrance)
const C_Z3  = [6.902, 79.846];  // Zone 3 mid-coast (Galle Face Green)
const C_Z4  = [6.878, 79.852];  // Zone 4 mid-coast (Bambalapitiya beach)
const C_Z5  = [6.858, 79.860];  // Zone 5 mid-coast (Wellawatta / Dehiwala)

// ── Ward polygons ─────────────────────────────────────────────────────────────
// Listed as polygon vertices; Leaflet closes the ring automatically.
// Each ward uses explicit seam-corner coordinates so shared edges are identical.

// ── Irregular ward boundaries ──────────────────────────────────────────────────
// Each internal seam uses 2 jog-points that are IDENTICAL in both adjacent wards
// (guaranteeing zero gaps / zero overlaps across all 15 ward polygons).
//
// Zone 1 (lat 6.949→6.975)
// V12_Z1 seam: top[6.975,79.874]→jog[6.968,79.877]→jog[6.960,79.872]→bot[6.949,79.872]
// V23_Z1 seam: top[6.975,79.908]→jog[6.964,79.911]→jog[6.956,79.906]→bot[6.949,79.906]
const W01_PTS = [C_AB, C_Z1, C_N, [6.975,79.874], [6.968,79.877], [6.960,79.872], [6.949,79.872]];
const W02_PTS = [[6.949,79.872], [6.960,79.872], [6.968,79.877], [6.975,79.874], [6.975,79.908], [6.964,79.911], [6.956,79.906], [6.949,79.906]];
const W03_PTS = [[6.949,79.906], [6.956,79.906], [6.964,79.911], [6.975,79.908], [6.975,79.920], [6.949,79.926]];

// Zone 2 (lat 6.916→6.949)
// V12_Z2 seam: top[6.949,79.872]→jog[6.940,79.870]→jog[6.932,79.875]→bot[6.916,79.864]
// V23_Z2 seam: top[6.949,79.906]→jog[6.938,79.904]→jog[6.926,79.908]→bot[6.916,79.901]
const W04_PTS = [C_BC, C_Z2a, C_Z2, C_Z2b, C_AB, [6.949,79.872], [6.940,79.870], [6.932,79.875], [6.916,79.864]];
const W05_PTS = [[6.916,79.864], [6.932,79.875], [6.940,79.870], [6.949,79.872], [6.949,79.906], [6.938,79.904], [6.926,79.908], [6.916,79.901]];
const W06_PTS = [[6.916,79.901], [6.926,79.908], [6.938,79.904], [6.949,79.906], [6.949,79.926], [6.916,79.930]];

// Zone 3 (lat 6.888→6.916)
// V12_Z3 seam: top[6.916,79.864]→jog[6.908,79.867]→jog[6.900,79.862]→bot[6.888,79.862]
// V23_Z3 seam: top[6.916,79.901]→jog[6.907,79.904]→jog[6.897,79.899]→bot[6.888,79.899]
const W07_PTS = [C_CD, C_Z3, C_BC, [6.916,79.864], [6.908,79.867], [6.900,79.862], [6.888,79.862]];
const W08_PTS = [[6.888,79.862], [6.900,79.862], [6.908,79.867], [6.916,79.864], [6.916,79.901], [6.907,79.904], [6.897,79.899], [6.888,79.899]];
const W09_PTS = [[6.888,79.899], [6.897,79.899], [6.907,79.904], [6.916,79.901], [6.916,79.930], [6.888,79.934]];

// Zone 4 (lat 6.868→6.888)
// V12_Z4 seam: top[6.888,79.862]→jog[6.881,79.865]→jog[6.875,79.861]→bot[6.868,79.863]
// V23_Z4 seam: top[6.888,79.899]→jog[6.882,79.902]→jog[6.875,79.898]→bot[6.868,79.901]
const W10_PTS = [C_DE, C_Z4, C_CD, [6.888,79.862], [6.881,79.865], [6.875,79.861], [6.868,79.863]];
const W11_PTS = [[6.868,79.863], [6.875,79.861], [6.881,79.865], [6.888,79.862], [6.888,79.899], [6.882,79.902], [6.875,79.898], [6.868,79.901]];
const W12_PTS = [[6.868,79.901], [6.875,79.898], [6.882,79.902], [6.888,79.899], [6.888,79.934], [6.868,79.928]];

// Zone 5 (lat 6.848→6.868)
// V12_Z5 seam: top[6.868,79.863]→jog[6.861,79.866]→jog[6.855,79.862]→bot[6.848,79.864]
// V23_Z5 seam: top[6.868,79.901]→jog[6.862,79.904]→jog[6.855,79.898]→bot[6.848,79.897]
const W13_PTS = [C_S, C_Z5, C_DE, [6.868,79.863], [6.861,79.866], [6.855,79.862], [6.848,79.864]];
const W14_PTS = [[6.848,79.864], [6.855,79.862], [6.861,79.866], [6.868,79.863], [6.868,79.901], [6.862,79.904], [6.855,79.898], [6.848,79.897]];
const W15_PTS = [[6.848,79.897], [6.855,79.898], [6.862,79.904], [6.868,79.901], [6.868,79.928], [6.848,79.924]];

// ── Zone polygons (exact union of their 3 ward polygons) ─────────────────────
const Z1_BOUNDARY = [C_AB, C_Z1, C_N, [6.975,79.920], [6.949,79.926]];
const Z2_BOUNDARY = [C_BC, C_Z2a, C_Z2, C_Z2b, C_AB, [6.949,79.926], [6.916,79.930]];
const Z3_BOUNDARY = [C_CD, C_Z3, C_BC, [6.916,79.930], [6.888,79.934]];
const Z4_BOUNDARY = [C_DE, C_Z4, C_CD, [6.888,79.934], [6.868,79.928]];
const Z5_BOUNDARY = [C_S, C_Z5, C_DE, [6.868,79.928], [6.848,79.924]];

const FACILITIES = [
  { id:'F-001', name:'Karadiyana Landfill',       type:'landfill',  lat:6.8340, lng:79.9680, capPct:72, throughput:380, color:'#ef4444', icon:'🏔️' },
  { id:'F-002', name:'Kerawalapitiya WTE Plant',  type:'wte',       lat:7.0107, lng:79.9012, capPct:88, throughput:260, color:'#f59e0b', icon:'🏭' },
  { id:'F-003', name:'Borella Transfer Station',  type:'transfer',  lat:6.9115, lng:79.8690, capPct:70, throughput:180, color:'#06b6d4', icon:'🔄' },
  { id:'F-004', name:'Dehiwala Transfer Station', type:'transfer',  lat:6.8600, lng:79.8695, capPct:63, throughput:140, color:'#06b6d4', icon:'🔄' },
  { id:'F-005', name:'Nugegoda Recycling Centre', type:'recycling', lat:6.8720, lng:79.9005, capPct:62, throughput:95,  color:'#10b981', icon:'♻️' },
  { id:'F-006', name:'Moratuwa Compost Plant',    type:'compost',   lat:6.7950, lng:79.8820, capPct:45, throughput:65,  color:'#84cc16', icon:'🌱' },
];

const centroidOf = (pts) => ([
  pts.reduce((sum, point) => sum + point[0], 0) / pts.length,
  pts.reduce((sum, point) => sum + point[1], 0) / pts.length,
]);

const createWard = (id, name, color, pts, zoneId, landUse) => {
  const [cLat, cLng] = centroidOf(pts);
  return { id, name, color, zoneId, landUse, pts, cLat, cLng };
};

// Ward definitions with irregular boundaries
const BASE_WARDS = [
  // Zone 1 – Northern Port (cyan)
  createWard('W01', 'Fort',           '#38bdf8', W01_PTS, 'Z1', 'commercial'),
  createWard('W02', 'Pettah',         '#22d3ee', W02_PTS, 'Z1', 'market'),
  createWard('W03', 'Kotahena',       '#7dd3fc', W03_PTS, 'Z1', 'mixed'),
  // Zone 2 – Inner North (amber)
  createWard('W04', 'Maradana',       '#f59e0b', W04_PTS, 'Z2', 'transport'),
  createWard('W05', 'Grandpass',      '#fbbf24', W05_PTS, 'Z2', 'mixed'),
  createWard('W06', 'Dematagoda',     '#fde68a', W06_PTS, 'Z2', 'residential'),
  // Zone 3 – Central (green)
  createWard('W07', 'Slave Island',   '#10b981', W07_PTS, 'Z3', 'mixed'),
  createWard('W08', 'Borella',        '#34d399', W08_PTS, 'Z3', 'institutional'),
  createWard('W09', 'Narahenpita',    '#6ee7b7', W09_PTS, 'Z3', 'hospital'),
  // Zone 4 – Western Coastal (purple)
  createWard('W10', 'Kollupitiya',    '#8b5cf6', W10_PTS, 'Z4', 'commercial'),
  createWard('W11', 'Bambalapitiya',  '#a78bfa', W11_PTS, 'Z4', 'mixed'),
  createWard('W12', 'Wellawatta',     '#c4b5fd', W12_PTS, 'Z4', 'coastal'),
  // Zone 5 – Southern (orange)
  createWard('W13', 'Kirulapone',     '#f97316', W13_PTS, 'Z5', 'residential'),
  createWard('W14', 'Havelock Town',  '#fb923c', W14_PTS, 'Z5', 'residential'),
  createWard('W15', 'Rajagiriya',     '#fdba74', W15_PTS, 'Z5', 'residential'),
];

const getWardCoord = (wardId) => {
  const ward = BASE_WARDS.find((item) => item.id === wardId);
  return ward ? [ward.cLat, ward.cLng] : null;
};

const getFacilityCoord = (facilityId) => {
  const facility = FACILITIES.find((item) => item.id === facilityId);
  return facility ? [facility.lat, facility.lng] : null;
};

// Zone polygons with natural, irregular boundaries
const ZONE_POLYS = [
  { id:'Z1', name:'Zone 1 – Northern Port',   color:'#38bdf8', pts: Z1_BOUNDARY },
  { id:'Z2', name:'Zone 2 – Inner North',     color:'#f59e0b', pts: Z2_BOUNDARY },
  { id:'Z3', name:'Zone 3 – Central',         color:'#10b981', pts: Z3_BOUNDARY },
  { id:'Z4', name:'Zone 4 – Western Coastal', color:'#8b5cf6', pts: Z4_BOUNDARY },
  { id:'Z5', name:'Zone 5 – Southern',        color:'#f97316', pts: Z5_BOUNDARY },
];

const makeRoundTrip = (pts) => [...pts, ...pts.slice(0, -1).reverse()];

const ROAD_NAME_ALIASES = {
  'Sri Jayawardenepura Mawatha': 'Sri Jayawardenepura Mawatha',
  'Sri Jayewardenepura Mawatha': 'Sri Jayawardenepura Mawatha',
};

const sqDist = (a, b) => {
  const dLat = a[0] - b[0];
  const dLng = a[1] - b[1];
  return dLat * dLat + dLng * dLng;
};

const featureToLatLngPath = (feature) => {
  const geometry = feature?.geometry;
  if (!geometry) return [];
  const segments = geometry.type === 'LineString'
    ? [geometry.coordinates]
    : geometry.type === 'MultiLineString'
      ? geometry.coordinates.flat()
      : [];
  return segments
    .filter((point) => Array.isArray(point) && point.length >= 2)
    .map(([lng, lat]) => [lat, lng]);
};

const ROAD_CENTERLINES = roadCenterlines.features.reduce((acc, feature) => {
  const name = feature?.properties?.name;
  const path = featureToLatLngPath(feature);
  if (!name || path.length < 2) return acc;
  acc[name] = path;
  return acc;
}, {});

const mergeRoadPaths = (paths) => {
  if (!paths.length) return [];
  const merged = [...paths[0]];
  for (let index = 1; index < paths.length; index += 1) {
    const candidate = paths[index];
    if (!candidate.length) continue;
    const previousEnd = merged[merged.length - 1];
    const oriented = sqDist(candidate[0], previousEnd) <= sqDist(candidate[candidate.length - 1], previousEnd)
      ? candidate
      : [...candidate].reverse();
    const offset = sqDist(oriented[0], previousEnd) < 1e-10 ? 1 : 0;
    merged.push(...oriented.slice(offset));
  }
  return merged;
};

const buildImportedRoadPath = (roadNames, options = {}) => {
  const resolvedPaths = roadNames
    .map((name) => ROAD_CENTERLINES[name] || ROAD_CENTERLINES[ROAD_NAME_ALIASES[name]])
    .filter((path) => Array.isArray(path) && path.length > 1);
  const merged = mergeRoadPaths(resolvedPaths);
  if (merged.length < 2) return [];
  return options.roundTrip === false ? merged : makeRoundTrip(merged);
};

const ROUTE_BLUEPRINTS = {
  R1: {
    name: 'Galle Road Primary Corridor',
    color: '#38bdf8',
    service: 'collection',
    hierarchy: 'primary',
    wardIds: ['W01', 'W04', 'W07', 'W10', 'W13'],
    road: 'Galle Road spine',
    roads: ['Galle Road'],
    waypoints: ['W01', 'W04', 'W07', 'W10', 'W13'].map(getWardCoord),
  },
  R2: {
    name: 'Fort-Pettah Secondary Loop',
    color: '#06b6d4',
    service: 'collection',
    hierarchy: 'secondary',
    wardIds: ['W02', 'W05', 'W08', 'W11', 'W14'],
    road: 'Olcott Mawatha / Maradana corridor',
    roads: ['Olcott Mawatha', 'Maradana Road'],
    waypoints: ['W02', 'W05', 'W08', 'W11', 'W14'].map(getWardCoord),
  },
  R3: {
    name: 'Baseline Primary Corridor',
    color: '#10b981',
    service: 'collection',
    hierarchy: 'primary',
    wardIds: ['W03', 'W06', 'W09', 'W12', 'W15'],
    road: 'Baseline Road',
    roads: ['Baseline Road'],
    waypoints: ['W03', 'W06', 'W09', 'W12', 'W15'].map(getWardCoord),
  },
  R4: {
    name: 'Narahenpita-Rajagiriya Secondary Loop',
    color: '#a855f7',
    service: 'collection',
    hierarchy: 'secondary',
    wardIds: ['W09', 'W12', 'W15'],
    road: 'Nawala Road / Parliament Road collectors',
    roads: ['Nawala Road', 'Parliament Road', 'Sri Jayawardenepura Mawatha'],
    waypoints: ['W09', 'W12', 'W15'].map(getWardCoord),
  },
  R5: {
    name: 'South Spine Primary Corridor',
    color: '#f59e0b',
    service: 'collection',
    hierarchy: 'primary',
    wardIds: ['W10', 'W11', 'W12', 'W13', 'W14', 'W15'],
    road: 'Bauddhaloka Mawatha / Havelock / High Level spine',
    roads: ['Bauddhaloka Mawatha', 'Havelock Road', 'High Level Road'],
    waypoints: ['W10', 'W11', 'W13', 'W14', 'W15'].map(getWardCoord),
  },
  R6: {
    name: 'Wellawatta Secondary Loop',
    color: '#22c55e',
    service: 'collection',
    hierarchy: 'secondary',
    wardIds: ['W10', 'W12', 'W13', 'W14'],
    road: 'Marine Drive / Havelock Road',
    roads: ['Marine Drive', 'Havelock Road'],
    waypoints: ['W10', 'W12', 'W13', 'W14'].map(getWardCoord),
  },
  R7: {
    name: 'Grandpass Freight Secondary Loop',
    color: '#8b5cf6',
    service: 'collection',
    hierarchy: 'secondary',
    wardIds: ['W02', 'W03', 'W05', 'W06'],
    road: 'Grandpass / Kotahena service spine',
    roads: ['Grandpass Road', 'George R. de Silva Mawatha', 'Jampettah Street', 'Aluthmawatha Road', 'Darley Road'],
    waypoints: ['W02', 'W03', 'W05', 'W06'].map(getWardCoord),
  },
  R8: {
    name: 'Borella Transfer to WTE',
    color: '#f97316',
    service: 'haul',
    hierarchy: 'haul',
    wardIds: ['W08', 'W09', 'W12'],
    road: 'Baseline Road to Negombo Road haul',
    roads: ['Baseline Road', 'Negombo Road'],
    waypoints: [getFacilityCoord('F-003'), getWardCoord('W12'), getFacilityCoord('F-002')],
  },
  R9: {
    name: 'Dehiwala Transfer to Karadiyana',
    color: '#ef4444',
    service: 'haul',
    hierarchy: 'haul',
    wardIds: ['W13', 'W14', 'W15'],
    road: 'High Level / Havelock haul corridor',
    roads: ['High Level Road', 'Havelock Road'],
    waypoints: [getFacilityCoord('F-004'), getWardCoord('W15'), getFacilityCoord('F-001')],
  },
  R10: {
    name: 'Nugegoda Recycling and Compost Run',
    color: '#38bdf8',
    service: 'haul',
    hierarchy: 'haul',
    wardIds: ['W13', 'W14', 'W15'],
    road: 'High Level Road compost link',
    roads: ['High Level Road'],
    waypoints: [getFacilityCoord('F-005'), getWardCoord('W15'), getFacilityCoord('F-006')],
  },
  // Zone-specific local collection loops
  R11: {
    name: 'Zone 1 Northern Local Loop',
    color: '#38bdf8',
    service: 'collection',
    hierarchy: 'secondary',
    wardIds: ['W01', 'W02', 'W03'],
    roads: ['Prince Street', 'Sea Street', 'Jampettah Street'],
    waypoints: ['W01', 'W02', 'W03'].map(getWardCoord),
  },
  R12: {
    name: 'Zone 2 Maradana-Grandpass Loop',
    color: '#38bdf8',
    service: 'collection',
    hierarchy: 'secondary',
    wardIds: ['W04', 'W05', 'W06'],
    roads: ['Maradana Road', 'McCallum Road', 'Baseline Road'],
    waypoints: ['W04', 'W05', 'W06'].map(getWardCoord),
  },
  R13: {
    name: 'Zone 3 Central Borella Loop',
    color: '#38bdf8',
    service: 'collection',
    hierarchy: 'secondary',
    wardIds: ['W07', 'W08', 'W09'],
    roads: ['Union Place', 'Gregory Road', 'Buthgamuwa Road'],
    waypoints: ['W07', 'W08', 'W09'].map(getWardCoord),
  },
  R14: {
    name: 'Zone 4 Coastal Bambalapitiya Loop',
    color: '#38bdf8',
    service: 'collection',
    hierarchy: 'secondary',
    wardIds: ['W10', 'W11', 'W12'],
    roads: ['Duplication Road', 'Lauries Road', 'De Saram Place'],
    waypoints: ['W10', 'W11', 'W12'].map(getWardCoord),
  },
  R15: {
    name: 'Zone 5 Southern Residential Loop',
    color: '#38bdf8',
    service: 'collection',
    hierarchy: 'secondary',
    wardIds: ['W13', 'W14', 'W15'],
    roads: ['Kirulapone Avenue', 'Park Road', 'Nawala Road'],
    waypoints: ['W13', 'W14', 'W15'].map(getWardCoord),
  },
  R16: {
    name: 'Zone 1 Fort-Pettah Morning Market',
    color: '#38bdf8',
    service: 'collection',
    hierarchy: 'secondary',
    wardIds: ['W01', 'W02'],
    roads: ['Main Street', 'Chatham Street', 'York Street'],
    waypoints: ['W01', 'W02'].map(getWardCoord),
  },
  R17: {
    name: 'Zone 3 Institutional & Hospital Loop',
    color: '#38bdf8',
    service: 'collection',
    hierarchy: 'secondary',
    wardIds: ['W07', 'W08', 'W09'],
    roads: ['Gregory Road', 'Kynsey Road', 'Park Road'],
    waypoints: ['W07', 'W08', 'W09'].map(getWardCoord),
  },
  R18: {
    name: 'Zone 4 Evening Coastal Sweep',
    color: '#38bdf8',
    service: 'collection',
    hierarchy: 'secondary',
    wardIds: ['W10', 'W11', 'W12'],
    roads: ['Marine Drive', 'Galle Road'],
    waypoints: ['W10', 'W11', 'W12'].map(getWardCoord),
  },
  R19: {
    name: 'Zone 2 Night Collection Run',
    color: '#38bdf8',
    service: 'collection',
    hierarchy: 'secondary',
    wardIds: ['W04', 'W05', 'W06'],
    roads: ['Maradana Road', 'Dematagoda Road', 'Baseline Road'],
    waypoints: ['W04', 'W05', 'W06'].map(getWardCoord),
  },
  R20: {
    name: 'Bloemendhal → Borella → WTE Express Haul',
    color: '#38bdf8',
    service: 'haul',
    hierarchy: 'haul',
    wardIds: ['W03', 'W09'],
    roads: ['Negombo Road', 'Kandy Road', 'Baseline Road'],
    waypoints: [getWardCoord('W03'), getWardCoord('W09'), getFacilityCoord('F-001')].filter(Boolean),
  },
};

const ROUTE_DEFS = Object.fromEntries(Object.entries(ROUTE_BLUEPRINTS).map(([routeId, route]) => {
  const importedPts = buildImportedRoadPath(route.roads, { roundTrip: false });
  return [routeId, { ...route, pts: importedPts }];
}));

function buildPath(pts) {
  if (!pts.length) return [];
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const segmentDelta = Math.max(Math.abs(pts[i + 1][0] - pts[i][0]), Math.abs(pts[i + 1][1] - pts[i][1]));
    const steps = Math.max(1, Math.ceil(segmentDelta / 0.00045));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push([pts[i][0] + (pts[i+1][0]-pts[i][0])*t, pts[i][1] + (pts[i+1][1]-pts[i][1])*t]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const ROUTE_PATHS = Object.fromEntries(Object.entries(ROUTE_DEFS).map(([k,v]) => [k, buildPath(v.pts)]));
// Waypoint-based fallback path (straight lines through ward centroids/facilities)
const buildWaypointPath = (waypoints) => {
  const pts = (waypoints || []).filter(Boolean);
  return pts.length >= 2 ? buildPath(pts) : [];
};

// Build a straight-line interpolated reroute path between two geographic points.
// Returns an array of [lat, lng] with enough resolution for smooth animation.
const buildReroutePath = (fromLat, fromLng, toLat, toLng) => {
  const steps = 42;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [fromLat + (toLat - fromLat) * t, fromLng + (toLng - fromLng) * t];
  });
};

// Road-aligned intermediate waypoints for zone-local routes whose roads are not in the GeoJSON.
// These follow realistic street geometry through Colombo's ward clusters to avoid straight-line artefacts.
const ROUTE_ENHANCED_WAYPOINTS = {
  // R13: Zone 3 – Slave Island → Borella → Narahenpita (along Union Place / Buthgamuwa Rd corridor)
  R13: [[6.899,79.856],[6.899,79.862],[6.901,79.868],[6.901,79.875],[6.902,79.882],[6.901,79.890],[6.900,79.898]],
  // R14: Zone 4 – Kollupitiya → Bambalapitiya → Wellawatta (coastal residential strip)
  R14: [[6.882,79.850],[6.880,79.853],[6.878,79.856],[6.876,79.859],[6.876,79.864],[6.876,79.870],[6.876,79.876],[6.876,79.883],[6.876,79.891],[6.877,79.898],[6.876,79.905]],
  // R16: Zone 1 – Fort → Pettah market circuit (Chatham Street / Main Street area)
  R16: [[6.934,79.843],[6.934,79.847],[6.935,79.851],[6.936,79.854],[6.937,79.857],[6.938,79.859],[6.940,79.858],[6.941,79.857]],
  // R17: Zone 3 – Slave Island → Borella → Narahenpita institutional loop (slightly north of R13)
  R17: [[6.900,79.856],[6.901,79.863],[6.904,79.867],[6.905,79.873],[6.903,79.880],[6.902,79.887],[6.901,79.893],[6.900,79.899]],
};

const ACTIVE_ROUTE_PATHS = Object.fromEntries(Object.keys(ROUTE_DEFS).map((routeId) => {
  if (precomputedRoutePaths[routeId]?.length > 1) return [routeId, precomputedRoutePaths[routeId]];
  if (ROUTE_PATHS[routeId]?.length > 1) return [routeId, ROUTE_PATHS[routeId]];
  // Enhanced road-aligned waypoints for routes not covered by imported GeoJSON road data
  if (ROUTE_ENHANCED_WAYPOINTS[routeId]?.length >= 2) return [routeId, buildPath(ROUTE_ENHANCED_WAYPOINTS[routeId])];
  // Final fallback: interpolate between ward centroid waypoints
  return [routeId, buildWaypointPath(ROUTE_BLUEPRINTS[routeId]?.waypoints)];
}));

const INIT_VEHICLES = [
  { id:'V-001', type:'Twin Dumper', driver:'K. Perera',      zone:'Coastal Primary', routeId:'R1', posIdx:0,   status:'active',     fuel:82, load:2.6, cap:8.0, speed:24, odo:18240, routeClass:'primary' },
  { id:'V-002', type:'Auto Tipper', driver:'S. Silva',       zone:'City Core',       routeId:'R2', posIdx:34,  status:'collecting', fuel:67, load:3.1, cap:5.0, speed:16, odo:22450, routeClass:'secondary' },
  { id:'V-003', type:'Auto Tipper', driver:'R. Fernando',    zone:'City Core',       routeId:'R2', posIdx:70,  status:'collecting', fuel:58, load:2.0, cap:5.0, speed:18, odo:15820, routeClass:'secondary' },
  { id:'V-004', type:'Twin Dumper', driver:'P. Madushanka',  zone:'Baseline Primary',routeId:'R3', posIdx:18,  status:'active',     fuel:73, load:3.7, cap:8.0, speed:22, odo:13640, routeClass:'primary' },
  { id:'V-005', type:'Tipper',      driver:'M. Dias',        zone:'Baseline Primary',routeId:'R3', posIdx:56,  status:'active',     fuel:46, load:4.4, cap:7.0, speed:20, odo:31200, routeClass:'primary' },
  { id:'V-006', type:'Auto Tipper', driver:'A. Bandara',     zone:'North Local',     routeId:'R7', posIdx:44,  status:'breakdown',  fuel:24, load:1.8, cap:5.0, speed:0,  odo:9870,  routeClass:'secondary' },
  { id:'V-007', type:'Tipper',      driver:'S. Udesh',       zone:'South Spine',     routeId:'R5', posIdx:18,  status:'active',     fuel:69, load:2.7, cap:7.0, speed:21, odo:14560, routeClass:'primary' },
  { id:'V-008', type:'Tractor',     driver:'D. Gunaratne',   zone:'Narahenpita Local',   routeId:'R4', posIdx:62,  status:'active',     fuel:91, load:1.2, cap:4.0, speed:17, odo:7640,  routeClass:'secondary' },
  { id:'V-009', type:'Auto Tipper', driver:'T. Wijeratne',   zone:'North Local',     routeId:'R7', posIdx:24,  status:'collecting', fuel:72, load:4.3, cap:5.0, speed:12, odo:28900, routeClass:'secondary' },
  { id:'V-010', type:'Pushcart',    driver:'H. Bandula',     zone:'Pettah Local',    routeId:'R2', posIdx:96,  status:'active',     fuel:100,load:0.2, cap:0.5, speed:6,  odo:5800,  routeClass:'secondary' },
  { id:'V-011', type:'Twin Dumper', driver:'C. Kumara',      zone:'South Spine',     routeId:'R5', posIdx:42,  status:'en_route',   fuel:63, load:1.1, cap:8.0, speed:26, odo:14300, routeClass:'primary' },
  { id:'V-012', type:'Auto Tipper', driver:'N. Rajapaksa',   zone:'Narahenpita Local',   routeId:'R4', posIdx:84,  status:'active',     fuel:84, load:3.2, cap:5.0, speed:22, odo:19800, routeClass:'secondary' },
  { id:'V-013', type:'Auto Tipper', driver:'L. Fernando',    zone:'Wellawatta Local',routeId:'R6', posIdx:18,  status:'collecting', fuel:61, load:3.0, cap:5.0, speed:15, odo:16410, routeClass:'secondary' },
  { id:'V-014', type:'Tipper',      driver:'K. Senanayake',  zone:'South Spine',     routeId:'R5', posIdx:88,  status:'idle',       fuel:42, load:0.0, cap:7.0, speed:0,  odo:28100, routeClass:'primary' },
  { id:'V-019', type:'Compactor',   driver:'R. Priyankara',  zone:'Transfer Haul',   routeId:'R8', posIdx:12,  status:'en_route',   fuel:75, load:6.2, cap:9.0, speed:29, odo:24020, routeClass:'haul' },
  { id:'V-020', type:'Compactor',   driver:'S. Weerasekara', zone:'Landfill Haul',   routeId:'R9', posIdx:26,  status:'returning',  fuel:54, load:5.1, cap:9.0, speed:27, odo:26840, routeClass:'haul' },
  { id:'V-021', type:'Compactor',   driver:'L. Subasinghe',  zone:'Recycling Haul',  routeId:'R10',posIdx:10,  status:'en_route',   fuel:71, load:4.5, cap:9.0, speed:23, odo:11200, routeClass:'haul' },
  { id:'V-022', type:'Pushcart',    driver:'B. Wickrama',    zone:'Wellawatta Local',routeId:'R6',  posIdx:100, status:'collecting', fuel:100,load:0.3, cap:0.5, speed:7,  odo:4200,  routeClass:'secondary' },
  // Zone-specific collection vehicles (R11-R15)
  { id:'V-015', type:'Auto Tipper', driver:'A. Rathnayake',  zone:'Z1 Local',        routeId:'R11', posIdx:8,   status:'collecting', fuel:78, load:1.8, cap:5.0, speed:14, odo:8640,  routeClass:'secondary' },
  { id:'V-016', type:'Auto Tipper', driver:'M. Aluthge',     zone:'Z2 Local',        routeId:'R12', posIdx:14,  status:'active',     fuel:85, load:2.2, cap:5.0, speed:18, odo:12100, routeClass:'secondary' },
  { id:'V-017', type:'Tipper',      driver:'K. Nanayakkara', zone:'Z3 Local',        routeId:'R13', posIdx:12,  status:'collecting', fuel:62, load:3.4, cap:7.0, speed:16, odo:18900, routeClass:'secondary' },
  { id:'V-018', type:'Auto Tipper', driver:'S. Jayasena',    zone:'Z4 Local',        routeId:'R14', posIdx:20,  status:'active',     fuel:74, load:2.9, cap:5.0, speed:20, odo:9750,  routeClass:'secondary' },
  { id:'V-023', type:'Tractor',     driver:'T. Dissanayake', zone:'Z5 Local',        routeId:'R15', posIdx:16,  status:'active',     fuel:66, load:1.6, cap:4.0, speed:15, odo:7320,  routeClass:'secondary' },
  { id:'V-024', type:'Compactor',   driver:'G. Perera',      zone:'Transfer Haul',   routeId:'R8',  posIdx:30,  status:'en_route',   fuel:68, load:5.8, cap:9.0, speed:28, odo:18400, routeClass:'haul' },
  { id:'V-025', type:'Auto Tipper', driver:'E. Seneviratne', zone:'Z1 Support',      routeId:'R11', posIdx:22,  status:'idle',       fuel:91, load:0.0, cap:5.0, speed:0,  odo:6120,  routeClass:'secondary' },
  // New vehicles for routes R16-R20 (spread across zones)
  { id:'V-026', type:'Auto Tipper', driver:'N. Dias',        zone:'Z1 Market',       routeId:'R16', posIdx:6,   status:'collecting', fuel:88, load:1.4, cap:5.0, speed:12, odo:4320,  routeClass:'secondary' },
  { id:'V-027', type:'Mini Truck',  driver:'S. Pieris',      zone:'Z3 Hospital',     routeId:'R17', posIdx:8,   status:'active',     fuel:74, load:0.8, cap:3.5, speed:14, odo:7840,  routeClass:'secondary' },
  { id:'V-028', type:'Compactor',   driver:'K. Amarasinghe', zone:'Z4 Coastal',      routeId:'R18', posIdx:10,  status:'collecting', fuel:61, load:2.3, cap:9.0, speed:18, odo:21400, routeClass:'secondary' },
  { id:'V-029', type:'Auto Tipper', driver:'A. Rupasinghe',  zone:'Z2 Night',        routeId:'R19', posIdx:4,   status:'idle',       fuel:95, load:0.0, cap:5.0, speed:0,  odo:8650,  routeClass:'secondary' },
  { id:'V-030', type:'Compactor',   driver:'T. Gunaratne',   zone:'Z1-Z3 Haul',      routeId:'R20', posIdx:10,  status:'en_route',   fuel:57, load:5.4, cap:9.0, speed:25, odo:32100, routeClass:'haul' },
].map((vehicle) => {
  const pathLength = ACTIVE_ROUTE_PATHS[vehicle.routeId]?.length || 1;
  return {
    ...vehicle,
    posIdx: Math.min(vehicle.posIdx, pathLength - 1),
    routeDir: 1,
  };
});

const BIN_BLUEPRINTS = [
  { factor:0.42, vertex:0, type:'mixed',      cap:1100 },
  { factor:0.32, vertex:1, type:'recyclable', cap:660  },
  { factor:0.36, vertex:2, type:'organic',    cap:660  },
  { factor:0.28, vertex:3, type:'mixed',      cap:1100 },
];

// Override positions for bins whose computed location falls in a water body
// (Beira Lake, Kelani River, harbour, or ocean). New positions are on nearby dry land.
const BIN_LAND_OVERRIDES = {
  'BN-003': [6.9650, 79.8680], // W01 Fort: pulls toward Kelani River/port edge → Bloemendhal inland
  'BN-014': [6.9280, 79.8590], // W04 Maradana: pulls toward Galle Face harbour waterfront → inland
  'BN-027': [6.9070, 79.8635], // W07 Slave Island: lands at Beira Lake west shore → inland
  'BN-028': [6.9060, 79.8675], // W07 Slave Island: lands inside Beira Lake → inland
  'BN-037': [6.8738, 79.8650], // W10 Kollupitiya: lands at Wellawatta beach → inland
  'BN-038': [6.8780, 79.8630], // W10 Kollupitiya: lands at Bambalapitiya shoreline → inland
  'BN-039': [6.8820, 79.8630], // W10 Kollupitiya: lands at shoreline (79.855) → Galle Road inland
};

const INIT_BINS = BASE_WARDS.flatMap((ward, wardIndex) => BIN_BLUEPRINTS.map((blueprint, blueprintIndex) => {
  const vertex = ward.pts[blueprint.vertex];
  const lat = ward.cLat + (vertex[0] - ward.cLat) * blueprint.factor;
  const lng = ward.cLng + (vertex[1] - ward.cLng) * blueprint.factor;
  const fill = Math.min(96, 26 + ((wardIndex * 17 + blueprintIndex * 19) % 66));
  const id = 'BN-' + String(wardIndex * BIN_BLUEPRINTS.length + blueprintIndex + 1).padStart(3, '0');
  const override = BIN_LAND_OVERRIDES[id];
  return {
    id,
    wardId: ward.id,
    ward: ward.name,
    zone: ward.zoneId,
    lat: override ? override[0] : lat,
    lng: override ? override[1] : lng,
    fill,
    cap: blueprint.cap,
    type: blueprint.type,
    status: fill > 85 ? 'overflow' : fill > 65 ? 'needs_collection' : 'normal',
  };
}));

const complaintPoint = (wardId, vertexIndex, factor) => {
  const ward = BASE_WARDS.find((item) => item.id === wardId);
  const vertex = ward?.pts?.[vertexIndex] || [ward.cLat, ward.cLng];
  return [
    ward.cLat + (vertex[0] - ward.cLat) * factor,
    ward.cLng + (vertex[1] - ward.cLng) * factor,
  ];
};

const COMPLAINTS_STATIC = [
  (() => { const [lat, lng] = complaintPoint('W02', 2, 0.45); return { id:'CMP-4521', wardId:'W02', type:'overflow_bin',  ward:'Pettah',        lat, lng, status:'open',     priority:'high',     reporter:'R. Jayawardena', time:'09:14', desc:'Large market-side bin bank overflowing along the Pettah service lane' }; })(),
  (() => { const [lat, lng] = complaintPoint('W08', 1, 0.36); return { id:'CMP-4520', wardId:'W08', type:'missed_pickup', ward:'Borella',       lat, lng, status:'assigned', priority:'medium',   reporter:'S. Bandara',     time:'08:52', desc:'Repeated missed collection reported from a Borella back street cluster' }; })(),
  (() => { const [lat, lng] = complaintPoint('W05', 2, 0.50); return { id:'CMP-4519', wardId:'W05', type:'illegal_dump',  ward:'Grandpass',     lat, lng, status:'open',     priority:'critical', reporter:'N. De Silva',    time:'07:30', desc:'Illegal dumping mound reported beside the eastern freight corridor' }; })(),
  (() => { const [lat, lng] = complaintPoint('W03', 0, 0.30); return { id:'CMP-4518', wardId:'W03', type:'odor',          ward:'Kotahena',      lat, lng, status:'open',     priority:'low',      reporter:'A. Wijeratne',   time:'11:05', desc:'Persistent odor complaint near the Kotahena collection cluster' }; })(),
  (() => { const [lat, lng] = complaintPoint('W12', 0, 0.34); return { id:'CMP-4517', wardId:'W12', type:'overflow_bin',  ward:'Wellawatta',    lat, lng, status:'resolved', priority:'high',     reporter:'T. Kumara',      time:'06:45', desc:'Residential street-side compactor bin already serviced this morning' }; })(),
  (() => { const [lat, lng] = complaintPoint('W15', 2, 0.32); return { id:'CMP-4516', wardId:'W15', type:'missed_pickup', ward:'Rajagiriya',    lat, lng, status:'open',     priority:'medium',   reporter:'L. Peiris',      time:'10:22', desc:'Rajagiriya area reported no door-to-door pickup for three collection cycles' }; })(),
  (() => { const [lat, lng] = complaintPoint('W04', 2, 0.44); return { id:'CMP-4515', wardId:'W04', type:'illegal_dump',  ward:'Maradana',      lat, lng, status:'open',     priority:'high',     reporter:'M. Fernando',    time:'08:15', desc:'Loose waste pile accumulating around the Maradana junction median' }; })(),
  (() => { const [lat, lng] = complaintPoint('W14', 1, 0.38); return { id:'CMP-4514', wardId:'W14', type:'overflow_bin',  ward:'Kirulapone',    lat, lng, status:'assigned', priority:'medium',   reporter:'C. Rodrigo',     time:'09:50', desc:'Public park smart bin nearing full capacity with damaged RFID tag' }; })(),
];

const CAMERAS = [
  { id:'CAM-001', name:'Pettah Market Spine',          lat:6.9362, lng:79.8550, status:'active',  detect:'Collection vehicles routing through the northern market lanes' },
  { id:'CAM-002', name:'Borella Transfer Stn',         lat:6.9120, lng:79.8685, status:'active',  detect:'Vehicle unloading in progress' },
  { id:'CAM-003', name:'Dehiwala Transfer Gate',       lat:6.8603, lng:79.8692, status:'active',  detect:'Normal transfer operations' },
  { id:'CAM-004', name:'Grandpass Freight Edge',       lat:6.9315, lng:79.8788, status:'alert',   detect:'Unauthorized dumping movement detected near the service road' },
  { id:'CAM-005', name:'Kerawalapitiya WTE Gate',      lat:7.0100, lng:79.8998, status:'active',  detect:'Vehicle queue: 3 units' },
  { id:'CAM-006', name:'Karadiyana Entry Gate',        lat:6.8348, lng:79.9668, status:'offline', detect:'Signal lost' },
  { id:'CAM-007', name:'Kotahena North Junction',      lat:6.9558, lng:79.8748, status:'active',  detect:'Residential collection on schedule — 2 vehicles active' },
  { id:'CAM-008', name:'Modara Northern Checkpoint',   lat:6.9680, lng:79.8680, status:'active',  detect:'Northern port access — vehicle queue 1 unit' },
  { id:'CAM-009', name:'Slave Island Bridge Gate',     lat:6.9028, lng:79.8642, status:'alert',   detect:'Unauthorized dump detected near Union Place approach' },
  { id:'CAM-010', name:'Bambalapitiya Junction',       lat:6.8775, lng:79.8635, status:'active',  detect:'Coastal residential collection in progress' },
  { id:'CAM-011', name:'Kirulapone Canal Checkpoint',  lat:6.8548, lng:79.8745, status:'active',  detect:'Normal operations — bin fill avg 66%' },
  // Additional cameras — zones 1, 2, 3, 4, 5 for full coverage
  { id:'CAM-012', name:'Cinnamon Gardens Roundabout',  lat:6.9024, lng:79.8624, status:'active',  detect:'Residential sweep in progress — 2 vehicles on Gregory Road' },
  { id:'CAM-013', name:'Kollupitiya Main Junction',    lat:6.8835, lng:79.8590, status:'active',  detect:'Commercial-zone bin servicing — sweeper active at junction' },
  { id:'CAM-014', name:'Bambalapitiya Market Gate',    lat:6.8750, lng:79.8600, status:'active',  detect:'Street-market debris collection — V-018 on final pass' },
  { id:'CAM-015', name:'Kirulapone Central Depot',     lat:6.8560, lng:79.8760, status:'active',  detect:'Canal-side bin bank — fill avg 58%, on schedule' },
  { id:'CAM-016', name:'Havelock Town Depot Exit',     lat:6.8624, lng:79.8738, status:'alert',   detect:'Unauthorized vehicle parked at depot rear gate — monitoring' },
  { id:'CAM-017', name:'Kotahena Market Entrance',     lat:6.9575, lng:79.8756, status:'active',  detect:'Morning market waste loading — V-015 confirmed active' },
  { id:'CAM-018', name:'Narahenpita Corridor Gate',    lat:6.8955, lng:79.8885, status:'active',  detect:'Normal operations — bin fill avg 54%, no incidents' },
  { id:'CAM-019', name:'Dematagoda Depot Gate',        lat:6.9284, lng:79.8862, status:'active',  detect:'V-016 departing for Zone 2 morning route — on schedule' },
];

const INIT_WEIGHBRIDGES = [
  { id:'WB-001', name:'Borella Transfer Weighbridge',     lat:6.9119, lng:79.8689, status:'active', todayTons:148.6, lastVehicle:'V-004', lastWeight:'7.4', lastTime:'11:28', queue:2, cameraId:'CAM-002' },
  { id:'WB-002', name:'Kerawalapitiya Gate Weighbridge',  lat:7.0102, lng:79.9006, status:'queued', todayTons:164.3, lastVehicle:'V-019', lastWeight:'8.6', lastTime:'11:42', queue:4, cameraId:'CAM-005' },
  { id:'WB-003', name:'Karadiyana Entry Weighbridge',     lat:6.8347, lng:79.9671, status:'active', todayTons:132.8, lastVehicle:'V-020', lastWeight:'9.1', lastTime:'11:34', queue:1, cameraId:'CAM-006' },
  { id:'WB-004', name:'Dehiwala Transfer Weighbridge',    lat:6.8598, lng:79.8702, status:'active', todayTons:92.4,  lastVehicle:'V-013', lastWeight:'5.8', lastTime:'11:22', queue:1, cameraId:'CAM-003' },
  { id:'WB-005', name:'Nugegoda Recycling Weighbridge',   lat:6.8716, lng:79.9010, status:'active', todayTons:61.2,  lastVehicle:'V-007', lastWeight:'3.1', lastTime:'10:58', queue:0, cameraId:null },
  { id:'WB-006', name:'Moratuwa Compost Weighbridge',     lat:6.7946, lng:79.8827, status:'active', todayTons:42.8,  lastVehicle:'V-021', lastWeight:'4.2', lastTime:'11:15', queue:0, cameraId:null },
];

const STAFF_BLUEPRINTS = [
  { id:'ST-001', name:'D. Wijesekara',    wardId:'W01', type:'sweeper',   status:'on_route', compliance:96, drift:[0.000012, 0.000008] },
  { id:'ST-002', name:'P. Jayantha',      wardId:'W02', type:'sweeper',   status:'on_route', compliance:88, drift:[0.000008, 0.000015] },
  { id:'ST-003', name:'U. Bandara',       wardId:'W04', type:'collector', status:'break',    compliance:72, drift:[0, 0] },
  { id:'ST-004', name:'S. Nimal',         wardId:'W10', type:'sweeper',   status:'on_route', compliance:94, drift:[0.000010, -0.000010] },
  { id:'ST-005', name:'W. Kumarasiri',    wardId:'W11', type:'collector', status:'on_route', compliance:91, drift:[0.000006, 0.000014] },
  { id:'ST-006', name:'B. Premratne',     wardId:'W12', type:'sweeper',   status:'on_route', compliance:98, drift:[0.000014, 0.000006] },
  { id:'ST-007', name:'L. Jayasekara',    wardId:'W15', type:'collector', status:'absent',   compliance:0,  drift:[0, 0] },
  { id:'ST-008', name:'R. Kulatunga',     wardId:'W14', type:'sweeper',   status:'on_route', compliance:85, drift:[-0.000010, 0.000012] },
  { id:'ST-009', name:'N. Dhanushka',     wardId:'W05', type:'collector', status:'on_route', compliance:90, drift:[0.000009, 0.000007] },
  { id:'ST-010', name:'A. Shamika',       wardId:'W14', type:'sweeper',   status:'on_route', compliance:87, drift:[0.000007, -0.000006] },
  // Zone 3 staff (W07 Slave Island, W08 Borella, W09 Narahenpita)
  { id:'ST-011', name:'C. Jayathilake',   wardId:'W07', type:'sweeper',   status:'on_route', compliance:82, drift:[-0.000008, 0.000012] },
  { id:'ST-012', name:'P. Gunasekara',    wardId:'W08', type:'collector', status:'on_route', compliance:94, drift:[0.000010, 0.000008] },
  { id:'ST-013', name:'S. Abeywickrama',  wardId:'W09', type:'sweeper',   status:'break',    compliance:0,  drift:[0, 0] },
  // Additional staff for better zone coverage
  { id:'ST-014', name:'R. Thilakaratne',  wardId:'W03', type:'collector', status:'on_route', compliance:88, drift:[0.000006, -0.000010] },
  { id:'ST-015', name:'M. Karunathilake', wardId:'W06', type:'sweeper',   status:'on_route', compliance:79, drift:[-0.000007, 0.000009] },
  { id:'ST-016', name:'T. Ranaweera',     wardId:'W13', type:'collector', status:'on_route', compliance:92, drift:[0.000011, 0.000005] },
  { id:'ST-017', name:'K. Dissanayake',   wardId:'W05', type:'collector', status:'on_route', compliance:85, drift:[0.000007, -0.000008] },
  { id:'ST-018', name:'A. Jayawardena',   wardId:'W07', type:'sweeper',   status:'on_route', compliance:91, drift:[-0.000009, 0.000011] },
  { id:'ST-019', name:'S. Ranathunga',    wardId:'W10', type:'collector', status:'on_route', compliance:88, drift:[0.000013, 0.000005] },
  { id:'ST-020', name:'P. Weerasinghe',   wardId:'W11', type:'sweeper',   status:'on_route', compliance:76, drift:[-0.000006, 0.000013] },
  { id:'ST-021', name:'N. Gunawardena',   wardId:'W13', type:'collector', status:'on_route', compliance:93, drift:[0.000008, 0.000009] },
  { id:'ST-022', name:'R. Wickramasinghe',wardId:'W15', type:'sweeper',   status:'on_route', compliance:82, drift:[-0.000011, 0.000007] },
  { id:'ST-023', name:'L. Maheepala',     wardId:'W02', type:'supervisor',status:'on_route', compliance:97, drift:[0.000005, 0.000006] },
  { id:'ST-024', name:'C. Athukorala',    wardId:'W09', type:'collector', status:'on_route', compliance:89, drift:[0.000010, -0.000012] },
];

const STAFF_INIT = STAFF_BLUEPRINTS.map((blueprint) => {
  const ward = BASE_WARDS.find((item) => item.id === blueprint.wardId);
  return {
    ...blueprint,
    ward: ward.name,
    zone: ward.zoneId,
    lat: ward.cLat,
    lng: ward.cLng,
    dlat: blueprint.drift[0],
    dlng: blueprint.drift[1],
  };
});

const LAYER_CONFIG = [
  { key:'zones',        label:'Zone Boundaries', icon:'🗺️' },
  { key:'wards',        label:'Ward Boundaries', icon:'🏘️' },
  { key:'vehicles',     label:'Vehicles (GPS)',  icon:'🚛' },
  { key:'bins',         label:'Smart Bins',      icon:'🗑️' },
  { key:'weighbridges', label:'Weighbridges',    icon:'⚖️' },
  { key:'staff',        label:'Staff Tracking',  icon:'👷' },
  { key:'complaints',   label:'Complaints',      icon:'📋' },
  { key:'cameras',      label:'CCTV Cameras',    icon:'📷' },
];

// ── ZONE FILTERING HELPERS ─────────────────────────────────────────────────
const ZONE_LAT_BANDS = {
  Z1: [6.949, 6.975], Z2: [6.916, 6.949], Z3: [6.888, 6.916],
  Z4: [6.868, 6.888], Z5: [6.848, 6.868],
};
const inZoneByLat = (lat, zid) => {
  const b = ZONE_LAT_BANDS[zid]; return !b || (lat >= b[0] && lat <= b[1]);
};
const WARD_ZONE_MAP = Object.fromEntries(BASE_WARDS.map(w => [w.id, w.zoneId]));
const ROUTE_ZONE_SETS = Object.fromEntries(
  Object.entries(ROUTE_BLUEPRINTS).map(([rid, r]) => [
    rid, new Set((r.wardIds || []).map(wid => WARD_ZONE_MAP[wid]).filter(Boolean)),
  ])
);

// ── UTILITY / ICON FUNCTIONS ────────────────────────────────────────────────
const getBinColor  = (f) => f > 85 ? '#ef4444' : f > 65 ? '#f59e0b' : '#10b981';
const getVehColor  = (s) => ({ active:'#10b981', collecting:'#3b82f6', en_route:'#06b6d4', idle:'#6b7280', breakdown:'#ef4444', maintenance:'#f59e0b', returning:'#a855f7' })[s] || '#6b7280';
const getStatBg    = (s) => ({ active:'text-emerald-400', collecting:'text-blue-400', en_route:'text-cyan-400', idle:'text-slate-400', breakdown:'text-red-400', on_route:'text-emerald-400', break:'text-amber-400', absent:'text-red-400' })[s] || 'text-slate-400';

function mkVehIcon(v, sel) {
  const c = getVehColor(v.status);
  const em = v.type === 'Pushcart' ? '🛒' : v.type === 'Tractor' ? '🚜' : v.routeClass === 'primary' ? '🚚' : '🚛';
  const sz = sel ? 22 : v.routeClass === 'primary' ? 18 : 16;
  return L.divIcon({
    html: '<div style="background:' + c + 'dd;border:' + (sel ? '2px solid #fff' : '1px solid rgba(255,255,255,0.22)') + ';border-radius:50%;width:' + sz + 'px;height:' + sz + 'px;display:flex;align-items:center;justify-content:center;font-size:' + (sz/2.7) + 'px;box-shadow:0 0 ' + (sel?12:4) + 'px ' + c + '66;opacity:' + (sel ? '1' : '0.82') + ';">' + (v.status === 'breakdown' ? '⚠️' : em) + '</div>',
    className: '', iconSize: [sz, sz], iconAnchor: [sz/2, sz/2],
  });
}
function mkBinIcon(bin, sel) {
  const fillColor = getBinColor(bin.fill);
  const emoji = '🗑️'; // uniform icon for all bin types; color-coded by fill level
  const size = sel ? 22 : bin.fill > 85 ? 20 : bin.fill > 65 ? 18 : 16;
  return L.divIcon({
    html: '<div style="background:' + fillColor + '28;border:' + (sel ? '2px solid #fff' : '1.5px solid ' + fillColor) + ';border-radius:999px;width:' + size + 'px;height:' + size + 'px;display:flex;align-items:center;justify-content:center;font-size:' + Math.round(size * 0.54) + 'px;box-shadow:0 0 ' + (sel ? 12 : 5) + 'px ' + fillColor + '55;opacity:' + (sel ? '1' : '0.88') + ';">' + emoji + '</div>',
    className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  });
}
function mkFacIcon(f) {
  const isWte     = f.type === 'wte';
  const isMajor   = isWte || f.type === 'landfill' || f.type === 'transfer';
  const sz        = isWte ? 44 : f.type === 'landfill' ? 40 : f.type === 'transfer' ? 36 : 30;
  const br        = isWte ? '10px' : f.type === 'recycling' ? '50%' : '6px';
  const border    = isMajor ? '2.5px solid ' + f.color : '1.5px solid ' + f.color;
  const glow      = isWte ? 'box-shadow:0 0 20px ' + f.color + '88,0 0 8px ' + f.color + '55;' : f.type === 'landfill' ? 'box-shadow:0 0 16px ' + f.color + '77,0 0 5px ' + f.color + '44;' : f.type === 'transfer' ? 'box-shadow:0 0 14px ' + f.color + '66;' : 'box-shadow:0 0 8px ' + f.color + '33;';
  const badge     = f.capPct > 80 ? '<div style="position:absolute;top:-5px;right:-5px;background:#ef444488;border:1px solid #ef4444;color:#fff;font-size:6px;font-weight:900;border-radius:999px;padding:1px 3px;line-height:1;">' + f.capPct + '%</div>' : '';
  const label     = '<div style="position:absolute;top:' + (sz + 4) + 'px;left:50%;transform:translateX(-50%);font-size:7px;color:' + f.color + ';white-space:nowrap;font-weight:800;letter-spacing:0.06em;text-shadow:0 0 8px rgba(0,0,0,0.7);">' + (isWte ? 'WASTE TO ENERGY' : f.type.toUpperCase()) + '</div>';
  return L.divIcon({
    html: '<div style="position:relative;width:' + sz + 'px;height:' + (sz + 16) + 'px;"><div style="position:absolute;inset:0;background:' + f.color + '26;border:' + border + ';border-radius:' + br + ';display:flex;align-items:center;justify-content:center;font-size:' + (sz * 0.48) + 'px;' + glow + '">' + f.icon + badge + '</div>' + label + '</div>',
    className: '', iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
  });
}
function mkWeighIcon(bridge, sel) {
  const clr = bridge.status === 'queued' ? '#f59e0b' : bridge.status === 'offline' ? '#6b7280' : '#10b981';
  const size = sel ? 36 : 32;
  return L.divIcon({
    html: '<div style="position:relative;width:' + size + 'px;height:' + (size + 16) + 'px;"><div style="position:absolute;inset:0;background:' + clr + '22;border:' + (sel ? '2.5px solid #fff' : '2px solid ' + clr) + ';border-radius:12px;width:' + size + 'px;height:' + size + 'px;display:flex;align-items:center;justify-content:center;font-size:' + Math.round(size * 0.62) + 'px;box-shadow:0 0 ' + (sel ? 22 : 16) + 'px ' + clr + '66;">⚖️' + (bridge.queue > 0 ? '<div style="position:absolute;top:-6px;right:-6px;background:' + (bridge.queue > 3 ? '#ef4444' : clr) + ';color:#fff;border-radius:999px;min-width:14px;height:14px;padding:0 3px;font-size:8px;line-height:14px;font-weight:800;">' + bridge.queue + '</div>' : '') + '</div><div style="position:absolute;top:' + (size + 4) + 'px;left:50%;transform:translateX(-50%);font-size:7px;color:' + clr + ';white-space:nowrap;font-weight:800;letter-spacing:0.06em;text-shadow:0 0 8px rgba(0,0,0,0.7);">WEIGHBRIDGE</div></div>',
    className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  });
}
function mkCamIcon(c) {
  const clr   = c.status === 'alert' ? '#ef4444' : c.status === 'offline' ? '#6b7280' : '#10b981';
  const glow  = c.status === 'alert' ? 'box-shadow:0 0 10px #ef444466;' : c.status !== 'offline' ? 'box-shadow:0 0 4px ' + clr + '44;' : '';
  const badge = c.status === 'alert' ? '<div style="position:absolute;top:-4px;right:-4px;background:#ef4444;border-radius:50%;width:7px;height:7px;"/>' : '';
  return L.divIcon({
    html: '<div style="position:relative;background:' + clr + '25;border:1.5px solid ' + clr + ';border-radius:4px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;' + glow + '">📷' + badge + '</div>',
    className: '', iconSize: [22, 22], iconAnchor: [11, 11],
  });
}
function mkCmpIcon(c) {
  const clr  = c.priority === 'critical' ? '#ef4444' : c.priority === 'high' ? '#f59e0b' : c.priority === 'medium' ? '#3b82f6' : '#6b7280';
  const em   = c.type === 'overflow_bin' ? '🗑' : c.type === 'illegal_dump' ? '⛔' : c.type === 'odor' ? '💨' : '📅';
  const sz   = c.priority === 'critical' ? 28 : c.priority === 'high' ? 22 : 18;
  const brd  = c.priority === 'critical' ? '2px solid ' + clr : '1.5px solid ' + clr;
  const glow = c.priority === 'critical' ? 'box-shadow:0 0 12px ' + clr + '77;' : c.priority === 'high' ? 'box-shadow:0 0 6px ' + clr + '55;' : '';
  return L.divIcon({
    html: '<div style="background:' + clr + '25;border:' + brd + ';border-radius:50%;width:' + sz + 'px;height:' + sz + 'px;display:flex;align-items:center;justify-content:center;font-size:' + Math.round(sz * 0.52) + 'px;' + glow + '">' + em + '</div>',
    className: '', iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
  });
}
function mkStfIcon(s) {
  const clr  = s.status === 'on_route' ? '#06b6d4' : s.status === 'break' ? '#f59e0b' : s.status === 'absent' ? '#ef4444' : '#6b7280';
  const em   = s.type === 'collector' ? '🧹' : '👷';
  const sz   = 17;
  return L.divIcon({
    html: '<div style="background:' + clr + '33;border:1px solid ' + clr + ';border-radius:50%;width:' + sz + 'px;height:' + sz + 'px;display:flex;align-items:center;justify-content:center;font-size:8px;">' + em + '</div>',
    className: '', iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
  });
}
const BIN_TYPE_STROKE = { organic: '#84cc16', recyclable: '#3b82f6', mixed: '#94a3b8' };
const CAM_HEADINGS = {
  'CAM-001':200,'CAM-002':0,'CAM-003':120,'CAM-004':315,'CAM-005':90,'CAM-006':45,
  'CAM-007':270,'CAM-008':180,'CAM-009':90,'CAM-010':200,'CAM-011':45,
  'CAM-012':180,'CAM-013':270,'CAM-014':90,'CAM-015':315,'CAM-016':180,
  'CAM-017':135,'CAM-018':90,'CAM-019':225,
};

// ── CCTV VIDEO PLAYER ────────────────────────────────────────────────────────
function CCTVVideo({ src, cameraId, camStatus }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);
  const isOffline = camStatus === 'offline';
  const isAlert   = camStatus === 'alert';
  return (
    <div className="relative w-full rounded border border-cwm-border overflow-hidden bg-black" style={{ aspectRatio: '296/188' }}>
      {!isOffline && (
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      )}
      {isOffline && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <span className="text-slate-500 text-xs font-mono">NO SIGNAL</span>
        </div>
      )}
      {/* HUD overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ fontFamily: 'monospace', fontSize: 9 }}>
        {/* top-left: camera ID + time */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
          <span style={{ color: isOffline ? '#ef4444' : '#00c850', textShadow: '0 0 4px #000' }}>{cameraId}</span>
          <span style={{ color: isOffline ? '#ef4444' : '#00c850', textShadow: '0 0 4px #000' }}>{time}</span>
        </div>
        {/* top-right: REC */}
        {!isOffline && (
          <span className="absolute top-1.5 right-1.5" style={{ color: 'rgba(220,220,220,0.8)', textShadow: '0 0 4px #000' }}>● REC</span>
        )}
        {/* bottom-left: status */}
        <div className="absolute bottom-1.5 left-1.5">
          {isAlert   && <span style={{ color: '#ef4444', textShadow: '0 0 4px #000' }}>⚠ ALERT ACTIVE</span>}
          {isOffline && <span style={{ color: '#6b7280' }}>NO SIGNAL</span>}
          {!isAlert && !isOffline && <span style={{ color: 'rgba(0,200,80,0.8)', textShadow: '0 0 4px #000' }}>● LIVE</span>}
        </div>
        {/* scanline effect */}
        <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 3px)' }} />
      </div>
    </div>
  );
}

function MapFocusController({ target }) {
  const map = useMap();

  useEffect(() => {
    if (!target?.center) return;
    map.flyTo(target.center, target.zoom || map.getZoom(), { animate: true, duration: 0.75 });
  }, [map, target]);

  return null;
}


// ── ENTITY DETAIL PANEL ──────────────────────────────────────────────────────
function EntityPanel({ entity, onClose, onAction, routePaths, onRerouteToAlert }) {
  const { type, data } = entity;

  const TYPE_META = {
    vehicle:   { badge:'VEHICLE UNIT', clr:'#06b6d4' },
    bin:       { badge:'SMART BIN',    clr:'#10b981' },
    facility:  { badge:'FACILITY',     clr:'#f59e0b' },
    complaint: { badge:'INCIDENT',     clr:'#ef4444' },
    camera:    { badge:'CCTV UNIT',    clr:'#8b5cf6' },
    staff:     { badge:'FIELD STAFF',  clr:'#06b6d4' },
    ward:      { badge:'WARD METRICS', clr:'#22c55e' },
    weighbridge:{ badge:'WEIGHBRIDGE', clr:'#f59e0b' },
  };
  const meta = TYPE_META[type] || TYPE_META.vehicle;

  const STATUS_MAP = {
    active:'ACTIVE', collecting:'COLLECTING', en_route:'EN ROUTE', idle:'IDLE',
    breakdown:'BREAKDOWN', maintenance:'MAINTENANCE', returning:'RETURNING',
    on_route:'ON ROUTE', break:'ON BREAK', absent:'ABSENT',
    normal:'NORMAL', needs_collection:'NEEDS COLLECTION', overflow:'OVERFLOW',
    open:'OPEN', assigned:'ASSIGNED', resolved:'RESOLVED',
    alert:'ALERT', offline:'OFFLINE', queued:'QUEUED',
  };
  const STATUS_CLR = {
    active:'#10b981', collecting:'#3b82f6', en_route:'#06b6d4', idle:'#6b7280',
    breakdown:'#ef4444', maintenance:'#f59e0b', returning:'#a855f7',
    on_route:'#10b981', break:'#f59e0b', absent:'#ef4444',
    normal:'#10b981', needs_collection:'#f59e0b', overflow:'#ef4444',
    open:'#ef4444', assigned:'#f59e0b', resolved:'#10b981',
    alert:'#ef4444', offline:'#6b7280', queued:'#f59e0b',
  };
  const status      = data.status || 'normal';
  const statusLabel = STATUS_MAP[status] || status.toUpperCase();
  const statusColor = STATUS_CLR[status] || '#6b7280';
  const hasAlert    = ['breakdown','overflow','alert','open'].includes(status);

  // ── sub-components ──────────────────────────────────────────────────────────
  const TBar = ({ pct, clr, h='h-2' }) => (
    <div className={'w-full '+h+' bg-white/[0.06] rounded-full overflow-hidden'}>
      <div className="h-full rounded-full" style={{width:Math.min(pct||0,100)+'%',background:clr,transition:'width 0.5s ease'}}/>
    </div>
  );


  // Title-case helper — capitalises first letter of each word, converts underscores to spaces
  const toTitleCase = s => s ? String(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : s;

  const MetCard = ({ label, val, vc, sub }) => (
    <div className="bg-white/[0.025] rounded-lg p-2.5 border border-white/[0.06]">
      <p className={'text-sm font-bold leading-none '+(vc||'text-white')}>{val}</p>
      {sub && <p className="text-[9px] text-slate-500 mt-0.5">{sub}</p>}
      <p className="text-[8px] font-semibold text-slate-500 uppercase tracking-widest mt-1.5">{label}</p>
    </div>
  );

  const SHdr = ({ title }) => (
    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1.5 pl-0.5">{title}</p>
  );

  const SBox = ({ children }) => (
    <div className="bg-white/[0.025] rounded-lg border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
      {children}
    </div>
  );

  const SRow = ({ label, value, vc }) => (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={'text-[10px] font-semibold '+(vc||'text-slate-200')}>{value}</span>
    </div>
  );

  const SGrd2 = ({ cells }) => (
    <div className="bg-white/[0.025] rounded-lg border border-white/[0.06] overflow-hidden">
      <div className="grid grid-cols-2">
        {cells.map(([lbl,val,vc],i) => (
          <div key={i} className={'px-3 py-2 '+(i%2===0&&i<cells.length-1?'border-r border-white/[0.04] ':'')+((i<cells.length-2)?'border-b border-white/[0.04]':'')}>
            <p className="text-[8px] font-semibold text-slate-600 uppercase tracking-wide">{lbl}</p>
            <p className={'text-[10px] font-bold mt-0.5 '+(vc||'text-slate-200')}>{val}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const BtnRow = ({ btns }) => (
    <div className={'grid gap-1.5 '+(btns.length===1?'grid-cols-1':'grid-cols-2')}>
      {btns.map(({ label, onClick, clr='cyan' },i) => {
        const C = {
          cyan:   'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25',
          amber:  'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25',
          red:    'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25',
          emerald:'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25',
          purple: 'bg-purple-500/15 border-purple-500/30 text-purple-400 hover:bg-purple-500/25',
        };
        return <button key={i} onClick={onClick} className={'py-2 text-[10px] font-semibold rounded-lg border transition-colors '+(C[clr]||C.cyan)}>{label}</button>;
      })}
    </div>
  );

  const MonitorBtn = ({ label, onClick }) => (
    <button onClick={onClick} className="w-full py-2.5 text-[10px] font-semibold rounded-lg bg-white/[0.02] border border-white/[0.07] text-slate-400 hover:bg-white/[0.05] hover:text-white transition-colors flex items-center justify-between px-3 group">
      <span>{label}</span><span className="group-hover:translate-x-0.5 transition-transform">›</span>
    </button>
  );

  // ── per-entity type content ─────────────────────────────────────────────────
  const renderContent = () => {

    /* VEHICLE */
    if (type === 'vehicle') {
      const fuelClr = data.fuel<25?'#ef4444':data.fuel<50?'#f59e0b':'#10b981';
      const fuelVc  = data.fuel<25?'text-red-400':data.fuel<50?'text-amber-400':'text-emerald-400';
      const loadPct = ((data.load/data.cap)*100)||0;
      const health  = Math.max(20, 100-(data.status==='breakdown'?80:data.status==='maintenance'?40:0)-(100-data.fuel)*0.3);
      return (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <MetCard label="SPEED"    val={(data.speed?.toFixed(0)||0)+' km/h'} vc="text-cyan-400" />
            <MetCard label="FUEL"     val={(data.fuel?.toFixed(0)||0)+'%'}      vc={fuelVc} />
            <MetCard label="LOAD"     val={(data.load?.toFixed(1)||0)+' t'}     vc="text-blue-400" sub={'cap: '+data.cap+' t'} />
            <MetCard label="PROGRESS" val={Math.round((data.posIdx/(routePaths[data.routeId]?.length||1))*100)+'%'} vc="text-slate-300" sub="route" />
          </div>

          <div>
            <SHdr title="VEHICLE IDENTITY" />
            <SGrd2 cells={[
              ['Unit ID',  data.id,                            'text-cyan-400'],
              ['Type',     toTitleCase(data.type)],
              ['Driver',   typeof data.driver === 'object' ? data.driver?.name : data.driver, 'text-white'],
              ['Zone',     toTitleCase(data.zone),             'text-cyan-400'],
              ['Route',    ROUTE_DEFS[data.routeId]?.name || '—'],
              ['Route Type', (data.routeClass || ROUTE_DEFS[data.routeId]?.hierarchy || 'secondary').toUpperCase(), data.routeClass === 'primary' ? 'text-emerald-400' : data.routeClass === 'haul' ? 'text-amber-400' : 'text-blue-400'],
              ['Odometer', (data.odo?.toLocaleString()||0)+' km'],
            ]} />
          </div>

          <div>
            <SHdr title="TELEMETRY" />
            <div className="bg-white/[0.025] rounded-lg border border-white/[0.06] p-3 space-y-3">
              <div>
                <div className="flex justify-between text-[9px] mb-1.5">
                  <span className="text-slate-500 uppercase tracking-wide">Health Index</span>
                  <span className="text-emerald-400 font-bold">{health.toFixed(0)}%</span>
                </div>
                <TBar pct={health} clr="#10b981" />
              </div>
              <div>
                <div className="flex justify-between text-[9px] mb-1.5">
                  <span className="text-slate-500 uppercase tracking-wide">Fuel Level</span>
                  <span className={fuelVc+' font-bold'}>{data.fuel?.toFixed(0)}%</span>
                </div>
                <TBar pct={data.fuel} clr={fuelClr} />
              </div>
              <div>
                <div className="flex justify-between text-[9px] mb-1.5">
                  <span className="text-slate-500 uppercase tracking-wide">Load Factor</span>
                  <span className="text-blue-400 font-bold">{loadPct.toFixed(0)}%</span>
                </div>
                <TBar pct={loadPct} clr="#3b82f6" />
              </div>
            </div>
          </div>

          {data.status==='breakdown' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 text-[10px] text-red-400 flex items-start space-x-2">
              <span>⚠️</span><span>Vehicle breakdown — dispatch secondary unit immediately</span>
            </div>
          )}

          <BtnRow btns={[
            {label:'🚛 Dispatch',  onClick:()=>onAction('dispatch',data), clr:'cyan'},
            {label:'📡 Send Alert',onClick:()=>onAction('alert',data),    clr:'amber'},
          ]} />
          <MonitorBtn label="Open Vehicle Monitoring" onClick={()=>onAction('monitor',data)} />
        </>
      );
    }

    /* BIN */
    if (type === 'bin') {
      const fillClr = getBinColor(data.fill);
      const fillVc  = data.fill>85?'text-red-400':data.fill>65?'text-amber-400':'text-emerald-400';
      const volUsed = Math.round((data.fill||0)*(data.cap||660)/100);
      return (
        <>
          <div className="flex justify-center">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#1e293b" strokeWidth="3.5"/>
                <circle cx="18" cy="18" r="14" fill="none" stroke={fillClr} strokeWidth="3.5"
                  strokeDasharray={(data.fill||0)+' 100'} strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={'text-base font-bold leading-none '+fillVc}>{(data.fill||0).toFixed(0)}%</span>
                <span className="text-[7px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">FILL</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <MetCard label="CAPACITY"   val={data.cap+'L'}  vc="text-slate-300" />
            <MetCard label="USED"       val={volUsed+'L'}   vc="text-cyan-400" />
            <MetCard label="WASTE TYPE" val={toTitleCase(data.type)}     vc="text-slate-300" />
            <MetCard label="ZONE"       val={toTitleCase(data.zone)}     vc="text-emerald-400" />
          </div>

          <div>
            <SHdr title="IOT & RFID DATA" />
            <SBox>
              <SRow label="Bin ID"     value={data.id}   vc="text-cyan-400"/>
              <SRow label="Waste Type" value={toTitleCase(data.type)}/>
              <SRow label="Zone"       value={toTitleCase(data.zone)}/>
              <SRow label="Capacity"   value={data.cap+'L'}/>
            </SBox>
          </div>

          <div>
            <SHdr title="FILL LEVEL" />
            <div className="bg-white/[0.025] rounded-lg border border-white/[0.06] p-3">
              <div className="flex justify-between text-[9px] mb-1.5">
                <span className="text-slate-500 uppercase tracking-wide">Capacity Used</span>
                <span className={fillVc+' font-bold'}>{(data.fill||0).toFixed(0)}%</span>
              </div>
              <TBar pct={data.fill} clr={fillClr} h="h-3" />
            </div>
          </div>

          <BtnRow btns={(() => {
            const needsService = data.status === 'needs_collection' || data.status === 'overflow';
            if (needsService && onRerouteToAlert) {
              return [
                { label:'🗓️ Schedule Collection', onClick:()=>onAction('collect',data), clr:'emerald' },
                { label:'🚨 Assign Nearest Vehicle', onClick:()=>onRerouteToAlert({ id:data.id, type:'bin', lat:data.lat, lng:data.lng, name:'Bin '+data.id+' — '+data.ward }), clr:'red' },
              ];
            }
            return [{ label:'🗓️ Schedule Collection', onClick:()=>onAction('collect',data), clr:'emerald' }];
          })()} />
          <MonitorBtn label="Open Bin Monitoring" onClick={()=>onAction('monitor',data)} />
        </>
      );
    }

    /* FACILITY */
    if (type === 'facility') {
      const capVc  = data.capPct>80?'text-red-400':data.capPct>60?'text-amber-400':'text-emerald-400';
      const capClr = data.capPct>80?'#ef4444':data.capPct>60?'#f59e0b':'#10b981';
      const health = Math.max(0,100-data.capPct*0.55);
      return (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <MetCard label="CAPACITY"   val={data.capPct+'%'}      vc={capVc}/>
            <MetCard label="THROUGHPUT" val={data.throughput+' t'} vc="text-cyan-400" sub="today"/>
            <MetCard label="HEALTH IDX" val={health.toFixed(0)+'%'} vc="text-emerald-400"/>
            <MetCard label="TYPE"       val={toTitleCase(data.type)} vc="text-slate-300"/>
          </div>

          <div>
            <SHdr title="FACILITY OPERATIONS" />
            <SGrd2 cells={[
              ['Facility ID', data.id,                           'text-cyan-400'],
              ['Type',        toTitleCase(data.type)],
              ['Capacity',    data.capPct+'%',                   capVc],
              ['Throughput',  data.throughput+' t',              'text-cyan-400'],
            ]} />
          </div>

          <div>
            <SHdr title="PERFORMANCE" />
            <div className="bg-white/[0.025] rounded-lg border border-white/[0.06] p-3 space-y-3">
              <div>
                <div className="flex justify-between text-[9px] mb-1.5">
                  <span className="text-slate-500 uppercase tracking-wide">Health Index</span>
                  <span className="text-emerald-400 font-bold">{health.toFixed(0)}%</span>
                </div>
                <TBar pct={health} clr="#10b981" />
              </div>
              <div>
                <div className="flex justify-between text-[9px] mb-1.5">
                  <span className="text-slate-500 uppercase tracking-wide">Load Factor</span>
                  <span className={capVc+' font-bold'}>{data.capPct}%</span>
                </div>
                <TBar pct={data.capPct} clr={capClr} />
              </div>
            </div>
          </div>

          {data.capPct>80 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 text-[10px] text-amber-400">
              ⚠️ Approaching capacity limit — coordinate incoming loads
            </div>
          )}

          <BtnRow btns={[
            {label:'📋 Work Order',onClick:()=>onAction('workorder',data),clr:'amber'},
            {label:'🚛 Dispatch',  onClick:()=>onAction('dispatch',data), clr:'cyan'},
          ]} />
          <MonitorBtn label="Open Facility Monitoring" onClick={()=>onAction('report',data)} />
        </>
      );
    }

    /* COMPLAINT */
    if (type === 'complaint') {
      const PRICLR={critical:'text-red-400',high:'text-amber-400',medium:'text-blue-400',low:'text-slate-400'};
      const priVc = PRICLR[data.priority]||'text-slate-400';
      const stVc  = data.status==='resolved'?'text-emerald-400':data.status==='assigned'?'text-amber-400':'text-red-400';
      return (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <MetCard label="PRIORITY" val={(data.priority||'medium').toUpperCase()} vc={priVc}/>
            <MetCard label="STATUS"   val={(data.status||'open').toUpperCase()}      vc={stVc}/>
            <MetCard label="WARD"     val={toTitleCase(data.ward)}                   vc="text-slate-300"/>
            <MetCard label="REPORTED" val={data.time}                                vc="text-slate-300"/>
          </div>

          <div className="bg-white/[0.025] rounded-lg border border-white/[0.06] p-3">
            <p className="text-[10px] text-slate-400 leading-relaxed">{data.desc}</p>
          </div>

          <div>
            <SHdr title="INCIDENT DETAILS" />
            <SBox>
              <SRow label="Complaint ID" value={data.id}                       vc="text-cyan-400"/>
              <SRow label="Type"         value={toTitleCase(data.type)}/>
              <SRow label="Ward"         value={toTitleCase(data.ward)}/>
              <SRow label="Reporter"     value={data.reporter}                 vc="text-white"/>
              <SRow label="Reported At"  value={data.time}/>
            </SBox>
          </div>

          <div>
            <SHdr title="PROTECTION & CONTROL" />
            <SGrd2 cells={[
              ['Bus Protection', 'Active',    'text-emerald-400'],
              ['Differential',   data.status==='open'?'Alert':'Normal', data.status==='open'?'text-red-400':'text-emerald-400'],
              ['Overcurrent',    'Normal',    'text-emerald-400'],
              ['Earth Fault',    'Normal',    'text-emerald-400'],
              ['SCADA Link',     'Connected', 'text-emerald-400'],
              ['Last Sync',      '< 2 sec ago'],
            ]} />
          </div>

          <BtnRow btns={[
            {label:'🚛 Assign Vehicle', onClick:()=>{ onRerouteToAlert && onRerouteToAlert({ id:data.id, type:'complaint', lat:data.lat, lng:data.lng, name:data.type.replace(/_/g,' ')+' — '+data.ward }); onAction('assign',data); }, clr:'red'},
            {label:'✓ Resolve',        onClick:()=>onAction('resolve',data), clr:'emerald'},
          ]} />
          <MonitorBtn label="Open Incident Monitoring" onClick={()=>onAction('escalate',data)} />
        </>
      );
    }

    /* CAMERA */
    if (type === 'camera') {
      const stVc = data.status==='alert'?'text-red-400':data.status==='offline'?'text-slate-500':'text-emerald-400';
      return (
        <>
          <CCTVVideo src={['/videos/CCTV_Littering_Incident_Observation.mp4','/videos/CCTV_Littering_Incident_Observation_2.mp4'][parseInt(data.id.replace(/\D/g,''),10) % 2]} cameraId={data.id} camStatus={data.status} />

          <div className="grid grid-cols-2 gap-1.5">
            <MetCard label="STATUS" val={data.status?.toUpperCase()} vc={stVc}/>
            <MetCard label="TYPE"   val="IP CAM"                     vc="text-slate-300"/>
          </div>

          <div>
            <SHdr title="DETECTION" />
            <div className={'bg-white/[0.025] rounded-lg border p-3 '+(data.status==='alert'?'border-red-500/30':'border-white/[0.06]')}>
              <p className={'text-[10px] leading-relaxed '+stVc}>{data.detect}</p>
            </div>
          </div>

          <div>
            <SHdr title="CAMERA INFO" />
            <SBox>
              <SRow label="Camera ID" value={data.id}               vc="text-cyan-400"/>
              <SRow label="Location"  value={data.name}/>
              <SRow label="Status"    value={data.status?.toUpperCase()} vc={stVc}/>
            </SBox>
          </div>

          <div>
            <SHdr title="PROTECTION & CONTROL" />
            <SGrd2 cells={[
              ['Bus Protection', 'Active',     'text-emerald-400'],
              ['Differential',   'Normal',     'text-emerald-400'],
              ['Overcurrent',    data.status==='alert'?'Triggered':'Normal', data.status==='alert'?'text-red-400':'text-emerald-400'],
              ['SCADA Link',     'Connected',  'text-emerald-400'],
              ['Last Sync',      '< 2 sec ago'],
              ['Firmware',       'v3.8.2'],
            ]} />
          </div>

          {data.status==='alert' && (
            <BtnRow btns={[{label:'🚨 Dispatch Response Team',onClick:()=>onAction('respond',data),clr:'red'}]} />
          )}
          <MonitorBtn label="Open Full Camera Feed" onClick={()=>onAction('feed',data)} />
        </>
      );
    }

    if (type === 'weighbridge') {
      const stVc = data.status==='queued' ? 'text-amber-400' : data.status==='offline' ? 'text-slate-500' : 'text-emerald-400';
      return (
        <>
          <CCTVVideo src={['/videos/Industrial_Weighbridge_CCTV_Footage_Generation.mp4','/videos/Weighbridge_CCTV_Garbage_Truck_1.mp4','/videos/Weighbridge_CCTV_Garbage_Truck_2.mp4'][parseInt(data.id.replace(/\D/g,''),10) % 3]} cameraId={data.id} camStatus={data.status === 'queued' ? 'alert' : data.status} />

          <div className="grid grid-cols-2 gap-1.5">
            <MetCard label="STATUS" val={data.status?.toUpperCase()} vc={stVc}/>
            <MetCard label="QUEUE" val={String(data.queue)} vc={data.queue > 3 ? 'text-red-400' : 'text-slate-300'}/>
            <MetCard label="TODAY" val={data.todayTons?.toFixed(1)+' t'} vc="text-cyan-400"/>
            <MetCard label="LAST LOAD" val={data.lastWeight+' t'} vc="text-white"/>
          </div>

          <div>
            <SHdr title="WEIGHBRIDGE OPERATIONS" />
            <SBox>
              <SRow label="Bridge ID" value={data.id} vc="text-cyan-400"/>
              <SRow label="Location" value={data.name}/>
              <SRow label="Last Vehicle" value={data.lastVehicle} vc="text-white"/>
              <SRow label="Last Weight" value={data.lastWeight+' t'}/>
              <SRow label="Last Scan" value={data.lastTime}/>
            </SBox>
          </div>

          <div>
            <SHdr title="VIDEO & SENSOR FEED" />
            <SGrd2 cells={[
              ['ANPR Link', 'Connected', 'text-emerald-400'],
              ['Lane Camera', data.cameraId || 'Virtual', 'text-cyan-400'],
              ['Queue State', data.queue > 3 ? 'Heavy' : 'Nominal', data.queue > 3 ? 'text-amber-400' : 'text-emerald-400'],
              ['Scale Health', data.status === 'offline' ? 'Offline' : 'Online', data.status === 'offline' ? 'text-slate-500' : 'text-emerald-400'],
            ]} />
          </div>

          <BtnRow btns={[
            {label:'📹 Open Video Feed', onClick:()=>onAction('feed',data), clr:'purple'},
            {label:'⚙️ Calibrate', onClick:()=>onAction('calibrate',data), clr:'amber'},
          ]} />
          <MonitorBtn label="Open Weighbridge Monitoring" onClick={()=>onAction('monitor',data)} />
        </>
      );
    }

    if (type === 'ward') {
      const serviceVc = data.collectPct >= 90 ? 'text-emerald-400' : data.collectPct >= 80 ? 'text-amber-400' : 'text-red-400';
      return (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <MetCard label="SERVICE" val={data.collectPct+'%'} vc={serviceVc}/>
            <MetCard label="AVG FILL" val={data.avgFill.toFixed(0)+'%'} vc="text-cyan-400"/>
            <MetCard label="ACTIVE FLEET" val={String(data.fleetCoverage)} vc="text-white"/>
            <MetCard label="OPEN ISSUES" val={String(data.complaints + data.overflow)} vc={data.complaints + data.overflow > 0 ? 'text-amber-400' : 'text-emerald-400'}/>
          </div>

          <div>
            <SHdr title="WARD OVERVIEW" />
            <SBox>
              <SRow label="Ward ID" value={data.id} vc="text-cyan-400"/>
              <SRow label="Zone" value={toTitleCase(data.zoneId)}/>
              <SRow label="Land Use" value={toTitleCase(data.landUse)}/>
              <SRow label="Status" value={data.status.toUpperCase()} vc={serviceVc}/>
            </SBox>
          </div>

          <div>
            <SHdr title="COMBINED METRICS" />
            <SGrd2 cells={[
              ['Bins', data.bins],
              ['Overflow', data.overflow, data.overflow > 0 ? 'text-amber-400' : 'text-emerald-400'],
              ['Complaints', data.complaints, data.complaints > 0 ? 'text-red-400' : 'text-emerald-400'],
              ['Staff', data.staff, 'text-cyan-400'],
              ['Primary Routes', data.primaryRoutes],
              ['Secondary Routes', data.secondaryRoutes],
            ]} />
          </div>

          <div>
            <SHdr title="WARD COVERAGE" />
            <div className="bg-white/[0.025] rounded-lg border border-white/[0.06] p-3 space-y-2">
              <div>
                <div className="flex justify-between text-[9px] mb-1.5">
                  <span className="text-slate-500 uppercase tracking-wide">Collection Service</span>
                  <span className={serviceVc + ' font-bold'}>{data.collectPct}%</span>
                </div>
                <TBar pct={data.collectPct} clr={data.collectPct >= 90 ? '#10b981' : data.collectPct >= 80 ? '#f59e0b' : '#ef4444'} />
              </div>
              <div>
                <div className="flex justify-between text-[9px] mb-1.5">
                  <span className="text-slate-500 uppercase tracking-wide">Average Bin Fill</span>
                  <span className="text-cyan-400 font-bold">{data.avgFill.toFixed(0)}%</span>
                </div>
                <TBar pct={data.avgFill} clr="#06b6d4" />
              </div>
            </div>
          </div>

          <MonitorBtn label="Open Ward Operations Monitoring" onClick={()=>onAction('monitor',data)} />
        </>
      );
    }

    /* STAFF */
    if (type === 'staff') {
      const compClr = data.compliance>=90?'#10b981':data.compliance>=70?'#f59e0b':'#ef4444';
      const compVc  = data.compliance>=90?'text-emerald-400':data.compliance>=70?'text-amber-400':'text-red-400';
      return (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <MetCard label="STATUS"     val={(data.status||'unknown').replace(/_/g,' ').toUpperCase()} vc={getStatBg(data.status)}/>
            <MetCard label="COMPLIANCE" val={data.compliance+'%'} vc={compVc}/>
            <MetCard label="ROLE"       val={toTitleCase(data.type)}  vc="text-slate-300"/>
            <MetCard label="ZONE"       val={toTitleCase(data.zone)} vc="text-cyan-400"/>
          </div>

          <div>
            <SHdr title="STAFF IDENTITY" />
            <SBox>
              <SRow label="Staff ID" value={data.id}   vc="text-cyan-400"/>
              <SRow label="Name"     value={data.name} vc="text-white"/>
              <SRow label="Role"     value={toTitleCase(data.type)}/>
              <SRow label="Zone"     value={toTitleCase(data.zone)}/>
            </SBox>
          </div>

          <div>
            <SHdr title="PERFORMANCE" />
            <div className="bg-white/[0.025] rounded-lg border border-white/[0.06] p-3">
              <div className="flex justify-between text-[9px] mb-1.5">
                <span className="text-slate-500 uppercase tracking-wide">Route Compliance</span>
                <span className={compVc+' font-bold'}>{data.compliance}%</span>
              </div>
              <TBar pct={data.compliance} clr={compClr} />
            </div>
          </div>

          <div>
            <SHdr title="GPS TELEMETRY" />
            <SBox>
              <SRow label="Latitude"  value={data.lat?.toFixed(5)}/>
              <SRow label="Longitude" value={data.lng?.toFixed(5)}/>
            </SBox>
          </div>

          <MonitorBtn label="Open Staff Monitoring" onClick={()=>onAction('track',data)} />
        </>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full" style={{borderTop:'2px solid '+meta.clr+'55'}}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pt-3 pb-2.5 border-b border-cwm-border">
        <div className="flex items-start justify-between mb-2">
          <span className="text-[8px] font-bold px-2 py-0.5 rounded tracking-widest"
            style={{background:meta.clr+'18',color:meta.clr,border:'1px solid '+meta.clr+'35'}}>
            {meta.badge}
          </span>
          <button onClick={onClose}
            className="text-slate-600 hover:text-white text-lg leading-none transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-white/10">
            ×
          </button>
        </div>
        <p className="text-sm font-bold text-white leading-tight">{data.name || data.id}</p>
        {data.id && data.name && <p className="text-[9px] text-slate-500 font-mono mt-0.5">{data.id}</p>}
        {type==='vehicle' && <p className="text-[9px] text-slate-500">{toTitleCase(data.type)} · {toTitleCase(data.zone)}</p>}
        {type==='staff'   && <p className="text-[9px] text-slate-500">{toTitleCase(data.type)} · {toTitleCase(data.zone)}</p>}

        {/* Status row */}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.05]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full"
              style={{background:statusColor,boxShadow:'0 0 5px '+statusColor}}/>
            <span className="text-[10px] font-bold" style={{color:statusColor}}>{statusLabel}</span>
          </div>
          <span className={'text-[9px] font-medium '+(hasAlert?'text-red-400':'text-slate-600')}>
            {hasAlert?'1 alert':'No alerts'}
          </span>
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {renderContent()}
      </div>
    </div>
  );
}

// ── LEFT CONTROL PANEL ───────────────────────────────────────────────────────
const ALERT_ACTIONS = {
  critical: [
    { label:'🚨 Escalate',  clr:'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25'        },
    { label:'🚛 Dispatch',  clr:'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25'    },
  ],
  warning: [
    { label:'📋 Assign',    clr:'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25' },
    { label:'🔍 Inspect',   clr:'bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25'   },
  ],
  info: [
    { label:'✓ Acknowledge',clr:'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25' },
  ],
};

function LeftPanel({ layers, setLayers, alerts, stats, wards, selectedWardId, onSelectWard, onInspectAlert, onAlertAction, activeRouteIds, setActiveRouteIds, focusedRouteId, setFocusedRouteId, vehicles, selectedZoneId, onRerouteFromAlert }) {
  const [tab,         setTab]         = useState('layers');
  const [dismissed,   setDismissed]   = useState(new Set());
  const [actioned,    setActioned]    = useState({});   // alertId → label that was actioned
  const [alertToast,  setAlertToast]  = useState(null);

  const dismiss = (id) => setDismissed(prev => new Set([...prev, id]));
  const doAction = (alert, label) => {
    setActioned(prev => ({ ...prev, [alert.id]: label }));
    setAlertToast(label + ' — confirmed');
    onAlertAction?.(alert, label);
    setTimeout(() => setAlertToast(null), 2400);
  };

  const visible = alerts.filter(a => !dismissed.has(a.id));
  const critCount = visible.filter(a => a.sev === 'critical').length;

  // Route helpers (ROUTE_DEFS / ROUTE_ZONE_SETS are module-level constants)
  const toggleRoute = (k) => {
    setActiveRouteIds(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
    setFocusedRouteId(prev => prev === k ? null : k);
  };

  return (
    <div className="w-56 bg-cwm-darker border-r border-cwm-border flex flex-col shrink-0 overflow-hidden">
      <div className="flex border-b border-cwm-border shrink-0">
        {[['layers','Layers'],['alerts','Alerts'],['routes','🛣️'],['assets','Assets'],['wards','Wards']].map(([k,l]) => (
          <button key={k} onClick={()=>setTab(k)} className={'flex-1 py-2 text-[10px] font-semibold border-b-2 transition-colors relative ' + (tab===k?'border-cyan-500 text-cyan-400':'border-transparent text-slate-500 hover:text-slate-300')}>
            {l}
            {k==='alerts' && critCount>0 && (
              <span className="absolute top-1 right-1 text-[7px] font-black bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">{critCount}</span>
            )}
            {k==='routes' && activeRouteIds.size>0 && (
              <span className="absolute top-1 right-0.5 text-[7px] font-black bg-cyan-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">{activeRouteIds.size}</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 relative">

        {/* Alert toast inside panel */}
        {alertToast && tab==='alerts' && (
          <div className="sticky top-0 z-10 bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 text-[9px] text-emerald-400 font-semibold text-center mb-1">
            ✓ {alertToast}
          </div>
        )}

        {tab === 'layers' && LAYER_CONFIG.map(lc => (
          <button key={lc.key} onClick={()=>setLayers(p=>({...p,[lc.key]:!p[lc.key]}))}
            className={'w-full flex items-center space-x-2 px-2 py-2 rounded-lg transition-all text-left ' + (layers[lc.key]?'bg-cwm-accent/15 border border-cwm-accent/30':'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]')}>
            <span className="text-sm leading-none">{lc.icon}</span>
            <span className="text-[11px] font-medium text-slate-300 flex-1">{lc.label}</span>
            <div className={'w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ' + (layers[lc.key]?'bg-cyan-400':'bg-slate-700')} />
          </button>
        ))}

        {/* ── ROUTES TAB ──────────────────────────────────────────────────────── */}
        {tab === 'routes' && (
          <div className="space-y-2">
            {/* Quick selects */}
            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest pl-0.5">Quick Select</p>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => setActiveRouteIds(new Set(Object.keys(ROUTE_DEFS).filter(k => ROUTE_DEFS[k].service === 'collection')))}
                className="py-1.5 text-[9px] font-semibold rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                🚛 All Collection
              </button>
              <button onClick={() => setActiveRouteIds(new Set(Object.keys(ROUTE_DEFS).filter(k => ROUTE_DEFS[k].service === 'haul')))}
                className="py-1.5 text-[9px] font-semibold rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 transition-colors">
                🔄 All Haul
              </button>
              {selectedZoneId && (
                <button onClick={() => setActiveRouteIds(new Set(Object.keys(ROUTE_DEFS).filter(k => ROUTE_ZONE_SETS[k]?.has(selectedZoneId))))}
                  className="col-span-2 py-1.5 text-[9px] font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                  🗺️ Zone {selectedZoneId} Routes
                </button>
              )}
              <button onClick={() => { setActiveRouteIds(new Set()); setFocusedRouteId(null); }}
                className="col-span-2 py-1.5 text-[9px] font-semibold rounded-lg bg-white/[0.03] border border-white/[0.07] text-slate-500 hover:text-slate-300 transition-colors">
                ✕ Clear All
              </button>
            </div>

            {/* Individual route toggles */}
            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest pl-0.5 pt-1">Individual Routes</p>
            {Object.entries(ROUTE_DEFS).map(([k, r]) => {
              const isActive = activeRouteIds.has(k);
              const isFocused = focusedRouteId === k;
              const svcTag = r.service === 'haul' ? 'text-amber-400' : 'text-cyan-400';
              return (
                <button key={k} onClick={() => toggleRoute(k)}
                  className={'w-full flex items-center space-x-1.5 px-2 py-1.5 rounded-lg transition-all text-left ' + (isActive ? 'bg-cwm-accent/12 border border-cwm-accent/28' : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]')}>
                  <span className={'text-[8px] font-mono shrink-0 w-7 ' + svcTag}>{k}</span>
                  <span className="text-[9px] font-medium text-slate-300 flex-1 truncate">{r.name}</span>
                  <div className={'w-2 h-2 rounded-full flex-shrink-0 ' + (isFocused ? 'bg-white' : isActive ? 'bg-cyan-400' : 'bg-slate-700')} />
                </button>
              );
            })}

            {/* By vehicle */}
            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest pl-0.5 pt-1">By Vehicle</p>
            {(vehicles || []).filter(v => !selectedZoneId || ROUTE_ZONE_SETS[v.routeId]?.has(selectedZoneId)).map(v => (
              <button key={v.id}
                onClick={() => {
                  setActiveRouteIds(prev => new Set([...prev, v.routeId]));
                  setFocusedRouteId(v.routeId);
                }}
                className={'w-full flex items-center space-x-1.5 px-2 py-1 rounded-lg transition-all text-left ' + (focusedRouteId === v.routeId ? 'bg-cwm-accent/12 border border-cwm-accent/28' : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]')}>
                <span className="text-[8px] font-mono text-cyan-400 shrink-0 w-10">{v.id}</span>
                <span className="text-[8px] text-slate-400 flex-1 truncate">{v.type} · {v.routeId}</span>
              </button>
            ))}
          </div>
        )}

        {tab === 'alerts' && (
          <>
            {/* Header bar */}
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                {visible.length} active · {dismissed.size} dismissed
              </span>
              {dismissed.size < alerts.length && (
                <button onClick={() => setDismissed(new Set(alerts.map(a => a.id)))}
                  className="text-[8px] text-slate-600 hover:text-slate-400 transition-colors">
                  Clear all
                </button>
              )}
            </div>

            {visible.length === 0 && (
              <div className="text-center py-8">
                <div className="text-2xl mb-1">✅</div>
                <p className="text-[10px] text-slate-600">No active alerts</p>
              </div>
            )}

            {visible.map((a, i) => {
              const sevClr = a.sev==='critical'
                ? { bg:'bg-red-500/8 border-red-500/25',    badge:'bg-red-500/20 text-red-400',    dot:'bg-red-500',    txt:'text-red-300/80' }
                : a.sev==='warning'
                ? { bg:'bg-amber-500/8 border-amber-500/25',badge:'bg-amber-500/20 text-amber-400',dot:'bg-amber-400',  txt:'text-amber-300/70' }
                : { bg:'bg-blue-500/6 border-blue-500/18',  badge:'bg-blue-500/18 text-blue-400',  dot:'bg-blue-400',   txt:'text-blue-300/60' };
              const actions = ALERT_ACTIONS[a.sev] || ALERT_ACTIONS.info;
              const done    = actioned[a.id];
              return (
                <div key={a.id||i} className={'rounded-xl border overflow-hidden ' + sevClr.bg}>
                  {/* Alert message */}
                  <div className="px-2.5 pt-2.5 pb-2">
                    <div className="flex items-center space-x-1.5 mb-1.5">
                      <span className={'w-1.5 h-1.5 rounded-full shrink-0 ' + sevClr.dot + (a.sev==='critical'?' animate-pulse':'')} />
                      <span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full ' + sevClr.badge}>{a.sev?.toUpperCase()}</span>
                      <span className="text-[8px] text-slate-600 ml-auto">{a.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-snug">{a.msg}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="px-2 pb-2 flex items-center gap-1 flex-wrap">
                    {done ? (
                      <span className="text-[8px] text-emerald-500 font-semibold px-1">✓ {done}</span>
                    ) : (
                      actions.map(act => (
                        <button key={act.label}
                          onClick={() => doAction(a, act.label)}
                          className={'text-[8px] font-semibold px-2 py-1 rounded-lg border transition-colors ' + act.clr}>
                          {act.label}
                        </button>
                      ))
                    )}
                    {/* Assign Vehicle — shown for bin overflow / complaint alerts */}
                    {!done && onRerouteFromAlert && (() => {
                      const binMatch  = a.msg.match(/\b(BN-\d{3})\b/);
                      const cmpMatch  = a.msg.match(/\b(CMP-\d{4})\b/);
                      const assetId   = binMatch?.[1] || cmpMatch?.[1];
                      if (!assetId) return null;
                      return (
                        <button
                          onClick={() => { onRerouteFromAlert(assetId); doAction(a, '🚛 Assigned'); }}
                          className="text-[8px] font-semibold px-2 py-1 rounded-lg border transition-colors bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25">
                          🚛 Assign Vehicle
                        </button>
                      );
                    })()}
                    <button onClick={() => dismiss(a.id||i)}
                      className="ml-auto text-[8px] text-slate-700 hover:text-slate-500 transition-colors px-1">
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === 'wards' && (
          <>
            <div className="px-1 pb-1 flex items-center justify-between">
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">CMC · {wards.length} Wards</span>
              <div className="flex items-center space-x-1.5">
                <span className="text-[7px] text-red-400 font-bold">{wards.filter(w=>w.status==='critical').length} CRIT</span>
                <span className="text-[7px] text-amber-400 font-bold">{wards.filter(w=>w.status==='warning').length} WARN</span>
              </div>
            </div>
            {wards.map(w => {
              const stClr = w.status==='critical' ? 'border-red-500/30 bg-red-500/5' : w.status==='warning' ? 'border-amber-500/25 bg-amber-500/5' : 'border-white/[0.04] bg-white/[0.015]';
              const pctClr = w.collectPct >= 90 ? '#10b981' : w.collectPct >= 80 ? '#f59e0b' : '#ef4444';
              const pctTxt = w.collectPct >= 90 ? 'text-emerald-400' : w.collectPct >= 80 ? 'text-amber-400' : 'text-red-400';
              return (
                <button key={w.id} onClick={() => onSelectWard?.(w.id)} className={'w-full rounded-lg border p-2 space-y-1.5 text-left transition-colors ' + stClr + (selectedWardId === w.id ? ' ring-1 ring-cyan-400/70 border-cyan-400/40 bg-cyan-500/8' : '')}>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: w.color, boxShadow: w.status==='critical'?'0 0 4px '+w.color:'none' }} />
                    <span className="text-[10px] font-semibold text-slate-200 flex-1 truncate">{w.name}</span>
                    <span className="text-[7px] font-mono" style={{color: w.color}}>{w.id}</span>
                  </div>
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[7px] text-slate-600">Collection rate</span>
                      <span className={'text-[8px] font-bold ' + pctTxt}>{w.collectPct}%</span>
                    </div>
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: w.collectPct+'%', background: pctClr }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="text-slate-500">🗑 {w.bins}</span>
                    {w.overflow > 0 ? <span className="text-amber-400 font-semibold">⚠ {w.overflow}</span> : <span className="text-emerald-500">✓ clean</span>}
                    {w.complaints > 0 && <span className="text-red-400">📋{w.complaints}</span>}
                    <span className="text-slate-500">👷{w.staff}</span>
                  </div>
                </button>
              );
            })}
          </>
        )}

        {tab === 'assets' && [
          { icon:'🚛', label:'Total Fleet',    v:stats.totalVehicles, vc:'text-white' },
          { icon:'✅', label:'Active Now',     v:stats.activeVehicles, vc:'text-emerald-400' },
          { icon:'🔴', label:'Breakdown',      v:stats.breakdown, vc:'text-red-400' },
          { icon:'🗑️', label:'Total Bins',     v:stats.totalBins, vc:'text-cyan-400' },
          { icon:'⚠️', label:'Overflow Bins',  v:stats.overflow, vc:'text-amber-400' },
          { icon:'👷', label:'Staff On Route', v:stats.staffOnRoute, vc:'text-emerald-400' },
          { icon:'📋', label:'Open Cases',     v:stats.openComplaints, vc:'text-amber-400' },
          { icon:'📷', label:'Live Cameras',   v:stats.liveCameras, vc:'text-cyan-400' },
          { icon:'⚖️', label:'Weighbridges',   v:stats.liveWeighbridges, vc:'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="flex items-center justify-between px-2 py-1.5 rounded bg-white/[0.02]">
            <div className="flex items-center space-x-2"><span className="text-xs">{s.icon}</span><span className="text-[10px] text-slate-400">{s.label}</span></div>
            <span className={'text-[11px] font-bold ' + s.vc}>{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAP ZOOM CONTROLS (must be inside MapContainer) ─────────────────────────
function MapZoomControls() {
  const map = useMap();
  return (
    <div className="absolute top-4 right-4 z-[999] flex flex-col space-y-1">
      <button onClick={() => map.zoomIn()} className="w-8 h-8 bg-cwm-panel/95 backdrop-blur border border-cwm-border rounded text-white font-bold text-sm hover:bg-slate-700 transition-colors flex items-center justify-center">+</button>
      <button onClick={() => map.zoomOut()} className="w-8 h-8 bg-cwm-panel/95 backdrop-blur border border-cwm-border rounded text-white font-bold text-xl leading-none hover:bg-slate-700 transition-colors flex items-center justify-center">−</button>
      <button onClick={() => map.setView([6.9271, 79.8612], 12)} className="w-8 h-8 bg-cwm-panel/95 backdrop-blur border border-cwm-border rounded text-slate-400 text-xs font-medium hover:bg-slate-700 transition-colors flex items-center justify-center" title="Reset view">↺</button>
    </div>
  );
}


// ── WTE 3D SUB-DIGITAL TWIN ─────────────────────────────────────────────────
function WTE3DViewer({ facility, onClose }) {
  const canvasRef = useRef(null);
  const [tab, setTab] = useState('3d');
  const [liveStats, setLiveStats] = useState({
    steamPressure: 52.4, turbineRPM: 3000, heatValue: 8.42, wasteIn: 261,
    ashOut: 28.2, powerOut: 12.4, boilerTemp: 851, fgtTemp: 182, uptime: 99.2,
  });

  useEffect(() => {
    const id = setInterval(() => {
      setLiveStats(p => ({
        steamPressure: +(Math.max(42, Math.min(64, p.steamPressure + (Math.random() - .5) * 1.4)).toFixed(1)),
        turbineRPM:    Math.round(Math.max(2940, Math.min(3060, p.turbineRPM + (Math.random() - .5) * 8))),
        heatValue:     +(Math.max(7.2, Math.min(9.8, p.heatValue + (Math.random() - .5) * 0.07)).toFixed(2)),
        wasteIn:       Math.round(Math.max(240, Math.min(280, p.wasteIn + (Math.random() - .5) * 2))),
        ashOut:        +(Math.max(24, Math.min(34, p.ashOut + (Math.random() - .5) * 0.3)).toFixed(1)),
        powerOut:      +(Math.max(11, Math.min(14.5, p.powerOut + (Math.random() - .5) * 0.14)).toFixed(2)),
        boilerTemp:    Math.round(Math.max(820, Math.min(892, p.boilerTemp + (Math.random() - .5) * 4))),
        fgtTemp:       Math.round(Math.max(158, Math.min(200, p.fgtTemp + (Math.random() - .5) * 2.5))),
        uptime:        p.uptime,
      }));
    }, 1400);
    return () => clearInterval(id);
  }, []);

  // ── 3D CANVAS RENDERING ──────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== '3d') return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, frame = 0;
    const W = canvas.width, H = canvas.height;

    // Isometric projection: origin top-center
    const OX = W * 0.415, OY = 80;
    const TW = 40, TH = 20;      // tile half-widths
    const toIso = (gx, gy, gz = 0) => [
      OX + (gx - gy) * TW,
      OY + (gx + gy) * TH - gz * TH * 1.75,
    ];

    // Draw one isometric box (gx,gy)=grid origin, gw×gh=footprint, gd=height
    const drawBox = (gx, gy, gw, gh, gd, tClr, lClr, rClr, label) => {
      const poly = (pts, fill) => {
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.closePath();
        ctx.fillStyle = fill; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 0.5; ctx.stroke();
      };
      // top
      poly([toIso(gx, gy, gd), toIso(gx+gw, gy, gd), toIso(gx+gw, gy+gh, gd), toIso(gx, gy+gh, gd)], tClr);
      // left-front face
      poly([toIso(gx, gy+gh, 0), toIso(gx, gy+gh, gd), toIso(gx+gw, gy+gh, gd), toIso(gx+gw, gy+gh, 0)], lClr);
      // right-front face
      poly([toIso(gx+gw, gy, 0), toIso(gx+gw, gy, gd), toIso(gx+gw, gy+gh, gd), toIso(gx+gw, gy+gh, 0)], rClr);

      if (label) {
        const [lx, ly] = toIso(gx + gw / 2, gy + gh / 2, gd + 0.3);
        ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        const tw = ctx.measureText(label).width;
        ctx.fillRect(lx - tw / 2 - 3, ly - 9, tw + 6, 12);
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(label, lx, ly);
      }
    };

    const drawSmoke = (gx, gy, h, offset) => {
      for (let i = 0; i < 10; i++) {
        const t = ((frame * 0.016 + offset + i * 0.1) % 1);
        const alpha = Math.max(0, (1 - t) * 0.22);
        const r = 5 + t * 16;
        const [sx, sy] = toIso(gx + 0.225, gy + 0.225, h + t * 4);
        ctx.beginPath();
        ctx.arc(sx + Math.sin(t * 5 + i) * 6, sy - t * 20, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(170,165,160,${alpha})`; ctx.fill();
      }
    };

    const drawConveyor = (gx1, gy1, gx2, gy2, gz) => {
      const [x0, y0] = toIso(gx1, gy1, gz);
      const [x1, y1] = toIso(gx2, gy2, gz);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      ctx.strokeStyle = 'rgba(251,191,36,0.45)'; ctx.lineWidth = 4;
      ctx.setLineDash([6, 4]); ctx.lineDashOffset = -(frame * 0.5);
      ctx.stroke(); ctx.setLineDash([]);
    };

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#060c18'); bg.addColorStop(1, '#020710');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Stars
      if (frame === 1) {
        for (let i = 0; i < 60; i++) {
          const sx = Math.random() * W, sy = Math.random() * H * 0.4;
          const sa = Math.random() * 0.4;
          ctx.fillStyle = `rgba(200,210,255,${sa})`;
          ctx.fillRect(sx, sy, 1, 1);
        }
      }

      // ISO grid
      ctx.strokeStyle = 'rgba(6,182,212,0.055)'; ctx.lineWidth = 0.4;
      for (let gx = -1; gx <= 14; gx++) {
        const [x0, y0] = toIso(gx, -1, 0); const [x1, y1] = toIso(gx, 12, 0);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      for (let gy = -1; gy <= 12; gy++) {
        const [x0, y0] = toIso(-1, gy, 0); const [x1, y1] = toIso(14, gy, 0);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }

      // Road approach
      const road = [toIso(-2.5, 1.8, 0), toIso(0, 1.8, 0), toIso(0, 3.8, 0), toIso(-2.5, 3.8, 0)];
      ctx.beginPath(); road.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath(); ctx.fillStyle = 'rgba(22,35,22,0.65)'; ctx.fill();

      // ── STRUCTURES (back → front in ISO draw order) ──
      // 1. Ash silo (back-right)
      drawBox(9.4, 0.2, 1.5, 1.5, 3, '#2a2535', '#1a1528', '#222033', 'ASH SILO');
      // 2. Flue gas treatment tower
      drawBox(7, 0, 2, 3, 5, '#1c2a3c', '#101c2a', '#142233', 'FGT UNIT');
      // Chimney stacks
      drawBox(9.3, 1.8, 0.48, 0.48, 8, '#3a3a48', '#252535', '#2d2d3d', null);
      drawBox(10.2, 2.5, 0.42, 0.42, 6.5, '#3a3a48', '#252535', '#2d2d3d', null);
      // Red aviation warning on chimneys
      for (const [cx, cy, h] of [[9.3, 1.8, 7.8], [10.2, 2.5, 6.3]]) {
        const [px, py] = toIso(cx + 0.24, cy + 0.24, h);
        const blink = Math.sin(frame * 0.08) > 0;
        if (blink) { ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(239,68,68,0.85)'; ctx.fill(); }
      }
      // 3. Boiler / combustion (tallest)
      drawBox(3.8, 0, 3, 3, 6.5, '#301e0a', '#1e1008', '#281408', 'BOILER');
      // Boiler glow
      const [bgx, bgy] = toIso(4, 3, 3);
      const glowR = ctx.createRadialGradient(bgx, bgy, 0, bgx, bgy, 55);
      glowR.addColorStop(0, 'rgba(251,146,60,0.12)'); glowR.addColorStop(1, 'rgba(251,146,60,0)');
      ctx.fillStyle = glowR; ctx.fillRect(bgx - 65, bgy - 45, 130, 90);
      // 4. Reception / Tipping hall
      drawBox(0, 2, 3.8, 3.5, 2.8, '#182818', '#0e1a0e', '#122014', 'TIPPING HALL');
      // 5. Turbine generator hall
      drawBox(3.8, 3.2, 3, 2.6, 3.2, '#102030', '#0a1420', '#0e1a28', 'TURBINE');
      // Turbine glow
      const [tgx, tgy] = toIso(5.3, 5.8, 1);
      const turbG = ctx.createRadialGradient(tgx, tgy, 0, tgx, tgy, 40);
      turbG.addColorStop(0, 'rgba(59,130,246,0.08)'); turbG.addColorStop(1, 'rgba(59,130,246,0)');
      ctx.fillStyle = turbG; ctx.fillRect(tgx - 50, tgy - 30, 100, 60);
      // 6. Condenser / cooling
      drawBox(7, 3.5, 2.2, 2.5, 2.2, '#161628', '#0e0e1e', '#12122a', 'CONDENSER');
      // 7. Control room
      drawBox(0, 6, 2.5, 1.8, 1.6, '#122012', '#0a160a', '#0e180e', 'CTRL ROOM');
      // 8. Substation
      drawBox(0, 8.2, 3.5, 1.5, 0.9, '#0e1e0e', '#081408', '#0c1a0c', null);
      // Substation fence posts
      for (let i = 0; i <= 3; i++) {
        const [fx, fy] = toIso(i * 0.9, 8.1, 0);
        ctx.fillStyle = 'rgba(100,200,100,0.3)';
        ctx.fillRect(fx - 1, fy - 14, 2, 14);
      }

      // ── CONVEYORS ──
      drawConveyor(3.5, 3.2, 3.8, 1.5, 1.4);
      drawConveyor(6.8, 4.5, 7, 3.6, 1.2);

      // ── ELECTRIC LINE (turbine → substation) ──
      const elPts = [toIso(5.3, 5.8, 3.4), toIso(5.3, 9.5, 3.4), toIso(2, 9.2, 1)];
      ctx.beginPath(); elPts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.strokeStyle = 'rgba(251,191,36,0.22)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
      ctx.stroke(); ctx.setLineDash([]);
      // Pylon
      const [px1, py1] = toIso(5.3, 9.5, 0); const [px2, py2] = toIso(5.3, 9.5, 3.4);
      ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2);
      ctx.strokeStyle = 'rgba(100,100,80,0.4)'; ctx.lineWidth = 1.5; ctx.setLineDash([]);
      ctx.stroke();

      // ── SMOKE ──
      drawSmoke(9.3, 1.8, 8, 0);
      drawSmoke(10.2, 2.5, 6.5, 0.5);

      // ── VEHICLES IN QUEUE ──
      const vIds = ['V-033', 'V-009', 'V-014'];
      vIds.forEach((id, i) => {
        const t = ((frame * 0.003 + i * 0.33) % 1);
        const gx = -2.8 + t * 3.3, gy = 2.5 + i * 0.35;
        const [vx, vy] = toIso(gx, gy, 0);
        ctx.font = '13px serif'; ctx.textAlign = 'center'; ctx.fillText('🚛', vx, vy + 5);
        ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(6,182,212,0.75)';
        ctx.fillText(id, vx, vy - 5);
      });

      // ── FLOATING ANNOTATIONS ──
      ctx.textAlign = 'center';
      const anns = [
        { gx: 5.3, gy: 0.5, gz: 7,   text: liveStats.boilerTemp + '°C',          clr: 'rgba(251,146,60,0.95)' },
        { gx: 8,   gy: 0.5, gz: 5.5, text: liveStats.steamPressure + ' bar',     clr: 'rgba(6,182,212,0.9)'  },
        { gx: 5.3, gy: 3.5, gz: 3.8, text: liveStats.powerOut + ' MW',           clr: 'rgba(251,191,36,0.95)' },
        { gx: 9.7, gy: 2,   gz: 9,   text: '↑ FLUE GAS',                         clr: 'rgba(180,180,175,0.65)' },
      ];
      anns.forEach(({ gx, gy, gz, text, clr }) => {
        const [ax, ay] = toIso(gx, gy, gz);
        ctx.font = 'bold 8px monospace';
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(ax - tw / 2 - 3, ay - 10, tw + 6, 13);
        ctx.fillStyle = clr; ctx.fillText(text, ax, ay);
      });

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [tab, liveStats.boilerTemp, liveStats.steamPressure, liveStats.powerOut]);

  const sensorGroups = [
    { group: 'COMBUSTION', items: [
      { label: 'Boiler Temperature', val: liveStats.boilerTemp + '°C',     warn: liveStats.boilerTemp > 880, target: '820–880°C' },
      { label: 'Steam Pressure',     val: liveStats.steamPressure + ' bar', warn: liveStats.steamPressure > 61, target: '50–60 bar' },
      { label: 'Waste Input Rate',   val: liveStats.wasteIn + ' t/day',    warn: false,                         target: '250 t/day' },
    ]},
    { group: 'POWER GENERATION', items: [
      { label: 'Turbine Speed',   val: liveStats.turbineRPM + ' RPM', warn: Math.abs(liveStats.turbineRPM - 3000) > 45, target: '3000 RPM' },
      { label: 'Power Output',    val: liveStats.powerOut + ' MW',    warn: false, target: '12–14 MW' },
      { label: 'Heat Rate Value', val: liveStats.heatValue + ' MJ/kg',warn: false, target: '> 8 MJ/kg' },
    ]},
    { group: 'EMISSIONS / RESIDUE', items: [
      { label: 'FGT Temperature', val: liveStats.fgtTemp + '°C',  warn: liveStats.fgtTemp > 195, target: '160–195°C' },
      { label: 'Ash Output',      val: liveStats.ashOut + ' t/h', warn: false,                   target: '< 35 t/h' },
      { label: 'System Uptime',   val: '99.2%',                   warn: false,                   target: '> 98%' },
    ]},
  ];

  const flowStages = [
    { icon: '🚛', label: 'Waste Reception & Tipping Hall',  val: liveStats.wasteIn + ' t/day', clr: '#10b981', pct: Math.min(100, (liveStats.wasteIn / 280) * 100) },
    { icon: '🔥', label: 'Combustion Chamber & Boiler',     val: liveStats.boilerTemp + '°C',  clr: '#f97316', pct: Math.min(100, ((liveStats.boilerTemp - 800) / 100) * 100) },
    { icon: '💨', label: 'Steam Generation (HP Turbine)',   val: liveStats.steamPressure + ' bar', clr: '#06b6d4', pct: Math.min(100, (liveStats.steamPressure / 65) * 100) },
    { icon: '⚡', label: 'Turbine & Grid Power Output',     val: liveStats.powerOut + ' MW',    clr: '#f59e0b', pct: Math.min(100, (liveStats.powerOut / 15) * 100) },
    { icon: '🌫️', label: 'Flue Gas Treatment (FGT)',       val: liveStats.fgtTemp + '°C',      clr: '#8b5cf6', pct: Math.min(100, (liveStats.fgtTemp / 200) * 100) },
    { icon: '🏔️', label: 'Residue / Ash Handling',         val: liveStats.ashOut + ' t/h',     clr: '#6b7280', pct: Math.min(100, (liveStats.ashOut / 35) * 100) },
  ];

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/82 backdrop-blur-md">
      <div className="relative bg-cwm-darker border border-cwm-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ width: 'min(93vw, 960px)', maxHeight: '90vh' }}>

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cwm-border shrink-0"
          style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.07) 0%,transparent 55%)' }}>
          <div className="flex items-center space-x-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)' }}>🏭</div>
            <div>
              <h2 className="text-sm font-bold text-white">{facility.name}</h2>
              <p className="text-[10px] text-amber-300/70 mt-0.5 font-mono">
                WASTE-TO-ENERGY FACILITY — 3D DIGITAL SUB-TWIN · {facility.id} · {facility.capPct}% CAPACITY
              </p>
              <p className="text-[9px] text-slate-600 mt-0.5">Kerawalapitiya, Western Province · 7.0107°N  79.9012°E</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[9px] text-amber-400 font-mono font-bold">LIVE SIM</span>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors text-xl">×</button>
          </div>
        </div>

        {/* TAB BAR */}
        <div className="flex border-b border-cwm-border shrink-0 px-6 bg-black/20">
          {[['3d', '🏗️  3D Plant View'], ['sensors', '📡  Live Sensors'], ['flow', '⚡  Process Flow']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={'px-5 py-2.5 text-[11px] font-semibold border-b-2 transition-colors ' + (tab === k ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300')}>
              {l}
            </button>
          ))}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* MAIN VIEW */}
          <div className="flex-1 relative overflow-hidden bg-black/30">

            {tab === '3d' && (
              <>
                <canvas ref={canvasRef} width={660} height={475}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div className="absolute top-3 left-3 text-[8px] font-mono text-cyan-400/55 space-y-0.5 pointer-events-none">
                  <div>🏭 Kerawalapitiya WTE — Isometric 3D View</div>
                  <div>Double-click any facility on the map to open sub-twin</div>
                </div>
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1 pointer-events-none">
                  {[['🟩', 'Tipping Hall'], ['🟧', 'Combustion / Boiler'], ['🟦', 'Turbine Hall'], ['🟪', 'FGT / Stacks'], ['⬛', 'Ash / Utilities']].map(([em, lbl]) => (
                    <span key={lbl} className="text-[8px] bg-black/65 rounded px-1.5 py-0.5 text-slate-400">{em} {lbl}</span>
                  ))}
                </div>
              </>
            )}

            {tab === 'sensors' && (
              <div className="h-full overflow-y-auto p-5 space-y-5">
                {sensorGroups.map(grp => (
                  <div key={grp.group}>
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-2">{grp.group}</p>
                    <div className="space-y-1.5">
                      {grp.items.map(item => (
                        <div key={item.label} className={'flex items-center justify-between px-3 py-2.5 rounded-lg border ' + (item.warn ? 'bg-amber-500/6 border-amber-500/22' : 'bg-white/[0.025] border-white/[0.06]')}>
                          <div>
                            <p className="text-[10px] font-semibold text-white">{item.label}</p>
                            <p className="text-[8px] text-slate-600 mt-0.5">Target: {item.target}</p>
                          </div>
                          <div className="text-right">
                            <p className={'text-sm font-bold ' + (item.warn ? 'text-amber-400' : 'text-emerald-400')}>{item.val}</p>
                            <p className={'text-[8px] font-bold ' + (item.warn ? 'text-amber-500' : 'text-emerald-700')}>
                              {item.warn ? '⚠ CHECK' : '● OK'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'flow' && (
              <div className="h-full overflow-y-auto flex items-start justify-center p-6">
                <div className="w-full max-w-lg">
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-4 text-center">
                    WASTE-TO-ENERGY PROCESS FLOW — LIVE
                  </p>
                  <div className="space-y-1">
                    {flowStages.map((s, i) => (
                      <div key={i}>
                        <div className="flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                          <span className="text-base shrink-0">{s.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1.5">
                              <p className="text-[10px] font-semibold text-white truncate">{s.label}</p>
                              <p className="text-[10px] font-bold ml-2 shrink-0" style={{ color: s.clr }}>{s.val}</p>
                            </div>
                            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: s.pct + '%', background: s.clr, opacity: 0.8 }} />
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-slate-700 ml-1 shrink-0">{i + 1}/6</span>
                        </div>
                        {i < flowStages.length - 1 && (
                          <div className="flex justify-center py-0.5">
                            <div className="w-px h-3 bg-white/10" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT KPI SIDEBAR */}
          <div className="w-52 border-l border-cwm-border bg-black/25 p-3 flex flex-col gap-2 overflow-y-auto shrink-0">
            <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">PLANT KPIs</p>
            {[
              { label: 'Power Output',  val: liveStats.powerOut + ' MW',      vc: 'text-amber-400',   icon: '⚡' },
              { label: 'Waste Intake',  val: liveStats.wasteIn + ' t/day',    vc: 'text-emerald-400', icon: '🚛' },
              { label: 'Boiler Temp',   val: liveStats.boilerTemp + '°C',     vc: 'text-orange-400',  icon: '🌡️' },
              { label: 'Steam Press',   val: liveStats.steamPressure + ' bar', vc: 'text-cyan-400',   icon: '💨' },
              { label: 'Turbine RPM',   val: liveStats.turbineRPM + ' rpm',   vc: 'text-blue-400',    icon: '⚙️' },
              { label: 'FGT Temp',      val: liveStats.fgtTemp + '°C',        vc: 'text-purple-400',  icon: '🌫️' },
              { label: 'Ash Output',    val: liveStats.ashOut + ' t/h',       vc: 'text-slate-400',   icon: '🏔️' },
              { label: 'Capacity',      val: facility.capPct + '%',           vc: facility.capPct > 80 ? 'text-red-400' : 'text-amber-400', icon: '📊' },
              { label: 'System Uptime', val: '99.2%',                         vc: 'text-emerald-400', icon: '✅' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between px-2 py-2 rounded-lg bg-white/[0.025] border border-white/[0.05]">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs leading-none">{s.icon}</span>
                  <span className="text-[9px] text-slate-500">{s.label}</span>
                </div>
                <span className={'text-[10px] font-bold ' + s.vc}>{s.val}</span>
              </div>
            ))}
            {facility.capPct > 80 && (
              <div className="bg-amber-500/8 border border-amber-500/22 rounded-lg p-2.5 mt-1">
                <p className="text-[8px] font-bold text-amber-400 uppercase mb-1">⚠ High Capacity</p>
                <p className="text-[8px] text-amber-300/70 leading-relaxed">Coordinate incoming waste diversion to alternative sites</p>
              </div>
            )}
            <div className="text-[8px] font-mono text-slate-700 mt-auto pt-2 border-t border-white/[0.04] space-y-0.5">
              <div>SCADA: Connected</div>
              <div>PLC: Online (v4.2.1)</div>
              <div>DCS Sync: &lt; 2 sec</div>
              <div>Model: Rev 3.1.0</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── MAIN DIGITAL TWIN ────────────────────────────────────────────────────────
export default function DigitalTwin({ isPreview = false }) {
  const [vehicles, setVehicles]       = useState(() => INIT_VEHICLES.map(v => ({ ...v })));
  const [bins, setBins]               = useState(() => INIT_BINS.map(b => ({ ...b })));
  const [staff, setStaff]             = useState(() => STAFF_INIT.map(s => ({ ...s })));
  const [complaints, setComplaints]   = useState(COMPLAINTS_STATIC.map(c => ({ ...c })));
  const [weighbridges, setWeighbridges] = useState(() => INIT_WEIGHBRIDGES.map((bridge) => ({ ...bridge })));
  const [liveAlerts, setLiveAlerts]   = useState([
    { id:'ALT-000', sev:'warning',  msg:'V-006 engine failure reported by on-board sensor', time:'11:38' },
    { id:'ALT-001', sev:'critical', msg:'BN-002 overflow — 88% capacity, Manning Market', time:'11:41' },
    { id:'ALT-002', sev:'info',     msg:'CMP-4519 auto-assigned to nearest vehicle V-008', time:'11:42' },
  ]);
  const [selectedRef, setSelectedRef] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [activeRouteIds, setActiveRouteIds] = useState(() => new Set());  // routes to display
  const [focusedRouteId, setFocusedRouteId] = useState(null);             // highlighted route
  const [alertActionModal, setAlertActionModal] = useState(null);
  const [layers, setLayers] = useState({
    zones: true, wards: false, vehicles: false, bins: false,
    weighbridges: false, staff: false, complaints: false, cameras: false,
  });
  const [actionMsg, setActionMsg] = useState(null);
  const [wteOpen, setWteOpen]     = useState(false);
  const [wteData, setWteData]     = useState(null);
  const [rerouteToast, setRerouteToast]         = useState(null);

  // ── SIMULATION TICK ────────────────────────────────────────────────────────
  useEffect(() => {
    const ALERT_POOL = [
      { sev:'critical', msg:'BN-004 at 93% — immediate collection required' },
      { sev:'critical', msg:'V-006 engine failure — secondary unit dispatched' },
      { sev:'warning',  msg:'Zone 5: RFID scan gap >48 min on 7 households' },
      { sev:'warning',  msg:'V-011 idling 28 min — driver check requested' },
      { sev:'warning',  msg:'V-003 route deviation 620m — GPS drift possible' },
      { sev:'info',     msg:'F-003 Borella Transfer at 70% — coordinate arrivals' },
      { sev:'info',     msg:'CMP-4519 elevated priority — field inspection queued' },
      { sev:'critical', msg:'CAM-004 motion at illegal dump site — Grandpass 03:18' },
      { sev:'warning',  msg:'BN-027 overflow — Zone 5 Rajagiriya sector' },
      { sev:'info',     msg:'V-009 reached Karadiyana gateway — weighbridge queued' },
    ];
    const tick = () => {
      let nextVehicles = [];
      setVehicles(prev => {
        nextVehicles = prev.map(v => {
          // ── Rerouted vehicle animation ────────────────────────────────────
          if (v.rerouteInfo) {
            const ri = v.rerouteInfo;
            if (ri.phase === 'heading') {
              const newRerouteIdx = Math.min(ri.rerouteIdx + 2, ri.reroutePath.length - 1);
              const atEnd = newRerouteIdx >= ri.reroutePath.length - 1;
              return {
                ...v,
                speed: Math.max(8, Math.min(28, v.speed + (Math.random() - 0.5) * 3)),
                rerouteInfo: { ...ri, rerouteIdx: newRerouteIdx, phase: atEnd ? 'arrived' : 'heading' },
              };
            }
            if (ri.phase === 'arrived') {
              return { ...v, speed: 2, rerouteInfo: { ...ri, arrivedTicks: (ri.arrivedTicks || 0) + 1 } };
            }
            return { ...v, speed: 0 };
          }
          // ── Normal vehicle movement ───────────────────────────────────────
          if (['breakdown', 'idle', 'maintenance'].includes(v.status)) return { ...v, speed: 0 };
          const path = ACTIVE_ROUTE_PATHS[v.routeId];
          if (!path || path.length < 2) return { ...v, posIdx: 0, routeDir: 1 };
          const adv = v.status === 'collecting' ? 1 : v.status === 'en_route' ? 2 : 1;
          const maxIndex = path.length - 1;
          let routeDir = v.routeDir || 1;
          let newIdx = v.posIdx + adv * routeDir;
          if (newIdx >= maxIndex) {
            newIdx = maxIndex;
            routeDir = -1;
          } else if (newIdx <= 0) {
            newIdx = 0;
            routeDir = 1;
          }
          const spd = Math.max(5, Math.min(36, v.speed + (Math.random() - 0.5) * 4));
          const fl = Math.max(4, v.fuel - (adv * 0.003 + Math.random() * 0.002));
          let ld = v.load;
          if (ROUTE_DEFS[v.routeId]?.service === 'collection' && v.status === 'collecting') ld = Math.min(v.cap, v.load + 0.04);
          if (ROUTE_DEFS[v.routeId]?.service === 'haul' && newIdx > path.length / 2) ld = Math.max(0.4, v.load - 0.08);
          return { ...v, posIdx: newIdx, routeDir, speed: spd, fuel: fl, load: ld };
        });
        return nextVehicles;
      });
      setBins(prev => prev.map(b => {
        const serviced = nextVehicles.some(v => {
          const route = ROUTE_DEFS[v.routeId];
          const path = ACTIVE_ROUTE_PATHS[v.routeId];
          if (!route || route.service !== 'collection' || !path) return false;
          const pos = path[Math.min(v.posIdx, path.length - 1)];
          const distance = Math.hypot(pos[0] - b.lat, pos[1] - b.lng);
          return route.wardIds.includes(b.wardId) && distance < 0.0065 && ['active', 'collecting', 'en_route'].includes(v.status);
        });
        const drift = Math.random() * 0.18 + 0.03;
        const nf = serviced ? Math.max(8, b.fill - (Math.random() * 8 + 2.4)) : Math.min(99, b.fill + drift);
        return { ...b, fill: nf, status: nf > 85 ? 'overflow' : nf > 65 ? 'needs_collection' : 'normal' };
      }));
      setStaff(prev => prev.map(s => {
        if (['break', 'absent'].includes(s.status)) return s;
        return { ...s, lat: s.lat + s.dlat + (Math.random() - 0.5) * 0.000003, lng: s.lng + s.dlng + (Math.random() - 0.5) * 0.000003 };
      }));
      setWeighbridges(prev => prev.map((bridge, index) => {
        const activeIndex = Math.floor(Date.now() / 2200) % prev.length;
        const isActive = index === activeIndex;
        const queue = Math.max(0, Math.min(6, bridge.queue + (Math.random() < 0.45 ? -1 : 1)));
        return {
          ...bridge,
          queue,
          status: bridge.status === 'offline' ? 'offline' : queue > 3 ? 'queued' : 'active',
          todayTons: +(bridge.todayTons + (isActive ? Math.random() * 0.24 + 0.04 : Math.random() * 0.03)).toFixed(1),
          lastWeight: isActive ? (Math.random() * 4.5 + 2.2).toFixed(1) : bridge.lastWeight,
          lastVehicle: isActive ? INIT_VEHICLES[Math.floor(Math.random() * INIT_VEHICLES.length)].id : bridge.lastVehicle,
          lastTime: isActive ? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : bridge.lastTime,
        };
      }));
      if (Math.random() < 0.22) {
        const a = ALERT_POOL[Math.floor(Math.random() * ALERT_POOL.length)];
        setLiveAlerts(prev => [{
          id: 'ALT-' + Date.now(), ...a,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        }, ...prev].slice(0, 30));
      }
    };
    const id = setInterval(tick, 2200);
    return () => clearInterval(id);
  }, []);

  const wards = useMemo(() => BASE_WARDS.map((ward) => {
    const wardBins = bins.filter((bin) => bin.wardId === ward.id);
    const wardComplaints = complaints.filter((complaint) => complaint.wardId === ward.id && complaint.status !== 'resolved');
    const wardStaff = staff.filter((member) => member.wardId === ward.id);
    const wardVehicles = vehicles.filter((vehicle) => {
      const route = ROUTE_DEFS[vehicle.routeId];
      return route?.wardIds?.includes(ward.id) && ['active', 'collecting', 'en_route'].includes(vehicle.status);
    });
    const fleetCoverage = wardVehicles.length;
    const overflow = wardBins.filter((bin) => bin.fill > 85).length;
    const avgFill = wardBins.length ? wardBins.reduce((sum, bin) => sum + bin.fill, 0) / wardBins.length : 0;
    const collectPct = Math.max(68, Math.min(99, Math.round(101 - avgFill * 0.42 - overflow * 3.5 - wardComplaints.length * 2 + wardStaff.length * 1.8 + fleetCoverage * 1.4)));
    const status = collectPct < 80 ? 'critical' : collectPct < 90 ? 'warning' : 'good';
    const primaryRoutes = new Set();
    const secondaryRoutes = new Set();
    wardVehicles.forEach((vehicle) => {
      const route = ROUTE_DEFS[vehicle.routeId];
      if (route?.hierarchy === 'primary') primaryRoutes.add(vehicle.routeId);
      if (route?.hierarchy === 'secondary') secondaryRoutes.add(vehicle.routeId);
    });
    return {
      ...ward,
      collectPct,
      bins: wardBins.length,
      overflow,
      staff: wardStaff.length,
      complaints: wardComplaints.length,
      avgFill,
      fleetCoverage,
      primaryRoutes: primaryRoutes.size,
      secondaryRoutes: secondaryRoutes.size,
      status,
    };
  }), [bins, complaints, staff, vehicles]);

  const selectedEntity = useMemo(() => {
    if (!selectedRef) return null;
    const { type, id } = selectedRef;
    let data;
    if      (type === 'vehicle')     data = vehicles.find(v => v.id === id);
    else if (type === 'bin')         data = bins.find(b => b.id === id);
    else if (type === 'facility')    data = FACILITIES.find(f => f.id === id);
    else if (type === 'complaint')   data = complaints.find(c => c.id === id);
    else if (type === 'camera')      data = CAMERAS.find(c => c.id === id);
    else if (type === 'staff')       data = staff.find(s => s.id === id);
    else if (type === 'ward')        data = wards.find(w => w.id === id);
    else if (type === 'weighbridge') data = weighbridges.find(w => w.id === id);
    return data ? { type, data } : null;
  }, [selectedRef, vehicles, bins, complaints, staff, wards, weighbridges]);

  // ── COMPUTED STATS ─────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalVehicles:  vehicles.length,
    activeVehicles: vehicles.filter(v => ['active','collecting','en_route'].includes(v.status)).length,
    breakdown:      vehicles.filter(v => v.status === 'breakdown').length,
    totalBins:      bins.length,
    overflow:       bins.filter(b => b.fill > 85).length,
    staffOnRoute:   staff.filter(s => s.status === 'on_route').length,
    openComplaints: complaints.filter(c => c.status === 'open').length,
    liveCameras:    CAMERAS.filter(c => c.status !== 'offline').length,
    liveWeighbridges: weighbridges.filter(w => w.status !== 'offline').length,
    critAlerts:     liveAlerts.filter(a => a.sev === 'critical').length,
  }), [vehicles, bins, staff, complaints, liveAlerts, weighbridges]);

  const getFocusTargetForRef = (ref) => {
    if (!ref) return null;
    if (ref.type === 'vehicle') {
      const vehicle = vehicles.find((item) => item.id === ref.id);
      if (!vehicle) return null;
      const path = ACTIVE_ROUTE_PATHS[vehicle.routeId];
      if (path && path.length > 1) {
        const pos = path[Math.min(vehicle.posIdx, path.length - 1)];
        if (pos) return { center: pos, zoom: 16 };
      }
      // Fallback: use waypoints from route blueprint
      const wps = (ROUTE_BLUEPRINTS[vehicle.routeId]?.waypoints || []).filter(Boolean);
      if (wps.length > 0) {
        const wpIdx = Math.min(Math.floor((vehicle.posIdx / 100) * wps.length), wps.length - 1);
        return { center: wps[Math.max(0, wpIdx)], zoom: 15 };
      }
      return null;
    }
    if (ref.type === 'ward') {
      const ward = wards.find((item) => item.id === ref.id);
      return ward ? { center: [ward.cLat, ward.cLng], zoom: 15 } : null;
    }
    const pools = {
      bin: bins,
      complaint: complaints,
      facility: FACILITIES,
      camera: CAMERAS,
      staff,
      weighbridge: weighbridges,
    };
    const match = pools[ref.type]?.find((item) => item.id === ref.id);
    return match ? { center: [match.lat, match.lng], zoom: ref.type === 'facility' || ref.type === 'weighbridge' ? 14 : 16 } : null;
  };

  const selectRef = (type, id, options = {}) => {
    const ref = { type, id };
    setSelectedRef(ref);
    // When selecting a vehicle, auto-show & highlight its route
    if (type === 'vehicle') {
      const vehicle = vehicles.find((v) => v.id === id);
      if (vehicle) {
        setActiveRouteIds((prev) => new Set([...prev, vehicle.routeId]));
        setFocusedRouteId(vehicle.routeId);
      }
    }
    if (options.focus) {
      const target = getFocusTargetForRef(ref);
      if (target) setFocusTarget(target);
    }
  };

  const selectWard = (wardId, options = {}) => {
    setLayers((prev) => ({ ...prev, wards: true }));
    selectRef('ward', wardId, { focus: options.focus !== false });
  };

  const selectZone = (zoneId) => {
    if (selectedZoneId === zoneId) {
      setSelectedZoneId(null);
      setLayers({ zones: true, wards: false, vehicles: false, bins: false,
        weighbridges: false, staff: false, complaints: false, cameras: false });
      setFocusTarget({ center: [6.913, 79.875], zoom: 13 });
      setSelectedRef(null);
    } else {
      setSelectedZoneId(zoneId);
      setLayers(prev => ({ ...prev, wards: true, vehicles: true, bins: true, weighbridges: true,
        staff: true, complaints: true, cameras: true }));
      const z = ZONE_POLYS.find(zp => zp.id === zoneId);
      if (z) {
        const cLat = z.pts.reduce((s, p) => s + p[0], 0) / z.pts.length;
        const cLng = z.pts.reduce((s, p) => s + p[1], 0) / z.pts.length;
        setFocusTarget({ center: [cLat, cLng], zoom: 14 });
      }
      setSelectedRef(null);
    }
  };

  const inspectAlert = (alert) => {
    const match = alert.msg.match(/(WB-\d{3}|CMP-\d{4}|CAM-\d{3}|BN-\d{3}|V-\d{3}|F-\d{3})/);
    if (!match) {
      setActionMsg('No directly linked asset was found for this alert');
      setTimeout(() => setActionMsg(null), 2800);
      return;
    }
    const id = match[1];
    if (id.startsWith('WB-')) {
      setLayers(prev => ({ ...prev, weighbridges: true }));
      selectRef('weighbridge', id, { focus: true });
    } else if (id.startsWith('CMP-')) {
      setLayers(prev => ({ ...prev, complaints: true }));
      selectRef('complaint', id, { focus: true });
    } else if (id.startsWith('CAM-')) {
      setLayers(prev => ({ ...prev, cameras: true }));
      selectRef('camera', id, { focus: true });
    } else if (id.startsWith('BN-')) {
      setLayers(prev => ({ ...prev, bins: true }));
      selectRef('bin', id, { focus: true });
    } else if (id.startsWith('V-')) {
      setLayers(prev => ({ ...prev, vehicles: true }));
      selectRef('vehicle', id, { focus: true });
    } else if (id.startsWith('F-')) {
      selectRef('facility', id, { focus: true });
    }
  };

  // ── ALERT REROUTING ────────────────────────────────────────────────────────
  // target = { id, type ('bin'|'complaint'|'camera'), lat, lng, name }
  const rerouteToAlert = (target) => {
    const available = vehicles.filter(v =>
      ['active', 'collecting', 'en_route'].includes(v.status) && !v.rerouteInfo
    );
    if (!available.length) {
      setRerouteToast('No available vehicles for rerouting');
      setTimeout(() => setRerouteToast(null), 3000);
      return;
    }
    let nearest = null, minDist = Infinity;
    for (const v of available) {
      const path = ACTIVE_ROUTE_PATHS[v.routeId];
      if (!path?.length) continue;
      const pos = path[Math.min(v.posIdx, path.length - 1)];
      if (!pos) continue;
      const d = Math.hypot(pos[0] - target.lat, pos[1] - target.lng);
      if (d < minDist) { minDist = d; nearest = v; }
    }
    if (!nearest) return;

    const vPath = ACTIVE_ROUTE_PATHS[nearest.routeId];
    const startPos = vPath?.length
      ? vPath[Math.min(nearest.posIdx, vPath.length - 1)]
      : [target.lat + 0.003, target.lng + 0.003];
    const reroutePath = buildReroutePath(startPos[0], startPos[1], target.lat, target.lng);

    // Add rerouteInfo to the selected vehicle
    setVehicles(prev => prev.map(v => v.id !== nearest.id ? v : {
      ...v,
      rerouteInfo: {
        alertId: target.id, alertType: target.type,
        alertName: target.name || target.id,
        alertLat: target.lat, alertLng: target.lng,
        reroutePath, rerouteIdx: 0, phase: 'heading', arrivedTicks: 0,
      },
    }));

    // Ensure the vehicle's route is visible on the map
    setActiveRouteIds(prev => new Set([...prev, nearest.routeId]));
    setFocusedRouteId(nearest.routeId);

    setRerouteToast(`🚛 ${nearest.id} rerouted → ${target.name || target.id}`);
    setLiveAlerts(prev => [{
      id: 'ALT-' + Date.now(), sev: 'info',
      msg: `${nearest.id} dispatched to ${target.id} — en route`,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }, ...prev].slice(0, 30));
    setTimeout(() => setRerouteToast(null), 5000);

    // Resolution timer: path length / 2 ticks * 2200ms + service dwell time
    const etaMs = Math.ceil(reroutePath.length / 2) * 2200 + 10000;
    setTimeout(() => {
      if (target.type === 'bin') {
        setBins(prev => prev.map(b =>
          b.id === target.id ? { ...b, fill: Math.max(8, b.fill - 50), status: 'normal' } : b
        ));
      } else if (target.type === 'complaint') {
        setComplaints(prev => prev.map(c =>
          c.id === target.id ? { ...c, status: 'resolved' } : c
        ));
      }
      setVehicles(prev => prev.map(v => {
        if (v.id !== nearest.id) return v;
        const { rerouteInfo, ...rest } = v;
        return rest;
      }));
      setLiveAlerts(prev => [{
        id: 'ALT-' + Date.now(), sev: 'info',
        msg: `✓ ${nearest.id} resolved ${target.id} — returning to assigned route`,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }, ...prev].slice(0, 30));
      setRerouteToast(`✓ ${nearest.id} resolved ${target.id} — back on route`);
      setTimeout(() => setRerouteToast(null), 5000);
    }, etaMs);
  };

  // ── ALERT REROUTE HANDLER (called from left panel alert buttons) ────────────
  const handleAlertReroute = (assetId) => {
    if (assetId.startsWith('BN-')) {
      const bin = bins.find(b => b.id === assetId);
      if (bin) rerouteToAlert({ id: bin.id, type: 'bin', lat: bin.lat, lng: bin.lng, name: 'Bin ' + bin.id + ' — ' + bin.ward });
    } else if (assetId.startsWith('CMP-')) {
      const cmp = complaints.find(c => c.id === assetId);
      if (cmp) rerouteToAlert({ id: cmp.id, type: 'complaint', lat: cmp.lat, lng: cmp.lng, name: cmp.type.replace(/_/g, ' ') + ' — ' + cmp.ward });
    }
  };

  // ── HANDLE ACTIONS ─────────────────────────────────────────────────────────
  const handleAction = (action, data) => {
    const msgs = { dispatch:'Vehicle dispatch confirmed', collect:'Collection scheduled via SWM queue', assign:'Nearest vehicle assigned to complaint', resolve:'Complaint resolved and archived', report:'Full facility report generated', respond:'Response team dispatched to camera site', alert:'Driver alert transmitted via radio', feed:'Live feed opened', calibrate:'Weighbridge calibration scheduled', monitor:'Monitoring view opened', workorder:'Work order created' };
    setActionMsg(msgs[action] || 'Action completed');
    if (action === 'resolve') setComplaints(prev => prev.map(c => c.id === data.id ? { ...c, status: 'resolved' } : c));
    setTimeout(() => setActionMsg(null), 2800);
  };

  // ── ALERT ACTION — zoom to asset + open action modal ────────────────────────
  const handleAlertAction = (alert, label) => {
    // Zoom to the relevant asset and open its entity panel
    inspectAlert(alert);
    // Extract asset ID for display in modal
    const match = alert.msg.match(/(WB-\d{3}|CMP-\d{4}|CAM-\d{3}|BN-\d{3}|V-\d{3}|F-\d{3})/);
    setAlertActionModal({ alert, action: label, assetId: match ? match[1] : null });
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col overflow-hidden relative bg-[#0a1120] ${isPreview ? 'w-full h-full' : 'h-full'}`}>

      {/* ACTION TOAST */}
      {!isPreview && actionMsg && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[2000] bg-emerald-500/20 backdrop-blur border border-emerald-500/40 rounded-lg px-4 py-2 text-xs text-emerald-400 font-semibold shadow-xl">
          ✓ {actionMsg}
        </div>
      )}

      {/* REROUTE TOAST */}
      {!isPreview && rerouteToast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[2000] bg-cyan-500/20 backdrop-blur border border-cyan-500/40 rounded-lg px-4 py-2 text-xs text-cyan-400 font-semibold shadow-xl pointer-events-none">
          🚛 {rerouteToast}
        </div>
      )}

      {/* TOP STATUS BAR */}
      {!isPreview && (
      <div className="h-14 bg-cwm-darker border-b border-cwm-border flex items-center px-4 shrink-0 space-x-4">
        <div className="shrink-0">
          <h1 className="text-sm font-bold text-white tracking-tight leading-none">Digital Twin — Colombo SWM</h1>
          <p className="text-[10px] text-slate-500 mt-0.5">GIS Operations Center · IoT Overlay · Live Simulation</p>
        </div>
        <div className="flex items-center space-x-2 overflow-x-auto">
          {[
            { icon:'🚛', label:'Active Vehicles', v: stats.activeVehicles, vc:'text-emerald-400' },
            { icon:'🚨', label:'Critical Alerts',  v: stats.critAlerts,     vc:'text-red-400' },
            { icon:'🗑️', label:'Overflow Bins',    v: stats.overflow,       vc:'text-amber-400' },
            { icon:'👷', label:'Staff On Route',   v: stats.staffOnRoute,   vc:'text-cyan-400' },
          ].map(s => (
            <div key={s.label} className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] shrink-0">
              <span className="text-sm">{s.icon}</span>
              <div><p className={'text-sm font-bold leading-none ' + s.vc}>{s.v}</p><p className="text-[9px] text-slate-600 mt-0.5">{s.label}</p></div>
            </div>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-slate-400 font-mono">LIVE · {new Date().toLocaleTimeString('en-LK', { hour12: false })}</span>
        </div>
      </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT PANEL */}
        {!isPreview && (
        <LeftPanel layers={layers} setLayers={setLayers} alerts={liveAlerts} stats={stats} wards={wards} selectedWardId={selectedRef?.type === 'ward' ? selectedRef.id : null} onSelectWard={(wardId) => selectWard(wardId, { focus: true })} onInspectAlert={inspectAlert} onAlertAction={handleAlertAction} activeRouteIds={activeRouteIds} setActiveRouteIds={setActiveRouteIds} focusedRouteId={focusedRouteId} setFocusedRouteId={setFocusedRouteId} vehicles={vehicles} selectedZoneId={selectedZoneId} onRerouteFromAlert={handleAlertReroute} />
        )}

        {/* MAP AREA */}
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          <MapContainer
            center={[6.9271, 79.8612]} zoom={12}
            style={{ height: '100%', width: '100%', background: '#0a1120' }}
            zoomControl={false} attributionControl={false}
            doubleClickZoom={!isPreview}
            scrollWheelZoom={!isPreview}
            dragging={!isPreview}
            touchZoom={!isPreview}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
              subdomains="abcd"
              maxZoom={19}
              attribution=""
            />
            {!isPreview && <MapZoomControls />}
            <MapFocusController target={focusTarget} />

            {/* Ward boundaries */}
            {layers.wards && wards.filter(w => !selectedZoneId || w.zoneId === selectedZoneId).map(w => {
              const wClr = w.status === 'critical' ? '#ef4444' : w.status === 'warning' ? '#f59e0b' : '#10b981';
              return (
              <React.Fragment key={w.id}>
                <Polygon positions={w.pts}
                  pathOptions={{ color: wClr, fillColor: wClr, fillOpacity: selectedRef?.type === 'ward' && selectedRef.id === w.id ? 0.22 : 0.10, weight: selectedRef?.type === 'ward' && selectedRef.id === w.id ? 3 : 1.5, opacity: selectedRef?.type === 'ward' && selectedRef.id === w.id ? 0.95 : 0.75 }}
                  eventHandlers={{ click: () => selectWard(w.id, { focus: false }) }} />
                <Marker position={[w.cLat, w.cLng]} icon={L.divIcon({
                  html: '<div style="background:' + wClr + (selectedRef?.type === 'ward' && selectedRef.id === w.id ? '38' : '22') + ';border:' + (selectedRef?.type === 'ward' && selectedRef.id === w.id ? '1.5px solid #ffffff' : '1px solid ' + wClr + '66') + ';border-radius:4px;padding:2px 5px;color:' + (selectedRef?.type === 'ward' && selectedRef.id === w.id ? '#ffffff' : wClr) + ';font-size:8px;font-weight:700;font-family:monospace;white-space:nowrap;pointer-events:none;">' + w.name + '</div>',
                  className: '', iconSize: null, iconAnchor: [0, 0],
                })} eventHandlers={{ click: () => selectWard(w.id, { focus: false }) }} />
              </React.Fragment>
              );
            })}

            {/* Zone polygons + labels */}
            {layers.zones && ZONE_POLYS.map(z => {
              const cLat = z.pts.reduce((s, p) => s + p[0], 0) / z.pts.length;
              const cLng = z.pts.reduce((s, p) => s + p[1], 0) / z.pts.length;
              const zoneWards = wards.filter(w => w.zoneId === z.id);
              const zoneStatus = zoneWards.some(w => w.status === 'critical') ? 'critical' : zoneWards.some(w => w.status === 'warning') ? 'warning' : 'good';
              const zClr = zoneStatus === 'critical' ? '#ef4444' : zoneStatus === 'warning' ? '#f59e0b' : '#10b981';
              const isSelected = selectedZoneId === z.id;
              return (
                <React.Fragment key={z.id}>
                  <Polygon positions={z.pts}
                    pathOptions={{ color: zClr, fillColor: zClr, fillOpacity: isSelected ? 0.12 : 0.05, weight: isSelected ? 2.5 : 1, dashArray: isSelected ? undefined : '5 4', opacity: isSelected ? 1 : 0.6 }}
                    eventHandlers={{ click: () => selectZone(z.id) }} />
                  <Marker position={[cLat, cLng]} icon={L.divIcon({
                    html: '<div style="background:' + zClr + (isSelected ? '30' : '18') + ';border:' + (isSelected ? '1.5px solid ' + zClr : '1px solid ' + zClr + '55') + ';border-radius:4px;padding:2px 6px;color:' + zClr + ';font-size:8px;font-weight:700;font-family:monospace;white-space:nowrap;cursor:pointer;">' + z.name + (isSelected ? '' : ' ▲') + '</div>',
                    className: '', iconSize: null, iconAnchor: [0, 0],
                  })} eventHandlers={{ click: () => selectZone(z.id) }} />
                </React.Fragment>
              );
            })}

            {/* Route polylines — only routes in activeRouteIds are drawn */}
            {activeRouteIds.size > 0 && Object.entries(ROUTE_DEFS)
              .filter(([k]) => activeRouteIds.has(k))
              .filter(([k]) => !selectedZoneId || ROUTE_ZONE_SETS[k]?.has(selectedZoneId))
              .map(([k, r]) => {
                const routePath = ACTIVE_ROUTE_PATHS[k];
                if (!routePath || routePath.length < 2) return null;
                const isFocused = focusedRouteId === k;
                return (
                  <React.Fragment key={k}>
                    <Polyline positions={routePath}
                      pathOptions={{ color: '#0f172a', weight: isFocused ? 8 : r.hierarchy === 'primary' ? 5.8 : 4.8, opacity: 0.4, lineCap: 'round', lineJoin: 'round' }} />
                    <Polyline positions={routePath}
                      pathOptions={{ color: isFocused ? '#ffffff' : '#38bdf8', weight: isFocused ? 5 : r.hierarchy === 'primary' ? 3.6 : r.hierarchy === 'haul' ? 3.2 : 2.5, opacity: isFocused ? 1 : r.hierarchy === 'haul' ? 0.8 : 0.72, dashArray: r.hierarchy === 'secondary' ? '8 5' : r.hierarchy === 'haul' ? '4 6' : undefined, lineCap: 'round', lineJoin: 'round' }} />
                  </React.Fragment>
                );
              })}

            {/* Smart bins – fill=fill color, stroke=waste type color */}
            {layers.bins && bins.filter(b => !selectedZoneId || b.zone === selectedZoneId).map(b => (
              <Marker key={b.id} position={[b.lat, b.lng]} icon={mkBinIcon(b, selectedRef?.id === b.id)}
                eventHandlers={{ click: () => selectRef('bin', b.id) }}>
                <Popup className="dt-popup"><div style={{fontFamily:'monospace',fontSize:11}}><b>{b.id}</b> · {b.fill.toFixed(0)}% filled<br />{b.ward} · {b.zone} · <b style={{color:BIN_TYPE_STROKE[b.type]}}>{b.type}</b> · {b.cap}L</div></Popup>
              </Marker>
            ))}

            {/* Weighbridges */}
            {layers.weighbridges && weighbridges.filter(bridge => !selectedZoneId || inZoneByLat(bridge.lat, selectedZoneId)).map(bridge => (
              <Marker key={bridge.id} position={[bridge.lat, bridge.lng]} icon={mkWeighIcon(bridge, selectedRef?.id === bridge.id)}
                eventHandlers={{ click: () => selectRef('weighbridge', bridge.id) }}>
                <Popup className="dt-popup"><div style={{fontFamily:'monospace',fontSize:11}}><b>{bridge.name}</b><br />{bridge.status.toUpperCase()} · queue {bridge.queue}<br />Last {bridge.lastVehicle} · {bridge.lastWeight} t</div></Popup>
              </Marker>
            ))}

            {/* ── REROUTED VEHICLE OVERLAYS ── red path segment + pulse ring at alert location */}
            {vehicles.filter(v => v.rerouteInfo).map(v => {
              const ri = v.rerouteInfo;
              const curIdx = Math.min(ri.rerouteIdx, ri.reroutePath.length - 1);
              const remainingPath = ri.reroutePath.slice(curIdx);
              const traveledPath  = ri.reroutePath.slice(0, curIdx + 1);
              return (
                <React.Fragment key={'reroute-' + v.id}>
                  {/* Full planned detour path (dim background) */}
                  {ri.reroutePath.length > 1 && (
                    <Polyline positions={ri.reroutePath}
                      pathOptions={{ color: '#ef4444', weight: 2, opacity: 0.15, lineCap: 'round', lineJoin: 'round' }} />
                  )}
                  {/* Traveled portion (dim red) */}
                  {traveledPath.length > 1 && (
                    <Polyline positions={traveledPath}
                      pathOptions={{ color: '#ef4444', weight: 2.5, opacity: 0.35, dashArray: '4 4', lineCap: 'round' }} />
                  )}
                  {/* Remaining path to alert (bright red) */}
                  {remainingPath.length > 1 && (
                    <>
                      <Polyline positions={remainingPath}
                        pathOptions={{ color: '#0f172a', weight: 7, opacity: 0.45, lineCap: 'round' }} />
                      <Polyline positions={remainingPath}
                        pathOptions={{ color: '#ef4444', weight: 4.5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />
                    </>
                  )}
                  {/* Alert location — outer ring */}
                  <CircleMarker center={[ri.alertLat, ri.alertLng]} radius={22}
                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.05, weight: 1.5, dashArray: '5 4', opacity: 0.55 }} />
                  {/* Alert location — inner fill */}
                  <CircleMarker center={[ri.alertLat, ri.alertLng]} radius={10}
                    pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.22, weight: 2, opacity: 0.9 }} />
                  {/* Label badge at alert */}
                  <Marker position={[ri.alertLat, ri.alertLng]} icon={L.divIcon({
                    html: '<div style="background:#ef444415;border:1px solid #ef444455;border-radius:6px;padding:2px 7px;color:#ef4444;font-size:8px;font-weight:700;font-family:monospace;white-space:nowrap;pointer-events:none;">' + v.id + ' → ' + ri.alertId + ' (' + (ri.phase === 'heading' ? 'En Route' : 'Arrived') + ')</div>',
                    className: '', iconSize: [0, 0], iconAnchor: [-2, 32],
                  })} />
                </React.Fragment>
              );
            })}

            {/* Vehicles */}
            {layers.vehicles && vehicles.filter(v => !selectedZoneId || (ROUTE_ZONE_SETS[v.routeId] && ROUTE_ZONE_SETS[v.routeId].has(selectedZoneId))).map(v => {
              // Use reroute path position when vehicle is dispatched to an alert
              let pos;
              if (v.rerouteInfo) {
                const ri = v.rerouteInfo;
                pos = ri.reroutePath[Math.min(ri.rerouteIdx, ri.reroutePath.length - 1)];
              } else {
                const path = ACTIVE_ROUTE_PATHS[v.routeId];
                if (!path || path.length < 1) return null;
                pos = path[Math.min(v.posIdx, path.length - 1)];
              }
              if (!pos) return null;
              return (
                <Marker key={v.id} position={pos} icon={mkVehIcon(v, selectedRef?.id === v.id)}
                  eventHandlers={{ click: () => selectRef('vehicle', v.id) }}>
                  <Popup className="dt-popup"><div style={{fontFamily:'monospace',fontSize:11}}><b>{v.id}</b> · {v.type}<br />{typeof v.driver === 'object' ? v.driver?.name : v.driver} · {v.status.replace(/_/g,' ')}</div></Popup>
                </Marker>
              );
            })}

            {/* Staff */}
            {layers.staff && staff.filter(s => !selectedZoneId || s.zone === selectedZoneId).map(s => (
              <Marker key={s.id} position={[s.lat, s.lng]} icon={mkStfIcon(s)}
                eventHandlers={{ click: () => selectRef('staff', s.id) }}>
                <Popup className="dt-popup"><div style={{fontFamily:'monospace',fontSize:11}}><b>{s.name}</b><br />{s.type} · {s.zone}</div></Popup>
              </Marker>
            ))}

            {/* Complaints (unresolved only) */}
            {layers.complaints && complaints.filter(c => c.status !== 'resolved' && (!selectedZoneId || WARD_ZONE_MAP[c.wardId] === selectedZoneId)).map(c => (
              <Marker key={c.id} position={[c.lat, c.lng]} icon={mkCmpIcon(c)}
                eventHandlers={{ click: () => selectRef('complaint', c.id) }}>
                <Popup className="dt-popup"><div style={{fontFamily:'monospace',fontSize:11}}><b>{c.id}</b><br />{c.type.replace(/_/g,' ')} · {c.priority}</div></Popup>
              </Marker>
            ))}

            {/* Facility capacity rings — always visible for all facilities */}
            {FACILITIES.map(f => (
              <CircleMarker key={'ring-' + f.id} center={[f.lat, f.lng]}
                radius={f.capPct > 80 ? 30 : f.capPct > 60 ? 24 : 18}
                pathOptions={{ color: f.color, fillOpacity: 0, weight: 1.2, opacity: (f.capPct / 180), dashArray: '4 3' }} />
            ))}

            {/* Facilities — always visible, all types */}
            {FACILITIES.map(f => (
              <Marker key={f.id} position={[f.lat, f.lng]} icon={mkFacIcon(f)}
                eventHandlers={{
                  click:    () => selectRef('facility', f.id),
                  dblclick: (e) => { L.DomEvent.stopPropagation(e); if (f.type === 'wte') { setWteData(f); setWteOpen(true); } },
                }}>
                <Popup className="dt-popup">
                  <div style={{fontFamily:'monospace',fontSize:11}}>
                    <b>{f.name}</b><br />{f.type} · {f.capPct}% capacity
                    {f.type === 'wte' && <><br /><span style={{color:'#f59e0b',fontStyle:'italic'}}>Double-click → 3D Sub-Twin</span></>}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Camera FOV triangles */}
            {layers.cameras && CAMERAS.filter(c => c.status !== 'offline' && (!selectedZoneId || inZoneByLat(c.lat, selectedZoneId))).map(c => {
              const h = (CAM_HEADINGS[c.id] || 0) * Math.PI / 180;
              const R = 0.0014, spread = 38 * Math.PI / 180;
              const tp1 = [c.lat + R * Math.cos(h - spread), c.lng + R * Math.sin(h - spread)];
              const tp2 = [c.lat + R * Math.cos(h + spread), c.lng + R * Math.sin(h + spread)];
              const fovClr = c.status === 'alert' ? '#ef4444' : '#10b981';
              return <Polygon key={'fov-' + c.id} positions={[[c.lat, c.lng], tp1, tp2]}
                pathOptions={{ color: fovClr, fillColor: fovClr, fillOpacity: 0.07, weight: 0.6, opacity: 0.4 }} />;
            })}

            {/* Cameras */}
            {layers.cameras && CAMERAS.filter(c => !selectedZoneId || inZoneByLat(c.lat, selectedZoneId)).map(c => (
              <Marker key={c.id} position={[c.lat, c.lng]} icon={mkCamIcon(c)}
                eventHandlers={{ click: () => selectRef('camera', c.id) }}>
                <Popup className="dt-popup">
                  <div style={{fontFamily:'monospace',fontSize:11}}>
                    <b>{c.name}</b><br />
                    <span style={{color: c.status==='alert'?'#ef4444':c.status==='offline'?'#6b7280':'#10b981'}}>{c.status.toUpperCase()}</span>
                    {' · '}{c.detect}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Active route count badge (all-zones view) */}
          {!selectedZoneId && activeRouteIds.size > 0 && !isPreview && (
            <div className="absolute top-2 left-2 z-[999] flex items-center space-x-2 bg-cwm-panel/90 backdrop-blur-sm border border-cwm-border rounded-lg px-3 py-1.5 shadow-xl">
              <span className="text-[10px] text-cyan-400 font-semibold">🛣️ {activeRouteIds.size} route{activeRouteIds.size > 1 ? 's' : ''} active</span>
              <button onClick={() => { setActiveRouteIds(new Set()); setFocusedRouteId(null); }}
                className="text-[9px] text-slate-500 hover:text-red-400 transition-colors font-semibold border border-slate-700 rounded px-1.5 py-0.5">
                ✕ Clear
              </button>
            </div>
          )}

          {/* Zone drill-down toolbar */}
          {selectedZoneId && !isPreview && (() => {            const zoneRoutes = Object.keys(ROUTE_DEFS).filter(k => ROUTE_ZONE_SETS[k]?.has(selectedZoneId));
            const allZoneActive = zoneRoutes.length > 0 && zoneRoutes.every(k => activeRouteIds.has(k));
            return (
              <div className="absolute top-2 left-2 z-[999] flex items-center space-x-2">
                <button
                  onClick={() => selectZone(selectedZoneId)}
                  className="flex items-center space-x-1.5 bg-cwm-panel/90 backdrop-blur-sm border border-cwm-border hover:border-cwm-accent/50 rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors shadow-xl"
                >
                  <span>←</span><span>All Zones</span>
                </button>
                <button
                  onClick={() => {
                    if (allZoneActive) {
                      setActiveRouteIds(prev => { const n = new Set(prev); zoneRoutes.forEach(k => n.delete(k)); return n; });
                      setFocusedRouteId(null);
                    } else {
                      setActiveRouteIds(prev => new Set([...prev, ...zoneRoutes]));
                    }
                  }}
                  className={`flex items-center space-x-1.5 bg-cwm-panel/90 backdrop-blur-sm border rounded-lg px-3 py-1.5 text-xs transition-colors shadow-xl ${
                    allZoneActive ? 'border-cyan-500/50 text-cyan-400' : 'border-cwm-border text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span>🛣️</span><span>Routes {allZoneActive ? 'On' : 'Off'}</span>
                </button>
              </div>
            );
          })()}

          {/* ── ACTIVE REROUTE STATUS PANEL ──────────────────────────────────── */}
          {!isPreview && vehicles.some(v => v.rerouteInfo) && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-cwm-darker/96 backdrop-blur-sm border border-red-500/30 rounded-xl shadow-2xl overflow-hidden" style={{ minWidth: '20rem', maxWidth: '28rem' }}>
              <div className="flex items-center justify-between px-3 py-2 border-b border-red-500/20 bg-red-500/5">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Active Reroutes</span>
                </div>
                <span className="text-[8px] text-slate-500">
                  {vehicles.filter(v => v.rerouteInfo).length} vehicle{vehicles.filter(v => v.rerouteInfo).length !== 1 ? 's' : ''} dispatched
                </span>
              </div>
              <div className="p-2 space-y-1.5 max-h-36 overflow-y-auto">
                {vehicles.filter(v => v.rerouteInfo).map(v => {
                  const ri = v.rerouteInfo;
                  const pct = Math.min(100, Math.round((ri.rerouteIdx / Math.max(1, ri.reroutePath.length - 1)) * 100));
                  const phaseLabel = ri.phase === 'heading' ? `En route — ${pct}%` : '📍 Arrived — servicing';
                  return (
                    <div key={v.id} className="flex items-center space-x-2 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                      <span className="text-[9px] font-mono font-bold text-cyan-400 shrink-0">{v.id}</span>
                      <span className="text-[7px] text-slate-600 shrink-0">→</span>
                      <span className="text-[9px] font-bold text-red-400 shrink-0">{ri.alertId}</span>
                      <span className="text-[7px] text-slate-600 shrink-0 truncate">{ri.alertName}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full transition-all duration-300" style={{ width: pct + '%' }} />
                          </div>
                          <span className="text-[7px] text-slate-500 shrink-0 whitespace-nowrap">{phaseLabel}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT DETAIL PANEL */}
        {!isPreview && selectedEntity && (
          <div className="w-72 border-l border-cwm-border bg-cwm-darker flex flex-col shrink-0 overflow-hidden">
            <EntityPanel entity={selectedEntity} onClose={() => setSelectedRef(null)} onAction={handleAction} routePaths={ACTIVE_ROUTE_PATHS} onRerouteToAlert={rerouteToAlert} />
          </div>
        )}
      </div>

      {/* WTE 3D SUB-TWIN MODAL */}
      {!isPreview && wteOpen && wteData && (
        <WTE3DViewer facility={wteData} onClose={() => { setWteOpen(false); setWteData(null); }} />
      )}

      {/* ALERT ACTION MODAL — zoom to asset + contextual dispatch/escalation form */}
      {!isPreview && alertActionModal && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setAlertActionModal(null)}>
          <div className="relative bg-cwm-darker border border-cwm-border rounded-2xl shadow-2xl overflow-hidden w-full max-w-md mx-4"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={'flex items-center justify-between px-5 py-4 border-b border-cwm-border ' + (alertActionModal.alert.sev === 'critical' ? 'bg-red-500/5' : alertActionModal.alert.sev === 'warning' ? 'bg-amber-500/5' : 'bg-blue-500/5')}>
              <div className="flex items-center space-x-3">
                <div className={'text-xl ' + (alertActionModal.action.includes('Escalate') ? '🚨' : alertActionModal.action.includes('Dispatch') ? '🚛' : '✓')}>
                  {alertActionModal.action.includes('Escalate') ? '🚨' : alertActionModal.action.includes('Dispatch') ? '🚛' : alertActionModal.action.includes('Assign') ? '📋' : '✓'}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{alertActionModal.action.replace(/[🚨🚛✓📋🔍]/g, '').trim()}</p>
                  <p className={'text-[9px] font-mono mt-0.5 ' + (alertActionModal.alert.sev === 'critical' ? 'text-red-400' : alertActionModal.alert.sev === 'warning' ? 'text-amber-400' : 'text-blue-400')}>
                    {alertActionModal.alert.sev?.toUpperCase()} · {alertActionModal.alert.id} · {alertActionModal.alert.time}
                  </p>
                </div>
              </div>
              <button onClick={() => setAlertActionModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors text-lg">×</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Alert message */}
              <div className="bg-white/[0.025] rounded-lg border border-white/[0.06] px-3 py-2.5">
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Alert Message</p>
                <p className="text-[11px] text-slate-300 leading-relaxed">{alertActionModal.alert.msg}</p>
              </div>

              {/* Linked asset */}
              {alertActionModal.assetId && (
                <div className="bg-cyan-500/8 rounded-lg border border-cyan-500/20 px-3 py-2.5">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Linked Asset</p>
                  <p className="text-[11px] text-cyan-400 font-mono font-bold">{alertActionModal.assetId}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Map view has zoomed to this asset · Asset panel is open</p>
                </div>
              )}

              {/* Contextual input fields */}
              {alertActionModal.action.includes('Dispatch') && (
                <div className="space-y-2.5">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Dispatch Details</p>
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase tracking-wide block mb-1">Unit to Dispatch</label>
                    <input type="text" defaultValue={alertActionModal.assetId?.startsWith('V-') ? alertActionModal.assetId : ''} placeholder="e.g. V-007"
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50" />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase tracking-wide block mb-1">ETA / Priority Notes</label>
                    <textarea rows={2} placeholder="Enter dispatch instructions or ETA..."
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-[11px] text-white placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-500/50" />
                  </div>
                </div>
              )}
              {alertActionModal.action.includes('Escalate') && (
                <div className="space-y-2.5">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Escalation Details</p>
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase tracking-wide block mb-1">Escalate To</label>
                    <select className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-[11px] text-white focus:outline-none focus:border-red-500/50">
                      <option value="supervisor">Zone Supervisor</option>
                      <option value="manager">Operations Manager</option>
                      <option value="director">CMC Director</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase tracking-wide block mb-1">Reason / Notes</label>
                    <textarea rows={2} placeholder="Describe the escalation reason..."
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-[11px] text-white placeholder-slate-600 resize-none focus:outline-none focus:border-red-500/50" />
                  </div>
                </div>
              )}
              {(alertActionModal.action.includes('Acknowledge') || alertActionModal.action.includes('Assign') || alertActionModal.action.includes('Inspect')) && (
                <div className="space-y-2.5">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Acknowledgement Notes</p>
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase tracking-wide block mb-1">Acknowledged By</label>
                    <input type="text" defaultValue="Operations Officer" placeholder="Name"
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase tracking-wide block mb-1">Notes</label>
                    <textarea rows={2} placeholder="Add any relevant notes..."
                      className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-[11px] text-white placeholder-slate-600 resize-none focus:outline-none focus:border-emerald-500/50" />
                  </div>
                </div>
              )}

              {/* Confirm button */}
              <button
                onClick={() => {
                  setAlertActionModal(null);
                  setActionMsg(alertActionModal.action.replace(/[🚨🚛✓📋🔍]/g, '').trim() + ' — submitted successfully');
                  setTimeout(() => setActionMsg(null), 2800);
                }}
                className={'w-full py-2.5 rounded-xl text-[11px] font-bold tracking-wide transition-colors border ' + (alertActionModal.action.includes('Escalate') ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25' : alertActionModal.action.includes('Dispatch') ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/25' : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25')}
              >
                Confirm {alertActionModal.action.replace(/[🚨🚛✓📋🔍]/g, '').trim()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


