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
<# ║  FILE: scripts/headycloud-memory-scanner.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
# HeadyCloud Deep Data Scanner
# Scans and incorporates personal/project data into persistent memory

param(
    [string]$ScanType = "deep",
    [switch]$IncludePersonal,
    [switch]$IncludeProject,
    [switch]$ForceRebuild,
    [string]$OutputFormat = "HeadyCloud"
)

$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\erich\Heady'

Write-Host 'HeadyCloud Deep Data Scanner' -ForegroundColor Cyan
Write-Host '===========================' -ForegroundColor Cyan
Write-Host ''

# Initialize persistent memory in HeadyCloud
$MemoryInit = @{
    action = "initialize_deep_scan"
    scan_type = $ScanType
    include_personal = $IncludePersonal.IsPresent
    include_project = $IncludeProject.IsPresent
    force_rebuild = $ForceRebuild.IsPresent
    timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    storage = "HeadyCloud"
}

# Store initialization in HeadyCloud registry
try {
    $initPayload = $MemoryInit | ConvertTo-Json -Depth 10
    $response = Invoke-RestMethod -Uri "https://headysystems.com/api/registry/init" -Method POST -Body $initPayload -ContentType "application/json" -TimeoutSec 30
    Write-Host "[OK] HeadyCloud memory initialized" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Using local fallback for HeadyCloud memory" -ForegroundColor Yellow
}

# Deep scan configuration
$ScanConfig = @{
    personal_data_paths = @(
        "$env:USERPROFILE\Documents",
        "$env:USERPROFILE\Desktop",
        "$env:USERPROFILE\Downloads",
        "$env:USERPROFILE\Pictures",
        "C:\Users\erich\CrossDevice"
    )
    
    project_data_paths = @(
        "C:\Users\erich\Heady",
        "C:\Users\erich\Heady-Sandbox",
        "C:\Users\erich\HeadyStack"
    )
    
    file_patterns = @(
        "*.md", "*.txt", "*.json", "*.yaml", "*.yml", "*.ps1", "*.js", "*.jsx",
        "*.ts", "*.tsx", "*.py", "*.html", "*.css", "*.config", "*.env", "*.gitignore"
    )
    
    exclude_patterns = @(
        "node_modules", ".git", "dist", "build", "cache", "temp", "*.tmp", "*.log"
    )
    
    data_categories = @(
        "project_structure", "code_patterns", "configuration", "documentation",
        "user_preferences", "workflows", "dependencies", "assets", "secrets"
    )
}

Write-Host "Scan Configuration:" -ForegroundColor Yellow
Write-Host "- Scan Type: $ScanType" -ForegroundColor White
Write-Host "- Personal Data: $(if($IncludePersonal) {'Included'} else {'Excluded'})" -ForegroundColor White
Write-Host "- Project Data: $(if($IncludeProject) {'Included'} else {'Excluded'})" -ForegroundColor White
Write-Host "- Force Rebuild: $(if($ForceRebuild) {'Yes'} else {'No'})" -ForegroundColor White
Write-Host ''

# Phase 1: Personal Data Scan
if ($IncludePersonal) {
    Write-Host '[Phase 1] Scanning Personal Data...' -ForegroundColor Yellow
    Write-Host '----------------------------------' -ForegroundColor Yellow
    
    $PersonalData = @()
    $scanCount = 0
    
    foreach ($path in $ScanConfig.personal_data_paths) {
        if (Test-Path $path) {
            Write-Host "  Scanning: $path" -ForegroundColor Blue
            
            $files = Get-ChildItem -Path $path -File -Recurse -Depth 5 | Where-Object {
                $ScanConfig.file_patterns | ForEach-Object { -Parallel { 
                    if ($_.Name -like $_) { return $true }
                }
                return $false
            } | Where-Object {
                $exclude = $false
                $ScanConfig.exclude_patterns | ForEach-Object { -Parallel {
                    if ($_.FullName -like "*$_*") { $exclude = $true; break }
                }
                return -not $exclude
            }
            
            foreach ($file in $files) {
                $scanCount++
                $fileData = @{
                    path = $file.FullName
                    name = $file.Name
                    size = $file.Length
                    modified = $file.LastWriteTime.ToString('yyyy-MM-ddTHH:mm:ssZ')
                    category = "personal"
                    type = [System.IO.Path]::GetExtension($file.Name).TrimStart('.')
                }
                
                # Extract content for small files
                if ($file.Length -lt 1MB) {
                    try {
                        $content = [System.IO.File]::ReadAllText($file.FullName) -Encoding UTF8
                        if ($content.Length -lt 100KB) {
                            $fileData.content = $content
                            $fileData.content_hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($content)) | ForEach-Object { -Parallel { $_.ToString("x2") } | Join-String -Separator ""
                        }
                    } catch {
                        $fileData.content_error = $true
                    }
                }
                
                $PersonalData += $fileData
                
                if ($scanCount % 100 -eq 0) {
                    Write-Host "    Scanned: $scanCount files..." -ForegroundColor Gray
                }
            }
        }
    }
    
    Write-Host "  [OK] Personal data scan complete: $scanCount files" -ForegroundColor Green
    
    # Store personal data in HeadyCloud
    $PersonalMemory = @{
        type = "personal_data"
        scan_timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
        file_count = $PersonalData.Count
        data = $PersonalData
        categories = $ScanConfig.data_categories
    }
    
    try {
        $personalPayload = $PersonalMemory | ConvertTo-Json -Depth 10 -Compress
        $response = Invoke-RestMethod -Uri "https://headysystems.com/api/memory/store/personal" -Method POST -Body $personalPayload -ContentType "application/json" -TimeoutSec 60
        Write-Host "  [OK] Personal data stored in HeadyCloud" -ForegroundColor Green
    } catch {
        Write-Host "  [WARN] Personal data stored locally" -ForegroundColor Yellow
        $PersonalMemory | ConvertTo-Json -Depth 10 | Set-Content ".heady-memory/personal-data-scan.json"
    }
}

# Phase 2: Project Data Scan
if ($IncludeProject) {
    Write-Host ''
    Write-Host '[Phase 2] Scanning Project Data...' -ForegroundColor Yellow
    Write-Host '---------------------------------' -ForegroundColor Yellow
    
    $ProjectData = @()
    $projectScanCount = 0
    
    foreach ($path in $ScanConfig.project_data_paths) {
        if (Test-Path $path) {
            Write-Host "  Scanning: $path" -ForegroundColor Blue
            
            $files = Get-ChildItem -Path $path -File -Recurse -Depth 5 | Where-Object {
                $ScanConfig.file_patterns | ForEach-Object { -Parallel { 
                    if ($_.Name -like $_) { return $true }
                }
                return $false
            } | Where-Object {
                $exclude = $false
                $ScanConfig.exclude_patterns | ForEach-Object { -Parallel {
                    if ($_.FullName -like "*$_*") { $exclude = $true; break }
                }
                return -not $exclude
            }
            
            foreach ($file in $files) {
                $projectScanCount++
                $fileData = @{
                    path = $file.FullName
                    name = $file.Name
                    relative_path = $file.FullName.Replace($path, "").TrimStart('\').Replace('\', '/')
                    size = $file.Length
                    modified = $file.LastWriteTime.ToString('yyyy-MM-ddTHH:mm:ssZ')
                    category = "project"
                    type = [System.IO.Path]::GetExtension($file.Name).TrimStart('.')
                    project_root = $path
                }
                
                # Extract and analyze content
                if ($file.Length -lt 2MB) {
                    try {
                        $content = [System.IO.File]::ReadAllText($file.FullName) -Encoding UTF8
                        if ($content.Length -lt 200KB) {
                            $fileData.content = $content
                            $fileData.content_hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($content)) | ForEach-Object { -Parallel { $_.ToString("x2") } | Join-String -Separator ""
                            
                            # Extract patterns and insights
                            $fileData.insights = @{
                                line_count = ($content -split '\n').Count
                                word_count = ($content -split '\s+').Count
                                char_count = $content.Length
                                has_urls = [regex]::Matches($content, 'https?://[^\s]+').Count
                                has_emails = [regex]::Matches($content, '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b').Count
                                has_secrets = [regex]::Matches($content, '(password|secret|key|token)\s*[:=]\s*[^\s]+').Count
                            }
                        }
                    } catch {
                        $fileData.content_error = $true
                    }
                }
                
                $ProjectData += $fileData
                
                if ($projectScanCount % 200 -eq 0) {
                    Write-Host "    Scanned: $projectScanCount files..." -ForegroundColor Gray
                }
            }
        }
    }
    
    Write-Host "  [OK] Project data scan complete: $projectScanCount files" -ForegroundColor Green
    
    # Store project data in HeadyCloud
    $ProjectMemory = @{
        type = "project_data"
        scan_timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
        file_count = $ProjectData.Count
        data = $ProjectData
        categories = $ScanConfig.data_categories
        insights = @{
            total_size = ($ProjectData | Measure-Object -Property size -Sum).Sum
            file_types = ($ProjectData | Group-Object -Property type | Select-Object Name, Count)
            largest_files = ($ProjectData | Sort-Object -Property size -Descending | Select-Object -First 10 name, size)
            recent_files = ($ProjectData | Sort-Object -Property modified -Descending | Select-Object -First 10 name, modified)
        }
    }
    
    try {
        $projectPayload = $ProjectMemory | ConvertTo-Json -Depth 10 -Compress
        $response = Invoke-RestMethod -Uri "https://headysystems.com/api/memory/store/project" -Method POST -Body $projectPayload -ContentType "application/json" -TimeoutSec 90
        Write-Host "  [OK] Project data stored in HeadyCloud" -ForegroundColor Green
    } catch {
        Write-Host "  [WARN] Project data stored locally" -ForegroundColor Yellow
        $ProjectMemory | ConvertTo-Json -Depth 10 | Set-Content ".heady-memory/project-data-scan.json"
    }
}

# Phase 3: Pattern Analysis and Integration
Write-Host ''
Write-Host '[Phase 3] Pattern Analysis...' -ForegroundColor Yellow
Write-Host '---------------------------' -ForegroundColor Yellow

$Patterns = @{
    code_patterns = @()
    workflow_patterns = @()
    configuration_patterns = @()
    user_patterns = @()
}

# Analyze patterns from scanned data
if ($IncludeProject -and $ProjectData) {
    # Code patterns
    $codeFiles = $ProjectData | Where-Object { @('js', 'jsx', 'ts', 'tsx', 'py', 'ps1') -contains $_.type }
    foreach ($file in $codeFiles) {
        if ($file.content) {
            $patterns = @{
                file = $file.relative_path
                imports = [regex]::Matches($file.content, '(import|from|require)\s+["''][^"'']+["'']') | ForEach-Object { -Parallel { $_.Value }
                exports = [regex]::Matches($file.content, '(export|module\.exports)\s+.*') | ForEach-Object { -Parallel { $_.Value }
                functions = [regex]::Matches($file.content, '(function|def|async\s+function)\s+\w+') | ForEach-Object { -Parallel { $_.Value }
                classes = [regex]::Matches($file.content, '(class|interface)\s+\w+') | ForEach-Object { -Parallel { $_.Value }
            }
            $Patterns.code_patterns += $patterns
        }
    }
    
    # Configuration patterns
    $configFiles = $ProjectData | Where-Object { @('json', 'yaml', 'yml', 'env', 'config') -contains $_.type }
    foreach ($file in $configFiles) {
        if ($file.content) {
            try {
                $config = $file.content | ConvertFrom-Json -ErrorAction SilentlyContinue
                $Patterns.configuration_patterns += @{
                    file = $file.relative_path
                    structure = $config.PSObject.Properties.Name
                    keys = $config.PSObject.Properties | ForEach-Object { -Parallel { $_.Name }
                }
            } catch {
                # YAML or other config format
                $Patterns.configuration_patterns += @{
                    file = $file.relative_path
                    format = $file.type
                    lines = ($file.content -split '\n').Count
                }
            }
        }
    }
}

# Store patterns in HeadyCloud
$PatternMemory = @{
    type = "pattern_analysis"
    scan_timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    patterns = $Patterns
    summary = @{
        code_patterns_found = $Patterns.code_patterns.Count
        config_patterns_found = $Patterns.configuration_patterns.Count
        total_patterns = $Patterns.code_patterns.Count + $Patterns.configuration_patterns.Count
    }
}

try {
    $patternPayload = $PatternMemory | ConvertTo-Json -Depth 10 -Compress
    $response = Invoke-RestMethod -Uri "https://headysystems.com/api/memory/store/patterns" -Method POST -Body $patternPayload -ContentType "application/json" -TimeoutSec 30
    Write-Host "  [OK] Patterns stored in HeadyCloud" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Patterns stored locally" -ForegroundColor Yellow
    $PatternMemory | ConvertTo-Json -Depth 10 | Set-Content ".heady-memory/pattern-analysis.json"
}

# Phase 4: Create Persistent Memory Index
Write-Host ''
Write-Host '[Phase 4] Creating Memory Index...' -ForegroundColor Yellow
Write-Host '------------------------------' -ForegroundColor Yellow

$MemoryIndex = @{
    scan_completed = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    scan_type = $ScanType
    storage_location = "HeadyCloud"
    personal_data = @{
        scanned = $IncludePersonal.IsPresent
        file_count = if ($IncludePersonal) { $PersonalData.Count } else { 0 }
        categories = if ($IncludePersonal) { $PersonalData | Group-Object -Property category | Select-Object Name, Count } else { @() }
    }
    project_data = @{
        scanned = $IncludeProject.IsPresent
        file_count = if ($IncludeProject) { $ProjectData.Count } else { 0 }
        categories = if ($IncludeProject) { $ProjectData | Group-Object -Property category | Select-Object Name, Count } else { @() }
    }
    patterns = @{
        code_patterns = $Patterns.code_patterns.Count
        config_patterns = $Patterns.configuration_patterns.Count
        total_patterns = $Patterns.code_patterns.Count + $Patterns.configuration_patterns.Count
    }
    memory_access_points = @(
        "https://headysystems.com/api/memory/personal",
        "https://headysystems.com/api/memory/project", 
        "https://headysystems.com/api/memory/patterns",
        "https://headysystems.com/api/registry"
    )
}

# Update HeadyRegistry with persistent memory info
$registryPath = "heady-registry.json"
if (Test-Path $registryPath) {
    $registry = Get-Content $registryPath | ConvertFrom-Json
    $registry.persistent_memory = $MemoryIndex
    $registry.last_updated = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
    $registry | ConvertTo-Json -Depth 10 | Set-Content $registryPath
    Write-Host "  [OK] HeadyRegistry updated with memory index" -ForegroundColor Green
}

# Final Summary
Write-Host ''
Write-Host 'DEEP SCAN COMPLETE!' -ForegroundColor Green
Write-Host '==================' -ForegroundColor Green
Write-Host "Scan Type: $ScanType" -ForegroundColor White
Write-Host "Storage: HeadyCloud" -ForegroundColor White
Write-Host "Personal Files: $(if($IncludePersonal) {$PersonalData.Count} else {0})" -ForegroundColor White
Write-Host "Project Files: $(if($IncludeProject) {$ProjectData.Count} else {0})" -ForegroundColor White
Write-Host "Patterns Found: $($MemoryIndex.patterns.total_patterns)" -ForegroundColor White
Write-Host ''
Write-Host 'HeadyCloud persistent memory is now active with deep data integration.' -ForegroundColor Cyan
Write-Host 'All data is available for intelligent orchestration and optimization.' -ForegroundColor Cyan
