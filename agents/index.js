'use strict';
/**
 * Agents Module — Barrel Export
 * Provides bee-factory, federation-manager, and hive-coordinator.
 */
module.exports = {
    BeeFactory: require('./bee-factory'),
    FederationManager: require('./federation-manager'),
    HiveCoordinator: require('./hive-coordinator'),
};
