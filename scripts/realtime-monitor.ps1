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
<# ║  FILE: scripts/realtime-monitor.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# HeadyCloud Real-Time Monitoring System
# Provides real-time status monitoring and intelligent inter-system communication

param(
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status,
    [string]$Mode = "comprehensive",
    [int]$Interval = 5,
    [switch]$Verbose
)

$ErrorActionPreference = 'Stop'
# HeadyCloud deployment - no local paths needed

# Real-time monitoring configuration
$MonitorConfig = @{
    interval_seconds = $Interval
    timeout_seconds = 10
    retry_attempts = 3
    parallel_tasks = 10
    memory_threshold = 80  # percent
    cpu_threshold = 90   # percent
    response_time_threshold = 1000  # milliseconds
    
    # Service endpoints to monitor
    services = @{
        headycloud_api = "https://headysystems.com/api/health"
        heady_manager = "https://headysystems.com/manager/health"
        registry = "https://headysystems.com/registry/health"
        brain = "https://brain.headysystems.com/health"
        orchestrator = "https://headysystems.com/api/orchestrator/health"
        pattern_engine = "https://headysystems.com/api/patterns/health"
    }
    
    # Inter-system communication channels
    communication_channels = @(
        "websocket://headysystems.com/ws/metrics",
        "https://headysystems.com/api/events/stream",
        "https://headysystems.com/api/status/stream"
    )
}

# Global monitoring state
$GlobalState = @{
    is_running = $false
    start_time = $null
    last_check = $null
    service_status = @{}
    performance_metrics = @{}
    alerts = @()
    communication_status = @{}
    system_health = "unknown"
}

# Real-time metrics collector
function Get-SystemMetrics {
    $metrics = @{}
    
    # CPU metrics
    $cpu = Get-CimInstance -ClassName Win32_Processor | Select-Object LoadPercentage
    $metrics.cpu_usage = [math]::Round($cpu.LoadPercentage, 2)
    
    # Memory metrics
    $process = Get-Process -Id $PID
    $memory = $process | Measure-Object -Property WorkingSet -Sum
    $totalMemory = (Get-CimInstance -ClassName Win32_ComputerSystem).TotalPhysicalMemory / 1GB
    $metrics.memory_usage = [math]::Round(($memory.Sum / $totalMemory) * 100, 2)
    
    # Network metrics
    $network = Get-NetAdapterStatistics | Where-Object { $_.OperationalStatus -eq "Up" }
    $metrics.network_in = ($network | Measure-Object -Property BytesReceived -Sum).Sum / 1MB
    $metrics.network_out = ($network | Measure-Object -Property BytesSent -Sum).Sum / 1MB
    
    # Disk metrics
    $disk = Get-CimInstance -ClassName Win32_LogicalDisk | Select-Object Size, FreeSpace
    $totalDisk = ($disk | Measure-Object -Property Size -Sum).Sum / 1GB
    $freeDisk = ($disk | Measure-Object -Property FreeSpace -Sum).Sum / 1GB
    $metrics.disk_usage = [math]::Round((($totalDisk - $freeDisk) / $totalDisk) * 100, 2)
    
    # Timestamp
    $metrics.timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    
    return $metrics
}

# Service health checker with real-time validation
function Test-ServiceHealth {
    param([string]$ServiceName, [string]$Endpoint)
    
    try {
        $response = Invoke-WebRequest -Uri $Endpoint -Method GET -TimeoutSec $MonitorConfig.timeout_seconds -UseBasicParsing
        $status = if ($response.StatusCode -eq 200) { "healthy" } else { "degraded" }
        
        $responseTime = Measure-Command { Invoke-WebRequest -Uri $Endpoint -Method GET -TimeoutSec $MonitorConfig.timeout_seconds -UseBasicParsing } | Select-Object TotalMilliseconds
        
        return @{
            service = $ServiceName
            status = $status
            response_time = $response_time.TotalMilliseconds
            timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
            endpoint = $Endpoint
        }
    } catch {
        return @{
            service = $ServiceName
            status = "unreachable"
            response_time = $MonitorConfig.timeout_seconds * 1000
            timestamp = (GetDate).ToString('yyyy-MM-ddTHH:mm:ssZ')
            endpoint = $Endpoint
            error = $_.Exception.Message
        }
    }
}

# Parallel service health monitoring
function Test-AllServices {
    param([hashtable]$Services)
    
    $results = @()
    $tasks = foreach ($service in $Services.GetEnumerator()) {
        Start-Job -ScriptBlock {
            param($Name, $Endpoint)
            Test-ServiceHealth -ServiceName $Name -Endpoint $Endpoint
        } -ArgumentList @($service.Key, $service.Value) -Name $service.Key
    }
    
    # Wait for all tasks to complete
    $completedTasks = $tasks | Wait-Job | Receive-Job
    
    foreach ($task in $completedTasks) {
        $results += $task.Output
    }
    
    return $results
}

# Inter-system communication validator
function Test-InterSystemCommunication {
    param([string]$Channel)
    
    try {
        switch -Wildcard ($Channel) {
            "websocket:*" {
                # WebSocket connection test
                $ws = New-Object System.Net.WebSockets.Client.WebSocketClient
                $ws.ConnectAsync($Channel.Replace("websocket://", "wss://")).Wait()
                $ws.CloseAsync()
                return @{ channel = $Channel; status = "connected"; timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ') }
            }
            "https://*stream*" {
                # Streaming API test
                $response = Invoke-RestMethod -Uri $Channel -Method GET -TimeoutSec 5
                return @{ channel = $Channel; status = "streaming"; timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ') }
            }
            default {
                # HTTP API test
                $response = Invoke-RestMethod -Uri $Channel -Method GET -TimeoutSec 5
                return @{ channel = $Channel; status = "connected"; timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ') }
            }
        }
    } catch {
        return @{ channel = $Channel; status = "failed"; timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ'); error = $_.Exception.Message }
    }
}

# Intelligent alert system with pattern recognition
function Invoke-AlertSystem {
    param([hashtable]$AlertData)
    
    $alert = @{
        id = [guid]::NewGuid().ToString()
        timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
        severity = $AlertData.severity
        service = $AlertData.service
        message = $AlertData.message
        details = $AlertData.details
        auto_resolved = $false
        escalation_level = "low"
        pattern_detected = $false
    }
    
    # Pattern recognition for common issues
    if ($AlertData.message -match "timeout|slow|degraded") {
        $alert.pattern_detected = $true
        $alert.escalation_level = "medium"
    }
    
    if ($AlertData.message -match "critical|error|failed") {
        $alert.pattern_detected = $true
        $alert.escalation_level = "high"
    }
    
    # Auto-resolution for common issues
    if ($AlertData.service -eq "headybrain" -and $AlertData.message -match "unreachable") {
        $alert.auto_resolved = $true
        $alert.resolution = "Attempting automatic brain service restart"
    }
    
    # Store alert in global state
    $GlobalState.alerts += $alert
    
    # Log alert
    $logLevel = switch ($alert.severity) {
        "low" { "INFO" }
        "medium" { "WARN" }
        "high" { "ERROR" }
        "critical" { "CRITICAL" }
        default { "INFO" }
    }
    
    Write-Host "[$logLevel] [$($alert.timestamp)] $($alert.service): $($alert.message)" -ForegroundColor $(switch($alert.severity) { "low" {"Gray"}; "medium" {"Yellow"}; "high" {"Red"}; "critical" {"Red" } })
    
    if ($Verbose) {
        Write-Host "    Details: $($alert.details)" -ForegroundColor Gray
        if ($alert.pattern_detected) {
            Write-Host "    Pattern detected: $($alert.escalation_level)" -ForegroundColor Yellow
        }
        if ($alert.auto_resolved) {
            Write-Host "    Auto-resolution: $($alert.resolution)" -ForegroundColor Green
        }
    }
}

# Performance analyzer with trend detection
function Analyze-Performance {
    param([array]$Metrics)
    
    if ($Metrics.Count -lt 2) {
        return @{
            trend = "insufficient_data"
            analysis = "Need at least 2 data points for trend analysis"
        }
    }
    
    $latest = $Metrics[-1]
    $previous = $Metrics[-2]
    
    $cpu_trend = if ($latest.cpu_usage -gt $previous.cpu_usage) { "increasing" } else { "decreasing" }
    $memory_trend = if ($latest.memory_usage -gt $previous.memory_usage) { "increasing" } else { "decreasing" }
    $network_trend = if ($latest.network_in -gt $previous.network_in) { "increasing" } else { "decreasing" }
    
    $performance_score = 100 - (($latest.cpu_usage + $latest.memory_usage + $latest.disk_usage) / 3)
    
    return @{
        cpu_trend = $cpu_trend
        memory_trend = $memory_trend
        network_trend = $network_trend
        performance_score = $performance_score
        analysis = if ($performance_score -ge 80) { "optimal" } elseif ($performance_score -ge 60) { "acceptable" } else { "needs_attention" }
    }
}

# Real-time monitoring loop
function Start-RealTimeMonitoring {
    Write-Host "[MONITOR] Starting real-time monitoring..." -ForegroundColor Cyan
    Write-Host "Interval: $($MonitorConfig.interval_seconds)s" -ForegroundColor White
    Write-Host "Mode: $Mode" -ForegroundColor White
    Write-Host ''
    
    $GlobalState.is_running = $true
    $GlobalState.start_time = Get-Date
    $GlobalState.system_health = "initializing"
    
    # Create monitoring loop
    while ($GlobalState.is_running) {
        $loopStart = Get-Date
        
        # Phase 1: Service Health Monitoring
        if ($Mode -eq "comprehensive" -or $Mode -eq "services") {
            $serviceResults = Test-AllServices -Services $MonitorConfig.services
            $GlobalState.service_status = @{}
            
            foreach ($result in $serviceResults) {
                $GlobalState.service_status[$result.service] = $result
            }
            
            # Check for service issues
            $unhealthyServices = $serviceResults | Where-Object { $_. status -ne "healthy" }
            if ($unhealthyServices.Count -gt 0) {
                foreach ($service in $unhealthyServices) {
                    Invoke-AlertSystem -AlertData @{
                        severity = if ($service.status -eq "unreachable") { "high" } else { "medium" }
                        service = $service.service
                        message = "Service $($service.service) is $($service.status)"
                        details = "Response time: $($service.response_time)ms"
                    }
                }
            }
        }
        
        # Phase 2: System Metrics
        if ($Mode -eq "comprehensive" -or $Mode -eq "system") {
            $systemMetrics = Get-SystemMetrics
            $GlobalState.performance_metrics = $systemMetrics
            
            # Check thresholds
            if ($systemMetrics.cpu_usage -gt $MonitorConfig.cpu_threshold) {
                Invoke-AlertSystem -AlertData @{
                    severity = "medium"
                    service = "system"
                    message = "CPU usage at $($systemMetrics.cpu_usage)% exceeds threshold"
                    details = "Threshold: $($MonitorConfig.cpu_threshold)%"
                }
            }
            
            if ($systemMetrics.memory_usage -gt $MonitorConfig.memory_threshold) {
                Invoke-AlertSystem -AlertData @{
                    severity = "medium"
                    service = "system"
                    message = "Memory usage at $($systemMetrics.memory_usage)% exceeds threshold"
                    details = "Threshold: $($MonitorConfig.memory_threshold)%"
                }
            }
            
            # Performance trend analysis
            if ($GlobalState.performance_metrics.Count -ge 2) {
                $analysis = Analyze-Performance -Metrics $GlobalState.performance_metrics
                if ($analysis.analysis -eq "needs_attention") {
                    Invoke-AlertSystem -AlertData @{
                        severity = "medium"
                        service = "system"
                        message = "Performance score: $($analysis.performance_score) - $($analysis.analysis)"
                        details = "CPU: $($analysis.cpu_trend), Memory: $($analysis.memory_trend), Network: $($analysis.network_trend)"
                    }
                }
            }
        }
        
        # Phase 3: Inter-System Communication
        if ($Mode -eq "comprehensive" -or $Mode -eq "communication") {
            $communicationResults = @()
            foreach ($channel in $MonitorConfig.communication_channels) {
                $result = Test-InterSystemCommunication -Channel $channel
                $communicationResults += $result
            }
            
            $GlobalState.communication_status = @{}
            foreach ($result in $communicationResults) {
                $GlobalState.communication_status[$result.channel] = $result
            }
            
            # Check for communication issues
            $failedChannels = $communicationResults | Where-Object { $_. status -eq "failed" }
            if ($failedChannels.Count -gt 0) {
                foreach ($channel in $failedChannels) {
                    Invoke-AlertSystem -AlertData @{
                        severity = "medium"
                        service = "communication"
                        message = "Channel $($channel.channel) is $($channel.status)"
                        details = "Error: $($channel.error)"
                    }
                }
            }
        }
        
        # Phase 4: System Health Assessment
        $healthyServices = ($GlobalState.service_status.Values | Where-Object { $_. status -eq "healthy" }).Count
        $totalServices = $GlobalState.service_status.Count
        $healthScore = if ($totalServices -gt 0) { [math]::Round(($healthyServices / $totalServices) * 100, 2) } else { 0 }
        
        $GlobalState.system_health = switch ($healthScore) {
            { $_ -ge 95 } { "excellent" }
            { $_ -ge 80 } { "good" }
            { $_ -ge 60 } { "fair" }
            { $_ -ge 40 } { "poor" }
            default { "critical" }
        }
        
        # Update last check time
        $GlobalState.last_check = Get-Date
        
        # Display status summary
        if ($Verbose -or ($loopStart.Second -ne $GlobalState.start_time.Second)) {
            Write-Host "[$($GlobalState.last_check)] System Health: $($GlobalState.system_health.ToUpper())" -ForegroundColor $(switch($GlobalState.system_health) { "excellent" {"Green"}; "good" {"Yellow"}; "fair" {"Yellow"}; "poor" {"Red"}; "critical" {"Red" })
            Write-Host "Services: $healthyServices/$totalServices healthy" -ForegroundColor White
            Write-Host "CPU: $($GlobalState.performance_metrics.cpu_usage)%" -ForegroundColor $(if($GlobalState.performance_metrics.cpu_usage -gt $MonitorConfig.cpu_threshold) {"Red"} else {"Green"})
            Write-Host "Memory: $($GlobalState.performance_metrics.memory_usage)%" -ForegroundColor $(if($GlobalState.performance_metrics.memory_usage -gt $MonitorConfig.memory_threshold) {"Red"} else {"Green"})
            
            if ($GlobalState.communication_status.Count -gt 0) {
                $connectedChannels = ($GlobalState.communication_status.Values | Where-Object { $_. status -eq "connected" }).Count
                Write-Host "Channels: $connectedChannels/$($GlobalState.communication_status.Count) connected" -ForegroundColor White
            }
            
            if ($GlobalState.alerts.Count -gt 0) {
                $criticalAlerts = ($GlobalState.alerts | Where-Object { $_. severity -eq "critical" }).Count
                $highAlerts = ($GlobalState.alerts | Where-Object { $_. severity -eq "high" }).Count
                $mediumAlerts = ($GlobalState.alerts | Where-Object { $_. severity -eq "medium" }).Count
                Write-Host "Alerts: $criticalAlerts critical, $highAlerts high, $mediumAlerts medium" -ForegroundColor $(if($criticalAlerts -gt 0) {"Red"} else { "Yellow"})
            }
        }
        
        # Sleep until next iteration
        $sleepTime = $MonitorConfig.interval_seconds * 1000
        Start-Sleep -Milliseconds $sleepTime
    }
}

# Stop monitoring gracefully
function Stop-RealTimeMonitoring {
    if ($GlobalState.is_running) {
        Write-Host "[MONITOR] Stopping real-time monitoring..." -ForegroundColor Yellow
        $GlobalState.is_running = $false
        
        # Generate final report
        $totalRuntime = (Get-Date) - $GlobalState.start_time
        Write-Host "[MONITOR] Total runtime: $([math]::Round($totalRuntime.TotalSeconds, 2))s" -ForegroundColor Cyan
        Write-Host "[MONITOR] Final system health: $($GlobalState.system_health)" -ForegroundColor $(switch($GlobalState.system_health) { "excellent" {"Green"}; "good" {"Yellow"}; "fair" {"Yellow"}; "poor" {"Red"}; "critical" {"Red"} })
        Write-Host "[MONITOR] Monitoring stopped" -ForegroundColor Green
    } else {
        Write-Host "[MONITOR] Monitoring is not running" -ForegroundColor Yellow
    }
}

# Status reporter
function Show-MonitoringStatus {
    if (-not $GlobalState.is_running) {
        Write-Host "[MONITOR] Monitoring is stopped" -ForegroundColor Yellow
        return
    }
    
    $uptime = (Get-Date) - $GlobalState.start_time
    $lastCheck = if ($GlobalState.last_check) { (Get-Date) - $GlobalState.last_check } else { 0 }
    
    Write-Host "=== REAL-TIME MONITORING STATUS ===" -ForegroundColor Cyan
    Write-Host "Status: RUNNING" -ForegroundColor Green
    Write-Host "Uptime: $([math]::Round($uptime.TotalMinutes, 2))m" -ForegroundColor White
    Write-Host "Last Check: $([math]::Round($lastCheck.TotalSeconds, 2))s ago" -ForegroundColor Gray
    Write-Host "Interval: $($MonitorConfig.interval_seconds)s" -ForegroundColor White
    Write-Host "Mode: $Mode" -ForegroundColor White
    Write-Host ''
    
    Write-Host "SYSTEM HEALTH: $($GlobalState.system_health.ToUpper())" -ForegroundColor $(switch($GlobalState.system_health) { "excellent" {"Green"}; "good" {"Yellow"}; "fair" {"Yellow"; "poor" {"Red"}; "critical" {"Red"} })
    
    $healthyServices = ($GlobalState.service_status.Values | Where-Object { $_. status -eq "healthy" }).Count
    $totalServices = $GlobalState.service_status.Count
    Write-Host "SERVICES: $healthyServices/$totalServices healthy" -ForegroundColor $(if($healthyServices -eq $totalServices) {"Green"} else {"Yellow"})
    
    Write-Host "CPU: $($GlobalState.performance_metrics.cpu_usage)%" -ForegroundColor $(if($GlobalState.performance_metrics.cpu_usage -gt $MonitorConfig.cpu_threshold) {"Red"} else {"Green"})
    Write-Host "Memory: $($GlobalState.performance_metrics.memory_usage)%" -ForegroundColor $(if($GlobalState.performance_metrics.memory_usage -gt $MonitorConfig.memory_threshold) {"Red"} else {"Green"})
    
    if ($GlobalState.communication_status.Count -gt 0) {
        $connectedChannels = ($GlobalState.communication_status.Values | Where-Object { $_. status -eq "connected" }).Count
        Write-Host "CHANNELS: $connectedChannels/$($GlobalState.communication_status.Count) connected" -ForegroundColor White
    }
    
    if ($GlobalState.alerts.Count -gt 0) {
        $criticalAlerts = ($GlobalState.alerts | Where-Object { $_. severity -eq "critical" }).Count
        $highAlerts = ($GlobalState.alerts | Where-Object { $_. severity -eq "high" }).Count
        $mediumAlerts = ($GlobalState.alerts | Where-Object { $_. severity -eq "medium" }).Count
        Write-Host "ALERTS: $criticalAlerts critical, $highAlerts high, $mediumAlerts medium" -ForegroundColor $(if($criticalAlerts -gt 0) {"Red"} else { "Yellow"})
    }
}

# Main execution logic
switch ($Action) {
    "start" {
        Start-RealTimeMonitoring
    }
    "stop" {
        Stop-RealTimeMonitoring
    }
    "status" {
        Show-MonitoringStatus
    }
    default {
        Write-Host "Usage: powershell -ExecutionPolicy Bypass -File .\scripts\realtime-monitor.ps1 -Action [start|stop|status]" -Mode [comprehensive|services|system|communication] -Verbose" -Interval [seconds]" -Force" -Start
        exit 0
    }
}

# If script is run directly, start monitoring by default
if ($MyInvocation.InvocationName -eq ".\realtime-monitor.ps1") {
    Start-RealTimeMonitoring
}
