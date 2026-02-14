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
<# ║  FILE: scripts/create-clones-direct.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# ============================================================
# HEADY SYSTEMS | Direct Clone Creation
# ============================================================
# Creates three repository clones with proper configurations.
# No parallel tasks, no complex orchestration — just direct creation.

param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$canonicalPath = "c:\Users\erich\Heady"

$repos = @(
    @{
        Name = "HeadyStack-Hybrid-Workstation-2026"
        Type = "hybrid"
        Profile = "hybrid.yml"
        Description = "Local-first with cloud fallback"
    },
    @{
        Name = "HeadyStack-Offline-Secure-2026"
        Type = "offline"
        Profile = "local-offline.yml"
        Description = "Air-gapped, maximum privacy"
    },
    @{
        Name = "HeadyStack-Cloud-Hub-2026"
        Type = "cloud"
        Profile = "cloud-saas.yml"
        Description = "Cloud-optimized SaaS deployment"
    }
)

foreach ($repo in $repos) {
    $targetPath = Join-Path (Split-Path $canonicalPath) $repo.Name
    
    Write-Host "`n=== Creating $($repo.Name) ===" -ForegroundColor Cyan
    Write-Host "Type: $($repo.Type)" -ForegroundColor White
    Write-Host "Profile: $($repo.Profile)" -ForegroundColor White
    
    # Check if exists
    if ((Test-Path $targetPath) -and -not $Force) {
        Write-Warning "Repository already exists at $targetPath. Use -Force to overwrite."
        continue
    }
    
    # Remove existing if -Force
    if (Test-Path $targetPath) {
        Write-Host "Removing existing directory..." -ForegroundColor Yellow
        Remove-Item $targetPath -Recurse -Force
    }
    
    # Copy canonical structure
    Write-Host "Copying canonical structure..." -ForegroundColor Green
    Get-ChildItem -Path $canonicalPath -Exclude '.git','node_modules','*.log' | 
        Copy-Item -Destination $targetPath -Recurse -Force
    
    # Remove .git if copied
    $gitPath = Join-Path $targetPath '.git'
    if (Test-Path $gitPath) {
        Remove-Item $gitPath -Recurse -Force
    }
    
    # Update repo-type.yaml
    $repoTypePath = Join-Path $targetPath 'repo-type.yaml'
    $repoTypeContent = @"
# ============================================================
# HEADY SYSTEMS | Repo Type Manifest
# ============================================================

type: $($repo.Type)

identity:
  name: $($repo.Name)
  entity: HeadySystems
  year: 2026
  role: clone
  description: $($repo.Description)

defaultDockerProfile: $($repo.Profile)

allowedProviders: $(if ($repo.Type -eq 'offline') { @('- local') } else { @('- local', '- cloud') })

modelRouterPolicy: $(if ($repo.Type -eq 'offline') { 'LOCAL_ONLY' } elseif ($repo.Type -eq 'cloud') { 'CLOUD_ONLY' } else { 'LOCAL_FIRST' })

maintenanceCadence: daily

cloneSource: $canonicalPath
canonicalTag: v1.0.0-mono
"@
    Set-Content -Path $repoTypePath -Value $repoTypeContent -NoNewline
    Write-Host "Updated repo-type.yaml" -ForegroundColor Green
    
    # Update README.md
    $readmePath = Join-Path $targetPath 'README.md'
    if (Test-Path $readmePath) {
        $content = Get-Content $readmePath -Raw
        $content = $content -replace '# HeadyStack', "# $($repo.Name)"
        $content = $content -replace 'Entity:.*', "Entity: HeadySystems"
        $content = $content -replace 'Role:.*', "Role: Clone - $($repo.Description)"
        Set-Content -Path $readmePath -Value $content -NoNewline
        Write-Host "Updated README.md" -ForegroundColor Green
    }
    
    # Create .env.example for the repo
    $envExample = @"
# $($repo.Name) Environment Configuration
# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

# Database
POSTGRES_PASSWORD=heady_dev
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# Service Ports
API_PORT=3300
ORCHESTRATOR_PORT=3301
RAG_PORT=9000
MODEL_ROUTER_PORT=3400
OLLAMA_PORT=11434
EMBEDDINGS_PORT=9100
AUTH_PORT=3500
BILLING_PORT=3600
MCP_PORT=3700
TELEMETRY_PORT=3800
VOICE_PORT=3900
WEB_PORT=3000

# Environment
NODE_ENV=development
LOG_LEVEL=info

# Model Router Policy
MODEL_POLICY=$(if ($repo.Type -eq 'offline') { 'LOCAL_ONLY' } elseif ($repo.Type -eq 'cloud') { 'CLOUD_ONLY' } else { 'LOCAL_FIRST' })
CLOUD_FALLBACK=$(if ($repo.Type -eq 'offline') { 'false' } else { 'true' })

# Security
JWT_SECRET=dev_secret

# Billing (if applicable)
STRIPE_KEY=
"@
    Set-Content -Path (Join-Path $targetPath '.env.example') -Value $envExample -NoNewline
    Write-Host "Created .env.example" -ForegroundColor Green
    
    Write-Host "✅ Created $($repo.Name) at $targetPath" -ForegroundColor Green
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Created $($repos.Count) clone repositories:" -ForegroundColor White
$repos | ForEach-Object { Write-Host "  - $($_.Name) ($($_.Type))" -ForegroundColor Green }

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. cd into any clone directory" -ForegroundColor White
Write-Host "2. Run: docker compose -f infra/docker/docker-compose.base.yml -f infra/docker/profiles/<profile>.yml up" -ForegroundColor White
Write-Host "3. Verify services at http://localhost:3300 (API) and http://localhost:3000 (Web)" -ForegroundColor White
