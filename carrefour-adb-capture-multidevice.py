#!/usr/bin/env python3
"""
Script de capture ADB multi-device pour Carrefour
Capture les logs de tous les devices connectés et les envoie au serveur Node.js
"""

import subprocess
import json
import time
import sys
import re
from datetime import datetime
import requests
import threading
from typing import List, Dict, Optional

class CarrefourADBCapture:
    def __init__(self, server_url: str = "http://localhost:3001"):
        self.server_url = server_url
        self.running = False
        self.device_processes = {}
        self.device_threads = {}
        
    def get_connected_devices(self) -> List[str]:
        """Récupère la liste des devices connectés"""
        try:
            result = subprocess.run(['adb', 'devices'], capture_output=True, text=True, encoding='utf-8', errors='replace')
            devices = []
            for line in result.stdout.split('\n'):
                if '\tdevice' in line:
                    device_id = line.split('\t')[0]
                    devices.append(device_id)
            return devices
        except Exception as e:
            print(f"❌ Erreur lors de la récupération des devices: {e}")
            return []
    
    def get_device_info(self, device_id: str) -> Dict[str, str]:
        """Récupère les informations d'un device"""
        try:
            # Récupérer le modèle du device
            model_result = subprocess.run(
                ['adb', '-s', device_id, 'shell', 'getprop', 'ro.product.model'],
                capture_output=True, text=True, encoding='utf-8', errors='replace'
            )
            model = model_result.stdout.strip()
            
            # Récupérer la version Android
            version_result = subprocess.run(
                ['adb', '-s', device_id, 'shell', 'getprop', 'ro.build.version.release'],
                capture_output=True, text=True, encoding='utf-8', errors='replace'
            )
            version = version_result.stdout.strip()
            
            # Déterminer le type de device
            device_type = "Émulateur" if device_id.startswith('emulator') else "Téléphone"
            
            return {
                'id': device_id,
                'model': model,
                'version': version,
                'type': device_type,
                'name': f"{device_type} - {model}" if model else f"{device_type} - {device_id[:8]}..."
            }
        except Exception as e:
            print(f"❌ Erreur lors de la récupération des infos du device {device_id}: {e}")
            return {
                'id': device_id,
                'model': 'Unknown',
                'version': 'Unknown',
                'type': 'Unknown',
                'name': f"Device - {device_id[:8]}..."
            }
    
    def capture_device_logs(self, device_id: str, device_info: Dict[str, str]):
        """Capture les logs d'un device spécifique"""
        print(f"🔍 Capture des logs pour {device_info['name']} ({device_id})")
        
        try:
            # Lancer logcat pour ce device
            process = subprocess.Popen(
                ['adb', '-s', device_id, 'logcat', '-s', 'OptimizedCarrefour:*'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            
            self.device_processes[device_id] = process
            
            # Lire les logs en continu
            for line in iter(process.stdout.readline, ''):
                if not self.running:
                    break
                    
                line = line.strip()
                if not line:
                    continue
                
                # Traiter les logs Carrefour
                if 'OptimizedCarrefour' in line:
                    self.process_carrefour_log(line, device_id, device_info)
                    
        except Exception as e:
            print(f"❌ Erreur lors de la capture des logs pour {device_id}: {e}")
        finally:
            if device_id in self.device_processes:
                del self.device_processes[device_id]
    
    def process_carrefour_log(self, log_line: str, device_id: str, device_info: Dict[str, str]):
        """Traite une ligne de log Carrefour"""
        try:
            # Extraire le contenu Markdown des logs
            if '📄 PAGE CARREFOUR' in log_line:
                # Extraire le contenu Markdown
                markdown_match = re.search(r'📄 PAGE CARREFOUR\n(.*?)(?=\n📄|$)', log_line, re.DOTALL)
                if markdown_match:
                    markdown_content = markdown_match.group(1).strip()
                    if markdown_content:
                        self.send_to_server('markdown', markdown_content, device_id, device_info)
            
            # Extraire le contenu HTML des logs
            elif '🎨 PAGE VISUELLE' in log_line:
                # Extraire le contenu HTML
                html_match = re.search(r'🎨 PAGE VISUELLE\n(.*?)(?=\n🎨|$)', log_line, re.DOTALL)
                if html_match:
                    html_content = html_match.group(1).strip()
                    if html_content:
                        self.send_to_server('visual', html_content, device_id, device_info)
                        
        except Exception as e:
            print(f"❌ Erreur lors du traitement du log pour {device_id}: {e}")
    
    def send_to_server(self, content_type: str, content: str, device_id: str, device_info: Dict[str, str]):
        """Envoie le contenu au serveur Node.js"""
        try:
            timestamp = datetime.now().isoformat()
            
            if content_type == 'markdown':
                endpoint = f"{self.server_url}/api/carrefour-page"
                data = {
                    'content': content,
                    'timestamp': timestamp,
                    'deviceId': device_id,
                    'deviceInfo': device_info
                }
            elif content_type == 'visual':
                endpoint = f"{self.server_url}/api/carrefour-visual"
                data = {
                    'html': content,
                    'timestamp': timestamp,
                    'deviceId': device_id,
                    'deviceInfo': device_info
                }
            else:
                return
            
            response = requests.post(endpoint, json=data, timeout=5)
            if response.status_code == 200:
                print(f"✅ {content_type.upper()} envoyé depuis {device_info['name']}")
            else:
                print(f"❌ Erreur envoi {content_type}: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Erreur lors de l'envoi au serveur: {e}")
    
    def start_capture(self):
        """Démarre la capture sur tous les devices"""
        print("🚀 Démarrage de la capture ADB multi-device...")
        
        devices = self.get_connected_devices()
        if not devices:
            print("❌ Aucun device connecté")
            return
        
        print(f"📱 Devices détectés: {len(devices)}")
        for device in devices:
            device_info = self.get_device_info(device)
            print(f"   - {device_info['name']} ({device})")
        
        self.running = True
        
        # Créer un thread pour chaque device
        for device in devices:
            device_info = self.get_device_info(device)
            thread = threading.Thread(
                target=self.capture_device_logs,
                args=(device, device_info),
                daemon=True
            )
            thread.start()
            self.device_threads[device] = thread
        
        print("✅ Capture démarrée sur tous les devices")
        print("📊 Dashboard: http://localhost:3001/carrefour-dashboard")
        print("⏹️  Appuyez sur Ctrl+C pour arrêter")
        
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Arrêt de la capture...")
            self.stop_capture()
    
    def stop_capture(self):
        """Arrête la capture"""
        self.running = False
        
        # Arrêter tous les processus
        for device, process in self.device_processes.items():
            try:
                process.terminate()
                process.wait(timeout=5)
            except:
                process.kill()
        
        print("✅ Capture arrêtée")

def main():
    print("🛒 Capture ADB Multi-Device Carrefour")
    print("=" * 50)
    
    # Vérifier que ADB est disponible
    try:
        subprocess.run(['adb', 'version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ ADB n'est pas installé ou n'est pas dans le PATH")
        sys.exit(1)
    
    # Vérifier qu'au moins un device est connecté
    capture = CarrefourADBCapture()
    devices = capture.get_connected_devices()
    
    if not devices:
        print("❌ Aucun device connecté")
        print("💡 Connectez un émulateur ou un téléphone et relancez")
        sys.exit(1)
    
    # Démarrer la capture
    capture.start_capture()

if __name__ == "__main__":
    main()
