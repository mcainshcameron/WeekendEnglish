class SitePreferences {
    constructor() {
        this.storageKey = 'site_preferences_v1';
        this.necessaryFeatures = ['__cfruid', 'cf_clearance', '_cfuvid', 'm'];
        
        try {
            if (!this.hasValidPreferences()) {
                this.showDialog();
            } else {
                this.initializeFeatures(this.getPreferences());
            }
        } catch (e) {
            console.error('Preferences initialization error:', e);
            // Proceed with necessary features only
            this.initializeFeatures({ necessary: false });
        }
    }

    hasValidPreferences() {
        try {
            const prefs = this.getPreferences();
            return prefs && prefs.timestamp && 
                   new Date(prefs.timestamp) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        } catch {
            return false;
        }
    }

    getPreferences() {
        try {
            // Try localStorage first
            const localPrefs = localStorage.getItem(this.storageKey);
            if (localPrefs) {
                return JSON.parse(localPrefs);
            }

            // Fallback to cookies
            const cookieValue = document.cookie
                .split('; ')
                .find(row => row.startsWith(this.storageKey + '='));
            
            return cookieValue ? JSON.parse(decodeURIComponent(cookieValue.split('=')[1])) : null;
        } catch {
            return null;
        }
    }

    savePreferences(prefs) {
        try {
            // Try localStorage first
            localStorage.setItem(this.storageKey, JSON.stringify(prefs));
            
            // Also try cookies as backup
            try {
                const date = new Date();
                date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000));
                document.cookie = `${this.storageKey}=${encodeURIComponent(JSON.stringify(prefs))};expires=${date.toUTCString()};path=/;SameSite=Lax`;
            } catch (e) {
                console.warn('Cookie storage failed, using localStorage only:', e);
            }
        } catch (e) {
            console.error('Preference storage error:', e);
        }
    }

    showDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'preferences-dialog';
        dialog.innerHTML = `
            <div class="preferences-content">
                <h3>Impostazioni del sito</h3>
                <p>Utilizziamo impostazioni necessarie per il funzionamento del sito.</p>
                <div class="preferences-options">
                    <div class="preference-group">
                        <label>
                            <input type="checkbox" checked disabled>
                            Impostazioni Necessarie
                        </label>
                        <span class="preference-info">(${this.necessaryFeatures.join(', ')})</span>
                    </div>
                </div>
                <div class="preferences-actions">
                    <button id="accept-all" class="preference-button primary">Accetta</button>
                    <button id="reject-all" class="preference-button secondary">Rifiuta</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);

        document.getElementById('accept-all')?.addEventListener('click', () => this.acceptAll());
        document.getElementById('reject-all')?.addEventListener('click', () => this.rejectAll());
    }

    acceptAll() {
        const prefs = {
            necessary: true,
            timestamp: new Date().toISOString()
        };
        this.savePreferences(prefs);
        this.initializeFeatures(prefs);
        document.getElementById('preferences-dialog')?.remove();
    }

    rejectAll() {
        const prefs = {
            necessary: false,
            timestamp: new Date().toISOString()
        };
        this.savePreferences(prefs);
        this.initializeFeatures(prefs);
        document.getElementById('preferences-dialog')?.remove();
    }

    showConsentRequest() {
        return `
            <div id="calendly-consent" style="text-align: center; padding: 2rem; background: #f8fafc; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
                <h3 style="margin-bottom: 1rem;">Consenso Necessario</h3>
                <p style="margin-bottom: 1.5rem;">Per prenotare una sessione, è necessario accettare le impostazioni necessarie del sito.</p>
                <div style="margin-bottom: 1rem;">
                    <button onclick="new SitePreferences().acceptAll()" class="cta-button" style="margin-right: 1rem;">
                        Accetta Impostazioni
                    </button>
                    <a href="https://www.linkedin.com/in/cameron-mcainsh-56a4221b8/" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       style="color: #2563eb; text-decoration: underline;">
                        Contattami su LinkedIn
                    </a>
                </div>
            </div>
        `;
    }

    initializeFeatures(prefs) {
        if (!prefs) return;

        const loadResource = (url, type) => {
            return new Promise((resolve, reject) => {
                if (document.querySelector(`${type === 'script' ? 'script[src' : 'link[href'}*="${url}"]`)) {
                    resolve();
                    return;
                }

                const element = document.createElement(type === 'script' ? 'script' : 'link');
                
                if (type === 'script') {
                    element.src = url;
                    element.async = true;
                } else {
                    element.href = url;
                    element.rel = 'stylesheet';
                }

                element.onload = resolve;
                element.onerror = reject;
                
                document.head.appendChild(element);
            }).catch(e => console.warn(`Failed to load ${url}:`, e));
        };

        // Initialize Calendly container
        const calendlyContainer = document.querySelector('.calendly-inline-widget');
        if (calendlyContainer) {
            if (prefs.necessary) {
                // Clear any existing content
                calendlyContainer.innerHTML = '';
                
                // Load Calendly resources
                Promise.all([
                    loadResource('https://assets.calendly.com/assets/external/widget.css', 'css'),
                    loadResource('https://assets.calendly.com/assets/external/widget.js', 'script')
                ]).then(() => {
                    // Wait for Calendly to be available
                    const checkCalendly = setInterval(() => {
                        if (window.Calendly) {
                            clearInterval(checkCalendly);
                            // Initialize Calendly widget
                            window.Calendly.initInlineWidget({
                                url: calendlyContainer.getAttribute('data-url'),
                                parentElement: calendlyContainer,
                                prefill: {},
                                utm: {}
                            });
                        }
                    }, 100);
                    // Clear interval after 10 seconds if Calendly doesn't load
                    setTimeout(() => clearInterval(checkCalendly), 10000);
                }).catch(e => console.warn('Calendly loading error:', e));
            } else {
                calendlyContainer.innerHTML = this.showConsentRequest();
            }
        }
    }
}

// Initialize preferences when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SitePreferences());
} else {
    new SitePreferences();
}
