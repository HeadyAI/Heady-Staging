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
# ║  FILE: scripts/windsurf-admin-setup.ps1                         ║
# ║  LAYER: system                                                   ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END

<#
.SYNOPSIS
    Grants Windsurf IDE administrative privileges and optimal HeadyCloud configuration
    
.DESCRIPTION
    - Creates Windsurf service with admin rights
    - Sets up proper file permissions
    - Configures Windows security policies
    - Creates desktop shortcuts with admin elevation
    - Optimizes system for Windsurf performance
    
.PARAMETER Action
    install | uninstall | status | repair
    
.PARAMETER User
    Target username (default: current user)
    
.EXAMPLE
    .\windsurf-admin-setup.ps1 -Action install
    
.NOTES
    Requires PowerShell Administrator privileges
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('install', 'uninstall', 'status', 'repair')]
    [string]$Action,
    
    [string]$User = $env:USERNAME
)

# Configuration
$WINDSURF_PATH = "$env:LOCALAPPDATA\Programs\Windsurf"
$WINDSURF_EXE = "$WINDSURF_PATH\Windsurf.exe"
$SERVICE_NAME = "WindsurfAdmin"
$DESKTOP_PATH = "$env:USERPROFILE\Desktop"
$STARTMENU_PATH = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs"

function Test-Admin {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-WindsurfStatus {
    Write-Host "`n=== Windsurf Admin Status ===" -ForegroundColor Cyan
    
    # Check if Windsurf is installed
    if (Test-Path $WINDSURF_EXE) {
        $version = (Get-Item $WINDSURF_EXE).VersionInfo.FileVersion
        Write-Host "✓ Windsurf Installed: v$version" -ForegroundColor Green
    } else {
        Write-Host "✗ Windsurf Not Found at: $WINDSURF_PATH" -ForegroundColor Red
        return
    }
    
    # Check service status
    $service = Get-Service -Name $SERVICE_NAME -ErrorAction SilentlyContinue
    if ($service) {
        Write-Host "✓ Service Status: $($service.Status)" -ForegroundColor Green
    } else {
        Write-Host "✗ Service Not Installed" -ForegroundColor Yellow
    }
    
    # Check permissions
    $acl = Get-Acl $WINDSURF_PATH -ErrorAction SilentlyContinue
    if ($acl) {
        $adminAccess = $acl.Access | Where-Object { 
            $_.IdentityReference -like "*$User*" -and 
            $_.FileSystemRights -match "FullControl|Write" 
        }
        if ($adminAccess) {
            Write-Host "✓ User has write permissions" -ForegroundColor Green
        } else {
            Write-Host "✗ User lacks write permissions" -ForegroundColor Yellow
        }
    }
    
    # Check registry settings
    $regPath = "HKCU:\SOFTWARE\Windsurf"
    if (Test-Path $regPath) {
        Write-Host "✓ Registry configuration exists" -ForegroundColor Green
        Get-ItemProperty $regPath | Format-List
    } else {
        Write-Host "✗ No registry configuration found" -ForegroundColor Yellow
    }
}

function Install-WindsurfAdmin {
    if (-not (Test-Admin)) {
        Write-Error "This script must be run as Administrator!"
        exit 1
    }
    
    Write-Host "`n=== Installing Windsurf with Admin Access ===" -ForegroundColor Cyan
    
    # Verify Windsurf installation
    if (-not (Test-Path $WINDSURF_EXE)) {
        Write-Error "Windsurf not found at $WINDSURF_EXE. Please install Windsurf first."
        exit 1
    }
    
    try {
        # 1. Grant full permissions to user
        Write-Host "Setting file permissions..." -ForegroundColor Yellow
        $acl = Get-Acl $WINDSURF_PATH
        $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            $User,
            "FullControl",
            "ContainerInherit,ObjectInherit",
            "None",
            "Allow"
        )
        $acl.SetAccessRule($accessRule)
        Set-Acl -Path $WINDSURF_PATH -AclObject $acl
        
        # 2. Create Windows service for Windsurf
        Write-Host "Creating Windows service..." -ForegroundColor Yellow
        $servicePath = "$WINDSURF_EXE --service --admin-mode"
        
        # Remove existing service if it exists
        $existing = Get-Service -Name $SERVICE_NAME -ErrorAction SilentlyContinue
        if ($existing) {
            Stop-Service -Name $SERVICE_NAME -Force
            Remove-Service -Name $SERVICE_NAME
        }
        
        New-Service -Name $SERVICE_NAME `
            -DisplayName "Windsurf (Admin Mode)" `
            -BinaryPathName $servicePath `
            -StartupType Automatic `
            -Description "Windsurf IDE running with administrative privileges" `
            -ErrorAction Stop
        
        Start-Service -Name $SERVICE_NAME
        
        # 3. Configure Windows security policies
        Write-Host "Configuring security policies..." -ForegroundColor Yellow
        
        # Add Windsurf to Windows Defender exclusions
        Add-MpPreference -ExclusionPath $WINDSURF_PATH -ErrorAction SilentlyContinue
        Add-MpPreference -ExclusionProcess "Windsurf.exe" -ErrorAction SilentlyContinue
        
        # Set UAC to not prompt for Windsurf
        $regPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
        Set-ItemProperty -Path $regPath -Name "EnableLUA" -Value 1 -Type DWord
        Set-ItemProperty -Path $regPath -Name "PromptOnSecureDesktop" -Value 0 -Type DWord
        
        # 4. Create admin shortcut
        Write-Host "Creating admin shortcuts..." -ForegroundColor Yellow
        
        # Desktop shortcut
        $desktopShortcut = "$DESKTOP_PATH\Windsurf (Admin).lnk"
        Create-Shortcut -Path $desktopShortcut -TargetPath $WINDSURF_EXE -Admin $true
        
        # Start Menu shortcut
        $startMenuShortcut = "$STARTMENU_PATH\Windsurf (Admin).lnk"
        Create-Shortcut -Path $startMenuShortcut -TargetPath $WINDSURF_EXE -Admin $true
        
        # 5. Configure registry for optimal performance
        Write-Host "Optimizing registry settings..." -ForegroundColor Yellow
        $regPath = "HKCU:\SOFTWARE\Windsurf"
        if (-not (Test-Path $regPath)) {
            New-Item -Path $regPath -Force | Out-Null
        }
        
        Set-ItemProperty -Path $regPath -Name "AdminMode" -Value 1 -Type DWord
        Set-ItemProperty -Path $regPath -Name "MaxMemory" -Value 8192 -Type DWord
        Set-ItemProperty -Path $regPath -Name "FileWatcher" -Value 1 -Type DWord
        Set-ItemProperty -Path $regPath -Name "AutoUpdate" -Value 0 -Type DWord
        Set-ItemProperty -Path $regPath -Name "LogLevel" -Value "info" -Type String
        
        # 6. Set environment variables
        [Environment]::SetEnvironmentVariable("WINDSURF_ADMIN", "1", "User")
        [Environment]::SetEnvironmentVariable("WINDSURF_CONFIG", "$env:USERPROFILE\.windsurf\admin-config.yaml", "User")
        
        Write-Host "`n✓ Windsurf admin setup complete!" -ForegroundColor Green
        Write-Host "Restart your system for all changes to take effect." -ForegroundColor Yellow
        
    } catch {
        Write-Error "Installation failed: $($_.Exception.Message)"
        exit 1
    }
}

function Uninstall-WindsurfAdmin {
    if (-not (Test-Admin)) {
        Write-Error "This script must be run as Administrator!"
        exit 1
    }
    
    Write-Host "`n=== Uninstalling Windsurf Admin ===" -ForegroundColor Cyan
    
    try {
        # Stop and remove service
        $service = Get-Service -Name $SERVICE_NAME -ErrorAction SilentlyContinue
        if ($service) {
            Stop-Service -Name $SERVICE_NAME -Force
            Remove-Service -Name $SERVICE_NAME
            Write-Host "✓ Service removed" -ForegroundColor Green
        }
        
        # Remove shortcuts
        Remove-Item "$DESKTOP_PATH\Windsurf (Admin).lnk" -ErrorAction SilentlyContinue
        Remove-Item "$STARTMENU_PATH\Windsurf (Admin).lnk" -ErrorAction SilentlyContinue
        Write-Host "✓ Shortcuts removed" -ForegroundColor Green
        
        # Remove registry entries
        Remove-Item "HKCU:\SOFTWARE\Windsurf" -Recurse -ErrorAction SilentlyContinue
        Write-Host "✓ Registry entries removed" -ForegroundColor Green
        
        # Remove environment variables
        [Environment]::SetEnvironmentVariable("WINDSURF_ADMIN", $null, "User")
        [Environment]::SetEnvironmentVariable("WINDSURF_CONFIG", $null, "User")
        Write-Host "✓ Environment variables removed" -ForegroundColor Green
        
        Write-Host "`n✓ Windsurf admin uninstall complete!" -ForegroundColor Green
        
    } catch {
        Write-Error "Uninstall failed: $($_.Exception.Message)"
        exit 1
    }
}

function Repair-WindsurfAdmin {
    Write-Host "`n=== Repairing Windsurf Admin Setup ===" -ForegroundColor Cyan
    
    # Uninstall first
    Uninstall-WindsurfAdmin
    
    # Wait a moment
    # Start-Sleep -Seconds 1 # REMOVED FOR SPEED
    
    # Reinstall
    Install-WindsurfAdmin
}

function Create-Shortcut {
    param(
        [string]$Path,
        [string]$TargetPath,
        [bool]$Admin = $false
    )
    
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($Path)
    $shortcut.TargetPath = $TargetPath
    $shortcut.WorkingDirectory = Split-Path $TargetPath
    $shortcut.Description = "Windsurf IDE (Administrator Mode)"
    
    if ($Admin) {
        $shortcut.Arguments = "--admin"
    }
    
    $shortcut.Save()
    
    # Set shortcut to run as admin
    if ($Admin) {
        $bytes = [System.IO.File]::ReadAllBytes($Path)
        $bytes[0x15] = $bytes[0x15] -bor 0x20  # Set run as admin flag
        [System.IO.File]::WriteAllBytes($Path, $bytes)
    }
}

# Main execution
switch ($Action) {
    'install' { Install-WindsurfAdmin }
    'uninstall' { Uninstall-WindsurfAdmin }
    'status' { Get-WindsurfStatus }
    'repair' { Repair-WindsurfAdmin }
    default { 
        Write-Error "Invalid action: $Action"
        exit 1
    }
}
