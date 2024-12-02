// Cookie consent management
class CookieConsentManager {
    constructor() {
        this.cookieName = 'cookieConsent';
        this.consentDuration = 365;
        this.calendlyWidgetSelector = '.calendly-inline-widget';
        this.alternativeMessageClass = 'consent-required-message';
    }

    setCookie(name, value, days) {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Strict`;
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
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
        // Only handle clicks on the paragraph element
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
            
            // Load Calendly assets only if not already loaded
            if (!document.querySelector('script[src*="calendly.com"]')) {
                await this.loadScript('https://assets.calendly.com/assets/external/widget.js');
            }

            if (!document.querySelector('link[href*="calendly.com"]')) {
                await this.loadStylesheet('https://assets.calendly.com/assets/external/widget.css');
            }

            // Show widget with animation
            requestAnimationFrame(() => {
                this.calendlyWidget.style.opacity = '1';
            });
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
        
        // Use event delegation for better performance
        if (this.banner) {
            this.banner.addEventListener('click', (e) => {
                if (e.target.id === 'acceptCookies') {
                    this.acceptCookies();
                } else if (e.target.id === 'rejectCookies') {
                    this.rejectCookies();
                }
            });

            // Add click handler for expanding text
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

// Initialize after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cookieManager = new CookieConsentManager();
    window.cookieManager.init();
});
