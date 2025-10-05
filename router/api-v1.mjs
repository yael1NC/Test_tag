import { Router } from 'express';
import { 
  getLinksCount, 
  createLink, 
  getLinkByShortUrl, 
  incrementVisits 
} from '../database/database.mjs';
import { config } from '../config.mjs';

const router = Router();

// Fonction pour générer un code court aléatoire
function generateShortCode(length = config.linkLen) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Fonction pour générer un secret
function generateSecret(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Fonction pour valider une URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// GET / - Obtenir le nombre de liens
router.get('/', async (req, res) => {
  try {
    const count = await getLinksCount();
    res.json({ count });
  } catch (error) {
    console.error('Erreur GET /:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST / - Créer un lien raccourci
router.post('/', async (req, res) => {
  try {
    const { url } = req.body;

    // Validation de l'URL
    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ error: 'URL invalide' });
    }

    // Générer un code court unique
    let shortUrl;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      shortUrl = generateShortCode();
      const existing = await getLinkByShortUrl(shortUrl);
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return res.status(500).json({ error: 'Impossible de générer un code unique' });
    }

    // Générer un secret pour la suppression
    const secret = generateSecret();

    // Créer le lien en base
    const result = await createLink(url, shortUrl, secret);
    
    // Récupérer le lien créé
    const createdLink = await getLinkByShortUrl(shortUrl);

    res.status(201).json({
      url: createdLink.url,
      short_url: createdLink.short_url,
      created_at: createdLink.created_at,
      secret: createdLink.secret
    });

  } catch (error) {
    console.error('Erreur POST /:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /:url - Redirection
router.get('/:url', async (req, res) => {
  try {
    const { url } = req.params;
    const link = await getLinkByShortUrl(url);

    if (!link) {
      return res.status(404).json({ error: 'Lien non trouvé' });
    }

    // Incrémenter le compteur de visites
    await incrementVisits(url);

    // Rediriger vers l'URL originale
    res.redirect(302, link.url);

  } catch (error) {
    console.error('Erreur GET /:url:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /status/:url - Informations sur le lien
router.get('/status/:url', async (req, res) => {
  try {
    const { url } = req.params;
    const link = await getLinkByShortUrl(url);

    if (!link) {
      return res.status(404).json({ error: 'Lien non trouvé' });
    }

    // Ne pas révéler le secret dans les infos
    const { secret, ...linkInfo } = link;

    res.json({
      url: linkInfo.url,
      short_url: linkInfo.short_url,
      created_at: linkInfo.created_at,
      visits: linkInfo.visits
    });

  } catch (error) {
    console.error('Erreur GET /status/:url:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export default router;

