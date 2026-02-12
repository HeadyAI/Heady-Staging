# Heady Brain Recovery Service
# Ensures 100% brain functionality at all times

param(
    [switch]$Continuous,
    [int]$IntervalSeconds = 30
)

$ErrorActionPreference = 'Stop'

# Brain endpoints in priority order - CLOUD ONLY
$BrainEndpoints = @(
    @{ Name = 'Primary'; Url = 'https://brain.headysystems.com' },
    @{ Name = 'Fallback1'; Url = 'https://52.32.178.8' },
    @{ Name = 'Fallback2'; Url = 'https://brain-backup.headysystems.com' },
    @{ Name = 'Emergency'; Url = 'https://brain-emergency.headysystems.com' },
    @{ Name = 'Disaster'; Url = 'https://brain-dr.headysystems.com' }
)

function Test-BrainEndpoint {
    param($Endpoint)
    
    try {
        $response = Invoke-WebRequest -Uri $Endpoint.Url -Method HEAD -TimeoutSec 3 -UseBasicParsing
        return @{
            Healthy = $true
            ResponseTime = $response.Headers['X-Response-Time'] ?? 'N/A'
        }
    } catch {
        return @{
            Healthy = $false
            Error = $_.Exception.Message
        }
    }
}

function Invoke-EmergencyBrainRestart {
    Write-Host "[RECOVERY] Initiating emergency brain restart via cloud API..." -ForegroundColor Yellow
    
    try {
        # Use cloud API to restart brain service
        $body = @{
            action = 'emergency_restart'
            reason = 'All endpoints down'
            priority = 'critical'
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri 'https://api.headysystems.com/api/brain/control' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 10
        
        Write-Host "[RECOVERY] Emergency restart initiated: $($response.requestId)" -ForegroundColor Green
        
        # Wait for restart
        # Start-Sleep -Seconds 1 # REMOVED FOR SPEED
        
        # Test primary endpoint again
        $test = Test-BrainEndpoint -Endpoint @{ Url = 'https://brain.headysystems.com' }
        return $test.Healthy
        
    } catch {
        Write-Host "[RECOVERY] Emergency restart failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    return $false
}

function Invoke-BrainRecovery {
    Write-Host "$(Get-Date -Format 'HH:mm:ss') [HEALTH] Checking brain endpoints..." -ForegroundColor Cyan
    
    $healthyEndpoint = $null
    
    # Test all endpoints
    foreach ($endpoint in $BrainEndpoints) {
        $result = Test-BrainEndpoint -Endpoint $endpoint
        
        if ($result.Healthy) {
            Write-Host "  [OK] $($endpoint.Name) brain healthy ($($result.ResponseTime))" -ForegroundColor Green
            $healthyEndpoint = $endpoint
            break
        } else {
            Write-Host "  [FAIL] $($endpoint.Name) brain down: $($result.Error)" -ForegroundColor Red
        }
    }
    
    if (-not $healthyEndpoint) {
        Write-Host '[EMERGENCY] ALL BRAIN ENDPOINTS DOWN - INITIATING CLOUD RECOVERY' -ForegroundColor Red
        
        # Attempt cloud emergency restart
        if (Invoke-EmergencyBrainRestart) {
            Write-Host '[RECOVERY] Brain functionality RESTORED via cloud restart' -ForegroundColor Green
            
            # Notify monitoring
            try {
                $body = @{
                    status = 'recovered'
                    endpoint = 'https://brain.headysystems.com'
                    timestamp = (Get-Date).ToString('o')
                } | ConvertTo-Json
                
                Invoke-RestMethod -Uri 'https://api.headysystems.com/api/brain/status' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 5 -ErrorAction SilentlyContinue
            } catch {
                # Notification failed but brain is working
            }
        } else {
            Write-Host '[CRITICAL] ALL CLOUD BRAIN ENDPOINTS FAILED - CRITICAL FAILURE' -ForegroundColor Red
            Write-Host 'This VIOLATES 100% functionality requirement!' -ForegroundColor Red
            
            # Send critical alert
            try {
                $alert = @{
                    severity = 'critical'
                    message = 'ALL CLOUD BRAIN ENDPOINTS FAILED - 100% FUNCTIONALITY COMPROMISED'
                    timestamp = (Get-Date).ToString('o')
                    allEndpointsDown = $true
                } | ConvertTo-Json
                
                Invoke-RestMethod -Uri 'https://api.headysystems.com/api/alerts' -Method POST -Body $alert -ContentType 'application/json' -TimeoutSec 5 -ErrorAction SilentlyContinue
            } catch {
                # Even alerting failed - complete system failure
            }
        }
    }
    
    Write-Host ""
}

# Main execution
if ($Continuous) {
    Write-Host "[MONITOR] Starting continuous brain recovery (interval: ${IntervalSeconds}s)" -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
    Write-Host ""
    
    while ($true) {
        Invoke-BrainRecovery
        Start-Sleep -Seconds $IntervalSeconds
    }
} else {
    Invoke-BrainRecovery
}
