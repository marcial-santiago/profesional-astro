# Stripe Webhook Dev Setup Script
# Run this after authorizing the Stripe CLI in your browser

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Stripe Webhook Dev Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if already logged in
$loginCheck = stripe config --list 2>&1
if ($loginCheck -match "display_name") {
    Write-Host "[OK] Stripe CLI is authenticated" -ForegroundColor Green
} else {
    Write-Host "[!] Not authenticated. Run: stripe login" -ForegroundColor Yellow
    Write-Host "    Then open the URL in your browser to authorize.`n" -ForegroundColor Yellow
    exit 1
}

# Start the webhook listener in the background
$listenPort = 3000
$forwardUrl = "http://localhost:$listenPort/api/stripe/webhook"

Write-Host "[*] Starting Stripe listener..." -ForegroundColor Yellow
Write-Host "    Forwarding to: $forwardUrl`n" -ForegroundColor Yellow

# Start stripe listen as a background process
$process = Start-Process -FilePath "stripe" -ArgumentList "listen", "--forward-to", $forwardUrl -NoNewWindow -PassThru -RedirectStandardOutput "$PSScriptRoot\.stripe-listen.log"

Write-Host "[*] Stripe listener started (PID: $($process.Id))" -ForegroundColor Green
Write-Host "    Logs: .stripe-listen.log`n" -ForegroundColor Green

# Wait a moment for the listener to start and get the secret
Start-Sleep -Seconds 3

# Read the log to extract the webhook secret
$logContent = Get-Content "$PSScriptRoot\.stripe-listen.log" -Raw
if ($logContent -match "whsec_[a-zA-Z0-9]+") {
    $webhookSecret = $Matches[0]
    Write-Host "[OK] Webhook secret found: $webhookSecret`n" -ForegroundColor Green

    # Update .env file
    $envFile = "$PSScriptRoot\.env"
    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile -Raw
        if ($envContent -match "STRIPE_WEBHOOK_SECRET=.*") {
            $envContent = $envContent -replace "STRIPE_WEBHOOK_SECRET=.*", "STRIPE_WEBHOOK_SECRET=$webhookSecret"
            $envContent | Set-Content $envFile -NoNewline
            Write-Host "[OK] .env updated with webhook secret" -ForegroundColor Green
        } else {
            Add-Content $envFile "`nSTRIPE_WEBHOOK_SECRET=$webhookSecret"
            Write-Host "[OK] STRIPE_WEBHOOK_SECRET added to .env" -ForegroundColor Green
        }
    } else {
        Write-Host "[ERROR] .env file not found" -ForegroundColor Red
    }
} else {
    Write-Host "[!] Could not extract webhook secret from logs yet." -ForegroundColor Yellow
    Write-Host "    Check .stripe-listen.log manually.`n" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  1. Restart your dev server: pnpm dev" -ForegroundColor White
Write-Host "  2. Trigger a test event:" -ForegroundColor White
Write-Host "     stripe trigger checkout.session.completed" -ForegroundColor Yellow
Write-Host "  3. Check the logs for webhook processing`n" -ForegroundColor White
