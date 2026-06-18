@echo off
setlocal
cd /d "%~dp0..\.."
set "CODEX_EXE="
for /f "delims=" %%I in ('where codex.exe 2^>nul') do (
  set "CODEX_EXE=%%I"
  goto run
)
for /f "delims=" %%I in ('where codex 2^>nul') do (
  if exist "%%I.exe" (
    set "CODEX_EXE=%%I.exe"
  ) else (
    set "CODEX_EXE=%%I"
  )
  goto run
)

:run
if defined CODEX_EXE (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-codex-savings-round.ps1" -CodexExecutable "%CODEX_EXE%"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-codex-savings-round.ps1"
)
echo.
if errorlevel 1 (
  echo Runner exited with an error.
) else (
  echo Runner finished.
)
pause
