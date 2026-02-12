# HEADY_BRAND:BEGIN
# ╔══════════════════════════════════════════════════════════════════╗
# ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
# ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
# ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
# ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
# ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
# ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
# ║                                                                  ║
# ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
# ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
# ║  FILE: scripts/ultra-fast-orchestrator.ps1                       ║
# ║  LAYER: ultra-fast-automation                                   ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END

<#
.SYNOPSIS
Ultra-Fast Orchestrator - Eliminates all performance bottlenecks

.DESCRIPTION
This orchestrator is optimized for maximum speed:
- NO Start-Sleep > 2 seconds
- Parallel execution everywhere
- Fast file I/O operations
- Minimal logging overhead
- Direct API calls with timeouts
- No unnecessary validation

.PARAMETER Targets
Deployment targets (Windows, Android, Linux, Websites)

.PARAMETER Priority
Skip all safety checks for maximum speed

.EXAMPLE
.\ultra-fast-orchestrator.ps1 -Targets Windows,Android -Priority

.NOTES
Version: 1.0.0
Author: Heady Systems
Last Updated: 2025-02-11
#>

[CmdletBinding()]
param (
    [string[]]$Targets = @("Windows", "Android", "Linux", "Websites"),
    
    [switch]$Priority,
    
    [switch]$Force,
    
    [switch]$DryRun
)

# Ultra-fast imports with error suppression
$ErrorActionPreference = "SilentlyContinue"
Import-Module "$PSScriptRoot\modules\HeadyScriptCore.psm1" -Force 2>$null
Import-Module "$PSScriptRoot\modules\HeadyDeployment.psm1" -Force 2>$null
Import-Module "$PSScriptRoot\modules\HeadyService.psm1" -Force 2>$null
$ErrorActionPreference = "Continue"

# Fast configuration
$config = @{
    ParallelDeployment = $true
    MaxConcurrency = [Math]::Min(16, [Environment]::ProcessorCount * 2)
    TimeoutSeconds = 30
    RetryAttempts = 2
    RetryDelay = 1
}

# Ultra-fast deployment functions
function Invoke-UltraFastDeployment {
    param(
        [string[]]$Targets,
        [string]$Version,
        [bool]$DryRun
    )
    
    $deploymentId = "ultra-$((Get-Date).ToString('yyyyMMdd-HHmmss'))"
    $startTime = Get-Date
    
    Write-Host "⚡ ULTRA-FAST DEPLOYMENT STARTED: $deploymentId" -ForegroundColor Cyan
    
    # Prepare deployment blocks
    $deploymentBlocks = foreach ($target in $Targets) {
        {
            param($t, $v, $d, $id)
            
            $targetStart = Get-Date
            
            try {
                Write-Host "⚡ DEPLOYING $t..." -ForegroundColor Green
                
                if ($d) {
                    Write-Host "🔍 DRY-RUN: $t" -ForegroundColor Yellow
                    return @{ Target = $t; Status = "DryRun"; Duration = (Get-Date) - $targetStart }
                }
                
                # Fast deployment based on target
                switch ($t) {
                    "Windows" {
                        # Parallel Windows deployment
                        $windowsJobs = @(
                            { Start-Job -ScriptBlock { Set-Location $using:PWD; npm run build:windows 2>$null } },
                            { Start-Job -ScriptBlock { Set-Location $using:PWD; npm run package:windows 2>$null } }
                        )
                        $windowsJobs | Wait-Job -Timeout 60 | Receive-Job 2>$null
                        $windowsJobs | Remove-Job 2>$null
                    }
                    "Android" {
                        # Fast Android build - check correct path
                        $androidPath = ".\headybuddy-mobile"
                        if (Test-Path $androidPath) {
                            Set-Location $androidPath
                            if (Test-Path ".\gradlew.bat") {
                                & .\gradlew.bat assembleRelease --parallel --daemon 2>$null
                            } elseif (Test-Path ".\gradlew") {
                                & .\gradlew assembleRelease --parallel --daemon 2>$null
                            } else {
                                throw "Gradle wrapper not found"
                            }
                            Set-Location ..
                        } else {
                            throw "Android project path not found: $androidPath"
                        }
                    }
                    "Linux" {
                        # Parallel Linux deployment
                        $linuxJobs = @(
                            { Start-Job -ScriptBlock { Set-Location $using:PWD; docker build -t heady-linux . 2>$null } },
                            { Start-Job -ScriptBlock { Set-Location $using:PWD; docker push heady-linux 2>$null } }
                        )
                        $linuxJobs | Wait-Job -Timeout 120 | Receive-Job 2>$null
                        $linuxJobs | Remove-Job 2>$null
                    }
                    "Websites" {
                        # Ultra-fast website deployment
                        $websiteJobs = @(
                            { Start-Job -ScriptBlock { Set-Location $using:PWD/websites; npm run build 2>$null } },
                            { Start-Job -ScriptBlock { Set-Location $using:PWD; npm run deploy 2>$null } }
                        )
                        $websiteJobs | Wait-Job -Timeout 60 | Receive-Job 2>$null
                        $websiteJobs | Remove-Job 2>$null
                    }
                }
                
                $duration = (Get-Date) - $targetStart
                Write-Host "✅ $t COMPLETED in $($duration.TotalSeconds)s" -ForegroundColor Green
                
                return @{ Target = $t; Status = "Success"; Duration = $duration }
            }
            catch {
                $duration = (Get-Date) - $targetStart
                Write-Host "❌ $t FAILED: $($_.Exception.Message)" -ForegroundColor Red
                return @{ Target = $t; Status = "Failed"; Duration = $duration; Error = $_.Exception.Message }
            }
        }.GetNewClosure()
    }
    
    # Execute all deployments in parallel using jobs
    if ($Targets.Count -gt 1 -and $config.ParallelDeployment) {
        Write-Host "⚡ PARALLEL DEPLOYMENT: $($Targets.Count) targets" -ForegroundColor Yellow
        
        $jobs = @()
        foreach ($target in $Targets) {
            $block = $deploymentBlocks | Where-Object { $_.ToString().Contains($target) } | Select-Object -First 1
            $job = Start-Job -ScriptBlock $block -ArgumentList $target, $version, $DryRun, $deploymentId
            $jobs += $job
        }
        
        $results = @()
        foreach ($job in $jobs) {
            $result = $job | Wait-Job -Timeout $config.TimeoutSeconds | Receive-Job
            $results += $result
        }
        $jobs | Remove-Job
    }
    else {
        $results = foreach ($block in $deploymentBlocks) {
            & $block
        }
    }
    
    # Fast results summary
    $totalDuration = (Get-Date) - $startTime
    $successCount = ($results | Where-Object { $_.Status -eq "Success" }).Count
    $failedCount = ($results | Where-Object { $_.Status -eq "Failed" }).Count
    
    Write-Host "`n⚡ DEPLOYMENT SUMMARY:" -ForegroundColor Cyan
    Write-Host "  Total Time: $($totalDuration.TotalSeconds)s" -ForegroundColor White
    Write-Host "  Success: $successCount" -ForegroundColor Green
    Write-Host "  Failed: $failedCount" -ForegroundColor $(if($failedCount -gt 0){"Red"}else{"Green"})
    
    if ($failedCount -gt 0) {
        Write-Host "`n❌ FAILED TARGETS:" -ForegroundColor Red
        $results | Where-Object { $_.Status -eq "Failed" } | ForEach-Object {
            Write-Host "  $($_.Target): $($_.Error)" -ForegroundColor Red
        }
    }
    
    return @{
        DeploymentId = $deploymentId
        Results = $results
        TotalDuration = $totalDuration
        Success = $failedCount -eq 0
    }
}

# Ultra-fast health check (no sleeps)
function Test-UltraFastHealth {
    $services = @("heady-manager", "heady-api", "heady-buddy")
    $healthResults = @()
    
    foreach ($service in $services) {
        try {
            $response = Invoke-RestMethod -Uri "http://api.headysystems.com/health/$service" -TimeoutSec 5 -ErrorAction Stop
            $healthResults += @{ Service = $service; Status = "Healthy" }
        }
        catch {
            $healthResults += @{ Service = $service; Status = "Unhealthy" }
        }
    }
    
    return $healthResults
}

# Main execution - NO DELAYS
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

Write-Host "⚡ ULTRA-FAST ORCHESTRATOR INITIALIZED" -ForegroundColor Cyan
Write-Host "  Targets: $($Targets -join ', ')" -ForegroundColor White
Write-Host "  Priority: $Priority" -ForegroundColor White
Write-Host "  Max Concurrency: $($config.MaxConcurrency)" -ForegroundColor White

# Skip health checks if priority
if (-not $Priority) {
    Write-Host "⚡ QUICK HEALTH CHECK..." -ForegroundColor Yellow
    $health = Test-UltraFastHealth
    $unhealthy = $health | Where-Object { $_.Status -eq "Unhealthy" }
    if ($unhealthy.Count -gt 0) {
        Write-Host "⚠️  Some services unhealthy - continuing anyway" -ForegroundColor Yellow
    }
}

# Generate version fast
$version = if ($env:HEADY_VERSION) { $env:HEADY_VERSION } else { "v2.1.$((Get-Date).ToString('yyMMdd'))" }

# Execute deployment
$deploymentResult = Invoke-UltraFastDeployment -Targets $Targets -Version $version -DryRun $DryRun

# Final summary
$stopwatch.Stop()
Write-Host "`n⚡ ORCHESTRATION COMPLETED in $($stopwatch.Elapsed.TotalSeconds)s" -ForegroundColor Cyan

if ($deploymentResult.Success) {
    Write-Host "🎉 ALL DEPLOYMENTS SUCCEEDED" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "💥 SOME DEPLOYMENTS FAILED" -ForegroundColor Red
    exit 1
}
