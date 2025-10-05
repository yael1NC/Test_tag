import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { promises as fs } from 'fs';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { config, logLevel } from './config.mjs';
import { initDatabase, closeDatabase } from './database/database.mjs';

import apiV1Router from './router/api-v1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Configuration de base
app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan(logLevel));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware pour ajouter X-API-version
app.use((req, res, next) => {
  res.set('X-API-Version', '1.0.0');
  next();
});

// Middleware pour favicon
import serveStatic from 'serve-static';
app.use('/favicon.ico', serveStatic(join(__dirname, 'static/logo_univ_16.png')));

// Servir les fichiers statiques
app.use(express.static(join(__dirname, 'static')));

// Documentation Swagger
try {
  const swaggerDoc = yaml.load(await fs.readFile(join(__dirname, 'static/open-api.yaml'), 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
} catch (error) {
  console.error('Erreur chargement Swagger:', error);
}

// Routes API
app.use('/api-v1', apiV1Router);

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'URL Shortener API' });
});

// Route d'erreur pour les tests
app.get('/error', (req, res) => {
  throw new Error('Test error 500');
});

// Importation des routeurs (à créer)
// app.use('/api-v1', await import('./router/api-v1.mjs'));
// app.use('/api-v2', await import('./router/api-v2.mjs'));

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});


// Démarrage du serveur
async function startServer() {
  try {
    await initDatabase();
    
    const server = app.listen(config.port, () => {
      console.log(`Serveur démarré sur http://localhost:${config.port}`);
      console.log(`Documentation: http://localhost:${config.port}/api-docs`);
      console.log(`Mode: ${config.nodeEnv}`);
    });

    // Gestion de l'arrêt propre
    process.on('SIGTERM', async () => {
      console.log('SIGTERM reçu, arrêt du serveur...');
      server.close(async () => {
        await closeDatabase();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT reçu, arrêt du serveur...');
      server.close(async () => {
        await closeDatabase();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Erreur démarrage serveur:', error);
    process.exit(1);
  }
}

startServer();