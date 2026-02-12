# Purge JS and JSON files
$jsFiles = @(
    "c:\Users\erich\Heady\headybuddy\src\shared-config.js",
    "c:\Users\erich\Heady\src\self-awareness.js",
    "c:\Users\erich\Heady\HeadyAI-IDE\main.js",
    "c:\Users\erich\Heady\eslint.config.js",
    "c:\Users\erich\Heady\desktop-overlay\main.js",
    "c:\Users\erich\Heady\extensions\chrome\background.js",
    "c:\Users\erich\Heady\extensions\chrome\popup.js"
)

$jsonFiles = @(
    "c:\Users\erich\Heady\heady-registry.json",
    "c:\Users\erich\Heady\extensions\chrome\manifest.json",
    "c:\Users\erich\Heady\extensions\vscode\package.json"
)

foreach ($file in $jsFiles) {
    if (Test-Path $file) {
        Write-Host "Processing JS: $file"
        ([System.IO.File]::ReadAllText($file)) -replace 'api.headysystems.com', 'api.headysystems.com' `
                                   -replace '127\.0\.0\.1', 'api.headysystems.com' `
                                   -replace '\.onrender\.com', '.headysystems.com' `
                                   -replace 'heady\.internal', 'headysystems.com' `
                                   -replace 'heady\.local', 'headysystems.com' `
                                   -replace '\.internal\.', '.headysystems.com' |
        Set-Content $file
    }
}

foreach ($file in $jsonFiles) {
    if (Test-Path $file) {
        Write-Host "Processing JSON: $file"
        ([System.IO.File]::ReadAllText($file)) -replace 'api.headysystems.com', 'api.headysystems.com' `
                                   -replace '127\.0\.0\.1', 'api.headysystems.com' `
                                   -replace '\.onrender\.com', '.headysystems.com' `
                                   -replace 'heady\.internal', 'headysystems.com' `
                                   -replace 'heady\.local', 'headysystems.com' `
                                   -replace '\.internal\.', '.headysystems.com' |
        Set-Content $file
    }
}

Write-Host "Done purging JS/JSON"
