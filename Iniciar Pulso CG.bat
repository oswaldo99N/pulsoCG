@echo off
rem Windows: doble clic para abrir Pulso CG. Deja esta ventana abierta mientras transmites.
title Pulso CG
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" --open
echo.
echo Pulso CG se detuvo. Puedes cerrar esta ventana.
pause >nul
