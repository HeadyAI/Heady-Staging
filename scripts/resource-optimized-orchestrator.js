// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: scripts/resource-optimized-orchestrator.js                                                    ║
// ║  LAYER: automation                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🚀 RESOURCE-OPTIMIZED ORCHESTRATOR v1.0                                  ║
 * ║  📊 Adaptive Resource Management Based on Available System Resources        ║
 * ║  ⚡ Dynamic Load Balancing · Intelligent Task Distribution                 ║
 * ║  🎯 CPU Core Optimization · Memory Pressure Management                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

class ResourceOptimizedOrchestrator {
    constructor() {
        this.systemResources = this.analyzeSystemResources();
        this.optimizationProfile = this.createOptimizationProfile();
        this.activeServices = new Map();
        this.performanceMetrics = {
            cpuUsage: [],
            memoryUsage: [],
            taskThroughput: [],
            responseTime: []
        };
        this.isRunning = false;
        this.updateInterval = 1000; // 1 second base interval
    }

    analyzeSystemResources() {
        const cpus = os.cpus();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const loadAvg = os.loadavg();
        
        return {
            cpuCores: cpus.length,
            logicalProcessors: cpus.length,
            totalMemoryGB: totalMemory / (1024 ** 3),
            freeMemoryGB: freeMemory / (1024 ** 3),
            memoryPressure: 1 - (freeMemory / totalMemory),
            loadAverage: loadAvg[0],
            cpuArchitecture: cpus[0].model,
            platform: os.platform(),
            canHandleHighLoad: cpus.length >= 8 && (totalMemory / (1024 ** 3)) >= 16
        };
    }

    createOptimizationProfile() {
        const resources = this.systemResources;
        
        // Base optimization profile on available resources
        if (resources.canHandleHighLoad) {
            return {
                maxConcurrentTasks: Math.min(resources.cpuCores * 2, 32),
                memoryThreshold: 0.85, // 85% memory usage threshold
                cpuThreshold: 0.80,    // 80% CPU usage threshold
                updateInterval: 500,    // 500ms for high-performance systems
                servicePriority: {
                    critical: ['heady-manager', 'health-monitor'],
                    high: ['api-gateway', 'cache-service'],
                    medium: ['log-aggregator', 'metrics-collector'],
                    low: ['analytics-service', 'reporting-service']
                },
                resourceAllocation: {
                    userTasks: 70,        // 70% for user tasks
                    systemOverhead: 20,   // 20% system overhead
                    buffer: 10           // 10% buffer
                }
            };
        } else {
            return {
                maxConcurrentTasks: Math.min(resources.cpuCores, 4),
                memoryThreshold: 0.75,   // 75% memory usage threshold
                cpuThreshold: 0.70,      // 70% CPU usage threshold
                updateInterval: 2000,    // 2s for standard systems
                servicePriority: {
                    critical: ['heady-manager'],
                    high: ['health-monitor'],
                    medium: [],
                    low: []
                },
                resourceAllocation: {
                    userTasks: 85,        // 85% for user tasks
                    systemOverhead: 10,   // 10% system overhead
                    buffer: 5            // 5% buffer
                }
            };
        }
    }

    calculateOptimalConcurrency() {
        const currentLoad = os.loadavg()[0];
        const cpuCount = this.systemResources.cpuCores;
        const memoryPressure = this.systemResources.memoryPressure;
        
        // Dynamic concurrency based on system load
        let optimalConcurrency = this.optimizationProfile.maxConcurrentTasks;
        
        // Reduce concurrency if CPU is overloaded
        if (currentLoad > cpuCount * 0.8) {
            optimalConcurrency = Math.max(1, Math.floor(optimalConcurrency * 0.5));
        }
        
        // Reduce concurrency if memory is under pressure
        if (memoryPressure > this.optimizationProfile.memoryThreshold) {
            optimalConcurrency = Math.max(1, Math.floor(optimalConcurrency * 0.7));
        }
        
        return optimalConcurrency;
    }

    startService(serviceName, serviceConfig) {
        return new Promise((resolve, reject) => {
            if (this.activeServices.has(serviceName)) {
                resolve({ success: false, message: `Service ${serviceName} already running` });
                return;
            }

            const resourceLimits = this.calculateResourceLimits(serviceConfig.priority);
            const service = spawn(serviceConfig.command, serviceConfig.args || [], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    NODE_OPTIONS: `--max-old-space-size=${resourceLimits.memoryLimitMB}`,
                    UV_THREADPOOL_SIZE: resourceLimits.threadPoolSize
                }
            });

            const serviceInfo = {
                process: service,
                config: serviceConfig,
                startTime: Date.now(),
                resourceLimits,
                status: 'starting',
                metrics: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    restartCount: 0
                }
            };

            this.activeServices.set(serviceName, serviceInfo);

            service.stdout.on('data', (data) => {
                console.log(`[${serviceName}] ${data.toString().trim()}`);
            });

            service.stderr.on('data', (data) => {
                console.error(`[${serviceName} ERROR] ${data.toString().trim()}`);
            });

            service.on('close', (code) => {
                if (code !== 0) {
                    console.error(`Service ${serviceName} exited with code ${code}`);
                    serviceInfo.status = 'failed';
                    serviceInfo.metrics.restartCount++;
                    
                    // Auto-restart critical services
                    if (serviceConfig.priority === 'critical' && serviceInfo.metrics.restartCount < 3) {
                        setTimeout(() => this.startService(serviceName, serviceConfig), 5000);
                    }
                } else {
                    serviceInfo.status = 'stopped';
                }
            });

            // Wait a moment to check if service started successfully
            setTimeout(() => {
                if (service.pid && !service.killed) {
                    serviceInfo.status = 'running';
                    resolve({ success: true, pid: service.pid });
                } else {
                    this.activeServices.delete(serviceName);
                    resolve({ success: false, message: `Failed to start ${serviceName}` });
                }
            }, 2000);
        });
    }

    calculateResourceLimits(priority) {
        const totalMemoryMB = Math.floor(this.systemResources.totalMemoryGB * 1024);
        const cpuCores = this.systemResources.cpuCores;
        
        const limits = {
            critical: { memoryPercent: 0.15, threads: Math.max(2, Math.floor(cpuCores * 0.2)) },
            high: { memoryPercent: 0.10, threads: Math.max(1, Math.floor(cpuCores * 0.15)) },
            medium: { memoryPercent: 0.05, threads: 1 },
            low: { memoryPercent: 0.03, threads: 1 }
        };

        const limit = limits[priority] || limits.low;
        
        return {
            memoryLimitMB: Math.floor(totalMemoryMB * limit.memoryPercent),
            threadPoolSize: limit.threads,
            cpuAffinity: this.calculateCpuAffinity(priority)
        };
    }

    calculateCpuAffinity(priority) {
        const cpuCores = this.systemResources.cpuCores;
        
        if (priority === 'critical') {
            // Critical services get dedicated cores
            return Array.from({ length: Math.min(2, cpuCores) }, (_, i) => i);
        } else if (priority === 'high') {
            // High priority services get shared cores
            const startCore = 2;
            const count = Math.min(2, cpuCores - startCore);
            return Array.from({ length: count }, (_, i) => startCore + i);
        }
        
        // Medium/low services use remaining cores
        return null; // No specific affinity
    }

    async start() {
        console.log('🚀 Starting Resource-Optimized Orchestrator');
        console.log(`📊 System Resources: ${this.systemResources.cpuCores} cores, ${this.systemResources.totalMemoryGB.toFixed(1)}GB RAM`);
        console.log(`⚡ Optimization Profile: ${this.systemResources.canHandleHighLoad ? 'High-Performance' : 'Standard'}`);
        
        this.isRunning = true;
        
        // Start critical services first
        const criticalServices = [
            {
                name: 'heady-manager',
                command: 'node',
                args: ['heady-manager.js'],
                priority: 'critical'
            },
            {
                name: 'health-monitor',
                command: 'node',
                args: ['-e', 'setInterval(() => console.log("Health check:", new Date().toISOString()), 10000)'],
                priority: 'critical'
            }
        ];

        for (const service of criticalServices) {
            try {
                const result = await this.startService(service.name, service);
                if (result.success) {
                    console.log(`✅ Started ${service.name} (PID: ${result.pid})`);
                } else {
                    console.error(`❌ Failed to start ${service.name}: ${result.message}`);
                }
            } catch (error) {
                console.error(`❌ Error starting ${service.name}:`, error.message);
            }
        }

        // Start monitoring loop
        this.startMonitoring();
    }

    startMonitoring() {
        const monitorInterval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(monitorInterval);
                return;
            }

            this.updateMetrics();
            this.optimizeResources();
            this.displayStatus();
        }, this.optimizationProfile.updateInterval);
    }

    updateMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        this.performanceMetrics.memoryUsage.push({
            timestamp: Date.now(),
            used: memUsage.heapUsed / 1024 / 1024, // MB
            total: memUsage.heapTotal / 1024 / 1024
        });
        
        this.performanceMetrics.cpuUsage.push({
            timestamp: Date.now(),
            user: cpuUsage.user / 1e6, // Convert to seconds
            system: cpuUsage.system / 1e6
        });

        // Keep only last 60 data points (1 minute of history)
        const maxHistory = 60;
        if (this.performanceMetrics.memoryUsage.length > maxHistory) {
            this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage.slice(-maxHistory);
        }
        if (this.performanceMetrics.cpuUsage.length > maxHistory) {
            this.performanceMetrics.cpuUsage = this.performanceMetrics.cpuUsage.slice(-maxHistory);
        }
    }

    optimizeResources() {
        const currentMemoryPressure = this.systemResources.memoryPressure;
        const currentLoad = os.loadavg()[0];
        const cpuCount = this.systemResources.cpuCores;

        // Adaptive update interval based on system load
        if (currentLoad > cpuCount * 0.9 || currentMemoryPressure > 0.9) {
            this.optimizationProfile.updateInterval = Math.min(5000, this.optimizationProfile.updateInterval * 1.5);
        } else if (currentLoad < cpuCount * 0.5 && currentMemoryPressure < 0.7) {
            this.optimizationProfile.updateInterval = Math.max(500, this.optimizationProfile.updateInterval * 0.9);
        }

        // Suggest service adjustments
        if (currentMemoryPressure > this.optimizationProfile.memoryThreshold) {
            console.log('⚠️  High memory pressure detected - consider stopping low-priority services');
            this.stopLowPriorityServices();
        }

        if (currentLoad > cpuCount * this.optimizationProfile.cpuThreshold) {
            console.log('⚠️  High CPU load detected - reducing concurrency');
            this.reduceConcurrency();
        }
    }

    stopLowPriorityServices() {
        for (const [serviceName, serviceInfo] of this.activeServices) {
            if (serviceInfo.config.priority === 'low' || serviceInfo.config.priority === 'medium') {
                console.log(`🔄 Stopping low-priority service: ${serviceName}`);
                serviceInfo.process.kill('SIGTERM');
                this.activeServices.delete(serviceName);
            }
        }
    }

    reduceConcurrency() {
        // This would adjust the concurrency settings of running services
        console.log(`📉 Reducing concurrency due to high load`);
    }

    displayStatus() {
        const activeCount = this.activeServices.size;
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        const loadAvg = os.loadavg()[0].toFixed(2);
        const updateInterval = this.optimizationProfile.updateInterval;

        console.clear();
        console.log('🚀 Resource-Optimized Orchestrator Status');
        console.log('━'.repeat(50));
        console.log(`📊 Active Services: ${activeCount}`);
        console.log(`💾 Memory Usage: ${memoryUsage}MB`);
        console.log(`⚡ CPU Load: ${loadAvg} (${this.systemResources.cpuCores} cores)`);
        console.log(`🔄 Update Interval: ${updateInterval}ms`);
        console.log(`🎯 Concurrency: ${this.calculateOptimalConcurrency()}`);
        
        console.log('\n📋 Services:');
        for (const [name, info] of this.activeServices) {
            const status = info.status === 'running' ? '🟢' : '🔴';
            const priority = info.config.priority.toUpperCase();
            console.log(`  ${status} ${name} (${priority}) - PID: ${info.process.pid || 'N/A'}`);
        }
    }

    stop() {
        console.log('🛑 Stopping Resource-Optimized Orchestrator');
        this.isRunning = false;
        
        for (const [serviceName, serviceInfo] of this.activeServices) {
            console.log(`🔄 Stopping service: ${serviceName}`);
            serviceInfo.process.kill('SIGTERM');
        }
        
        this.activeServices.clear();
        console.log('✅ Orchestrator stopped');
    }
}

// CLI Interface
if (require.main === module) {
    const orchestrator = new ResourceOptimizedOrchestrator();
    
    process.on('SIGINT', () => {
        orchestrator.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        orchestrator.stop();
        process.exit(0);
    });
    
    orchestrator.start().catch(console.error);
}

module.exports = ResourceOptimizedOrchestrator;
