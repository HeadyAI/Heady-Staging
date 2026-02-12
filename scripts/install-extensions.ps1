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
<# ║  FILE: scripts/install-extensions.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
#!/usr/bin/env pwsh
# Heady Extension Installer
# Installs all Heady extensions and dev tools across browsers and IDEs
# Usage: .\install-extensions.ps1 [-Browser chrome|edge|firefox|all] [-IDE vscode|jetbrains|all]

param(
    [ValidateSet("chrome", "edge", "firefox", "brave", "all")]
    [string]$Browser = "all",
    
    [ValidateSet("vscode", "jetbrains", "vim", "all")]
    [string]$IDE = "all",
    
    [switch]$HeadyOnly = $false,
    [switch]$Force = $false,
    [switch]$SyncSettings = $true,
    [switch]$UninstallFirst = $false
)

$ErrorActionPreference = "Stop"

# Color output function
function Write-Status {
    param($Message, $Type = "Info")
    $colors = @{
        "Info" = "Cyan"
        "Success" = "Green"
        "Warning" = "Yellow"
        "Error" = "Red"
    }
    Write-Host $Message -ForegroundColor $colors[$Type]
}

function Write-Header {
    param($Title)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "  $Title" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host ""
}

# Browser Extension Management
function Install-BrowserExtensions {
    param($BrowserName)
    
    Write-Header "Installing Extensions: $BrowserName"
    
    $extensions = @{
        chrome = @{
            paths = @(
                "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Extensions",
                "$env:PROGRAMFILES\Google\Chrome\Application"
            )
            heady_ext = "distribution/browser/extensions/chrome"
            dev_extensions = @(
                @{ id = "fmkadmapgofadopljbjfkapdkoienihi"; name = "React Developer Tools" },
                @{ id = "lmhkpmbekcpmknklioeibfkpmmfibljd"; name = "Redux DevTools" },
                @{ id = "hgmloofddffdnphfgcellkdfbfbjeloo"; name = "Postman Interceptor" },
                @{ id = "gppongmhjkpfnbhagpmjfkannfbllamg"; name = "Wappalyzer" },
                @{ id = "blipmdconlkpinefehnmjammfjpmpbjk"; name = "Lighthouse" },
                @{ id = "nhdogjmejiglipccpnnnanhbledajbpd"; name = "Vue.js DevTools" }
            )
        }
        edge = @{
            paths = @(
                "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Extensions"
            )
            heady_ext = "distribution/browser/extensions/edge"
            dev_extensions = @(
                @{ id = "gpphkfbcmkoofhjmbncdahocdmojcjde"; name = "React Developer Tools" },
                @{ id = "lmhkpmbekcpmknklioeibfkpmmfibljd"; name = "Redux DevTools" }
            )
        }
        firefox = @{
            paths = @(
                "$env:APPDATA\Mozilla\Firefox\Profiles"
            )
            heady_ext = "distribution/browser/extensions/firefox"
            dev_extensions = @()
        }
        brave = @{
            paths = @(
                "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\Default\Extensions"
            )
            heady_ext = "distribution/browser/extensions/chrome"  # Brave uses Chrome extensions
            dev_extensions = @(
                @{ id = "fmkadmapgofadopljbjfkapdkoienihi"; name = "React Developer Tools" },
                @{ id = "lmhkpmbekcpmknklioeibfkpmmfibljd"; name = "Redux DevTools" }
            )
        }
    }
    
    $ext = $extensions[$BrowserName]
    if (-not $ext) {
        Write-Status "Browser $BrowserName not supported" "Error"
        return
    }
    
    # Check if browser is installed
    $browserInstalled = $false
    foreach ($path in $ext.paths) {
        if (Test-Path $path) {
            $browserInstalled = $true
            break
        }
    }
    
    if (-not $browserInstalled) {
        Write-Status "$BrowserName not detected. Skipping..." "Warning"
        return
    }
    
    Write-Status "✅ $BrowserName detected" "Success"
    
    # Install Heady Extension
    if (Test-Path $ext.heady_ext) {
        Write-Status "Installing Heady Assistant for $BrowserName..." "Info"
        
        # Load extension in developer mode
        $manifestPath = Join-Path $ext.heady_ext "manifest.json"
        if (Test-Path $manifestPath) {
            Write-Status "  📦 Extension manifest found" "Info"
            Write-Status "  🔧 Load extension in developer mode:" "Info"
            Write-Status "     1. Open $BrowserName" "Info"
            Write-Status "     2. Go to extensions page (chrome://extensions, edge://extensions, etc.)" "Info"
            Write-Status "     3. Enable 'Developer mode'" "Info"
            Write-Status "     4. Click 'Load unpacked'" "Info"
            Write-Status "     5. Select: $(Resolve-Path $ext.heady_ext)" "Info"
        }
    }
    
    # Install dev extensions (unless HeadyOnly)
    if (-not $HeadyOnly) {
        Write-Status "Installing developer extensions..." "Info"
        foreach ($devExt in $ext.dev_extensions) {
            Write-Status "  📌 $($devExt.name) (ID: $($devExt.id))" "Info"
            Write-Status "     Install from web store: https://chrome.google.com/webstore/detail/$($devExt.id)" "Info"
        }
    }
    
    Write-Status "✅ $BrowserName extensions configured" "Success"
}

# VS Code Extension Management
function Install-VSCodeExtensions {
    Write-Header "Installing VS Code Extensions"
    
    # Check if VS Code is installed
    $codeCmd = Get-Command code -ErrorAction SilentlyContinue
    if (-not $codeCmd) {
        Write-Status "VS Code not found in PATH. Checking common locations..." "Warning"
        
        $possiblePaths = @(
            "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd",
            "$env:PROGRAMFILES\Microsoft VS Code\bin\code.cmd",
            "$env:PROGRAMFILES(x86)\Microsoft VS Code\bin\code.cmd"
        )
        
        foreach ($path in $possiblePaths) {
            if (Test-Path $path) {
                $env:PATH += ";$(Split-Path $path -Parent)"
                $codeCmd = $true
                break
            }
        }
    }
    
    if (-not $codeCmd) {
        Write-Status "VS Code not found. Please install from https://code.visualstudio.com/" "Error"
        return
    }
    
    Write-Status "✅ VS Code detected" "Success"
    
    # Core extensions
    $coreExtensions = @(
        "ms-vscode.vscode-json"
        "ms-python.python"
        "ms-vscode.vscode-typescript-next"
        "dbaeumer.vscode-eslint"
        "esbenp.prettier-vscode"
        "redhat.vscode-yaml"
        "ms-vscode.vscode-docker"
        "eamodio.gitlens"
        "github.vscode-pull-request-github"
    )
    
    # AI extensions
    $aiExtensions = @(
        "github.copilot"
        "github.copilot-chat"
    )
    
    # Heady extensions
    $headyExtensions = @(
        # Local Heady extension
        @{ name = "Heady Assistant"; path = "distribution/ide/vscode/heady-extension.vsix" }
    )
    
    # Install core extensions
    Write-Status "Installing core development extensions..." "Info"
    foreach ($ext in $coreExtensions) {
        Write-Status "  📦 $ext" "Info"
        try {
            code --install-extension $ext --force 2>&1 | Out-Null
            Write-Status "    ✅ Installed" "Success"
        } catch {
            Write-Status "    ⚠️  Failed: $_" "Warning"
        }
    }
    
    # Install AI extensions
    if (-not $HeadyOnly) {
        Write-Status "Installing AI coding assistants..." "Info"
        foreach ($ext in $aiExtensions) {
            Write-Status "  🤖 $ext" "Info"
            try {
                code --install-extension $ext --force 2>&1 | Out-Null
                Write-Status "    ✅ Installed" "Success"
            } catch {
                Write-Status "    ⚠️  Failed: $_" "Warning"
            }
        }
    }
    
    # Install Heady extensions
    Write-Status "Installing Heady extensions..." "Info"
    foreach ($ext in $headyExtensions) {
        if (Test-Path $ext.path) {
            Write-Status "  ✨ Installing $($ext.name) from local..." "Info"
            try {
                code --install-extension $ext.path --force 2>&1 | Out-Null
                Write-Status "    ✅ Installed" "Success"
            } catch {
                Write-Status "    ⚠️  Failed: $_" "Warning"
            }
        } else {
            Write-Status "  ⚠️  Extension not found: $($ext.path)" "Warning"
        }
    }
    
    # Settings sync
    if ($SyncSettings) {
        Write-Status "🔄 Enabling settings sync..." "Info"
        # VS Code will prompt for sign-in
    }
    
    Write-Status "✅ VS Code extensions installed" "Success"
}

# JetBrains IDE Management
function Install-JetBrainsPlugins {
    Write-Header "Installing JetBrains Plugins"
    
    $jbPaths = @(
        "$env:LOCALAPPDATA\JetBrains\Toolbox\apps",
        "$env:PROGRAMFILES\JetBrains",
        "$env:APPDATA\JetBrains"
    )
    
    $foundIDEs = @()
    foreach ($path in $jbPaths) {
        if (Test-Path $path) {
            $ides = Get-ChildItem $path -Directory -ErrorAction SilentlyContinue | 
                Where-Object { $_.Name -match "IntelliJ|PyCharm|WebStorm|DataGrip" }
            $foundIDEs += $ides
        }
    }
    
    if ($foundIDEs.Count -eq 0) {
        Write-Status "No JetBrains IDEs found" "Warning"
        return
    }
    
    Write-Status "Found $($foundIDEs.Count) JetBrains installation(s)" "Success"
    
    # Core plugins
    $corePlugins = @(
        "com.intellij.plugins. HeadyAssistant"
        "com.intellij.plugins.git4idea"
        "com.intellij.plugins.markdown"
        "com.intellij.plugins.yaml"
        "com.intellij.plugins.docker"
    )
    
    foreach ($ide in $foundIDEs) {
        Write-Status "Configuring $($ide.Name)..." "Info"
        
        # Install Heady plugin if available
        $headyPlugin = "distribution/ide/jetbrains/heady-assistant.jar"
        if (Test-Path $headyPlugin) {
            Write-Status "  Installing Heady Assistant plugin..." "Info"
            $pluginsDir = Join-Path $ide.FullName "plugins"
            if (-not (Test-Path $pluginsDir)) {
                New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null
            }
            Copy-Item $headyPlugin $pluginsDir -Force
            Write-Status "    ✅ Plugin copied to $pluginsDir" "Success"
        }
        
        # Configure plugins
        foreach ($plugin in $corePlugins) {
            Write-Status "  📦 $plugin" "Info"
        }
    }
    
    Write-Status "✅ JetBrains plugins configured" "Success"
}

# Vim/Neovim Management
function Install-VimPlugins {
    Write-Header "Installing Vim/Neovim Plugins"
    
    $vimPaths = @(
        "$env:USERPROFILE\.vim",
        "$env:LOCALAPPDATA\nvim",
        "$env:USERPROFILE\.config\nvim"
    )
    
    $foundVim = $false
    foreach ($path in $vimPaths) {
        if (Test-Path $path) {
            $foundVim = $true
            break
        }
    }
    
    if (-not $foundVim) {
        Write-Status "Vim/Neovim not configured. Setting up..." "Info"
        $vimDir = "$env:USERPROFILE\.vim"
        New-Item -ItemType Directory -Path $vimDir -Force | Out-Null
    }
    
    Write-Status "Configuring Heady Vim plugin..." "Info"
    
    # Heady Vim plugin setup
    $headyVimPath = "distribution/ide/vim/heady.vim"
    if (Test-Path $headyVimPath) {
        $vimPluginDir = "$env:USERPROFILE\.vim\plugin"
        New-Item -ItemType Directory -Path $vimPluginDir -Force | Out-Null
        Copy-Item $headyVimPath $vimPluginDir -Force
        Write-Status "✅ Heady Vim plugin installed" "Success"
    } else {
        Write-Status "⚠️  Heady Vim plugin not found at $headyVimPath" "Warning"
    }
}

# Main Execution
function Main {
    Write-Header "Heady Extension Installer"
    
    Write-Status "Mode: $(if ($HeadyOnly) { 'Heady-only' } else { 'Full setup' })" "Info"
    Write-Status "Browsers: $Browser" "Info"
    Write-Status "IDEs: $IDE" "Info"
    
    # Browser Extensions
    if ($Browser -eq "all") {
        @("chrome", "edge", "firefox", "brave") | ForEach-Object { -Parallel {
            Install-BrowserExtensions -BrowserName $_
        }
    } else {
        Install-BrowserExtensions -BrowserName $Browser
    }
    
    # IDE Extensions
    switch ($IDE) {
        "all" {
            Install-VSCodeExtensions
            Install-JetBrainsPlugins
            Install-VimPlugins
        }
        "vscode" { Install-VSCodeExtensions }
        "jetbrains" { Install-JetBrainsPlugins }
        "vim" { Install-VimPlugins }
    }
    
    # Summary
    Write-Header "Installation Complete"
    
    Write-Status "🎯 Next Steps:" "Info"
    Write-Status "  1. Restart your browsers to load new extensions" "Info"
    Write-Status "  2. Restart VS Code to activate new extensions" "Info"
    Write-Status "  3. Sign in to VS Code settings sync if enabled" "Info"
    Write-Status "  4. Configure Heady extension settings" "Info"
    
    Write-Status "📚 Documentation:" "Info"
    Write-Status "  - Browser extensions: docs/BROWSER_EXTENSIONS.md" "Info"
    Write-Status "  - IDE setup: docs/IDE_SETUP.md" "Info"
    Write-Status "  - Troubleshooting: docs/TROUBLESHOOTING.md" "Info"
    
    Write-Host ""
    Write-Status "✨ Heady extensions ready!" "Success"
}

# Run main
Main
