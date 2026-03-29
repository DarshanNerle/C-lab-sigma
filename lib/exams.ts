export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface ExamTopic {
  id: string;
  title: string;
  description: string;
  category: string;
  questions: Question[];
}

interface QuestionSeed {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface TopicBlueprint {
  id: string;
  title: string;
  category: string;
  description: string;
  questionBank: QuestionSeed[];
}

interface ExamVariant {
  slug: string;
  label: string;
  summary: string;
}

const makeQuestion = (
  question: string,
  options: string[],
  correctAnswer: number,
  explanation: string
): QuestionSeed => ({
  question,
  options,
  correctAnswer,
  explanation,
});

const examVariants: ExamVariant[] = [
  { slug: "foundations", label: "Foundations", summary: "Builds fluency with the key definitions and first-step rules." },
  { slug: "core-concepts", label: "Core Concepts", summary: "Checks whether the learner can connect the major ideas with confidence." },
  { slug: "application-drill", label: "Application Drill", summary: "Applies the same ideas to direct laboratory-style scenarios." },
  { slug: "problem-solving", label: "Problem Solving", summary: "Mixes conceptual recall with short reasoning questions." },
  { slug: "precision-round", label: "Precision Round", summary: "Focuses on careful distinctions that often trap rushed answers." },
  { slug: "concept-audit", label: "Concept Audit", summary: "Reviews the full topic for consistency across multiple sub-concepts." },
  { slug: "calculation-checkpoint", label: "Calculation Checkpoint", summary: "Includes numeracy and interpretation where the topic allows it." },
  { slug: "mixed-review", label: "Mixed Review", summary: "Blends familiar and less familiar prompts to test retention." },
  { slug: "mastery-review", label: "Mastery Review", summary: "Pushes for strong command over the complete topic map." },
  { slug: "final-challenge", label: "Final Challenge", summary: "Acts as a capstone checkpoint before moving to the next unit." },
];

const topicBlueprints: TopicBlueprint[] = [
  {
    id: "acid-base",
    title: "Acid-Base Principles",
    category: "Foundations",
    description: "Covers Arrhenius, Bronsted-Lowry, Lewis theory, pH, buffers, and indicators.",
    questionBank: [
      makeQuestion("An Arrhenius acid increases the concentration of which ion in water?", ["OH-", "H3O+", "Na+", "Cl-"], 1, "Arrhenius acids raise the hydronium ion concentration in aqueous solution."),
      makeQuestion("A Bronsted-Lowry base is best described as a:", ["Proton donor", "Proton acceptor", "Electron donor", "Salt former"], 1, "Bronsted-Lowry bases accept protons."),
      makeQuestion("What is the conjugate acid of NH3?", ["NH2-", "NH4+", "N2H4", "NH4"], 1, "Adding one proton to ammonia gives ammonium, NH4+."),
      makeQuestion("At 25 C, a neutral aqueous solution has a pH of:", ["1", "7", "10", "14"], 1, "Neutral water at 25 C has equal hydronium and hydroxide concentrations, giving pH 7."),
      makeQuestion("Which substance is a strong acid in water?", ["CH3COOH", "HF", "HNO3", "HCN"], 2, "Nitric acid dissociates essentially completely in water."),
      makeQuestion("Which species acts as a weak base in water?", ["NH3", "HCl", "HNO3", "H2SO4"], 0, "Ammonia accepts a proton from water but does not ionize completely."),
      makeQuestion("What is the pH of a 0.001 M HCl solution?", ["1", "2", "3", "11"], 2, "A 0.001 M strong acid has hydronium concentration 10^-3 M, so pH = 3."),
      makeQuestion("A buffer solution resists sudden changes in:", ["Color", "Temperature", "pH", "Pressure"], 2, "Buffers limit pH changes when small amounts of acid or base are added."),
      makeQuestion("Phenolphthalein is typically what color in a basic solution?", ["Colorless", "Pink", "Green", "Blue"], 1, "Phenolphthalein turns pink in basic conditions."),
      makeQuestion("When Na2CO3 reacts with HCl, which gas is released?", ["O2", "CO2", "H2", "Cl2"], 1, "Acid-carbonate reactions release carbon dioxide."),
      makeQuestion("Which sample has the greatest hydronium ion concentration?", ["pH 2", "pH 4", "pH 7", "pH 10"], 0, "Lower pH means higher hydronium ion concentration."),
      makeQuestion("A Lewis acid is defined as a species that:", ["Accepts an electron pair", "Donates a proton", "Releases hydroxide", "Accepts a neutron"], 0, "Lewis acids accept electron pairs from Lewis bases."),
    ],
  },
  {
    id: "atomic-structure",
    title: "Atomic Structure",
    category: "Foundations",
    description: "Explores subatomic particles, quantum numbers, electron configuration, and periodic logic.",
    questionBank: [
      makeQuestion("Which subatomic particle determines the identity of an element?", ["Electron", "Neutron", "Proton", "Photon"], 2, "The atomic number equals the number of protons and identifies the element."),
      makeQuestion("The principal quantum number n mainly indicates the electron's:", ["Spin", "Energy level", "Orbital orientation", "Magnetic moment"], 1, "The principal quantum number labels the main shell or energy level."),
      makeQuestion("What is the electron configuration of carbon in the ground state?", ["1s2 2s2 2p2", "1s2 2s4", "1s2 2p4", "1s2 2s2 2p4"], 0, "Carbon has six electrons arranged as 1s2 2s2 2p2."),
      makeQuestion("How many electrons can occupy one orbital at most?", ["1", "2", "4", "6"], 1, "An orbital holds up to two electrons with opposite spins."),
      makeQuestion("Which quantum number describes orbital shape?", ["Principal", "Magnetic", "Azimuthal", "Spin"], 2, "The azimuthal quantum number l determines the orbital subshell shape."),
      makeQuestion("Which subshell is filled after 3p in the usual Aufbau order?", ["3d", "4s", "4p", "5s"], 1, "The 4s subshell is filled before 3d in the Aufbau sequence."),
      makeQuestion("An isotope differs from another isotope of the same element by having a different number of:", ["Protons", "Neutrons", "Electrons", "Valence shells"], 1, "Isotopes share proton count but differ in neutron count."),
      makeQuestion("Which statement about cathode rays is correct?", ["They are streams of protons", "They are streams of electrons", "They are gamma rays", "They are alpha particles"], 1, "Cathode rays are streams of electrons."),
      makeQuestion("What is the charge on a neutron?", ["+1", "-1", "0", "+2"], 2, "Neutrons are electrically neutral."),
      makeQuestion("The number of valence electrons in sodium is:", ["1", "2", "8", "11"], 0, "Sodium has electron configuration 2,8,1, so it has one valence electron."),
      makeQuestion("Which element has the electron configuration 1s2 2s2 2p6 3s1?", ["Neon", "Magnesium", "Sodium", "Aluminum"], 2, "That configuration corresponds to sodium, atomic number 11."),
      makeQuestion("A cation forms when an atom:", ["Gains electrons", "Loses electrons", "Gains neutrons", "Loses protons"], 1, "Losing electrons leaves the atom with a net positive charge."),
    ],
  },
  {
    id: "chemical-bonding",
    title: "Chemical Bonding",
    category: "Foundations",
    description: "Tests ionic and covalent bonding, VSEPR theory, polarity, and intermolecular ideas.",
    questionBank: [
      makeQuestion("An ionic bond forms primarily through:", ["Sharing electron pairs", "Transfer of electrons", "Hydrogen bonding", "Nuclear fusion"], 1, "Ionic bonding results from electron transfer and electrostatic attraction."),
      makeQuestion("Which molecule is linear?", ["H2O", "NH3", "CO2", "SO2"], 2, "CO2 has two electron domains around carbon and no lone pairs on the central atom."),
      makeQuestion("What is the bond angle in methane closest to?", ["90 degrees", "109.5 degrees", "120 degrees", "180 degrees"], 1, "Methane has tetrahedral geometry with bond angles near 109.5 degrees."),
      makeQuestion("A polar covalent bond is produced when atoms have:", ["Equal electronegativity", "Different electronegativity", "No valence electrons", "The same atomic radius"], 1, "Unequal electron sharing creates a polar covalent bond."),
      makeQuestion("Which force is strongest between water molecules?", ["London dispersion", "Hydrogen bonding", "Metallic bonding", "Ion-dipole only"], 1, "Water molecules form strong hydrogen bonds."),
      makeQuestion("The shape of NH3 is:", ["Linear", "Trigonal planar", "Trigonal pyramidal", "Octahedral"], 2, "Three bonding pairs and one lone pair create a trigonal pyramidal shape."),
      makeQuestion("Which pair is most likely to form an ionic compound?", ["Na and Cl", "H and O", "C and H", "N and O"], 0, "A metal and a nonmetal commonly form an ionic compound."),
      makeQuestion("Which molecule is nonpolar overall?", ["HCl", "NH3", "CO2", "SO2"], 2, "The polar bonds in CO2 cancel because the molecule is linear and symmetrical."),
      makeQuestion("In Lewis structures, a single covalent bond represents:", ["One shared electron", "One shared electron pair", "Two protons", "A full octet"], 1, "A single line represents one shared pair of electrons."),
      makeQuestion("What type of solid is sodium chloride?", ["Molecular solid", "Ionic crystal", "Metallic crystal", "Network covalent solid"], 1, "NaCl exists as a giant ionic lattice."),
      makeQuestion("Which substance has metallic bonding?", ["Copper", "Carbon dioxide", "Ice", "Sodium chloride"], 0, "Metals such as copper are held together by metallic bonding."),
      makeQuestion("Which statement about sigma bonds is correct?", ["They form by sidewise overlap only", "They are weaker than all pi bonds", "They form by head-on overlap", "They cannot exist in single bonds"], 2, "Sigma bonds arise from head-on overlap of orbitals."),
    ],
  },
  {
    id: "thermodynamics",
    title: "Thermodynamics",
    category: "Physical Chemistry",
    description: "Focuses on enthalpy, entropy, Gibbs free energy, calorimetry, and spontaneity.",
    questionBank: [
      makeQuestion("For a spontaneous process at constant temperature and pressure, delta G is:", ["Positive", "Negative", "Zero only", "Undefined"], 1, "A spontaneous process has a negative Gibbs free energy change."),
      makeQuestion("The SI unit of enthalpy change is commonly reported as:", ["mol", "kJ mol^-1", "atm", "K"], 1, "Enthalpy changes for reactions are often expressed in kilojoules per mole."),
      makeQuestion("An exothermic reaction has delta H that is:", ["Positive", "Negative", "Zero", "Always one"], 1, "Exothermic reactions release heat, so delta H is negative."),
      makeQuestion("Standard enthalpy of formation of an element in its standard state is:", ["1", "100", "0", "-273"], 2, "By definition, that value is zero."),
      makeQuestion("Entropy generally increases when a solid changes to a:", ["Solid mixture", "Liquid or gas", "Denser crystal", "Lower energy level only"], 1, "Liquids and gases are more disordered than solids."),
      makeQuestion("In a coffee-cup calorimeter, the heat gained by the solution is equal in magnitude and opposite in sign to the heat:", ["Stored in the thermometer", "Released or absorbed by the reaction", "Needed to break all bonds", "Carried by light"], 1, "Energy conservation gives q_solution = -q_reaction."),
      makeQuestion("What does a positive delta S indicate?", ["Lower disorder", "Higher disorder", "No heat flow", "Negative temperature"], 1, "A positive entropy change means disorder increases."),
      makeQuestion("If both delta H and delta S are negative, spontaneity at low temperature is usually:", ["Favored", "Impossible", "Independent of temperature", "Always unfavorable"], 0, "When both are negative, lower temperature makes delta G more likely to be negative."),
      makeQuestion("A reaction with delta H = -50 kJ mol^-1 and delta S = +100 J mol^-1 K^-1 is generally:", ["Never spontaneous", "Spontaneous at all temperatures", "Spontaneous only at low temperature", "At equilibrium only"], 1, "Negative delta H and positive delta S both favor spontaneity."),
      makeQuestion("Which law states that energy cannot be created or destroyed?", ["First law of thermodynamics", "Second law of thermodynamics", "Boyle's law", "Avogadro's law"], 0, "The first law is the conservation of energy."),
      makeQuestion("Breaking chemical bonds is generally:", ["Exothermic", "Endothermic", "Spontaneous always", "Entropy-free"], 1, "Energy is required to break chemical bonds."),
      makeQuestion("The expression delta G = delta H - T delta S shows that temperature multiplies:", ["Enthalpy", "Entropy", "Pressure", "Volume"], 1, "The entropy term is scaled by temperature in the Gibbs equation."),
    ],
  },
  {
    id: "chemical-kinetics",
    title: "Chemical Kinetics",
    category: "Physical Chemistry",
    description: "Measures rate, activation energy, catalysts, and the factors that change reaction speed.",
    questionBank: [
      makeQuestion("A catalyst speeds up a reaction by:", ["Increasing delta H", "Lowering activation energy", "Changing equilibrium constant", "Adding more product"], 1, "Catalysts provide an alternative pathway with lower activation energy."),
      makeQuestion("The usual unit for reaction rate is:", ["mol L^-1 s^-1", "mol L^-1", "s", "kg m^-3"], 0, "Reaction rate is concentration change per unit time."),
      makeQuestion("Increasing temperature usually makes a reaction faster because particles:", ["Lose mass", "Collide more effectively", "Stop vibrating", "Become neutral"], 1, "Higher temperature increases collision energy and frequency."),
      makeQuestion("The rate law for a reaction must be determined from:", ["The balanced equation only", "Experimental data", "The product color only", "The catalyst name"], 1, "Reaction order is determined experimentally."),
      makeQuestion("For a first-order reaction, a plot of ln[A] versus time is:", ["Curved upward", "A straight line", "Always zero", "A horizontal line"], 1, "First-order integrated kinetics give a linear ln[A] vs time plot."),
      makeQuestion("Which change usually increases reaction rate for a solid reactant?", ["Decrease surface area", "Increase surface area", "Remove solvent", "Lower concentration"], 1, "More exposed surface allows more collisions."),
      makeQuestion("Activation energy is the minimum energy needed for:", ["Product storage", "An effective collision", "Bond vibration only", "Heat transfer"], 1, "Colliding particles must overcome the activation barrier to react."),
      makeQuestion("In the expression rate = k[A]^2, the reaction order with respect to A is:", ["0", "1", "2", "3"], 2, "The exponent on A is the order with respect to A."),
      makeQuestion("A zero-order reaction has a rate that is:", ["Independent of concentration", "Directly proportional to concentration", "Inversely proportional to concentration", "Always negative"], 0, "Zero-order rate does not depend on reactant concentration."),
      makeQuestion("Which statement about catalysts is correct?", ["They are consumed completely", "They change the final equilibrium position", "They speed forward and reverse reactions", "They increase activation energy"], 2, "Catalysts lower the barrier for both forward and reverse directions."),
      makeQuestion("If concentration doubles in a first-order reaction, the rate becomes:", ["Half", "Unchanged", "Double", "Quadruple"], 2, "For first-order kinetics, rate is directly proportional to concentration."),
      makeQuestion("The half-life of a first-order reaction is:", ["Dependent on starting concentration", "Independent of starting concentration", "Always zero", "Equal to the activation energy"], 1, "First-order half-life remains constant regardless of initial concentration."),
    ],
  },
  {
    id: "equilibrium",
    title: "Chemical Equilibrium",
    category: "Physical Chemistry",
    description: "Covers equilibrium constants, Le Chatelier shifts, and qualitative prediction of system response.",
    questionBank: [
      makeQuestion("At equilibrium, the forward and reverse reaction rates are:", ["Zero", "Equal", "Random", "Always fast"], 1, "Dynamic equilibrium means the two rates are equal."),
      makeQuestion("For a gas-phase equilibrium, increasing pressure favors the side with:", ["More gas moles", "Fewer gas moles", "More solids", "More catalysts"], 1, "The system shifts toward fewer gas moles to reduce pressure."),
      makeQuestion("Adding a catalyst to an equilibrium mixture will:", ["Change K", "Shift equilibrium permanently", "Speed up reaching equilibrium", "Stop the reaction"], 2, "Catalysts do not change K; they only help the system reach equilibrium faster."),
      makeQuestion("The equilibrium constant Kc does not include pure:", ["Liquids and solids", "Gases", "Aqueous ions", "Catalysts only"], 0, "Pure solids and pure liquids are omitted from the K expression."),
      makeQuestion("If Q is less than K, the reaction tends to proceed:", ["Toward reactants", "Toward products", "Nowhere", "Only with a catalyst"], 1, "When Q < K, the system shifts forward to make more products."),
      makeQuestion("Removing a product from an equilibrium system generally causes the reaction to shift:", ["Left", "Right", "Nowhere", "To solid only"], 1, "The system shifts right to replace the removed product."),
      makeQuestion("For the Haber process, increasing pressure favors:", ["N2 and H2", "NH3", "No change", "Catalyst decomposition"], 1, "The product side has fewer total moles of gas."),
      makeQuestion("An equilibrium constant much greater than 1 indicates that equilibrium strongly favors:", ["Reactants", "Products", "Neither side", "Catalysts"], 1, "A large K means products dominate at equilibrium."),
      makeQuestion("Increasing temperature in an endothermic equilibrium shifts the system:", ["Left", "Right", "Nowhere", "To the catalyst"], 1, "Heat acts like a reactant in an endothermic process, so added heat shifts right."),
      makeQuestion("Which concentration change does not alter the value of Kc?", ["Adding a reactant", "Removing a product", "Changing temperature slightly", "Adding a catalyst"], 3, "K changes only with temperature, not with catalysts or concentration changes."),
      makeQuestion("When a reaction is at equilibrium, concentrations are:", ["Always equal", "Always zero", "Constant over time", "Changing linearly"], 2, "At equilibrium, concentrations stay constant even though reactions continue."),
      makeQuestion("If the forward reaction is exothermic, increasing temperature usually shifts equilibrium:", ["Toward products", "Toward reactants", "Toward the catalyst", "Toward solids only"], 1, "Added heat favors the endothermic direction, which is the reverse reaction."),
    ],
  },
  {
    id: "organic-chemistry",
    title: "Organic Chemistry",
    category: "Organic Chemistry",
    description: "Assesses nomenclature, functional groups, hydrocarbons, reaction trends, and isomer ideas.",
    questionBank: [
      makeQuestion("What is the IUPAC name of CH3CH2OH?", ["Methanol", "Ethanol", "Ethanal", "Ethene"], 1, "A two-carbon alcohol is ethanol."),
      makeQuestion("The general formula of alkanes is:", ["CnH2n", "CnH2n+2", "CnH2n-2", "CnHn"], 1, "Acyclic saturated hydrocarbons follow CnH2n+2."),
      makeQuestion("Which functional group defines an alcohol?", ["-CHO", "-COOH", "-OH", "-NH2"], 2, "Alcohols contain the hydroxyl functional group."),
      makeQuestion("What type of reaction converts an alkene to an alkane using hydrogen?", ["Substitution", "Addition", "Elimination", "Esterification"], 1, "Hydrogen adds across the double bond in an addition reaction."),
      makeQuestion("Benzene is classified as a:", ["Saturated hydrocarbon", "Aromatic hydrocarbon", "Haloalkane", "Carboxylic acid"], 1, "Benzene is the classic aromatic ring system."),
      makeQuestion("Which compound is a carboxylic acid?", ["CH3COOH", "CH3OH", "CH3CHO", "CH3OCH3"], 0, "Acetic acid, CH3COOH, contains the carboxyl group."),
      makeQuestion("A compound with the formula C2H4 is most likely a(n):", ["Alkane", "Alkene", "Alkyne", "Alcohol"], 1, "Ethene fits the alkene general formula."),
      makeQuestion("Structural isomers have the same molecular formula but different:", ["Atomic masses", "Connectivity", "Number of protons", "Number of neutrons"], 1, "Structural isomers differ in how the atoms are connected."),
      makeQuestion("The product of complete combustion of a hydrocarbon includes:", ["CO and soot only", "CO2 and H2O", "CH4 and O2", "H2 and C"], 1, "Complete combustion yields carbon dioxide and water."),
      makeQuestion("Which reagent is commonly used to test for unsaturation in alkenes?", ["Bromine water", "Distilled water", "Sodium chloride", "Phenolphthalein"], 0, "Bromine water is decolorized by many alkenes."),
      makeQuestion("What is the IUPAC name of CH3COCH3?", ["Propanal", "Propanone", "Propanoic acid", "Propanol"], 1, "CH3COCH3 is the ketone propanone."),
      makeQuestion("Polymerization of ethene forms:", ["PVC", "Polythene", "Nylon-6,6", "Teflon"], 1, "Addition polymerization of ethene yields polythene."),
    ],
  },
  {
    id: "electrochemistry",
    title: "Electrochemistry",
    category: "Physical Chemistry",
    description: "Checks oxidation-reduction rules, galvanic cells, electrolysis, and electrode behavior.",
    questionBank: [
      makeQuestion("Oxidation always involves:", ["Gain of electrons", "Loss of electrons", "Loss of protons", "Gain of neutrons"], 1, "Oxidation is loss of electrons."),
      makeQuestion("In a galvanic cell, oxidation occurs at the:", ["Cathode", "Anode", "Salt bridge", "Electrolyte"], 1, "The anode is the site of oxidation."),
      makeQuestion("In a galvanic cell, electrons flow externally from:", ["Cathode to anode", "Anode to cathode", "Salt bridge to cathode", "Electrolyte to anode"], 1, "Electrons travel from the anode to the cathode through the wire."),
      makeQuestion("The salt bridge in a galvanic cell helps maintain:", ["High pressure", "Electrical neutrality", "Temperature only", "Catalyst strength"], 1, "Ions migrate through the salt bridge to preserve charge balance."),
      makeQuestion("Reduction means:", ["Gain of electrons", "Loss of electrons", "Gain of oxygen only", "Loss of hydrogen only"], 0, "Reduction is gain of electrons."),
      makeQuestion("Which electrode is positive in a galvanic cell?", ["Anode", "Cathode", "Both", "Neither"], 1, "The cathode is the positive electrode in a spontaneous cell."),
      makeQuestion("The oxidation number of Mn in KMnO4 is:", ["+2", "+4", "+6", "+7"], 3, "Potassium is +1 and oxygen totals -8, so Mn must be +7."),
      makeQuestion("Electrolysis of molten NaCl produces sodium metal at the:", ["Anode", "Cathode", "Salt bridge", "Positive terminal"], 1, "Sodium ions gain electrons at the cathode."),
      makeQuestion("Which species is the oxidizing agent in a redox reaction?", ["The species oxidized", "The species reduced", "The catalyst", "The solvent"], 1, "The oxidizing agent is reduced while oxidizing another species."),
      makeQuestion("A standard reduction potential that is more positive indicates a stronger tendency for:", ["Oxidation", "Reduction", "Evaporation", "Neutralization"], 1, "A more positive reduction potential means a stronger driving force to be reduced."),
      makeQuestion("In electroplating, the object to be coated is usually the:", ["Anode", "Cathode", "Salt bridge", "Electrolyte crystal"], 1, "Metal ions are reduced onto the cathode surface."),
      makeQuestion("What happens at the anode during electrolysis?", ["Reduction", "Oxidation", "No reaction", "Neutralization"], 1, "Oxidation occurs at the anode in both galvanic cells and electrolytic cells."),
    ],
  },
  {
    id: "analytical-chemistry",
    title: "Analytical Chemistry",
    category: "Analytical Chemistry",
    description: "Focuses on titration, indicators, chromatography, spectroscopy, and measurement quality.",
    questionBank: [
      makeQuestion("Beer-Lambert law relates absorbance to:", ["Pressure", "Concentration", "Molar mass", "Boiling point"], 1, "Absorbance is proportional to concentration, path length, and molar absorptivity."),
      makeQuestion("In an acid-base titration, the end point is usually detected by:", ["A catalyst", "An indicator color change", "A precipitate only", "A thermometer"], 1, "Indicators signal the end point by changing color."),
      makeQuestion("Which apparatus delivers very accurate variable volumes in titration?", ["Beaker", "Burette", "Test tube", "Watch glass"], 1, "A burette is designed for precise delivery of titrant."),
      makeQuestion("The stationary phase in paper chromatography is primarily:", ["The solvent front", "The paper", "Air", "The sample vial"], 1, "The paper acts as the stationary phase."),
      makeQuestion("A sharp, consistent set of repeated measurements indicates good:", ["Accuracy only", "Precision", "Bias", "Contamination"], 1, "Precision describes how closely repeated measurements agree."),
      makeQuestion("A primary standard should be:", ["Impure and volatile", "Stable and pure", "Colored and reactive", "Weak and dilute"], 1, "Primary standards need high purity and stability."),
      makeQuestion("In chromatography, Rf value is defined as distance traveled by solute divided by distance traveled by the:", ["Sample line", "Solvent front", "Container wall", "Detector beam"], 1, "Rf compares solute movement to solvent-front movement."),
      makeQuestion("Which instrument is commonly used to measure absorbance in solution?", ["pH meter", "Spectrophotometer", "Calorimeter bomb", "Bunsen burner"], 1, "Spectrophotometers measure transmitted light and absorbance."),
      makeQuestion("A concordant titre means repeated titre values are:", ["Widely scattered", "Closely agreeing", "Always zero", "Larger than expected"], 1, "Concordant titres are consistent repeated results."),
      makeQuestion("If the true value is 25.0 and a measurement is 25.1, the absolute error is:", ["0.1", "1.0", "25.1", "24.9"], 0, "Absolute error is the magnitude of the difference from the true value."),
      makeQuestion("Which indicator is suitable for strong acid-strong base titrations?", ["Phenolphthalein or methyl orange", "Only litmus paper", "Only universal indicator", "No indicator can work"], 0, "Both indicators can work because the pH changes sharply near equivalence."),
      makeQuestion("A blank titration is performed mainly to:", ["Change the analyte concentration", "Correct for reagent or procedure background", "Increase color intensity", "Prevent neutralization"], 1, "Blank runs account for background contributions from reagents or the procedure."),
    ],
  },
  {
    id: "environmental-chemistry",
    title: "Environmental Chemistry",
    category: "Environmental Chemistry",
    description: "Reviews air, water, climate, and pollution chemistry in common real-world contexts.",
    questionBank: [
      makeQuestion("The major component of natural gas is:", ["Ethane", "Methane", "Propane", "Butane"], 1, "Methane is the main component of natural gas."),
      makeQuestion("Acid rain is mainly associated with atmospheric oxides of:", ["Nitrogen and sulfur", "Hydrogen and helium", "Carbon and silicon", "Sodium and potassium"], 0, "Nitrogen oxides and sulfur oxides form acids in the atmosphere."),
      makeQuestion("Which greenhouse gas is present in the greatest concentration in the atmosphere among these options?", ["Methane", "Nitrous oxide", "Carbon dioxide", "Ozone"], 2, "Carbon dioxide is the most abundant of these greenhouse gases."),
      makeQuestion("Eutrophication in lakes is commonly caused by excess:", ["Sand and clay", "Nitrogen and phosphorus nutrients", "Oxygen only", "Argon and neon"], 1, "Nutrient overload drives excessive algal growth."),
      makeQuestion("The ozone layer is found mainly in the:", ["Troposphere", "Stratosphere", "Mesosphere", "Thermosphere"], 1, "Most atmospheric ozone is concentrated in the stratosphere."),
      makeQuestion("Which process is used to remove suspended solids from drinking water?", ["Filtration", "Photosynthesis", "Electrolysis", "Distillation of air"], 0, "Filtration helps remove suspended particles."),
      makeQuestion("A high biochemical oxygen demand in water usually indicates:", ["Clean water", "Organic pollution", "High salinity only", "Zero microorganisms"], 1, "High BOD means microorganisms are consuming a lot of oxygen while decomposing organic matter."),
      makeQuestion("Which pollutant is most closely linked to photochemical smog?", ["Sulfur", "Lead metal only", "Nitrogen oxides", "Helium"], 2, "Nitrogen oxides help form photochemical smog in sunlight."),
      makeQuestion("Chlorofluorocarbons damage the ozone layer by releasing:", ["Calcium ions", "Chlorine radicals", "Hydrogen gas", "Nitrogen molecules"], 1, "Chlorine radicals catalyze ozone destruction."),
      makeQuestion("Which water treatment step is used primarily to kill microorganisms?", ["Sedimentation", "Chlorination", "Screening", "Aeration only"], 1, "Chlorination is a common disinfection step."),
      makeQuestion("Carbon monoxide is dangerous because it binds strongly to:", ["Water", "Hemoglobin", "Nitrogen", "Calcium carbonate"], 1, "Carbon monoxide reduces blood oxygen transport by binding to hemoglobin."),
      makeQuestion("A biodegradable pollutant is one that can be broken down by:", ["Sunlight only", "Microorganisms", "Pressure alone", "Inert gases"], 1, "Biodegradable substances are decomposed naturally by living organisms."),
    ],
  },
];

const QUESTIONS_PER_TEST = 12;

function buildQuestions(topicId: string, variantIndex: number, questionBank: QuestionSeed[]): Question[] {
  return Array.from({ length: QUESTIONS_PER_TEST }, (_, offset) => {
    const questionIndex = (variantIndex + offset) % questionBank.length;
    const seed = questionBank[questionIndex];

    return {
      id: `${topicId}-q${offset + 1}`,
      question: seed.question,
      options: seed.options,
      correctAnswer: seed.correctAnswer,
      explanation: seed.explanation,
    };
  });
}

export const examTopics: ExamTopic[] = topicBlueprints.flatMap((blueprint) =>
  examVariants.map((variant, variantIndex) => {
    const topicId = `${blueprint.id}-${variant.slug}`;

    return {
      id: topicId,
      title: `${blueprint.title} ${variant.label}`,
      description: `${blueprint.description} ${variant.summary}`,
      category: blueprint.category,
      questions: buildQuestions(topicId, variantIndex, blueprint.questionBank),
    };
  })
);

export const examCategories = Array.from(new Set(examTopics.map((topic) => topic.category)));

export const examStats = {
  totalTests: examTopics.length,
  totalCategories: examCategories.length,
  questionsPerTest: QUESTIONS_PER_TEST,
};
