# Modern Glass Sidebar Component

A collapsible, premium **Glassmorphism Sidebar Navigation** menu featuring smooth hover expansions, pure CSS tooltips, active tab toggles, and glowing background ambient lights (orbs).

This layout is fully responsive and optimized for futuristic web consoles or dashboard panels.

---

## 📂 File Structure

```text
g:/covibe/UI Components/Modern Glass Sidebar/
├── index.html        # Interactive layout showcase
├── style.css         # Glassmorphism styling & keyframe animations
└── README.md         # This documentation
```

---

## 🎨 Key Features & Design Details

1. **Glassmorphism Backdrop Filter:** Uses translucency (`rgba` backgrounds), borders, and `backdrop-filter: blur(20px)` to create a premium frosted-glass overlay.
2. **Smooth Hover Expansion:** Inactive sidebar sits at `w-16` / `w-20`. On hover, the sidebar expands to reveal menu text (`Dashboard`, `Projects`, etc.) with subtle translation and opacity eases.
3. **Pure CSS Tooltips:** Tooltips are handled entirely by CSS without any JavaScript overhead, utilizing the `data-tooltip` attribute.
4. **Backdrop Orbs:** Floating ambient light rings (`.orb`) containing glowing neon gradients placed beneath the dashboard layers.

---

## 💻 Code Snippets

### 1. HTML Markup

```html
<nav class="sidebar">
    <div>
        <!-- Brand Header -->
        <div class="brand">
            <i class="fas fa-cube"></i>
            <span>VORTEX</span>
        </div>

        <!-- Upper Nav List -->
        <ul class="nav-list">
            <!-- Tooltip is set via the data-tooltip attribute -->
            <li class="nav-item" data-tooltip="Home">
                <a href="#" class="nav-link active">
                    <i class="fas fa-home"></i>
                    <span>Dashboard</span>
                </a>
            </li>
            <li class="nav-item" data-tooltip="Projects">
                <a href="#" class="nav-link">
                    <i class="fas fa-layer-group"></i>
                    <span>Projects</span>
                </a>
            </li>
        </ul>
    </div>

    <!-- Lower Nav List -->
    <ul class="nav-list">
        <li class="nav-item" data-tooltip="Settings">
            <a href="#" class="nav-link">
                <i class="fas fa-cog"></i>
                <span>Settings</span>
            </a>
        </li>
    </ul>
</nav>
```

### 2. Pure CSS Tooltips (How it Works)

CSS reads the text defined inside `data-tooltip` using `attr(data-tooltip)` and renders it inside absolute-positioned pseudo-elements:

```css
/* Tooltip box container */
.nav-item {
    position: relative;
}

/* Tooltip bubble styling */
.nav-item::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 90px;
    top: 50%;
    transform: translateY(-50%) scale(0.8);
    background: rgba(19, 21, 26, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #ffffff;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 0.75rem;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Show tooltip bubble on hover */
.nav-item:hover::after {
    opacity: 1;
    transform: translateY(-50%) scale(1);
}

/* Hide tooltips when sidebar is expanded */
.sidebar:hover .nav-item::after {
    opacity: 0;
    display: none;
}
```

### 3. JavaScript Active State Handler

A lightweight Vanilla JS listener is applied to update tab states:

```javascript
const navLinks = document.querySelectorAll('.nav-link');

navLinks.forEach(link => {
    link.addEventListener('click', function() {
        // Remove active class from all links
        navLinks.forEach(nav => nav.classList.remove('active'));
        
        // Mark clicked tab as active
        this.classList.add('active');
    });
});
```
