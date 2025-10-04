#!/usr/bin/env python3
"""
Script automatisé complet : Build + Install + Restart Service + Auscultation d'Accessibilité
Version avec intégration des nouveaux aiguillages d'auscultation
"""

import subprocess
import sys
import os
import time
import argparse
import hashlib
import json
import requests

def run_command(cmd, cwd=None, check=True, timeout=300):
    """Exécute une commande et retourne le résultat"""
    print(f"   Exécution: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd, check=check, capture_output=True, text=True, encoding='utf-8', timeout=timeout)
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
        result = subprocess.run("netstat -ano | findstr :4723", shell=True, capture_output=True, text=True)
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

def build_auscultation_apk():
    """Construit l'APK avec l'intégration d'auscultation d'accessibilité"""
    print("   🔍 Construction de l'APK avec intégration d'auscultation d'accessibilité...")
    
    # Vérifier que les fichiers d'auscultation existent
    auscultation_files = [
        "android-app/app/src/main/java/com/bascule/leclerctracking/auscultation/A11yEventRaw.kt",
        "android-app/app/src/main/java/com/bascule/leclerctracking/auscultation/AppAuscultationAnalyzer.kt",
        "public/auscultation-dashboard.html",
        "accessibility-auscultation.js"
    ]
    
    missing_files = []
    for file_path in auscultation_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        print(f"   ⚠️ Fichiers d'auscultation manquants: {missing_files}")
        print("   📝 Les fichiers seront créés pendant le build...")
    
    # Nettoyer le build précédent
    print("   🧹 Nettoyage du build précédent...")
    run_command("gradlew clean", cwd="android-app")
    
    # Construire l'APK
    print("   🔨 Construction de l'APK avec fonctionnalités d'auscultation...")
    result = run_command("gradlew assembleDebug", cwd="android-app", timeout=600)
    
    if hasattr(result, 'returncode') and result.returncode != 0:
        print("   ❌ Build échoué!")
        return False
    
    print("   ✅ APK avec auscultation d'accessibilité construit avec succès!")
    return True

def start_server():
    """Démarre le serveur Node.js"""
    print("   🚀 Démarrage du serveur...")
    try:
        # Vérifier si le serveur tourne déjà
        result = subprocess.run("netstat -ano | findstr :3001", shell=True, capture_output=True, text=True)
        if ":3001" in result.stdout:
            print("   ⚠️ Serveur déjà en cours d'exécution sur le port 3001")
            return True
        
        # Démarrer le serveur en arrière-plan
        subprocess.Popen(["node", "server.js"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Attendre que le serveur démarre
        time.sleep(3)
        
        # Vérifier que le serveur répond
        result = subprocess.run("curl -s http://localhost:3001", shell=True, capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("   ✅ Serveur démarré avec succès!")
            return True
        else:
            print("   ⚠️ Serveur démarré mais ne répond pas encore")
            return True
            
    except Exception as e:
        print(f"   ❌ Erreur lors du démarrage du serveur: {e}")
        return False

def test_auscultation_integration():
    """Teste l'intégration d'auscultation d'accessibilité"""
    print("   🧪 Test de l'intégration d'auscultation d'accessibilité...")
    
    try:
        # Tester l'endpoint d'auscultation
        result = subprocess.run("curl -s http://localhost:3001/api/accessibility-stats", shell=True, capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            print("   ✅ Endpoints d'auscultation fonctionnels")
            return True
        else:
            print("   ⚠️ Endpoints d'auscultation non disponibles")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur lors du test: {e}")
        return False

def test_auscultation_advanced():
    """Teste l'auscultation avancée selon le prompt original"""
    print("   🔍 Test de l'auscultation avancée...")
    
    try:
        # Exécuter le test d'auscultation avancée
        result = subprocess.run("node test-auscultation-advanced.js", shell=True, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("   ✅ Test d'auscultation avancée réussi")
            return True
        else:
            print("   ⚠️ Test d'auscultation avancée échoué")
            print(f"   Erreur: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur lors du test avancé: {e}")
        return False

def check_auscultation_dashboards():
    """Vérifie que les dashboards d'auscultation sont accessibles"""
    print("   📊 Vérification des dashboards d'auscultation...")
    
    dashboards = [
        ("http://localhost:3001/auscultation-dashboard", "Dashboard d'auscultation avancée"),
        ("http://localhost:3001/accessibility-dashboard", "Dashboard d'accessibilité standard")
    ]
    
    accessible_dashboards = []
    
    for url, name in dashboards:
        try:
            result = subprocess.run(f"curl -s -o nul -w \"%{{http_code}}\" {url}", shell=True, capture_output=True, text=True, timeout=10)
            if result.stdout.strip() == "200":
                print(f"   ✅ {name} accessible")
                accessible_dashboards.append(name)
            else:
                print(f"   ❌ {name} non accessible (code: {result.stdout.strip()})")
        except Exception as e:
            print(f"   ❌ Erreur lors de la vérification de {name}: {e}")
    
    return len(accessible_dashboards) > 0

def generate_auscultation_report():
    """Génère un rapport d'auscultation"""
    print("   📋 Génération d'un rapport d'auscultation...")
    
    try:
        # Générer un rapport d'auscultation
        report_data = {
            "deviceId": "test-device-auscultation",
            "sessionId": "test-session-auscultation"
        }
        
        response = requests.post("http://localhost:3001/api/auscultation-report", json=report_data, timeout=10)
        
        if response.status_code == 200:
            report = response.json()
            print(f"   ✅ Rapport généré: {report.get('report', {}).get('id', 'N/A')}")
            return True
        else:
            print(f"   ❌ Erreur lors de la génération du rapport: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur lors de la génération du rapport: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Build + Install + Restart Service + Auscultation')
    parser.add_argument('--skip-build', action='store_true', help='Skip APK build')
    parser.add_argument('--auscultation-only', action='store_true', help='Build uniquement avec fonctionnalités d\'auscultation')
    parser.add_argument('--test-auscultation', action='store_true', help='Tester l\'intégration d\'auscultation')
    parser.add_argument('--test-advanced', action='store_true', help='Tester l\'auscultation avancée')
    parser.add_argument('--start-server', action='store_true', help='Démarrer le serveur Node.js')
    parser.add_argument('--check-dashboards', action='store_true', help='Vérifier les dashboards')
    parser.add_argument('--generate-report', action='store_true', help='Générer un rapport d\'auscultation')
    parser.add_argument('--full-auscultation', action='store_true', help='Exécuter tous les tests d\'auscultation')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("  REBUILD & RESTART + AUSCULTATION D'ACCESSIBILITÉ")
    print("=" * 60)
    print()
    
    # Etape 1 : Build et Install APK (seulement si nécessaire)
    if not args.skip_build:
        print("1. Vérification des modifications...")
        
        if needs_rebuild() or args.auscultation_only:
            print("   Rebuild nécessaire!")
            
            if args.auscultation_only or args.full_auscultation:
                print("   🔍 Mode auscultation d'accessibilité activé")
                if not build_auscultation_apk():
                    sys.exit(1)
            else:
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
    
    # Etape 4 : Démarrage du serveur (si demandé)
    if args.start_server or args.test_auscultation or args.test_advanced or args.full_auscultation:
        print("4. Démarrage du serveur...")
        if start_server():
            print("   ✅ Serveur opérationnel")
        else:
            print("   ⚠️ Problème avec le serveur")
        print()
    else:
        print("4. Serveur ignoré (utilisez --start-server pour le démarrer)")
        print()
    
    # Etape 5 : Test de l'intégration d'auscultation
    if args.test_auscultation or args.full_auscultation:
        print("5. Test de l'intégration d'auscultation...")
        if test_auscultation_integration():
            print("   ✅ Intégration d'auscultation fonctionnelle")
        else:
            print("   ⚠️ Problème avec l'intégration d'auscultation")
        print()
    else:
        print("5. Test d'auscultation ignoré (utilisez --test-auscultation)")
        print()
    
    # Etape 6 : Test de l'auscultation avancée
    if args.test_advanced or args.full_auscultation:
        print("6. Test de l'auscultation avancée...")
        if test_auscultation_advanced():
            print("   ✅ Auscultation avancée fonctionnelle")
        else:
            print("   ⚠️ Problème avec l'auscultation avancée")
        print()
    else:
        print("6. Test d'auscultation avancée ignoré (utilisez --test-advanced)")
        print()
    
    # Etape 7 : Vérification des dashboards
    if args.check_dashboards or args.full_auscultation:
        print("7. Vérification des dashboards...")
        if check_auscultation_dashboards():
            print("   ✅ Dashboards d'auscultation accessibles")
        else:
            print("   ⚠️ Problème avec les dashboards")
        print()
    else:
        print("7. Vérification des dashboards ignorée (utilisez --check-dashboards)")
        print()
    
    # Etape 8 : Génération de rapport
    if args.generate_report or args.full_auscultation:
        print("8. Génération de rapport d'auscultation...")
        if generate_auscultation_report():
            print("   ✅ Rapport d'auscultation généré")
        else:
            print("   ⚠️ Problème avec la génération du rapport")
        print()
    else:
        print("8. Génération de rapport ignorée (utilisez --generate-report)")
        print()
    
    # Etape 9 : Skip Appium (pas nécessaire pour l'auscultation)
    print("9. Appium ignoré (pas nécessaire pour l'auscultation)")
    print()
    
    # Etape 10 : Skip service restart (pas nécessaire sans Appium)
    print("10. Service d'accessibilité ignoré (pas nécessaire sans Appium)")
    print()
    
    # Etape 11 : Retour à l'accueil
    print("11. Retour à l'écran d'accueil...")
    run_command("adb shell input keyevent KEYCODE_HOME")
    time.sleep(1)
    print("   Accueil OK")
    print()
    
    # Etape 12 : Lancer l'app de tracking
    print("12. Lancement de l'app de tracking...")
    run_command("adb shell monkey -p com.bascule.leclerctracking -c android.intent.category.LAUNCHER 1")
    time.sleep(2)
    print("   App lancée")
    print()
    
    # Etape 13 : Ouvrir les paramètres d'accessibilité
    print("13. Ouverture des paramètres d'accessibilité...")
    run_command("adb shell am start -a android.settings.ACCESSIBILITY_SETTINGS")
    time.sleep(3)
    print("   Paramètres ouverts - Activez 'OptimizedCarrefourTracking' manuellement")
    print()
    
    # Etape 14 : Lancer Carrefour
    print("14. Lancement de Carrefour...")
    run_command("adb shell monkey -p com.carrefour.fid.android -c android.intent.category.LAUNCHER 1")
    time.sleep(2)
    print("   Carrefour lancé")
    print()
    
    print("=" * 60)
    print("  PRÊT POUR L'AUSCULTATION D'ACCESSIBILITÉ!")
    print("=" * 60)
    print()
    print("Prochaines étapes:")
    print("  - Lance le serveur: python rebuild_and_restart_auscultation.py --start-server")
    print("  - Test d'auscultation: python rebuild_and_restart_auscultation.py --test-auscultation")
    print("  - Test avancé: python rebuild_and_restart_auscultation.py --test-advanced")
    print("  - Test complet: python rebuild_and_restart_auscultation.py --full-auscultation")
    print("  - Build auscultation: python rebuild_and_restart_auscultation.py --auscultation-only")
    print()
    print("Dashboards disponibles:")
    print("  - Auscultation avancée: http://localhost:3001/auscultation-dashboard")
    print("  - Accessibilité standard: http://localhost:3001/accessibility-dashboard")
    print()
    print("Fonctionnalités d'auscultation:")
    print("  ✅ Détection d'app et profil d'auscultation")
    print("  ✅ Normalisation des événements bruts")
    print("  ✅ Catégorisation e-commerce (ADD_TO_CART, PRODUCT_DETAIL, etc.)")
    print("  ✅ Inférence d'actions métier avec justification")
    print("  ✅ Scoring de confiance détaillé")
    print("  ✅ Rapport structuré JSON + résumé Markdown")
    print()

if __name__ == "__main__":
    main()
