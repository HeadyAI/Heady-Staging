/**
 * ∞ Heady™ YAML — YAML Loader with Env Var Interpolation
 * © 2026 Heady™Systems Inc. — PROPRIETARY AND CONFIDENTIAL
 *
 * Loads YAML files with ${VAR} / ${VAR:default} environment variable
 * interpolation baked in. Zero runtime dependencies — pure JS YAML parser.
 *
 * Usage:
 *   const yaml = require('./src/core/heady-yaml');
 *   const config = yaml.loadFile('./configs/remote-resources.yaml');
 *   const obj = yaml.load('key: ${MY_VAR:default_value}');
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Env Var Interpolation ─────────────────────────────────────────────────
// Replaces ${VAR} and ${VAR:default} with process.env values
function interpolateEnv(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/\$\{([^}]+)\}/g, (match, expression) => {
        const colonIdx = expression.indexOf(':');
        if (colonIdx === -1) {
            // ${VAR} — no default
            return process.env[expression.trim()] || match;
        }
        // ${VAR:default}
        const varName = expression.slice(0, colonIdx).trim();
        const defaultVal = expression.slice(colonIdx + 1);
        return process.env[varName] || defaultVal;
    });
}

// ─── Minimal YAML Parser ──────────────────────────────────────────────────
// Handles the subset of YAML used by Heady™ configs:
// - Key: value pairs
// - Nested objects via indentation
// - Arrays with - prefix
// - Multi-line strings
// - Quoted strings (single and double)
// - Comments (#)
// - Null/bool/number coercion

function parseValue(raw) {
    const s = raw.trim();
    if (s === '' || s === 'null' || s === '~') return null;
    if (s === 'true' || s === 'yes' || s === 'on') return true;
    if (s === 'false' || s === 'no' || s === 'off') return false;

    // Quoted strings
    if ((s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))) {
        return interpolateEnv(s.slice(1, -1));
    }

    // Numbers
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
    if (/^0x[0-9a-fA-F]+$/.test(s)) return parseInt(s, 16);

    return interpolateEnv(s);
}

function getIndent(line) {
    let i = 0;
    while (i < line.length && line[i] === ' ') i++;
    return i;
}

function parse(content) {
    if (typeof content !== 'string') return null;

    // Interpolate all env vars in one pass
    const interpolated = interpolateEnv(content);

    const lines = interpolated
        .split('\n')
        .map((line, idx) => ({ raw: line, idx }));

    // Remove comments and blank lines, but track line numbers for errors
    const meaningful = lines.filter(({ raw }) => {
        const trimmed = raw.trim();
        return trimmed.length > 0 && !trimmed.startsWith('#');
    });

    if (meaningful.length === 0) return null;

    // Stack-based parser
    function parseBlock(startIdx, baseIndent) {
        const result = {};
        let i = startIdx;

        while (i < meaningful.length) {
            const { raw } = meaningful[i];
            const indent = getIndent(raw);
            if (indent < baseIndent) break;

            const trimmed = raw.trim();

            // Array item
            if (trimmed.startsWith('- ')) {
                // This should have been caught by the array handler above
                break;
            }

            // Key: value pair
            const colonIdx = trimmed.indexOf(':');
            if (colonIdx === -1) {
                i++;
                continue;
            }

            const key = trimmed.slice(0, colonIdx).trim();
            const rest = trimmed.slice(colonIdx + 1);

            // Check next line for sub-object or array
            const nextLine = i + 1 < meaningful.length ? meaningful[i + 1] : null;
            const nextIndent = nextLine ? getIndent(nextLine.raw) : -1;
            const nextTrimmed = nextLine ? nextLine.raw.trim() : '';

            if (rest.trim() === '' && nextLine && nextIndent > indent) {
                // Next lines are nested content
                if (nextTrimmed.startsWith('- ')) {
                    // Array
                    const arr = [];
                    let j = i + 1;
                    const arrIndent = nextIndent;
                    while (j < meaningful.length) {
                        const { raw: aRaw } = meaningful[j];
                        const aIndent = getIndent(aRaw);
                        if (aIndent < arrIndent) break;
                        const aTrimmed = aRaw.trim();
                        if (aTrimmed.startsWith('- ')) {
                            const itemVal = aTrimmed.slice(2).trim();
                            // Check if next line(s) are a sub-object
                            const afterJ = j + 1 < meaningful.length ? meaningful[j + 1] : null;
                            const afterJIndent = afterJ ? getIndent(afterJ.raw) : -1;
                            if (afterJ && afterJIndent > aIndent && !afterJ.raw.trim().startsWith('- ')) {
                                const subObj = parseBlock(j + 1, afterJIndent);
                                if (itemVal) {
                                    // Merge first item value into sub-object
                                    arr.push({ value: parseValue(itemVal), ...subObj.obj });
                                } else {
                                    arr.push(subObj.obj);
                                }
                                j = subObj.nextIdx;
                            } else {
                                arr.push(parseValue(itemVal));
                                j++;
                            }
                        } else {
                            break;
                        }
                    }
                    result[key] = arr;
                    i = j;
                } else {
                    // Sub-object
                    const sub = parseBlock(i + 1, nextIndent);
                    result[key] = sub.obj;
                    i = sub.nextIdx;
                }
            } else {
                // Inline value
                result[key] = parseValue(rest.trim());
                i++;
            }
        }

        return { obj: result, nextIdx: i };
    }

    // Detect top-level structure
    const firstTrimmed = meaningful[0].raw.trim();
    if (firstTrimmed.startsWith('- ')) {
        // Top-level array
        const arr = [];
        let i = 0;
        while (i < meaningful.length) {
            const { raw } = meaningful[i];
            const trimmed = raw.trim();
            if (trimmed.startsWith('- ')) {
                const itemVal = trimmed.slice(2).trim();
                arr.push(parseValue(itemVal));
            }
            i++;
        }
        return arr;
    }

    return parseBlock(0, 0).obj;
}

// ─── Load a YAML string ────────────────────────────────────────────────────
function load(yamlString) {
    try {
        return parse(yamlString);
    } catch (err) {
        throw new Error(`[heady-yaml] Parse error: ${err.message}`);
    }
}

// ─── Load a YAML file ─────────────────────────────────────────────────────
function loadFile(filePath, opts = {}) {
    const resolved = path.resolve(filePath);
    try {
        if (!fs.existsSync(resolved)) {
            if (opts.required !== false) {
                return opts.defaultValue !== undefined ? opts.defaultValue : null;
            }
            throw new Error(`[heady-yaml] File not found: ${resolved}`);
        }
        const content = fs.readFileSync(resolved, 'utf8');
        return load(content);
    } catch (err) {
        if (opts.silent) return opts.defaultValue !== undefined ? opts.defaultValue : null;
        throw err;
    }
}

// ─── Dump an object to YAML string ────────────────────────────────────────
function dump(obj, indent = 0) {
    const pad = '  '.repeat(indent);
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj === 'boolean') return String(obj);
    if (typeof obj === 'number') return String(obj);
    if (typeof obj === 'string') {
        if (obj.includes('\n') || obj.includes(':') || obj.includes('#')) {
            return `"${obj.replace(/"/g, '\\"')}"`;
        }
        return obj;
    }
    if (Array.isArray(obj)) {
        if (obj.length === 0) return '[]';
        return obj.map(item => `${pad}- ${dump(item, indent + 1)}`).join('\n');
    }
    if (typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length === 0) return '{}';
        return keys.map(k => {
            const val = obj[k];
            if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                return `${pad}${k}:\n${dump(val, indent + 1)}`;
            }
            if (Array.isArray(val) && val.length > 0) {
                return `${pad}${k}:\n${dump(val, indent + 1)}`;
            }
            return `${pad}${k}: ${dump(val, indent)}`;
        }).join('\n');
    }
    return String(obj);
}

// ─── Safe load (returns null on error) ───────────────────────────────────
function safeLoad(yamlStringOrPath) {
    try {
        // Check if it looks like a file path
        if (yamlStringOrPath && !yamlStringOrPath.includes('\n') &&
            (yamlStringOrPath.endsWith('.yaml') || yamlStringOrPath.endsWith('.yml'))) {
            return loadFile(yamlStringOrPath, { silent: true });
        }
        return load(yamlStringOrPath);
    } catch {
        return null;
    }
}

module.exports = {
    load,
    loadFile,
    dump,
    safeLoad,
    interpolateEnv,
    // Compat aliases
    parse: load,
    stringify: dump,
};
