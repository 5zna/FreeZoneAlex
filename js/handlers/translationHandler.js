import { en } from '../translations/en.js';
import { ar } from '../translations/ar.js';
import { LANG_STORAGE_KEY, DEFAULT_LANG } from '../core/constants.js';
import { debounce } from '../core/utils.js';

const dictionaries = { en, ar };

export function initTranslationHandler() {
  const langToggleBtns = document.querySelectorAll('.lang-toggle');
  const savedLang = localStorage.getItem(LANG_STORAGE_KEY) || DEFAULT_LANG;

  setLanguage(savedLang);

  langToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const currentLang = document.documentElement.getAttribute('lang') || DEFAULT_LANG;
      const newLang = currentLang === 'ar' ? 'en' : 'ar';
      setLanguage(newLang);
    });
  });
}

export function getCurrentLanguage() {
  return document.documentElement.getAttribute('lang') || DEFAULT_LANG;
}

function setLanguage(lang) {
  document.body.classList.add('dir-changing');

  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  localStorage.setItem(LANG_STORAGE_KEY, lang);

  translateStaticContent(lang);
  updateLangToggle(lang);

  window.dispatchEvent(new CustomEvent('langChanged', { detail: { lang } }));

  requestAnimationFrame(() => {
    document.body.classList.remove('dir-changing');
  });
}

export function translateStaticContent(lang) {
  const dict = dictionaries[lang];

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (!dict[key]) return;

    const textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (textNode && el.children.length > 0) {
      textNode.textContent = dict[key];
    } else {
      el.textContent = dict[key];
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });

  document.querySelectorAll('[data-i18n-value]').forEach(el => {
    const key = el.getAttribute('data-i18n-value');
    if (dict[key]) el.value = dict[key];
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key]) el.setAttribute('title', dict[key]);
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (dict[key]) el.setAttribute('aria-label', dict[key]);
  });

  document.querySelectorAll('[data-i18n-alt]').forEach(el => {
    const key = el.getAttribute('data-i18n-alt');
    if (dict[key]) el.setAttribute('alt', dict[key]);
  });
}

function updateLangToggle(lang) {
  document.querySelectorAll('.lang-toggle').forEach(btn => {
    if (lang === 'ar') {
      btn.innerHTML = `<svg width="20" height="14" viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#CE1126"/><rect y="13.33" width="60" height="13.33" fill="#fff"/><rect y="26.66" width="60" height="13.34" fill="#000"/></svg>`;
      btn.setAttribute('title', 'English');
    } else {
      btn.innerHTML = `<svg width="20" height="14" viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="40" fill="#012169"/><rect y="13.33" width="60" height="13.33" fill="#fff"/><rect x="60" y="13.33" width="60" height="13.33" fill="#C8102E" transform="translate(-60)"/><path d="M0 0l60 40M60 0L0 40" stroke="#fff" stroke-width="8" stroke-linecap="square"/><path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" stroke-width="4" stroke-linecap="square"/><path d="M0 20h60M30 0v40" stroke="#fff" stroke-width="10" stroke-linecap="square"/><path d="M0 20h60M30 0v40" stroke="#C8102E" stroke-width="5" stroke-linecap="square"/></svg>`;
      btn.setAttribute('title', 'عربي');
    }
  });
}

export function getTranslation(key, lang) {
  const l = lang || getCurrentLanguage();
  return dictionaries[l]?.[key] || key;
}
