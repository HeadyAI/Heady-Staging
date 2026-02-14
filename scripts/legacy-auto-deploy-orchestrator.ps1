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
<# ║  FILE: scripts/legacy-auto-deploy-orchestrator.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
<#
.SYNOPSIS
Orchestrates fully automated deployments with safety checks
#>

param (
    [switch]$Priority
)

# Import configuration

# Check if Docker engine is available
$dockerAvailable = $true
try {
    docker info --format '{{json .}}' | Out-Null
} catch {
    $dockerAvailable = $false
    Write-Warning "Docker engine not detected or not running. Website deployments that require Docker will be skipped."
}

$config = Get-Content -Raw -Path "$PSScriptRoot\..\configs\auto-deploy-config.json" | ConvertFrom-Json

if ($Priority) {
    Write-Host "Running PRIORITY deployment" -ForegroundColor Magenta
    # Skip safety checks for priority deployments

    # Proceed with deployment
    Write-Host "Initiating automated deployment sequence" -ForegroundColor Green

    # Execute deployment pipeline
    foreach ($target in $config.DeploymentTargets) {
        try {
            Write-Host "Deploying to $target" -ForegroundColor Cyan
            
            # Platform-specific deployment
            switch ($target) {
                "Windows" { & "$PSScriptRoot\deploy-windows.ps1" }
                "Android" { & "$PSScriptRoot\deploy-android.ps1" }
                "Linux" { & "$PSScriptRoot\deploy-linux.ps1" }
                "Websites" {
                    if (-not $dockerAvailable) {
                        Write-Warning "Skipping Websites deployment because Docker engine is unavailable."
                        break
                    }
                    # Run both website deployments simultaneously
                    $scriptPath = "$PSScriptRoot"
                    $jobs = @()
                    $jobs += Start-Job -ScriptBlock { & "$using:scriptPath\deploy-1me1.ps1" }
                    $jobs += Start-Job -ScriptBlock { & "$using:scriptPath\deploy-headymusic.ps1" }
                    $jobs | Wait-Job | Receive-Job
                    $jobs | Remove-Job
                }
            }
            
            # Post-deployment verification
            & "$PSScriptRoot\verify-deployment.ps1" -Target $target
        }
        catch {
            Write-Host "Deployment to $target failed: $_" -ForegroundColor Red
            
            # Only abort if critical deployment
            if ($config.CriticalTargets -contains $target) {
                exit 3
            }
        }
    }

    # Final synchronization
    & "$PSScriptRoot\sync-state.ps1" -env production

    # Update deployment registry
    & "$PSScriptRoot\update-deployment-registry.ps1" -Version $config.Version -Status "success"

    Write-Host "Deployment completed successfully" -ForegroundColor Green
} else {
    # Safety Check 1: Verify system health
    $systemHealth = & "$PSScriptRoot\check-system-health.ps1"
    if (-not $systemHealth.AllSystemsGo) {
        Write-Host "Aborting deployment: System health check failed" -ForegroundColor Red
        exit 1
    }

    # Safety Check 2: Verify no active user sessions
    $activeSessions = & "$PSScriptRoot\check-user-sessions.ps1"
    if ($activeSessions.Count -gt 0) {
        Write-Host "Aborting deployment: Active user sessions detected" -ForegroundColor Yellow
        exit 2
    }

    # Proceed with deployment
    Write-Host "Initiating automated deployment sequence" -ForegroundColor Green

    # Execute deployment pipeline
    foreach ($target in $config.DeploymentTargets) {
        try {
            Write-Host "Deploying to $target" -ForegroundColor Cyan
            
            # Platform-specific deployment
            switch ($target) {
                "Windows" { & "$PSScriptRoot\deploy-windows.ps1" }
                "Android" { & "$PSScriptRoot\deploy-android.ps1" }
                "Linux" { & "$PSScriptRoot\deploy-linux.ps1" }
                "Websites" {
                    if (-not $dockerAvailable) {
                        Write-Warning "Skipping Websites deployment because Docker engine is unavailable."
                        break
                    }
                    # Run both website deployments simultaneously
                    $scriptPath = "$PSScriptRoot"
                    $jobs = @()
                    $jobs += Start-Job -ScriptBlock { & "$using:scriptPath\deploy-1me1.ps1" }
                    $jobs += Start-Job -ScriptBlock { & "$using:scriptPath\deploy-headymusic.ps1" }
                    $jobs | Wait-Job | Receive-Job
                    $jobs | Remove-Job
                }
            }
            
            # Post-deployment verification
            & "$PSScriptRoot\verify-deployment.ps1" -Target $target
        }
        catch {
            Write-Host "Deployment to $target failed: $_" -ForegroundColor Red
            
            # Only abort if critical deployment
            if ($config.CriticalTargets -contains $target) {
                exit 3
            }
        }
    }

    # Final synchronization
    & "$PSScriptRoot\sync-state.ps1" -env production

    # Update deployment registry
    & "$PSScriptRoot\update-deployment-registry.ps1" -Version $config.Version -Status "success"

    Write-Host "Deployment completed successfully" -ForegroundColor Green
}
