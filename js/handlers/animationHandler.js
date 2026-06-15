import { ANIMATION_OBSERVER_MARGIN, ANIMATION_THRESHOLD } from '../core/constants.js';
import { shouldReduceAnimations, rAFThrottle } from '../core/utils.js';

export function initAnimationHandler() {
  const reduce = shouldReduceAnimations();

  if (reduce) {
    document.documentElement.classList.add('reduced-motion');
    document.querySelectorAll('.reveal-element').forEach(el => el.classList.add('revealed-no-anim'));
    return;
  }

  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal-element').forEach(el => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: ANIMATION_OBSERVER_MARGIN,
    threshold: ANIMATION_THRESHOLD
  });

  const scan = () => {
    document.querySelectorAll('.reveal-element').forEach(el => observer.observe(el));
  };

  scan();

  window.refreshScrollObserver = scan;

  window.addEventListener('resize', rAFThrottle(scan), { passive: true });
}
