# Interview Preparation Website

A high-performance, responsive website offering English interview preparation services. Built with modern web technologies and optimized for accessibility, performance, and SEO.

## Features

- 🎯 Professional English interview preparation services
- 🚀 Performance-optimized with lazy loading and progressive enhancement
- 📱 Fully responsive design with mobile-first approach
- ♿ WCAG-compliant accessibility features
- 🔍 SEO optimization with meta tags and schema markup
- 💫 Smooth animations with reduced-motion support
- 🎨 Modern, clean UI with consistent styling
- 🌐 Bilingual content (Italian with English examples)
- 🔒 Privacy-focused design with no tracking

## Technology Stack

- HTML5 with semantic markup
- CSS3 with modern features:
  - CSS Grid and Flexbox for layouts
  - CSS Custom Properties (variables)
  - Responsive design with media queries
  - Progressive enhancement
- Vanilla JavaScript for performance optimizations
- Font Awesome icons
- Inter font family for typography

## Project Structure

```
├── index.html              # Main HTML file
├── css/
│   ├── base.css           # Base styles and variables
│   ├── components.css     # Reusable component styles
│   ├── fontawesome.css    # Icon styles
│   ├── fonts.css         # Typography styles
│   ├── layout.css        # Layout structures
│   ├── sections.css      # Section-specific styles
│   └── utilities.css     # Utility classes
├── fonts/
│   ├── fontawesome/      # Icon font files
│   └── inter/           # Inter font files
├── images/              # Optimized images
└── js/                 # JavaScript files
```

## Key Features

### Performance Optimizations
- Critical CSS inlined in head
- Lazy loading for images
- Progressive font loading
- Optimized asset delivery
- Intersection Observer for animations
- Efficient scroll handling with debouncing

### Accessibility Features
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Reduced motion support
- Screen reader optimizations
- Color contrast compliance

### SEO Implementation
- Meta tags optimization
- Schema.org markup for services
- Open Graph tags
- Twitter Card support
- Canonical URLs
- XML sitemap
- Robots.txt configuration

### Responsive Design
- Mobile-first approach
- Fluid typography using clamp()
- Responsive images with proper attributes
- Flexible grid layouts
- Touch-friendly interactions
- Responsive spacing using CSS variables

### Privacy & Compliance
- No cookies used
- No third-party scripts
- No user tracking
- No data collection
- Content Security Policy implemented
- Compliant with privacy regulations

## Browser Support

The site is optimized for modern browsers while maintaining graceful degradation:
- Feature detection for modern CSS
- Fallbacks for older browsers
- Semantic HTML base structure
- Progressive enhancement approach
- Print stylesheet support

## Development

1. Clone the repository
2. No build process required - static site
3. Open `index.html` in a browser
4. For development, use a local server (e.g., Live Server in VS Code)

## Security Features

- Content Security Policy (CSP) headers
- Strict security headers configuration
- External links with noopener
- Resource integrity checks
- Safe inline scripts policy
