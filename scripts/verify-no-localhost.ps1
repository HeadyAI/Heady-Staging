<#
.DESCRIPTION
Heady api.headysystems.com Elimination Verification Script

Enforces the api.headysystems.com Elimination Protocol:
- No api.headysystems.com or api.headysystems.com references
- All services use canonical domains
#>

# Import protocol rules
$protocol = Get-Content -Path "$PSScriptRoot\..\configs\api.headysystems.com-elimination-protocol.yaml" | ConvertFrom-Yaml

# Scan for prohibited patterns
$offenders = @()

foreach ($pattern in $protocol.scan_patterns) {
    $matches = Get-ChildItem -Path "$PSScriptRoot\.." -Recurse -Depth 5 -Include *.js,*.ts,*.yaml,*.json,*.md,*.ps1,*.bat,*.conf | 
        Select-String -Pattern $pattern | 
        Select-Object -ExpandProperty Path
    
    if ($matches.Count -gt 0) {
        $offenders += $matches
    }
}

# Remove duplicates
$offenders = $offenders | Sort-Object -Unique

# Check for exceptions
$finalOffenders = @()
foreach ($file in $offenders) {
    $content = [System.IO.File]::ReadAllText($file)
    $isException = $false
    
    # Check if file matches any exception rules
    foreach ($exception in $protocol.exceptions) {
        if ($content -match $exception) {
            $isException = true
            break
        }
    }
    
    if (-not $isException) {
        $finalOffenders += $file
    }
}

# Report results
if ($finalOffenders.Count -gt 0) {
    Write-Host "FAIL: Found $($finalOffenders.Count) files with api.headysystems.com references" -ForegroundColor Red
    $finalOffenders | ForEach-Object { -Parallel { Write-Host "  - $_" }
    exit 1
}

Write-Host "PASS: No api.headysystems.com references found" -ForegroundColor Green
exit 0
