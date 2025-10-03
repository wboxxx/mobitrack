#!/usr/bin/env python3
"""
Script de monitoring complet : APK logs + Server logs
"""
import subprocess
import sys
import time
import threading
import datetime
import argparse

def run_command_async(cmd, log_file, prefix):
    """Exécute une commande en arrière-plan et log les résultats"""
    try:
        process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, 
                                 stderr=subprocess.STDOUT, text=True, encoding='utf-8')
        
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"\n=== {prefix} STARTED ===\n")
            
            for line in iter(process.stdout.readline, ''):
                if line:
                    timestamp = datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]
                    log_line = f"[{timestamp}] [{prefix}] {line.strip()}\n"
                    f.write(log_line)
                    f.flush()
                    print(f"[{timestamp}] [{prefix}] {line.strip()}")
                    
    except Exception as e:
        print(f"Erreur dans {prefix}: {e}")

def main():
    parser = argparse.ArgumentParser(description='Monitoring complet du système')
    parser.add_argument('--duration', type=int, default=300, help='Durée en secondes (défaut: 300)')
    args = parser.parse_args()
    
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    log_file = f"monitoring-logs-{timestamp}.txt"
    
    print("=" * 40)
    print("  MONITORING TRACKING SYSTEM")
    print("=" * 40)
    print()
    print(f"Log file: {log_file}")
    print(f"Duration: {args.duration} seconds")
    print()
    
    # Créer le fichier de log avec header
    with open(log_file, 'w', encoding='utf-8') as f:
        f.write("=" * 40 + "\n")
        f.write("TRACKING SYSTEM MONITORING LOG\n")
        f.write(f"Started: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Duration: {args.duration} seconds\n")
        f.write("=" * 40 + "\n\n")
    
    print("Démarrage du serveur Node.js...")
    server_thread = threading.Thread(
        target=run_command_async, 
        args=("node server.js", log_file, "SERVER")
    )
    server_thread.daemon = True
    server_thread.start()
    
    time.sleep(3)
    print("Serveur Node.js démarré")
    
    print("Démarrage de la capture des logs APK...")
    apk_thread = threading.Thread(
        target=run_command_async,
        args=("adb logcat -s CrossAppTracking:D *:S", log_file, "APK")
    )
    apk_thread.daemon = True
    apk_thread.start()
    
    time.sleep(1)
    print("Capture APK démarrée")
    
    print("Monitoring actif - Appuyez sur Ctrl+C pour arrêter")
    print()
    
    try:
        # Attendre la durée spécifiée
        time.sleep(args.duration)
    except KeyboardInterrupt:
        print("\nArrêt demandé par l'utilisateur")
    
    print("Arrêt du monitoring...")
    
    # Note: Les threads daemon s'arrêteront automatiquement
    print("Monitoring terminé")
    print()
    print("=" * 40)
    print("  MONITORING COMPLETED")
    print("=" * 40)
    print()
    print(f"Log file saved: {log_file}")
    
    try:
        file_size = os.path.getsize(log_file)
        print(f"File size: {file_size} bytes")
    except:
        pass
    print()

if __name__ == "__main__":
    main()
