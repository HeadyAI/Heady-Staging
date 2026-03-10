/**
 * Heady Role-Based Access Control — Sacred Genesis v4.0.0
 * CSL-gated permission evaluation with phi-derived role hierarchies
 *
 * @module rbac
 * @author Eric Haywood, HeadySystems Inc.
 */

'use strict';

const { PHI, PSI, fib, phiThreshold } = require('../../shared/phi-math');

/**
 * Role hierarchy with phi-derived permission weights
 * Higher weight = more permissions
 * @readonly
 * @type {Object<string, {weight: number, inherits: string[], permissions: string[]}>}
 */
const ROLES = {
  viewer: {
    weight: PSI * PSI * PSI * PSI,
    inherits: [],
    permissions: [
      'read:services',
      'read:health',
      'read:metrics'
    ]
  },
  developer: {
    weight: PSI * PSI * PSI,
    inherits: ['viewer'],
    permissions: [
      'read:vectors',
      'write:vectors',
      'read:embeddings',
      'write:embeddings',
      'read:flags',
      'execute:intelligence',
      'read:schemas'
    ]
  },
  operator: {
    weight: PSI * PSI,
    inherits: ['developer'],
    permissions: [
      'write:flags',
      'write:schemas',
      'read:sessions',
      'read:audit',
      'execute:deploy',
      'read:secrets',
      'manage:services'
    ]
  },
  admin: {
    weight: PSI,
    inherits: ['operator'],
    permissions: [
      'write:sessions',
      'write:audit',
      'write:secrets',
      'manage:users',
      'manage:roles',
      'manage:config',
      'execute:chaos'
    ]
  },
  superadmin: {
    weight: 1.0,
    inherits: ['admin'],
    permissions: [
      'manage:platform',
      'manage:billing',
      'manage:governance',
      'execute:shutdown',
      'manage:superadmin'
    ]
  }
};

/**
 * Resolved permission cache
 * @type {Map<string, Set<string>>}
 */
const resolvedPermissions = new Map();

/**
 * Resolve all permissions for a role (including inherited)
 * @param {string} roleName - Role name
 * @returns {Set<string>} All permissions
 */
function resolvePermissions(roleName) {
  if (resolvedPermissions.has(roleName)) {
    return resolvedPermissions.get(roleName);
  }

  const role = ROLES[roleName];
  if (!role) return new Set();

  const perms = new Set(role.permissions);

  for (const inherited of role.inherits) {
    const inheritedPerms = resolvePermissions(inherited);
    for (const p of inheritedPerms) perms.add(p);
  }

  resolvedPermissions.set(roleName, perms);
  return perms;
}

/**
 * Check if a role has a specific permission
 * @param {string} roleName - Role name
 * @param {string} permission - Permission string (e.g., 'write:vectors')
 * @returns {boolean}
 */
function hasPermission(roleName, permission) {
  const perms = resolvePermissions(roleName);
  return perms.has(permission);
}

/**
 * Check if a role has all specified permissions
 * @param {string} roleName - Role name
 * @param {string[]} permissions - Required permissions
 * @returns {{allowed: boolean, missing: string[]}}
 */
function checkPermissions(roleName, permissions) {
  const perms = resolvePermissions(roleName);
  const missing = permissions.filter(p => !perms.has(p));
  return {
    allowed: missing.length === 0,
    missing
  };
}

/**
 * Get all permissions for a role
 * @param {string} roleName - Role name
 * @returns {string[]}
 */
function getPermissions(roleName) {
  return Array.from(resolvePermissions(roleName)).sort();
}

/**
 * List all roles with their weights
 * @returns {Array<{name: string, weight: number, permissionCount: number}>}
 */
function listRoles() {
  return Object.entries(ROLES).map(([name, role]) => ({
    name,
    weight: Math.round(role.weight * 1000) / 1000,
    permissionCount: resolvePermissions(name).size,
    inherits: role.inherits
  }));
}

/**
 * Create RBAC middleware for HTTP servers
 * @param {string|string[]} requiredPermissions - Permission(s) to check
 * @returns {function} Middleware function
 */
function requirePermission(requiredPermissions) {
  const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  return function rbacMiddleware(req, res, next) {
    const userRole = req.headers['x-heady-role'] || 'viewer';
    const check = checkPermissions(userRole, perms);

    if (!check.allowed) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Forbidden',
        requiredPermissions: perms,
        missingPermissions: check.missing,
        userRole
      }));
      return;
    }

    if (next) next();
    return true;
  };
}

module.exports = {
  ROLES,
  hasPermission,
  checkPermissions,
  getPermissions,
  listRoles,
  requirePermission,
  resolvePermissions
};
