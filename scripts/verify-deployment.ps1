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
<# ║  FILE: scripts/verify-deployment.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
<#
.SYNOPSIS
Verifies mTLS deployment status on Windows
#>

param(
    [string]$Target,
    [string]$DeploymentId
)

if (-not $Target) {
    $Target = "Windows"
}

if (-not $DeploymentId) {
    $DeploymentId = "LATEST"
}

Write-Host "Verifying deployment status for Target: $Target | ID: $DeploymentId"

if ($Target -ne "Windows") {
    Write-Host "Verification placeholder for target: $Target" -ForegroundColor Yellow
    return
}

# Check services
$services = @('HeadyNginx','HeadyCloudflared')
$allRunning = $true

foreach ($svc in $services) {
    $status = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($status -and $status.Status -eq 'Running') {
        Write-Host "$svc is running" -ForegroundColor Green
    } else {
        Write-Warning "$svc is NOT running"
        $allRunning = $false
    }
}

# Test connectivity
if ($allRunning) {
    try {
        $certPath = Join-Path $PSScriptRoot "..\configs\nginx\ssl\client.pfx"
        $response = Invoke-WebRequest -TimeoutSec 10 -Uri "https://api.headysystems.comheadymcp.com/health" `
            -Certificate (Get-PfxCertificate -FilePath $certPath)
        Write-Host "Connectivity verified: $($response.Content)" -ForegroundColor Green
    } catch {
        Write-Warning "Connectivity test failed: $_"
    }
}
