import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import { config } from '../config.mjs';

let db = null;

// Vérifier si le secret correspond au lien
export async function verifySecret(shortUrl, secret) {
  const link = await dbGet(
    'SELECT secret FROM links WHERE short_url = ?',
    [shortUrl]
  );
  return link && link.secret === secret;
}

export async function initDatabase() {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer le dossier database s'il n'existe pas
      await fs.mkdir('database', { recursive: true });
      
      db = new sqlite3.Database(config.dbFile, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Connected to SQLite database');
        }
      });

      // Lire et exécuter le schéma
      const schema = await fs.readFile(config.dbSchema, 'utf8');
      db.exec(schema, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database schema initialized');
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function getDatabase() {
  return db;
}

export function closeDatabase() {
  return new Promise((resolve) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Fonctions utilitaires pour la base de données
export function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Fonctions spécifiques au projet
export async function getLinksCount() {
  const result = await dbGet('SELECT COUNT(*) as count FROM links');
  return result.count;
}

export async function createLink(url, shortUrl, secret) {
  return await dbRun(
    'INSERT INTO links (url, short_url, secret) VALUES (?, ?, ?)',
    [url, shortUrl, secret]
  );
}

export async function getLinkByShortUrl(shortUrl) {
  return await dbGet(
    'SELECT * FROM links WHERE short_url = ?',
    [shortUrl]
  );
}

export async function incrementVisits(shortUrl) {
  return await dbRun(
    'UPDATE links SET visits = visits + 1 WHERE short_url = ?',
    [shortUrl]
  );
}

export async function deleteLink(shortUrl) {
  return await dbRun(
    'DELETE FROM links WHERE short_url = ?',
    [shortUrl]
  );
}