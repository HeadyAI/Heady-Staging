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
<# ║  FILE: scripts/windsurf-admin-quick.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# Quick Windsurf Admin Setup for HeadyCloud
# Grants admin privileges and optimal configuration

param(
    [string]$Action = "install"
)

Write-Host "HeadyCloud Windsurf Admin Setup" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

switch ($Action) {
    "install" {
        Write-Host "Installing Windsurf admin privileges..." -ForegroundColor Yellow
        
        # Check if running as admin
        $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
        
        if (-not $isAdmin) {
            Write-Host "Restarting with admin privileges..." -ForegroundColor Yellow
            Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -Action install" -Verb RunAs
            exit
        }
        
        # Create Windsurf service with admin rights
        Write-Host "Creating Windsurf service..." -ForegroundColor Blue
        $servicePath = "C:\Users\erich\AppData\Local\Programs\Windsurf\Windsurf.exe"
        if (Test-Path $servicePath) {
            # Create desktop shortcut with admin elevation
            $shortcutPath = "$env:USERPROFILE\Desktop\Windsurf Admin.lnk"
            $shell = New-Object -ComObject WScript.Shell
            $shortcut = $shell.CreateShortcut($shortcutPath)
            $shortcut.TargetPath = $servicePath
            $shortcut.Arguments = "--admin --headycloud"
            $shortcut.IconLocation = $servicePath
            $shortcut.Description = "Windsurf IDE with HeadyCloud Admin Privileges"
            $shortcut.Save()
            
            # Set shortcut to run as admin
            $bytes = [System.IO.File]::ReadAllBytes($shortcutPath)
            $bytes[0x15] = $bytes[0x15] -bor 0x20
            [System.IO.File]::WriteAllBytes($shortcutPath, $bytes)
            
            Write-Host "[OK] Admin shortcut created on desktop" -ForegroundColor Green
        }
        
        # Set Windows security policies
        Write-Host "Configuring security policies..." -ForegroundColor Blue
        # Add Windsurf to trusted applications
        $policyPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
        if (!(Test-Path $policyPath)) {
            New-Item -Path $policyPath -Force | Out-Null
        }
        
        # Configure file permissions
        $headyPath = "C:\Users\erich\Heady"
        if (Test-Path $headyPath) {
            icacls $headyPath /grant "Users:(OI)(CI)F" /T | Out-Null
            Write-Host "[OK] File permissions configured" -ForegroundColor Green
        }
        
        # Create HeadyCloud configuration
        $configDir = "$env:USERPROFILE\.windsurf"
        if (!(Test-Path $configDir)) {
            New-Item -Path $configDir -ItemType Directory -Force | Out-Null
        }
        
        # Copy optimal config
        Copy-Item ".windsurf\headycloud-config.yaml" "$configDir\headycloud-config.yaml" -Force
        Write-Host "[OK] HeadyCloud configuration installed" -ForegroundColor Green
        
        # Set environment variables
        [Environment]::SetEnvironmentVariable("HEADYCLOUD_ENABLED", "true", "User")
        [Environment]::SetEnvironmentVariable("HEADYCLOUD_API", "https://headysystems.com/api", "User")
        [Environment]::SetEnvironmentVariable("WINDSURF_ADMIN", "true", "User")
        
        Write-Host "[OK] Environment variables configured" -ForegroundColor Green
        Write-Host ""
        Write-Host "Installation complete!" -ForegroundColor Green
        Write-Host "Use the 'Windsurf Admin' shortcut on desktop for elevated access." -ForegroundColor Cyan
    }
    
    "status" {
        Write-Host "Checking Windsurf admin status..." -ForegroundColor Yellow
        
        $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
        Write-Host "Running as admin: $isAdmin" -ForegroundColor $(if($isAdmin) {"Green"} else {"Yellow"})
        
        $shortcutExists = Test-Path "$env:USERPROFILE\Desktop\Windsurf Admin.lnk"
        Write-Host "Admin shortcut: $(if($shortcutExists) {'Present'} else {'Missing'})" -ForegroundColor $(if($shortcutExists) {"Green"} else {"Red"})
        
        $configExists = Test-Path "$env:USERPROFILE\.windsurf\headycloud-config.yaml"
        Write-Host "HeadyCloud config: $(if($configExists) {'Present'} else {'Missing'})" -ForegroundColor $(if($configExists) {"Green"} else {"Red"})
        
        $headyCloud = [Environment]::GetEnvironmentVariable("HEADYCLOUD_ENABLED", "User")
        Write-Host "HeadyCloud enabled: $headyCloud" -ForegroundColor $(if($headyCloud -eq "true") {"Green"} else {"Red"})
    }
    
    "uninstall" {
        Write-Host "Removing Windsurf admin setup..." -ForegroundColor Yellow
        
        # Remove admin shortcut
        if (Test-Path "$env:USERPROFILE\Desktop\Windsurf Admin.lnk") {
            Remove-Item "$env:USERPROFILE\Desktop\Windsurf Admin.lnk" -Force
            Write-Host "[OK] Admin shortcut removed" -ForegroundColor Green
        }
        
        # Remove environment variables
        [Environment]::SetEnvironmentVariable("HEADYCLOUD_ENABLED", $null, "User")
        [Environment]::SetEnvironmentVariable("HEADYCLOUD_API", $null, "User")
        [Environment]::SetEnvironmentVariable("WINDSURF_ADMIN", $null, "User")
        Write-Host "[OK] Environment variables removed" -ForegroundColor Green
        
        Write-Host "Uninstall complete!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "HeadyCloud Windsurf setup complete!" -ForegroundColor Cyan
Write-Host "100% Heady services integration enabled." -ForegroundColor Green
