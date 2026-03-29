export const INSTRUMENT_GROUPS = [
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

export const CHEMICAL_LIBRARY = [
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

export const APPARATUS_DEFAULTS = {
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
