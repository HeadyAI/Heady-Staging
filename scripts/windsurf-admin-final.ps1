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
<# ║  FILE: scripts/windsurf-admin-final.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# Windsurf Admin Privileges for HeadyCloud
# Grants admin access and configures optimal HeadyCloud development environment

param(
    [string]$Action = "install",
    [switch]$Force
)

Write-Host 'Windsurf Admin Setup for HeadyCloud' -ForegroundColor Cyan
Write-Host '==================================' -ForegroundColor Cyan

switch ($Action) {
    "install" {
        Write-Host '[INSTALL] Setting up Windsurf admin privileges...' -ForegroundColor Yellow
        
        # Check admin rights
        $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
        
        if (-not $isAdmin) {
            Write-Host '[RESTART] Restarting with admin privileges...' -ForegroundColor Yellow
            Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -Action install" -Verb RunAs
            exit
        }
        
        # Create Windsurf admin configuration
        $windsurfConfig = @{
            admin_privileges = $true
            headycloud_integration = $true
            persistent_memory_required = $true
            pre_execution_scan = $true
            adaptive_complexity = $true
            parallel_execution = $true
            cloud_optimization = $true
        }
        
        # Configure Windsurf settings
        $configDir = "$env:USERPROFILE\.windsurf"
        if (!(Test-Path $configDir)) {
            New-Item -Path $configDir -ItemType Directory -Force | Out-Null
        }
        
        # Copy HeadyCloud configuration
        Copy-Item ".windsurf/headycloud-config.yaml" "$configDir/headycloud-config.yaml" -Force
        Write-Host "[OK] HeadyCloud configuration installed" -ForegroundColor Green
        
        # Create admin shortcut
        $shortcutPath = "$env:USERPROFILE\Desktop\Windsurf HeadyCloud Admin.lnk"
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = "windsurf"
        $shortcut.Arguments = "--admin --headycloud --persistent-memory"
        $shortcut.IconLocation = "windsurf.exe"
        $shortcut.Description = "Windsurf IDE with HeadyCloud Admin Privileges"
        $shortcut.Save()
        
        Write-Host "[OK] Admin shortcut created" -ForegroundColor Green
        
        # Set environment variables
        [Environment]::SetEnvironmentVariable("WINDSURF_HEADYCLOUD", "true", "User")
        [Environment]::SetEnvironmentVariable("WINDSURF_ADMIN", "true", "User")
        [Environment]::SetEnvironmentVariable("WINDSURF_MEMORY_SCAN", "true", "User")
        
        Write-Host "[OK] Environment variables configured" -ForegroundColor Green
        Write-Host ""
        Write-Host "[SUCCESS] Windsurf admin setup complete!" -ForegroundColor Green
        Write-Host "Use 'Windsurf HeadyCloud Admin' shortcut for optimal development." -ForegroundColor Cyan
    }
    
    "status" {
        Write-Host '[STATUS] Checking Windsurf admin status...' -ForegroundColor Yellow
        
        $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
        Write-Host "Running as admin: $isAdmin" -ForegroundColor $(if($isAdmin) {"Green"} else {"Yellow"})
        
        $configExists = Test-Path "$env:USERPROFILE\.windsurf\headycloud-config.yaml"
        Write-Host "HeadyCloud config: $(if($configExists) {'Present'} else {'Missing'})" -ForegroundColor $(if($configExists) {"Green"} else {"Red"})
        
        $shortcutExists = Test-Path "$env:USERPROFILE\Desktop\Windsurf HeadyCloud Admin.lnk"
        Write-Host "Admin shortcut: $(if($shortcutExists) {'Present'} else {'Missing'})" -ForegroundColor $(if($shortcutExists) {"Green"} else {"Red"})
        
        $headyCloud = [Environment]::GetEnvironmentVariable("WINDSURF_HEADYCLOUD", "User")
        Write-Host "HeadyCloud enabled: $headyCloud" -ForegroundColor $(if($headyCloud -eq "true") {"Green"} else {"Red"})
    }
    
    "uninstall" {
        Write-Host '[UNINSTALL] Removing Windsurf admin setup...' -ForegroundColor Yellow
        
        if (Test-Path "$env:USERPROFILE\Desktop\Windsurf HeadyCloud Admin.lnk") {
            Remove-Item "$env:USERPROFILE\Desktop\Windsurf HeadyCloud Admin.lnk" -Force
            Write-Host "[OK] Admin shortcut removed" -ForegroundColor Green
        }
        
        [Environment]::SetEnvironmentVariable("WINDSURF_HEADYCLOUD", $null, "User")
        [Environment]::SetEnvironmentVariable("WINDSURF_ADMIN", $null, "User")
        [Environment]::SetEnvironmentVariable("WINDSURF_MEMORY_SCAN", $null, "User")
        
        Write-Host "[OK] Environment variables removed" -ForegroundColor Green
        Write-Host "[SUCCESS] Uninstall complete" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Windsurf HeadyCloud Admin Setup Complete!" -ForegroundColor Cyan
Write-Host "100% HeadyCloud integration enabled." -ForegroundColor Green
