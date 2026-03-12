@echo off
setlocal

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo [Prompt Wiki] Checking Node.js and npm...
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not in PATH.
  echo Install Node.js 18+ first: https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not available in PATH.
  echo Reinstall Node.js 18+ and make sure npm is included.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [Prompt Wiki] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [Prompt Wiki] npm install failed.
    pause
    exit /b 1
  )
)

echo [Prompt Wiki] Updating content index...
call npm run content:index
if errorlevel 1 (
  echo [Prompt Wiki] content:index failed.
  pause
  exit /b 1
)

if not exist "apps\web\.next\BUILD_ID" (
  echo [Prompt Wiki] First-time build in progress...
  call npm run build
  if errorlevel 1 (
    echo [Prompt Wiki] Build failed.
    pause
    exit /b 1
  )
)

echo [Prompt Wiki] Starting server at http://127.0.0.1:3000 ...
start "Prompt Wiki Server" cmd /k "cd /d ""%ROOT_DIR%"" && npm run start:local:server"

echo [Prompt Wiki] Waiting for server to respond...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; for($i=0; $i -lt 60; $i++){ try { Invoke-WebRequest 'http://127.0.0.1:3000' -UseBasicParsing | Out-Null; Start-Process 'http://127.0.0.1:3000'; exit 0 } catch { Start-Sleep -Seconds 1 } }; Write-Host 'Server did not become ready within 60 seconds.'"

endlocal
