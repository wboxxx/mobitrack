#!/usr/bin/env python3
"""
Script de capture ADB pour les logs Carrefour
Envoie les pages Markdown au serveur Node.js
"""

import subprocess
import requests
import json
import time
import threading
import re
import sys
from datetime import datetime

class CarrefourADBCapture:
    def __init__(self, server_url="http://localhost:3001"):
        self.server_url = server_url
        self.adb_process = None
        self.running = False
        self.current_page = ""
        self.page_buffer = []
        self.page_started = False
        
    def check_server(self):
        """Vérifier que le serveur Node.js est accessible"""
        try:
            response = requests.get(f"{self.server_url}/api/carrefour-pages", timeout=5)
            if response.status_code == 200:
                print("✅ Serveur Node.js accessible")
                return True
            else:
                print(f"❌ Serveur répond avec code: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"❌ Serveur inaccessible: {e}")
            return False
    
    def start_adb_capture(self):
        """Démarrer la capture ADB"""
        try:
            print("🚀 Démarrage de la capture ADB Carrefour...")
            
            # Commande adb logcat pour capturer les logs OptimizedCarrefour
            cmd = [
                "adb", "logcat", "-s", "OptimizedCarrefour"
            ]
            
            # Démarrer le processus avec encodage UTF-8 et gestion d'erreurs
            self.adb_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                errors='replace',
                bufsize=1,
                universal_newlines=True
            )
            
            print("✅ Capture ADB démarrée!")
            return True
            
        except Exception as e:
            print(f"❌ Erreur lors du démarrage ADB: {e}")
            return False
    
    def parse_log_line(self, line):
        """Parser une ligne de log pour extraire le contenu Markdown"""
        # Format des logs: MM-DD HH:MM:SS.fff  PID  PID D OptimizedCarrefour: CONTENT
        pattern = r'\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\s+\d+\s+\d+\s+D OptimizedCarrefour:\s*(.*)'
        match = re.match(pattern, line)
        
        if match:
            return match.group(1).strip()
        return None
    
    def is_page_start(self, content):
        """Détecter le début d'une page Markdown"""
        return content.startswith('============================================================') or \
               content.startswith('📄 PAGE CARREFOUR')
    
    def is_page_end(self, content):
        """Détecter la fin d'une page Markdown"""
        return content.startswith('============================================================') and \
               self.page_started and len(self.page_buffer) > 10
    
    def send_page_to_server(self, page_content):
        """Envoyer une page au serveur Node.js"""
        try:
            payload = {
                "content": page_content,
                "timestamp": datetime.now().isoformat()
            }
            
            response = requests.post(
                f"{self.server_url}/api/carrefour-page",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"📄 Page envoyée au serveur (ID: {result.get('pageId', 'N/A')})")
                return True
            else:
                print(f"❌ Erreur serveur: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Erreur lors de l'envoi: {e}")
            return False
    
    def process_page(self):
        """Traiter la page complète"""
        if len(self.page_buffer) < 5:
            return
            
        page_content = '\n'.join(self.page_buffer)
        
        # Nettoyer le contenu
        page_content = page_content.replace('============================================================', '')
        page_content = page_content.strip()
        
        if len(page_content) > 100:  # Seulement si la page a du contenu
            self.send_page_to_server(page_content)
        
        # Réinitialiser
        self.page_buffer = []
        self.page_started = False
    
    def read_logs(self):
        """Lire les logs ADB en continu"""
        print("📱 Lecture des logs en cours...")
        print("🛒 Naviguez dans l'application Carrefour pour voir les pages")
        
        try:
            for line in iter(self.adb_process.stdout.readline, ''):
                if not self.running:
                    break
                    
                content = self.parse_log_line(line)
                if not content:
                    continue
                
                # Détecter le début d'une page
                if self.is_page_start(content) and not self.page_started:
                    self.page_started = True
                    self.page_buffer = [content]
                    continue
                
                # Si on est dans une page, ajouter le contenu
                if self.page_started:
                    self.page_buffer.append(content)
                    
                    # Vérifier si c'est la fin de page
                    if self.is_page_end(content):
                        self.process_page()
                        continue
                
                # Détecter les pages courtes (sans délimiteurs)
                elif content.startswith('📄 PAGE CARREFOUR') or content.startswith('# 🛒 Page Carrefour'):
                    # Page courte détectée
                    self.page_buffer = [content]
                    self.page_started = True
                    
                    # Attendre un peu pour voir s'il y a plus de contenu
                    time.sleep(0.5)
                    
                    # Si pas assez de contenu, traiter quand même
                    if len(self.page_buffer) < 5:
                        self.process_page()
                
        except Exception as e:
            print(f"❌ Erreur lors de la lecture: {e}")
        finally:
            print("🛑 Arrêt de la lecture des logs")
    
    def start(self):
        """Démarrer la capture"""
        if not self.check_server():
            print("❌ Impossible de démarrer: serveur inaccessible")
            return False
        
        if not self.start_adb_capture():
            print("❌ Impossible de démarrer: capture ADB échouée")
            return False
        
        self.running = True
        
        # Démarrer la lecture des logs dans un thread séparé
        log_thread = threading.Thread(target=self.read_logs, daemon=True)
        log_thread.start()
        
        return True
    
    def stop(self):
        """Arrêter la capture"""
        print("\n🛑 Arrêt de la capture...")
        self.running = False
        
        if self.adb_process:
            self.adb_process.terminate()
            self.adb_process.wait()
            print("✅ Processus ADB arrêté")

def main():
    print("🚀 Carrefour ADB Capture vers serveur Node.js")
    print("📡 Serveur cible: http://localhost:3001")
    
    capture = CarrefourADBCapture()
    
    if not capture.start():
        print("❌ Échec du démarrage")
        sys.exit(1)
    
    try:
        print("⏹️ Appuyez sur Ctrl+C pour arrêter")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n👋 Arrêt demandé par l'utilisateur")
    finally:
        capture.stop()

if __name__ == "__main__":
    main()
