// routes/crops.js  ─── Pesticide & fertilizer data per crop
'use strict';

const express = require('express');
const router  = express.Router();

// ── Full crop care database ──
const CROP_DATA = {
  wheat: {
    name: 'Wheat', emoji: '🌾',
    season: 'Rabi (Oct–Mar)',
    pest_diseases: [
      { name: 'Yellow Rust (Stripe Rust)', pathogen: 'Puccinia striiformis', symptoms: 'Yellow stripe-shaped pustules on leaves running parallel to veins. Leaves turn yellow.', risk: 'high' },
      { name: 'Powdery Mildew', pathogen: 'Blumeria graminis', symptoms: 'White powdery patches on upper leaf surface. Leaves may curl and wither.', risk: 'medium' },
      { name: 'Aphids', pathogen: 'Insect — Rhopalosiphum padi', symptoms: 'Clusters of green/black insects on flag leaf and spike. Yellowing, stunted growth.', risk: 'medium' },
    ],
    pesticides: [
      { name: 'Propiconazole 25% EC', type: 'Fungicide', target: 'Rust, powdery mildew', dose: '0.1% solution (1 mL/L)', timing: 'Flag leaf stage, at first symptom', risk: 'moderate', preharvest_days: 21 },
      { name: 'Mancozeb 75% WP',      type: 'Fungicide', target: 'Leaf blight, rust',    dose: '2 g/L',                   timing: 'Every 10–12 days preventively', risk: 'low',      preharvest_days: 15 },
      { name: 'Chlorpyrifos 20% EC',  type: 'Insecticide',target: 'Aphids, termites',   dose: '2.5 mL/L, 400–600 L/ha',  timing: 'At pest appearance',           risk: 'high',     preharvest_days: 30 },
    ],
    fertilizers: [
      { name: 'Urea (46% N)',      schedule: 'Basal 100 kg/ha + tillering 30 kg/ha', dose: '130 kg/ha total', stage: 'Sowing + 21 DAS', notes: 'Split for better efficiency. Avoid at flowering.' },
      { name: 'DAP (18-46-0)',     schedule: 'Basal at sowing',                       dose: '100 kg/ha',        stage: 'Sowing',           notes: 'Provides phosphorus for strong root development.' },
      { name: 'Zinc Sulphate',     schedule: 'Soil application',                      dose: '25 kg/ha',         stage: 'Pre-sowing',       notes: 'Only in zinc-deficient soils. Do soil test first.' },
      { name: 'Potash (MOP 60%)', schedule: 'Basal',                                  dose: '40 kg/ha',         stage: 'Sowing',           notes: 'Critical for grain filling and lodging resistance.' },
    ],
    schedule: [
      { week: 0,  activity: 'Soil test + field prep',      inputs: 'Zinc Sulphate 25 kg/ha (if deficient)' },
      { week: 1,  activity: 'Sowing',                      inputs: 'DAP 100 kg/ha + MOP 40 kg/ha (basal)' },
      { week: 3,  activity: 'Urea top-dressing',           inputs: 'Urea 50 kg/ha' },
      { week: 6,  activity: 'Irrigation + pest monitoring',inputs: 'Scout for aphids — spray if > 10/tiller' },
      { week: 9,  activity: 'Second N top-dressing',       inputs: 'Urea 50 kg/ha at flag leaf' },
      { week: 10, activity: 'Rust spray if detected',      inputs: 'Propiconazole 1 mL/L' },
      { week: 15, activity: 'Harvest',                     inputs: 'Moisture < 14% before threshing' },
    ]
  },
  rice: {
    name: 'Rice / Paddy', emoji: '🍚',
    season: 'Kharif (Jun–Nov)',
    pest_diseases: [
      { name: 'Rice Blast', pathogen: 'Magnaporthe oryzae', symptoms: 'Diamond-shaped lesions with grey centre and brown border on leaves. Neck rot kills panicle.', risk: 'high' },
      { name: 'Brown Planthopper (BPH)', pathogen: 'Nilaparvata lugens (insect)', symptoms: 'Circular "hopperburn" patches — plants turn brown and dry. Honeydew sticky on leaves.', risk: 'high' },
      { name: 'Sheath Blight', pathogen: 'Rhizoctonia solani', symptoms: 'Oval greenish-grey lesions with brown margins on leaf sheath. Spreads upward.', risk: 'medium' },
    ],
    pesticides: [
      { name: 'Tricyclazole 75% WP',   type: 'Fungicide',   target: 'Rice blast',      dose: '0.6 g/L',        timing: 'Panicle initiation + heading', risk: 'low',      preharvest_days: 21 },
      { name: 'Buprofezin 25% SC',     type: 'Insecticide', target: 'BPH, whitebacked planthopper', dose: '1 mL/L', timing: '2nd instar nymph stage', risk: 'medium', preharvest_days: 14 },
      { name: 'Cartap HCl 4G',         type: 'Insecticide', target: 'Stem borer',      dose: '18 kg/ha (granular)', timing: '25 & 45 DAT',           risk: 'medium',   preharvest_days: 21 },
      { name: 'Hexaconazole 5% EC',    type: 'Fungicide',   target: 'Sheath blight',   dose: '2 mL/L',         timing: 'At first symptom (tillering)', risk: 'low',   preharvest_days: 14 },
    ],
    fertilizers: [
      { name: 'Urea (46% N)',      schedule: '3 splits: basal/tillering/panicle', dose: '120 kg/ha', stage: 'Sowing + 25 + 50 DAT', notes: 'Never apply at flooding. Gives best N use efficiency.' },
      { name: 'SSP (Single Super Phosphate)', schedule: 'Basal', dose: '500 kg/ha', stage: 'Before transplanting', notes: 'Provides P + S. Mix into soil well.' },
      { name: 'MOP (Potash)',      schedule: 'Split: basal + panicle', dose: '60 kg/ha', stage: 'Transplanting + 40 DAT', notes: 'Critical for lodging resistance and grain quality.' },
    ],
    schedule: [
      { week: 0,  activity: 'Nursery sowing',             inputs: 'Treat seed with Tricyclazole 2 g/kg' },
      { week: 3,  activity: 'Main field prep + basal fert',inputs: 'SSP 500 kg/ha + MOP 30 kg/ha' },
      { week: 4,  activity: 'Transplanting (25-day nursery)',inputs: 'Urea 40 kg/ha (basal)' },
      { week: 7,  activity: 'Urea top-dress (tillering)',  inputs: 'Urea 40 kg/ha' },
      { week: 9,  activity: 'Stem borer monitoring',       inputs: 'Cartap HCl if dead hearts > 5%' },
      { week: 12, activity: 'Panicle initiation fert + blast spray', inputs: 'Urea 40 kg/ha + Tricyclazole 0.6 g/L' },
      { week: 18, activity: 'Harvest at 80–85% grain ripening', inputs: 'Drain field 10 days before harvest' },
    ]
  },
  cotton: {
    name: 'Cotton', emoji: '🌹',
    season: 'Kharif (May–Dec)',
    pest_diseases: [
      { name: 'Pink Bollworm', pathogen: 'Pectinophora gossypiella (insect)', symptoms: 'Rosetted flowers, damaged bolls, pink larvae inside bolls, square fall.', risk: 'high' },
      { name: 'Whitefly & Leaf Curl Virus', pathogen: 'Bemisia tabaci + CLCuV', symptoms: 'Leaf curling, vein thickening, stunting, sooty mould. Vector for Cotton Leaf Curl.', risk: 'high' },
      { name: 'Fusarium Wilt', pathogen: 'Fusarium oxysporum f.sp. vasinfectum', symptoms: 'Yellowing starting from lower leaves, vascular browning on stem cross-section.', risk: 'medium' },
    ],
    pesticides: [
      { name: 'Spinosad 45% SC',         type: 'Insecticide', target: 'Bollworm, thrips', dose: '0.5 mL/L',   timing: 'At 1st instar larvae on bolls', risk: 'low',    preharvest_days: 3  },
      { name: 'Imidacloprid 17.8% SL',   type: 'Insecticide', target: 'Whitefly, jassids',dose: '0.5 mL/L foliar / 7 mL/kg seed', timing: 'At pest appearance', risk: 'medium', preharvest_days: 21 },
      { name: 'Profenofos 50% EC',        type: 'Insecticide', target: 'Whitefly, thrips',dose: '2 mL/L',     timing: 'Max 2 sprays/season',          risk: 'high',   preharvest_days: 14 },
      { name: 'Trichoderma viride',       type: 'Bioagent',    target: 'Fusarium wilt',   dose: '4 g/kg seed or 2.5 kg/ha soil', timing: 'Seed treatment + soil',  risk: 'none', preharvest_days: 0  },
    ],
    fertilizers: [
      { name: 'NPK 19:19:19',  schedule: 'Foliar at vegetative stage', dose: '5 g/L', stage: '45 days',      notes: 'Balanced nutrition for rapid vegetative growth.' },
      { name: 'Urea + MOP',    schedule: 'At boll development',         dose: '60+30 kg/ha', stage: 'Boll set', notes: 'Critical for fibre length and strength.' },
      { name: 'Boron 20%',     schedule: 'Foliar at boll formation',    dose: '0.1% (1 g/L)', stage: 'Boll set', notes: 'Prevents boll shedding. Do not over-apply — toxic at high doses.' },
      { name: 'Calcium Nitrate',schedule: 'Foliar',                     dose: '5 g/L',        stage: 'Boll fill', notes: 'Improves boll retention and lint quality.' },
    ],
    schedule: [
      { week: 0,  activity: 'Field prep + basal fertilizer', inputs: 'FYM 10 t/ha + SSP 250 kg/ha' },
      { week: 1,  activity: 'Sowing (Bt cotton recommended)', inputs: 'Seed treatment: Imidacloprid 7 mL/kg + Trichoderma 4 g/kg' },
      { week: 4,  activity: 'Thinning + Urea (basal)',        inputs: 'Urea 50 kg/ha' },
      { week: 6,  activity: 'NPK foliar spray',               inputs: 'NPK 19:19:19 @ 5 g/L' },
      { week: 9,  activity: 'Whitefly monitoring',            inputs: 'Use yellow sticky traps; spray Imidacloprid if threshold crossed' },
      { week: 12, activity: 'Bollworm monitoring + spray',    inputs: 'Spinosad 0.5 mL/L at first instar' },
      { week: 14, activity: 'Boron foliar',                   inputs: 'Boron 1 g/L at boll formation' },
      { week: 22, activity: 'Picking (3 rounds)',             inputs: 'Pick at 95% boll opening' },
    ]
  },
  soybean: {
    name: 'Soybean', emoji: '🫘',
    season: 'Kharif (Jun–Oct)',
    pest_diseases: [
      { name: 'Soybean Rust', pathogen: 'Phakopsora pachyrhizi', symptoms: 'Yellow-brown pustules on lower leaf surface. Rapid defoliation. Yield loss up to 80% if untreated.', risk: 'high' },
      { name: 'Girdle Beetle', pathogen: 'Obereopsis brevis (insect)', symptoms: 'Two girdles on stem causing wilting of branch tip. Larvae tunnel inside stem.', risk: 'high' },
      { name: 'Yellow Mosaic Virus', pathogen: 'MYMV (via whitefly)', symptoms: 'Yellow-green mosaic pattern on leaves, distortion, stunting. Whitefly vectored.', risk: 'high' },
    ],
    pesticides: [
      { name: 'Tebuconazole 25.9% EC',       type: 'Fungicide',   target: 'Soybean rust',     dose: '1 mL/L',     timing: 'First pustule appearance — DO NOT DELAY', risk: 'medium', preharvest_days: 21 },
      { name: 'Chlorantraniliprole 18.5% SC', type: 'Insecticide', target: 'Girdle beetle, pod borer', dose: '0.3 mL/L', timing: 'At pod fill stage',    risk: 'low',    preharvest_days: 7  },
      { name: 'Thiamethoxam 25% WG',          type: 'Insecticide', target: 'Whitefly (YMV vector)', dose: '0.3 g/L foliar', timing: 'Early vegetative',  risk: 'medium', preharvest_days: 14 },
      { name: 'Hexaconazole + Captan',         type: 'Fungicide',   target: 'Collar rot, rust', dose: '2 g/kg seed',timing: 'Seed treatment',             risk: 'low',    preharvest_days: 0  },
    ],
    fertilizers: [
      { name: 'Rhizobium japonicum', schedule: 'Seed inoculation before sowing', dose: '200 g/10 kg seed', stage: 'Pre-sowing', notes: 'Fixes 80–100 kg N/ha. Eliminates need for N fertilizer.' },
      { name: 'SSP (Single Super Phosphate)', schedule: 'Basal at sowing', dose: '400 kg/ha', stage: 'Sowing', notes: 'Provides P + S. Critical for nodulation. Do not mix with Rhizobium.' },
      { name: 'MOP (Potash)',        schedule: 'Basal at sowing',       dose: '50 kg/ha',    stage: 'Sowing',     notes: 'Improves pod fill and seed quality.' },
      { name: 'Zn+B+Mo Micronutrient Mix', schedule: 'Foliar at flowering', dose: '2 g/L', stage: '40–45 DAS', notes: 'Check soil pH (should be 6.5–7.2). Molybdenum is critical for N fixation.' },
    ],
    schedule: [
      { week: 0,  activity: 'Seed treatment',         inputs: 'Rhizobium 200 g/10 kg + Thiram 3 g/kg' },
      { week: 1,  activity: 'Sowing + basal fertilizer',inputs: 'SSP 400 kg/ha + MOP 50 kg/ha' },
      { week: 3,  activity: 'Thinning + weeding',     inputs: 'Gap-fill if needed; inter-row cultivation' },
      { week: 6,  activity: 'Micronutrient spray',    inputs: 'Zn+B+Mo 2 g/L at early flower' },
      { week: 7,  activity: 'Rust scouting',          inputs: 'Inspect underside of leaves weekly. Spray Tebuconazole at first pustule.' },
      { week: 9,  activity: 'Pod borer management',   inputs: 'Chlorantraniliprole 0.3 mL/L at pod fill' },
      { week: 14, activity: 'Harvest at 95% pod maturity',inputs: 'Moisture < 13%' },
    ]
  },
  tomato: {
    name: 'Tomato', emoji: '🍅',
    season: 'Year-round (best Oct–Feb)',
    pest_diseases: [
      { name: 'Late Blight', pathogen: 'Phytophthora infestans', symptoms: 'Water-soaked brown lesions on leaves, stems and fruit. White sporulation on lower surface in humid conditions.', risk: 'high' },
      { name: 'Tomato Leaf Curl Virus (ToLCV)', pathogen: 'Begomovirus via whitefly', symptoms: 'Leaf curling, chlorosis, stunting, reduced fruit set. Vector: whitefly Bemisia tabaci.', risk: 'high' },
      { name: 'Fruit Borer', pathogen: 'Helicoverpa armigera (insect)', symptoms: 'Circular entry holes in fruit. Larvae feed inside. Frass visible at entry point.', risk: 'high' },
    ],
    pesticides: [
      { name: 'Metalaxyl + Mancozeb 72% WP', type: 'Fungicide',   target: 'Late blight (preventive)', dose: '2.5 g/L', timing: 'Every 7–10 days from vegetative stage', risk: 'medium', preharvest_days: 7  },
      { name: 'Abamectin 1.9% EC',           type: 'Acaricide',   target: 'Mites, leaf miners',       dose: '0.5 mL/L', timing: 'At mite/miner appearance',           risk: 'medium', preharvest_days: 7  },
      { name: 'Copper Oxychloride 50% WP',   type: 'Fungicide',   target: 'Bacterial wilt, leaf curl', dose: '3 g/L',   timing: 'Weekly preventive',                  risk: 'low',    preharvest_days: 5  },
      { name: 'Emamectin Benzoate 5% SG',    type: 'Insecticide', target: 'Fruit borer, leaf miner',  dose: '0.4 g/L',  timing: 'At egg hatching stage',              risk: 'low',    preharvest_days: 5  },
      { name: 'Imidacloprid 17.8% SL',       type: 'Insecticide', target: 'Whitefly (ToLCV vector)',  dose: '0.5 mL/L', timing: 'Early vegetative; max 2×/season',    risk: 'medium', preharvest_days: 21 },
    ],
    fertilizers: [
      { name: 'NPK 6:24:24 + Ca', schedule: 'Transplanting stage', dose: '50 kg/ha', stage: 'Transplanting', notes: 'High P and K for root establishment. Calcium reduces Blossom End Rot.' },
      { name: 'Urea top-dress',   schedule: 'Vegetative growth',   dose: '50 kg/ha split', stage: '20 & 40 DAT', notes: 'Do not over-apply N — causes excessive foliage and poor fruit set.' },
      { name: 'Calcium Nitrate',  schedule: 'Drip irrigation',     dose: '5 kg/1000 L',   stage: 'Fruit setting', notes: 'Prevents BER, increases fruit firmness and shelf life.' },
      { name: 'Potassium Humate', schedule: 'Soil drench',         dose: '2 kg/ha',       stage: 'Monthly',       notes: 'Improves water and nutrient retention. Especially useful in sandy soils.' },
      { name: 'Boron + Zinc foliar', schedule: 'Foliar spray',     dose: '1.5 g/L',       stage: 'Flower bud stage', notes: 'Prevents flower drop and improves fruit set.' },
    ],
    schedule: [
      { week: 0,  activity: 'Nursery sowing',              inputs: 'Use certified, disease-free seed' },
      { week: 4,  activity: 'Field prep + transplanting',  inputs: 'FYM 20 t/ha + NPK 6:24:24 50 kg/ha' },
      { week: 5,  activity: 'Stake & mulch',               inputs: 'Staking prevents lodging; black mulch conserves moisture' },
      { week: 6,  activity: 'Urea 1st split',              inputs: 'Urea 25 kg/ha' },
      { week: 7,  activity: 'Late blight spray (preventive)', inputs: 'Metalaxyl+Mancozeb 2.5 g/L' },
      { week: 8,  activity: 'Whitefly monitoring',         inputs: 'Yellow sticky traps; spray Imidacloprid if > 10/leaf' },
      { week: 9,  activity: 'Calcium drip + Boron foliar', inputs: 'Ca Nitrate 5 kg/1000 L; Boron 1.5 g/L' },
      { week: 11, activity: 'Urea 2nd split + fruit borer',inputs: 'Urea 25 kg/ha; Emamectin 0.4 g/L if borers seen' },
      { week: 14, activity: 'Harvest (1st pick)',           inputs: 'Pick at breaker stage for distant markets, red for local' },
    ]
  }
};

// GET /api/crops  ─── list all crops
router.get('/', (req, res) => {
  const list = Object.entries(CROP_DATA).map(([key,v]) => ({
    key, name: v.name, emoji: v.emoji, season: v.season
  }));
  res.json({ crops: list });
});

// GET /api/crops/:crop  ─── full crop data
router.get('/:crop', (req, res) => {
  const key  = req.params.crop.toLowerCase();
  const data = CROP_DATA[key];
  if (!data) return res.status(404).json({ error: `No data found for crop: ${key}` });
  res.json({ crop: key, data });
});

// GET /api/crops/:crop/pesticides
router.get('/:crop/pesticides', (req, res) => {
  const data = CROP_DATA[req.params.crop.toLowerCase()];
  if (!data) return res.status(404).json({ error: 'Crop not found.' });
  res.json({ pesticides: data.pesticides, diseases: data.pest_diseases });
});

// GET /api/crops/:crop/fertilizers
router.get('/:crop/fertilizers', (req, res) => {
  const data = CROP_DATA[req.params.crop.toLowerCase()];
  if (!data) return res.status(404).json({ error: 'Crop not found.' });
  res.json({ fertilizers: data.fertilizers, schedule: data.schedule });
});

module.exports = router;
