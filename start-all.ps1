# Sentinel AI — Start All Services
# Run from: AML_investigation_detection/
# Usage: .\start-all.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sentinel AI — Starting All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. FastAPI Backend (port 8000) ────────────────────────────────
Write-Host "[1/3] Starting FastAPI backend on http://localhost:8000" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "cd '$PSScriptRoot'; python -m uvicorn api.main:app --reload --port 8000"

Start-Sleep -Seconds 2

# ── 2. Vite React Console (port 5173) ─────────────────────────────
Write-Host "[2/3] Starting React investigation console on http://localhost:5173" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "cd '$PSScriptRoot\frontend'; npm run dev"

Start-Sleep -Seconds 2

# ── 3. Next.js Landing + Auth (port 3000) ─────────────────────────
Write-Host "[3/3] Starting Next.js landing/auth/dashboard on http://localhost:3000" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "cd '$PSScriptRoot\landing'; npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All services launched!" -ForegroundColor Green
Write-Host ""
Write-Host "  Landing Page  → http://localhost:3000" -ForegroundColor White
Write-Host "  Dashboard     → http://localhost:3000/dashboard" -ForegroundColor White
Write-Host "  Login         → http://localhost:3000/login" -ForegroundColor White
Write-Host "  Console       → http://localhost:3000/console" -ForegroundColor White
Write-Host "  FastAPI Docs  → http://localhost:8000/docs" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
