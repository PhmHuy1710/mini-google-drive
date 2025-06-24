# Mini Google Drive Server Manager
# PowerShell script to safely start the server

Write-Host "🚀 Mini Google Drive Server Manager" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if port 3001 is in use
$port = "3001"
$existingProcess = netstat -ano | findstr ":$port"

if ($existingProcess) {
    Write-Host "⚠️  Port $port is already in use:" -ForegroundColor Yellow
    Write-Host $existingProcess -ForegroundColor Gray
    
    # Extract PID from netstat output
    $pid = ($existingProcess -split '\s+')[-1]
    
    Write-Host "🔥 Killing existing process (PID: $pid)..." -ForegroundColor Red
    try {
        Stop-Process -Id $pid -Force
        Start-Sleep -Seconds 2
        Write-Host "✅ Process killed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to kill process: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "💡 Please manually kill the process or restart your computer" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✅ Port $port is available" -ForegroundColor Green
}

# Start the server
Write-Host "🚀 Starting Mini Google Drive server..." -ForegroundColor Cyan
try {
    npm start
}
catch {
    Write-Host "❌ Failed to start server: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 