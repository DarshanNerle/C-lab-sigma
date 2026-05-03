import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  Beaker,
  BookOpenText,
  BrainCircuit,
  Calculator,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  Eraser,
  FlaskConical,
  FileText,
  Gauge,
  Maximize2,
  Minimize2,
  MoonStar,
  NotebookPen,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  SunMedium,
  ThermometerSun,
  WandSparkles,
  X
} from 'lucide-react';
import { useThemeContext } from '../context/ThemeContext';
import useAuthStore from '../store/useAuthStore';
import WorkspacePanel from '../components/experiment-lab/WorkspacePanel';
import LabSessionController from '../components/lab2D/LabSessionController';
import useGameStore from '../store/useGameStore';
import {
  MAX_UPLOAD_SIZE_BYTES,
  normalizeUploadFileName,
  readUploadedExperimentText,
  validateUploadFile
} from '../utils/experimentUtils';
import { db } from '../firebase/config';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import experiment1 from '../data/experiments/experiment1.json';
import experiment2 from '../data/experiments/experiment2.json';
import experiment3 from '../data/experiments/experiment3.json';
import experiment4 from '../data/experiments/experiment4.json';
import './ExperimentLab.css';

const BUILTIN_EXPERIMENTS = [experiment1, experiment2, experiment3, experiment4];
const CUSTOM_EXPERIMENTS_KEY = 'c-lab-custom-experiments-v2';

const WORKFLOW_TABS = [
  { id: 'info', label: 'Info', icon: BookOpenText },
  { id: 'apparatus', label: 'Apparatus', icon: FlaskConical },
  { id: 'procedure', label: 'Procedure', icon: ShieldCheck },
  { id: 'virtual', label: 'Virtual Lab', icon: Beaker },
  { id: 'observation', label: 'Observation', icon: NotebookPen },
  { id: 'result', label: 'Result', icon: Calculator }
];

const INSTRUMENT_GROUPS = [
  {
    id: 'glassware',
    title: 'Glassware',
    items: [
      { id: 'beaker', label: 'Beaker', hint: 'Mix and hold solutions' },
      { id: 'burette', label: 'Burette', hint: 'Precise titration delivery' },
      { id: 'pipette', label: 'Pipette', hint: 'Transfer fixed volume' },
      { id: 'conical_flask', label: 'Flask', hint: 'Reaction vessel' },
      { id: 'test_tube', label: 'Test Tube', hint: 'Small reaction tube' }
    ]
  },
  {
    id: 'analysis',
    title: 'Analysis',
    items: [
      { id: 'thermometer', label: 'Thermometer', hint: 'Monitor temperature' },
      { id: 'ph_meter', label: 'pH Meter', hint: 'Measure acidity' },
      { id: 'conductivity_meter', label: 'Conductometer', hint: 'Measure conductivity' },
      { id: 'dropper', label: 'Dropper', hint: 'Add indicators' }
    ]
  },
  {
    id: 'support',
    title: 'Support',
    items: [
      { id: 'stand_clamp', label: 'Stand', hint: 'Hold burette upright' },
      { id: 'bunsen_burner', label: 'Burner', hint: 'Heat the vessel' },
      { id: 'magnetic_stirrer', label: 'Stirrer', hint: 'Mix uniformly' }
    ]
  }
];

const CHEMICAL_LIBRARY = [
  {
    id: 'acids',
    label: 'Acids',
    items: [
      { id: 'hcl', formula: 'HCl', name: 'Hydrochloric Acid', color: '#f7fbff' },
      { id: 'h2so4', formula: 'H2SO4', name: 'Sulfuric Acid', color: '#f4f0d7' },
      { id: 'hno3', formula: 'HNO3', name: 'Nitric Acid', color: '#fdf7dd' },
      { id: 'edta_acid', formula: 'H4EDTA', name: 'EDTA Acid', color: '#eef7ff' },
      { id: 'acetic_acid', formula: 'CH3COOH', name: 'Acetic Acid', color: '#ffffff' },
      { id: 'citric_acid', formula: 'C6H8O7', name: 'Citric Acid', color: '#fff6d8' }
    ]
  },
  {
    id: 'bases',
    label: 'Bases',
    items: [
      { id: 'naoh', formula: 'NaOH', name: 'Sodium Hydroxide', color: '#fbfdff' },
      { id: 'koh', formula: 'KOH', name: 'Potassium Hydroxide', color: '#f7fcff' },
      { id: 'nh4oh', formula: 'NH4OH', name: 'Ammonium Hydroxide', color: '#edfaff' },
      { id: 'ammonia_buffer', formula: 'NH3/NH4Cl', name: 'Ammonia Buffer Solution', color: '#e6fbff' }
    ]
  },
  {
    id: 'indicators',
    label: 'Indicators',
    items: [
      { id: 'phenolphthalein', formula: 'PhPh', name: 'Phenolphthalein', color: '#ffffff' },
      { id: 'methyl_orange', formula: 'MO', name: 'Methyl Orange', color: '#ffa500' },
      { id: 'ebt', formula: 'EBT', name: 'Eriochrome Black T', color: '#5b21b6' },
      { id: 'bromothymol_blue', formula: 'BTB', name: 'Bromothymol Blue', color: '#4aa8ff' },
      { id: 'litmus', formula: 'Litmus', name: 'Litmus', color: '#7c3aed' },
      { id: 'universal_indicator', formula: 'UI', name: 'Universal Indicator', color: '#22c55e' }
    ]
  },
  {
    id: 'salts',
    label: 'Salts',
    items: [
      { id: 'cuso4', formula: 'CuSO4', name: 'Copper Sulfate', color: '#1e78ff' },
      { id: 'kmno4', formula: 'KMnO4', name: 'Potassium Permanganate', color: '#6f1d9b' },
      { id: 'agno3', formula: 'AgNO3', name: 'Silver Nitrate', color: '#fcfdff' }
    ]
  },
  {
    id: 'solvents',
    label: 'Solvents',
    items: [
      { id: 'water', formula: 'H2O', name: 'Distilled Water', color: '#92d8ff' },
      { id: 'tap_water', formula: 'Tap H2O', name: 'Tap Water', color: '#a9ddff' },
      { id: 'river_water', formula: 'River H2O', name: 'River Water', color: '#8fd4c5' },
      { id: 'ethanol', formula: 'C2H5OH', name: 'Ethanol', color: '#ecfbff' }
    ]
  }
];

const APPARATUS_ASCII = {
  beaker: ' _______\\n|       |\\n|       |\\n|       |\\n|_______|',
  burette: '  |\\n  |\\n  |\\n--O--\\n  |\\n  v',
  pipette: '----( )----\\n     |\\n     v',
  conical_flask: '    __\\n   /  \\\\\\n  /    \\\\\\n /      \\\\\\n/________\\\\\\\\\\n    ||',
  test_tube: '  __\\n |  |\\n |  |\\n |  |\\n |__|',
  bunsen_burner: '   /\\\\\\\\\\n   ||\\n   ||\\n  /  \\\\\\n /____\\\\\\\\',
  thermometer: ' |\\n |\\n |\\n(O)',
  ph_meter: ' ______\\n| pH 7 |\\n|______|\\n   |\\n   |',
  conductivity_meter: ' ________\\n| Cond. |\\n| 1.20 |\\n|______|\\n   |\\n   |',
  stand_clamp: '   |\\n --O--\\n   |\\n  _|_',
  magnetic_stirrer: ' _______\\n| ----- |\\n|_______|',
  dropper: '  __\\n /  \\\\\\n |  |\\n  \\\\/',
  default: '[ apparatus ]'
};

const DEFAULT_FORM = {
  title: '',
  aim: '',
  theory: '',
  apparatus: 'Burette\\nPipette\\nConical Flask\\nBeaker\\nStand',
  chemicals: 'HCl\\nNaOH\\nPhenolphthalein',
  procedure: 'Rinse the burette with NaOH.\\nFill burette with NaOH.\\nPipette acid into flask.\\nAdd indicator.\\nStart titration slowly.\\nLog the endpoint.',
  formula: 'M1V1 = M2V2',
  resultMethod: 'Average concordant readings and calculate the unknown concentration.',
  difficultyLevel: 'Beginner'
};

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function listFromValue(value) {
  return String(value || '')
    .split(/\\r?\\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function loadCustomExperiments() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_EXPERIMENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomExperiments(experiments) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CUSTOM_EXPERIMENTS_KEY, JSON.stringify(experiments));
  } catch {
    // best effort
  }
}

const apparatusAliases = [
  { match: ['burette', 'buret'], value: 'burette' },
  { match: ['pipette'], value: 'pipette' },
  { match: ['beaker'], value: 'beaker' },
  { match: ['flask', 'conical'], value: 'conical_flask' },
  { match: ['test tube'], value: 'test_tube' },
  { match: ['burner'], value: 'bunsen_burner' },
  { match: ['thermometer'], value: 'thermometer' },
  { match: ['ph meter'], value: 'ph_meter' },
  { match: ['conductivity meter', 'conductometer'], value: 'conductivity_meter' },
  { match: ['stirrer'], value: 'magnetic_stirrer' },
  { match: ['stand', 'clamp'], value: 'stand_clamp' },
  { match: ['dropper', 'wash bottle'], value: 'dropper' }
];

function deriveEquipmentFromApparatus(apparatus = []) {
  const found = new Set();
  apparatus.forEach((item) => {
    const value = String(item || '').toLowerCase();
    apparatusAliases.forEach((entry) => {
      if (entry.match.some((needle) => value.includes(needle))) found.add(entry.value);
    });
  });
  return Array.from(found);
}

function normalizeExperiment(experiment, sourceType = 'built-in') {
  const apparatus = Array.isArray(experiment.apparatus) ? experiment.apparatus : [];
  return {
    ...experiment,
    id: experiment.id || slugify(experiment.title),
    title: experiment.title || 'Untitled Experiment',
    aim: experiment.aim || 'Aim not provided.',
    theory: experiment.theory || 'Theory not provided.',
    apparatus,
    chemicals: Array.isArray(experiment.chemicals) ? experiment.chemicals : [],
    procedure: Array.isArray(experiment.procedure) ? experiment.procedure : [],
    formula: experiment.formula || 'M1V1 = M2V2',
    difficultyLevel: experiment.difficultyLevel || experiment.difficulty || 'Beginner',
    estimatedTime: experiment.estimatedTime || '30-45 min',
    calculations: experiment.calculations || { knowns: { V1: 10, M2: 0.1 } },
    sourceType,
    equipment: Array.isArray(experiment.equipment) && experiment.equipment.length
      ? experiment.equipment
      : deriveEquipmentFromApparatus(apparatus)
  };
}

const PRESET_EXPERIMENTS = [
  ['Acid Base Titration', 'acid-base', 'Beginner'],
  ['Strong Acid vs Weak Base Titration', 'acid-base', 'Intermediate'],
  ['Determination of NaOH Concentration', 'acid-base', 'Intermediate'],
  ['Determination of HCl Molarity', 'acid-base', 'Beginner'],
  ['Neutralization Reaction', 'acid-base', 'Beginner'],
  ['Phenolphthalein Test', 'indicator', 'Beginner'],
  ['Methyl Orange Indicator Reaction', 'indicator', 'Beginner'],
  ['Natural Indicator Turmeric Test', 'indicator', 'Intermediate'],
  ['pH Color Scale Experiment', 'indicator', 'Beginner'],
  ['Universal Indicator Test', 'indicator', 'Beginner'],
  ['Copper Sulfate Crystal Formation', 'salt', 'Intermediate'],
  ['Sodium Chloride Crystallization', 'salt', 'Beginner'],
  ['Alum Crystal Growth', 'salt', 'Advanced'],
  ['Solubility of Salts', 'salt', 'Intermediate'],
  ['Hydrated Salt Heating', 'salt', 'Intermediate'],
  ['CO2 Generation', 'gas', 'Intermediate'],
  ['Oxygen Preparation', 'gas', 'Intermediate'],
  ['Hydrogen Gas Production', 'gas', 'Advanced'],
  ['Ammonia Gas Formation', 'gas', 'Advanced'],
  ['Limewater CO2 Test', 'gas', 'Beginner'],
  ['Heating Copper Sulfate', 'heating', 'Beginner'],
  ['Thermal Decomposition of CaCO3', 'heating', 'Advanced'],
  ['Heating Sugar', 'heating', 'Beginner'],
  ['Boiling Point Measurement', 'heating', 'Intermediate'],
  ['Evaporation Experiment', 'heating', 'Beginner'],
  ['Measuring pH of Acids', 'ph', 'Beginner'],
  ['Measuring pH of Bases', 'ph', 'Beginner'],
  ['Neutralization pH Curve', 'ph', 'Advanced'],
  ['Buffer Solution Experiment', 'ph', 'Advanced'],
  ['Weak Acid pH Experiment', 'ph', 'Intermediate'],
  ['Hardness of Water by EDTA', 'hardness', 'Intermediate'],
  ['Electrolysis of Water', 'electrochemistry', 'Advanced'],
  ['Electroplating Copper', 'electrochemistry', 'Advanced'],
  ['Galvanic Cell', 'electrochemistry', 'Advanced'],
  ['Battery Experiment', 'electrochemistry', 'Intermediate'],
  ['Redox Reaction', 'electrochemistry', 'Advanced'],
  ['Ethanol Combustion', 'organic', 'Intermediate'],
  ['Esterification Reaction', 'organic', 'Advanced'],
  ['Soap Formation', 'organic', 'Advanced'],
  ['Organic Acid Test', 'organic', 'Intermediate'],
  ['Polymer Reaction', 'organic', 'Research'],
  ['Reaction Rate Experiment', 'advanced', 'Intermediate'],
  ['Catalyst Reaction', 'advanced', 'Intermediate'],
  ['Equilibrium Reaction', 'advanced', 'Advanced'],
  ['Le Chatelier Experiment', 'advanced', 'Advanced'],
  ['Precipitation Reaction', 'advanced', 'Beginner'],
  ['Filtration Experiment', 'technique', 'Beginner'],
  ['Distillation Experiment', 'technique', 'Advanced'],
  ['Chromatography', 'technique', 'Intermediate'],
  ['Separation of Mixtures', 'technique', 'Beginner'],
  ['Density Measurement', 'technique', 'Beginner']
];

const FAMILY_PROFILES = {
  'acid-base': {
    theory: 'An acid reacts with a base to form salt and water. A measured titration endpoint is used to compute an unknown concentration.',
    apparatus: ['Burette', 'Pipette', 'Conical Flask', 'Beaker', 'Stand', 'pH Meter'],
    chemicals: ['HCl', 'NaOH', 'Phenolphthalein'],
    procedure: ['Prepare the burette and pipette.', 'Add acid to the flask.', 'Add indicator.', 'Fill burette with base.', 'Titrate slowly to endpoint.', 'Record the burette reading.'],
    formula: 'M1V1 = M2V2',
    calculations: { knowns: { V1: 10, M2: 0.1 } },
    estimatedTime: '35-45 min'
  },
  indicator: {
    theory: 'Indicators change color over different pH ranges and help students interpret acidic, neutral, and basic conditions visually.',
    apparatus: ['Beaker', 'Dropper', 'Test Tube', 'pH Meter'],
    chemicals: ['HCl', 'NaOH', 'Phenolphthalein', 'Methyl Orange', 'Eriochrome Black T'],
    procedure: ['Prepare test vessels.', 'Add indicator drops.', 'Introduce acid or base.', 'Observe the color transition.', 'Record the pH and final color.'],
    formula: 'pH comparison',
    estimatedTime: '20-30 min'
  },
  salt: {
    theory: 'Salt experiments highlight solubility, crystal formation, hydration, and thermal changes in ionic compounds.',
    apparatus: ['Beaker', 'Test Tube', 'Burner', 'Thermometer'],
    chemicals: ['CuSO4', 'Distilled Water'],
    procedure: ['Prepare the salt solution.', 'Heat or cool the system as required.', 'Observe crystal or color changes.', 'Record temperature and outcome.'],
    formula: 'Mass / Volume relationship',
    estimatedTime: '30-40 min'
  },
  gas: {
    theory: 'Gas evolution reactions can be observed through bubbles, pressure release, or confirmation tests such as limewater.',
    apparatus: ['Beaker', 'Test Tube', 'Burner'],
    chemicals: ['HCl', 'Distilled Water'],
    procedure: ['Prepare the reactants.', 'Initiate the reaction.', 'Observe gas generation.', 'Record visible evidence and safety notes.'],
    formula: 'Stoichiometric ratio',
    estimatedTime: '25-35 min'
  },
  heating: {
    theory: 'Heating changes temperature, solubility, decomposition behavior, and reaction speed.',
    apparatus: ['Beaker', 'Conical Flask', 'Burner', 'Thermometer'],
    chemicals: ['Distilled Water', 'CuSO4'],
    procedure: ['Place the vessel over the burner.', 'Increase heat gradually.', 'Track temperature.', 'Observe changes and record them.'],
    formula: 'Temperature trend',
    estimatedTime: '20-35 min'
  },
  ph: {
    theory: 'pH experiments examine the strength of acidic and basic solutions and show how indicators or pH meters reveal the change.',
    apparatus: ['Beaker', 'pH Meter', 'Dropper'],
    chemicals: ['HCl', 'NaOH', 'Distilled Water', 'Ammonia Buffer Solution'],
    procedure: ['Prepare samples.', 'Measure the initial pH.', 'Add reagent gradually.', 'Observe pH change.', 'Record the final reading.'],
    formula: 'pH scale comparison',
    estimatedTime: '20-30 min'
  },
  hardness: {
    theory: 'Hardness of water is determined by titrating calcium and magnesium ions with EDTA in the presence of ammonia buffer and EBT indicator. The endpoint is a wine-red to blue color change.',
    apparatus: ['Burette', 'Pipette', 'Conical Flask', 'Beaker', 'Stand', 'Conductivity Meter', 'pH Meter'],
    chemicals: ['Tap Water', 'River Water', 'EDTA Acid', 'Eriochrome Black T', 'Ammonia Buffer Solution'],
    procedure: ['Fill the burette with EDTA solution.', 'Pipette the water sample into the conical flask.', 'Add ammonia buffer to maintain alkaline pH.', 'Add a few drops of EBT indicator.', 'Titrate with EDTA until the solution changes from wine red to blue.', 'Record the burette reading and calculate hardness.'],
    formula: 'Hardness (as CaCO3) = (V_EDTA x M_EDTA x 100000) / V_sample',
    calculations: { knowns: { V1: 50, M2: 0.01 } },
    estimatedTime: '30-40 min'
  },
  electrochemistry: {
    theory: 'Electrochemical experiments convert chemical energy to electrical energy or use electrical input to drive chemical change.',
    apparatus: ['Beaker', 'Test Tube', 'Burner'],
    chemicals: ['CuSO4', 'Distilled Water'],
    procedure: ['Prepare the electrolyte.', 'Assemble the setup.', 'Run the electrochemical process.', 'Observe deposition, bubbles, or voltage-related change.'],
    formula: 'Charge / amount relation',
    estimatedTime: '40-55 min'
  },
  organic: {
    theory: 'Organic chemistry experiments focus on combustion, esterification, and structural transformations in carbon-based substances.',
    apparatus: ['Beaker', 'Conical Flask', 'Burner', 'Thermometer'],
    chemicals: ['Ethanol', 'Distilled Water'],
    procedure: ['Prepare the organic reagent.', 'Control heating carefully.', 'Observe smell, color, and temperature change.', 'Record the result.'],
    formula: 'Reaction yield estimate',
    estimatedTime: '35-50 min'
  },
  advanced: {
    theory: 'Advanced experiments emphasize equilibrium, rate, catalysts, and multi-variable reaction analysis.',
    apparatus: ['Beaker', 'Conical Flask', 'Thermometer', 'Magnetic Stirrer'],
    chemicals: ['HCl', 'NaOH', 'CuSO4'],
    procedure: ['Prepare the setup accurately.', 'Control mixing and temperature.', 'Run the reaction under observation.', 'Capture changing values and compare outcomes.'],
    formula: 'Rate / equilibrium relation',
    estimatedTime: '40-60 min'
  },
  technique: {
    theory: 'Technique experiments teach the operational skill of carrying out standard laboratory methods safely and accurately.',
    apparatus: ['Beaker', 'Test Tube', 'Pipette', 'Conical Flask'],
    chemicals: ['Distilled Water', 'CuSO4'],
    procedure: ['Assemble the apparatus.', 'Follow the method step by step.', 'Observe separation or transfer behavior.', 'Record the measured result.'],
    formula: 'Method-specific calculation',
    estimatedTime: '20-40 min'
  }
};

function createPresetExperiment([title, family, difficulty]) {
  const profile = FAMILY_PROFILES[family];
  return normalizeExperiment({
    id: `preset-${slugify(title)}`,
    title,
    aim: `Study ${title.toLowerCase()} in a guided virtual chemistry laboratory.`,
    theory: profile.theory,
    apparatus: profile.apparatus,
    chemicals: profile.chemicals,
    procedure: profile.procedure,
    formula: profile.formula,
    calculations: profile.calculations || { knowns: { V1: 10, M2: 0.1 } },
    difficultyLevel: difficulty,
    estimatedTime: profile.estimatedTime
  }, 'preset');
}

function createExperimentFromForm(form) {
  return normalizeExperiment({
    id: `custom-${slugify(form.title || `experiment-${Date.now()}`)}`,
    title: form.title || 'Custom Experiment',
    aim: form.aim || 'Aim not provided.',
    theory: form.theory || 'Theory not provided.',
    apparatus: listFromValue(form.apparatus),
    chemicals: listFromValue(form.chemicals),
    procedure: listFromValue(form.procedure),
    formula: form.formula || 'M1V1 = M2V2',
    difficultyLevel: form.difficultyLevel || 'Beginner',
    estimatedTime: '30-45 min',
    calculations: { knowns: { V1: 10, M2: 0.1 } },
    resultMethod: form.resultMethod || 'Average readings and compute the final value.'
  }, 'custom');
}

function extractSection(text, headings) {
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:${headings.join('|')})\\s*[:\\-]?\\s*([\\s\\S]*?)(?=\\n\\s*(?:Experiment Name|Aim|Theory|Apparatus|Chemicals|Procedure|Formula|Result|Conclusion|Observation|$))`, 'i');
  const match = text.match(pattern);
  return match?.[1]?.trim() || '';
}

function extractTitle(text, fallbackName) {
  const explicit = text.match(/(?:Experiment Name|Experiment|Title)\s*[:\-]\s*(.+)/i)?.[1]?.trim();
  if (explicit) return explicit;
  return normalizeUploadFileName({ name: fallbackName }).replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Uploaded Experiment';
}

function inferListFromCorpus(text, library) {
  const corpus = text.toLowerCase();
  return library
    .filter((item) => corpus.includes(item.name.toLowerCase()) || corpus.includes(item.formula.toLowerCase()))
    .map((item) => item.name);
}

function parseUploadedExperimentText(text, fileName) {
  const source = String(text || '').replace(/\r/g, '');
  const apparatusCorpus = extractSection(source, ['Apparatus', 'Required Apparatus', 'Equipment']) || source;
  const chemicalCorpus = extractSection(source, ['Chemicals', 'Reagents', 'Solutions']) || source;
  const procedureSection = extractSection(source, ['Procedure', 'Method']);
  const procedure = listFromValue(procedureSection)
    .map((step) => step.replace(/^\d+[\).\s-]*/, '').trim())
    .filter(Boolean);

  const apparatus = listFromValue(apparatusCorpus).filter((item) => item.length < 80);
  const chemicals = listFromValue(chemicalCorpus).filter((item) => item.length < 80);

  return {
    title: extractTitle(source, fileName),
    aim: extractSection(source, ['Aim', 'Objective']) || 'Imported from uploaded lab document.',
    theory: extractSection(source, ['Theory', 'Principle']) || 'Theory imported from the uploaded document.',
    apparatus: apparatus.length ? apparatus.join('\n') : inferListFromCorpus(source, INSTRUMENT_GROUPS.flatMap((group) => group.items).map((item) => ({ name: item.label, formula: item.label }))).join('\n'),
    chemicals: chemicals.length ? chemicals.join('\n') : inferListFromCorpus(source, CHEMICAL_LIBRARY.flatMap((group) => group.items)).join('\n'),
    procedure: procedure.length ? procedure.join('\n') : 'Review the uploaded instructions and perform the procedure step by step.',
    formula: extractSection(source, ['Formula', 'Calculation']) || (source.includes('N1V1') ? 'N1V1 = N2V2' : source.includes('M1V1') ? 'M1V1 = M2V2' : 'M1V1 = M2V2'),
    resultMethod: extractSection(source, ['Result', 'Conclusion']) || 'Compare the manual result with the calculated result and confirm if it falls within tolerance.',
    difficultyLevel: /\bresearch\b/i.test(source) ? 'Research' : /\badvanced\b/i.test(source) ? 'Advanced' : /\bintermediate\b/i.test(source) ? 'Intermediate' : 'Beginner'
  };
}

function buildWorkspaceSeed(experiment, seedVersion) {
  const equipment = experiment?.equipment?.length ? experiment.equipment : deriveEquipmentFromApparatus(experiment?.apparatus || []);
  const presets = {
    stand_clamp: { x: 640, y: 52 },
    burette: { x: 668, y: 28, volume: 0, capacity: 50, color: '#f8fbff', ph: 7, reagents: [] },
    conical_flask: { x: 360, y: 286 },
    beaker: { x: 220, y: 286 },
    test_tube: { x: 760, y: 286 },
    pipette: { x: 190, y: 118 },
    dropper: { x: 820, y: 118 },
    magnetic_stirrer: { x: 356, y: 404 },
    bunsen_burner: { x: 218, y: 400 },
    ph_meter: { x: 752, y: 164 },
    conductivity_meter: { x: 832, y: 170 },
    thermometer: { x: 792, y: 172 }
  };
  const uidPrefix = `${experiment?.id || 'exp'}-${seedVersion}`;

  const instances = equipment.map((type, index) => {
    const preset = presets[type] || { x: 180 + index * 70, y: 200 + (index % 2) * 50 };
    const capacity = type === 'burette' ? 50 : type === 'beaker' ? 250 : type === 'conical_flask' ? 250 : type === 'test_tube' ? 50 : type === 'pipette' ? 25 : type === 'dropper' ? 5 : 0;
    return {
      uid: `${uidPrefix}-${type}-${index}`,
      type,
      x: preset.x,
      y: preset.y,
      capacity,
      volume: preset.volume ?? 0,
      color: preset.color || '#ffffff',
      ph: preset.ph ?? 7,
      reagents: preset.reagents || [],
      rotation: 0,
      value: type === 'magnetic_stirrer' ? 1 : 0,
      drips: 0,
      tempC: 25
    };
  });

  return { instances, meterValue: 7, conductivityValue: 0.05 };
}

function calculateResult(experiment, rows) {
  const usable = rows
    .map((row) => Number(row.volumeUsed || row.finalReading || 0))
    .filter((value) => Number.isFinite(value) && value > 0);

  const averageVolume = usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : 0;
  const sampleVolume = Number(experiment?.calculations?.knowns?.V1 ?? 10);
  const standardValue = Number(experiment?.calculations?.knowns?.M2 ?? experiment?.calculations?.knowns?.N2 ?? 0.1);
  const calculatedValue = averageVolume > 0 ? (standardValue * averageVolume) / Math.max(sampleVolume, 0.001) : null;

  return {
    averageVolume,
    trialCount: usable.length,
    calculatedValue,
    formula: experiment?.formula || 'M1V1 = M2V2'
  };
}

function buildConclusion(experiment, result) {
  if (!result.trialCount) return 'Run the experiment and record observation rows to generate a conclusion.';
  if (result.calculatedValue) {
    return `The experiment completed successfully. Using ${experiment?.formula || 'the configured formula'}, the final calculated value is ${result.calculatedValue.toFixed(4)} from ${result.trialCount} recorded trial(s).`;
  }
  return `The experiment recorded an average volume of ${result.averageVolume.toFixed(2)} mL. Add more data or complete the required constants to finalize the result.`;
}

function buildReading(payload, rows) {
  const nextTrial = rows.length + 1;
  const volumeUsed = Number(payload?.volumeUsed ?? 0);
  const finalReading = Number(payload?.finalReading ?? volumeUsed);
  const initialReading = Number(payload?.initialReading ?? 0);
  const ph = Number(payload?.ph ?? 7);
  return {
    id: `${Date.now()}-${nextTrial}`,
    trial: nextTrial,
    initialReading: initialReading.toFixed(2),
    finalReading: finalReading.toFixed(2),
    volumeUsed: volumeUsed.toFixed(2),
    ph: ph.toFixed(2),
    conductivity: Number(payload?.conductivity ?? 0).toFixed(2)
  };
}

function getStageState(experiment, workspaceState, readings) {
  const instances = workspaceState?.instances || [];
  const required = experiment?.equipment?.length ? experiment.equipment : [];
  const indicatorNames = ['indicator', 'phenolphthalein', 'methyl orange', 'eriochrome black t', 'ebt', 'bromothymol blue', 'litmus', 'universal indicator'];
  const placed = new Set(instances.map((item) => item.type));
  const flask = instances.find((item) => item.type === 'conical_flask');
  const burette = instances.find((item) => item.type === 'burette');
  const placedEnough = required.filter((type) => placed.has(type)).length >= Math.max(2, Math.min(required.length, 4));
  const addedChemicals = instances.some((item) => Array.isArray(item.reagents) && item.reagents.length > 0);
  const indicatorReady = Boolean(
    flask?.reagents?.some((reagent) => ['phenolphthalein', 'methyl_orange', 'bromothymol_blue', 'litmus', 'universal_indicator', 'ebt'].includes(reagent))
  );
  const buretteReady = Boolean(burette?.reagents?.length || burette?.volume > 0);
  const titrationRun = Boolean((burette?.drips || 0) > 0 || readings.length > 0);
  const requiresIndicator = Boolean(
    experiment?.chemicals?.some((item) => indicatorNames.some((name) => String(item).toLowerCase().includes(name)))
  );
  const done = [placedEnough, addedChemicals, indicatorReady || !requiresIndicator, buretteReady, titrationRun, readings.length > 0];
  const currentStep = done.findIndex((value) => !value);
  return {
    currentStep: currentStep === -1 ? done.length - 1 : currentStep,
    steps: [
      'Setup apparatus',
      'Prepare chemicals',
      'Add indicator',
      'Prepare burette',
      'Perform virtual experiment',
      'Record observation'
    ],
    warning: flask?.ph > 10 && indicatorReady ? 'Too much base added. Stop and repeat the titration carefully.' : ''
  };
}

function NotificationStack({ notifications, onMinimize, onRestore, onClose }) {
  const active = notifications.filter((item) => !item.minimized);
  const minimized = notifications.filter((item) => item.minimized);

  return (
    <>
      <div className="lab-toast-stack">
        <AnimatePresence>
          {active.map((item) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              className={`lab-toast ${item.type}`}
            >
              <div className="lab-toast-head">
                <strong>{item.title}</strong>
                <span>{item.type}</span>
              </div>
              <p>{item.message}</p>
              <div className="lab-toast-actions">
                <button type="button" onClick={() => onMinimize(item.id)}>Minimize</button>
                <button type="button" onClick={() => onClose(item.id)}>Close</button>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      <div className="lab-toast-minimized">
        {minimized.map((item) => (
          <button key={item.id} type="button" className="lab-toast-chip" onClick={() => onRestore(item.id)}>
            <Bell className="w-4 h-4" />
            <span>{item.title}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function getEquipmentLabel(type) {
  return INSTRUMENT_GROUPS.flatMap((group) => group.items).find((item) => item.id === type)?.label || String(type || '').replace(/_/g, ' ');
}

export default function ExperimentLab() {
  const [theme, setTheme] = useState('dark');
  const { user, profile } = useAuthStore((state) => ({ user: state.user, profile: state.profile }));
  const { addXP } = useGameStore();
  const labShellRef = useRef(null);
  const [customExperiments, setCustomExperiments] = useState(() => loadCustomExperiments().map((item) => normalizeExperiment(item, 'custom')));
  const presetExperiments = useMemo(() => PRESET_EXPERIMENTS.map(createPresetExperiment), []);
  const experiments = useMemo(
    () => [...BUILTIN_EXPERIMENTS.map((item) => normalizeExperiment(item, 'built-in')), ...presetExperiments, ...customExperiments],
    [customExperiments, presetExperiments]
  );

  const [selectedExperimentId, setSelectedExperimentId] = useState(experiments[0]?.id || '');
  const [activeTab, setActiveTab] = useState('info');
  const [hasStarted, setHasStarted] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [chemicalQuery, setChemicalQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(() => Object.fromEntries(CHEMICAL_LIBRARY.map((category) => [category.id, true])));
  const [dispenseVolume, setDispenseVolume] = useState(10);
  const [reagentConcentration, setReagentConcentration] = useState(0);
  const [reagentNormality, setReagentNormality] = useState(0.1);
  const [workspaceVersion, setWorkspaceVersion] = useState(1);
  const [workspaceState, setWorkspaceState] = useState({ instances: [], meterValue: 7, conductivityValue: 0.05 });
  const [readings, setReadings] = useState([]);
  const [observationNote, setObservationNote] = useState('');
  const [autoObservations, setAutoObservations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(DEFAULT_FORM);
  const [uploadState, setUploadState] = useState({ name: '', status: '', error: '' });
  const [manualResultValue, setManualResultValue] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoVolumeCalc, setAutoVolumeCalc] = useState(true);
  const previousStepRef = useRef(-1);
  const previousWarningRef = useRef('');
  const experimentStartRef = useRef(Date.now());
  const savedHistoryRef = useRef(new Set());
  const lastTabRef = useRef(activeTab);

  // Auto-reset workspace when switching between Virtual Lab and Observation
  useEffect(() => {
    if (
      (lastTabRef.current === 'virtual' && activeTab === 'observation') ||
      (lastTabRef.current === 'observation' && activeTab === 'virtual')
    ) {
      setWorkspaceVersion((v) => v + 1);
      pushNotification('Workspace Synced', 'Apparatus state was reset for data purity while switching to recording mode.', 'info', { minimized: true });
    }
    lastTabRef.current = activeTab;
  }, [activeTab]);


  const selectedExperiment = useMemo(
    () => experiments.find((item) => item.id === selectedExperimentId) || experiments[0],
    [experiments, selectedExperimentId]
  );

  const filteredExperiments = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    if (!query) return experiments;
    return experiments.filter((item) => (
      item.title.toLowerCase().includes(query)
      || item.aim.toLowerCase().includes(query)
      || item.difficultyLevel.toLowerCase().includes(query)
    ));
  }, [catalogQuery, experiments]);

  const filteredChemicals = useMemo(() => {
    const query = chemicalQuery.trim().toLowerCase();
    if (!query) return CHEMICAL_LIBRARY;
    return CHEMICAL_LIBRARY.map((category) => ({
      ...category,
      items: category.items.filter((item) => (
        item.name.toLowerCase().includes(query)
        || item.formula.toLowerCase().includes(query)
      ))
    })).filter((category) => category.items.length);
  }, [chemicalQuery]);

  const workspaceSeed = useMemo(
    () => buildWorkspaceSeed(selectedExperiment, workspaceVersion),
    [selectedExperiment, workspaceVersion]
  );

  const result = useMemo(
    () => calculateResult(selectedExperiment, readings),
    [readings, selectedExperiment]
  );

  const stage = useMemo(
    () => getStageState(selectedExperiment, workspaceState, readings),
    [readings, selectedExperiment, workspaceState]
  );

  const requiredEquipment = useMemo(
    () => selectedExperiment?.equipment?.length ? selectedExperiment.equipment : deriveEquipmentFromApparatus(selectedExperiment?.apparatus || []),
    [selectedExperiment]
  );

  const labStatus = useMemo(() => ({
    ph: Number(workspaceState.meterValue || 7).toFixed(2),
    conductivity: Number(workspaceState.conductivityValue || 0).toFixed(2),
    temperature: Math.max(25, ...workspaceState.instances.map((item) => item.tempC || 25)).toFixed(0),
    readings: readings.length,
    chemicalsLoaded: new Set(workspaceState.instances.flatMap((item) => item.reagents || [])).size
  }), [readings.length, workspaceState]);

  const resultCheck = useMemo(() => {
    const expected = Number(result.calculatedValue ?? result.averageVolume ?? 0);
    const manual = Number(manualResultValue);
    if (!Number.isFinite(manual) || manualResultValue === '' || !Number.isFinite(expected) || expected <= 0) {
      return { status: 'pending', message: 'Enter a manual result value to compare with the calculated result.', errorPercent: null };
    }

    const errorPercent = Math.abs((manual - expected) / expected) * 100;
    if (errorPercent <= 5) {
      return { status: 'correct', message: `Result accepted. Error = ${errorPercent.toFixed(2)}%.`, errorPercent };
    }
    if (errorPercent <= 10) {
      return { status: 'close', message: `Result is close but outside the preferred tolerance. Error = ${errorPercent.toFixed(2)}%.`, errorPercent };
    }
    return { status: 'wrong', message: `Result does not match the calculated value. Error = ${errorPercent.toFixed(2)}%.`, errorPercent };
  }, [manualResultValue, result]);

  const hasComputedResult = Number.isFinite(result.calculatedValue) || Number.isFinite(result.averageVolume);
  const hasManualResult = manualResultValue !== '' && Number.isFinite(Number(manualResultValue)) && resultCheck.status !== 'pending';
  const isExperimentCompleted = hasStarted && readings.length > 0 && hasComputedResult;

  useEffect(() => {
    if (!user?.uid || !selectedExperiment || !db) return;
    if (!hasStarted || !readings.length || !hasComputedResult) return;

    const avgVolume = Number.isFinite(result.averageVolume) ? result.averageVolume : null;
    const calculatedValue = Number.isFinite(result.calculatedValue) ? result.calculatedValue : null;
    const resultKey = calculatedValue !== null ? calculatedValue.toFixed(4) : avgVolume?.toFixed(2) || '0.00';
    const saveKey = `${user.uid}:${selectedExperiment.id}:${result.trialCount}:${resultKey}`;
    if (savedHistoryRef.current.has(saveKey)) return;

    const persist = async () => {
      const errorPercent = hasManualResult ? Number(resultCheck.errorPercent) : null;
      const accuracy = Number.isFinite(errorPercent) ? Math.max(0, Math.min(100, Math.round(100 - errorPercent))) : null;
      const score = Number.isFinite(accuracy) ? accuracy : 0;
      const resultSummary = calculatedValue !== null
        ? `Calculated value: ${calculatedValue.toFixed(4)} (avg ${(avgVolume ?? 0).toFixed(2)} mL)`
        : `Average volume: ${(avgVolume ?? 0).toFixed(2)} mL`;
      const observation = observationNote.trim() || autoObservations[0]?.text || 'No observation recorded.';
      const durationMinutes = Math.max(1, Math.round((Date.now() - experimentStartRef.current) / 60000));
      const userName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Student';

      const historyPayload = {
        userId: user.uid,
        userName,
        experimentName: selectedExperiment.title || 'Experiment',
        chemicalsUsed: Array.isArray(selectedExperiment.chemicals) ? selectedExperiment.chemicals : [],
        instrumentsUsed: Array.isArray(requiredEquipment) && requiredEquipment.length
          ? requiredEquipment.map(getEquipmentLabel)
          : (Array.isArray(selectedExperiment.apparatus) ? selectedExperiment.apparatus : []),
        result: hasManualResult ? `${resultSummary} | Manual: ${manualResultValue}` : resultSummary,
        observation,
        score,
        accuracy: Number.isFinite(accuracy) ? accuracy : null,
        completedAt: serverTimestamp(),
        duration: durationMinutes
      };

      await addDoc(collection(db, 'experiment_history'), historyPayload);

      if (!hasManualResult) return;

      const leagueRef = doc(db, 'league_scores', user.uid);
      const leagueSnap = await getDoc(leagueRef);
      const existing = leagueSnap.exists() ? leagueSnap.data() : {};
      const prevTotalExperiments = Number(existing.totalExperiments) || 0;
      const prevTotalScore = Number(existing.totalScore) || 0;
      const prevAverageAccuracy = Number(existing.averageAccuracy) || 0;
      const totalExperiments = prevTotalExperiments + 1;
      const totalScore = prevTotalScore + score;
      const averageAccuracy = Math.round(((prevAverageAccuracy * prevTotalExperiments) + accuracy) / totalExperiments);

      await setDoc(leagueRef, {
        userId: user.uid,
        userName,
        totalExperiments,
        totalScore,
        averageAccuracy,
        lastExperiment: selectedExperiment.title || 'Experiment',
        lastUpdated: serverTimestamp()
      }, { merge: true });
    };

    savedHistoryRef.current.add(saveKey);
    persist().catch(() => {
      savedHistoryRef.current.delete(saveKey);
    });
    }, [
      autoObservations,
      db,
      hasComputedResult,
      hasManualResult,
      hasStarted,
      manualResultValue,
      observationNote,
      profile?.name,
    readings.length,
    requiredEquipment,
    result.averageVolume,
    result.calculatedValue,
    result.trialCount,
    resultCheck.errorPercent,
    resultCheck.status,
    selectedExperiment,
    user?.displayName,
    user?.email,
    user?.uid
  ]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === labShellRef.current);
    };

    handleFullscreenChange();
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  async function toggleFullscreen(nextValue) {
    if (typeof document === 'undefined') return;
    const shouldEnter = typeof nextValue === 'boolean' ? nextValue : document.fullscreenElement !== labShellRef.current;

    try {
      if (shouldEnter && labShellRef.current && document.fullscreenElement !== labShellRef.current) {
        await labShellRef.current.requestFullscreen();
      } else if (!shouldEnter && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      pushNotification('Fullscreen', 'The browser blocked fullscreen mode for this session.', 'warning');
    }
  }

  function pushNotification(title, message, type = 'info', options = {}) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setNotifications((current) => [{ id, title, message, type, minimized: Boolean(options.minimized) }, ...current].slice(0, 8));
  }

  function resetExperiment(mode = 'manual') {
    setWorkspaceVersion((value) => value + 1);
    setReadings([]);
    setObservationNote('');
    setAutoObservations([]);
    setChatInput('');
    setManualResultValue('');
    setHasStarted(false);
    setActiveTab('info');
    setChatHistory([
      {
        id: `intro-${Date.now()}`,
        role: 'assistant',
        text: `Step 1: Review the experiment information for ${selectedExperiment?.title || 'the selected lab'}.`
      }
    ]);
    savedHistoryRef.current.clear();
    experimentStartRef.current = Date.now();
    previousStepRef.current = -1;
    previousWarningRef.current = '';
    if (mode === 'manual') {
      pushNotification('Lab Reset', 'The apparatus, observations, and current run were reset.', 'info', { minimized: true });
    }
  }

  useEffect(() => {
    savedHistoryRef.current.clear();
    experimentStartRef.current = Date.now();
    resetExperiment('selection');
  }, [selectedExperimentId]);

  useEffect(() => {
    if (previousStepRef.current !== stage.currentStep) {
      previousStepRef.current = stage.currentStep;
      pushNotification(`Step ${stage.currentStep + 1}`, stage.steps[stage.currentStep], 'success');
    }
    if (stage.warning && previousWarningRef.current !== stage.warning) {
      previousWarningRef.current = stage.warning;
      pushNotification('Instructor Warning', stage.warning, 'warning');
      setChatHistory((current) => [...current, { id: `warn-${Date.now()}`, role: 'assistant', text: stage.warning }].slice(-10));
    }
  }, [stage]);

  async function startExperiment() {
    experimentStartRef.current = Date.now();
    setHasStarted(true);
    setActiveTab('virtual');
    pushNotification('Experiment Started', 'Workspace, chemicals, and instructions are ready.', 'success', { minimized: true });
    await toggleFullscreen(true);
  }

  function spawnInstrument(type) {
    window.dispatchEvent(new CustomEvent('spawn-instrument', { detail: { type } }));
    pushNotification('Instrument Added', `${getEquipmentLabel(type)} moved to the workspace.`, 'info');
  }

  function handleWorkspaceEvent(event) {
    if (!event) return;
    if (event.autoObservation) {
      setAutoObservations((current) => [{ id: `${Date.now()}-obs`, text: event.autoObservation }, ...current].slice(0, 12));
    }
    if (event.aiExplanation) {
      setChatHistory((current) => [...current, { id: `${Date.now()}-ai`, role: 'assistant', text: event.aiExplanation }].slice(-12));
    }
    if (event.hasReaction) {
      pushNotification('Reaction Detected', 'A visible chemical change was detected in the workspace.', 'success');
    }
  }

  function handleLogReading(payload) {
    setReadings((current) => [...current, buildReading(payload, current)]);
    setActiveTab('observation');
    pushNotification('Observation Logged', 'A new row was added to the observation table.', 'success');
  }

  async function handleUploadExperiment(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateUploadFile(file);
    if (validationError) {
      setUploadState({ name: file.name, status: '', error: validationError });
      pushNotification('Upload Failed', validationError, 'warning');
      return;
    }

    setUploadState({
      name: file.name,
      status: `Analyzing ${normalizeUploadFileName(file)} (${Math.max(1, Math.round(file.size / 1024))} KB of ${Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))} MB limit)...`,
      error: ''
    });

    try {
      const text = await readUploadedExperimentText(file);
      const form = parseUploadedExperimentText(text, file.name);
      const created = createExperimentFromForm(form);
      const next = [created, ...customExperiments].slice(0, 30);
      setCustomExperiments(next);
      saveCustomExperiments(next);
      setSelectedExperimentId(created.id);
      setUploadState({ name: file.name, status: `${created.title} was generated from the uploaded document.`, error: '' });
      pushNotification('Experiment Imported', `${created.title} was created from ${file.name}.`, 'success');
    } catch {
      setUploadState({ name: file.name, status: '', error: 'The uploaded file could not be read. Try a cleaner PDF, DOCX, or TXT file.' });
      pushNotification('Upload Failed', 'The uploaded file could not be parsed into an experiment.', 'warning');
    } finally {
      event.target.value = '';
    }
  }

  function askInstructor() {
    const question = chatInput.trim();
    if (!question) return;

    const reply = stage.warning
      ? stage.warning
      : `Current step: ${stage.steps[stage.currentStep]}. Check the flask color, pH ${labStatus.ph}, and recorded volume before continuing.`;

    setChatHistory((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: 'user', text: question },
      { id: `${Date.now()}-assistant`, role: 'assistant', text: reply }
    ].slice(-12));
    setChatInput('');
  }

  function createExperiment() {
    const created = createExperimentFromForm(createForm);
    const next = [created, ...customExperiments].slice(0, 30);
    setCustomExperiments(next);
    saveCustomExperiments(next);
    setShowCreateModal(false);
    setCreateForm(DEFAULT_FORM);
    startTransition(() => setSelectedExperimentId(created.id));
    pushNotification('Experiment Created', `${created.title} is now available in the catalog.`, 'success');
  }

  function toggleCategory(id) {
    setExpandedCategories((current) => ({ ...current, [id]: !current[id] }));
  }

  function renderInfoTab() {
    const objectiveText = selectedExperiment?.aim
      ? `Objective of performing this experiment: ${selectedExperiment.aim}`
      : 'Objective of performing this experiment: validate the core principle, record precise readings, and compute a reliable final result.';

    return (
      <div className="lab-content-card">
        <div className="lab-content-head">
          <div>
            <span className="lab-section-label">Experiment Information</span>
            <h2>{selectedExperiment?.title}</h2>
            <p>{selectedExperiment?.aim}</p>
          </div>
          <button type="button" className="lab-primary-button" onClick={startExperiment}>
            <Play className="w-4 h-4" />
            <span>{hasStarted ? 'Resume Experiment' : 'Start Experiment'}</span>
          </button>
        </div>

        <div className="lab-info-grid">
          <section className="lab-panel-card">
            <div className="lab-card-title">
              <Sparkles className="w-4 h-4" />
              <strong>Objective</strong>
            </div>
            <p>{objectiveText}</p>
          </section>

          <section className="lab-panel-card">
            <div className="lab-card-title">
              <BookOpenText className="w-4 h-4" />
              <strong>Theory</strong>
            </div>
            <p>{selectedExperiment?.theory}</p>
          </section>

          <section className="lab-panel-card">
            <div className="lab-card-title">
              <FlaskConical className="w-4 h-4" />
              <strong>Required Apparatus</strong>
            </div>
            <div className="lab-tag-grid">
              {selectedExperiment?.apparatus?.map((item) => <span key={item} className="lab-tag">{item}</span>)}
            </div>
          </section>

          <section className="lab-panel-card">
            <div className="lab-card-title">
              <Beaker className="w-4 h-4" />
              <strong>Required Chemicals</strong>
            </div>
            <div className="lab-tag-grid">
              {selectedExperiment?.chemicals?.map((item) => <span key={item} className="lab-tag alt">{item}</span>)}
            </div>
          </section>

          <section className="lab-panel-card">
            <div className="lab-card-title">
              <ShieldCheck className="w-4 h-4" />
              <strong>Workflow</strong>
            </div>
            <div className="lab-sequence-list">
              {['Experiment Information', 'Apparatus Setup', 'Chemical Preparation', 'Procedure', 'Virtual Experiment', 'Observation Table', 'Calculation', 'Result', 'Conclusion'].map((item, index) => (
                <div key={item} className="lab-sequence-item">
                  <span>{index + 1}</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderApparatusTab() {
    return (
      <div className="lab-content-card">
        <div className="lab-content-head">
          <div>
            <span className="lab-section-label">Apparatus Setup</span>
            <h2>Visual instrument reference</h2>
            <p>Use these instruments in the workspace exactly as required for the experiment.</p>
          </div>
        </div>

        <div className="lab-apparatus-grid">
          {requiredEquipment.map((type) => {
            const placed = workspaceState.instances.some((item) => item.type === type);
            return (
              <article key={type} className={`lab-apparatus-card ${placed ? 'ready' : ''}`}>
                <div className="lab-apparatus-head">
                  <strong>{getEquipmentLabel(type)}</strong>
                  <span>{placed ? 'Placed' : 'Required'}</span>
                </div>
                <pre>{APPARATUS_ASCII[type] || APPARATUS_ASCII.default}</pre>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  function renderProcedureTab() {
    const procedure = selectedExperiment?.procedure?.length ? selectedExperiment.procedure : stage.steps;
    return (
      <div className="lab-content-card">
        <div className="lab-content-head">
          <div>
            <span className="lab-section-label">Procedure</span>
            <h2>Step-by-step experiment flow</h2>
            <p>Move through the experiment in this order and use the virtual lab when you are ready.</p>
          </div>
        </div>

        <div className="lab-step-progress">
          {procedure.map((step, index) => (
            <div key={`${index}-${step}`} className={`lab-step-node ${index <= stage.currentStep ? 'active' : ''}`}>
              <span>{index + 1}</span>
            </div>
          ))}
        </div>

        <div className="lab-step-list">
          {procedure.map((step, index) => (
            <article key={`${index}-${step}`} className={`lab-step-card ${index === stage.currentStep ? 'current' : ''}`}>
              <strong>Step {index + 1}</strong>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </div>
    );
  }

  function renderVirtualTab() {
    return (
      <>
        <div className="lab-main-grid">
          <aside className="lab-side-panel">
            <div className="lab-column-head">
              <span className="lab-section-label">Instruments</span>
              <strong>20%</strong>
            </div>
            <div className="lab-side-scroll">
              {INSTRUMENT_GROUPS.map((group) => (
                <section key={group.id} className="lab-side-section">
                  <h3>{group.title}</h3>
                  <div className="lab-button-list">
                    {group.items.map((item) => (
                      <button key={item.id} type="button" className="lab-tool-button" onClick={() => spawnInstrument(item.id)}>
                        <strong>{item.label}</strong>
                        <span>{item.hint}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </aside>

          <section className="lab-workspace-panel">
            <div className="lab-column-head">
              <span className="lab-section-label">Workspace</span>
              <strong>60%</strong>
            </div>
            <div className="lab-workspace-frame">
              <WorkspacePanel
                theme={theme}
                reagentVolume={dispenseVolume}
                reagentConcentration={reagentConcentration}
                reagentNormality={reagentNormality}
                onAddReading={handleLogReading}
                onSimulationEvent={handleWorkspaceEvent}
                initialWorkspaceState={workspaceSeed}
                onWorkspaceStateChange={setWorkspaceState}
              />
            </div>
          </section>

          <aside className="lab-side-panel">
            <div className="lab-column-head">
              <span className="lab-section-label">Chemicals</span>
              <strong>20%</strong>
            </div>
            <div className="lab-side-scroll">
              <label className="lab-search">
                <Search className="w-4 h-4" />
                <input
                  value={chemicalQuery}
                  onChange={(event) => setChemicalQuery(event.target.value)}
                  placeholder="Search chemical..."
                />
              </label>

              <div className="lab-volume-row">
                {[0.1, 0.5, 1, 5, 10, 20, 50].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={dispenseVolume === value ? 'active' : ''}
                    onClick={() => setDispenseVolume(value)}
                  >
                    {value} mL
                  </button>
                ))}
              </div>

              <div className="lab-concentration-box">
                <div className="lab-concentration-head">
                  <span className="lab-section-label">Concentration</span>
                  <strong>{reagentConcentration.toFixed(reagentConcentration < 0.1 ? 2 : 1)} M</strong>
                </div>
                <div className="lab-volume-row">
                  {[0, 0.01, 0.05, 0.1, 0.5, 1].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={Math.abs(reagentConcentration - value) < 0.0001 ? 'active' : ''}
                      onClick={() => setReagentConcentration(value)}
                    >
                      {value} M
                    </button>
                  ))}
                </div>
                <label className="lab-concentration-input">
                  <span>Custom</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.01"
                    value={reagentConcentration}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setReagentConcentration(Number.isFinite(next) ? Math.max(0, next) : 0);
                    }}
                  />
                  <span>M</span>
                </label>
              </div>

              <div className="lab-concentration-box">
                <div className="lab-concentration-head">
                  <span className="lab-section-label">Normality</span>
                  <strong>{reagentNormality.toFixed(reagentNormality < 0.1 ? 2 : 1)} N</strong>
                </div>
                <div className="lab-volume-row">
                  {[0, 0.01, 0.05, 0.1, 0.5, 1].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={Math.abs(reagentNormality - value) < 0.0001 ? 'active' : ''}
                      onClick={() => setReagentNormality(value)}
                    >
                      {value} N
                    </button>
                  ))}
                </div>
                <label className="lab-concentration-input">
                  <span>Custom</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.01"
                    value={reagentNormality}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setReagentNormality(Number.isFinite(next) ? Math.max(0, next) : 0);
                    }}
                  />
                  <span>N</span>
                </label>
              </div>

              {filteredChemicals.map((category) => (
                <section key={category.id} className="lab-side-section">
                  <button type="button" className="lab-category-toggle" onClick={() => toggleCategory(category.id)}>
                    <span>{category.label}</span>
                    {expandedCategories[category.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedCategories[category.id] && (
                    <div className="lab-chemical-list">
                      {category.items.map((chemical) => (
                        <div
                          key={chemical.id}
                          className="lab-chemical-card"
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData('reagent', chemical.id);
                            event.dataTransfer.setData('concentration', String(reagentConcentration));
                            event.dataTransfer.setData('normality', String(reagentNormality));
                          }}
                        >
                          <span className="lab-swatch" style={{ background: chemical.color }} />
                          <div>
                            <strong>{chemical.formula}</strong>
                            <p>{chemical.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </aside>
        </div>

        <div className="lab-bottom-grid">
          <section className="lab-bottom-card">
            <div className="lab-card-title">
              <BrainCircuit className="w-4 h-4" />
              <strong>AI Instructor</strong>
            </div>
            <p>{stage.warning || `Step ${stage.currentStep + 1}: ${stage.steps[stage.currentStep]}`}</p>
            <div className="lab-chat-feed">
              {chatHistory.slice(-3).map((item) => (
                <article key={item.id} className={`lab-chat-bubble ${item.role}`}>
                  {item.text}
                </article>
              ))}
            </div>
            <div className="lab-chat-form">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') askInstructor();
                }}
                placeholder="Ask the instructor..."
              />
              <button type="button" onClick={askInstructor}>Ask</button>
            </div>
          </section>

          <section className="lab-bottom-card">
            <div className="lab-card-title">
              <Bell className="w-4 h-4" />
              <strong>Notifications</strong>
            </div>
            <div className="lab-feed-list">
              {notifications.slice(0, 4).map((item) => (
                <article key={item.id} className="lab-feed-item">
                  <strong>{item.title}</strong>
                  <p>{item.message}</p>
                </article>
              ))}
              {!notifications.length && <p className="lab-muted">No notifications yet.</p>}
            </div>
          </section>

          <section className="lab-bottom-card">
            <div className="lab-card-title">
              <Gauge className="w-4 h-4" />
              <strong>Lab Status</strong>
            </div>
            <div className="lab-status-grid">
              <article>
                <span>pH</span>
                <strong>{labStatus.ph}</strong>
              </article>
              <article>
                <span>Conductivity</span>
                <strong>{labStatus.conductivity} mS/cm</strong>
              </article>
              <article>
                <span>Temperature</span>
                <strong>{labStatus.temperature} C</strong>
              </article>
              <article>
                <span>Observation Rows</span>
                <strong>{labStatus.readings}</strong>
              </article>
              <article>
                <span>Chemicals Loaded</span>
                <strong>{labStatus.chemicalsLoaded}</strong>
              </article>
            </div>
          </section>
        </div>
      </>
    );
  }

  function renderObservationTab() {
    const numericFields = new Set(['initialReading', 'finalReading', 'volumeUsed', 'ph', 'conductivity', 'temperature']);
    const observationColumns = [
      { key: 'trial', label: 'Trial', type: 'text', readOnly: true, placeholder: '#' },
      { key: 'initialReading', label: 'Initial (mL)', type: 'number', placeholder: '0.00' },
      { key: 'finalReading', label: 'Final (mL)', type: 'number', placeholder: '0.00' },
      { key: 'volumeUsed', label: 'Volume Used (mL)', type: 'number', placeholder: 'Auto' },
      { key: 'ph', label: 'pH', type: 'number', placeholder: '7.00' },
      { key: 'conductivity', label: 'Conductivity (mS/cm)', type: 'number', placeholder: '0.00' },
      { key: 'temperature', label: 'Temp (C)', type: 'number', placeholder: '25' },
      { key: 'notes', label: 'Observation Notes', type: 'text', placeholder: 'Color / endpoint...' }
    ];

    const isInvalidValue = (key, value) => {
      if (!numericFields.has(key)) return false;
      if (value === '' || value === null || value === undefined) return false;
      return !Number.isFinite(Number(value));
    };

    const updateReading = (rowId, key, value) => {
      setReadings((current) => current.map((item, index) => {
        if (item.id !== rowId) return item;
        const next = { ...item, [key]: value };
        if (key === 'trial') {
          next.trial = Number(value) || index + 1;
        }
        if (key === 'volumeUsed') {
          next.volumeUsedManual = value !== '';
        }
        if (autoVolumeCalc && (key === 'initialReading' || key === 'finalReading')) {
          const initial = Number(next.initialReading);
          const final = Number(next.finalReading);
          if (Number.isFinite(initial) && Number.isFinite(final) && !next.volumeUsedManual) {
            const computed = Math.max(0, final - initial);
            next.volumeUsed = computed ? computed.toFixed(2) : '0.00';
          }
        }
        return next;
      }));
    };

    return (
      <div className="lab-content-card">
        <div className="lab-content-head">
          <div>
            <span className="lab-section-label">Observation</span>
            <h2>Advanced observation table</h2>
            <p>Enter your measured values here. These inputs are used for calculations and reports.</p>
          </div>
          <div className="lab-observation-actions">
            <button
              type="button"
              className="lab-secondary-button"
              onClick={() => setReadings((current) => [...current, {
                id: `${Date.now()}-manual`,
                trial: current.length + 1,
                initialReading: '',
                finalReading: '',
                volumeUsed: '',
                ph: '',
                conductivity: '',
                temperature: '',
                notes: '',
                volumeUsedManual: false
              }])}
            >
              <span>Add Row</span>
            </button>
            <button
              type="button"
              className="lab-secondary-button"
              onClick={() => setAutoVolumeCalc((value) => !value)}
            >
              <span>{autoVolumeCalc ? 'Auto Volume: On' : 'Auto Volume: Off'}</span>
            </button>
            <button
              type="button"
              className="lab-secondary-button"
              onClick={() => setReadings([])}
            >
              <span>Clear Table</span>
            </button>
          </div>
        </div>

        <div className="lab-observation-grid">
          <section className="lab-panel-card">
            <div className="lab-card-title">
              <NotebookPen className="w-4 h-4" />
              <strong>Observation Table</strong>
            </div>
            <div className="lab-table-wrap">
                <table className="lab-record-table">
                  <thead>
                    <tr>
                      {observationColumns.map((col) => (
                        <th key={col.key}>{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {readings.map((row, index) => (
                      <tr key={row.id}>
                        {observationColumns.map((col) => (
                          <td key={col.key}>
                            <input
                              type={col.type}
                              inputMode={col.type === 'number' ? 'decimal' : undefined}
                              step={col.type === 'number' ? '0.01' : undefined}
                              readOnly={col.readOnly}
                              placeholder={col.placeholder}
                              value={col.key === 'trial' ? (row[col.key] ?? index + 1) : (row[col.key] ?? '')}
                              onChange={(event) => updateReading(row.id, col.key, event.target.value)}
                              className={isInvalidValue(col.key, row[col.key]) ? 'lab-input-invalid' : undefined}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                    {!readings.length && (
                      <tr>
                        <td colSpan={observationColumns.length} className="lab-empty-cell">Add rows and enter your observation values to populate this table.</td>
                      </tr>
                    )}
                  </tbody>
              </table>
            </div>
          </section>

          <section className="lab-panel-card">
            <div className="lab-card-title">
              <WandSparkles className="w-4 h-4" />
              <strong>Observation Notes</strong>
            </div>
            <textarea
              value={observationNote}
              onChange={(event) => setObservationNote(event.target.value)}
              placeholder="Write the color change, endpoint, bubble formation, or temperature trend..."
            />
            <div className="lab-feed-list">
              {autoObservations.map((item) => (
                <article key={item.id} className="lab-feed-item">
                  <p>{item.text}</p>
                </article>
              ))}
              {!autoObservations.length && <p className="lab-muted">Automatic reaction observations will appear here.</p>}
            </div>
          </section>
        </div>
      </div>
    );
  }
  function renderResultTab() {
    return (
      <div className="lab-content-card">
        <div className="lab-content-head">
          <div>
            <span className="lab-section-label">Result</span>
            <h2>Calculation and conclusion</h2>
            <p>Average values and the final result are calculated automatically from the observation table.</p>
          </div>
        </div>

        <div className="lab-result-grid">
          <section className="lab-panel-card">
            <div className="lab-card-title">
              <Calculator className="w-4 h-4" />
              <strong>Calculation</strong>
            </div>
            <div className="lab-formula-box">
              <div>{result.formula}</div>
              <div>Average Volume = {result.averageVolume.toFixed(2)} mL</div>
              <div>Calculated Value = {result.calculatedValue ? result.calculatedValue.toFixed(4) : 'Pending'}</div>
            </div>
          </section>

          <section className="lab-panel-card">
            <div className="lab-card-title">
              <Gauge className="w-4 h-4" />
              <strong>Result Summary</strong>
            </div>
            <div className="lab-status-grid">
              <article>
                <span>Average Value</span>
                <strong>{result.averageVolume.toFixed(2)} mL</strong>
              </article>
              <article>
                <span>Final Value</span>
                <strong>{result.calculatedValue ? result.calculatedValue.toFixed(4) : 'Pending'}</strong>
              </article>
              <article>
                <span>Trials</span>
                <strong>{result.trialCount}</strong>
              </article>
              <article>
                <span>Verdict</span>
                <strong>{resultCheck.status === 'correct' ? 'Correct' : resultCheck.status === 'close' ? 'Close' : resultCheck.status === 'wrong' ? 'Review' : 'Waiting'}</strong>
              </article>
            </div>
          </section>

          <section className="lab-panel-card lab-wide-card">
            <div className="lab-card-title">
              <BrainCircuit className="w-4 h-4" />
              <strong>Conclusion</strong>
            </div>
            <p>{buildConclusion(selectedExperiment, result)}</p>
          </section>

          <section className="lab-panel-card lab-wide-card">
            <div className="lab-card-title">
              <ShieldCheck className="w-4 h-4" />
              <strong>Manual Result Checker</strong>
            </div>
            <div className="lab-result-checker">
              <label className="lab-form-field">
                <span>Manual final value</span>
                <input
                  value={manualResultValue}
                  onChange={(event) => setManualResultValue(event.target.value)}
                  placeholder="Enter the result you calculated manually"
                />
              </label>
              <div className={`lab-result-verdict ${resultCheck.status}`}>
                <strong>
                  {resultCheck.status === 'correct' ? 'Correct'
                    : resultCheck.status === 'close' ? 'Near Match'
                      : resultCheck.status === 'wrong' ? 'Incorrect'
                        : 'Waiting'}
                </strong>
                <p>{resultCheck.message}</p>
              </div>
            </div>
          </section>

          <section className="lab-panel-card lab-wide-card">
            <div className="lab-card-title">
              <WandSparkles className="w-4 h-4" />
              <strong>Feedback, Suggestions, and SaaS Readiness</strong>
            </div>
            {isExperimentCompleted ? (
              <>
                <p className="lab-muted">Great job completing the experiment. Here is feedback plus SaaS-level suggestions to elevate this experience.</p>
                <div className="lab-status-grid">
                  <article>
                    <span>Feedback</span>
                    <strong>Your experiment flow is consistent.</strong>
                    <p className="lab-muted">Observations, calculation, and verification were completed in the right sequence.</p>
                  </article>
                  <article>
                    <span>Suggestion</span>
                    <strong>Show progress checkpoints.</strong>
                    <p className="lab-muted">Add visible checkpoints for setup, readings, and result validation to keep learners on track.</p>
                  </article>
                  <article>
                    <span>SaaS Upgrade</span>
                    <strong>Team workspaces and roles.</strong>
                    <p className="lab-muted">Enable instructors, students, and reviewers with role-based access and shared lab templates.</p>
                  </article>
                  <article>
                    <span>SaaS Upgrade</span>
                    <strong>Analytics and reporting.</strong>
                    <p className="lab-muted">Add cohort dashboards, experiment completion trends, and exportable reports for admins.</p>
                  </article>
                  <article>
                    <span>Additional</span>
                    <strong>Integrations and billing.</strong>
                    <p className="lab-muted">Support SSO, LMS/LTI, and subscription plans with usage-based limits.</p>
                  </article>
                  <article>
                    <span>Additional</span>
                    <strong>Audit and compliance.</strong>
                    <p className="lab-muted">Provide audit logs, data retention controls, and secure sharing for institutions.</p>
                  </article>
                </div>
              </>
            ) : (
              <p className="lab-muted">Finish the experiment and enter a manual result to unlock feedback and SaaS suggestions.</p>
            )}
          </section>
        </div>
      </div>
    );
  }

  function renderCenterContent() {
    switch (activeTab) {
      case 'info': return renderInfoTab();
      case 'apparatus': return renderApparatusTab();
      case 'procedure': return renderProcedureTab();
      case 'virtual': return renderVirtualTab();
      case 'observation': return renderObservationTab();
      case 'result': return renderResultTab();
      default: return renderInfoTab();
    }
  }

  const activeThemeLabel = theme === 'dark' ? 'Dark Mode' : 'Light Mode';

  return (
    <div ref={labShellRef} className={`lab-shell ${isFullscreen ? 'is-fullscreen' : ''}`} data-theme={theme}>
      <NotificationStack
        notifications={notifications}
        onMinimize={(id) => setNotifications((current) => current.map((item) => (item.id === id ? { ...item, minimized: true } : item)))}
        onRestore={(id) => setNotifications((current) => current.map((item) => (item.id === id ? { ...item, minimized: false } : item)))}
        onClose={(id) => setNotifications((current) => current.filter((item) => item.id !== id))}
      />

      <header className="lab-topbar">
        <div className="lab-topbar-title">
          <Link to="/dashboard" className="lab-icon-button" aria-label="Back to dashboard">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="lab-eyebrow">Experiment Lab</span>
            <h1>{selectedExperiment?.title || 'Virtual Chemistry Lab'}</h1>
          </div>
        </div>

        <div className="mx-2">
          <LabSessionController 
            labName={selectedExperiment?.title || "Advanced Experiment Lab"}
            isActive={hasStarted}
            onStart={startExperiment}
            onEnd={async (results) => {
              addXP(250); 
              try {
                await addDoc(collection(db, 'experiment_history'), {
                  experimentName: selectedExperiment?.title || "Advanced Experiment Lab",
                  userName: profile?.name || user?.displayName || user?.email || "Student",
                  userId: user?.uid,
                  score: results.feedback?.rating ? results.feedback.rating * 20 : 85,
                  accuracy: 94,
                  result: results.feedback?.feedback || "Protocol successfully archived.",
                  chemicalsUsed: labStatus.selectedChemicals || [],
                  duration: Math.round(results.timeSpent / 60),
                  completedAt: serverTimestamp()
                });
                pushNotification('Lab Complete', 'Session archived. +250 XP earned.', 'success');
              } catch (e) {
                pushNotification('Sync Warning', 'Lab completed but cloud sync failed.', 'warning');
              }
              resetExperiment('manual');
            }}
            durationMinutes={60}
          />
        </div>

        <div className="lab-topbar-actions">
          <button type="button" className="lab-primary-button" onClick={() => setShowReportModal(true)}>
            <FileText className="w-4 h-4" />
            <span>Generate Report</span>
          </button>
          <button type="button" className="lab-secondary-button" onClick={() => toggleFullscreen()}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
          <button type="button" className="lab-theme-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <MoonStar className="w-4 h-4" /> : <SunMedium className="w-4 h-4" />}
            <span>{activeThemeLabel}</span>
          </button>
          <button type="button" className="lab-secondary-button" onClick={() => resetExperiment('manual')}>
            <Eraser className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <Link to="/dashboard" className="lab-secondary-button">
            <span>Exit</span>
          </Link>
        </div>
      </header>

      <nav className="lab-tabbar">
        {WORKFLOW_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`lab-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
      {activeTab !== 'virtual' && (
        <div className="lab-overview-layout">
          <aside className="lab-overview-sidebar">
            <section className="lab-panel-card">
              <div className="lab-card-title">
                <Sparkles className="w-4 h-4" />
                <strong>Experiment Catalog</strong>
              </div>
              <label className="lab-search">
                <Search className="w-4 h-4" />
                <input
                  value={catalogQuery}
                  onChange={(event) => setCatalogQuery(event.target.value)}
                  placeholder="Search experiment..."
                />
              </label>
              <div className="lab-experiment-list">
                {filteredExperiments.map((experiment) => (
                  <button
                    key={experiment.id}
                    type="button"
                    className={`lab-experiment-card ${selectedExperimentId === experiment.id ? 'active' : ''}`}
                    onClick={() => startTransition(() => setSelectedExperimentId(experiment.id))}
                  >
                    <div className="lab-experiment-head">
                      <span>{experiment.sourceType}</span>
                      <strong>{experiment.difficultyLevel}</strong>
                    </div>
                    <h3>{experiment.title}</h3>
                    <p>{experiment.estimatedTime}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="lab-panel-card">
              <div className="lab-card-title">
                <WandSparkles className="w-4 h-4" />
                <strong>AI Document Import</strong>
              </div>
              <p>Upload a practical PDF, DOC, DOCX, or TXT file and convert it into a new experiment.</p>
              <label className="lab-upload-box">
                <input type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,text/plain" onChange={handleUploadExperiment} />
                <span>Upload practical document</span>
              </label>
              {uploadState.status && <p className="lab-upload-status">{uploadState.status}</p>}
              {uploadState.error && <p className="lab-upload-error">{uploadState.error}</p>}
            </section>

            <section className="lab-panel-card">
              <div className="lab-card-title">
                <CirclePlus className="w-4 h-4" />
                <strong>Create Experiment</strong>
              </div>
              <p>Build a new experiment with your own aim, apparatus, chemicals, procedure, and formula.</p>
              <button type="button" className="lab-primary-button lab-full-button" onClick={() => setShowCreateModal(true)}>
                <CirclePlus className="w-4 h-4" />
                <span>Create Experiment</span>
              </button>
            </section>
          </aside>

            <section className="lab-overview-content">
              {renderCenterContent()}
            </section>
          </div>
        )}

      {activeTab === 'virtual' && renderCenterContent()}

      <AnimatePresence>
        {showCreateModal && (
          <motion.div className="lab-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="lab-modal" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }}>
              <div className="lab-modal-head">
                <div>
                  <span className="lab-section-label">Create Experiment</span>
                  <h2>Generate a new virtual chemistry lab</h2>
                </div>
                <button type="button" className="lab-icon-button" onClick={() => setShowCreateModal(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="lab-form-grid">
                {[
                  ['title', 'Experiment Name'],
                  ['aim', 'Aim'],
                  ['theory', 'Theory'],
                  ['apparatus', 'Apparatus'],
                  ['chemicals', 'Chemicals'],
                  ['procedure', 'Procedure'],
                  ['formula', 'Formula'],
                  ['resultMethod', 'Result Method']
                ].map(([key, label]) => (
                  <label key={key} className={`lab-form-field ${['aim', 'theory', 'apparatus', 'chemicals', 'procedure', 'resultMethod'].includes(key) ? 'wide' : ''}`}>
                    <span>{label}</span>
                    {['aim', 'theory', 'apparatus', 'chemicals', 'procedure', 'resultMethod'].includes(key) ? (
                      <textarea
                        value={createForm[key]}
                        onChange={(event) => setCreateForm((current) => ({ ...current, [key]: event.target.value }))}
                      />
                    ) : (
                      <input
                        value={createForm[key]}
                        onChange={(event) => setCreateForm((current) => ({ ...current, [key]: event.target.value }))}
                      />
                    )}
                  </label>
                ))}

                <label className="lab-form-field">
                  <span>Difficulty Level</span>
                  <select
                    value={createForm.difficultyLevel}
                    onChange={(event) => setCreateForm((current) => ({ ...current, difficultyLevel: event.target.value }))}
                  >
                    {['Beginner', 'Intermediate', 'Advanced', 'Research'].map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="lab-modal-actions">
                <button type="button" className="lab-secondary-button" onClick={() => setCreateForm(DEFAULT_FORM)}>Reset Form</button>
                <button type="button" className="lab-primary-button" onClick={createExperiment}>Generate Experiment</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
