@echo off
REM Heady Extension Installer for Windows
REM Installs all Heady browser and IDE extensions

echo.
echo ========================================
echo Heady Extension Installer
echo ========================================
echo.

set HEADY_ROOT=C:\Users\erich\Heady

echo [1/4] Checking Heady distribution...
if not exist "%HEADY_ROOT%\distribution" (
    echo ERROR: Heady distribution not found at %HEADY_ROOT%
    exit /b 1
)
echo OK: Distribution found
echo.

echo [2/4] Browser Extensions:
echo.
echo Chrome Extension:
echo   Location: %HEADY_ROOT%\distribution\browser\extensions\chrome
echo   Install: Open Chrome, go to chrome://extensions
echo   Enable "Developer mode", click "Load unpacked"
echo   Select: %HEADY_ROOT%\distribution\browser\extensions\chrome
echo.

echo Edge Extension:
echo   Location: %HEADY_ROOT%\distribution\browser\extensions\edge
echo   Install: Open Edge, go to edge://extensions
echo   Enable "Developer mode", click "Load unpacked"
echo   Select: %HEADY_ROOT%\distribution\browser\extensions\edge
echo.

echo Firefox Extension:
echo   Location: %HEADY_ROOT%\distribution\browser\extensions\firefox
echo   Install: Open Firefox, go to about:debugging
echo   Click "This Firefox", then "Load Temporary Add-on"
echo   Select: %HEADY_ROOT%\distribution\browser\extensions\firefox\manifest.json
echo.

echo [3/4] IDE Extensions:
echo.
echo VS Code:
echo   Location: %HEADY_ROOT%\distribution\ide\vscode
echo   Open VS Code, go to Extensions view
echo   Click "..." menu ^> "Install from VSIX" or open folder in VS Code
echo   Press F5 to run extension
echo.

echo Vim:
echo   Copy %HEADY_ROOT%\distribution\ide\vim\plugin\heady.vim
echo   to your Vim plugin directory (e.g., ~/.vim/plugin/)
echo   Or use a plugin manager like vim-plug
echo.

echo Emacs:
echo   Copy %HEADY_ROOT%\distribution\ide\emacs\heady.el
echo   to your Emacs load path
echo   Add (require 'heady) to your init.el
echo.

echo Sublime Text:
echo   Copy %HEADY_ROOT%\distribution\ide\sublime\HeadyAI.py
echo   to Sublime's Packages/User directory
echo   Restart Sublime
echo.

echo [4/4] Building extension packages...
echo.
if exist "%HEADY_ROOT%\distribution\browser\extensions\build-all.ps1" (
    powershell -ExecutionPolicy Bypass -File "%HEADY_ROOT%\distribution\browser\extensions\build-all.ps1"
)

echo.
echo ========================================
echo Extension Installation Complete
echo ========================================
echo.
echo Quick Commands:
echo   Chrome:   start chrome://extensions
echo   Edge:     start edge://extensions
echo   Firefox:  start firefox about:debugging
echo.
pause
