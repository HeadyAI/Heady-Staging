# HEADY_BRAND:BEGIN
# ╔══════════════════════════════════════════════════════════════════╗
# ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
# ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
# ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
# ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
# ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
# ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
# ║                                                                  ║
# ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
# ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
# ║  FILE: HeadyAI-IDE/scripts/build-headyai-ide.ps1                    ║
# ║  LAYER: automation                                              ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END

param(
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [switch]$SkipPackage,
    [switch]$Force,
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"

function Write-Status {
    param([string]$message, [string]$level = "Info")
    $colors = @{
        "Info" = "White"
        "Success" = "Green"
        "Warning" = "Yellow"
        "Error" = "Red"
    }
    Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] $message" -ForegroundColor $colors[$level]
}

function Test-Prerequisites {
    Write-Status "Checking prerequisites..." "Info"
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Status "✓ Node.js: $nodeVersion" "Success"
    } catch {
        Write-Status "✗ Node.js not found. Please install Node.js 18 or later." "Error"
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Status "✓ npm: $npmVersion" "Success"
    } catch {
        Write-Status "✗ npm not found." "Error"
        exit 1
    }
    
    # Check if we're in the right directory
    if (-not (Test-Path "package.json")) {
        Write-Status "✗ package.json not found. Please run from HeadyAI-IDE root directory." "Error"
        exit 1
    }
    
    Write-Status "Prerequisites check completed" "Success"
}

function Install-Dependencies {
    Write-Status "Installing dependencies..." "Info"
    
    if (-not (Test-Path "node_modules") -or $Force) {
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Status "✗ Dependency installation failed" "Error"
            exit 1
        }
        Write-Status "✓ Dependencies installed" "Success"
    } else {
        Write-Status "✓ Dependencies already installed (use -Force to reinstall)" "Info"
    }
}

function Run-Tests {
    if ($SkipTests) {
        Write-Status "Skipping tests (-SkipTests specified)" "Warning"
        return
    }
    
    Write-Status "Running tests..." "Info"
    
    # Run linting
    Write-Status "Running ESLint..." "Info"
    npm run lint 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Status "⚠ ESLint issues found but continuing..." "Warning"
    }
    
    # Run unit tests if available
    if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        if ($packageJson.scripts.test) {
            Write-Status "Running unit tests..." "Info"
            npm test
            if ($LASTEXITCODE -ne 0) {
                Write-Status "✗ Tests failed" "Error"
                exit 1
            }
        }
    }
    
    Write-Status "✓ Tests completed" "Success"
}

function Build-Application {
    if ($SkipBuild) {
        Write-Status "Skipping build (-SkipBuild specified)" "Warning"
        return
    }
    
    Write-Status "Building HeadyAI-IDE..." "Info"
    
    # Clean previous build
    if (Test-Path "build") {
        Remove-Item -Recurse -Force "build"
    }
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
    }
    
    # Build React app
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Status "✗ Build failed" "Error"
        exit 1
    }
    
    Write-Status "✓ React app built successfully" "Success"
    
    # Package Electron app
    if (-not $SkipPackage) {
        Write-Status "Packaging Electron app..." "Info"
        
        npm run dist
        if ($LASTEXITCODE -ne 0) {
            Write-Status "✗ Electron packaging failed" "Error"
            exit 1
        }
        
        Write-Status "✓ Electron app packaged successfully" "Success"
    }
}

function Create-Assets {
    Write-Status "Creating application assets..." "Info"
    
    # Create icon if it doesn't exist
    if (-not (Test-Path "assets")) {
        New-Item -ItemType Directory -Path "assets" | Out-Null
    }
    
    if (-not (Test-Path "assets\icon.png")) {
        Write-Status "Creating default icon..." "Info"
        # You would generate or copy an actual icon here
        # For now, we'll create a placeholder
        Write-Status "⚠ Icon placeholder created - replace with actual icon" "Warning"
    }
    
    Write-Status "✓ Assets created" "Success"
}

function Generate-VersionInfo {
    $versionInfo = @{
        version = $Version
        buildDate = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        gitCommit = (git rev-parse --short HEAD 2>$null) ?? "unknown"
        nodeVersion = (node --version)
        platform = $PSVersionTable.Platform
    }
    
    $versionInfo | ConvertTo-Json -Depth 10 | Out-File -FilePath "build\version.json" -Encoding utf8
    Write-Status "✓ Version info generated" "Success"
}

function Start-DevelopmentServer {
    Write-Status "Starting development server..." "Info"
    Write-Status "🚀 HeadyAI-IDE development server starting on http://localhost:5173" "Success"
    Write-Status "Press Ctrl+C to stop the server" "Info"
    
    npm run dev
}

# Main execution
Write-Status "🧠 HeadyAI-IDE Build Script" "Success"
Write-Status "================================" "Success"

try {
    Test-Prerequisites
    Install-Dependencies
    Run-Tests
    Build-Application
    Create-Assets
    Generate-VersionInfo
    
    Write-Status ""
    Write-Status "🎉 HeadyAI-IDE build completed successfully!" "Success"
    Write-Status "Version: $Version" "Info"
    Write-Status "Build output: ./build" "Info"
    Write-Status "Electron packages: ./dist" "Info"
    
    # Ask if user wants to start dev server
    Write-Status ""
    $response = Read-Host "Start development server? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Start-DevelopmentServer
    }
    
} catch {
    Write-Status "✗ Build failed: $($_.Exception.Message)" "Error"
    exit 1
}

Write-Status "Build script completed" "Success"
