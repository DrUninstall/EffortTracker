# Design System

Quick reference for the design tokens and patterns used across the site.

## Colors

Semantic tokens that auto-switch for dark mode:

```css
/* Text */
--text-strong       /* headings, primary */
--text-weak         /* secondary, descriptions */
--text-brand        /* links, accents */

/* Backgrounds */
--background-base   /* page background */
--background-raised /* cards, elevated surfaces */

/* Borders */
--stroke-weak       /* subtle borders */
--stroke-strong     /* input borders */

/* Interactive */
--fill-hover        /* hover states */
--fill-press        /* active/pressed */
```

## Spacing

4px grid. Common values:

| Token | Size |
|-------|------|
| `--space-2` | 8px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-16` | 64px |

## Typography

Using Geist Sans. Scale based on 1.2 ratio:

- Display: 56px (desktop) / 40px (mobile)
- H1: 40px / 36px
- H2: 32px / 28px
- Body: 16px
- Small: 14px

## Elevation

Two levels:

```css
--elevation-raised  /* cards, buttons */
--elevation-overlay /* dropdowns, modals */
```

## Animation

Keep it fast:
- Hover transitions: 200ms
- Page transitions: 300ms
- Easing: `ease-out` for entering, `ease-in-out` for movement

Framer Motion defaults:
```tsx
transition={{ type: "spring", stiffness: 300, damping: 30 }}
```

**Exit animations**: Make exits subtler than enters - less attention needed when leaving. Use smaller values (e.g., `scale: 0.75` vs `0.25` on enter, `y: -8` vs full height).

### Animation Best Practices

Practical tricks to make animations feel better without magic:

#### 1. Scale Buttons on Press
Already implemented in `button.module.css`:
```css
.button:active { transform: scale(0.97); }
```

#### 2. Never Animate from scale(0)
Elements animating from `scale(0)` feel unnatural - they appear from nowhere. Use `scale(0.9)` or higher for a gentler, more physical feel.

```css
/* Bad - feels jarring */
@keyframes pop-in {
  from { transform: scale(0); }
}

/* Good - natural appearance */
@keyframes pop-in {
  from { transform: scale(0.95); opacity: 0; }
}
```

#### 3. Skip Tooltip Delays After First
Once a tooltip is shown, subsequent tooltips should appear instantly. Radix UI supports this via `[data-instant]`:

```css
.tooltip {
  transition: transform 125ms ease-out, opacity 125ms ease-out;
}

/* Skip animation on subsequent tooltips */
.tooltip[data-instant] {
  transition-duration: 0ms;
}
```

#### 4. Origin-Aware Popovers
Popovers should scale from their trigger, not center. Use transform-origin:

```css
/* Radix UI provides this automatically */
.popover {
  transform-origin: var(--radix-popover-content-transform-origin);
}

/* Or set manually based on position */
.popover[data-side="bottom"] { transform-origin: top center; }
.popover[data-side="top"] { transform-origin: bottom center; }
```

#### 5. Keep Animations Fast
- **UI transitions:** Under 300ms (we use 200ms default)
- **Spinners:** 0.6-0.8s feels faster than 1s (perceived performance)
- **Frequent interactions:** Consider removing animation entirely

#### 6. Blur Trick for Crossfades
When crossfading between states feels jarring, add subtle blur to bridge the gap:

```css
.button-icon {
  transition: opacity 200ms ease-out, filter 200ms ease-out;
}

.button-icon[data-transitioning] {
  filter: blur(2px);
}
```

This masks the moment when two distinct elements overlap, making transitions feel smoother.

### Performance Tier System

Understanding the browser's render pipeline helps choose the right animation approach:

| Tier | Trigger | Examples | Notes |
|------|---------|----------|-------|
| **S-Tier** | Compositor only | `transform`, `opacity`, `filter`, `clip-path` | Hardware accelerated, runs on GPU thread. Smooth even when main thread is blocked. |
| **A-Tier** | Compositor (main thread driven) | JS animations on compositor props, `IntersectionObserver` triggers | Performant but can be interrupted by heavy main thread work. |
| **B-Tier** | FLIP technique | Layout animations via Motion's `layout` prop | One upfront measurement, then S/A-tier animation. |
| **C-Tier** | Paint | `background-color`, `color`, `border-radius`, CSS variables | Redraws layer every frame. Cost scales with layer size. |
| **D-Tier** | Layout | `width`, `height`, `margin`, `padding`, `flex`, `grid-*` | Recalculates geometry. Ripples through DOM. Avoid animating these. |
| **F-Tier** | Thrashing | Read/write/read/write cycles | Never do this. Causes massive layout recalculations. |

### Compositor Properties (S-Tier)

These can run entirely on the GPU compositor thread:

```css
/* Hardware accelerated - prefer these */
transform: translateX(100px);
opacity: 0.5;
filter: blur(4px);  /* But keep blur ≤10px */
clip-path: inset(0);
```

Using CSS/WAAPI or Motion's `animate()` with these ensures animations stay smooth even during heavy JS work.

### will-change Best Practices

`will-change` hints to browsers to pre-promote elements to GPU layers:

```css
/* Good - specific properties on elements that animate */
.animated-button {
  will-change: transform;
}

/* Also good - multiple properties */
.dialog {
  will-change: transform, opacity;
}

/* Bad - too broad or on everything */
* { will-change: auto; }
.element { will-change: all; }
```

**Cautions:**
- Creating layers costs GPU memory
- Large layers (full-screen, long lists) can crash mobile devices
- Blur effects make layers even larger - keep `filter: blur()` ≤ 10px
- Ticker/marquee animations with many cloned elements are dangerous
- Only apply to elements that actually animate

### CSS Variable Animation Pitfalls

CSS variables are surprisingly bad for performance:

```css
/* BAD: Always triggers paint, even with compositor props */
.box {
  --progress: 0;
  opacity: var(--progress);  /* Still paints every frame! */
}
```

**The Inheritance Bomb**: Animating a global CSS variable forces style recalculation on the *entire* tree, even elements not using it. This can cost 8ms+ per frame on complex pages.

```css
/* BAD: Global variable animation */
html { --progress: 0; }

/* GOOD: Use @property to disable inheritance */
@property --progress {
  syntax: "<number>";
  inherits: false;
  initial-value: 0;
}
```

**Best practice**: For `transform`/`opacity`, use targeted JS updates instead of CSS variables:
```js
element.style.transform = `translateX(${progress * 100}px)`
```

### Scroll Animations

| Approach | Tier | Notes |
|----------|------|-------|
| Scroll Timeline / View Timeline | S-Tier | Hardware accelerated, synced to scroll compositor |
| Motion's `scroll()` function | S-Tier | Same as above |
| Reading `scrollTop` in rAF | D-Tier | Main thread, can lag behind actual scroll |
| `position: sticky/fixed` | S-Tier | Compositor-handled, prefer over transform-based scroll sync |

### IntersectionObserver

Highly performant (A-Tier) for:
- Triggering animations when elements enter viewport
- Deactivating off-screen animations to save battery

```tsx
// Good: Only animate while visible
inView(element, () => {
  element.classList.add("animating");
  return () => element.classList.remove("animating");
});
```

### View Transitions

The View Transitions API is C-Tier overall due to:
- **Interruption issues**: Can't smoothly interrupt mid-transition
- **width/height animation**: Uses D-Tier layout animation by default

The crossfade itself is S-Tier (opacity animation). For best performance, remove width/height keyframes when sizes match.

### Avoiding Thrashing (F-Tier)

Never interleave DOM reads and writes:

```js
// BAD: Thrashing
element.style.width = "100px";     // write
const w = element.offsetWidth;     // read (forces layout)
element.style.width = w * 2 + "px"; // write (forces layout again)

// GOOD: Batch reads, then batch writes
const w = element.offsetWidth;     // read
element.style.width = w * 2 + "px"; // write
```

Motion batches all reads/writes automatically via its `frame` API.

## Icons

Using Lucide React. Standard sizes:
- 16px for buttons
- 20px for navigation
- 24px+ for features

Always include `aria-label` for icon-only buttons.

## Breakpoints

| Name | Width | Columns |
|------|-------|---------|
| Mobile | < 768px | 4 |
| Tablet | 768-1439px | 8 |
| Desktop | 1440px+ | 12 |
