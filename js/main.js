import { API_BASE_URL } from './core/constants.js';
import { initThemeHandler } from './handlers/themeHandler.js';
import { initTranslationHandler } from './handlers/translationHandler.js';
import { initAuthHandler } from './handlers/authHandler.js';
import { initJobHandler } from './handlers/jobHandler.js';
import { initModalHandler } from './handlers/modalHandler.js';
import { initInquiryHandler } from './handlers/inquiryHandler.js';
import { initSupportHandler } from './handlers/supportHandler.js';
import { initAnimationHandler } from './handlers/animationHandler.js';
import { initProfileHandler } from './handlers/profileHandler.js';
import { initDevHandler } from './handlers/devHandler.js';
import { initDashboardPage } from './handlers/dashboardPage.js';
import { initPostJobHandler } from './handlers/postJobHandler.js';
import { initNotificationHandler } from './handlers/notificationHandler.js';
import { initContributorHandler } from './handlers/contributorHandler.js';
import { initNewsTickerHandler } from './handlers/newsTickerHandler.js';

document.addEventListener('DOMContentLoaded', () => {
  initThemeHandler();
  initTranslationHandler();
  initAuthHandler();

  protectDashboard();

  initJobHandler();
  initModalHandler();
  initInquiryHandler();
  initSupportHandler();
  initAnimationHandler();
  initProfileHandler();
  initDevHandler();
  initDashboardPage().catch(() => {});
  initPostJobHandler();
  initNotificationHandler();
  initContributorHandler();
  initNewsTickerHandler();
  setupNavUI();
  setupScrollTopBtn();
  restoreScroll();
});

async function protectDashboard() {
  if (!window.location.pathname.match(/\/dashboard(\/|$|\.html)/)) return;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/check-dashboard`, { credentials: 'include' });
    if (!res.ok) throw new Error('Denied');
  } catch {
    window.location.href = '/home';
  }
}

window.addEventListener('beforeunload', saveScroll);

function setupNavUI() {
  const pathname = window.location.pathname;
  const currentPath = pathname.replace(/\.html$/, '') || '/home';

  document.querySelectorAll('.nav-menu .active, .nav-menu a.active').forEach(el => {
    el.classList.remove('active');
  });

  document.querySelectorAll('.nav-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    const isMatch = (currentPath === href) || (currentPath === '/' && href === '/home');
    if (isMatch) {
      link.classList.add('active');
      const navItem = link.closest('.nav-item');
      if (navItem) {
        navItem.classList.add('active');
      }
    }
  });

  const toggle = document.getElementById('mobile-menu-toggle');
  const menu = document.getElementById('nav-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains('open');
      menu.classList.toggle('open');
      toggle.innerHTML = isOpen ? '\u2630' : '\u2715';
    });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && e.target !== toggle) {
        menu.classList.remove('open');
        toggle.innerHTML = '\u2630';
      }
    });

    document.querySelectorAll('.nav-item:not(.nav-item-dropdown) > a, .nav-dropdown a').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.innerHTML = '\u2630';
      });
    });

    const closeOtherDropdowns = (currentItem) => {
      document.querySelectorAll('.nav-item-dropdown.open').forEach(item => {
        if (item !== currentItem) {
          item.classList.remove('open');
        }
      });
    };

    // Desktop dropdowns need a stable open state so the menu does not collapse
    // while moving from the nav label into the dropdown panel.
    document.querySelectorAll('.nav-item-dropdown').forEach(dropdownItem => {
      let closeTimer;
      const dropdownToggle = dropdownItem.querySelector(':scope > a');

      const openDropdown = () => {
        clearTimeout(closeTimer);
        closeOtherDropdowns(dropdownItem);
        dropdownItem.classList.add('open');
      };

      const scheduleClose = () => {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => {
          dropdownItem.classList.remove('open');
        }, 220);
      };

      dropdownItem.addEventListener('mouseenter', () => {
        if (window.innerWidth > 992) openDropdown();
      });

      dropdownItem.addEventListener('mouseleave', () => {
        if (window.innerWidth > 992) scheduleClose();
      });

      dropdownItem.addEventListener('focusin', openDropdown);
      dropdownItem.addEventListener('focusout', scheduleClose);

      if (dropdownToggle) {
        dropdownToggle.addEventListener('click', (e) => {
          if (window.innerWidth > 992) {
            e.preventDefault();
            e.stopPropagation();
            if (dropdownItem.classList.contains('open')) {
              dropdownItem.classList.remove('open');
            } else {
              openDropdown();
            }
          }
        });
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-item-dropdown')) {
        document.querySelectorAll('.nav-item-dropdown.open').forEach(item => {
          item.classList.remove('open');
        });
      }
    });

    // Mobile dropdown toggle functionality
    document.querySelectorAll('.nav-item-dropdown > a').forEach(dropdownToggle => {
      dropdownToggle.addEventListener('click', (e) => {
        if (window.innerWidth <= 992) {
          e.preventDefault();
          e.stopPropagation();
          const parentItem = dropdownToggle.closest('.nav-item-dropdown');
          
          // Close other open dropdowns
          closeOtherDropdowns(parentItem);
          
          // Toggle current dropdown
          parentItem.classList.toggle('open');
        }
      });
    });
  }

  initPageTransition();
}

function initPageTransition() {
  const main = document.getElementById('main-content');
  if (main) {
    main.classList.add('page-transition');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        main.classList.add('page-transition-active');
      });
    });
  }
}

function setupScrollTopBtn() {
  const btn = document.getElementById('scroll-top-btn');
  if (!btn) return;

  const toggle = () => {
    btn.classList.toggle('visible', window.scrollY > 300);
  };

  window.addEventListener('scroll', () => {
    if (!window._scrollTicking) {
      requestAnimationFrame(() => {
        toggle();
        window._scrollTicking = false;
      });
      window._scrollTicking = true;
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function saveScroll() {
  sessionStorage.setItem('scrollY_' + window.location.pathname, window.scrollY);
}

function restoreScroll() {
  const saved = sessionStorage.getItem('scrollY_' + window.location.pathname);
  if (saved) {
    sessionStorage.removeItem('scrollY_' + window.location.pathname);
    const y = parseInt(saved, 10);
    const tryScroll = (n) => {
      if (n > 20) return;
      if (document.body.scrollHeight > y) { window.scrollTo(0, y); return; }
      setTimeout(() => tryScroll(n + 1), 50);
    };
    tryScroll(0);
  }
}
