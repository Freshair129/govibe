@echo off
setlocal
cd /d "%~dp0..\.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-codex-savings-round.ps1" %*
echo.
if errorlevel 1 (
  echo Runner exited with an error.
) else (
  echo Runner finished.
)
pause
