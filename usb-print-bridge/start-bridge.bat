@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Installeer Node.js LTS van https://nodejs.org en voer daarna opnieuw uit.
  pause
  exit /b 1
)
if not exist "node_modules\" (
  echo Eerste keer: npm install ...
  call npm install
)
node server.mjs
pause
