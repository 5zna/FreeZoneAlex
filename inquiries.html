import { THEME_STORAGE_KEY, DEFAULT_THEME } from '../core/constants.js';
import { shouldReduceAnimations } from '../core/utils.js';

const reduced = shouldReduceAnimations();

export function initThemeHandler() {
  const themeToggleBtns = document.querySelectorAll('.theme-toggle');
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;

  applyTheme(savedTheme, false);

  themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
    });
  });

  if (!reduced) {
    setupScrollEffect();
  }
}

function applyTheme(theme, animate) {
  if (!animate || reduced) {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    const transitionDiv = document.createElement('div');
    transitionDiv.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;background:var(--bg-primary);transition:opacity 0.3s;opacity:0';
    document.body.appendChild(transitionDiv);
    requestAnimationFrame(() => {
      transitionDiv.style.opacity = '0.3';
      requestAnimationFrame(() => {
        document.documentElement.setAttribute('data-theme', theme);
        requestAnimationFrame(() => {
          transitionDiv.style.opacity = '0';
          setTimeout(() => transitionDiv.remove(), 300);
        });
      });
    });
  }

  localStorage.setItem(THEME_STORAGE_KEY, theme);
  updateToggleIcons(theme);
}

function updateToggleIcons(theme) {
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    if (theme === 'dark') {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
      btn.setAttribute('title', 'Switch to Light Mode');
    } else {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      btn.setAttribute('title', 'Switch to Dark Mode');
    }
  });
}

function setupScrollEffect() {
  let ticking = false;
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}
