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
# ║  FILE: scripts/brain-uptime-monitor.ps1                          ║
# ║  LAYER: automation                                               ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END

<#
.SYNOPSIS
    HeadyBrain 100% Uptime Monitor
    
.DESCRIPTION
    Ensures HeadyBrain connectivity is maintained 100% of the time through:
    - Continuous health monitoring of all brain endpoints
    - Automatic failover and recovery
    - Alert notifications on connectivity issues
    - Performance metrics and SLA reporting
    - Self-healing capabilities
    
.PARAMETER Action
    start | stop | status | report | test
    
.PARAMETER Mode
    monitor | strict | emergency
    
.EXAMPLE
    .\brain-uptime-monitor.ps1 -Action start -Mode strict
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('start', 'stop', 'status', 'report', 'test')]
    [string]$Action,
    
    [ValidateSet('monitor', 'strict', 'emergency')]
    [string]$Mode = 'monitor'
)

# Configuration
$Config = @{
    BrainEndpoints = @(
        @{ Id = 'primary'; Url = 'https://brain.headysystems.com'; Weight = 100 },
        @{ Id = 'secondary'; Url = 'https://api.headysystems.com/brain'; Weight = 90 },
        @{ Id = 'tertiary'; Url = 'https://me.headysystems.com/brain'; Weight = 80 },
        @{ Id = 'emergency'; Url = 'https://headysystems.com/api/brain'; Weight = 70 }
    )
    
    HealthCheckInterval = switch ($Mode) {
        'monitor' { 30000 }    # 30 seconds
        'strict' { 10000 }     # 10 seconds
        'emergency' { 5000 }   # 5 seconds
    }
    
    AlertThreshold = 95  # Alert if uptime falls below 95%
    RecoveryTimeout = 60000  # 1 minute to consider endpoint recovered
    
    LogFile = "$env:USERPROFILE\.heady\logs\brain-uptime-$(Get-Date -Format 'yyyyMMdd').log"
    ReportFile = "$env:USERPROFILE\.heady\reports\brain-uptime-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    
    SlackWebhook = $env:HEADY_SLACK_WEBHOOK
    EmailSmtp = $env:HEADY_SMTP_SERVER
    EmailTo = $env:HEADY_ALERT_EMAIL
}

# State
$Script:MonitorRunning = $false
$Script:MonitorTimer = $null
$Script:Stats = @{
    StartTime = Get-Date
    TotalChecks = 0
    SuccessfulChecks = 0
    EndpointStats = @{}
    SLA = 100.0
    LastAlert = $null
    Incidents = @()
}

# Initialize endpoint stats
$Config.BrainEndpoints | ForEach-Object { -Parallel {
    $Script:Stats.EndpointStats[$_.Id] = @{
        Url = $_.Url
        Weight = $_.Weight
        SuccessCount = 0
        FailureCount = 0
        LastSuccess = $null
        LastFailure = $null
        CurrentStatus = 'unknown'
        CircuitBreakerOpen = $false
        ResponseTime = @()
    }
}

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = 'INFO'
    )
    
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Ensure log directory exists
    $logDir = Split-Path $Config.LogFile -Parent
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    Add-Content -Path $Config.LogFile -Value $logEntry
    
    # Console output with color
    switch ($Level) {
        'ERROR' { Write-Host $logEntry -ForegroundColor Red }
        'WARN' { Write-Host $logEntry -ForegroundColor Yellow }
        'SUCCESS' { Write-Host $logEntry -ForegroundColor Green }
        default { Write-Host $logEntry -ForegroundColor Gray }
    }
}

function Test-BrainEndpoint {
    param(
        [string]$Url,
        [string]$Id
    )
    
    $startTime = Get-Date
    try {
        $response = Invoke-WebRequest -Uri "$Url/api/health" -TimeoutSec 5 -UseBasicParsing
        $responseTime = (Get-Date) - $startTime
        
        if ($response.StatusCode -eq 200) {
            $Script:Stats.EndpointStats[$Id].SuccessCount++
            $Script:Stats.EndpointStats[$Id].LastSuccess = Get-Date
            $Script:Stats.EndpointStats[$Id].CurrentStatus = 'healthy'
            $Script:Stats.EndpointStats[$Id].ResponseTime += @($responseTime.TotalMilliseconds)
            
            # Keep only last 10 response times
            if ($Script:Stats.EndpointStats[$Id].ResponseTime.Count -gt 10) {
                $Script:Stats.EndpointStats[$Id].ResponseTime = $Script:Stats.EndpointStats[$Id].ResponseTime[-10..-1]
            }
            
            return @{
                Success = $true
                ResponseTime = $responseTime.TotalMilliseconds
                Status = 'healthy'
            }
        }
    } catch {
        $Script:Stats.EndpointStats[$Id].FailureCount++
        $Script:Stats.EndpointStats[$Id].LastFailure = Get-Date
        $Script:Stats.EndpointStats[$Id].CurrentStatus = 'unhealthy'
        
        # Check if circuit breaker should open
        $recentFailures = 0
        $cutoff = (Get-Date).AddMinutes(-5)
        $Script:Stats.Incidents | Where-Object { 
            $_.Endpoint -eq $Id -and $_.Timestamp -gt $cutoff 
        } | ForEach-Object { -Parallel { $recentFailures++ }
        
        if ($recentFailures -ge 3) {
            $Script:Stats.EndpointStats[$Id].CircuitBreakerOpen = $true
            Write-Log "Circuit breaker OPEN for endpoint $Id" -Level 'WARN'
        }
        
        return @{
            Success = $false
            Error = $_.Exception.Message
            Status = 'unhealthy'
        }
    }
}

function Invoke-HealthCheck {
    $Script:Stats.TotalChecks++
    $healthyEndpoints = 0
    $totalWeight = 0
    $availableWeight = 0
    
    Write-Log "Performing health check #$($Script:Stats.TotalChecks)" -Level 'INFO'
    
    foreach ($endpoint in $Config.BrainEndpoints) {
        $result = Test-BrainEndpoint -Url $endpoint.Url -Id $endpoint.Id
        $totalWeight += $endpoint.Weight
        
        if ($result.Success) {
            $healthyEndpoints++
            $availableWeight += $endpoint.Weight
            Write-Log "✓ $($endpoint.Id): $($result.Status) ($([math]::Round($result.ResponseTime, 2))ms)" -Level 'SUCCESS'
        } else {
            Write-Log "✗ $($endpoint.Id): $($result.Status) - $($result.Error)" -Level 'ERROR'
            
            # Record incident
            $incident = @{
                Timestamp = Get-Date
                Endpoint = $endpoint.Id
                Error = $result.Error
                Resolved = $false
            }
            $Script:Stats.Incidents += $incident
        }
    }
    
    # Calculate weighted availability
    $weightedAvailability = if ($totalWeight -gt 0) { ($availableWeight / $totalWeight) * 100 } else { 0 }
    $Script:Stats.SLA = $weightedAvailability
    
    # Check if we need to alert
    if ($weightedAvailability -lt $Config.AlertThreshold) {
        $timeSinceLastAlert = if ($Script:Stats.LastAlert) { 
            (Get-Date) - $Script:Stats.LastAlert 
        } else { [TimeSpan]::FromMinutes(999) }
        
        if ($timeSinceLastAlert.TotalMinutes -gt 5) {
            Send-Alert -Availability $weightedAvailability -HealthyEndpoints $healthyEndpoints
            $Script:Stats.LastAlert = Get-Date
        }
    }
    
    $Script:Stats.SuccessfulChecks++
    
    # Update status
    $status = @{
        Timestamp = Get-Date
        HealthyEndpoints = $healthyEndpoints
        TotalEndpoints = $Config.BrainEndpoints.Count
        Availability = $weightedAvailability
        SLA = $Script:Stats.SLA
    }
    
    Write-Log "Health check complete: $healthyEndpoints/$($Config.BrainEndpoints.Count) endpoints healthy, Availability: $([math]::Round($weightedAvailability, 2))%" -Level 'INFO'
    
    return $status
}

function Send-Alert {
    param(
        [double]$Availability,
        [int]$HealthyEndpoints
    )
    
    $message = "🚨 HeadyBrain Availability Alert: $([math]::Round($Availability, 1))%`nOnly $HealthyEndpoints/$($Config.BrainEndpoints.Count) endpoints are healthy"
    
    Write-Log $message -Level 'ERROR'
    
    # Send to Slack if configured
    if ($Config.SlackWebhook) {
        try {
            $payload = @{
                text = $message
                username = "HeadyBrain Monitor"
                icon_emoji = ":brain:"
                attachments = @(
                    @{
                        color = "danger"
                        fields = @(
                            @{ name = "Availability"; value = "$([math]::Round($Availability, 1))%"; short = $true }
                            @{ name = "Healthy Endpoints"; value = "$HealthyEndpoints/$($Config.BrainEndpoints.Count)"; short = $true }
                            @{ name = "Mode"; value = $Mode; short = $true }
                            @{ name = "Time"; value = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'); short = $true }
                        )
                    }
                )
            } | ConvertTo-Json -Depth 10
            
            Invoke-RestMethod -TimeoutSec 10 -Uri $Config.SlackWebhook -Method Post -Body $payload -ContentType 'application/json'
        } catch {
            Write-Log "Failed to send Slack alert: $($_.Exception.Message)" -Level 'ERROR'
        }
    }
    
    # Send email if configured
    if ($Config.EmailSmtp -and $Config.EmailTo) {
        try {
            Send-MailMessage -SmtpServer $Config.EmailSmtp -To $Config.EmailTo -From "brain-monitor@headysystems.com" -Subject "HeadyBrain Availability Alert" -Body $message -Priority High
        } catch {
            Write-Log "Failed to send email alert: $($_.Exception.Message)" -Level 'ERROR'
        }
    }
}

function Start-Monitor {
    if ($Script:MonitorRunning) {
        Write-Log "Monitor is already running" -Level 'WARN'
        return
    }
    
    Write-Log "Starting HeadyBrain uptime monitor in $Mode mode" -Level 'INFO'
    Write-Log "Health check interval: $($Config.HealthCheckInterval)ms" -Level 'INFO'
    
    $Script:MonitorRunning = $true
    $Script:Stats.StartTime = Get-Date
    
    # Create timer
    $Script:MonitorTimer = New-Object System.Timers.Timer
    $Script:MonitorTimer.Interval = $Config.HealthCheckInterval
    $Script:MonitorTimer.AutoReset = $true
    
    # Define timer action
    $Script:MonitorTimer.Elapsed = {
        Invoke-HealthCheck
    }.GetNewClosure()
    
    # Start timer
    $Script:MonitorTimer.Start()
    
    # Initial health check
    Invoke-HealthCheck
    
    Write-Log "Monitor started successfully" -Level 'SUCCESS'
}

function Stop-Monitor {
    if (-not $Script:MonitorRunning) {
        Write-Log "Monitor is not running" -Level 'WARN'
        return
    }
    
    Write-Log "Stopping HeadyBrain uptime monitor" -Level 'INFO'
    
    if ($Script:MonitorTimer) {
        $Script:MonitorTimer.Stop()
        $Script:MonitorTimer.Dispose()
        $Script:MonitorTimer = $null
    }
    
    $Script:MonitorRunning = $false
    
    Write-Log "Monitor stopped" -Level 'SUCCESS'
}

function Get-Status {
    $uptime = (Get-Date) - $Script:Stats.StartTime
    
    $status = @{
        Running = $Script:MonitorRunning
        Mode = $Mode
        Uptime = $uptime
        TotalChecks = $Script:Stats.TotalChecks
        SuccessfulChecks = $Script:Stats.SuccessfulChecks
        CurrentSLA = $Script:Stats.SLA
        LastAlert = $Script:Stats.LastAlert
        ActiveIncidents = @($Script:Stats.Incidents | Where-Object { -not $_.Resolved }).Count
        Endpoints = @()
    }
    
    foreach ($endpoint in $Config.BrainEndpoints) {
        $stats = $Script:Stats.EndpointStats[$endpoint.Id]
        $avgResponseTime = if ($stats.ResponseTime.Count -gt 0) {
            ($stats.ResponseTime | Measure-Object -Average).Average
        } else { 0 }
        
        $status.Endpoints += @{
            Id = $endpoint.Id
            Url = $endpoint.Url
            Status = $stats.CurrentStatus
            SuccessCount = $stats.SuccessCount
            FailureCount = $stats.FailureCount
            LastSuccess = $stats.LastSuccess
            LastFailure = $stats.LastFailure
            CircuitBreakerOpen = $stats.CircuitBreakerOpen
            AvgResponseTime = $avgResponseTime
        }
    }
    
    return $status
}

function New-Report {
    Write-Log "Generating uptime report" -Level 'INFO'
    
    $report = @{
        GeneratedAt = Get-Date
        Mode = $Mode
        MonitoringPeriod = @{
            Start = $Script:Stats.StartTime
            End = Get-Date
            Duration = (Get-Date) - $Script:Stats.StartTime
        }
        Summary = @{
            TotalChecks = $Script:Stats.TotalChecks
            SuccessfulChecks = $Script:Stats.SuccessfulChecks
            OverallSLA = $Script:Stats.SLA
            Incidents = $Script:Stats.Incidents.Count
        }
        Endpoints = @()
        Incidents = $Script:Stats.Incidents
    }
    
    foreach ($endpoint in $Config.BrainEndpoints) {
        $stats = $Script:Stats.EndpointStats[$endpoint.Id]
        $avgResponseTime = if ($stats.ResponseTime.Count -gt 0) {
            ($stats.ResponseTime | Measure-Object -Average).Average
        } else { 0 }
        
        $report.Endpoints += @{
            Id = $endpoint.Id
            Url = $endpoint.Url
            Weight = $endpoint.Weight
            SuccessCount = $stats.SuccessCount
            FailureCount = $stats.FailureCount
            Availability = if (($stats.SuccessCount + $stats.FailureCount) -gt 0) {
                ($stats.SuccessCount / ($stats.SuccessCount + $stats.FailureCount)) * 100
            } else { 0 }
            AvgResponseTime = $avgResponseTime
            CircuitBreakerTrips = ($Script:Stats.Incidents | Where-Object { $_.Endpoint -eq $endpoint.Id }).Count
        }
    }
    
    # Ensure report directory exists
    $reportDir = Split-Path $Config.ReportFile -Parent
    if (-not (Test-Path $reportDir)) {
        New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
    }
    
    $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $Config.ReportFile
    
    Write-Log "Report saved to: $($Config.ReportFile)" -Level 'SUCCESS'
    
    # Display summary
    Write-Host "`n=== HeadyBrain Uptime Report ===" -ForegroundColor Cyan
    Write-Host "Period: $($report.MonitoringPeriod.Start) to $($report.MonitoringPeriod.End)" -ForegroundColor White
    Write-Host "Overall SLA: $([math]::Round($report.Summary.OverallSLA, 2))%" -ForegroundColor $(if ($report.Summary.OverallSLA -ge 99.9) { 'Green' } else { 'Yellow' })
    Write-Host "Total Checks: $($report.Summary.TotalChecks)" -ForegroundColor White
    Write-Host "Incidents: $($report.Summary.Incidents)" -ForegroundColor $(if ($report.Summary.Incidents -eq 0) { 'Green' } else { 'Red' })
    Write-Host "`nEndpoint Status:" -ForegroundColor White
    
    foreach ($ep in $report.Endpoints) {
        $color = if ($ep.Availability -ge 99) { 'Green' } elseif ($ep.Availability -ge 95) { 'Yellow' } else { 'Red' }
        Write-Host "  $($ep.Id): $([math]::Round($ep.Availability, 2))% ($($ep.SuccessCount)/$($ep.SuccessCount + $ep.FailureCount))" -ForegroundColor $color
    }
    
    return $report
}

function Test-Connectivity {
    Write-Host "Testing HeadyBrain connectivity..." -ForegroundColor Cyan
    
    $results = @()
    
    foreach ($endpoint in $Config.BrainEndpoints) {
        Write-Host "`nTesting $($endpoint.Id)..." -ForegroundColor Yellow
        
        $tests = @()
        for ($i = 1; $i -le 5; $i++) {
            $result = Test-BrainEndpoint -Url $endpoint.Url -Id $endpoint.Id
            $tests += $result
            
            if ($result.Success) {
                Write-Host "  Test $i : ✓ $($result.Status) ($([math]::Round($result.ResponseTime, 2))ms)" -ForegroundColor Green
            } else {
                Write-Host "  Test $i : ✗ $($result.Status)" -ForegroundColor Red
            }
            
            Start-Sleep -Milliseconds 500
        }
        
        $successRate = ($tests | Where-Object { $_.Success }).Count / $tests.Count * 100
        $avgResponse = ($tests | Where-Object { $_.Success } | Measure-Object -Property ResponseTime -Average).Average
        
        $results += @{
            Endpoint = $endpoint.Id
            SuccessRate = $successRate
            AvgResponseTime = $avgResponse
            Status = if ($successRate -ge 80) { 'PASS' } else { 'FAIL' }
        }
    }
    
    Write-Host "`n=== Test Results ===" -ForegroundColor Cyan
    foreach ($result in $results) {
        $color = if ($result.Status -eq 'PASS') { 'Green' } else { 'Red' }
        Write-Host "$($result.Endpoint): $($result.Status) - $([math]::Round($result.SuccessRate, 1))% success, $([math]::Round($result.AvgResponseTime, 2))ms avg" -ForegroundColor $color
    }
    
    return $results
}

# Main execution
switch ($Action) {
    'start' {
        Start-Monitor
        
        # Keep running if not in test mode
        if ($Mode -ne 'test') {
            Write-Host "Press Ctrl+C to stop monitoring..." -ForegroundColor Gray
            try {
                while ($Script:MonitorRunning) {
                    # Start-Sleep -Seconds 1 # REMOVED FOR SPEED
                }
            } finally {
                Stop-Monitor
            }
        }
    }
    
    'stop' {
        Stop-Monitor
    }
    
    'status' {
        $status = Get-Status
        $status | ConvertTo-Json -Depth 10 | Write-Host
    }
    
    'report' {
        New-Report
    }
    
    'test' {
        Test-Connectivity
    }
}
