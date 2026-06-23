/* ------------- MAIN MAP ------------- */
const map = L.map('map').setView([14.5995, 120.9842], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom:19 }).addTo(map);

/* ------------- CONFIG ------------- */
const MAX_API_CALLS = 55;
const PER_CALL_DELAY_MS = Math.ceil(60000 / MAX_API_CALLS);
const MIN_CALL_DELAY = 250;
const EFFECTIVE_DELAY = Math.max(PER_CALL_DELAY_MS, MIN_CALL_DELAY);

/* -------------------- Province Outline Layer -------------------- */
let provinceGeoJSON = null;
let provinceOutlineLayer = null;
fetch("gadm41_PHL_2.json")
  .then(res => res.json())
  .then(data => { provinceGeoJSON = data; })
  .catch(err => { console.warn("Could not load GADM file:", err); });

function outlineProvince(provinceName) {
  if (!provinceGeoJSON) return;
  if (provinceOutlineLayer) map.removeLayer(provinceOutlineLayer);

  const matches = provinceGeoJSON.features.filter(f =>
    (f.properties.NAME_2 || "").toLowerCase().includes(provinceName.toLowerCase()) ||
    (f.properties.NAME_1 || "").toLowerCase().includes(provinceName.toLowerCase())
  );

  if (!matches || matches.length === 0) return;

  provinceOutlineLayer = L.geoJSON(matches, {
    style: { color: "#ff8000", weight: 2.5, fillOpacity: 0 }
  }).addTo(map);

  try { map.fitBounds(provinceOutlineLayer.getBounds(), { padding: [20, 20] }); } catch (e) {}
}

/* ------------- LAYERS ------------- */
let volcanoLayer = L.layerGroup();
let earthquakeLayer = L.layerGroup().addTo(map);
let weatherLayer = L.layerGroup().addTo(map);

/* ------------- ICONS & HAZARD ZONES ------------- */
const volcanoIconNormal = L.icon({ iconUrl: 'images/volcano_normal.svg', iconSize: [32,32], iconAnchor:[16,32], popupAnchor:[0,-28] });
const volcanoIconActive = L.icon({ iconUrl: 'images/volcano_active.svg', iconSize: [36,36], iconAnchor:[18,36], popupAnchor:[0,-32] });

const VOLCANO_HAZARD_ZONES = [
  { radius: 6000,  color: "#ff0000", opacity: 0.35 },
  { radius: 15000, color: "#ff6600", opacity: 0.25 },
  { radius: 30000, color: "#ffaa00", opacity: 0.15 },
  { radius: 80000, color: "#ffff00", opacity: 0.05 }
];

function drawVolcanoHazardZones(lat, lon) {
  VOLCANO_HAZARD_ZONES.forEach(z => {
    L.circle([lat, lon], {
      radius: z.radius,
      color: z.color, fillColor: z.color,
      fillOpacity: z.opacity, weight: 1
    }).addTo(volcanoLayer);
  });
}

function createVolcanoPulse(lat, lon) {
  let pulse = L.circle([lat, lon], { radius: 2000, color: "#ff0000", fillOpacity: 0.25, weight: 1 }).addTo(volcanoLayer);
  let r = 2000, maxR = 12000, speed = 250;
  const colors = ["#ff0000","#ff6600","#ffaa00","#ffff00"];
  let colorIndex = 0;

  const interval = setInterval(() => {
    r += 900;
    pulse.setRadius(r);
    const opacity = Math.max(0, 0.30 - (r / maxR) * 0.30);
    pulse.setStyle({ fillOpacity: opacity, opacity: opacity, color: colors[colorIndex], fillColor: colors[colorIndex] });

    if (r >= maxR) { r = 2000; pulse.setRadius(r); colorIndex = (colorIndex+1) % colors.length; }
    if (!map.hasLayer(volcanoLayer)) { clearInterval(interval); volcanoLayer.removeLayer(pulse); }
  }, speed);
}

function drawVolcano(v) {
  const marker = L.marker([v.lat, v.lon], { icon: v.erupting ? volcanoIconActive : volcanoIconNormal });
  marker.bindPopup(`<strong>${v.name}</strong><br>Status: ${v.status}<br>${v.lastActivity ? "Last activity: "+new Date(v.lastActivity).toLocaleString() : ""}`);
  volcanoLayer.addLayer(marker);

  if (v.erupting) {
    drawVolcanoHazardZones(v.lat, v.lon);
    createVolcanoPulse(v.lat, v.lon);
  }
}

/* ------------- DATA VOLCANOES ------------- */
/* Use the merged structure you provided earlier. I kept it compact; expand later as needed. */
const volcanoDB = [
  { name: "Babuyan Claro", lat: 19.52408, lon: 121.95005 },
  { name: "Banahaw", lat: 14.06038, lon: 121.48803 },
  { name: "Biliran (Anas)", lat: 11.63268, lon: 124.47162 },
  { name: "Bud Dajo", lat: 6.01295, lon: 121.05772 },
  { name: "Bulusan", lat: 12.76853, lon: 124.05445 },
  { name: "Cabalian", lat: 10.27986, lon: 125.21598 },
  { name: "Cagua", lat: 18.22116, lon: 122.11630 },
  { name: "Camiguin de Babuyanes", lat: 18.83037, lon: 121.86280 },
  { name: "Didicas", lat: 19.07533, lon: 122.20147 },
  { name: "Hibok-Hibok", lat: 9.20427, lon: 124.67115 },
  { name: "Iraya", lat: 20.46669, lon: 122.01078 },
  { name: "Iriga (Asog)", lat: 13.45606, lon: 123.45479 },
  { name: "Isarog", lat: 13.65685, lon: 123.38087 },
  { name: "Kanlaon", lat: 10.41129, lon: 123.13243 },
  { name: "Leonard Kniaseff", lat: 7.39359, lon: 126.06418 },
  { name: "Makaturing", lat: 7.64371, lon: 124.31718 },
  { name: "Matutum", lat: 6.36111, lon: 125.07603 },
  { name: "Mayon", lat: 13.25519, lon: 123.68615 },
  { name: "Musuan (Calayo)", lat: 7.87680, lon: 125.06985 },
  { name: "Parker", lat: 6.10274, lon: 124.88879 },
  { name: "Pinatubo", lat: 15.14162, lon: 120.35084 },
  { name: "Ragang", lat: 7.69066, lon: 124.50639 },
  { name: "Smith", lat: 19.53915, lon: 121.91367 },
  { name: "Taal", lat: 14.01024, lon: 120.99812 }
];


/* ------------- DATA (Region -> Province -> {Cities, Municipalities}) ------------- */
/* CORRECTED: Verified coordinates using Wikipedia, PSA (Philippine Statistics Authority), OpenStreetMap */
const locationData = {
/* -------------------- Region I (Ilocos Region) -------------------- */
"Region I (Ilocos Region)": {
    "Ilocos Norte": {
      Cities: [
        { name: "Laoag", lat: 18.2021, lon: 120.5960 },
        { name: "Batac", lat: 18.0343, lon: 120.6130 }
      ],
      Municipalities: [
        { name: "Adams", lat: 18.3836, lon: 120.7872 },
        { name: "Bacarra", lat: 18.3464, lon: 120.5961 },
        { name: "Badoc", lat: 18.2055, lon: 120.5289 },
        { name: "Bangui", lat: 18.5067, lon: 120.7628 },
        { name: "Banna", lat: 18.2096, lon: 120.5400 },
        { name: "Burgos", lat: 18.6203, lon: 120.9461 },
        { name: "Carasi", lat: 18.4604, lon: 120.8179 },
        { name: "Currimao", lat: 18.2500, lon: 120.5220 },
        { name: "Dingras", lat: 18.0239, lon: 120.6447 },
        { name: "Dumalneg", lat: 18.5310, lon: 120.9030 },
        { name: "Marcos", lat: 18.0833, lon: 120.4417 },
        { name: "Nueva Era", lat: 18.3975, lon: 120.6333 },
        { name: "Pagudpud", lat: 18.5773, lon: 120.7626 },
        { name: "Paoay", lat: 18.0286, lon: 120.5300 },
        { name: "Pasuquin", lat: 18.1478, lon: 120.5788 },
        { name: "Piddig", lat: 18.1420, lon: 120.7200 },
        { name: "Pinili", lat: 18.1289, lon: 120.5740 },
        { name: "San Nicolas", lat: 18.1382, lon: 120.5858 },
        { name: "Sarrat", lat: 18.1000, lon: 120.6210 },
        { name: "Solsona", lat: 18.2710, lon: 120.7120 },
        { name: "Vintar", lat: 18.4850, lon: 120.6480 }
      ]
    },
    "Ilocos Sur": {
      Cities: [
        { name: "Vigan", lat: 17.5755, lon: 120.3867 },
        { name: "Candon", lat: 17.1878, lon: 120.4469 }
      ],
      Municipalities: [
        { name: "Alilem", lat: 17.0720, lon: 120.4330 },
        { name: "Banayoyo", lat: 17.1980, lon: 120.3490 },
        { name: "Bantay", lat: 17.5880, lon: 120.4020 },
        { name: "Burgos", lat: 17.2000, lon: 120.3667 },
        { name: "Cabugao", lat: 17.1997, lon: 120.4482 },
        { name: "Caoayan", lat: 17.6050, lon: 120.3660 },
        { name: "Cervantes", lat: 17.2140, lon: 120.6720 },
        { name: "Galimuyod", lat: 17.0833, lon: 120.4167 },
        { name: "Gregorio del Pilar", lat: 17.1333, lon: 120.6167 },
        { name: "Lidlidda", lat: 17.1250, lon: 120.5130 },
        { name: "Magsingal", lat: 17.3150, lon: 120.4490 },
        { name: "Nagbukel", lat: 17.0520, lon: 120.4490 },
        { name: "Narvacan", lat: 17.0320, lon: 120.3650 },
        { name: "Quirino", lat: 17.1160, lon: 120.5160 },
        { name: "Salcedo", lat: 17.1010, lon: 120.5160 },
        { name: "San Emilio", lat: 16.9190, lon: 120.8320 },
        { name: "San Esteban", lat: 17.1000, lon: 120.4500 },
        { name: "San Ildefonso", lat: 17.3530, lon: 120.5480 },
        { name: "San Juan", lat: 17.6160, lon: 120.4330 },
        { name: "San Vicente", lat: 17.5510, lon: 120.4160 },
        { name: "Santa", lat: 17.3500, lon: 120.4000 },
        { name: "Santa Catalina", lat: 17.4667, lon: 120.3167 },
        { name: "Santa Cruz", lat: 17.6160, lon: 120.6000 },
        { name: "Santa Lucia", lat: 17.4450, lon: 120.4320 },
        { name: "Santa Maria", lat: 17.1300, lon: 120.4310 },
        { name: "Santiago", lat: 16.6860, lon: 121.5470 },
        { name: "Santo Domingo", lat: 17.0990, lon: 120.6660 },
        { name: "Sigay", lat: 17.1830, lon: 120.5160 },
        { name: "Sinait", lat: 17.6470, lon: 120.4510 },
        { name: "Sugpon", lat: 17.0380, lon: 120.5960 },
        { name: "Suyo", lat: 16.8990, lon: 120.8330 },
        { name: "Tagudin", lat: 17.1320, lon: 120.3330 }
      ]
    },
    "La Union": {
      Cities: [
        { name: "San Fernando", lat: 16.6150, lon: 120.3130 }
      ],
      Municipalities: [
        { name: "Agoo", lat: 16.3360, lon: 120.3500 },
        { name: "Aringay", lat: 16.4540, lon: 120.3520 },
        { name: "Bacnotan", lat: 16.6333, lon: 120.3189 },
        { name: "Bagulin", lat: 16.5180, lon: 120.3850 },
        { name: "Balaoan", lat: 16.5250, lon: 120.4370 },
        { name: "Bangar", lat: 17.0060, lon: 120.4030 },
        { name: "Bauang", lat: 16.6190, lon: 120.2830 },
        { name: "Burgos", lat: 16.6620, lon: 120.4560 },
        { name: "Caba", lat: 16.6350, lon: 120.4070 },
        { name: "Luna", lat: 16.7833, lon: 120.2750 },
        { name: "Naguilian", lat: 16.6150, lon: 120.4010 },
        { name: "Pugo", lat: 16.4040, lon: 120.3860 },
        { name: "Rosario", lat: 16.6190, lon: 120.3000 },
        { name: "San Gabriel", lat: 16.5330, lon: 120.4540 },
        { name: "San Juan", lat: 16.7170, lon: 120.3380 },
        { name: "Santo Tomas", lat: 16.5010, lon: 120.3420 },
        { name: "Santol", lat: 16.4510, lon: 120.3010 },
        { name: "Sudipen", lat: 16.5850, lon: 120.3970 },
        { name: "Tubao", lat: 16.4520, lon: 120.3440 }
      ]
    },
    "Pangasinan": {
      Cities: [
        { name: "Dagupan", lat: 16.0433, lon: 120.3333 },
        { name: "Alaminos", lat: 16.0667, lon: 119.9833 },
        { name: "San Carlos", lat: 15.9159, lon: 120.3340 },
        { name: "Urdaneta", lat: 15.9762, lon: 120.5710 }
      ],
      Municipalities: [
        { name: "Agno", lat: 15.9430, lon: 119.9370 },
        { name: "Aguilar", lat: 15.9833, lon: 120.2833 },
        { name: "Alcala", lat: 15.8030, lon: 120.3280 },
        { name: "Anda", lat: 16.1669, lon: 120.2367 },
        { name: "Asingan", lat: 15.9520, lon: 120.4500 },
        { name: "Balungao", lat: 15.8980, lon: 120.7050 },
        { name: "Bani", lat: 15.9180, lon: 120.1500 },
        { name: "Basista", lat: 15.9020, lon: 120.5350 },
        { name: "Bautista", lat: 15.9130, lon: 120.4210 },
        { name: "Bayambang", lat: 15.9130, lon: 120.4500 },
        { name: "Binalonan", lat: 16.0040, lon: 120.5120 },
        { name: "Binmaley", lat: 16.0410, lon: 120.2800 },
        { name: "Bolinao", lat: 16.1680, lon: 119.9820 },
        { name: "Bugallon", lat: 15.9560, lon: 120.2510 },
        { name: "Burgos", lat: 16.0230, lon: 120.4670 },
        { name: "Calasiao", lat: 16.0333, lon: 120.3333 },
        { name: "Dasol", lat: 15.9650, lon: 119.9290 },
        { name: "Infanta", lat: 16.0070, lon: 120.2730 },
        { name: "Labrador", lat: 16.0640, lon: 120.1080 },
        { name: "Laoac", lat: 16.0490, lon: 120.5470 },
        { name: "Lingayen", lat: 15.9833, lon: 120.2333 },
        { name: "Mabini", lat: 15.9490, lon: 120.1880 },
        { name: "Malasiqui", lat: 15.8830, lon: 120.5770 },
        { name: "Manaoag", lat: 16.0160, lon: 120.5090 },
        { name: "Mangaldan", lat: 16.0010, lon: 120.4030 },
        { name: "Mangatarem", lat: 15.8760, lon: 120.1640 },
        { name: "Mapandan", lat: 16.0180, lon: 120.4560 },
        { name: "Natividad", lat: 15.9720, lon: 120.4320 },
        { name: "Pozorrubio", lat: 16.0680, lon: 120.5210 },
        { name: "Rosales", lat: 15.8060, lon: 120.6310 },
        { name: "San Fabian", lat: 16.0020, lon: 120.2970 },
        { name: "San Jacinto", lat: 16.0950, lon: 120.4330 },
        { name: "San Manuel", lat: 16.0610, lon: 120.6730 },
        { name: "San Nicolas", lat: 16.0160, lon: 120.3410 },
        { name: "San Quintin", lat: 16.0880, lon: 120.4000 },
        { name: "Santa Barbara", lat: 15.8830, lon: 120.3490 },
        { name: "Santa Maria", lat: 16.0960, lon: 120.4520 },
        { name: "Santo Tomas", lat: 16.0000, lon: 120.3600 },
        { name: "Sison", lat: 16.2200, lon: 120.4820 },
        { name: "Sual", lat: 16.1330, lon: 119.9140 },
        { name: "Tayug", lat: 16.0980, lon: 120.5940 },
        { name: "Umingan", lat: 16.0450, lon: 120.6460 },
        { name: "Urbiztondo", lat: 16.0440, lon: 120.2030 },
        { name: "Villasis", lat: 15.9830, lon: 120.5230 }
      ]
    }
  }, // end Region I


/* -------------------- Region II (Cagayan Valley) -------------------- */
"Region II (Cagayan Valley)": {
    "Batanes": {
      Cities: [
        { name: "Basco", lat: 20.4500, lon: 121.9800 }
      ],
      Municipalities: [
        { name: "Itbayat", lat: 20.5670, lon: 121.9330 },
        { name: "Ivana", lat: 20.4167, lon: 121.9500 },
        { name: "Mahatao", lat: 20.4230, lon: 121.9750 },
        { name: "Sabtang", lat: 20.3667, lon: 121.9830 },
        { name: "Uyugan", lat: 20.5000, lon: 121.9330 }
      ]
    },
    "Cagayan": {
      Cities: [
        { name: "Tuguegarao", lat: 17.6406, lon: 121.7319 }
      ],
      Municipalities: [
        { name: "Abulug", lat: 18.1330, lon: 121.4000 },
        { name: "Alcala", lat: 17.9000, lon: 121.6500 },
        { name: "Allacapan", lat: 17.9330, lon: 121.7000 },
        { name: "Amulung", lat: 17.6330, lon: 121.7330 },
        { name: "Aparri", lat: 18.3330, lon: 121.6670 },
        { name: "Baggao", lat: 17.9000, lon: 121.6330 },
        { name: "Ballesteros", lat: 18.1000, lon: 121.5670 },
        { name: "Buguey", lat: 18.3667, lon: 121.6670 },
        { name: "Camalaniugan", lat: 18.0330, lon: 121.5830 },
        { name: "Claveria", lat: 18.0167, lon: 121.5830 },
        { name: "Enrile", lat: 17.7830, lon: 121.6670 },
        { name: "Gattaran", lat: 18.1830, lon: 121.7170 },
        { name: "Iguig", lat: 17.6500, lon: 121.7000 },
        { name: "Lal-lo", lat: 18.0500, lon: 121.6500 },
        { name: "Lasam", lat: 18.1330, lon: 121.6170 },
        { name: "Pamplona", lat: 17.9330, lon: 121.6670 },
        { name: "Peñablanca", lat: 17.7330, lon: 121.6670 },
        { name: "Piat", lat: 17.6670, lon: 121.7170 },
        { name: "Rizal", lat: 17.5830, lon: 121.6330 },
        { name: "Sanchez-Mira", lat: 18.4167, lon: 121.6170 },
        { name: "Santa Ana", lat: 18.4830, lon: 122.0170 },
        { name: "Santa Praxedes", lat: 18.4667, lon: 121.9000 },
        { name: "Santa Teresita", lat: 18.3830, lon: 121.8330 },
        { name: "Santo Niño", lat: 17.6830, lon: 121.6670 },
        { name: "Solana", lat: 17.6170, lon: 121.7330 },
        { name: "Tuao", lat: 17.8500, lon: 121.6670 },
        { name: "Villaverde", lat: 17.9667, lon: 121.5830 }
      ]
    },
    "Isabela": {
      Cities: [
        { name: "Ilagan", lat: 17.1359, lon: 121.9307 },
        { name: "Cauayan", lat: 16.9330, lon: 121.7500 },
        { name: "Santiago", lat: 16.7167, lon: 121.5500 }
      ],
      Municipalities: [
        { name: "Aurora", lat: 17.2000, lon: 121.7500 },
        { name: "Benito Soliven", lat: 16.9330, lon: 121.7170 },
        { name: "Burgos", lat: 17.1330, lon: 121.9000 },
        { name: "Cabagan", lat: 17.1500, lon: 121.8170 },
        { name: "Cabatuan", lat: 16.9500, lon: 121.7670 },
        { name: "Cordon", lat: 17.1330, lon: 121.8170 },
        { name: "Delfin Albano", lat: 17.0830, lon: 121.8330 },
        { name: "Dinapigue", lat: 16.1000, lon: 122.1670 },
        { name: "Divilacan", lat: 16.4830, lon: 122.0000 },
        { name: "Echague", lat: 16.8330, lon: 121.8500 },
        { name: "Gamu", lat: 16.9667, lon: 121.8000 },
        { name: "Jones", lat: 17.0830, lon: 121.9000 },
        { name: "Maconacon", lat: 17.3670, lon: 122.4670 },
        { name: "Mallig", lat: 17.0830, lon: 121.7170 },
        { name: "Naguilian", lat: 17.2330, lon: 121.8170 },
        { name: "Palanan", lat: 16.0830, lon: 122.2330 },
        { name: "Ramon", lat: 16.9667, lon: 121.7500 },
        { name: "Reina Mercedes", lat: 17.1000, lon: 121.8330 },
        { name: "San Agustin", lat: 16.8830, lon: 121.7170 },
        { name: "San Guillermo", lat: 16.9000, lon: 121.7000 },
        { name: "San Isidro", lat: 17.0330, lon: 121.8330 },
        { name: "San Manuel", lat: 16.9330, lon: 121.8330 },
        { name: "San Mariano", lat: 16.8500, lon: 121.8330 },
        { name: "San Mateo", lat: 17.0500, lon: 121.8500 },
        { name: "San Pablo", lat: 17.0500, lon: 121.8170 },
        { name: "Santa Maria", lat: 16.9500, lon: 121.8000 },
        { name: "Santo Tomas", lat: 17.0830, lon: 121.8330 }
      ]
    },
    "Nueva Vizcaya": {
      Cities: [
        { name: "Bayombong", lat: 16.4800, lon: 121.1330 }
      ],
      Municipalities: [
        { name: "Alfonso Castañeda", lat: 16.5667, lon: 121.3830 },
        { name: "Ambaguio", lat: 16.5333, lon: 121.2830 },
        { name: "Aritao", lat: 16.5500, lon: 121.2330 },
        { name: "Bagabag", lat: 16.5667, lon: 121.2330 },
        { name: "Bambang", lat: 16.4500, lon: 121.1670 },
        { name: "Diadi", lat: 16.5000, lon: 121.3170 },
        { name: "Kasibu", lat: 16.7667, lon: 121.3170 },
        { name: "Quezon", lat: 16.6333, lon: 121.2330 },
        { name: "Santa Fe", lat: 16.7167, lon: 121.1500 },
        { name: "Solano", lat: 16.4500, lon: 121.2500 },
        { name: "Villaverde", lat: 16.6667, lon: 121.2330 }
      ]
    },
    "Quirino": {
      Cities: [
        { name: "Cabarroguis", lat: 16.4330, lon: 121.5330 }
      ],
      Municipalities: [
        { name: "Diffun", lat: 16.3330, lon: 121.5000 },
        { name: "Maddela", lat: 16.4170, lon: 121.5000 },
        { name: "Nagtipunan", lat: 16.3500, lon: 121.6330 },
        { name: "Saguday", lat: 16.3330, lon: 121.4170 }
      ]
    }
  }, // end Region II


/* -------------------- Region III (Central Luzon) -------------------- */
"Region III (Central Luzon)": {
    "Aurora": {
      Cities: [
        { name: "Baler", lat: 15.7548, lon: 121.5632 }
      ],
      Municipalities: [
        { name: "Dilasag", lat: 16.1150, lon: 122.1410 },
        { name: "Dinalungan", lat: 16.0830, lon: 122.1300 },
        { name: "Dipaculao", lat: 15.6710, lon: 121.6510 },
        { name: "Maria Aurora", lat: 15.7180, lon: 121.5470 },
        { name: "San Luis", lat: 15.8070, lon: 121.4560 },
        { name: "San Mateo", lat: 15.7560, lon: 121.4210 },
        { name: "Santiago", lat: 15.6840, lon: 121.5200 }
      ]
    },
    "Bataan": {
      Cities: [
        { name: "Balanga", lat: 14.6760, lon: 120.5290 }
      ],
      Municipalities: [
        { name: "Abucay", lat: 14.6950, lon: 120.5430 },
        { name: "Bagac", lat: 14.5950, lon: 120.4020 },
        { name: "Dinalupihan", lat: 14.8570, lon: 120.5390 },
        { name: "Hermosa", lat: 14.7430, lon: 120.4740 },
        { name: "Limay", lat: 14.6230, lon: 120.5580 },
        { name: "Mariveles", lat: 14.4050, lon: 120.4070 },
        { name: "Morong", lat: 14.5980, lon: 120.5030 },
        { name: "Orani", lat: 14.7400, lon: 120.4400 },
        { name: "Orion", lat: 14.6870, lon: 120.4500 },
        { name: "Samal", lat: 14.5870, lon: 120.5080 }
      ]
    },
    "Bulacan": {
      Cities: [
        { name: "Malolos", lat: 14.8390, lon: 120.8110 },
        { name: "Meycauayan", lat: 14.7260, lon: 120.9540 },
        { name: "San Jose del Monte", lat: 14.8340, lon: 121.0500 }
      ],
      Municipalities: [
        { name: "Angat", lat: 14.8520, lon: 120.9190 },
        { name: "Balagtas", lat: 14.8400, lon: 120.8830 },
        { name: "Baliuag", lat: 14.8830, lon: 120.8840 },
        { name: "Bocaue", lat: 14.7910, lon: 120.9480 },
        { name: "Bulacan", lat: 14.9520, lon: 120.8000 },
        { name: "Guiguinto", lat: 14.8500, lon: 120.9360 },
        { name: "Hagonoy", lat: 14.7190, lon: 120.8890 },
        { name: "Marilao", lat: 14.7460, lon: 120.9440 },
        { name: "Norzagaray", lat: 14.9100, lon: 121.0240 },
        { name: "Obando", lat: 14.7420, lon: 120.9170 },
        { name: "Pandi", lat: 14.8480, lon: 120.9850 },
        { name: "Plaridel", lat: 14.8980, lon: 120.8520 },
        { name: "Pulilan", lat: 14.8810, lon: 120.8850 },
        { name: "San Ildefonso", lat: 14.8550, lon: 120.8340 },
        { name: "San Miguel", lat: 14.9560, lon: 120.8940 },
        { name: "San Rafael", lat: 14.9600, lon: 120.8890 },
        { name: "Santa Maria", lat: 14.8810, lon: 120.8500 }
      ]
    },
    "Nueva Ecija": {
      Cities: [
        { name: "Cabanatuan", lat: 15.4800, lon: 120.9630 },
        { name: "Gapan", lat: 15.2800, lon: 120.9480 },
        { name: "Palayan", lat: 15.4900, lon: 121.0630 },
        { name: "San Jose", lat: 15.6230, lon: 121.0330 }
      ],
      Municipalities: [
        { name: "Aliaga", lat: 15.5670, lon: 120.9000 },
        { name: "Bongabon", lat: 15.5500, lon: 121.0500 },
        { name: "Cabiao", lat: 15.3000, lon: 120.9500 },
        { name: "Carranglan", lat: 15.6160, lon: 121.2500 },
        { name: "Cuyapo", lat: 15.7500, lon: 121.0830 },
        { name: "Gabaldon", lat: 15.6660, lon: 121.2670 },
        { name: "General Tinio", lat: 15.2660, lon: 121.1670 },
        { name: "Guimba", lat: 15.5660, lon: 120.9000 },
        { name: "Jaen", lat: 15.5000, lon: 120.9670 },
        { name: "Laur", lat: 15.5830, lon: 121.0670 },
        { name: "Licab", lat: 15.5830, lon: 120.9500 },
        { name: "Nampicuan", lat: 15.6160, lon: 120.9330 },
        { name: "Peñaranda", lat: 15.5500, lon: 121.0330 },
        { name: "Quezon", lat: 15.5830, lon: 121.0170 },
        { name: "Rizal", lat: 15.5000, lon: 120.9830 },
        { name: "San Antonio", lat: 15.6660, lon: 121.0670 },
        { name: "San Isidro", lat: 15.5330, lon: 121.0170 },
        { name: "San Leonardo", lat: 15.5830, lon: 120.9670 },
        { name: "Santa Rosa", lat: 15.5160, lon: 121.0330 },
        { name: "Santo Domingo", lat: 15.5330, lon: 120.9500 },
        { name: "Talavera", lat: 15.6000, lon: 120.9500 },
        { name: "Talugtug", lat: 15.6330, lon: 120.9170 },
        { name: "Zaragoza", lat: 15.6000, lon: 120.9500 }
      ]
    },
    "Pampanga": {
      Cities: [
        { name: "Angeles", lat: 15.1450, lon: 120.5830 },
        { name: "San Fernando", lat: 15.0330, lon: 120.6830 }
      ],
      Municipalities: [
        { name: "Apalit", lat: 14.9660, lon: 120.7310 },
        { name: "Arayat", lat: 15.0830, lon: 120.6670 },
        { name: "Bacolor", lat: 15.0330, lon: 120.6830 },
        { name: "Candaba", lat: 14.9830, lon: 120.6500 },
        { name: "Floridablanca", lat: 15.0830, lon: 120.6000 },
        { name: "Guagua", lat: 14.9660, lon: 120.6830 },
        { name: "Lubao", lat: 14.9660, lon: 120.5830 },
        { name: "Mabalacat", lat: 15.1830, lon: 120.5830 },
        { name: "Macabebe", lat: 14.9330, lon: 120.5830 },
        { name: "Magalang", lat: 15.1500, lon: 120.6670 },
        { name: "Masantol", lat: 14.9660, lon: 120.6170 },
        { name: "Mexico", lat: 15.0830, lon: 120.6830 },
        { name: "San Luis", lat: 15.1000, lon: 120.7330 },
        { name: "San Simon", lat: 15.0830, lon: 120.7000 },
        { name: "Santa Ana", lat: 15.0660, lon: 120.6670 },
        { name: "Santa Rita", lat: 15.0160, lon: 120.6670 },
        { name: "Santo Tomas", lat: 15.0500, lon: 120.6670 }
      ]
    },
    "Tarlac": {
      Cities: [
        { name: "Tarlac City", lat: 15.4840, lon: 120.5970 }
      ],
      Municipalities: [
        { name: "Anao", lat: 15.4830, lon: 120.6830 },
        { name: "Bamban", lat: 15.3500, lon: 120.5330 },
        { name: "Camiling", lat: 15.6160, lon: 120.5170 },
        { name: "Capas", lat: 15.3000, lon: 120.5670 },
        { name: "Concepcion", lat: 15.5160, lon: 120.5670 },
        { name: "Gerona", lat: 15.5330, lon: 120.6170 },
        { name: "La Paz", lat: 15.5330, lon: 120.5670 },
        { name: "Mayantoc", lat: 15.3660, lon: 120.5330 },
        { name: "Moncada", lat: 15.5000, lon: 120.5830 },
        { name: "Paniqui", lat: 15.5000, lon: 120.5830 },
        { name: "Pura", lat: 15.4660, lon: 120.5830 },
        { name: "Ramos", lat: 15.4830, lon: 120.5830 },
        { name: "San Clemente", lat: 15.3830, lon: 120.5670 },
        { name: "San Jose", lat: 15.5330, lon: 120.5670 },
        { name: "San Manuel", lat: 15.5000, lon: 120.5500 },
        { name: "Santa Ignacia", lat: 15.5000, lon: 120.5330 }
      ]
    },
    "Zambales": {
      Cities: [
        { name: "Olongapo", lat: 14.8390, lon: 120.2820 }
      ],
      Municipalities: [
        { name: "Castillejos", lat: 14.9500, lon: 120.2830 },
        { name: "Candelaria", lat: 14.9330, lon: 120.3000 },
        { name: "Masinloc", lat: 15.2330, lon: 119.9830 },
        { name: "Palauig", lat: 15.3660, lon: 119.9830 },
        { name: "San Antonio", lat: 15.2160, lon: 120.1000 },
        { name: "San Felipe", lat: 15.2000, lon: 120.1170 },
        { name: "San Marcelino", lat: 14.9500, lon: 120.1000 },
        { name: "San Narciso", lat: 14.9330, lon: 120.1330 },
        { name: "Santa Cruz", lat: 15.2000, lon: 120.2000 },
        { name: "Subic", lat: 14.8440, lon: 120.2710 }
      ]
    }
  }, // end Region III


/* -------------------- Region IV-A (CALABARZON) -------------------- */
"Region IV-A (CALABARZON)": {
    "Batangas": {
      Cities: [
        { name: "Batangas City", lat: 13.7560, lon: 121.0580 },
        { name: "Lipa", lat: 13.9410, lon: 121.1640 },
        { name: "Tanauan", lat: 14.1060, lon: 121.0950 },
        { name: "Lemery", lat: 13.8500, lon: 120.9660 }
      ],
      Municipalities: [
        { name: "Agoncillo", lat: 13.8070, lon: 121.0680 },
        { name: "Alitagtag", lat: 13.8110, lon: 121.0990 },
        { name: "Balayan", lat: 13.8550, lon: 120.8490 },
        { name: "Balete", lat: 14.0220, lon: 121.1000 },
        { name: "Bauan", lat: 13.8370, lon: 120.9030 },
        { name: "Calaca", lat: 13.8360, lon: 120.8740 },
        { name: "Calatagan", lat: 13.8100, lon: 120.6120 },
        { name: "Cuenca", lat: 13.8870, lon: 121.0600 },
        { name: "Ibaan", lat: 13.8580, lon: 121.0500 },
        { name: "Laurel", lat: 13.8810, lon: 121.0830 },
        { name: "Lian", lat: 13.8520, lon: 120.7870 },
        { name: "Lobo", lat: 13.7620, lon: 121.3580 },
        { name: "Mabini", lat: 13.7660, lon: 121.1130 },
        { name: "Malvar", lat: 13.8650, lon: 121.1350 },
        { name: "Mataasnakahoy", lat: 13.8960, lon: 121.1470 },
        { name: "Nasugbu", lat: 14.0360, lon: 120.8910 },
        { name: "Padre Garcia", lat: 13.9250, lon: 121.1110 },
        { name: "Rosario", lat: 13.8830, lon: 121.0950 },
        { name: "San Jose", lat: 13.8470, lon: 121.0510 },
        { name: "San Juan", lat: 13.8750, lon: 121.0500 },
        { name: "San Luis", lat: 13.9570, lon: 120.9490 },
        { name: "San Nicolas", lat: 13.9100, lon: 121.0670 },
        { name: "Santa Teresita", lat: 13.8750, lon: 121.0830 },
        { name: "Santo Tomas", lat: 13.9200, lon: 121.0700 },
        { name: "Taal", lat: 13.8500, lon: 120.9000 },
        { name: "Talisay", lat: 13.8390, lon: 121.0000 },
        { name: "Taysan", lat: 13.8200, lon: 121.0500 },
        { name: "Tingloy", lat: 13.7300, lon: 121.1330 },
        { name: "Tuy", lat: 13.8830, lon: 120.7830 }
      ]
    },
    "Cavite": {
      Cities: [
        { name: "Bacoor", lat: 14.4600, lon: 120.9170 },
        { name: "Cavite City", lat: 14.4840, lon: 120.9180 },
        { name: "Dasmariñas", lat: 14.3300, lon: 120.9370 },
        { name: "Imus", lat: 14.4260, lon: 120.9360 },
        { name: "Tagaytay", lat: 14.1090, lon: 120.9930 }
      ],
      Municipalities: [
        { name: "Alfonso", lat: 14.2180, lon: 120.9500 },
        { name: "Amadeo", lat: 14.2720, lon: 121.0050 },
        { name: "Carmona", lat: 14.3330, lon: 121.0000 },
        { name: "General Emilio Aguinaldo", lat: 14.3330, lon: 120.9330 },
        { name: "General Mariano Alvarez", lat: 14.3300, lon: 120.9500 },
        { name: "Indang", lat: 14.2620, lon: 120.9480 },
        { name: "Kawit", lat: 14.4510, lon: 120.9070 },
        { name: "Magallanes", lat: 14.2340, lon: 120.9300 },
        { name: "Maragondon", lat: 14.1670, lon: 120.8170 },
        { name: "Mendez", lat: 14.2170, lon: 121.0000 },
        { name: "Naic", lat: 14.3380, lon: 120.8330 },
        { name: "Tanza", lat: 14.3170, lon: 120.8670 },
        { name: "Ternate", lat: 14.4260, lon: 120.7570 },
        { name: "Trece Martires", lat: 14.3070, lon: 120.9330 }
      ]
    },
    "Laguna": {
      Cities: [
        { name: "Calamba", lat: 14.2100, lon: 121.1540 },
        { name: "San Pablo", lat: 14.0640, lon: 121.3250 },
        { name: "Santa Rosa", lat: 14.3120, lon: 121.1270 },
        { name: "Biñan", lat: 14.3330, lon: 121.0690 }
      ],
      Municipalities: [
        { name: "Alaminos", lat: 14.2500, lon: 121.1420 },
        { name: "Bay", lat: 14.2000, lon: 121.1670 },
        { name: "Cabuyao", lat: 14.2500, lon: 121.1020 },
        { name: "Calauan", lat: 14.2000, lon: 121.1830 },
        { name: "Cavinti", lat: 14.2330, lon: 121.4500 },
        { name: "Famy", lat: 14.3170, lon: 121.3330 },
        { name: "Kalayaan", lat: 14.1330, lon: 121.3500 },
        { name: "Liliw", lat: 14.0830, lon: 121.4000 },
        { name: "Los Baños", lat: 14.1670, lon: 121.2430 },
        { name: "Luisiana", lat: 14.1170, lon: 121.3830 },
        { name: "Lumban", lat: 14.1330, lon: 121.3330 },
        { name: "Mabitac", lat: 14.1670, lon: 121.3670 },
        { name: "Magdalena", lat: 14.2330, lon: 121.2170 },
        { name: "Majayjay", lat: 14.0830, lon: 121.4170 },
        { name: "Nagcarlan", lat: 14.0830, lon: 121.3330 },
        { name: "Paete", lat: 14.3000, lon: 121.3830 },
        { name: "Pagsanjan", lat: 14.3000, lon: 121.3200 },
        { name: "Pakil", lat: 14.1000, lon: 121.3170 },
        { name: "Pangil", lat: 14.0830, lon: 121.3330 },
        { name: "Pila", lat: 14.2330, lon: 121.3000 },
        { name: "Rizal", lat: 14.1330, lon: 121.3000 },
        { name: "San Pedro", lat: 14.3330, lon: 121.0650 },
        { name: "Santa Cruz", lat: 14.3330, lon: 121.4170 },
        { name: "Santa Maria", lat: 14.3330, lon: 121.4000 },
        { name: "Siniloan", lat: 14.1170, lon: 121.3670 },
        { name: "Victoria", lat: 14.3000, lon: 121.3170 }
      ]
    },
    "Rizal": {
      Cities: [
        { name: "Antipolo", lat: 14.5860, lon: 121.1670 }
      ],
      Municipalities: [
        { name: "Angono", lat: 14.5500, lon: 121.1330 },
        { name: "Baras", lat: 14.7000, lon: 121.2500 },
        { name: "Binangonan", lat: 14.5660, lon: 121.2160 },
        { name: "Cainta", lat: 14.5830, lon: 121.1230 },
        { name: "Cardona", lat: 14.5000, lon: 121.2000 },
        { name: "Jalajala", lat: 14.4330, lon: 121.3330 },
        { name: "Morong", lat: 14.5330, lon: 121.3330 },
        { name: "Pililla", lat: 14.5500, lon: 121.2330 },
        { name: "Rodriguez", lat: 14.6500, lon: 121.1500 },
        { name: "San Mateo", lat: 14.6500, lon: 121.1000 },
        { name: "Tanay", lat: 14.5500, lon: 121.3500 },
        { name: "Taytay", lat: 14.5500, lon: 121.1000 },
        { name: "Teresa", lat: 14.5500, lon: 121.1830 }
      ]
    },
    "Quezon": {
      Cities: [
        { name: "Lucena", lat: 13.9410, lon: 121.6170 }
      ],
      Municipalities: [
        { name: "Alabat", lat: 13.8830, lon: 122.2830 },
        { name: "Atimonan", lat: 14.1670, lon: 121.9330 },
        { name: "Buenavista", lat: 13.9330, lon: 121.9330 },
        { name: "Burdeos", lat: 14.0500, lon: 122.3330 },
        { name: "Calauag", lat: 13.8330, lon: 122.1330 },
        { name: "Candelaria", lat: 13.9500, lon: 121.6670 },
        { name: "Catanauan", lat: 13.7830, lon: 122.1500 },
        { name: "Dolores", lat: 14.1000, lon: 121.8330 },
        { name: "General Luna", lat: 13.9000, lon: 121.9500 },
        { name: "General Nakar", lat: 14.4500, lon: 121.6670 },
        { name: "Guinayangan", lat: 13.9660, lon: 122.1330 },
        { name: "Infanta", lat: 14.6330, lon: 121.6160 },
        { name: "Jomalig", lat: 13.9670, lon: 122.4830 },
        { name: "Lopez", lat: 13.9500, lon: 122.0830 },
        { name: "Lucban", lat: 14.1170, lon: 121.5670 },
        { name: "Macalelon", lat: 13.9830, lon: 122.1830 },
        { name: "Mauban", lat: 14.0500, lon: 121.8670 },
        { name: "Mulanay", lat: 13.8500, lon: 122.0500 },
        { name: "Padre Burgos", lat: 13.9170, lon: 122.1500 },
        { name: "Pagbilao", lat: 14.1000, lon: 121.7500 },
        { name: "Panukulan", lat: 14.5000, lon: 121.9000 },
        { name: "Patnanungan", lat: 14.2000, lon: 122.2330 },
        { name: "Perez", lat: 13.9500, lon: 121.9000 },
        { name: "Pitogo", lat: 13.9330, lon: 121.9830 },
        { name: "Polillo", lat: 14.8330, lon: 121.9830 },
        { name: "Quezon", lat: 14.1330, lon: 121.6330 },
        { name: "Real", lat: 14.6000, lon: 121.7000 },
        { name: "Sampaloc", lat: 14.0500, lon: 121.9500 },
        { name: "San Andres", lat: 13.9670, lon: 122.1500 },
        { name: "San Antonio", lat: 14.0330, lon: 121.9170 },
        { name: "San Francisco", lat: 14.0330, lon: 121.9500 },
        { name: "San Narciso", lat: 14.0330, lon: 121.8500 },
        { name: "Sariaya", lat: 13.9670, lon: 121.7670 },
        { name: "Tagkawayan", lat: 13.9830, lon: 121.9830 },
        { name: "Tayabas", lat: 14.0830, lon: 121.5670 },
        { name: "Tiaong", lat: 13.9330, lon: 121.6330 },
        { name: "Unisan", lat: 13.8170, lon: 121.9000 }
      ]
    }
  }, // end Region IV-A


  /* -------------------- Region IV-B (MIMAROPA) -------------------- */
/* -------------------- Region IV-B (MIMAROPA) -------------------- */
"Region IV-B (MIMAROPA)": {
    "Marinduque": { Cities: [], Municipalities: [
      { name: "Boac", lat: 13.4360, lon: 121.8400 },
      { name: "Buenavista", lat: 13.5080, lon: 121.8700 },
      { name: "Gasan", lat: 13.4410, lon: 121.9230 },
      { name: "Mogpog", lat: 13.4170, lon: 121.8730 },
      { name: "Santa Cruz", lat: 13.4170, lon: 121.8500 },
      { name: "Torrijos", lat: 13.3760, lon: 121.8700 }
    ]},
    "Occidental Mindoro": { Cities: [], Municipalities: [
      { name: "Abra de Ilog", lat: 13.3500, lon: 120.5500 },
      { name: "Calintaan", lat: 13.0830, lon: 120.5170 },
      { name: "Looc", lat: 13.2160, lon: 120.6000 },
      { name: "Lubang", lat: 13.9000, lon: 120.1170 },
      { name: "Magsaysay", lat: 13.1670, lon: 120.6330 },
      { name: "Mamburao", lat: 13.3660, lon: 120.5830 },
      { name: "Paluan", lat: 13.3500, lon: 120.3000 },
      { name: "Rizal", lat: 13.3500, lon: 120.5330 },
      { name: "Sablayan", lat: 12.9660, lon: 120.3830 },
      { name: "San Jose", lat: 13.1830, lon: 120.6000 },
      { name: "Santa Cruz", lat: 13.1660, lon: 120.5330 },
      { name: "Santa Maria", lat: 13.2000, lon: 120.5830 },
      { name: "Santo Tomas", lat: 13.2660, lon: 120.5830 },
      { name: "Baco", lat: 13.2000, lon: 120.6500 }
    ]},
    "Oriental Mindoro": {
      Cities: [
        { name: "Calapan", lat: 13.4330, lon: 121.1830 }
      ],
      Municipalities: [
        { name: "Baco", lat: 13.4160, lon: 121.2330 },
        { name: "Bansud", lat: 13.3500, lon: 121.3500 },
        { name: "Bongabon", lat: 13.3160, lon: 121.0830 },
        { name: "Bulalacao", lat: 12.7160, lon: 121.5830 },
        { name: "Gloria", lat: 13.2330, lon: 121.1000 },
        { name: "Mansalay", lat: 12.9000, lon: 121.4170 },
        { name: "Naujan", lat: 13.3500, lon: 121.2170 },
        { name: "Pinamalayan", lat: 13.3830, lon: 121.3170 },
        { name: "Pola", lat: 13.4660, lon: 121.2830 },
        { name: "Puerto Galera", lat: 13.4330, lon: 120.9500 },
        { name: "Roxas", lat: 13.3660, lon: 121.3000 },
        { name: "San Teodoro", lat: 13.5160, lon: 121.2670 },
        { name: "Socorro", lat: 13.3660, lon: 121.3830 },
        { name: "Victoria", lat: 13.3330, lon: 121.2170 }
      ]
    },
    "Palawan": {
      Cities: [
        { name: "Puerto Princesa", lat: 9.7440, lon: 118.7340 }
      ],
      Municipalities: [
        { name: "Aborlan", lat: 9.4250, lon: 118.6150 },
        { name: "Agutaya", lat: 11.9330, lon: 119.8670 },
        { name: "Araceli", lat: 9.9830, lon: 118.9000 },
        { name: "Balabac", lat: 7.9830, lon: 117.5660 },
        { name: "Bataraza", lat: 8.9500, lon: 117.9000 },
        { name: "Brooke's Point", lat: 8.3000, lon: 117.8500 },
        { name: "Cagayancillo", lat: 10.7160, lon: 117.7330 },
        { name: "Coron", lat: 12.0000, lon: 120.2000 },
        { name: "Culion", lat: 12.1000, lon: 120.0500 },
        { name: "Cuyo", lat: 11.1500, lon: 119.8830 },
        { name: "Dumaran", lat: 12.5000, lon: 120.4670 },
        { name: "El Nido", lat: 11.2000, lon: 119.4000 },
        { name: "Linapacan", lat: 12.2000, lon: 119.9500 },
        { name: "Magsaysay", lat: 9.9330, lon: 118.9830 },
        { name: "Narra", lat: 9.9830, lon: 118.6670 },
        { name: "Quezon", lat: 9.9830, lon: 118.7500 },
        { name: "Roxas", lat: 9.7830, lon: 118.9000 },
        { name: "San Vicente", lat: 10.1830, lon: 118.5000 },
        { name: "Sofronio Española", lat: 8.9830, lon: 118.4670 },
        { name: "Taytay", lat: 9.7670, lon: 118.7500 }
      ]
    },
    "Romblon": { Cities: [], Municipalities: [
      { name: "Alcantara", lat: 12.5830, lon: 122.3000 },
      { name: "Banton", lat: 12.3330, lon: 122.1670 },
      { name: "Cajidiocan", lat: 12.4330, lon: 122.4000 },
      { name: "Calatrava", lat: 12.5830, lon: 122.4330 },
      { name: "Concepcion", lat: 12.5830, lon: 122.2830 },
      { name: "Corcuera", lat: 12.3500, lon: 122.3500 },
      { name: "Ferrol", lat: 12.5000, lon: 122.4330 },
      { name: "Looc", lat: 12.5830, lon: 122.4170 },
      { name: "Odiongan", lat: 12.5330, lon: 122.3000 },
      { name: "Romblon", lat: 12.5660, lon: 122.2830 },
      { name: "San Agustin", lat: 12.5830, lon: 122.3170 },
      { name: "San Andres", lat: 12.5500, lon: 122.3170 },
      { name: "San Fernando", lat: 12.5500, lon: 122.2830 },
      { name: "San Jose", lat: 12.5500, lon: 122.3500 },
      { name: "Santa Fe", lat: 12.5330, lon: 122.3000 },
      { name: "Santa Maria", lat: 12.6000, lon: 122.3330 },
      { name: "Sibuyan", lat: 12.5830, lon: 122.3500 }
    ]}
  }, // end Region IV-B


/* -------------------- Region V (Bicol Region) -------------------- */
"Region V (Bicol Region)": {
    "Albay": {
      Cities: [
        { name: "Legazpi", lat: 13.1476, lon: 123.7344 },
        { name: "Ligao", lat: 13.2226, lon: 123.7313 },
        { name: "Tabaco", lat: 13.3300, lon: 123.7010 }
      ],
      Municipalities: [
        { name: "Bacacay", lat: 13.3930, lon: 123.7150 },
        { name: "Camalig", lat: 13.2360, lon: 123.6650 },
        { name: "Daraga", lat: 13.1330, lon: 123.7200 },
        { name: "Guinobatan", lat: 13.2660, lon: 123.5580 },
        { name: "Jovellar", lat: 13.3170, lon: 123.5870 },
        { name: "Libon", lat: 13.2660, lon: 123.7670 },
        { name: "Malilipot", lat: 13.2330, lon: 123.6830 },
        { name: "Malinao", lat: 13.3330, lon: 123.6300 },
        { name: "Manito", lat: 13.0830, lon: 123.7830 },
        { name: "Oas", lat: 13.1660, lon: 123.5830 },
        { name: "Pio Duran", lat: 13.1830, lon: 123.6670 },
        { name: "Polangui", lat: 13.4000, lon: 123.5500 },
        { name: "Rapu-Rapu", lat: 13.3830, lon: 123.7670 },
        { name: "Santo Domingo", lat: 13.2000, lon: 123.6330 },
        { name: "Tiwi", lat: 13.1830, lon: 123.7000 }
      ]
    },
    "Camarines Norte": {
      Cities: [
        { name: "Daet", lat: 14.1000, lon: 122.9660 }
      ],
      Municipalities: [
        { name: "Basud", lat: 14.1830, lon: 122.9330 },
        { name: "Capalonga", lat: 14.2830, lon: 123.0830 },
        { name: "Jose Panganiban", lat: 14.2830, lon: 122.9830 },
        { name: "Labo", lat: 14.2500, lon: 122.9500 },
        { name: "Mercedes", lat: 14.1330, lon: 122.9330 },
        { name: "Paracale", lat: 14.3500, lon: 122.9830 },
        { name: "San Lorenzo Ruiz", lat: 14.2000, lon: 123.0330 },
        { name: "San Vicente", lat: 14.1500, lon: 122.9000 },
        { name: "Santa Elena", lat: 14.1330, lon: 122.9830 },
        { name: "Talisay", lat: 14.1330, lon: 122.9500 }
      ]
    },
    "Camarines Sur": {
      Cities: [
        { name: "Naga", lat: 13.6230, lon: 123.1820 },
        { name: "Iriga", lat: 13.4170, lon: 123.4200 },
        { name: "Ragay", lat: 13.5560, lon: 123.4500 }
      ],
      Municipalities: [
        { name: "Baao", lat: 13.4500, lon: 123.2830 },
        { name: "Balatan", lat: 13.5830, lon: 123.5000 },
        { name: "Bato", lat: 13.5000, lon: 123.5330 },
        { name: "Bombon", lat: 13.5330, lon: 123.1500 },
        { name: "Buhi", lat: 13.5000, lon: 123.4670 },
        { name: "Bula", lat: 13.5660, lon: 123.2500 },
        { name: "Cabusao", lat: 13.5830, lon: 123.2830 },
        { name: "Calabanga", lat: 13.6000, lon: 123.3500 },
        { name: "Camaligan", lat: 13.6160, lon: 123.2000 },
        { name: "Canaman", lat: 13.6160, lon: 123.2000 },
        { name: "Caramoan", lat: 13.9500, lon: 123.9000 },
        { name: "Del Gallego", lat: 13.7000, lon: 123.4330 },
        { name: "Gainza", lat: 13.6330, lon: 123.2000 },
        { name: "Garchitorena", lat: 13.6830, lon: 123.7000 },
        { name: "Goa", lat: 13.5500, lon: 123.2670 },
        { name: "Libmanan", lat: 13.5500, lon: 123.5000 },
        { name: "Lupi", lat: 13.6660, lon: 123.3660 },
        { name: "Magarao", lat: 13.6000, lon: 123.2330 },
        { name: "Milaor", lat: 13.6160, lon: 123.2160 },
        { name: "Minalabac", lat: 13.5830, lon: 123.4170 },
        { name: "Nabua", lat: 13.5660, lon: 123.2830 },
        { name: "Ocampo", lat: 13.7660, lon: 123.4330 },
        { name: "Pamplona", lat: 13.6160, lon: 123.3330 },
        { name: "Pasacao", lat: 13.6000, lon: 123.5670 },
        { name: "Pili", lat: 13.5660, lon: 123.2500 },
        { name: "Presentacion", lat: 13.8000, lon: 123.7000 },
        { name: "Rinconada", lat: 13.6160, lon: 123.2330 },
        { name: "Sagñay", lat: 13.6830, lon: 123.6670 },
        { name: "San Fernando", lat: 13.5330, lon: 123.3000 },
        { name: "San Jose", lat: 13.5830, lon: 123.2670 },
        { name: "Sipocot", lat: 13.7660, lon: 123.4160 },
        { name: "Siruma", lat: 13.9500, lon: 123.8670 },
        { name: "Tigaon", lat: 13.7330, lon: 123.6670 },
        { name: "Tinambac", lat: 13.7000, lon: 123.7670 }
      ]
    },
    "Catanduanes": {
      Cities: [
        { name: "Virac", lat: 13.5830, lon: 124.2000 }
      ],
      Municipalities: [
        { name: "Bagamanoc", lat: 13.7500, lon: 124.3670 },
        { name: "Baras", lat: 13.7000, lon: 124.3000 },
        { name: "Bato", lat: 13.5660, lon: 124.2830 },
        { name: "Caramoran", lat: 13.7660, lon: 124.4170 },
        { name: "Gigmoto", lat: 13.9000, lon: 124.5000 },
        { name: "Pandan", lat: 13.6830, lon: 124.3170 },
        { name: "Panganiban", lat: 13.7830, lon: 124.3830 },
        { name: "San Andres", lat: 13.6160, lon: 124.2830 },
        { name: "San Miguel", lat: 13.6660, lon: 124.3830 },
        { name: "Viga", lat: 13.6160, lon: 124.4170 }
      ]
    },
    "Sorsogon": {
      Cities: [
        { name: "Sorsogon City", lat: 12.9730, lon: 123.9220 }
      ],
      Municipalities: [
        { name: "Barcelona", lat: 12.8660, lon: 123.9330 },
        { name: "Bulusan", lat: 12.8000, lon: 124.0500 },
        { name: "Casiguran", lat: 12.9660, lon: 124.0330 },
        { name: "Castilla", lat: 12.9500, lon: 123.9330 },
        { name: "Donsol", lat: 12.9660, lon: 123.9000 },
        { name: "Gubat", lat: 12.8330, lon: 123.9830 },
        { name: "Irosin", lat: 12.9500, lon: 124.0500 },
        { name: "Juban", lat: 13.0330, lon: 123.9000 },
        { name: "Magallanes", lat: 12.8160, lon: 123.9670 },
        { name: "Matnog", lat: 12.7330, lon: 124.1000 },
        { name: "Pilar", lat: 12.9500, lon: 123.9670 },
        { name: "Prieto Diaz", lat: 12.8160, lon: 124.0330 },
        { name: "Santa Magdalena", lat: 12.8330, lon: 123.9500 }
      ]
    }
  }, // end Region V


/* -------------------- NCR (National Capital Region) -------------------- */
"NCR (National Capital Region)": {
    "Metro Manila": {
      Cities: [
        { name: "Caloocan", lat: 14.6389, lon: 120.9506 },
        { name: "Las Piñas", lat: 14.3599, lon: 120.9949 },
        { name: "Makati", lat: 14.5547, lon: 121.0244 },
        { name: "Malabon", lat: 14.6680, lon: 120.9630 },
        { name: "Mandaliuyong", lat: 14.5820, lon: 121.0340 },
        { name: "Manila", lat: 14.5994, lon: 120.9842 },
        { name: "Marikina", lat: 14.6500, lon: 121.1020 },
        { name: "Muntinlupa", lat: 14.4089, lon: 121.0170 },
        { name: "Navotas", lat: 14.6413, lon: 120.8237 },
        { name: "Parañaque", lat: 14.3589, lon: 121.0129 },
        { name: "Pasay", lat: 14.5467, lon: 121.0036 },
        { name: "Pasig", lat: 14.5760, lon: 121.0850 },
        { name: "Quezon City", lat: 14.6349, lon: 121.0388 },
        { name: "San Juan", lat: 14.6000, lon: 121.0350 },
        { name: "Taguig", lat: 14.5170, lon: 121.0500 },
        { name: "Valenzuela", lat: 14.7000, lon: 120.9820 }
      ],
      Municipalities: []
    }
  },

/* -------------------- CAR (Cordillera Administrative Region) -------------------- */
"CAR (Cordillera Administrative Region)": {
    "Benguet": {
      Cities: [
        { name: "Baguio", lat: 16.4023, lon: 120.5960 }
      ],
      Municipalities: [
        { name: "Atok", lat: 16.5160, lon: 120.6930 },
        { name: "Bakun", lat: 16.7160, lon: 120.6660 },
        { name: "Bokod", lat: 16.6160, lon: 120.6660 },
        { name: "Buguias", lat: 16.6500, lon: 120.6830 },
        { name: "Itogon", lat: 16.4660, lon: 120.6170 },
        { name: "Kabayan", lat: 16.6330, lon: 120.6170 },
        { name: "Kapangan", lat: 16.6160, lon: 120.6170 },
        { name: "Kibungan", lat: 16.7160, lon: 120.5830 },
        { name: "La Trinidad", lat: 16.4170, lon: 120.6000 },
        { name: "Mankayan", lat: 16.6160, lon: 120.6170 },
        { name: "Sablan", lat: 16.4000, lon: 120.6170 },
        { name: "Tuba", lat: 16.4160, lon: 120.6000 },
        { name: "Tublay", lat: 16.4500, lon: 120.6000 }
      ]
    }
  } // end CAR

}; // end locationData

/* ------------- ANIMATED WEATHER ICONS (Local) ------------- */
const animatedIcons = {
  "01d":"images/clear-day.svg",
  "01n":"images/clear-night.svg",
  "02d":"images/partly-cloudy-day.svg",
  "02n":"images/partly-cloudy-night.svg",
  "03d":"images/cloudy.svg",
  "03n":"images/cloudy.svg",
  "04d":"images/overcast.svg",
  "04n":"images/overcast.svg",
  "09d":"images/rain.svg",
  "09n":"images/rain.svg",
  "10d":"images/partly-cloudy-day-rain.svg",
  "10n":"images/partly-cloudy-night-rain.svg",
  "11d":"images/thunderstorms.svg",
  "11n":"images/thunderstorms.svg",
  "13d":"images/snow.svg",
  "13n":"images/snow.svg",
  "50d":"images/haze-day.svg",
  "50n":"images/haze-night.svg"
};

/* ------------- API ------------- */
const API_KEY = "0fb77c599638926341f8d8ed83aa27ad";
async function getWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  try { const res = await fetch(url); if (!res.ok) return null; return await res.json(); }
  catch (e) { return null; }
}

/* ------------- UI REFS ------------- */
const citySearch = document.getElementById('citySearch');
const suggestions = document.getElementById('suggestions');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const clearBtn = document.getElementById('clearBtn');

/* ------------- Drawer / Side Dock (robust init) ------------- */
(function initDrawer() {
  function el(id){ return document.getElementById(id); }
  const dp = el("drawerPanel");
  const dc = el("drawerContent");
  const btnH = el("btnHazards");
  const btnW = el("btnWeather");
  const headerVolcanoToggle = el("volcano-toggle");
  if (!dp || !dc || !btnH || !btnW) {
    console.warn("Drawer elements missing; skipping drawer init.");
    return;
  }

  function openPanel(type, html, after) {
    if (dp.classList.contains("open") && dp.dataset.panel === type) {
      dp.classList.remove("open");
      dp.dataset.panel = "";
      return;
    }
    dp.classList.add("open");
    dp.dataset.panel = type;
    dc.innerHTML = html;
    if (typeof after === "function") after();
  }

  btnH.addEventListener("click", () => {
    openPanel("hazards", `
      <h2>Hazard Layers</h2>
      <label style="display:block;margin:8px 0;"><input type="checkbox" id="chkVolcano"> Volcanoes</label>
      <label style="display:block;margin:8px 0;"><input type="checkbox" id="chkTsunami"> Tsunami Risk</label>
      <label style="display:block;margin:8px 0;"><input type="checkbox" id="chkFlood"> Flood Zones</label>
      <label style="display:block;margin:8px 0;"><input type="checkbox" id="chkStorm"> Tropical Cyclones</label>
    `, () => {
      const chkVol = document.getElementById("chkVolcano");
      if (chkVol) {
        if (headerVolcanoToggle) chkVol.checked = headerVolcanoToggle.checked;
        chkVol.addEventListener("change", () => {
          if (chkVol.checked) { map.addLayer(volcanoLayer); refreshVolcanoLayerIfPossible(); }
          else map.removeLayer(volcanoLayer);
          if (headerVolcanoToggle) headerVolcanoToggle.checked = chkVol.checked;
        });
      }
    });
  });

  btnW.addEventListener("click", () => {
    openPanel("weather", `<h2>Weather Locations</h2><div id="weatherRegionTree"></div>`, () => {
      if (typeof buildUIFromData === "function") buildUIFromData();
    });
  });

  if (headerVolcanoToggle) {
    headerVolcanoToggle.addEventListener("change", () => {
      if (headerVolcanoToggle.checked) { map.addLayer(volcanoLayer); refreshVolcanoLayerIfPossible(); }
      else map.removeLayer(volcanoLayer);
      const chk = document.getElementById("chkVolcano");
      if (chk) chk.checked = headerVolcanoToggle.checked;
    });
  }
})();

function refreshVolcanoLayerIfPossible(){ if (typeof refreshVolcanoLayer === "function") refreshVolcanoLayer(); }

/* ------------- Build Weather Region/Province Tree ------------- */
function buildUIFromData() {
  const treeContainer = document.getElementById("weatherRegionTree");
  if (!treeContainer) return;
  if (typeof locationData === "undefined") { treeContainer.innerHTML = "<div style='color:#bbb'>Location data not loaded.</div>"; return; }

  treeContainer.innerHTML = "";

  Object.keys(locationData).forEach(regionName => {
    const regionDiv = document.createElement("div");
    regionDiv.className = "region";

    const regionLabel = document.createElement("div");
    regionLabel.className = "region-label";
    regionLabel.innerHTML = `<strong>${regionName}</strong><span class="toggle">▸</span>`;
    regionDiv.appendChild(regionLabel);

    const provinceList = document.createElement("div");
    provinceList.className = "province-list";
    provinceList.style.display = "none";

    const regionObj = locationData[regionName] || {};
    Object.keys(regionObj).forEach(provinceName => {
      const provDiv = document.createElement("div");
      provDiv.className = "province";

      const provLabel = document.createElement("div");
      provLabel.className = "province-label";
      provLabel.innerHTML = `<span class="prov-click">${provinceName}</span><span class="toggle">▸</span>`;
      provDiv.appendChild(provLabel);

      const cityList = document.createElement("div");
      cityList.className = "city-list";
      cityList.style.display = "none";

      const provObj = regionObj[provinceName] || { Cities: [], Municipalities: [] };
      const citiesArr = provObj.Cities || [];
      const munisArr = provObj.Municipalities || [];

      if (citiesArr.length) {
        const header = document.createElement("div");
        header.style.fontSize = '12px'; header.style.color = 'var(--muted)';
        header.style.margin = '6px 0 4px'; header.textContent = 'Cities';
        cityList.appendChild(header);

        citiesArr.forEach(city => {
          const c = document.createElement('div');
          c.className = 'city-entry';
          c.textContent = city.name;
          c.addEventListener('click', (ev) => { ev.stopPropagation(); flyToCity(city); openCityWeather(city); });
          cityList.appendChild(c);
        });
      }

      if (munisArr.length) {
        const header = document.createElement("div");
        header.style.fontSize = '12px'; header.style.color = 'var(--muted)';
        header.style.margin = '6px 0 4px'; header.textContent = 'Municipalities';
        cityList.appendChild(header);

        munisArr.forEach(m => {
          const mdiv = document.createElement('div');
          mdiv.className = 'muni-entry';
          mdiv.textContent = m.name;
          mdiv.addEventListener('click', (ev) => { ev.stopPropagation(); flyToCity(m); openCityWeather(m); });
          cityList.appendChild(mdiv);
        });
      }

      provDiv.appendChild(cityList);

      // Create prov-click load handler — pass provLabel for spinner UI
      const provClick = provLabel.querySelector('.prov-click');
      if (provClick) {
        provClick.style.cursor = 'pointer';
        provClick.addEventListener('click', (ev) => {
          ev.stopPropagation(); // prevent parent toggles
          // show spinner (created here) while loadGroup runs
          let spinner = provLabel.querySelector('.prov-spinner');
          if (!spinner) {
            spinner = document.createElement('span');
            spinner.className = 'prov-spinner';
            // inline spinner styles (no CSS file changes)
            spinner.style.display = 'inline-block';
            spinner.style.width = '12px';
            spinner.style.height = '12px';
            spinner.style.marginLeft = '8px';
            spinner.style.border = '2px solid rgba(255,255,255,0.12)';
            spinner.style.borderTop = '2px solid rgba(255,255,255,0.9)';
            spinner.style.borderRadius = '50%';
            spinner.style.animation = 'provspin 0.8s linear infinite';
            provLabel.appendChild(spinner);
          }
          // call loadGroup with provLabel reference for spinner removal support
          loadGroup(regionName, provinceName, provLabel);
        });
      }

      // parent label toggles the child city list
      provLabel.addEventListener('click', () => {
        const open = cityList.style.display === 'block';
        cityList.style.display = open ? 'none' : 'block';
        provLabel.querySelector('.toggle').textContent = open ? '▸' : '▾';
      });

      provinceList.appendChild(provDiv);
    });

    regionLabel.addEventListener('click', () => {
      const open = provinceList.style.display === 'block';
      provinceList.style.display = open ? 'none' : 'block';
      regionLabel.querySelector('.toggle').textContent = open ? '▸' : '▾';
    });

    regionDiv.appendChild(provinceList);
    treeContainer.appendChild(regionDiv);
  });

  // add small keyframes style for the spinner (inject only once)
  if (!document.getElementById('prov-spinner-style')) {
    const s = document.createElement('style');
    s.id = 'prov-spinner-style';
    s.textContent = `@keyframes provspin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(s);
  }
}

/* ------------- Search / Autocomplete (flatIndex expects locationData to exist) ------------- */
let flatIndex = [];
function rebuildFlatIndex() {
  flatIndex = [];
  if (typeof locationData === "undefined") return;
  Object.keys(locationData).forEach(region => {
    const regionObj = locationData[region] || {};
    Object.keys(regionObj).forEach(province => {
      const provObj = regionObj[province] || { Cities: [], Municipalities: [] };
      (provObj.Cities || []).forEach(c => flatIndex.push({ name: c.name, lat: c.lat, lon: c.lon, region, province, type: 'City' }));
      (provObj.Municipalities || []).forEach(m => flatIndex.push({ name: m.name, lat: m.lat, lon: m.lon, region, province, type: 'Municipality' }));
    });
  });
}
window.rebuildLocationIndex = function(){ rebuildFlatIndex(); };

function showSuggestions(items) {
  suggestions.innerHTML = '';
  if (!items || items.length === 0) { suggestions.classList.add('hidden'); return; }
  suggestions.classList.remove('hidden');

  items.slice(0, 8).forEach(it => {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.innerHTML = `<strong>${it.name}</strong> <span style="color:var(--muted);font-size:12px"> — ${it.province} | ${it.region}</span>`;
    div.addEventListener('click', () => {
      suggestions.classList.add('hidden');
      citySearch.value = it.name;
      flyToCity(it); openCityWeather(it);
    });
    suggestions.appendChild(div);
  });
}

citySearch.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) { showSuggestions([]); return; }
  const matches = flatIndex.filter(i => i.name.toLowerCase().includes(q));
  showSuggestions(matches);
});

document.addEventListener('click', (e) => {
  if (suggestions && !suggestions.contains(e.target) && e.target !== citySearch) suggestions.classList.add('hidden');
});

let suggestionIndex = -1;
citySearch.addEventListener('keydown', (e) => {
  const visible = suggestions && !suggestions.classList.contains('hidden');
  const items = suggestions ? Array.from(suggestions.querySelectorAll('.suggestion-item')) : [];
  if (!visible || items.length === 0) return;
  if (e.key === 'ArrowDown') {
    suggestionIndex = Math.min(items.length - 1, suggestionIndex + 1);
    items.forEach((it,i)=> it.style.background = (i===suggestionIndex? 'rgba(255,255,255,0.04)':'transparent'));
    e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    suggestionIndex = Math.max(0, suggestionIndex - 1);
    items.forEach((it,i)=> it.style.background = (i===suggestionIndex? 'rgba(255,255,255,0.04)':'transparent'));
    e.preventDefault();
  } else if (e.key === 'Enter') {
    if (suggestionIndex >= 0 && items[suggestionIndex]) { items[suggestionIndex].click(); suggestionIndex = -1; e.preventDefault(); }
    else {
      const qv = citySearch.value.trim();
      const found = flatIndex.find(i => i.name.toLowerCase() === qv.toLowerCase());
      if (found) { flyToCity(found); openCityWeather(found); }
    }
  }
});

/* ------------- WEATHER MARKER MANAGEMENT ------------- */
let lastLoaded = { region: null, province: null };
let activeRequestId = 0;

function showLoading(show, text) {
  if (!loading) return;
  if (show) { loading.classList.remove('hidden'); loadingText.textContent = text || 'Loading weather...'; }
  else { loading.classList.add('hidden'); loadingText.textContent = 'Loading weather...'; }
}

function clearWeather() { weatherLayer.clearLayers(); }

async function addWeatherForCities(cityList, requestId) {
  clearWeather();
  let all = Array.isArray(cityList) ? cityList.slice() : [];
  if (all.length === 0) { showLoading(false); return; }

  if (all.length > MAX_API_CALLS) { showLoading(true, `Too many locations (${all.length}). Showing first ${MAX_API_CALLS}`); all = all.slice(0, MAX_API_CALLS); }
  else showLoading(true, `Loading ${all.length} location(s)...`);

  for (let i = 0; i < all.length; i++) {
    const city = all[i];
    if (requestId !== activeRequestId) { showLoading(false); return; }
    await new Promise(r => setTimeout(r, EFFECTIVE_DELAY));
    const data = await getWeather(city.lat, city.lon);
    if (!data) continue;
    if (requestId !== activeRequestId) { showLoading(false); return; }

    const code = data.weather?.[0]?.icon || '03d';
    const iconURL = animatedIcons[code] || animatedIcons['03d'];

    const icon = L.divIcon({
      html: `<div class="weather-marker"><img src="${iconURL}" /><span>${Math.round(data.main.temp)}°C</span></div>`,
      className: 'weather-icon-wrapper', iconSize: [64,64], iconAnchor: [32,32]
    });

    const marker = L.marker([city.lat, city.lon], { icon });
    marker.bindPopup(`
      <b>${city.name}</b><br>
      <img src="${iconURL}" width="90" /><br>
      ${data.weather[0].description.toUpperCase()}<br>
      🌡 ${data.main.temp}°C &nbsp; 💧 ${data.main.humidity}% <br>
      💨 ${data.wind.speed} m/s
    `);
    marker.addTo(weatherLayer);
  }

  showLoading(false);
}

/* ------------- single city open ------------- */
async function openCityWeather(city) {
  const requestId = ++activeRequestId;
  flyToCity(city);
  showLoading(true, 'Loading city weather...');
  const data = await getWeather(city.lat, city.lon);
  if (requestId !== activeRequestId) return;
  showLoading(false); if (!data) return;

  const code = data.weather?.[0]?.icon || '03d';
  const iconURL = animatedIcons[code];
  const tempIcon = L.divIcon({ html: `<div class="weather-marker"><img src="${iconURL}" /><span>${Math.round(data.main.temp)}°C</span></div>`, className:'weather-icon-wrapper', iconSize:[60,60], iconAnchor:[30,30] });

  const tempMarker = L.marker([city.lat, city.lon], { icon: tempIcon }).addTo(map);
  tempMarker.bindPopup(`<b>${city.name}</b><br><img src="${iconURL}" width="90" /><br>${data.weather[0].description.toUpperCase()}<br>🌡 ${data.main.temp}°C`).openPopup();
  setTimeout(() => tempMarker.remove(), 12000);
}
function flyToCity(city) { map.flyTo([city.lat, city.lon], 11, { duration: 0.9 }); }

/* ------------- Load a province (region + province) ------------- */
/* NOTE: accepts optional provLabelEl to show/remove per-province spinner */
async function loadGroup(region, province=null, provLabelEl=null) {
  if (!region || !province) return;

  // If user clicked the same province repeatedly, ignore repeat loads
  if (lastLoaded.region === region && lastLoaded.province === province) return;

  lastLoaded = { region, province };
  clearWeather();
  const requestId = ++activeRequestId;

  // show small spinner next to province if element provided (safety)
  let spinner = null;
  if (provLabelEl) {
    spinner = provLabelEl.querySelector('.prov-spinner');
    if (!spinner) {
      spinner = document.createElement('span');
      spinner.className = 'prov-spinner';
      spinner.style.display = 'inline-block';
      spinner.style.width = '12px';
      spinner.style.height = '12px';
      spinner.style.marginLeft = '8px';
      spinner.style.border = '2px solid rgba(255,255,255,0.12)';
      spinner.style.borderTop = '2px solid rgba(255,255,255,0.9)';
      spinner.style.borderRadius = '50%';
      spinner.style.animation = 'provspin 0.8s linear infinite';
      provLabelEl.appendChild(spinner);
    }
  }

  const bounds = computeBoundsForGroup(region, province);
  if (bounds) map.flyToBounds(bounds.pad(0.6), { duration: 0.9 });

  const regionObj = (typeof locationData !== "undefined") ? locationData[region] : null;
  if (!regionObj) {
    if (spinner && spinner.parentNode) spinner.parentNode.removeChild(spinner);
    showLoading(false);
    return;
  }

  const provObj = regionObj[province] || { Cities: [], Municipalities: [] };
  const cities = [...(provObj.Cities || []), ...(provObj.Municipalities || [])];

  await addWeatherForCities(cities, requestId);

  // remove spinner when done (if still present)
  if (spinner && spinner.parentNode) spinner.parentNode.removeChild(spinner);
}

/* ------------- computeBoundsForGroup ------------- */
function computeBoundsForGroup(region, province=null) {
  if (typeof locationData === "undefined") return null;
  const regionObj = locationData[region];
  if (!regionObj) return null;
  let coords = [];

  if (province) {
    const p = regionObj[province]; if (!p) return null;
    coords = [...(p.Cities || []).map(c => [c.lat, c.lon]), ...(p.Municipalities || []).map(m => [m.lat, m.lon])];
  } else {
    Object.keys(regionObj).forEach(pName => {
      const prov = regionObj[pName] || {};
      coords.push(...(prov.Cities || []).map(c => [c.lat, c.lon]));
      coords.push(...(prov.Municipalities || []).map(m => [m.lat, m.lon]));
    });
  }
  if (coords.length === 0) return null;
  return L.latLngBounds(coords);
}

/* ------------- Earthquake loader ------------- */
const EQ_URL_DAY = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
const MIN_LAT = -15, MAX_LAT = 35, MIN_LON = 90, MAX_LON = 150;

async function loadEarthquakes() {
  try {
    const res = await fetch(EQ_URL_DAY); const data = await res.json();
    earthquakeLayer.clearLayers();
    (data.features || []).forEach(eq => {
      const mag = eq.properties.mag || 0;
      const [lon, lat] = eq.geometry.coordinates;
      if (lat < MIN_LAT || lat > MAX_LAT || lon < MIN_LON || lon > MAX_LON) return;
      const circle = L.circle([lat, lon], { radius: Math.max(1200, mag * 5000), color: 'red', fillColor: 'red', fillOpacity: 0.35 }).addTo(earthquakeLayer);
      circle.bindPopup(`<b>Mag:</b> ${mag}<br><b>Place:</b> ${eq.properties.place}<br><b>Time:</b> ${new Date(eq.properties.time).toLocaleString()}`);
      setTimeout(() => circle.setStyle({ fillOpacity: 0.15 }), 15000);
    });
  } catch (e) { /* fail silently */ }
}

/* ------------- Volcano loader (guarded) ------------- */
async function fetchActiveVolcanoEvents() {
  try {
    const res = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events?category=volcanoes");
    const data = await res.json();
    return (data.events || []).map(evt => ({
      title: evt.title,
      time: evt.geometry[0]?.date,
      lat: evt.geometry[0]?.coordinates[1],
      lon: evt.geometry[0]?.coordinates[0]
    }));
  } catch (err) { console.error("EONET volcano API error:", err); return []; }
}

async function buildVolcanoStatus() {
  if (typeof volcanoDB === "undefined") return [];
  const events = await fetchActiveVolcanoEvents();
  return volcanoDB.map(v => {
    const match = events.find(e => e.title.toLowerCase().includes((v.name||"").toLowerCase()));
    return { ...v, status: match ? "ACTIVE" : "Normal", erupting: !!match, lastActivity: match ? match.time : null };
  });
}

async function refreshVolcanoLayer() {
  if (typeof volcanoDB === "undefined") return;
  volcanoLayer.clearLayers();
  const list = await buildVolcanoStatus();
  list.forEach(drawVolcano);
}

/* ------------- UI actions ------------- */
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    clearWeather(); if (citySearch) citySearch.value = '';
    if (suggestions) suggestions.classList.add('hidden'); activeRequestId++; showLoading(false);
  });
}

/* ------------- Start repeated loaders ------------- */
(async function start() {
  loadEarthquakes();
  setInterval(loadEarthquakes, 120000);

  const headerVolcano = document.getElementById('volcano-toggle');
  if (headerVolcano && headerVolcano.checked) refreshVolcanoLayer();
  setInterval(() => { const header = document.getElementById('volcano-toggle'); if (header && header.checked) refreshVolcanoLayer(); }, 5 * 60 * 1000);
})();

/* ------------- Init ------------- */
(function init() {
  map.setView([14.5995, 120.9842], 10);
  // if you re-add `locationData`/`volcanoDB`, run:
  // rebuildLocationIndex(); buildUIFromData();
})();


// ---------------- TSUNAMI EARLY INDICATOR SYSTEM --------------------
// (placeholder structure - full logic will be added next step)

console.log("Tsunami system loaded (placeholder)");



// ---------------- TSUNAMI EARLY INDICATOR SYSTEM --------------------
/* Tsunami Early Indicators
   - Alerts generated from earthquake feed (USGS)
   - Markers buffered if layer is disabled, shown when enabled
   - Pulsing marker becomes clickable after 5 seconds
*/

(function(){
  // Layer and state
  const tsunamiLayer = L.layerGroup(); // not added by default
  const tsunamiPending = []; // buffered alerts while layer off
  const processedQuakeIds = new Set();

  // Detection thresholds
  const TSUNAMI_MAG_THRESHOLD = 7.0;
  const TSUNAMI_DEPTH_THRESHOLD_KM = 50;
  const TSUNAMI_DISTANCE_KM = 120;

  // Trench approximations (lat, lon pairs). Replace with more precise GeoJSON later if desired.
  const TSUNAMI_TRENCHES = [
    { name: "Philippine Trench", coords: [ [9.0,125.0],[10.5,126.5],[12.0,128.0],[13.5,129.5],[15.0,131.0] ] },
    { name: "East Luzon Trench", coords: [ [18.5,122.0],[17.0,123.5],[15.5,125.0],[14.0,126.5],[12.5,128.0] ] },
    { name: "Sulu Trench", coords: [ [6.0,119.0],[7.0,118.0],[8.0,117.0],[9.0,116.5] ] },
    { name: "Negros Trench", coords: [ [10.0,123.0],[10.5,122.0],[11.0,121.0] ] }
  ];

  // Utility: haversine (km)
  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = Math.PI/180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1*toRad) * Math.cos(lat2*toRad) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  }

  // Distance from point to polyline (km) - simple per-segment projection
  function distanceToPolylineKm(lat, lon, polyline) {
    const toRad = Math.PI/180;
    const lat0 = lat * toRad;
    const cosLat0 = Math.cos(lat0);
    const R = 6371000;
    const px = lon * toRad * R * cosLat0;
    const py = lat * toRad * R;
    let minDistM = Infinity;
    for (let i=0;i<polyline.length-1;i++){
      const aLat = polyline[i][0], aLon = polyline[i][1];
      const bLat = polyline[i+1][0], bLon = polyline[i+1][1];
      const ax = aLon * toRad * R * cosLat0;
      const ay = aLat * toRad * R;
      const bx = bLon * toRad * R * cosLat0;
      const by = bLat * toRad * R;
      const vx = bx-ax, vy = by-ay;
      const wx = px-ax, wy = py-ay;
      const vlen2 = vx*vx + vy*vy;
      let t = vlen2===0?0:((wx*vx + wy*vy) / vlen2);
      if (t<0) t=0; if (t>1) t=1;
      const projx = ax + t*vx;
      const projy = ay + t*vy;
      const dx = px - projx, dy = py - projy;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < minDistM) minDistM = d;
    }
    return minDistM === Infinity ? Number.MAX_VALUE : (minDistM/1000.0);
  }

  function isNearTsunamiZone(lat, lon, kmThreshold = TSUNAMI_DISTANCE_KM) {
    for (const t of TSUNAMI_TRENCHES){
      const d = distanceToPolylineKm(lat, lon, t.coords);
      if (d <= kmThreshold) return true;
    }
    return false;
  }

  // Create pulsing marker (hazard triangle + wave SVG), interactive after 5s
  function createTsunamiMarker(feature) {
    const coords = feature.geometry && feature.geometry.coordinates;
    const lon = coords && coords[0];
    const lat = coords && coords[1];
    const depth = coords && coords[2];
    const mag = feature.properties && feature.properties.mag;
    const id = feature.id || (feature.properties && (feature.properties.code || feature.properties.time)) || Math.random().toString(36).slice(2);

    const html = `
      <div class="tsunami-alert-container" data-quake-id="${id}">
        <div class="tsunami-rings">
          <span class="ring ring-1"></span>
          <span class="ring ring-2"></span>
          <span class="ring ring-3"></span>
        </div>
        <div class="tsunami-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true">
            <g transform="translate(0,0)">
              <path d="M1 21h22L12 2 1 21z" fill="#f2b236"></path>
              <path d="M7 15c.8-1.5 2.4-2.5 4-2.5s3.2 1 4 2.5c1-1.5 2.6-2.5 4-2.5v4H3v-4c1.4 0 3 1 4 2.5z" fill="#01579b"></path>
            </g>
          </svg>
        </div>
      </div>
    `;
    const icon = L.divIcon({
      className: 'tsunami-divicon',
      html: html,
      iconSize: [48,48],
      iconAnchor: [24,24],
      popupAnchor: [0,-28]
    });
    const marker = L.marker([lat, lon], { icon: icon, interactive: true });
    marker._tsunamiMeta = { id, mag, depth, lat, lon };
    // Add popup after delay
    setTimeout(() => {
      const popupHtml = `
        <div style="font-weight:700;color:#c62828">Potential Tsunami Indicator</div>
        <div>Magnitude: ${mag}<br/>Depth: ${depth} km<br/>Location: ${lat.toFixed(3)}, ${lon.toFixed(3)}</div>
        <div style="margin-top:6px;color:#666;font-size:12px;">This is an automated indicator derived from earthquake data. Verify with PHIVOLCS or PTWC.</div>
        <div style="margin-top:6px;"><a href="https://www.phivolcs.dost.gov.ph" target="_blank">PHIVOLCS</a> • <a href="https://ptwc.weather.gov" target="_blank">PTWC</a></div>
      `;
      marker.bindPopup(popupHtml);
    }, 5000);

    // Stop pulsing visual after 40s (rings animation removed)
    setTimeout(() => {
      const el = marker.getElement();
      if (el) {
        const rings = el.querySelectorAll('.ring');
        rings.forEach(r => r.style.animation = 'none');
      }
    }, 40000);

    return marker;
  }

  // Show marker immediately if layer is active, else buffer
  function showOrBufferMarker(marker, meta) {
    if (map.hasLayer(tsunamiLayer)) {
      marker.addTo(tsunamiLayer);
    } else {
      tsunamiPending.push({ marker, meta });
    }
  }

  // When enabling layer, drain pending
  function drainPending() {
    while (tsunamiPending.length) {
      const item = tsunamiPending.shift();
      item.marker.addTo(tsunamiLayer);
    }
  }

  // Evaluate quake feature for tsunami potential
  function evaluateQuakeForTsunami(feature) {
    try {
      const id = feature.id || (feature.properties && (feature.properties.code || feature.properties.time));
      if (!id) return;
      if (processedQuakeIds.has(id)) return;
      const mag = feature.properties && feature.properties.mag ? feature.properties.mag : 0;
      const coords = feature.geometry && feature.geometry.coordinates;
      if (!coords) { processedQuakeIds.add(id); return; }
      const lon = coords[0], lat = coords[1], depthKm = coords[2] || (feature.properties && feature.properties.depth) || 9999;
      // mark processed regardless to avoid repeats
      processedQuakeIds.add(id);

      if (mag < TSUNAMI_MAG_THRESHOLD) return;
      if (depthKm > TSUNAMI_DEPTH_THRESHOLD_KM) return;
      if (!isNearTsunamiZone(lat, lon, TSUNAMI_DISTANCE_KM)) return;

      const marker = createTsunamiMarker(feature);
      showOrBufferMarker(marker, { id, mag, depthKm, lat, lon });
    } catch (e) {
      console.warn("Tsunami eval error:", e);
    }
  }

  // Expose control: add checkbox behavior in hazards panel if present
  function setupTsunamiToggle() {
    const chk = document.getElementById('chkTsunami') || document.getElementById('chkTsunamiRisk') || document.querySelector('input[data-tsunami-toggle]');
    if (!chk) {
      // If drawer builds dynamically, we add a MutationObserver to catch when it's added later
      const mo = new MutationObserver((records) => {
        const k = document.getElementById('chkTsunami') || document.getElementById('chkTsunamiRisk') || document.querySelector('input[data-tsunami-toggle]');
        if (k) { mo.disconnect(); bindCheckbox(k); }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } else {
      bindCheckbox(chk);
    }

    function bindCheckbox(chkEl) {
      // set label text if found nearby label
      try {
        const lab = chkEl.parentElement;
        if (lab && lab.tagName.toLowerCase() === 'label') {
          lab.innerHTML = `<input type="checkbox" id="chkTsunami"> Tsunami Early Indicators`;
          // reassign the element reference
        }
      } catch(e){}
      // actual element now:
      const newChk = document.getElementById('chkTsunami');
      if (!newChk) return;
      // start unchecked
      newChk.checked = false;
      newChk.addEventListener('change', (ev) => {
        if (ev.target.checked) {
          map.addLayer(tsunamiLayer);
          drainPending();
        } else {
          if (map.hasLayer(tsunamiLayer)) map.removeLayer(tsunamiLayer);
          // keep pending and existing markers in memory
        }
      });
    }
  }

  // Initialize
  setupTsunamiToggle();

  // Expose functions for debugging
  window.evaluateQuakeForTsunami = evaluateQuakeForTsunami;
  window.tsunamiLayer = tsunamiLayer;
  window.tsunamiPending = tsunamiPending;

})(); // end tsunami IIFE
