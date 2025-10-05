import { Router } from 'express';
import { 
  getLinksCount, 
  createLink, 
  getLinkByShortUrl, 
  incrementVisits 
} from '../database/database.mjs';
import { config } from '../config.mjs';

const router = Router();

// Fonctions utilitaires (reprises de api-v1)
function generateShortCode(length = config.linkLen) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateSecret(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// GET / - Négociation de contenu (JSON ou HTML)
router.get('/', async (req, res) => {
  try {
    const count = await getLinksCount();

    res.format({
      // Réponse JSON
      'application/json': () => {
        res.json({ count });
      },
      
      // Réponse HTML
      'text/html': () => {
        const content = `
          <div class="stats">
            <span class="stats-number">${count}</span>
            <div class="stats-label">liens créés jusqu'à présent</div>
          </div>
          
          <form method="post" action="/api-v2/" id="submit-link">
            <div class="form-group">
              <label for="url">Saisissez l'URL à raccourcir :</label>
              <input name="url" id="url" type="url" placeholder="https://perdu.com" required />
            </div>
            <button type="submit">Raccourcir l'URL</button>
          </form>
        `;
        
        res.render('root', {
          title: 'Réducteur d\'URL - Accueil',
          content
        });
      },
      
      // Format non supporté
      'default': () => {
        res.status(406).json({ error: 'Format non accepté' });
      }
    });
  } catch (error) {
    console.error('Erreur GET /:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST / - Création avec négociation de contenu
router.post('/', async (req, res) => {
  try {
    const { url } = req.body;

    // Validation de l'URL
    if (!url || !isValidUrl(url)) {
      return res.format({
        'application/json': () => {
          res.status(400).json({ error: 'URL invalide' });
        },
        'text/html': () => {
          const content = `
            <div class="result error">
              <h3>Erreur de validation</h3>
              <p><strong>Erreur :</strong> L'URL fournie n'est pas valide.</p>
              <p>Veuillez vérifier que votre URL commence par <code>http://</code> ou <code>https://</code></p>
            </div>
            <a href="/api-v2/" class="back-link">← Retour à l'accueil</a>
          `;
          res.status(400).render('root', {
            title: 'Erreur - URL invalide',
            content
          });
        },
        'default': () => {
          res.status(406).json({ error: 'Format non accepté' });
        }
      });
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
      return res.format({
        'application/json': () => {
          res.status(500).json({ error: 'Impossible de générer un code unique' });
        },
        'text/html': () => {
          const content = `
            <div class="result error">
              <h3>Erreur technique</h3>
              <p><strong>Erreur :</strong> Impossible de générer un code unique après ${maxAttempts} tentatives.</p>
              <p>Veuillez réessayer dans un moment.</p>
            </div>
            <a href="/api-v2/" class="back-link">← Réessayer</a>
          `;
          res.status(500).render('root', {
            title: 'Erreur - Service temporairement indisponible',
            content
          });
        },
        'default': () => {
          res.status(406).json({ error: 'Format non accepté' });
        }
      });
    }

    // Générer un secret
    const secret = generateSecret();

    // Créer le lien
    await createLink(url, shortUrl, secret);
    const createdLink = await getLinkByShortUrl(shortUrl);

    const fullShortUrl = `${req.protocol}://${req.get('host')}/api-v2/${shortUrl}`;

    res.format({
      'application/json': () => {
        res.status(201).json({
          url: createdLink.url,
          short_url: createdLink.short_url,
          created_at: createdLink.created_at,
          secret: createdLink.secret
        });
      },
      
      'text/html': () => {
        const content = `
          <div class="result success">
            <h3>Lien créé avec succès !</h3>
            
            <div class="info-grid">
              <div class="info-item">
                <strong>URL originale :</strong>
                <a href="${createdLink.url}" target="_blank">${createdLink.url}</a>
              </div>
              
              <div class="info-item">
                <strong>Lien raccourci :</strong>
                <a href="${fullShortUrl}" target="_blank" class="short-link">${fullShortUrl}</a>
                <button class="copy-button" onclick="copyLink('${fullShortUrl}')">
                  Copier le lien
                </button>
              </div>
              
              <div class="info-item">
                <strong>Code secret :</strong>
                <code>${createdLink.secret}</code>
                <small style="display: block; margin-top: 5px; color: #666;">
                  (conservez ce code pour pouvoir supprimer le lien plus tard)
                </small>
              </div>
              
              <div class="info-item">
                <strong>Créé le :</strong>
                ${new Date(createdLink.created_at).toLocaleString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
          
          <a href="/api-v2/" class="back-link">← Créer un autre lien</a>
        `;
        
        res.status(201).render('root', {
          title: 'Lien créé - Réducteur d\'URL',
          content
        });
      },
      
      'default': () => {
        res.status(406).json({ error: 'Format non accepté' });
      }
    });

  } catch (error) {
    console.error('Erreur POST /:', error);
    
    res.format({
      'application/json': () => {
        res.status(500).json({ error: 'Erreur interne du serveur' });
      },
      'text/html': () => {
        const content = `
          <div class="result error">
            <h3>Erreur interne</h3>
            <p>Une erreur inattendue s'est produite. Veuillez réessayer.</p>
          </div>
          <a href="/api-v2/" class="back-link">← Retour à l'accueil</a>
        `;
        res.status(500).render('root', {
          title: 'Erreur serveur',
          content
        });
      },
      'default': () => {
        res.status(406).json({ error: 'Format non accepté' });
      }
    });
  }
});

// GET /:url - Redirection (HTML) ou infos (JSON)
router.get('/:url', async (req, res) => {
  try {
    const { url } = req.params;
    const link = await getLinkByShortUrl(url);

    if (!link) {
      return res.format({
        'application/json': () => {
          res.status(404).json({ error: 'Lien non trouvé' });
        },
        'text/html': () => {
          const content = `
            <div class="result error">
              <h3>Lien non trouvé</h3>
              <p><strong>Erreur 404 :</strong> Le lien raccourci <code>${url}</code> n'existe pas ou a été supprimé.</p>
              <p>Vérifiez que vous avez saisi la bonne URL.</p>
            </div>
            <a href="/api-v2/" class="back-link">← Retour à l'accueil</a>
          `;
          res.status(404).render('root', {
            title: 'Lien non trouvé',
            content
          });
        },
        'default': () => {
          res.status(406).json({ error: 'Format non accepté' });
        }
      });
    }

    res.format({
      // Pour JSON, on renvoie les infos (sans le secret)
      'application/json': () => {
        const { secret, ...linkInfo } = link;
        res.json({
          url: linkInfo.url,
          short_url: linkInfo.short_url,
          created_at: linkInfo.created_at,
          visits: linkInfo.visits
        });
      },
      
      // Pour HTML, on incrémente et on redirige
      'text/html': () => {
        // Incrémenter le compteur de visites
        incrementVisits(url).catch(err => {
          console.error('Erreur lors de l\'incrémentation des visites:', err);
        });
        
        // Redirection vers l'URL originale
        res.redirect(302, link.url);
      },
      
      'default': () => {
        res.status(406).json({ error: 'Format non accepté' });
      }
    });

  } catch (error) {
    console.error('Erreur GET /:url:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export default router;