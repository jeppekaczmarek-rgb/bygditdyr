@echo off
cd /d "%~dp0"
title Udgiv Byg Dit Dyr

REM --- Sorg for at git kan findes, selv hvis det ikke er paa PATH ---
where git >nul 2>&1 || set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\Git\bin"

echo ==================================================
echo   Udgiver "Byg Dit Dyr" til GitHub Pages
echo   Mappe: %cd%
echo ==================================================
echo.

REM --- 1) Opret lokalt git-repo foerste gang ---
if not exist ".git" (
  echo [foerste gang] opretter lokalt git-repo...
  git init
  git branch -M main
  git remote add origin https://github.com/jeppekaczmarek-rgb/bygditdyr.git
)

REM --- 2) Lokal identitet (gaelder kun dette repo, ingen mail offentliggjort) ---
git config user.name "Jeppe"
git config user.email "jeppekaczmarek-rgb@users.noreply.github.com"

REM --- 3) Sikr korrekt remote ---
git remote get-url origin >nul 2>&1 || git remote add origin https://github.com/jeppekaczmarek-rgb/bygditdyr.git

REM --- 4) Stage + commit (helt ok hvis intet er aendret) ---
git add -A
git commit -m "Opdatering %date% %time%" || echo (ingen aendringer - springer commit over)

REM --- 5) Push til GitHub (foerste gang aabnes et GitHub-login i din browser) ---
git push -u origin main

echo.
echo ==================================================
echo   FAERDIG.
echo   Siden er live/opdateret om ca. 1 minut paa:
echo   https://jeppekaczmarek-rgb.github.io/bygditdyr/
echo ==================================================
echo.
pause
