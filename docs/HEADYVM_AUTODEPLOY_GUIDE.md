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
<!-- ║  FILE: docs/HEADYVM_AUTODEPLOY_GUIDE.md                                                    ║
<!-- ║  LAYER: docs                                                  ║
<!-- ╚══════════════════════════════════════════════════════════════════╝
<!-- HEADY_BRAND:END
-->
# HeadyVM Auto-Deploy Guide

## Overview

The HeadyVM auto-deploy system automatically detects when the system is ready for migration to HeadyVM and triggers the deployment process. This integrates with the existing auto-deploy pipeline and includes Windsurf migration support.

## Quick Start

### Check System Readiness
```powershell
# Run readiness check
.\scripts\headyvm-readiness-checker.ps1

# Using the PowerShell module
Import-Module .\scripts\modules\HeadyVM.psm1
Test-HeadyVMReadiness
```

### Auto-Deploy Integration
The auto-deploy pipeline automatically checks HeadyVM readiness:
```powershell
# This will automatically trigger HeadyVM migration when ready
.\scripts\run-auto-deploy.ps1
```

### Manual Migration
```powershell
# Start migration (will check readiness first)
.\scripts\headyvm-migrate.ps1

# Force migration (bypass readiness check)
.\scripts\headyvm-migrate.ps1 -Force -SkipReadinessCheck
```

## How It Works

### 1. Readiness Detection
The system runs 5 critical checks:
- **Foundation Services Health**: All core API endpoints responding
- **Critical Files Present**: Required configuration files exist
- **Configuration Validation**: YAML configs are valid
- **System Self-Awareness**: Readiness checklist items marked complete
- **Production Gate Score**: 100/100 gate score required

### 2. Auto-Trigger Logic
- Auto-deploy pipeline checks for `.headyvm-ready` marker
- If marker missing or >1 hour old, re-runs readiness check
- If readiness passes AND production gates pass, triggers migration
- Creates `.headyvm-ready` marker with timestamp and score

### 3. Migration Process
1. Creates backup of current state
2. Updates configurations for VM endpoints
3. Deploys to HeadyVM via API
4. Updates DNS records (manual step)
5. Verifies all services on VM
6. Creates `.headyvm-migrated` completion marker

## Using the PowerShell Module

```powershell
# Import the module
Import-Module .\scripts\modules\HeadyVM.psm1

# Check status
Get-HeadyVMStatus
# or using alias: hv-status

# Test readiness
Test-HeadyVMReadiness
# or using alias: hv-ready

# Start migration
Start-HeadyVMMigration
# or using alias: hv-migrate

# Rollback if needed
Invoke-HeadyVMRollback
# or using alias: hv-rollback

# Clear markers
Clear-HeadyVMMarkers -All
# or using alias: hv-clear -All
```

## Configuration

### Key Configuration Files
- `configs/system-self-awareness.yaml`: Tracks migration status and readiness
- `configs/foundation-contract.yaml`: VM service definitions
- `configs/cloud-layers.yaml`: VM endpoint configuration
- `configs/brain-profiles.yaml`: Brain service configuration for VM

### Readiness Checklist
Update `configs/system-self-awareness.yaml` to mark items as complete:
```yaml
headyVMSwitch:
  readiness_checklist:
    - item: "Foundation services bootable on remote VM"
      status: complete  # Change from 'in_progress' to 'complete'
      validation: "heady-manager.js starts clean with all subsystems loaded"
```

## Windsurf Integration

When HeadyVM migration is triggered:
1. Windsurf configuration is automatically updated
2. Workspace settings migrate to VM endpoints
3. All MCP connections point to VM services
4. IDE extensions reconnect to VM

## Monitoring

### During Migration
Monitor deployment progress:
```powershell
# Check deployment job status
curl https://api.headysystems.com/api/deploy/status/<jobId>
```

### Post-Migration
Verify services:
```powershell
# Health checks
curl https://headyvm.headysystems.com/health
curl https://headyvm.headysystems.com/api/health
curl https://headyvm.headysystems.com/api/brain/health
```

## Troubleshooting

### Migration Fails
1. Check logs: `Get-Content .headyvm-migrated | ConvertFrom-Json`
2. Run rollback: `.\scripts\headyvm-rollback.ps1`
3. Fix issues and retry readiness check

### Services Not Starting
1. Check Docker logs: `docker-compose logs`
2. Verify configurations: `Test-HeadyVMReadiness -Force`
3. Emergency rollback: `.\scripts\headyvm-rollback.ps1 -Emergency`

### DNS Issues
DNS propagation can take up to 24 hours. Use local hosts file for testing:
```
# Add to C:\Windows\System32\drivers\etc\hosts
<VM_IP> api.headysystems.com
<VM_IP> brain.headysystems.com
```

## Emergency Procedures

### Force Migration
```powershell
# Bypass all checks (use with caution)
.\scripts\headyvm-migrate.ps1 -Force -SkipReadinessCheck
```

### Emergency Rollback
```powershell
# Immediate rollback from latest backup
.\scripts\headyvm-rollback.ps1 -Emergency
```

### Clear All State
```powershell
# Remove all markers and reset
Clear-HeadyVMMarkers -All
# Then update system-self-awareness.yaml status back to 'preparing'
```

## Best Practices

1. **Always backup**: System creates automatic backups, but verify before migration
2. **Test readiness**: Run readiness check multiple times before migration
3. **Monitor closely**: Watch deployment logs and service health for first 24 hours
4. **Keep local running**: Don't decommission local services until VM is stable
5. **Document changes**: Note any custom configurations during migration

## Support

For issues with HeadyVM migration:
1. Check `Get-HeadyVMStatus` for current state
2. Review logs in `.headyvm-*` marker files
3. Consult workflow: `.windsurf/workflows/headyvm-migration.md`
4. Check troubleshooting section above
