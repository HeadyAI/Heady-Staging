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
<# ║  FILE: scripts/heady-realtime-monitor.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# Heady Real-Time Monitoring System
# Sub-second updates for complete system visibility

param(
    [switch]$Continuous,
    [int]$UpdateIntervalMs = 500,
    [switch]$Verbose
)

$ErrorActionPreference = 'Stop'

# Real-time state tracking
$script:RealTimeState = @{
    Services = @{}
    Endpoints = @{}
    SystemMetrics = @{}
    Alerts = @()
    LastUpdate = Get-Date
    UpdateCount = 0
}

# WebSocket connections for real-time updates
$script:WebSocketConnections = @()

# Critical services to monitor in real-time
$RealTimeServices = @(
    @{ Name = 'Brain'; Url = 'https://brain.headysystems.com'; Port = 443; Type = 'critical' },
    @{ Name = 'API'; Url = 'https://api.headysystems.com'; Port = 443; Type = 'critical' },
    @{ Name = 'Manager'; Url = 'https://me.headysystems.com'; Port = 443; Type = 'critical' },
    @{ Name = 'Registry'; Url = 'https://registry.headysystems.com'; Port = 443; Type = 'critical' },
    @{ Name = 'Connection'; Url = 'https://api.headyconnection.org'; Port = 443; Type = 'critical' },
    @{ Name = 'Database'; Url = 'https://api.headysystems.com/db'; Port = 443; Type = 'critical' },
    @{ Name = 'Cache'; Url = 'https://api.headysystems.com/cache'; Port = 443; Type = 'important' },
    @{ Name = 'Queue'; Url = 'https://api.headysystems.com/queue'; Port = 443; Type = 'important' }
)

function Get-RealTimeMetrics {
    param($Service)
    
    $metrics = @{
        Timestamp = Get-Date
        ResponseTime = 0
        StatusCode = 0
        Healthy = $false
        Error = $null
        MemoryUsage = 0
        CpuUsage = 0
        ConnectionCount = 0
        QueueDepth = 0
    }
    
    # Ultra-fast health check
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        # Use TCP connection for fastest response
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcpClient.BeginConnect($Service.Url.Split('/')[2], $Service.Port, $null, $null)
        $wait = $asyncResult.AsyncWaitHandle.WaitOne(1000, $false)
        
        if ($wait) {
            $tcpClient.EndConnect($asyncResult)
            $metrics.Healthy = $true
            $metrics.ResponseTime = $stopwatch.ElapsedMilliseconds
            $metrics.StatusCode = 200
            
            # Quick HTTP check for detailed metrics
            try {
                $response = Invoke-WebRequest -Uri "$($Service.Url)/health" -Method GET -TimeoutSec 1 -UseBasicParsing
                $metrics.MemoryUsage = if ($response.Headers['X-Memory-Usage']) { [double]$response.Headers['X-Memory-Usage'] } else { 0 }
                $metrics.CpuUsage = if ($response.Headers['X-CPU-Usage']) { [double]$response.Headers['X-CPU-Usage'] } else { 0 }
                $metrics.ConnectionCount = if ($response.Headers['X-Connections']) { [int]$response.Headers['X-Connections'] } else { 0 }
                $metrics.QueueDepth = if ($response.Headers['X-Queue-Depth']) { [int]$response.Headers['X-Queue-Depth'] } else { 0 }
            } catch {
                # TCP worked but HTTP failed - service is up but not responding fully
                $metrics.Healthy = $true
                $metrics.StatusCode = 503
            }
        } else {
            $metrics.Healthy = $false
            $metrics.Error = "Connection timeout"
            $metrics.ResponseTime = 1000
        }
        
        $tcpClient.Close()
        
    } catch {
        $metrics.Healthy = $false
        $metrics.Error = $_.Exception.Message
        $metrics.ResponseTime = $stopwatch.ElapsedMilliseconds
    }
    
    $stopwatch.Stop()
    return $metrics
}

function Update-RealTimeState {
    $updateStart = Get-Date
    
    # Parallel monitoring for maximum speed
    $jobs = @()
    foreach ($service in $RealTimeServices) {
        $job = Start-Job -ScriptBlock {
            param($Service, $Verbose)
            & {
                $ErrorActionPreference = 'Continue'
                # Import the function in this scope
                function Get-RealTimeMetrics {
                    param($Service)
                    $metrics = @{
                        Timestamp = Get-Date
                        ResponseTime = 0
                        StatusCode = 0
                        Healthy = $false
                        Error = $null
                        MemoryUsage = 0
                        CpuUsage = 0
                        ConnectionCount = 0
                        QueueDepth = 0
                    }
                    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
                    try {
                        $tcpClient = New-Object System.Net.Sockets.TcpClient
                        $asyncResult = $tcpClient.BeginConnect($Service.Url.Split('/')[2], $Service.Port, $null, $null)
                        $wait = $asyncResult.AsyncWaitHandle.WaitOne(1000, $false)
                        if ($wait) {
                            $tcpClient.EndConnect($asyncResult)
                            $metrics.Healthy = $true
                            $metrics.ResponseTime = $stopwatch.ElapsedMilliseconds
                            $metrics.StatusCode = 200
                            try {
                                $response = Invoke-WebRequest -Uri "$($Service.Url)/health" -Method GET -TimeoutSec 1 -UseBasicParsing
                                $metrics.MemoryUsage = if ($response.Headers['X-Memory-Usage']) { [double]$response.Headers['X-Memory-Usage'] } else { 0 }
                                $metrics.CpuUsage = if ($response.Headers['X-CPU-Usage']) { [double]$response.Headers['X-CPU-Usage'] } else { 0 }
                                $metrics.ConnectionCount = if ($response.Headers['X-Connections']) { [int]$response.Headers['X-Connections'] } else { 0 }
                                $metrics.QueueDepth = if ($response.Headers['X-Queue-Depth']) { [int]$response.Headers['X-Queue-Depth'] } else { 0 }
                            } catch { $metrics.StatusCode = 503 }
                        } else {
                            $metrics.Healthy = $false
                            $metrics.Error = "Connection timeout"
                            $metrics.ResponseTime = 1000
                        }
                        $tcpClient.Close()
                    } catch {
                        $metrics.Healthy = $false
                        $metrics.Error = $_.Exception.Message
                        $metrics.ResponseTime = $stopwatch.ElapsedMilliseconds
                    }
                    $stopwatch.Stop()
                    return $metrics
                }
                return Get-RealTimeMetrics -Service $Service
            }
        } -ArgumentList $service, $Verbose
        $jobs += @{ Job = $job; Service = $service }
    }
    
    # Collect results
    foreach ($jobInfo in $jobs) {
        $result = Receive-Job -Job $jobInfo.Job -Wait
        Remove-Job -Job $jobInfo.Job
        
        $serviceName = $jobInfo.Service.Name
        $script:RealTimeState.Services[$serviceName] = $result
        $script:RealTimeState.Endpoints[$serviceName] = @{
            Url = $jobInfo.Service.Url
            Type = $jobInfo.Service.Type
            LastCheck = Get-Date
        }
    }
    
    # Calculate system metrics
    $totalServices = $RealTimeServices.Count
    $healthyServices = ($script:RealTimeState.Services.Values.Where({ $_.Healthy })).Count
    $avgResponseTime = if ($script:RealTimeState.Services.Count -gt 0) { 
        ($script:RealTimeState.Services.Values | Measure-Object -Property ResponseTime -Average).Average 
    } else { 0 }
    
    $script:RealTimeState.SystemMetrics = @{
        HealthScore = [math]::Round(($healthyServices / $totalServices) * 100, 1)
        HealthyServices = $healthyServices
        TotalServices = $totalServices
        AverageResponseTime = [math]::Round($avgResponseTime, 0)
        CriticalServicesDown = ($script:RealTimeState.Services.GetEnumerator().Where({ 
            $_.Value.Type -eq 'critical' -and -not $_.Value.Healthy 
        })).Count
        UpdateLatency = (Get-Date) - $updateStart
    }
    
    $script:RealTimeState.LastUpdate = Get-Date
    $script:RealTimeState.UpdateCount++
    
    # Check for alerts
    if ($script:RealTimeState.SystemMetrics.HealthScore -lt 100) {
        $alert = @{
            Timestamp = Get-Date
            Severity = if ($script:RealTimeState.SystemMetrics.HealthScore -lt 50) { 'critical' } else { 'warning' }
            Message = "System health degraded to $($script:RealTimeState.SystemMetrics.HealthScore)%"
            ServicesDown = $script:RealTimeState.Services.GetEnumerator().Where({ -not $_.Value.Healthy }) | Select-Object -ExpandProperty Key
        }
        $script:RealTimeState.Alert = $alert
    }
}

function Show-RealTimeDashboard {
    Clear-Host
    
    # Header
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    Write-Host "Heady Real-Time Monitoring Dashboard" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "Last Update: $timestamp (Update #$($script:RealTimeState.UpdateCount))" -ForegroundColor Gray
    Write-Host "Update Interval: ${UpdateIntervalMs}ms" -ForegroundColor Gray
    Write-Host ""
    
    # System Overview
    $healthScore = $script:RealTimeState.SystemMetrics.HealthScore
    $healthColor = if ($healthScore -eq 100) { 'Green' } elseif ($healthScore -ge 75) { 'Yellow' } else { 'Red' }
    
    Write-Host "SYSTEM OVERVIEW" -ForegroundColor White
    Write-Host "Health Score: $healthScore%" -ForegroundColor $healthColor
    Write-Host "Services: $($script:RealTimeState.SystemMetrics.HealthyServices)/$($script:RealTimeState.SystemMetrics.TotalServices) healthy" -ForegroundColor $healthColor
    Write-Host "Avg Response: $($script:RealTimeState.SystemMetrics.AverageResponseTime)ms" -ForegroundColor $(if ($script:RealTimeState.SystemMetrics.AverageResponseTime -lt 500) { 'Green' } else { 'Yellow' })
    Write-Host "Update Latency: $($script:RealTimeState.SystemMetrics.UpdateLatency.TotalMilliseconds)ms" -ForegroundColor Gray
    Write-Host ""
    
    # Alert if present
    if ($script:RealTimeState.Alert) {
        $alert = $script:RealTimeState.Alert
        $alertColor = if ($alert.Severity -eq 'critical') { 'Red' } else { 'Yellow' }
        Write-Host "ALERT: $($alert.Message)" -BackgroundColor $alertColor -ForegroundColor White
        Write-Host "Affected: $($alert.ServicesDown -join ', ')" -ForegroundColor $alertColor
        Write-Host ""
    }
    
    # Service Details
    Write-Host "SERVICE STATUS" -ForegroundColor White
    foreach ($service in $RealTimeServices | Sort-Object Type, Name) {
        $metrics = $script:RealTimeState.Services[$service.Name]
        
        if ($metrics) {
            $status = if ($metrics.Healthy) { "✓ UP" } else { "✗ DOWN" }
            $statusColor = if ($metrics.Healthy) { 'Green' } else { 'Red' }
            
            $typeColor = if ($service.Type -eq 'critical') { 'Red' } else { 'Yellow' }
            
            Write-Host "[$($service.Type.ToUpper())] $($service.Name): $status ($($metrics.ResponseTime)ms)" -ForegroundColor $statusColor
            
            if ($Verbose -and $metrics.Healthy) {
                Write-Host "  Memory: $([math]::Round($metrics.MemoryUsage * 100, 1))% | CPU: $([math]::Round($metrics.CpuUsage * 100, 1))% | Connections: $($metrics.ConnectionCount)" -ForegroundColor Gray
            }
            
            if (-not $metrics.Healthy -and $metrics.Error) {
                Write-Host "  Error: $($metrics.Error)" -ForegroundColor Red
            }
        }
    }
    
    Write-Host ""
    Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Gray
}

function Start-RealTimeMonitoring {
    Write-Host "[REALTIME] Starting Heady Real-Time Monitoring System..." -ForegroundColor Cyan
    Write-Host "[REALTIME] Update interval: ${UpdateIntervalMs}ms" -ForegroundColor Cyan
    Write-Host "[REALTIME] Monitoring $($RealTimeServices.Count) services" -ForegroundColor Cyan
    Write-Host ""
    
    if ($Continuous) {
        while ($true) {
            Update-RealTimeState
            Show-RealTimeDashboard
            Start-Sleep -Milliseconds $UpdateIntervalMs
        }
    } else {
        Update-RealTimeState
        Show-RealTimeDashboard
    }
}

# Start monitoring
Start-RealTimeMonitoring
