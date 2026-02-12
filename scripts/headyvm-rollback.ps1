<# HEADY_BRAND:BEGIN
<# ╔══════════════════════════════════════════════════════════════════╗
<# ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
<# ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
<# ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
<# ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
<# ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
<# ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
<# ║                                                                  ║
<# ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
<# ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
<# ║  FILE: scripts/headyvm-rollback.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# HeadyVM Migration Rollback Script
# Restores system from backup in case of migration failure

param(
    [switch]$Emergency,
    [string]$BackupPath
)

$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\erich\Heady'

Write-Host 'HeadyVM Migration Rollback' -ForegroundColor Cyan
Write-Host '=========================' -ForegroundColor Cyan
Write-Host ''

# Safety check for emergency rollback
if ($Emergency) {
    Write-Host '[EMERGENCY] Emergency rollback initiated!' -ForegroundColor Red
    Write-Host 'This will immediately restore from the latest backup.' -ForegroundColor Red
    Write-Host ''
    $confirm = Read-Host 'Type EMERGENCY to confirm'
    if ($confirm -ne 'EMERGENCY') {
        Write-Host 'Emergency rollback cancelled.' -ForegroundColor Yellow
        exit 0
    }
}

# Find backup if not specified
if (-not $BackupPath) {
    if (Test-Path '.headyvm-migrated') {
        try {
            $migrationMarker = Get-Content '.headyvm-migrated' | ConvertFrom-Json
            $BackupPath = $migrationMarker.backupLocation
            Write-Host "Found backup path from migration marker: $BackupPath" -ForegroundColor Green
        } catch {
            Write-Host '[WARN] Could not read migration marker' -ForegroundColor Yellow
        }
    }
    
    if (-not $BackupPath -or -not (Test-Path $BackupPath)) {
        # Find latest backup
        $latestBackup = Get-ChildItem 'backups\headyvm-migration-*' | Sort-Object Name -Descending | Select-Object -First 1
        if ($latestBackup) {
            $BackupPath = $latestBackup.FullName
            Write-Host "Using latest backup: $BackupPath" -ForegroundColor Green
        } else {
            Write-Host '[FAIL] No backup found for rollback' -ForegroundColor Red
            exit 1
        }
    }
}

if (-not (Test-Path $BackupPath)) {
    Write-Host "[FAIL] Backup not found: $BackupPath" -ForegroundColor Red
    exit 1
}

Write-Host "Rollback source: $BackupPath" -ForegroundColor White
Write-Host ''

# Phase 1: Stop VM Services (if possible)
Write-Host '[Phase 1] Stopping VM services...' -ForegroundColor Yellow
Write-Host '--------------------------------' -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri 'https://api.headysystems.com/api/deploy/stop' -Method POST -ContentType 'application/json' -TimeoutSec 10
    Write-Host '[OK] VM services stop requested' -ForegroundColor Green
} catch {
    Write-Host '[WARN] Could not stop VM services (may already be down)' -ForegroundColor Yellow
}

# Phase 2: Restore Configuration
Write-Host ''
Write-Host '[Phase 2] Restoring configuration...' -ForegroundColor Yellow
Write-Host '----------------------------------' -ForegroundColor Yellow

$restoreItems = @(
    'configs',
    'heady-registry.json',
    'package.json',
    'docker-compose.yml',
    'render.yml',
    '.env.example',
    'scripts',
    'services',
    'workers',
    'packages'
)

foreach ($item in $restoreItems) {
    $sourcePath = Join-Path $BackupPath $item
    if (Test-Path $sourcePath) {
        Write-Host "  Restoring $item..." -ForegroundColor Blue
        if (Test-Path $item) {
            Remove-Item -Path $item -Recurse -Force
        }
        Copy-Item -Path $sourcePath -Destination $item -Recurse -Force
        Write-Host "    [OK] $item restored" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] $item not in backup" -ForegroundColor Gray
    }
}

# Phase 3: Update System Status
Write-Host ''
Write-Host '[Phase 3] Updating system status...' -ForegroundColor Yellow
Write-Host '--------------------------------' -ForegroundColor Yellow

# Update system-self-awareness.yaml
$selfAwareness = [System.IO.File]::ReadAllText('configs\system-self-awareness.yaml') | ConvertFrom-Yaml
$selfAwareness.headyVMSwitch.status = 'rollback'
$selfAwareness.headyVMSwitch.rollbackTime = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
$selfAwareness.headyVMSwitch.rollbackReason = if ($Emergency) { 'Emergency rollback' } else { 'Manual rollback' }

$selfAwareness | ConvertTo-Yaml -Depth 10 | Set-Content 'configs\system-self-awareness.yaml'
Write-Host '  [OK] Updated system-self-awareness.yaml' -ForegroundColor Green

# Remove migration markers
if (Test-Path '.headyvm-ready') { Remove-Item '.headyvm-ready' -Force }
if (Test-Path '.headyvm-migrated') { Remove-Item '.headyvm-migrated' -Force }
Write-Host '  [OK] Removed migration markers' -ForegroundColor Green

# Phase 4: Restart Local Services
Write-Host ''
Write-Host '[Phase 4] Restarting local services...' -ForegroundColor Yellow
Write-Host '------------------------------------' -ForegroundColor Yellow

Write-Host '  Starting Docker services...' -ForegroundColor Blue
try {
    docker-compose down
    # Start-Sleep -Seconds 1 # REMOVED FOR SPEED
    docker-compose up -d
    Write-Host '  [OK] Docker services restarted' -ForegroundColor Green
} catch {
    Write-Host '  [FAIL] Error restarting Docker services' -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Phase 5: Verify Rollback
Write-Host ''
Write-Host '[Phase 5] Verifying rollback...' -ForegroundColor Yellow
Write-Host '------------------------------' -ForegroundColor Yellow

$localEndpoints = @(
    'http://localhost:3300/health',
    'http://localhost:3300/api/health',
    'http://localhost:3300/api/registry/health'
)

$allHealthy = $true
foreach ($endpoint in $localEndpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint -Method GET -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "  [OK] $endpoint" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $endpoint (Status: $($response.StatusCode))" -ForegroundColor Red
            $allHealthy = $false
        }
    } catch {
        Write-Host "  [FAIL] $endpoint ($($_.Exception.Message))" -ForegroundColor Red
        $allHealthy = $false
    }
}

# Create rollback completion marker
$rollbackMarker = @{
    rollbackComplete = $true
    timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    backupUsed = $BackupPath
    emergency = $Emergency.IsPresent
    servicesHealthy = $allHealthy
} | ConvertTo-Json -Depth 10

Set-Content -Path '.headyvm-rollback' -Value $rollbackMarker

if ($allHealthy) {
    Write-Host ''
    Write-Host '[SUCCESS] Rollback completed!' -ForegroundColor Green
    Write-Host '============================' -ForegroundColor Green
    Write-Host "Backup used: $BackupPath" -ForegroundColor White
    Write-Host ''
    Write-Host 'System restored to pre-migration state.' -ForegroundColor Cyan
    Write-Host 'Local services are running.' -ForegroundColor Cyan
    Write-Host ''
    Write-Host 'Next steps:' -ForegroundColor Cyan
    Write-Host '1. Investigate migration failure' -ForegroundColor White
    Write-Host '2. Fix identified issues' -ForegroundColor White
    Write-Host '3. Re-run readiness check before retrying migration' -ForegroundColor White
} else {
    Write-Host ''
    Write-Host '[PARTIAL] Rollback completed with issues' -ForegroundColor Yellow
    Write-Host '=====================================' -ForegroundColor Yellow
    Write-Host 'Some services may not be running correctly.' -ForegroundColor White
    Write-Host 'Check Docker logs for errors: docker-compose logs' -ForegroundColor White
    Write-Host ''
    Write-Host 'Manual intervention may be required.' -ForegroundColor Red
    exit 1
}
