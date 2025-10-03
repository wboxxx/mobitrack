# Script de test pour le système de reconstruction visuelle Carrefour
# Teste l'APK, le serveur Node.js et le dashboard

Write-Host "========================================="
Write-Host "TEST SYSTEME RECONSTRUCTION VISUELLE"
Write-Host "========================================="

Write-Host ""
Write-Host "1. Verification du serveur Node.js..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/carrefour-pages" -Method GET
    if ($response.StatusCode -eq 200) {
        Write-Host "   Serveur Node.js: OK"
    } else {
        Write-Host "   Serveur Node.js: ERREUR - Code $($response.StatusCode)"
    }
} catch {
    Write-Host "   Serveur Node.js: ERREUR - $($_.Exception.Message)"
    Write-Host "   Demarrez le serveur avec: node server.js"
    exit 1
}

Write-Host ""
Write-Host "2. Test des nouveaux endpoints..."
try {
    $visualResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/carrefour-visual-pages" -Method GET
    if ($visualResponse.StatusCode -eq 200) {
        Write-Host "   Endpoint /api/carrefour-visual-pages: OK"
    } else {
        Write-Host "   Endpoint /api/carrefour-visual-pages: ERREUR - Code $($visualResponse.StatusCode)"
    }
} catch {
    Write-Host "   Endpoint /api/carrefour-visual-pages: ERREUR - $($_.Exception.Message)"
}

Write-Host ""
Write-Host "3. Verification de l'emulateur..."
try {
    $devices = adb devices
    $emulatorConnected = $devices -match "emulator-\d+"
    if ($emulatorConnected) {
        Write-Host "   Emulateur connecte: OK"
        Write-Host "   Emulateur detecte: $($emulatorConnected[0])"
    } else {
        Write-Host "   Emulateur: ERREUR - Aucun emulateur detecte"
        Write-Host "   Demarrez un emulateur Android"
        exit 1
    }
} catch {
    Write-Host "   Emulateur: ERREUR - $($_.Exception.Message)"
    exit 1
}

Write-Host ""
Write-Host "4. Test de l'APK installe..."
try {
    $apkInstalled = adb shell pm list packages | Select-String "com.bascule.leclerctracking"
    if ($apkInstalled) {
        Write-Host "   APK installe: OK"
        Write-Host "   Package: $($apkInstalled.Line)"
    } else {
        Write-Host "   APK: ERREUR - Package non trouve"
        Write-Host "   Installez l'APK avec: adb install -r android-app\app\build\outputs\apk\debug\app-debug.apk"
        exit 1
    }
} catch {
    Write-Host "   APK: ERREUR - $($_.Exception.Message)"
}

Write-Host ""
Write-Host "5. Test de la reconstruction HTML..."
$testHtml = @"
<!DOCTYPE html>
<html>
<head><title>Test Carrefour Visual</title></head>
<body>
    <h1>Test de reconstruction visuelle</h1>
    <p>Ceci est un test de la reconstruction HTML</p>
    <div style="background: #E60012; color: white; padding: 10px;">
        Bouton Carrefour
    </div>
</body>
</html>
"@

$testData = @{
    html = $testHtml
    timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    source = "TestScript"
    type = "visual"
} | ConvertTo-Json

try {
    $testResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/carrefour-visual" -Method POST -Body $testData -ContentType "application/json"
    if ($testResponse.StatusCode -eq 200) {
        Write-Host "   Test reconstruction HTML: OK"
        Write-Host "   Page de test envoyee au serveur"
    } else {
        Write-Host "   Test reconstruction HTML: ERREUR - Code $($testResponse.StatusCode)"
    }
} catch {
    Write-Host "   Test reconstruction HTML: ERREUR - $($_.Exception.Message)"
}

Write-Host ""
Write-Host "========================================="
Write-Host "RESULTATS DU TEST"
Write-Host "========================================="
Write-Host "Dashboard: http://localhost:3001/carrefour-dashboard"
Write-Host ""
Write-Host "Instructions pour tester:"
Write-Host "1. Ouvrez le dashboard dans votre navigateur"
Write-Host "2. Cliquez sur l'onglet 'Vue Visuelle'"
Write-Host "3. Vous devriez voir la page de test HTML"
Write-Host "4. Lancez Carrefour sur l'emulateur"
Write-Host "5. Activez le service d'accessibilite"
Write-Host "6. Naviguez dans Carrefour pour voir la reconstruction"
Write-Host ""
Write-Host "Logs ADB pour debug:"
Write-Host "adb logcat -s OptimizedCarrefour"
