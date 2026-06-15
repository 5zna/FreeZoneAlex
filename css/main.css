@import './base/reset.css';
@import './base/typography.css';
@import './layouts/page.css';

body {
  background-color: var(--bg-primary);
  background-image: var(--bg-mesh);
  background-attachment: fixed;
  color: var(--text-primary);
  transition: background-color 0.5s var(--ease-out-expo), color 0.5s var(--ease-out-expo);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Global overflow safety */
body {
  overflow-x: hidden;
}

h1, h2, h3, h4, h5, h6,
p, span, a, li, td, th, label, button {
  overflow-wrap: break-word;
  word-break: break-word;
}

img, svg, video, canvas, iframe {
  max-width: 100%;
  height: auto;
}

/* Premium minimalist Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: var(--radius-full);
  border: 2px solid var(--bg-primary);
  background-clip: padding-box;
  transition: background var(--transition-fast);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
  border: 2px solid var(--bg-primary);
  background-clip: padding-box;
}

main {
  flex-grow: 1;
  position: relative;
}

html[lang="ar"] .font-en { font-family: var(--font-en); }
html[lang="en"] .font-ar { font-family: var(--font-ar); }

/* Global focus */
:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
}

button:focus:not(:focus-visible),
a:focus:not(:focus-visible) {
  box-shadow: none;
}

/* Luxury Toast (Floating glass capsule) */
#global-toast {
  position: fixed;
  bottom: var(--space-8);
  left: 50%;
  transform: translateX(-50%) translateY(40px) scale(0.95);
  background: var(--bg-glass-fallback);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 14px 28px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: var(--text-sm);
  box-shadow: var(--shadow-xl), var(--shadow-glow);
  opacity: 0;
  transition: 
    transform 0.4s var(--ease-spring), 
    opacity 0.3s var(--ease-out-expo), 
    background var(--transition-fast);
  will-change: transform, opacity;
  z-index: var(--z-toast);
  pointer-events: none;
  max-width: min(90vw, 450px);
  text-align: center;
  backdrop-filter: var(--blur-sm);
  -webkit-backdrop-filter: var(--blur-sm);
}

@supports (backdrop-filter: blur(1px)) {
  #global-toast {
    background: var(--bg-glass);
    backdrop-filter: var(--blur-md);
    -webkit-backdrop-filter: var(--blur-md);
  }
}

#global-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

#global-toast.toast-success {
  background: var(--color-success);
  color: #fff;
  border-color: rgba(16, 185, 129, 0.2);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.25);
}

#global-toast.toast-error {
  background: var(--color-danger);
  color: #fff;
  border-color: rgba(239, 68, 68, 0.2);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  box-shadow: 0 10px 25px rgba(239, 68, 68, 0.25);
}

/* =====================================================================
   Next-level premium polish
   (layered onto existing components — no markup/behavior changes)
   ===================================================================== */

.hero-title span,
.section-title,
.nav-logo,
.footer-logo {
  background-image: linear-gradient(
    110deg,
    var(--color-primary) 0%,
    var(--color-accent) 28%,
    var(--color-primary-hover) 50%,
    var(--color-accent) 72%,
    var(--color-primary) 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* --- Light sheen sweep across buttons on hover --- */
.btn::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -80%;
  width: 55%;
  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(255, 255, 255, 0.28) 50%,
    transparent 100%
  );
  transform: skewX(-18deg);
  opacity: 0;
  pointer-events: none;
}

.btn:hover::before {
  animation: btn-sheen 0.9s var(--ease-out-expo);
}

@keyframes btn-sheen {
  0%   { left: -80%; opacity: 0; }
  18%  { opacity: 1; }
  100% { left: 130%; opacity: 0; }
}

/* Secondary/ghost buttons sit on light surfaces — tint the sweep so it
   reads on both themes without washing out text. */
[data-theme="light"] .btn-secondary::before,
[data-theme="light"] .btn-ghost::before {
  background: linear-gradient(
    100deg,
    transparent 0%,
    var(--color-primary-light) 50%,
    transparent 100%
  );
}

/* --- Editorial gradient underline beneath section titles --- */
.section-header .section-title {
  position: relative;
  padding-bottom: var(--space-4);
}

.section-header .section-title::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 64px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  box-shadow: var(--shadow-glow);
}

/* Force usernames and @ handles to always display in lowercase */
[class*="username"],
[class*="user-username"],
.dashboard-user-email,
.user-select-username {
  text-transform: lowercase !important;
  font-variant: normal !important;
}

/* =====================================================================
   PREMIUM LUXURY UI ENHANCEMENT SYSTEM
   World-class CSS-only upgrade — Apple / Stripe / Linear quality
   ===================================================================== */

/* ✅ GOLDEN RATIO SPACING SYSTEM */
:root {
  --space-xs: clamp(4px, 0.8vw, 6px);
  --space-sm: clamp(8px, 1.2vw, 12px);
  --space-md: clamp(12px, 2vw, 18px);
  --space-lg: clamp(16px, 3vw, 24px);
  --space-xl: clamp(24px, 4vw, 36px);
  --space-2xl: clamp(32px, 5vw, 48px);
  --space-3xl: clamp(48px, 7vw, 72px);
  
  --radius-xs: 6px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.06);
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.07);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.1);
  --shadow-xl: 0 16px 48px rgba(0,0,0,0.12);
  --shadow-glow: 0 0 24px rgba(99, 102, 241, 0.15);
  
  --transition-fast: 120ms cubic-bezier(0.3, 0, 0.2, 1);
  --transition-normal: 240ms cubic-bezier(0.3, 0, 0.2, 1);
  --transition-slow: 360ms cubic-bezier(0.3, 0, 0.2, 1);
}

/* ✅ FLUID TYPOGRAPHY SYSTEM */
html {
  font-size: clamp(14px, 1.4vw, 16px);
  -webkit-font-smoothing: subpixel-antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

h1 { font-size: clamp(2rem, 5vw, 3.5rem); letter-spacing: -0.03em; font-weight: 800; }
h2 { font-size: clamp(1.6rem, 3.5vw, 2.5rem); letter-spacing: -0.02em; font-weight: 750; }
h3 { font-size: clamp(1.3rem, 2.5vw, 1.8rem); letter-spacing: -0.015em; font-weight: 700; }
h4 { font-size: clamp(1.1rem, 2vw, 1.4rem); letter-spacing: -0.01em; font-weight: 650; }
p { line-height: 1.7; }

/* ✅ PREMIUM ELEMENT ENHANCEMENTS */
.glass-panel {
  border: 1px solid rgba(255,255,255,0.08) !important;
  box-shadow: var(--shadow-lg), var(--shadow-glow) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
}

.btn {
  font-weight: 600;
  letter-spacing: 0.01em;
  border: 1px solid transparent;
  transition: all var(--transition-normal);
  transform: translateZ(0);
}

.btn:hover {
  transform: translateY(-2px) translateZ(0);
  box-shadow: var(--shadow-md), var(--shadow-glow);
}

.btn:active {
  transform: translateY(0px) scale(0.98) translateZ(0);
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

.btn-primary:hover {
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
  filter: brightness(1.05);
}

.card,
.stat-card,
.dash-card {
  transition: all var(--transition-normal);
  transform: translateZ(0);
  border: 1px solid rgba(255,255,255,0.06) !important;
}

.card:hover,
.stat-card:hover,
.dash-card:hover {
  transform: translateY(-4px) translateZ(0);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
  border-color: var(--color-primary-light) !important;
}

/* ✅ NAVBAR PREMIUM UPGRADE */
.navbar {
  border-bottom: 1px solid rgba(255,255,255,0.06) !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
}

.navbar.scrolled {
  box-shadow: var(--shadow-md) !important;
  background: rgba(10, 10, 18, 0.85) !important;
}

/* ✅ HERO SECTION LUXURY ENHANCEMENT */
.hero::before {
  animation: none !important;
  opacity: 0.5 !important;
  transition: opacity 1.5s ease;
}

.hero:hover::before {
  opacity: 0.7;
}

.hero-glow-circle {
  filter: blur(40px) !important;
  opacity: 0.5 !important;
  animation: none !important;
}

@keyframes hero-aurora {
  0%   { transform: translate(-10%, -5%) scale(1); opacity: 0.4; }
  33%  { transform: translate(10%, 5%) scale(1.15); opacity: 0.6; }
  66%  { transform: translate(-5%, 10%) scale(0.95); opacity: 0.5; }
  100% { transform: translate(5%, -10%) scale(1.05); opacity: 0.45; }
}

/* ✅ MICRO-INTERACTIONS */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25), var(--ring-focus);
}

input[type="text"],
input[type="url"],
input[type="email"],
textarea,
select {
  transition: all var(--transition-fast);
  border: 1px solid var(--border-color);
  background: var(--bg-inset);
}

input:hover,
textarea:hover,
select:hover {
  border-color: var(--border-strong);
  background: var(--bg-secondary);
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--color-primary);
  background: var(--bg-secondary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm), var(--shadow-glow);
}

/* ✅ RESPONSIVE PERFECTION SYSTEM */
@media (max-width: 768px) {
  .hero {
    padding: clamp(60px, 12vw, 100px) 0 clamp(40px, 8vw, 80px) 0 !important;
    min-height: auto !important;
  }
  
  .btn {
    min-height: 48px;
  }
  
  .glass-panel {
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0 var(--space-sm);
  }
  
  .hero-ctas {
    flex-direction: column;
    gap: 12px;
  }
  
  .hero-ctas .btn {
    width: 100%;
    padding: 14px 20px;
  }
  
  .glass-panel {
    padding: var(--space-md) !important;
  }
}

@media (max-width: 360px) {
  .container {
    padding: 0 var(--space-xs);
  }
  
  body {
    font-size: 0.9rem;
  }
}

@media (max-width: 280px) {
  .hero-title {
    font-size: 1.4rem !important;
  }
  
  .btn {
    padding: 10px 14px !important;
    font-size: 0.8rem !important;
  }
}

@media (min-width: 1536px) {
  .container {
    max-width: 1400px;
  }
  
  .hero {
    min-height: 80vh;
  }
}

/* ✅ REDUCED MOTION RESPECT */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ✅ PERFORMANCE OPTIMIZATIONS */
.glass-panel,
.btn,
.card,
.navbar {
  backface-visibility: hidden;
}

.btn:hover,
.card:hover,
.glass-panel:hover {
  will-change: transform, box-shadow;
}

/* ✅ ACCESSIBILITY ENHANCEMENTS */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* =====================================================================
   ✨ QUIET LUXURY COMPLETE DESIGN SYSTEM
   ✅ 8-Point Grid System
   ✅ Dual Theme Support (Light / Dark)
   ✅ Inter Typography Scale
   ===================================================================== */

/* 🔷 FOUNDATION VARIABLES */
:root {
  /* Spacing Scale (strict 8px multiples) */
  --s1: 4px;
  --s2: 8px;
  --s3: 16px;
  --s4: 24px;
  --s5: 32px;
  --s6: 48px;
  --s7: 64px;
  --s8: 80px;
  --s9: 96px;
  --s10: 128px;

  /* Radius Scale */
  --r1: 4px;
  --r2: 8px;
  --r3: 12px;
  --r4: 16px;
  --r5: 24px;

  /* Shadow System */
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
  --shadow-sm: 0 2px 8px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 16px -1px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 32px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 16px 48px -5px rgba(0, 0, 0, 0.12);
  --shadow-glow: 0 0 24px rgba(99, 102, 241, 0.15);

  /* Motion */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 500ms cubic-bezier(0.4, 0, 0.2, 1);

  /* Typography */
  --font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* 🌙 DARK MODE THEME */
[data-theme="dark"] {
  --bg: #0f1118;
  --bg-alt: #181a25;
  --fg: #f8fafc;
  --fg-muted: #94a3b8;
  --border: #272a37;
  --primary: #6366f1;
  --primary-light: rgba(99, 102, 241, 0.12);
}

/* ☀️ LIGHT MODE THEME */
[data-theme="light"] {
  --bg: #ffffff;
  --bg-alt: #fafafa;
  --fg: #111111;
  --fg-muted: #64748b;
  --border: #e2e8f0;
  --primary: #4f46e5;
  --primary-light: #eef2ff;
}

/* 📐 BASE RESET */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  max-width: 100%;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-family) !important;
  background: var(--bg) !important;
  color: var(--fg) !important;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  overflow-x: hidden;
  position: relative;
  width: 100%;
}

/* 🔤 PRECISION TYPOGRAPHY SCALE */
h1 { font-size: 64px !important; font-weight: 700 !important; line-height: 1.1 !important; letter-spacing: -0.02em !important; }
h2 { font-size: 36px !important; font-weight: 600 !important; line-height: 1.25 !important; letter-spacing: -0.01em !important; }
h3 { font-size: 24px !important; font-weight: 600 !important; line-height: 1.3 !important; }
h4 { font-size: 20px !important; font-weight: 600 !important; line-height: 1.4 !important; }
p { font-size: 16px !important; font-weight: 400 !important; line-height: 1.7 !important; color: var(--fg-muted) !important; }

/* 🎯 LAYOUT SYSTEM */
.container {
  max-width: 1280px !important;
  padding: 0 var(--s3) !important;
  margin: 0 auto !important;
}

/* 🧭 NAVIGATION BAR */
.navbar {
  background: color-mix(in srgb, var(--bg) 85%, transparent) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border-bottom: 1px solid var(--border) !important;
  height: 72px !important;
}

.navbar.scrolled {
  box-shadow: var(--shadow-md) !important;
  background: color-mix(in srgb, var(--bg) 92%, transparent) !important;
}

.nav-item a {
  border-radius: var(--r2) !important;
  padding: var(--s2) var(--s3) !important;
  font-weight: 500 !important;
  color: var(--fg-muted) !important;
  transition: all var(--transition-fast) !important;
}

.nav-item > a:hover,
.nav-item.active > a {
  background: var(--primary-light) !important;
  color: var(--primary) !important;
}

/* ⚡ HERO SECTION */
.hero {
  padding: var(--s8) 0 var(--s7) !important;
  min-height: calc(100vh - 72px) !important;
  display: flex !important;
  align-items: center !important;
  position: relative !important;
  overflow: hidden !important;
}

.hero::before {
  content: '';
  position: absolute;
  width: 800px;
  height: 800px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--primary-light) 0%, transparent 70%);
  top: -300px;
  right: -200px;
  z-index: 0;
  pointer-events: none;
}

.hero-content {
  z-index: 10 !important;
}

.hero-title {
  background: transparent !important;
  -webkit-background-clip: initial !important;
  -webkit-text-fill-color: initial !important;
  color: var(--fg) !important;
  margin-bottom: var(--s4) !important;
}

.hero-title span {
  background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
}

.hero-description {
  font-size: 18px !important;
  margin-bottom: var(--s5) !important;
  max-width: 560px !important;
}

/* 🔘 BUTTON SYSTEM */
.btn {
  border-radius: var(--r3) !important;
  padding: var(--s3) var(--s4) !important;
  font-weight: 500 !important;
  font-size: 15px !important;
  transition: all var(--transition-normal) !important;
  letter-spacing: 0.01em !important;
  border: none !important;
}

.btn-primary {
  background: var(--primary) !important;
  color: white !important;
  box-shadow: var(--shadow-md) !important;
}

.btn-primary:hover {
  background: color-mix(in srgb, var(--primary) 90%, black) !important;
  transform: translateY(-1px) !important;
  box-shadow: var(--shadow-lg) !important;
}

.btn-secondary {
  background: var(--bg-alt) !important;
  color: var(--fg) !important;
  border: 1px solid var(--border) !important;
}

.btn-secondary:hover {
  background: var(--fg) !important;
  color: var(--bg) !important;
  transform: translateY(-1px) !important;
}

/* 🃏 CARD SYSTEM */
.glass-panel {
  background: color-mix(in srgb, var(--bg) 90%, transparent) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r4) !important;
  box-shadow: var(--shadow-lg) !important;
}

.stat-card,
.card,
.dash-card {
  background: var(--bg) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r3) !important;
  box-shadow: var(--shadow-xs) !important;
  transition: all var(--transition-normal) !important;
  padding: var(--s4) !important;
}

.stat-card:hover,
.card:hover,
.dash-card:hover {
  transform: translateY(-2px) !important;
  box-shadow: var(--shadow-md) !important;
  border-color: color-mix(in srgb, var(--primary) 30%, var(--border)) !important;
}

/* 🎬 ANIMATION & MOTION */
.reveal-element {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 600ms var(--transition-normal), transform 600ms var(--transition-normal);
}

.reveal-element.revealed {
  opacity: 1;
  transform: translateY(0);
}

/* 📱 RESPONSIVE BREAKPOINTS */
@media (max-width: 768px) {
  .hero { padding: var(--s6) 0 var(--s5) !important; min-height: auto !important; }
  h1 { font-size: 40px !important; }
  h2 { font-size: 28px !important; }
}

@media (max-width: 480px) {
  h1 { font-size: 32px !important; }
  .hero-ctas { flex-direction: column !important; gap: var(--s3) !important; }
  .btn { width: 100% !important; }
}

/* ♿ ACCESSIBILITY */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* ✨ SOFT PARALLAX EFFECT */
.hero-glow-circle {
  filter: blur(36px) !important;
  opacity: 0.4 !important;
  transform: translateZ(0);
}
