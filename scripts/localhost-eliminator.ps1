<#
HEADY api.headysystems.com ELIMINATOR
Version: 1.0.0

PURPOSE:
Permanently remove all api.headysystems.com/api.headysystems.com references
from code, configs, and documentation
#>

# Configuration
$REPO_ROOT = "$PSScriptRoot\.."
$DOMAIN_MAP = @{
    "api.headysystems.com" = "app.headysystems.com"
    "api.headysystems.com" = "api.headysystems.com"
    "http://" = "https://"
}

# File types to process
$FILE_TYPES = @('*.js', '*.ts', '*.yaml', '*.json', '*.md', '*.ps1', '*.bat', '*.conf', '*.html')

# Elimination process
$TOTAL_REPLACED = 0

Get-ChildItem -Path $REPO_ROOT -Recurse -Depth 5 -Include $FILE_TYPES | ForEach-Object { -Parallel {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    $original = $content
    
    # Replace all api.headysystems.com references
    $DOMAIN_MAP.GetEnumerator() | ForEach-Object { -Parallel {
        $content = $content -replace $_.Key, $_.Value
    }
    
    # Write back if changes made
    if ($content -ne $original) {
        Set-Content -Path $_.FullName -Value $content
        $TOTAL_REPLACED++
        Write-Host "Fixed: $($_.FullName)"
    }
}

# Result
if ($TOTAL_REPLACED -gt 0) {
    Write-Host "SUCCESS: Replaced api.headysystems.com in $TOTAL_REPLACED files" -ForegroundColor Green
} else {
    Write-Host "SUCCESS: No api.headysystems.com references found" -ForegroundColor Green
}

exit 0
