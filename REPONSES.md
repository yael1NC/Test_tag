
# Réponses - Partie 1

## 1. Commande httpie équivalente à curl POST
```bash
http POST http://localhost:8080/api-v1/ url="https://perdu.com"
```

## 2. Différences entre mode production et développement
- **Mode développement** : 
  - Logs détaillés (morgan 'dev')
  - Redémarrage automatique avec nodemon
  - Messages d'erreur détaillés
- **Mode production** :
  - Logs compacts (morgan 'combined')
  - Pas de redémarrage automatique
  - Messages d'erreur minimaux

## 3. Script npm pour formatter
```bash
npm run format
```

## 4. Configuration Express pour supprimer X-Powered-By
```javascript
app.disable('x-powered-by');
```

## 5. Middleware X-API-Version
```javascript
app.use((req, res, next) => {
  res.set('X-API-Version', '1.0.0');
  next();
});
```

## 6. Middleware pour favicon
```javascript
import serveStatic from 'serve-static';
app.use('/favicon.ico', serveStatic(join(__dirname, 'static/logo_univ_16.png')));
```

## 7. Documentation SQLite3
- Driver utilisé : sqlite3
- Documentation : https://github.com/TryGhost/node-sqlite3

## 8. Connexion base de données
- **Ouverture** : Au démarrage de l'application dans `initDatabase()`
- **Fermeture** : À l'arrêt du serveur (SIGTERM/SIGINT)

## 9. Gestion du cache
Express utilise ETag par défaut. En mode privé + Ctrl+Shift+R, le cache est bypassé.

## 10. Partage de base entre instances
Les deux instances partagent la même base SQLite (`database/database.sqlite`), donc les liens sont visibles des deux côtés.
