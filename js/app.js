/* ============================================================
   Subsidence Sentinel — app.js
   Houston-Galveston Ground Sinking & Sea Level Rise

   REAL DATA SOURCES:
   ─ NOAA CO-OPS API station 8771450 (Galveston Pier 21)
     372 monthly mean sea level values 1990–2020, fetched live
   ─ NOAA 2022 Sea Level Rise Technical Report: Galveston projections
   ─ Nature Scientific Reports PMC7578811 & PMC12271985
     Subsidence rates from GPS benchmarks & InSAR
   ─ University of Houston InSAR study (2022)
   ─ FEMA National Flood Hazard Layer (NFHL) REST API
     250 real flood zone polygons, Harris + Galveston counties
     Queried: hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28
   ─ OpenStreetMap Overpass API (2026-03-13T18:42:12Z)
     468 infrastructure features: hospitals, fire stations,
     power plants, airports, wastewater plants, ports, refineries

   APPROXIMATED (no queryable vector API exists):
   ─ Subsidence zone boundaries: research-derived, ~5–20 km accuracy
     (USGS/HGSD publish raster-only; no vector API)
   ─ SLR inundation zones: SRTM-elevation-derived approximations
     (NOAA SLR service is raster tile cache; no vector query endpoint)
   ============================================================ */

'use strict';

/* ── Real NOAA data: Galveston Pier 21 monthly MSL (1990–2020)
      Station 8771450  |  lat 29.31  lon -94.7933
      Source: NOAA CO-OPS API, datum MSL, units: meters     ── */
const NOAA_MONTHLY = [
  {y:1990,m:1,v:-0.229},{y:1990,m:2,v:-0.116},{y:1990,m:3,v:0.021},{y:1990,m:4,v:0.067},
  {y:1990,m:5,v:0.159},{y:1990,m:6,v:-0.015},{y:1990,m:7,v:-0.049},{y:1990,m:8,v:-0.030},
  {y:1990,m:9,v:0.027},{y:1990,m:10,v:0.046},{y:1990,m:11,v:0.098},{y:1990,m:12,v:-0.067},
  {y:1991,m:1,v:-0.012},{y:1991,m:2,v:-0.122},{y:1991,m:3,v:-0.046},{y:1991,m:4,v:0.125},
  {y:1991,m:5,v:0.223},{y:1991,m:6,v:0.052},{y:1991,m:7,v:-0.101},{y:1991,m:8,v:-0.088},
  {y:1991,m:9,v:0.131},{y:1991,m:10,v:0.110},{y:1991,m:11,v:0.012},{y:1991,m:12,v:0.009},
  {y:1992,m:1,v:-0.034},{y:1992,m:2,v:-0.049},{y:1992,m:3,v:-0.076},{y:1992,m:4,v:0.000},
  {y:1992,m:5,v:-0.037},{y:1992,m:6,v:-0.067},{y:1992,m:7,v:-0.101},{y:1992,m:8,v:-0.034},
  {y:1992,m:9,v:0.125},{y:1992,m:10,v:0.146},{y:1992,m:11,v:0.009},{y:1992,m:12,v:-0.012},
  {y:1993,m:1,v:0.003},{y:1993,m:2,v:-0.027},{y:1993,m:3,v:-0.116},{y:1993,m:4,v:-0.043},
  {y:1993,m:5,v:0.052},{y:1993,m:6,v:0.088},{y:1993,m:7,v:-0.113},{y:1993,m:8,v:-0.113},
  {y:1993,m:9,v:0.034},{y:1993,m:10,v:0.076},{y:1993,m:11,v:-0.018},{y:1993,m:12,v:-0.103},
  {y:1994,m:1,v:-0.150},{y:1994,m:2,v:-0.103},{y:1994,m:3,v:-0.086},{y:1994,m:4,v:0.071},
  {y:1994,m:5,v:0.001},{y:1994,m:6,v:-0.060},{y:1994,m:7,v:-0.111},{y:1994,m:8,v:0.010},
  {y:1994,m:9,v:0.092},{y:1994,m:10,v:0.182},{y:1994,m:11,v:0.062},{y:1994,m:12,v:-0.031},
  {y:1995,m:1,v:-0.215},{y:1995,m:2,v:-0.240},{y:1995,m:3,v:-0.002},{y:1995,m:4,v:0.107},
  {y:1995,m:5,v:0.076},{y:1995,m:6,v:0.010},{y:1995,m:7,v:-0.057},{y:1995,m:8,v:0.144},
  {y:1995,m:9,v:0.207},{y:1995,m:10,v:0.218},{y:1995,m:11,v:0.000},{y:1995,m:12,v:-0.114},
  {y:1996,m:1,v:-0.230},{y:1996,m:2,v:-0.209},{y:1996,m:3,v:-0.178},{y:1996,m:4,v:-0.106},
  {y:1996,m:5,v:-0.046},{y:1996,m:6,v:-0.120},{y:1996,m:7,v:-0.127},{y:1996,m:8,v:-0.022},
  {y:1996,m:9,v:0.004},{y:1996,m:10,v:0.282},{y:1996,m:11,v:0.116},{y:1996,m:12,v:-0.057},
  {y:1997,m:1,v:-0.057},{y:1997,m:2,v:-0.004},{y:1997,m:3,v:0.023},{y:1997,m:4,v:0.125},
  {y:1997,m:5,v:0.034},{y:1997,m:6,v:-0.015},{y:1997,m:7,v:-0.096},{y:1997,m:8,v:-0.047},
  {y:1997,m:9,v:0.082},{y:1997,m:10,v:0.133},{y:1997,m:11,v:-0.077},{y:1997,m:12,v:-0.237},
  {y:1998,m:1,v:-0.120},{y:1998,m:2,v:-0.036},{y:1998,m:3,v:-0.044},{y:1998,m:4,v:0.038},
  {y:1998,m:5,v:0.047},{y:1998,m:6,v:0.022},{y:1998,m:7,v:-0.129},{y:1998,m:8,v:0.023},
  {y:1998,m:9,v:0.388},{y:1998,m:10,v:0.230},{y:1998,m:11,v:0.076},{y:1998,m:12,v:-0.071},
  {y:1999,m:1,v:-0.094},{y:1999,m:2,v:-0.031},{y:1999,m:3,v:0.006},{y:1999,m:4,v:0.026},
  {y:1999,m:5,v:0.083},{y:1999,m:6,v:0.037},{y:1999,m:7,v:-0.007},{y:1999,m:8,v:-0.078},
  {y:1999,m:9,v:0.097},{y:1999,m:10,v:0.114},{y:1999,m:11,v:-0.020},{y:1999,m:12,v:-0.114},
  {y:2000,m:1,v:-0.155},{y:2000,m:2,v:-0.134},{y:2000,m:3,v:-0.045},{y:2000,m:4,v:-0.040},
  {y:2000,m:5,v:0.062},{y:2000,m:6,v:0.019},{y:2000,m:7,v:-0.093},{y:2000,m:8,v:-0.072},
  {y:2000,m:9,v:0.051},{y:2000,m:10,v:0.121},{y:2000,m:11,v:0.053},{y:2000,m:12,v:-0.151},
  {y:2001,m:1,v:-0.210},{y:2001,m:2,v:-0.135},{y:2001,m:3,v:-0.084},{y:2001,m:4,v:0.073},
  {y:2001,m:5,v:0.026},{y:2001,m:6,v:0.009},{y:2001,m:7,v:-0.043},{y:2001,m:8,v:0.019},
  {y:2001,m:9,v:0.121},{y:2001,m:10,v:0.188},{y:2001,m:11,v:0.106},{y:2001,m:12,v:-0.017},
  {y:2002,m:1,v:-0.147},{y:2002,m:2,v:-0.122},{y:2002,m:3,v:0.007},{y:2002,m:4,v:0.068},
  {y:2002,m:5,v:0.124},{y:2002,m:6,v:0.117},{y:2002,m:7,v:-0.008},{y:2002,m:8,v:0.104},
  {y:2002,m:9,v:0.314},{y:2002,m:10,v:0.205},{y:2002,m:11,v:-0.003},{y:2002,m:12,v:-0.116},
  {y:2003,m:1,v:-0.189},{y:2003,m:2,v:-0.083},{y:2003,m:3,v:0.003},{y:2003,m:4,v:-0.029},
  {y:2003,m:5,v:0.024},{y:2003,m:6,v:-0.011},{y:2003,m:7,v:0.040},{y:2003,m:8,v:0.008},
  {y:2003,m:9,v:0.225},{y:2003,m:10,v:0.198},{y:2003,m:11,v:0.104},{y:2003,m:12,v:-0.062},
  {y:2004,m:1,v:-0.046},{y:2004,m:2,v:-0.029},{y:2004,m:3,v:0.022},{y:2004,m:4,v:-0.031},
  {y:2004,m:5,v:0.122},{y:2004,m:6,v:0.070},{y:2004,m:7,v:-0.028},{y:2004,m:8,v:0.001},
  {y:2004,m:9,v:0.169},{y:2004,m:10,v:0.097},{y:2004,m:11,v:0.120},{y:2004,m:12,v:-0.071},
  {y:2005,m:1,v:0.011},{y:2005,m:2,v:0.117},{y:2005,m:3,v:-0.057},{y:2005,m:4,v:-0.058},
  {y:2005,m:5,v:0.024},{y:2005,m:6,v:0.101},{y:2005,m:7,v:0.042},{y:2005,m:8,v:0.004},
  {y:2005,m:9,v:0.193},{y:2005,m:10,v:0.135},{y:2005,m:11,v:-0.074},{y:2005,m:12,v:-0.137},
  {y:2006,m:1,v:-0.245},{y:2006,m:2,v:-0.157},{y:2006,m:3,v:-0.021},{y:2006,m:4,v:-0.039},
  {y:2006,m:5,v:-0.043},{y:2006,m:6,v:-0.050},{y:2006,m:7,v:-0.050},{y:2006,m:8,v:-0.031},
  {y:2006,m:9,v:0.066},{y:2006,m:10,v:0.146},{y:2006,m:11,v:-0.013},{y:2006,m:12,v:-0.104},
  {y:2007,m:1,v:-0.048},{y:2007,m:2,v:-0.122},{y:2007,m:3,v:-0.022},{y:2007,m:4,v:0.067},
  {y:2007,m:5,v:0.171},{y:2007,m:6,v:0.090},{y:2007,m:7,v:0.032},{y:2007,m:8,v:0.098},
  {y:2007,m:9,v:0.189},{y:2007,m:10,v:0.225},{y:2007,m:11,v:0.045},{y:2007,m:12,v:-0.078},
  {y:2008,m:1,v:-0.005},{y:2008,m:2,v:-0.076},{y:2008,m:3,v:-0.077},{y:2008,m:4,v:0.047},
  {y:2008,m:5,v:0.114},{y:2008,m:6,v:0.070},{y:2008,m:7,v:0.056},{y:2008,m:8,v:-0.058},
  {y:2008,m:9,v:null},{y:2008,m:10,v:0.203},{y:2008,m:11,v:0.051},{y:2008,m:12,v:-0.094},
  {y:2009,m:1,v:-0.187},{y:2009,m:2,v:-0.079},{y:2009,m:3,v:-0.035},{y:2009,m:4,v:-0.009},
  {y:2009,m:5,v:0.099},{y:2009,m:6,v:0.067},{y:2009,m:7,v:0.026},{y:2009,m:8,v:0.124},
  {y:2009,m:9,v:0.252},{y:2009,m:10,v:0.266},{y:2009,m:11,v:0.221},{y:2009,m:12,v:0.101},
  {y:2010,m:1,v:-0.046},{y:2010,m:2,v:-0.011},{y:2010,m:3,v:-0.132},{y:2010,m:4,v:0.053},
  {y:2010,m:5,v:0.112},{y:2010,m:6,v:0.124},{y:2010,m:7,v:0.246},{y:2010,m:8,v:0.106},
  {y:2010,m:9,v:0.329},{y:2010,m:10,v:0.090},{y:2010,m:11,v:0.065},{y:2010,m:12,v:-0.103},
  {y:2011,m:1,v:-0.131},{y:2011,m:2,v:-0.177},{y:2011,m:3,v:-0.013},{y:2011,m:4,v:0.061},
  {y:2011,m:5,v:0.110},{y:2011,m:6,v:0.067},{y:2011,m:7,v:0.035},{y:2011,m:8,v:-0.007},
  {y:2011,m:9,v:0.040},{y:2011,m:10,v:0.107},{y:2011,m:11,v:0.060},{y:2011,m:12,v:0.052},
  {y:2012,m:1,v:-0.089},{y:2012,m:2,v:0.030},{y:2012,m:3,v:0.100},{y:2012,m:4,v:0.137},
  {y:2012,m:5,v:0.099},{y:2012,m:6,v:0.199},{y:2012,m:7,v:0.097},{y:2012,m:8,v:0.086},
  {y:2012,m:9,v:0.159},{y:2012,m:10,v:0.111},{y:2012,m:11,v:0.096},{y:2012,m:12,v:-0.021},
  {y:2013,m:1,v:-0.036},{y:2013,m:2,v:-0.001},{y:2013,m:3,v:-0.023},{y:2013,m:4,v:0.124},
  {y:2013,m:5,v:0.095},{y:2013,m:6,v:0.041},{y:2013,m:7,v:0.083},{y:2013,m:8,v:0.098},
  {y:2013,m:9,v:0.241},{y:2013,m:10,v:0.240},{y:2013,m:11,v:0.210},{y:2013,m:12,v:0.004},
  {y:2014,m:1,v:-0.093},{y:2014,m:2,v:-0.045},{y:2014,m:3,v:-0.001},{y:2014,m:4,v:0.068},
  {y:2014,m:5,v:0.107},{y:2014,m:6,v:0.143},{y:2014,m:7,v:-0.008},{y:2014,m:8,v:0.075},
  {y:2014,m:9,v:0.263},{y:2014,m:10,v:0.167},{y:2014,m:11,v:0.099},{y:2014,m:12,v:0.079},
  {y:2015,m:1,v:-0.047},{y:2015,m:2,v:-0.006},{y:2015,m:3,v:-0.027},{y:2015,m:4,v:0.117},
  {y:2015,m:5,v:0.237},{y:2015,m:6,v:0.152},{y:2015,m:7,v:0.055},{y:2015,m:8,v:0.124},
  {y:2015,m:9,v:0.259},{y:2015,m:10,v:0.333},{y:2015,m:11,v:0.347},{y:2015,m:12,v:0.238},
  {y:2016,m:1,v:0.127},{y:2016,m:2,v:-0.005},{y:2016,m:3,v:0.175},{y:2016,m:4,v:0.305},
  {y:2016,m:5,v:0.305},{y:2016,m:6,v:0.228},{y:2016,m:7,v:0.145},{y:2016,m:8,v:0.236},
  {y:2016,m:9,v:0.356},{y:2016,m:10,v:0.364},{y:2016,m:11,v:0.324},{y:2016,m:12,v:0.201},
  {y:2017,m:1,v:0.069},{y:2017,m:2,v:0.060},{y:2017,m:3,v:0.156},{y:2017,m:4,v:0.220},
  {y:2017,m:5,v:0.164},{y:2017,m:6,v:0.279},{y:2017,m:7,v:0.106},{y:2017,m:8,v:0.260},
  {y:2017,m:9,v:0.290},{y:2017,m:10,v:0.409},{y:2017,m:11,v:0.227},{y:2017,m:12,v:0.071},
  {y:2018,m:1,v:-0.070},{y:2018,m:2,v:0.097},{y:2018,m:3,v:0.151},{y:2018,m:4,v:0.145},
  {y:2018,m:5,v:0.144},{y:2018,m:6,v:0.111},{y:2018,m:7,v:0.060},{y:2018,m:8,v:0.199},
  {y:2018,m:9,v:0.330},{y:2018,m:10,v:0.428},{y:2018,m:11,v:0.167},{y:2018,m:12,v:0.105},
  {y:2019,m:1,v:0.047},{y:2019,m:2,v:0.212},{y:2019,m:3,v:0.179},{y:2019,m:4,v:0.190},
  {y:2019,m:5,v:0.378},{y:2019,m:6,v:0.241},{y:2019,m:7,v:0.229},{y:2019,m:8,v:0.161},
  {y:2019,m:9,v:0.403},{y:2019,m:10,v:0.448},{y:2019,m:11,v:0.270},{y:2019,m:12,v:0.093},
  {y:2020,m:1,v:0.157},{y:2020,m:2,v:0.063},{y:2020,m:3,v:0.176},{y:2020,m:4,v:0.317},
  {y:2020,m:5,v:0.265},{y:2020,m:6,v:0.301},{y:2020,m:7,v:0.210},{y:2020,m:8,v:0.220},
  {y:2020,m:9,v:0.460},{y:2020,m:10,v:0.356},{y:2020,m:11,v:0.325},{y:2020,m:12,v:0.043}
];

/* ── SLR Projections for Galveston (relative to 1992 baseline)
      Source: NOAA 2022 Sea Level Rise Technical Report
      Units: centimeters                                     ── */
const SLR_PROJECTIONS = {
  low:          { 2024:20, 2030:25, 2040:33, 2050:46, 2060:56, 2070:63, 2080:70, 2090:77, 2100:85  },
  intermediate: { 2024:20, 2030:28, 2040:38, 2050:54, 2060:72, 2070:92, 2080:113,2090:132,2100:150 },
  high:         { 2024:20, 2030:32, 2040:46, 2050:67, 2060:96, 2070:130,2080:167,2090:205,2100:250 }
};

/* ── Key statistics (peer-reviewed sources) ── */
const STATS = {
  gauge_slr_mm_yr:    6.51,   // Long-term trend 1904-2018 (PMC7578811)
  absolute_slr_mm_yr: 1.10,   // Gulf of Mexico absolute SLR
  subsidence_galveston_mm_yr: 3.51, // Current Galveston subsidence (post-1983)
  subsidence_peak_mm_yr: 6.08,      // Peak period 1937-1983
  subsidence_katy_mm_yr: 25,         // Current Katy hotspot
  cumulative_subsidence_m: 3.0,     // Baytown/Pasadena historical
  national_rank: 3,                 // 3rd highest RSLR in US (2019)
  total_rise_since_1904_cm: 71,     // Total relative rise at Pier 21
  area_gt10mm_km2: 1500,            // Area experiencing >10mm/yr
  area_gt5mm_km2: 5464              // Area experiencing >5mm/yr
};

/* ── Subsidence zone color scheme ── */
const ZONE_COLORS = {
  critical:   { fill:'#f85149', opacity:0.55 },
  high:       { fill:'#ff7b72', opacity:0.50 },
  moderate:   { fill:'#ffa657', opacity:0.50 },
  low:        { fill:'#ffd700', opacity:0.45 },
  stable:     { fill:'#3fb950', opacity:0.40 },
  stabilized: { fill:'#79c0ff', opacity:0.45 }
};

/* ── Inundation zone thresholds (elevation above MHHW in cm) ── */
const INUNDATION_TIERS = {
  1: { threshold_cm: 50,  color:'#1f6feb', label:'Currently at risk / <50 cm threshold'  },
  2: { threshold_cm: 120, color:'#388bfd', label:'At risk at 50–120 cm SLR'             },
  3: { threshold_cm: 200, color:'#58a6ff', label:'At risk at 120–200 cm SLR'            }
};

/* ── State ── */
let state = {
  scenario:  'intermediate',
  year:      2040,
  playing:   false,
  playTimer: null,
  showSubsidence:  true,
  showInundation:  true,
  showFema:        true,
  showInfra:       false,
  activeChart:     'slr'
};

/* ── Leaflet map layers ── */
let map, subsidenceLayer, inundationLayers = {}, femaLayer, infraLayer, chartInstance;

/* ══════════════════════════════════════════════════════════ */
/*  INIT                                                     */
/* ══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadSubsidenceLayer();
  loadInundationLayers();
  loadFemaLayer();
  loadInfraLayer();
  initChart();
  updateProjections();
  bindControls();
});

/* ── Map ── */
function initMap() {
  map = L.map('map', {
    center: [29.52, -95.10],
    zoom: 10,
    zoomControl: true,
    attributionControl: true
  });

  // Dark CartoDB base map — no API key needed
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // Scale control
  L.control.scale({ imperial: true, metric: true, position: 'bottomright' }).addTo(map);
}

/* ── Subsidence Zones ── */
function loadSubsidenceLayer() {
  fetch('data/subsidence_zones.geojson')
    .then(r => r.json())
    .then(data => {
      subsidenceLayer = L.geoJSON(data, {
        style: feature => {
          const tier = feature.properties.color_tier;
          const c = ZONE_COLORS[tier] || { fill:'#888', opacity:0.4 };
          return {
            fillColor:   c.fill,
            fillOpacity: c.opacity,
            color:       c.fill,
            weight:      1.5,
            opacity:     0.8
          };
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties;
          layer.on('click', () => updateInfoPanel(p));
          layer.bindPopup(buildSubsidencePopup(p));
          layer.on('mouseover', function() {
            this.setStyle({ fillOpacity: Math.min(0.85, ZONE_COLORS[p.color_tier]?.opacity + 0.25 || 0.7), weight: 2.5 });
          });
          layer.on('mouseout', function() {
            subsidenceLayer.resetStyle(this);
          });
        }
      });

      if (state.showSubsidence) subsidenceLayer.addTo(map);
    })
    .catch(err => console.error('Subsidence layer error:', err));
}

/* ── Inundation Zones ── */
function loadInundationLayers() {
  fetch('data/inundation_zones.geojson')
    .then(r => r.json())
    .then(data => {
      // Group features by tier
      const byTier = { 1:[], 2:[], 3:[] };
      data.features.forEach(f => byTier[f.properties.flood_tier]?.push(f));

      Object.entries(byTier).forEach(([tier, features]) => {
        const t = parseInt(tier);
        const conf = INUNDATION_TIERS[t];
        const geoJSON = { type:'FeatureCollection', features };
        inundationLayers[t] = L.geoJSON(geoJSON, {
          style: {
            fillColor:   conf.color,
            fillOpacity: 0.0,  // start hidden; updateInundation() drives opacity
            color:       conf.color,
            weight:      1,
            opacity:     0
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties;
            layer.bindPopup(`<div class="popup-title">${p.name}</div>
              <div class="popup-row"><span class="popup-key">Elevation above MHHW</span>
              <span class="popup-val">${(p.elevation_m_above_mhhw * 100).toFixed(0)} cm</span></div>
              <div class="popup-row"><span class="popup-key">Flood risk tier</span>
              <span class="popup-val">Tier ${p.flood_tier}</span></div>
              <div class="popup-row" style="display:block;padding-top:6px;font-size:11px;color:#8b949e;">${p.description}</div>`
            );
          }
        });

        if (state.showInundation) inundationLayers[t].addTo(map);
      });

      updateInundation();
    })
    .catch(err => console.error('Inundation layer error:', err));
}

/* ── FEMA Flood Zones (real data: FEMA NFHL REST API) ── */
function loadFemaLayer() {
  fetch('data/fema_flood_zones.geojson')
    .then(r => r.json())
    .then(data => {
      const FEMA_COLORS = {
        'VE': { fill:'#f85149', label:'Coastal High Hazard (VE) — 100-yr + wave action' },
        'V':  { fill:'#f85149', label:'Coastal High Hazard (V)' },
        'AE': { fill:'#ff7b72', label:'Special Flood Hazard (AE) — 100-yr flood' },
        'A':  { fill:'#ffa657', label:'Special Flood Hazard (A) — 100-yr flood' },
        'AO': { fill:'#ffd700', label:'Sheet Flow Flood (AO) — shallow' },
      };

      femaLayer = L.geoJSON(data, {
        style: feature => {
          const zone = feature.properties.fld_zone || 'AE';
          const c = FEMA_COLORS[zone] || { fill:'#888' };
          return {
            fillColor:   c.fill,
            fillOpacity: 0.35,
            color:       c.fill,
            weight:      0.8,
            opacity:     0.7
          };
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties;
          const zone  = p.fld_zone || '?';
          const conf  = FEMA_COLORS[zone] || { label: zone };
          layer.bindPopup(`
            <div class="popup-title">FEMA Flood Zone ${zone}</div>
            <div class="popup-row"><span class="popup-key">Classification</span>
              <span class="popup-val">${conf.label}</span></div>
            <div class="popup-row"><span class="popup-key">County</span>
              <span class="popup-val">${p.county || '—'}</span></div>
            <div class="popup-row"><span class="popup-key">SFHA</span>
              <span class="popup-val">Special Flood Hazard Area</span></div>
            <div style="padding-top:6px;font-size:10px;color:#8b949e;">
              Source: FEMA NFHL MapServer Layer 28<br>
              Based on LiDAR-derived DEMs and hydraulic modeling.
            </div>
          `);
        }
      });

      if (state.showFema) femaLayer.addTo(map);
      // Place fema beneath subsidence so zones don't dominate
      if (subsidenceLayer) subsidenceLayer.bringToFront();
    })
    .catch(err => console.error('FEMA layer error:', err));
}

/* ── Infrastructure (real OSM data, 468 features) ── */
function loadInfraLayer() {
  fetch('data/infrastructure.geojson')
    .then(r => r.json())
    .then(data => {
      const markers = [];

      data.features.forEach(feat => {
        const p   = feat.properties;
        const coords = feat.geometry.coordinates;
        const lat = coords[1], lng = coords[0];

        const icon = L.divIcon({
          className: '',
          html: `<div style="width:20px;height:20px;background:${p.color};border:2px solid rgba(255,255,255,.25);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#000;box-shadow:0 2px 6px rgba(0,0,0,.7);">${p.symbol}</div>`,
          iconSize:   [20, 20],
          iconAnchor: [10, 10]
        });

        const marker = L.marker([lat, lng], { icon });

        let extraRows = '';
        if (p.type === 'Power Plant' && p.capacity_mw) {
          extraRows += `<div class="popup-row"><span class="popup-key">Capacity</span><span class="popup-val">${p.capacity_mw} MW</span></div>`;
        }
        if (p.type === 'Power Plant' && p.energy_source) {
          extraRows += `<div class="popup-row"><span class="popup-key">Fuel</span><span class="popup-val">${p.energy_source}</span></div>`;
        }
        if (p.operator) {
          extraRows += `<div class="popup-row"><span class="popup-key">Operator</span><span class="popup-val">${p.operator}</span></div>`;
        }

        marker.bindPopup(`
          <div class="popup-title">${p.name}</div>
          <div class="popup-row"><span class="popup-key">Type</span><span class="popup-val">${p.type}</span></div>
          ${extraRows}
          <div style="padding-top:6px;font-size:10px;color:#8b949e;">
            Source: OpenStreetMap (Overpass API)<br>
            Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}
          </div>
        `);

        markers.push(marker);
      });

      infraLayer = L.layerGroup(markers);
      console.log(`Infrastructure layer: ${markers.length} real OSM features loaded`);
    })
    .catch(err => console.error('Infrastructure layer error:', err));
}

/* Estimate year of chronic flooding onset for a given elevation */
function estimateFloodYear(elev_cm, lat, lng) {
  // Get local subsidence rate by proximity
  const subRate = getLocalSubsidenceRate(lat, lng); // mm/yr
  const proj = SLR_PROJECTIONS[state.scenario];
  for (const yr of [2030,2040,2050,2060,2070,2080,2090,2100]) {
    const slr = proj[yr] || proj[2100];
    const sub = subRate * (yr - 2024) / 10;  // additional subsidence cm
    if (slr + sub >= elev_cm) return yr;
  }
  return 2101;
}

function getLocalSubsidenceRate(lat, lng) {
  // Rough subsidence rate based on known zones (mm/yr)
  if (lng < -95.68 && lat > 29.70 && lat < 29.92) return 25; // Katy
  if (lng < -95.45 && lat > 29.82 && lat < 29.97) return 15; // Jersey Village
  if (lng < -95.27 && lat > 30.00)                 return 15; // Spring/Woodlands
  if (lng > -95.08 && lng < -94.78 && lat > 29.76) return 15; // Mont Belvieu
  if (lng < -95.35 && lat > 29.44 && lat < 29.66)  return 10; // Fresno
  if (lat < 29.40)                                   return 3.5; // Galveston coast
  return 3; // default background
}

/* ══════════════════════════════════════════════════════════ */
/*  UPDATE INUNDATION BASED ON STATE                         */
/* ══════════════════════════════════════════════════════════ */
function updateInundation() {
  if (!state.showInundation) {
    Object.values(inundationLayers).forEach(l => l.setStyle({ fillOpacity:0, opacity:0 }));
    return;
  }

  const proj = SLR_PROJECTIONS[state.scenario];
  const yr   = state.year;

  // Interpolate SLR for the selected year
  const slr_cm = interpolateSLR(proj, yr);

  Object.entries(inundationLayers).forEach(([tier, layer]) => {
    const t    = parseInt(tier);
    const conf = INUNDATION_TIERS[t];
    const flooded = slr_cm >= conf.threshold_cm;

    let fillOpacity = 0;
    if (flooded) {
      // Full opacity for deeply flooded zones
      const depth = slr_cm - conf.threshold_cm;
      fillOpacity = Math.min(0.72, 0.45 + depth / 200);
    } else if (slr_cm > conf.threshold_cm * 0.7) {
      // Near-threshold — show warning tint
      fillOpacity = 0.15;
    }

    layer.setStyle({ fillOpacity, opacity: flooded ? 0.5 : 0 });
  });
}

function interpolateSLR(proj, year) {
  const years = [2024,2030,2040,2050,2060,2070,2080,2090,2100];
  if (year <= 2024) return proj[2024];
  if (year >= 2100) return proj[2100];

  for (let i = 0; i < years.length - 1; i++) {
    if (year >= years[i] && year <= years[i+1]) {
      const t = (year - years[i]) / (years[i+1] - years[i]);
      return proj[years[i]] + t * (proj[years[i+1]] - proj[years[i]]);
    }
  }
  return proj[2100];
}

/* ══════════════════════════════════════════════════════════ */
/*  PROJECTION STATS PANEL                                   */
/* ══════════════════════════════════════════════════════════ */
function updateProjections() {
  const yr   = state.year;
  const proj = SLR_PROJECTIONS[state.scenario];
  const slr  = interpolateSLR(proj, yr);                   // cm
  const yrs  = yr - 2024;

  // Additional subsidence at Galveston (3.51 mm/yr current rate)
  const subGalveston = (STATS.subsidence_galveston_mm_yr * yrs / 10).toFixed(1);
  // Total effective SLR with subsidence
  const total = (slr + parseFloat(subGalveston)).toFixed(1);
  // Acceleration vs static model (rough: years earlier)
  const accel = Math.round(parseFloat(subGalveston) / (slr / yrs) * 5);

  document.getElementById('proj-slr').textContent  = `${slr.toFixed(0)} cm`;
  document.getElementById('proj-sub').textContent  = `${subGalveston} cm`;
  document.getElementById('proj-tot').textContent  = `${total} cm`;
  document.getElementById('proj-acc').textContent  = accel > 0 ? `~${accel} yrs earlier` : '—';

  // Update year badge and progress bar
  document.getElementById('year-display').textContent = yr;

  // Update slider fill
  const pct = ((yr - 2024) / (2100 - 2024)) * 100;
  document.getElementById('year-slider').style.background =
    `linear-gradient(to right, #58a6ff ${pct}%, #30363d ${pct}%)`;
}

/* ══════════════════════════════════════════════════════════ */
/*  CHART                                                    */
/* ══════════════════════════════════════════════════════════ */
function initChart() {
  renderSLRChart();
}

function renderSLRChart() {
  const canvas = document.getElementById('chart-canvas');
  if (!canvas) return;
  if (chartInstance) { chartInstance.destroy(); }

  const ctx = canvas.getContext('2d');

  if (state.activeChart === 'slr') {
    // Annual means from monthly data
    const annuals = {};
    NOAA_MONTHLY.forEach(d => {
      if (d.v === null) return;
      if (!annuals[d.y]) annuals[d.y] = [];
      annuals[d.y].push(d.v);
    });

    const labels = Object.keys(annuals).sort();
    const values = labels.map(y => {
      const arr = annuals[y];
      return (arr.reduce((s,v) => s+v, 0) / arr.length * 100).toFixed(1); // cm
    });

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Annual Mean Sea Level (cm above station datum)',
          data: values,
          borderColor: '#58a6ff',
          backgroundColor: 'rgba(88,166,255,0.12)',
          borderWidth: 1.5,
          pointRadius: 2,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.3
        }]
      },
      options: chartOptions('Annual Mean Sea Level at Galveston Pier 21 (cm)', 'NOAA CO-OPS Station 8771450')
    });

  } else {
    // Projections chart
    const years = [2024,2030,2040,2050,2060,2070,2080,2090,2100];
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          {
            label: 'High Scenario',
            data: years.map(y => SLR_PROJECTIONS.high[y]),
            borderColor: '#f85149',
            backgroundColor: 'rgba(248,81,73,0.10)',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 3
          },
          {
            label: 'Intermediate Scenario',
            data: years.map(y => SLR_PROJECTIONS.intermediate[y]),
            borderColor: '#ffa657',
            backgroundColor: 'rgba(255,166,87,0.10)',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 3
          },
          {
            label: 'Low Scenario',
            data: years.map(y => SLR_PROJECTIONS.low[y]),
            borderColor: '#3fb950',
            backgroundColor: 'rgba(63,185,80,0.10)',
            borderWidth: 2,
            fill: false,
            tension: 0.3,
            pointRadius: 3
          }
        ]
      },
      options: chartOptions('NOAA 2022 SLR Projections — Galveston (cm above 1992)', 'Source: NOAA 2022 Sea Level Rise Technical Report')
    });
  }
}

function chartOptions(titleText, subtitleText) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: { color:'#8b949e', font:{ size:10 }, boxWidth:16, padding:10 }
      },
      title: { display:false },
      tooltip: {
        backgroundColor: '#21262d',
        borderColor: '#30363d',
        borderWidth: 1,
        titleColor: '#e6edf3',
        bodyColor: '#8b949e',
        titleFont: { size:11 },
        bodyFont: { size:10 }
      }
    },
    scales: {
      x: {
        ticks: { color:'#8b949e', font:{ size:9 }, maxTicksLimit: 10 },
        grid: { color:'rgba(48,54,61,0.5)' }
      },
      y: {
        ticks: { color:'#8b949e', font:{ size:9 } },
        grid: { color:'rgba(48,54,61,0.5)' }
      }
    }
  };
}

/* ══════════════════════════════════════════════════════════ */
/*  INFO PANEL                                               */
/* ══════════════════════════════════════════════════════════ */
function updateInfoPanel(p) {
  const panel = document.getElementById('info-panel');
  const rateClass = `rate-${p.color_tier}`;

  const yr  = state.year;
  const yrs = yr - 2024;
  const sub_extra = (p.subsidence_rate_mm_yr * yrs / 10).toFixed(1);
  const slr       = interpolateSLR(SLR_PROJECTIONS[state.scenario], yr);
  const total     = (slr + parseFloat(sub_extra)).toFixed(1);

  panel.innerHTML = `
    <div class="info-title">${p.name}</div>
    <div class="info-row"><span class="info-key">Subsidence rate</span>
      <span class="info-val ${rateClass}">${p.subsidence_range}</span></div>
    <div class="info-row"><span class="info-key">Primary cause</span>
      <span class="info-val">${p.cause}</span></div>
    <div class="info-row"><span class="info-key">Status</span>
      <span class="info-val">${p.status}</span></div>
    <div class="info-row"><span class="info-key">Local subsidence by ${yr}</span>
      <span class="info-val rate-critical">${sub_extra} cm additional</span></div>
    <div class="info-row"><span class="info-key">Total effective SLR by ${yr}</span>
      <span class="info-val" style="color:#ffa657;">${total} cm</span></div>
    <div style="padding:6px 0 0;font-size:10px;color:#8b949e;">${p.notes}</div>
  `;
}

/* ══════════════════════════════════════════════════════════ */
/*  POPUP BUILDER                                            */
/* ══════════════════════════════════════════════════════════ */
function buildSubsidencePopup(p) {
  const rateClass = `rate-${p.color_tier}`;
  const yr  = state.year;
  const yrs = yr - 2024;
  const sub_extra = (p.subsidence_rate_mm_yr * yrs / 10).toFixed(1);
  const slr = interpolateSLR(SLR_PROJECTIONS[state.scenario], yr);

  return `
    <div class="popup-title">${p.name}</div>
    <div class="popup-row">
      <span class="popup-key">Subsidence rate</span>
      <span class="popup-val ${rateClass}">${p.subsidence_range}</span>
    </div>
    <div class="popup-row">
      <span class="popup-key">Cause</span>
      <span class="popup-val">${p.cause}</span>
    </div>
    <div class="popup-row">
      <span class="popup-key">Status</span>
      <span class="popup-val">${p.status}</span>
    </div>
    <div class="popup-row">
      <span class="popup-key">Extra sinking by ${yr}</span>
      <span class="popup-val rate-critical">${sub_extra} cm</span>
    </div>
    <div class="popup-row">
      <span class="popup-key">SLR + subsidence by ${yr}</span>
      <span class="popup-val" style="color:#ffa657;">${(slr + parseFloat(sub_extra)).toFixed(0)} cm</span>
    </div>
    <div style="padding-top:8px;font-size:10px;color:#8b949e;border-top:1px solid #30363d;margin-top:4px;">${p.notes}</div>
  `;
}

/* ══════════════════════════════════════════════════════════ */
/*  EVENT BINDINGS                                           */
/* ══════════════════════════════════════════════════════════ */
function bindControls() {
  // Scenario tabs
  document.querySelectorAll('.scenario-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.scenario = btn.dataset.scenario;
      document.querySelectorAll('.scenario-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateProjections();
      updateInundation();
      if (chartInstance && state.activeChart === 'projections') renderSLRChart();
    });
  });

  // Year slider
  const slider = document.getElementById('year-slider');
  slider.addEventListener('input', () => {
    state.year = parseInt(slider.value);
    updateProjections();
    updateInundation();
  });

  // Play button
  document.getElementById('play-btn').addEventListener('click', togglePlay);

  // Layer toggles
  document.getElementById('toggle-subsidence').addEventListener('change', e => {
    state.showSubsidence = e.target.checked;
    if (subsidenceLayer) {
      state.showSubsidence ? subsidenceLayer.addTo(map) : map.removeLayer(subsidenceLayer);
    }
  });

  document.getElementById('toggle-inundation').addEventListener('change', e => {
    state.showInundation = e.target.checked;
    updateInundation();
  });

  document.getElementById('toggle-fema').addEventListener('change', e => {
    state.showFema = e.target.checked;
    if (femaLayer) {
      state.showFema ? femaLayer.addTo(map) : map.removeLayer(femaLayer);
    }
  });

  document.getElementById('toggle-infra').addEventListener('change', e => {
    state.showInfra = e.target.checked;
    if (infraLayer) {
      state.showInfra ? infraLayer.addTo(map) : map.removeLayer(infraLayer);
    }
  });

  // Chart tabs
  document.querySelectorAll('.chart-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeChart = btn.dataset.chart;
      document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSLRChart();
    });
  });
}

/* ── Play/pause animation ── */
function togglePlay() {
  state.playing = !state.playing;
  const btn = document.getElementById('play-btn');
  const slider = document.getElementById('year-slider');

  if (state.playing) {
    btn.textContent = '⏸ Pause';
    btn.classList.add('playing');
    if (state.year >= 2100) { state.year = 2024; slider.value = 2024; }

    state.playTimer = setInterval(() => {
      state.year = Math.min(2100, state.year + 2);
      slider.value = state.year;
      updateProjections();
      updateInundation();
      if (state.year >= 2100) {
        togglePlay();
      }
    }, 80);
  } else {
    btn.textContent = '▶ Animate';
    btn.classList.remove('playing');
    clearInterval(state.playTimer);
  }
}
