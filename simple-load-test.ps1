# Simple PowerShell load test script (no k6 required)
# Run with: .\simple-load-test.ps1

param(
    [int]$DurationSeconds = 180,
    [int]$MaxConcurrentRequests = 100
)

Write-Host "=== Ticketing Platform Load Test ===" -ForegroundColor Cyan
Write-Host "Duration: $DurationSeconds seconds"
Write-Host "Max Concurrent Requests: $MaxConcurrentRequests"
Write-Host ""

# Port forward services (run in background)
Write-Host "Setting up port forwarding..." -ForegroundColor Yellow
Start-Job -Name "PortForward-Booking" -ScriptBlock {
    kubectl port-forward svc/bookingservice 3003:3003
} | Out-Null

Start-Job -Name "PortForward-Event" -ScriptBlock {
    kubectl port-forward svc/eventservice 3001:3001
} | Out-Null

Start-Sleep -Seconds 3
Write-Host "Port forwarding established" -ForegroundColor Green
Write-Host ""

# Watch pods in separate window
Write-Host "Open another terminal and run: kubectl get pods -w" -ForegroundColor Magenta
Write-Host "And another with: kubectl get hpa -w" -ForegroundColor Magenta
Write-Host ""
Write-Host "Press Enter to start load test..."
Read-Host

$startTime = Get-Date
$endTime = $startTime.AddSeconds($DurationSeconds)

$bookingUrl = "http://localhost:3003/health"
$eventUrl = "http://localhost:3001/health"

Write-Host "Starting load test..." -ForegroundColor Green

$jobs = @()
$requestCount = 0

# Phase 1: Ramp up (30 seconds)
Write-Host "[Phase 1] Ramping up load..." -ForegroundColor Yellow
$phase1End = $startTime.AddSeconds(30)
$currentVUs = 5

while ((Get-Date) -lt $phase1End) {
    for ($i = 0; $i -lt $currentVUs; $i++) {
        $jobs += Start-Job -ScriptBlock {
            param($url)
            try {
                Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 5 | Out-Null
            } catch {}
        } -ArgumentList @($bookingUrl, $eventUrl)[$i % 2]
        $requestCount++
    }
    
    $currentVUs = [Math]::Min($currentVUs + 2, 20)
    Start-Sleep -Milliseconds 500
}

# Phase 2: Peak load (90 seconds)
Write-Host "[Phase 2] Peak load - $MaxConcurrentRequests concurrent..." -ForegroundColor Red
$phase2End = $startTime.AddSeconds(120)

while ((Get-Date) -lt $phase2End) {
    # Clean up completed jobs
    $jobs = $jobs | Where-Object { $_.State -eq 'Running' }
    
    # Maintain target concurrency
    while ($jobs.Count -lt $MaxConcurrentRequests) {
        $jobs += Start-Job -ScriptBlock {
            param($bookingUrl, $eventUrl)
            try {
                # Alternate between services
                Invoke-WebRequest -Uri $bookingUrl -Method GET -TimeoutSec 5 | Out-Null
                Invoke-WebRequest -Uri $eventUrl -Method GET -TimeoutSec 5 | Out-Null
            } catch {}
        } -ArgumentList $bookingUrl, $eventUrl
        $requestCount += 2
    }
    
    Start-Sleep -Milliseconds 100
}

# Phase 3: Ramp down (30 seconds)
Write-Host "[Phase 3] Ramping down..." -ForegroundColor Yellow
$phase3End = $startTime.AddSeconds(150)

while ((Get-Date) -lt $phase3End) {
    $jobs = $jobs | Where-Object { $_.State -eq 'Running' }
    
    # Gradually reduce load
    $targetJobs = [Math]::Max(5, $jobs.Count - 10)
    while ($jobs.Count -gt $targetJobs) {
        $jobToStop = $jobs[0]
        Stop-Job $jobToStop
        Remove-Job $jobToStop
        $jobs = $jobs[1..($jobs.Count - 1)]
    }
    
    Start-Sleep -Milliseconds 500
}

# Cleanup
Write-Host "Cleaning up..." -ForegroundColor Yellow
$jobs | Stop-Job
$jobs | Remove-Job

Get-Job -Name "PortForward-*" | Stop-Job
Get-Job -Name "PortForward-*" | Remove-Job

$duration = (Get-Date) - $startTime

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host "Total Requests Sent: $requestCount"
Write-Host "Duration: $($duration.TotalSeconds.ToString('F2')) seconds"
Write-Host "Avg Requests/sec: $([Math]::Round($requestCount / $duration.TotalSeconds, 2))"
Write-Host ""
Write-Host "Check pod scaling with: kubectl get pods" -ForegroundColor Green
Write-Host "Check HPA status with: kubectl get hpa" -ForegroundColor Green

