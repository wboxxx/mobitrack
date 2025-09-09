# 📊 Tracking Data Exports

Ce dossier contient les exports JSON des données de tracking pour analyse et amélioration du filtrage.

## 📁 Structure des fichiers

Les fichiers exportés suivent le format : `tracking-export-YYYY-MM-DDTHH-MM-SS.json`

## 📋 Contenu des exports

Chaque fichier JSON contient :
- `events` : Tous les événements de tracking capturés
- `sessions` : Sessions utilisateur actives
- `stats` : Statistiques agrégées (total événements, clics, conversions)
- `exportedAt` : Timestamp de l'export
- `exportedBy` : Source de l'export (dashboard)

## 🔍 Utilisation pour l'analyse

Ces fichiers sont utilisés pour :
1. **Analyser les patterns de spam** - Identifier les événements parasites
2. **Optimiser le filtrage** - Ajuster les règles de filtrage côté serveur
3. **Détecter les vrais produits** - Améliorer l'extraction d'informations produit
4. **Mesurer l'efficacité** - Comparer avant/après les améliorations

## 🤖 Analyse automatique

Quand tu partages ces fichiers dans notre conversation, je peux automatiquement :
- Identifier les événements qui devraient être filtrés
- Proposer des améliorations de la blacklist
- Optimiser les scores de qualité
- Suggérer de nouveaux patterns de filtrage

## 📝 Notes

- Les fichiers sont automatiquement horodatés
- Chaque export est indépendant et complet
- Les données sont formatées pour faciliter l'analyse
