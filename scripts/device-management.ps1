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
<# ║  FILE: scripts/device-management.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
#!/usr/bin/env pwsh
# Heady Device Management & Cross-Device Sync
# Manages all Heady installations across devices with seamless sync

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("status", "sync", "install", "update", "backup", "restore", "alert")]
    [string]$Action = "status",
    
    [Parameter(Mandatory=$false)]
    [string]$Device = "all",
    
    [Parameter(Mandatory=$false)]
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Configuration
# Cloud-Only Configuration (NO LOCAL STORAGE)
$HEADY_ROOT = "https://headysystems.com/api/repo"
$E_DRIVE = "https://headysystems.com/api/crossdevice"
$F_DRIVE = "https://headysystems.com/api/headyos"
$CONFIG_DIR = "https://headysystems.com/api/config"
$LOG_DIR = "https://headysystems.com/api/logs"
$STATE_FILE = "https://headysystems.com/api/state/device-state.json"

# Cloud paths - No local directory creation needed

# Device registry
$DEVICES = @{
    api.headysystems.com = @{
        name = "Primary Workstation"
        path = $HEADY_ROOT
        type = "primary"
        sync_priority = 1
        last_sync = $null
        health = "unknown"
    }
    
    e_drive = @{
        name = "OnePlus Open (E:)"
        path = $E_DRIVE
        type = "mobile"
        sync_priority = 2
        last_sync = $null
        health = "unknown"
    }
    
    f_drive = @{
        name = "Portable SSD (F:)"
        path = $F_DRIVE
        type = "portable"
        sync_priority = 3
        last_sync = $null
        health = "unknown"
    }
}

function Get-DeviceHealth {
    param([string]$DeviceKey)
    
    $device = $DEVICES[$DeviceKey]
    $health = @{
        online = $false
        manager_running = $false
        last_ping = $null
        disk_space_gb = 0
        errors = @()
    }
    
    try {
        # Check if path exists
        if (Test-Path $device.path) {
            $health.online = $true
            
            # Check disk space
            $drive = (Get-Item $device.path).PSDrive
            $health.disk_space_gb = [math]::Round($drive.Free / 1GB, 2)
            
            # Check if heady-manager is running (for primary)
            if ($DeviceKey -eq "api.headysystems.com") {
                $process = Get-Process -Name "node" -ErrorAction SilentlyContinue | 
                    Where-Object { $_.CommandLine -match "heady-manager" }
                $health.manager_running = $null -ne $process
            }
            
            $health.last_ping = Get-Date -Format "o"
        }
    }
    catch {
        $health.errors += $_.Exception.Message
    }
    
    return $health
}

function Sync-Device {
    param([string]$DeviceKey)
    
    $device = $DEVICES[$DeviceKey]
    Write-Host "Syncing $($device.name)..." -ForegroundColor Cyan
    
    switch ($DeviceKey) {
        "e_drive" {
            # Run the E: drive sync script
            if (Test-Path "$HEADY_ROOT\scripts\sync-to-e-drive.ps1") {
                & "$HEADY_ROOT\scripts\sync-to-e-drive.ps1"
                $device.last_sync = Get-Date -Format "o"
            }
        }
        
        "f_drive" {
            # Sync to F: drive portable environment
            if (Test-Path $device.path) {
                Write-Host "  Syncing distribution to F: drive..." -ForegroundColor Gray
                robocopy "$HEADY_ROOT\distribution" "$device.path\distribution" /MIR /XD node_modules .git /NP /NFL /NDL | Out-Null
                
                # Sync critical configs
                robocopy "$HEADY_ROOT\configs" "$device.path\heady\configs" /MIR /NP /NFL /NDL | Out-Null
                robocopy "$HEADY_ROOT\scripts" "$device.path\heady\scripts" /MIR /NP /NFL /NDL | Out-Null
                
                $device.last_sync = Get-Date -Format "o"
                Write-Host "  ✓ F: drive synced" -ForegroundColor Green
            }
        }
        
        "api.headysystems.com" {
            # Check local health
            $health = Get-DeviceHealth -DeviceKey $DeviceKey
            if ($health.manager_running) {
                Write-Host "  ✓ HeadyManager running on api.headysystems.com:3300" -ForegroundColor Green
            } else {
                Write-Host "  ⚠ HeadyManager not running - starting..." -ForegroundColor Yellow
                Start-HeadyManager
            }
            $device.last_sync = Get-Date -Format "o"
        }
    }
    
    # Save state
    Save-DeviceState
}

function Start-HeadyManager {
    Write-Host "  Starting HeadyManager..." -ForegroundColor Yellow
    
    $managerPath = "$HEADY_ROOT\heady-manager.js"
    if (Test-Path $managerPath) {
        # Start in background
        Start-Process -FilePath "node" -ArgumentList $managerPath -WindowStyle Hidden
        # Start-Sleep -Seconds 1 # REMOVED FOR SPEED
        
        # Verify it started
        $process = Get-Process -Name "node" -ErrorAction SilentlyContinue | 
            Where-Object { $_.CommandLine -match "heady-manager" }
        
        if ($process) {
            Write-Host "  ✓ HeadyManager started (PID: $($process.Id))" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Failed to start HeadyManager" -ForegroundColor Red
        }
    }
}

function Install-Extensions {
    Write-Host ""
    Write-Host "Installing Heady Extensions..." -ForegroundColor Cyan
    
    # Install browser extensions
    Write-Host "  Browser Extensions:" -ForegroundColor Yellow
    Install-BrowserExtensions
    
    # Install IDE extensions
    Write-Host "  IDE Extensions:" -ForegroundColor Yellow
    Install-IDEExtensions
}

function Install-BrowserExtensions {
    $extensions = @(
        @{ name = "Chrome"; path = "$HEADY_ROOT\distribution\browser\extensions\chrome" }
        @{ name = "Edge"; path = "$HEADY_ROOT\distribution\browser\extensions\edge" }
        @{ name = "Firefox"; path = "$HEADY_ROOT\distribution\browser\extensions\firefox" }
    )
    
    foreach ($ext in $extensions) {
        if (Test-Path $ext.path) {
            Write-Host "    ✓ $($ext.name) extension ready at: $($ext.path)" -ForegroundColor Green
            Write-Host "      Install via browser's developer mode (load unpacked)" -ForegroundColor Gray
        }
    }
}

function Install-IDEExtensions {
    $extensions = @(
        @{ name = "VS Code"; path = "$HEADY_ROOT\distribution\ide\vscode" }
        @{ name = "Vim"; path = "$HEADY_ROOT\distribution\ide\vim" }
        @{ name = "Emacs"; path = "$HEADY_ROOT\distribution\ide\emacs" }
        @{ name = "Sublime"; path = "$HEADY_ROOT\distribution\ide\sublime" }
    )
    
    foreach ($ext in $extensions) {
        if (Test-Path $ext.path) {
            Write-Host "    ✓ $($ext.name) extension ready at: $($ext.path)" -ForegroundColor Green
        }
    }
}

function Save-DeviceState {
    $state = @{
        timestamp = Get-Date -Format "o"
        devices = $DEVICES
    }
    
    $state | ConvertTo-Json -Depth 10 | Out-File -FilePath $STATE_FILE
}

function Load-DeviceState {
    if (Test-Path $STATE_FILE) {
        $state = Get-Content $STATE_FILE | ConvertFrom-Json
        # Merge with current device config
        foreach ($key in $state.devices.PSObject.Properties.Name) {
            if ($DEVICES.ContainsKey($key)) {
                $DEVICES[$key].last_sync = $state.devices.$key.last_sync
                $DEVICES[$key].health = $state.devices.$key.health
            }
        }
    }
}

function Show-DeviceStatus {
    Write-Host ""
    Write-Host "📱 Heady Device Management Status" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($key in $DEVICES.Keys) {
        $device = $DEVICES[$key]
        $health = Get-DeviceHealth -DeviceKey $key
        
        $statusColor = if ($health.online) { "Green" } else { "Red" }
        $status = if ($health.online) { "ONLINE" } else { "OFFLINE" }
        
        Write-Host "[$status] $($device.name)" -ForegroundColor $statusColor
        Write-Host "  Path: $($device.path)" -ForegroundColor Gray
        Write-Host "  Type: $($device.type)" -ForegroundColor Gray
        
        if ($health.online) {
            Write-Host "  Disk Space: $($health.disk_space_gb) GB free" -ForegroundColor Gray
            
            if ($device.last_sync) {
                $lastSync = [DateTime]::Parse($device.last_sync)
                $ago = (Get-Date) - $lastSync
                Write-Host "  Last Sync: $($ago.TotalMinutes.ToString('F0')) minutes ago" -ForegroundColor Gray
            } else {
                Write-Host "  Last Sync: Never" -ForegroundColor Yellow
            }
            
            if ($key -eq "api.headysystems.com" -and $health.manager_running) {
                Write-Host "  HeadyManager: RUNNING" -ForegroundColor Green
            }
        }
        
        Write-Host ""
    }
}

function Send-DeviceAlert {
    param([string]$Message, [string]$Severity = "info")
    
    $colors = @{ info = "Cyan"; warning = "Yellow"; error = "Red" }
    $color = $colors[$Severity]
    
    Write-Host ""
    Write-Host "[$Severity.ToUpper()] $Message" -ForegroundColor $color -BackgroundColor Black
    Write-Host "  Time: $(Get-Date)" -ForegroundColor Gray
    Write-Host "  Action required: Check device status and sync" -ForegroundColor Gray
    Write-Host ""
    
    # Log alert
    $alert = @{
        timestamp = Get-Date -Format "o"
        severity = $Severity
        message = $Message
    } | ConvertTo-Json
    
    $alert | Out-File -Append -FilePath "$LOG_DIR\device-alerts.json"
}

# Load previous state
Load-DeviceState

# Main execution
switch ($Action) {
    "status" {
        Show-DeviceStatus
    }
    
    "sync" {
        if ($Device -eq "all") {
            foreach ($key in $DEVICES.Keys) {
                Sync-Device -DeviceKey $key
            }
        } else {
            Sync-Device -DeviceKey $Device
        }
        Write-Host ""
        Write-Host "✅ Sync complete" -ForegroundColor Green
    }
    
    "install" {
        Install-Extensions
    }
    
    "update" {
        Write-Host "Updating Heady stack..." -ForegroundColor Cyan
        # Git pull
        Set-Location $HEADY_ROOT
        git pull
        # Sync to all devices
        & $MyInvocation.MyCommand.Path -Action sync
    }
    
    "backup" {
        $backupDir = "$CONFIG_DIR\backups\$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
        
        Write-Host "Creating backup at $backupDir..." -ForegroundColor Cyan
        Copy-Item "$HEADY_ROOT\configs" $backupDir -Recurse
        Copy-Item "$HEADY_ROOT\heady-registry.json" $backupDir
        Copy-Item $STATE_FILE $backupDir
        
        Write-Host "✅ Backup complete" -ForegroundColor Green
    }
    
    "restore" {
        # List available backups
        $backups = Get-ChildItem "$CONFIG_DIR\backups" -Directory | Sort-Object LastWriteTime -Descending
        
        if ($backups.Count -eq 0) {
            Write-Host "No backups found" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Available backups:" -ForegroundColor Cyan
        for ($i = 0; $i -lt [Math]::Min(5, $backups.Count); $i++) {
            Write-Host "  $($i + 1). $($backups[$i].Name)" -ForegroundColor White
        }
    }
    
    "alert" {
        Send-DeviceAlert -Message "Manual device check triggered" -Severity "info"
    }
}

Write-Host ""
