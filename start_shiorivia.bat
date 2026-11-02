@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Shiorivia - Local Edition

echo.
echo ==================================================
echo       SHIORIVIA - LOCAL EDITION
echo           System Initialization...
echo ==================================================
echo.

:: 1. 检查 Node.js
echo [1/5] Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed or not in PATH!
    echo Please install Node.js 24 LTS.
    pause
    exit /b
)
echo    - Node.js found.

:: 2. 自动创建目录
echo [2/5] Verifying storage architecture...

if not exist "data_storage\" mkdir "data_storage"
if not exist "data_storage\slots\" mkdir "data_storage\slots"

:: 确保 public 下的所有素材目录都存在
if not exist "public\gallery\" mkdir "public\gallery"
if not exist "public\tachie\" mkdir "public\tachie"
if not exist "public\live2d\" (
    echo [+] Creating live2d directory...
    mkdir "public\live2d"
)
if not exist "public\music\" (
    echo [+] Creating music directory...
    mkdir "public\music"
)
if not exist "public\backgrounds\" (
    echo [+] Creating backgrounds directory...
    mkdir "public\backgrounds"
)

echo    - Directories ready.

:: 3. 依赖安装检测
echo [3/5] Checking dependencies...
if exist "node_modules\" goto :SKIP_INSTALL

echo    - node_modules not found. Installing...
call npm ci
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed!
    pause
    exit /b
)
echo    - Dependencies installed.

:SKIP_INSTALL

:: 4. Config files are tracked in src/data (no auto-generator needed).
echo [4/5] Configuration ready.

:: 5. 启动服务
echo.
echo [5/5] Starting Neural Link...
echo.
echo ==================================================
echo    Access: http://localhost:3000
echo    Status: STARTING...
echo ==================================================
echo.

:: Start Next.js first. A child PowerShell waits for a successful HTTP response;
:: opening a browser before the listener exists caused ERR_CONNECTION_REFUSED.
start "" /b powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$url='http://127.0.0.1:3000'; for($i=0;$i -lt 120;$i++){ try { $r=Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop; if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){ Start-Process $url; exit 0 } } catch {} ; Start-Sleep -Seconds 1 }; Write-Host '[WARN] Server readiness timed out; see launcher output.'"
call npm run dev

:: 如果运行到这里，说明服务器崩溃了
echo.
echo ==================================================
echo [CRITICAL] The server process has crashed!
echo Please check the error messages above.
echo ==================================================
pause