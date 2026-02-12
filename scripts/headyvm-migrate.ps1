# HeadyVM Migration Script
# Performs the actual migration to HeadyVM environment

param(
    [switch]$SkipReadinessCheck,
    [switch]$Force,
    [string]$TargetVM = 'headyvm.headysystems.com'
)

$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\erich\Heady'

Write-Host 'HeadyVM Migration Script' -ForegroundColor Cyan
Write-Host '========================' -ForegroundColor Cyan
Write-Host ''

# Pre-flight checks
if (-not $SkipReadinessCheck) {
    Write-Host '[Pre-flight] Checking readiness...' -ForegroundColor Yellow
    Write-Host '--------------------------------' -ForegroundColor Yellow
    
    if (-not (Test-Path '.headyvm-ready')) {
        Write-Host '[FAIL] System not marked as ready for migration' -ForegroundColor Red
        Write-Host 'Run .\scripts\headyvm-readiness-checker.ps1 first' -ForegroundColor Red
        exit 1
    }
    
    try {
        $marker = Get-Content '.headyvm-ready' | ConvertFrom-Json
        $markerTime = [DateTime]::Parse($marker.timestamp)
        $timeSinceMarker = (Get-Date) - $markerTime
        
        if ($timeSinceMarker.TotalHours -gt 24 -and -not $Force) {
            Write-Host '[FAIL] Readiness marker is older than 24 hours' -ForegroundColor Red
            Write-Host 'Re-run readiness check or use -Force to proceed' -ForegroundColor Red
            exit 1
        }
        
        Write-Host "[OK] Readiness confirmed at $($marker.timestamp)" -ForegroundColor Green
        Write-Host "[OK] Score: $($marker.score)/$($marker.maxScore)" -ForegroundColor Green
    } catch {
        Write-Host '[FAIL] Invalid readiness marker' -ForegroundColor Red
        exit 1
    }
}

# Load migration configuration
Write-Host ''
Write-Host '[Config] Loading migration configuration...' -ForegroundColor Yellow
Write-Host '----------------------------------------' -ForegroundColor Yellow

try {
    $selfAwareness = [System.IO.File]::ReadAllText('configs\system-self-awareness.yaml') | ConvertFrom-Yaml
    $headyVMSwitch = $selfAwareness.headyVMSwitch
    
    if (-not $headyVMSwitch) {
        Write-Host '[FAIL] HeadyVM configuration not found' -ForegroundColor Red
        exit 1
    }
    
    Write-Host '[OK] Configuration loaded' -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Error loading configuration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Phase 1: Backup Current State
Write-Host ''
Write-Host '[Phase 1] Creating migration backup...' -ForegroundColor Yellow
Write-Host '-------------------------------------' -ForegroundColor Yellow

$backupDir = "backups\headyvm-migration-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$backupItems = @(
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

foreach ($item in $backupItems) {
    if (Test-Path $item) {
        Write-Host "  Backing up $item..." -ForegroundColor Blue
        Copy-Item -Path $item -Destination "$backupDir\$item" -Recurse -Force
    }
}

Write-Host "[OK] Backup created at $backupDir" -ForegroundColor Green

# Phase 2: Update Configuration for HeadyVM
Write-Host ''
Write-Host '[Phase 2] Updating configuration for HeadyVM...' -ForegroundColor Yellow
Write-Host '--------------------------------------------' -ForegroundColor Yellow

# Update system-self-awareness.yaml
$selfAwareness.headyVMSwitch.status = 'migrating'
$selfAwareness.headyVMSwitch.migrationStartTime = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
$selfAwareness.headyVMSwitch.targetVM = $TargetVM

$selfAwareness | ConvertTo-Yaml -Depth 10 | Set-Content 'configs\system-self-awareness.yaml'
Write-Host '  [OK] Updated system-self-awareness.yaml' -ForegroundColor Green

# Update docker-compose for VM deployment
$dockerCompose = [System.IO.File]::ReadAllText('docker-compose.yml')
$dockerCompose = $dockerCompose -replace 'localhost|127\.0\.0\.1', $TargetVM
$dockerCompose | Set-Content 'docker-compose.yml'
Write-Host '  [OK] Updated docker-compose.yml for VM endpoints' -ForegroundColor Green

# Phase 3: Deploy to HeadyVM
Write-Host ''
Write-Host '[Phase 3] Deploying to HeadyVM...' -ForegroundColor Yellow
Write-Host '--------------------------------' -ForegroundColor Yellow

# Check VM connectivity
try {
    $response = Invoke-WebRequest -Uri "https://$TargetVM/health" -Method GET -TimeoutSec 10 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  [OK] HeadyVM reachable at $TargetVM" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] HeadyVM returned status $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [FAIL] Cannot reach HeadyVM at $TargetVM" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if (-not $Force) {
        Write-Host '  Use -Force to proceed without connectivity check' -ForegroundColor Yellow
        exit 1
    }
}

# Trigger deployment pipeline to VM
Write-Host '  Triggering deployment pipeline...' -ForegroundColor Blue
try {
    $deployBody = @{
        action = 'deploy_to_vm'
        target = $TargetVM
        backup = $backupDir
        timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
        force = $Force.IsPresent
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "https://api.headysystems.com/api/deploy/vm" -Method POST -Body $deployBody -ContentType 'application/json' -TimeoutSec 60
    Write-Host "  [OK] Deployment started: Job $($response.jobId)" -ForegroundColor Green
    Write-Host "  Monitor at: https://api.headysystems.com/api/deploy/status/$($response.jobId)" -ForegroundColor Cyan
} catch {
    Write-Host "  [FAIL] Deployment trigger failed: $($_.Exception.Message)" -ForegroundColor Red
    
    if (-not $Force) {
        exit 1
    }
    
    Write-Host '  Proceeding with manual migration steps...' -ForegroundColor Yellow
}

# Phase 4: Update DNS and Routing
Write-Host ''
Write-Host '[Phase 4] Updating DNS and routing...' -ForegroundColor Yellow
Write-Host '------------------------------------' -ForegroundColor Yellow

Write-Host '  NOTE: DNS updates require manual intervention' -ForegroundColor Yellow
Write-Host '  Please update the following records:' -ForegroundColor White
Write-Host "    api.headysystems.com -> $TargetVM" -ForegroundColor Cyan
Write-Host "    brain.headysystems.com -> $TargetVM" -ForegroundColor Cyan
Write-Host "    manager.headysystems.com -> $TargetVM" -ForegroundColor Cyan
Write-Host "    registry.headysystems.com -> $TargetVM" -ForegroundColor Cyan

# Phase 5: Post-Migration Verification
Write-Host ''
Write-Host '[Phase 5] Post-migration verification...' -ForegroundColor Yellow
Write-Host '--------------------------------------' -ForegroundColor Yellow

$vmEndpoints = @(
    "https://$TargetVM/health",
    "https://$TargetVM/api/health",
    "https://$TargetVM/api/registry/health",
    "https://$TargetVM/api/brain/health"
)

$allHealthy = $true
foreach ($endpoint in $vmEndpoints) {
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

# Update final status
if ($allHealthy -or $Force) {
    $selfAwareness.headyVMSwitch.status = 'completed'
    $selfAwareness.headyVMSwitch.migrationCompleteTime = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    $selfAwareness.headyVMSwitch.productionVM = $TargetVM
    
    $selfAwareness | ConvertTo-Yaml -Depth 10 | Set-Content 'configs\system-self-awareness.yaml'
    
    # Create migration completion marker
    $completionMarker = @{
        migrationComplete = $true
        timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
        targetVM = $TargetVM
        backupLocation = $backupDir
        forced = $Force.IsPresent
    } | ConvertTo-Json -Depth 10
    
    Set-Content -Path '.headyvm-migrated' -Value $completionMarker
    
    Write-Host ''
    Write-Host '[SUCCESS] HeadyVM migration completed!' -ForegroundColor Green
    Write-Host '=====================================' -ForegroundColor Green
    Write-Host "Target VM: $TargetVM" -ForegroundColor White
    Write-Host "Backup: $backupDir" -ForegroundColor White
    Write-Host ''
    Write-Host 'Next steps:' -ForegroundColor Cyan
    Write-Host '1. Update DNS records to point to HeadyVM' -ForegroundColor White
    Write-Host '2. Monitor service health for 24 hours' -ForegroundColor White
    Write-Host '3. Decommission local services after stability confirmed' -ForegroundColor White
} else {
    Write-Host ''
    Write-Host '[PARTIAL] Migration initiated but verification failed' -ForegroundColor Yellow
    Write-Host '================================================' -ForegroundColor Yellow
    Write-Host 'Check the logs and manually verify service health' -ForegroundColor White
    Write-Host "Backup available at: $backupDir" -ForegroundColor White
    exit 1
}
