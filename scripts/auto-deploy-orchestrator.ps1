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
<# ║  FILE: scripts/auto-deploy-orchestrator.ps1                                                    ║
<# ║  LAYER: automation                                                  ║
<# ╚══════════════════════════════════════════════════════════════════╝
<# HEADY_BRAND:END
#>
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
# ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
# ║  FILE: scripts/enhanced-auto-deploy-orchestrator.ps1             ║
# ║  LAYER: enhanced-automation                                       ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END

<#
.SYNOPSIS
Enhanced Auto-Deploy Orchestrator with advanced features and robust error handling

.DESCRIPTION
This enhanced orchestrator provides comprehensive deployment capabilities including:
- Advanced safety checks and system validation
- Parallel deployment execution with resource management
- Real-time monitoring and health checks
- Automatic rollback and recovery mechanisms
- Performance metrics and detailed logging
- Configuration management and environment validation

.PARAMETER Priority
Skip safety checks for priority deployments

.PARAMETER Targets
Specific deployment targets (Windows, Android, Linux, Websites)

.PARAMETER Version
Deployment version (auto-generated if not specified)

.PARAMETER DryRun
Preview deployment without executing

.PARAMETER Force
Override safety checks and warnings

.PARAMETER ConfigFile
Custom configuration file path

.PARAMETER LogLevel
Logging level (Debug, Verbose, Info, Warning, Error, Critical)

.EXAMPLE
.\enhanced-auto-deploy-orchestrator.ps1 -Priority -Targets Windows,Android

.EXAMPLE
.\enhanced-auto-deploy-orchestrator.ps1 -DryRun -Targets Websites

.EXAMPLE
.\enhanced-auto-deploy-orchestrator.ps1 -Version "v2.1.0" -Force

.NOTES
Version: 2.0.0
Author: Heady Systems
Last Updated: 2025-02-11
#>

[CmdletBinding()]
param (
    [switch]$Priority,
    
    [string[]]$Targets = @(),
    
    [string]$Version = "",
    
    [switch]$DryRun,
    
    [switch]$Force,
    
    [string]$ConfigFile = "$PSScriptRoot\..\configs\auto-deploy-config.json",
    
    [ValidateSet('Debug', 'Verbose', 'Info', 'Warning', 'Error', 'Critical')]
    [string]$LogLevel = 'Info',
    
    [timespan]$Timeout = [timespan]::FromMinutes(30),
    
    [switch]$Monitoring,
    
    [switch]$AutoRecovery
)

# Import enhanced modules
try {
    Import-Module "$PSScriptRoot\modules\HeadyScriptCore.psm1" -Force
    Import-Module "$PSScriptRoot\modules\HeadyDeployment.psm1" -Force
    Import-Module "$PSScriptRoot\modules\HeadyService.psm1" -Force
}
catch {
    Write-Host "Failed to import Heady modules: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Initialize enhanced environment
try {
    Initialize-HeadyEnvironment
    
    # Set log level
    $Global:HeadyScriptConfig.LogLevel = $LogLevel
    
    Write-HeadyLog "Enhanced Auto-Deploy Orchestrator v2.0.0 initialized" -Level Info -Category 'Orchestrator'
}
catch {
    Write-Host "Failed to initialize Heady environment: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Load configuration
function Get-EnhancedDeploymentConfig {
    try {
        if (Test-Path $ConfigFile) {
            $config = Get-Content -Path $ConfigFile -Raw | ConvertFrom-Json
            Write-HeadyLog "Loaded deployment configuration from: $ConfigFile" -Level Debug -Category 'Config'
            return $config
        }
        else {
            Write-HeadyLog "Configuration file not found, using defaults" -Level Warning -Category 'Config'
            
            # Default configuration
            return @{
                DeploymentTargets = @('Windows', 'Android', 'Linux', 'Websites')
                CriticalTargets = @('Windows', 'Websites')
                Version = (Get-Date -Format 'yyyyMMdd-HHmmss')
                SafetyChecks = @{
                    SystemHealth = $true
                    UserSessions = $true
                    DiskSpace = $true
                    NetworkConnectivity = $true
                    PortAvailability = $true
                }
                ParallelDeployment = $true
                MaxConcurrency = 3
                AutoRollback = $true
                MonitoringDuration = [timespan]::FromMinutes(30)
                RecoveryAttempts = 3
            }
        }
    }
    catch {
        Write-HeadyLog "Failed to load configuration: $($_.Exception.Message)" -Level Error -Category 'Config'
        throw
    }
}

# Enhanced Docker availability check
function Test-DockerAvailability {
    Write-HeadyLog "Checking Docker availability" -Level Debug -Category 'System'
    
    try {
        $dockerInfo = docker info --format '{{json .}}' | ConvertFrom-Json
        $dockerVersion = docker --version
        
        Write-HeadyLog "Docker available: $dockerVersion" -Level Info -Category 'System'
        
        # Check Docker system health
        if ($dockerInfo.ServerErrors.Count -gt 0) {
            Write-HeadyLog "Docker server errors detected: $($dockerInfo.ServerErrors -join ', ')" -Level Warning -Category 'System'
        }
        
        return @{
            Available = $true
            Version = $dockerVersion
            Info = $dockerInfo
        }
    }
    catch {
        Write-HeadyLog "Docker not available or not running: $($_.Exception.Message)" -Level Warning -Category 'System'
        return @{
            Available = $false
            Error = $_.Exception.Message
        }
    }
}

# Enhanced system validation
function Test-EnhancedSystemReadiness {
    param(
        [hashtable]$Config,
        [string[]]$DeploymentTargets
    )
    
    Write-HeadyLog "Starting enhanced system readiness validation" -Level Info -Category 'Validation'
    
    $validationResults = @{
        OverallStatus = 'Ready'
        Checks = @{}
        Warnings = @()
        Errors = @()
        Recommendations = @()
    }
    
    # System Health Check
    if ($Config.SafetyChecks.SystemHealth) {
        Write-HeadyLog "Performing comprehensive system health check" -Level Debug -Category 'Validation'
        
        $healthCheck = Test-HeadySystemHealth -Checks @('memory', 'disk', 'network', 'services')
        $validationResults.Checks.systemHealth = $healthCheck
        
        if ($healthCheck.OverallStatus -eq 'Critical') {
            $validationResults.OverallStatus = 'NotReady'
            $validationResults.Errors += "System health is critical"
        }
        elseif ($healthCheck.OverallStatus -eq 'Warning') {
            $validationResults.Warnings += "System health shows warnings"
            $validationResults.Recommendations += "Consider addressing system health issues before deployment"
        }
    }
    
    # Docker Availability
    $dockerCheck = Test-DockerAvailability
    $validationResults.Checks.docker = $dockerCheck
    
    if ($DeploymentTargets -contains 'Websites' -and -not $dockerCheck.Available) {
        if ($Config.CriticalTargets -contains 'Websites') {
            $validationResults.OverallStatus = 'NotReady'
            $validationResults.Errors += "Docker required for Websites deployment but not available"
        }
        else {
            $validationResults.Warnings += "Docker not available, Websites deployment will be skipped"
        }
    }
    
    # Resource Availability Check
    Write-HeadyLog "Checking resource availability" -Level Debug -Category 'Validation'
    
    $memory = Get-CimInstance -ClassName Win32_OperatingSystem
    $availableMemoryGB = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
    $totalMemoryGB = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
    $memoryUsagePercent = [math]::Round((($totalMemoryGB - $availableMemoryGB) / $totalMemoryGB) * 100, 2)
    
    $validationResults.Checks.memory = @{
        AvailableGB = $availableMemoryGB
        TotalGB = $totalMemoryGB
        UsagePercent = $memoryUsagePercent
        Status = if ($memoryUsagePercent -lt 80) { 'Good' } elseif ($memoryUsagePercent -lt 90) { 'Warning' } else { 'Critical' }
    }
    
    if ($memoryUsagePercent -gt 90) {
        $validationResults.OverallStatus = 'NotReady'
        $validationResults.Errors += "Memory usage too high: $memoryUsagePercent%"
    }
    elseif ($memoryUsagePercent -gt 80) {
        $validationResults.Warnings += "High memory usage: $memoryUsagePercent%"
        $validationResults.Recommendations += "Consider freeing up memory before deployment"
    }
    
    # Network Connectivity Check
    Write-HeadyLog "Testing network connectivity to critical services" -Level Debug -Category 'Validation'
    
    $networkTests = @(
        @{ Name = 'Google DNS'; Host = '8.8.8.8'; Port = 53 },
        @{ Name = 'Cloudflare DNS'; Host = '1.1.1.1'; Port = 53 },
        @{ Name = 'GitHub'; Host = 'github.com'; Port = 443 }
    )
    
    $networkResults = @()
    foreach ($test in $networkTests) {
        try {
            $result = Test-NetConnection -ComputerName $test.Host -Port $test.Port -InformationLevel Quiet -WarningAction SilentlyContinue
            $networkResults += @{
                Name = $test.Name
                Host = $test.Host
                Port = $test.Port
                Success = $result
            }
            
            if (-not $result) {
                $validationResults.Warnings += "Network connectivity issue: $($test.Name)"
            }
        }
        catch {
            $networkResults += @{
                Name = $test.Name
                Host = $test.Host
                Port = $test.Port
                Success = $false
                Error = $_.Exception.Message
            }
        }
    }
    
    $validationResults.Checks.network = $networkResults
    
    # Configuration Validation
    Write-HeadyLog "Validating deployment configuration" -Level Debug -Category 'Validation'
    
    $configValidation = @{
        ValidTargets = $true
        ValidConcurrency = $true
        ValidTimeout = $true
    }
    
    if ($DeploymentTargets.Count -eq 0) {
        $configValidation.ValidTargets = $false
        $validationResults.Errors += "No deployment targets specified"
    }
    
    if ($Config.MaxConcurrency -lt 1 -or $Config.MaxConcurrency -gt 10) {
        $configValidation.ValidConcurrency = $false
        $validationResults.Warnings += "MaxConcurrency should be between 1 and 10"
    }
    
    $validationResults.Checks.configuration = $configValidation
    
    Write-HeadyLog "System readiness validation completed: $($validationResults.OverallStatus)" -Level Info -Category 'Validation'
    
    return $validationResults
}

# Enhanced deployment execution
function Start-EnhancedDeployment {
    param(
        [hashtable]$Config,
        [string[]]$DeploymentTargets,
        [string]$DeploymentVersion,
        [switch]$IsDryRun,
        [switch]$IsPriority
    )
    
    $deploymentId = (New-Guid).ToString()
    $startTime = Get-Date
    
    Write-HeadyLog "Starting enhanced deployment: $deploymentId" -Level Info -Category 'Deployment' -Metadata @{
        Targets = $DeploymentTargets -join ', '
        Version = $DeploymentVersion
        Priority = $IsPriority
        DryRun = $IsDryRun
        Config = $Config
    }
    
    try {
        # Create deployment record
        $deployment = Add-HeadyDeploymentRecord -Target ($DeploymentTargets -join ',') -Version $DeploymentVersion -Status 'Started' -Metadata @{
            startTime = $startTime.ToString('o')
            priority = $IsPriority
            dryRun = $IsDryRun
            enhanced = $true
        }
        
        # Enhanced safety checks (skip for priority deployments)
        if (-not $IsPriority -and -not $IsDryRun) {
            $safetyCheck = Test-HeadyDeploymentSafety -Targets $DeploymentTargets
            
            if ($safetyCheck.OverallStatus -eq 'Unsafe') {
                throw "Deployment safety check failed: $($safetyCheck.Errors -join '; ')"
            }
            
            if ($safetyCheck.Warnings.Count -gt 0) {
                Write-HeadyLog "Safety warnings: $($safetyCheck.Warnings -join '; ')" -Level Warning -Category 'Safety'
            }
        }
        
        # Execute deployment with enhanced features
        $deploymentResults = Invoke-HeadyOperation -ScriptBlock {
            param($targets, $version, $config, $dryRun, $deploymentId)
            
            if ($config.ParallelDeployment -and $targets.Count -gt 1) {
                # Parallel deployment
                $scriptBlocks = foreach ($target in $targets) {
                    {
                        param($t, $v, $c, $d, $id)
                        Start-HeadySingleDeployment -Target $t -Version $v -Parameters $c -DryRun $d -DeploymentId $id
                    }.GetNewClosure()
                }
                
                return Invoke-HeadyParallel -ScriptBlocks $scriptBlocks -MaxConcurrency $config.MaxConcurrency -OperationName "Enhanced Deployment $deploymentId" -ContinueOnError
            }
            else {
                # Sequential deployment
                $results = @()
                foreach ($target in $targets) {
                    $result = Start-HeadySingleDeployment -Target $target -Version $version -Parameters $config -DryRun $dryRun -DeploymentId $deploymentId
                    $results += $result
                }
                return $results
            }
        } -ScriptBlock $DeploymentTargets, $DeploymentVersion, $Config, $IsDryRun, $deploymentId -OperationName "Enhanced Deployment $deploymentId" -MaxRetries 2
        
        # Determine overall status
        $successCount = ($deploymentResults | Where-Object { $_.Success -eq $true }).Count
        $totalCount = $deploymentResults.Count
        
        $overallStatus = if ($successCount -eq $totalCount) { 'Success' } elseif ($successCount -gt 0) { 'Partial' } else { 'Failed' }
        
        # Update deployment record
        $deployment.status = $overallStatus
        $deployment.endTime = (Get-Date).ToString('o')
        $deployment.duration = ((Get-Date) - $startTime).ToString('g')
        $deployment.results = $deploymentResults
        
        $registry = Get-HeadyDeploymentRegistry
        $deploymentIndex = $registry.deployments.Count - 1
        $registry.deployments[$deploymentIndex] = $deployment
        Set-HeadyDeploymentRegistry -Registry $registry
        
        # Start post-deployment monitoring if requested
        if ($Monitoring -and -not $IsDryRun -and $overallStatus -eq 'Success') {
            Write-HeadyLog "Starting post-deployment monitoring" -Level Info -Category 'Monitoring'
            Start-HeadyDeploymentMonitoring -DeploymentId $deploymentId -Duration $Config.MonitoringDuration
        }
        
        Write-HeadyLog "Enhanced deployment completed: $deploymentId - $overallStatus ($successCount/$totalCount successful)" -Level Info -Category 'Deployment'
        
        return @{
            DeploymentId = $deploymentId
            Status = $overallStatus
            Results = $deploymentResults
            SuccessCount = $successCount
            TotalCount = $totalCount
            StartTime = $startTime
            EndTime = Get-Date
            Duration = (Get-Date) - $startTime
            Enhanced = $true
        }
    }
    catch {
        # Update deployment record with failure
        $deployment.status = 'Failed'
        $deployment.endTime = (Get-Date).ToString('o')
        $deployment.error = $_.Exception.Message
        $deployment.duration = ((Get-Date) - $startTime).ToString('g')
        
        $registry = Get-HeadyDeploymentRegistry
        $deploymentIndex = $registry.deployments.Count - 1
        $registry.deployments[$deploymentIndex] = $deployment
        Set-HeadyDeploymentRegistry -Registry $registry
        
        Write-HeadyLog "Enhanced deployment failed: $deploymentId - $($_.Exception.Message)" -Level Error -Category 'Deployment'
        
        # Auto-rollback if enabled
        if ($Config.AutoRollback -and -not $IsDryRun) {
            Write-HeadyLog "Initiating automatic rollback" -Level Warning -Category 'Deployment'
            try {
                Start-HeadyRollback -DeploymentId $deploymentId
            }
            catch {
                Write-HeadyLog "Rollback failed: $($_.Exception.Message)" -Level Critical -Category 'Deployment'
            }
        }
        
        throw
    }
}

# Main execution
try {
    Write-HeadyLog "Enhanced Auto-Deploy Orchestrator starting" -Level Info -Category 'Orchestrator' -Metadata @{
        Priority = $Priority
        Targets = $Targets -join ','
        Version = $Version
        DryRun = $DryRun
        Force = $Force
        Monitoring = $Monitoring
        AutoRecovery = $AutoRecovery
    }
    
    # Load configuration
    $config = Get-EnhancedDeploymentConfig
    
    # Determine deployment targets
    $deploymentTargets = if ($Targets.Count -gt 0) { $Targets } else { $config.DeploymentTargets }
    
    # Generate version if not specified
    $deploymentVersion = if ($Version) { $Version } else { $config.Version }
    
    Write-HeadyLog "Deployment configuration loaded" -Level Info -Category 'Config' -Metadata @{
        Targets = $deploymentTargets -join ','
        Version = $deploymentVersion
        Priority = $Priority
        DryRun = $DryRun
    }
    
    # Enhanced system readiness check
    if (-not $Priority -and -not $DryRun) {
        $readiness = Test-EnhancedSystemReadiness -Config $config -DeploymentTargets $deploymentTargets
        
        if ($readiness.OverallStatus -eq 'NotReady' -and -not $Force) {
            Write-HeadyLog "System not ready for deployment" -Level Error -Category 'Validation'
            Write-Host "System validation failed:" -ForegroundColor Red
            $readiness.Errors | ForEach-Object { -Parallel { Write-Host "  ERROR: $_" -ForegroundColor Red }
            Write-Host ""
            Write-Host "Use -Force to override validation checks" -ForegroundColor Yellow
            exit 1
        }
        
        if ($readiness.Warnings.Count -gt 0) {
            Write-HeadyLog "System readiness warnings detected" -Level Warning -Category 'Validation'
            Write-Host "System warnings:" -ForegroundColor Yellow
            $readiness.Warnings | ForEach-Object { -Parallel { Write-Host "  WARNING: $_" -ForegroundColor Yellow }
        }
        
        if ($readiness.Recommendations.Count -gt 0) {
            Write-Host "Recommendations:" -ForegroundColor Cyan
            $readiness.Recommendations | ForEach-Object { -Parallel { Write-Host "  • $_" -ForegroundColor Cyan }
        }
    }
    
    # Execute enhanced deployment
    $deploymentResult = Start-EnhancedDeployment -Config $config -DeploymentTargets $deploymentTargets -DeploymentVersion $deploymentVersion -IsDryRun $DryRun -IsPriority $Priority
    
    # Display results
    Write-Host ""
    Write-Host "Enhanced Deployment Results:" -ForegroundColor Green
    Write-Host "  Deployment ID: $($deploymentResult.DeploymentId)" -ForegroundColor White
    Write-Host "  Status: $($deploymentResult.Status)" -ForegroundColor $(if ($deploymentResult.Status -eq 'Success') { 'Green' } elseif ($deploymentResult.Status -eq 'Partial') { 'Yellow' } else { 'Red' })
    Write-Host "  Success Rate: $($deploymentResult.SuccessCount)/$($deploymentResult.TotalCount)" -ForegroundColor White
    Write-Host "  Duration: $($deploymentResult.Duration.ToString('g'))" -ForegroundColor White
    Write-Host ""
    
    if ($deploymentResult.Results.Count -gt 0) {
        Write-Host "Target Results:" -ForegroundColor Cyan
        foreach ($result in $deploymentResult.Results) {
            $statusColor = if ($result.Success) { 'Green' } else { 'Red' }
            Write-Host "  $($result.Target): $(if ($result.Success) { 'SUCCESS' } else { 'FAILED' })" -ForegroundColor $statusColor
        }
    }
    
    if ($deploymentResult.Status -eq 'Success' -and -not $DryRun) {
        Write-HeadyLog "Enhanced deployment completed successfully" -Level Info -Category 'Orchestrator'
        Write-Host "🎉 Enhanced deployment completed successfully!" -ForegroundColor Green
    }
    elseif ($deploymentResult.Status -eq 'Partial') {
        Write-HeadyLog "Enhanced deployment completed with partial success" -Level Warning -Category 'Orchestrator'
        Write-Host "⚠️ Enhanced deployment completed with partial success" -ForegroundColor Yellow
    }
    else {
        Write-HeadyLog "Enhanced deployment failed" -Level Error -Category 'Orchestrator'
        Write-Host "❌ Enhanced deployment failed" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-HeadyLog "Enhanced orchestrator failed: $($_.Exception.Message)" -Level Critical -Category 'Orchestrator'
    Write-Host "Enhanced orchestrator failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
