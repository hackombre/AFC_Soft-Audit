@echo off
setlocal EnableExtensions
title AFCsoft Audit - FRONTEND

cd /d "%~dp0"

echo ==========================================
echo        AFCsoft Audit - FRONTEND
echo ==========================================
echo.

REM ==================================================
REM 1. Verification de Node.js
REM ==================================================
echo [1/4] Verification de Node.js...
echo.

where node >nul 2>&1
if errorlevel 1 goto NODE_ERROR

call node --version

REM ==================================================
REM 2. Verification de npm
REM ==================================================
echo.
echo [2/4] Verification de npm...
echo.

where npm >nul 2>&1
if errorlevel 1 goto NPM_NOT_FOUND

call npm --version

REM ==================================================
REM 3. Verification des dependances
REM ==================================================
echo.
echo [3/4] Verification des dependances...
echo.

if not exist "package.json" goto PACKAGE_ERROR

REM --------------------------------------------------
REM Verification de Next.js
REM --------------------------------------------------

if not exist "node_modules" (
    echo node_modules absent.
    echo.
    echo Installation des dependances...
    echo.

    call npm install

    if errorlevel 1 goto INSTALL_ERROR

) else (

    if not exist "node_modules\next\package.json" (
        echo Next.js absent.
        echo.
        echo Installation des dependances...
        echo.

        call npm install

        if errorlevel 1 goto INSTALL_ERROR

    ) else (
        echo Next.js est correctement installe.
    )
)

REM ==================================================
REM 4. Demarrage de Next.js
REM ==================================================
echo.
echo [4/4] Demarrage de Next.js...
echo.

echo ==========================================
echo        AFCsoft Audit
echo ==========================================
echo.
echo Application :
echo http://localhost:3000
echo.
echo CTRL+C pour arreter le serveur.
echo.

call npm run dev

echo.
echo ==========================================
echo        SERVEUR FRONTEND ARRETE
echo ==========================================
echo.

pause
endlocal
exit /b 0


REM ==================================================
REM ERREURS
REM ==================================================

:NODE_ERROR

echo.
echo ==========================================
echo ERREUR NODE.JS
echo ==========================================
echo.
echo Node.js n'est pas installe ou n'est pas
echo accessible depuis le PATH.
echo.
pause
endlocal
exit /b 1


:NPM_NOT_FOUND

echo.
echo ==========================================
echo ERREUR NPM
echo ==========================================
echo.
echo npm n'est pas accessible depuis le PATH.
echo.
pause
endlocal
exit /b 1


:PACKAGE_ERROR

echo.
echo ==========================================
echo ERREUR PACKAGE.JSON
echo ==========================================
echo.
echo package.json est introuvable.
echo.
echo Dossier actuel :
echo %CD%
echo.
pause
endlocal
exit /b 1


:INSTALL_ERROR

echo.
echo ==========================================
echo ERREUR NPM INSTALL
echo ==========================================
echo.
echo L'installation des dependances a echoue.
echo.
echo Verifie le message affiche ci-dessus.
echo.
pause
endlocal
exit /b 1