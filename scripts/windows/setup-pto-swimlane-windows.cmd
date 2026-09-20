@echo off
setlocal
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-pto-swimlane-windows.ps1"
set "pto_result=%ERRORLEVEL%"
echo.
if not "%pto_result%"=="0" echo Installation did not complete. Read the message above.
pause
exit /b %pto_result%
