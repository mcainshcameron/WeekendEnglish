class CookieConsent {
    constructor() {
        this.cookieConsent = this.getCookie('cookie_consent');
        this.necessaryCookies = ['__cfruid', 'cf_clearance', '_cfuvid'];
        this.performanceCookies = ['m'];
        
        if (!this.hasValidConsent()) {
            this.showBanner();
        } else {
            this.loadServices(JSON.parse(this.cookieConsent));
        }
    }

    hasValidConsent() {
        try {
            const consent = this.cookieConsent ? JSON.parse(this.cookieConsent) : null;
            return consent && consent.timestamp && new Date(consent.timestamp) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        } catch (e) {
            console.error('Error checking consent:', e);
            return false;
        }
    }

    getCookie(name) {
        try {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) {
                const cookieValue = parts.pop().split(';').shift();
                return decodeURIComponent(cookieValue);
            }
            return null;
        } catch (e) {
            console.error('Error reading cookie:', e);
            return null;
        }
    }

    setCookie(name, value, days) {
        try {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            const encodedValue = encodeURIComponent(value);
            document.cookie = `${name}=${encodedValue};expires=${date.toUTCString()};path=/;SameSite=Lax`;
        } catch (e) {
            console.error('Error setting cookie:', e);
        }
    }

    showBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.innerHTML = `
            <div class="cookie-content">
                <h3>Cookie</h3>
                <p>Utilizziamo i cookie necessari per il funzionamento del sito e cookie di performance opzionali.</p>
                <div class="cookie-settings">
                    <div class="cookie-group">
                        <label>
                            <input type="checkbox" checked disabled>
                            Cookie Necessari
                        </label>
                        <span class="cookie-info">(${this.necessaryCookies.join(', ')})</span>
                    </div>
                    <div class="cookie-group">
                        <label>
                            <input type="checkbox" id="performance-cookies">
                            Cookie di Performance
                        </label>
                        <span class="cookie-info">(${this.performanceCookies.join(', ')})</span>
                    </div>
                </div>
                <div class="cookie-actions">
                    <button id="accept-all" class="cookie-button primary">Accetta Tutti</button>
                    <button id="save-preferences" class="cookie-button secondary">Salva Preferenze</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('accept-all').addEventListener('click', () => this.acceptAll());
        document.getElementById('save-preferences').addEventListener('click', () => this.savePreferences());
    }

    acceptAll() {
        const consent = {
            necessary: true,
            performance: true,
            timestamp: new Date().toISOString()
        };
        this.setCookie('cookie_consent', JSON.stringify(consent), 365);
        this.loadServices(consent);
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.remove();
        }
    }

    savePreferences() {
        const consent = {
            necessary: true,
            performance: document.getElementById('performance-cookies')?.checked ?? false,
            timestamp: new Date().toISOString()
        };
        this.setCookie('cookie_consent', JSON.stringify(consent), 365);
        this.loadServices(consent);
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.remove();
        }
    }

    loadServices(consent) {
        if (!consent) return;

        const loadResource = (url, type) => {
            return new Promise((resolve, reject) => {
                const element = document.createElement(type === 'script' ? 'script' : 'link');
                
                if (type === 'script') {
                    element.src = url;
                    element.async = true;
                } else {
                    element.href = url;
                    element.rel = 'stylesheet';
                }

                element.onload = () => resolve();
                element.onerror = () => reject();
                
                document.head.appendChild(element);
            });
        };

        // Load Calendly
        if (!document.querySelector('link[href*="calendly"]')) {
            loadResource('https://assets.calendly.com/assets/external/widget.css', 'css')
                .catch(e => console.error('Error loading Calendly CSS:', e));
        }

        if (!document.querySelector('script[src*="calendly"]')) {
            loadResource('https://assets.calendly.com/assets/external/widget.js', 'script')
                .catch(e => console.error('Error loading Calendly JS:', e));
        }
    }
}

// Initialize cookie consent when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new CookieConsent());
} else {
    new CookieConsent();
}
