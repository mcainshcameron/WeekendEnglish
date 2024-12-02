// Cookie consent management
class CookieConsentManager {
    constructor() {
        this.cookieName = 'cookieConsent';
        this.consentDuration = 365;
        this.calendlyWidgetSelector = '.calendly-inline-widget';
        this.alternativeMessageClass = 'consent-required-message';
        this.isLocalFile = window.location.protocol === 'file:';
    }

    setCookie(name, value, days) {
        if (this.isLocalFile) {
            // Use localStorage for local file testing
            localStorage.setItem(name, value);
            return;
        }
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${d.toUTCString()};SameSite=Lax;secure`;
    }

    getCookie(name) {
        if (this.isLocalFile) {
            // Use localStorage for local file testing
            const value = localStorage.getItem(name);
            if (value === 'accepted' || value === 'rejected') {
                return value;
            }
            return null;
        }

        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            const cookieValue = parts.pop().split(';').shift();
            if (cookieValue === 'accepted' || cookieValue === 'rejected') {
                return cookieValue;
            }
        }
        return null;
    }

    showCookieBanner() {
        if (this.banner && !this.getCookie(this.cookieName)) {
            requestAnimationFrame(() => {
                this.banner.classList.add('visible');
            });
        }
    }

    acceptCookies() {
        this.setCookie(this.cookieName, 'accepted', this.consentDuration);
        if (this.banner) {
            this.banner.classList.remove('visible');
        }
        this.loadThirdPartyServices();
    }

    rejectCookies() {
        this.setCookie(this.cookieName, 'rejected', this.consentDuration);
        if (this.banner) {
            this.banner.classList.remove('visible');
        }
        this.unloadThirdPartyServices();
    }

    toggleBannerText(event) {
        if (event.target.tagName.toLowerCase() === 'p') {
            event.target.classList.toggle('expanded');
        }
    }

    async loadThirdPartyServices() {
        const existingMessage = document.querySelector('.' + this.alternativeMessageClass);
        if (existingMessage) {
            existingMessage.remove();
        }

        if (this.calendlyWidget) {
            this.calendlyWidget.style.display = 'block';
            
            try {
                // Load Calendly script if not already loaded
                if (!window.Calendly && !document.querySelector('script[src*="calendly.com"]')) {
                    await this.loadScript('https://assets.calendly.com/assets/external/widget.js');
                }

                // Load Calendly stylesheet if not already loaded
                if (!document.querySelector('link[href*="calendly.com"]')) {
                    await this.loadStylesheet('https://assets.calendly.com/assets/external/widget.css');
                }

                // Force Calendly widget to reload
                const widgetUrl = this.calendlyWidget.getAttribute('data-url');
                if (widgetUrl) {
                    // Clear any existing content
                    this.calendlyWidget.innerHTML = '';
                    
                    // Wait for Calendly to be available
                    const checkCalendly = setInterval(() => {
                        if (window.Calendly) {
                            clearInterval(checkCalendly);
                            window.Calendly.initInlineWidget({
                                url: widgetUrl,
                                parentElement: this.calendlyWidget
                            });
                            // Show widget with animation
                            requestAnimationFrame(() => {
                                this.calendlyWidget.style.opacity = '1';
                            });
                        }
                    }, 100);

                    // Set a timeout to handle cases where Calendly doesn't load
                    setTimeout(() => {
                        clearInterval(checkCalendly);
                        if (!window.Calendly) {
                            this.showCalendlyError();
                        }
                    }, 10000); // 10 second timeout
                }
            } catch (error) {
                console.error('Error loading Calendly:', error);
                this.showCalendlyError();
            }
        }
    }

    showCalendlyError() {
        if (this.calendlyWidget) {
            const errorMessage = document.createElement('div');
            errorMessage.className = this.alternativeMessageClass;
            errorMessage.innerHTML = `
                <p>Si è verificato un errore nel caricamento del calendario. Per favore, riprova o contattami su LinkedIn.</p>
                <button class="accept-cookies">
                    Riprova
                </button>
                <a href="https://www.linkedin.com/in/cameron-mcainsh-56a4221b8/" 
                   class="social-icon" 
                   target="_blank" 
                   rel="noopener noreferrer">
                    <i class="fab fa-linkedin"></i> Contattami su LinkedIn
                </a>
            `;

            const retryButton = errorMessage.querySelector('.accept-cookies');
            retryButton.addEventListener('click', () => this.acceptCookies());

            this.calendlyWidget.parentNode.insertBefore(errorMessage, this.calendlyWidget.nextSibling);
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    loadStylesheet(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.href = href;
            link.rel = 'stylesheet';
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    unloadThirdPartyServices() {
        // Remove Calendly assets
        document.querySelectorAll('script[src*="calendly.com"]').forEach(script => script.remove());
        document.querySelectorAll('link[href*="calendly.com"]').forEach(link => link.remove());

        if (this.calendlyWidget) {
            this.calendlyWidget.style.display = 'none';

            if (!document.querySelector('.' + this.alternativeMessageClass)) {
                const alternativeMessage = document.createElement('div');
                alternativeMessage.className = this.alternativeMessageClass;
                
                alternativeMessage.innerHTML = `
                    <p>Per prenotare una sessione, è necessario accettare i cookie di terze parti.</p>
                    <p>In alternativa, puoi contattarmi direttamente su LinkedIn.</p>
                    <button class="accept-cookies">
                        Accetta Cookie
                    </button>
                    <a href="https://www.linkedin.com/in/cameron-mcainsh-56a4221b8/" 
                       class="social-icon" 
                       target="_blank" 
                       rel="noopener noreferrer">
                        <i class="fab fa-linkedin"></i> Contattami su LinkedIn
                    </a>
                `;

                const acceptButton = alternativeMessage.querySelector('.accept-cookies');
                acceptButton.addEventListener('click', () => this.acceptCookies());

                this.calendlyWidget.parentNode.insertBefore(alternativeMessage, this.calendlyWidget.nextSibling);
            }
        }
    }

    init() {
        // Cache DOM elements
        this.banner = document.getElementById('cookieBanner');
        this.calendlyWidget = document.querySelector(this.calendlyWidgetSelector);
        
        if (this.banner) {
            this.banner.addEventListener('click', (e) => {
                if (e.target.id === 'acceptCookies') {
                    this.acceptCookies();
                } else if (e.target.id === 'rejectCookies') {
                    this.rejectCookies();
                }
            });

            this.banner.addEventListener('click', (e) => this.toggleBannerText(e));
        }

        // Check existing consent
        const consent = this.getCookie(this.cookieName);
        if (consent === 'accepted') {
            this.loadThirdPartyServices();
        } else if (consent === 'rejected') {
            this.unloadThirdPartyServices();
        } else {
            this.showCookieBanner();
            this.unloadThirdPartyServices();
        }
    }
}

// Initialize after all resources are loaded
window.addEventListener('load', () => {
    // Small delay to ensure DOM is fully ready
    setTimeout(() => {
        window.cookieManager = new CookieConsentManager();
        window.cookieManager.init();
    }, 100);
});
