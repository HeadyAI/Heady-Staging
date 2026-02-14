<!-- HEADY_BRAND:BEGIN
<!-- ╔══════════════════════════════════════════════════════════════════╗
<!-- ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
<!-- ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
<!-- ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
<!-- ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
<!-- ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
<!-- ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
<!-- ║                                                                  ║
<!-- ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
<!-- ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
<!-- ║  FILE: scripts/README-Enhanced-Scripts.md                                                    ║
<!-- ║  LAYER: automation                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# Enhanced Heady Scripts Framework

## Overview

The Enhanced Heady Scripts Framework provides a robust, scalable, and highly functional automation ecosystem for Heady systems. This framework introduces advanced capabilities including comprehensive error handling, performance monitoring, parallel execution, and intelligent recovery mechanisms.

## Architecture

### Core Modules

#### 1. HeadyScriptCore.psm1
The foundational module providing essential infrastructure:

- **Advanced Logging System**: Structured JSON logging with multiple levels and file rotation
- **Error Handling**: Retry mechanisms with exponential backoff and recovery actions
- **Configuration Management**: Centralized config with validation and caching
- **Performance Monitoring**: Real-time metrics collection and analysis
- **Parallel Execution**: Thread-safe parallel processing with resource management
- **System Health Checks**: Comprehensive monitoring of memory, disk, network, and services
- **Cache Management**: Intelligent caching with TTL and automatic cleanup

#### 2. HeadyDeployment.psm1
Advanced deployment orchestration framework:

- **Safety Checks**: Pre-flight validation including system health, user sessions, and resource availability
- **Deployment Registry**: Complete audit trail with version tracking and rollback capabilities
- **Parallel Deployments**: Multi-target deployment with configurable concurrency
- **Auto-Rollback**: Intelligent failure detection and automatic recovery
- **Health Monitoring**: Post-deployment monitoring with configurable thresholds
- **Performance Tracking**: Deployment metrics and optimization insights

#### 3. HeadyService.psm1
Comprehensive service management system:

- **Service Registry**: Dynamic service discovery and registration
- **Health Monitoring**: Multi-protocol health checks (HTTP, HTTPS, TCP, ping)
- **Auto-Recovery**: Intelligent service restart and recovery procedures
- **Performance Metrics**: Resource usage monitoring and alerting
- **Service Discovery**: Automatic endpoint detection and load balancing
- **Container Support**: Docker container health monitoring and management

## Enhanced Scripts

### Enhanced Auto-Deploy Orchestrator

**File**: `enhanced-auto-deploy-orchestrator.ps1`

A next-generation deployment orchestrator with enterprise-grade features:

#### Key Features
- **Intelligent Safety Validation**: Comprehensive pre-deployment checks
- **Parallel Execution**: Multi-target deployment with resource optimization
- **Real-time Monitoring**: Live deployment tracking and health checks
- **Auto-Recovery**: Self-healing deployment processes
- **Performance Optimization**: Resource-aware execution planning
- **Detailed Reporting**: Comprehensive deployment analytics

#### Usage Examples

```powershell
# Standard deployment with safety checks
.\enhanced-auto-deploy-orchestrator.ps1 -Targets Windows,Android

# Priority deployment (skip safety checks)
.\enhanced-auto-deploy-orchestrator.ps1 -Priority -Targets Windows,Websites

# Dry run to preview changes
.\enhanced-auto-deploy-orchestrator.ps1 -DryRun -Targets Websites

# Custom configuration and monitoring
.\enhanced-auto-deploy-orchestrator.ps1 -ConfigFile custom-config.json -Monitoring -LogLevel Debug
```

#### Parameters
- `-Priority`: Skip safety checks for urgent deployments
- `-Targets`: Specific deployment targets (Windows, Android, Linux, Websites)
- `-Version`: Custom deployment version
- `-DryRun`: Preview deployment without executing
- `-Force`: Override safety warnings
- `-ConfigFile`: Custom configuration path
- `-LogLevel`: Set logging verbosity (Debug, Verbose, Info, Warning, Error, Critical)
- `-Monitoring`: Enable post-deployment monitoring
- `-AutoRecovery`: Enable automatic recovery mechanisms

### Enhanced Localhost to Domain Migration

**File**: `enhanced-localhost-to-domain.js`

A sophisticated migration tool with enterprise capabilities:

#### Key Features
- **Parallel Processing**: Multi-threaded file processing for large codebases
- **Advanced Pattern Matching**: Intelligent regex with context awareness
- **Comprehensive Validation**: Pre and post-migration validation
- **Backup & Rollback**: Automatic backup creation with rollback capability
- **Performance Monitoring**: Real-time processing metrics
- **Service Discovery Integration**: Dynamic service endpoint mapping

#### Usage Examples

```bash
# Inventory scan (dry run)
node enhanced-localhost-to-domain.js inventory ./distribution

# Full migration with parallel processing
node enhanced-localhost-to-domain.js migrate ./src --parallel

# Strict validation mode
node enhanced-localhost-to-domain.js validate ./docs --strict

# Generate hosts file
node enhanced-localhost-to-domain.js hosts > hosts.txt

# Debug mode with detailed logging
LOG_LEVEL=debug node enhanced-localhost-to-domain.js migrate ./src
```

#### Commands
- `inventory [dir]`: Scan for localhost references
- `migrate [dir]`: Replace localhost with domain names
- `validate [dir]`: Validate potential changes
- `rollback`: Rollback from backups
- `hosts`: Generate hosts file content

#### Options
- `--dry-run, -d`: Show changes without applying
- `--parallel, -p`: Use parallel processing
- `--strict, -s`: Enable strict validation mode
- `--no-backup`: Skip backup creation

## Configuration

### Environment Setup

The enhanced framework automatically creates the necessary directory structure:

```
~/.heady/
├── logs/           # Structured log files
├── config/         # Configuration files
├── cache/          # Performance cache
├── deployments/    # Deployment history
├── services/       # Service registry
└── backups/        # Migration backups
```

### Configuration Files

#### Auto-Deploy Configuration
```json
{
  "DeploymentTargets": ["Windows", "Android", "Linux", "Websites"],
  "CriticalTargets": ["Windows", "Websites"],
  "SafetyChecks": {
    "SystemHealth": true,
    "UserSessions": true,
    "DiskSpace": true,
    "NetworkConnectivity": true,
    "PortAvailability": true
  },
  "ParallelDeployment": true,
  "MaxConcurrency": 3,
  "AutoRollback": true,
  "MonitoringDuration": "00:30:00",
  "RecoveryAttempts": 3
}
```

#### Service Discovery Configuration
```yaml
services:
  manager:
    port: 3300
    domain: manager.headysystems.com
    protocol: https
  api:
    port: 3000
    domain: api.headysystems.com
    protocol: https
  redis:
    port: 6379
    domain: redis.headysystems.com
    protocol: tcp
  postgres:
    port: 5432
    domain: db.headysystems.com
    protocol: tcp
```

## Performance Features

### Parallel Execution

The framework supports intelligent parallel processing:

- **Automatic CPU Detection**: Uses available CPU cores optimally
- **Batch Processing**: Large datasets processed in configurable batches
- **Resource Management**: Memory and CPU usage monitoring
- **Load Balancing**: Even distribution of work across workers

### Caching System

Intelligent caching improves performance:

- **Service Discovery Cache**: Reduces YAML parsing overhead
- **Pattern Matching Cache**: Optimizes regex compilation
- **Configuration Cache**: Minimizes file I/O operations
- **Metrics Cache**: Aggregates performance data efficiently

### Monitoring & Metrics

Real-time performance monitoring:

- **Execution Time Tracking**: Detailed timing analysis
- **Resource Usage**: Memory, CPU, and disk monitoring
- **Error Rates**: Comprehensive error tracking and analysis
- **Success Rates**: Deployment and operation success metrics

## Safety & Reliability

### Error Handling

Advanced error recovery mechanisms:

- **Retry Logic**: Exponential backoff with configurable limits
- **Recovery Actions**: Custom recovery procedures for different error types
- **Circuit Breaker**: Prevents cascade failures
- **Graceful Degradation**: Fallback mechanisms for non-critical failures

### Validation System

Comprehensive validation at multiple levels:

- **Pre-Deployment Checks**: System readiness validation
- **Configuration Validation**: Parameter and setting verification
- **Post-Deployment Validation**: Health and functionality checks
- **Rollback Validation**: Ensure rollback operations succeed

### Backup & Recovery

Complete backup and recovery capabilities:

- **Automatic Backups**: Pre-change backup creation
- **Versioned Backups**: Timestamped backup files
- **Rollback Support**: One-click rollback to previous state
- **Recovery Testing**: Automated backup verification

## Integration Examples

### CI/CD Pipeline Integration

```yaml
# GitHub Actions example
- name: Enhanced Deployment
  run: |
    ./scripts/enhanced-auto-deploy-orchestrator.ps1 `
      -Targets Windows,Websites `
      -Version "${{ github.sha }}" `
      -LogLevel Verbose `
      -Monitoring
  env:
    HEADY_ENV: production
```

### Monitoring Integration

```powershell
# Start continuous monitoring
Start-HeadyServiceMonitoring -Duration (New-TimeSpan -Hours 24) -AutoRecovery

# Check deployment health
$health = Test-HeadyDeploymentHealth -Deployment $deployment
if ($health.Status -eq 'Critical') {
    Start-HeadyRollback -DeploymentId $deployment.id
}
```

### Service Management

```powershell
# Register new service
Register-HeadyService -Name "web-api" -Type "web" -Endpoints @{
    "http" = @{ protocol = "http"; url = "http://localhost:8080" }
    "health" = @{ protocol = "http"; url = "http://localhost:8080/health" }
}

# Monitor service health
Start-HeadyServiceMonitoring -Duration (New-TimeSpan -Minutes 30) -AutoRecovery
```

## Troubleshooting

### Common Issues

1. **Module Import Errors**
   ```powershell
   # Ensure modules are in correct path
   Get-Module -ListAvailable | Where-Object { $_.Name -like "*Heady*" }
   ```

2. **Permission Issues**
   ```powershell
   # Run as administrator for system-level operations
   # Or configure appropriate permissions for ~/.heady directory
   ```

3. **Docker Issues**
   ```powershell
   # Check Docker availability
   docker info
   # Start Docker service if needed
   Start-Service docker
   ```

### Debug Mode

Enable detailed logging for troubleshooting:

```powershell
# PowerShell scripts
$env:HEADY_LOG_LEVEL = "Debug"
.\enhanced-auto-deploy-orchestrator.ps1 -LogLevel Debug

# Node.js scripts
$env:LOG_LEVEL = "debug"
node enhanced-localhost-to-domain.js migrate ./src
```

### Log Analysis

Logs are stored in structured JSON format:

```powershell
# Analyze deployment logs
Get-Content ~/.heady/logs/heady-*.json | ConvertFrom-Json | Where-Object { 
    $_.Category -eq "Deployment" -and $_.Level -eq "Error" 
}

# Performance metrics
Get-Content ~/.heady/cache/heady-metrics.json | ConvertFrom-Json
```

## Best Practices

### Performance Optimization

1. **Use Parallel Processing**: Enable parallel mode for large deployments
2. **Configure Appropriate Concurrency**: Set MaxConcurrency based on system resources
3. **Monitor Resource Usage**: Track memory and CPU during operations
4. **Optimize Batch Sizes**: Adjust batch sizes for optimal throughput

### Safety Guidelines

1. **Always Run Dry-Run First**: Preview changes before execution
2. **Enable Backups**: Never disable backup creation for critical systems
3. **Use Validation**: Enable strict validation for production deployments
4. **Monitor Health**: Enable post-deployment monitoring for critical services

### Maintenance

1. **Regular Log Rotation**: Clean up old log files periodically
2. **Backup Management**: Remove old backups to save disk space
3. **Cache Cleanup**: Clear cache when configurations change
4. **Service Registry Updates**: Keep service definitions current

## Future Enhancements

Planned improvements for the enhanced framework:

- **Web Dashboard**: Browser-based monitoring and management interface
- **API Integration**: RESTful API for external system integration
- **Advanced Analytics**: Machine learning for performance optimization
- **Multi-Cloud Support**: Deployment across multiple cloud providers
- **GitOps Integration**: Git-based deployment and configuration management
- **Advanced Security**: Enhanced authentication and authorization

## Support

For issues and questions:

1. Check logs in `~/.heady/logs/`
2. Review configuration files in `~/.heady/config/`
3. Validate system requirements and permissions
4. Consult the troubleshooting section above

The enhanced framework is designed to be self-documenting and provides extensive logging and monitoring capabilities for debugging and optimization.
