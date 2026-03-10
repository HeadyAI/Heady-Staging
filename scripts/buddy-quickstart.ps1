# ============================================================================
# Heady™ Buddy Quickstart — scaffolds a new site or app in seconds (Windows)
# Usage:
#   .\scripts\buddy-quickstart.ps1 website my-portfolio
#   .\scripts\buddy-quickstart.ps1 app my-saas-app
# ============================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet("website","app")]
    [string]$Type,

    [Parameter(Mandatory=$true, Position=1)]
    [ValidatePattern("^[a-z0-9][a-z0-9\-]*$")]
    [string]$Name
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Split-Path -Parent $ScriptDir

# ── Colors ───────────────────────────────────────────────────────────────────

function Write-Banner {
    Write-Host ""
    Write-Host "  ◆ Heady™ Buddy Quickstart" -ForegroundColor Cyan
    Write-Host "  ─────────────────────────" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success { param([string]$Msg) Write-Host "  ✓ $Msg" -ForegroundColor Green }
function Write-Step    { param([string]$Msg) Write-Host "  → $Msg" -ForegroundColor Green }
function Write-Warn    { param([string]$Msg) Write-Host "  ⚠ $Msg" -ForegroundColor Yellow }

# ── Validate ─────────────────────────────────────────────────────────────────

$TargetDir = Join-Path $RepoRoot $Name

if (Test-Path $TargetDir) {
    Write-Host "  ❌ Directory '$Name' already exists at: $TargetDir" -ForegroundColor Red
    exit 1
}

Write-Banner

# ── Website scaffold ─────────────────────────────────────────────────────────

if ($Type -eq "website") {
    $TemplateDir = Join-Path $RepoRoot "templates\template-heady-ui"

    if (-not (Test-Path $TemplateDir)) {
        Write-Host "  ❌ Template not found at: $TemplateDir" -ForegroundColor Red
        exit 1
    }

    Write-Step "Scaffolding website: $Name"

    Copy-Item -Path $TemplateDir -Destination $TargetDir -Recurse

    # Update package name
    $PkgJson = Join-Path $TargetDir "package.json"
    if (Test-Path $PkgJson) {
        (Get-Content $PkgJson -Raw) -replace '@heady-ai/template-ui', "@buddy/$Name" |
            Set-Content $PkgJson -NoNewline
    }

    # Update HTML title
    $IndexHtml = Join-Path $TargetDir "public\index.html"
    if (Test-Path $IndexHtml) {
        (Get-Content $IndexHtml -Raw) -replace 'HeadyWeb Control Surface', "$Name — Built with Heady™" |
            Set-Content $IndexHtml -NoNewline
    }

    Write-Success "Website scaffolded at: $TargetDir"
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor White
    Write-Host "    cd $Name"
    Write-Host "    pnpm install"
    Write-Host "    pnpm dev          # → http://localhost:3000"
    Write-Host "    pnpm build        # → production bundle"
    Write-Host ""
    Write-Host "  Deploy:" -ForegroundColor White
    Write-Host "    gcloud run deploy $Name --source . --region us-central1 --allow-unauthenticated"
}

# ── App scaffold ─────────────────────────────────────────────────────────────

if ($Type -eq "app") {
    $OnboardingDir = Join-Path $RepoRoot "services\heady-onboarding"

    if (-not (Test-Path $OnboardingDir)) {
        Write-Host "  ❌ Onboarding template not found at: $OnboardingDir" -ForegroundColor Red
        exit 1
    }

    Write-Step "Scaffolding app: $Name"

    Copy-Item -Path $OnboardingDir -Destination $TargetDir -Recurse

    # Clean build artifacts
    $CleanDirs = @(".next", "node_modules", ".turbo")
    foreach ($dir in $CleanDirs) {
        $cleanPath = Join-Path $TargetDir $dir
        if (Test-Path $cleanPath) {
            Remove-Item -Path $cleanPath -Recurse -Force
        }
    }

    # Copy env template
    $EnvExample = Join-Path $TargetDir ".env.example"
    $EnvFile    = Join-Path $TargetDir ".env"
    if (Test-Path $EnvExample) {
        Copy-Item -Path $EnvExample -Destination $EnvFile
        Write-Warn ".env copied from .env.example — fill in your secrets!"
    }

    Write-Success "App scaffolded at: $TargetDir"
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor White
    Write-Host "    cd $Name"
    Write-Host "    npm install"
    Write-Host "    notepad .env      # ← Fill in DATABASE_URL, NEXTAUTH_SECRET, OAuth keys"
    Write-Host "    npx prisma generate"
    Write-Host "    npx prisma db push"
    Write-Host "    npm run dev       # → http://localhost:3000"
    Write-Host ""
    Write-Host "  Deploy:" -ForegroundColor White
    Write-Host "    gcloud run deploy $Name --source . --region us-east1 --allow-unauthenticated"
}

# ── Footer ───────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  📖 Full guide: docs\BUDDY-BUILDER-GUIDE.md" -ForegroundColor Cyan
Write-Host "  🆘 Support: eric@headyconnection.org" -ForegroundColor Cyan
Write-Host ""
