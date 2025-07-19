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
});

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

    // Add typing effect to the hero headline - modified to preserve HTML structure
    const heroHeadline = document.querySelector('.hero h1');
    if (heroHeadline) {
        const originalHTML = heroHeadline.innerHTML;
        const textContent = heroHeadline.textContent;
        heroHeadline.innerHTML = '<span></span>';
        const typingSpan = heroHeadline.querySelector('span');

        let i = 0;
        const typeWriter = () => {
            if (i < textContent.length) {
                typingSpan.textContent += textContent.charAt(i);
                i++;
                setTimeout(typeWriter, 50);
            } else {
                heroHeadline.innerHTML = originalHTML;
                heroHeadline.classList.add('typing-complete');
            }
        };
        setTimeout(typeWriter, 500);
    }
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
