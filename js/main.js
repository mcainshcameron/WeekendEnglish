/**
 * WeekendEnglish.it - Enhanced JavaScript
 * Modern, dynamic features with zero cookies and zero data collection
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    initAnimations();
    initFaqAccordion();
    initScrollEffects();
    // initFloatingButton(); // Removed back to top button
    initProgressIndicator();
    initPerformanceOptimizations();
    initCopyrightYear();
    
    // Expose audit function globally
    window.showAuditResult = showAuditResult;
});

/**
 * Handle the Interactive Audit Widget
 * Zero-cookie, local logic only.
 */
function showAuditResult(type) {
    const resultPanel = document.getElementById('audit-result');
    if (!resultPanel) return;

    let content = '';
    
    switch(type) {
        case 'anxiety':
            content = `
                <div class="result-card">
                    <h3>🩺 Diagnosi: "Imposter Syndrome"</h3>
                    <p>Non è un problema di inglese, è un problema di <strong>fiducia</strong>. Sai le regole, ma la paura ti blocca.</p>
                    <div class="result-action">
                        <strong>La Soluzione Weekend English:</strong>
                        <p>Simulazioni "High-Stakes" in ambiente protetto. Ti abituiamo alla pressione finché non diventa noia.</p>
                        <a href="#contact" class="cta-button secondary-cta mt-2">Prenota la Simulazione</a>
                    </div>
                </div>
            `;
            break;
        case 'vocab':
            content = `
                <div class="result-card">
                    <h3>🩺 Diagnosi: "Passive Vocabulary Gap"</h3>
                    <p>Conosci migliaia di parole (le leggi), ma ne usi solo 200 (le parli). Il tuo "Active Vocabulary" è arrugginito.</p>
                    <div class="result-action">
                        <strong>La Soluzione Weekend English:</strong>
                        <p>Esercizi di "Active Recall" immediato. Ti forziamo a usare sinonimi professionali finché non diventano automatici.</p>
                        <a href="#contact" class="cta-button secondary-cta mt-2">Sblocca il Vocabolario</a>
                    </div>
                </div>
            `;
            break;
        case 'speed':
            content = `
                <div class="result-card">
                    <h3>🩺 Diagnosi: "The Translation Trap"</h3>
                    <p>Pensi in italiano e traduci in inglese. Questo crea quel ritardo di 2 secondi che uccide la tua naturalezza.</p>
                    <div class="result-action">
                        <strong>La Soluzione Weekend English:</strong>
                        <p>Training per "Pensare in Inglese". Eliminiamo il passaggio intermedio italiano. Parli alla velocità del pensiero.</p>
                        <a href="#contact" class="cta-button secondary-cta mt-2">Velocizza il Pensiero</a>
                    </div>
                </div>
            `;
            break;
    }

    // Inject and show
    resultPanel.innerHTML = content;
    resultPanel.classList.remove('hidden');
    resultPanel.classList.add('active');

    // Dynamic CTA Update: Update the global "Book" link to be context-aware
    updateGlobalCTA(type);
}

/**
 * Updates the main contact buttons to include the user's specific context
 * @param {string} context - The diagnosed problem (anxiety, vocab, speed)
 */
function updateGlobalCTA(context) {
    const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
    
    const subjects = {
        'anxiety': 'Richiesta%20Coaching%3A%20Superare%20l%27Ansia',
        'vocab': 'Richiesta%20Coaching%3A%20Migliorare%20il%20Vocabolario',
        'speed': 'Richiesta%20Coaching%3A%20Fluency%20Training'
    };

    const bodies = {
        'anxiety': 'Ciao%20Cameron%2C%0A%0AHo%20fatto%20il%20test%20sul%20sito%20e%20il%20mio%20problema%20principale%20%C3%A8%20l%27ansia%20da%20prestazione.%20Vorrei%20sapere%20come%20possiamo%20lavorarci.%0A%0AGrazie.',
        'vocab': 'Ciao%20Cameron%2C%0A%0AHo%20fatto%20il%20test%20e%20vorrei%20trasformare%20il%20mio%20vocabolario%20passivo%20in%20attivo.%20Parliamone.%0A%0AGrazie.',
        'speed': 'Ciao%20Cameron%2C%0A%0AIl%20mio%20blocco%20principale%20%C3%A8%20la%20traduzione%20mentale.%20Voglio%20imparare%20a%20pensare%20in%20inglese.%0A%0AAttendo%20info.'
    };

    if (subjects[context]) {
        mailtoLinks.forEach(link => {
            // Update the href with the specific subject and body
            // Preserving the base email address
            const currentHref = link.getAttribute('href');
            const baseEmail = currentHref.split('?')[0];
            link.setAttribute('href', `${baseEmail}?subject=${subjects[context]}&body=${bodies[context]}`);
            
            // Add a visual cue that the link has been personalized
            link.classList.add('personalized');
            setTimeout(() => link.classList.remove('personalized'), 500);
        });
    }
}

/**
 * Initialize scroll-triggered animations using Intersection Observer
 */
function initAnimations() {
    // Create an observer for sections
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Unobserve after animation is triggered
                sectionObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1, // Trigger when 10% of the element is visible
        rootMargin: '0px 0px -50px 0px' // Adjust based on when you want the animation to trigger
    });

    // Observe all sections
    document.querySelectorAll('section').forEach(section => {
        sectionObserver.observe(section);
    });

    // Create an observer for individual elements with animation classes
    const elementObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Unobserve after animation is triggered
                elementObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe elements with animation classes
    document.querySelectorAll('.animate-on-scroll').forEach(element => {
        elementObserver.observe(element);
    });
}

/**
 * Initialize FAQ accordion functionality
 */
function initFaqAccordion() {
    const questions = document.querySelectorAll('.question');
    
    questions.forEach(question => {
        // Add click event to each question
        question.addEventListener('click', () => {
            // Toggle active class
            question.classList.toggle('active');
            
            // Get the translation element
            const translation = question.querySelector('.translation');
            
            // Toggle visibility with animation
            if (translation) {
                if (question.classList.contains('active')) {
                    translation.style.maxHeight = translation.scrollHeight + 'px';
                    translation.style.opacity = '1';
                } else {
                    translation.style.maxHeight = '0';
                    translation.style.opacity = '0';
                }
            }
        });
    });
}

/**
 * Initialize scroll effects (parallax, etc.)
 */
function initScrollEffects() {
    // Parallax effect for hero section
    const heroImage = document.querySelector('.hero-image img');
    
    if (heroImage) {
        window.addEventListener('scroll', () => {
            const scrollPosition = window.pageYOffset;
            // Move the image slightly as user scrolls
            heroImage.style.transform = `translateY(${scrollPosition * 0.1}px)`;
        });
    }
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Adjust for fixed header
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Initialize floating action button for navigation
 * Function removed as per request to remove back to top button
 */
// function initFloatingButton() {
//     // Create floating button element
//     const floatingButton = document.createElement('button');
//     floatingButton.className = 'floating-button';
//     floatingButton.setAttribute('aria-label', 'Torna all\'inizio');
//     floatingButton.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
//     
//     // Add to the DOM
//     document.body.appendChild(floatingButton);
//     
//     // Show/hide based on scroll position
//     window.addEventListener('scroll', () => {
//         if (window.pageYOffset > 300) {
//             floatingButton.classList.add('visible');
//         } else {
//             floatingButton.classList.remove('visible');
//         }
//     });
//     
//     // Scroll to top on click
//     floatingButton.addEventListener('click', () => {
//         window.scrollTo({
//             top: 0,
//             behavior: 'smooth'
//         });
//     });
// }

/**
 * Initialize progress indicator for long-form content
 */
function initProgressIndicator() {
    // Create progress bar element
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    // Add to the DOM
    document.body.appendChild(progressBar);
    
    // Update progress bar width based on scroll position
    window.addEventListener('scroll', () => {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
        progressBar.style.width = scrollPercent + '%';
    });
}

/**
 * Initialize performance optimizations
 */
function initPerformanceOptimizations() {
    // Hide loading indicator
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.classList.add('hidden');
    }
    
    // Lazy load images that are not already using loading="lazy"
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.getAttribute('data-src');
                    
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                    }
                    
                    imageObserver.unobserve(img);
                }
            });
        });
        
        // Observe images with data-src attribute
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
}

/**
 * Set the current year in the footer
 */
function initCopyrightYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        const currentYear = new Date().getFullYear();
        yearElement.textContent = currentYear;
        yearElement.setAttribute('datetime', currentYear);
    }
}
