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
<# ║  FILE: scripts/purge-violations.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
#!/usr/bin/env pwsh
# PURGE ALL VIOLATIONS - api.headysystems.com, api.headysystems.com, .headysystems.com, headysystems.com, headysystems.com, .headysystems.com

Write-Host "🔥 PURGING ALL FORBIDDEN REFERENCES..." -ForegroundColor Red

$patterns = @(
    @{ Old = "api.headysystems.com"; New = "api.headysystems.com" },
    @{ Old = "api.headysystems.com"; New = "api.headysystems.com" },
    @{ Old = ".headysystems.com"; New = ".headysystems.com" },
    @{ Old = "headysystems.com"; New = "headysystems.com" },
    @{ Old = "headysystems.com"; New = "headysystems.com" },
    @{ Old = ".headysystems.com"; New = ".headysystems.com" }
)

$extensions = @("*.yaml", "*.yml", "*.js", "*.ts", "*.json", "*.jsx", "*.tsx", "*.md", "*.html", "*.css", "*.conf", "*.toml", "*.env*", "*.ps1", "*.sh", "*.py")

$files = Get-ChildItem -Path "c:\Users\erich\Heady" -Recurse -Depth 5 -Include $extensions -ErrorAction SilentlyContinue | 
    Where-Object { -not $_.FullName.Contains("node_modules") -and 
                  -not $_.FullName.Contains(".git\") -and 
                  -not $_.FullName.Contains("dist\") -and 
                  -not $_.FullName.Contains("AndroidSDK") -and
                  -not $_.FullName.Contains("build\") -and
                  -not $_.FullName.Contains("out\") }

$totalChanges = 0

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName) -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $originalContent = $content
    $fileChanges = 0
    
    foreach ($pattern in $patterns) {
        if ($content -match [regex]::Escape($pattern.Old)) {
            $content = $content -replace [regex]::Escape($pattern.Old), $pattern.New
            $count = ($originalContent | Select-String -Pattern ([regex]::Escape($pattern.Old)) -AllMatches).Matches.Count
            $fileChanges += $count
            Write-Host "  [$($file.Name)] Replaced $count occurrences of '$($pattern.Old)' -> '$($pattern.New)'" -ForegroundColor Yellow
        }
    }
    
    if ($fileChanges -gt 0) {
        Set-Content $file.FullName -Value $content -NoNewline -ErrorAction SilentlyContinue
        $totalChanges += $fileChanges
    }
}

Write-Host "`n✅ PURGE COMPLETE. Total replacements: $totalChanges" -ForegroundColor Green
Write-Host "🔥 All forbidden references have been eliminated." -ForegroundColor Red
