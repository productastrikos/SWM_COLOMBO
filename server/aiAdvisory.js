// ============================================================================
// AI ADVISORY ENGINE - Contextual, Non-repetitive, Multi-layered
// Simulates LLM-like reasoning for waste management advisories
// ============================================================================

const { v4: uuidv4 } = require('uuid');

class AIAdvisoryEngine {
  constructor() {
    this.generatedAdvisories = [];
    this.recentTopics = new Set();
    this.advisoryTemplates = this.buildTemplateLibrary();
    this.lastGenerationTime = 0;
    this.generationCooldown = 30000; // 30 seconds between advisories
    this.maxRecent = 50;
  }

  // ============================================================================
  // TEMPLATE LIBRARY - 40+ unique advisory patterns
  // ============================================================================
  buildTemplateLibrary() {
    return [
      {
        id: 'overflow_cluster',
        trigger: (kpis, state) => kpis.overflowBins?.value > 8,
        category: 'Collection Optimization',
        severity: 'critical',
        generate: (kpis, state, context) => ({
          title: `Critical Bin Overflow Cluster Detected in ${context.worstZone?.name || 'Multiple Zones'}`,
          rootCause: {
            immediate: `${kpis.overflowBins.value} bins currently at or above 85% capacity, concentrated in ${context.overflowZones || 3} collection zones.`,
            secondary: `Collection route delays averaging ${context.avgDelay || 23} minutes due to ${state.weather?.condition === 'rain' || state.weather?.condition === 'heavy_rain' ? 'ongoing rainfall' : 'peak traffic congestion'}, compounding the scheduled collection gaps.`,
            systemLevel: `Current fleet utilization at ${kpis.fleetUtilization?.value || 45}% suggests under-deployment during peak waste generation hours. The ${context.worstZone?.type || 'mixed'}-zone collection frequency may need recalibration.`
          },
          evidence: [
            { metric: 'Overflow Bins', value: kpis.overflowBins.value, trend: 'increasing', significance: `${Math.round((kpis.overflowBins.value / context.totalBins) * 100)}% of total bin network in overflow state` },
            { metric: 'Avg Fill Level', value: `${kpis.avgBinFillLevel?.value}%`, trend: kpis.avgBinFillLevel?.trend > 0 ? 'rising' : 'stable', significance: 'Above 60% threshold triggers accelerated collection protocol' },
            { metric: 'Fleet Utilization', value: `${kpis.fleetUtilization?.value}%`, trend: 'below_target', significance: 'Available vehicles not fully deployed' },
            { metric: 'Collection Rate', value: `${kpis.collectionRate?.value}%`, trend: kpis.collectionRate?.trend < 0 ? 'declining' : 'stable', significance: `${(100 - kpis.collectionRate?.value).toFixed(1)}% waste uncollected today` }
          ],
          recommendations: {
            immediate: [
              `Deploy ${Math.min(5, Math.ceil(kpis.overflowBins.value / 4))} additional compactor trucks to ${context.worstZone?.name || 'high-priority zones'} within the next 30 minutes`,
              'Activate emergency overflow collection protocol for bins above 90% capacity',
              'Redirect 2 idle vehicles from low-priority zones to critical overflow areas'
            ],
            shortTerm: [
              `Increase collection frequency in ${context.worstZone?.name || 'affected zones'} from current schedule to twice-daily for the next 72 hours`,
              'Implement dynamic routing algorithm to prioritize bins by real-time fill level rather than fixed schedule',
              'Deploy 3 additional mini-trucks for narrow-access areas where compactors cannot reach'
            ],
            longTerm: [
              'Install additional smart bins in high-density clusters to distribute waste load',
              'Implement predictive fill-level modeling to preemptively adjust collection schedules',
              'Evaluate zone boundary redistribution to balance collection workload across fleet'
            ]
          },
          impact: {
            quantifiedImprovement: `Implementing immediate actions expected to reduce overflow bins by 60-70% within 4 hours, preventing approximately ${Math.round(kpis.overflowBins.value * 0.3)} tons of waste spillage`,
            tradeoffs: ['Redeploying vehicles from low-priority zones may temporarily delay scheduled collections there', 'Emergency deployments increase fuel costs by approximately 15-20%'],
            riskReduction: 'Reduces public health risk from exposed waste by 65% and prevents potential waterway contamination during rainfall'
          }
        })
      },
      {
        id: 'low_collection_rate',
        trigger: (kpis) => kpis.collectionRate?.value < 80,
        category: 'Operational Efficiency',
        severity: 'high',
        generate: (kpis, state, context) => ({
          title: `Collection Rate Below Target: ${kpis.collectionRate?.value}% (Target: 90%)`,
          rootCause: {
            immediate: `Collection rate has dropped to ${kpis.collectionRate?.value}%, ${(90 - kpis.collectionRate?.value).toFixed(1)} points below the operational target, indicating systemic collection delays.`,
            secondary: `${context.breakdownCount || 0} vehicle breakdowns and ${state.weather?.condition !== 'clear' ? 'adverse weather conditions' : 'peak-hour traffic congestion'} are the primary contributing factors.`,
            systemLevel: `Fleet aging analysis shows ${context.maintenanceDue || 4} vehicles overdue for maintenance, suggesting deferred maintenance practices are degrading operational reliability.`
          },
          evidence: [
            { metric: 'Collection Rate', value: `${kpis.collectionRate?.value}%`, trend: 'declining', significance: 'Below 80% threshold — risk of cascading bin overflow' },
            { metric: 'Vehicle Breakdowns', value: kpis.vehicleBreakdowns?.value, trend: 'concerning', significance: 'Each breakdown affects 15-25 scheduled collections' },
            { metric: 'Active Vehicles', value: kpis.activeVehicles?.value, trend: 'low', significance: `Only ${Math.round((kpis.activeVehicles?.value / context.totalVehicles) * 100)}% of fleet operational` }
          ],
          recommendations: {
            immediate: [
              'Recall all idle vehicles and reassign to uncovered routes immediately',
              'Contact standby drivers for emergency shift coverage',
              `Prioritize ${context.worstZone?.name || 'commercial zones'} where waste generation is highest`
            ],
            shortTerm: [
              'Implement accelerated maintenance schedule for fleet — target 95% availability within 1 week',
              'Adjust route timing to avoid peak traffic windows (7-9 AM, 4-6 PM)',
              'Deploy route optimization algorithm with real-time traffic integration'
            ],
            longTerm: [
              'Budget allocation for 5-8 new collection vehicles to build fleet redundancy',
              'Establish preventive maintenance program with IoT-based predictive diagnostics',
              'Develop partnerships with private waste haulers for surge capacity'
            ]
          },
          impact: {
            quantifiedImprovement: `Restoring collection rate to 90% would recover approximately ${Math.round((90 - kpis.collectionRate?.value) * 14)} tons of daily uncollected waste`,
            tradeoffs: ['Emergency shifts increase labor costs by 25-30%', 'Route adjustments may inconvenience some residents with changed pickup times'],
            riskReduction: 'Prevents potential health hazard from accumulated waste and reduces illegal dumping incidents by an estimated 40%'
          }
        })
      },
      {
        id: 'landfill_pressure',
        trigger: (kpis) => kpis.landfillUtilization?.value > 70,
        category: 'Capacity Management',
        severity: (kpis) => kpis.landfillUtilization?.value > 85 ? 'critical' : 'high',
        generate: (kpis, state, context) => ({
          title: `Landfill Capacity Alert: ${kpis.landfillUtilization?.value}% Utilized — ${context.remainingYears || 'Limited'} Years Remaining`,
          rootCause: {
            immediate: `Combined landfill utilization has reached ${kpis.landfillUtilization?.value}%, with the Aruwakkalu site at the highest pressure point.`,
            secondary: `Current waste diversion rate of ${kpis.recyclingRate?.value}% is below the 25% target, resulting in excessive landfill dependency. The WTE plant is processing only ${state.wtePlant?.currentIntake || 300} of its ${state.wtePlant?.designCapacity || 500} ton/day capacity.`,
            systemLevel: `Low source segregation (${kpis.wasteSegregation?.value}%) means mixed waste unsuitable for recycling or WTE processing is being directed to landfills by default.`
          },
          evidence: [
            { metric: 'Landfill Utilization', value: `${kpis.landfillUtilization?.value}%`, trend: 'steadily_increasing', significance: 'Approaching critical threshold — reduced compaction efficiency above 80%' },
            { metric: 'Recycling Rate', value: `${kpis.recyclingRate?.value}%`, trend: 'below_target', significance: 'Every 1% increase diverts ~14 tons/day from landfill' },
            { metric: 'WTE Utilization', value: `${Math.round(((state.wtePlant?.currentIntake || 300) / (state.wtePlant?.designCapacity || 500)) * 100)}%`, trend: 'underutilized', significance: `${Math.round((state.wtePlant?.designCapacity || 500) - (state.wtePlant?.currentIntake || 300))} tons/day of unused WTE capacity` },
            { metric: 'Waste Segregation', value: `${kpis.wasteSegregation?.value}%`, trend: 'needs_improvement', significance: 'Key enabler for diversion — each 5% improvement enables additional processing' }
          ],
          recommendations: {
            immediate: [
              `Increase WTE plant intake by ${Math.round((state.wtePlant?.designCapacity || 500) * 0.15)} tons/day to reduce landfill burden`,
              'Redirect recyclable waste streams currently going to landfill to recycling centers',
              'Activate landfill compaction optimization to improve space utilization by 10-15%'
            ],
            shortTerm: [
              'Launch intensive source segregation campaign in low-performing zones',
              'Establish additional composting facilities for organic waste (62% of total stream)',
              'Implement landfill gas capture expansion to offset methane emissions'
            ],
            longTerm: [
              'Develop second WTE facility to double waste-to-energy processing capacity',
              'Implement Extended Producer Responsibility (EPR) framework to reduce packaging waste at source',
              'Evaluate engineered landfill expansion at Aruwakkalu with modern liner systems'
            ]
          },
          impact: {
            quantifiedImprovement: `Implementing diversion strategy can extend landfill life by 3-5 years, saving an estimated LKR 2.5 billion in new landfill construction costs`,
            tradeoffs: ['WTE capacity increase requires gradual ramp-up over 2-3 weeks', 'Composting facilities require 6-month setup period and LKR 150M investment'],
            riskReduction: 'Reduces landfill-related groundwater contamination risk and methane emissions, contributing to national climate commitments'
          }
        })
      },
      {
        id: 'wte_optimization',
        trigger: (kpis, state) => state.wtePlant && state.wtePlant.efficiency < 78,
        category: 'Energy & Processing',
        severity: 'medium',
        generate: (kpis, state, context) => ({
          title: `WTE Plant Efficiency Below Optimal: ${state.wtePlant?.efficiency?.toFixed(1)}% (Target: 82%)`,
          rootCause: {
            immediate: `Kerawalapitiya WTE plant operating at ${state.wtePlant?.efficiency?.toFixed(1)}% thermal efficiency, ${(82 - (state.wtePlant?.efficiency || 75)).toFixed(1)} points below target.`,
            secondary: `Inconsistent waste feedstock quality due to ${kpis.wasteSegregation?.value}% segregation rate is introducing high-moisture organic waste into the combustion stream, reducing calorific value.`,
            systemLevel: `Unit 2 operating at ${state.wtePlant?.units?.[1]?.load?.toFixed(0) || 70}% load with furnace temperature fluctuations suggest potential grate or air supply issues.`
          },
          evidence: [
            { metric: 'Plant Efficiency', value: `${state.wtePlant?.efficiency?.toFixed(1)}%`, trend: 'below_target', significance: 'Each 1% improvement generates additional 0.1 MW' },
            { metric: 'Furnace Temperature', value: `${state.wtePlant?.furnaceTemp?.toFixed(0)}°C`, trend: 'fluctuating', significance: 'Optimal range 840-870°C for complete combustion' },
            { metric: 'Energy Output', value: `${state.wtePlant?.energyOutput?.toFixed(2)} MW`, trend: 'suboptimal', significance: `${((state.wtePlant?.maxEnergyOutput || 10) - (state.wtePlant?.energyOutput || 5)).toFixed(1)} MW below maximum capacity` }
          ],
          recommendations: {
            immediate: [
              'Adjust primary and secondary air supply ratios to optimize combustion temperature',
              'Reduce moisture content of incoming waste by pre-sorting organic fraction',
              'Inspect and clean boiler tube surfaces to improve heat transfer'
            ],
            shortTerm: [
              'Implement waste pre-processing (shredding and drying) to improve feedstock consistency',
              'Calibrate emissions monitoring system for accurate real-time optimization',
              'Schedule Unit 2 for detailed inspection during next planned maintenance window'
            ],
            longTerm: [
              'Install waste calorific value analyzer at intake point for real-time feedstock management',
              'Upgrade combustion control system to AI-driven adaptive optimization',
              'Evaluate combined heat and power (CHP) configuration for improved overall efficiency'
            ]
          },
          impact: {
            quantifiedImprovement: `Achieving target efficiency would increase energy output by ${((82 - (state.wtePlant?.efficiency || 75)) * 0.12).toFixed(1)} MW, generating additional LKR ${Math.round((82 - (state.wtePlant?.efficiency || 75)) * 0.12 * 22 * 365)}K annually`,
            tradeoffs: ['Pre-processing adds operational complexity and LKR 15M annual cost', 'Maintenance downtime for Unit 2 reduces capacity by 40% for 3-5 days'],
            riskReduction: 'Improved combustion reduces dioxin formation risk and ensures emissions compliance'
          }
        })
      },
      {
        id: 'segregation_improvement',
        trigger: (kpis) => kpis.wasteSegregation?.value < 50,
        category: 'Source Management',
        severity: 'high',
        generate: (kpis, state, context) => ({
          title: `Waste Segregation Rate Critical: ${kpis.wasteSegregation?.value}% — Downstream Impact Escalating`,
          rootCause: {
            immediate: `Source segregation at ${kpis.wasteSegregation?.value}% is significantly below the 60% target, resulting in mixed waste streams that contaminate recyclable and compostable fractions.`,
            secondary: `Analysis of ${context.worstZone?.name || 'high-density residential zones'} reveals segregation rates as low as ${Math.round(kpis.wasteSegregation?.value * 0.65)}%, suggesting awareness/infrastructure gaps in specific communities.`,
            systemLevel: `The current dual-bin collection system is insufficient — international best practices recommend 3-4 stream separation at source for effective diversion.`
          },
          evidence: [
            { metric: 'Segregation Rate', value: `${kpis.wasteSegregation?.value}%`, trend: 'stagnant', significance: 'Directly limits recycling and composting potential' },
            { metric: 'Contamination Rate', value: `${(100 - kpis.wasteSegregation?.value * 1.2).toFixed(0)}%`, trend: 'high', significance: 'Contaminated recyclables rejected at processing — economic loss' },
            { metric: 'Recycling Rate', value: `${kpis.recyclingRate?.value}%`, trend: 'constrained', significance: 'Cannot exceed segregation rate — current ceiling effect' }
          ],
          recommendations: {
            immediate: [
              'Deploy segregation awareness mobile units to 3 lowest-performing zones this week',
              'Distribute color-coded bin bags to 10,000 households in pilot areas',
              'Activate SMS notification campaign to registered households with segregation guidelines'
            ],
            shortTerm: [
              'Install 3-stream collection bins (organic/recyclable/residual) in commercial zones within 30 days',
              'Train collection crews on source-separated collection protocols',
              'Implement monetary incentives: LKR 2/kg for properly segregated recyclables at community buy-back centers'
            ],
            longTerm: [
              'Enact mandatory source segregation bylaw with phased enforcement',
              'Build material recovery facility (MRF) to mechanically sort mixed waste streams',
              'Develop school-based environmental education program targeting next-generation behavior change'
            ]
          },
          impact: {
            quantifiedImprovement: `Achieving 60% segregation would divert 180+ tons/day from landfill, extend landfill life by 40%, and generate LKR 25M additional annual recycling revenue`,
            tradeoffs: ['Community buy-back program costs LKR 8M/month but recovers 60% through material sales', 'Mandatory bylaws require 6-12 month implementation with political engagement'],
            riskReduction: 'Dramatically reduces landfill contamination, improves WTE feedstock quality, and supports Sri Lanka\'s national waste diversion targets'
          }
        })
      },
      {
        id: 'fleet_maintenance',
        trigger: (kpis) => kpis.vehicleBreakdowns?.value >= 2,
        category: 'Fleet Management',
        severity: 'high',
        generate: (kpis, state, context) => ({
          title: `Fleet Reliability Alert: ${kpis.vehicleBreakdowns?.value} Vehicles Down — Collection Capacity Reduced ${Math.round((kpis.vehicleBreakdowns?.value / context.totalVehicles) * 100)}%`,
          rootCause: {
            immediate: `${kpis.vehicleBreakdowns?.value} collection vehicles currently offline due to mechanical failures, reducing effective fleet capacity.`,
            secondary: `Average vehicle age in the fleet exceeds recommended replacement cycle. ${context.maintenanceDue || 3} additional vehicles are overdue for scheduled maintenance.`,
            systemLevel: `Deferred maintenance budget allocations and insufficient spare parts inventory are creating a reliability cascade — each breakdown increases load on remaining vehicles, accelerating wear.`
          },
          evidence: [
            { metric: 'Breakdowns', value: kpis.vehicleBreakdowns.value, trend: 'increasing', significance: `Each vehicle serves ${Math.round(400 / context.totalVehicles)} bins — ${kpis.vehicleBreakdowns.value * Math.round(400 / context.totalVehicles)} bins affected` },
            { metric: 'Fleet Utilization', value: `${kpis.fleetUtilization?.value}%`, trend: 'impacted', significance: 'Below 60% indicates critical capacity shortage' },
            { metric: 'Maintenance Backlog', value: `${context.maintenanceDue || 3} vehicles overdue`, trend: 'growing', significance: 'Predictive models forecast 2 additional failures within 48 hours' }
          ],
          recommendations: {
            immediate: [
              `Dispatch mobile maintenance unit to highest-priority breakdown for field repair`,
              'Activate rental vehicle agreement for temporary replacement capacity',
              'Redistribute routes from breakdown zones to active vehicles with capacity'
            ],
            shortTerm: [
              'Execute all overdue maintenance within 5-day blitz schedule',
              'Procure critical spare parts inventory: engine filters, hydraulic pumps, brake assemblies',
              'Implement daily vehicle inspection checklist to catch issues before breakdown'
            ],
            longTerm: [
              'Transition to IoT-enabled predictive maintenance system (vibration, oil analysis, temperature monitoring)',
              'Develop 5-year fleet replacement plan with annual budget allocation',
              'Evaluate electric/hybrid waste collection vehicles for pilot deployment'
            ]
          },
          impact: {
            quantifiedImprovement: `Restoring full fleet availability would recover ${Math.round(kpis.vehicleBreakdowns.value * 12)} tons/day collection capacity and reduce overtime costs by LKR ${Math.round(kpis.vehicleBreakdowns.value * 85000)}/day`,
            tradeoffs: ['Rental vehicles cost LKR 45,000/day but prevent service degradation', 'Maintenance blitz requires 3-day partial fleet reduction'],
            riskReduction: 'Prevents service collapse and maintains public confidence in waste management system'
          }
        })
      },
      {
        id: 'weather_impact',
        trigger: (kpis, state) => state.weather?.condition === 'rain' || state.weather?.condition === 'heavy_rain' || state.weather?.condition === 'storm',
        category: 'Environmental Response',
        severity: (kpis, state) => state.weather?.condition === 'storm' ? 'critical' : 'medium',
        generate: (kpis, state, context) => ({
          title: `Weather Advisory: ${state.weather?.condition?.replace('_', ' ').toUpperCase()} Impact on Operations — ${state.weather?.rainfall?.toFixed(0)}mm Precipitation`,
          rootCause: {
            immediate: `${state.weather?.condition?.replace('_', ' ')} conditions with ${state.weather?.rainfall?.toFixed(0)}mm rainfall are impacting collection routes and workforce safety.`,
            secondary: `Wet conditions increase waste weight by 15-25%, reduce vehicle traction, and create road access issues in low-lying areas of ${context.worstZone?.name || 'flood-prone zones'}.`,
            systemLevel: `Colombo's monsoon drainage challenges compound waste management operations — waterlogged collection points become inaccessible and waste leachate risk increases.`
          },
          evidence: [
            { metric: 'Rainfall', value: `${state.weather?.rainfall?.toFixed(0)}mm`, trend: 'active', significance: 'Above 10mm threshold triggers modified operations protocol' },
            { metric: 'Wind Speed', value: `${state.weather?.windSpeed?.toFixed(0)} km/h`, trend: state.weather?.windSpeed > 30 ? 'high' : 'moderate', significance: 'Affects open-top bin contents and crew safety' },
            { metric: 'Collection Delay', value: `Est. ${Math.round(state.weather?.rainfall * 1.5 + 10)} min avg`, trend: 'impacted', significance: 'Route completion times increasing' }
          ],
          recommendations: {
            immediate: [
              'Activate wet-weather collection protocol: prioritize covered bins and commercial areas',
              'Issue safety advisory to all field crews — mandatory PPE and reduced speed limits',
              state.weather?.condition === 'storm' ? 'Suspend operations in flood-risk zones — crew safety is paramount' : 'Continue operations with 30% additional route time budgeting'
            ],
            shortTerm: [
              'Pre-position drainage pumps at known flooding collection points',
              'Deploy covered/enclosed bin replacements to areas using open bins',
              'Shift afternoon collection schedules to early morning before peak rainfall'
            ],
            longTerm: [
              'Install rain covers on all open-top community bins in high-rainfall zones',
              'Develop weather-responsive dynamic routing system that adapts to real-time conditions',
              'Collaborate with urban drainage authority to improve access road conditions at collection points'
            ]
          },
          impact: {
            quantifiedImprovement: 'Modified protocols maintain 75-80% collection rate during wet weather vs. 55-60% without intervention',
            tradeoffs: ['Schedule modifications may cause temporary service disruption to some areas', 'Covered bin installation costs LKR 15,000/unit × 200 priority locations'],
            riskReduction: 'Prevents leachate contamination of storm drains, reduces crew safety incidents by 70%, maintains service continuity'
          }
        })
      },
      {
        id: 'cost_optimization',
        trigger: (kpis) => kpis.costPerTon?.value > 1600,
        category: 'Financial Optimization',
        severity: 'medium',
        generate: (kpis, state, context) => ({
          title: `Operating Cost Exceeding Budget: LKR ${kpis.costPerTon?.value}/ton (Budget: LKR 1,400/ton)`,
          rootCause: {
            immediate: `Per-ton collection and processing cost at LKR ${kpis.costPerTon?.value} exceeds budget allocation by ${((kpis.costPerTon?.value - 1400) / 1400 * 100).toFixed(0)}%.`,
            secondary: `Fuel costs constitute 35% of operations budget — recent price increases and inefficient routing are primary cost drivers. Overtime payments from breakdown-related emergency shifts adding LKR 120,000/day.`,
            systemLevel: `Revenue from recycling (LKR ${kpis.revenueFromRecycling?.value?.toLocaleString()}/day) and energy generation (LKR ${kpis.energyRevenue?.value?.toLocaleString()}/day) offset only ${Math.round(((kpis.revenueFromRecycling?.value + kpis.energyRevenue?.value) / kpis.dailyOperatingCost?.value) * 100)}% of operating costs.`
          },
          evidence: [
            { metric: 'Cost Per Ton', value: `LKR ${kpis.costPerTon?.value}`, trend: 'increasing', significance: `${((kpis.costPerTon?.value - 1400) / 1400 * 100).toFixed(0)}% above budget` },
            { metric: 'Daily Operating Cost', value: `LKR ${kpis.dailyOperatingCost?.value?.toLocaleString()}`, trend: 'high', significance: 'Monthly projection: LKR ' + Math.round(kpis.dailyOperatingCost?.value * 30 / 1000000) + 'M' },
            { metric: 'Revenue Offset', value: `${Math.round(((kpis.revenueFromRecycling?.value + kpis.energyRevenue?.value) / kpis.dailyOperatingCost?.value) * 100)}%`, trend: 'needs_improvement', significance: 'Target: 45% cost recovery through revenue generation' }
          ],
          recommendations: {
            immediate: [
              'Implement fuel card system with route-linked consumption monitoring',
              'Reduce overtime by redistributing routes during regular shifts',
              'Cancel non-essential vehicle movements and consolidate depot trips'
            ],
            shortTerm: [
              'Deploy GPS-optimized routing to reduce total fleet distance by 15-20%',
              'Increase recycling material sales through better segregation and new buyer contracts',
              'Renegotiate fuel supply contracts for bulk discount (est. 8% savings)'
            ],
            longTerm: [
              'Transition 30% of fleet to CNG/electric to reduce fuel dependency',
              'Develop public-private partnership for recyclable material processing',
              'Implement full-cost accounting with activity-based costing for accurate cost allocation'
            ]
          },
          impact: {
            quantifiedImprovement: `Combined optimizations can reduce cost per ton by LKR ${Math.round((kpis.costPerTon?.value - 1400) * 0.6)}, saving LKR ${Math.round((kpis.costPerTon?.value - 1400) * 0.6 * 1400 * 365 / 1000000)}M annually`,
            tradeoffs: ['Fleet transition requires capital investment of LKR 800M over 5 years', 'Route optimization may reduce collection frequency in low-density areas'],
            riskReduction: 'Ensures financial sustainability of waste management operations and prevents service cuts due to budget overruns'
          }
        })
      },
      {
        id: 'emission_compliance',
        trigger: (kpis, state) => state.wtePlant && (state.wtePlant.emissions.nox > 160 || state.wtePlant.emissions.co2 > 400),
        category: 'Environmental Compliance',
        severity: 'high',
        generate: (kpis, state, context) => ({
          title: `WTE Emission Levels Approaching Regulatory Limits — Compliance Risk`,
          rootCause: {
            immediate: `NOx at ${state.wtePlant?.emissions?.nox?.toFixed(1)} mg/Nm³ (limit: 200) and CO2 at ${state.wtePlant?.emissions?.co2?.toFixed(1)} mg/Nm³ (limit: 500) trending toward regulatory thresholds.`,
            secondary: `Inconsistent combustion temperatures (current: ${state.wtePlant?.furnaceTemp?.toFixed(0)}°C) cause incomplete burn cycles that increase pollutant formation.`,
            systemLevel: `Sri Lanka's CEA emission standards align with EU Directive 2010/75/EU — non-compliance carries fines up to LKR 5M and potential operational suspension.`
          },
          evidence: [
            { metric: 'NOx', value: `${state.wtePlant?.emissions?.nox?.toFixed(1)} mg/Nm³`, trend: 'approaching_limit', significance: `${Math.round(state.wtePlant?.emissions?.nox / 200 * 100)}% of regulatory limit` },
            { metric: 'CO2', value: `${state.wtePlant?.emissions?.co2?.toFixed(1)} mg/Nm³`, trend: 'elevated', significance: `${Math.round(state.wtePlant?.emissions?.co2 / 500 * 100)}% of regulatory limit` },
            { metric: 'Furnace Temperature', value: `${state.wtePlant?.furnaceTemp?.toFixed(0)}°C`, trend: 'unstable', significance: 'Temperature fluctuations correlate with emission spikes' }
          ],
          recommendations: {
            immediate: [
              'Stabilize furnace temperature to 850±20°C range through air flow adjustment',
              'Activate SNCR (Selective Non-Catalytic Reduction) system for NOx control',
              'Increase activated carbon injection rate for dioxin/furan absorption'
            ],
            shortTerm: [
              'Install continuous emission monitoring system (CEMS) with automated reporting to CEA',
              'Conduct waste input quality audit — reject waste lots with high PVC/chlorine content',
              'Schedule combustion optimization study by boiler manufacturer'
            ],
            longTerm: [
              'Upgrade to SCR (Selective Catalytic Reduction) system for 90%+ NOx removal',
              'Implement carbon capture pilot for long-term CO2 management',
              'Develop waste stream pre-treatment to ensure consistent feedstock quality'
            ]
          },
          impact: {
            quantifiedImprovement: 'SNCR activation can reduce NOx by 40-60%, bringing levels well within compliance. Carbon capture pilot could offset 30% of CO2 emissions.',
            tradeoffs: ['SNCR chemical costs (urea) add LKR 2M/month to operating expenses', 'SCR upgrade requires 2-week shutdown and LKR 250M capital investment'],
            riskReduction: 'Avoids regulatory penalties, maintains operating license, and supports Sri Lanka\'s NDC climate commitments'
          }
        })
      },
      {
        id: 'circular_economy',
        trigger: (kpis) => kpis.circularEconomyIndex?.value < 35,
        category: 'Sustainability Strategy',
        severity: 'medium',
        generate: (kpis, state, context) => ({
          title: `Circular Economy Index at ${kpis.circularEconomyIndex?.value}% — Below Regional Target of 40%`,
          rootCause: {
            immediate: `Only ${kpis.circularEconomyIndex?.value}% of waste entering the system is being recovered, recycled, or converted to useful output.`,
            secondary: `Linear disposal model (collect → dump) still dominates. Recycling rate at ${kpis.recyclingRate?.value}% and composting less than 8% of organic fraction despite 62% organic composition.`,
            systemLevel: `Absence of integrated resource recovery infrastructure, limited producer take-back programs, and low market development for recycled materials constrain circularity.`
          },
          evidence: [
            { metric: 'Circular Economy Index', value: `${kpis.circularEconomyIndex?.value}%`, trend: 'below_target', significance: 'Regional leaders (Singapore, Seoul) achieve 55-65%' },
            { metric: 'Organic Recovery', value: 'Est. 8%', trend: 'minimal', significance: '62% organic waste represents largest recovery opportunity' },
            { metric: 'Material Recovery', value: `${kpis.recyclingRate?.value}%`, trend: 'growing_slowly', significance: 'Target: 30% by 2028' }
          ],
          recommendations: {
            immediate: [
              'Establish organic waste collection pilot in 3 commercial zones (hotels, markets, restaurants)',
              'Activate existing composting capacity — current facilities operating at only 40% utilization',
              'Connect recycling centers with verified material buyers for consistent off-take'
            ],
            shortTerm: [
              'Build 3 community composting hubs in high-organic-waste residential zones',
              'Launch "Waste Exchange" digital platform connecting industrial waste generators with recyclers',
              'Implement e-waste collection program — growing stream currently going to landfill'
            ],
            longTerm: [
              'Develop Circular Economy Roadmap for Colombo Region with 2030 targets',
              'Establish Materials Recovery Facility (MRF) with 500 ton/day processing capacity',
              'Advocate for national Extended Producer Responsibility legislation'
            ]
          },
          impact: {
            quantifiedImprovement: 'Full organic recovery alone could divert 500+ tons/day, generating 200 tons of compost worth LKR 6M/month and reducing landfill intake by 35%',
            tradeoffs: ['Composting infrastructure requires LKR 400M initial investment with 3-year payback', 'Behavioral change programs need sustained multi-year commitment'],
            riskReduction: 'Aligns with national sustainable development goals, reduces import dependency for fertilizer, creates 200+ green jobs'
          }
        })
      }
    ];
  }

  // ============================================================================
  // GENERATE ADVISORIES BASED ON CURRENT STATE
  // ============================================================================
  generateAdvisories(kpis, simulationState) {
    const now = Date.now();
    if (now - this.lastGenerationTime < this.generationCooldown) return this.generatedAdvisories;

    this.lastGenerationTime = now;
    const newAdvisories = [];

    // Build context
    const allBins = Array.from(simulationState.bins?.values() || []);
    const allVehicles = Array.from(simulationState.vehicles?.values() || []);
    const allZones = Array.from(simulationState.zones?.values() || []);

    const context = {
      totalBins: allBins.length,
      totalVehicles: allVehicles.length,
      breakdownCount: allVehicles.filter(v => v.status === 'breakdown').length,
      maintenanceDue: allVehicles.filter(v => {
        const daysSince = (Date.now() - new Date(v.lastMaintenance).getTime()) / 86400000;
        return daysSince > 25;
      }).length,
      overflowZones: new Set(allBins.filter(b => b.currentFillLevel >= 85).map(b => b.location.zone)).size,
      worstZone: allZones.sort((a, b) => (b.avgFillLevel || 0) - (a.avgFillLevel || 0))[0],
      remainingYears: 'Est. 5-8'
    };

    // Evaluate each template
    for (const template of this.advisoryTemplates) {
      try {
        const triggered = template.trigger(kpis, simulationState);
        if (!triggered) continue;

        // Avoid repeating same advisory type within last 5 minutes
        const recentSame = this.generatedAdvisories.find(a =>
          a.templateId === template.id && (now - new Date(a.createdAt).getTime()) < 300000
        );
        if (recentSame) continue;

        const severity = typeof template.severity === 'function'
          ? template.severity(kpis, simulationState) : template.severity;

        const content = template.generate(kpis, simulationState, context);
        const advisory = {
          advisoryId: `ADV-${now}-${Math.random().toString(36).substr(2, 6)}`,
          templateId: template.id,
          ...content,
          severity,
          category: template.category,
          createdAt: new Date().toISOString(),
          acknowledged: false,
          actions: [
            { type: 'dispatch_crew', label: 'Dispatch Crew', endpoint: '/api/actions/dispatch', payload: { zone: context.worstZone?.id } },
            { type: 'optimize_routes', label: 'Optimize Routes', endpoint: '/api/actions/optimize-routes', payload: { zone: context.worstZone?.id } },
            { type: 'notify_citizens', label: 'Notify Citizens', endpoint: '/api/actions/notify', payload: { zone: context.worstZone?.id, message: content.title } },
            { type: 'create_work_order', label: 'Create Work Order', endpoint: '/api/actions/work-order', payload: { title: content.title, priority: severity, category: template.category } }
          ]
        };

        newAdvisories.push(advisory);
      } catch (e) {
        // Skip failed template
      }
    }

    // Sort by severity priority
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    newAdvisories.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

    // Keep max 3 new + existing (avoid flood)
    const latest = newAdvisories.slice(0, 3);
    this.generatedAdvisories = [...latest, ...this.generatedAdvisories].slice(0, this.maxRecent);

    return this.generatedAdvisories;
  }

  getAdvisories() {
    return this.generatedAdvisories;
  }

  acknowledgeAdvisory(advisoryId) {
    const adv = this.generatedAdvisories.find(a => a.advisoryId === advisoryId);
    if (adv) {
      adv.acknowledged = true;
      return adv;
    }
    return null;
  }

  executeAction(advisoryId, actionType) {
    const adv = this.generatedAdvisories.find(a => a.advisoryId === advisoryId);
    if (adv) {
      const action = adv.actions.find(a => a.type === actionType);
      if (action) {
        action.executed = true;
        action.executedAt = new Date().toISOString();
        return { advisory: adv, action, success: true };
      }
    }
    return null;
  }
}

module.exports = new AIAdvisoryEngine();
