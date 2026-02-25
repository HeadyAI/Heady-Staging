/**
 * scripts/validate-registry.js
 * Validates heady-registry.json against the expected schema to prevent corruption.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '../heady-registry.json');

function validate() {
    try {
        const data = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
        const errors = [];

        // Top-level existence checks
        const requiredKeys = ['aiNodes', 'services', 'cloudProviders', 'patternsSummary', 'bestPracticeScores'];
        requiredKeys.forEach(k => {
            if (!data[k]) errors.push(`Missing top-level key: ${k}`);
        });

        // Services validation
        if (data.services) {
            data.services.forEach((s, i) => {
                if (!s.id || !s.name || !s.endpoint) errors.push(`Service #${i} is malformed (missing id, name, or endpoint)`);
            });
        }

        // Nodes validation
        if (data.aiNodes) {
            Object.entries(data.aiNodes).forEach(([id, n]) => {
                if (!n.name || !n.status) errors.push(`Node '${id}' is malformed (missing name or status)`);
            });
        }

        if (errors.length > 0) {
            console.error('❌ Registry Validation Failed:');
            errors.forEach(e => console.error(`  - ${e}`));
            process.exit(1);
        }

        console.log('✅ Registry Schema: VALID');
        process.exit(0);
    } catch (err) {
        console.error(`❌ Registry Validation Error: ${err.message}`);
        process.exit(1);
    }
}

validate();
