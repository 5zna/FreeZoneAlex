import { API_BASE_URL } from '../core/constants.js';
import { VERIFIED_TICK, OWNER_CROWN_GLOBAL, getCurrentUser, isDeveloper, currentUserIsOwner, onAuthChange, showToast } from './authHandler.js';
import { fetchOrgs, getCachedOrgs, createOrg, updateOrg, deleteOrg, addMember, removeMember } from './orgHandler.js';
import { getRoleIconHtml } from './devHandler.js';
import { getCurrentLanguage, getTranslation } from './translationHandler.js';
import { openReportDetailModal } from '../core/utils.js';

const BACKEND_ORIGIN = API_BASE_URL.replace('/api', '');

function t(key) {
  return getTranslation(key, getCurrentLanguage());
}

let orgCreateModalApi = null;
let orgListRefreshCallback = null;
let rolesListRefreshCallback = null;
let orgEditorEditingId = null;
let orgEditorAvatarData = '';
let orgEditorOwnerSelectApi = null;


/* --- User select dropdown helper --- */
function buildUserSelect(container, users, selectedId, onChange) {
  let value = selectedId || '';
  const wrap = document.createElement('div');
  wrap.className = 'user-select-wrap';
  const hidden = document.createElement('input');
  hidden.type = 'hidden'; hidden.value = value;
  const trigger = document.createElement('div');
  trigger.className = 'user-select-trigger'; trigger.tabIndex = 0;
  trigger.setAttribute('role', 'combobox');
  const dropdown = document.createElement('div');
  dropdown.className = 'user-select-dropdown';
  wrap.append(hidden, trigger, dropdown);

  function getUser(id) { return users.find(u => u._id === id) || null; }
  function renderUserHtml(u) {
    if (!u) return '';
    const name = u.displayName || u.name || u.email || 'Unknown';
    const av = u.avatar;
    const avUrl = av ? (av.startsWith('http') || av.startsWith('data:') ? av : BACKEND_ORIGIN + av) : null;
    const img = avUrl ? `<img class="user-select-avatar" src="${avUrl}" alt="">` : `<div class="user-select-avatar-placeholder">${name.charAt(0).toUpperCase()}</div>`;
    return { img, name };
  }

  function renderTrigger() {
    const u = getUser(value);
    if (u) {
      const r = renderUserHtml(u);
      trigger.innerHTML = r.img + '<span class="user-select-name">' + r.name + '</span>';
    } else {
      trigger.innerHTML = '<span class="user-select-name" style="color:var(--text-muted)">' + (container.dataset.placeholder || t('dash_orgs_select_owner')) + '</span>';
    }
    trigger.innerHTML += '<svg class="user-select-trigger-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>';
  }

  function renderOptions() {
    if (users.length === 0) {
      dropdown.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:0.85rem;text-align:center">' + t('dashboard_empty') + '</div>';
      return;
    }
    dropdown.innerHTML = users.map(u => {
      const r = renderUserHtml(u);
      const sel = u._id === value ? ' selected' : '';
      return '<div class="user-select-option' + sel + '" data-id="' + u._id + '">' + r.img + '<span class="user-select-name">' + r.name + '</span>' + (u.username ? '<span class="user-select-username">@' + u.username + '</span>' : '') + '</div>';
    }).join('');
    dropdown.querySelectorAll('.user-select-option').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        value = el.dataset.id; hidden.value = value; renderTrigger(); close(); if (onChange) onChange(value);
      });
    });
  }

  function open() { dropdown.classList.add('open'); trigger.classList.add('open'); renderOptions(); }
  function close() { dropdown.classList.remove('open'); trigger.classList.remove('open'); }
  trigger.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.contains('open') ? close() : open(); });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dropdown.classList.contains('open') ? close() : open(); }
    if (e.key === 'Escape') close();
  });
  renderTrigger();
  container.innerHTML = ''; container.appendChild(wrap);
  return { getValue: () => value, setValue: (id) => { value = id; hidden.value = id; renderTrigger(); }, element: wrap };
}

function loadCachedUsers() { try { return JSON.parse(localStorage.getItem('dashCachedUsers') || '[]'); } catch { return []; } }

function renderMemberSelectChips(containerId, select) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const users = loadCachedUsers();
  const selected = Array.from(select.selectedOptions).map(o => o.value);
  const selectedUsers = users.filter(u => selected.includes(u._id));
  if (selectedUsers.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = selectedUsers.map(u => {
    const name = u.displayName || u.name || u.email || '';
    const av = u.avatar;
    const avUrl = av ? (av.startsWith('http') || av.startsWith('data:') ? av : BACKEND_ORIGIN + av) : null;
    const img = avUrl ? '<img src="' + avUrl + '" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--bg-glass)">' : '<div class="user-select-avatar-placeholder" style="width:20px;height:20px;font-size:0.65rem">' + name.charAt(0).toUpperCase() + '</div>';
    return '<span class="user-chip">' + img + name + '</span>';
  }).join('');
}

export async function initDashboardPage() {
  if (!document.querySelector('.dash-page')) return;
  localStorage.removeItem('dashStaffActions');
  await Promise.all([fetchOrgs(), loadMemberRoles(), loadCustomRoles()]);

  /* Capture orgs snapshot immediately (before fetchUser's background fetchOrgs can reset cachedOrgs) */
  var currentOrgs = getCachedOrgs();
  if (!currentOrgs || !currentOrgs.length) {
    try { var stored = sessionStorage.getItem('freezoneServerOrgs'); if (stored) currentOrgs = JSON.parse(stored); } catch {}
  }
  /* Ultimate fallback: fetch directly from API if snapshot and sessionStorage both empty */
  if (!currentOrgs || !currentOrgs.length) {
    try { var r2 = await fetch(API_BASE_URL + '/organizations', { credentials: 'include' }); if (r2.ok) { var d2 = await r2.json(); currentOrgs = d2.organizations || []; } } catch {}
  }

  await loadMembers();

  /* --- Standalone org render + edit (does not depend on setupOrganizations) --- */
  try {
    const orgListEl = document.getElementById('dash-orgs-list');
    if (orgListEl) {
      if (currentOrgs && currentOrgs.length) {
      orgListEl.innerHTML = currentOrgs.map(o => {
        const aurl = o.avatar && (o.avatar.startsWith('http') || o.avatar.startsWith('data:') ? o.avatar : BACKEND_ORIGIN + o.avatar);
        return '<div class="dash-org-item" data-id="' + o._id + '"><div class="dash-org-avatar-sm">' + (aurl ? '<img src="' + aurl + '" alt="">' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>') + '</div><div class="dash-org-info"><div class="dash-org-name"><span>' + o.name + '</span>' + (o.verified ? '<span class="org-verified-tick">' + VERIFIED_TICK + '</span>' : '') + '</div></div></div>';
      }).join('');
    }
    /* Standalone click-to-edit handler */
    if (!window.__orgEditWired) {
      window.__orgEditWired = true;
      orgListEl.addEventListener('click', function(e) {
        var item = e.target.closest('.dash-org-item');
        if (!item || !item.dataset.id) return;
        var id = item.dataset.id;
        orgEditorEditingId = id;
        if (window.__openOrgEditor) {
          window.__openOrgEditor(id);
          return;
        }
        var orgs = getCachedOrgs();
        var org = orgs.find(function(o) { return o._id === id; }) || null;
        if (!org) return;
        var m = document.getElementById('dash-org-editor-modal');
        var nameInp = document.getElementById('dash-org-name-input');
        var aboutInp = document.getElementById('dash-org-about-input');
        var vToggle = document.getElementById('dash-org-verified');
        var ownerWrap = document.getElementById('dash-org-owner-wrap');
        if (nameInp) nameInp.value = org.name || '';
        if (aboutInp) aboutInp.value = org.about || '';
        if (vToggle) vToggle.checked = !!org.verified;
        if (ownerWrap) { ownerWrap.innerHTML = ''; var users = loadCachedUsers(); var oid = (org.owner && typeof org.owner === 'object') ? org.owner._id : (org.owner || ''); buildUserSelect(ownerWrap, users, oid, function(){}); }
        var usernameInp = document.getElementById('dash-org-username-input');
        if (usernameInp) usernameInp.value = org.username || '';
        if (m) m.classList.add('open');
      });
    }
  }
  } catch(e) { console.error('Standalone org render error:', e); }

  setupTabs();
  filterTabsByRole();

  await loadStats();
  wireDashboardControls();
  await setupRolesTab();
  setupInboxTab();
  /* Wire modal close on overlay click / close button — independent of async setup */
  const roleModal = document.getElementById('dash-role-modal');
  if (roleModal) {
    const closeRoleBtn = document.getElementById('dash-role-modal-close');
    if (closeRoleBtn) closeRoleBtn.addEventListener('click', function() { roleModal.classList.remove('open'); });
    roleModal.addEventListener('click', function(e) { if (e.target === roleModal) roleModal.classList.remove('open'); });
  }

  /* Wire org modal closes */
  const orgCreateModal = document.getElementById('org-create-modal');
  if (orgCreateModal) {
    const closeOrgCreateBtn = document.getElementById('org-create-modal-close');
    if (closeOrgCreateBtn) closeOrgCreateBtn.addEventListener('click', function() { orgCreateModal.classList.remove('open'); });
    const cancelOrgCreateBtn = document.getElementById('org-create-cancel');
    if (cancelOrgCreateBtn) cancelOrgCreateBtn.addEventListener('click', function() { orgCreateModal.classList.remove('open'); });
    orgCreateModal.addEventListener('click', function(e) { if (e.target === orgCreateModal) orgCreateModal.classList.remove('open'); });
  }
  const orgEditorModal = document.getElementById('dash-org-editor-modal');
  if (orgEditorModal) {
    const closeOrgEditorBtn = document.getElementById('dash-org-editor-close');
    if (closeOrgEditorBtn) closeOrgEditorBtn.addEventListener('click', function() { orgEditorModal.classList.remove('open'); });
    const cancelOrgEditorBtn = document.getElementById('dash-cancel-org');
    if (cancelOrgEditorBtn) cancelOrgEditorBtn.addEventListener('click', function() { orgEditorModal.classList.remove('open'); });
    orgEditorModal.addEventListener('click', function(e) { if (e.target === orgEditorModal) orgEditorModal.classList.remove('open'); });
  }

  orgCreateModalApi = setupOrgCreateModal();
  setupOrgEditorModal();

  const addOrgBtn = document.getElementById('dash-add-org');
  if (addOrgBtn && !addOrgBtn._wired) {
    addOrgBtn._wired = true;
    addOrgBtn.addEventListener('click', () => orgCreateModalApi?.open());
  }
  onAuthChange(function(user) {
    if (!user) return;
    setTimeout(function() {
      wireDashboardControls();
      filterTabsByRole();
    }, 0);
  });
  await setupOrganizations(currentOrgs);
  setupDashboardLiveRefresh();
  setupLogs();
  setupUnsavedWarning();
}

function wireDashboardControls() {
  const cu = getCurrentUser();
  if (!cu) return;

  if (isDeveloper() || currentUserIsOwner) {
    setupBranding();
    setupLimits();
    setupPagesEditor();
    setupActions();
    setupMiscToggles();
  }
  if (isDeveloper() || currentUserIsOwner || cu.role === 'admin' || hasPermission(cu._id, 'manage_announcement')) {
    setupNewsManager();
  }
}

/* ===================== ROLES TAB ===================== */
async function setupRolesTab() {
  if (setupRolesTab._wired) return;
  setupRolesTab._wired = true;
  
  var list = document.getElementById('dash-roles-list');
  var addBtn = document.getElementById('dash-add-role');
  var cuRoles = getCurrentUser();
  if (addBtn) addBtn.style.display = (isDeveloper() || currentUserIsOwner || (cuRoles && cuRoles.role === 'admin') || hasPermission(cuRoles && cuRoles._id, 'manage_role')) ? '' : 'none';
  
  async function renderRoles() {
    if (!list) return;
    var res = await fetch(API_BASE_URL + '/custom-roles', { credentials: 'include' });
    var data = res.ok ? await res.json() : { roles: [] };
    var roles = data.roles || [];
    if (roles.length === 0) {
      list.innerHTML = '<div class="dash-empty-state"><p data-i18n="dash_roles_empty">No custom roles yet. Click "+ Add Role" to create one.</p></div>';
      return;
    }
    list.innerHTML = roles.map(function(r) {
      var permHtml = Object.entries(r.permissions || {}).filter(function(e) { return e[1]; }).map(function(e) { return '<span class="dash-role-perm-badge">' + e[0] + '</span>'; }).join('');
      var iconHtml = r.icon ? '<img src="' + r.icon + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-left:8px">' : '';
      return '<div class="dash-role-card" data-id="' + r._id + '">'
        + '<div style="display:flex;align-items:center;gap:12px">'
        + iconHtml
        + '<div style="font-weight:700;font-size:0.95rem">' + r.name + '</div>'
        + '</div>'
        + '<div style="margin:8px 0">' + permHtml + '</div>'
        + '<div style="display:flex;gap:6px">'
        + '<button class="dash-btn dash-btn-sm role-edit-btn" data-id="' + r._id + '" data-name="' + escapeHtml(r.name) + '" data-icon="' + (r.icon || '') + '" data-permissions=\'' + JSON.stringify(r.permissions || {}) + '\'>Edit</button>'
        + '<button class="dash-btn dash-btn-sm dash-btn-outline role-delete-btn" data-id="' + r._id + '" style="color:var(--color-danger);border-color:var(--color-danger)">Delete</button>'
        + '</div>'
        + '</div>';
    }).join('');
  }
  
  var modal = document.getElementById('dash-role-modal');
  var nameInp = document.getElementById('dash-role-name-input');
  var saveBtn = document.getElementById('dash-save-role');
  var cancelBtn = document.getElementById('dash-cancel-role');
  var deleteBtn = document.getElementById('dash-delete-role');
  var titleEl = document.getElementById('dash-role-modal-title');
  var permCbs = document.querySelectorAll('#dash-role-permissions input[type="checkbox"]');
  var editingId = null;
  
  function openModal(role) {
    editingId = role ? role._id : null;
    titleEl.textContent = role ? 'Edit Role' : 'Add Role';
    deleteBtn.style.display = role ? '' : 'none';
    nameInp.value = role ? role.name : '';
    permCbs.forEach(function(cb) {
      cb.checked = role && role.permissions && role.permissions[cb.value];
    });
    if (modal) modal.classList.add('open');
  }
  
  function closeModal() {
    if (modal) modal.classList.remove('open');
    editingId = null;
  }
  
  if (addBtn) addBtn.addEventListener('click', function() { openModal(null); });
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (saveBtn) saveBtn.addEventListener('click', async function() {
    var name = nameInp.value.trim();
    if (!name) { showToast('Role name is required'); return; }
    var permissions = {};
    permCbs.forEach(function(cb) { permissions[cb.value] = cb.checked; });
    try {
      if (editingId) {
        await updateCustomRole(editingId, name, '', permissions);
      } else {
        await createCustomRole(name, '', permissions);
      }
      closeModal();
      await renderRoles();
      await loadCustomRoles();
      showToast('Role saved');
    } catch(e) { showToast('Failed to save role'); }
  });
  if (deleteBtn) deleteBtn.addEventListener('click', async function() {
    if (!editingId) return;
    if (!confirm('Delete this role?')) return;
    await deleteCustomRole(editingId);
    closeModal();
    await renderRoles();
    await loadCustomRoles();
    showToast('Role deleted');
  });
  
  list.addEventListener('click', function(e) {
    var editBtn = e.target.closest('.role-edit-btn');
    if (editBtn) {
      var role = { _id: editBtn.dataset.id, name: editBtn.dataset.name, icon: editBtn.dataset.icon, permissions: JSON.parse(editBtn.dataset.permissions) };
      openModal(role);
      return;
    }
    var delBtn = e.target.closest('.role-delete-btn');
    if (delBtn) {
      if (!confirm('Delete this role?')) return;
      deleteCustomRole(delBtn.dataset.id).then(function() {
        renderRoles();
        loadCustomRoles();
        showToast('Role deleted');
      });
    }
  });
  
  await renderRoles();
}

/* ===================== INBOX ===================== */
function setupInboxTab() {
  var list = document.getElementById('dash-inbox-list');
  var filterBtns = document.querySelectorAll('#dash-inbox-filter .dash-log-filter-btn');
  var searchInput = document.getElementById('dash-inbox-search');
  var currentFilter = 'all';
  var allReports = [];

  async function loadReports() {
    try {
      var res = await fetch(API_BASE_URL + '/reports/inbox', { credentials: 'include' });
      var data = res.ok ? await res.json() : { reports: [] };
      allReports = data.reports || [];
      renderReports();
    } catch { if (list) list.innerHTML = '<div class="dash-empty-state"><p>Failed to load reports</p></div>'; }
  }

  function renderReports() {
    if (!list) return;
    var lang = getCurrentLanguage();
    var isAr = lang === 'ar';
    var filtered = allReports;
    if (currentFilter !== 'all') filtered = filtered.filter(function(r) { return r.status === currentFilter; });
    var q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (q) filtered = filtered.filter(function(r) { return (r.title || '').toLowerCase().includes(q) || (r.userId && (r.userId.name || '').toLowerCase().includes(q)); });

    if (filtered.length === 0) {
      list.innerHTML = '<div class="dash-empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg><p>' + (isAr ? 'لا توجد تقارير' : 'No reports') + '</p></div>';
      return;
    }

    var typeNames = {};
    typeNames.inquiry = isAr ? 'استفسار' : 'Inquiry';
    typeNames.suggestion = isAr ? 'اقتراح' : 'Suggestion';
    typeNames.complaint = isAr ? 'شكوى' : 'Complaint';
    typeNames.bug = isAr ? 'بلاغ خطأ' : 'Bug Report';
    typeNames.feedback = isAr ? 'رأي' : 'Feedback';
    typeNames.organization = isAr ? 'منظمة' : 'Organization';

    var statusLabels = {};
    statusLabels.open = isAr ? 'مفتوح' : 'Open';
    statusLabels.in_progress = isAr ? 'قيد المعالجة' : 'In Progress';
    statusLabels.resolved = isAr ? 'تم الحل' : 'Resolved';
    statusLabels.closed = isAr ? 'مغلق' : 'Closed';

    list.innerHTML = filtered.map(function(r, idx) {
      var user = r.userId || {};
      var avatarHtml = user.avatar ? '<img src="' + (user.avatar.startsWith('http') ? user.avatar : API_BASE_URL.replace('/api', '') + user.avatar) + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-inline-end:8px">' : '<span style="display:inline-flex;width:28px;height:28px;border-radius:50%;background:var(--bg-glass);align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;margin-inline-end:8px;vertical-align:middle">' + (user.name || '?').charAt(0).toUpperCase() + '</span>';
      var statusColor = r.status === 'open' ? 'var(--color-danger)' : r.status === 'in_progress' ? '#d97706' : r.status === 'resolved' ? 'var(--color-success)' : 'var(--text-muted)';
      var statusOpts = ['open', 'in_progress', 'resolved', 'closed'].map(function(s) {
        return '<option value="' + s + '"' + (s === r.status ? ' selected' : '') + '>' + statusLabels[s] + '</option>';
      }).join('');
      return '<div class="dash-inbox-item" data-report-idx="' + idx + '" style="padding:14px;border:1px solid var(--border-color);border-radius:var(--radius-md);margin-bottom:10px;background:var(--bg-glass)">'
        + '<div style="display:flex;justify-content:space-between;align-items:start;gap:10px">'
        + '<div style="flex:1;min-width:0;cursor:pointer">'
        + '<div style="display:flex;align-items:center;margin-bottom:4px">'
        + avatarHtml
        + '<strong style="font-size:0.9rem;margin-inline-end:8px">' + (user.name || 'Unknown') + '</strong>'
        + '<span class="dashboard-role-badge" style="font-size:0.65rem;padding:1px 6px;background:var(--bg-glass);color:var(--text-muted)">' + (typeNames[r.type] || r.type) + '</span>'
        + '</div>'
        + '<div style="font-weight:600;font-size:0.95rem;margin-bottom:4px">' + r.title + '</div>'
        + (r.content ? '<div style="font-size:0.8rem;color:var(--text-muted);max-height:60px;overflow:hidden;margin-bottom:6px">' + r.content + '</div>' : '')
        + '<div style="font-size:0.7rem;color:var(--text-muted)">' + new Date(r.createdAt).toLocaleDateString() + (r.attachments && r.attachments.length ? ' &middot; ' + r.attachments.length + ' ' + (isAr ? 'مرفق' : 'attachment(s)') : '') + '</div>'
        + '</div>'
        + '<select class="dash-inbox-status-select" data-id="' + r._id + '" style="padding:4px 8px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);font-size:0.8rem;cursor:pointer;min-width:100px">'
        + statusOpts + '</select>'
        + '</div></div>';
    }).join('');

    list.querySelectorAll('[data-report-idx]').forEach(function(el) {
      el.addEventListener('click', function(e) {
        if (e.target.closest('.dash-inbox-status-select')) return;
        openReportDetailModal(filtered[parseInt(this.dataset.reportIdx)], getCurrentUser(), currentUserIsOwner);
      });
    });
    list.querySelectorAll('.dash-inbox-status-select').forEach(function(sel) {
      sel.addEventListener('change', async function() {
        var id = this.dataset.id;
        var status = this.value;
        try {
          await fetch(API_BASE_URL + '/reports/' + id + '/status', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
          showToast('Status updated');
        } catch { showToast('Failed to update status'); }
      });
    });
  }

  filterBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      filterBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderReports();
    });
  });

  if (searchInput) searchInput.addEventListener('input', function() { renderReports(); });

  loadReports();
}

function setupDashboardLiveRefresh() {
  if (setupDashboardLiveRefresh._wired) return;
  setupDashboardLiveRefresh._wired = true;

  window.addEventListener('identityChanged', async () => {
    if (!document.querySelector('.dash-page') || setupDashboardLiveRefresh._busy) return;
    setupDashboardLiveRefresh._busy = true;
    try {
      await Promise.all([fetchOrgs(), loadMemberRoles(), loadCustomRoles()]);
      if (orgListRefreshCallback) orgListRefreshCallback(loadOrgs());
      await loadMembers();
      await loadStats();
    } catch (e) {
      console.error('Dashboard live refresh error:', e);
    } finally {
      setupDashboardLiveRefresh._busy = false;
    }
  });
}

function filterTabsByRole() {
  const cu = getCurrentUser();
  var allowed;
  if (isDeveloper()) {
    allowed = ['summary', 'customize', 'logs', 'actions', 'organizations', 'members', 'news', 'misc', 'roles', 'inbox'];
  } else if (currentUserIsOwner) {
    allowed = ['summary', 'members', 'logs', 'actions', 'organizations', 'customize', 'news', 'misc', 'roles', 'inbox'];
  } else if (cu && cu.role === 'admin') {
    allowed = ['summary', 'members', 'news', 'inbox'];
    if (hasPermission(cu._id, 'audit_logs')) allowed.push('logs');
    if (hasPermission(cu._id, 'manage_role')) allowed.push('roles');
  } else if (cu && cu.role === 'moderator') {
    allowed = ['summary', 'members', 'logs', 'inbox'];
    if (hasPermission(cu._id, 'manage_role')) allowed.push('roles');
  } else {
    allowed = ['summary'];
    if (hasPermission(cu._id, 'audit_logs')) allowed.push('logs');
    if (hasPermission(cu._id, 'manage_organization')) allowed.push('organizations');
    if (hasPermission(cu._id, 'manage_role')) allowed.push('roles');
    if (hasPermission(cu._id, 'manage_announcement')) allowed.push('news');
  }
  document.querySelectorAll('.dash-tab').forEach(btn => {
    const tab = btn.dataset.tab;
    if (!allowed.includes(tab)) {
      btn.remove();
    }
  });
  const firstTab = document.querySelector('.dash-tab');
  if (firstTab && !firstTab.classList.contains('active')) {
    firstTab.click();
  }
}

/* ===================== TABS ===================== */
function setupTabs() {
  const tabs = document.getElementById('dash-tabs');
  if (!tabs) return;
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.dash-tab');
    if (!btn) return;
    document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById('panel-' + btn.dataset.tab);
    if (panel) panel.classList.add('active');
  });
}

/* ===================== SUMMARY ===================== */
async function loadStats() {
  try {
    const [userRes, jobRes] = await Promise.all([
      fetch(`${API_BASE_URL}/admin/users`, { credentials: 'include' }),
      fetch(`${API_BASE_URL}/jobs`, { credentials: 'include' })
    ]);
    const userData = userRes.ok ? await userRes.json() : { users: [] };
    const jobData = jobRes.ok ? await jobRes.json() : { jobs: [] };
    const users = userData.users || [];
    const jobs = jobData.jobs || [];
    const total = users.length;
    const jobCount = jobs.length;
    const admins = users.filter(u => u.role === 'admin').length;
    const devs = users.filter(u => u.role === 'developer').length;
    const adminDevTotal = admins + devs;
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const newThisWeek = users.filter(u => new Date(u.createdAt).getTime() > weekAgo).length;

    const ids = ['stat-users', 'stat-jobs', 'stat-admins', 'stat-joined'];
    const vals = [total, jobCount, adminDevTotal, newThisWeek];
    ids.forEach((id, i) => { const el = document.getElementById(id); if (el) el.textContent = vals[i]; });

    /* Insights bars */
    const maxVal = Math.max(total, adminDevTotal, jobCount, 1);
    setBar('dash-insights', [
      { label: 'Users', pct: (total / maxVal) * 100 },
      { label: 'Jobs', pct: (jobCount / maxVal) * 100 },
      { label: 'Staff', pct: (adminDevTotal / maxVal) * 100 }
    ]);

    /* Distribution */
    const dist = document.getElementById('dash-distribution');
    if (dist) {
      const roleCounts = {};
      users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });
      const colors = { user: 'var(--color-primary)', admin: 'var(--color-secondary)', developer: 'var(--color-accent)' };
      dist.innerHTML = Object.entries(roleCounts).map(([role, count]) =>
        `<span class="dash-dist-item"><span class="dash-dist-dot" style="background:${colors[role] || '#888'}"></span>${role}: ${count}</span>`
      ).join('');
    }
  } catch {}
}

function setBar(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = items.map(item =>
    `<div class="dash-insight-row"><div class="dash-insight-bar-wrap"><div class="dash-insight-bar" style="width:${item.pct}%"></div></div><div class="dash-insight-label">${item.label}</div></div>`
  ).join('');
}

/* ===================== CUSTOMIZE ===================== */
function setupBranding() {
  if (setupBranding._wired) return;
  setupBranding._wired = true;

  function loadFaviconFromServer() {
    fetch(API_BASE_URL + '/settings', { credentials: 'include' })
      .then(function(r) { if (r.ok) return r.json(); throw new Error(); })
      .then(function(data) {
        var url = data.settings && data.settings.favicon ? data.settings.favicon : '';
        var preview = document.getElementById('dash-favicon-preview');
        var remove = document.getElementById('dash-favicon-remove');
        if (url && preview) {
          preview.innerHTML = '<img src="' + url + '" alt="favicon">';
          if (remove) remove.classList.remove('hidden');
          var tag = document.querySelector('link[rel="icon"]');
          if (tag) tag.href = url;
        } else if (preview) {
          preview.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
          if (remove) remove.classList.add('hidden');
        }
      })
      .catch(function() {});
  }

  var faviconInput = document.getElementById('dash-favicon-input');
  var faviconBtn = document.getElementById('dash-favicon-btn');
  var faviconPreview = document.getElementById('dash-favicon-preview');
  var faviconRemove = document.getElementById('dash-favicon-remove');

  loadFaviconFromServer();

  if (faviconBtn && faviconInput) {
    faviconBtn.addEventListener('click', function() { faviconInput.click(); });
    faviconInput.addEventListener('change', function() {
      var file = faviconInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        var dataUrl = e.target.result;
        fetch(API_BASE_URL + '/settings', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ favicon: dataUrl })
        }).then(function(r) {
          if (r.ok) loadFaviconFromServer();
        }).catch(function() {});
      };
      reader.readAsDataURL(file);
    });
  }

  if (faviconRemove) {
    faviconRemove.addEventListener('click', function() {
      fetch(API_BASE_URL + '/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favicon: '' })
      }).then(function(r) {
        if (r.ok) loadFaviconFromServer();
      }).catch(function() {});
    });
  }
}

function setupPagesEditor() {
  if (setupPagesEditor._wired) return;
  setupPagesEditor._wired = true;

  const select = document.getElementById('page-select');
  const launchBtn = document.getElementById('dash-editor-launch');
  if (!select || !launchBtn) return;

  launchBtn.addEventListener('click', () => openVisualEditor(select.value));
}

/* ===================== NEWS ===================== */
var _dashboardNews = [];

function setupNewsManager() {
  if (setupNewsManager._wired) {
    loadNewsSettings();
    return;
  }
  setupNewsManager._wired = true;

  var input = document.getElementById('dash-news-input');
  var addBtn = document.getElementById('dash-news-add');
  var saveBtn = document.getElementById('dash-news-save');

  if (addBtn) {
    addBtn.addEventListener('click', function() {
      addNewsItem();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      saveNewsSettings();
    });
  }

  if (input) {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addNewsItem();
      }
    });
  }

  loadNewsSettings();
}

function loadNewsSettings() {
  var list = document.getElementById('dash-news-list');
  if (!list) return;
  fetch(API_BASE_URL + '/settings', { credentials: 'include' })
    .then(function(r) { if (r.ok) return r.json(); throw new Error(); })
    .then(function(data) {
      _dashboardNews = Array.isArray(data.settings && data.settings.news) ? data.settings.news : [];
      renderNewsList();
    })
    .catch(function() {
      list.innerHTML = '<div class="dash-empty-state"><p>' + t('dash_news_load_failed') + '</p></div>';
    });
}

function renderNewsList() {
  var list = document.getElementById('dash-news-list');
  if (!list) return;
  if (!_dashboardNews.length) {
    list.innerHTML = '<div class="dash-empty-state"><p>' + t('dash_news_empty') + '</p></div>';
    return;
  }
  list.innerHTML = _dashboardNews.map(function(item, index) {
    return '<div class="dash-news-item">'
      + '<span class="dash-news-text">' + escapeHtml(item) + '</span>'
      + '<button type="button" class="dash-btn dash-btn-sm dash-btn-outline dash-news-remove" data-index="' + index + '">' + t('dash_news_remove') + '</button>'
      + '</div>';
  }).join('');
  list.querySelectorAll('.dash-news-remove').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var index = parseInt(btn.dataset.index, 10);
      if (Number.isNaN(index)) return;
      _dashboardNews.splice(index, 1);
      renderNewsList();
      markNewsDirty();
    });
  });
}

function addNewsItem() {
  var input = document.getElementById('dash-news-input');
  if (!input) return;
  var text = input.value.trim();
  if (!text) {
    showToast('Write a news item first');
    return;
  }
  _dashboardNews.push(text);
  input.value = '';
  renderNewsList();
  markNewsDirty();
}

function markNewsDirty() {
  var saveBtn = document.getElementById('dash-news-save');
  if (saveBtn) saveBtn.classList.remove('dash-btn-outline');
}

function saveNewsSettings() {
  fetch(API_BASE_URL + '/settings', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ news: _dashboardNews })
  }).then(function(r) {
    if (!r.ok) throw new Error();
    return r.json();
  }).then(function(data) {
    _dashboardNews = Array.isArray(data.settings && data.settings.news) ? data.settings.news : _dashboardNews;
    renderNewsList();
    var saveBtn = document.getElementById('dash-news-save');
    if (saveBtn) saveBtn.classList.add('dash-btn-outline');
    window.dispatchEvent(new CustomEvent('newsTickerUpdated', { detail: { news: _dashboardNews } }));
    addLog('settings', 'Updated news ticker');
    showToast('News saved');
  }).catch(function() {
    showToast('Failed to save news');
    loadNewsSettings();
  });
}

let editorSelectedEl = null;
let editorPageName = '';

function openVisualEditor(pageName) {
  const overlay = document.getElementById('dash-editor-overlay');
  const preview = document.getElementById('dash-editor-preview');
  const nameEl = document.getElementById('dash-editor-page-name');
  const discardBtn = document.getElementById('dash-editor-discard');
  const saveBtn = document.getElementById('dash-editor-save');
  const closeBtn = document.getElementById('dash-editor-close');
  if (!overlay || !preview) return;

  editorPageName = pageName;
  if (nameEl) nameEl.textContent = pageName + '.html';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  preview.src = '/' + pageName;

  preview.onload = function () {
    try {
      const doc = this.contentDocument || this.contentWindow.document;
      if (!doc || !doc.body) { showEditorError(); return; }

      makeIframeEditable(doc);
    } catch {
      showEditorError();
    }
  };

  if (discardBtn) {
    discardBtn.onclick = () => {
      preview.src = '/' + pageName + '?' + Date.now();
      showSavedText(discardBtn, 'Discarded!');
    };
  }

  if (saveBtn) {
    saveBtn.onclick = () => {
      try {
        const doc = preview.contentDocument || preview.contentWindow.document;
        if (!doc) return;
        const el = doc.querySelector('main') || doc.body;
        const key = 'pageContent_' + pageName;
        localStorage.setItem(key, el.innerHTML);
        showSavedText(saveBtn, 'Saved!');
        addLog('content', 'Edited /' + pageName + ' via visual editor');
      } catch {}
    };
  }

  if (closeBtn) { closeBtn.onclick = closeVisualEditor; }
  overlay._closeKey = (e) => { if (e.key === 'Escape') closeVisualEditor(); };
  document.addEventListener('keydown', overlay._closeKey);
}

function showEditorError() {
  alert('Failed to load page. Check that the file exists and the server is running.');
  closeVisualEditor();
}

function closeVisualEditor() {
  const overlay = document.getElementById('dash-editor-overlay');
  const preview = document.getElementById('dash-editor-preview');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  if (preview) { preview.src = ''; preview.onload = null; }
  clearEditorSelection();
  if (overlay._closeKey) document.removeEventListener('keydown', overlay._closeKey);
}

function makeIframeEditable(doc) {
  const all = doc.body.querySelectorAll('*');
  all.forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('mouseenter', () => {
      if (el !== editorSelectedEl) {
        el.style.outline = '2px dashed var(--color-accent, #b8860b)';
        el.style.outlineOffset = '1px';
      }
    });
    el.addEventListener('mouseleave', () => {
      if (el !== editorSelectedEl) {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }
    });
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.closest('a')) e.preventDefault();
      selectEditorElement(el);
    });
  });
}

function selectEditorElement(el) {
  clearEditorSelection();
  el.style.outline = '3px solid var(--color-primary, #2563eb)';
  el.style.outlineOffset = '2px';
  el.style.background = 'rgba(37, 99, 235, 0.08)';
  editorSelectedEl = el;
  showElementProps(el);
}

function clearEditorSelection() {
  if (editorSelectedEl) {
    editorSelectedEl.style.outline = '';
    editorSelectedEl.style.outlineOffset = '';
    editorSelectedEl.style.background = '';
    editorSelectedEl = null;
  }
}

function showElementProps(el) {
  const content = document.getElementById('dash-editor-props-content');
  const badge = document.getElementById('dash-editor-tag-badge');
  if (!content) return;

  if (badge) badge.textContent = el.tagName.toLowerCase();

  const text = el.textContent || '';
  const classStr = el.className || '';
  const styleObj = {};
  for (let i = 0; i < el.style.length; i++) {
    const k = el.style[i];
    styleObj[k] = el.style.getPropertyValue(k);
  }
  const styleEntries = Object.entries(styleObj);
  const id = el.id || '';

  content.innerHTML = `
    <div class="dash-editor-prop-group">
      <label>ID</label>
      <input type="text" class="dash-editor-prop-id" value="${escapeHtml(id)}">
    </div>
    <div class="dash-editor-prop-group">
      <label>Text Content</label>
      <textarea class="dash-editor-prop-text">${escapeHtml(text)}</textarea>
    </div>
    <div class="dash-editor-prop-group">
      <label>CSS Classes</label>
      <input type="text" class="dash-editor-prop-classes" value="${escapeHtml(classStr)}">
    </div>
    <div class="dash-editor-prop-group">
      <label>Inline Styles</label>
      <div class="dash-editor-styles-list">
        ${styleEntries.length === 0 ? '<p style="font-size:0.85rem;color:var(--text-muted)">No inline styles</p>' :
          styleEntries.map(([k, v]) => `
            <div class="dash-editor-style-row">
              <input type="text" class="dash-editor-style-key" value="${escapeHtml(k)}" placeholder="property">
              <input type="text" class="dash-editor-style-val" value="${escapeHtml(v)}" placeholder="value">
              <button class="dash-editor-style-remove" title="Remove">&times;</button>
            </div>
          `).join('')
        }
      </div>
      <button class="dash-editor-add-style" id="dash-editor-add-style">+ Add style</button>
    </div>
  `;

  const textarea = content.querySelector('.dash-editor-prop-text');
  if (textarea) textarea.addEventListener('input', () => { el.textContent = textarea.value; markEditorDirty(); });

  const idInput = content.querySelector('.dash-editor-prop-id');
  if (idInput) idInput.addEventListener('input', () => { el.id = idInput.value; markEditorDirty(); });

  const classInput = content.querySelector('.dash-editor-prop-classes');
  if (classInput) classInput.addEventListener('input', () => { el.className = classInput.value; markEditorDirty(); });

  content.querySelectorAll('.dash-editor-style-row').forEach(row => {
    const keyIn = row.querySelector('.dash-editor-style-key');
    const valIn = row.querySelector('.dash-editor-style-val');
    const rmBtn = row.querySelector('.dash-editor-style-remove');
    const apply = () => {
      const key = keyIn.value.trim();
      const val = valIn.value.trim();
      if (key && val) el.style.setProperty(key, val);
      else if (key) el.style.removeProperty(key);
      markEditorDirty();
    };
    if (keyIn) keyIn.addEventListener('input', apply);
    if (valIn) valIn.addEventListener('input', apply);
    if (rmBtn) rmBtn.addEventListener('click', () => {
      const key = keyIn.value.trim();
      if (key) el.style.removeProperty(key);
      row.remove();
      markEditorDirty();
    });
  });

  const addBtn = content.querySelector('#dash-editor-add-style');
  if (addBtn) addBtn.addEventListener('click', () => {
    const list = content.querySelector('.dash-editor-styles-list');
    const emptyMsg = list.querySelector('p');
    if (emptyMsg) emptyMsg.remove();
    const row = document.createElement('div');
    row.className = 'dash-editor-style-row';
    row.innerHTML = '<input type="text" class="dash-editor-style-key" placeholder="property"><input type="text" class="dash-editor-style-val" placeholder="value"><button class="dash-editor-style-remove">&times;</button>';
    list.appendChild(row);
    const ki = row.querySelector('.dash-editor-style-key');
    const vi = row.querySelector('.dash-editor-style-val');
    const rb = row.querySelector('.dash-editor-style-remove');
    ki.addEventListener('input', () => { const k=ki.value.trim(),v=vi.value.trim(); if(k&&v)el.style.setProperty(k,v); else if(k)el.style.removeProperty(k); markEditorDirty(); });
    vi.addEventListener('input', () => { const k=ki.value.trim(),v=vi.value.trim(); if(k&&v)el.style.setProperty(k,v); else if(k)el.style.removeProperty(k); markEditorDirty(); });
    rb.addEventListener('click', () => { row.remove(); markEditorDirty(); });
    ki.focus();
    markEditorDirty();
  });
}

function markEditorDirty() { showUnsavedPopup(); }

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML.replace(/"/g, '&quot;');
}

function setupLimits() {
  if (setupLimits._wired) return;
  setupLimits._wired = true;

  const input = document.getElementById('max-jobs');
  const btn = document.getElementById('dash-save-limits');
  if (input) input.value = localStorage.getItem('maxJobs') || '50';
  if (btn && input) {
    btn.addEventListener('click', () => {
      localStorage.setItem('maxJobs', input.value);
      showSaved(btn);
    });
  }
}



/* ===================== LOGS ===================== */
function setupLogs() {
  if (setupLogs._wired) return;
  setupLogs._wired = true;

  const container = document.getElementById('dash-logs-list');
  const searchInput = document.getElementById('dash-logs-search');
  if (!container) return;

  const render = () => {
    let logs = getLogs();
    const q = searchInput ? searchInput.value.toLowerCase() : '';
    if (q) logs = logs.filter(l => l.user && l.user.toLowerCase().includes(q));

    const activeFilter = document.querySelector('.dash-log-filter-btn.active');
    const filter = activeFilter ? activeFilter.dataset.filter : 'all';
    if (filter !== 'all') logs = logs.filter(l => l.type === filter);

    if (logs.length === 0) {
      container.innerHTML = '<div class="dash-empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><p>No activity yet.</p></div>';
      return;
    }

    container.innerHTML = logs.map((log, i) => `
      <div class="dash-log-item" data-index="${i}">
        <div class="dash-log-icon ${log.type}">${log.icon || '<i class="fas fa-clipboard"></i>'}</div>
        <div class="dash-log-content">
          <div class="dash-log-text">${log.text}</div>
          <div class="dash-log-meta">${log.time} ${log.user ? '&middot; ' + log.user : ''}</div>
          ${log.detail ? `<div class="dash-log-detail" id="log-detail-${i}">${log.detail}</div>` : ''}
        </div>
        ${log.detail ? `<div class="dash-log-expand" data-index="${i}"><i class="fas fa-chevron-down"></i></div>` : ''}
      </div>
    `).join('');

    container.querySelectorAll('.dash-log-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.dash-log-expand')) return;
        const idx = item.dataset.index;
        const detail = document.getElementById('log-detail-' + idx);
        const expand = item.querySelector('.dash-log-expand');
        if (detail) { detail.classList.toggle('open'); if (expand) expand.classList.toggle('open'); }
      });
    });
    container.querySelectorAll('.dash-log-expand').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = el.dataset.index;
        const detail = document.getElementById('log-detail-' + idx);
        if (detail) { detail.classList.toggle('open'); el.classList.toggle('open'); }
      });
    });
  };

  if (searchInput) searchInput.addEventListener('input', render);
  document.querySelectorAll('.dash-log-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dash-log-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });

  render();
}

function getLogs() {
  try { return JSON.parse(localStorage.getItem('dashActivityLogs') || '[]'); } catch { return []; }
}

function addLog(type, text, opts = {}) {
  const logs = getLogs();
  logs.unshift({
    type,
    text,
    user: opts.user || '',
    time: new Date().toLocaleString(),
    detail: opts.detail || '',
    icon: opts.icon || getDefaultIcon(type)
  });
  if (logs.length > 200) logs.length = 200;
  localStorage.setItem('dashActivityLogs', JSON.stringify(logs));
}

function getDefaultIcon(type) {
  const icons = { profile: '<i class="fas fa-user"></i>', settings: '<i class="fas fa-cog"></i>', content: '<i class="fas fa-pen"></i>', action: '<i class="fas fa-shield-alt"></i>' };
  return icons[type] || '<i class="fas fa-clipboard"></i>';
}

/* ===================== ACTIONS ===================== */
function setupActions() {
  if (setupActions._wired) return;
  setupActions._wired = true;

  const container = document.getElementById('dash-actions-list');
  const searchInput = document.getElementById('dash-actions-search');
  if (!container) return;

  const render = () => {
    let actions = getActions();
    const q = searchInput ? searchInput.value.toLowerCase() : '';
    if (q) actions = actions.filter(a => a.user && a.user.toLowerCase().includes(q));

    if (actions.length === 0) {
      container.innerHTML = '<div class="dash-empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p>No staff actions recorded.</p></div>';
      return;
    }

    container.innerHTML = actions.map(a => `
      <div class="dash-action-item">
        <div class="dash-log-icon action-${a.actionType}">${a.icon || '<i class="fas fa-shield-alt"></i>'}</div>
        <div class="dash-log-content">
          <div class="dash-log-text"><span class="dash-action-type ${a.actionType}">${a.actionType}</span> ${a.text}</div>
          <div class="dash-log-meta">${a.time} &middot; by ${a.staff} &middot; ${a.user}</div>
        </div>
      </div>
    `).join('');
  };

  if (searchInput) searchInput.addEventListener('input', render);
  render();
}

function getActions() {
  try { return JSON.parse(localStorage.getItem('dashStaffActions') || '[]'); } catch { return []; }
}

function addAction(actionType, text, opts = {}) {
  const actions = getActions();
  actions.unshift({
    actionType,
    text,
    staff: opts.staff || 'Unknown',
    user: opts.user || '',
    time: new Date().toLocaleString(),
    icon: opts.icon || '<i class="fas fa-shield-alt"></i>'
  });
  if (actions.length > 100) actions.length = 100;
  localStorage.setItem('dashStaffActions', JSON.stringify(actions));
}

let memberRoles = {};
let memberRolesLoaded = false;

function normalizeMemberRolesEntry(entry) {
  if (!entry) return [];
  if (Array.isArray(entry)) return entry.filter(r => r && r.name);
  if (entry.name) return [{ name: entry.name, icon: entry.icon || '' }];
  return [];
}

function getMemberRolesForUser(userId) {
  return normalizeMemberRolesEntry(memberRoles[userId]);
}

function userHasMemberRole(userId, roleName) {
  return getMemberRolesForUser(userId).some(r => r.name === roleName);
}

function userHasOwnerRole(userId) {
  return getMemberRolesForUser(userId).some(r => r.name && r.name.charAt(0) === '@');
}

function findOwnerUserId() {
  for (const uid in memberRoles) {
    if (userHasOwnerRole(uid)) return uid;
  }
  return null;
}

async function loadMemberRoles() {
  try {
    const res = await fetch(API_BASE_URL + '/member-roles', { credentials: 'include' });
    if (!res.ok) { memberRoles = {}; memberRolesLoaded = true; return; }
    const data = await res.json();
    memberRoles = data.roles || {};
    memberRolesLoaded = true;
  } catch { memberRoles = {}; memberRolesLoaded = true; }
}

async function addMemberRoleServer(userId, roleName, roleIcon) {
  try {
    const res = await fetch(API_BASE_URL + '/member-roles/' + userId, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleName, roleIcon: roleIcon || '' })
    });
    if (res.ok) {
      const data = await res.json();
      memberRoles[userId] = data.roles || [];
      return true;
    }
    const err = await res.json().catch(() => ({}));
    showToast(err.message || 'Failed to add role');
  } catch {
    showToast('Failed to add role');
  }
  return false;
}

async function removeMemberRole(userId, roleName) {
  try {
    const url = roleName
      ? API_BASE_URL + '/member-roles/' + userId + '?roleName=' + encodeURIComponent(roleName)
      : API_BASE_URL + '/member-roles/' + userId;
    const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data.roles && data.roles.length) memberRoles[userId] = data.roles;
      else delete memberRoles[userId];
      return true;
    }
    const err = await res.json().catch(() => ({}));
    showToast(err.message || 'Failed to remove role');
  } catch {
    showToast('Failed to remove role');
  }
  return false;
}

let customRolesCache = [];

function getUserCustomRole(userId) {
  const assigned = getMemberRolesForUser(userId);
  for (let i = 0; i < assigned.length; i++) {
    const custom = customRolesCache.find(r => r.name === assigned[i].name);
    if (custom) return custom;
  }
  return null;
}

export function hasPermission(userId, perm) {
  const cu = getCurrentUser();
  if (!cu || cu._id !== userId) return false;
  if (cu.role === 'developer' || cu.role === 'admin') return true;
  if (cu.role === 'moderator') {
    return ['ban', 'suspend', 'manage_posts', 'manage_organization'].includes(perm);
  }
  var customRole = getUserCustomRole(userId);
  if (customRole && customRole.permissions && customRole.permissions[perm]) return true;
  return false;
}

function getHierarchyRank(userId, serverRole) {
  if (serverRole === 'developer') return 4;
  if (userHasOwnerRole(userId)) return 3;
  if (serverRole === 'admin') return 2;
  if (serverRole === 'moderator') return 1.5;
  return 1;
}

async function loadCustomRoles() {
  try {
    const res = await fetch(API_BASE_URL + '/custom-roles', { credentials: 'include' });
    if (!res.ok) { customRolesCache = []; return; }
    const data = await res.json();
    customRolesCache = data.roles || [];
  } catch { customRolesCache = []; }
}

async function createCustomRole(name, icon, permissions) {
  try {
    const res = await fetch(API_BASE_URL + '/custom-roles', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, icon: icon || '', permissions: permissions || {} }) });
    if (res.ok) { const d = await res.json(); return d.role; }
  } catch {}
  return null;
}

async function updateCustomRole(id, name, icon, permissions) {
  try {
    const res = await fetch(API_BASE_URL + '/custom-roles/' + id, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, icon: icon || '', permissions: permissions || {} }) });
    if (res.ok) { const d = await res.json(); return d.role; }
  } catch {}
  return null;
}

async function deleteCustomRole(id) {
  try {
    await fetch(API_BASE_URL + '/custom-roles/' + id, { method: 'DELETE', credentials: 'include' });
    return true;
  } catch { return false; }
}

function buildRoleCell(userId, serverRole, userName) {
  const assigned = getMemberRolesForUser(userId);
  let html = '<div class="dash-role-badges-wrap">';

  const lang = getCurrentLanguage();
  if (serverRole === 'developer') {
    const label = lang === 'ar' ? 'مطور' : 'Developer';
    html += '<span class="dashboard-role-badge developer"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="vertical-align:middle;margin-right:3px"><path d="M12 2L3 7v6c0 5.25 3.83 10.15 9 11.5 5.17-1.35 9-6.25 9-11.5V7l-9-5z"/></svg>' + label + '</span>';
  } else if (serverRole === 'admin') {
    const label = lang === 'ar' ? 'ادمن' : 'Admin';
    html += '<span class="dashboard-role-badge admin"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="vertical-align:middle;margin-right:3px"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>' + label + '</span>';
  } else if (serverRole === 'moderator') {
    const label = lang === 'ar' ? 'مشرف' : 'Moderator';
    html += '<span class="dashboard-role-badge moderator"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="vertical-align:middle;margin-right:3px"><path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4zm10 16H4V9h16v11z"/></svg>' + label + '</span>';
  }

  assigned.forEach(r => {
    const isOwner = r.name && r.name.charAt(0) === '@';
    const cls = isOwner ? 'owner' : 'custom';
    const iconHtml = r.icon ? '<img src="' + r.icon + '" style="width:16px;height:16px;border-radius:50%;margin-right:4px;vertical-align:middle;display:inline-block;object-fit:cover">' : '';
    const label = isOwner ? OWNER_CROWN_GLOBAL + ' Owner' : iconHtml + r.name;
    html += '<span class="dashboard-role-badge ' + cls + '">' + label + '</span>';
    if (!isOwner) {
      html += '<button class="dash-role-remove" data-user-id="' + userId + '" data-role-name="' + encodeURIComponent(r.name) + '" title="Remove role"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
    }
  });

  html += '</div>';
  return html;
}

/* ===================== MEMBERS ===================== */
async function handleMemberAction(btn) {
  var action = btn.dataset.action;
  var userName = btn.dataset.userName || 'Unknown';
  var popup = btn.closest('.dash-member-actions-popup');
  if (popup) popup.classList.remove('open');
  var users = loadCachedUsers();
  var _cu = getCurrentUser();
  var myRank = _cu ? getHierarchyRank(_cu._id, _cu.role) : 0;
  if (action === 'verify') {
    var userId = btn.dataset.userId;
    if (userId) {
      fetch(API_BASE_URL + '/admin/users/' + userId + '/verify', { method: 'PUT', credentials: 'include' })
        .then(function(res) { return res.ok ? res.json() : Promise.reject(); })
        .then(function(data) {
          addAction('verify', (data.user.verified ? 'Verified' : 'Unverified') + ' ' + userName, { staff: 'You', user: userName });
          showSavedText(document.querySelector('.dash-card-title:last-child'), (data.user.verified ? 'Verified' : 'Unverified') + ' ' + userName);
          loadMembers();
        })
        .catch(function() { alert('Failed to update verification status'); });
    }
    return;
  }
  if (action === 'set-owner') {
    var targetId = btn.dataset.userId;
    if (!targetId) return;
    if (!confirm('Set "' + userName + '" as the Owner?')) return;
    await addMemberRoleServer(targetId, '@' + userName, '');
    addAction('set-owner', 'Set ' + userName + ' as Owner', { staff: 'You', user: userName });
    showSavedText(document.querySelector('.dash-card-title:last-child'), 'Owner set to ' + userName);
    await loadMembers();
    window.dispatchEvent(new CustomEvent('identityChanged'));
    return;
  }
  if (action === 'transfer-owner') {
    var targetId = btn.dataset.userId;
    if (!targetId) return;
    var currentOwnerId = findOwnerUserId();
    if (!currentOwnerId) return;
    if (!confirm('Transfer ownership to "' + userName + '"? The current owner will lose the Owner role.')) return;
    var ownerRole = getMemberRolesForUser(currentOwnerId).find(function(r) { return r.name && r.name.charAt(0) === '@'; });
    if (ownerRole) await removeMemberRole(currentOwnerId, ownerRole.name);
    await addMemberRoleServer(targetId, '@' + userName, '');
    addAction('transfer-owner', 'Transferred ownership to ' + userName, { staff: 'You', user: userName });
    showSavedText(document.querySelector('.dash-card-title:last-child'), 'Owner changed to ' + userName);
    await loadMembers();
    window.dispatchEvent(new CustomEvent('identityChanged'));
    return;
  }
  if (['set-admin', 'remove-admin', 'set-moderator', 'remove-moderator'].indexOf(action) !== -1) {
    var userId = btn.dataset.userId;
    if (!userId) return;
    var newRole = 'user';
    if (action === 'set-admin') newRole = 'admin';
    if (action === 'set-moderator') newRole = 'moderator';
    if (!confirm('Are you sure you want to ' + action.replace('-', ' ') + ' for "' + userName + '"?')) return;
    fetch(API_BASE_URL + '/admin/users/' + userId + '/role', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    })
    .then(function(res) {
      if (!res.ok) throw new Error('Failed to change role');
      addAction(action, action.replace('-', ' ') + ' for ' + userName, { staff: 'You', user: userName });
      showSavedText(document.querySelector('.dash-card-title:last-child'), 'Role updated for ' + userName);
      loadMembers();
    })
    .catch(function() { alert('Failed to change role. You may not have permission.'); });
    return;
  }
  if (action === 'delete-account') {
    var userId = btn.dataset.userId;
    if (!userId) return;
    var _t = users.find(function(__u) { return __u._id === userId; });
    if (_t && getHierarchyRank(userId, _t.role) >= myRank) { alert('Cannot delete a user with equal or higher rank.'); return; }
    if (!confirm('Permanently delete account of "' + userName + '"? This CANNOT be undone.')) return;
    if (!confirm('Are you absolutely sure? All data for "' + userName + '" will be lost forever.')) return;
    fetch(API_BASE_URL + '/admin/users/' + userId, { method: 'DELETE', credentials: 'include' })
      .then(function(res) {
        if (!res.ok) throw new Error('Delete failed');
        addAction('delete-account', 'Deleted ' + userName, { staff: 'You', user: userName });
        showSavedText(document.querySelector('.dash-card-title:last-child'), 'Deleted ' + userName);
        loadMembers();
      })
      .catch(function() {
        showSavedText(document.querySelector('.dash-card-title:last-child'), 'Failed to delete');
      });
    return;
  }
  if (action === 'ban') {
    var userId = btn.dataset.userId;
    if (!userId) return;
    var _t = users.find(function(__u) { return __u._id === userId; });
    if (_t && getHierarchyRank(userId, _t.role) >= myRank) { alert('Cannot ban a user with equal or higher rank.'); return; }
    var reason = prompt('Ban reason:', 'Violation of terms');
    if (reason === null) return;
    fetch(API_BASE_URL + '/admin/ban/' + userId, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: reason }) })
      .then(function(res) { if (res.ok) { showSavedText(document.querySelector('.dash-card-title:last-child'), 'Banned ' + userName); loadMembers(); } })
      .catch(function() { showSavedText(document.querySelector('.dash-card-title:last-child'), 'Ban failed'); });
    return;
  }
  if (action === 'unban') {
    var userId = btn.dataset.userId;
    if (!userId) return;
    var _t = users.find(function(__u) { return __u._id === userId; });
    if (_t && getHierarchyRank(userId, _t.role) >= myRank) { alert('Cannot unban a user with equal or higher rank.'); return; }
    fetch(API_BASE_URL + '/admin/unban/' + userId, { method: 'POST', credentials: 'include' })
      .then(function(res) { if (res.ok) { showSavedText(document.querySelector('.dash-card-title:last-child'), 'Unbanned ' + userName); loadMembers(); } })
      .catch(function() { showSavedText(document.querySelector('.dash-card-title:last-child'), 'Unban failed'); });
    return;
  }
  if (action === 'suspend') {
    var userId = btn.dataset.userId;
    if (!userId) return;
    var _t = users.find(function(__u) { return __u._id === userId; });
    if (_t && getHierarchyRank(userId, _t.role) >= myRank) { alert('Cannot suspend a user with equal or higher rank.'); return; }
    var mins = prompt('Timeout duration in minutes:', '60');
    if (mins === null) return;
    fetch(API_BASE_URL + '/admin/timeout/' + userId, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes: parseInt(mins) || 60 }) })
      .then(function(res) { if (res.ok) { showSavedText(document.querySelector('.dash-card-title:last-child'), 'Suspended ' + userName); loadMembers(); } })
      .catch(function() { showSavedText(document.querySelector('.dash-card-title:last-child'), 'Suspend failed'); });
    return;
  }
  if (action === 'untimeout') {
    var userId = btn.dataset.userId;
    if (!userId) return;
    var _t = users.find(function(__u) { return __u._id === userId; });
    if (_t && getHierarchyRank(userId, _t.role) >= myRank) { alert('Cannot remove suspension for a user with equal or higher rank.'); return; }
    fetch(API_BASE_URL + '/admin/untimeout/' + userId, { method: 'POST', credentials: 'include' })
      .then(function(res) { if (res.ok) { showSavedText(document.querySelector('.dash-card-title:last-child'), 'Removed suspension for ' + userName); loadMembers(); } })
      .catch(function() { showSavedText(document.querySelector('.dash-card-title:last-child'), 'Remove suspend failed'); });
    return;
  }
  addAction(action, action + ' ' + userName, { staff: 'You', user: userName });
  var actionsContainer = document.getElementById('dash-actions-list');
  if (actionsContainer) setupActions();
  showSavedText(document.querySelector('.dash-card-title:last-child'), action + ' recorded');
}

async function loadMembers() {
  const tbody = document.getElementById('dash-members-body');
  const empty = document.getElementById('dash-members-empty');
  const searchInput = document.getElementById('dash-members-search');
  if (!tbody) return;

  await Promise.all([loadMemberRoles(), loadCustomRoles()]);
  var cu = getCurrentUser();
  var myRank = cu ? getHierarchyRank(cu._id, cu.role) : 0;

  let users = [];

  try {
    const res = await fetch(`${API_BASE_URL}/admin/users`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    users = data.users || [];
    localStorage.setItem('dashCachedUsers', JSON.stringify(users));
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--color-accent)">' + t('dash_failed_load') + '</td></tr>';
    return;
  }

  const render = () => {
    const q = searchInput ? searchInput.value.toLowerCase() : '';
    const filtered = q ? users.filter(u => (u.displayName || u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)) : users;

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    tbody.innerHTML = filtered.map(u => {
      const name = u.displayName || u.name || t('common_unknown');
      const avatarUrl = u.avatar ? (u.avatar.startsWith('http') ? u.avatar : BACKEND_ORIGIN + u.avatar) : null;
      const lastSeen = u.lastSeen || u.updatedAt || u.createdAt;
      const avatarHtml = avatarUrl ? `<img src="${avatarUrl}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="try{this.outerHTML='${name.charAt(0).toUpperCase()}'}catch(e){}">` : name.charAt(0).toUpperCase();
      const isVerified = u.verified;
      const isBanned = u.banned;
      const isTimedOut = u.timedOutUntil && new Date(u.timedOutUntil).getTime() > Date.now();
      const statusBadges = [];
      if (isBanned) statusBadges.push('<span class="dash-status-badge banned">' + t('dash_member_banned') + '</span>');
      if (isTimedOut) statusBadges.push('<span class="dash-status-badge suspended">' + t('dash_member_suspended') + '</span>');
      var targetRank = getHierarchyRank(u._id, u.role);
      var cantTouch = targetRank >= myRank;
      var canFullManage = currentUserIsOwner || isDeveloper() || (cu && cu.role === 'admin') || hasPermission(cu._id, 'manage_role');
      var canBan = canFullManage || hasPermission(cu._id, 'ban');
      var canSuspend = canFullManage || hasPermission(cu._id, 'suspend');
      let actionsHtml = '';
      if (canFullManage) {
        actionsHtml += '<button data-action="verify" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> ' + (isVerified ? t('dash_member_unverify') : t('dash_member_verify')) + '</button>';
        actionsHtml += '<button data-action="edit-profile" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> ' + t('dash_member_edit_profile') + '</button>';
      }
      if (canBan && isBanned && !cantTouch) actionsHtml += '<button data-action="unban" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg> ' + t('dash_member_unban') + '</button>';
      if (canBan && !isBanned && !cantTouch) actionsHtml += '<button data-action="ban" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg> ' + t('dash_member_ban') + '</button>';
      if (canSuspend && isTimedOut && !cantTouch) actionsHtml += '<button data-action="untimeout" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg> ' + t('dash_member_remove_suspend') + '</button>';
      if (canSuspend && !isTimedOut && !cantTouch) actionsHtml += '<button data-action="suspend" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg> ' + t('dash_member_suspend') + '</button>';
      
      const isOwnerOrDev = isDeveloper() || currentUserIsOwner;
      if (isOwnerOrDev && u.role !== 'admin' && !cantTouch) actionsHtml += '<button data-action="set-admin" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ' + t('dash_member_set_admin') + '</button>';
      if (isOwnerOrDev && u.role === 'admin' && !cantTouch) actionsHtml += '<button data-action="remove-admin" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ' + t('dash_member_remove_admin') + '</button>';
      if ((isOwnerOrDev || cu.role === 'admin') && u.role !== 'moderator' && !cantTouch) actionsHtml += '<button data-action="set-moderator" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> ' + t('dash_member_set_moderator') + '</button>';
      if ((isOwnerOrDev || cu.role === 'admin') && u.role === 'moderator' && !cantTouch) actionsHtml += '<button data-action="remove-moderator" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> ' + t('dash_member_remove_moderator') + '</button>';

      if (isOwnerOrDev && !cantTouch) actionsHtml += '<button data-action="delete-account" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> ' + t('dash_member_delete_account') + '</button>';
      
      if (isOwnerOrDev) {
        var _oid = findOwnerUserId();
        if (_oid && u._id !== _oid) actionsHtml += '<button data-action="transfer-owner" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ' + t('dash_member_transfer_owner') + '</button>';
        if (!_oid) actionsHtml += '<button data-action="set-owner" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ' + t('dash_member_set_owner') + '</button>';
      }

      return `<tr>
        <td><div class="dashboard-user-cell"><div class="dashboard-user-avatar">${avatarHtml}</div><div class="dashboard-user-info"><div class="dashboard-user-name">${name}${userHasOwnerRole(u._id) ? ' ' + OWNER_CROWN_GLOBAL : isVerified ? ' ' + VERIFIED_TICK : ''}${statusBadges.length ? ' ' + statusBadges.join(' ') : ''}</div><div class="dashboard-user-email">${u.email || ''}</div></div></div></td>
        <td>${buildRoleCell(u._id, u.role, name)}</td>
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td><span class="dash-members-lastseen">${lastSeen ? new Date(lastSeen).toLocaleDateString() : '-'}</span></td>
        <td>
          <button class="dash-eye-btn dash-view-profile" data-user='${JSON.stringify({ id: u._id, name, email: u.email, role: u.role, avatar: u.avatar, username: u.username, displayName: u.displayName, about: u.about, banned: u.banned, timedOutUntil: u.timedOutUntil, verified: u.verified })}' data-actions='${encodeURIComponent(actionsHtml)}' title="${t('dash_member_view_profile')}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          ${actionsHtml ? `
          <div class="dash-member-actions-wrap">
            <button class="dash-member-actions-btn" title="${t('common_actions')}">&#x2026;</button>
            <div class="dash-member-actions-popup" data-user-id="${u._id}">
              ${actionsHtml}
            </div>
          </div>
          ` : ''}
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.dash-view-profile').forEach(btn => {
      btn.addEventListener('click', () => openProfilePreview(btn));
    });

    tbody.querySelectorAll('.dash-member-actions-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wrap = btn.closest('.dash-member-actions-wrap');
        document.querySelectorAll('.dash-member-actions-popup.open').forEach(p => { if (p.closest('.dash-member-actions-wrap') !== wrap) p.classList.remove('open'); });
        const popup = wrap.querySelector('.dash-member-actions-popup');
        if (!popup) return;
        const isOpen = popup.classList.contains('open');
        document.querySelectorAll('.dash-member-actions-popup.open').forEach(p => p.classList.remove('open'));
        if (!isOpen) {
          popup.classList.add('open');
        }
      });
    });

    document.addEventListener('click', () => {
      document.querySelectorAll('.dash-member-actions-popup.open').forEach(p => p.classList.remove('open'));
    }, { once: false });

    tbody.querySelectorAll('.dash-member-actions-popup button').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleMemberAction(btn);
      });
    });

    tbody.querySelectorAll('.dash-role-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const userId = btn.dataset.userId;
        const roleName = decodeURIComponent(btn.dataset.roleName || '');
        if (!userId || !roleName) return;
        const removed = await removeMemberRole(userId, roleName);
        if (removed) {
          await loadMembers();
          window.dispatchEvent(new CustomEvent('identityChanged'));
        }
      });
    });
  };

  if (searchInput) searchInput.addEventListener('input', render);
  render();
}

/* ===================== MISC ===================== */
var _miscSettings = null;

function loadMiscSettings() {
  fetch(API_BASE_URL + '/settings', { credentials: 'include' })
    .then(function(r) { if (r.ok) return r.json(); throw new Error(); })
    .then(function(data) {
      _miscSettings = data.settings;
      var maintToggle = document.getElementById('dash-toggle-maintenance');
      var maintReason = document.getElementById('dash-reason-maintenance');
      var maintInput = document.getElementById('dash-reason-maintenance-input');
      var attackToggle = document.getElementById('dash-toggle-attack');
      var attackReason = document.getElementById('dash-reason-attack');
      var attackInput = document.getElementById('dash-reason-attack-input');
      if (maintToggle) {
        maintToggle.checked = !!_miscSettings.maintenance;
        if (maintReason) maintReason.classList.toggle('hidden', !_miscSettings.maintenance);
        if (maintInput) maintInput.value = _miscSettings.maintenanceReason || '';
      }
      if (attackToggle) {
        attackToggle.checked = !!_miscSettings.alert;
        if (attackReason) attackReason.classList.toggle('hidden', !_miscSettings.alert);
        if (attackInput) attackInput.value = _miscSettings.alert || '';
      }
    })
    .catch(function() {});
}

function saveMiscSetting(field, value, reasonField, reasonValue) {
  var body = {};
  if (field === 'maintenance') {
    body.maintenance = value;
    if (typeof reasonValue === 'string') body.maintenanceReason = reasonValue;
  } else if (field === 'alert') {
    body.alert = value ? (reasonValue || 'Site is under maintenance') : '';
  }
  fetch(API_BASE_URL + '/settings', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function(r) {
    if (r.ok) {
      _miscSettings = null;
      loadMiscSettings();
    }
  }).catch(function() {});
}

function setupMiscToggles() {
  if (setupMiscToggles._wired) return;
  setupMiscToggles._wired = true;

  var refreshBtn = document.getElementById('dash-refresh-stats');
  if (refreshBtn && !refreshBtn._wired) {
    refreshBtn._wired = true;
    refreshBtn.addEventListener('click', function() { loadStats(); });
  }

  loadMiscSettings();

  var maintToggle = document.getElementById('dash-toggle-maintenance');
  var maintReason = document.getElementById('dash-reason-maintenance');
  var maintInput = document.getElementById('dash-reason-maintenance-input');

  if (maintToggle) {
    maintToggle.addEventListener('change', function() {
      var val = maintToggle.checked;
      maintReason.classList.toggle('hidden', !val);
      var reasonText = val ? (maintInput ? maintInput.value : '') : '';
      saveMiscSetting('maintenance', val, 'maintenanceReason', reasonText);
      addLog('settings', 'Maintenance ' + (val ? 'enabled' : 'disabled'));
    });
  }

  if (maintInput) {
    maintInput.addEventListener('blur', function() {
      if (maintToggle && maintToggle.checked) {
        saveMiscSetting('maintenance', true, 'maintenanceReason', maintInput.value);
      }
    });
  }

  var attackToggle = document.getElementById('dash-toggle-attack');
  var attackReason = document.getElementById('dash-reason-attack');
  var attackInput = document.getElementById('dash-reason-attack-input');

  if (attackToggle) {
    attackToggle.addEventListener('change', function() {
      var val = attackToggle.checked;
      attackReason.classList.toggle('hidden', !val);
      var reasonText = val ? (attackInput ? attackInput.value : '') : '';
      saveMiscSetting('alert', val, 'alert', reasonText);
      addLog('settings', 'Attack alert ' + (val ? 'enabled' : 'disabled'));
    });
  }

  if (attackInput) {
    attackInput.addEventListener('blur', function() {
      if (attackToggle && attackToggle.checked) {
        saveMiscSetting('alert', true, 'alert', attackInput.value);
      }
    });
  }
}

/* ===================== ORG CREATE MODAL ===================== */
function setupOrgCreateModal() {
  if (orgCreateModalApi) return orgCreateModalApi;

  const modal = document.getElementById('org-create-modal');
  if (!modal) return null;

  const closeBtn = document.getElementById('org-create-modal-close');
  const cancelBtn = document.getElementById('org-create-cancel');
  const doneBtn = document.getElementById('org-create-done');
  const nameInput = document.getElementById('org-create-name');
  const usernameInput = document.getElementById('org-create-username');
  const usernameWarning = document.getElementById('org-create-username-warning');
  const ownerWrap = document.getElementById('org-create-owner-wrap');
  const verifiedToggle = document.getElementById('org-create-verified');
  const iconInput = document.getElementById('org-create-icon-input');
  const iconBtn = document.getElementById('org-create-icon-btn');
  const iconPreview = document.getElementById('org-create-icon-preview');
  const successEl = document.getElementById('org-create-success');

  let orgIconData = '';
  let ownerSelectApi = null;
  let verifiedOrgs = [];

  // fetch verified orgs for username warning
  fetch(API_BASE_URL + '/organizations/verified', { credentials: 'include' }).then(r => r.json()).then(d => { if (d.organizations) verifiedOrgs = d.organizations.map(o => o.username); }).catch(() => {});

  async function open() {
    if (nameInput) nameInput.value = '';
    if (usernameInput) {
      usernameInput.value = '';
      if (usernameWarning) usernameWarning.style.display = 'none';
    }
    orgIconData = '';
    if (verifiedToggle) verifiedToggle.checked = false;
    if (iconPreview) {
      iconPreview.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
    }
    if (successEl) successEl.style.display = 'none';
    await populateOwnerSelect();
    modal.classList.add('open');
  }

  function close() {
    modal.classList.remove('open');
  }

  async function populateOwnerSelect() {
    try {
      var users = JSON.parse(localStorage.getItem('dashCachedUsers') || '[]');
      if (users.length === 0) {
        const r = await fetch(API_BASE_URL + '/admin/users', { credentials: 'include' });
        if (r.ok) { const d = await r.json(); users = d.users || []; localStorage.setItem('dashCachedUsers', JSON.stringify(users)); }
      }
      if (ownerWrap) {
        ownerWrap.innerHTML = '';
        ownerSelectApi = buildUserSelect(ownerWrap, users, '', (val) => {});
      }
    } catch {}
  }

  if (iconBtn && iconInput) {
    iconBtn.addEventListener('click', () => iconInput.click());
    iconInput.addEventListener('change', () => {
      const file = iconInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        orgIconData = e.target.result;
        iconPreview.innerHTML = '<img src="' + orgIconData + '" alt="" style="max-width:100%;max-height:100%;border-radius:4px">';
      };
      reader.readAsDataURL(file);
      iconInput.value = '';
    });
  }

  if (usernameInput) {
    usernameInput.addEventListener('input', () => {
      if (usernameWarning) {
        const val = usernameInput.value.trim().toLowerCase();
        if (val && verifiedOrgs.includes(val)) usernameWarning.style.display = '';
        else usernameWarning.style.display = 'none';
      }
    });
  }

  if (doneBtn && !doneBtn._wired) {
    doneBtn._wired = true;
    doneBtn.addEventListener('click', async () => {
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) { showSavedText(doneBtn, 'Name required'); return; }
      doneBtn.disabled = true; doneBtn.textContent = 'Creating...';
      try {
        const ownerVal = ownerSelectApi ? ownerSelectApi.getValue() : '';
        const body = {
          name,
          about: '',
          avatar: orgIconData,
          verified: verifiedToggle ? verifiedToggle.checked : false,
          owner: ownerVal
        };
        if (usernameInput) {
          const uv = usernameInput.value.trim();
          if (uv) body.username = uv;
        }
        await createOrg(body);
        await fetchOrgs();
        const orgs = loadOrgs();
        if (successEl) {
          successEl.style.display = 'block';
          if (orgListRefreshCallback) orgListRefreshCallback(orgs);
          window.dispatchEvent(new CustomEvent('identityChanged'));
          addLog('settings', 'Created organization: ' + name);
          setTimeout(() => {
            successEl.style.display = 'none';
            close();
            doneBtn.disabled = false; doneBtn.textContent = 'Create';
          }, 1200);
        } else {
          close();
          if (orgListRefreshCallback) orgListRefreshCallback(orgs);
          showSavedText(doneBtn, 'Created!');
          addLog('settings', 'Created organization: ' + name);
          window.dispatchEvent(new CustomEvent('identityChanged'));
          doneBtn.disabled = false; doneBtn.textContent = 'Create';
        }
      } catch (e) {
        showToast(e.message || 'Failed to create org');
        doneBtn.disabled = false; doneBtn.textContent = 'Create';
      }
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (cancelBtn) cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', function escOrg(e) { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });

  orgCreateModalApi = { open, close };
  return orgCreateModalApi;
}

function setupOrgEditorModal() {
  if (setupOrgEditorModal._wired) return;
  setupOrgEditorModal._wired = true;

  const editorModal = document.getElementById('dash-org-editor-modal');
  const nameInput = document.getElementById('dash-org-name-input');
  const aboutInput = document.getElementById('dash-org-about-input');
  const ownerWrap = document.getElementById('dash-org-owner-wrap');
  const verifiedToggle = document.getElementById('dash-org-verified');
  const saveBtn = document.getElementById('dash-save-org');
  const deleteBtn = document.getElementById('dash-delete-org');
  const avatarBtn = document.getElementById('dash-org-avatar-btn');
  const avatarInput = document.getElementById('dash-org-avatar-input');
  const avatarPreview = document.getElementById('dash-org-avatar-preview');
  const avatarRemove = document.getElementById('dash-org-avatar-remove');

  function closeOrgEditor() {
    if (editorModal) editorModal.classList.remove('open');
    orgEditorEditingId = null;
    if (nameInput) nameInput.value = '';
    if (ownerWrap) ownerWrap.innerHTML = '';
    if (aboutInput) aboutInput.value = '';
    orgEditorAvatarData = '';
    if (verifiedToggle) verifiedToggle.checked = false;
    orgEditorOwnerSelectApi = null;
  }

  if (saveBtn && !saveBtn._wired) {
    saveBtn._wired = true;
    saveBtn.addEventListener('click', async () => {
      if (!orgEditorEditingId) return;
      const orgs = loadOrgs();
      const existing = orgs.find(o => o._id === orgEditorEditingId);
      if (!existing) return;
      existing.name = nameInput ? nameInput.value.trim() || 'Unnamed' : existing.name;
      existing.about = aboutInput ? aboutInput.value.trim() : existing.about;
      if (orgEditorAvatarData) existing.avatar = orgEditorAvatarData;
      const ownerVal = orgEditorOwnerSelectApi ? orgEditorOwnerSelectApi.getValue() : '';
      if (ownerVal) existing.owner = ownerVal;
      const dashOrgUsernameInput2 = document.getElementById('dash-org-username-input');
      if (dashOrgUsernameInput2) {
        const uv = dashOrgUsernameInput2.value.trim();
        if (uv) existing.username = uv;
      }
      const updates = { name: existing.name, about: existing.about, avatar: existing.avatar };
      if (existing.username) updates.username = existing.username;
      if (ownerVal) updates.owner = existing.owner;
      if (verifiedToggle) {
        existing.verified = verifiedToggle.checked;
        updates.verified = existing.verified;
      }
      try {
        await updateOrg(existing._id, updates);
        await fetchOrgs();
        if (orgListRefreshCallback) orgListRefreshCallback(loadOrgs());
      } catch (e) {
        showToast(e.message || 'Failed to update org');
        return;
      }
      closeOrgEditor();
      showSavedText(saveBtn, 'Saved!');
      addLog('settings', 'Saved organization');
      window.dispatchEvent(new CustomEvent('identityChanged'));
    });
  }

  if (deleteBtn && !deleteBtn._wired) {
    deleteBtn._wired = true;
    deleteBtn.addEventListener('click', async () => {
      if (!orgEditorEditingId) return;
      const orgs = loadOrgs();
      const existing = orgs.find(o => o._id === orgEditorEditingId);
      if (!existing) return;
      try {
        await deleteOrg(existing._id);
        await fetchOrgs();
        if (orgListRefreshCallback) orgListRefreshCallback(loadOrgs());
      } catch (e) {
        showToast(e.message || 'Failed to delete org');
        return;
      }
      closeOrgEditor();
      addLog('settings', 'Deleted organization');
      window.dispatchEvent(new CustomEvent('identityChanged'));
    });
  }

  if (avatarBtn && avatarInput && !avatarBtn._wired) {
    avatarBtn._wired = true;
    avatarBtn.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', () => {
      const file = avatarInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        orgEditorAvatarData = e.target.result;
        if (avatarPreview) avatarPreview.innerHTML = '<img src="' + orgEditorAvatarData + '" alt="" style="max-width:60px;max-height:60px;border-radius:4px">';
        if (avatarRemove) avatarRemove.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
      avatarInput.value = '';
    });
  }

  if (avatarRemove && !avatarRemove._wired) {
    avatarRemove._wired = true;
    avatarRemove.addEventListener('click', () => {
      orgEditorAvatarData = '';
      if (avatarPreview) {
        avatarPreview.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
      }
      avatarRemove.classList.add('hidden');
    });
  }

  if (!setupOrgEditorModal._usernameWired) {
    setupOrgEditorModal._usernameWired = true;
    let vu = [];
    fetch(API_BASE_URL + '/organizations/verified', { credentials: 'include' }).then(r => r.json()).then(d => { if (d.organizations) vu = d.organizations.map(o => o.username); }).catch(() => {});
    const inp = document.getElementById('dash-org-username-input');
    if (inp) {
      inp.addEventListener('input', () => {
        const w = document.getElementById('dash-org-username-warning');
        if (w) {
          if (vu.includes(inp.value.trim().toLowerCase())) w.classList.remove('hidden');
          else w.classList.add('hidden');
        }
      });
    }
  }
}


/* ===================== ORGANIZATIONS ===================== */
function loadOrgs() {
  return getCachedOrgs();
}

async function setupOrganizations(initialOrgs) {
  try {
    const list = document.getElementById('dash-orgs-list');
    const editorModal = document.getElementById('dash-org-editor-modal');
    const nameInput = document.getElementById('dash-org-name-input');
    const ownerWrap = document.getElementById('dash-org-owner-wrap');
    const aboutInput = document.getElementById('dash-org-about-input');
    const avatarPreview = document.getElementById('dash-org-avatar-preview');
    const avatarRemove = document.getElementById('dash-org-avatar-remove');
    const verifiedToggle = document.getElementById('dash-org-verified');
    if (!list) return;

    let orgs = initialOrgs && initialOrgs.length ? initialOrgs : loadOrgs();
    if (orgs.length === 0) {
      orgs = loadOrgs();
      if (orgs.length === 0) {
        await fetchOrgs();
        orgs = loadOrgs();
      }
    }

  function renderOrgsList(orgsData) {
    orgs = orgsData;
    if (orgs.length === 0) {
      list.innerHTML = '<div class="dash-empty-state"><p data-i18n="dash_orgs_empty">No organizations yet.</p></div>';
      return;
    }
    list.innerHTML = orgs.map(o => {
      const oid = o._id;
      const avatarUrl = o.avatar && (o.avatar.startsWith('http') || o.avatar.startsWith('data:') ? o.avatar : BACKEND_ORIGIN + o.avatar);
      return `<div class="dash-org-item" data-id="${oid}">
      <div class="dash-org-avatar-sm">${avatarUrl ? '<img src="' + avatarUrl + '" alt="">' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'}</div>
      <div class="dash-org-info"><div class="dash-org-name"><span>${o.name}</span>${o.verified ? '<span class="org-verified-tick">' + VERIFIED_TICK + '</span>' : ''}</div></div>
    </div>`}).join('');
    list.querySelectorAll('.dash-org-item').forEach(el => {
      el.addEventListener('click', () => openOrgEditor(el.dataset.id));
    });
  }

  orgListRefreshCallback = renderOrgsList;
  renderOrgsList(orgs);

  function openOrgEditor(id) {
    orgEditorEditingId = id;
    const org = orgs.find(o => o._id === id) || { name: '', about: '', avatar: '', verified: false };
    if (nameInput) nameInput.value = org.name || '';
    const dashOrgUsernameInput = document.getElementById('dash-org-username-input');
    if (dashOrgUsernameInput) dashOrgUsernameInput.value = org.username || '';
    const users = loadCachedUsers();
    const ownerId = (org.owner && typeof org.owner === 'object') ? org.owner._id : (org.owner || '');
    if (ownerWrap) {
      ownerWrap.innerHTML = '';
      orgEditorOwnerSelectApi = buildUserSelect(ownerWrap, users, ownerId, (val) => {});
    }
    if (aboutInput) aboutInput.value = org.about || '';
    orgEditorAvatarData = org.avatar || '';
    if (verifiedToggle) verifiedToggle.checked = !!org.verified;

    const switcher = document.getElementById('dash-org-switcher');
    if (switcher) {
      if (orgs.length > 1) {
        switcher.innerHTML = `<button type="button" class="dash-btn dash-btn-sm" id="dash-org-switcher-btn" style="display:flex;align-items:center;gap:4px">${org.name}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg></button><div id="dash-org-switcher-menu" style="display:none;position:absolute;top:100%;inset-inline-end:0;min-width:180px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-sm);z-index:10;box-shadow:var(--shadow-md)"></div>`;
        const menu = document.getElementById('dash-org-switcher-menu');
        if (menu) {
          menu.innerHTML = orgs.map(o => `<div data-org-id="${o._id}" style="padding:8px 12px;cursor:pointer;font-size:0.85rem;border-bottom:1px solid var(--border-color);transition:background var(--transition-fast);${o._id === id ? 'background:var(--color-primary-light);color:var(--color-primary);font-weight:600' : ''}">${o.name}</div>`).join('');
          menu.querySelectorAll('[data-org-id]').forEach(el => {
            el.addEventListener('click', () => {
              if (el.dataset.orgId !== orgEditorEditingId) openOrgEditor(el.dataset.orgId);
              menu.style.display = 'none';
            });
          });
        }
        const btn = document.getElementById('dash-org-switcher-btn');
        if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); menu.style.display = menu.style.display === 'none' ? 'block' : 'none'; });
        document.addEventListener('click', function closeMenu(e) { if (!switcher.contains(e.target)) { menu.style.display = 'none'; document.removeEventListener('click', closeMenu); } });
      } else {
        switcher.innerHTML = '';
      }
    }

    if (editorModal) editorModal.classList.add('open');
    renderDashOrgMembers(org);
    populateDashOrgMemberSelect(org);
    if (orgEditorAvatarData && avatarPreview) {
      const url = orgEditorAvatarData.startsWith('http') || orgEditorAvatarData.startsWith('data:') ? orgEditorAvatarData : BACKEND_ORIGIN + orgEditorAvatarData;
      avatarPreview.innerHTML = '<img src="' + url + '" alt="" style="max-width:60px;max-height:60px;border-radius:4px">';
      if (avatarRemove) avatarRemove.classList.remove('hidden');
    } else {
      if (avatarPreview) avatarPreview.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
      if (avatarRemove) avatarRemove.classList.add('hidden');
    }
  }
  window.__openOrgEditor = openOrgEditor;

  /* --- Dashboard org editor member management --- */
  function renderDashOrgMembers(org) {
    const list = document.getElementById('dash-org-members-list');
    const section = document.getElementById('dash-org-members-section');
    if (!list || !section) return;
    const cu = getCurrentUser();
    const isOwner = org && cu && (org.owner && typeof org.owner === 'object' ? org.owner._id : org.owner) === cu._id;
    section.style.display = isOwner ? 'block' : 'none';
    if (!isOwner || !org) return;
    const members = org.members || [];
    if (members.length === 0) {
      list.innerHTML = '<p style="margin:4px 0;font-size:0.85rem;color:var(--text-muted)">No members added yet</p>';
    } else {
      list.innerHTML = members.map(m => {
        const id = (typeof m === 'object' ? m._id : m) || '';
        const users = loadCachedUsers();
        const found = users.find(u => u._id === id);
        const displayName = found ? (found.displayName || found.name || found.email || id) : id;
        const av = found ? found.avatar : null;
        const avUrl = av ? (av.startsWith('http') || av.startsWith('data:') ? av : BACKEND_ORIGIN + av) : null;
        const img = avUrl ? '<img src="' + avUrl + '" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--bg-glass);margin-left:6px">' : '<div class="user-select-avatar-placeholder" style="width:20px;height:20px;font-size:0.65rem;display:inline-flex;margin-left:6px">' + displayName.charAt(0).toUpperCase() + '</div>';
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;font-size:0.85rem"><span style="display:flex;align-items:center">' + img + displayName + '</span><button type="button" class="dash-btn dash-btn-xs dash-btn-outline dash-org-member-remove" data-val="' + id.replace(/"/g, '&quot;') + '" style="color:var(--color-danger);border-color:var(--color-danger);padding:2px 8px;font-size:0.75rem">&times;</button></div>';
      }).join('');
      list.querySelectorAll('.dash-org-member-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const remVal = btn.dataset.val;
          await removeMember(org._id, remVal);
          const updated = getCachedOrgs().find(o => o._id === org._id);
          if (updated) {
            renderDashOrgMembers(updated);
            populateDashOrgMemberSelect(updated);
          }
        });
      });
    }
  }

  function populateDashOrgMemberSelect(org) {
    const select = document.getElementById('dash-org-member-select');
    if (!select) return;
    const users = loadCachedUsers();
    const ownerId = (org.owner && typeof org.owner === 'object') ? org.owner._id : org.owner;
    const memberIds = (org.members || []).map(m => typeof m === 'object' ? m._id : m);
    const filtered = users.filter(u => u._id !== ownerId && !memberIds.includes(u._id));
    if (filtered.length === 0) {
      select.innerHTML = '<option disabled>No available users</option>';
      return;
    }
    select.innerHTML = filtered.map(u => '<option value="' + u._id + '">' + (u.displayName || u.name || u.email) + ' (@' + (u.username || '') + ')</option>').join('');
    // show avatars for selected users
    renderMemberSelectChips('dash-org-member-chips', select);
    select.addEventListener('change', () => renderMemberSelectChips('dash-org-member-chips', select));
  }

  const dashAddMemberBtn = document.getElementById('dash-org-add-member-btn');
  if (dashAddMemberBtn) {
    dashAddMemberBtn.addEventListener('click', async () => {
      const select = document.getElementById('dash-org-member-select');
      if (!select || !orgEditorEditingId) return;
      const userIds = Array.from(select.selectedOptions).map(o => o.value);
      if (userIds.length === 0) { showToast('Select at least one user'); return; }
      try {
        await addMember(orgEditorEditingId, userIds);
        showToast('Members added');
        const updated = getCachedOrgs().find(o => o._id === orgEditorEditingId);
        if (updated) {
          renderDashOrgMembers(updated);
          populateDashOrgMemberSelect(updated);
        }
      } catch (e) { showToast(e.message || 'Failed to add members'); }
    });
  }
  /* --- End member management --- */
  } catch (e) { console.error('setupOrganizations error:', e); }
}

/* ===================== UNSAVED ===================== */
function showUnsavedPopup() {
  const popup = document.getElementById('dash-unsaved-popup');
  if (!popup) return;
  popup.classList.add('show');
  clearTimeout(popup._hideTimer);
  popup._hideTimer = setTimeout(() => popup.classList.remove('show'), 3000);
}

function setupUnsavedWarning() {}




function showSaved(btn) { showSavedText(btn, 'Saved!'); }
function showSavedText(el, text) {
  if (!el) return;
  const btn = el.tagName === 'BUTTON' ? el : el.querySelector('button') || el;
  const orig = btn.textContent;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = orig; }, 2000);
}

function openProfilePreview(btn) {
  var modal = document.getElementById('profile-preview-modal');
  var body = document.getElementById('profile-preview-body');
  var closeBtn = document.getElementById('profile-preview-close');
  var actionsWrap = document.getElementById('profile-preview-actions-wrap');
  var actionsPopup = document.getElementById('profile-preview-actions-popup');
  var actionsBtn = document.getElementById('profile-preview-actions-btn');
  if (!modal || !body) return;
  var u = JSON.parse(btn.dataset.user);
  var lang = getCurrentLanguage();
  var actionsRaw = btn.dataset.actions ? decodeURIComponent(btn.dataset.actions) : '';
  var avatarSrc = u.avatar || '';
  var displayName = u.displayName || u.name;
  var roleLabel = lang === 'ar'
    ? (u.role === 'admin' ? 'ادمن' : u.role === 'developer' ? 'مطور' : u.role === 'moderator' ? 'مشرف' : 'عضو')
    : (u.role === 'admin' ? 'Admin' : u.role === 'developer' ? 'Developer' : u.role === 'moderator' ? 'Moderator' : 'Member');
  var isOwnerUser = u.role === 'user' && typeof userHasOwnerRole === 'function' && userHasOwnerRole(u._id);
  var badgeClass = isOwnerUser ? 'owner' : (u.role === 'developer' ? 'developer' : u.role === 'admin' ? 'admin' : u.role === 'moderator' ? 'moderator' : 'user');
  var badgeLabel = isOwnerUser ? (lang === 'ar' ? 'مالك' : 'Owner') : roleLabel;
  var aboutText = u.about || (lang === 'ar' ? 'لا يوجد وصف' : 'No description');
  var tick = u.verified ? VERIFIED_TICK.replace('class="auth-verified-tick"', 'class="auth-verified-tick" style="width:16px;height:16px"') : '';
  body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;padding:24px 16px;text-align:center">'
    + '<div style="width:72px;height:72px;border-radius:50%;overflow:hidden;background:var(--bg-secondary);border:2px solid var(--border-color);margin-bottom:12px;flex-shrink:0">'
    + (avatarSrc ? '<img src="' + avatarSrc + '" style="width:100%;height:100%;object-fit:cover" onerror="this.remove()">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:var(--text-muted);font-weight:600">' + displayName.charAt(0).toUpperCase() + '</div>')
    + '</div>'
    + '<div style="font-size:1.1rem;font-weight:700;margin-bottom:4px">' + displayName + (tick ? ' ' + tick : '') + '</div>'
    + '<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px">@' + (u.username || u.name) + '</div>'
    + '<span class="dashboard-role-badge ' + badgeClass + '" style="margin-top:4px;font-size:0.75rem">' + badgeLabel + '</span>'
    + (u.email ? '<div style="font-size:0.8rem;color:var(--text-muted);margin-top:8px">' + u.email + '</div>' : '')
    + '<p style="margin-top:12px;color:var(--text-secondary);font-size:0.85rem;line-height:1.5">' + aboutText + '</p>'
    + '</div>';
  if (actionsRaw && actionsWrap && actionsPopup) {
    actionsWrap.style.display = '';
    actionsPopup.innerHTML = actionsRaw;
    actionsPopup.addEventListener('click', function(e) {
      var actionBtn = e.target.closest('button[data-action]');
      if (!actionBtn) return;
      e.stopPropagation();
      actionsPopup.classList.remove('open');
      handleMemberAction(actionBtn);
    });
    actionsBtn.onclick = function(e) {
      e.stopPropagation();
      document.querySelectorAll('.dash-member-actions-popup.open').forEach(function(p) { if (p !== actionsPopup) p.classList.remove('open'); });
      var isOpen = actionsPopup.classList.contains('open');
      document.querySelectorAll('.dash-member-actions-popup.open').forEach(function(p) { p.classList.remove('open'); });
      if (!isOpen) {
        actionsPopup.classList.add('open');
      }
    };
  } else if (actionsWrap) {
    actionsWrap.style.display = 'none';
  }
  modal.classList.add('open');
  function closeProfilePreview() {
    modal.classList.remove('open');
    if (actionsPopup) { actionsPopup.innerHTML = ''; actionsPopup.classList.remove('open'); }
    closeBtn.removeEventListener('click', closeProfilePreview);
    modal.removeEventListener('click', overlayClose);
  }
  function overlayClose(e) {
    if (e.target === modal) closeProfilePreview();
  }
  closeBtn.addEventListener('click', closeProfilePreview);
  modal.addEventListener('click', overlayClose);
}
