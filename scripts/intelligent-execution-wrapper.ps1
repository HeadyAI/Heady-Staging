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
<# ║  FILE: scripts/intelligent-execution-wrapper.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# Intelligent Execution Wrapper
# Ensures optimal memory scanning before any task execution

param(
    [Parameter(Mandatory=$true)]
    [string]$TaskScript,
    
    [string]$TaskType = "auto",
    [string]$Complexity = "adaptive",
    [hashtable]$TaskParams = @{},
    [switch]$ForceMemoryScan,
    [switch]$RealTimeMonitoring
)

$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\erich\Heady'

Write-Host 'Intelligent Execution Wrapper' -ForegroundColor Cyan
Write-Host '============================' -ForegroundColor Cyan
Write-Host "Task: $TaskScript" -ForegroundColor White
Write-Host "Type: $TaskType" -ForegroundColor White
Write-Host "Complexity: $Complexity" -ForegroundColor White
Write-Host ''

# Phase 1: Pre-Execution Memory Scan
Write-Host '[PHASE 1] Pre-Execution Memory Scan' -ForegroundColor Yellow
Write-Host '--------------------------------' -ForegroundColor Yellow

$scanParams = @{
    TaskType = $TaskType
    Complexity = $Complexity
}

if ($ForceMemoryScan) { $scanParams.ForceScan = $true }
if ($RealTimeMonitoring) { $scanParams.RealTime = $true }

try {
    & ".\scripts\pre-execution-memory-scanner.ps1" @scanParams
    
    # Load execution readiness
    $readiness = Get-Content ".heady-memory/execution_readiness.json" | ConvertFrom-Json
    
    if (-not $readiness.system_ready) {
        Write-Host '[FAIL] System not ready for execution' -ForegroundColor Red
        exit 1
    }
    
    Write-Host '[OK] Memory scan completed successfully' -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Memory scan failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Phase 2: Load Optimizations
Write-Host ''
Write-Host '[PHASE 2] Loading Optimizations' -ForegroundColor Yellow
Write-Host '-------------------------------' -ForegroundColor Yellow

$optimizations = @()
if (Test-Path ".heady-memory/cache/task_optimizations.json") {
    $optimizations = Get-Content ".heady-memory/cache/task_optimizations.json" | ConvertFrom-Json
    Write-Host "Loaded $($optimizations.Count) optimizations" -ForegroundColor Green
}

# Phase 3: Adaptive Task Configuration
Write-Host ''
Write-Host '[PHASE 3] Adaptive Task Configuration' -ForegroundColor Yellow
Write-Host '-----------------------------------' -ForegroundColor Yellow

$adaptiveConfig = @{
    parallel_execution = $false
    memory_optimized = $false
    cloud_offload = $false
    pattern_based = $false
}

foreach ($opt in $optimizations) {
    switch ($opt.type) {
        "parallel_execution" { 
            $adaptiveConfig.parallel_execution = $true
            Write-Host "  Enabling: Parallel execution" -ForegroundColor Cyan
        }
        "memory_intensive" { 
            $adaptiveConfig.memory_optimized = $true
            Write-Host "  Enabling: Memory optimization" -ForegroundColor Cyan
        }
        "cloud_offload" { 
            $adaptiveConfig.cloud_offload = $true
            Write-Host "  Enabling: Cloud offload" -ForegroundColor Cyan
        }
        "pattern_based" { 
            $adaptiveConfig.pattern_based = $true
            Write-Host "  Enabling: Pattern-based optimization" -ForegroundColor Cyan
        }
    }
}

# Add adaptive config to task parameters
$TaskParams.adaptive_config = $adaptiveConfig
$TaskParams.memory_state = $readiness

# Phase 4: HeadyCloud Integration
Write-Host ''
Write-Host '[PHASE 4] HeadyCloud Integration' -ForegroundColor Yellow
Write-Host '------------------------------' -ForegroundColor Yellow

if ($readiness.headycloud_connected) {
    try {
        # Register task with HeadyCloud
        $taskRegistration = @{
            task_script = $TaskScript
            task_type = $TaskType
            complexity = $Complexity
            adaptive_config = $adaptiveConfig
            timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
        }
        
        $regPayload = $taskRegistration | ConvertTo-Json -Depth 10 -Compress
        $response = Invoke-RestMethod -Uri "https://headysystems.com/api/tasks/register" -Method POST -Body $regPayload -ContentType "application/json" -TimeoutSec 10
        
        Write-Host "[OK] Task registered with HeadyCloud" -ForegroundColor Green
        $TaskId = $response.task_id
    } catch {
        Write-Host "[WARN] HeadyCloud registration failed, proceeding locally" -ForegroundColor Yellow
        $TaskId = "local-$(Get-Random)"
    }
} else {
    Write-Host "[INFO] HeadyCloud not available, using local execution" -ForegroundColor Yellow
    $TaskId = "local-$(Get-Random)"
}

# Phase 5: Execute Task with Intelligence
Write-Host ''
Write-Host '[PHASE 5] Intelligent Task Execution' -ForegroundColor Yellow
Write-Host '-----------------------------------' -ForegroundColor Yellow

$executionStart = Get-Date
$taskSuccess = $false

try {
    Write-Host "Executing: $TaskScript" -ForegroundColor Blue
    Write-Host "Task ID: $TaskId" -ForegroundColor White
    Write-Host "Optimizations: $($optimizations.Count)" -ForegroundColor White
    Write-Host ''
    
    # Execute the task with enhanced parameters
    if (Test-Path $TaskScript) {
        if ($TaskParams.Count -gt 0) {
            # Execute with parameters
            $taskSuccess = & $TaskScript @TaskParams
        } else {
            # Execute without parameters
            $taskSuccess = & $TaskScript
        }
        
        Write-Host "[OK] Task completed successfully" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Task script not found: $TaskScript" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Task execution failed: $($_.Exception.Message)" -ForegroundColor Red
    $taskSuccess = $false
} finally {
    $executionEnd = Get-Date
    $executionDuration = $executionEnd - $executionStart
}

# Phase 6: Post-Execution Learning
Write-Host ''
Write-Host '[PHASE 6] Post-Execution Learning' -ForegroundColor Yellow
Write-Host '--------------------------------' -ForegroundColor Yellow

$executionResult = @{
    task_id = $TaskId
    task_script = $TaskScript
    task_type = $TaskType
    complexity = $Complexity
    success = $taskSuccess
    start_time = $executionStart.ToString('yyyy-MM-ddTHH:mm:ssZ')
    end_time = $executionEnd.ToString('yyyy-MM-ddTHH:mm:ssZ')
    duration_ms = $executionDuration.TotalMilliseconds
    optimizations_used = $optimizations.Count
    adaptive_config = $adaptiveConfig
    memory_state = $readiness
}

# Store execution result for learning
$executionResult | ConvertTo-Json -Depth 10 | Set-Content ".heady-memory/execution_history/$TaskId.json"

# Update patterns based on execution
if ($taskSuccess) {
    Write-Host "[LEARN] Task succeeded, updating success patterns" -ForegroundColor Green
    
    # Update success patterns
    $successPatterns = @()
    if (Test-Path ".heady-memory/success_patterns.json") {
        $successPatterns = Get-Content ".heady-memory/success_patterns.json" | ConvertFrom-Json
    }
    
    $successPatterns += @{
        task_type = $TaskType
        complexity = $Complexity
        optimizations = $optimizations
        duration_ms = $executionDuration.TotalMilliseconds
        timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    }
    
    # Keep only last 100 patterns
    if ($successPatterns.Count -gt 100) {
        $successPatterns = $successPatterns | Select-Object -Last 100
    }
    
    $successPatterns | ConvertTo-Json -Depth 10 | Set-Content ".heady-memory/success_patterns.json"
} else {
    Write-Host "[LEARN] Task failed, updating error patterns" -ForegroundColor Yellow
    
    # Update error patterns
    $errorPatterns = @()
    if (Test-Path ".heady-memory/error_patterns.json") {
        $errorPatterns = Get-Content ".heady-memory/error_patterns.json" | ConvertFrom-Json
    }
    
    $errorPatterns += @{
        task_type = $TaskType
        complexity = $Complexity
        error = $_.Exception.Message
        timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    }
    
    # Keep only last 50 error patterns
    if ($errorPatterns.Count -gt 50) {
        $errorPatterns = $errorPatterns | Select-Object -Last 50
    }
    
    $errorPatterns | ConvertTo-Json -Depth 10 | Set-Content ".heady-memory/error_patterns.json"
}

# Phase 7: HeadyCloud Synchronization
if ($readiness.headycloud_connected) {
    Write-Host ''
    Write-Host '[PHASE 7] HeadyCloud Synchronization' -ForegroundColor Yellow
    Write-Host '-----------------------------------' -ForegroundColor Yellow
    
    try {
        $syncPayload = $executionResult | ConvertTo-Json -Depth 10 -Compress
        $response = Invoke-RestMethod -Uri "https://headysystems.com/api/tasks/sync" -Method POST -Body $syncPayload -ContentType "application/json" -TimeoutSec 10
        Write-Host "[OK] Execution synced to HeadyCloud" -ForegroundColor Green
    } catch {
        Write-Host "[WARN] HeadyCloud sync failed" -ForegroundColor Yellow
    }
}

# Final Report
Write-Host ''
Write-Host 'EXECUTION SUMMARY' -ForegroundColor Magenta
Write-Host '==================' -ForegroundColor Magenta
Write-Host "Task: $TaskScript" -ForegroundColor White
Write-Host "Type: $TaskType" -ForegroundColor White
Write-Host "Complexity: $Complexity" -ForegroundColor White
Write-Host "Success: $(if($taskSuccess) {'YES'} else {'NO'})" -ForegroundColor $(if($taskSuccess) {"Green"} else {"Red"})
Write-Host "Duration: $([math]::Round($executionDuration.TotalSeconds, 2))s" -ForegroundColor White
Write-Host "Optimizations: $($optimizations.Count)" -ForegroundColor White
Write-Host "HeadyCloud: $(if($readiness.headycloud_connected) {'Connected'} else {'Disconnected'})" -ForegroundColor $(if($readiness.headycloud_connected) {"Green"} else {"Red"})
Write-Host "Memory: Scanned & Optimized" -ForegroundColor Green
Write-Host ''

if ($taskSuccess) {
    Write-Host 'Task executed successfully with optimal memory context!' -ForegroundColor Green
    exit 0
} else {
    Write-Host 'Task execution failed. Check error patterns for optimization.' -ForegroundColor Yellow
    exit 1
}
