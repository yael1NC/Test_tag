// Configuration de l'API
const API_BASE_URL = window.location.origin + '/api-v2';

// Éléments DOM
const form = document.getElementById('url-form');
const urlInput = document.getElementById('url');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const loading = document.getElementById('loading');
const resultDiv = document.getElementById('result');
const resultContent = document.getElementById('result-content');

// État de l'application
let isLoading = false;

/**
 * Afficher ou masquer l'état de chargement
 */
function setLoading(state) {
    isLoading = state;
    submitBtn.disabled = state;
    
    if (state) {
        btnText.textContent = 'Raccourcissement en cours...';
        loading.style.display = 'inline-block';
    } else {
        btnText.textContent = 'Raccourcir l\'URL';
        loading.style.display = 'none';
    }
}

/**
 * Afficher un résultat (succès ou erreur)
 */
function showResult(content, isError = false) {
    resultContent.innerHTML = content;
    resultDiv.className = isError ? 'error' : 'success';
    resultDiv.style.display = 'block';
    
    // Scroll smooth vers le résultat
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Masquer le résultat
 */
function hideResult() {
    resultDiv.style.display = 'none';
}

/**
 * Valider une URL
 */
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

/**
 * Copier du texte dans le presse-papier
 */
async function copyToClipboard(text) {
    try {
        // Méthode moderne avec l'API Clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        
        // Fallback pour les navigateurs plus anciens
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        return successful;
    } catch (err) {
        console.error('Erreur lors de la copie:', err);
        return false;
    }
}

/**
 * Gérer le clic sur le bouton "Copier"
 */
window.handleCopy = async function(text, buttonId) {
    const button = document.getElementById(buttonId);
    const originalHTML = button.innerHTML;
    
    try {
        const success = await copyToClipboard(text);
        
        if (success) {
            button.innerHTML = 'Copié !';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);
        } else {
            throw new Error('Échec de la copie');
        }
    } catch (error) {
        button.innerHTML = 'Échec';
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
        }, 2000);
        
        // Fallback : afficher le texte pour copie manuelle
        alert(`Copiez ce lien manuellement :\n${text}`);
    }
};

/**
 * Formater une date en français
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Gestionnaire de soumission du formulaire
 */
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Éviter les soumissions multiples
    if (isLoading) return;
    
    const url = urlInput.value.trim();
    
    // Validation locale
    if (!url) {
        showResult(`
            <div class="result-title">Champ requis</div>
            <p>Veuillez saisir une URL à raccourcir.</p>
        `, true);
        return;
    }
    
    if (!isValidUrl(url)) {
        showResult(`
            <div class="result-title">URL invalide</div>
            <p>L'URL saisie n'est pas valide. Assurez-vous qu'elle commence par <code>http://</code> ou <code>https://</code></p>
            <p><strong>Exemple :</strong> https://www.example.com</p>
        `, true);
        return;
    }
    
    // Démarrer le chargement
    setLoading(true);
    hideResult();
    
    try {
        // Appel à l'API
        const response = await fetch(`${API_BASE_URL}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Succès - construire l'URL complète
            const fullShortUrl = `${window.location.origin}/api-v2/${data.short_url}`;
            const createdDate = formatDate(data.created_at);
            
            const content = `
                <div class="result-title">Lien créé avec succès !</div>
                
                <div class="result-content">
                    <div class="short-link-container">
                        <strong>Votre lien raccourci :</strong>
                        <a href="${fullShortUrl}" target="_blank" class="short-link" id="generated-link">
                            ${fullShortUrl}
                        </a>
                        <button class="copy-button" id="copy-btn" onclick="handleCopy('${fullShortUrl}', 'copy-btn')">
                            Copier l'URL
                        </buttonC>
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <strong>URL originale</strong>
                            <div class="value">${data.url}</div>
                        </div>
                        
                        <div class="info-item">
                            <strong>Code secret</strong>
                            <div class="value">
                                <code>${data.secret}</code>
                            </div>
                        </div>
                        
                        <div class="info-item">
                            <strong>Date de création</strong>
                            <div class="value">${createdDate}</div>
                        </div>
                        
                        <div class="info-item">
                            <strong>Code court</strong>
                            <div class="value"><code>${data.short_url}</code></div>
                        </div>
                    </div>
                    
                    <div class="alert-note">
                        <strong>Astuce :</strong> Conservez le code secret pour pouvoir supprimer ce lien ultérieurement.
                    </div>
                </div>
            `;
            
            showResult(content, false);
            
            // Réinitialiser le formulaire
            urlInput.value = '';
            urlInput.focus();
            
        } else {
            // Erreur du serveur
            const errorMessage = data.error || 'Une erreur est survenue lors de la création du lien.';
            
            showResult(`
                <div class="result-title">Erreur</div>
                <p><strong>Message :</strong> ${errorMessage}</p>
                <p>Veuillez vérifier votre URL et réessayer.</p>
            `, true);
        }
        
    } catch (error) {
        console.error('Erreur réseau:', error);
        
        showResult(`
            <div class="result-title">Erreur de connexion</div>
            <p>Impossible de contacter le serveur. Vérifiez votre connexion Internet et réessayez.</p>
            <p><strong>Détails techniques :</strong> ${error.message}</p>
        `, true);
    } finally {
        setLoading(false);
    }
});

/**
 * Validation en temps réel de l'URL
 */
urlInput.addEventListener('input', function() {
    const value = this.value.trim();
    
    if (!value) {
        this.style.borderColor = '#e1e5e9';
    } else if (isValidUrl(value)) {
        this.style.borderColor = '#28a745';
    } else {
        this.style.borderColor = '#dc3545';
    }
});

/**
 * Auto-focus sur le champ URL au chargement
 */
document.addEventListener('DOMContentLoaded', () => {
    urlInput.focus();
});

/**
 * Permettre de soumettre avec Ctrl+Enter ou Cmd+Enter
 */
urlInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        form.dispatchEvent(new Event('submit'));
    }
});

// Log pour debug
console.log('Client AJAX initialisé');
console.log('API Base URL:', API_BASE_URL);