.container {
  width: 100%;
  max-width: var(--container-max);
  margin: 0 auto;
  padding-left: var(--container-pad);
  padding-right: var(--container-pad);
}

section {
  padding: var(--space-16) 0;
  position: relative;
}

.section-header {
  text-align: center;
  margin-bottom: var(--space-12);
  max-width: 680px;
  margin-left: auto;
  margin-right: auto;
}

.section-title {
  font-size: clamp(1.85rem, 4vw, 2.75rem);
  font-weight: 800;
  margin-bottom: var(--space-3);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
  letter-spacing: -0.025em;
}

.section-subtitle {
  font-size: var(--text-base);
  color: var(--text-secondary);
  line-height: 1.7;
}

.page-section {
  padding-top: var(--space-10);
  padding-bottom: var(--space-16);
}

/* Elevated glass surface with smooth border-gradient and micro-shadows */
.glass-panel {
  position: relative;
  background: var(--bg-glass-fallback);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm), var(--shadow-inner);
  transition:
    transform var(--transition-normal),
    box-shadow var(--transition-normal),
    border-color var(--transition-normal),
    background var(--transition-normal);
}

@supports (backdrop-filter: blur(20px)) {
  .glass-panel {
    background: var(--bg-glass);
    backdrop-filter: var(--blur-md) saturate(1.25);
    -webkit-backdrop-filter: var(--blur-md) saturate(1.25);
  }
}

.glass-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: var(--gradient-border);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.3;
  pointer-events: none;
  transition: opacity var(--transition-normal);
}

.glass-panel:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
  transform: translateY(-3px) translateZ(0);
}

.glass-panel:hover::before {
  opacity: 0.8;
}

/* Luxury Buttons (Apple-level polish) */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  padding: 12px 26px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-normal);
  gap: var(--space-2);
  position: relative;
  overflow: hidden;
  user-select: none;
  min-height: 44px;
  letter-spacing: 0.015em;
  transform: translateZ(0);
}

.btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, transparent 60%);
  opacity: 0;
  transition: opacity var(--transition-fast);
  pointer-events: none;
}

.btn:hover::after {
  opacity: 1;
}

.btn:active {
  transform: scale(var(--scale-active)) translateZ(0);
}

.btn-primary {
  background: var(--gradient-primary);
  color: var(--text-inverse);
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border-color: rgba(79, 70, 229, 0.2);
}

.btn-primary:hover {
  transform: translateY(-2px) translateZ(0);
  box-shadow: var(--shadow-md), var(--shadow-glow);
  border-color: rgba(79, 70, 229, 0.4);
  filter: brightness(1.1);
}

.btn-secondary {
  background: var(--bg-glass);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-xs), var(--shadow-inner);
}

.btn-secondary:hover {
  background: var(--bg-glass-hover);
  border-color: var(--border-strong);
  color: var(--color-primary);
  transform: translateY(-2px) translateZ(0);
  box-shadow: var(--shadow-sm);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: transparent;
}

.btn-ghost:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

/* Premium Form Elements */
input:not([type="checkbox"]):not([type="radio"]),
textarea,
select {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-inset);
  color: var(--text-primary);
  padding: 12px 16px;
  font-family: inherit;
  font-size: var(--text-sm);
  transition: 
    border-color var(--transition-fast), 
    box-shadow var(--transition-fast), 
    background var(--transition-fast);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
}

input:not([type="checkbox"]):not([type="radio"]):focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: var(--ring-focus), inset 0 1px 1px rgba(0, 0, 0, 0.01);
  background: var(--bg-secondary);
}

[dir="rtl"] { text-align: right; }
[dir="ltr"] { text-align: left; }

.hidden { display: none !important; }

/* Scroll-to-top component */
.scroll-top-btn {
  position: fixed;
  bottom: var(--space-8);
  right: var(--space-8);
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  color: var(--text-inverse);
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  z-index: 900;
  opacity: 0;
  transform: translateY(20px) scale(0.85);
  pointer-events: none;
  transition: all var(--transition-normal);
}

.scroll-top-btn.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.scroll-top-btn:hover {
  box-shadow: var(--shadow-lg), var(--shadow-glow);
  transform: translateY(-4px) scale(1.05) translateZ(0);
}

html[lang="ar"] .scroll-top-btn {
  right: auto;
  left: var(--space-8);
}

@media (max-width: 768px) {
  section { padding: 64px 0; }
  .container { padding-left: var(--space-5); padding-right: var(--space-5); }
  .section-header { margin-bottom: var(--space-8); }
}

@media (max-width: 480px) {
  section { padding: 48px 0; }
  .container { padding-left: var(--space-4); padding-right: var(--space-4); }
  .section-header { margin-bottom: var(--space-6); }
  .section-subtitle { font-size: var(--text-sm); }

  .btn {
    padding: 14px 20px;
    font-size: var(--text-sm);
  }

  .page-section {
    padding-top: var(--space-6);
    padding-bottom: var(--space-10);
  }

  .scroll-top-btn {
    bottom: var(--space-4);
    right: var(--space-4);
    width: 44px;
    height: 44px;
  }

  html[lang="ar"] .scroll-top-btn {
    right: auto;
    left: var(--space-4);
  }

  .glass-panel {
    border-radius: var(--radius-md);
  }
}

@media (max-width: 375px) {
  .container { padding-left: var(--space-3); padding-right: var(--space-3); }
  .section-header { margin-bottom: var(--space-5); }
  section { padding: 40px 0; }
}

/* Smallest phones (e.g. 240px to 320px wide) */
@media (max-width: 360px) {
  section { padding: 36px 0; }
  .container { padding-left: var(--space-3); padding-right: var(--space-3); }
  .section-header { margin-bottom: var(--space-5); }

  .btn {
    padding: 12px 14px;
    gap: var(--space-1);
    font-size: var(--text-xs);
  }

  .scroll-top-btn {
    bottom: var(--space-3);
    right: var(--space-3);
    width: 40px;
    height: 40px;
  }

  html[lang="ar"] .scroll-top-btn {
    right: auto;
    left: var(--space-3);
  }
}

@media (max-width: 320px) {
  section { padding: 28px 0; }
  .container { padding-left: 12px; padding-right: 12px; }
  .section-header { margin-bottom: var(--space-4); }
}

/* Large desktops */
@media (min-width: 1536px) {
  .container {
    max-width: var(--container-wide);
    padding-left: var(--space-8); padding-right: var(--space-8);
  }
  section { padding: 80px 0; }
}

/* Ultrawide displays */
@media (min-width: 1920px) {
  .container { max-width: var(--container-ultra); }
  section { padding: 96px 0; }
}

/* 4K Cinema displays */
@media (min-width: 2560px) {
  .container { max-width: var(--container-cinema); }
  section { padding: 120px 0; }
}
