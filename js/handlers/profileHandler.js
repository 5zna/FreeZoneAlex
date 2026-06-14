import { API_BASE_URL } from '../core/constants.js';import { onAuthChange, refreshUser, getActiveIdentity, setActiveIdentity, isAdmin, showToast } from './authHandler.js';import { translateStaticContent, getCurrentLanguage } from './translationHandler.js';import { getCachedOrgs, fetchOrgs, updateOrg, addMember, removeMember, isOrgOwner, isOrgMember, getOrgsForUser } from './orgHandler.js';import { lockBodyScroll } from '../core/utils.js';const BACKEND_ORIGIN = API_BASE_URL.replace('/api', '');let currentUser = null;let charLimit = 5000;export function initProfileHandler() { onAuthChange((user) => { currentUser = user; }); setupProfileTrigger(); setupProfileModal(); setupEditorToolbar(); setupAvatarUpload(); setupProfileSave(); setupProfileTabs(); setupOrgSection(); setupLinkedAccounts();
}
function renderLinkedAccount(container, provider, linked, onLink, onUnlink) { 
  if (provider === 'facebook') return; // Skip Facebook entirely
  
  var svg = '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.54 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.56l7.98-5.97z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/></svg>'; 
  var name = provider.charAt(0).toUpperCase() + provider.slice(1); 
  var row = document.createElement('div'); 
  row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-color)'; 
  if (linked) { 
    row.innerHTML = svg + '<span style="flex:1;font-size:0.85rem">' + name + '</span><span style="font-size:0.8rem;color:var(--color-success);font-weight:600">Linked</span><button type="button" class="linked-acct-unlink" style="padding:4px 10px;font-size:0.75rem;background:var(--color-accent);color:white;border:none;border-radius:var(--radius-sm);cursor:pointer">Unlink</button>'; 
    row.querySelector('.linked-acct-unlink').addEventListener('click', function(e) { 
      e.stopPropagation(); 
      if (confirm('Unlink your ' + name + ' account?')) onUnlink(); 
    }); 
  } else { 
    row.innerHTML = svg + '<span style="flex:1;font-size:0.85rem">' + name + '</span><button type="button" class="linked-acct-link" style="padding:6px 14px;font-size:0.8rem;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-sm);cursor:pointer;font-weight:500">Link ' + name + '</button>'; 
    row.querySelector('.linked-acct-link').addEventListener('click', function(e) { 
      e.stopPropagation(); 
      onLink(); 
    }); 
  } 
  container.appendChild(row); 
}
function refreshLinkedAccountsUI() {
  if (!currentUser) return;
  var wrap = document.getElementById('profile-linked-accounts');
  var list = document.getElementById('profile-linked-accounts-list');
  if (!wrap || !list) return;
  wrap.style.display = 'none';
  list.innerHTML = '';
  renderLinkedAccount(list, 'google', !!currentUser.googleId, function() {
    window.location.href = API_BASE_URL.replace('/api', '') + '/api/auth/link/google';
  }, function() {
    fetch(API_BASE_URL + '/auth/unlink/google', { method: 'POST', credentials: 'include' }).then(function(r) {
      if (r.ok) {
        r.json().then(function(d) {
          currentUser = d.user;
          refreshUser().then(function() { refreshLinkedAccountsUI(); refreshProfileModalIfOpen(); });
          showToast('Google unlinked');
        });
      } else { showToast('Failed to unlink Google'); }
    }).catch(function() { showToast('Failed to unlink Google'); });
  });
  renderLinkedAccount(list, 'facebook', !!currentUser.facebookId, function() {
    window.location.href = API_BASE_URL.replace('/api', '') + '/api/auth/link/facebook';
  }, function() {
    fetch(API_BASE_URL + '/auth/unlink/facebook', { method: 'POST', credentials: 'include' }).then(function(r) {
      if (r.ok) {
        r.json().then(function(d) {
          currentUser = d.user;
          refreshUser().then(function() { refreshLinkedAccountsUI(); refreshProfileModalIfOpen(); });
          showToast('Facebook unlinked');
        });
      } else { showToast('Failed to unlink Facebook'); }
    }).catch(function() { showToast('Failed to unlink Facebook'); });
  });
  if (list.children.length > 0) wrap.style.display = '';
}
async function refreshProfileModalIfOpen() {
  if (refreshProfileModalIfOpen._busy) return;
  var modal = document.getElementById('profile-modal');
  if (!modal || !modal.classList.contains('open') || !currentUser) return;
  refreshProfileModalIfOpen._busy = true;
  try {
  var nameInput = document.getElementById('profile-name-input');
  var usernameInput = document.getElementById('profile-username-input');
  var avatarImg = document.getElementById('profile-avatar-img');
  var avatarPlaceholder = document.getElementById('profile-avatar-placeholder');
  var avatarName = document.getElementById('profile-avatar-name');
  var editor = document.getElementById('profile-about-editor');
  var charCount = document.getElementById('profile-char-count');
  if (nameInput) nameInput.value = currentUser.displayName || currentUser.name || '';
  if (usernameInput) usernameInput.value = currentUser.username || '';
  if (avatarName) avatarName.textContent = currentUser.name || '';
  var avatarUrl = getAvatarUrl(currentUser.avatar);
  if (avatarUrl) {
    if (avatarImg) { avatarImg.src = avatarUrl; avatarImg.classList.remove('hidden'); }
    if (avatarPlaceholder) avatarPlaceholder.classList.add('hidden');
  } else {
    if (avatarImg) avatarImg.classList.add('hidden');
    if (avatarPlaceholder) {
      avatarPlaceholder.classList.remove('hidden');
      avatarPlaceholder.textContent = (currentUser.name || 'U').charAt(0).toUpperCase();
    }
  }
  if (editor) { editor.innerHTML = currentUser.about || ''; updateCharCount(editor, charCount); }
  refreshLinkedAccountsUI();
  await fetchOrgs();
  var orgTab = document.getElementById('profile-org-tab');
  var org = await getAccessibleOrg();
  if (orgTab) orgTab.classList.toggle('hidden', !org);
  if (org) {
    var orgContent = document.querySelector('.profile-tab-content[data-tab="org"]');
    if (orgContent && orgContent.classList.contains('active')) populateOrgTab(org);
  }
  } finally {
    refreshProfileModalIfOpen._busy = false;
  }
}
function setupLinkedAccounts() {
  var modal = document.getElementById('profile-modal');
  if (!modal) return;
  onAuthChange(function(user) {
    currentUser = user;
    refreshProfileModalIfOpen();
  });
  window.addEventListener('identityChanged', function() {
    refreshProfileModalIfOpen();
  });
  var obs = new MutationObserver(function() {
    if (!modal.classList.contains('open') || !currentUser) return;
    refreshLinkedAccountsUI();
  });
  obs.observe(modal, { attributes: true, attributeFilter: ['class'] });
}
function setupProfileTrigger() { document.addEventListener('click', (e) => { const btn = e.target.closest('#auth-edit-profile-btn'); if (btn) { e.preventDefault(); openProfileModal(); } });
}
function getAvatarUrl(avatar) { if (!avatar) return null; if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:')) return avatar; return `${BACKEND_ORIGIN}${avatar}`;
}
function getCurrentUserIdentifier() { const nameEl = document.getElementById('auth-user-name'); return nameEl ? nameEl.textContent.trim() : null;
}
function getUserOrgs() { if (!currentUser) return []; const serverOrgs = getCachedOrgs(); if (serverOrgs.length > 0) return getOrgsForUser(currentUser); return [];
}
function getCurrentUserOrg() { if (!currentUser) return null; const serverOrgs = getCachedOrgs(); if (serverOrgs.length > 0) { return serverOrgs.find(o => isOrgOwner(o, currentUser)) || null; } return null;
}
async function getAccessibleOrg() { if (!currentUser) return null; const all = getUserOrgs(); if (all.length > 0) return all[0]; await fetchOrgs(); const refreshed = getUserOrgs(); return refreshed.length > 0 ? refreshed[0] : null;} window.__debugOrg = async () => { const cu = currentUser; const co = getCachedOrgs(); let fetchResult = null; try { const res = await fetch('http://127.0.0.1:4000/api/organizations', { credentials: 'include' }); fetchResult = { status: res.status, ok: res.ok, body: await res.json() }; } catch (e) { fetchResult = { error: e.message }; } return { currentUser: cu ? { _id: cu._id, email: cu.email, name: cu.name, displayName: cu.displayName } : null, cachedOrgs: co, fetchResult };};async function openProfileModal() { const modal = document.getElementById('profile-modal'); if (!modal || !currentUser) return; const nameInput = document.getElementById('profile-name-input'); const avatarImg = document.getElementById('profile-avatar-img'); const avatarPlaceholder = document.getElementById('profile-avatar-placeholder'); const avatarName = document.getElementById('profile-avatar-name'); const editor = document.getElementById('profile-about-editor'); const charCount = document.getElementById('profile-char-count'); if (nameInput) nameInput.value = currentUser.displayName || currentUser.name; const usernameInput = document.getElementById('profile-username-input'); if (usernameInput) usernameInput.value = currentUser.username || ''; if (avatarName) avatarName.textContent = currentUser.name; const avatarUrl = getAvatarUrl(currentUser.avatar); if (avatarUrl) { if (avatarImg) { avatarImg.src = avatarUrl; avatarImg.classList.remove('hidden'); } if (avatarPlaceholder) avatarPlaceholder.classList.add('hidden'); } else { if (avatarImg) avatarImg.classList.add('hidden'); if (avatarPlaceholder) { avatarPlaceholder.classList.remove('hidden'); avatarPlaceholder.textContent = currentUser.name.charAt(0).toUpperCase(); } } if (editor) { editor.innerHTML = currentUser.about || ''; updateCharCount(editor, charCount); } await fetchOrgs(); const orgTab = document.getElementById('profile-org-tab'); const org = await getAccessibleOrg(); if (orgTab) orgTab.classList.toggle('hidden', !org); if (org) populateOrgTab(org); document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active')); document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.remove('active')); const profileTab = document.querySelector('.profile-tab[data-tab="profile"]'); const profileContent = document.querySelector('.profile-tab-content[data-tab="profile"]'); if (profileTab) profileTab.classList.add('active'); if (profileContent) profileContent.classList.add('active'); modal.classList.add('open'); lockBodyScroll(true);
}
function resolveMemberName(val) { if (!currentUser) return val; try { const users = JSON.parse(localStorage.getItem('dashCachedUsers') || '[]'); const v = val.toString(); const found = users.find(u => (u._id && u._id === v) || (u.email && u.email.toLowerCase() === v.toLowerCase())); if (found) return found.displayName || found.name || found.email || v; } catch {} return val;
}
function getAvatarHtml(avatar, name) { if (!avatar) return '<div class="user-select-avatar-placeholder" style="width:20px;height:20px;font-size:0.65rem;display:inline-flex;margin:0 4px 0 0;vertical-align:middle">' + name.charAt(0).toUpperCase() + '</div>'; const avUrl = avatar.startsWith('http') || avatar.startsWith('data:') ? avatar : BACKEND_ORIGIN + avatar; return '<img src="' + avUrl + '" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;margin:0 4px 0 0">';
}
function renderOrgMembers(org) { const membersList = document.getElementById('profile-org-members-list'); const membersSection = document.getElementById('profile-org-members-section'); if (!membersList || !membersSection) return; const isOwner = isOrgOwner(org, currentUser); membersSection.style.display = isOwner ? 'block' : 'none'; if (!isOwner) return; const members = org.members || []; if (members.length === 0) { membersList.innerHTML = '<p class="profile-org-members-empty">No members added yet</p>'; } else { const allUsers = (() => { try { return JSON.parse(localStorage.getItem('dashCachedUsers') || '[]'); } catch { return []; } })(); membersList.innerHTML = members.map(m => { const id = (typeof m === 'object' ? m._id : m) || ''; const found = allUsers.find(u => u._id === id); const displayName = found ? (found.displayName || found.name || found.email || id) : (typeof m === 'object' ? (m.displayName || m.name || m.email || id) : resolveMemberName(id)); const avatar = found ? found.avatar : null; const img = getAvatarHtml(avatar, displayName); return '<div class="profile-org-member-item" style="display:flex;align-items:center"><span class="profile-org-member-email" style="display:flex;align-items:center">' + img + displayName + '</span><button class="profile-org-member-remove" data-val="' + id.replace(/"/g, '&quot;') + '">&times;</button></div>'; }).join(''); membersList.querySelectorAll('.profile-org-member-remove').forEach(btn => { btn.addEventListener('click', async (e) => { e.stopPropagation(); const remVal = btn.dataset.val; const oid = org._id; await removeMember(oid, remVal); const updated = getCachedOrgs().find(o => o._id === oid); if (updated) renderOrgMembers(updated); window.dispatchEvent(new CustomEvent('identityChanged')); }); }); }
}
function populateOrgTab(org) { const nameInput = document.getElementById('profile-org-name-input'); const aboutInput = document.getElementById('profile-org-about-input'); const nameDisplay = document.getElementById('profile-org-name-display'); const avatarImg = document.getElementById('profile-org-avatar-img'); const avatarPlaceholder = document.getElementById('profile-org-avatar-placeholder'); const avatarOverlay = document.getElementById('profile-org-avatar-overlay'); const saveBtn = document.getElementById('profile-org-save-btn'); const membersSection = document.getElementById('profile-org-members-section'); const subtitle = document.querySelector('#profile-org-content .profile-info p'); const isOwner = isOrgOwner(org, currentUser); if (nameInput) { nameInput.value = org.name || ''; nameInput.disabled = !isOwner; } if (aboutInput) { aboutInput.value = org.about || ''; aboutInput.disabled = !isOwner; } const usernameInput = document.getElementById('profile-org-username-input'); if (usernameInput) { usernameInput.value = org.username || ''; usernameInput.disabled = isOwner && !isAdmin(); } if (nameDisplay) { const allOrgs = getUserOrgs(); if (allOrgs.length > 1) { nameDisplay.innerHTML = `<span style="cursor:pointer;display:inline-flex;align-items:center;gap:4px" id="profile-org-switcher-trigger">${org.name || 'Organization'}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg></span>`; const trigger = document.getElementById('profile-org-switcher-trigger'); if (trigger) { const existingMenu = document.getElementById('profile-org-switcher-menu'); if (existingMenu) existingMenu.remove(); const menu = document.createElement('div'); menu.id = 'profile-org-switcher-menu'; menu.style.cssText = 'display:none;position:absolute;top:100%;inset-inline-start:0;min-width:180px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-sm);z-index:20;box-shadow:var(--shadow-md)'; menu.innerHTML = allOrgs.map(o => `<div data-org-id="${o._id}" style="padding:8px 12px;cursor:pointer;font-size:0.85rem;border-bottom:1px solid var(--border-color);transition:background var(--transition-fast);${o._id === org._id ? 'background:var(--color-primary-light);color:var(--color-primary);font-weight:600' : ''}">${o.name}</div>`).join(''); menu.querySelectorAll('[data-org-id]').forEach(el => { el.addEventListener('click', () => { const oid = el.dataset.orgId; const next = allOrgs.find(o => o._id === oid); if (next && oid !== org._id) populateOrgTab(next); menu.style.display = 'none'; }); }); trigger.parentElement.style.position = 'relative'; trigger.parentElement.appendChild(menu); trigger.addEventListener('click', (e) => { e.stopPropagation(); menu.style.display = menu.style.display === 'none' ? 'block' : 'none'; }); document.addEventListener('click', function closeMenu(e) { if (!trigger.parentElement.contains(e.target)) { menu.style.display = 'none'; document.removeEventListener('click', closeMenu); } }); } } else { nameDisplay.textContent = org.name || 'Organization'; } }  if (avatarOverlay) avatarOverlay.style.pointerEvents = isOwner ? 'auto' : 'none'; if (saveBtn) saveBtn.style.display = isOwner ? '' : 'none'; if (membersSection) membersSection.style.display = isOwner ? '' : 'none'; if (subtitle) subtitle.textContent = isOwner ? (subtitle.dataset.i18n ? subtitle.textContent : 'Manage your organization profile') : 'You are a member of this organization'; if (org.avatar) { const avatarUrl = org.avatar.startsWith('http') || org.avatar.startsWith('data:') ? org.avatar : getAvatarUrl(org.avatar); if (avatarImg) { avatarImg.src = avatarUrl; avatarImg.classList.remove('hidden'); } if (avatarPlaceholder) avatarPlaceholder.classList.add('hidden'); } else { if (avatarImg) avatarImg.classList.add('hidden'); if (avatarPlaceholder) { avatarPlaceholder.classList.remove('hidden'); avatarPlaceholder.textContent = (org.name || 'O').charAt(0).toUpperCase(); } } renderOrgMembers(org); const select = document.getElementById('profile-org-member-select'); const addBtn = document.getElementById('profile-org-member-add-btn'); if (select && addBtn) { select.innerHTML = '<option value="">Select a user...</option>'; (async () => { try { let users = []; try { users = JSON.parse(localStorage.getItem('dashCachedUsers') || '[]'); } catch {} if (users.length === 0) { const res = await fetch(`${API_BASE_URL}/admin/users`, { credentials: 'include' }); if (res.ok) { const data = await res.json(); users = data.users || []; try { localStorage.setItem('dashCachedUsers', JSON.stringify(users)); } catch {} } } const ownerId = (org.owner && typeof org.owner === 'object') ? org.owner._id : org.owner;const memberIds = (org.members || []).map(m => typeof m === 'object' ? m._id : m);const filtered = users.filter(u => u._id !== ownerId && !memberIds.includes(u._id));filtered.forEach(u => { const name = (u.displayName || u.name || u.email || 'Unknown') + (u.username ? ' (@' + u.username + ')' : ''); const val = u.email || u._id || name; select.innerHTML += '<option value="' + val.replace(/"/g, '&quot;') + '">' + name.replace(/"/g, '&quot;') + '</option>'; }); } catch {} })(); addBtn.onclick = async function() { const sel = document.getElementById('profile-org-member-select');if (!sel) return;const vals = Array.from(sel.selectedOptions).map(o => o.value).filter(v => v);if (vals.length === 0) { showToast('Select at least one user'); return;  }try {const res = await fetch(API_BASE_URL + '/organizations/' + org._id + '/members', {method: 'POST',credentials: 'include',headers: {'Content-Type': 'application/json'},body: JSON.stringify({userIds: vals})});if (!res.ok) throw new Error('Failed');await fetchOrgs();const updated = getCachedOrgs().find(o => o._id === org._id);if (updated) populateOrgTab(updated);window.dispatchEvent(new CustomEvent('identityChanged'));} catch (e) {showToast(e.message || 'Failed to add members');} }; }
}
function closeProfileModal() { const modal = document.getElementById('profile-modal'); if (modal) modal.classList.remove('open'); lockBodyScroll(false);
}
function setupProfileModal() { const modal = document.getElementById('profile-modal'); if (!modal) return; const closeBtn = modal.querySelector('.auth-modal-close'); if (closeBtn) closeBtn.addEventListener('click', closeProfileModal); modal.addEventListener('click', (e) => { if (e.target === modal) closeProfileModal(); }); document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeProfileModal(); });
}
function setupProfileTabs() { document.addEventListener('click', (e) => { const tab = e.target.closest('.profile-tab'); if (!tab) return; const tabName = tab.dataset.tab; document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active')); document.querySelectorAll('.profile-tab-content').forEach(c => c.classList.remove('active')); tab.classList.add('active'); const content = document.querySelector('.profile-tab-content[data-tab="' + tabName + '"]'); if (content) content.classList.add('active'); });
}
function setupOrgSection() {
  const saveBtn = document.getElementById('profile-org-save-btn');
  if (!saveBtn) return;
  const avatarInput = document.getElementById('profile-org-avatar-input');
  const avatarOverlay = document.getElementById('profile-org-avatar-overlay');
  if (avatarOverlay && avatarInput) {
    avatarOverlay.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.getElementById('profile-org-avatar-img');
        const placeholder = document.getElementById('profile-org-avatar-placeholder');
        if (img) { img.src = ev.target.result; img.classList.remove('hidden'); }
        if (placeholder) placeholder.classList.add('hidden');
      };
      reader.readAsDataURL(file);
      avatarInput.value = '';
    });
  }
  saveBtn.addEventListener('click', async () => {
    const org = getCurrentUserOrg();
    if (!org) { showToast('No organization found'); return; }
    if (!isOrgOwner(org, currentUser)) { showToast('Only the owner can edit'); return; }
    const nameInput = document.getElementById('profile-org-name-input');
    const aboutInput = document.getElementById('profile-org-about-input');
    const avatarImg = document.getElementById('profile-org-avatar-img');
    const avatarData = avatarImg && !avatarImg.classList.contains('hidden') ? avatarImg.src : null;
    const updates = {};
    if (nameInput) updates.name = nameInput.value.trim() || 'Organization';
    if (aboutInput) updates.about = aboutInput.value.trim();
    const orgUsernameInput = document.getElementById('profile-org-username-input');
    if (orgUsernameInput) { const uv = orgUsernameInput.value.trim(); if (uv) updates.username = uv; }
    if (avatarData) updates.avatar = avatarData;
    try {
      await updateOrg(org._id, updates);
      showToast('Organization saved');
      const nameDisplay = document.getElementById('profile-org-name-display');
      if (nameDisplay && updates.name) nameDisplay.textContent = updates.name;
      await fetchOrgs();
      populateOrgTab(getCachedOrgs().find(o => o._id === org._id) || org);
      window.dispatchEvent(new CustomEvent('identityChanged'));
    } catch (e) {
      showToast(e.message || 'Failed to save');
    }
  });
  setupOrgUsernameWarning();
  // avatar chips for profile member select
  const memberSelect = document.getElementById('profile-org-member-select');
  const memberAddSection = memberSelect ? memberSelect.parentElement : null;
  if (memberAddSection && !document.getElementById('profile-org-member-chips')) {
    const chips = document.createElement('div');
    chips.id = 'profile-org-member-chips';
    chips.className = 'user-chip-list';
    memberAddSection.insertBefore(chips, memberSelect);
    memberSelect.addEventListener('change', () => renderProfileMemberChips(memberSelect));
  }
}
function renderProfileMemberChips(select) {
  const container = document.getElementById('profile-org-member-chips');
  if (!container) return;
  const users = (() => { try { return JSON.parse(localStorage.getItem('dashCachedUsers') || '[]'); } catch { return []; } })();
  const selected = Array.from(select.selectedOptions).map(o => o.value);
  const selectedUsers = users.filter(u => selected.includes(u._id));
  if (selectedUsers.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = selectedUsers.map(u => {
    const name = u.displayName || u.name || u.email || '';
    const avatar = u.avatar;
    const avUrl = avatar ? (avatar.startsWith('http') || avatar.startsWith('data:') ? avatar : BACKEND_ORIGIN + avatar) : null;
    const img = avUrl ? '<img src="' + avUrl + '" alt="" style="width:20px;height:20px;border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--bg-glass)">' : '<div class="user-select-avatar-placeholder" style="width:20px;height:20px;font-size:0.65rem">' + name.charAt(0).toUpperCase() + '</div>';
    return '<span class="user-chip">' + img + name + '</span>';
  }).join('');
}
function setupOrgUsernameWarning() {
  let vu = [];
  fetch(API_BASE_URL + '/organizations/verified', { credentials: 'include' }).then(r => r.json()).then(d => { if (d.organizations) vu = d.organizations.map(o => o.username); }).catch(() => {});
  const inp = document.getElementById('profile-org-username-input');
  if (inp) {
    inp.addEventListener('input', () => {
      const w = document.getElementById('profile-org-username-warning');
      if (w) {
        if (vu.includes(inp.value.trim().toLowerCase())) w.classList.remove('hidden');
        else w.classList.add('hidden');
      }
    });
  }
}
function setupEditorToolbar() { document.querySelectorAll('.editor-toolbar').forEach(toolbar => { toolbar.addEventListener('click', (e) => { const btn = e.target.closest('[data-cmd]'); if (!btn) return; const cmd = btn.dataset.cmd; const value = btn.dataset.value || null; document.execCommand(cmd, false, value); focusEditor(); }); toolbar.addEventListener('change', (e) => { const select = e.target.closest('[data-cmd]'); if (!select) return; document.execCommand(select.dataset.cmd, false, select.value); focusEditor(); }); }); const editor = document.getElementById('profile-about-editor'); const charCount = document.getElementById('profile-char-count'); if (editor && charCount) { editor.addEventListener('input', () => updateCharCount(editor, charCount)); editor.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;'); } }); }
}
function focusEditor() { const editor = document.getElementById('profile-about-editor'); if (editor) editor.focus();
}
function updateCharCount(editor, charCountEl) { if (!editor || !charCountEl) return; const len = editor.textContent.length; charCountEl.textContent = `${len} / ${charLimit}`; charCountEl.style.color = len > charLimit ? 'var(--color-accent)' : 'var(--text-muted)';
}
function setupAvatarUpload() { const input = document.getElementById('profile-avatar-input'); const overlay = document.getElementById('profile-avatar-overlay'); if (input && overlay) { overlay.addEventListener('click', () => input.click()); input.addEventListener('change', (e) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB'); return; } openCropTool(file); input.value = ''; }); }}/* --- Crop Tool --- */let cropFile = null;let cropImage = null;let cropTranslateX = 0;let cropTranslateY = 0;let cropZoom = 1;let cropCircleSize = 140;let cropDragStartX = 0;let cropDragStartY = 0;let cropDragging = false;let cropPreviewUrl = '';function openCropTool(file) { cropFile = file; cropZoom = 1; cropCircleSize = 140; cropTranslateX = 0; cropTranslateY = 0; let modal = document.getElementById('crop-modal'); if (!modal) { modal = document.createElement('div'); modal.id = 'crop-modal'; modal.className = 'crop-modal'; modal.innerHTML = ` <div class="crop-backdrop"></div> <div class="crop-container"> <button class="crop-close" type="button">&times;</button> <div class="crop-title" data-i18n="crop_title">Crop Avatar</div> <div class="crop-subtitle" data-i18n="crop_subtitle">Drag to reposition &bull; Zoom to fit</div> <div class="crop-stage"> <div class="crop-viewport" id="crop-viewport"> <img class="crop-image" id="crop-image" alt="Crop"> <div class="crop-circle-overlay" id="crop-circle-overlay"></div> </div> </div> <div class="crop-preview-wrap" style="margin:0 0 16px;text-align:center"> <div style="font-size:0.75rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px;letter-spacing:0.05em;text-transform:uppercase" data-i18n="preview_title">Preview</div> <img id="crop-preview-image" alt="Preview" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:2px solid var(--border-color);background:var(--bg-inset);box-shadow:var(--shadow-sm)"> </div> <div class="crop-controls"> <div class="crop-control-row"> <label data-i18n="crop_zoom">Zoom</label> <input type="range" id="crop-zoom-range" min="1" max="4" step="0.05" value="1"> <span class="crop-value" id="crop-zoom-value">1x</span> </div> <div class="crop-control-row"> <label data-i18n="crop_size">Size</label> <input type="range" id="crop-size-range" min="80" max="280" step="5" value="140"> <span class="crop-value" id="crop-size-value">140</span> </div> </div> <button class="crop-save-btn" id="crop-save-btn" data-i18n="crop_save">Crop &amp; Save</button> </div> `; document.body.appendChild(modal);translateStaticContent(getCurrentLanguage()); modal.addEventListener('click', (e) => { if (e.target === modal) closeCropTool(); }); modal.querySelector('.crop-close').addEventListener('click', closeCropTool); document.addEventListener('keydown', cropEscape); } const reader = new FileReader(); reader.onload = (ev) => { const img = new Image(); img.onload = () => { cropImage = img; const vp = document.getElementById('crop-viewport'); const ci = document.getElementById('crop-image'); const co = document.getElementById('crop-circle-overlay'); const preview = document.getElementById('crop-preview-image'); if (!vp || !ci || !co) return; ci.src = ev.target.result; ci.style.transform = 'translate(0px, 0px) scale(1)'; cropTranslateX = 0; cropTranslateY = 0; cropZoom = 1; updateCircleOverlay(co); if (preview) preview.src = ev.target.result; setupCropDrag(vp, ci); setupCropControls(co, ci); modal.classList.add('open'); lockBodyScroll(true); }; img.src = ev.target.result; }; reader.readAsDataURL(file);
}
function cropEscape(e) { if (e.key === 'Escape') closeCropTool();
}
function closeCropTool() { const modal = document.getElementById('crop-modal'); if (modal) modal.classList.remove('open'); lockBodyScroll(false); document.removeEventListener('keydown', cropEscape);
}
function updateCircleOverlay(el) { if (!el) return; el.style.width = cropCircleSize + 'px'; el.style.height = cropCircleSize + 'px'; el.style.borderRadius = '50%';
}
function setupCropControls(co, ci) { const zoomRange = document.getElementById('crop-zoom-range'); const zoomVal = document.getElementById('crop-zoom-value'); const sizeRange = document.getElementById('crop-size-range'); const sizeVal = document.getElementById('crop-size-value'); const saveBtn = document.getElementById('crop-save-btn'); if (zoomRange) { zoomRange.value = cropZoom; zoomRange.oninput = () => { cropZoom = parseFloat(zoomRange.value); if (zoomVal) zoomVal.textContent = cropZoom.toFixed(1) + 'x'; if (ci) ci.style.transform = `translate(${cropTranslateX}px, ${cropTranslateY}px) scale(${cropZoom})`; }; } if (sizeRange) { sizeRange.value = cropCircleSize; sizeRange.oninput = () => { cropCircleSize = parseInt(sizeRange.value); if (sizeVal) sizeVal.textContent = cropCircleSize; if (co) updateCircleOverlay(co); }; } if (saveBtn) { saveBtn.onclick = () => cropAndUpload(); }
}
function setupCropDrag(vp, ci) { const onStart = (clientX, clientY) => { cropDragging = true; cropDragStartX = clientX - cropTranslateX; cropDragStartY = clientY - cropTranslateY; ci.classList.add('dragging'); }; const onMove = (clientX, clientY) => { if (!cropDragging) return; cropTranslateX = clientX - cropDragStartX; cropTranslateY = clientY - cropDragStartY; ci.style.transform = `translate(${cropTranslateX}px, ${cropTranslateY}px) scale(${cropZoom})`; }; const onEnd = () => { cropDragging = false; ci.classList.remove('dragging'); }; vp.addEventListener('mousedown', (e) => { e.preventDefault(); onStart(e.clientX, e.clientY); }); document.addEventListener('mousemove', (e) => { onMove(e.clientX, e.clientY); }); document.addEventListener('mouseup', onEnd); vp.addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) onStart(t.clientX, t.clientY); }, { passive: true }); document.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }, { passive: true }); document.addEventListener('touchend', onEnd, { passive: true });
}
async function cropAndUpload() { const saveBtn = document.getElementById('crop-save-btn'); if (!saveBtn || !cropImage) return; saveBtn.disabled = true; saveBtn.textContent = 'Processing...'; try { const vp = document.getElementById('crop-viewport'); const vw = vp.clientWidth; const vh = vp.clientHeight; const cr = cropCircleSize / 2; const scale = cropZoom; const tx = cropTranslateX; const ty = cropTranslateY; const sx = (vw / 2 - tx - cr) / scale; const sy = (vh / 2 - ty - cr) / scale; const sw = cropCircleSize / scale; const sh = cropCircleSize / scale; const canvas = document.createElement('canvas'); const outSize = 256; canvas.width = outSize; canvas.height = outSize; const ctx = canvas.getContext('2d'); ctx.save(); ctx.beginPath(); ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(cropImage, sx, sy, sw, sh, 0, 0, outSize, outSize); ctx.restore(); const previewUrl = canvas.toDataURL('image/png'); cropPreviewUrl = previewUrl; const preview = document.getElementById('crop-preview-image'); if (preview) preview.src = previewUrl; const formData = new FormData(); const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); formData.append('avatar', blob, 'avatar.png'); const res = await fetch(`${API_BASE_URL}/profile/avatar`, { method: 'POST', credentials: 'include', body: formData }); if (!res.ok) throw new Error('Upload failed'); const data = await res.json(); currentUser = data.user; const avatarUrl = getAvatarUrl(currentUser.avatar); if (avatarUrl) { const img = document.getElementById('profile-avatar-img'); if (img) { img.src = avatarUrl; img.classList.remove('hidden'); } const placeholder = document.getElementById('profile-avatar-placeholder'); if (placeholder) placeholder.classList.add('hidden'); } showToast('Avatar updated'); await refreshUser(); window.dispatchEvent(new CustomEvent('identityChanged')); closeCropTool(); } catch { showToast('Failed to upload avatar'); } finally { saveBtn.disabled = false; saveBtn.textContent = 'Crop & Save'; }}
/* --- End Crop Tool --- */
async function setupProfileSave() { const saveBtn = document.getElementById('profile-save-btn'); if (!saveBtn) return; saveBtn.addEventListener('click', async () => { const nameInput = document.getElementById('profile-name-input'); const usernameInput = document.getElementById('profile-username-input'); const editor = document.getElementById('profile-about-editor'); const displayName = nameInput ? nameInput.value.trim() : ''; const username = usernameInput ? usernameInput.value.trim() : ''; const about = editor ? editor.innerHTML : ''; if (!displayName) { showToast('Display name is required'); return; } if ((editor?.textContent?.length || 0) > charLimit) { showToast(`About section must be under ${charLimit} characters`); return; } saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; try { const body = { displayName, about }; if (username) body.username = username; const res = await fetch(`${API_BASE_URL}/profile`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Save failed'); } const data = await res.json(); currentUser = data.user; showToast('Profile saved'); await refreshUser(); window.dispatchEvent(new CustomEvent('identityChanged')); closeProfileModal(); } catch (e) { showToast(e.message || 'Failed to save profile'); } finally { saveBtn.disabled = false; saveBtn.textContent = 'Save Profile'; } });
}
function isIdentityVerified(type, id) { try { if (type === 'organization') { const serverOrgs = getCachedOrgs(); const org = serverOrgs.find(o => o._id === id); return org ? !!org.verified : false; } return currentUser && currentUser.verified === true; } catch { return false; } }
