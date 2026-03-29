import { Experiment } from "./types";

export const experiments: Experiment[] = [
  {
    id: "titration",
    title: "Acid-Base Titration",
    description: "Determine the concentration of an unknown acid by slowly adding a strong base with a known concentration.",
    aim: "Determine the concentration of an unknown acid by slowly adding a strong base with a known concentration.",
    theory: "An acid reacts with a base to form salt and water. A measured titration endpoint is used to compute an unknown concentration.",
    apparatus: ['Burette', 'Pipette', 'Conical Flask', 'Beaker', 'Stand', 'pH Meter'],
    chemicals: ['HCl', 'NaOH', 'Phenolphthalein'],
    procedure: [
      'Prepare the burette and pipette.',
      'Add acid to the flask.',
      'Add indicator.',
      'Fill burette with base.',
      'Titrate slowly to endpoint.',
      'Record the burette reading.'
    ],
    formula: 'M1V1 = M2V2',
    difficulty: "Intermediate",
    time: "25 min",
    calculations: { knowns: { V1: 10, M2: 0.1 } }
  },
  {
    id: "spectroscopy",
    title: "Emission Spectroscopy",
    description: "Analyze the emission spectra of various elements when excited by a high-voltage electrical discharge.",
    aim: "Analyze the emission spectra of various elements when excited by a high-voltage electrical discharge.",
    theory: "Each element has a unique emission spectrum that acts as a chemical fingerprint.",
    apparatus: ['Spectrometer', 'Discharge Tubes', 'High Voltage Source'],
    chemicals: ['Hydrogen', 'Helium', 'Neon', 'Mercury'],
    procedure: [
      'Set up the spectrometer.',
      'Apply voltage to the discharge tube.',
      'Observe the emission lines.',
      'Measure the wavelengths.'
    ],
    formula: 'E = hf = hc/λ',
    difficulty: "Advanced",
    time: "40 min",
    calculations: { knowns: {} }
  },
  {
    id: "stoichiometry",
    title: "Stoichiometry Basics",
    description: "Learn how to predict the amounts of products and reactants involved in simple precipitation reactions.",
    aim: "Learn how to predict the amounts of products and reactants involved in simple precipitation reactions.",
    theory: "Stoichiometry involves quantitative relationships between reactants and products in a balanced chemical equation.",
    apparatus: ['Beaker', 'Glass Rod', 'Filter Paper', 'Balance'],
    chemicals: ['BaCl2', 'Na2SO4', 'Distilled Water'],
    procedure: [
      'Prepare reactant solutions.',
      'Mix solutions to form precipitate.',
      'Filter and dry the precipitate.',
      'Measure the mass of product.'
    ],
    formula: 'm = n * M',
    difficulty: "Beginner",
    time: "15 min",
    calculations: { knowns: {} }
  },
  {
    id: "titration-h2so4",
    title: "H2SO4 + NaOH Neutralization",
    description: "Determine the concentration of Sulfuric Acid through precise titration with Sodium Hydroxide.",
    aim: "Determine the concentration of H2SO4 through precise titration with NaOH.",
    theory: "Sulfuric acid is a diprotic acid, meaning it releases two protons per molecule. The neutralization reaction is H2SO4 + 2NaOH -> Na2SO4 + 2H2O.",
    apparatus: ['Burette', 'Pipette', 'Conical Flask', 'Beaker', 'Stand', 'pH Meter'],
    chemicals: ['H2SO4', 'NaOH', 'Phenolphthalein'],
    procedure: ['Prepare burette with NaOH.', 'Pipette 10mL H2SO4.', 'Add indicator.', 'Titrate until pink.', 'Calculate Molarity.'],
    formula: 'M1V1 = 2 * M2V2',
    difficulty: "Intermediate",
    time: "30 min",
    calculations: { knowns: { V1: 10, M2: 0.1 } }
  },
  {
    id: "precipitation-silver",
    title: "AgNO3 + NaCl Precipitation",
    description: "Observe the formation of a white Silver Chloride precipitate in this classic double displacement reaction.",
    aim: "Observe and confirm the precipitation of AgCl.",
    theory: "Silver Nitrate reacts with Sodium Chloride to form an insoluble white solid, Silver Chloride (AgCl).",
    apparatus: ['Beaker', 'Test Tube', 'Glass Rod', 'Filter Paper'],
    chemicals: ['AgNO3', 'NaCl', 'Distilled Water'],
    procedure: ['Mix solutions.', 'Observe white precipitate.', 'Filter if needed.'],
    formula: 'Ag+ + Cl- -> AgCl (s)',
    difficulty: "Beginner",
    time: "15 min",
    calculations: { knowns: {} }
  },
  {
    id: "precipitation-lead",
    title: "Pb(NO3)2 + KI Precipitation",
    description: "Witness the 'Golden Rain' effect by forming bright yellow Lead Iodide crystals.",
    aim: "Prepare and observe the yellow precipitate of Lead(II) Iodide.",
    theory: "Lead Nitrate and Potassium Iodide react to form Lead Iodate, which is insoluble and bright yellow.",
    apparatus: ['Beaker', 'Glass Rod', 'Bunsen Burner'],
    chemicals: ['Pb(NO3)2', 'KI', 'Distilled Water'],
    procedure: ['Mix Pb(NO3)2 and KI.', 'Watch yellow precipitate form.', 'Heat to dissolve and cool to see golden crystals.'],
    formula: 'Pb2+ + 2I- -> PbI2 (s)',
    difficulty: "Advanced",
    time: "20 min",
    calculations: { knowns: {} }
  },
  {
    id: "gas-zinc",
    title: "Zn + HCl Gas Evolution",
    description: "React metal with acid to produce Hydrogen gas and perform the pop test.",
    aim: "Observe the reaction of Zinc with HCl and identify the gas produced.",
    theory: "Metals react with acids to produce a salt and hydrogen gas. Zinc + 2HCl -> ZnCl2 + H2.",
    apparatus: ['Test Tube', 'Delivery Tube', 'Dropper'],
    chemicals: ['Zinc Granules', 'HCl'],
    procedure: ['Add Zn to test tube.', 'Add HCl.', 'Collect gas.', 'Perform pop test.'],
    formula: 'Zn + 2H+ -> Zn2+ + H2',
    difficulty: "Beginner",
    time: "15 min",
    calculations: { knowns: {} }
  }
];
