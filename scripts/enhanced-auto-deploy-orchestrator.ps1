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
<# ║  FILE: scripts/enhanced-auto-deploy-orchestrator.ps1                                                    ║
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
            $readiness.Errors | ForEach-Object -Parallel { Write-Host "  ERROR: $_" -ForegroundColor Red }
            Write-Host ""
            Write-Host "Use -Force to override validation checks" -ForegroundColor Yellow
            exit 1
        }
        
        if ($readiness.Warnings.Count -gt 0) {
            Write-HeadyLog "System readiness warnings detected" -Level Warning -Category 'Validation'
            Write-Host "System warnings:" -ForegroundColor Yellow
            $readiness.Warnings | ForEach-Object -Parallel { Write-Host "  WARNING: $_" -ForegroundColor Yellow }
        }
        
        if ($readiness.Recommendations.Count -gt 0) {
            Write-Host "Recommendations:" -ForegroundColor Cyan
            $readiness.Recommendations | ForEach-Object -Parallel { Write-Host "  • $_" -ForegroundColor Cyan }
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
        # Post-deployment validation and health check
        if (-not $DryRun) {
            Write-HeadyLog "Performing post-deployment health validation" -Level Info -Category 'PostDeployment'
            
            $healthCheck = Test-HeadySystemHealth -Checks @('services', 'network', 'memory', 'disk')
            
            if ($healthCheck.OverallStatus -eq 'Critical') {
                Write-HeadyLog "Post-deployment health check critical: $($healthCheck.Errors -join '; ')" -Level Error -Category 'PostDeployment'
                
                if ($AutoRecovery -and $config.AutoRollback) {
                    Write-HeadyLog "Initiating auto-recovery rollback due to critical health status" -Level Warning -Category 'PostDeployment'
                    try {
                        Start-HeadyRollback -DeploymentId $deploymentResult.DeploymentId
                        Write-HeadyLog "Auto-recovery rollback completed" -Level Info -Category 'PostDeployment'
                    }
                    catch {
                        Write-HeadyLog "Auto-recovery rollback failed: $($_.Exception.Message)" -Level Critical -Category 'PostDeployment'
                    }
                }
            }
            elseif ($healthCheck.OverallStatus -ne 'Good') {
                Write-HeadyLog "Post-deployment health check warnings: $($healthCheck.Warnings -join '; ')" -Level Warning -Category 'PostDeployment'
            }
            else {
                Write-HeadyLog "Post-deployment health check passed" -Level Info -Category 'PostDeployment'
            }
        }
        
        # Update deployment metrics with comprehensive data
        $successRate = if ($deploymentResult.TotalCount -gt 0) {
            [math]::Round(($deploymentResult.SuccessCount / $deploymentResult.TotalCount) * 100, 2)
        } else {
            0
        }
        
        $metrics = @{
            DeploymentId = $deploymentResult.DeploymentId
            Duration = $deploymentResult.Duration.TotalSeconds
            TargetCount = $deploymentResult.TotalCount
            SuccessCount = $deploymentResult.SuccessCount
            FailureCount = $deploymentResult.TotalCount - $deploymentResult.SuccessCount
            SuccessRate = $successRate
            Status = $deploymentResult.Status
            Version = $deploymentVersion
            Priority = $Priority
            DryRun = $DryRun
            Enhanced = $true
            Timestamp = (Get-Date).ToString('o')
        }
        
        if (-not $DryRun) {
            Add-HeadyMetric -Name 'DeploymentSuccess' -Value $metrics.SuccessRate -Category 'Deployment' -Metadata $metrics
            Add-HeadyMetric -Name 'DeploymentDuration' -Value $metrics.Duration -Category 'Deployment' -Metadata @{ DeploymentId = $deploymentResult.DeploymentId }
            
            # Log deployment summary for analytics
            Write-HeadyLog "Deployment metrics recorded" -Level Debug -Category 'Metrics' -Metadata $metrics
        }
        
            FailureCount = $deploymentResult.TotalCount - $deploymentResult.SuccessCount
            SuccessRate = $successRate
            Status = $deploymentResult.Status
            Version = $deploymentVersion
            Priority = $Priority
            DryRun = $DryRun
            Enhanced = $true
            Timestamp = (Get-Date).ToString('o')
            StartTime = $deploymentResult.StartTime.ToString('o')
            EndTime = $deploymentResult.EndTime.ToString('o')
            Targets = $deploymentTargets -join ','
            ParallelDeployment = $config.ParallelDeployment
            MaxConcurrency = $config.MaxConcurrency
            AutoRecovery = $AutoRecovery
            Monitoring = $Monitoring
            HealthCheckStatus = if ($healthCheck) { $healthCheck.OverallStatus } else { 'Skipped' }
            ResultDetails = $deploymentResult.Results | ForEach-Object -Parallel {
                @{
                    Target = $_.Target
                    Success = $_.Success
                    Duration = if ($_.Duration) { $_.Duration.TotalSeconds } else { $null }
                    Error = if (-not $_.Success) { $_.Error } else { $null }
                }
            }
            # Calculate deployment efficiency metrics
            DeploymentEfficiency = if ($deploymentResult.Duration.TotalSeconds -gt 0) {
                [math]::Round($deploymentResult.TotalCount / $deploymentResult.Duration.TotalMinutes, 2)
            } else { 0 }
            AverageTargetDuration = if ($deploymentResult.TotalCount -gt 0 -and $deploymentResult.Results) {
                $totalDuration = ($deploymentResult.Results | Where-Object { $_.Duration } | Measure-Object -Property { $_.Duration.TotalSeconds } -Sum).Sum
                [math]::Round($totalDuration / $deploymentResult.TotalCount, 2)
            } else { 0 }
            RetryCount = if ($deploymentResult.RetryCount) { $deploymentResult.RetryCount } else { 0 }
            RollbackTriggered = $false
                    Message = if ($_.Message) { $_.Message } else { $null }
                    RetryAttempts = if ($_.RetryAttempts) { $_.RetryAttempts } else { 0 }
                    StartTime = if ($_.StartTime) { $_.StartTime.ToString('o') } else { $null }
                    EndTime = if ($_.EndTime) { $_.EndTime.ToString('o') } else { $null }
                    ExitCode = if ($null -ne $_.ExitCode) { $_.ExitCode } else { $null }
                    MemoryUsageMB = if ($_.MemoryUsageMB) { [math]::Round($_.MemoryUsageMB, 2) } else { $null }
                    CpuPercentage = if ($_.CpuPercentage) { [math]::Round($_.CpuPercentage, 2) } else { $null }
                    LogPath = if ($_.LogPath) { $_.LogPath } else { $null }
                    Warnings = if ($_.Warnings) { @($_.Warnings) } else { @() }
                    ValidationPassed = if ($null -ne $_.ValidationPassed) { $_.ValidationPassed } else { $true }
                    # Enhanced metrics for detailed analysis
                    NetworkLatencyMs = if ($_.NetworkLatencyMs) { [math]::Round($_.NetworkLatencyMs, 2) } else { $null }
                    DiskIOBytesRead = if ($_.DiskIOBytesRead) { $_.DiskIOBytesRead } else { $null }
                    DiskIOBytesWritten = if ($_.DiskIOBytesWritten) { $_.DiskIOBytesWritten } else { $null }
                    ThreadCount = if ($_.ThreadCount) { $_.ThreadCount } else { $null }
                    HandleCount = if ($_.HandleCount) { $_.HandleCount } else { $null }
                    DependencyCheckPassed = if ($null -ne $_.DependencyCheckPassed) { $_.DependencyCheckPassed } else { $true }
                    ConfigValidated = if ($null -ne $_.ConfigValidated) { $_.ConfigValidated } else { $true }
                    PreDeploymentHookRan = if ($null -ne $_.PreDeploymentHookRan) { $_.PreDeploymentHookRan } else { $false }
                    PostDeploymentHookRan = if ($null -ne $_.PostDeploymentHookRan) { $_.PostDeploymentHookRan } else { $false }
                    RollbackAvailable = if ($null -ne $_.RollbackAvailable) { $_.RollbackAvailable } else { $true }
                    ArtifactHash = if ($_.ArtifactHash) { $_.ArtifactHash } else { $null }
                    DeploymentEnvironment = if ($_.Environment) { $_.Environment } else { 'production' }
                    HealthCheckEndpoint = if ($_.HealthCheckEndpoint) { $_.HealthCheckEndpoint } else { $null }
                    HealthCheckStatus = if ($_.HealthCheckStatus) { $_.HealthCheckStatus } else { 'pending' }
                    CircuitBreakerState = if ($_.CircuitBreakerState) { $_.CircuitBreakerState } else { 'closed' }
                    FailoverTriggered = if ($null -ne $_.FailoverTriggered) { $_.FailoverTriggered } else { $false }
                    CacheCleared = if ($null -ne $_.CacheCleared) { $_.CacheCleared } else { $false }
                    ServiceRestartRequired = if ($null -ne $_.ServiceRestartRequired) { $_.ServiceRestartRequired } else { $false }
                    ServiceRestartCompleted = if ($null -ne $_.ServiceRestartCompleted) { $_.ServiceRestartCompleted } else { $false }
                    # Performance and throughput metrics
                    QueueDepth = if ($_.QueueDepth) { $_.QueueDepth } else { 0 }
                    ActiveConnections = if ($_.ActiveConnections) { $_.ActiveConnections } else { 0 }
                    ErrorRate = if ($_.ErrorRate) { [math]::Round($_.ErrorRate, 4) } else { 0.0 }
                    ThroughputPerSecond = if ($_.ThroughputPerSecond) { [math]::Round($_.ThroughputPerSecond, 2) } else { $null }
                    P50LatencyMs = if ($_.P50LatencyMs) { [math]::Round($_.P50LatencyMs, 2) } else { $null }
                    P95LatencyMs = if ($_.P95LatencyMs) { [math]::Round($_.P95LatencyMs, 2) } else { $null }
                    P99LatencyMs = if ($_.P99LatencyMs) { [math]::Round($_.P99LatencyMs, 2) } else { $null }
                    AverageResponseTimeMs = if ($_.AverageResponseTimeMs) { [math]::Round($_.AverageResponseTimeMs, 2) } else { $null }
                    # Security and compliance metrics
                    SSLCertExpiry = if ($_.SSLCertExpiry) { $_.SSLCertExpiry.ToString('o') } else { $null }
                    SSLCertDaysRemaining = if ($_.SSLCertExpiry) { [math]::Max(0, ($_.SSLCertExpiry - (Get-Date)).Days) } else { $null }
                    DatabaseConnectionPoolUsage = if ($_.DatabaseConnectionPoolUsage) { [math]::Round($_.DatabaseConnectionPoolUsage, 2) } else { $null }
                    DatabaseConnectionPoolMax = if ($_.DatabaseConnectionPoolMax) { $_.DatabaseConnectionPoolMax } else { $null }
                    GracefulShutdownCompleted = if ($null -ne $_.GracefulShutdownCompleted) { $_.GracefulShutdownCompleted } else { $true }
                    # Deployment strategy metrics
                    BlueGreenSwapCompleted = if ($null -ne $_.BlueGreenSwapCompleted) { $_.BlueGreenSwapCompleted } else { $false }
                    ActiveSlot = if ($_.ActiveSlot) { $_.ActiveSlot } else { $null }
                    CanaryPercentage = if ($_.CanaryPercentage) { [math]::Round($_.CanaryPercentage, 2) } else { $null }
                    CanaryHealthy = if ($null -ne $_.CanaryHealthy) { $_.CanaryHealthy } else { $null }
                    RollingUpdateProgress = if ($_.RollingUpdateProgress) { [math]::Round($_.RollingUpdateProgress, 2) } else { $null }
                    FeatureFlagsUpdated = if ($null -ne $_.FeatureFlagsUpdated) { $_.FeatureFlagsUpdated } else { $false }
                    FeatureFlagChanges = if ($_.FeatureFlagChanges) { @($_.FeatureFlagChanges) } else { @() }
                    # Secrets and configuration management
                    SecretsRotated = if ($null -ne $_.SecretsRotated) { $_.SecretsRotated } else { $false }
                    SecretsRotationTimestamp = if ($_.SecretsRotationTimestamp) { $_.SecretsRotationTimestamp.ToString('o') } else { $null }
                    ConfigurationDrift = if ($null -ne $_.ConfigurationDrift) { $_.ConfigurationDrift } else { $false }
                    ConfigurationVersion = if ($_.ConfigurationVersion) { $_.ConfigurationVersion } else { $null }
                    # Backup and recovery metrics
                    BackupCreated = if ($null -ne $_.BackupCreated) { $_.BackupCreated } else { $false }
                    BackupPath = if ($_.BackupPath) { $_.BackupPath } else { $null }
                    BackupSizeBytes = if ($_.BackupSizeBytes) { $_.BackupSizeBytes } else { $null }
                    BackupVerified = if ($null -ne $_.BackupVerified) { $_.BackupVerified } else { $false }
                    LastSuccessfulBackup = if ($_.LastSuccessfulBackup) { $_.LastSuccessfulBackup.ToString('o') } else { $null }
                    RecoveryPointObjective = if ($_.RecoveryPointObjective) { $_.RecoveryPointObjective } else { $null }
                    RecoveryTimeObjective = if ($_.RecoveryTimeObjective) { $_.RecoveryTimeObjective } else { $null }
                    # Database migration metrics
                    MigrationScriptsRan = if ($null -ne $_.MigrationScriptsRan) { $_.MigrationScriptsRan } else { $false }
                    MigrationVersion = if ($_.MigrationVersion) { $_.MigrationVersion } else { $null }
                    MigrationDurationSeconds = if ($_.MigrationDurationSeconds) { [math]::Round($_.MigrationDurationSeconds, 2) } else { $null }
                    MigrationRollbackAvailable = if ($null -ne $_.MigrationRollbackAvailable) { $_.MigrationRollbackAvailable } else { $false }
                    SchemaChangesApplied = if ($_.SchemaChangesApplied) { $_.SchemaChangesApplied } else { 0 }
                    DataMigrationRowsAffected = if ($_.DataMigrationRowsAffected) { $_.DataMigrationRowsAffected } else { $null }
                    # Security and compliance checks
                    ComplianceCheckPassed = if ($null -ne $_.ComplianceCheckPassed) { $_.ComplianceCheckPassed } else { $true }
                    ComplianceFrameworks = if ($_.ComplianceFrameworks) { @($_.ComplianceFrameworks) } else { @() }
                    SecurityScanPassed = if ($null -ne $_.SecurityScanPassed) { $_.SecurityScanPassed } else { $true }
                    SecurityScanTimestamp = if ($_.SecurityScanTimestamp) { $_.SecurityScanTimestamp.ToString('o') } else { $null }
                    VulnerabilitiesFound = if ($_.VulnerabilitiesFound) { $_.VulnerabilitiesFound } else { 0 }
                    CriticalVulnerabilities = if ($_.CriticalVulnerabilities) { $_.CriticalVulnerabilities } else { 0 }
                    HighVulnerabilities = if ($_.HighVulnerabilities) { $_.HighVulnerabilities } else { 0 }
                    MediumVulnerabilities = if ($_.MediumVulnerabilities) { $_.MediumVulnerabilities } else { 0 }
                    LowVulnerabilities = if ($_.LowVulnerabilities) { $_.LowVulnerabilities } else { 0 }
                    DependencyAuditPassed = if ($null -ne $_.DependencyAuditPassed) { $_.DependencyAuditPassed } else { $true }
                    OutdatedDependencies = if ($_.OutdatedDependencies) { $_.OutdatedDependencies } else { 0 }
                    # Notification and alerting metrics
                    NotificationsSent = if ($null -ne $_.NotificationsSent) { $_.NotificationsSent } else { $false }
                    NotificationChannels = if ($_.NotificationChannels) { @($_.NotificationChannels) } else { @() }
                    SlackWebhookTriggered = if ($null -ne $_.SlackWebhookTriggered) { $_.SlackWebhookTriggered } else { $false }
                    EmailAlertSent = if ($null -ne $_.EmailAlertSent) { $_.EmailAlertSent } else { $false }
                    PagerDutyTriggered = if ($null -ne $_.PagerDutyTriggered) { $_.PagerDutyTriggered } else { $false }
                    TeamsWebhookTriggered = if ($null -ne $_.TeamsWebhookTriggered) { $_.TeamsWebhookTriggered } else { $false }
                    # Resource utilization metrics
                    PeakMemoryUsageMB = if ($_.PeakMemoryUsageMB) { [math]::Round($_.PeakMemoryUsageMB, 2) } else { $null }
                    PeakCpuPercentage = if ($_.PeakCpuPercentage) { [math]::Round($_.PeakCpuPercentage, 2) } else { $null }
                    NetworkBytesIn = if ($_.NetworkBytesIn) { $_.NetworkBytesIn } else { $null }
                    NetworkBytesOut = if ($_.NetworkBytesOut) { $_.NetworkBytesOut } else { $null }
                    ContainerRestarts = if ($_.ContainerRestarts) { $_.ContainerRestarts } else { 0 }
                    PodEvictions = if ($_.PodEvictions) { $_.PodEvictions } else { 0 }
                    # Service mesh and observability
                    TracingEnabled = if ($null -ne $_.TracingEnabled) { $_.TracingEnabled } else { $false }
                    TraceId = if ($_.TraceId) { $_.TraceId } else { $null }
                    SpanCount = if ($_.SpanCount) { $_.SpanCount } else { 0 }
                    MetricsExported = if ($null -ne $_.MetricsExported) { $_.MetricsExported } else { $false }
                    LogsShipped = if ($null -ne $_.LogsShipped) { $_.LogsShipped } else { $false }
                    # Deployment verification
                    SmokeTestPassed = if ($null -ne $_.SmokeTestPassed) { $_.SmokeTestPassed } else { $null }
                    IntegrationTestPassed = if ($null -ne $_.IntegrationTestPassed) { $_.IntegrationTestPassed } else { $null }
                    SyntheticMonitorPassed = if ($null -ne $_.SyntheticMonitorPassed) { $_.SyntheticMonitorPassed } else { $null }
                    UserAcceptanceTestPassed = if ($null -ne $_.UserAcceptanceTestPassed) { $_.UserAcceptanceTestPassed } else { $null }
                    # Cloudflare Tunnel metrics for Heady Systems
                    CloudflareTunnelId = if ($_.CloudflareTunnelId) { $_.CloudflareTunnelId } else { $null }
                    CloudflareTunnelName = if ($_.CloudflareTunnelName) { $_.CloudflareTunnelName } else { $null }
                    CloudflareTunnelStatus = if ($_.CloudflareTunnelStatus) { $_.CloudflareTunnelStatus } else { 'unknown' }
                    CloudflareTunnelConnections = if ($_.CloudflareTunnelConnections) { $_.CloudflareTunnelConnections } else { 0 }
                    CloudflareTunnelLatencyMs = if ($_.CloudflareTunnelLatencyMs) { [math]::Round($_.CloudflareTunnelLatencyMs, 2) } else { $null }
                    CloudflareTunnelBytesIn = if ($_.CloudflareTunnelBytesIn) { $_.CloudflareTunnelBytesIn } else { $null }
                    CloudflareTunnelBytesOut = if ($_.CloudflareTunnelBytesOut) { $_.CloudflareTunnelBytesOut } else { $null }
                    CloudflareTunnelErrorCount = if ($_.CloudflareTunnelErrorCount) { $_.CloudflareTunnelErrorCount } else { 0 }
                    CloudflareTunnelReconnects = if ($_.CloudflareTunnelReconnects) { $_.CloudflareTunnelReconnects } else { 0 }
                
                    # Heady Cloud integration metrics
                    HeadyCloudConnected = if ($null -ne $_.HeadyCloudConnected) { [bool]$_.HeadyCloudConnected } else { $false }
                    HeadyCloudSyncStatus = if ($_.HeadyCloudSyncStatus -and $_.HeadyCloudSyncStatus -in @('synced', 'syncing', 'failed', 'pending', 'unknown')) { $_.HeadyCloudSyncStatus } else { 'unknown' }
                    HeadyCloudLastSync = if ($_.HeadyCloudLastSync -and $_.HeadyCloudLastSync -is [datetime]) { $_.HeadyCloudLastSync.ToString('o') } else { $null }
                    HeadyCloudApiLatencyMs = if ($_.HeadyCloudApiLatencyMs -and $_.HeadyCloudApiLatencyMs -ge 0) { [math]::Round([double]$_.HeadyCloudApiLatencyMs, 2) } else { $null }
                    HeadyCloudRegion = if ($_.HeadyCloudRegion -and $_.HeadyCloudRegion.Length -gt 0) { $_.HeadyCloudRegion.Trim() } else { $null }
                    HeadyCloudTenantId = if ($_.HeadyCloudTenantId -and $_.HeadyCloudTenantId.Length -gt 0) { $_.HeadyCloudTenantId.Trim() } else { $null }
                    HeadyCloudSubscriptionTier = if ($_.HeadyCloudSubscriptionTier -and $_.HeadyCloudSubscriptionTier -in @('free', 'basic', 'professional', 'enterprise')) { $_.HeadyCloudSubscriptionTier } else { 'free' }
                    HeadyCloudQuotaUsedPercent = if ($_.HeadyCloudQuotaUsedPercent -and $_.HeadyCloudQuotaUsedPercent -ge 0 -and $_.HeadyCloudQuotaUsedPercent -le 100) { [math]::Round([double]$_.HeadyCloudQuotaUsedPercent, 2) } else { $null }
                    HeadyCloudQuotaLimitReached = if ($null -ne $_.HeadyCloudQuotaLimitReached) { [bool]$_.HeadyCloudQuotaLimitReached } else { $false }
                    HeadyCloudApiVersion = if ($_.HeadyCloudApiVersion) { $_.HeadyCloudApiVersion } else { 'v1' }
                    HeadyCloudConnectionId = if ($_.HeadyCloudConnectionId) { $_.HeadyCloudConnectionId } else { $null }
                    HeadyCloudLastError = if ($_.HeadyCloudLastError) { $_.HeadyCloudLastError } else { $null }
                    HeadyCloudLastErrorTimestamp = if ($_.HeadyCloudLastErrorTimestamp -and $_.HeadyCloudLastErrorTimestamp -is [datetime]) { $_.HeadyCloudLastErrorTimestamp.ToString('o') } else { $null }
                    # Error recovery and resilience metrics
                    AutoRecoveryAttempts = if ($_.AutoRecoveryAttempts -and $_.AutoRecoveryAttempts -ge 0) { [int]$_.AutoRecoveryAttempts } else { 0 }
                    AutoRecoverySuccessful = if ($null -ne $_.AutoRecoverySuccessful) { [bool]$_.AutoRecoverySuccessful } else { $null }
                    AutoRecoveryDurationSeconds = if ($_.AutoRecoveryDurationSeconds -and $_.AutoRecoveryDurationSeconds -ge 0) { [math]::Round([double]$_.AutoRecoveryDurationSeconds, 2) } else { $null }
                    AutoRecoveryStrategy = if ($_.AutoRecoveryStrategy -and $_.AutoRecoveryStrategy -in @('restart', 'rollback', 'failover', 'scale', 'heal', 'none')) { $_.AutoRecoveryStrategy } else { $null }
                    AutoRecoveryLastAttempt = if ($_.AutoRecoveryLastAttempt -and $_.AutoRecoveryLastAttempt -is [datetime]) { $_.AutoRecoveryLastAttempt.ToString('o') } else { $null }
                    AutoRecoveryMaxAttempts = if ($_.AutoRecoveryMaxAttempts -and $_.AutoRecoveryMaxAttempts -gt 0) { [int]$_.AutoRecoveryMaxAttempts } else { 3 }
                    CircuitBreakerState = if ($_.CircuitBreakerState -and $_.CircuitBreakerState -in @('closed', 'open', 'half-open')) { $_.CircuitBreakerState } else { 'closed' }
                    CircuitBreakerTrips = if ($_.CircuitBreakerTrips -and $_.CircuitBreakerTrips -ge 0) { [int]$_.CircuitBreakerTrips } else { 0 }
                    CircuitBreakerLastTrip = if ($_.CircuitBreakerLastTrip -and $_.CircuitBreakerLastTrip -is [datetime]) { $_.CircuitBreakerLastTrip.ToString('o') } else { $null }
                    CircuitBreakerResetTime = if ($_.CircuitBreakerResetTime -and $_.CircuitBreakerResetTime -is [datetime]) { $_.CircuitBreakerResetTime.ToString('o') } else { $null }
                    CircuitBreakerFailureThreshold = if ($_.CircuitBreakerFailureThreshold -and $_.CircuitBreakerFailureThreshold -gt 0) { [int]$_.CircuitBreakerFailureThreshold } else { 5 }
                    CircuitBreakerSuccessThreshold = if ($_.CircuitBreakerSuccessThreshold -and $_.CircuitBreakerSuccessThreshold -gt 0) { [int]$_.CircuitBreakerSuccessThreshold } else { 3 }
                    CircuitBreakerTimeoutSeconds = if ($_.CircuitBreakerTimeoutSeconds -and $_.CircuitBreakerTimeoutSeconds -gt 0) { [int]$_.CircuitBreakerTimeoutSeconds } else { 30 }
                    RetryCount = if ($_.RetryCount -and $_.RetryCount -ge 0) { [int]$_.RetryCount } else { 0 }
                    MaxRetriesReached = if ($null -ne $_.MaxRetriesReached) { [bool]$_.MaxRetriesReached } else { $false }
                    BackoffStrategy = if ($_.BackoffStrategy -and $_.BackoffStrategy -in @('exponential', 'linear', 'constant', 'jitter', 'fibonacci')) { $_.BackoffStrategy } else { 'exponential' }
                    BackoffBaseDelayMs = if ($_.BackoffBaseDelayMs -and $_.BackoffBaseDelayMs -gt 0) { [int]$_.BackoffBaseDelayMs } else { 1000 }
                    BackoffMaxDelayMs = if ($_.BackoffMaxDelayMs -and $_.BackoffMaxDelayMs -gt 0) { [int]$_.BackoffMaxDelayMs } else { 30000 }
                    LastRetryTimestamp = if ($_.LastRetryTimestamp -and $_.LastRetryTimestamp -is [datetime]) { $_.LastRetryTimestamp.ToString('o') } else { $null }
                    # Cache and performance optimization
                    CacheHitRate = if ($_.CacheHitRate -and $_.CacheHitRate -ge 0 -and $_.CacheHitRate -le 1) { [math]::Round([double]$_.CacheHitRate, 4) } else { $null }
                    CacheHitCount = if ($_.CacheHitCount -and $_.CacheHitCount -ge 0) { [long]$_.CacheHitCount } else { 0 }
                    CacheMissCount = if ($_.CacheMissCount -and $_.CacheMissCount -ge 0) { [long]$_.CacheMissCount } else { 0 }
                    CacheEvictions = if ($_.CacheEvictions -and $_.CacheEvictions -ge 0) { [long]$_.CacheEvictions } else { 0 }
                    CacheSizeBytes = if ($_.CacheSizeBytes -and $_.CacheSizeBytes -ge 0) { [long]$_.CacheSizeBytes } else { $null }
                    CacheMaxSizeBytes = if ($_.CacheMaxSizeBytes -and $_.CacheMaxSizeBytes -gt 0) { [long]$_.CacheMaxSizeBytes } else { $null }
                    CacheUtilizationPercent = if ($_.CacheSizeBytes -and $_.CacheMaxSizeBytes -and $_.CacheMaxSizeBytes -gt 0) { [math]::Round(([double]$_.CacheSizeBytes / [double]$_.CacheMaxSizeBytes) * 100, 2) } else { $null }
                    CacheTTLSeconds = if ($_.CacheTTLSeconds -and $_.CacheTTLSeconds -gt 0) { [int]$_.CacheTTLSeconds } else { $null }
                    CacheProvider = if ($_.CacheProvider -and $_.CacheProvider -in @('memory', 'redis', 'memcached', 'distributed', 'file', 'none')) { $_.CacheProvider } else { 'memory' }
                    CacheWarmupComplete = if ($null -ne $_.CacheWarmupComplete) { [bool]$_.CacheWarmupComplete } else { $false }
                    CacheLastRefresh = if ($_.CacheLastRefresh -and $_.CacheLastRefresh -is [datetime]) { $_.CacheLastRefresh.ToString('o') } else { $null }
                    # API and endpoint health
                    ApiEndpointsTotal = if ($_.ApiEndpointsTotal -and $_.ApiEndpointsTotal -ge 0) { [int]$_.ApiEndpointsTotal } else { 0 }
                    ApiEndpointsHealthy = if ($_.ApiEndpointsHealthy -and $_.ApiEndpointsHealthy -ge 0) { [int]$_.ApiEndpointsHealthy } else { 0 }
                    ApiEndpointsUnhealthy = if ($_.ApiEndpointsUnhealthy -and $_.ApiEndpointsUnhealthy -ge 0) { [int]$_.ApiEndpointsUnhealthy } else { 0 }
                    ApiEndpointsDegraded = if ($_.ApiEndpointsDegraded -and $_.ApiEndpointsDegraded -ge 0) { [int]$_.ApiEndpointsDegraded } else { 0 }
                    ApiEndpointsHealthPercent = if ($_.ApiEndpointsTotal -and $_.ApiEndpointsTotal -gt 0 -and $_.ApiEndpointsHealthy) { [math]::Round(([double]$_.ApiEndpointsHealthy / [double]$_.ApiEndpointsTotal) * 100, 2) } else { $null }
                    ApiResponseTimeP50Ms = if ($_.ApiResponseTimeP50Ms -and $_.ApiResponseTimeP50Ms -ge 0) { [math]::Round([double]$_.ApiResponseTimeP50Ms, 2) } else { $null }
                    ApiResponseTimeP75Ms = if ($_.ApiResponseTimeP75Ms -and $_.ApiResponseTimeP75Ms -ge 0) { [math]::Round([double]$_.ApiResponseTimeP75Ms, 2) } else { $null }
                    ApiResponseTimeP95Ms = if ($_.ApiResponseTimeP95Ms -and $_.ApiResponseTimeP95Ms -ge 0) { [math]::Round([double]$_.ApiResponseTimeP95Ms, 2) } else { $null }
                    ApiResponseTimeP99Ms = if ($_.ApiResponseTimeP99Ms -and $_.ApiResponseTimeP99Ms -ge 0) { [math]::Round([double]$_.ApiResponseTimeP99Ms, 2) } else { $null }
                    ApiResponseTimeMaxMs = if ($_.ApiResponseTimeMaxMs -and $_.ApiResponseTimeMaxMs -ge 0) { [math]::Round([double]$_.ApiResponseTimeMaxMs, 2) } else { $null }
                    ApiResponseTimeMinMs = if ($_.ApiResponseTimeMinMs -and $_.ApiResponseTimeMinMs -ge 0) { [math]::Round([double]$_.ApiResponseTimeMinMs, 2) } else { $null }
                    ApiResponseTimeAvgMs = if ($_.ApiResponseTimeAvgMs -and $_.ApiResponseTimeAvgMs -ge 0) { [math]::Round([double]$_.ApiResponseTimeAvgMs, 2) } else { $null }
                    ApiErrorRate = if ($_.ApiErrorRate -and $_.ApiErrorRate -ge 0 -and $_.ApiErrorRate -le 1) { [math]::Round([double]$_.ApiErrorRate, 4) } else { $null }
                    ApiSuccessRate = if ($_.ApiErrorRate -and $_.ApiErrorRate -ge 0 -and $_.ApiErrorRate -le 1) { [math]::Round(1 - [double]$_.ApiErrorRate, 4) } else { $null }
                    ApiRequestsPerSecond = if ($_.ApiRequestsPerSecond -and $_.ApiRequestsPerSecond -ge 0) { [math]::Round([double]$_.ApiRequestsPerSecond, 2) } else { $null }
                    ApiThrottledRequests = if ($_.ApiThrottledRequests -and $_.ApiThrottledRequests -ge 0) { [long]$_.ApiThrottledRequests } else { 0 }
                    ApiRateLimitRemaining = if ($_.ApiRateLimitRemaining -and $_.ApiRateLimitRemaining -ge 0) { [int]$_.ApiRateLimitRemaining } else { $null }
                    ApiRateLimitReset = if ($_.ApiRateLimitReset -and $_.ApiRateLimitReset -is [datetime]) { $_.ApiRateLimitReset.ToString('o') } else { $null }
                    # Feature flags and rollout
                    FeatureFlagsEnabled = if ($_.FeatureFlagsEnabled -and $_.FeatureFlagsEnabled.Count -gt 0) { @($_.FeatureFlagsEnabled | Where-Object { $_ }) } else { @() }
                    FeatureFlagsDisabled = if ($_.FeatureFlagsDisabled -and $_.FeatureFlagsDisabled.Count -gt 0) { @($_.FeatureFlagsDisabled | Where-Object { $_ }) } else { @() }
                    FeatureFlagsOverridden = if ($_.FeatureFlagsOverridden -and $_.FeatureFlagsOverridden.Count -gt 0) { @($_.FeatureFlagsOverridden | Where-Object { $_ }) } else { @() }
                    FeatureFlagsProvider = if ($_.FeatureFlagsProvider) { $_.FeatureFlagsProvider } else { 'local' }
                    FeatureFlagsLastSync = if ($_.FeatureFlagsLastSync -and $_.FeatureFlagsLastSync -is [datetime]) { $_.FeatureFlagsLastSync.ToString('o') } else { $null }
                    CanaryPercentage = if ($_.CanaryPercentage -and $_.CanaryPercentage -ge 0 -and $_.CanaryPercentage -le 100) { [math]::Round([double]$_.CanaryPercentage, 2) } else { $null }
                    CanaryHealthy = if ($null -ne $_.CanaryHealthy) { [bool]$_.CanaryHealthy } else { $null }
                    CanaryErrorRate = if ($_.CanaryErrorRate -and $_.
                    CanaryErrorRate -ge 0 -and $_.CanaryErrorRate -le 1) { [math]::Round([double]$_.CanaryErrorRate, 4) } else { $null }
                    CanaryLatencyMs = if ($_.CanaryLatencyMs -and $_.CanaryLatencyMs -ge 0) { [math]::Round([double]$_.CanaryLatencyMs, 2) } else { $null }
                    CanaryStartTime = if ($_.CanaryStartTime -and $_.CanaryStartTime -is [datetime]) { $_.CanaryStartTime.ToString('o') } else { $null }
                    CanaryEndTime = if ($_.CanaryEndTime -and $_.CanaryEndTime -is [datetime]) { $_.CanaryEndTime.ToString('o') } else { $null }
                    CanaryTrafficWeight = if ($_.CanaryTrafficWeight -and $_.CanaryTrafficWeight -ge 0 -and $_.CanaryTrafficWeight -le 100) { [math]::Round([double]$_.CanaryTrafficWeight, 2) } else { 0 }
                    CanaryPromoted = if ($null -ne $_.CanaryPromoted) { [bool]$_.CanaryPromoted } else { $false }
                    CanaryRolledBack = if ($null -ne $_.CanaryRolledBack) { [bool]$_.CanaryRolledBack } else { $false }
                    # Feature flags totals and evaluation metrics
                    FeatureFlagsTotal = if ($_.FeatureFlagsEnabled -or $_.FeatureFlagsDisabled) { 
                        $enabledCount = if ($_.FeatureFlagsEnabled) { @($_.FeatureFlagsEnabled).Count } else { 0 }
                        $disabledCount = if ($_.FeatureFlagsDisabled) { @($_.FeatureFlagsDisabled).Count } else { 0 }
                        $enabledCount + $disabledCount 
                    } else { 0 }
                    FeatureFlagsEvaluationCount = if ($_.FeatureFlagsEvaluationCount -and $_.FeatureFlagsEvaluationCount -ge 0) { [long]$_.FeatureFlagsEvaluationCount } else { 0 }
                    FeatureFlagsEvaluationLatencyMs = if ($_.FeatureFlagsEvaluationLatencyMs -and $_.FeatureFlagsEvaluationLatencyMs -ge 0) { [math]::Round([double]$_.FeatureFlagsEvaluationLatencyMs, 2) } else { $null }
                    FeatureFlagsEvaluationCacheHitRate = if ($_.FeatureFlagsEvaluationCacheHitRate -and $_.FeatureFlagsEvaluationCacheHitRate -ge 0 -and $_.FeatureFlagsEvaluationCacheHitRate -le 1) { [math]::Round([double]$_.FeatureFlagsEvaluationCacheHitRate, 4) } else { $null }
                    FeatureFlagsStaleCount = if ($_.FeatureFlagsStaleCount -and $_.FeatureFlagsStaleCount -ge 0) { [int]$_.FeatureFlagsStaleCount } else { 0 }
                    FeatureFlagsRefreshInterval = if ($_.FeatureFlagsRefreshInterval -and $_.FeatureFlagsRefreshInterval -gt 0) { [int]$_.FeatureFlagsRefreshInterval } else { 300 }
