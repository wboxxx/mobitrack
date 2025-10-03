#!/usr/bin/env python3
"""
Script automatisé complet : Build + Install + Restart Service
Support multi-devices (émulateur + physique)
"""
import subprocess
import sys
import os
import time
import argparse
import hashlib
import re

def run_command(cmd, cwd=None, check=True, timeout=300):
    """Exécute une commande et retourne le résultat"""
    print(f"   Exécution: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd, check=check, 
                              capture_output=True, text=True, encoding='utf-8',
                              timeout=timeout)
        if result.stdout:
            # Afficher les dernières lignes importantes
            lines = result.stdout.strip().split('\n')
            for line in lines[-5:]:  # Afficher les 5 dernières lignes
                if line.strip():
                    print(f"   {line.strip()}")
        return result
    except subprocess.TimeoutExpired as e:
        print(f"   Timeout après {timeout}s - continuons...")
        return e
    except subprocess.CalledProcessError as e:
        print(f"   Erreur: {e}")
        if e.stderr:
            print(f"   {e.stderr.strip()}")
        return e

def check_appium():
    """Vérifie qu'Appium tourne"""
    try:
        result = subprocess.run("netstat -ano | findstr :4723", shell=True, 
                              capture_output=True, text=True)
        return ":4723" in result.stdout
    except:
        return False

def get_connected_devices():
    """Récupère la liste des devices connectés"""
    try:
        result = subprocess.run("adb devices", shell=True, capture_output=True, text=True)
        devices = []
        for line in result.stdout.split('\n'):
            if '\tdevice' in line:
                device_id = line.split('\t')[0]
                devices.append(device_id)
        return devices
    except:
        return []

def run_adb_command(cmd, device_id=None):
    """Exécute une commande ADB sur un device spécifique"""
    if device_id:
        full_cmd = f"adb -s {device_id} {cmd}"
    else:
        full_cmd = f"adb {cmd}"
    
    print(f"   Exécution: {full_cmd}")
    try:
        result = subprocess.run(full_cmd, shell=True, capture_output=True, text=True, timeout=60)
        if result.stdout:
            lines = result.stdout.strip().split('\n')
            for line in lines[-3:]:  # Afficher les 3 dernières lignes
                if line.strip():
                    print(f"   {line.strip()}")
        return result
    except subprocess.CalledProcessError as e:
        print(f"   Erreur: {e}")
        if e.stderr and "more than one device/emulator" in e.stderr:
            print(f"   ⚠️ Plusieurs devices détectés - utilisez -d pour spécifier")
        return e
    except subprocess.TimeoutExpired:
        print(f"   Timeout - continuons...")
        return None

def get_file_hash(filepath):
    """Calcule le hash d'un fichier"""
    if not os.path.exists(filepath):
        return None
    with open(filepath, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

def get_source_files_hash():
    """Calcule le hash de tous les fichiers sources Kotlin"""
    source_dir = "android-app/app/src/main/java"
    if not os.path.exists(source_dir):
        return None
    
    hashes = []
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            if file.endswith('.kt'):
                filepath = os.path.join(root, file)
                file_hash = get_file_hash(filepath)
                if file_hash:
                    hashes.append(file_hash)
    
    if not hashes:
        return None
    
    # Combiner tous les hashes
    combined = ''.join(sorted(hashes))
    return hashlib.md5(combined.encode()).hexdigest()

def needs_rebuild():
    """Vérifie si un rebuild est nécessaire"""
    apk_path = "android-app/app/build/outputs/apk/debug/app-debug.apk"
    hash_file = "android-app/.last_build_hash"
    
    # Si l'APK n'existe pas, rebuild nécessaire
    if not os.path.exists(apk_path):
        print("   APK n'existe pas - rebuild nécessaire")
        return True
    
    # Calculer le hash des sources actuelles
    current_hash = get_source_files_hash()
    if not current_hash:
        print("   Impossible de calculer le hash des sources - rebuild nécessaire")
        return True
    
    # Lire le hash de la dernière build
    last_hash = None
    if os.path.exists(hash_file):
        with open(hash_file, 'r') as f:
            last_hash = f.read().strip()
    
    # Comparer les hashes
    if current_hash != last_hash:
        print(f"   Code modifié (hash: {current_hash[:8]}...) - rebuild nécessaire")
        return True
    else:
        print(f"   Code inchangé (hash: {current_hash[:8]}...) - skip rebuild")
        return False

def save_build_hash():
    """Sauvegarde le hash de la build actuelle"""
    hash_file = "android-app/.last_build_hash"
    current_hash = get_source_files_hash()
    if current_hash:
        with open(hash_file, 'w') as f:
            f.write(current_hash)

def main():
    parser = argparse.ArgumentParser(description='Build + Install + Restart Service')
    parser.add_argument('--skip-build', action='store_true', help='Skip APK build')
    parser.add_argument('-d', '--device', help='Device ID spécifique (ou "all" pour tous)')
    parser.add_argument('--list-devices', action='store_true', help='Lister les devices connectés')
    args = parser.parse_args()
    
    # Lister les devices si demandé
    if args.list_devices:
        devices = get_connected_devices()
        print("Devices connectés:")
        for i, device in enumerate(devices):
            print(f"  {i+1}. {device}")
        return
    
    # Détecter les devices
    devices = get_connected_devices()
    if not devices:
        print("❌ Aucun device Android connecté!")
        sys.exit(1)
    
    # Sélectionner les devices à utiliser
    if args.device == "all":
        target_devices = devices
        print(f"🎯 Utilisation de TOUS les devices: {target_devices}")
    elif args.device:
        if args.device in devices:
            target_devices = [args.device]
            print(f"🎯 Device spécifique: {args.device}")
        else:
            print(f"❌ Device '{args.device}' non trouvé!")
            print(f"Devices disponibles: {devices}")
            sys.exit(1)
    else:
        if len(devices) == 1:
            target_devices = devices
            print(f"🎯 Device automatique: {devices[0]}")
        else:
            print(f"⚠️ Plusieurs devices détectés: {devices}")
            print("💡 Utilisez -d <device_id> ou -d all pour spécifier")
            print("💡 Ou utilisez --list-devices pour voir la liste")
            sys.exit(1)
    
    print("=" * 40)
    print("  REBUILD & RESTART (AUTOMATIQUE)")
    print("=" * 40)
    print()
    
    # Etape 1 : Build et Install APK (seulement si nécessaire)
    if not args.skip_build:
        print("1. Vérification des modifications...")
        
        if needs_rebuild():
            print("   Rebuild nécessaire!")
            print("   Nettoyage...")
            run_command("gradlew clean", cwd="android-app")
            
            print("   Compilation... (peut prendre 2-3 minutes)")
            result = run_command("gradlew assembleDebug", cwd="android-app", timeout=600)
            if hasattr(result, 'returncode') and result.returncode != 0:
                print("   Build échoué!")
                sys.exit(1)
            print("   Compilation terminée!")
            
            # Sauvegarder le hash de cette build
            save_build_hash()
        else:
            print("   Pas de modifications détectées - skip compilation")
        
        # Vérification APK
        apk_path = "android-app/app/build/outputs/apk/debug/app-debug.apk"
        if not os.path.exists(apk_path):
            print("   APK non trouvé!")
            sys.exit(1)
        
        # Installation sur tous les devices
        print("   Installation...")
        full_path = os.path.abspath(apk_path)
        print(f"   Chemin APK: {full_path}")
        
        for device in target_devices:
            print(f"   📱 Installation sur {device}...")
            run_adb_command(f'install -r "{full_path}"', device)
        print("   APK installé sur tous les devices")
    else:
        print("1. Build ignoré (SkipBuild)")
    print()
    
    # Etape 2 : Force stop de l'app sur tous les devices
    print("2. Arrêt de l'app de tracking...")
    for device in target_devices:
        print(f"   📱 Arrêt sur {device}...")
        run_adb_command("shell am force-stop com.bascule.leclerctracking", device)
    print("   App arrêtée sur tous les devices")
    print()
    
    # Etape 3 : Vider le cache Logcat
    print("3. Vidage du cache Logcat...")
    for device in target_devices:
        print(f"   📱 Cache vidé sur {device}...")
        run_adb_command("logcat -c", device)
    print("   Cache vidé sur tous les devices")
    print()
    
    # Etape 4 : Skip Appium (pas nécessaire pour le dashboard)
    print("4. Appium ignoré (pas nécessaire pour le dashboard)")
    print()
    
    # Etape 5 : Skip service restart (pas nécessaire sans Appium)
    print("5. Service d'accessibilité ignoré (pas nécessaire sans Appium)")
    print()
    
    # Etape 6 : Retour à l'accueil
    print("6. Retour à l'écran d'accueil...")
    for device in target_devices:
        print(f"   📱 Accueil sur {device}...")
        run_adb_command("shell input keyevent KEYCODE_HOME", device)
    time.sleep(1)
    print("   Accueil OK sur tous les devices")
    print()
    
    # Etape 7 : Lancer l'app de tracking
    print("7. Lancement de l'app de tracking...")
    for device in target_devices:
        print(f"   📱 Lancement sur {device}...")
        run_adb_command("shell monkey -p com.bascule.leclerctracking -c android.intent.category.LAUNCHER 1", device)
    time.sleep(2)
    print("   App lancée sur tous les devices")
    print()
    
    # Etape 7.5 : Ouvrir les paramètres d'accessibilité
    print("7.5. Ouverture des paramètres d'accessibilité...")
    for device in target_devices:
        print(f"   📱 Paramètres sur {device}...")
        run_adb_command("shell am start -a android.settings.ACCESSIBILITY_SETTINGS", device)
    time.sleep(3)
    print("   Paramètres ouverts - Activez 'CrossAppTracking' manuellement sur chaque device")
    print()
    
    # Etape 8 : Lancer Carrefour
    print("8. Lancement de Carrefour...")
    for device in target_devices:
        print(f"   📱 Carrefour sur {device}...")
        run_adb_command("shell monkey -p com.carrefour.fid.android -c android.intent.category.LAUNCHER 1", device)
    time.sleep(2)
    print("   Carrefour lancé sur tous les devices")
    print()
    
    print("=" * 40)
    print("  PRÊT POUR LES TESTS!")
    print("=" * 40)
    print()
    print("Prochaines étapes:")
    print("  - Lance le serveur: python -m http.server 3001")
    print("  - Ou lance le monitoring: python start_monitoring.py")
    print()

if __name__ == "__main__":
    main()
