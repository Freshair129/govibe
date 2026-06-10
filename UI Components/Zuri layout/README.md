# Premium Zuri Layout & Landing Showcase Component

A premium, modern **Warm Minimalist & Sovereign Glassmorphic** UI component bundle featuring a full-width marketing landing page and an interactive administrative dashboard layout with collapsible side navigation.

This component bundle is fully responsive, optimized for SaaS platform previews, internal SME dashboards, and high-conversion landing pages.

---

## 📂 File Structure

```text
g:/covibe/UI Components/Zuri layout/
├── index.html        # Landing page and admin dashboard showcase
├── style.css         # Styling for light/dark themes, glassmorphism, sidebars, grids & animations
└── README.md         # This documentation
```

---

## 🎨 Design Tokens & Properties

The visual aesthetics are mapped across light and dark themes using standard CSS custom properties:

| Property | Light Theme (Default) | Dark Theme (`.dark-theme`) | Description |
|---|---|---|---|
| `--bg-body` | `#F7F8FA` (Warm Light) | `#0B0F17` (Dark Gray) | Main backing color |
| `--bg-surface` | `#FFFFFF` | `#121824` | Core surface container backing |
| `--text-primary` | `#1A1710` (Charcoal) | `#F3F4F6` (Cool White) | Primary typography |
| `--text-secondary` | `#4A4435` (Warm Olive) | `#9CA3AF` (Muted Gray) | Subtitles and labels |
| `--brand` | `#ED6C35` (Amber Orange) | `#ED6C35` | Main highlights and CTA fill |
| `--brand-dark` | `#C2410C` | `#EA580C` | Supporting accent and hover states |
| `--glass-card` | `rgba(255, 255, 255, 0.4)` | `rgba(18, 24, 36, 0.5)` | Glassmorphism card backdrops |

---

## 💻 Code Integration

### 1. HTML Shell Structures

#### View Switcher Container (Vanilla JS Viewport Transition)
```html
<!-- Landing Page View -->
<div id="landing-view" class="view-section active">
    <!-- Landing Navigation & Sections -->
</div>

<!-- Dashboard View (Hidden by default, toggled via .active class) -->
<div id="dashboard-view" class="view-section">
    <div class="dashboard-shell">
        <!-- Sidebar Navigation Drawer -->
        <aside class="glass-sidebar" id="sidebar">...</aside>
        
        <!-- Main Content Area -->
        <div class="dashboard-main">
            <!-- Glass Topbar -->
            <header class="dashboard-topbar">...</header>
            
            <!-- Dashboard Scroll Body -->
            <div class="dashboard-body">...</div>
        </div>
    </div>
</div>
```

#### MangoCard Price Tier Layout (Pricing Section)
```html
<div class="pricing-card highlight">
    <!-- recommended indicator tag -->
    <div class="recommended-tag"><i class="fas fa-star"></i> Recommended</div>
    
    <!-- MangoCard Gradient Top Section -->
    <div class="card-header card-header-highlight">
        <div class="price-pill">฿2,990/month</div>
        <h3>Pro</h3>
        <div class="tier-desc">Complete sales suite</div>
    </div>
    
    <!-- Info Bottom Section -->
    <div class="card-body">
        <ul class="feature-list">
            <li><i class="fas fa-check"></i> 10 Users</li>
            <li><i class="fas fa-check"></i> 2,000 Chats/mo</li>
        </ul>
        <button class="card-cta">Select Plan</button>
    </div>
</div>
```

### 2. Core Glassmorphic Style Rules

To implement the warm minimal glass looks, define the following variables and classes:

```css
.glass-card-warm {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-premium), var(--shadow-inset);
    border-radius: 20px;
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.glass-card-warm:hover {
    transform: translateY(-4px);
    border-color: var(--border-accent);
}
```

---

## 📳 Mobile Tactile Vibration & Interactivity

To match mobile web-app haptics, attach light device vibrations on interactive elements (e.g. menu selections, switches, and CTAs):

* Medium Interaction: `navigator.vibrate(30)`
* Light Interaction: `navigator.vibrate(20)`
* Micro Interaction: `navigator.vibrate(10)`

Include the following JS helper to handle calls safely:
```javascript
function triggerHaptic(ms) {
    if ('vibrate' in navigator) {
        navigator.vibrate(ms);
    }
}
```
