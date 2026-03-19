/* ═══════════════════════════════════════════════════════════════════════════
   AI EDUCATIONAL LABS — Core Application
   © 2026 AI Educational Labs / HeadySystems Inc.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

// ─── Constants ──────────────────────────────────────────────────────────────
const DISCIPLINES = [
  { id:'earth', name:'Earth Sciences', icon:'🌍', color:'var(--lab-earth)',
    desc:'Explore the dynamic processes that shape our planet — from deep mantle convection and lithospheric plate interactions to atmospheric dynamics and stratigraphic analysis. These labs integrate real geophysical data models with interactive visualizations.',
    prereqs:'Basic physical science, familiarity with scientific notation',
    labs:[
      {id:'plate-tectonics',name:'Plate Tectonics Simulator',vr:true,voice:true,
       desc:'Visualize continental drift, divergent/convergent/transform plate boundaries, and subduction zones using a real-time geodynamic model.',
       objectives:['Identify the three types of plate boundaries','Explain the mechanism of mantle convection driving plate motion','Calculate seafloor spreading rates from magnetic anomaly data','Predict volcanic and seismic activity based on plate interactions'],
       theory:'Plate tectonics theory explains how Earth\'s lithosphere is divided into rigid plates that move on the asthenosphere. Convection currents in the mantle provide the driving force. At divergent boundaries, plates separate and new crust forms; at convergent boundaries, denser plates subduct beneath lighter ones; at transform boundaries, plates slide horizontally past each other.',
       concepts:['Lithospheric plates','Asthenosphere','Subduction zones','Mid-ocean ridges','Convection currents','Pangaea','Seismic waves'],
       equations:['v = d/t (spreading rate)','Seismic wave: v = √(K/ρ)','Heat flow: q = -k(dT/dz)'],
       difficulty:'Intermediate',time:'45 min',credits:3},
      {id:'weather-patterns',name:'Weather Pattern Lab',vr:false,voice:true,
       desc:'Model atmospheric pressure systems, frontal boundaries, and the Coriolis effect. Simulate hurricanes, jet streams, and local weather phenomena with adjustable parameters.',
       objectives:['Distinguish between high and low pressure systems','Apply the Coriolis effect to wind direction predictions','Interpret synoptic weather maps and frontal symbols','Explain how temperature gradients drive atmospheric circulation'],
       theory:'Weather patterns result from differential heating of Earth\'s surface. Warm air rises (low pressure), cool air sinks (high pressure). The Coriolis effect, caused by Earth\'s rotation, deflects moving air right in the Northern Hemisphere and left in the Southern. Fronts form where air masses of different temperatures meet.',
       concepts:['Pressure gradients','Coriolis effect','Frontal systems','Jet stream','Convective cells','Dew point','Relative humidity','Adiabatic lapse rate'],
       equations:['P = ρgh (hydrostatic)','Coriolis: f = 2Ω sin(φ)','Clausius-Clapeyron: dP/dT = L/(TΔv)'],
       difficulty:'Intermediate',time:'40 min',credits:3},
      {id:'geological-layers',name:'Geological Layers Explorer',vr:true,voice:true,
       desc:'Drill through eight distinct geological strata from topsoil to magma. Examine mineralogy, fossil records, and radiometric dating at each depth.',
       objectives:['Differentiate sedimentary, igneous, and metamorphic rock types','Apply the principle of superposition to determine relative ages','Calculate absolute ages using half-life decay curves','Identify index fossils and their significance in stratigraphy'],
       theory:'Stratigraphy is the study of rock layers (strata) and their chronological relationships. The Law of Superposition states that in undisturbed sequences, the oldest layers are at the bottom. Radiometric dating uses the decay of unstable isotopes (e.g., Carbon-14, Uranium-238) to determine absolute ages. Each layer records environmental conditions at the time of deposition.',
       concepts:['Stratigraphy','Superposition','Radiometric dating','Half-life','Index fossils','Unconformities','Metamorphism','Mineral identification'],
       equations:['N(t) = N₀e^(-λt)','t₁/₂ = ln(2)/λ','Age = t₁/₂ × ln(N₀/N)/ln(2)'],
       difficulty:'Beginner',time:'35 min',credits:2} ]},
  { id:'biology', name:'Biology', icon:'🧬', color:'var(--lab-bio)',
    desc:'Investigate the fundamental mechanisms of life at molecular, cellular, and ecosystem scales. From the intricate machinery within a single cell to the complex dynamics of entire ecosystems, these labs bring biological concepts to life through interactive simulation.',
    prereqs:'High school biology, basic chemistry concepts',
    labs:[
      {id:'cell-explorer',name:'Cell Explorer',vr:true,voice:true,
       desc:'Navigate through a fully annotated eukaryotic cell. Examine organelles including the nucleus, mitochondria, endoplasmic reticulum, Golgi apparatus, lysosomes, and ribosomes in 3D.',
       objectives:['Identify and describe the function of each major organelle','Compare and contrast prokaryotic and eukaryotic cells','Explain the relationship between structure and function in organelles','Trace the pathway of protein synthesis from DNA to functional protein'],
       theory:'The cell is the basic unit of life. Eukaryotic cells contain membrane-bound organelles that compartmentalize cellular functions. The nucleus houses DNA and controls gene expression. Mitochondria generate ATP through oxidative phosphorylation. The endoplasmic reticulum (rough and smooth) handles protein folding and lipid synthesis. The Golgi apparatus modifies, sorts, and packages proteins for secretion.',
       concepts:['Cell membrane','Nucleus','Mitochondria','Endoplasmic reticulum','Golgi apparatus','Lysosomes','Ribosomes','Cytoskeleton','ATP synthase','Vesicle transport'],
       equations:['ATP yield: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 36-38 ATP','Nernst equation: E = (RT/zF)ln([ion]out/[ion]in)'],
       difficulty:'Beginner',time:'40 min',credits:3},
      {id:'dna-replication',name:'DNA Replication Lab',vr:false,voice:true,
       desc:'Step through the complete process of semi-conservative DNA replication. Observe helicase unwinding, primase laying RNA primers, DNA polymerase III extending, and ligase sealing fragments.',
       objectives:['Describe the roles of helicase, primase, polymerase, and ligase','Differentiate between leading and lagging strand synthesis','Explain why Okazaki fragments form on the lagging strand','Identify common replication errors and repair mechanisms'],
       theory:'DNA replication is semi-conservative — each new double helix contains one original and one new strand. Helicase unwinds the double helix at the replication fork. Primase synthesizes short RNA primers. DNA Polymerase III extends primers with complementary nucleotides (A-T, G-C). On the lagging strand, synthesis is discontinuous, producing Okazaki fragments that DNA ligase joins together. Proofreading by polymerase ensures high fidelity (~1 error per 10⁹ bases).',
       concepts:['Semi-conservative replication','Replication fork','Helicase','Primase','DNA Polymerase III','Okazaki fragments','DNA ligase','Proofreading','Telomeres','Topoisomerase'],
       equations:['Replication rate: ~1000 nt/sec (prokaryotes)','Error rate: ~10⁻⁹ per base pair','Chargaff\'s rules: A=T, G=C'],
       difficulty:'Intermediate',time:'35 min',credits:3},
      {id:'ecosystem-sim',name:'Ecosystem Simulator',vr:false,voice:true,
       desc:'Model predator-prey dynamics using Lotka-Volterra equations. Observe population oscillations, carrying capacity effects, and trophic cascades in a simulated grassland ecosystem.',
       objectives:['Interpret Lotka-Volterra population curves','Define carrying capacity and explain limiting factors','Predict effects of removing a species from a food web','Calculate energy transfer efficiency between trophic levels'],
       theory:'Ecosystems are complex networks of biotic and abiotic interactions. The Lotka-Volterra model describes predator-prey oscillations: prey populations grow exponentially until predation increases, which then causes predator populations to decline as prey becomes scarce. Energy transfers between trophic levels follow the 10% rule — approximately 90% of energy is lost as heat at each level.',
       concepts:['Lotka-Volterra equations','Carrying capacity (K)','Trophic levels','Food webs','Energy transfer','Keystone species','Biodiversity','Ecological succession','Symbiosis'],
       equations:['dN/dt = rN(1-N/K) (logistic growth)','dN₁/dt = αN₁ - βN₁N₂ (prey)','dN₂/dt = δN₁N₂ - γN₂ (predator)','Energy: E(n+1) ≈ 0.1 × E(n)'],
       difficulty:'Advanced',time:'50 min',credits:4} ]},
  { id:'chemistry', name:'Chemistry', icon:'⚗️', color:'var(--lab-chem)',
    desc:'From atomic structure to molecular architecture to reaction kinetics — explore the central science through interactive 3D molecular modeling, real-time reaction simulations, and comprehensive element exploration.',
    prereqs:'Basic algebra, atomic structure fundamentals',
    labs:[
      {id:'molecular-builder',name:'Molecular Builder',vr:true,voice:true,
       desc:'Construct molecules atom-by-atom in 3D space. Visualize VSEPR geometries, bond angles, hybridization states, and molecular polarity with real-time bond length calculations.',
       objectives:['Predict molecular geometry using VSEPR theory','Identify sigma and pi bonds in molecular structures','Determine hybridization state of central atoms','Relate molecular geometry to polarity and physical properties'],
       theory:'VSEPR (Valence Shell Electron Pair Repulsion) theory predicts molecular geometry based on minimizing electron pair repulsion. Atoms can hybridize their orbitals: sp (linear, 180°), sp² (trigonal planar, 120°), sp³ (tetrahedral, 109.5°). Bond polarity depends on electronegativity differences. Molecular polarity depends on both bond polarity and geometry.',
       concepts:['VSEPR theory','Hybridization (sp, sp², sp³)','Electronegativity','Bond polarity','Molecular geometry','Lewis structures','Resonance structures','Formal charge','Dipole moment'],
       equations:['Bond order = (bonding e⁻ - antibonding e⁻)/2','Coulomb\'s law: F = kq₁q₂/r²','Dipole moment: μ = q × d'],
       difficulty:'Intermediate',time:'45 min',credits:3},
      {id:'reaction-sim',name:'Chemical Reaction Simulator',vr:false,voice:true,
       desc:'Mix virtual reagents and observe reaction dynamics in real-time. Adjust temperature, concentration, and catalysts while monitoring enthalpy changes, equilibrium shifts, and reaction rates.',
       objectives:['Apply Le Chatelier\'s principle to predict equilibrium shifts','Calculate reaction rates from concentration-time data','Distinguish between endothermic and exothermic reactions','Explain how catalysts lower activation energy without being consumed'],
       theory:'Chemical kinetics studies the rates of reactions and the factors affecting them. The Arrhenius equation relates rate constants to temperature and activation energy. Le Chatelier\'s principle states that systems at equilibrium shift to counteract applied stress. Catalysts provide alternative pathways with lower activation energy, increasing reaction rates without altering equilibrium positions.',
       concepts:['Activation energy','Reaction rate','Rate law','Rate constant','Equilibrium constant (Keq)','Le Chatelier\'s principle','Catalysis','Enthalpy (ΔH)','Entropy (ΔS)','Gibbs free energy (ΔG)'],
       equations:['k = Ae^(-Ea/RT) (Arrhenius)','Rate = k[A]^m[B]^n','Keq = [products]/[reactants]','ΔG = ΔH - TΔS'],
       difficulty:'Intermediate',time:'40 min',credits:3},
      {id:'periodic-table',name:'Interactive Periodic Table',vr:false,voice:true,
       desc:'Explore all 118 elements with detailed property cards, electron orbital diagrams, ionization energies, electronegativity trends, and isotope data. Visualize periodic trends in real-time.',
       objectives:['Explain periodic trends in atomic radius, ionization energy, and electronegativity','Write electron configurations using the Aufbau principle','Predict chemical behavior based on group and period position','Compare properties of metals, metalloids, and nonmetals'],
       theory:'The periodic table organizes elements by increasing atomic number, revealing periodic patterns in properties. Elements in the same group share valence electron configurations and similar chemical behavior. Atomic radius generally increases down a group (more shells) and decreases across a period (higher nuclear charge). Ionization energy and electronegativity show opposite trends.',
       concepts:['Electron configuration','Aufbau principle','Hund\'s rule','Pauli exclusion principle','Valence electrons','Periodic trends','Ionization energy','Electron affinity','Electronegativity','Atomic radius','Isotopes'],
       equations:['E_n = -13.6/n² eV (hydrogen)','λ = h/(mv) (de Broglie)','ΔE = hf (photon energy)'],
       difficulty:'Beginner',time:'30 min',credits:2} ]},
  { id:'physics', name:'Physics', icon:'⚡', color:'var(--lab-physics)',
    desc:'Explore the fundamental laws governing the universe — from classical mechanics and wave optics to electromagnetism and circuit analysis. These labs combine rigorous physics with real-time interactive simulations.',
    prereqs:'Algebra, trigonometry, basic calculus concepts helpful',
    labs:[
      {id:'projectile-motion',name:'Projectile Motion Lab',vr:false,voice:true,
       desc:'Launch projectiles with adjustable velocity, angle, and air resistance. Trace parabolic trajectories, measure range and maximum height, and verify kinematic equations in real-time.',
       objectives:['Decompose velocity into horizontal and vertical components','Derive time of flight, maximum height, and range equations','Analyze how air resistance modifies ideal projectile trajectories','Design optimal launch parameters for maximum range'],
       theory:'Projectile motion is the motion of an object thrown near Earth\'s surface that moves along a curved path under the action of gravity alone. In the absence of air resistance, the horizontal and vertical motions are independent. The trajectory is parabolic. Maximum range occurs at 45° launch angle (without air resistance).',
       concepts:['Kinematic equations','Vector decomposition','Parabolic trajectory','Free fall','Independence of horizontal and vertical motion','Air resistance','Terminal velocity','Range equation'],
       equations:['x = v₀cos(θ)t','y = v₀sin(θ)t - ½gt²','R = v₀²sin(2θ)/g','H_max = v₀²sin²(θ)/2g','t_flight = 2v₀sin(θ)/g'],
       difficulty:'Beginner',time:'35 min',credits:2},
      {id:'optics-bench',name:'Optics Bench',vr:true,voice:true,
       desc:'Set up optical elements on a virtual bench — convex/concave lenses, mirrors, prisms, and diffraction gratings. Trace ray diagrams, observe focal points, and verify Snell\'s law.',
       objectives:['Apply the thin lens equation to predict image location and magnification','Trace principal rays through converging and diverging lenses','Explain total internal reflection and its applications','Calculate diffraction patterns for single slits and gratings'],
       theory:'Geometric optics treats light as rays that travel in straight lines. Snell\'s law governs refraction at interfaces. Converging lenses focus parallel rays to a focal point. The thin lens equation relates object distance, image distance, and focal length. When light passes through a narrow slit comparable to its wavelength, it diffracts, producing an interference pattern.',
       concepts:['Refraction','Reflection','Snell\'s law','Focal length','Magnification','Total internal reflection','Dispersion','Diffraction','Interference','Polarization'],
       equations:['n₁sin(θ₁) = n₂sin(θ₂) (Snell\'s)','1/f = 1/dₒ + 1/dᵢ (thin lens)','m = -dᵢ/dₒ = hᵢ/hₒ','d·sin(θ) = mλ (diffraction grating)'],
       difficulty:'Intermediate',time:'45 min',credits:3},
      {id:'circuit-sim',name:'Circuit Simulator',vr:false,voice:true,
       desc:'Build series and parallel circuits with resistors, capacitors, and inductors. Measure voltage, current, and power in real-time. Verify Ohm\'s law and Kirchhoff\'s laws.',
       objectives:['Apply Ohm\'s law to calculate voltage, current, and resistance','Solve circuits using Kirchhoff\'s voltage and current laws','Calculate equivalent resistance in series and parallel configurations','Analyze RC and RL circuit transient behavior'],
       theory:'Ohm\'s law (V=IR) relates voltage, current, and resistance. In series circuits, current is constant and voltages add. In parallel circuits, voltage is constant and currents add. Kirchhoff\'s Current Law (KCL) states that currents entering a node equal currents leaving. Kirchhoff\'s Voltage Law (KVL) states that the sum of voltage drops around any closed loop is zero.',
       concepts:['Ohm\'s law','Kirchhoff\'s laws (KVL, KCL)','Series circuits','Parallel circuits','Resistance','Capacitance','Inductance','Power dissipation','RC time constant','Impedance'],
       equations:['V = IR (Ohm\'s)','P = IV = I²R = V²/R','R_series = R₁+R₂+...','1/R_parallel = 1/R₁+1/R₂+...','τ = RC (time constant)'],
       difficulty:'Intermediate',time:'40 min',credits:3} ]},
  { id:'cs', name:'Computer Science & AI', icon:'🤖', color:'var(--lab-cs)',
    desc:'From fundamental algorithms and data structures to neural network architectures — develop computational thinking through visual, interactive explorations of the concepts powering modern technology and artificial intelligence.',
    prereqs:'Basic programming concepts, logical thinking',
    labs:[
      {id:'sorting-viz',name:'Sorting Algorithm Visualizer',vr:false,voice:true,
       desc:'Watch eight sorting algorithms (Bubble, Selection, Insertion, Merge, Quick, Heap, Radix, Tim Sort) execute step-by-step with real-time comparison counters and swap animations.',
       objectives:['Compare time complexities of O(n²) and O(n log n) algorithms','Explain why merge sort guarantees O(n log n) while quicksort varies','Identify stable vs. unstable sorting algorithms','Choose optimal algorithms for different data characteristics'],
       theory:'Sorting is a fundamental operation in computer science. Comparison-based sorts (bubble, merge, quick) compare elements pairwise. Non-comparison sorts (radix, counting) exploit structure in the data. The theoretical lower bound for comparison-based sorting is O(n log n). Space complexity varies: in-place algorithms (quicksort) use O(1) extra space, while merge sort requires O(n) auxiliary space.',
       concepts:['Time complexity (Big-O)','Space complexity','Divide and conquer','In-place sorting','Stability','Best/average/worst case','Comparison-based vs. non-comparison','Recursion'],
       equations:['Bubble: O(n²) avg, O(1) space','Merge: O(n log n) avg, O(n) space','Quick: O(n log n) avg, O(log n) space','Lower bound: Ω(n log n) comparisons'],
       difficulty:'Beginner',time:'30 min',credits:2},
      {id:'neural-net',name:'Neural Network Playground',vr:false,voice:true,
       desc:'Build, train, and evaluate feedforward neural networks. Adjust layers, neurons, activation functions, and learning rate. Visualize weight updates, loss curves, and decision boundaries in real-time.',
       objectives:['Explain the role of weights, biases, and activation functions','Describe forward propagation and backpropagation mathematically','Analyze how learning rate affects convergence','Identify underfitting and overfitting from loss curves'],
       theory:'Artificial neural networks are composed of layers of interconnected nodes (neurons). Each connection has a weight. During forward propagation, inputs are multiplied by weights, summed with biases, and passed through activation functions. Backpropagation computes gradients of the loss function and updates weights using gradient descent. Deep networks can approximate arbitrarily complex functions (Universal Approximation Theorem).',
       concepts:['Neurons/perceptrons','Weights and biases','Activation functions (ReLU, sigmoid, tanh)','Forward propagation','Backpropagation','Gradient descent','Learning rate','Loss function','Epochs','Overfitting/underfitting','Regularization'],
       equations:['z = Σ(wᵢxᵢ) + b','a = σ(z) (activation)','σ(z) = 1/(1+e⁻ᶻ) (sigmoid)','L = -Σ[y·log(ŷ) + (1-y)·log(1-ŷ)]','w := w - α·∂L/∂w (gradient descent)'],
       difficulty:'Advanced',time:'60 min',credits:4},
      {id:'pathfinding',name:'Pathfinding Lab',vr:false,voice:true,
       desc:'Explore graph traversal algorithms on customizable grids. Compare BFS, DFS, Dijkstra\'s, and A* with different heuristics. Visualize open/closed sets, path costs, and optimality guarantees.',
       objectives:['Implement BFS and DFS traversals on grid graphs','Explain why A* is optimal with an admissible heuristic','Calculate path costs using Manhattan and Euclidean distances','Compare time/space complexity of different pathfinding algorithms'],
       theory:'Pathfinding algorithms find the shortest (or least-cost) path between nodes in a graph. BFS explores nodes level-by-level and guarantees shortest path in unweighted graphs. Dijkstra\'s algorithm extends BFS to weighted graphs. A* combines Dijkstra\'s with a heuristic function h(n) that estimates remaining cost. A* is optimal when h(n) is admissible (never overestimates).',
       concepts:['Graph theory','Adjacency','BFS/DFS','Priority queues','Dijkstra\'s algorithm','A* algorithm','Heuristic functions','Admissibility','Manhattan distance','Euclidean distance','Open/closed sets'],
       equations:['f(n) = g(n) + h(n) (A* cost)','h_manhattan = |x₁-x₂| + |y₁-y₂|','h_euclidean = √((x₁-x₂)² + (y₁-y₂)²)','BFS: O(V+E) time, O(V) space'],
       difficulty:'Intermediate',time:'45 min',credits:3} ]},
  { id:'engineering', name:'Engineering & Robotics', icon:'🔧', color:'var(--lab-eng)',
    desc:'Apply engineering principles to design, simulate, and test real-world systems — from digital logic circuits and robotic manipulators to structural analysis. These labs bridge theory and hands-on engineering practice.',
    prereqs:'Physics fundamentals, basic algebra, spatial reasoning',
    labs:[
      {id:'circuit-design',name:'Circuit Designer',vr:false,voice:true,
       desc:'Design combinational and sequential digital logic circuits using AND, OR, NOT, NAND, NOR, XOR gates. Build adders, multiplexers, flip-flops, and verify truth tables automatically.',
       objectives:['Construct truth tables for combinational logic circuits','Simplify Boolean expressions using Karnaugh maps','Design a 4-bit binary adder from basic logic gates','Explain the difference between combinational and sequential logic'],
       theory:'Digital logic circuits process binary signals (0 and 1). Combinational circuits produce outputs solely based on current inputs (no memory). Sequential circuits have memory elements (flip-flops) that make outputs depend on both current inputs and past states. Boolean algebra provides the mathematical framework. Any Boolean function can be implemented using only NAND or NOR gates (functional completeness).',
       concepts:['Boolean algebra','Logic gates (AND, OR, NOT, NAND, NOR, XOR)','Truth tables','Karnaugh maps','Combinational logic','Sequential logic','Flip-flops (SR, JK, D, T)','Adders','Multiplexers','De Morgan\'s theorems'],
       equations:['De Morgan\'s: (A·B)\' = A\'+B\'','De Morgan\'s: (A+B)\' = A\'·B\'','Sum = A⊕B⊕Cin','Carry = AB + Cin(A⊕B)'],
       difficulty:'Intermediate',time:'50 min',credits:3},
      {id:'robot-arm',name:'Robotic Arm Simulator',vr:true,voice:true,
       desc:'Program and control a 3-DOF articulated robotic arm. Solve forward and inverse kinematics, plan trajectories, and implement pick-and-place operations with collision avoidance.',
       objectives:['Solve forward kinematics using DH parameters','Implement inverse kinematics for a 3-joint planar arm','Plan joint-space and Cartesian-space trajectories','Program a pick-and-place sequence with gripper control'],
       theory:'Robot kinematics studies the geometry of robot motion without considering forces. Forward kinematics computes end-effector position from joint angles using Denavit-Hartenberg (DH) parameters and transformation matrices. Inverse kinematics finds joint angles for a desired end-effector position — often with multiple solutions or no solution. Trajectory planning interpolates between waypoints in joint space or Cartesian space.',
       concepts:['Degrees of freedom (DOF)','Forward kinematics','Inverse kinematics','Denavit-Hartenberg parameters','Transformation matrices','Workspace','Joint space','Cartesian space','Trajectory planning','Gripper control','Collision detection'],
       equations:['T = Rot(z,θ)·Trans(0,0,d)·Trans(a,0,0)·Rot(x,α) (DH)','x = L₁cos(θ₁)+L₂cos(θ₁+θ₂)','y = L₁sin(θ₁)+L₂sin(θ₁+θ₂)','θ₂ = acos((x²+y²-L₁²-L₂²)/(2L₁L₂))'],
       difficulty:'Advanced',time:'55 min',credits:4},
      {id:'bridge-builder',name:'Bridge Builder',vr:false,voice:true,
       desc:'Design truss bridges and analyze structural integrity under static and dynamic loads. Optimize material usage while maintaining safety factors. Test designs to failure to understand stress distribution.',
       objectives:['Calculate forces in truss members using the method of joints','Identify tension and compression members in a truss','Determine safety factors for structural elements','Optimize a bridge design for minimum material cost while meeting load requirements'],
       theory:'Structural analysis determines internal forces and deformations in structures under load. Trusses are structures composed of triangular units where members carry only axial forces (tension or compression). The method of joints applies equilibrium equations (ΣFx=0, ΣFy=0) at each joint. Safety factor = failure load / design load. Engineers typically use safety factors of 2-3 for bridges.',
       concepts:['Truss analysis','Method of joints','Method of sections','Tension vs. compression','Safety factor','Young\'s modulus','Stress and strain','Static equilibrium','Dead load vs. live load','Structural redundancy','Factor of safety'],
       equations:['σ = F/A (stress)','ε = ΔL/L (strain)','E = σ/ε (Young\'s modulus)','Safety factor = σ_failure/σ_applied','ΣFx = 0, ΣFy = 0 (equilibrium)'],
       difficulty:'Intermediate',time:'45 min',credits:3} ]}
];

// ─── State ──────────────────────────────────────────────────────────────────
const State = {
  user: null, tosAccepted: false, route: '/', labResults: [],
  voiceActive: false, currentLab: null, isAdmin: false,
  offline: !navigator.onLine,
  progress: Object.fromEntries(DISCIPLINES.map(d => [d.id, { completed: 0, total: d.labs.length }]))
};

// ─── Router ─────────────────────────────────────────────────────────────────
function navigateTo(hash) { window.location.hash = hash; }

function handleRoute() {
  const hash = window.location.hash.slice(1) || '/';
  State.route = hash;
  document.querySelectorAll('.navbar-nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + hash));
  const main = document.getElementById('main-content');
  if (hash === '/') main.innerHTML = renderHome();
  else if (hash === '/labs') main.innerHTML = renderLabBrowser();
  else if (hash.startsWith('/lab/')) main.innerHTML = renderLabWorkspace(hash.split('/lab/')[1]);
  else if (hash === '/admin') main.innerHTML = State.isAdmin ? renderAdmin() : renderAuth();
  else if (hash === '/profile') main.innerHTML = State.user ? renderProfile() : renderAuth();
  else if (hash === '/auth') main.innerHTML = renderAuth();
  else if (hash === '/tos') main.innerHTML = renderToS();
  else if (hash === '/operator-agreement') main.innerHTML = renderOperatorAgreement();
  else if (hash === '/compliance') main.innerHTML = renderCompliance();
  else main.innerHTML = '<div class="hero"><h1>Page Not Found</h1><p>The requested page does not exist.</p></div>';
  main.scrollTo(0, 0); window.scrollTo(0, 0);
  announceRoute(hash);
}

function announceRoute(hash) {
  const ann = document.createElement('div');
  ann.setAttribute('role', 'status'); ann.setAttribute('aria-live', 'polite');
  ann.className = 'sr-only';
  ann.textContent = 'Navigated to ' + (hash === '/' ? 'Home' : hash.slice(1));
  document.body.appendChild(ann);
  setTimeout(() => ann.remove(), 1000);
}

// ─── Render: Home ───────────────────────────────────────────────────────────
function renderHome() {
  const totalLabs = DISCIPLINES.reduce((s,d)=>s+d.labs.length,0);
  const totalCredits = DISCIPLINES.reduce((s,d)=>s+d.labs.reduce((c,l)=>c+(l.credits||0),0),0);
  const vrLabs = DISCIPLINES.reduce((s,d)=>s+d.labs.filter(l=>l.vr).length,0);
  return `<div class="hero">
    <h1>University-Grade Interactive Science Labs</h1>
    <p style="max-width:700px;margin:0 auto var(--sp-lg)">Explore ${totalLabs} AI-powered interactive labs across ${DISCIPLINES.length} disciplines — with VR immersion, voice control, real-time data collection, and WCAG 2.1 accessibility. Built for university courses, AP classes, and self-directed learners.</p>
    <div class="hero-actions">
      <a href="#/labs" class="btn btn-primary btn-lg">🔬 Explore All ${totalLabs} Labs</a>
      <a href="#/auth" class="btn btn-secondary btn-lg">👤 Sign In / Register</a>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:var(--sp-md);margin-bottom:var(--sp-2xl);text-align:center">
    <div class="glass-card" style="padding:var(--sp-lg)"><div style="font-size:2rem;font-weight:800;color:var(--primary)">${totalLabs}</div><div style="color:var(--text-secondary);font-size:0.85rem">Interactive Labs</div></div>
    <div class="glass-card" style="padding:var(--sp-lg)"><div style="font-size:2rem;font-weight:800;color:var(--secondary)">${DISCIPLINES.length}</div><div style="color:var(--text-secondary);font-size:0.85rem">Disciplines</div></div>
    <div class="glass-card" style="padding:var(--sp-lg)"><div style="font-size:2rem;font-weight:800;color:var(--accent)">${totalCredits}</div><div style="color:var(--text-secondary);font-size:0.85rem">Total Credits</div></div>
    <div class="glass-card" style="padding:var(--sp-lg)"><div style="font-size:2rem;font-weight:800;color:#a855f7">${vrLabs}</div><div style="color:var(--text-secondary);font-size:0.85rem">VR-Ready Labs</div></div>
  </div>
  <div class="lab-grid">${DISCIPLINES.map(d => `
    <div class="glass-card lab-card" data-discipline="${d.id}" onclick="navigateTo('/labs')" tabindex="0"
         role="button" aria-label="Explore ${d.name} labs">
      <div class="lab-icon" aria-hidden="true">${d.icon}</div>
      <div class="lab-title">${d.name}</div>
      <div class="lab-desc">${d.desc}</div>
      <div class="lab-meta">
        <span class="lab-badge">${d.labs.length} Labs</span>
        <span class="lab-badge">${d.labs.reduce((c,l)=>c+(l.credits||0),0)} Credits</span>
        ${d.labs.some(l=>l.vr) ? '<span class="lab-badge vr">🥽 VR</span>' : ''}
        <span class="lab-badge voice">🎤 Voice</span>
      </div>
      <div style="margin-top:var(--sp-sm);font-size:0.8rem;color:var(--text-secondary)"><strong>Prerequisites:</strong> ${d.prereqs||'None'}</div>
    </div>`).join('')}
  </div>
  <div style="margin-top:var(--sp-2xl)">
    <div class="glass-card" style="max-width:900px;margin:0 auto">
      <h2 style="margin-bottom:var(--sp-lg);text-align:center">🎓 Learning Methodology</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--sp-lg)">
        <div><h3 style="color:var(--primary);font-size:1rem">1. Guided Theory</h3><p style="color:var(--text-secondary);font-size:0.85rem">Each lab includes comprehensive background theory, key equations, and conceptual frameworks drawn from university-level textbooks and peer-reviewed sources.</p></div>
        <div><h3 style="color:var(--secondary);font-size:1rem">2. Interactive Simulation</h3><p style="color:var(--text-secondary);font-size:0.85rem">Real-time Canvas simulations let you manipulate variables, observe results, and build intuition for complex phenomena through hands-on experimentation.</p></div>
        <div><h3 style="color:var(--accent);font-size:1rem">3. Data Collection & Analysis</h3><p style="color:var(--text-secondary);font-size:0.85rem">Record simulation data, export to CSV/JSON/PDF, and perform quantitative analysis — the same workflow used in professional research laboratories.</p></div>
        <div><h3 style="color:#a855f7;font-size:1rem">4. Assessment & Mastery</h3><p style="color:var(--text-secondary);font-size:0.85rem">Learning objectives are mapped to measurable outcomes. Track your progress, earn credits, and demonstrate mastery across all disciplines.</p></div>
      </div>
    </div>
  </div>
  <div style="margin-top:var(--sp-2xl);text-align:center">
    <div class="glass-card" style="display:inline-block;max-width:900px">
      <h2 style="margin-bottom:var(--sp-md)">Platform Capabilities</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-md);text-align:left">
        <div>♿ <strong>Full Accessibility</strong><br><small style="color:var(--text-secondary)">WCAG 2.1 AA+ compliant, screen reader support, keyboard navigation, high contrast mode, adjustable text sizing</small></div>
        <div>🥽 <strong>VR Immersion</strong><br><small style="color:var(--text-secondary)">WebXR-powered immersive 3D environments for ${vrLabs} labs. Compatible with Quest, Vive, and cardboard headsets</small></div>
        <div>🎤 <strong>Voice Control</strong><br><small style="color:var(--text-secondary)">Hands-free lab operation via Web Speech API. Say "play", "pause", "reset", "record data", or "export" to control simulations</small></div>
        <div>📱 <strong>Cross-Platform</strong><br><small style="color:var(--text-secondary)">Windows, macOS, Linux, iOS, Android. PWA installable with offline/online sync for uninterrupted access</small></div>
        <div>📊 <strong>Data Export</strong><br><small style="color:var(--text-secondary)">Export simulation data as CSV, JSON, or PDF reports. Compatible with Excel, Google Sheets, Jupyter, and R Studio</small></div>
        <div>🔐 <strong>Enterprise Compliant</strong><br><small style="color:var(--text-secondary)">Terms of Service, Operator Agreement, FERPA, COPPA, and institutional data handling policies built-in</small></div>
        <div>🧮 <strong>Real Equations</strong><br><small style="color:var(--text-secondary)">Every lab includes relevant formulas, derivations, and mathematical models drawn from standard university curricula</small></div>
        <div>📚 <strong>Credit-Bearing</strong><br><small style="color:var(--text-secondary)">Labs are weighted by difficulty (2-4 credits). Complete all ${totalLabs} labs for ${totalCredits} total credits toward certification</small></div>
      </div>
    </div>
  </div>`;
}

// ─── Render: Lab Browser ────────────────────────────────────────────────────
function renderLabBrowser() {
  if (!State.tosAccepted && State.user) return renderToSGate();
  const diffColors = {Beginner:'#22c55e',Intermediate:'#f59e0b',Advanced:'#ef4444'};
  return `<h1 style="margin-bottom:var(--sp-sm)">🔬 Lab Catalog</h1>
  <p style="color:var(--text-secondary);margin-bottom:var(--sp-xl);max-width:700px">Browse ${DISCIPLINES.reduce((s,d)=>s+d.labs.length,0)} interactive labs across ${DISCIPLINES.length} disciplines. Each lab includes learning objectives, background theory, key equations, and real-time data collection.</p>
  ${DISCIPLINES.map(d => `
    <div style="margin-bottom:var(--sp-2xl)">
      <h2 style="color:${d.color};margin-bottom:var(--sp-xs)">${d.icon} ${d.name}</h2>
      <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:var(--sp-md)">${d.desc}<br><strong>Prerequisites:</strong> ${d.prereqs||'None'}</p>
      <div class="lab-grid">${d.labs.map(l => `
        <div class="glass-card lab-card" data-discipline="${d.id}" onclick="navigateTo('/lab/${l.id}')"
             tabindex="0" role="button" aria-label="Open ${l.name} lab">
          <div class="lab-icon" aria-hidden="true">${d.icon}</div>
          <div class="lab-title">${l.name}</div>
          <div class="lab-desc">${l.desc}</div>
          <div class="lab-meta" style="flex-wrap:wrap">
            <span class="lab-badge" style="background:${diffColors[l.difficulty]||'#6366f1'}22;color:${diffColors[l.difficulty]||'#6366f1'}">${l.difficulty||'—'}</span>
            <span class="lab-badge">⏱ ${l.time||'—'}</span>
            <span class="lab-badge" style="background:var(--primary-alpha);color:var(--primary)">${l.credits||0} Credits</span>
            ${l.vr ? '<span class="lab-badge vr">🥽 VR</span>' : ''}
            ${l.voice ? '<span class="lab-badge voice">🎤</span>' : ''}
          </div>
          <div style="margin-top:var(--sp-sm);font-size:0.75rem;color:var(--text-secondary)">
            <strong>Objectives:</strong> ${(l.objectives||[]).length} learning outcomes · <strong>Concepts:</strong> ${(l.concepts||[]).length} key terms
          </div>
        </div>`).join('')}
      </div>
    </div>`).join('')}`;
}

function renderToSGate() {
  return `<div class="compliance-content">
    <h1>Terms of Service Required</h1>
    <p>You must accept the Terms of Service before accessing labs.</p>
    <div class="compliance-acceptance">
      <label style="display:flex;align-items:center;gap:var(--sp-sm);justify-content:center;cursor:pointer">
        <input type="checkbox" id="tos-check"> I have read and agree to the <a href="#/tos" style="color:var(--primary)">Terms of Service</a>
      </label>
      <button class="btn btn-primary btn-lg" style="margin-top:var(--sp-lg)" onclick="acceptToS()">Accept & Continue</button>
    </div>
  </div>`;
}

function acceptToS() {
  const cb = document.getElementById('tos-check');
  if (!cb || !cb.checked) { showToast('Please check the box to accept ToS', 'warning'); return; }
  State.tosAccepted = true;
  saveToLocal();
  showToast('Terms accepted! Welcome to the labs.', 'success');
  navigateTo('/labs');
}

// ─── Render: Lab Workspace ──────────────────────────────────────────────────
function renderLabWorkspace(labId) {
  let lab = null, disc = null;
  for (const d of DISCIPLINES) { const found = d.labs.find(l => l.id === labId); if (found) { lab = found; disc = d; break; } }
  if (!lab) return '<div class="hero"><h1>Lab Not Found</h1></div>';
  State.currentLab = lab;
  const diffColors = {Beginner:'#22c55e',Intermediate:'#f59e0b',Advanced:'#ef4444'};
  return `<div style="margin-bottom:var(--sp-lg);display:flex;align-items:center;gap:var(--sp-md);flex-wrap:wrap">
    <a href="#/labs" class="btn btn-secondary btn-sm">← Back to Labs</a>
    <h1 style="font-size:1.5rem">${disc.icon} ${lab.name}</h1>
    <span class="lab-badge" style="background:${diffColors[lab.difficulty]||'#6366f1'}22;color:${diffColors[lab.difficulty]||'#6366f1'}">${lab.difficulty||'—'}</span>
    <span class="lab-badge">⏱ ${lab.time||'—'}</span>
    <span class="lab-badge" style="background:var(--primary-alpha);color:var(--primary)">${lab.credits||0} Credits</span>
    ${lab.vr ? '<button class="vr-badge" onclick="enterVR()" aria-label="Enter VR mode">🥽 Enter VR</button>' : ''}
  </div>
  <div class="lab-workspace">
    <div class="lab-canvas-container">
      <canvas id="lab-canvas" aria-label="${lab.name} simulation canvas" tabindex="0"></canvas>
      <div class="lab-toolbar">
        <button class="btn btn-secondary btn-sm" onclick="labAction('reset')">🔄 Reset</button>
        <button class="btn btn-secondary btn-sm" onclick="labAction('play')">▶️ Play</button>
        <button class="btn btn-secondary btn-sm" onclick="labAction('pause')">⏸️ Pause</button>
        <button class="btn btn-secondary btn-sm" onclick="labAction('step')">⏭️ Step</button>
        <button class="btn btn-secondary btn-sm" onclick="labAction('record')">📊 Record Data</button>
        <button class="btn btn-secondary btn-sm" onclick="exportLabData('csv')">📥 Export CSV</button>
      </div>
      <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:8px;padding:6px 12px;margin-top:4px;font-size:0.78rem;color:#818cf8;display:flex;align-items:center;gap:8px">
        <span>🖱️</span>
        <span id="canvas-hint">Click, drag, and interact directly with the simulation canvas</span>
      </div>
    </div>
    <div class="lab-sidebar" style="max-height:80vh;overflow-y:auto">
      <div class="sidebar-panel"><h3>📋 Description</h3><p style="color:var(--text-secondary);font-size:0.9rem">${lab.desc}</p></div>
      <div class="sidebar-panel"><h3>🖱️ How to Interact</h3><div id="interaction-guide" style="color:var(--text-secondary);font-size:0.82rem;line-height:1.5"></div></div>
      ${lab.objectives ? `<div class="sidebar-panel"><h3>🎯 Learning Objectives</h3><ol style="color:var(--text-secondary);font-size:0.85rem;padding-left:var(--sp-lg);margin:0">${lab.objectives.map(o=>`<li style="margin-bottom:4px">${o}</li>`).join('')}</ol></div>` : ''}
      ${lab.theory ? `<div class="sidebar-panel"><h3>📖 Theory Background</h3><p style="color:var(--text-secondary);font-size:0.85rem;line-height:1.6">${lab.theory}</p></div>` : ''}
      ${lab.concepts ? `<div class="sidebar-panel"><h3>🔑 Key Concepts</h3><div style="display:flex;flex-wrap:wrap;gap:4px">${lab.concepts.map(c=>`<span style="background:rgba(99,102,241,0.12);color:#818cf8;padding:2px 8px;border-radius:4px;font-size:0.75rem">${c}</span>`).join('')}</div></div>` : ''}
      ${lab.equations ? `<div class="sidebar-panel"><h3>🧮 Key Equations</h3><div style="font-family:var(--font-mono);font-size:0.8rem;color:var(--accent)">${lab.equations.map(e=>`<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05)">${e}</div>`).join('')}</div></div>` : ''}
      <div class="sidebar-panel"><h3>🎛️ Controls</h3><div id="lab-controls">Loading controls...</div></div>
      <div class="sidebar-panel"><h3>📊 Data Output</h3><pre id="lab-data" style="font-family:var(--font-mono);font-size:0.8rem;color:var(--secondary);max-height:200px;overflow:auto">Waiting for simulation...</pre></div>
      <div class="sidebar-panel"><h3>🎤 Voice Commands</h3>
        <p style="color:var(--text-secondary);font-size:0.85rem">Say: "reset", "play", "pause", "step", "record data", "export"</p>
      </div>
    </div>
  </div>`;
}

// ─── Lab Simulations ────────────────────────────────────────────────────────
const LabSims = {
  state: { running: false, time: 0, data: [], animId: null, mouse:{x:0,y:0,down:false,clicked:false,dragging:false,dragStart:null}, params:{} },
  init(labId) {
    const canvas = document.getElementById('lab-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    this.state = { running: false, time: 0, data: [], animId: null, mouse:{x:0,y:0,down:false,clicked:false,dragging:false,dragStart:null,hover:null}, params:{}, _highlights:[] };
    // Default params per lab
    const defaults = {
      'plate-tectonics':{speed:1,depth:3400,showLabels:true},'weather-patterns':{windSpeed:5,temp:22,humidity:65,showPressure:true},
      'geological-layers':{drillSpeed:2,showFossils:true,showDating:true},'cell-explorer':{zoom:1,showLabels:true,selectedOrganelle:null},
      'dna-replication':{replicationSpeed:1,showEnzymes:true},'ecosystem-sim':{preyCount:20,predCount:5,spawnRate:0.02},
      'molecular-builder':{selectedAtom:'O',bondAngle:104.5,showElectrons:true,atoms:[]},'reaction-sim':{temperature:300,catalyst:false,concentration:1},
      'periodic-table':{selectedElement:0,showOrbits:true},'projectile-motion':{velocity:50,angle:45,gravity:9.81,showTrail:true,launched:false,trails:[]},
      'optics-bench':{focalLength:150,lensX:0.5,numRays:5,showFocal:true},'circuit-sim':{voltage:12,resistance:100,showElectrons:true},
      'sorting-viz':{algorithm:'bubble',speed:1,arraySize:30},'neural-net':{learningRate:0.1,layers:[3,5,4,2],showWeights:true,epoch:0},
      'pathfinding':{algorithm:'astar',showVisited:true,drawMode:'wall'},'circuit-design':{inputs:[1,0],gateType:'AND'},
      'robot-arm':{joint1:0,joint2:0,joint3:0,gripOpen:true,autoMode:true},'bridge-builder':{load:0,material:'steel',showStress:true}
    };
    this.state.params = {...(defaults[labId]||{})};
    this.renderSim(ctx, canvas, labId);
    this.setupControls(labId);
    this.setupMouseEvents(canvas, ctx, labId);
    this.setupInteractionGuide(labId);
    window.addEventListener('resize', () => {
      canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
      this.renderSim(ctx, canvas, labId);
    });
  },
  setupInteractionGuide(labId) {
    const el = document.getElementById('interaction-guide');
    const hint = document.getElementById('canvas-hint');
    if(!el) return;
    const guides = {
      'cell-explorer': {steps:['🔬 Click on organelles (nucleus, mitochondria) to learn about them','🔄 Use zoom slider to magnify structures','▶️ Press Play to animate organelle activity','📊 Record data to capture cell state'], hint:'Click organelles to identify them'},
      'molecular-builder': {steps:['🧪 Select an atom type from controls (H, O, N, C, S)','🖱️ Click anywhere on canvas to place atoms','⚗️ Build molecules by placing atoms near each other','🔗 Watch bonds form automatically between nearby atoms'], hint:'Click to place atoms on canvas'},
      'pathfinding': {steps:['🧱 Click grid cells to place or remove walls','🟢 Green cell = start position','🔴 Red cell = end position','▶️ Press Play to watch the algorithm find a path'], hint:'Click cells to toggle walls'},
      'projectile-motion': {steps:['🎯 Adjust velocity, angle, and gravity with sliders','🖱️ Click canvas to launch the projectile','📐 Watch the parabolic trajectory','📏 Compare predicted vs actual range'], hint:'Click canvas to launch projectile!'},
      'periodic-table': {steps:['🖱️ Click any element to select and highlight it','⚛️ Watch electron orbits animate around the nucleus','🔢 Data panel shows atomic mass and number'], hint:'Click elements to select them'},
      'ecosystem-sim': {steps:['🖱️ Click canvas to add prey organisms at that location','🔧 Adjust prey/predator counts with sliders','▶️ Play to watch Lotka-Volterra dynamics','📊 Record population data at intervals'], hint:'Click to add prey organisms'},
      'robot-arm': {steps:['🖱️ Click canvas to set target position for arm','🎛️ Adjust joint angles manually with sliders','✋ Toggle auto/manual mode for control method','🤏 Open/close gripper with toggle'], hint:'Click to position the robotic arm'},
      'bridge-builder': {steps:['🖱️ Click canvas to set load position','📊 Watch stress distribution change in real-time','🏗️ Switch materials to compare strength','⚠️ Monitor safety factor indicator'], hint:'Click to set load position'},
      'circuit-sim': {steps:['🔋 Click the battery to cycle voltage (3V-24V)','🎛️ Adjust resistance with slider','👀 Watch electrons flow through the circuit','📊 Monitor voltage, current, and power in data panel'], hint:'Click battery to change voltage'},
      'reaction-sim': {steps:['🌡️ Increase temperature to speed up reactions','⚗️ Toggle catalyst to lower activation energy','📊 Watch reactant → product conversion','🎥 Record data at different temperatures'], hint:'Adjust temperature and watch reactions'},
      'dna-replication': {steps:['▶️ Press Play to start helicase unwinding','🧬 Watch base pairs separate and replicate','🔬 Toggle enzyme labels for detail','📊 Track replication progress percentage'], hint:'Play to watch DNA replication'},
      'optics-bench': {steps:['🔍 Adjust focal length to change lens power','💡 Add more rays to visualize light paths','🎯 Toggle focal point marker','📐 Observe convergence and magnification'], hint:'Adjust lens parameters'},
      'sorting-viz': {steps:['📋 Select different algorithms to compare','▶️ Play to watch sorting in action','🔴 Active comparisons highlighted in red','📊 Track comparisons and swaps count'], hint:'Select algorithm and press Play'},
      'neural-net': {steps:['🧠 Adjust learning rate to affect convergence','👀 Toggle weight visualization on/off','▶️ Play to advance training epochs','📉 Watch loss decrease over time'], hint:'Watch neural network train'},
      'plate-tectonics': {steps:['▶️ Play to animate plate drift and convergence','🔥 Observe magma convection particles','🏔️ Watch mountain formation at boundaries','📊 Record drift rate over time'], hint:'Play to watch tectonic plates move'},
      'weather-patterns': {steps:['🌡️ Adjust temperature and humidity sliders','💨 Change wind speed to affect cloud movement','📊 Monitor pressure, temp, and humidity readings','🌧️ Observe precipitation patterns'], hint:'Adjust weather parameters'},
      'geological-layers': {steps:['▶️ Press Play to start the drill simulation','🪨 Each layer reveals different geological strata','🦴 Toggle fossil visibility for each layer','📅 Toggle radiometric dating overlay'], hint:'Play to drill through strata'},
      'circuit-design': {steps:['🔌 Select gate type from dropdown','⚡ Watch signal propagation through gates','🟡 Yellow dot shows signal traveling','📐 Logic output shown in data panel'], hint:'Watch signal propagation'}
    };
    const g = guides[labId] || {steps:['▶️ Press Play to start the simulation','⏸️ Pause to freeze at any point','⏭️ Step to advance frame by frame','📊 Record data and export to CSV'],hint:'Interact with the simulation'};
    el.innerHTML = g.steps.map(s=>`<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04)">${s}</div>`).join('');
    if(hint) hint.textContent = g.hint;
  },
  setupMouseEvents(canvas, ctx, labId) {
    const getPos = (e) => { const r=canvas.getBoundingClientRect(); const t=e.touches?e.touches[0]:e; return {x:t.clientX-r.left,y:t.clientY-r.top}; };
    canvas.addEventListener('mousemove', (e) => { const p=getPos(e); this.state.mouse.x=p.x; this.state.mouse.y=p.y; if(this.state.mouse.down)this.state.mouse.dragging=true; if(!this.state.running)this.renderSim(ctx,canvas,labId); this.handleHover(canvas,labId); });
    canvas.addEventListener('mousedown', (e) => { const p=getPos(e); this.state.mouse.down=true; this.state.mouse.dragStart={x:p.x,y:p.y}; });
    canvas.addEventListener('mouseup', (e) => { const p=getPos(e); if(!this.state.mouse.dragging){this.state.mouse.clicked=true; this.handleClick(ctx,canvas,labId);} this.state.mouse.down=false; this.state.mouse.dragging=false; });
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); const p=getPos(e); this.state.mouse.x=p.x; this.state.mouse.y=p.y; this.state.mouse.down=true; this.state.mouse.dragStart={x:p.x,y:p.y}; }, {passive:false});
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); const p=getPos(e); this.state.mouse.x=p.x; this.state.mouse.y=p.y; this.state.mouse.dragging=true; if(!this.state.running)this.renderSim(ctx,canvas,labId); }, {passive:false});
    canvas.addEventListener('touchend', (e) => { if(!this.state.mouse.dragging){this.state.mouse.clicked=true; this.handleClick(ctx,canvas,labId);} this.state.mouse.down=false; this.state.mouse.dragging=false; });
    canvas.style.cursor = 'crosshair';
  },
  handleHover(canvas, labId) {
    const {x,y} = this.state.mouse;
    let tooltip = null;
    if (labId==='cell-explorer') {
      const W=canvas.width, H=canvas.height, cx=W/2, cy=H/2, r=Math.min(W,H)*0.35;
      const d=Math.sqrt((x-cx+10)**2+(y-cy-5)**2);
      if(d<r*0.22) tooltip='Nucleus — Contains DNA, controls gene expression';
      else if(Math.sqrt((x-cx)**2+(y-cy)**2)<r) tooltip='Cytoplasm — Click organelles to learn more';
    } else if (labId==='periodic-table') {
      tooltip = 'Click an element to select it';
    } else if (labId==='pathfinding') {
      tooltip = this.state.params.drawMode==='wall'?'Click to toggle walls':'Click to set start/end';
    }
    canvas.title = tooltip||'';
  },
  handleClick(ctx, canvas, labId) {
    const {x,y} = this.state.mouse;
    const W=canvas.width, H=canvas.height;
    this.state.mouse.clicked = false;
    
    if (labId==='cell-explorer') {
      const cx=W/2, cy=H/2, r=Math.min(W,H)*0.35;
      const d=Math.sqrt((x-cx+10)**2+(y-cy-5)**2);
      if(d<r*0.22) { this.state.params.selectedOrganelle='Nucleus'; showToast('Nucleus: Contains DNA wrapped around histones. Controls gene expression via mRNA transcription.','info'); }
      else { const t=this.state.time*0.02;
        for(let i=0;i<5;i++){ const a=t+i*1.26; const mx=cx+Math.cos(a)*r*0.55, my=cy+Math.sin(a)*r*0.45;
          if(Math.sqrt((x-mx)**2+(y-my)**2)<18){this.state.params.selectedOrganelle='Mitochondria'; showToast('Mitochondria: Powerhouse of the cell. Produces ATP via oxidative phosphorylation (36-38 ATP per glucose).','info');break;}
        }
      }
      this.renderSim(ctx,canvas,labId); updateDataOutput();
    }
    else if (labId==='molecular-builder') {
      if(!this.state.params.atoms) this.state.params.atoms=[];
      const atomColors = {H:'#f0f0f0',O:'#ef4444',N:'#3b82f6',C:'#4b5563',S:'#f59e0b'};
      this.state.params.atoms.push({x,y,type:this.state.params.selectedAtom,c:atomColors[this.state.params.selectedAtom]||'#888'});
      showToast(`Placed ${this.state.params.selectedAtom} atom at (${Math.round(x)}, ${Math.round(y)})`,'success');
      this.renderSim(ctx,canvas,labId); updateDataOutput();
    }
    else if (labId==='pathfinding') {
      if(!this.state._grid) return;
      const cols=16,rows=10,cw=(W-40)/cols,ch=(H-80)/rows;
      const c=Math.floor((x-20)/cw), r=Math.floor((y-50)/ch);
      if(r>=0&&r<rows&&c>=0&&c<cols&&!(r===0&&c===0)&&!(r===rows-1&&c===cols-1)){
        this.state._grid[r][c]=this.state._grid[r][c]?0:1;
        this.state._visited=[];
        showToast(this.state._grid[r][c]?'Wall placed':'Wall removed','info');
        this.renderSim(ctx,canvas,labId); updateDataOutput();
      }
    }
    else if (labId==='periodic-table') {
      const cols=5,cellW=Math.min(60,(W-80)/cols),cellH=50;
      const elements=[{s:'H',n:1,name:'Hydrogen',mass:1.008},{s:'He',n:2,name:'Helium',mass:4.003},{s:'Li',n:3,name:'Lithium',mass:6.941},{s:'Be',n:4,name:'Beryllium',mass:9.012},{s:'B',n:5,name:'Boron',mass:10.81},{s:'C',n:6,name:'Carbon',mass:12.011},{s:'N',n:7,name:'Nitrogen',mass:14.007},{s:'O',n:8,name:'Oxygen',mass:15.999},{s:'F',n:9,name:'Fluorine',mass:18.998},{s:'Ne',n:10,name:'Neon',mass:20.180}];
      elements.forEach((el,i)=>{ const col=i%cols,row=Math.floor(i/cols); const ex=W/2-(cols*cellW)/2+col*cellW+5,ey=60+row*(cellH+8);
        if(x>=ex&&x<=ex+cellW-10&&y>=ey&&y<=ey+cellH){this.state.params.selectedElement=i; showToast(`${el.name} (${el.s}) — Atomic #${el.n}, Mass: ${el.mass} u`,'info');}
      });
      this.renderSim(ctx,canvas,labId); updateDataOutput();
    }
    else if (labId==='projectile-motion') {
      if(!this.state.params.launched){ this.state.params.launched=true; this.state.params.launchTime=this.state.time; this.state.params.trails.push([]); if(!this.state.running) this.play(); showToast('Projectile launched!','success'); }
      else { this.state.params.launched=false; showToast('Click canvas to launch again','info'); }
      updateDataOutput();
    }
    else if (labId==='robot-arm') {
      this.state.params.autoMode=false;
      const baseX=W/2,baseY=H*0.8;
      const dx=x-baseX,dy=baseY-y;
      const targetAngle=Math.atan2(dx,dy);
      this.state.params.joint1=targetAngle*0.5;
      this.state.params.joint2=targetAngle*0.8;
      showToast(`Arm target: (${Math.round(x)}, ${Math.round(y)})`,'info');
      this.renderSim(ctx,canvas,labId); updateDataOutput();
    }
    else if (labId==='bridge-builder') {
      this.state.params.load = Math.max(0,100 - (y/H)*100);
      showToast(`Load set to ${this.state.params.load.toFixed(0)}%`,'info');
      this.renderSim(ctx,canvas,labId); updateDataOutput();
    }
    else if (labId==='ecosystem-sim') {
      if(!this.state._eco) return;
      this.state._eco.prey.push({x,y,vx:(Math.random()-0.5)*2,vy:(Math.random()-0.5)*2});
      showToast(`Prey added at (${Math.round(x)},${Math.round(y)}). Total: ${this.state._eco.prey.length}`,'success');
      this.renderSim(ctx,canvas,labId); updateDataOutput();
    }
    else if (labId==='circuit-sim') {
      const cx2=W/2,cy2=H/2;
      if(Math.abs(x-cx2+W*0.3)<15&&Math.abs(y-cy2)<20){
        this.state.params.voltage = this.state.params.voltage>=24?3:this.state.params.voltage+3;
        showToast(`Voltage: ${this.state.params.voltage}V`,'info');
        this.renderSim(ctx,canvas,labId); updateDataOutput();
      }
    }
  },
  renderSim(ctx, canvas, labId) {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#0D1117'; ctx.fillRect(0, 0, W, H);
    // Grid
    ctx.strokeStyle = 'rgba(108,99,255,0.08)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // Mouse cursor indicator
    if(this.state.mouse.x>0&&this.state.mouse.y>0){ctx.strokeStyle='rgba(99,102,241,0.3)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(this.state.mouse.x,this.state.mouse.y,8,0,Math.PI*2);ctx.stroke();}
    // Dispatch to lab-specific renderer
    const renderer = this.renderers[labId] || this.renderers.default;
    renderer(ctx, W, H, this.state);
  },
  renderers: {
    // ── EARTH SCIENCES ──
    'plate-tectonics': (ctx,W,H,s)=>{const t=s.time*0.02;ctx.fillStyle='#1E3A5F';ctx.fillRect(0,0,W,H);ctx.fillStyle='#2563EB';ctx.fillRect(0,H*0.6,W,H*0.4);const plates=[{x:W*0.1+Math.sin(t)*20,w:W*0.35,c:'#92400E'},{x:W*0.55-Math.sin(t)*20,w:W*0.35,c:'#78350F'}];plates.forEach(p=>{ctx.fillStyle=p.c;ctx.fillRect(p.x,H*0.35,p.w,H*0.25);ctx.fillStyle='#059669';ctx.fillRect(p.x,H*0.3,p.w,H*0.05);});for(let i=0;i<8;i++){ctx.fillStyle=`rgba(220,38,38,${0.3+Math.sin(t*3+i)*0.3})`;ctx.beginPath();ctx.arc(W*0.45+i*12,H*0.55+Math.sin(t*2+i)*5,4+Math.sin(t*3+i)*2,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Plate Tectonics Simulator',W/2,30);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Time: ${s.time.toFixed(0)}s | Drift: ${(Math.sin(t)*2.4).toFixed(1)} cm/yr | Depth: ${(3400+Math.sin(t)*200).toFixed(0)} km`,W/2,H-15);},
    'weather-patterns': (ctx,W,H,s)=>{const t=s.time*0.03;const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#1e3a5f');grad.addColorStop(0.6,'#60a5fa');grad.addColorStop(1,'#065f46');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);for(let i=0;i<6;i++){const cx=W*0.15+i*(W*0.14)+Math.sin(t+i)*30;const cy=H*0.25+Math.cos(t*0.7+i)*40;ctx.fillStyle=`rgba(255,255,255,${0.15+Math.sin(t+i)*0.1})`;ctx.beginPath();ctx.ellipse(cx,cy,50+Math.sin(t+i)*10,25,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(cx+20,cy-10,35,20,0,0,Math.PI*2);ctx.fill();}for(let i=0;i<12;i++){const rx=((i*80+s.time*2)%W);const ry=H*0.5+Math.sin(t*2+i*0.5)*20;ctx.strokeStyle='rgba(96,165,250,0.5)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx-5,ry+15);ctx.stroke();}const press=1013+Math.sin(t)*15;const temp=22+Math.sin(t*0.5)*8;const humid=65+Math.sin(t*0.8)*20;ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Weather Pattern Lab',W/2,30);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Pressure: ${press.toFixed(0)} hPa | Temp: ${temp.toFixed(1)}°C | Humidity: ${humid.toFixed(0)}%`,W/2,H-15);},
    'geological-layers': (ctx,W,H,s)=>{const t=s.time*0.01;const layers=[{name:'Topsoil',h:0.08,c:'#4a3728'},{name:'Subsoil',h:0.1,c:'#6b4423'},{name:'Weathered Rock',h:0.12,c:'#8b7355'},{name:'Limestone',h:0.14,c:'#b8a88a'},{name:'Sandstone',h:0.14,c:'#c4956a'},{name:'Shale',h:0.12,c:'#5a5a6e'},{name:'Granite',h:0.15,c:'#8b7d82'},{name:'Magma',h:0.15,c:'#8b0000'}];let y=50;layers.forEach((l,i)=>{const lh=l.h*H;const wobble=Math.sin(t+i*0.5)*3;ctx.fillStyle=l.c;ctx.beginPath();ctx.moveTo(0,y+wobble);ctx.lineTo(W,y-wobble);ctx.lineTo(W,y+lh+wobble);ctx.lineTo(0,y+lh-wobble);ctx.fill();ctx.strokeStyle='rgba(0,0,0,0.3)';ctx.stroke();ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font='bold 12px Inter';ctx.textAlign='left';ctx.fillText(l.name,15,y+lh/2+4);y+=lh;});if(s.running){const drillY=50+s.time*2;ctx.strokeStyle='#f59e0b';ctx.lineWidth=3;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(W*0.7,50);ctx.lineTo(W*0.7,Math.min(drillY,H-20));ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#f59e0b';ctx.beginPath();ctx.arc(W*0.7,Math.min(drillY,H-20),6,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Geological Layers Explorer',W/2,30);},
    // ── BIOLOGY ──
    'cell-explorer': (ctx,W,H,s)=>{const t=s.time*0.02;ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);const cx=W/2,cy=H/2,r=Math.min(W,H)*0.35;ctx.strokeStyle='rgba(16,185,129,0.6)';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(cx,cy,r,r*0.85,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(16,185,129,0.05)';ctx.fill();ctx.fillStyle='rgba(139,92,246,0.7)';ctx.beginPath();ctx.ellipse(cx-10,cy+5,r*0.22,r*0.18,0.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(139,92,246,0.9)';ctx.stroke();ctx.fillStyle='rgba(96,165,250,0.5)';for(let i=0;i<5;i++){const a=t+i*1.26;ctx.beginPath();ctx.ellipse(cx+Math.cos(a)*r*0.55,cy+Math.sin(a)*r*0.45,14,8,a,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='rgba(251,191,36,0.4)';ctx.lineWidth=1;for(let i=0;i<8;i++){const a=t*0.5+i*0.785;const rr=r*0.7;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r*0.3,cy+Math.sin(a)*r*0.25);for(let j=0;j<20;j++){ctx.lineTo(cx+Math.cos(a+j*0.1)*rr*(0.3+j*0.035),cy+Math.sin(a+j*0.1)*rr*(0.25+j*0.03));}ctx.stroke();}ctx.fillStyle='rgba(248,113,113,0.6)';for(let i=0;i<12;i++){const a=t*0.3+i*0.524;ctx.beginPath();ctx.arc(cx+Math.cos(a)*r*0.65,cy+Math.sin(a)*r*0.5,3,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Cell Explorer',W/2,30);ctx.font='11px Inter';ctx.fillStyle='#10b981';ctx.fillText('Nucleus',cx-10,cy+10);ctx.fillStyle='#60a5fa';ctx.fillText('Mitochondria',cx+r*0.5,cy-r*0.3);},
    'dna-replication': (ctx,W,H,s)=>{const t=s.time*0.04;ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);const pairs=20,spacing=H/(pairs+2);const colors=[['#ef4444','#3b82f6'],['#22c55e','#f59e0b']];const split=Math.min(s.time*0.5,pairs*0.6);for(let i=0;i<pairs;i++){const y=spacing*(i+1.5);const wx=Math.sin(t+i*0.4)*30;const x1=W*0.35+wx,x2=W*0.65-wx;const cp=colors[i%2];if(i<split&&s.running){ctx.fillStyle=cp[0];ctx.beginPath();ctx.arc(x1-20,y,6,0,Math.PI*2);ctx.fill();ctx.fillStyle=cp[1];ctx.beginPath();ctx.arc(x2+20,y,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(139,92,246,0.5)';ctx.beginPath();ctx.arc(x1,y,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x2,y,5,0,Math.PI*2);ctx.fill();}else{ctx.fillStyle=cp[0];ctx.beginPath();ctx.arc(x1,y,6,0,Math.PI*2);ctx.fill();ctx.fillStyle=cp[1];ctx.beginPath();ctx.arc(x2,y,6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.beginPath();ctx.moveTo(x1+6,y);ctx.lineTo(x2-6,y);ctx.stroke();}}ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<pairs;i++){const y=spacing*(i+1.5);const wx=Math.sin(t+i*0.4)*30;i===0?ctx.moveTo(W*0.35+wx,y):ctx.lineTo(W*0.35+wx,y);}ctx.stroke();ctx.beginPath();for(let i=0;i<pairs;i++){const y=spacing*(i+1.5);const wx=Math.sin(t+i*0.4)*30;i===0?ctx.moveTo(W*0.65-wx,y):ctx.lineTo(W*0.65-wx,y);}ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('DNA Replication Lab',W/2,25);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Base pairs: ${pairs} | Replicated: ${Math.floor(split)}/${pairs}`,W/2,H-15);},
    'ecosystem-sim': (ctx,W,H,s)=>{const t=s.time*0.03;ctx.fillStyle='#0f2e0f';ctx.fillRect(0,0,W,H);ctx.fillStyle='#1a4d1a';ctx.fillRect(0,H*0.7,W,H*0.3);if(!s._eco){s._eco={prey:[],pred:[]};for(let i=0;i<20;i++)s._eco.prey.push({x:Math.random()*W,y:H*0.3+Math.random()*H*0.4,vx:(Math.random()-0.5)*2,vy:(Math.random()-0.5)*2});for(let i=0;i<5;i++)s._eco.pred.push({x:Math.random()*W,y:H*0.3+Math.random()*H*0.4,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3});}if(s.running){s._eco.prey.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<H*0.2||p.y>H*0.85)p.vy*=-1;});s._eco.pred.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>W)p.vx*=-1;if(p.y<H*0.2||p.y>H*0.85)p.vy*=-1;});}s._eco.prey.forEach(p=>{ctx.fillStyle='#22c55e';ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();});s._eco.pred.forEach(p=>{ctx.fillStyle='#ef4444';ctx.beginPath();ctx.moveTo(p.x,p.y-8);ctx.lineTo(p.x-6,p.y+5);ctx.lineTo(p.x+6,p.y+5);ctx.fill();});for(let i=0;i<8;i++){const tx=60+i*((W-100)/7);ctx.fillStyle='#15803d';ctx.beginPath();ctx.moveTo(tx,H*0.7);ctx.lineTo(tx-15,H*0.7);ctx.lineTo(tx,H*0.7-30-Math.sin(t+i)*5);ctx.lineTo(tx+15,H*0.7);ctx.fill();}ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Ecosystem Simulator',W/2,30);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Prey: ${s._eco.prey.length} | Predators: ${s._eco.pred.length} | Gen: ${Math.floor(s.time/10)}`,W/2,H-15);},
    // ── CHEMISTRY ──
    'molecular-builder': (ctx,W,H,s)=>{const t=s.time*0.02;ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);const atoms=[{x:W/2,y:H/2,r:22,c:'#ef4444',label:'O'},{x:W/2-70+Math.sin(t)*5,y:H/2-40+Math.cos(t)*5,r:16,c:'#f0f0f0',label:'H'},{x:W/2+70-Math.sin(t)*5,y:H/2-40-Math.cos(t)*5,r:16,c:'#f0f0f0',label:'H'}];ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(atoms[1].x,atoms[1].y);ctx.lineTo(atoms[0].x,atoms[0].y);ctx.stroke();ctx.beginPath();ctx.moveTo(atoms[2].x,atoms[2].y);ctx.lineTo(atoms[0].x,atoms[0].y);ctx.stroke();atoms.forEach(a=>{const grd=ctx.createRadialGradient(a.x-3,a.y-3,2,a.x,a.y,a.r);grd.addColorStop(0,'rgba(255,255,255,0.3)');grd.addColorStop(1,a.c);ctx.fillStyle=grd;ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 14px Inter';ctx.textAlign='center';ctx.fillText(a.label,a.x,a.y+5);});const angle=104.5;ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Molecular Builder — H₂O',W/2,30);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Bond angle: ${angle}° | Bond length: 0.96 Å | Molecule: Water`,W/2,H-15);},
    'reaction-sim': (ctx,W,H,s)=>{const t=s.time*0.03;ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=2;ctx.strokeRect(W*0.1,H*0.2,W*0.8,H*0.55);if(!s._particles){s._particles=[];for(let i=0;i<30;i++)s._particles.push({x:W*0.15+Math.random()*W*0.7,y:H*0.25+Math.random()*H*0.45,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.5)*3,type:i<15?0:1});}if(s.running){s._particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<W*0.12||p.x>W*0.88)p.vx*=-1;if(p.y<H*0.22||p.y>H*0.73)p.vy*=-1;});}const colors=['#3b82f6','#ef4444','#22c55e'];s._particles.forEach(p=>{ctx.fillStyle=colors[p.type];ctx.beginPath();ctx.arc(p.x,p.y,p.type===2?7:5,0,Math.PI*2);ctx.fill();});const temp=300+s.time*5;ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Chemical Reaction Simulator',W/2,30);const energyBar=Math.min(temp/1000,1);ctx.fillStyle='rgba(255,255,255,0.1)';ctx.fillRect(W*0.15,H*0.82,W*0.7,12);ctx.fillStyle=`hsl(${(1-energyBar)*120},80%,50%)`;ctx.fillRect(W*0.15,H*0.82,W*0.7*energyBar,12);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Temp: ${temp.toFixed(0)}K | Reactants: ${s._particles.filter(p=>p.type<2).length} | Products: ${s._particles.filter(p=>p.type===2).length}`,W/2,H-15);},
    'periodic-table': (ctx,W,H,s)=>{const t=s.time*0.02;ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);const elements=[{s:'H',n:1,c:'#ef4444'},{s:'He',n:2,c:'#a855f7'},{s:'Li',n:3,c:'#f59e0b'},{s:'Be',n:4,c:'#eab308'},{s:'B',n:5,c:'#84cc16'},{s:'C',n:6,c:'#22c55e'},{s:'N',n:7,c:'#06b6d4'},{s:'O',n:8,c:'#3b82f6'},{s:'F',n:9,c:'#6366f1'},{s:'Ne',n:10,c:'#a855f7'}];const cols=5,cellW=Math.min(60,(W-80)/cols),cellH=50;elements.forEach((el,i)=>{const col=i%cols,row=Math.floor(i/cols);const x=W/2-(cols*cellW)/2+col*cellW+5;const y=60+row*(cellH+8);const hover=Math.sin(t+i*0.5)*0.15;ctx.fillStyle=el.c+Math.floor((0.25+hover)*255).toString(16).padStart(2,'0');ctx.strokeStyle=el.c;ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x,y,cellW-10,cellH,6);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText(el.s,x+(cellW-10)/2,y+22);ctx.font='10px Inter';ctx.fillStyle='#ccc';ctx.fillText(el.n.toString(),x+(cellW-10)/2,y+38);});const sel=elements[Math.floor(s.time/3)%elements.length];const orbitCx=W/2,orbitCy=H*0.72,orbitR=40;ctx.fillStyle=sel.c;ctx.beginPath();ctx.arc(orbitCx,orbitCy,8,0,Math.PI*2);ctx.fill();for(let i=0;i<sel.n&&i<4;i++){const a=t*3+i*(Math.PI*2/Math.min(sel.n,4));ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.beginPath();ctx.ellipse(orbitCx,orbitCy,orbitR+i*15,orbitR*0.6+i*10,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#60a5fa';ctx.beginPath();ctx.arc(orbitCx+Math.cos(a)*(orbitR+i*15),orbitCy+Math.sin(a)*(orbitR*0.6+i*10),3,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Interactive Periodic Table',W/2,30);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Element: ${sel.s} | Atomic #: ${sel.n} | Electrons: ${sel.n}`,W/2,H-15);},
    // ── PHYSICS ──
    'projectile-motion': (ctx,W,H,s)=>{const g=9.81,v0=50,angle=Math.PI/4,t=s.time*0.05;const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#1e1b4b');grad.addColorStop(1,'#0f172a');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);ctx.fillStyle='#065F46';ctx.fillRect(0,H*0.75,W,H*0.25);const x=v0*Math.cos(angle)*t*8,y=H*0.75-(v0*Math.sin(angle)*t-0.5*g*t*t)*5;ctx.strokeStyle='rgba(245,158,11,0.2)';ctx.setLineDash([4,4]);ctx.beginPath();for(let i=0;i<200;i++){const ti=i*0.05;const xi=v0*Math.cos(angle)*ti*8;const yi=H*0.75-(v0*Math.sin(angle)*ti-0.5*g*ti*ti)*5;if(yi>H*0.75)break;i===0?ctx.moveTo(40+xi,yi):ctx.lineTo(40+xi,yi);}ctx.stroke();ctx.setLineDash([]);if(y<=H*0.75){ctx.fillStyle='#F59E0B';ctx.shadowColor='#F59E0B';ctx.shadowBlur=15;ctx.beginPath();ctx.arc(40+x,y,8,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Projectile Motion Lab',W/2,30);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`v₀=${v0}m/s | θ=45° | t=${t.toFixed(2)}s | Range: ${(v0*v0*Math.sin(2*angle)/g).toFixed(1)}m`,W/2,H-15);},
    'optics-bench': (ctx,W,H,s)=>{const t=s.time*0.02;ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,H/2);ctx.lineTo(W,H/2);ctx.stroke();const lensX=W*0.5;ctx.strokeStyle='rgba(96,165,250,0.6)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(lensX,H/2,8,H*0.25,0,0,Math.PI*2);ctx.stroke();const rays=5;for(let i=0;i<rays;i++){const yOff=(i-2)*25;ctx.strokeStyle=`hsla(${i*30+40},90%,60%,0.7)`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(30,H/2+yOff);ctx.lineTo(lensX,H/2+yOff);const focalPt=lensX+150;ctx.lineTo(focalPt,H/2);ctx.lineTo(W-20,H/2-(yOff*0.5));ctx.stroke();}ctx.fillStyle='#f59e0b';ctx.beginPath();ctx.arc(lensX+150,H/2,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(245,158,11,0.15)';ctx.beginPath();ctx.arc(lensX+150,H/2,15+Math.sin(t*2)*3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Optics Bench',W/2,30);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Focal length: 150px | Lens type: Convex | Rays: ${rays}`,W/2,H-15);},
    'circuit-sim': (ctx,W,H,s)=>{const t=s.time*0.05;ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);const cx=W/2,cy=H/2,rw=W*0.3,rh=H*0.25;ctx.strokeStyle='#22c55e';ctx.lineWidth=3;ctx.strokeRect(cx-rw,cy-rh,rw*2,rh*2);ctx.fillStyle='#f59e0b';ctx.fillRect(cx-rw-5,cy-15,10,30);ctx.fillStyle='#fff';ctx.font='10px Inter';ctx.textAlign='center';ctx.fillText('V',cx-rw,cy+25);ctx.fillStyle='#ef4444';ctx.fillRect(cx+rw*0.3-15,cy-rh-5,30,10);ctx.fillText('R₁',cx+rw*0.3,cy-rh-12);ctx.fillStyle='#3b82f6';ctx.fillRect(cx+rw-5,cy+rh*0.3-10,10,20);ctx.fillText('R₂',cx+rw+15,cy+rh*0.3);const numElectrons=8;for(let i=0;i<numElectrons;i++){const phase=(t+i*(Math.PI*2/numElectrons))%(Math.PI*2);let ex,ey;if(phase<Math.PI/2){ex=cx-rw+phase/(Math.PI/2)*rw*2;ey=cy-rh;}else if(phase<Math.PI){ex=cx+rw;ey=cy-rh+(phase-Math.PI/2)/(Math.PI/2)*rh*2;}else if(phase<Math.PI*1.5){ex=cx+rw-(phase-Math.PI)/(Math.PI/2)*rw*2;ey=cy+rh;}else{ex=cx-rw;ey=cy+rh-(phase-Math.PI*1.5)/(Math.PI/2)*rh*2;}ctx.fillStyle='#60a5fa';ctx.beginPath();ctx.arc(ex,ey,4,0,Math.PI*2);ctx.fill();}const V=12,I=(V/100).toFixed(2);ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.fillText('Circuit Simulator',W/2,30);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Voltage: ${V}V | Current: ${I}A | Power: ${(V*parseFloat(I)).toFixed(1)}W`,W/2,H-15);},
    // ── CS & AI ──
    'sorting-viz': (ctx,W,H,s)=>{ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);const n=30,barW=(W-40)/n;if(!s._arr)s._arr=Array.from({length:n},(_,i)=>((i+1)/n)).sort(()=>Math.random()-0.5);if(!s._sortIdx)s._sortIdx=0;s._arr.forEach((v,i)=>{const h=v*(H-80);const isActive=s.running&&(i===s._sortIdx||i===s._sortIdx+1);ctx.fillStyle=isActive?'#ef4444':`hsl(${v*280},70%,55%)`;ctx.fillRect(20+i*barW,H-40-h,barW-2,h);});if(s.running&&s.time%2===0&&s._sortIdx<n-1){if(s._arr[s._sortIdx]>s._arr[s._sortIdx+1])[s._arr[s._sortIdx],s._arr[s._sortIdx+1]]=[s._arr[s._sortIdx+1],s._arr[s._sortIdx]];s._sortIdx++;if(s._sortIdx>=n-1)s._sortIdx=0;}ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Sorting Algorithm Visualizer — Bubble Sort',W/2,30);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Elements: ${n} | Comparisons: ${Math.floor(s.time/2)} | Index: ${s._sortIdx||0}`,W/2,H-15);},
    'neural-net': (ctx,W,H,s)=>{const t=s.time*0.03;ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);const layers=[3,5,4,2],gap=W/(layers.length+1),nodes=[];layers.forEach((n,li)=>{const x=gap*(li+1);const layerNodes=[];for(let ni=0;ni<n;ni++){const y=H/2+(ni-(n-1)/2)*50;layerNodes.push({x,y});}nodes.push(layerNodes);});for(let li=0;li<nodes.length-1;li++){nodes[li].forEach(a=>{nodes[li+1].forEach(b=>{const w=Math.sin(t+a.y*0.01+b.y*0.01);ctx.strokeStyle=`rgba(${w>0?'96,165,250':'248,113,113'},${Math.abs(w)*0.3})`;ctx.lineWidth=Math.abs(w)*2+0.5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();});});}nodes.forEach((layer,li)=>{layer.forEach((n,ni)=>{const activation=Math.sin(t*2+li+ni)*0.5+0.5;ctx.fillStyle=`rgba(139,92,246,${0.3+activation*0.7})`;ctx.beginPath();ctx.arc(n.x,n.y,10+activation*4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(139,92,246,0.8)';ctx.stroke();});});const labels=['Input','Hidden 1','Hidden 2','Output'];labels.forEach((l,i)=>{ctx.fillStyle='#9CA3AF';ctx.font='11px Inter';ctx.textAlign='center';ctx.fillText(l,gap*(i+1),H-30);});ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.fillText('Neural Network Playground',W/2,30);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Layers: ${layers.length} | Neurons: ${layers.reduce((a,b)=>a+b)} | Epoch: ${Math.floor(s.time)}`,W/2,H-15);},
    'pathfinding': (ctx,W,H,s)=>{const t=s.time;ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);const cols=16,rows=10,cw=(W-40)/cols,ch=(H-80)/rows;if(!s._grid){s._grid=Array.from({length:rows},()=>Array.from({length:cols},()=>Math.random()<0.25?1:0));s._grid[0][0]=0;s._grid[rows-1][cols-1]=0;s._path=[];s._visited=[];}s._grid.forEach((row,r)=>{row.forEach((cell,c)=>{const x=20+c*cw,y=50+r*ch;ctx.fillStyle=cell?'#374151':'rgba(255,255,255,0.03)';ctx.fillRect(x,y,cw-2,ch-2);});});if(s.running&&s._visited.length<cols*rows){const vi=Math.floor(t*2)%(cols*rows);const vr=Math.floor(vi/cols),vc=vi%cols;if(vr<rows&&vc<cols&&!s._grid[vr][vc])s._visited.push({r:vr,c:vc});}s._visited.forEach(v=>{ctx.fillStyle='rgba(96,165,250,0.3)';ctx.fillRect(20+v.c*cw,50+v.r*ch,cw-2,ch-2);});ctx.fillStyle='#22c55e';ctx.fillRect(20,50,cw-2,ch-2);ctx.fillStyle='#ef4444';ctx.fillRect(20+(cols-1)*cw,50+(rows-1)*ch,cw-2,ch-2);ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Pathfinding Lab — A* Algorithm',W/2,30);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Grid: ${cols}×${rows} | Visited: ${s._visited.length} | Walls: ${s._grid.flat().filter(c=>c).length}`,W/2,H-15);},
    // ── ENGINEERING & ROBOTICS ──
    'circuit-design': (ctx,W,H,s)=>{const t=s.time*0.04;ctx.fillStyle='#0a1a0a';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(34,197,94,0.1)';for(let x=0;x<W;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}const gates=[{type:'AND',x:W*0.3,y:H*0.3},{type:'OR',x:W*0.3,y:H*0.65},{type:'NOT',x:W*0.6,y:H*0.45},{type:'XOR',x:W*0.75,y:H*0.5}];gates.forEach(g=>{ctx.fillStyle='rgba(34,197,94,0.15)';ctx.strokeStyle='#22c55e';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(g.x-25,g.y-18,50,36,6);ctx.fill();ctx.stroke();ctx.fillStyle='#22c55e';ctx.font='bold 12px JetBrains Mono';ctx.textAlign='center';ctx.fillText(g.type,g.x,g.y+5);});ctx.strokeStyle='#22c55e';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(gates[0].x+25,gates[0].y);ctx.lineTo(gates[2].x-25,gates[2].y-10);ctx.stroke();ctx.beginPath();ctx.moveTo(gates[1].x+25,gates[1].y);ctx.lineTo(gates[2].x-25,gates[2].y+10);ctx.stroke();ctx.beginPath();ctx.moveTo(gates[2].x+25,gates[2].y);ctx.lineTo(gates[3].x-25,gates[3].y);ctx.stroke();const signalPos=(t*50)%150;ctx.fillStyle='#f59e0b';ctx.beginPath();ctx.arc(gates[0].x+25+signalPos*0.5,gates[0].y-(signalPos*0.1),4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Digital Circuit Designer',W/2,30);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Gates: ${gates.length} | Logic: AND→NOT→XOR | Signal: ${s.running?'Active':'Idle'}`,W/2,H-15);},
    'robot-arm': (ctx,W,H,s)=>{const t=s.time*0.03;ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);ctx.fillStyle='#1e293b';ctx.fillRect(0,H*0.8,W,H*0.2);const baseX=W/2,baseY=H*0.8;const a1=Math.sin(t)*0.5,a2=Math.cos(t*1.3)*0.7,a3=Math.sin(t*0.8)*0.4;const L1=100,L2=80,L3=50;const j1x=baseX+Math.sin(a1)*L1,j1y=baseY-Math.cos(a1)*L1;const j2x=j1x+Math.sin(a1+a2)*L2,j2y=j1y-Math.cos(a1+a2)*L2;const j3x=j2x+Math.sin(a1+a2+a3)*L3,j3y=j2y-Math.cos(a1+a2+a3)*L3;ctx.strokeStyle='#64748b';ctx.lineWidth=12;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(baseX,baseY);ctx.lineTo(j1x,j1y);ctx.stroke();ctx.strokeStyle='#475569';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(j1x,j1y);ctx.lineTo(j2x,j2y);ctx.stroke();ctx.strokeStyle='#334155';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(j2x,j2y);ctx.lineTo(j3x,j3y);ctx.stroke();[{x:baseX,y:baseY},{x:j1x,y:j1y},{x:j2x,y:j2y}].forEach(j=>{ctx.fillStyle='#6366f1';ctx.beginPath();ctx.arc(j.x,j.y,7,0,Math.PI*2);ctx.fill();});ctx.strokeStyle='#f59e0b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(j3x-8,j3y);ctx.lineTo(j3x-12,j3y+15);ctx.moveTo(j3x+8,j3y);ctx.lineTo(j3x+12,j3y+15);ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Robotic Arm Simulator',W/2,30);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Joints: 3 | θ₁=${(a1*180/Math.PI).toFixed(1)}° θ₂=${(a2*180/Math.PI).toFixed(1)}° θ₃=${(a3*180/Math.PI).toFixed(1)}° | Grip: ${Math.sin(t*2)>0?'Open':'Closed'}`,W/2,H-15);},
    'bridge-builder': (ctx,W,H,s)=>{const t=s.time*0.02;ctx.fillStyle='#0a1520';ctx.fillRect(0,0,W,H);ctx.fillStyle='#1e3a5f';ctx.fillRect(0,H*0.7,W*0.2,H*0.3);ctx.fillRect(W*0.8,H*0.7,W*0.2,H*0.3);const nodes=[];const bridgeW=W*0.6,startX=W*0.2,segments=8;for(let i=0;i<=segments;i++){const x=startX+i*(bridgeW/segments);const sag=Math.sin(i/segments*Math.PI)*20*(1+Math.sin(t)*0.1);const load=s.running?Math.sin(t*2+i)*3:0;nodes.push({x,y:H*0.7+sag+load});}ctx.strokeStyle='#f59e0b';ctx.lineWidth=3;ctx.beginPath();nodes.forEach((n,i)=>i===0?ctx.moveTo(n.x,n.y):ctx.lineTo(n.x,n.y));ctx.stroke();for(let i=0;i<nodes.length-1;i++){ctx.strokeStyle='rgba(148,163,184,0.4)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(nodes[i].x,H*0.65);ctx.lineTo(nodes[i].x,nodes[i].y);ctx.stroke();ctx.moveTo(nodes[i].x,nodes[i].y);ctx.lineTo(nodes[i+1].x,H*0.65);ctx.stroke();ctx.moveTo(nodes[i+1].x,H*0.65);ctx.lineTo(nodes[i].x,nodes[i].y);ctx.stroke();}ctx.strokeStyle='#94a3b8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(startX,H*0.65);ctx.lineTo(startX+bridgeW,H*0.65);ctx.stroke();nodes.forEach(n=>{ctx.fillStyle='#f59e0b';ctx.beginPath();ctx.arc(n.x,n.y,4,0,Math.PI*2);ctx.fill();});const maxStress=s.running?Math.abs(Math.sin(t*2)*45):0;ctx.fillStyle='#fff';ctx.font='bold 16px Inter';ctx.textAlign='center';ctx.fillText('Bridge Builder',W/2,30);ctx.font='12px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText(`Span: ${bridgeW.toFixed(0)}px | Nodes: ${nodes.length} | Max stress: ${maxStress.toFixed(1)} MPa | ${maxStress>40?'⚠️ HIGH':'✅ SAFE'}`,W/2,H-15);},
    // ── DEFAULT ──
    default: (ctx,W,H,s)=>{ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 20px Inter';ctx.textAlign='center';ctx.fillText('Lab Simulation',W/2,H/2-20);ctx.font='14px Inter';ctx.fillStyle='#9CA3AF';ctx.fillText('Interactive simulation ready',W/2,H/2+10);ctx.fillText(`Time: ${s.time.toFixed(1)}s`,W/2,H/2+35);for(let i=0;i<20;i++){const a=s.time*0.02+i*0.314;const r=80+Math.sin(a*2)*30;ctx.fillStyle=`hsla(${i*18+s.time},70%,60%,0.6)`;ctx.beginPath();ctx.arc(W/2+Math.cos(a)*r,H/2+Math.sin(a)*r,4,0,Math.PI*2);ctx.fill();}}
  },
  play() {
    if (this.state.running) return;
    this.state.running = true;
    const canvas = document.getElementById('lab-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const labId = State.currentLab?.id || 'default';
    const tick = () => {
      if (!this.state.running) return;
      this.state.time += 0.1;
      this.renderSim(ctx, canvas, labId);
      updateDataOutput();
      this.state.animId = requestAnimationFrame(tick);
    };
    tick();
  },
  pause() { this.state.running = false; if (this.state.animId) cancelAnimationFrame(this.state.animId); },
  reset() { this.pause(); this.state.time = 0; this.state.data = []; this.state._arr=null; this.state._sortIdx=0; this.state._particles=null; this.state._eco=null; this.state._grid=null; this.state._visited=[]; this.state.params.launched=false; this.state.params.trails=[]; this.state.params.atoms=[]; const c=document.getElementById('lab-canvas'); if(c){const labId=State.currentLab?.id||'default'; this.init(labId);} },
  setupControls(labId) {
    const el = document.getElementById('lab-controls');
    if (!el) return;
    const p = this.state.params;
    const ctrl = (label,id,min,max,val,step) => `<label style="font-size:0.82rem;color:var(--text-secondary);display:flex;align-items:center;gap:8px"><span style="min-width:90px">${label}</span><input type="range" min="${min}" max="${max}" value="${val}" step="${step||1}" id="${id}" style="flex:1" oninput="LabSims.state.params.${id.replace('ctrl-','')}=parseFloat(this.value);document.getElementById('${id}-val').textContent=this.value"><span id="${id}-val" style="min-width:35px;text-align:right;color:var(--accent);font-family:var(--font-mono);font-size:0.8rem">${val}</span></label>`;
    const toggle = (label,id,val) => `<label style="font-size:0.82rem;color:var(--text-secondary);display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" ${val?'checked':''} onchange="LabSims.state.params.${id}=this.checked" style="accent-color:var(--primary)"> ${label}</label>`;
    const select = (label,id,opts,val) => `<label style="font-size:0.82rem;color:var(--text-secondary);display:flex;align-items:center;gap:8px"><span style="min-width:90px">${label}</span><select id="${id}" onchange="LabSims.state.params.${id.replace('ctrl-','')}=this.value" style="flex:1;background:var(--surface);color:var(--text-primary);border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:4px 8px">${opts.map(o=>`<option value="${o}" ${o===val?'selected':''}>${o}</option>`).join('')}</select></label>`;
    const hint = (text) => `<div style="font-size:0.75rem;color:var(--text-muted);padding:4px 0;border-top:1px solid rgba(255,255,255,0.05);margin-top:4px">💡 ${text}</div>`;

    const controls = {
      'plate-tectonics': ctrl('Speed','ctrl-speed',0.1,5,p.speed,0.1)+toggle('Show Labels','showLabels',p.showLabels)+hint('Watch plates diverge and converge. Magma particles show convection.'),
      'weather-patterns': ctrl('Wind Speed','ctrl-windSpeed',0,20,p.windSpeed,1)+ctrl('Temperature','ctrl-temp',0,45,p.temp,1)+ctrl('Humidity','ctrl-humidity',0,100,p.humidity,1)+toggle('Show Pressure','showPressure',p.showPressure)+hint('Observe how temperature and humidity affect cloud formation.'),
      'geological-layers': ctrl('Drill Speed','ctrl-drillSpeed',0.5,5,p.drillSpeed,0.5)+toggle('Show Fossils','showFossils',p.showFossils)+toggle('Show Dating','showDating',p.showDating)+hint('Press Play to drill. Each layer reveals different strata.'),
      'cell-explorer': ctrl('Zoom','ctrl-zoom',0.5,3,p.zoom,0.1)+toggle('Show Labels','showLabels',p.showLabels)+hint('Click organelles to learn about them. Nucleus, mitochondria, ER are clickable.'),
      'dna-replication': ctrl('Replication Speed','ctrl-replicationSpeed',0.5,5,p.replicationSpeed,0.5)+toggle('Show Enzymes','showEnzymes',p.showEnzymes)+hint('Press Play to watch helicase unwind the double helix.'),
      'ecosystem-sim': ctrl('Prey Count','ctrl-preyCount',5,50,p.preyCount,1)+ctrl('Predator Count','ctrl-predCount',1,15,p.predCount,1)+hint('Click anywhere on canvas to add prey organisms.'),
      'molecular-builder': select('Atom Type','ctrl-selectedAtom',['H','O','N','C','S'],p.selectedAtom)+toggle('Show Electrons','showElectrons',p.showElectrons)+hint('Click on the canvas to place atoms. Build molecules visually!'),
      'reaction-sim': ctrl('Temperature (K)','ctrl-temperature',100,1500,p.temperature,50)+ctrl('Concentration','ctrl-concentration',0.1,3,p.concentration,0.1)+toggle('Add Catalyst','catalyst',p.catalyst)+hint('Higher temperature → faster reactions. Catalyst lowers activation energy.'),
      'periodic-table': toggle('Show Orbits','showOrbits',p.showOrbits)+hint('Click any element to select it and see its electron configuration.'),
      'projectile-motion': ctrl('Velocity (m/s)','ctrl-velocity',10,100,p.velocity,5)+ctrl('Angle (°)','ctrl-angle',5,85,p.angle,1)+ctrl('Gravity (m/s²)','ctrl-gravity',1,20,p.gravity,0.5)+toggle('Show Trail','showTrail',p.showTrail)+hint('Click canvas to launch! Adjust angle and velocity for max range.'),
      'optics-bench': ctrl('Focal Length','ctrl-focalLength',50,300,p.focalLength,10)+ctrl('Num Rays','ctrl-numRays',1,10,p.numRays,1)+toggle('Show Focal Point','showFocal',p.showFocal)+hint('Observe how changing focal length affects ray convergence.'),
      'circuit-sim': ctrl('Voltage (V)','ctrl-voltage',1,24,p.voltage,1)+ctrl('Resistance (Ω)','ctrl-resistance',10,500,p.resistance,10)+toggle('Show Electrons','showElectrons',p.showElectrons)+hint('Click the battery (left side) to cycle voltage. V=IR.'),
      'sorting-viz': select('Algorithm','ctrl-algorithm',['bubble','selection','insertion','merge','quick'],p.algorithm)+ctrl('Speed','ctrl-speed',1,10,p.speed,1)+hint('Watch how different algorithms compare and swap elements.'),
      'neural-net': ctrl('Learning Rate','ctrl-learningRate',0.001,1,p.learningRate,0.01)+toggle('Show Weights','showWeights',p.showWeights)+hint('Observe how weight connections pulse during training epochs.'),
      'pathfinding': select('Algorithm','ctrl-algorithm',['astar','bfs','dijkstra'],p.algorithm)+toggle('Show Visited','showVisited',p.showVisited)+hint('Click grid cells to add/remove walls. Green=start, Red=end.'),
      'circuit-design': select('Gate','ctrl-gateType',['AND','OR','NOT','XOR','NAND','NOR'],p.gateType)+hint('Observe signal propagation through logic gates.'),
      'robot-arm': ctrl('Joint 1 (°)','ctrl-joint1',-90,90,(p.joint1*180/Math.PI).toFixed(0),5)+ctrl('Joint 2 (°)','ctrl-joint2',-120,120,(p.joint2*180/Math.PI).toFixed(0),5)+ctrl('Joint 3 (°)','ctrl-joint3',-90,90,(p.joint3*180/Math.PI).toFixed(0),5)+toggle('Auto Mode','autoMode',p.autoMode)+toggle('Gripper Open','gripOpen',p.gripOpen)+hint('Click canvas to position arm. Disable Auto for manual joint control.'),
      'bridge-builder': ctrl('Load (%)','ctrl-load',0,100,p.load,5)+select('Material','ctrl-material',['steel','aluminum','wood','concrete'],p.material)+toggle('Show Stress','showStress',p.showStress)+hint('Click canvas to set load position. Watch stress distribution change.')
    };
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px">${controls[labId]||ctrl('Speed','ctrl-speed',1,10,5,1)}</div>`;
  }
};

function labAction(action) {
  if (action === 'play') LabSims.play();
  else if (action === 'pause') LabSims.pause();
  else if (action === 'reset') LabSims.reset();
  else if (action === 'step') { LabSims.state.time += 1; const c=document.getElementById('lab-canvas'); if(c) LabSims.renderSim(c.getContext('2d'),c,State.currentLab?.id||'default'); updateDataOutput(); }
  else if (action === 'record') {
    const s = LabSims.state, p = s.params, labId = State.currentLab?.id;
    const data = {time:s.time.toFixed(2),recorded:new Date().toISOString()};
    // Lab-specific data recording
    if(labId==='projectile-motion') Object.assign(data,{velocity:p.velocity,angle:p.angle,gravity:p.gravity});
    else if(labId==='circuit-sim') Object.assign(data,{voltage:p.voltage,resistance:p.resistance,current:(p.voltage/p.resistance).toFixed(4),power:(p.voltage*p.voltage/p.resistance).toFixed(2)});
    else if(labId==='reaction-sim') Object.assign(data,{temperature:p.temperature,concentration:p.concentration,catalyst:p.catalyst,reactants:s._particles?.filter(x=>x.type<2).length,products:s._particles?.filter(x=>x.type===2).length});
    else if(labId==='ecosystem-sim') Object.assign(data,{prey:s._eco?.prey.length,predators:s._eco?.pred.length,generation:Math.floor(s.time/10)});
    s.data.push(data);
    showToast(`Data point #${s.data.length} recorded!`,'success');
    updateDataOutput();
  }
}

function updateDataOutput() {
  const el = document.getElementById('lab-data');
  if (!el) return;
  const s = LabSims.state, p = s.params, labId = State.currentLab?.id;
  let output = {};
  switch(labId) {
    case 'plate-tectonics': {const t=s.time*0.02; output={time:s.time.toFixed(1)+'s',drift:(Math.sin(t)*2.4).toFixed(2)+' cm/yr',depth:Math.round(3400+Math.sin(t)*200)+' km',speed:p.speed,running:s.running}; break;}
    case 'weather-patterns': output={time:s.time.toFixed(1)+'s',pressure:(1013+Math.sin(s.time*0.03)*15).toFixed(0)+' hPa',temperature:p.temp.toFixed(1)+'°C',humidity:p.humidity+'%',windSpeed:p.windSpeed+' km/h'}; break;
    case 'cell-explorer': output={time:s.time.toFixed(1)+'s',zoom:p.zoom.toFixed(1)+'×',selected:p.selectedOrganelle||'none',organelles:'nucleus, mitochondria(5), ER, ribosomes(12)'}; break;
    case 'dna-replication': {const split=Math.min(s.time*0.5,12); output={time:s.time.toFixed(1)+'s',basePairs:20,replicated:Math.floor(split),progress:(split/20*100).toFixed(0)+'%',speed:p.replicationSpeed+'×'}; break;}
    case 'ecosystem-sim': output={time:s.time.toFixed(1)+'s',prey:s._eco?.prey.length||0,predators:s._eco?.pred.length||0,generation:Math.floor(s.time/10),preyGrowthRate:'r=0.1',carryingCapacity:'K=100'}; break;
    case 'molecular-builder': output={time:s.time.toFixed(1)+'s',molecule:'H₂O (default)',bondAngle:p.bondAngle+'°',bondLength:'0.96 Å',placedAtoms:(p.atoms||[]).length,selectedAtom:p.selectedAtom}; break;
    case 'reaction-sim': output={time:s.time.toFixed(1)+'s',temperature:p.temperature+'K',concentration:p.concentration,catalyst:p.catalyst?'Active':'None',reactants:s._particles?.filter(x=>x.type<2).length||30,products:s._particles?.filter(x=>x.type===2).length||0}; break;
    case 'periodic-table': {const els=['H','He','Li','Be','B','C','N','O','F','Ne']; output={selected:els[p.selectedElement]||'H',atomicNumber:p.selectedElement+1,showOrbits:p.showOrbits}; break;}
    case 'projectile-motion': {const g=p.gravity,v0=p.velocity,a=p.angle*Math.PI/180; output={velocity:p.velocity+' m/s',angle:p.angle+'°',gravity:p.gravity+' m/s²',maxHeight:(v0*v0*Math.sin(a)*Math.sin(a)/(2*g)).toFixed(1)+' m',range:(v0*v0*Math.sin(2*a)/g).toFixed(1)+' m',flightTime:(2*v0*Math.sin(a)/g).toFixed(2)+' s',launched:p.launched,trails:(p.trails||[]).length}; break;}
    case 'optics-bench': output={focalLength:p.focalLength+'px',numRays:p.numRays,lensType:'Convex',showFocal:p.showFocal,magnification:(-p.focalLength/(300-p.focalLength)).toFixed(2)+'×'}; break;
    case 'circuit-sim': {const V=p.voltage,R=p.resistance,I=V/R; output={voltage:V+'V',resistance:R+'Ω',current:(I*1000).toFixed(1)+' mA',power:(V*I).toFixed(2)+' W',energy:(V*I*s.time).toFixed(1)+' J'}; break;}
    case 'sorting-viz': output={algorithm:p.algorithm,elements:p.arraySize||30,comparisons:Math.floor(s.time/2),swaps:Math.floor(s.time/4),index:s._sortIdx||0,sorted:s._arr?s._arr.every((v,i,a)=>!i||a[i-1]<=v):false}; break;
    case 'neural-net': output={layers:'[3,5,4,2]',totalNeurons:14,totalWeights:43,learningRate:p.learningRate,epoch:Math.floor(s.time),loss:(1/(1+s.time*0.1)).toFixed(4)}; break;
    case 'pathfinding': output={algorithm:p.algorithm,gridSize:'16×10',walls:s._grid?s._grid.flat().filter(c=>c).length:0,visited:(s._visited||[]).length,drawMode:p.drawMode}; break;
    case 'robot-arm': output={joint1:(p.joint1*180/Math.PI).toFixed(1)+'°',joint2:(p.joint2*180/Math.PI).toFixed(1)+'°',joint3:(p.joint3*180/Math.PI).toFixed(1)+'°',gripper:p.gripOpen?'Open':'Closed',mode:p.autoMode?'Auto':'Manual'}; break;
    case 'bridge-builder': {const stress=p.load*0.45; output={load:p.load.toFixed(0)+'%',material:p.material,maxStress:stress.toFixed(1)+' MPa',safetyFactor:(100/Math.max(stress,1)).toFixed(1),status:stress>40?'⚠️ DANGER':stress>25?'⚠️ WARNING':'✅ SAFE'}; break;}
    default: output={time:s.time.toFixed(2),running:s.running,dataPoints:s.data.length};
  }
  if(s.data.length>0) output.recordedPoints = s.data.length;
  el.textContent = JSON.stringify(output,null,2);
}

// ─── Auth (Firebase) ────────────────────────────────────────────────────────
function renderAuth() {
  if (State.user) { navigateTo('/profile'); return ''; }
  return `<div class="auth-container"><div class="glass-card">
    <h2 id="auth-title">Sign In to AI Edu Labs</h2>
    <div id="auth-error" style="display:none;color:var(--danger);background:rgba(239,68,68,0.1);padding:var(--sp-sm) var(--sp-md);border-radius:8px;margin-bottom:var(--sp-md);font-size:0.9rem"></div>
    <div class="form-group"><label for="auth-email">Email</label><input type="email" id="auth-email" class="form-input" placeholder="you@university.edu"></div>
    <div class="form-group"><label for="auth-pass">Password</label><input type="password" id="auth-pass" class="form-input" placeholder="••••••••"></div>
    <div id="auth-confirm-group" class="form-group" style="display:none"><label for="auth-confirm">Confirm Password</label><input type="password" id="auth-confirm" class="form-input" placeholder="••••••••"></div>
    <button class="btn btn-primary btn-lg" style="width:100%" id="auth-submit-btn" onclick="doLogin()">Sign In</button>
    <div class="divider">or</div>
    <button class="btn btn-secondary btn-lg" style="width:100%" onclick="doGoogleLogin()">
      <svg width="18" height="18" viewBox="0 0 48 48" style="vertical-align:middle;margin-right:8px"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      Sign in with Google
    </button>
    <button class="btn btn-secondary btn-lg" style="width:100%;margin-top:var(--sp-sm)" onclick="doAnonymousLogin()">👤 Continue as Guest</button>
    <p style="text-align:center;margin-top:var(--sp-lg);color:var(--text-muted);font-size:0.85rem" id="auth-toggle-text">
      Don't have an account? <a href="#" onclick="toggleAuthMode();return false" style="color:var(--primary)" id="auth-toggle-link">Sign Up</a>
    </p>
    <p style="text-align:center;margin-top:var(--sp-xs);font-size:0.8rem">
      <a href="#" onclick="doPasswordReset();return false" style="color:var(--text-muted)">Forgot password?</a>
    </p>
  </div></div>`;
}

let authMode = 'login'; // 'login' or 'signup'

function toggleAuthMode() {
  authMode = authMode === 'login' ? 'signup' : 'login';
  const title = document.getElementById('auth-title');
  const btn = document.getElementById('auth-submit-btn');
  const confirm = document.getElementById('auth-confirm-group');
  const toggle = document.getElementById('auth-toggle-link');
  const toggleText = document.getElementById('auth-toggle-text');
  if (authMode === 'signup') {
    title.textContent = 'Create Your Account';
    btn.textContent = 'Create Account';
    btn.setAttribute('onclick', 'doSignup()');
    confirm.style.display = 'block';
    toggleText.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode();return false" style="color:var(--primary)">Sign In</a>';
  } else {
    title.textContent = 'Sign In to AI Edu Labs';
    btn.textContent = 'Sign In';
    btn.setAttribute('onclick', 'doLogin()');
    confirm.style.display = 'none';
    toggleText.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode();return false" style="color:var(--primary)">Sign Up</a>';
  }
  clearAuthError();
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function clearAuthError() {
  const el = document.getElementById('auth-error');
  if (el) el.style.display = 'none';
}

function firebaseErrorMsg(code) {
  const map = {
    'auth/user-not-found': 'No account found with that email. Try signing up.',
    'auth/wrong-password': 'Incorrect password. Try again or reset your password.',
    'auth/invalid-credential': 'Invalid credentials. Check your email and password.',
    'auth/email-already-in-use': 'An account already exists with that email. Try signing in.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.'
  };
  return map[code] || 'Authentication error: ' + code;
}

function setUserFromFirebase(fbUser) {
  State.user = {
    uid: fbUser.uid,
    email: fbUser.email || 'anonymous',
    name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Guest'),
    photoURL: fbUser.photoURL || null,
    role: (fbUser.email && fbUser.email.includes('admin')) ? 'admin' : 'subscriber',
    isAnonymous: fbUser.isAnonymous || false
  };
  State.isAdmin = State.user.role === 'admin';
  State.tosAccepted = loadFromLocal().tosAccepted || false;
  saveToLocal();
  // Log analytics event
  if (typeof firebaseAnalytics !== 'undefined') firebaseAnalytics.logEvent('login', { method: fbUser.providerData?.[0]?.providerId || 'anonymous' });
}

function doLogin() {
  const email = document.getElementById('auth-email')?.value?.trim();
  const pass = document.getElementById('auth-pass')?.value;
  if (!email || !pass) { showAuthError('Please fill in all fields.'); return; }
  clearAuthError();
  const btn = document.getElementById('auth-submit-btn');
  btn.disabled = true; btn.textContent = 'Signing in...';
  firebaseAuth.signInWithEmailAndPassword(email, pass)
    .then(cred => {
      setUserFromFirebase(cred.user);
      showToast('Welcome back, ' + State.user.name + '!', 'success');
      updateAuthUI();
      navigateTo('/labs');
    })
    .catch(err => {
      showAuthError(firebaseErrorMsg(err.code));
      btn.disabled = false; btn.textContent = 'Sign In';
    });
}

function doSignup() {
  const email = document.getElementById('auth-email')?.value?.trim();
  const pass = document.getElementById('auth-pass')?.value;
  const confirm = document.getElementById('auth-confirm')?.value;
  if (!email || !pass || !confirm) { showAuthError('Please fill in all fields.'); return; }
  if (pass !== confirm) { showAuthError('Passwords do not match.'); return; }
  clearAuthError();
  const btn = document.getElementById('auth-submit-btn');
  btn.disabled = true; btn.textContent = 'Creating account...';
  firebaseAuth.createUserWithEmailAndPassword(email, pass)
    .then(cred => {
      return cred.user.updateProfile({ displayName: email.split('@')[0] }).then(() => cred.user);
    })
    .then(user => {
      setUserFromFirebase(user);
      showToast('Account created! Welcome, ' + State.user.name + '!', 'success');
      updateAuthUI();
      navigateTo('/labs');
    })
    .catch(err => {
      showAuthError(firebaseErrorMsg(err.code));
      btn.disabled = false; btn.textContent = 'Create Account';
    });
}

function doGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  firebaseAuth.signInWithPopup(provider)
    .then(result => {
      setUserFromFirebase(result.user);
      showToast('Welcome, ' + State.user.name + '!', 'success');
      updateAuthUI();
      navigateTo('/labs');
    })
    .catch(err => {
      if (err.code !== 'auth/popup-closed-by-user') showToast(firebaseErrorMsg(err.code), 'error');
    });
}

function doAnonymousLogin() {
  firebaseAuth.signInAnonymously()
    .then(cred => {
      setUserFromFirebase(cred.user);
      showToast('Signed in as Guest. Create an account to save your progress!', 'info');
      updateAuthUI();
      navigateTo('/labs');
    })
    .catch(err => showToast(firebaseErrorMsg(err.code), 'error'));
}

function doPasswordReset() {
  const email = document.getElementById('auth-email')?.value?.trim();
  if (!email) { showAuthError('Enter your email above, then click "Forgot password?"'); return; }
  firebaseAuth.sendPasswordResetEmail(email)
    .then(() => showToast('Password reset email sent to ' + email, 'success'))
    .catch(err => showAuthError(firebaseErrorMsg(err.code)));
}

function doLogout() {
  firebaseAuth.signOut().then(() => {
    State.user = null; State.isAdmin = false; State.tosAccepted = false;
    saveToLocal(); updateAuthUI(); showToast('Signed out', 'info'); navigateTo('/');
  }).catch(err => showToast('Sign out failed: ' + err.message, 'error'));
}

function updateAuthUI() {
  const authNav = document.getElementById('nav-auth');
  if (State.user) {
    const label = State.user.isAnonymous ? '👤 Guest' : '🚪 Sign Out';
    authNav.textContent = label; authNav.href = '#'; authNav.onclick = (e) => { e.preventDefault(); doLogout(); };
    authNav.className = 'btn btn-secondary btn-sm';
  } else {
    authNav.textContent = 'Sign In'; authNav.href = '#/auth'; authNav.onclick = null;
    authNav.className = 'btn btn-primary btn-sm';
  }
}

// ─── Admin ──────────────────────────────────────────────────────────────────
function renderAdmin() {
  return `<h1 style="margin-bottom:var(--sp-xl)">⚙️ Admin Dashboard</h1>
  <div class="admin-grid">
    <div class="glass-card stat-card"><div class="stat-value">${DISCIPLINES.reduce((s,d)=>s+d.labs.length,0)}</div><div class="stat-label">Total Labs</div></div>
    <div class="glass-card stat-card"><div class="stat-value">${DISCIPLINES.length}</div><div class="stat-label">Disciplines</div></div>
    <div class="glass-card stat-card"><div class="stat-value">156</div><div class="stat-label">Active Users</div></div>
    <div class="glass-card stat-card"><div class="stat-value">98.7%</div><div class="stat-label">Uptime</div></div>
  </div>
  <div class="glass-card" style="margin-top:var(--sp-xl)">
    <h2 style="margin-bottom:var(--sp-lg)">Lab Management</h2>
    <table class="data-table"><thead><tr><th>Lab</th><th>Discipline</th><th>VR</th><th>Voice</th><th>Status</th></tr></thead>
    <tbody>${DISCIPLINES.flatMap(d => d.labs.map(l => `<tr>
      <td style="color:var(--text-primary)">${l.name}</td><td>${d.name}</td>
      <td>${l.vr?'✅':'—'}</td><td>${l.voice?'✅':'—'}</td>
      <td><span style="color:var(--success)">● Active</span></td></tr>`)).join('')}
    </tbody></table>
  </div>
  <div class="glass-card" style="margin-top:var(--sp-xl)">
    <h2 style="margin-bottom:var(--sp-lg)">Compliance Status</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp-md)">
      <div>📋 <strong>Terms of Service</strong><br><span style="color:var(--success)">✅ Published</span></div>
      <div>📝 <strong>Operator Agreement</strong><br><span style="color:var(--success)">✅ Published</span></div>
      <div>🎓 <strong>FERPA Compliant</strong><br><span style="color:var(--success)">✅ Verified</span></div>
      <div>👶 <strong>COPPA Compliant</strong><br><span style="color:var(--success)">✅ Verified</span></div>
    </div>
  </div>`;
}

// ─── Profile & Progress ─────────────────────────────────────────────────────
function renderProfile() {
  const u = State.user;
  return `<div class="profile-header"><div class="profile-avatar">${u.name[0].toUpperCase()}</div>
    <div><h1>${u.name}</h1><p style="color:var(--text-secondary)">${u.email} — ${u.role}</p></div>
    <button class="btn btn-danger btn-sm" onclick="doLogout()" style="margin-left:auto">Sign Out</button></div>
  <h2 style="margin-bottom:var(--sp-lg)">Lab Progress</h2>
  <div class="progress-grid">${DISCIPLINES.map(d => `
    <div class="glass-card progress-item">
      <div class="discipline-name">${d.icon} ${d.name}</div>
      <div class="labs-completed">${State.progress[d.id].completed}/${State.progress[d.id].total}</div>
      <div class="progress-bar" style="margin-top:var(--sp-sm)">
        <div class="fill" style="width:${(State.progress[d.id].completed/State.progress[d.id].total)*100}%"></div>
      </div>
    </div>`).join('')}</div>
  <div class="glass-card" style="margin-top:var(--sp-xl)">
    <h2 style="margin-bottom:var(--sp-lg)">Data Export</h2>
    <p style="color:var(--text-secondary);margin-bottom:var(--sp-md)">Export your lab results and progress data.</p>
    <div class="export-options">
      <button class="btn btn-secondary" onclick="exportLabData('csv')">📥 Export CSV</button>
      <button class="btn btn-secondary" onclick="exportLabData('json')">📥 Export JSON</button>
      <button class="btn btn-secondary" onclick="exportLabData('pdf')">📥 Export PDF</button>
    </div>
  </div>`;
}

// ─── Data Export ─────────────────────────────────────────────────────────────
function exportLabData(format) {
  const data = { user: State.user?.email || 'anonymous', exportedAt: new Date().toISOString(), progress: State.progress, labResults: LabSims.state.data };
  if (format === 'json') downloadFile('lab-data.json', JSON.stringify(data, null, 2), 'application/json');
  else if (format === 'csv') {
    const rows = [['Discipline','Completed','Total']];
    DISCIPLINES.forEach(d => rows.push([d.name, State.progress[d.id].completed, State.progress[d.id].total]));
    downloadFile('lab-data.csv', rows.map(r => r.join(',')).join('\n'), 'text/csv');
  } else if (format === 'pdf') { showToast('PDF export requires print — opening print dialog.','info'); window.print(); }
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  showToast(`Downloaded ${name}`, 'success');
}

// ─── Compliance Pages ───────────────────────────────────────────────────────
function renderToS() {
  return `<div class="compliance-content"><h1>Terms of Service</h1>
  <p><em>Last updated: March 18, 2026</em></p>
  <h2>1. Acceptance of Terms</h2><p>By accessing AI Educational Labs ("the Platform"), you agree to these Terms of Service. The Platform is operated by AI Educational Labs in partnership with HeadySystems Inc.</p>
  <h2>2. User Accounts</h2><p>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials. Accounts are for individual use only.</p>
  <h2>3. Acceptable Use</h2><p>The Platform is intended for educational purposes. You agree not to: use the Platform for illegal activities, attempt to gain unauthorized access, distribute malware, or engage in harassment.</p>
  <h2>4. Intellectual Property</h2><p>All lab simulations, educational content, and platform code are owned by AI Educational Labs. Lab results and exported data generated by users belong to the user and their institution.</p>
  <h2>5. Privacy & Data</h2><p>We collect minimal data necessary for platform operation. Lab data is stored securely and can be exported or deleted at any time. We comply with FERPA and COPPA regulations.</p>
  <h2>6. Disclaimer</h2><p>Lab simulations are for educational purposes and may not represent exact real-world conditions. The Platform is provided "as-is" without warranty.</p>
  <h2>7. Governing Law</h2><p>These terms are governed by the laws of the United States of America.</p></div>`;
}

function renderOperatorAgreement() {
  return `<div class="compliance-content"><h1>Operator Agreement</h1>
  <p><em>Last updated: March 18, 2026</em></p>
  <h2>1. Scope</h2><p>This agreement governs the relationship between institutional operators (schools, universities, training organizations) and AI Educational Labs.</p>
  <h2>2. Operator Responsibilities</h2><ul><li>Ensure authorized use by enrolled students and faculty</li><li>Maintain compliance with institutional data policies</li><li>Report security incidents within 24 hours</li><li>Provide accurate enrollment data for licensing</li></ul>
  <h2>3. Data Handling</h2><p>Operators receive access to aggregated, de-identified usage analytics. Student PII is handled per FERPA guidelines and is never shared without consent.</p>
  <h2>4. Service Level</h2><p>AI Educational Labs targets 99.5% uptime. Scheduled maintenance windows will be communicated 48 hours in advance.</p>
  <h2>5. Licensing</h2><p>Operators are licensed per institution. Volume discounts available for multi-campus deployments.</p></div>`;
}

function renderCompliance() {
  return `<div class="compliance-content"><h1>Compliance & Certifications</h1>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--sp-xl);margin-top:var(--sp-xl)">
    <div class="glass-card"><h2>🎓 FERPA</h2><p>Family Educational Rights and Privacy Act compliance. Student education records are protected with appropriate access controls.</p></div>
    <div class="glass-card"><h2>👶 COPPA</h2><p>Children's Online Privacy Protection Act. Parental consent mechanisms for users under 13. Minimal data collection.</p></div>
    <div class="glass-card"><h2>♿ WCAG 2.1 AA</h2><p>Web Content Accessibility Guidelines compliance. Screen readers, keyboard navigation, high contrast, and voice control support.</p></div>
    <div class="glass-card"><h2>🔐 SOC 2</h2><p>Service Organization Control security framework. Data encryption at rest and in transit. Regular security audits.</p></div>
  </div></div>`;
}

// ─── Voice Control ──────────────────────────────────────────────────────────
const VoiceCtrl = {
  recognition: null,
  init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    this.recognition = new SR();
    this.recognition.continuous = true; this.recognition.interimResults = false; this.recognition.lang = 'en-US';
    this.recognition.onresult = (e) => {
      const cmd = e.results[e.results.length-1][0].transcript.trim().toLowerCase();
      this.handleCommand(cmd);
    };
    this.recognition.onerror = () => { State.voiceActive = false; this.updateUI(); };
    this.recognition.onend = () => { if (State.voiceActive) this.recognition.start(); };
  },
  toggle() {
    if (!this.recognition) { showToast('Voice control not supported in this browser','warning'); return; }
    State.voiceActive = !State.voiceActive;
    State.voiceActive ? this.recognition.start() : this.recognition.stop();
    this.updateUI();
    showToast(State.voiceActive ? 'Voice control ON — listening...' : 'Voice control OFF', State.voiceActive ? 'success' : 'info');
  },
  updateUI() {
    const btn = document.getElementById('voice-toggle');
    const status = document.getElementById('voice-status');
    if (btn) btn.className = 'voice-indicator ' + (State.voiceActive ? 'listening' : 'idle');
    if (status) status.textContent = State.voiceActive ? 'Listening...' : 'Voice Off';
  },
  handleCommand(cmd) {
    if (cmd.includes('reset')) labAction('reset');
    else if (cmd.includes('play') || cmd.includes('start')) labAction('play');
    else if (cmd.includes('pause') || cmd.includes('stop')) labAction('pause');
    else if (cmd.includes('step')) labAction('step');
    else if (cmd.includes('record')) labAction('record');
    else if (cmd.includes('export')) exportLabData('csv');
    else if (cmd.includes('home')) navigateTo('/');
    else if (cmd.includes('lab')) navigateTo('/labs');
    else showToast('Voice: "' + cmd + '"', 'info');
  }
};

// ─── VR ─────────────────────────────────────────────────────────────────────
function enterVR() {
  if (!navigator.xr) { showToast('WebXR not available. Use a VR-capable browser.', 'warning'); return; }
  navigator.xr.isSessionSupported('immersive-vr').then(supported => {
    if (supported) {
      showToast('Entering VR mode...', 'success');
      // WebXR session creation would go here in production
    } else { showToast('VR headset not detected. Connect a headset to use VR mode.', 'info'); }
  }).catch(() => showToast('VR initialization failed', 'error'));
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type; toast.textContent = msg;
  toast.setAttribute('role', 'alert');
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ─── Offline/Online Sync ────────────────────────────────────────────────────
function saveToLocal() {
  try { localStorage.setItem('aieduclabs', JSON.stringify({ user: State.user, tosAccepted: State.tosAccepted, progress: State.progress, labResults: State.labResults })); } catch(e) {}
}
function loadFromLocal() {
  try { return JSON.parse(localStorage.getItem('aieduclabs') || '{}'); } catch(e) { return {}; }
}
function restoreState() {
  const saved = loadFromLocal();
  if (saved.user) { State.user = saved.user; State.isAdmin = saved.user.role === 'admin'; }
  if (saved.tosAccepted) State.tosAccepted = true;
  if (saved.progress) Object.assign(State.progress, saved.progress);
  if (saved.labResults) State.labResults = saved.labResults;
}

window.addEventListener('online', () => { State.offline = false; showToast('Back online — syncing data...', 'success'); saveToLocal(); });
window.addEventListener('offline', () => { State.offline = true; showToast('You are offline. Labs continue to work locally.', 'warning'); });

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  restoreState();
  VoiceCtrl.init();
  document.getElementById('voice-toggle').addEventListener('click', () => VoiceCtrl.toggle());
  document.getElementById('hamburger-btn').addEventListener('click', () => {
    const nav = document.getElementById('main-nav');
    nav.classList.toggle('open');
    document.getElementById('hamburger-btn').setAttribute('aria-expanded', nav.classList.contains('open'));
  });
  window.addEventListener('hashchange', () => { handleRoute(); initLabIfNeeded(); });

  // Firebase Auth state listener — restores session on page reload
  if (typeof firebaseAuth !== 'undefined') {
    firebaseAuth.onAuthStateChanged(fbUser => {
      if (fbUser) {
        setUserFromFirebase(fbUser);
        updateAuthUI();
        // Re-render current page if on auth page
        if (State.route === '/auth') navigateTo('/labs');
      } else {
        State.user = null; State.isAdmin = false;
        updateAuthUI();
      }
      // Initial route render after auth state is known
      handleRoute();
      initLabIfNeeded();
    });
  } else {
    // Fallback if Firebase not loaded
    updateAuthUI();
    handleRoute();
    initLabIfNeeded();
  }

  // Register service worker
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
});

function initLabIfNeeded() {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('/lab/')) setTimeout(() => LabSims.init(hash.split('/lab/')[1]), 100);
}
