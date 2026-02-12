# Heady Intelligent Orchestrator
# Coordinates self-awareness, predictive monitoring, and auto-recovery
# Ensures 100% uptime through intelligent automation

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("start", "stop", "status", "emergency")]
    [string]$Action,
    
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

# Orchestrator state
$script:OrchestratorState = @{
    Running = $false
    Services = @{}
    HealthScore = 100
    LastCheck = Get-Date
    EmergencyMode = $false
}

# Service definitions
$Services = @(
    @{
        Name = 'SelfAwareness'
        Script = 'heady-self-awareness.ps1'
        Priority = 1
        Critical = $true
        Args = @('-Continuous', '-CheckIntervalSeconds', '15')
    },
    @{
        Name = 'PredictiveMonitor'
        Script = 'heady-predictive-monitor.ps1'
        Priority = 2
        Critical = $true
        Args = @('-Continuous', '-MonitorInterval', '60')
    },
    @{
        Name = 'BrainRecovery'
        Script = 'brain-recovery-service.ps1'
        Priority = 3
        Critical = $true
        Args = @('-Continuous')
    }
)

function Write-OrchestratorLog {
    param(
        [string]$Message,
        [ValidateSet("info", "warn", "error", "critical", "success")]
        [string]$Level = "info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $prefix = switch ($Level) {
        "info" { "[INFO]" }
        "warn" { "[WARN]" }
        "error" { "[ERROR]" }
        "critical" { "[CRITICAL]" }
        "success" { "[SUCCESS]" }
    }
    
    $color = switch ($Level) {
        "info" { "Green" }
        "warn" { "Yellow" }
        "error" { "Red" }
        "critical" { "White" }
        "success" { "Cyan" }
    }
    
    Write-Host "[$timestamp] $prefix [ORCHESTRATOR] $Message" -ForegroundColor $color
    
    # Log to file
    $logFile = "c:\Users\erich\Heady\logs\orchestrator.log"
    if (!(Test-Path (Split-Path $logFile))) {
        New-Item -ItemType Directory -Path (Split-Path $logFile) -Force | Out-Null
    }
    Add-Content -Path $logFile -Value "[$timestamp] $Level $Message"
}

function Start-Service {
    param($Service)
    
    Write-OrchestratorLog "Starting service: $($Service.Name)" -Level info
    
    try {
        $scriptPath = "c:\Users\erich\Heady\scripts\$($Service.Script)"
        
        $job = Start-Job -ScriptBlock {
            param($ScriptPath, $Args)
            & $ScriptPath @Args
        } -ArgumentList $scriptPath, $Service.Args
        
        $script:OrchestratorState.Services[$Service.Name] = @{
            Job = $job
            Status = 'Running'
            StartTime = Get-Date
            Priority = $Service.Priority
            Critical = $Service.Critical
        }
        
        Write-OrchestratorLog "✓ Service started: $($Service.Name)" -Level success
        return $true
        
    } catch {
        Write-OrchestratorLog "✗ Failed to start service: $($Service.Name) - $($_.Exception.Message)" -Level error
        return $false
    }
}

function Stop-Service {
    param($ServiceName)
    
    if ($script:OrchestratorState.Services.ContainsKey($ServiceName)) {
        $service = $script:OrchestratorState.Services[$ServiceName]
        
        Write-OrchestratorLog "Stopping service: $ServiceName" -Level info
        
        try {
            $service.Job.StopJob()
            $service.Job | Remove-Job -Force
            $script:OrchestratorState.Services.Remove($ServiceName)
            Write-OrchestratorLog "✓ Service stopped: $ServiceName" -Level success
        } catch {
            Write-OrchestratorLog "✗ Failed to stop service: $ServiceName" -Level error
        }
    }
}

function Get-SystemHealthScore {
    $totalServices = $Services.Count
    $runningServices = $script:OrchestratorState.Services.Values.Where({ $_.Status -eq 'Running' }).Count
    
    $baseScore = ($runningServices / $totalServices) * 100
    
    # Check if critical services are running
    $criticalServices = $Services.Where({ $_.Critical })
    $runningCritical = 0
    
    foreach ($critical in $criticalServices) {
        if ($script:OrchestratorState.Services.ContainsKey($critical.Name) -and 
            $script:OrchestratorState.Services[$critical.Name].Status -eq 'Running') {
            $runningCritical++
        }
    }
    
    if ($runningCritical -lt $criticalServices.Count) {
        $baseScore = $baseScore * 0.5  # 50% penalty for missing critical services
    }
    
    return [math]::Round($baseScore, 0)
}

function Start-IntelligentOrchestrator {
    Write-OrchestratorLog "Starting Heady Intelligent Orchestrator..." -Level info
    Write-OrchestratorLog "Mission: Ensure 100% uptime through intelligent automation" -Level info
    
    # Start services in priority order
    foreach ($service in $Services | Sort-Object Priority) {
        if (-not (Start-Service -Service $service)) {
            if ($service.Critical) {
                Write-OrchestratorLog "CRITICAL: Failed to start critical service $($service.Name)" -Level critical
                if (-not $Force) {
                    Write-OrchestratorLog "Aborting startup due to critical service failure" -Level error
                    return
                }
            }
        }
        # Start-Sleep -Seconds 1 # REMOVED FOR SPEED  # Stagger startups
    }
    
    $script:OrchestratorState.Running = $true
    Write-OrchestratorLog "✓ Orchestrator started with $($script:OrchestratorState.Services.Count) services" -Level success
    
    # Monitor loop
    while ($script:OrchestratorState.Running) {
        # Start-Sleep -Seconds 1 # REMOVED FOR SPEED0
        
        # Check service health
        foreach ($serviceName in $script:OrchestratorState.Services.Keys) {
            $service = $script:OrchestratorState.Services[$serviceName]
            
            if ($service.Job.State -eq 'Failed' -or $service.Job.State -eq 'Stopped') {
                Write-OrchestratorLog "Service $serviceName failed - restarting..." -Level warn
                Stop-Service -ServiceName $serviceName
                
                $serviceDef = $Services.Where({ $_.Name -eq $serviceName }) | Select-Object -First 1
                if ($serviceDef) {
                    Start-Service -Service $serviceDef
                }
            }
        }
        
        # Update health score
        $script:OrchestratorState.HealthScore = Get-SystemHealthScore
        $script:OrchestratorState.LastCheck = Get-Date
        
        if ($script:OrchestratorState.HealthScore -lt 100) {
            Write-OrchestratorLog "Health score: $($script:OrchestratorState.HealthScore)% - System degraded" -Level warn
        }
        
        # Emergency mode check
        if ($script:OrchestratorState.HealthScore -lt 50 -and -not $script:OrchestratorState.EmergencyMode) {
            Write-OrchestratorLog "HEALTH SCORE CRITICAL - ENTERING EMERGENCY MODE" -Level critical
            $script:OrchestratorState.EmergencyMode = $true
            
            # Trigger emergency actions
            & "c:\Users\erich\Heady\scripts\heady-self-awareness.ps1" -AggressiveMode -Continuous
        }
    }
}

function Stop-IntelligentOrchestrator {
    Write-OrchestratorLog "Stopping Heady Intelligent Orchestrator..." -Level info
    
    $script:OrchestratorState.Running = $false
    
    foreach ($serviceName in $script:OrchestratorState.Services.Keys) {
        Stop-Service -ServiceName $serviceName
    }
    
    Write-OrchestratorLog "✓ Orchestrator stopped" -Level success
}

function Get-OrchestratorStatus {
    Write-Host "Heady Intelligent Orchestrator Status" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Running: $($script:OrchestratorState.Running)" -ForegroundColor $(if ($script:OrchestratorState.Running) { 'Green' } else { 'Red' })
    Write-Host "Health Score: $($script:OrchestratorState.HealthScore)%" -ForegroundColor $(if ($script:OrchestratorState.HealthScore -eq 100) { 'Green' } else { 'Yellow' })
    Write-Host "Last Check: $($script:OrchestratorState.LastCheck)" -ForegroundColor Gray
    Write-Host "Emergency Mode: $($script:OrchestratorState.EmergencyMode)" -ForegroundColor $(if ($script:OrchestratorState.EmergencyMode) { 'Red' } else { 'Green' })
    Write-Host ""
    
    Write-Host "Services:" -ForegroundColor Cyan
    foreach ($service in $script:OrchestratorState.Services.GetEnumerator()) {
        $status = $service.Value.Status
        $priority = $service.Value.Priority
        $critical = if ($service.Value.Critical) { ' (CRITICAL)' } else { '' }
        
        Write-Host "  $($service.Key): $status [Priority: $priority]$critical" -ForegroundColor $(if ($status -eq 'Running') { 'Green' } else { 'Red' })
    }
}

# Main execution
switch ($Action) {
    'start' {
        Start-IntelligentOrchestrator
    }
    'stop' {
        Stop-IntelligentOrchestrator
    }
    'status' {
        Get-OrchestratorStatus
    }
    'emergency' {
        Write-OrchestratorLog "EMERGENCY ACTIVATED" -Level critical
        $script:OrchestratorState.EmergencyMode = $true
        & "c:\Users\erich\Heady\scripts\heady-self-awareness.ps1" -AggressiveMode -Continuous
    }
}
