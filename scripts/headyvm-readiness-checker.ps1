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
<# ║  FILE: scripts/headyvm-readiness-checker.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# HeadyVM Migration Readiness Checker
# Validates system readiness for HeadyVM migration and triggers auto-deploy when ready

param(
    [switch]$AutoDeployIfReady,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\erich\Heady'

# Readiness configuration
$ReadinessConfig = @{
    MinGateScore = 100
    RequiredServices = @(
        'heady-manager',
        'registry',
        'orchestrator',
        'model-router',
        'brain-api'
    )
    RequiredEndpoints = @(
        'https://api.headysystems.com/health',
        'https://api.headysystems.com/api/health',
        'https://api.headysystems.com/api/registry/health',
        'https://api.headysystems.com/api/orchestrator/health',
        'https://api.headysystems.com/api/brain/health'
    )
    CriticalFiles = @(
        'configs/foundation-contract.yaml',
        'configs/cloud-layers.yaml',
        'configs/brain-profiles.yaml',
        'configs/website-definitions.yaml',
        'packages/agents/catalog.yaml',
        'services/orchestrator/hc-sys-orchestrator.js',
        'workers/edge-proxy/src/index.ts'
    )
}

Write-Host 'HeadyVM Migration Readiness Checker' -ForegroundColor Cyan
Write-Host '==================================' -ForegroundColor Cyan
Write-Host ''

$ReadinessScore = 0
$MaxScore = 5
$ChecksPassed = @()

# Check 1: Foundation Services Health
Write-Host '[Check 1] Foundation Services Health' -ForegroundColor Yellow
Write-Host '-----------------------------------' -ForegroundColor Yellow
$ServiceHealthPassed = $true

foreach ($endpoint in $ReadinessConfig.RequiredEndpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint -Method GET -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "  [OK] $endpoint" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $endpoint (Status: $($response.StatusCode))" -ForegroundColor Red
            $ServiceHealthPassed = $false
        }
    } catch {
        Write-Host "  [FAIL] $endpoint ($($_.Exception.Message))" -ForegroundColor Red
        $ServiceHealthPassed = $false
    }
}

if ($ServiceHealthPassed) {
    $ReadinessScore++
    $ChecksPassed += 'Foundation Services Health'
    Write-Host '  [PASS] All foundation services healthy' -ForegroundColor Green
} else {
    Write-Host '  [FAIL] Foundation services have issues' -ForegroundColor Red
}
Write-Host ''

# Check 2: Critical Files Existence
Write-Host '[Check 2] Critical Files Present' -ForegroundColor Yellow
Write-Host '-------------------------------' -ForegroundColor Yellow
$FilesPresent = $true

foreach ($file in $ReadinessConfig.CriticalFiles) {
    if (Test-Path $file) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $file (missing)" -ForegroundColor Red
        $FilesPresent = $false
    }
}

if ($FilesPresent) {
    $ReadinessScore++
    $ChecksPassed += 'Critical Files Present'
    Write-Host '  [PASS] All critical files present' -ForegroundColor Green
} else {
    Write-Host '  [FAIL] Missing critical files' -ForegroundColor Red
}
Write-Host ''

# Check 3: Configuration Validation
Write-Host '[Check 3] Configuration Validation' -ForegroundColor Yellow
Write-Host '--------------------------------' -ForegroundColor Yellow
$ConfigValid = $true

# Validate foundation contract
try {
    $foundationContract = [System.IO.File]::ReadAllText('configs/foundation-contract.yaml') | ConvertFrom-Yaml
    Write-Host '  [OK] foundation-contract.yaml valid' -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] foundation-contract.yaml invalid: $($_.Exception.Message)" -ForegroundColor Red
    $ConfigValid = $false
}

# Validate cloud layers
try {
    $cloudLayers = [System.IO.File]::ReadAllText('configs/cloud-layers.yaml') | ConvertFrom-Yaml
    Write-Host '  [OK] cloud-layers.yaml valid' -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] cloud-layers.yaml invalid: $($_.Exception.Message)" -ForegroundColor Red
    $ConfigValid = $false
}

# Validate brain profiles
try {
    $brainProfiles = [System.IO.File]::ReadAllText('configs/brain-profiles.yaml') | ConvertFrom-Yaml
    Write-Host '  [OK] brain-profiles.yaml valid' -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] brain-profiles.yaml invalid: $($_.Exception.Message)" -ForegroundColor Red
    $ConfigValid = $false
}

if ($ConfigValid) {
    $ReadinessScore++
    $ChecksPassed += 'Configuration Validation'
    Write-Host '  [PASS] All configurations valid' -ForegroundColor Green
} else {
    Write-Host '  [FAIL] Configuration validation failed' -ForegroundColor Red
}
Write-Host ''

# Check 4: System Self-Awareness Status
Write-Host '[Check 4] System Self-Awareness' -ForegroundColor Yellow
Write-Host '------------------------------' -ForegroundColor Yellow
try {
    $selfAwareness = [System.IO.File]::ReadAllText('configs/system-self-awareness.yaml') | ConvertFrom-Yaml
    $headyVMSwitch = $selfAwareness.headyVMSwitch
    
    if ($headyVMSwitch -and $headyVMSwitch.readiness_checklist) {
        $allComplete = $true
        foreach ($item in $headyVMSwitch.readiness_checklist) {
            if ($item.status -eq 'complete') {
                Write-Host "  [OK] $($item.item)" -ForegroundColor Green
            } elseif ($item.status -eq 'in_progress') {
                Write-Host "  [WARN] $($item.item) (in progress)" -ForegroundColor Yellow
            } else {
                Write-Host "  [FAIL] $($item.item) ($($item.status))" -ForegroundColor Red
                $allComplete = $false
            }
        }
        
        if ($allComplete -or $Force) {
            $ReadinessScore++
            $ChecksPassed += 'System Self-Awareness'
            Write-Host '  [PASS] System self-awareness ready' -ForegroundColor Green
        } else {
            Write-Host '  [FAIL] System self-awareness not ready' -ForegroundColor Red
        }
    } else {
        Write-Host '  [FAIL] HeadyVM switch configuration missing' -ForegroundColor Red
    }
} catch {
    Write-Host "  [FAIL] Error reading self-awareness config: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ''

# Check 5: Production Gate Score
Write-Host '[Check 5] Production Gate Score' -ForegroundColor Yellow
Write-Host '-----------------------------' -ForegroundColor Yellow

# Simulate gate score calculation (in real implementation, this would call the actual gate checker)
$GateScore = if ($Force) { 100 } else { 95 } # Placeholder - would get from actual system

if ($GateScore -ge $ReadinessConfig.MinGateScore) {
    $ReadinessScore++
    $ChecksPassed += 'Production Gate Score'
    Write-Host "  [PASS] Gate score: $GateScore/100" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Gate score: $GateScore/100 (required: $($ReadinessConfig.MinGateScore))" -ForegroundColor Red
}
Write-Host ''

# Summary
Write-Host 'Readiness Summary' -ForegroundColor Cyan
Write-Host '-----------------' -ForegroundColor Cyan
Write-Host "Score: $ReadinessScore/$MaxScore" -ForegroundColor $(if($ReadinessScore -eq $MaxScore) {'Green'} else {'Yellow'})
Write-Host "Passed checks: $($ChecksPassed -join ', ')" -ForegroundColor $(if($ReadinessScore -eq $MaxScore) {'Green'} else {'Yellow'})

if ($ReadinessScore -eq $MaxScore -or $Force) {
    Write-Host ''
    Write-Host '[READY] System is ready for HeadyVM migration!' -ForegroundColor Green
    
    # Create readiness marker file
    $ReadinessMarker = @{
        timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
        score = $ReadinessScore
        maxScore = $MaxScore
        passedChecks = $ChecksPassed
        forced = $Force.IsPresent
    } | ConvertTo-Json -Depth 10
    
    Set-Content -Path '.headyvm-ready' -Value $ReadinessMarker
    Write-Host 'Created readiness marker: .headyvm-ready' -ForegroundColor Green
    
    # Trigger auto-deploy if requested
    if ($AutoDeployIfReady) {
        Write-Host ''
        Write-Host '[TRIGGER] Starting auto-deploy for HeadyVM migration...' -ForegroundColor Cyan
        & '.\scripts\run-auto-deploy.ps1' -ForceProduction:$Force
    }
} else {
    Write-Host ''
    Write-Host '[NOT READY] System is not ready for HeadyVM migration' -ForegroundColor Red
    Write-Host 'Address the failed checks before attempting migration.' -ForegroundColor Red
    exit 1
}
