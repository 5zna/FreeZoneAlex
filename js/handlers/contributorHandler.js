import { API_BASE_URL } from '../core/constants.js';
import { onAuthChange, VERIFIED_TICK } from './authHandler.js';
import { getCurrentLanguage } from './translationHandler.js';

var isDev = false;

export function initContributorHandler() {
  if (!window.location.pathname.match(/\/contributors(\/|$|\.html)/)) return;

  onAuthChange(function(user) {
    isDev = user && user.role === 'developer';
    loadCategories();
  });
}

async function loadCategories() {
  try {
    var container = document.getElementById('contributor-grid');
    if (!container) return;
    var res = await fetch(API_BASE_URL + '/contributors/categories');
    var categories = await res.json();
    renderCategories(categories);
  } catch (err) {
    console.error('Failed to load categories', err);
  }
}

function renderCategories(categories) {
  var container = document.getElementById('contributor-grid');
  var header = container ? container.closest('section').querySelector('.section-header') : null;
  if (!container) return;

  if (categories.length === 0) {
    container.innerHTML = '<div class="glass-panel" style="padding:40px;text-align:center;border-radius:var(--radius-md)"><p style="color:var(--text-muted)" data-i18n="contributors_empty">No contributors yet</p></div>';
  } else {
    container.innerHTML = categories.map(function(cat) {
      var entriesHtml = cat.entries && cat.entries.length > 0
        ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;width:100%">' + cat.entries.map(function(e) {
            var name = e.user ? (e.user.displayName || e.user.name || 'User') : 'Unknown';
            var username = e.user && e.user.username ? '@' + e.user.username : '';
            var isVerified = e.user && e.user.verified;
            var verifiedBadge = isVerified ? '<img src="/assets/icons/verified.svg" style="width:14px;height:14px;vertical-align:middle;display:inline-block">' : '';
            var role = e.user && e.user.role ? e.user.role : '';
            var roleBadge = role ? getRoleBadge(role) : '';
            var avatarSize = 56;
            var avatar = e.user && e.user.avatar
              ? '<img src="' + e.user.avatar + '" alt="" style="width:' + avatarSize + 'px;height:' + avatarSize + 'px;border-radius:50%;object-fit:cover;flex-shrink:0;margin:0 auto 8px" onerror="try{this.outerHTML=\'<div style=&quot;width:' + avatarSize + 'px;height:' + avatarSize + 'px;border-radius:50%;background:var(--color-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;flex-shrink:0;margin:0 auto 8px&quot;>' + name.charAt(0).toUpperCase() + '</div>\'}catch(ex){}">'
              : '<div style="width:' + avatarSize + 'px;height:' + avatarSize + 'px;border-radius:50%;background:var(--color-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;flex-shrink:0;margin:0 auto 8px">' + name.charAt(0).toUpperCase() + '</div>';
            var desc = e.description ? '<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:6px;line-height:1.4">' + escapeHtml(e.description) + '</div>' : '';
            var userId = e.user ? e.user._id : '';
            return '<div class="contributor-entry" style="text-align:center;padding:16px 12px;border:1px solid var(--border-color);border-radius:var(--radius-md);background:var(--bg-glass);cursor:pointer" data-user-id="' + escapeHtml(userId) + '" data-user-name="' + escapeHtml(name) + '" data-user-username="' + escapeHtml(e.user ? e.user.username : '') + '" data-user-avatar="' + escapeHtml(e.user ? e.user.avatar : '') + '" data-user-role="' + escapeHtml(e.user ? e.user.role : '') + '" data-user-verified="' + (e.user && e.user.verified ? '1' : '0') + '" data-desc="' + escapeHtml(e.description || '') + '">' + avatar + '<div style="font-weight:700;font-size:0.9rem;display:flex;align-items:center;justify-content:center;gap:4px"><span>' + escapeHtml(name) + '</span>' + verifiedBadge + '</div><div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">' + username + '</div>' + roleBadge + desc + '</div>';
          }).join('') + '</div>'
        : '<div style="width:100%;text-align:center;padding:20px 0;color:var(--text-muted);font-size:0.85rem" data-i18n="contributors_no_members">No members</div>';
      var iconHtml = cat.icon
        ? '<img src="' + cat.icon + '" alt="" style="width:32px;height:32px;border-radius:8px;object-fit:cover;flex-shrink:0">'
        : '<div style="width:32px;height:32px;border-radius:8px;background:var(--bg-glass);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0"><i class="fas fa-users"></i></div>';
      var editAttr = isDev ? ' style="cursor:pointer" data-cat-id="' + cat._id + '"' : '';
      return '<div class="category-card" style="margin-bottom:24px"' + editAttr + '>'
        + '<div class="glass-panel" style="padding:16px 24px;border-radius:var(--radius-md) var(--radius-md) 0 0;display:flex;align-items:center;gap:14px;border-bottom:2px solid var(--color-primary)">'
        + iconHtml + '<h3 style="font-size:1rem;font-weight:700">' + escapeHtml(cat.name) + '</h3></div>'
        + '<div class="glass-panel" style="padding:16px 20px;border-radius:0 0 var(--radius-md) var(--radius-md);min-height:60px">'
        + entriesHtml + '</div></div>';
    }).join('');
  }

  if (header) {
    var existing = header.querySelector('.add-category-btn');
    if (isDev && !existing) {
      var btn = document.createElement('button');
      btn.className = 'btn btn-primary add-category-btn';
      btn.setAttribute('data-i18n', 'contributors_add_category');
      btn.textContent = 'Add Category';
      btn.style.marginTop = '16px';
      btn.addEventListener('click', openAddModal);
      header.appendChild(btn);
    } else if (!isDev && existing) {
      existing.remove();
    }
  }

  if (isDev) {
    container.querySelectorAll('.category-card').forEach(function(card) {
      card.addEventListener('click', function() {
        var id = card.getAttribute('data-cat-id');
        if (id) openEditModal(id);
      });
    });
  }

  container.querySelectorAll('.contributor-entry').forEach(function(el) {
    el.addEventListener('click', function() {
      var userId = this.dataset.userId;
      if (!userId) return;
      openContributorProfile(
        userId,
        this.dataset.userName,
        this.dataset.userUsername,
        this.dataset.userAvatar,
        this.dataset.userRole,
        this.dataset.userVerified === '1',
        this.dataset.desc
      );
    });
  });
}

function openContributorProfile(userId, name, username, avatar, role, verified, description) {
  var existing = document.getElementById('contributor-profile-modal');
  if (existing) existing.remove();

  var isAr = getCurrentLanguage() === 'ar';
  var avatarHtml = avatar
    ? '<img src="' + avatar.replace(/'/g, "\\'") + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto 12px">'
    : '<div style="width:80px;height:80px;border-radius:50%;background:var(--color-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:700;margin:0 auto 12px">' + escapeHtml(name.charAt(0).toUpperCase()) + '</div>';

  var tickHtml = verified ? '<img src="/assets/icons/verified.svg" style="width:16px;height:16px;vertical-align:middle;display:inline-block">' : '';

  var roleBadge = role ? getRoleBadge(role) : '';
  var usernameHtml = username ? '<div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">@' + escapeHtml(username) + '</div>' : '';
  var descHtml = description ? '<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border-color);font-size:0.9rem;line-height:1.6;color:var(--text-secondary)">' + escapeHtml(description) + '</div>' : '';

  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'contributor-profile-modal';
  modal.innerHTML = '<div class="modal-container" style="max-width:400px">'
    + '<button class="modal-close-btn" id="contributor-profile-close" type="button"><i class="fas fa-times"></i></button>'
    + '<div class="modal-body" style="grid-template-columns:1fr;padding:32px;text-align:center">'
    + avatarHtml
    + '<div style="font-size:1.1rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px"><span>' + escapeHtml(name) + '</span>' + tickHtml + '</div>'
    + usernameHtml
    + '<div style="margin-top:8px">' + roleBadge + '</div>'
    + descHtml
    + '</div></div>';

  document.body.appendChild(modal);
  modal.classList.add('open');

  document.getElementById('contributor-profile-close').addEventListener('click', function () { modal.classList.remove('open'); setTimeout(function () { modal.remove(); }, 300); });
  modal.addEventListener('click', function (e) { if (e.target === modal) { modal.classList.remove('open'); setTimeout(function () { modal.remove(); }, 300); } });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderEntryRow(userId, name, avatar, desc) {
  var safeName = escapeHtml(name || 'User');
  var initial = escapeHtml((name || 'U').charAt(0).toUpperCase());
  var avatarHtml = avatar
    ? '<img src="' + escapeHtml(avatar) + '" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0">'
    : '<div style="width:28px;height:28px;border-radius:50%;background:var(--color-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0">' + initial + '</div>';
  var descHtml = desc
    ? '<p style="color:var(--text-secondary);font-size:0.75rem;margin-top:2px">' + escapeHtml(desc) + '</p>'
    : '';
  return '<div class="existing-entry" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--border-color);border-radius:var(--radius-sm);margin-bottom:6px">'
    + avatarHtml
    + '<div style="flex:1;font-size:0.85rem">' + safeName
    + '<input type="hidden" class="entry-user-id" value="' + escapeHtml(userId) + '">'
    + '<input type="hidden" class="entry-desc" value="' + escapeHtml(desc || '') + '">'
    + descHtml
    + '</div>'
    + '<button class="entry-remove-btn" style="color:var(--color-danger);font-size:0.8rem;padding:2px 6px;border-radius:4px">&times;</button>'
    + '</div>';
}

function getRoleBadge(role) {
  var label = role.charAt(0).toUpperCase() + role.slice(1);
  var cls = role === 'developer' ? 'developer' : role === 'admin' ? 'admin' : role === 'moderator' ? 'moderator' : role === 'owner' ? 'owner' : '';
  return '<span class="dashboard-role-badge ' + cls + '" style="display:inline-flex;margin-top:6px;font-size:0.7rem">' + label + '</span>';
}

function openAddModal() {
  openCategoryModal(null);
}

function openEditModal(id) {
  openCategoryModal(id);
}

var editingCategoryId = null;

async function openCategoryModal(catId) {
  editingCategoryId = catId;
  var overlay = document.getElementById('category-modal');
  if (!overlay) return;

  var nameInput = document.getElementById('cat-name-input');
  var iconPreview = document.getElementById('cat-icon-preview');
  var iconInput = document.getElementById('cat-icon-input');
  var userSelect = document.getElementById('cat-user-select');
  var descInput = document.getElementById('cat-desc-input');
  var descWrap = document.getElementById('cat-desc-wrap');
  var saveBtn = document.getElementById('cat-save-btn');
  var deleteBtn = document.getElementById('cat-delete-btn');
  var title = document.getElementById('cat-modal-title');
  var entryList = document.getElementById('cat-entry-list');

  nameInput.value = '';
  iconPreview.style.display = 'none';
  iconInput.value = '';
  userSelect.innerHTML = '<option value="">' + (getCurrentLanguage && getCurrentLanguage() === 'ar' ? 'اختر مستخدم...' : 'Select a user...') + '</option>';
  descInput.value = '';
  descWrap.style.display = 'none';
  deleteBtn.style.display = 'none';
  entryList.innerHTML = '';

  if (title) {
    title.setAttribute('data-i18n', catId ? 'contributors_edit_category' : 'contributors_add_category');
    title.textContent = catId ? 'Edit Category' : 'Add Category';
  }

  if (catId) {
    try {
      var allCats = await fetch(API_BASE_URL + '/contributors/categories').then(function(r) { return r.json(); });
      var cat = allCats.find(function(c) { return c._id === catId; });
      if (cat) {
        nameInput.value = cat.name || '';
        if (cat.icon) { iconPreview.src = cat.icon; iconPreview.style.display = 'block'; }
        deleteBtn.style.display = 'inline-flex';
        if (cat.entries && cat.entries.length > 0) {
          entryList.innerHTML = cat.entries.map(function(e) {
            var name = e.user ? (e.user.displayName || e.user.name || 'User') : 'Unknown';
            var avatar = e.user && e.user.avatar ? e.user.avatar : '';
            return renderEntryRow(e.userId || '', name, avatar, e.description || '');
          }).join('');
          entryList.querySelectorAll('.entry-remove-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
              e.stopPropagation();
              btn.closest('.existing-entry').remove();
            });
          });
        }
      }
    } catch (err) {
      console.error('Failed to load category', err);
    }
  }

  loadUserSelect();
  overlay.classList.add('open');
}

async function loadUserSelect() {
  var select = document.getElementById('cat-user-select');
  if (!select) return;
  try {
    var res = await fetch(API_BASE_URL + '/contributors/users', { credentials: 'include' });
    if (!res.ok) return;
    var users = await res.json();
    select.innerHTML = '<option value="">' + (getCurrentLanguage && getCurrentLanguage() === 'ar' ? 'اختر مستخدم...' : 'Select a user...') + '</option>';
    users.forEach(function(u) {
      var opt = document.createElement('option');
      opt.value = u._id;
      opt.textContent = (u.name || '') + ' (@' + (u.username || 'unknown') + ')';
      opt.setAttribute('data-avatar', u.avatar || '');
      opt.setAttribute('data-name', u.name || 'User');
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load users', err);
  }
}

function setupCategoryModalUI() {
  var userSelect = document.getElementById('cat-user-select');
  var descWrap = document.getElementById('cat-desc-wrap');
  var descInput = document.getElementById('cat-desc-input');
  var iconInput = document.getElementById('cat-icon-input');
  var iconPreview = document.getElementById('cat-icon-preview');
  var saveBtn = document.getElementById('cat-save-btn');
  var deleteBtn = document.getElementById('cat-delete-btn');
  var cancelBtn = document.getElementById('cat-cancel-btn');
  var overlay = document.getElementById('category-modal');
  var addEntryBtn = document.getElementById('cat-add-entry-btn');

  if (userSelect) {
    userSelect.addEventListener('change', function() {
      if (userSelect.value) {
        descWrap.style.display = 'block';
      } else {
        descWrap.style.display = 'none';
        descInput.value = '';
      }
    });
  }

  if (iconInput) {
    iconInput.addEventListener('change', function() {
      var file = iconInput.files[0];
      if (!file) { iconPreview.style.display = 'none'; return; }
      var reader = new FileReader();
      reader.onload = function(e) { iconPreview.src = e.target.result; iconPreview.style.display = 'block'; };
      reader.readAsDataURL(file);
    });
  }

  if (addEntryBtn) {
    addEntryBtn.addEventListener('click', function() {
      var userId = userSelect.value;
      var desc = descInput.value.trim();
      if (!userId) return;
      var opt = userSelect.selectedOptions[0];
      var name = opt ? opt.getAttribute('data-name') || opt.textContent.split(' (')[0] : 'User';
      var avatar = opt ? opt.getAttribute('data-avatar') || '' : '';
      var list = document.getElementById('cat-entry-list');
      if (!list) return;
      var entryDiv = document.createElement('div');
      entryDiv.innerHTML = renderEntryRow(userId, name, avatar, desc);
      entryDiv = entryDiv.firstElementChild;
      entryDiv.querySelector('.entry-remove-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        entryDiv.remove();
      });
      list.appendChild(entryDiv);
      userSelect.value = '';
      descInput.value = '';
      descWrap.style.display = 'none';
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', saveCategory);
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteCategory);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() { overlay.classList.remove('open'); });
  }

  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  }
}

async function saveCategory() {
  var nameInput = document.getElementById('cat-name-input');
  var iconPreview = document.getElementById('cat-icon-preview');
  var entryList = document.getElementById('cat-entry-list');
  var overlay = document.getElementById('category-modal');

  var name = nameInput.value.trim();
  if (!name) { alert('Category name is required'); return; }

  var icon = iconPreview.style.display !== 'none' && iconPreview.src ? iconPreview.src : '';

  var entries = [];
  entryList.querySelectorAll('.existing-entry').forEach(function(el) {
    var userIdInput = el.querySelector('.entry-user-id');
    var descInput = el.querySelector('.entry-desc');
    if (userIdInput) {
      entries.push({ userId: userIdInput.value, description: descInput ? descInput.value : '' });
    }
  });

  var method = editingCategoryId ? 'PUT' : 'POST';
  var url = editingCategoryId
    ? API_BASE_URL + '/contributors/categories/' + editingCategoryId
    : API_BASE_URL + '/contributors/categories';

  try {
    var res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: name, icon: icon, entries: entries })
    });
    if (!res.ok) { alert('Failed to save category'); return; }
    overlay.classList.remove('open');
    loadCategories();
  } catch (err) {
    console.error('Failed to save category', err);
    alert('Failed to save category');
  }
}

async function deleteCategory() {
  if (!confirm('Delete this category?')) return;
  try {
    var res = await fetch(API_BASE_URL + '/contributors/categories/' + editingCategoryId, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) { alert('Failed to delete category'); return; }
    document.getElementById('category-modal').classList.remove('open');
    loadCategories();
  } catch (err) {
    console.error('Failed to delete category', err);
    alert('Failed to delete category');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  setupCategoryModalUI();
});
