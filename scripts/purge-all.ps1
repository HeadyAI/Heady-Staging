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
<# ║  FILE: scripts/purge-all.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# Direct purge using simple string replacement
$files = @(
    "c:\Users\erich\Heady\configs\service-domains.yaml",
    "c:\Users\erich\Heady\configs\domain-architecture.yaml",
    "c:\Users\erich\Heady\configs\minimal-domains.yaml",
    "c:\Users\erich\Heady\configs\rationalized-domains.yaml",
    "c:\Users\erich\Heady\configs\branded-domains.yaml",
    "c:\Users\erich\Heady\configs\cloud-layers.yaml",
    "c:\Users\erich\Heady\configs\functional-domains.yaml",
    "c:\Users\erich\Heady\configs\cloudflared-config.yaml",
    "c:\Users\erich\Heady\configs\cloudflare-dns.yaml",
    "c:\Users\erich\Heady\configs\product-repos.yaml"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing: $file"
        ([System.IO.File]::ReadAllText($file)) -replace 'api.headysystems.com', 'api.headysystems.com' `
                                   -replace '127\.0\.0\.1', 'api.headysystems.com' `
                                   -replace '\.onrender\.com', '.headysystems.com' `
                                   -replace 'heady\.internal', 'headysystems.com' `
                                   -replace 'heady\.local', 'headysystems.com' `
                                   -replace '\.internal\.', '.headysystems.com' |
        Set-Content $file
    }
}

Write-Host "Done purging configs"
