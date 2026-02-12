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
<# ║  FILE: scripts/error-handling-workflow.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
#!/usr/bin/env pwsh
# Error Handling and Recovery Workflow for Heady
# Part of HCFP - Heady Continuous Full-Build Pipeline

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("detect", "classify", "recover", "report", "full")]
    [string]$Action = "full",
    
    [Parameter(Mandatory=$false)]
    [string]$ErrorLog = $null,
    
    [Parameter(Mandatory=$false)]
    [string]$Component = "all",
    
    [Parameter(Mandatory=$false)]
    [switch]$Alert
)

$ErrorActionPreference = "Stop"
# Cloud-Only Configuration (NO LOCAL STORAGE)
$HEADY_LOG_DIR = "https://headysystems.com/api/logs"
$HEADY_STATE_DIR = "https://headysystems.com/api/state"

# Cloud paths - No local directory creation needed

# Error classification patterns
$ERROR_PATTERNS = @{
    # Transient errors - can retry
    transient_network = @(
        "ECONNREFUSED",
        "ETIMEDOUT",
        "ENOTFOUND",
        "network timeout",
        "fetch failed",
        "connection refused",
        "DNS resolution failed"
    )
    
    transient_resource = @(
        "ENOSPC",
        "disk full",
        "out of memory",
        "resource temporarily unavailable"
    )
    
    # Code/config errors - require fix
    code_syntax = @(
        "syntax error",
        "SyntaxError",
        "Unexpected token",
        "ParseError"
    )
    
    code_module = @(
        "Module not found",
        "Cannot find module",
        "ImportError",
        "No module named"
    )
    
    code_config = @(
        "Invalid configuration",
        "config error",
        "missing required field"
    )
    
    # Permission errors
    permission = @(
        "EACCES",
        "EPERM",
        "permission denied",
        "access denied"
    )
    
    # Infrastructure errors
    infrastructure = @(
        "container failed",
        "pod crashed",
        "service unavailable",
        "503",
        "502"
    )
}

# Recovery strategies
$RECOVERY_STRATEGIES = @{
    transient_network = @{
        retry_count = 3
        retry_delay_seconds = 30
        backoff_multiplier = 2
        description = "Network connectivity issue - will retry with backoff"
    }
    
    transient_resource = @{
        retry_count = 2
        retry_delay_seconds = 60
        action = "cleanup"
        description = "Resource exhaustion - cleaning up and retrying"
    }
    
    code_syntax = @{
        retry_count = 0
        action = "fail"
        alert = $true
        description = "Syntax error requires code fix"
    }
    
    code_module = @{
        retry_count = 1
        action = "reinstall_deps"
        description = "Missing module - reinstalling dependencies"
    }
    
    code_config = @{
        retry_count = 0
        action = "fail"
        alert = $true
        description = "Configuration error requires manual fix"
    }
    
    permission = @{
        retry_count = 0
        action = "fail"
        alert = $true
        description = "Permission error requires manual intervention"
    }
    
    infrastructure = @{
        retry_count = 2
        retry_delay_seconds = 45
        action = "restart_service"
        description = "Infrastructure issue - restarting service"
    }
    
    unknown = @{
        retry_count = 1
        retry_delay_seconds = 15
        action = "retry_once"
        alert = $true
        description = "Unknown error - single retry then alert"
    }
}

function Classify-Error {
    param([string]$LogContent)
    
    foreach ($category in $ERROR_PATTERNS.Keys) {
        foreach ($pattern in $ERROR_PATTERNS[$category]) {
            if ($LogContent -match $pattern) {
                return $category
            }
        }
    }
    
    return "unknown"
}

function Get-RecoveryStrategy {
    param([string]$ErrorCategory)
    
    if ($RECOVERY_STRATEGIES.ContainsKey($ErrorCategory)) {
        return $RECOVERY_STRATEGIES[$ErrorCategory]
    }
    
    return $RECOVERY_STRATEGIES["unknown"]
}

function Invoke-Recovery {
    param(
        [string]$ErrorCategory,
        [hashtable]$Strategy,
        [string]$Component
    )
    
    Write-Host "🔄 Executing recovery for $ErrorCategory on $Component..." -ForegroundColor Yellow
    Write-Host "   Strategy: $($Strategy.description)" -ForegroundColor Gray
    
    switch ($Strategy.action) {
        "cleanup" {
            Write-Host "   Cleaning up cloud caches and temp data..." -ForegroundColor Gray
            # Cloud-only cleanup - no local filesystem access
            Invoke-RestMethod -TimeoutSec 10 -Uri "https://headysystems.com/api/cache/clear" -Method POST | Out-Null
            Invoke-RestMethod -TimeoutSec 10 -Uri "https://headysystems.com/api/temp/clear" -Method POST | Out-Null
        }
        
        "reinstall_deps" {
            Write-Host "   Reinstalling dependencies..." -ForegroundColor Gray
            if (Test-Path "package-lock.json") {
                Remove-Item -Force "node_modules" -Recurse -ErrorAction SilentlyContinue
                npm ci 2>&1 | Tee-Object -FilePath "$HEADY_LOG_DIR\npm-reinstall.log"
            }
        }
        
        "restart_service" {
            Write-Host "   Restarting Heady services..." -ForegroundColor Gray
            # Restart services via Docker or local process
            docker-compose restart 2>&1 | Tee-Object -FilePath "$HEADY_LOG_DIR\service-restart.log" | Out-Null
        }
        
        "fail" {
            Write-Host "   ❌ Non-recoverable error - alerting and failing" -ForegroundColor Red
            if ($Strategy.alert -or $Alert) {
                Send-Alert -ErrorCategory $ErrorCategory -Component $Component -Severity "high"
            }
            throw "Non-recoverable error: $ErrorCategory"
        }
        
        "retry_once" {
            Write-Host "   Will retry once then alert if still failing..." -ForegroundColor Yellow
        }
    }
    
    # Execute retries if configured
    if ($Strategy.retry_count -gt 0) {
        $delay = $Strategy.retry_delay_seconds
        
        for ($i = 1; $i -le $Strategy.retry_count; $i++) {
            Write-Host "   Retry attempt $i of $($Strategy.retry_count) in ${delay}s..." -ForegroundColor Yellow
            Start-Sleep -Seconds $delay
            
            # Attempt retry
            $retryResult = Invoke-Retry -Component $Component
            
            if ($retryResult.Success) {
                Write-Host "   ✅ Retry successful!" -ForegroundColor Green
                Log-Recovery -ErrorCategory $ErrorCategory -Component $Component -Success $true -Attempts $i
                return @{ Success = $true; Attempts = $i }
            }
            
            $delay = $delay * $Strategy.backoff_multiplier
        }
        
        # All retries exhausted
        Write-Host "   ❌ All retry attempts failed" -ForegroundColor Red
        Log-Recovery -ErrorCategory $ErrorCategory -Component $Component -Success $false -Attempts $Strategy.retry_count
        
        if ($Strategy.alert -or $Alert) {
            Send-Alert -ErrorCategory $ErrorCategory -Component $Component -Severity "high" -Attempts $Strategy.retry_count
        }
        
        throw "Recovery failed after $($Strategy.retry_count) attempts"
    }
    
    return @{ Success = $true }
}

function Invoke-Retry {
    param([string]$Component)
    
    try {
        # Run the component's build/test command
        switch ($Component) {
            "manager" { npm run build:manager 2>&1 | Out-Null }
            "worker" { cd backend/python_worker; python -m compileall . 2>&1 | Out-Null }
            "frontend" { npm run build:frontend 2>&1 | Out-Null }
            "test" { npm test 2>&1 | Out-Null }
            default { return @{ Success = $false; Error = "Unknown component" } }
        }
        
        return @{ Success = $true }
    }
    catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Send-Alert {
    param(
        [string]$ErrorCategory,
        [string]$Component,
        [string]$Severity = "medium",
        [int]$Attempts = 0
    )
    
    $alertData = @{
        timestamp = Get-Date -Format "o"
        category = $ErrorCategory
        component = $Component
        severity = $Severity
        attempts = $Attempts
        message = "Heady error: $ErrorCategory in $Component"
        hostname = $env:COMPUTERNAME
        build_id = $env:GITHUB_RUN_ID
    } | ConvertTo-Json
    
    # Log to file
    $alertData | Out-File -Append -FilePath "$HEADY_LOG_DIR\alerts.json"
    
    # Console notification
    Write-Host ""
    Write-Host "🚨 ALERT: Heady Component Failure" -ForegroundColor Red -BackgroundColor Black
    Write-Host "   Component: $Component" -ForegroundColor White
    Write-Host "   Error: $ErrorCategory" -ForegroundColor White
    Write-Host "   Severity: $Severity" -ForegroundColor $(if ($Severity -eq "high") { "Red" } else { "Yellow" })
    Write-Host "   Time: $(Get-Date)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Manual intervention required. Check logs at:" -ForegroundColor Yellow
    Write-Host "   $HEADY_LOG_DIR" -ForegroundColor Cyan
    Write-Host ""
    
    # Could integrate with Slack, PagerDuty, email here
    # Invoke-RestMethod -TimeoutSec 10 -Uri $env:SLACK_WEBHOOK_URL -Method POST -Body $alertData
}

function Log-Recovery {
    param(
        [string]$ErrorCategory,
        [string]$Component,
        [bool]$Success,
        [int]$Attempts
    )
    
    $logEntry = @{
        timestamp = Get-Date -Format "o"
        action = "recovery"
        error_category = $ErrorCategory
        component = $Component
        success = $Success
        attempts = $Attempts
    } | ConvertTo-Json
    
    $logEntry | Out-File -Append -FilePath "$HEADY_LOG_DIR\recoveries.json"
}

function Get-ErrorReport {
    $recoveries = @()
    $alerts = @()
    
    if (Test-Path "$HEADY_LOG_DIR\recoveries.json") {
        $recoveries = Get-Content "$HEADY_LOG_DIR\recoveries.json" | 
            Where-Object { $_ } | 
            ForEach-Object { -Parallel { $_ | ConvertFrom-Json }
    }
    
    if (Test-Path "$HEADY_LOG_DIR\alerts.json") {
        $alerts = Get-Content "$HEADY_LOG_DIR\alerts.json" | 
            Where-Object { $_ } | 
            ForEach-Object { -Parallel { $_ | ConvertFrom-Json }
    }
    
    Write-Host ""
    Write-Host "📊 Heady Error Handling Report" -ForegroundColor Cyan
    Write-Host "==============================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Total Recoveries: $($recoveries.Count)" -ForegroundColor White
    Write-Host "Successful: $(($recoveries | Where-Object { $_.success }).Count)" -ForegroundColor Green
    Write-Host "Failed: $(($recoveries | Where-Object { -not $_.success }).Count)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Total Alerts: $($alerts.Count)" -ForegroundColor $(if ($alerts.Count -gt 0) { "Red" } else { "Green" })
    
    if ($alerts.Count -gt 0) {
        Write-Host ""
        Write-Host "Recent Alerts:" -ForegroundColor Yellow
        $alerts | Select-Object -Last 5 | ForEach-Object { -Parallel {
            Write-Host "  - $($_.timestamp): $($_.component) - $($_.category) [$($_.severity)]" -ForegroundColor Red
        }
    }
}

# Main execution
Write-Host ""
Write-Host "🔧 Heady Error Handling Workflow" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

switch ($Action) {
    "detect" {
        Write-Host "🔍 Detecting errors..." -ForegroundColor Yellow
        # Check for recent error logs
        $recentErrors = Get-ChildItem "$HEADY_LOG_DIR\*.log" -ErrorAction SilentlyContinue | 
            Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-1) }
        
        if ($recentErrors) {
            Write-Host "Found $($recentErrors.Count) recent error logs" -ForegroundColor Yellow
        } else {
            Write-Host "✅ No recent errors detected" -ForegroundColor Green
        }
    }
    
    "classify" {
        if (-not $ErrorLog -or -not (Test-Path $ErrorLog)) {
            Write-Error "Error log file required for classification. Use -ErrorLog <path>"
            exit 1
        }
        
        $content = [System.IO.File]::ReadAllText($ErrorLog)
        $category = Classify-Error -LogContent $content
        $strategy = Get-RecoveryStrategy -ErrorCategory $category
        
        Write-Host "📋 Classification Results:" -ForegroundColor Cyan
        Write-Host "  Error Category: $category" -ForegroundColor White
        Write-Host "  Recovery Strategy: $($strategy.description)" -ForegroundColor White
        Write-Host "  Retry Count: $($strategy.retry_count)" -ForegroundColor White
        Write-Host "  Alert Required: $($strategy.alert)" -ForegroundColor White
    }
    
    "recover" {
        if (-not $ErrorLog -or -not (Test-Path $ErrorLog)) {
            Write-Error "Error log file required for recovery. Use -ErrorLog <path>"
            exit 1
        }
        
        $content = [System.IO.File]::ReadAllText($ErrorLog)
        $category = Classify-Error -LogContent $content
        $strategy = Get-RecoveryStrategy -ErrorCategory $category
        
        Invoke-Recovery -ErrorCategory $category -Strategy $strategy -Component $Component
    }
    
    "report" {
        Get-ErrorReport
    }
    
    "full" {
        # Run full detection and report
        Get-ErrorReport
    }
}

Write-Host ""
