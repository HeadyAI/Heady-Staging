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
<# ║  FILE: scripts/invoke-with-memory-scan.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# Universal Invoke with Memory Scan
# Ensures optimal memory scanning before any script execution

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$ScriptPath,
    
    [string]$TaskType = "auto",
    [string]$Complexity = "adaptive",
    [switch]$ForceMemoryScan,
    [hashtable]$AdditionalParams = @{}
)

# Run memory scan first
$scanParams = @{
    TaskType = $TaskType
    Complexity = $Complexity
}

if ($ForceMemoryScan) {
    $scanParams.ForceScan = $true
}

try {
    & ".\scripts\memory-scan-simple.ps1" @scanParams
    
    # Check execution readiness
    if (Test-Path ".heady-memory/execution_readiness.json") {
        $readiness = Get-Content ".heady-memory/execution_readiness.json" | ConvertFrom-Json
        
        if (-not $readiness.system_ready) {
            Write-Host "[FAIL] System not ready for execution" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "[READY] System ready, executing script..." -ForegroundColor Green
        
        # Execute the original script with all parameters
        if ($AdditionalParams.Count -gt 0) {
            & $ScriptPath @AdditionalParams
        } else {
            & $ScriptPath
        }
    } else {
        Write-Host "[FAIL] Execution readiness not found" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[FAIL] Memory scan or execution failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
