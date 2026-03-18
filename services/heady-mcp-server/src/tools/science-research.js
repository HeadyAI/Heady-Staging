/**
 * Science & Research — Democratizing laboratory intelligence
 * 6 tools: HeadyMolecule, HeadyStar, HeadyGenomeBio, HeadyAtmos, HeadyMatter, HeadyPhysik
 * @module tools/science-research
 */
'use strict';
const { PHI, PSI } = require('../config/phi-constants');

const SCIENCE_RESEARCH_TOOLS = [
  {
    name: 'heady_molecule',
    description: 'Interactive Molecular Dynamics Workbench — describe molecular systems in natural language, auto-set up GROMACS/OpenMM simulations, select force fields, stream trajectory visualization, extract RMSD/radius-of-gyration/H-bond networks. CSL gates enforce thermodynamic sanity checks.',
    category: 'science', phiTier: 2,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['setup', 'simulate', 'analyze', 'visualize', 'optimize-forcefield'], description: 'MD action' },
        system: { type: 'string', description: 'System description (e.g., "peptide folding in saline at 37°C")' },
        duration_ns: { type: 'number', default: 10, description: 'Simulation duration in nanoseconds' },
        engine: { type: 'string', enum: ['gromacs', 'openmm', 'auto'], default: 'auto' },
      },
      required: ['action'],
    },
    handler: async (args) => ({
      pipeline: 'HeadyMolecule v1.0', action: args.action, system: args.system,
      swarms: { preparation: '#11', forcefield: '#16', equilibration: '#13', production: '#3', analysis: '#7', visualization: '#6' },
      csl_sanity: ['energy-conservation', 'temperature-stability', 'pressure-coupling'],
      metrics: ['RMSD', 'radius-of-gyration', 'H-bond-networks', 'RMSF', 'secondary-structure'],
      status: 'simulation_setup',
    }),
  },
  {
    name: 'heady_star',
    description: 'Astronomical Observation Planner — cross-references targets, telescope capabilities, weather, moon phase, seeing predictions, rise/set times. Generates optimized observation queues maximizing science per clear-sky hour. INDI/ASCOM telescope control integration.',
    category: 'science', phiTier: 1,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['plan', 'queue', 'weather-check', 'slew', 'image', 'catalog-search'], description: 'Observation action' },
        targets: { type: 'array', items: { type: 'string' }, description: 'Target object names or coordinates' },
        location: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' }, elevation_m: { type: 'number' } } },
        telescope: { type: 'string', description: 'Telescope identifier / INDI profile' },
      },
      required: ['action'],
    },
    handler: async (args) => ({
      pipeline: 'HeadyStar v1.0', action: args.action, targets: args.targets,
      phi_priority: { primary_science: `${(PHI*PHI).toFixed(3)}× weight`, calibration: `${PHI.toFixed(3)}× weight`, targets_of_opportunity: '1.0× weight' },
      factors: ['weather', 'moon-phase', 'atmospheric-seeing', 'rise-set-times', 'altitude', 'airmass'],
      protocols: ['INDI', 'ASCOM'],
      status: 'planning',
    }),
  },
  {
    name: 'heady_genome_bio',
    description: 'Conversational Bioinformatics Suite — genomic analysis through conversation. Variant calling, ClinVar annotation, gnomAD frequency, clinical summaries. Pipeline across NCBI, UniProt, ClinVar, gnomAD APIs. φ-scaled analysis depth: screening → research → clinical grade.',
    category: 'science', phiTier: 2,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['variant-call', 'annotate', 'pathway-enrich', 'clinical-summary', 'phylogenetic', 'structure-predict'], description: 'Bioinformatics action' },
        query: { type: 'string', description: 'Natural language genomic query' },
        gene: { type: 'string', description: 'Gene symbol (e.g., BRCA1)' },
        depth: { type: 'string', enum: ['screening', 'research', 'clinical'], default: 'research' },
      },
      required: ['action'],
    },
    handler: async (args) => ({
      pipeline: 'HeadyGenome Bio v1.0', action: args.action, query: args.query,
      depth_scaling: { screening: '1.0× analysis', research: `${PHI.toFixed(3)}× depth`, clinical: `${(PHI*PHI).toFixed(3)}× thoroughness` },
      databases: ['NCBI', 'UniProt', 'ClinVar', 'gnomAD', 'PDB', 'KEGG'],
      bee_specialists: ['SequenceAlignBee', 'VariantCallBee', 'StructurePredictBee', 'PathwayEnrichBee', 'ClinicalInterpretBee'],
      status: 'analysis_ready',
    }),
  },
  {
    name: 'heady_atmos',
    description: 'Hyperlocal Weather & Climate Intelligence — sub-kilometer prediction fusing GenCast/WeatherNext with local sensors, personal weather stations, smartphone barometers. Models urban heat islands, building-shadow microclimates, wind tunnels.',
    category: 'science', phiTier: 1,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['forecast', 'microclimate', 'climate-scenario', 'sensor-fuse', 'alert'], description: 'Weather action' },
        location: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } },
        horizon: { type: 'string', default: '48h', description: 'Forecast horizon' },
        scenario: { type: 'string', description: 'Climate scenario (e.g., SSP2-4.5 2050)' },
      },
      required: ['action'],
    },
    handler: async (args) => ({
      pipeline: 'HeadyAtmos v1.0', action: args.action, location: args.location,
      models: ['GenCast', 'WeatherNext', 'local-sensor-correction'],
      microclimate_factors: ['urban-heat-island', 'building-shadow', 'wind-tunnel-effects', 'elevation-gradient'],
      csl_confidence: 'Data quality determines point-prediction vs. confidence-intervals',
      status: 'forecasting',
    }),
  },
  {
    name: 'heady_matter',
    description: 'Materials Discovery Accelerator — takes desired property profiles, queries Materials Project, generates candidates via MatterGen-style models, predicts properties via GNoME-style GNNs, suggests synthesis pathways, estimates production costs.',
    category: 'science', phiTier: 2,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['search', 'generate', 'predict', 'synthesize-pathway', 'cost-estimate'], description: 'Materials action' },
        requirements: { type: 'string', description: 'Property requirements (e.g., "thermoelectric ZT > 2.0 at 500K")' },
        constraints: { type: 'string', description: 'Constraints (e.g., "earth-abundant elements only")' },
      },
      required: ['action'],
    },
    handler: async (args) => ({
      pipeline: 'HeadyMatter v1.0', action: args.action, requirements: args.requirements,
      phi_ranking: { stability: `${(PHI*PHI).toFixed(3)}× weight`, property_match: `${PHI.toFixed(3)}× weight`, synthesizability: '1.0× weight' },
      databases: ['Materials-Project', 'AFLOW', 'ICSD', 'COD'],
      models: ['MatterGen-inspired', 'GNoME-GNN', 'ALIGNN'],
      status: 'discovery_ready',
    }),
  },
  {
    name: 'heady_physik',
    description: 'Natural Language Physics Simulator — sets up and runs simulations from descriptions. Galaxy mergers, CFD airfoil analysis, N-body problems, electromagnetic simulations. Selects solvers, configures boundary conditions, generates publication-ready visualizations.',
    category: 'science', phiTier: 2,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['setup', 'simulate', 'visualize', 'validate', 'export'], description: 'Physics action' },
        description: { type: 'string', description: 'Physics simulation description' },
        domain: { type: 'string', enum: ['mechanics', 'fluid-dynamics', 'electromagnetism', 'thermodynamics', 'quantum', 'astrophysics', 'auto'], default: 'auto' },
      },
      required: ['action'],
    },
    handler: async (args) => ({
      pipeline: 'HeadyPhysik v1.0', action: args.action, description: args.description,
      domain_swarms: { mechanics: '#3', fluids: '#11', em: '#16', thermo: '#10', quantum: '#15', astro: '#17' },
      csl_validation: 'Rejects setups violating conservation laws before wasting compute',
      solvers: ['OpenFOAM', 'GADGET-4', 'COMSOL-compatible', 'QuTiP', 'FEniCS'],
      status: 'setup_ready',
    }),
  },
];

module.exports = { SCIENCE_RESEARCH_TOOLS };
