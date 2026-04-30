// ============================================================================
// OPERATIONS DATA - Adapter layer between simulation engine and REST/Socket API
// Initialises the simulation and exposes all data access methods.
// ============================================================================

const sim = require('./simulation');
const advisory = require('./aiAdvisory');

// ── Bootstrap ─────────────────────────────────────────────────────────────────
sim.initializeSimulation();

// Generate an initial batch of advisories right away so the UI has content.
try {
  const snapshot = sim.getSimulationSnapshot();
  advisory.generateAdvisories(snapshot.kpis, sim.state);
} catch (_) { /* advisory generation is best-effort */ }

// Tick the simulation every 15 seconds and refresh advisories every 60 s.
setInterval(() => {
  try { sim.simulationTick(); } catch (_) {}
}, 15000);

setInterval(() => {
  try {
    const snapshot = sim.getSimulationSnapshot();
    advisory.generateAdvisories(snapshot.kpis, sim.state);
  } catch (_) {}
}, 60000);

// ── Core data accessors ───────────────────────────────────────────────────────

function getDashboard()       { return sim.getSimulationSnapshot(); }
function getKPIs()            { return sim.getKPIs(); }
function getHistoricalSeries(){ return sim.getHistoricalData(); }
function getBins()            { return sim.getBins(); }
function getVehicles()        { return sim.getVehicles(); }
function getZones()           { return sim.getZones(); }
function getFacilities()      { return sim.getFacilities(); }
function getWTEData()         { return sim.getWTEPlant(); }
function getAlerts()          { return sim.getAlerts(); }
function getWeather()         { return sim.getWeather(); }
function getWorkOrders()      { return sim.getWorkOrders(); }

// ── Advisories ────────────────────────────────────────────────────────────────
function getAdvisories() {
  const list = advisory.getAdvisories();
  // Surface the most recent 20 advisories with a stable shape for the UI.
  return list.slice(0, 20).map(adv => ({
    advisoryId: adv.advisoryId,
    title: adv.title || 'Advisory',
    category: adv.category || 'General',
    severity: adv.severity || 'info',
    summary: adv.summary || (adv.rootCause?.immediate || ''),
    rootCause: adv.rootCause || {},
    recommendations: adv.recommendations || {},
    impact: adv.impact || {},
    evidence: adv.evidence || [],
    actions: adv.actions || [],
    acknowledged: adv.acknowledged || false,
    generatedAt: adv.generatedAt || new Date().toISOString(),
  }));
}

// ── Citizen Services (static representative data) ─────────────────────────────
function getCitizenServices() {
  const allBins   = sim.getBins();
  const allAlerts = sim.getAlerts();
  const overflowBins = allBins.filter(b => b.currentFillLevel >= 85);

  return {
    complaints: {
      total: 42,
      open: 18,
      resolved: 24,
      avgResolutionHrs: 4.2,
      categories: {
        missed_collection: 14,
        illegal_dumping: 9,
        bin_overflow: 8,
        odour: 6,
        other: 5,
      },
    },
    nearestCollectionPoints: allBins.slice(0, 15).map(b => ({
      binId: b.binId,
      type: b.type,
      fillLevel: Math.round(b.currentFillLevel),
      lat: b.location?.lat,
      lng: b.location?.lng,
      ward: b.location?.ward,
      status: b.status,
    })),
    upcomingCollections: [
      { ward: 'Fort & Pettah', time: '06:00', frequency: 'Daily' },
      { ward: 'Slave Island',  time: '07:00', frequency: 'Daily' },
      { ward: 'Borella',       time: '06:30', frequency: 'Daily' },
      { ward: 'Maradana',      time: '07:30', frequency: 'Daily' },
      { ward: 'Kotahena',      time: '06:00', frequency: 'Daily' },
    ],
    serviceAlerts: allAlerts
      .filter(a => a.type === 'critical' || a.type === 'warning')
      .slice(0, 5)
      .map(a => ({ title: a.title, zone: a.zone, type: a.type, createdAt: a.createdAt })),
    overflowHotspots: overflowBins.slice(0, 10).map(b => ({
      binId: b.binId,
      fillLevel: Math.round(b.currentFillLevel),
      zone: b.location?.zone,
      ward: b.location?.ward,
      lat: b.location?.lat,
      lng: b.location?.lng,
    })),
  };
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  getDashboard,
  getKPIs,
  getHistoricalSeries,
  getBins,
  getVehicles,
  getZones,
  getFacilities,
  getWTEData,
  getAlerts,
  getAdvisories,
  getWorkOrders,
  getWeather,
  getCitizenServices,
};
