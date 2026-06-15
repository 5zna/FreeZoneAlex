import { API_BASE_URL } from '../core/constants.js';
import { fetchOrgs, getCachedOrgs, getOrgsForUser } from './orgHandler.js';
import { getCurrentLanguage, getTranslation, translateStaticContent } from './translationHandler.js';

function getHeaderRoleBadge(role, lang) {
  if (currentUserIsOwner) return ' ' + OWNER_CROWN_GLOBAL;
  if (!role || role === 'user') return '';
  
  let label = '';
  let cls = '';
  if (role === 'developer') {
    label = lang === 'ar' ? 'مطور' : 'DEV';
    cls = 'developer';
  } else if (role === 'admin') {
    label = lang === 'ar' ? 'ادمن' : 'ADMIN';
    cls = 'admin';
  } else if (role === 'moderator') {
    label = lang === 'ar' ? 'مشرف' : 'MOD';
    cls = 'moderator';
  }
  return ` <span class="dashboard-role-badge ${cls}" style="font-size:0.65rem;padding:2px 8px;margin-inline-start:6px;vertical-align:middle;display:inline-flex;height:auto;line-height:1">${label}</span>`;
}

function getTranslatedHeaderRoleBadge(role, lang) {
  if (currentUserIsOwner) return ' ' + OWNER_CROWN_GLOBAL;
  if (!role || role === 'user') return '';
  const roleKeys = {
    developer: 'badge_developer',
    admin: 'badge_admin',
    moderator: 'badge_moderator'
  };
  const cls = role === 'developer' || role === 'admin' || role === 'moderator' ? role : '';
  const label = roleKeys[role] ? getTranslation(roleKeys[role], lang) : '';
  if (!cls || !label) return '';
  return ` <span class="dashboard-role-badge ${cls}" style="font-size:0.65rem;padding:2px 8px;margin-inline-start:6px;vertical-align:middle;display:inline-flex;height:auto;line-height:1">${label}</span>`;
}

const BACKEND_ORIGIN = API_BASE_URL.replace('/api', '');
const IDENTITY_KEY = 'freezoneActiveIdentity';

let user = null;
let listeners = [];
let activeIdentity = null;
let wasLoggedIn = false;

export function showToast(msg) {
  var t = document.getElementById('global-toast');
  if (!t) { t = document.createElement('div'); t.id = 'global-toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(function(){t.classList.remove('show')}, 3000);
}

var CONTACT_EMAIL = 'admin@freezone.com';

function showStatusModal(title, message, isWarning) {
  var existing = document.getElementById('status-modal');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'status-modal';
  var iconColor = isWarning ? '#eab308' : '#dc2626';
  var iconSvg = isWarning 
    ? '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="' + iconColor + '" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    : '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="' + iconColor + '" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>';
  
  var contactText = getTranslation('auth_status_contact', getCurrentLanguage());
  overlay.innerHTML = '<div class="modal-container" style="max-width:420px;text-align:center;padding:32px"><button class="modal-close-btn" type="button" id="status-modal-close"><i class="fas fa-times"></i></button><div style="margin:16px 0 8px">' + iconSvg + '</div><h3 style="margin:8px 0;font-size:1.2rem;color:' + iconColor + '">' + title + '</h3><p style="margin:8px 0;color:var(--text-muted);font-size:0.9rem">' + message + '</p><p style="margin:16px 0 0;font-size:0.8rem;color:var(--text-muted)">' + contactText + '<br><a href="mailto:' + CONTACT_EMAIL + '" style="color:var(--color-primary)">' + CONTACT_EMAIL + '</a></p></div>';
  document.body.appendChild(overlay);
  var closeBtn = document.getElementById('status-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', function() { overlay.remove(); });
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}

export function getCurrentUser() {
  return user;
}

export function isAdmin() {
  return user && (user.role === 'admin' || user.role === 'developer' || currentUserIsOwner);
}

export function isDeveloper() {
  return user && user.role === 'developer';
}

export function updateDashboardBtn() {
  var btn = document.getElementById('auth-dashboard-btn');
  if (!btn) return;
  var show = isDeveloper() || currentUserIsOwner || (user && (user.role === 'admin' || user.role === 'moderator')) || currentUserHasAnyRole;
  btn.style.display = show ? '' : 'none';
}

export function getActiveIdentity() {
  return activeIdentity;
}

export function setActiveIdentity(identity) {
  activeIdentity = identity;
  if (identity) {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } else {
    localStorage.removeItem(IDENTITY_KEY);
  }
  window.dispatchEvent(new CustomEvent('identityChanged', { detail: identity }));
}

function loadActiveIdentity() {
  try {
    const saved = localStorage.getItem(IDENTITY_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

export function initAuthHandler() {
  var p = new URLSearchParams(window.location.search);
  if (p.get('banned')) {
    showStatusModal('Account Banned', p.get('reason') ? 'Reason: ' + p.get('reason') : 'Your account has been banned', false);
    window.history.replaceState({}, '', window.location.pathname);
  } else if (p.get('suspended')) {
    showStatusModal('Account Suspended', p.get('reason') ? 'Reason: ' + p.get('reason') : 'Your account is temporarily suspended', true);
    window.history.replaceState({}, '', window.location.pathname);
  }

  fetchUser();
  checkSiteAlert();

  setupUserDropdown();
  setupLogout();
  setupIdentitySwitcher();

  document.querySelectorAll('.auth-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openAuthModal();
    });
  });

  document.querySelectorAll('.auth-google-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = `${API_BASE_URL}/auth/google`;
    });
  });

  document.querySelectorAll('.auth-fb-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = `${API_BASE_URL}/auth/facebook`;
    });
  });

  window.addEventListener('identityChanged', async () => {
    if (user) updateAuthUI();
    const overlay = document.getElementById('auth-switcher-overlay');
    if (overlay && overlay.classList.contains('open')) {
      await fetchOrgs();
      renderIdentitySwitcher();
    }
  });

  window.addEventListener('langChanged', () => {
    if (!user) return;
    updateAuthUI();
    const overlay = document.getElementById('auth-switcher-overlay');
    if (overlay && overlay.classList.contains('open')) renderIdentitySwitcher();
  });
}

export function onAuthChange(fn) {
  listeners.push(fn);
  if (user) fn(user);
}

function notify() {
  listeners.forEach(fn => fn(user));
}

export async function refreshUser() {
  return fetchUser();
}

var _alertBar = null;
var _settingsCache = null;
var _settingsPromise = null;

export function getCachedSettings() {
  if (_settingsCache) return Promise.resolve(_settingsCache);
  if (_settingsPromise) return _settingsPromise;
  _settingsPromise = fetch(API_BASE_URL + '/settings', { credentials: 'include' })
    .then(function(r) { if (r.ok) return r.json(); throw new Error(); })
    .then(function(data) {
      _settingsCache = data;
      _settingsPromise = null;
      return data;
    })
    .catch(function(err) {
      _settingsPromise = null;
      throw err;
    });
  return _settingsPromise;
}

export function checkSiteAlert() {
  getCachedSettings()
    .then(function(data) {
      var alertText = data.settings && data.settings.alert ? data.settings.alert.trim() : '';
      var faviconUrl = data.settings && data.settings.favicon ? data.settings.favicon : '';
      if (faviconUrl) { updateFaviconTag(faviconUrl); updateHeroLogo(faviconUrl); }
      if (!alertText) {
        if (_alertBar) { _alertBar.remove(); _alertBar = null; }
        return;
      }
      if (_alertBar) return;
      _alertBar = document.createElement('div');
      _alertBar.id = 'site-alert-bar';
      _alertBar.style.cssText = 'position:sticky;top:0;z-index:9999;padding:10px 16px;background:#dc2626;color:#fff;text-align:center;font-size:0.85rem;font-weight:500;display:flex;align-items:center;justify-content:center;gap:8px';
      _alertBar.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg><span style="flex:1">' + alertText + '</span><button type="button" style="background:transparent;border:none;color:#fff;font-size:1.2rem;cursor:pointer;padding:0 4px;line-height:1" id="site-alert-dismiss">&times;</button>';
      document.body.insertBefore(_alertBar, document.body.firstChild);
      document.getElementById('site-alert-dismiss').addEventListener('click', function() { _alertBar.remove(); _alertBar = null; });
    })
    .catch(function() {
      if (_alertBar) { _alertBar.remove(); _alertBar = null; }
    });
}

function updateFaviconTag(dataUrl) {
  var tag = document.querySelector('link[rel="icon"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = 'icon';
    tag.type = 'image/x-icon';
    document.head.appendChild(tag);
  }
  tag.href = dataUrl;
}

function updateHeroLogo(dataUrl) {
  var logo = document.querySelector('.hero-card-logo');
  if (!logo) return;
  var img = document.createElement('img');
  img.src = dataUrl;
  img.alt = 'logo';
  img.style.cssText = 'width:48px;height:48px;border-radius:12px;display:inline-block;object-fit:contain';
  logo.textContent = '';
  logo.appendChild(img);
}

function isUserVerified() {
  return user && user.verified === true;
}

export const VERIFIED_TICK = '<svg viewBox="0 0 24 24" style="width:16px;height:16px;vertical-align:middle;display:inline-block;fill:#3b82f6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
export const OWNER_CROWN_GLOBAL = '<svg viewBox="0 0 24 24" style="width:16px;height:16px;vertical-align:middle;display:inline-block;fill:#fbbf24;margin-top:-3px"><path d="M2 19h20v3H2v-3zM3.3 5.5L8 13l4-7 4 7 4.7-7.5L22 16H2l1.3-10.5z"/></svg>';
export let currentUserIsOwner = false;
export let currentUserHasAnyRole = false;

function getAvatarUrl(avatar) {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:')) return avatar;
  return avatar.startsWith('/') ? `${BACKEND_ORIGIN}${avatar}` : `${BACKEND_ORIGIN}/${avatar}`;
}

async function fetchUser() {
  try {
    const res = await fetch(`${API_BASE_URL}/me`, { credentials: 'include' });
    let data;
    try { data = await res.json(); } catch(e) {}
    
    if (data && data.banned) {
      showStatusModal('Account Banned', data.banReason ? 'Reason: ' + data.banReason : 'Your account has been banned', false);
      user = null;
      throw new Error('Banned');
    }
    
    if (data && data.suspended) {
      showStatusModal('Account Suspended', data.timeoutReason ? 'Reason: ' + data.timeoutReason : 'Your account is temporarily suspended', true);
      user = null;
      throw new Error('Suspended');
    }
    
    if (!res.ok || !data) throw new Error('Not authenticated');
    user = data.user;

    const rolesPromise = fetch(API_BASE_URL + '/member-roles/me', { credentials: 'include' })
      .then(async (mr) => {
        if (!mr.ok) return null;
        const mrData = await mr.json();
        return mrData.roles || (mrData.role ? [mrData.role] : []);
      })
      .catch(() => null);

    const orgsPromise = fetchOrgs().catch(() => []);

    try {
      const roles = await rolesPromise;
      if (Array.isArray(roles)) {
        currentUserIsOwner = roles.some(r => r && r.name && r.name.charAt(0) === '@');
        currentUserHasAnyRole = roles.length > 0;
      } else {
        currentUserIsOwner = false;
        currentUserHasAnyRole = false;
      }
    } catch {
      currentUserIsOwner = false;
      currentUserHasAnyRole = false;
    }

    if (!wasLoggedIn) {
      wasLoggedIn = true;
      const p = new URLSearchParams(window.location.search);
      var linked = p.get('linked');
      var justLoggedIn = p.get('login');
      if (linked) {
        showToast(linked.charAt(0).toUpperCase() + linked.slice(1) + ' linked');
        window.history.replaceState({}, '', window.location.pathname);
      } else if (justLoggedIn) {
        var name = user.displayName || user.name || '';
        if (name) showToast('Logged in as ' + name);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
    activeIdentity = loadActiveIdentity();
    await orgsPromise;
    if (activeIdentity && activeIdentity.type === 'organization') {
      const serverOrgs = getCachedOrgs();
      const exists = serverOrgs.some(o => o._id === activeIdentity.id);
      if (!exists) {
        activeIdentity = { type: 'user', id: user._id };
        localStorage.setItem(IDENTITY_KEY, JSON.stringify(activeIdentity));
      }
    }
    updateAuthUI();
    notify();
    window.dispatchEvent(new CustomEvent('identityChanged'));
    if (!user.username) showUsernamePrompt();
  } catch {
    user = null;
    currentUserIsOwner = false;
    currentUserHasAnyRole = false;
    activeIdentity = null;
    localStorage.removeItem(IDENTITY_KEY);
    updateAuthUI();
    notify();
    window.dispatchEvent(new CustomEvent('identityChanged'));
  }
}

function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.add('open');
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.remove('open');
}

function setupUserDropdown() {
  const menuBtn = document.getElementById('auth-user-menu-btn');
  const dropdown = document.getElementById('auth-user-dropdown');
  if (!menuBtn || !dropdown) return;

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== menuBtn) {
      dropdown.classList.remove('open');
    }
  });
}

function setupLogout() {
  document.addEventListener('click', (e) => {
    const dashBtn = e.target.closest('#auth-dashboard-btn');
    if (dashBtn) { e.preventDefault(); window.location.href = '/dashboard'; return; }
    const btn = e.target.closest('#auth-logout-btn');
    if (!btn) return;
    e.preventDefault();
    window.location.href = `${API_BASE_URL}/auth/logout`;
  });

  const closeBtn = document.getElementById('auth-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeAuthModal);
  }

  const overlay = document.getElementById('auth-modal');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAuthModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAuthModal();
  });
}

function getActiveIdentityDisplay() {
  if (!user) return null;
  if (activeIdentity && activeIdentity.type === 'organization') {
    try {
      const serverOrgs = getCachedOrgs();
      const org = serverOrgs.find(o => o._id === activeIdentity.id);
      if (org) return { name: org.name, avatar: org.avatar || '', verified: !!org.verified, isOrg: true };
    } catch {}
  }
  return { name: user.displayName || user.name, username: user.username, avatar: user.avatar, verified: isUserVerified(), isOrg: false };
}

function updateAuthUI() {
  updateDashboardBtn();
  document.querySelectorAll('.auth-guest').forEach(el => {
    el.classList.toggle('hidden', !!user);
  });

  document.querySelectorAll('.auth-user').forEach(el => {
    el.classList.toggle('hidden', !user);
  });

  document.querySelectorAll('.notif-wrapper').forEach(el => {
    el.classList.toggle('hidden', !user);
  });

  if (user) {
    const identity = getActiveIdentityDisplay();

    document.querySelectorAll('.auth-user-name').forEach(el => {
      var idBadge = '';
      if (identity && !identity.isOrg) {
        idBadge = getTranslatedHeaderRoleBadge(user.role, getCurrentLanguage());
        if (!idBadge && identity.verified) {
          idBadge = ' ' + VERIFIED_TICK;
        }
      } else if (identity && identity.verified) {
        idBadge = ' ' + VERIFIED_TICK;
      }
      el.innerHTML = (identity ? identity.name : '') + idBadge;
    });

    document.querySelectorAll('.auth-user-avatar').forEach(el => {
      const avatarUrl = identity && identity.avatar ? (identity.avatar.startsWith('data:') || identity.avatar.startsWith('http') ? identity.avatar : getAvatarUrl(identity.avatar)) : null;
      if (avatarUrl) {
        var fallbackLetter = (identity ? identity.name : '?').charAt(0).toUpperCase();
        el.innerHTML = `<img src="${avatarUrl}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="try{this.outerHTML='${fallbackLetter}'}catch(e){}">`;
      } else {
        el.textContent = (identity ? identity.name : '?').charAt(0).toUpperCase();
      }
    });

    document.querySelectorAll('.auth-current-label').forEach(el => {
      el.removeAttribute('data-i18n');
      el.textContent = identity && identity.isOrg
        ? getTranslation('common_organization', getCurrentLanguage())
        : (identity && identity.username ? '@' + identity.username : getTranslation('auth_account_label', getCurrentLanguage()));
    });

    updateOrgDropdownVisibility();
  }
}

function getUserOrgs() {
  if (!user) return [];
  const serverOrgs = getCachedOrgs();
  if (serverOrgs.length > 0) return getOrgsForUser(user);
  return [];
}

function renderIdentitySwitcher() {
  const body = document.getElementById('auth-switcher-body');
  if (!body) return;

  const userOrgs = getUserOrgs();
  let html = '<div class="auth-switcher-group-label">Account</div>';

  const isUserActive = !activeIdentity || activeIdentity.type === 'user';
  const userName = user ? (user.displayName || user.name || 'Account') : 'Account';
  const userAvatar = user ? getAvatarUrl(user.avatar) : null;
  const userInitial = userName.charAt(0).toUpperCase();
  const userVerified = isUserVerified();

  html += '<button class="auth-switcher-item' + (isUserActive ? ' active' : '') + '" data-switch-to="user">';
  html += '<span class="auth-switcher-avatar">' + (userAvatar ? '<img src="' + userAvatar + '" alt="" onerror="try{this.outerHTML=\'' + userInitial + '\'}catch(e){}">' : userInitial) + '</span>';
  let roleBadge = '';
  if (user) {
    roleBadge = getTranslatedHeaderRoleBadge(user.role, getCurrentLanguage());
    if (!roleBadge && userVerified) {
      roleBadge = ' ' + VERIFIED_TICK;
    }
  }
  html += '<span class="auth-switcher-item-name">' + userName + roleBadge + '</span>';
  html += '</button>';

  if (userOrgs.length > 0) {
    html += '<div class="auth-switcher-group-label" style="margin-top: 8px;">Organizations</div>';
    userOrgs.forEach(o => {
      const orgId = o._id || o.id;
      const isActive = activeIdentity && activeIdentity.type === 'organization' && activeIdentity.id === orgId;
      const oInitial = (o.name || 'O').charAt(0).toUpperCase();
      const tick = o.verified ? VERIFIED_TICK : '';
      const orgAvatar = o.avatar ? (o.avatar.startsWith('http') || o.avatar.startsWith('data:') ? o.avatar : getAvatarUrl(o.avatar)) : null;
      html += '<button class="auth-switcher-item' + (isActive ? ' active' : '') + '" data-org-id="' + orgId + '">';
      html += '<span class="auth-switcher-avatar">' + (orgAvatar ? '<img src="' + orgAvatar + '" alt="" onerror="try{this.outerHTML=\'' + oInitial + '\'}catch(e){}">' : oInitial) + '</span>';
      html += '<span class="auth-switcher-item-name">' + (o.name || 'Organization') + tick + '</span>';
      html += '</button>';
    });
  }

  body.innerHTML = html;

  body.querySelectorAll('.auth-switcher-item').forEach(item => {
    item.addEventListener('click', () => {
      closeIdentitySwitcher();
      if (item.dataset.switchTo === 'user') {
        setActiveIdentity({ type: 'user', id: user ? user._id : null });
      } else {
        const orgId = item.dataset.orgId;
        const org = userOrgs.find(o => (o._id || o.id) === orgId);
        if (org) setActiveIdentity({ type: 'organization', id: org._id || org.id });
      }
    });
  });
}

async function openIdentitySwitcher() {
  const dropdown = document.getElementById('auth-user-dropdown');
  if (dropdown) dropdown.classList.remove('open');
  await fetchOrgs();
  renderIdentitySwitcher();
  const overlay = document.getElementById('auth-switcher-overlay');
  if (overlay) overlay.classList.add('open');
}

function closeIdentitySwitcher() {
  const overlay = document.getElementById('auth-switcher-overlay');
  if (overlay) overlay.classList.remove('open');
}

function setupIdentitySwitcher() {
  const switchBtn = document.getElementById('auth-switch-identity-btn');
  const closeBtn = document.getElementById('auth-switcher-close');
  const backdrop = document.getElementById('auth-switcher-backdrop');
  const overlay = document.getElementById('auth-switcher-overlay');

  if (switchBtn) switchBtn.addEventListener('click', openIdentitySwitcher);
  if (closeBtn) closeBtn.addEventListener('click', closeIdentitySwitcher);
  if (backdrop) backdrop.addEventListener('click', closeIdentitySwitcher);
  if (overlay) overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeIdentitySwitcher(); });
}

function updateOrgDropdownVisibility() {
  const switchBtn = document.getElementById('auth-switch-identity-btn');
  if (switchBtn) {
    switchBtn.classList.remove('hidden');
  }
}

function showUsernamePrompt() {
  let modal = document.getElementById('username-prompt-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'username-prompt-modal';
    modal.className = 'auth-modal dev-modal';
    modal.innerHTML = `
      <div class="auth-modal-backdrop"></div>
      <div class="auth-modal-container">
        <button class="auth-modal-close" aria-label="Close" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <div class="auth-modal-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <h3 class="auth-modal-title" data-i18n="username_prompt_title">Choose a Username</h3>
        <p class="auth-modal-subtitle" data-i18n="username_prompt_subtitle">This will be your unique @handle</p>
        <input type="text" class="dev-key-input" id="username-prompt-input" data-i18n-placeholder="username_prompt_placeholder" placeholder="e.g. john_doe" maxlength="30" autocomplete="off" style="margin-top:12px;font-family:inherit;text-align:left;letter-spacing:normal;font-size:0.95rem">
        <div class="dev-error" id="username-prompt-error" style="display:none"></div>
        <button class="dev-submit-btn" id="username-prompt-save-btn" data-i18n="profile_save_username" style="margin-top:8px">Save Username</button>
      </div>`;
    document.body.appendChild(modal);
    translateStaticContent(getCurrentLanguage());
    modal.querySelector('.auth-modal-close').addEventListener('click', () => closeUsernamePrompt());
    modal.querySelector('.auth-modal-backdrop').addEventListener('click', () => closeUsernamePrompt());
  }
  const input = document.getElementById('username-prompt-input');
  if (input) { input.value = ''; input.focus(); }
  const err = document.getElementById('username-prompt-error');
  if (err) err.style.display = 'none';
  modal.classList.add('open');
  document.getElementById('username-prompt-save-btn').onclick = saveUsernamePrompt;
  input.onkeydown = (e) => { if (e.key === 'Enter') saveUsernamePrompt(); };
}

function closeUsernamePrompt() {
  const modal = document.getElementById('username-prompt-modal');
  if (modal) modal.classList.remove('open');
}

async function saveUsernamePrompt() {
  const input = document.getElementById('username-prompt-input');
  const err = document.getElementById('username-prompt-error');
  const btn = document.getElementById('username-prompt-save-btn');
  if (!input || !err || !btn) return;
  const username = input.value.trim();
  if (!username || !/^[a-z0-9_-]+$/i.test(username)) {
    err.textContent = 'Username must contain only letters, numbers, underscores and hyphens';
    err.style.display = 'block';
    return;
  }
  if (username.length < 2 || username.length > 30) {
    err.textContent = 'Username must be between 2 and 30 characters';
    err.style.display = 'block';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Saving...';
  try {
    const res = await fetch(`${API_BASE_URL}/user/username`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const data = await res.json();
    if (!res.ok) {
      err.textContent = data.message || 'Failed to save username';
      err.style.display = 'block';
      return;
    }
    user = data.user;
    updateAuthUI();
    notify();
    window.dispatchEvent(new CustomEvent('identityChanged'));
    closeUsernamePrompt();
  } catch {
    err.textContent = 'Connection error';
    err.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Username';
  }
}
