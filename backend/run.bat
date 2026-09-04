@echo off
REM =========================================================
REM  AFCsoft Audit - Backend (FastAPI)
REM  A placer dans le dossier backend/ et lancer par double-clic
REM  (ou depuis un terminal : run.bat)
REM =========================================================

cd /d "%~dp0"

if not exist ".venv" (
    echo [AFCsoft] Creation de l'environnement virtuel Python...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

echo [AFCsoft] Installation/mise a jour des dependances...
pip install -r requirements.txt -q

if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [AFCsoft] Fichier .env cree a partir de .env.example
    )
)

echo.
echo [AFCsoft] Demarrage du serveur backend sur http://localhost:8000
echo [AFCsoft] Documentation API : http://localhost:8000/docs
echo [AFCsoft] Ctrl+C pour arreter le serveur.
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
