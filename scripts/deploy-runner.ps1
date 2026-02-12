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
<# ║  FILE: scripts/deploy-runner.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# Load deployment functions
. $PSScriptRoot\auto-deploy-smart.ps1

# Execute global deployment
$deployment = Invoke-GlobalDeployment -Mode Full -Concurrency 5
Write-Host "🌐 Global deployment started: $($deployment.Id)" -ForegroundColor Cyan

# Create status monitoring function
function Watch-Deployment {
    param([string]$Id)
    while ($true) {
        $status = Get-GlobalDeploymentStatus -Id $Id
        Write-Host "[$($status.Status)] Progress: $($status.Progress)% - ETA: $($status.EstimatedCompletion)" -ForegroundColor Magenta
        
        if ($status.Status -in 'Completed','Failed','RolledBack') {
            return $status
        }
        # Start-Sleep -Seconds 1 # REMOVED FOR SPEED
    }
}

# Start monitoring
$finalStatus = Watch-Deployment -Id $deployment.Id
Write-Host "✅ Deployment finished with status: $($finalStatus.Status)" -ForegroundColor Green
$finalStatus | Format-List
