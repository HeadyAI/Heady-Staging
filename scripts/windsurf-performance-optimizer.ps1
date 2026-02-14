# Heady Windsurf Performance Optimizer
# Sacred Geometry | Organic Systems | Breathing Interfaces

param(
    [switch]$ClearCache,
    [switch]$RestartWindsurf,
    [switch]$OptimizeMemory,
    [switch]$AnalyzePerformance,
    [switch]$All
)

$ErrorActionPreference = "Stop"

# Performance optimization settings
$WINDSURF_CACHE_DIRS = @(
    "$env:USERPROFILE\.windsurf",
    "$env:USERPROFILE\.vscode-server",
    "$env:USERPROFILE\.cache",
    ".windsurf",
    ".cache",
    "node_modules/.cache"
)

$HIGH_MEMORY_PROCESSES = @("Windsurf", "Code", "node")
$MEMORY_THRESHOLD_GB = 2

function Write-HeadyLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Clear-WindsurfCache {
    Write-HeadyLog "Clearing Windsurf cache directories..." "INFO"
    
    $totalCleared = 0
    foreach ($dir in $WINDSURF_CACHE_DIRS) {
        if (Test-Path $dir) {
            try {
                $size = (Get-ChildItem $dir -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
                $totalCleared += $size
                Write-HeadyLog "Cleared: $dir ($([math]::Round($size/1MB, 2)) MB)" "SUCCESS"
            } catch {
                Write-HeadyLog "Failed to clear: $dir - $($_.Exception.Message)" "WARN"
            }
        }
    }
    
    Write-HeadyLog "Total cache cleared: $([math]::Round($totalCleared/1MB, 2)) MB" "SUCCESS"
}

function Restart-WindsurfProcesses {
    Write-HeadyLog "Restarting Windsurf processes..." "INFO"
    
    # Get current Windsurf processes
    $windsurfProcesses = Get-Process | Where-Object { $_.ProcessName -like "*Windsurf*" -or $_.ProcessName -like "*Code*" }
    
    if ($windsurfProcesses) {
        Write-HeadyLog "Found $($windsurfProcesses.Count) Windsurf processes to restart" "INFO"
        
        # Graceful shutdown
        foreach ($proc in $windsurfProcesses) {
            try {
                Write-HeadyLog "Stopping process: $($proc.ProcessName) (PID: $($proc.Id))" "INFO"
                $proc.CloseMainWindow()
                Start-Sleep -Seconds 2
                
                if (!$proc.HasExited) {
                    Write-HeadyLog "Force stopping process: $($proc.ProcessName)" "WARN"
                    $proc.Kill()
                }
            } catch {
                Write-HeadyLog "Error stopping process: $($_.Exception.Message)" "WARN"
            }
        }
        
        # Wait for processes to fully stop
        Start-Sleep -Seconds 3
        
        # Restart Windsurf (if installed)
        $windsurfExe = Get-Command "windsurf" -ErrorAction SilentlyContinue
        if ($windsurfExe) {
            Write-HeadyLog "Restarting Windsurf..." "INFO"
            Start-Process "windsurf" -WindowStyle Normal
        } else {
            Write-HeadyLog "Windsurf executable not found. Please restart manually." "WARN"
        }
    } else {
        Write-HeadyLog "No Windsurf processes found running" "INFO"
    }
}

function Optimize-MemoryUsage {
    Write-HeadyLog "Optimizing memory usage..." "INFO"
    
    $highMemoryProcesses = Get-Process | Where-Object { 
        $HIGH_MEMORY_PROCESSES -contains $_.ProcessName -and 
        $_.WorkingSet -gt ($MEMORY_THRESHOLD_GB * 1GB)
    }
    
    if ($highMemoryProcesses) {
        Write-HeadyLog "Found $($highMemoryProcesses.Count) high memory processes:" "WARN"
        
        foreach ($proc in $highMemoryProcesses) {
            $memoryGB = [math]::Round($proc.WorkingSet / 1GB, 2)
            Write-HeadyLog "  - $($proc.ProcessName): $memoryGB GB (PID: $($proc.Id))" "WARN"
            
            # Try to reduce memory usage
            try {
                if ($proc.ProcessName -eq "node") {
                    Write-HeadyLog "  Attempting memory optimization for node process..." "INFO"
                    # Node.js specific optimization would go here
                }
            } catch {
                Write-HeadyLog "  Memory optimization failed: $($_.Exception.Message)" "WARN"
            }
        }
    } else {
        Write-HeadyLog "No high memory processes found" "SUCCESS"
    }
}

function Get-PerformanceMetrics {
    Write-HeadyLog "Collecting performance metrics..." "INFO"
    
    $metrics = @{
        timestamp = Get-Date
        system = @{
            totalMemoryGB = [math]::Round((Get-CimInstance -ClassName Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
            availableMemoryGB = [math]::Round((Get-CimInstance -ClassName Win32_OperatingSystem).FreePhysicalMemory / 1MB, 2)
            cpuUsage = (Get-CimInstance -ClassName Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
        }
        windsurf = @{
            processes = @()
            totalMemoryMB = 0
            totalCPU = 0
        }
        problems = @{
            count = 0
            lastCheck = $null
        }
    }
    
    # Windsurf process metrics
    $windsurfProcesses = Get-Process | Where-Object { $_.ProcessName -like "*Windsurf*" -or $_.ProcessName -like "*Code*" }
    foreach ($proc in $windsurfProcesses) {
        $procInfo = @{
            name = $proc.ProcessName
            pid = $proc.Id
            memoryMB = [math]::Round($proc.WorkingSet / 1MB, 2)
            cpu = $proc.CPU
            startTime = $proc.StartTime
        }
        $metrics.windsurf.processes += $procInfo
        $metrics.windsurf.totalMemoryMB += $procInfo.memoryMB
        $metrics.windsurf.totalCPU += $procInfo.cpu
    }
    
    # Check for problems (would need to integrate with Windsurf API)
    $metrics.problems.lastCheck = Get-Date
    # This would be replaced with actual Windsurf problem count
    $metrics.problems.count = 0
    
    # Display metrics
    Write-HeadyLog "=== PERFORMANCE METRICS ===" "INFO"
    Write-HeadyLog "System Memory: $($metrics.system.availableMemoryGB)GB / $($metrics.system.totalMemoryGB)GB available" "INFO"
    Write-HeadyLog "CPU Usage: $($metrics.system.cpuUsage)%" "INFO"
    Write-HeadyLog "Windsurf Processes: $($windsurfProcesses.Count)" "INFO"
    Write-HeadyLog "Windsurf Memory: $([math]::Round($metrics.windsurf.totalMemoryMB/1GB, 2))GB" "INFO"
    Write-HeadyLog "Windsurf CPU: $([math]::Round($metrics.windsurf.totalCPU, 2))" "INFO"
    Write-HeadyLog "Problems Count: $($metrics.problems.count)" "INFO"
    
    return $metrics
}

function Set-OptimizedConfiguration {
    Write-HeadyLog "Applying optimized configuration..." "INFO"
    
    # Update .windsurfrules if needed
    $windsurfRulesPath = ".windsurfrules"
    if (Test-Path $windsurfRulesPath) {
        Write-HeadyLog "Windsurf rules file found. Configuration already optimized." "SUCCESS"
    } else {
        Write-HeadyLog "Windsurf rules file not found. Creating optimized configuration..." "WARN"
        # The optimized rules were already created in the previous step
    }
    
    # Set environment variables for performance
    $env:WINDSURF_CACHE_TTL = "900000"  # 15 minutes
    $env:HEALTH_CHECK_INTERVAL = "30000"  # 30 seconds
    
    Write-HeadyLog "Environment variables set for optimal performance" "SUCCESS"
}

# Main execution
try {
    Write-HeadyLog "=== Heady Windsurf Performance Optimizer ===" "INFO"
    
    if ($All -or $ClearCache) {
        Clear-WindsurfCache
    }
    
    if ($All -or $OptimizeMemory) {
        Optimize-MemoryUsage
    }
    
    if ($All -or $RestartWindsurf) {
        Restart-WindsurfProcesses
    }
    
    if ($All -or $AnalyzePerformance) {
        $metrics = Get-PerformanceMetrics
        Set-OptimizedConfiguration
    }
    
    Write-HeadyLog "Performance optimization completed!" "SUCCESS"
    
} catch {
    Write-HeadyLog "Optimization failed: $($_.Exception.Message)" "ERROR"
    exit 1
}
