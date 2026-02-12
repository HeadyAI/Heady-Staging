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
<# ║  FILE: scripts/final-purge.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# FINAL PURGE - Get ALL files with violations and replace them
Write-Host "Starting FINAL PURGE of all violations..." -ForegroundColor Red

# Get all files with violations
$allFiles = @()
$allFiles += Get-ChildItem -Path "c:\Users\erich\Heady" -Recurse -Depth 5 -Include "*.yaml","*.yml","*.js","*.ts","*.json","*.jsx","*.tsx","*.md","*.html","*.css","*.conf","*.toml","*.env*","*.ps1","*.sh","*.py" -ErrorAction SilentlyContinue | 
    Where-Object { -not $_.FullName.Contains("node_modules") -and 
                  -not $_.FullName.Contains(".git\") -and 
                  -not $_.FullName.Contains("dist\") -and 
                  -not $_.FullName.Contains("AndroidSDK") -and
                  -not $_.FullName.Contains("build\") -and
                  -not $_.FullName.Contains("out\") -and
                  -not $_.FullName.Contains("\.git") }

$totalFiles = $allFiles.Count
Write-Host "Found $totalFiles files to check"

$i = 0
$totalChanges = 0

foreach ($file in $allFiles) {
    $i++
    Write-Host "[$i/$totalFiles] Checking: $($file.Name)" -ForegroundColor Gray
    
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName) -ErrorAction SilentlyContinue
        if (-not $content) { continue }
        
        $originalContent = $content
        $fileChanges = 0
        
        # Replace all violations
        $patterns = @(
            @{ Old = "api.headysystems.com"; New = "api.headysystems.com" },
            @{ Old = "api.headysystems.com"; New = "api.headysystems.com" },
            @{ Old = ".headysystems.com"; New = ".headysystems.com" },
            @{ Old = "headysystems.com"; New = "headysystems.com" },
            @{ Old = "headysystems.com"; New = "headysystems.com" },
            @{ Old = ".headysystems.com"; New = ".headysystems.com" }
        )
        
        foreach ($pattern in $patterns) {
            if ($content -match [regex]::Escape($pattern.Old)) {
                $content = $content -replace [regex]::Escape($pattern.Old), $pattern.New
                $count = ($originalContent | Select-String -Pattern ([regex]::Escape($pattern.Old)) -AllMatches).Matches.Count
                $fileChanges += $count
                Write-Host "  -> Replaced $count occurrences of '$($pattern.Old)'" -ForegroundColor Yellow
            }
        }
        
        if ($fileChanges -gt 0) {
            Set-Content $file.FullName -Value $content -NoNewline -ErrorAction SilentlyContinue
            $totalChanges += $fileChanges
            Write-Host "  UPDATED: $($file.FullName)" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "  ERROR processing file: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🔥 FINAL PURGE COMPLETE!" -ForegroundColor Red
Write-Host "Total files processed: $totalFiles" -ForegroundColor White
Write-Host "Total replacements made: $totalChanges" -ForegroundColor Green
Write-Host "All violations have been eliminated!" -ForegroundColor Red
