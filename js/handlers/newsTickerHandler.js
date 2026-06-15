import { API_BASE_URL } from '../core/constants.js';

const ROTATION_DELAY = 4500;
const FADE_DELAY = 260;

export function initNewsTickerHandler() {
  const { ticker, track } = ensureTicker();
  if (!ticker || !track) return;

  window.addEventListener('newsTickerUpdated', (event) => {
    const news = Array.isArray(event.detail?.news) ? event.detail.news : [];
    renderTicker(ticker, track, news);
  });

  fetch(API_BASE_URL + '/settings', { credentials: 'include' })
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load settings');
      return res.json();
    })
    .then((data) => {
      const news = Array.isArray(data.settings?.news) ? data.settings.news : [];
      renderTicker(ticker, track, news);
    })
    .catch(() => {
      renderTicker(ticker, track, []);
    });
}

function renderTicker(ticker, track, items) {
  let news = shuffleItems(uniqueItems(items));
  clearTickerTimer(ticker);

  if (!news.length) {
    ticker.classList.remove('news-ticker-live');
    ticker.classList.add('news-ticker-empty');
    ticker.hidden = true;
    track.innerHTML = '';
    return;
  }
  ticker.hidden = false;
  ticker.classList.remove('news-ticker-empty');
  ticker.classList.add('news-ticker-live');

  let index = 0;
  const item = document.createElement('div');
  item.className = 'news-ticker-item';
  item.textContent = news[index];

  track.innerHTML = '';
  track.appendChild(item);
  requestAnimationFrame(() => item.classList.add('is-visible'));

  if (news.length > 1) {
    ticker._newsTickerTimer = window.setInterval(() => {
      item.classList.remove('is-visible');
      ticker._newsTickerFadeTimer = window.setTimeout(() => {
        index += 1;
        if (index >= news.length) {
          news = shuffleItems(news, news[news.length - 1]);
          index = 0;
        }
        item.textContent = news[index];
        requestAnimationFrame(() => item.classList.add('is-visible'));
      }, FADE_DELAY);
    }, ROTATION_DELAY);
  }
}

function ensureTicker() {
  let ticker = document.querySelector('.news-ticker');
  let track = ticker ? ticker.querySelector('.news-ticker-track') : null;
  if (ticker && track) return { ticker, track };

  const navbar = document.querySelector('.navbar');
  if (!navbar) return { ticker: null, track: null };

  ticker = document.createElement('div');
  ticker.className = 'news-ticker';
  track = document.createElement('div');
  track.className = 'news-ticker-track';
  ticker.appendChild(track);
  navbar.insertAdjacentElement('afterend', ticker);
  return { ticker, track };
}

function uniqueItems(items) {
  const seen = new Set();
  return items
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function shuffleItems(items, previousItem = '') {
  const shuffled = items.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  if (shuffled.length > 1 && shuffled[0] === previousItem) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

function clearTickerTimer(ticker) {
  if (ticker._newsTickerTimer) {
    window.clearInterval(ticker._newsTickerTimer);
    ticker._newsTickerTimer = null;
  }
  if (ticker._newsTickerFadeTimer) {
    window.clearTimeout(ticker._newsTickerFadeTimer);
    ticker._newsTickerFadeTimer = null;
  }
}
