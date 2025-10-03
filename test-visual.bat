@echo off
echo =========================================
echo TEST SYSTEME RECONSTRUCTION VISUELLE
echo =========================================
echo.

echo 1. Test du serveur Node.js...
curl -s http://localhost:3001/api/carrefour-pages > nul
if %errorlevel% == 0 (
    echo    Serveur Node.js: OK
) else (
    echo    Serveur Node.js: ERREUR
    echo    Demarrez le serveur avec: node server.js
    pause
    exit /b 1
)

echo.
echo 2. Test des nouveaux endpoints...
curl -s http://localhost:3001/api/carrefour-visual-pages > nul
if %errorlevel% == 0 (
    echo    Endpoint /api/carrefour-visual-pages: OK
) else (
    echo    Endpoint /api/carrefour-visual-pages: ERREUR
)

echo.
echo 3. Verification de l'emulateur...
adb devices | findstr "emulator-" > nul
if %errorlevel% == 0 (
    echo    Emulateur connecte: OK
) else (
    echo    Emulateur: ERREUR - Aucun emulateur detecte
    echo    Demarrez un emulateur Android
    pause
    exit /b 1
)

echo.
echo =========================================
echo RESULTATS DU TEST
echo =========================================
echo Dashboard: http://localhost:3001/carrefour-dashboard
echo.
echo Instructions pour tester:
echo 1. Ouvrez le dashboard dans votre navigateur
echo 2. Cliquez sur l'onglet 'Vue Visuelle'
echo 3. Lancez Carrefour sur l'emulateur
echo 4. Activez le service d'accessibilite
echo 5. Naviguez dans Carrefour pour voir la reconstruction
echo.
echo Logs ADB pour debug:
echo adb logcat -s OptimizedCarrefour
echo.
pause
