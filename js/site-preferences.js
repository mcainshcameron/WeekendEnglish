class SitePreferences {
    constructor() {
        this.storageKey = 'site_preferences_v1';
        this.necessaryFeatures = ['__cfruid', 'cf_clearance', '_cfuvid'];
        this.optionalFeatures = ['m'];
        
        try {
            if (!this.hasValidPreferences()) {
                this.showDialog();
            } else {
                this.initializeFeatures(this.getPreferences());
            }
        } catch (e) {
            console.error('Preferences initialization error:', e);
            // Proceed with necessary features only
            this.initializeFeatures({ necessary: true, optional: false });
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
                <p>Utilizziamo impostazioni necessarie per il funzionamento del sito e impostazioni di performance opzionali.</p>
                <div class="preferences-options">
                    <div class="preference-group">
                        <label>
                            <input type="checkbox" checked disabled>
                            Impostazioni Necessarie
                        </label>
                        <span class="preference-info">(${this.necessaryFeatures.join(', ')})</span>
                    </div>
                    <div class="preference-group">
                        <label>
                            <input type="checkbox" id="optional-features">
                            Impostazioni di Performance
                        </label>
                        <span class="preference-info">(${this.optionalFeatures.join(', ')})</span>
                    </div>
                </div>
                <div class="preferences-actions">
                    <button id="accept-all" class="preference-button primary">Accetta Tutti</button>
                    <button id="save-choices" class="preference-button secondary">Salva Scelte</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);

        document.getElementById('accept-all')?.addEventListener('click', () => this.acceptAll());
        document.getElementById('save-choices')?.addEventListener('click', () => this.saveChoices());
    }

    acceptAll() {
        const prefs = {
            necessary: true,
            optional: true,
            timestamp: new Date().toISOString()
        };
        this.savePreferences(prefs);
        this.initializeFeatures(prefs);
        document.getElementById('preferences-dialog')?.remove();
    }

    saveChoices() {
        const prefs = {
            necessary: true,
            optional: document.getElementById('optional-features')?.checked ?? false,
            timestamp: new Date().toISOString()
        };
        this.savePreferences(prefs);
        this.initializeFeatures(prefs);
        document.getElementById('preferences-dialog')?.remove();
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

        if (prefs.optional) {
            Promise.all([
                loadResource('https://assets.calendly.com/assets/external/widget.css', 'css'),
                loadResource('https://assets.calendly.com/assets/external/widget.js', 'script')
            ]).catch(e => console.warn('Optional feature loading error:', e));
        }
    }
}

// Initialize preferences when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SitePreferences());
} else {
    new SitePreferences();
}
