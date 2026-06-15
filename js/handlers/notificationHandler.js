import { API_BASE_URL } from '../core/constants.js';
import { getCurrentUser } from './authHandler.js';
import { getCurrentLanguage } from './translationHandler.js';

/* Derive the backend origin (e.g. http://127.0.0.1:4000) from the API URL */
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

let notifications = [];
let unreadCount = 0;

export function initNotificationHandler() {
  const bell = document.getElementById('notif-bell');
  const dropdown = document.getElementById('notif-dropdown');
  if (!bell || !dropdown) return;

  let isOpen = false;

  async function fetchUnreadCount() {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      unreadCount = data.count || 0;
      updateBadge();
    } catch { unreadCount = 0; updateBadge(); }
  }

  async function fetchNotifications() {
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      notifications = data.notifications || [];
      renderDropdown();
    } catch { notifications = []; renderDropdown(); }
  }

  function updateBadge() {
    const badge = bell.querySelector('.notif-badge');
    if (!badge) return;
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  function renderDropdown() {
    const list = dropdown.querySelector('.notif-list');
    const empty = dropdown.querySelector('.notif-empty');
    const countEl = dropdown.querySelector('.notif-count');
    if (!list) return;

    if (countEl) countEl.textContent = notifications.length;

    if (notifications.length === 0) {
      list.innerHTML = '';
      if (empty) empty.style.display = '';
      return;
    }
    if (empty) empty.style.display = 'none';

    const lang = getCurrentLanguage();
    list.innerHTML = notifications.map(n => `
      <div class="notif-item ${n.read ? '' : 'notif-unread'}" data-id="${n._id}" data-link="${n.link || ''}">
        <div class="notif-item-content">
          <div class="notif-item-text">${n.message}</div>
          <div class="notif-item-time">${formatNotifTime(n.createdAt, lang)}</div>
        </div>
        ${n.read ? '' : '<button class="notif-mark-read" title="' + (lang === 'ar' ? 'تحديد كمقروء' : 'Mark as read') + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>'}
        <button class="notif-dismiss" title="${lang === 'ar' ? 'حذف' : 'Dismiss'}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </div>
    `).join('');

    list.querySelectorAll('.notif-mark-read').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.notif-item');
        if (!item) return;
        const id = item.dataset.id;
        await markAsRead(id);
        item.classList.remove('notif-unread');
        btn.remove();
        unreadCount = Math.max(0, unreadCount - 1);
        updateBadge();
      });
    });

    list.querySelectorAll('.notif-dismiss').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.notif-item');
        if (!item) return;
        const id = item.dataset.id;
        await deleteNotif(id);
        const wasUnread = item.classList.contains('notif-unread');
        item.remove();
        if (wasUnread) {
          unreadCount = Math.max(0, unreadCount - 1);
          updateBadge();
        }
        if (list.children.length === 0) {
          if (empty) empty.style.display = '';
          const countEl2 = dropdown.querySelector('.notif-count');
          if (countEl2) countEl2.textContent = '0';
        }
      });
    });

    list.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        const link = item.dataset.link;
        if (item.classList.contains('notif-unread')) {
          markAsRead(id);
          item.classList.remove('notif-unread');
          const markBtn = item.querySelector('.notif-mark-read');
          if (markBtn) markBtn.remove();
          unreadCount = Math.max(0, unreadCount - 1);
          updateBadge();
        }
        closeDropdown();
        if (link) {
          window.location.href = BACKEND_ORIGIN + link;
        }
      });
    });
  }

  async function markAsRead(id) {
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PUT', credentials: 'include' });
    } catch {}
  }

  async function deleteNotif(id) {
    try {
      await fetch(`${API_BASE_URL}/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
    } catch {}
  }

  function openDropdown() {
    isOpen = true;
    dropdown.classList.add('open');
    fetchNotifications();
  }

  function closeDropdown() {
    isOpen = false;
    dropdown.classList.remove('open');
  }

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen) { closeDropdown(); return; }
    openDropdown();
  });

  document.addEventListener('click', (e) => {
    if (isOpen && !dropdown.contains(e.target) && e.target !== bell && !bell.contains(e.target)) {
      closeDropdown();
    }
  });

  /* Mark all as read */
  const markAllBtn = dropdown.querySelector('.notif-mark-all');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async () => {
      try {
        await fetch(`${API_BASE_URL}/notifications/read-all`, { method: 'PUT', credentials: 'include' });
      } catch {}
      notifications.forEach(n => n.read = true);
      unreadCount = 0;
      updateBadge();
      renderDropdown();
    });
  }

  /* View all link */
  const viewAllBtn = dropdown.querySelector('.notif-view-all');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeDropdown();
    });
  }

  if (getCurrentUser()) {
    const loadInitialCount = () => fetchUnreadCount();
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadInitialCount, { timeout: 2000 });
    } else {
      window.setTimeout(loadInitialCount, 500);
    }
  }
  let pollInterval = setInterval(() => {
    if (document.hidden) return;
    if (getCurrentUser()) fetchUnreadCount();
  }, 60000);

  window.addEventListener('visibilitychange', () => {
    if (!document.hidden && getCurrentUser()) {
      fetchUnreadCount();
    }
  });

  window.addEventListener('identityChanged', () => {
    if (getCurrentUser()) {
      fetchUnreadCount();
    } else {
      unreadCount = 0;
      updateBadge();
      notifications = [];
      renderDropdown();
    }
  });
}

function formatNotifTime(dateStr, lang) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return lang === 'ar' ? 'الآن' : 'Just now';
  if (mins < 60) return mins + (lang === 'ar' ? ' دقيقة' : 'm');
  if (hours < 24) return hours + (lang === 'ar' ? ' ساعة' : 'h');
  if (days < 7) return days + (lang === 'ar' ? ' يوم' : 'd');
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
}
