import { API_BASE_URL } from '../core/constants.js';
import { onAuthChange, refreshUser } from './authHandler.js';

export function getRoleIconHtml(role) {
  if (role === 'admin') return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;border-radius:50%;margin-right:4px;vertical-align:middle;display:inline-block"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
  return '';
}

let currentUser = null;
let logoClickCount = 0;
let logoClickTimer = null;

export function initDevHandler() {
  logoClickCount = parseInt(sessionStorage.getItem('devClick') || '0', 10);

  onAuthChange((user) => {
    currentUser = user;
  });

  setupLogoClickSequence();
  setupDevModal();
  setupDevSubmit();
  setupDashboardModal();
}

function setupLogoClickSequence() {
  document.querySelectorAll('.nav-logo').forEach(logo => {
    logo.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-logo')) return;

      logoClickCount++;
      sessionStorage.setItem('devClick', logoClickCount);
      clearTimeout(logoClickTimer);

      if (logoClickCount >= 7) {
        logoClickCount = 0;
        sessionStorage.removeItem('devClick');
        e.preventDefault();
        openDevModal();
      } else {
        logoClickTimer = setTimeout(() => {
          logoClickCount = 0;
          sessionStorage.removeItem('devClick');
        }, 5000);
      }
    });
  });
}

function openDevModal() {
  const modal = document.getElementById('dev-modal');
  if (modal) {
    modal.classList.add('open');
    const input = document.getElementById('dev-key-input');
    if (input) {
      input.value = '';
      input.focus();
    }
    const err = document.getElementById('dev-error');
    const success = document.getElementById('dev-success');
    if (err) err.style.display = 'none';
    if (success) success.style.display = 'none';
  }
}

function closeDevModal() {
  const modal = document.getElementById('dev-modal');
  if (modal) modal.classList.remove('open');
}

function setupDevModal() {
  const modal = document.getElementById('dev-modal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.auth-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeDevModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeDevModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDevModal();
  });
}

function setupDevSubmit() {
  const input = document.getElementById('dev-key-input');
  const btn = document.getElementById('dev-submit-btn');
  if (!input || !btn) return;

  const submit = async () => {
    const key = input.value.trim();
    if (!key) return;

    btn.disabled = true;
    btn.textContent = 'Verifying...';

    try {
      const res = await fetch(`${API_BASE_URL}/claim-dev`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });

      const errEl = document.getElementById('dev-error');
      const successEl = document.getElementById('dev-success');

      if (!res.ok) {
        if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Invalid developer key'; }
        if (successEl) successEl.style.display = 'none';
        return;
      }

      const data = await res.json();
      currentUser = data.user;

      if (successEl) { successEl.style.display = 'block'; successEl.textContent = 'Developer access granted!'; }
      if (errEl) errEl.style.display = 'none';

      updateDashboardLink();
      refreshUser();
      setTimeout(closeDevModal, 1500);
    } catch {
      const errEl = document.getElementById('dev-error');
      if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Connection error'; }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Verify Access';
    }
  };

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
}

async function openDashboardModal() {
  const modal = document.getElementById('dashboard-modal');
  if (!modal) return;

  modal.classList.add('open');

  const tbody = document.getElementById('dashboard-users-body');
  const empty = document.getElementById('dashboard-empty');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text-muted)">Loading...</td></tr>';

  try {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();

    if (data.users.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';
    tbody.innerHTML = data.users.map(u => `
      <tr>
        <td>
          <div class="dashboard-user-cell">
            <div class="dashboard-user-avatar">${(u.displayName || u.name).charAt(0).toUpperCase()}</div>
            <div class="dashboard-user-info">
              <div class="dashboard-user-name">${u.displayName || u.name}</div>
              <div class="dashboard-user-email">${u.email || ''}</div>
            </div>
          </div>
        </td>
        <td><span class="dashboard-role-badge ${u.role}">${getRoleIconHtml(u.role)}${u.role}</span></td>
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td>
          <select class="dashboard-role-select" data-user-id="${u._id}">
            <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="developer" ${u.role === 'developer' ? 'selected' : ''}>Developer</option>
          </select>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.dashboard-role-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const userId = sel.dataset.userId;
        const role = sel.value;

        try {
          const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role })
          });
          if (!res.ok) throw new Error('Failed');
          const updated = await res.json();
          const badge = sel.closest('tr').querySelector('.dashboard-role-badge');
          if (badge) {
            badge.className = `dashboard-role-badge ${role}`;
            badge.textContent = role;
          }
        } catch {
          sel.value = sel.querySelector(`[value="${sel.dataset.oldValue || 'user'}"]`)?.value || 'user';
        }
      });

      sel.addEventListener('focus', () => {
        sel.dataset.oldValue = sel.value;
      });
    });
  } catch {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--color-accent)">Failed to load users</td></tr>';
  }
}

function closeDashboardModal() {
  const modal = document.getElementById('dashboard-modal');
  if (modal) modal.classList.remove('open');
}

function setupDashboardModal() {
  const modal = document.getElementById('dashboard-modal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.auth-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeDashboardModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeDashboardModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDashboardModal();
  });
}
