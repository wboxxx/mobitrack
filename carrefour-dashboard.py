#!/usr/bin/env python3
"""
Dashboard Carrefour - Visualisation temps réel des pages Carrefour en Markdown
Capture les logs du service OptimizedCarrefourTrackingService et les affiche dans un dashboard web
"""

import asyncio
import websockets
import json
import subprocess
import threading
import time
import os
from datetime import datetime
import re
from aiohttp import web, WSMsgType
import aiohttp_cors

class CarrefourDashboard:
    def __init__(self):
        self.clients = set()
        self.current_page_data = {}
        self.log_file = None
        
    async def register_client(self, websocket):
        """Enregistre un nouveau client WebSocket"""
        self.clients.add(websocket)
        print(f"📱 Client connecté: {websocket.remote_address}")
        
        # Envoyer les données actuelles au nouveau client
        if self.current_page_data:
            await websocket.send(json.dumps({
                "type": "page_update",
                "data": self.current_page_data
            }))
    
    async def unregister_client(self, websocket):
        """Déconnecte un client WebSocket"""
        self.clients.discard(websocket)
        print(f"📱 Client déconnecté: {websocket.remote_address}")
    
    async def broadcast_page_update(self, page_data):
        """Diffuse les données de page à tous les clients connectés"""
        if not self.clients:
            return
            
        message = json.dumps({
            "type": "page_update",
            "data": page_data,
            "timestamp": datetime.now().isoformat()
        })
        
        # Diffuser à tous les clients connectés
        disconnected = set()
        for client in self.clients:
            try:
                await client.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(client)
        
        # Nettoyer les clients déconnectés
        for client in disconnected:
            self.clients.discard(client)
    
    def parse_carrefour_logs(self, log_line):
        """Parse les logs Carrefour pour extraire les données de page"""
        if "📄 PAGE CARREFOUR" not in log_line:
            return None
            
        # Extraire le timestamp
        timestamp_match = re.search(r'📄 PAGE CARREFOUR - (\d{2}:\d{2}:\d{2})', log_line)
        timestamp = timestamp_match.group(1) if timestamp_match else datetime.now().strftime("%H:%M:%S")
        
        return {
            "timestamp": timestamp,
            "raw_log": log_line,
            "parsed_at": datetime.now().isoformat()
        }
    
    def start_log_monitoring(self):
        """Démarre le monitoring des logs Carrefour en arrière-plan"""
        def monitor_logs():
            print("🔍 Démarrage du monitoring des logs Carrefour...")
            
            # Lancer adb logcat pour capturer les logs OptimizedCarrefour
            process = subprocess.Popen(
                ['adb', 'logcat', '-s', 'OptimizedCarrefour'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                bufsize=1,
                universal_newlines=True
            )
            
            current_page_lines = []
            in_page_section = False
            
            try:
                for line in process.stdout:
                    line = line.strip()
                    
                    # Détecter le début d'une nouvelle page
                    if "📄 PAGE CARREFOUR" in line:
                        in_page_section = True
                        current_page_lines = [line]
                        continue
                    
                    # Détecter la fin d'une section de page
                    if in_page_section and line.startswith("=" * 60):
                        if len(current_page_lines) > 1:  # On a du contenu
                            # Traiter la page complète
                            page_content = "\n".join(current_page_lines)
                            page_data = self.parse_carrefour_logs(page_content)
                            
                            if page_data:
                                page_data["content"] = page_content
                                page_data["markdown"] = self.convert_to_markdown(page_content)
                                self.current_page_data = page_data
                                
                                # Notifier les clients WebSocket
                                asyncio.run_coroutine_threadsafe(
                                    self.broadcast_page_update(page_data),
                                    asyncio.get_event_loop()
                                )
                        
                        in_page_section = False
                        current_page_lines = []
                        continue
                    
                    # Accumuler les lignes de la page courante
                    if in_page_section:
                        current_page_lines.append(line)
                        
            except Exception as e:
                print(f"❌ Erreur dans le monitoring des logs: {e}")
            finally:
                process.terminate()
        
        # Lancer le monitoring dans un thread séparé
        thread = threading.Thread(target=monitor_logs, daemon=True)
        thread.start()
    
    def convert_to_markdown(self, log_content):
        """Convertit le contenu des logs en Markdown formaté"""
        lines = log_content.split('\n')
        markdown_lines = []
        
        for line in lines:
            if line.startswith("# "):
                markdown_lines.append(f"# {line[2:].strip()}")
            elif line.startswith("## "):
                markdown_lines.append(f"## {line[3:].strip()}")
            elif line.startswith("### "):
                markdown_lines.append(f"### {line[4:].strip()}")
            elif line.startswith("- **"):
                # Formater les éléments de liste avec style
                clean_line = line.replace("- **", "- **").replace("**:", ":**")
                markdown_lines.append(clean_line)
            elif line.strip() == "":
                markdown_lines.append("")
            elif not line.startswith("=") and not line.startswith("```"):
                # Lignes de contenu normales
                markdown_lines.append(line.strip())
        
        return "\n".join(markdown_lines)
    
    async def handle_client(self, websocket, path):
        """Gère les connexions clients WebSocket"""
        await self.register_client(websocket)
        
        try:
            async for message in websocket:
                # Traiter les messages du client si nécessaire
                data = json.loads(message)
                print(f"📨 Message reçu: {data}")
                
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister_client(websocket)

def create_dashboard_html():
    """Crée le fichier HTML du dashboard"""
    html_content = """<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🛒 Dashboard Carrefour - Visualisation Temps Réel</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 1.8em;
            margin-bottom: 10px;
        }
        
        .status-bar {
            background: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .controls {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .toggle-container {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9em;
        }
        
        .toggle-switch {
            position: relative;
            width: 50px;
            height: 24px;
            background: #ccc;
            border-radius: 12px;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        .toggle-switch.active {
            background: #28a745;
        }
        
        .toggle-slider {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            transition: transform 0.3s;
        }
        
        .toggle-switch.active .toggle-slider {
            transform: translateX(26px);
        }
        
        .refresh-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.9em;
            transition: background 0.3s;
        }
        
        .refresh-btn:hover {
            background: #0056b3;
        }
        
        .refresh-btn:disabled {
            background: #6c757d;
            cursor: not-allowed;
        }
        
        .status-indicator {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #28a745;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .content {
            padding: 30px;
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .page-info {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
        }
        
        .markdown-content {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 10px;
            padding: 20px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.85em;
            line-height: 1.4;
            white-space: pre-wrap;
            overflow-x: auto;
        }
        
        .markdown-content h1 {
            color: #FF6B35;
            border-bottom: 2px solid #FF6B35;
            padding-bottom: 8px;
            margin-bottom: 15px;
            font-size: 1.2em;
        }
        
        .markdown-content h2 {
            color: #2c3e50;
            margin-top: 20px;
            margin-bottom: 12px;
            font-size: 1.1em;
        }
        
        .markdown-content h3 {
            color: #34495e;
            margin-top: 15px;
            margin-bottom: 8px;
            font-size: 1em;
        }
        
        .markdown-content strong {
            color: #e74c3c;
        }
        
        .markdown-content ul {
            margin: 8px 0;
            padding-left: 18px;
        }
        
        .markdown-content li {
            margin: 3px 0;
        }
        
        .no-data {
            text-align: center;
            color: #6c757d;
            font-style: italic;
            padding: 50px;
        }
        
        .timestamp {
            color: #6c757d;
            font-size: 0.9em;
        }
        
        .loading {
            text-align: center;
            padding: 50px;
            color: #6c757d;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #FF6B35;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛒 Dashboard Carrefour</h1>
            <p>Visualisation temps réel des pages Carrefour</p>
        </div>
        
        <div class="status-bar">
            <div class="status-indicator">
                <div class="status-dot"></div>
                <span id="status-text">Connexion en cours...</span>
            </div>
            <div class="controls">
                <div class="toggle-container">
                    <span>Auto-refresh:</span>
                    <div class="toggle-switch active" id="auto-refresh-toggle">
                        <div class="toggle-slider"></div>
                    </div>
                </div>
                <button class="refresh-btn" id="manual-refresh-btn">🔄 Rafraîchir</button>
                <div class="timestamp" id="last-update">
                    Dernière mise à jour: -
                </div>
            </div>
        </div>
        
        <div class="content" id="content">
            <div class="loading">
                <div class="spinner"></div>
                <p>Attente des données Carrefour...</p>
            </div>
        </div>
    </div>

    <script>
        class CarrefourDashboard {
            constructor() {
                this.ws = null;
                this.reconnectAttempts = 0;
                this.maxReconnectAttempts = 5;
                this.autoRefresh = true;
                this.lastPageData = null;
                this.connect();
                this.setupControls();
            }
            
            connect() {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${protocol}//${window.location.host}/ws`;
                
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = () => {
                    console.log('🔗 Connexion WebSocket établie');
                    this.updateStatus('Connecté', true);
                    this.reconnectAttempts = 0;
                };
                
                this.ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                };
                
                this.ws.onclose = () => {
                    console.log('❌ Connexion WebSocket fermée');
                    this.updateStatus('Déconnecté', false);
                    this.reconnect();
                };
                
                this.ws.onerror = (error) => {
                    console.error('❌ Erreur WebSocket:', error);
                    this.updateStatus('Erreur de connexion', false);
                };
            }
            
            reconnect() {
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                    
                    setTimeout(() => {
                        this.connect();
                    }, 2000 * this.reconnectAttempts);
                } else {
                    this.updateStatus('Connexion échouée', false);
                }
            }
            
            updateStatus(text, connected) {
                document.getElementById('status-text').textContent = text;
                const dot = document.querySelector('.status-dot');
                dot.style.background = connected ? '#28a745' : '#dc3545';
            }
            
            setupControls() {
                // Toggle auto-refresh
                const toggle = document.getElementById('auto-refresh-toggle');
                toggle.addEventListener('click', () => {
                    this.autoRefresh = !this.autoRefresh;
                    toggle.classList.toggle('active', this.autoRefresh);
                    console.log('Auto-refresh:', this.autoRefresh ? 'ON' : 'OFF');
                });
                
                // Manual refresh button
                const refreshBtn = document.getElementById('manual-refresh-btn');
                refreshBtn.addEventListener('click', () => {
                    if (this.lastPageData) {
                        this.updatePage(this.lastPageData);
                        console.log('Rafraîchissement manuel effectué');
                    } else {
                        console.log('Aucune donnée à rafraîchir');
                    }
                });
            }
            
            handleMessage(data) {
                if (data.type === 'page_update') {
                    this.lastPageData = data.data;
                    if (this.autoRefresh) {
                        this.updatePage(data.data);
                    }
                }
            }
            
            updatePage(pageData) {
                const content = document.getElementById('content');
                const lastUpdate = document.getElementById('last-update');
                
                lastUpdate.textContent = `Dernière mise à jour: ${new Date().toLocaleTimeString()}`;
                
                if (!pageData || !pageData.markdown) {
                    content.innerHTML = `
                        <div class="no-data">
                            <h3>📱 Aucune donnée disponible</h3>
                            <p>Naviguez dans l'application Carrefour pour voir les données ici.</p>
                        </div>
                    `;
                    return;
                }
                
                const pageInfo = `
                    <div class="page-info">
                        <h3>📄 Page Carrefour détectée</h3>
                        <p><strong>Timestamp:</strong> ${pageData.timestamp}</p>
                        <p><strong>Parsé à:</strong> ${new Date(pageData.parsed_at).toLocaleString()}</p>
                    </div>
                `;
                
                const markdownContent = `
                    <div class="markdown-content">
                        ${this.formatMarkdown(pageData.markdown)}
                    </div>
                `;
                
                content.innerHTML = pageInfo + markdownContent;
            }
            
            formatMarkdown(markdown) {
                // Conversion basique Markdown vers HTML
                return markdown
                    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                    .replace(/^\- \*\*(.*?)\*\*: (.*$)/gim, '<li><strong>$1:</strong> $2</li>')
                    .replace(/^\- (.*$)/gim, '<li>$1</li>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/\n/g, '<br>');
            }
        }
        
        // Démarrer le dashboard
        new CarrefourDashboard();
    </script>
</body>
</html>"""
    
    with open('dashboard.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    print("📄 Dashboard HTML créé: dashboard.html")

async def main():
    """Fonction principale"""
    print("🚀 Démarrage du Dashboard Carrefour...")
    
    # Créer le fichier HTML du dashboard
    create_dashboard_html()
    
    # Créer l'instance du dashboard
    dashboard = CarrefourDashboard()
    
    # Démarrer le monitoring des logs
    dashboard.start_log_monitoring()
    
    # Démarrer le serveur WebSocket
    print("🌐 Démarrage du serveur WebSocket sur localhost:8765...")
    print("📱 Ouvrez http://localhost:8765 dans votre navigateur")
    
    server = await websockets.serve(
        dashboard.handle_client,
        "localhost",
        8765,
        ping_interval=20,
        ping_timeout=10
    )
    
    print("✅ Dashboard Carrefour démarré!")
    print("🛒 Naviguez dans l'application Carrefour pour voir les données en temps réel")
    
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
