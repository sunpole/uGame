@echo off
setlocal
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0Update-uGame.ps1"
set "UGAME_EXIT=%ERRORLEVEL%"
if not "%UGAME_EXIT%"=="0" pause
exit /b %UGAME_EXIT%
