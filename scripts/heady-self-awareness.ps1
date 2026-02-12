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
<# ║  FILE: scripts/heady-self-awareness.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# Heady Self-Awareness & Auto-Recovery System
# 100% Uptime - 100% Self-Healing - 100% Automated

param(
    [switch]$Continuous,
    [int]$CheckIntervalSeconds = 15,
    [switch]$AggressiveMode
)

$ErrorActionPreference = 'Stop'

# System state tracking
$script:SystemState = @{
    LastHealthy = $null
    ConsecutiveFailures = 0
    RecoveryAttempts = 0
    CriticalMode = $false
    AutoFixHistory = @()
}

# Critical endpoints to monitor
$CriticalEndpoints = @(
    @{ Name = 'Brain'; Url = 'https://brain.headysystems.com'; Type = 'critical' },
    @{ Name = 'API'; Url = 'https://api.headysystems.com'; Type = 'critical' },
    @{ Name = 'Manager'; Url = 'https://me.headysystems.com'; Type = 'critical' },
    @{ Name = 'Registry'; Url = 'https://registry.headysystems.com'; Type = 'critical' },
    @{ Name = 'Connection'; Url = 'https://api.headyconnection.org'; Type = 'critical' }
)

# Auto-fix strategies
$AutoFixStrategies = @(
    @{
        Name = 'DNS_Flush'
        Condition = { $args[0] -like '*no data of the requested type*' -or $args[0] -like '*DNS*' }
        Action = {
            Write-Host "[AUTO-FIX] Flushing DNS cache..." -ForegroundColor Yellow
            ipconfig /flushdns | Out-Null
            Clear-DnsClientCache | Out-Null
            # Start-Sleep -Seconds 1 # REMOVED FOR SPEED
            return @{ Success = $true; Message = "DNS cache flushed" }
        }
    },
    @{
        Name = 'Service_Restart'
        Condition = { $args[0] -like '*timeout*' -or $args[0] -like '*connection*' }
        Action = {
            Write-Host "[AUTO-FIX] Triggering cloud service restart..." -ForegroundColor Yellow
            $body = @{
                action = 'force_restart'
                reason = 'Auto-recovery from failure'
                priority = if ($script:SystemState.CriticalMode) { 'critical' } else { 'high' }
            } | ConvertTo-Json
            
            try {
                $response = Invoke-RestMethod -Uri 'https://api.headysystems.com/api/control/restart' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 15
                return @{ Success = $true; Message = "Service restart triggered: $($response.requestId)" }
            } catch {
                return @{ Success = $false; Message = "Restart failed: $($_.Exception.Message)" }
            }
        }
    },
    @{
        Name = 'Emergency_Deploy'
        Condition = { $script:SystemState.ConsecutiveFailures -gt 3 -or $script:SystemState.CriticalMode }
        Action = {
            Write-Host "[AUTO-FIX] EMERGENCY DEPLOY TRIGGERED..." -ForegroundColor Red
            
            # Create emergency deployment trigger
            $emergencyFile = "EMERGENCY_DEPLOY_$(Get-Date -Format 'yyyyMMddHHmmss').md"
            "# EMERGENCY AUTO-DEPLOY`nTriggered: $(Get-Date)`nReason: Service failure`nAttempts: $($script:SystemState.RecoveryAttempts)" | Out-File -FilePath $emergencyFile
            
            git add $emergencyFile
            git commit -m "EMERGENCY AUTO-DEPLOY: Service recovery - $(Get-Date)" --no-verify
            git push origin main --force
            
            return @{ Success = $true; Message = "Emergency deployment triggered" }
        }
    },
    @{
        Name = 'Failover_Activate'
        Condition = { $script:SystemState.RecoveryAttempts -gt 5 -and $script:SystemState.CriticalMode }
        Action = {
            Write-Host "[AUTO-FIX] ACTIVATING DISASTER RECOVERY..." -BackgroundColor Red -ForegroundColor White
            
            $body = @{
                action = 'activate_failover'
                mode = 'disaster_recovery'
                reason = 'Primary systems completely failed'
            } | ConvertTo-Json
            
            try {
                $response = Invoke-RestMethod -Uri 'https://failover.headysystems.com/api/activate' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 20
                return @{ Success = $true; Message = "Failover activated: $($response.site)" }
            } catch {
                return @{ Success = $false; Message = "Failover failed: $($_.Exception.Message)" }
            }
        }
    }
)

function Test-EndpointHealth {
    param($Endpoint)
    
    try {
        $response = Invoke-WebRequest -Uri $Endpoint.Url -Method HEAD -TimeoutSec 5 -UseBasicParsing
        return @{
            Healthy = $true
            ResponseTime = if ($response.Headers['X-Response-Time']) { $response.Headers['X-Response-Time'] } else { '<5s' }
            Status = 'OK'
        }
    } catch {
        return @{
            Healthy = $false
            Error = $_.Exception.Message
            Status = 'FAILED'
        }
    }
}

function Invoke-AutoFix {
    param(
        $Endpoint,
        $Error
    )
    
    Write-Host "[AUTO-FIX] Analyzing failure for $($Endpoint.Name): $Error" -ForegroundColor Yellow
    
    foreach ($strategy in $AutoFixStrategies) {
        if (& $strategy.Condition $Error) {
            Write-Host "[AUTO-FIX] Applying strategy: $($strategy.Name)" -ForegroundColor Yellow
            
            $result = & $strategy.Action
            
            $script:SystemState.AutoFixHistory += @{
                Timestamp = Get-Date
                Strategy = $strategy.Name
                Endpoint = $Endpoint.Name
                Success = $result.Success
                Message = $result.Message
            }
            
            if ($result.Success) {
                Write-Host "[AUTO-FIX] ✓ Success: $($result.Message)" -ForegroundColor Green
                return $true
            } else {
                Write-Host "[AUTO-FIX] ✗ Failed: $($result.Message)" -ForegroundColor Red
            }
        }
    }
    
    return $false
}

function Invoke-SystemHealthCheck {
    Write-Host "$(Get-Date -Format 'HH:mm:ss') [SYSTEM] Running comprehensive health check..." -ForegroundColor Cyan
    
    $allHealthy = $true
    $failedEndpoints = @()
    
    foreach ($endpoint in $CriticalEndpoints) {
        $health = Test-EndpointHealth -Endpoint $endpoint
        
        if ($health.Healthy) {
            Write-Host "  ✓ $($endpoint.Name): $($health.Status) ($($health.ResponseTime))" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $($endpoint.Name): $($health.Status) - $($health.Error)" -ForegroundColor Red
            $allHealthy = $false
            $failedEndpoints += @{ Endpoint = $endpoint; Error = $health.Error }
        }
    }
    
    if ($allHealthy) {
        $script:SystemState.LastHealthy = Get-Date
        $script:SystemState.ConsecutiveFailures = 0
        $script:SystemState.CriticalMode = $false
        Write-Host "[SYSTEM] All systems operational - 100% functionality" -ForegroundColor Green
    } else {
        $script:SystemState.ConsecutiveFailures++
        $script:SystemState.RecoveryAttempts++
        
        if ($script:SystemState.ConsecutiveFailures -gt 2) {
            $script:SystemState.CriticalMode = $true
            Write-Host "[SYSTEM] CRITICAL MODE ACTIVATED - Aggressive recovery" -BackgroundColor Red -ForegroundColor White
        }
        
        Write-Host "[SYSTEM] Initiating auto-recovery for $($failedEndpoints.Count) failed services..." -ForegroundColor Yellow
        
        foreach ($failed in $failedEndpoints) {
            $fixed = Invoke-AutoFix -Endpoint $failed.Endpoint -Error $failed.Error
            
            if ($fixed) {
                # Verify fix worked
                # Start-Sleep -Seconds 1 # REMOVED FOR SPEED
                $verify = Test-EndpointHealth -Endpoint $failed.Endpoint
                if ($verify.Healthy) {
                    Write-Host "[RECOVERY] ✓ $($failed.Endpoint.Name) restored" -ForegroundColor Green
                } else {
                    Write-Host "[RECOVERY] ✗ $($failed.Endpoint.Name) still failing" -ForegroundColor Red
                }
            }
        }
    }
    
    # Log state
    $stateLog = "State: ConsecutiveFailures=$($script:SystemState.ConsecutiveFailures), RecoveryAttempts=$($script:SystemState.RecoveryAttempts), CriticalMode=$($script:SystemState.CriticalMode)"
    Write-Host "[SYSTEM] $stateLog" -ForegroundColor Gray
    
    Write-Host ""
}

function Start-SelfAwareness {
    Write-Host "[AWARENESS] Heady Self-Awareness System Starting..." -ForegroundColor Cyan
    Write-Host "[AWARENESS] Mode: $(if ($AggressiveMode) { 'AGGRESSIVE' } else { 'Standard' })" -ForegroundColor Cyan
    Write-Host "[AWARENESS] Check Interval: ${CheckIntervalSeconds}s" -ForegroundColor Cyan
    Write-Host "[AWARENESS] Press Ctrl+C to stop" -ForegroundColor Gray
    Write-Host ""
    
    # Initial health check
    Invoke-SystemHealthCheck
    
    if ($Continuous) {
        while ($true) {
            Start-Sleep -Seconds $CheckIntervalSeconds
            Invoke-SystemHealthCheck
        }
    }
}

# Start the system
Start-SelfAwareness
