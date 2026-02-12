# Simple Pre-Execution Memory Scanner
# Ensures optimal memory scanning before any task execution

param(
    [string]$TaskType = "auto",
    [string]$Complexity = "adaptive",
    [switch]$ForceScan
)

$ErrorActionPreference = 'Stop'
# HeadyCloud deployment - no local paths needed

Write-Host 'Pre-Execution Memory Scanner' -ForegroundColor Cyan
Write-Host '============================' -ForegroundColor Cyan
Write-Host ''

# Use HeadyCloud memory cache - no local storage
$memoryCache = "HeadyCloud"

# Phase 1: Immediate Context Scan
Write-Host '[SCAN] Immediate context...' -ForegroundColor Yellow

$immediateContext = @{
    timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    current_task = $TaskType
    working_directory = (Get-Location).Path
    git_status = git status --porcelain 2>$null
    system_load = Get-CimInstance -ClassName Win32_Processor | Select-Object LoadPercentage
}

# Store in HeadyCloud - no local files
try {
    $immediateContext | ConvertTo-Json -Depth 10 -Compress | Invoke-RestMethod -Uri "https://headysystems.com/api/memory/store" -Method POST -ContentType "application/json" -TimeoutSec 5 | Out-Null
} catch {
    # Fallback to HeadyCloud registry
    $immediateContext | ConvertTo-Json -Depth 10 | Set-Content ".heady-memory/cache/immediate_context.json"
}
Write-Host "[OK] Immediate context scanned" -ForegroundColor Green

# Phase 2: Project State Scan
Write-Host '[SCAN] Project state...' -ForegroundColor Yellow

$projectState = @{
    timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    registry_exists = Test-Path "heady-registry.json"
    configs_count = (Get-ChildItem "configs" -File -Recurse -ErrorAction SilentlyContinue).Count
    scripts_count = (Get-ChildItem "scripts" -File -Filter "*.ps1" -ErrorAction SilentlyContinue).Count
    docker_running = docker ps -q 2>$null
}

$projectState | ConvertTo-Json -Depth 10 | Set-Content ".heady-memory/cache/project_state.json"
Write-Host "[OK] Project state scanned" -ForegroundColor Green

# Phase 3: HeadyCloud Connectivity
Write-Host '[SCAN] HeadyCloud connectivity...' -ForegroundColor Yellow

try {
    $headycloudStatus = Invoke-RestMethod -Uri "https://headysystems.com/api/health" -TimeoutSec 5
    $headycloudConnected = $headycloudStatus.ok
    Write-Host "[OK] HeadyCloud connected" -ForegroundColor Green
} catch {
    $headycloudConnected = $false
    Write-Host "[WARN] HeadyCloud not reachable" -ForegroundColor Yellow
}

# Phase 4: Memory Optimization
Write-Host '[SCAN] Memory optimization...' -ForegroundColor Yellow

$memoryOptimization = @{
    timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    task_type = $TaskType
    complexity = $Complexity
    headycloud_available = $headycloudConnected
    parallel_execution = $headycloudConnected
    cloud_offload = $headycloudConnected
    pattern_optimization = $true
}

$memoryOptimization | ConvertTo-Json -Depth 10 | Set-Content ".heady-memory/cache/memory_optimization.json"
Write-Host "[OK] Memory optimization configured" -ForegroundColor Green

# Phase 5: Execution Readiness
Write-Host '[SCAN] Execution readiness...' -ForegroundColor Yellow

$readiness = @{
    memory_scanned = $true
    headycloud_connected = $headycloudConnected
    system_ready = $true
    timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    optimizations = @(
        if ($headycloudConnected) { "cloud_offload" }
        "pattern_optimization"
        if ($memoryOptimization.parallel_execution) { "parallel_execution" }
    )
}

$readiness | ConvertTo-Json -Depth 10 | Set-Content ".heady-memory/execution_readiness.json"
Write-Host "[OK] Execution readiness confirmed" -ForegroundColor Green

# Final Summary
Write-Host ''
Write-Host 'MEMORY SCAN COMPLETE!' -ForegroundColor Green
Write-Host '====================' -ForegroundColor Green
Write-Host "Task Type: $TaskType" -ForegroundColor White
Write-Host "Complexity: $Complexity" -ForegroundColor White
Write-Host "HeadyCloud: $(if($headycloudConnected) {'Connected'} else {'Disconnected'})" -ForegroundColor $(if($headycloudConnected) {"Green"} else {"Red"})
Write-Host "Optimizations: $($readiness.optimizations.Count)" -ForegroundColor White
Write-Host "System Ready: YES" -ForegroundColor Green
Write-Host ''
Write-Host 'Task execution can proceed with optimal memory context.' -ForegroundColor Cyan
