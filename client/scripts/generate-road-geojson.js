const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'colomboRoads.json');
const BBOX = '6.78,79.82,7.06,79.99';
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const REQUESTS = [
  { name: 'Galle Road' },
  { name: 'Marine Drive' },
  { name: 'Olcott Mawatha' },
  { name: 'Maradana Road' },
  { name: 'Baseline Road' },
  { name: 'Nawala Road' },
  { name: 'Parliament Road' },
  { name: 'Sri Jayawardenepura Mawatha', aliases: ['Sri Jayawardenepura Mawatha', 'Sri Jayewardenepura Mawatha'], required: false },
  { name: 'Bauddhaloka Mawatha' },
  { name: 'Havelock Road' },
  { name: 'High Level Road' },
  { name: 'Old Kesbewa Road', required: false },
  { name: 'Grandpass Road' },
  { name: 'George R. de Silva Mawatha' },
  { name: 'Jampettah Street', required: false },
  { name: 'Aluthmawatha Road', required: false },
  { name: 'Mutwal Tunnel Road', required: false },
  { name: 'Negombo Road', required: false },
  { name: "St. Lucia's Street", required: false },
  { name: 'Darley Road', required: false },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toLineString(geometry) {
  return geometry.map((point) => [point.lon, point.lat]);
}

function sqDist(a, b) {
  const dLat = a[1] - b[1];
  const dLng = a[0] - b[0];
  return dLat * dLat + dLng * dLng;
}

function mergeSegments(segments) {
  const queue = segments.filter((segment) => segment.length > 1).map((segment) => [...segment]);
  if (!queue.length) {
    return [];
  }

  queue.sort((left, right) => right.length - left.length);
  const merged = [...queue.shift()];

  while (queue.length) {
    const start = merged[0];
    const end = merged[merged.length - 1];
    let bestIndex = -1;
    let bestMode = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    queue.forEach((segment, index) => {
      const distances = [
        { mode: 'append-forward', dist: sqDist(end, segment[0]) },
        { mode: 'append-reverse', dist: sqDist(end, segment[segment.length - 1]) },
        { mode: 'prepend-forward', dist: sqDist(start, segment[segment.length - 1]) },
        { mode: 'prepend-reverse', dist: sqDist(start, segment[0]) },
      ];
      const bestCandidate = distances.reduce((winner, candidate) => (candidate.dist < winner.dist ? candidate : winner), distances[0]);
      if (bestCandidate.dist < bestDistance) {
        bestDistance = bestCandidate.dist;
        bestIndex = index;
        bestMode = bestCandidate.mode;
      }
    });

    const segment = queue.splice(bestIndex, 1)[0];
    if (bestMode === 'append-forward') {
      merged.push(...segment.slice(sqDist(end, segment[0]) < 1e-10 ? 1 : 0));
    } else if (bestMode === 'append-reverse') {
      const reversed = [...segment].reverse();
      merged.push(...reversed.slice(sqDist(end, reversed[0]) < 1e-10 ? 1 : 0));
    } else if (bestMode === 'prepend-forward') {
      const prefix = segment.slice(0, sqDist(start, segment[segment.length - 1]) < 1e-10 ? -1 : segment.length);
      merged.unshift(...prefix);
    } else {
      const reversed = [...segment].reverse();
      const prefix = reversed.slice(0, sqDist(start, reversed[reversed.length - 1]) < 1e-10 ? -1 : reversed.length);
      merged.unshift(...prefix);
    }
  }

  return merged;
}

async function fetchOverpass(url, query, requestName) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'CopilotRoadImport/1.0',
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass failed for ${requestName}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchRoad(request) {
  const candidateNames = [request.name, ...(request.aliases || [])];
  const nameRegex = `^(${candidateNames.map(escapeRegex).join('|')})$`;
  const query = `[out:json][timeout:40];(way["highway"]["name"~"${nameRegex}",i](${BBOX}););out geom;`;

  let lastError = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const data = await fetchOverpass(endpoint, query, request.name);
      const ways = (data.elements || []).filter((element) => element.type === 'way'
        && element.tags
        && element.tags.name
        && candidateNames.map((item) => item.toLowerCase()).includes(element.tags.name.toLowerCase())
        && Array.isArray(element.geometry)
        && element.geometry.length > 1);

      if (!ways.length) {
        throw new Error(`No way geometry found for ${request.name}`);
      }

      const merged = mergeSegments(ways.map((way) => toLineString(way.geometry)));
      if (merged.length < 2) {
        throw new Error(`Merged geometry too short for ${request.name}`);
      }

      return {
        type: 'Feature',
        properties: {
          name: request.name,
          source: 'OSM-Overpass',
          bbox: BBOX,
          segmentCount: ways.length,
          aliases: request.aliases || [],
        },
        geometry: {
          type: 'LineString',
          coordinates: merged,
        },
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Unable to fetch geometry for ${request.name}`);
}

async function main() {
  const features = [];
  for (const request of REQUESTS) {
    try {
      const feature = await fetchRoad(request);
      features.push(feature);
      console.log(`Fetched ${request.name} -> ${feature.geometry.type} (${feature.properties.segmentCount} way segments)`);
      await sleep(900);
    } catch (error) {
      if (request.required === false) {
        console.warn(`Skipping ${request.name}: ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ type: 'FeatureCollection', features }, null, 2));
  console.log(`Saved ${features.length} road features to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});