# Script pour réinstaller l'APK en gardant les permissions
$apkPath = "app\build\outputs\apk\debug\app-debug.apk"

Write-Host "🔄 Réinstallation de l'APK en gardant les permissions..." -ForegroundColor Cyan

# Vérifier que l'APK existe
if (Test-Path $apkPath) {
    # Réinstaller avec flag -r (garde les données et permissions)
    adb install -r $apkPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ APK réinstallé avec succès - Permissions conservées!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de la réinstallation" -ForegroundColor Red
    }
} else {
    Write-Host "❌ APK non trouvé: $apkPath" -ForegroundColor Red
    Write-Host "💡 Compile d'abord l'APK dans Android Studio (Build > Build APK)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Appuie sur une touche pour fermer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
