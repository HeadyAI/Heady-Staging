# Heady PWA Desktop Setup
# Creates desktop shortcuts and PWA installations for Heady on Windows
# Supports Chrome, Edge, and Firefox

param(
  [string]$HeadyUrl = "http://manager.dev.local.heady.internal:3300",
  [string]$AppName = "Heady Systems",
  [string]$ShortcutName = "Heady",
  [switch]$Chrome,
  [switch]$Edge,
  [switch]$Firefox,
  [switch]$All
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Info "╔════════════════════════════════════════════════════════════════╗"
Write-Info "║  Heady PWA Desktop Setup                                       ║"
Write-Info "║  Create desktop shortcuts and PWA installations               ║"
Write-Info "╚════════════════════════════════════════════════════════════════╝"
Write-Info ""

# Validate URL
if (-not $HeadyUrl.StartsWith("http")) {
  Write-Error "Invalid URL: $HeadyUrl"
  exit 1
}

Write-Info "Target URL: $HeadyUrl"
Write-Info "App Name: $AppName"
Write-Info ""

# Desktop path
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$StartMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"

# New desktop shortcut (works for all browsers)
function New-DesktopShortcut {
  param([string]$BrowserPath, [string]$BrowserName)
  
  $ShortcutPath = "$DesktopPath\$ShortcutName.lnk"
  
  Write-Info "Creating desktop shortcut for $BrowserName..."
  
  $WshShell = New-Object -ComObject WScript.Shell
  $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
  $Shortcut.TargetPath = $BrowserPath
  $Shortcut.Arguments = "--app=$HeadyUrl"
  $Shortcut.WorkingDirectory = $env:USERPROFILE
  $Shortcut.Description = "$AppName - AI-Powered Ecosystem"
  $Shortcut.IconLocation = "$BrowserPath,0"
  $Shortcut.Save()
  
  Write-Success "✓ Desktop shortcut created: $ShortcutPath"
}

# New Start Menu shortcut
function New-StartMenuShortcut {
  param([string]$BrowserPath, [string]$BrowserName)
  
  if (-not (Test-Path $StartMenuPath)) {
    New-Item -ItemType Directory -Path $StartMenuPath -Force | Out-Null
  }
  
  $ShortcutPath = "$StartMenuPath\$ShortcutName.lnk"
  
  Write-Info "Creating Start Menu shortcut for $BrowserName..."
  
  $WshShell = New-Object -ComObject WScript.Shell
  $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
  $Shortcut.TargetPath = $BrowserPath
  $Shortcut.Arguments = "--app=$HeadyUrl"
  $Shortcut.WorkingDirectory = $env:USERPROFILE
  $Shortcut.Description = "$AppName - AI-Powered Ecosystem"
  $Shortcut.Save()
  
  Write-Success "✓ Start Menu shortcut created: $ShortcutPath"
}

# Install PWA in Chrome/Edge
function Install-PWA-Chrome {
  param([string]$BrowserPath, [string]$BrowserName)
  
  Write-Info "Setting up PWA installation for $BrowserName..."
  Write-Info "  1. Open $BrowserName"
  Write-Info "  2. Navigate to: $HeadyUrl"
  Write-Info "  3. Click the install icon in the address bar"
  Write-Info "  4. Click 'Install' to add to desktop and Start Menu"
  Write-Info ""
  
  # Open browser to the URL
  Write-Info "Opening $BrowserName..."
  & $BrowserPath $HeadyUrl
  
  Write-Success "✓ Browser opened. Complete the PWA installation in the browser."
}

# Find browser paths
$ChromePath = $null
$EdgePath = $null
$FirefoxPath = $null

# Chrome
$ChromeLocations = @(
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
foreach ($loc in $ChromeLocations) {
  if (Test-Path $loc) {
    $ChromePath = $loc
    break
  }
}

# Edge
$EdgeLocations = @(
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
)
foreach ($loc in $EdgeLocations) {
  if (Test-Path $loc) {
    $EdgePath = $loc
    break
  }
}

# Firefox
$FirefoxLocations = @(
  "C:\Program Files\Mozilla Firefox\firefox.exe",
  "C:\Program Files (x86)\Mozilla Firefox\firefox.exe",
  "$env:LOCALAPPDATA\Mozilla Firefox\firefox.exe"
)
foreach ($loc in $FirefoxLocations) {
  if (Test-Path $loc) {
    $FirefoxPath = $loc
    break
  }
}

Write-Info "Detected browsers:"
if ($ChromePath) { Write-Success "  ✓ Chrome: $ChromePath" } else { Write-Warning "  ✗ Chrome not found" }
if ($EdgePath) { Write-Success "  ✓ Edge: $EdgePath" } else { Write-Warning "  ✗ Edge not found" }
if ($FirefoxPath) { Write-Success "  ✓ Firefox: $FirefoxPath" } else { Write-Warning "  ✗ Firefox not found" }
Write-Info ""

# Process based on parameters
if ($All) {
  $Chrome = $true
  $Edge = $true
  $Firefox = $true
}

if ($Chrome -and $ChromePath) {
  Write-Info "Setting up Chrome..."
  New-DesktopShortcut -BrowserPath $ChromePath -BrowserName "Chrome"
  New-StartMenuShortcut -BrowserPath $ChromePath -BrowserName "Chrome"
  Write-Info ""
}

if ($Edge -and $EdgePath) {
  Write-Info "Setting up Edge..."
  New-DesktopShortcut -BrowserPath $EdgePath -BrowserName "Edge"
  New-StartMenuShortcut -BrowserPath $EdgePath -BrowserName "Edge"
  Write-Info ""
}

if ($Firefox -and $FirefoxPath) {
  Write-Info "Setting up Firefox..."
  Write-Info "Firefox doesn't support --app mode like Chrome/Edge"
  Write-Info "Creating standard shortcut instead..."
  New-DesktopShortcut -BrowserPath $FirefoxPath -BrowserName "Firefox"
  New-StartMenuShortcut -BrowserPath $FirefoxPath -BrowserName "Firefox"
  Write-Info ""
}

# Summary
Write-Info "╔════════════════════════════════════════════════════════════════╗"
Write-Success "✓ PWA Desktop Setup Complete!"
Write-Info "╚════════════════════════════════════════════════════════════════╝"
Write-Info ""
Write-Info "Desktop shortcuts created:"
Write-Info "  • Desktop: $DesktopPath\$ShortcutName.lnk"
Write-Info "  • Start Menu: $StartMenuPath\$ShortcutName.lnk"
Write-Info ""
Write-Info "To install as PWA (Chrome/Edge):"
Write-Info "  1. Click the shortcut to open Heady"
Write-Info "  2. Click the install icon in the address bar"
Write-Info "  3. Click 'Install' to add to desktop and Start Menu"
Write-Info ""
Write-Info "Features:"
Write-Info "  • Runs in standalone window (no browser UI)"
Write-Info "  • Offline support (with service worker)"
Write-Info "  • Share target integration"
Write-Info "  • File handler integration"
Write-Info ""
