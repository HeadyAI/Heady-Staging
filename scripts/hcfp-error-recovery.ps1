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
<# ║  FILE: scripts/hcfp-error-recovery.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# ╔══════════════════════════════════════════════════════════════════╗
# ║  HEADY SYSTEMS - HCFP Error Recovery Workflow                    ║
# ║  Smart rebuild with RCA, not blind restart                       ║
# ╚══════════════════════════════════════════════════════════════════╝

param(
    [Parameter(Mandatory=$false)]
    [string]$ErrorType = "auto-detect",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipRCA,
    
    [Parameter(Mandatory=$false)]
    [switch]$ForceRebuild
)

$ErrorActionPreference = "Stop"
$Script:ErrorLog = ".heady_cache/error-recovery.log"
$Script:RCALog = ".heady_cache/rca-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"

# Ensure log directory exists
New-Item -ItemType Directory -Force -Path ".heady_cache" | Out-Null

function Write-HeadyLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path $Script:ErrorLog -Value $logEntry
}

function Test-ErrorRecoverable {
    param([string]$ErrorMessage)
    
    # RECOVERABLE patterns
    $recoverablePatterns = @(
        "ENOTFOUND",
        "ETIMEDOUT",
        "ECONNRESET",
        "ECONNREFUSED",
        "Network timeout",
        "Registry error",
        "npm ERR! network",
        "Temporary failure",
        "Socket hang up"
    )
    
    # NON-RECOVERABLE patterns
    $nonRecoverablePatterns = @(
        "SyntaxError",
        "EBADPLATFORM",
        "ENOENT.*package.json",
        "Missing required",
        "Cannot find module",
        "Unexpected token",
        "Invalid configuration"
    )
    
    foreach ($pattern in $nonRecoverablePatterns) {
        if ($ErrorMessage -match $pattern) {
            return @{
                Recoverable = $false
                Category = "CODE_ERROR"
                Reason = "Code or configuration error detected"
            }
        }
    }
    
    foreach ($pattern in $recoverablePatterns) {
        if ($ErrorMessage -match $pattern) {
            return @{
                Recoverable = $true
                Category = "NETWORK_ERROR"
                Reason = "Transient network or registry issue"
            }
        }
    }
    
    return @{
        Recoverable = $false
        Category = "UNKNOWN"
        Reason = "Unable to classify error type"
    }
}

function Invoke-RootCauseAnalysis {
    param([string]$ErrorContext)
    
    Write-HeadyLog "🔍 Starting Root Cause Analysis..." "INFO"
    
    $rca = @{
        Timestamp = Get-Date -Format "o"
        ErrorContext = $ErrorContext
        FiveWhys = @()
        EscapePoint = ""
        Prevention = @()
        RecommendedAction = ""
    }
    
    # 5 Whys analysis
    Write-Host "`n━━━ ROOT CAUSE ANALYSIS (5 Whys) ━━━`n"
    
    $why1 = Read-Host "Why did the error occur? (Why 1)"
    $rca.FiveWhys += $why1
    
    if (-not $SkipRCA) {
        $why2 = Read-Host "Why did that happen? (Why 2)"
        $rca.FiveWhys += $why2
        
        $why3 = Read-Host "Why did that happen? (Why 3)"
        $rca.FiveWhys += $why3
        
        $why4 = Read-Host "Why did that happen? (Why 4)"
        $rca.FiveWhys += $why4
        
        $why5 = Read-Host "Why did that happen? (Why 5 - Root Cause)"
        $rca.FiveWhys += $why5
        
        $rca.EscapePoint = Read-Host "Where should this have been caught? (Escape Point)"
        
        Write-Host "`nProposed prevention measures:"
        $prevention1 = Read-Host "  1. "
        $prevention2 = Read-Host "  2. "
        $prevention3 = Read-Host "  3. "
        
        $rca.Prevention = @($prevention1, $prevention2, $prevention3) | Where-Object { $_ }
    }
    
    # Determine recommended action
    $classification = Test-ErrorRecoverable -ErrorMessage $ErrorContext
    
    if ($classification.Recoverable) {
        $rca.RecommendedAction = "RETRY_WITH_DELAY"
    } else {
        $rca.RecommendedAction = "MANUAL_FIX_REQUIRED"
    }
    
    # Save RCA
    $rca | ConvertTo-Json -Depth 10 | Set-Content -Path $Script:RCALog
    Write-HeadyLog "✅ RCA saved to: $Script:RCALog" "INFO"
    
    return $rca
}

function Invoke-RecoveryAction {
    param([hashtable]$RCA)
    
    Write-HeadyLog "🔧 Executing recovery action: $($RCA.RecommendedAction)" "INFO"
    
    switch ($RCA.RecommendedAction) {
        "RETRY_WITH_DELAY" {
            Write-Host "`n⏳ Waiting 10 seconds before retry..."
            # Start-Sleep -Seconds 1 # REMOVED FOR SPEED
            
            Write-HeadyLog "🔄 Retrying build..." "INFO"
            & npm ci --ignore-scripts
            
            if ($LASTEXITCODE -eq 0) {
                Write-HeadyLog "✅ Recovery successful!" "SUCCESS"
                return $true
            } else {
                Write-HeadyLog "❌ Retry failed - manual intervention required" "ERROR"
                return $false
            }
        }
        
        "MANUAL_FIX_REQUIRED" {
            Write-Host "`n⚠️  Manual fix required. Please address the root cause.`n"
            Write-Host "Root Cause: $($RCA.FiveWhys[-1])`n"
            Write-Host "Recommended preventions:"
            $RCA.Prevention | ForEach-Object { -Parallel { Write-Host "  - $_" }
            
            $response = Read-Host "`nHas the issue been fixed? (y/N)"
            
            if ($response -eq 'y' -or $response -eq 'Y') {
                Write-HeadyLog "🔄 User confirmed fix - attempting rebuild..." "INFO"
                & npm ci --ignore-scripts
                
                if ($LASTEXITCODE -eq 0) {
                    Write-HeadyLog "✅ Rebuild successful after manual fix!" "SUCCESS"
                    return $true
                }
            }
            
            return $false
        }
        
        default {
            Write-HeadyLog "❓ Unknown recovery action - halting" "ERROR"
            return $false
        }
    }
}

function Invoke-CleanRebuild {
    Write-HeadyLog "🧹 Starting clean rebuild process..." "INFO"
    
    # Phase 1: Preserve evidence
    $evidenceDir = ".heady_cache/error-evidence-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null
    
    Write-HeadyLog "📸 Preserving error evidence..." "INFO"
    Copy-Item -Path "package.json" -Destination "$evidenceDir/" -ErrorAction SilentlyContinue
    Copy-Item -Path "package-lock.json" -Destination "$evidenceDir/" -ErrorAction SilentlyContinue
    Get-ChildItem -Path "." -Filter "npm-debug.log" -Recurse -Depth 5 | Copy-Item -Destination "$evidenceDir/"
    
    # Phase 2: Clean workspace
    Write-HeadyLog "🗑️  Cleaning workspace..." "INFO"
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules, build, dist, coverage, .next
    
    # Phase 3: Verify git state
    Write-HeadyLog "🔍 Verifying git state..." "INFO"
    git status --short
    
    # Phase 4: Deterministic rebuild
    Write-HeadyLog "📦 Running deterministic rebuild..." "INFO"
    npm ci --ignore-scripts
    
    if ($LASTEXITCODE -eq 0) {
        Write-HeadyLog "✅ Clean rebuild successful!" "SUCCESS"
        
        # Phase 5: Run tests
        Write-HeadyLog "🧪 Running tests..." "INFO"
        npm test
        
        if ($LASTEXITCODE -eq 0) {
            Write-HeadyLog "✅ All tests passed!" "SUCCESS"
            return $true
        } else {
            Write-HeadyLog "⚠️  Tests failed - review required" "WARN"
            return $false
        }
    } else {
        Write-HeadyLog "❌ Clean rebuild failed" "ERROR"
        return $false
    }
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MAIN EXECUTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host @"

╔══════════════════════════════════════════════════════════════════╗
║  🔧 HEADY ERROR RECOVERY WORKFLOW                                ║
║  Smart rebuild with Root Cause Analysis                          ║
╚══════════════════════════════════════════════════════════════════╝

"@

Write-HeadyLog "━━━ HCFP Error Recovery Started ━━━" "INFO"

if ($ForceRebuild) {
    Write-HeadyLog "🚀 Force rebuild requested - skipping analysis" "INFO"
    $success = Invoke-CleanRebuild
    exit $(if ($success) { 0 } else { 1 })
}

# Detect last error
$lastError = ""
if (Test-Path "npm-debug.log") {
    $lastError = Get-Content "npm-debug.log" -Tail 50 -Raw
} elseif ($ErrorType -eq "auto-detect") {
    $lastError = "No error log found - manual error type required"
} else {
    $lastError = $ErrorType
}

Write-HeadyLog "📋 Error detected: $(($lastError -split "`n")[0])" "ERROR"

# Classify error
$classification = Test-ErrorRecoverable -ErrorMessage $lastError

Write-Host "`n━━━ ERROR CLASSIFICATION ━━━`n"
Write-Host "Category:    $($classification.Category)"
Write-Host "Recoverable: $(if ($classification.Recoverable) { '✓ Yes' } else { '✗ No' })"
Write-Host "Reason:      $($classification.Reason)`n"

if (-not $SkipRCA) {
    $rca = Invoke-RootCauseAnalysis -ErrorContext $lastError
    $success = Invoke-RecoveryAction -RCA $rca
} else {
    Write-HeadyLog "⚠️  RCA skipped - attempting direct recovery" "WARN"
    $success = Invoke-CleanRebuild
}

if ($success) {
    Write-Host "`n✅ Error recovery successful!`n"
    Write-HeadyLog "━━━ Recovery Complete ━━━" "SUCCESS"
    exit 0
} else {
    Write-Host "`n❌ Error recovery failed - escalation required`n"
    Write-HeadyLog "━━━ Recovery Failed ━━━" "ERROR"
    
    Write-Host "Next steps:"
    Write-Host "  1. Review RCA log: $Script:RCALog"
    Write-Host "  2. Review error log: $Script:ErrorLog"
    Write-Host "  3. Contact Heady Systems support if needed`n"
    
    exit 1
}
