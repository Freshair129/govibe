# Tactile Selectors & Switches Console

An interactive, tactical, and touch-friendly suite of selectors designed for universal mobile and web PWA interfaces.

This component package implements the exact visual metrics and specs exported from Figma (`switches.css`), featuring a large capsule Toggle Switch, custom circular Radio Buttons, and rounded-square Checkboxes.

---

## 📂 File Structure

```text
g:/covibe/UI Components/Selectors Switches/
├── index.html        # Interactive console showcase
├── style.css         # Glassmorphic styling, keyframe animations, & haptics
└── README.md         # This documentation
```

---

## 🎨 Component Design Tokens

The styling parameters are mapped directly from original Figma layers:

| Component Type | Layer Spec / Dimensions | Active State Color | Knob / Handle Specs |
|---|---|---|---|
| **Toggle Switch** | `280px × 168px` Capsule | `#ED6C35` (Orange) | `145px × 145px` Circle, `#ECECEC` |
| **Radio Button** | `90px × 90px` Circle | `#ED6C35` (Orange ring) | `54px × 54px` Circle, `#ECECEC` |
| **Checkbox** | `90px × 90px` Rounded Square | `#ED6C35` (Orange ring) | `54px × 54px` Rounded Square, `#ECECEC` |

---

## 💻 Code Snippets

### 1. HTML Layouts

```html
<!-- 1. TACTILE TOGGLE SWITCH -->
<div class="switch-container">
    <input type="checkbox" id="feature-toggle" class="switch-input">
    <label for="feature-toggle" class="switch-track">
        <span class="switch-knob"></span>
    </label>
</div>

<!-- 2. TACTILE RADIO BUTTON (Circular) -->
<div class="radio-container">
    <input type="radio" name="generic-radio" id="radio-opt-a" class="radio-input">
    <label for="radio-opt-a" class="radio-track">
        <span class="radio-knob"></span>
    </label>
</div>

<!-- 3. TACTILE CHECKBOX (Rounded Square) -->
<div class="checkbox-container">
    <input type="checkbox" id="check-setting-a" class="checkbox-input">
    <label for="check-setting-a" class="checkbox-track">
        <span class="checkbox-knob"></span>
    </label>
</div>
```

### 2. Core CSS Implementation

```css
/* Custom Radio Styles */
.radio-container {
    position: relative;
    width: 90px;
    height: 90px;
}
.radio-track {
    display: block;
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #262930;
    cursor: pointer;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.6);
    transition: background 0.3s, box-shadow 0.3s;
}
.radio-input:checked + .radio-track {
    background: #ED6C35;
    box-shadow: inset 0 1px 3px rgba(255,255,255,0.3), 0 0 25px rgba(237, 108, 53, 0.45);
}
.radio-knob {
    display: block;
    position: absolute;
    width: 54px;
    height: 54px;
    left: 18px;
    top: 18px;
    background: #ECECEC;
    border-radius: 50%;
    box-shadow: -1px 8px 12px rgba(0, 0, 0, 0.35);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Custom Checkbox Styles */
.checkbox-container {
    position: relative;
    width: 90px;
    height: 90px;
}
.checkbox-track {
    display: block;
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 22px;
    background: #262930;
    cursor: pointer;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.6);
    transition: background 0.3s, box-shadow 0.3s;
}
.checkbox-input:checked + .checkbox-track {
    background: #ED6C35;
    box-shadow: inset 0 1px 3px rgba(255,255,255,0.3), 0 0 25px rgba(237, 108, 53, 0.45);
}
.checkbox-knob {
    display: block;
    position: absolute;
    width: 54px;
    height: 54px;
    left: 18px;
    top: 18px;
    background: #ECECEC;
    border-radius: 14px;
    box-shadow: -1px 8px 12px rgba(0, 0, 0, 0.35);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Spring Click Scaling (Haptic Feedback Animation) */
.radio-track:active .radio-knob,
.checkbox-track:active .checkbox-knob {
    transform: scale(0.92);
}
```

---

## 📳 Mobile Tactile Haptic Vibration

For high physical tactile response in mobile and PWA applications, utilize the following haptic mapping callbacks on trigger changes:

* Toggle Change: `navigator.vibrate(60)` (Engage) / `navigator.vibrate(30)` (Disengage)
* Radio Selection Change: `navigator.vibrate(45)`
* Checkbox Toggle: `navigator.vibrate(50)` (Check) / `navigator.vibrate(25)` (Uncheck)
