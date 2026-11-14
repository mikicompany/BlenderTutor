@echo off
:: Miki Butler Renderfarm launcher.
:: Keep this file next to farm_watcher.py in the Drive Renderfarm folder,
:: double-click it on the render PC, and leave the window open.

:: 1. PATH TO BLENDER (the watcher uses Blender's own Python, nothing else to install)
set "BLENDER_PATH=C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"

:: 2. FARM FOLDER (input .blend files, job files, output)
set "FARM_FOLDER=G:\My Drive\Work\Renderfarm"

title *** MIKI BUTLER RENDERFARM - WATCHING GOOGLE DRIVE ***
if not exist "%BLENDER_PATH%" (
  echo [ERROR] Blender not found at "%BLENDER_PATH%". Edit start_farm.bat.
  pause
  exit /b 1
)

:loop
"%BLENDER_PATH%" -b --factory-startup --python-exit-code 1 --python "%FARM_FOLDER%\farm_watcher.py"
echo.
echo [%TIME%] Watcher stopped. Restarting in 10 seconds (close this window to quit)...
timeout /t 10 /nobreak >nul
goto loop
