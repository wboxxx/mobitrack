#!/usr/bin/env python3
"""
Script automatisé complet : Build + Install + Restart Service
"""
import subprocess
import sys
import os
import time
import argparse
import hashlib

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
    args = parser.parse_args()
    
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
        
        # Installation (toujours faire pour être sûr)
        print("   Installation...")
        full_path = os.path.abspath(apk_path)
        print(f"   Chemin APK: {full_path}")
        run_command(f'adb install -r "{full_path}"')
        print("   APK installé")
    else:
        print("1. Build ignoré (SkipBuild)")
    print()
    
    # Etape 2 : Force stop de l'app
    print("2. Arrêt de l'app de tracking...")
    run_command("adb shell am force-stop com.bascule.leclerctracking")
    print("   App arrêtée")
    print()
    
    # Etape 3 : Vider le cache Logcat
    print("3. Vidage du cache Logcat...")
    run_command("adb logcat -c")
    print("   Cache vidé")
    print()
    
    # Etape 4 : Skip Appium (pas nécessaire pour le dashboard)
    print("4. Appium ignoré (pas nécessaire pour le dashboard)")
    print()
    
    # Etape 5 : Skip service restart (pas nécessaire sans Appium)
    print("5. Service d'accessibilité ignoré (pas nécessaire sans Appium)")
    print()
    
    # Etape 6 : Retour à l'accueil
    print("6. Retour à l'écran d'accueil...")
    run_command("adb shell input keyevent KEYCODE_HOME")
    time.sleep(1)
    print("   Accueil OK")
    print()
    
    # Etape 7 : Lancer l'app de tracking
    print("7. Lancement de l'app de tracking...")
    run_command("adb shell monkey -p com.bascule.leclerctracking -c android.intent.category.LAUNCHER 1")
    time.sleep(2)
    print("   App lancée")
    print()
    
    # Etape 7.5 : Ouvrir les paramètres d'accessibilité
    print("7.5. Ouverture des paramètres d'accessibilité...")
    run_command("adb shell am start -a android.settings.ACCESSIBILITY_SETTINGS")
    time.sleep(3)
    print("   Paramètres ouverts - Activez 'CrossAppTracking' manuellement")
    print()
    
    # Etape 8 : Lancer Carrefour
    print("8. Lancement de Carrefour...")
    run_command("adb shell monkey -p com.carrefour.fid.android -c android.intent.category.LAUNCHER 1")
    time.sleep(2)
    print("   Carrefour lancé")
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
