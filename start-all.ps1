# ============================================================
#  Sentinel AI - Start All Services
#  Usage:  .\start-all.ps1   (run from the repo root, e.g. E:\PS6)
#  NOTE: ASCII-only + single-line commands on purpose (see notes).
# ============================================================

$root = $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sentinel AI - Starting All Services"   -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- Pick the backend Python (prefer local venv) ------------
$py = "python"
if (Test-Path "$root\.venv\Scripts\python.exe") {
    $py = "$root\.venv\Scripts\python.exe"
    Write-Host "Using virtual env python: $py" -ForegroundColor DarkGray
} else {
    Write-Host "WARNING: no .venv found - using global 'python'. Backend will fail if deps are not installed globally." -ForegroundColor Yellow
}

# --- Pre-flight sanity checks -------------------------------
if (-not (Test-Path "$root\.env")) {
    Write-Host "WARNING: .env missing in repo root. Backend needs OPENAI_API_KEY / PS6_DB_PATH / CHROMA_DB_PATH." -ForegroundColor Yellow
}
if (-not (Test-Path "$root\frontend\node_modules")) {
    Write-Host "WARNING: frontend\node_modules missing - run 'npm install' in .\frontend first." -ForegroundColor Yellow
}
if (-not (Test-Path "$root\landing\node_modules")) {
    Write-Host "WARNING: landing\node_modules missing - run 'npm install' in .\landing first." -ForegroundColor Yellow
}

# --- 1. FastAPI backend (port 8000) ------------------------
Write-Host "[1/3] Starting FastAPI backend  -> http://localhost:8000" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; & '$py' -m uvicorn api.main:app --reload --port 8000"
Start-Sleep -Seconds 2

# --- 2. Vite React console (port 5173) ---------------------
Write-Host "[2/3] Starting React console    -> http://localhost:5173" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"
Start-Sleep -Seconds 2

# --- 3. Next.js landing (port 3000) ------------------------
Write-Host "[3/3] Starting Next.js landing  -> http://localhost:3000" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\landing'; npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Launched 3 windows. Watch EACH window for errors." -ForegroundColor Green
Write-Host "  Landing  -> http://localhost:3000" -ForegroundColor White
Write-Host "  Console  -> http://localhost:5173   (open directly; /console proxy is broken - see notes)" -ForegroundColor White
Write-Host "  API docs -> http://localhost:8000/docs" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
