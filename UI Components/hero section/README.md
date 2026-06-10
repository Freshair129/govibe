# Premium Glassmorphic Hero Section Component

A premium, modern **Dark Mode Hero Section** featuring glassmorphic navigation, ambient floating backdrop glows, tactile call-to-actions, and an interactive mockup dashboard visualizer.

This layout is fully responsive and optimized for product landing pages, SaaS console previews, or tech portal dashboards.

---

## 📂 File Structure

```text
g:/covibe/UI Components/hero section/
├── index.html        # Interactive mockup showcase
├── style.css         # Glassmorphism styling, ambient orbs, & responsive media queries
└── README.md         # This documentation
```

---

## 🎨 Design Tokens & Properties

The visual aesthetics are mapped as follows:

| Property | Layer Spec / Color | Value | Description |
|---|---|---|---|
| **Base Background** | Deep Dark | `#09090B` | Solid backing color |
| **Glass Backdrop** | Slate Translucent | `rgba(15, 23, 42, 0.4)` | Frosted look with `blur(24px)` |
| **Primary Accent** | Vortex Orange | `#ED6C35` | Main branding highlight |
| **Secondary Accent** | Vortex Purple | `#A855F7` | Supporting gradient glow |
| **Pill Badge** | Dark Outline | `rgba(255, 255, 255, 0.03)` | Top badge with subtle hover ease |
| **Mockup Frame** | Diagonal Border | Gradient overlay | Reflects borders and light drops |

---

## 💻 Code Integration

### 1. HTML Shell Structure

```html
<!-- Ambient Glow Backdrops -->
<div class="glow-orb orb-purple"></div>
<div class="glow-orb orb-orange"></div>

<!-- Horizontal Glass Nav Header -->
<header class="navbar">
    <div class="nav-container">
        <!-- Brand -->
        <div class="nav-brand">
            <div class="brand-logo"><i class="fas fa-cube"></i></div>
            <span>VORTEX</span>
        </div>
        <!-- Links -->
        <nav class="nav-links">
            <a href="#features">Features</a>
            <a href="#components">Components</a>
            <a href="#pricing">Pricing</a>
        </nav>
        <!-- CTAs -->
        <div class="nav-actions">
            <button class="btn btn-primary">Get Started</button>
        </div>
    </div>
</header>

<!-- Hero Section Container -->
<section class="hero-section">
    <div class="hero-container">
        <!-- Badge -->
        <div class="hero-badge">
            <span class="badge-tag">NEW</span>
            <span class="badge-text">v1.0 is live</span>
        </div>
        <!-- Title -->
        <h1 class="hero-title">
            Give your big idea the <span class="text-gradient">website it deserves</span>
        </h1>
        <!-- Subtitle -->
        <p class="hero-subtitle">
            Premium landing page kit template.
        </p>
        <!-- Buttons -->
        <div class="hero-ctas">
            <button class="btn btn-primary">Get Started</button>
        </div>
        <!-- Mockup Visualizer Card -->
        <div class="mockup-frame">
            <div class="mockup-card">
                <!-- Inner Dashboard Grid goes here -->
            </div>
        </div>
    </div>
</section>
```

### 2. Core CSS Glow Animations

To create the floating ambient lighting behind the elements, define the following keyframes and classes:

```css
.glow-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    pointer-events: none;
    opacity: 0.6;
    animation: pulse-glow 8s ease-in-out infinite alternate;
}

.orb-purple {
    background: radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%);
}

.orb-orange {
    background: radial-gradient(circle, rgba(237, 108, 53, 0.35) 0%, transparent 70%);
}

@keyframes pulse-glow {
    0% {
        transform: scale(1) translate(0, 0);
        opacity: 0.5;
    }
    100% {
        transform: scale(1.15) translate(30px, -20px);
        opacity: 0.7;
    }
}
```

---

## 📳 Mobile Tactile Vibration

To enhance the visual click interaction for touch users, attach standard haptic vibrations to call-to-action clicks:

* Primary Click: `navigator.vibrate(50)`
* Secondary Click: `navigator.vibrate(30)`
