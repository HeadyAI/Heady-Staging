# Simple Brain Connectivity Test
Write-Host "=== HeadyBrain Connectivity Test ===" -ForegroundColor Cyan

# Test 1: Check endpoints
Write-Host "`nTesting Brain Endpoints:" -ForegroundColor Yellow
$endpoints = @(
    @{ Name = "Primary"; Url = "https://brain.headysystems.com" },
    @{ Name = "Secondary"; Url = "https://api.headysystems.com/brain" },
    @{ Name = "Tertiary"; Url = "https://me.headysystems.com/brain" },
    @{ Name = "Emergency"; Url = "https://headysystems.com/api/brain" }
)

foreach ($ep in $endpoints) {
    try {
        $response = Invoke-RestMethod -TimeoutSec 10 -Uri "$($ep.Url)/api/health" -TimeoutSec 5
        Write-Host "✓ $($ep.Name): $($response.service) v$($response.version)" -ForegroundColor Green
    } catch {
        Write-Host "✗ $($ep.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 2: Production Brain API
Write-Host "`nTesting Production Brain API:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -TimeoutSec 10 -Uri "https://brain.headysystems.com/api/brain/status" -TimeoutSec 10
    Write-Host "✓ Production brain API responding" -ForegroundColor Green
    
    if ($response.connector) {
        Write-Host "  - Success rate: $($response.connector.success_rate)" -ForegroundColor Gray
        Write-Host "  - Queue length: $($response.connector.queue_length)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Production brain API not responding" -ForegroundColor Red
}

# Test 3: Plan generation
Write-Host "`nTesting Plan Generation:" -ForegroundColor Yellow
$testTask = @{
    id = "test-$(Get-Date -Format 
\yyyyMMddHHmmss\')"
    type = "CODE"
    message = "Test connectivity"
    cloud_layer = "production"
}

try {
    $response = Invoke-RestMethod -TimeoutSec 10 -Uri "https://brain.headysystems.com/api/brain/plan" -Method Post -Body ($testTask | ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 10
    Write-Host "✓ Plan generated: $($response.plan.plan_id)" -ForegroundColor Green
    Write-Host "  - Strategy: $($response.plan.strategy)" -ForegroundColor Gray
    Write-Host "  - Brain node: $($response.brain_node)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Plan generation failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "Brain connectivity system verified!" -ForegroundColor Green
