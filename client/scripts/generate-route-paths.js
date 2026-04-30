const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'colomboRoutePaths.json');

const LAND_GRID = [
  [[6.960,79.840],[6.962,79.870],[6.955,79.895],[6.950,79.915],[6.945,79.935]],
  [[6.935,79.845],[6.938,79.865],[6.936,79.890],[6.930,79.910],[6.925,79.930]],
  [[6.910,79.848],[6.912,79.862],[6.908,79.885],[6.905,79.905],[6.900,79.925]],
  [[6.885,79.853],[6.888,79.860],[6.885,79.880],[6.878,79.900],[6.875,79.920]],
  [[6.860,79.858],[6.862,79.870],[6.860,79.890],[6.855,79.910],[6.850,79.930]],
  [[6.835,79.865],[6.838,79.875],[6.835,79.895],[6.828,79.915],[6.820,79.935]],
];

const FACILITIES = [
  { id:'F-001', lat:6.8340, lng:79.9680 },
  { id:'F-002', lat:7.0107, lng:79.9012 },
  { id:'F-003', lat:6.9115, lng:79.8690 },
  { id:'F-004', lat:6.8600, lng:79.8695 },
  { id:'F-005', lat:6.8720, lng:79.9005 },
  { id:'F-006', lat:6.7950, lng:79.8820 },
];

const wardCell = (row, col) => [
  LAND_GRID[row][col],
  LAND_GRID[row][col + 1],
  LAND_GRID[row + 1][col + 1],
  LAND_GRID[row + 1][col],
];

const centroidOf = (pts) => ([
  pts.reduce((sum, point) => sum + point[0], 0) / pts.length,
  pts.reduce((sum, point) => sum + point[1], 0) / pts.length,
]);

const createWard = (id, pts) => {
  const [cLat, cLng] = centroidOf(pts);
  return { id, cLat, cLng };
};

const BASE_WARDS = [
  createWard('W01', wardCell(0, 0)),
  createWard('W02', wardCell(0, 1)),
  createWard('W03', wardCell(0, 2)),
  createWard('W04', wardCell(0, 3)),
  createWard('W05', wardCell(1, 0)),
  createWard('W06', wardCell(1, 1)),
  createWard('W07', wardCell(1, 2)),
  createWard('W08', wardCell(1, 3)),
  createWard('W09', wardCell(2, 0)),
  createWard('W10', wardCell(2, 1)),
  createWard('W11', wardCell(2, 2)),
  createWard('W12', wardCell(2, 3)),
  createWard('W13', wardCell(3, 0)),
  createWard('W14', wardCell(3, 1)),
  createWard('W15', wardCell(3, 2)),
  createWard('W16', wardCell(3, 3)),
  createWard('W17', wardCell(4, 0)),
  createWard('W18', wardCell(4, 1)),
  createWard('W19', wardCell(4, 2)),
  createWard('W20', wardCell(4, 3)),
];

const getWardCoord = (wardId) => {
  const ward = BASE_WARDS.find((item) => item.id === wardId);
  return ward ? [ward.cLat, ward.cLng] : null;
};

const getFacilityCoord = (facilityId) => {
  const facility = FACILITIES.find((item) => item.id === facilityId);
  return facility ? [facility.lat, facility.lng] : null;
};

const ROUTE_BLUEPRINTS = {
  R1: ['W01', 'W05', 'W09', 'W13', 'W17'].map(getWardCoord),
  R2: ['W02', 'W06', 'W10', 'W14', 'W18'].map(getWardCoord),
  R3: ['W03', 'W07', 'W11', 'W15', 'W19'].map(getWardCoord),
  R4: ['W04', 'W08', 'W12', 'W16', 'W20'].map(getWardCoord),
  R5: ['W13', 'W14', 'W15', 'W16', 'W20'].map(getWardCoord),
  R6: ['W13', 'W17', 'W18', 'W19', 'W20'].map(getWardCoord),
  R7: ['W03', 'W04', 'W07', 'W08', 'W11'].map(getWardCoord),
  R8: [getFacilityCoord('F-003'), getWardCoord('W12'), getFacilityCoord('F-002')],
  R9: [getFacilityCoord('F-004'), getWardCoord('W20'), getFacilityCoord('F-001')],
  R10: [getFacilityCoord('F-005'), getWardCoord('W20'), getFacilityCoord('F-006')],
};

const toOsrmPoint = ([lat, lng]) => `${lng},${lat}`;

async function fetchRoutePath(routeId, waypoints) {
  const coords = waypoints.filter(Boolean);
  if (coords.length < 2) {
    throw new Error(`Not enough waypoints for ${routeId}`);
  }
  const url = `https://router.project-osrm.org/route/v1/driving/${coords.map(toOsrmPoint).join(';')}?overview=full&geometries=geojson&continue_straight=true`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OSRM ${response.status} for ${routeId}`);
  }
  const data = await response.json();
  const geometry = data?.routes?.[0]?.geometry?.coordinates || [];
  return geometry.map(([lng, lat]) => [lat, lng]);
}

async function main() {
  const routePaths = {};

  for (const [routeId, waypoints] of Object.entries(ROUTE_BLUEPRINTS)) {
    const pathPoints = await fetchRoutePath(routeId, waypoints);
    routePaths[routeId] = pathPoints;
    console.log(`Fetched ${routeId} -> ${pathPoints.length} points`);
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(routePaths, null, 2));
  console.log(`Saved ${Object.keys(routePaths).length} routed paths to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});