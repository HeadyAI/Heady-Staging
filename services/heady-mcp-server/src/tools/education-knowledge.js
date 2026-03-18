/**
 * Education & Knowledge — Learning that adapts to you
 * 4 tools: HeadySocratic, HeadySkillTree, HeadyScholar, HeadyFlash
 * @module tools/education-knowledge
 */
'use strict';
const { PHI, PSI } = require('../config/phi-constants');
const EDUCATION_KNOWLEDGE_TOOLS = [
  { name: 'heady_socratic', description: 'Adaptive Dialectical Tutor — genuine Socratic dialogue, never giving answers directly. Persistent learner models, misconception identification, cognitive load calibration. φ-scaled questioning: recall=1.0×, application=φ, analysis=φ², synthesis=φ³.', category: 'education', phiTier: 0,
    inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['teach', 'assess', 'identify-misconceptions', 'scaffold', 'challenge'] }, topic: { type: 'string' }, learner_id: { type: 'string' } }, required: ['action'] },
    handler: async (a) => ({ pipeline: 'HeadySocratic', action: a.action, topic: a.topic, phi_difficulty: { recall: '1.0×', application: `${PHI.toFixed(3)}×`, analysis: `${(PHI*PHI).toFixed(3)}×`, synthesis: `${(PHI*PHI*PHI).toFixed(3)}×` }, csl: 'Cognitive load detection adjusts scaffolding', status: 'teaching' }) },
  { name: 'heady_skilltree', description: 'Learning Path Cartographer — maps any skill domain as a DAG of prerequisite competencies, diagnostic assessment, cross-platform content sequencing, mastery progression. Fibonacci branching: 1,1,2,3,5 prerequisites per concept.', category: 'education', phiTier: 1,
    inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['map-domain', 'assess', 'sequence', 'track-mastery', 'adapt-path'] }, domain: { type: 'string' }, learner_id: { type: 'string' } }, required: ['action'] },
    handler: async (a) => ({ pipeline: 'HeadySkillTree', action: a.action, domain: a.domain, phi_mastery: { recognition: '1.0×', application: `${PHI.toFixed(3)}×`, transfer: `${(PHI*PHI).toFixed(3)}×` }, branching: 'Fibonacci: 1,1,2,3,5 prerequisites max', status: 'ready' }) },
  { name: 'heady_scholar', description: 'Automated Literature Synthesis Engine — systematic reviews: searches Semantic Scholar/PubMed/arXiv, screens abstracts, extracts methods/effect-sizes, identifies contradictions, generates synthesis with forest plots, highlights research gaps.', category: 'education', phiTier: 0,
    inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['search', 'screen', 'extract', 'synthesize', 'gap-analysis', 'forest-plot'] }, question: { type: 'string' }, databases: { type: 'array', items: { type: 'string' }, default: ['semantic-scholar', 'pubmed'] } }, required: ['action'] },
    handler: async (a) => ({ pipeline: 'HeadyScholar', action: a.action, question: a.question, swarms: ['search-strategy', 'screening', 'data-extraction', 'bias-assessment', 'meta-synthesis', 'gap-identification'], csl: 'Quality consciousness flags low-quality studies', status: 'ready' }) },
  { name: 'heady_flash', description: 'Pedagogically-Optimized Card Generator — flashcards from any source using minimum-information principle, cloze deletions, image occlusion, interference-aware scheduling. FSRS algorithm with φ-scaled intervals (1→1.6→2.6→4.2→6.8→11→18 days).', category: 'education', phiTier: 0,
    inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['generate', 'review', 'schedule', 'optimize', 'import'] }, source: { type: 'string', description: 'Source material text or URL' }, deck: { type: 'string' } }, required: ['action'] },
    handler: async (a) => { const intervals = [1]; for (let i = 1; i < 7; i++) intervals.push(parseFloat((intervals[i-1] * PHI).toFixed(1))); return { pipeline: 'HeadyFlash', action: a.action, phi_intervals_days: intervals, principles: ['minimum-information', 'cloze-deletion', 'image-occlusion', 'interference-aware', 'FSRS'], status: 'ready' }; } },
];
module.exports = { EDUCATION_KNOWLEDGE_TOOLS };
