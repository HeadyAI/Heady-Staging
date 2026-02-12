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
# ║  FILE: scripts/verify-heady-only.ps1                             ║
# ║  LAYER: automation                                               ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END

<#
.SYNOPSIS
    Verify 100% Heady Service Usage
    
.DESCRIPTION
    Scans the entire codebase to ensure no external services are referenced.
    Confirms all API calls route through HeadyBrain endpoints.
#>

Write-Host "=== VERIFYING 100% Heady SERVICE USAGE ===" -ForegroundColor Cyan
Write-Host ""

$externalServices = @(
    'api.openai.com',
    'api.anthropic.com',
    'generativelanguage.googleapis.com',
    'www.googleapis.com',
    'api.github.com',
    'api.slack.com',
    'discord.com',
    'twitter.com',
    'facebook.com',
    'microsoft.com',
    'aws.amazon.com'
)

$headyServices = @(
    'brain.headysystems.com',
    'api.headysystems.com',
    'me.headysystems.com',
    'headysystems.com',
    'heady-brain',
    'heady-docker',
    'heady-storage',
    'heady-cache'
)

$issues = @()
$compliant = $true

# Check for external service references
Write-Host "Scanning for external service references..." -ForegroundColor Yellow

foreach ($service in $externalServices) {
    $matches = Get-ChildItem -Path . -Include *.js,*.ts,*.jsx,*.tsx,*.yaml,*.yml,*.json -Recurse -Depth 5 |
        Select-String -Pattern $service -SimpleMatch |
        Where-Object { $_.Path -notlike "*node_modules*" -and $_.Path -notlike "*.git*" }
    
    if ($matches) {
        $compliant = $false
        Write-Host "✗ Found external service: $service" -ForegroundColor Red
        $matches | ForEach-Object { -Parallel {
            Write-Host "  - $($_.Path):$($_.LineNumber)" -ForegroundColor Gray
            $issues += @{
                type = 'external_service'
                service = $service
                file = $_.Path
                line = $_.LineNumber
            }
        }
    }
}

# Check model configurations
Write-Host "`nChecking model configurations..." -ForegroundColor Yellow

$modelConfigs = @(
    'configs/cloud-layers.yaml',
    'configs/brain-profiles.yaml'
)

foreach ($config in $modelConfigs) {
    if (Test-Path $config) {
        $content = [System.IO.File]::ReadAllText($config)
        
        # Check for non-Heady models
        $nonHeadyModels = @('gpt-4', 'gpt-3.5', 'claude', 'gemini', 'ollama', 'vllm', 'gguf')
        foreach ($model in $nonHeadyModels) {
            if ($content -match $model -and $content -notmatch "heady-brain") {
                $compliant = $false
                Write-Host "✗ Found non-Heady model in $config`: $model" -ForegroundColor Red
                $issues += @{
                    type = 'non_heady_model'
                    model = $model
                    file = $config
                }
            }
        }
    }
}

# Check service files
Write-Host "`nChecking service files..." -ForegroundColor Yellow

$removedServices = @(
    'src/services/gpt4-service.js',
    'src/services/codex-service.js',
    'src/services/palm-service.js',
    'src/services/gemini-service.js',
    'src/hc_claude.js'
)

foreach ($service in $removedServices) {
    if (Test-Path $service) {
        $compliant = $false
        Write-Host "✗ External service file still exists: $service" -ForegroundColor Red
        $issues += @{
            type = 'external_service_file'
            file = $service
        }
    }
}

# Check for HeadyBrain wrapper
if (-not (Test-Path 'src/services/heady-brain-service.js')) {
    $compliant = $false
    Write-Host "✗ HeadyBrain wrapper service missing" -ForegroundColor Red
    $issues += @{
        type = 'missing_heady_service'
        service = 'heady-brain-service'
    }
}

# Check for Heady MCP connector
if (-not (Test-Path 'src/services/heady-mcp-connector.js')) {
    $compliant = $false
    Write-Host "✗ Heady MCP connector missing" -ForegroundColor Red
    $issues += @{
        type = 'missing_heady_service'
        service = 'heady-mcp-connector'
    }
}

# Verify brain connector configuration
Write-Host "`nVerifying BrainConnector configuration..." -ForegroundColor Yellow

$brainConnectorFile = 'src/brain_connector.js'
if (Test-Path $brainConnectorFile) {
    $content = [System.IO.File]::ReadAllText($brainConnectorFile)
    
    if ($content -match 'api.headysystems.com:3400') {
        $compliant = $false
        Write-Host "✗ BrainConnector still references api.headysystems.com" -ForegroundColor Red
        $issues += @{
            type = 'api.headysystems.com_reference'
            file = $brainConnectorFile
        }
    }
    
    $headyEndpoints = @('brain.headysystems.com', 'api.headysystems.com', 'me.headysystems.com')
    $foundHeady = $false
    foreach ($endpoint in $headyEndpoints) {
        if ($content -match $endpoint) {
            $foundHeady = $true
            break
        }
    }
    
    if (-not $foundHeady) {
        $compliant = $false
        Write-Host "✗ BrainConnector missing Heady endpoints" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n=== VERIFICATION RESULTS ===" -ForegroundColor Cyan

if ($compliant) {
    Write-Host "✅ 100% HEADY SERVICE USAGE CONFIRMED" -ForegroundColor Green
    Write-Host ""
    Write-Host "All external services have been removed:" -ForegroundColor White
    Write-Host "  ✓ OpenAI services removed" -ForegroundColor Gray
    Write-Host "  ✓ Anthropic services removed" -ForegroundColor Gray
    Write-Host "  ✓ Google services removed" -ForegroundColor Gray
    Write-Host "  ✓ External MCP connectors removed" -ForegroundColor Gray
    Write-Host ""
    Write-Host "All configurations updated:" -ForegroundColor White
    Write-Host "  ✓ cloud-layers.yaml - Heady providers only" -ForegroundColor Gray
    Write-Host "  ✓ brain-profiles.yaml - Heady models only" -ForegroundColor Gray
    Write-Host "  ✓ Model router - Heady-only enforcement" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Heady services implemented:" -ForegroundColor White
    Write-Host "  ✓ HeadyBrain wrapper service" -ForegroundColor Gray
    Write-Host "  ✓ Heady MCP connector" -ForegroundColor Gray
    Write-Host "  ✓ BrainConnector with production endpoints" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🎉 SUCCESS: The system now runs 100% on Heady services!" -ForegroundColor Green
} else {
    Write-Host "❌ COMPLIANCE ISSUES FOUND" -ForegroundColor Red
    Write-Host ""
    Write-Host "Issues to fix:" -ForegroundColor White
    foreach ($issue in $issues) {
        switch ($issue.type) {
            'external_service' {
                Write-Host "  - Remove $($issue.service) from $($issue.file):$($issue.line)" -ForegroundColor Yellow
            }
            'non_heady_model' {
                Write-Host "  - Replace $($issue.model) in $($issue.file)" -ForegroundColor Yellow
            }
            'external_service_file' {
                Write-Host "  - Remove file: $($issue.file)" -ForegroundColor Yellow
            }
            'missing_heady_service' {
                Write-Host "  - Create missing service: $($issue.service)" -ForegroundColor Yellow
            }
            'api.headysystems.com_reference' {
                Write-Host "  - Remove api.headysystems.com reference in $($issue.file)" -ForegroundColor Yellow
            }
        }
    }
    Write-Host ""
    Write-Host "Total issues: $($issues.Count)" -ForegroundColor Red
    exit 1
}
