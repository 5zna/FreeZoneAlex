import { API_BASE_URL, JOBS_PER_PAGE, STAGGER_DELAY } from '../core/constants.js';
import { getCurrentLanguage, getTranslation } from './translationHandler.js';
import { openJobModal } from './modalHandler.js';
import { debounce, resolveJobAvatar, resolveJobAuthorName } from '../core/utils.js';
import { getActiveIdentity, getCurrentUser, VERIFIED_TICK, OWNER_CROWN_GLOBAL, isAdmin, currentUserIsOwner, isDeveloper } from './authHandler.js';
import { openEditJobModal } from './postJobHandler.js';
import { hasPermission } from './dashboardPage.js';

function t(key) {
  return getTranslation(key, getCurrentLanguage());
}

let allJobs = [];
let activeCategory = 'all';
let searchQuery = '';
let selectedLocation = 'all';
let selectedHours = 'all';
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let pageSource = 'company';
let pendingMode = false;
let myPostsMode = false;

export function initJobHandler() {
  const jobsGrid = document.getElementById('jobs-grid');
  if (!jobsGrid) return;
  pageSource = window.location.pathname.includes('member-jobs') ? 'member' : 'company';

  const searchInput = document.getElementById('job-search');
  const searchClear = document.getElementById('search-clear');
  const searchSubmit = document.getElementById('search-submit');
  const locationSelect = document.getElementById('filter-location');
  const hoursSelect = document.getElementById('filter-hours');
  const categoryPills = document.querySelectorAll('.category-pill');
  const loadMoreBtn = document.getElementById('load-more');
  const filterToggle = document.getElementById('filter-toggle-btn');
  const filterPanel = document.querySelector('.filter-panel');

  if (filterToggle && filterPanel) {
    filterToggle.addEventListener('click', () => {
      filterPanel.classList.toggle('filters-open');
    });
  }

  resetFilters();
  fetchJobs().then(() => renderJobs());

  function doSearch() {
    searchQuery = (searchInput?.value || '').toLowerCase().trim();
    if (searchClear) {
      searchClear.classList.toggle('visible', searchQuery.length > 0);
    }
    resetPagination();
    renderJobs();
  }

  if (searchInput) {
    searchInput.addEventListener('input', debounce(doSearch, 200));
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      doSearch();
    });
  }

  if (searchSubmit) {
    searchSubmit.addEventListener('click', doSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSearch();
      }
    });
  }

  if (locationSelect) {
    locationSelect.addEventListener('change', (e) => {
      selectedLocation = e.target.value;
      resetPagination();
      renderJobs();
    });
  }

  if (hoursSelect) {
    hoursSelect.addEventListener('change', (e) => {
      selectedHours = e.target.value;
      resetPagination();
      renderJobs();
    });
  }

  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-category');
      resetPagination();
      renderJobs();
    });
  });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentPage++;
      renderJobs(true);
    });
  }

  window.addEventListener('langChanged', () => {
    resetPagination();
    renderJobs();
  });

  window.addEventListener('jobsUpdated', () => {
    fetchJobs().then(() => {
      resetPagination();
      renderJobs();
      if (pageSource === 'member' && pendingBtn) updatePendingBtn();
    });
  });

  window.addEventListener('identityChanged', () => {
    renderJobs();
  });

  /* --- pending posts button --- */
  const pendingBtn = document.getElementById('pending-posts-btn');
  if (pendingBtn && pageSource === 'member') {
    async function updatePendingBtn() {
      const cu = getCurrentUser();
      const show = isAdmin() || (cu && cu.role === 'moderator');
      pendingBtn.style.display = show ? '' : 'none';
        if (!show) {
          pendingMode = false;
          if (pendingBtn.classList.contains('active')) {
            pendingBtn.classList.remove('active');
            pendingBtn.innerHTML = t('status_pending');
          }
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/jobs/pending-count`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const count = data.count || 0;
        if (count > 0) {
          const label = pendingBtn.classList.contains('active')
            ? t('pending_view_all')
            : t('status_pending');
          pendingBtn.innerHTML = `${label} <span class="pending-bubble">${count}</span>`;
        } else {
          pendingBtn.textContent = pendingBtn.classList.contains('active')
            ? t('pending_view_all')
            : t('status_pending');
        }
      } catch {
        pendingBtn.textContent = pendingBtn.classList.contains('active')
          ? t('pending_view_all')
          : t('status_pending');
      }
    }
    pendingBtn.addEventListener('click', () => {
      if (myPostsMode) {
        myPostsMode = false;
        myPostsBtn.classList.remove('active');
        myPostsBtn.querySelector('span').textContent = t('my_posts');
      }
      pendingMode = !pendingMode;
      pendingBtn.classList.toggle('active', pendingMode);
      const label = pendingMode
        ? t('pending_view_all')
        : t('status_pending');
      const bubble = pendingBtn.querySelector('.pending-bubble');
      if (bubble) {
        pendingBtn.innerHTML = `${label} <span class="pending-bubble">${bubble.textContent}</span>`;
      } else {
        pendingBtn.textContent = label;
      }
      resetPagination();
      renderJobs();
    });
    window.addEventListener('identityChanged', updatePendingBtn);
  }

  /* --- my posts button --- */
  const myPostsBtn = document.getElementById('my-posts-btn');
  if (myPostsBtn && pageSource === 'member') {
    function updateMyPostsBtn() {
      const user = getCurrentUser();
      const isMod = user && user.role === 'moderator';
      myPostsBtn.style.display = user && !isAdmin() && !isMod ? '' : 'none';
      if (!user || isAdmin() || isMod) {
        myPostsMode = false;
        myPostsBtn.classList.remove('active');
      }
    }
    updateMyPostsBtn();

    myPostsBtn.addEventListener('click', () => {
      if (pendingMode) {
        pendingMode = false;
        pendingBtn.classList.remove('active');
        const label = t('status_pending');
        const bubble = pendingBtn.querySelector('.pending-bubble');
        if (bubble) {
          pendingBtn.innerHTML = `${label} <span class="pending-bubble">${bubble.textContent}</span>`;
        } else {
          pendingBtn.textContent = label;
        }
      }
      myPostsMode = !myPostsMode;
      myPostsBtn.classList.toggle('active', myPostsMode);
      myPostsBtn.querySelector('span').textContent = myPostsMode
        ? t('pending_view_all')
        : t('my_posts');
      resetPagination();
      renderJobs();
    });
    window.addEventListener('identityChanged', updateMyPostsBtn);
  }
}

function resetFilters() {
  currentPage = 1;
  hasMore = true;
  isLoading = false;
}

function resetPagination() {
  currentPage = 1;
  hasMore = true;
}

async function fetchJobs() {
  try {
    const url = `${API_BASE_URL}/jobs${pageSource === 'member' ? '?source=member' : '?source=company'}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    allJobs = data.jobs || [];
  } catch {
    allJobs = [];
  }
}

function getAllJobs() {
  return allJobs;
}

function getFilteredJobs() {
  return getAllJobs().filter(job => {
    if (pageSource === 'member') {
      const currentUser = getCurrentUser();
      const isOwner = currentUser && String(job.postedBy) === String(currentUser._id);
      const isMemberJob = job.source === 'member' || job.creatorType === 'user';
      if (!isMemberJob) return false;
      if (pendingMode) {
        if (job.status !== 'pending') return false;
        if (!isOwner && !isAdmin() && !(currentUser && currentUser.role === 'moderator')) return false;
      }
      if (myPostsMode) {
        if (!isOwner) return false;
      }
      if (!pendingMode && !myPostsMode) {
        if (job.status === 'pending') return false;
        if (job.status === 'rejected' && !isOwner && !isAdmin() && !(currentUser && currentUser.role === 'moderator')) return false;
      }
    }
    if (activeCategory !== 'all') {
      const catMap = {
        'callcenter': 'call center',
        'manufacturing': 'manufacturing',
        'retail': 'retail',
        'sales': 'sales',
        'admin': 'admin'
      };
      if (job.category.toLowerCase().replace(' ', '') !== catMap[activeCategory]?.replace(' ', '') &&
          job.category.toLowerCase().replace(' ', '') !== activeCategory.toLowerCase()) {
        return false;
      }
    }

    if (searchQuery) {
      const q = searchQuery;
      const matches = [job.title_en, job.title_ar, job.company_en, job.company_ar,
                        job.details_en, job.details_ar, job.requirements_en, job.requirements_ar];
      if (!matches.some(m => m.toLowerCase().includes(q) || m.includes(q))) return false;
    }

    if (selectedLocation !== 'all') {
      const loc = job.location_en.toLowerCase();
      const map = {
        'freezone': ['free zone', 'amreya'],
        'smouha': ['smouha'],
        'mansheya': ['mansheya'],
        'sidi_gaber': ['sidi gaber'],
        'loran': ['loran'],
        'agamy': ['agamy']
      };
      const keywords = map[selectedLocation];
      if (keywords && !keywords.some(k => loc.includes(k))) return false;
    }

    if (selectedHours !== 'all') {
      const h = (job.hours_en || job.hours || '').toLowerCase();
      const map = {
        'full': ['full time', '9 hours', '8:00 am', '9:00 am'],
        'part': ['part time', 'flexible'],
        'shift': ['shift', '9 hours', '8 hours'],
        'rotational': ['rotational', 'alternating']
      };
      const keywords = map[selectedHours];
      if (keywords && !keywords.some(k => h.includes(k))) return false;
    }

    return true;
  });
}

function renderJobs(append = false) {
  const jobsGrid = document.getElementById('jobs-grid');
  if (!jobsGrid) return;

  const lang = getCurrentLanguage();
  const filtered = getFilteredJobs();

  if (!append) jobsGrid.innerHTML = '';

  const start = append ? (currentPage - 1) * JOBS_PER_PAGE : 0;
  const end = Math.min(start + JOBS_PER_PAGE, filtered.length);
  const pageJobs = filtered.slice(start, end);
  hasMore = end < filtered.length;

  updateLoadMoreBtn(hasMore, filtered.length);

  if (pageJobs.length === 0 && !append) {
    showEmptyState(jobsGrid, lang);
    return;
  }

  if (myPostsMode && !append) {
    const approved = filtered.filter(j => j.status === 'approved');
    const pending = filtered.filter(j => j.status === 'pending');
    if (approved.length) {
      jobsGrid.insertAdjacentHTML('beforeend', '<div class="my-posts-section-label">' + t('member_posts_label_published') + '</div>');
      approved.forEach((job, i) => {
        jobsGrid.appendChild(createJobCardElement(job, i, 0, lang));
      });
    }
    if (approved.length && pending.length) {
      jobsGrid.insertAdjacentHTML('beforeend', '<hr class="my-posts-divider">');
    }
    if (pending.length) {
      jobsGrid.insertAdjacentHTML('beforeend', '<div class="my-posts-section-label">' + t('member_posts_label_pending') + '</div>');
      pending.forEach((job, i) => {
        jobsGrid.appendChild(createJobCardElement(job, i, 0, lang));
      });
    }
    updateLoadMoreBtn(false, filtered.length);
    return;
  }

  pageJobs.forEach((job, i) => {
    jobsGrid.appendChild(createJobCardElement(job, start, i, lang));
  });
}

function createJobCardElement(job, start, i, lang) {
  const card = document.createElement('div');
  card.className = 'job-card stagger-in';
  card.style.animationDelay = `${(start + i) * STAGGER_DELAY}s`;

  const title = lang === 'ar' ? job.title_ar : job.title_en;
  const company = (lang === 'ar' ? job.company_ar : job.company_en) || job.orgName || '';
  const location = lang === 'ar' ? job.location_ar : job.location_en;
  const salary = lang === 'ar' ? (job.salary_ar || job.salary || '') : (job.salary_en || job.salary || '');
  const hours = lang === 'ar' ? (job.hours_ar || job.hours || '') : (job.hours_en || job.hours || '');
  const postedDate = formatDate(job.postedAt || job.posted_date, lang);

  const tagsHtml = (job.tags && job.tags.length)
    ? `<div class="job-tags-row">${job.tags.map(t => `<span class="job-tag">${t}</span>`).join('')}</div>`
    : '';
  const currentUser = getCurrentUser();
  const isOwner = currentUser && String(job.postedBy) === String(currentUser._id);
  const avatarSrc = resolveJobAvatar(job, currentUser);
  const authorName = resolveJobAuthorName(job, currentUser);
  const isVerified = !!job.verified;
  const tick = isVerified ? VERIFIED_TICK.replace('class="auth-verified-tick"', 'class="job-verified-tick"') : '';
  const authorAvatarHtml = avatarSrc
    ? `<img class="meta-author-avatar" src="${avatarSrc}" alt="">`
    : `<span class="meta-author-avatar meta-author-avatar-placeholder">${authorName.charAt(0).toUpperCase()}</span>`;
  const authorMeta = `<div class="meta-item" style="cursor:pointer" data-author-id="${job.orgId || job.postedBy || ''}" data-author-name="${authorName}" data-author-avatar="${avatarSrc || ''}" data-author-verified="${isVerified}"><span class="meta-icon">${authorAvatarHtml}</span><span>${authorName}${tick}</span></div>`;

  const isHiring = job.hiring !== false;
  let statusBadge = '';
  let adminActions = '';
  var _cu2 = getCurrentUser();
  if (pageSource === 'member' && (pendingMode || myPostsMode)) {
    if (isOwner) {
      statusBadge = job.status === 'pending'
        ? '<span class="job-status-badge status-pending">' + t('status_pending') + '</span>'
        : job.status === 'rejected'
          ? '<span class="job-status-badge status-rejected">' + t('status_rejected') + '</span>'
          : '';
    }
    if (pendingMode) {
      const isUserAdmin = isAdmin() || (_cu2 && (_cu2.role === 'moderator' || hasPermission(_cu2._id, 'manage_posts')));
      const isPending = job.status === 'pending';
      adminActions = (isUserAdmin && isPending)
        ? `<button class="btn-card-approve" title="${t('action_approve')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>
        <button class="btn-card-reject" title="${t('action_reject')}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`
        : '';
    }
  }
  const activeIdentity = getActiveIdentity();
  const activeOrgOwnsJob = pageSource !== 'member'
    && job.creatorType === 'organization'
    && job.orgId
    && activeIdentity
    && activeIdentity.type === 'organization'
    && String(activeIdentity.id) === String(job.orgId);
  const canShowOwnerActions = pageSource === 'member' ? isOwner : activeOrgOwnsJob;
  const canDeleteJob = pageSource === 'member'
    ? (isOwner || isAdmin() || (_cu2 && _cu2.role === 'moderator'))
    : activeOrgOwnsJob;
  const ownerActions = canShowOwnerActions
    ? `<button class="btn-card-hiring" data-hiring="${isHiring ? '1' : '0'}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="7"/></svg>
        ${t('toggle_hiring_hiring')}
      </button>
      <button class="btn-card-edit">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        ${t('action_edit')}
      </button>
      <button class="btn-card-bump">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        ${t('action_bump')}
      </button>`
    : '';
  const deleteAction = canDeleteJob
    ? `<button class="btn-card-delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        ${t('action_delete')}
      </button>`
    : '';
  const ownerIcons = ownerActions || deleteAction
    ? `<div class="job-card-menu">
        <button class="btn-card-menu" title="Actions">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
        <div class="job-card-menu-dropdown">
          ${ownerActions}
          ${deleteAction}
        </div>
      </div>`
    : '';

  const hiringIndicator = isHiring
    ? '<span class="job-hiring-badge">' + t('status_hiring') + '</span>'
    : '<span class="job-not-hiring-badge">' + t('status_not_hiring') + '</span>';

  const detailsBtnHtml = `<button class="btn-card-details">${t('btn_details')}</button>`;
  const fbBtnHtml = job.fbLink ? `<a href="${job.fbLink}" target="_blank" rel="noopener" class="btn-card-fb">${t('btn_view_post')}</a>` : '';
  const contactBtnHtml = `<button class="btn-card-apply">${t('btn_apply')}</button>`;

  card.innerHTML = `
    <div class="job-card-header">
      <div class="job-card-header-start">
        <span class="job-category">${hiringIndicator}</span>
        ${statusBadge}
        <div class="job-card-actions-top">${adminActions}${ownerIcons}</div>
      </div>
      <span class="job-date">${postedDate}</span>
    </div>
    <div class="job-card-body">
      <h2 class="job-card-title">${title}</h2>
      <div class="job-card-author">${authorMeta}</div>
      ${tagsHtml ? '<div class="job-card-details"><div class="job-tags-label">' + t('job_available_label') + '</div>' + tagsHtml + '</div>' : ''}
      <div class="job-card-actions-row">${detailsBtnHtml}${fbBtnHtml}${contactBtnHtml}</div>
    </div>`;

  const detailsBtn = card.querySelector('.btn-card-details');
  if (detailsBtn) detailsBtn.addEventListener('click', () => openJobModal(job));
  const editBtn = card.querySelector('.btn-card-edit');
  if (editBtn) editBtn.addEventListener('click', () => openEditJobModal(job));
  const bumpBtn = card.querySelector('.btn-card-bump');
  if (bumpBtn) bumpBtn.addEventListener('click', () => bumpJob(job));
  const hiringBtn = card.querySelector('.btn-card-hiring');
  if (hiringBtn) hiringBtn.addEventListener('click', () => toggleHiring(job));
  card.querySelectorAll('.btn-card-delete').forEach((deleteBtn) => {
    deleteBtn.addEventListener('click', () => deleteJob(job));
  });
  const authorEl = card.querySelector('.meta-item');
  if (authorEl) authorEl.addEventListener('click', () => openAuthorProfile(job));
  const contactBtn = card.querySelector('.btn-card-apply');
  if (contactBtn) contactBtn.addEventListener('click', () => openContactModal(job));
  const approveBtn = card.querySelector('.btn-card-approve');
  if (approveBtn) approveBtn.addEventListener('click', () => approveJob(job));
  const rejectBtn = card.querySelector('.btn-card-reject');
  if (rejectBtn) rejectBtn.addEventListener('click', () => rejectJob(job));

  // Add menu toggle handler
  const menuBtn = card.querySelector('.btn-card-menu');
  const menuContainer = card.querySelector('.job-card-menu');
  if (menuBtn && menuContainer) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close all other open menus
      document.querySelectorAll('.job-card-menu.open').forEach(m => {
        if (m !== menuContainer) m.classList.remove('open');
      });
      menuContainer.classList.toggle('open');
    });
  }

  // Close menu when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.job-card-menu.open').forEach(m => {
      m.classList.remove('open');
    });
  });

  return card;
}

async function bumpJob(job) {
  try {
    const res = await fetch(`${API_BASE_URL}/jobs/${job._id || job.id}/bump`, {
      method: 'POST', credentials: 'include'
    });
    if (res.status === 429) {
      const data = await res.json();
      showBumpToast(data.message || t('bump_cooldown_text'));
      return;
    }
    if (!res.ok) { showBumpToast(t('bump_failed')); return; }
    showBumpToast(t('bump_success'));
    window.dispatchEvent(new CustomEvent('jobsUpdated'));
  } catch { showBumpToast('Failed to bump'); }
}

async function toggleHiring(job) {
  try {
    const res = await fetch(`${API_BASE_URL}/jobs/${job._id || job.id}/hiring`, {
      method: 'PATCH', credentials: 'include'
    });
    if (!res.ok) { showBumpToast(t('hiring_update_failed')); return; }
    window.dispatchEvent(new CustomEvent('jobsUpdated'));
  } catch { showBumpToast(t('hiring_update_failed')); }
}

async function openAuthorProfile(job) {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  const lang = getCurrentLanguage();
  const title = overlay.querySelector('.modal-title');
  const company = overlay.querySelector('.modal-company');
  const body = overlay.querySelector('.modal-body');
  if (!title || !body) return;

  const orgId = job.orgId || job.postedBy || '';
  let org = null;

  if (job.creatorType === 'organization' && orgId) {
    try {
      const res = await fetch(`${API_BASE_URL}/organizations/public/${orgId}`);
      if (res.ok) {
        const data = await res.json();
        org = data.organization;
      }
    } catch {}
  }

  const avatar = org?.avatar || job.orgAvatar || '';
  const name = org?.name || job.orgName || resolveJobAuthorName(job, getCurrentUser());
  const about = org?.about || '';
  const verified = org?.verified || job.verified || false;

  title.textContent = name;
  company.style.display = 'none';

  var verifiedBadge = verified ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;color:var(--color-primary)">' + VERIFIED_TICK.replace('class="auth-verified-tick"', 'class="auth-verified-tick" style="width:16px;height:16px"') + ' ' + (lang === 'ar' ? 'موثّق' : 'Verified') + '</span>' : '';

  var isIndividualUser = !org && job.creatorType !== 'organization';
  var cu = getCurrentUser();
  var authorId = '';
  if (job.postedBy) {
    if (typeof job.postedBy === 'object') {
      authorId = job.postedBy._id || job.postedBy.id || '';
    } else {
      authorId = job.postedBy;
    }
  }
  var actionsWrap = document.getElementById('author-actions-wrap');
  var actionsPopup = document.getElementById('author-actions-popup');
  var actionsBtn = document.getElementById('author-actions-btn');

  var authorUser = null;
  if (authorId) {
    try {
      var res = await fetch(API_BASE_URL + '/users/public/' + authorId + '?name=' + encodeURIComponent(name) + '&avatar=' + encodeURIComponent(avatar), { credentials: 'include' });
      if (res.ok) {
        var data = await res.json();
        authorUser = data.user;
      }
    } catch {}
  }
  if (!authorUser && cu && authorId && String(cu._id) === String(authorId)) {
    authorUser = cu;
  }

  if (isIndividualUser && authorId && cu && (isAdmin() || cu.role === 'moderator') && authorUser) {
    try {
      var u = authorUser;
      var canFullManage = currentUserIsOwner || isDeveloper() || (cu && cu.role === 'admin');
      var canBan = canFullManage || hasPermission(cu._id, 'ban');
      var canSuspend = canFullManage || hasPermission(cu._id, 'suspend');
      var isOwnerOrDev = isDeveloper() || currentUserIsOwner;
      var isBanned = !!u.banned;
      var isTimedOut = u.timedOutUntil && new Date(u.timedOutUntil).getTime() > Date.now();
      var myRank = cu ? (isDeveloper() ? 4 : currentUserIsOwner ? 3 : cu.role === 'admin' ? 2 : cu.role === 'moderator' ? 1.5 : 1) : 0;
      var targetIsOwner = u.memberRoles && u.memberRoles.some(function(r) { return r.name && r.name.charAt(0) === '@'; });
      var targetRank = u.role === 'developer' ? 4 : targetIsOwner ? 3 : u.role === 'admin' ? 2 : u.role === 'moderator' ? 1.5 : 1;
      var cantTouch = targetRank >= myRank;
      var acts = '';
      if (canFullManage) acts += '<button data-action="verify" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> ' + (u.verified ? 'Unverify' : 'Verify') + '</button>';
      if (canBan && isBanned && !cantTouch) acts += '<button data-action="unban" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg> Unban</button>';
      if (canBan && !isBanned && !cantTouch) acts += '<button data-action="ban" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg> Ban</button>';
      if (canSuspend && isTimedOut && !cantTouch) acts += '<button data-action="untimeout" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg> Remove Suspend</button>';
      if (canSuspend && !isTimedOut && !cantTouch) acts += '<button data-action="suspend" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg> Suspend</button>';
      if (isOwnerOrDev && u.role !== 'admin' && !cantTouch) acts += '<button data-action="set-admin" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Set as Admin</button>';
      if (isOwnerOrDev && u.role === 'admin' && !cantTouch) acts += '<button data-action="remove-admin" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> Remove Admin</button>';
      if ((isOwnerOrDev || cu.role === 'admin') && u.role !== 'moderator' && !cantTouch) acts += '<button data-action="set-moderator" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Set as Moderator</button>';
      if ((isOwnerOrDev || cu.role === 'admin') && u.role === 'moderator' && !cantTouch) acts += '<button data-action="remove-moderator" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Remove Moderator</button>';
      if (isOwnerOrDev && !cantTouch) acts += '<button data-action="delete-account" data-user-id="' + u._id + '" data-user-name="' + name + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> Delete Account</button>';
      if (acts && actionsWrap && actionsPopup) {
        actionsWrap.style.display = '';
        actionsPopup.innerHTML = acts;
      } else if (actionsWrap) {
        actionsWrap.style.display = 'none';
      }
    } catch {}
  } else if (actionsWrap) {
    actionsWrap.style.display = 'none';
  }

  var userBadgeHtml = '';
  if (authorUser) {
    var r = authorUser.role;
    var _uName = authorUser.username || '';
    var badgeHtmls = [];

    // 1. Database roles (developer, admin, moderator, owner)
    if (r === 'developer') {
      var label = lang === 'ar' ? 'مطور' : 'Developer';
      badgeHtmls.push('<span class="dashboard-role-badge developer" style="font-size:0.75rem"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="vertical-align:middle;margin-right:3px"><path d="M12 2L3 7v6c0 5.25 3.83 10.15 9 11.5 5.17-1.35 9-6.25 9-11.5V7l-9-5z"/></svg>' + label + '</span>');
    } else if (r === 'admin') {
      var label = lang === 'ar' ? 'ادمن' : 'Admin';
      badgeHtmls.push('<span class="dashboard-role-badge admin" style="font-size:0.75rem"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="vertical-align:middle;margin-right:3px"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>' + label + '</span>');
    } else if (r === 'moderator') {
      var label = lang === 'ar' ? 'مشرف' : 'Moderator';
      badgeHtmls.push('<span class="dashboard-role-badge moderator" style="font-size:0.75rem"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="vertical-align:middle;margin-right:3px"><path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4zm10 16H4V9h16v11z"/></svg>' + label + '</span>');
    } else if (r === 'owner') {
      var label = lang === 'ar' ? 'مالك' : 'Owner';
      badgeHtmls.push('<span class="dashboard-role-badge owner" style="font-size:0.75rem"><svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="none" style="vertical-align:middle;margin-right:3px"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' + label + '</span>');
    }

    // 2. Member roles (owner, custom roles)
    if (authorUser.memberRoles && Array.isArray(authorUser.memberRoles)) {
      authorUser.memberRoles.forEach(function(roleObj) {
        var isOwner = roleObj.name && roleObj.name.charAt(0) === '@';
        var cls = isOwner ? 'owner' : 'custom';
        var iconHtml = roleObj.icon ? '<img src="' + roleObj.icon + '" style="width:16px;height:16px;border-radius:50%;margin-right:4px;vertical-align:middle;display:inline-block;object-fit:cover">' : '';
        var label = isOwner ? OWNER_CROWN_GLOBAL + ' ' + (lang === 'ar' ? 'مالك' : 'Owner') : iconHtml + roleObj.name;
        badgeHtmls.push('<span class="dashboard-role-badge ' + cls + '" style="font-size:0.75rem">' + label + '</span>');
      });
    }

    // If no specific badges, show the regular 'Member' badge
    if (badgeHtmls.length === 0) {
      var label = lang === 'ar' ? 'عضو' : 'Member';
      badgeHtmls.push('<span class="dashboard-role-badge user" style="font-size:0.75rem">' + label + '</span>');
    }

    userBadgeHtml = '<div style="margin-top:6px;display:flex;flex-direction:column;align-items:center;gap:6px">'
      + (_uName ? '<div style="font-size:0.8rem;color:var(--text-muted)">@' + _uName + '</div>' : '')
      + '<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center">' + badgeHtmls.join('') + '</div>'
      + '</div>';
  }

  var finalAvatar = avatar;
  var finalAbout = about;
  var finalVerified = verified;
  if (!org && authorUser) {
    if (authorUser.avatar) {
      var av = authorUser.avatar;
      finalAvatar = (av.startsWith('http://') || av.startsWith('https://') || av.startsWith('data:')) ? av : API_BASE_URL.replace('/api', '') + av;
    }
    if (authorUser.about) {
      finalAbout = authorUser.about;
    }
    if (authorUser.verified !== undefined) {
      finalVerified = authorUser.verified;
    }
  }
  var verifiedBadgeHtml = finalVerified ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;color:var(--color-primary)">' + VERIFIED_TICK.replace('class="auth-verified-tick"', 'class="auth-verified-tick" style="width:16px;height:16px"') + ' ' + (lang === 'ar' ? 'موثّق' : 'Verified') + '</span>' : '';

  body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;padding:24px 16px;text-align:center">'
    + '<div style="width:72px;height:72px;border-radius:50%;overflow:hidden;background:var(--bg-secondary);border:2px solid var(--border-color);margin-bottom:12px;flex-shrink:0">'
    + (finalAvatar ? '<img src="' + finalAvatar + '" style="width:100%;height:100%;object-fit:cover" onerror="this.remove()">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:var(--text-muted);font-weight:600">' + name.charAt(0).toUpperCase() + '</div>')
    + '</div>'
    + '<div style="font-size:1.1rem;font-weight:700;margin-bottom:4px">' + name + '</div>'
    + verifiedBadgeHtml
    + userBadgeHtml
    + (finalAbout ? '<p style="margin-top:12px;color:var(--text-secondary);font-size:0.85rem;line-height:1.5">' + finalAbout + '</p>' : '<p style="margin-top:12px;color:var(--text-muted);font-size:0.85rem">' + (lang === 'ar' ? 'لا يوجد وصف' : 'No description') + '</p>')
    + (org ? '<div style="margin-top:16px;font-size:0.8rem;color:var(--text-muted)">' + Math.max(org.members ? org.members.length : 0, 1) + ' ' + (lang === 'ar' ? 'أعضاء' : 'members') + '</div>' : '')
    + '</div>';

  var closeBtn = overlay.querySelector('.modal-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function handler() {
      overlay.classList.remove('open');
      if (actionsWrap) actionsWrap.style.display = 'none';
      if (actionsPopup) { actionsPopup.innerHTML = ''; actionsPopup.classList.remove('open'); }
      closeBtn.removeEventListener('click', handler);
    }, { once: true });
  }
  overlay.addEventListener('click', function handler(e) {
    if (e.target === overlay) { overlay.classList.remove('open'); if (actionsWrap) actionsWrap.style.display = 'none'; if (actionsPopup) { actionsPopup.innerHTML = ''; actionsPopup.classList.remove('open'); } overlay.removeEventListener('click', handler); }
  });
  overlay.classList.add('open');

  if (actionsBtn && actionsPopup) {
    actionsBtn.onclick = function(e) {
      e.stopPropagation();
      document.querySelectorAll('.dash-member-actions-popup.open').forEach(function(p) { if (p !== actionsPopup) p.classList.remove('open'); });
      var isOpen = actionsPopup.classList.contains('open');
      document.querySelectorAll('.dash-member-actions-popup.open').forEach(function(p) { p.classList.remove('open'); });
      if (!isOpen) {
        actionsPopup.classList.add('open');
      }
    };
    actionsPopup.addEventListener('click', function(e) {
      var actionBtn = e.target.closest('button[data-action]');
      if (!actionBtn) return;
      e.stopPropagation();
      actionsPopup.classList.remove('open');
      var action = actionBtn.dataset.action;
      var userName = actionBtn.dataset.userName || 'Unknown';
      var userId = actionBtn.dataset.userId;
      if (action === 'verify' && userId) {
        fetch(API_BASE_URL + '/admin/users/' + userId + '/verify', { method: 'PUT', credentials: 'include' })
          .then(function(r) { return r.ok ? r.json() : Promise.reject(); })
          .then(function() { openAuthorProfile(job); })
          .catch(function() { alert('Failed'); });
        return;
      }
      if (action === 'ban' && userId) {
        var reason = prompt('Ban reason:', 'Violation of terms');
        if (reason === null) return;
        fetch(API_BASE_URL + '/admin/ban/' + userId, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: reason }) })
          .then(function(r) { if (r.ok) openAuthorProfile(job); });
        return;
      }
      if (action === 'unban' && userId) {
        fetch(API_BASE_URL + '/admin/unban/' + userId, { method: 'POST', credentials: 'include' })
          .then(function(r) { if (r.ok) openAuthorProfile(job); });
        return;
      }
      if (action === 'suspend' && userId) {
        var mins = prompt('Timeout duration in minutes:', '60');
        if (mins === null) return;
        fetch(API_BASE_URL + '/admin/timeout/' + userId, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes: parseInt(mins) || 60 }) })
          .then(function(r) { if (r.ok) openAuthorProfile(job); });
        return;
      }
      if (action === 'untimeout' && userId) {
        fetch(API_BASE_URL + '/admin/untimeout/' + userId, { method: 'POST', credentials: 'include' })
          .then(function(r) { if (r.ok) openAuthorProfile(job); });
        return;
      }
      if (['set-admin', 'remove-admin', 'set-moderator', 'remove-moderator'].indexOf(action) !== -1 && userId) {
        var newRole = 'user';
        if (action === 'set-admin') newRole = 'admin';
        if (action === 'set-moderator') newRole = 'moderator';
        if (!confirm('Are you sure you want to ' + action.replace('-', ' ') + ' for "' + userName + '"?')) return;
        fetch(API_BASE_URL + '/admin/users/' + userId + '/role', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole }) })
          .then(function(r) { if (r.ok) openAuthorProfile(job); })
          .catch(function() { alert('Failed'); });
        return;
      }
      if (action === 'delete-account' && userId) {
        if (!confirm('Permanently delete account of "' + userName + '"? This CANNOT be undone.')) return;
        if (!confirm('Are you absolutely sure? All data for "' + userName + '" will be lost forever.')) return;
        fetch(API_BASE_URL + '/admin/users/' + userId, { method: 'DELETE', credentials: 'include' })
          .then(function(r) { if (r.ok) { overlay.classList.remove('open'); if (actionsWrap) actionsWrap.style.display = 'none'; } });
        return;
      }
    });
  }
}

async function approveJob(job) {
  try {
    const res = await fetch(`${API_BASE_URL}/jobs/${job._id || job.id}/approve`, {
      method: 'POST', credentials: 'include'
    });
    if (!res.ok) { showBumpToast('Failed to approve job'); return; }
    window.dispatchEvent(new CustomEvent('jobsUpdated'));
  } catch { showBumpToast('Failed to approve job'); }
}

async function rejectJob(job) {
  const lang = getCurrentLanguage();
  const reason = prompt(lang === 'ar' ? 'أدخل سبب الرفض:' : 'Enter rejection reason:');
  if (reason === null) return;
  try {
    const res = await fetch(`${API_BASE_URL}/jobs/${job._id || job.id}/reject`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) { showBumpToast(lang === 'ar' ? 'فشل رفض الوظيفة' : 'Failed to reject job'); return; }
    window.dispatchEvent(new CustomEvent('jobsUpdated'));
  } catch { showBumpToast(lang === 'ar' ? 'فشل رفض الوظيفة' : 'Failed to reject job'); }
}

async function deleteJob(job) {
  const lang = getCurrentLanguage();
  if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه الوظيفة؟' : 'Are you sure you want to delete this job?')) return;
  try {
    const res = await fetch(`${API_BASE_URL}/jobs/${job._id || job.id}`, {
      method: 'DELETE', credentials: 'include'
    });
    if (!res.ok) { showBumpToast('Failed to delete job'); return; }
    window.dispatchEvent(new CustomEvent('jobsUpdated'));
  } catch { showBumpToast('Failed to delete job'); }
}

function showBumpToast(msg) {
  let t = document.getElementById('bump-toast');
  if (!t) { t = document.createElement('div'); t.id = 'bump-toast'; t.className = 'bump-toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2000);
}

function formatDate(dateStr, lang) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return lang === 'ar' ? 'اليوم' : 'Today';
  if (diffDays === 1) return lang === 'ar' ? 'أمس' : 'Yesterday';
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function openContactModal(job) {
  const modal = document.getElementById('contact-modal');
  if (!modal) return;
  const body = document.getElementById('contact-modal-body');
  if (!body) return;
  const lang = getCurrentLanguage();

  const contactStr = job.contact || '';
  const items = [];
  contactStr.split(' | ').forEach(p => {
    const idx = p.indexOf(': ');
    if (idx < 0) return;
    const label = p.slice(0, idx).toLowerCase();
    const value = p.slice(idx + 2);
    if (!value) return;
    if (label === 'email') items.push({ icon: '✉', label: lang === 'ar' ? 'البريد الإلكتروني' : 'Email', href: 'mailto:' + value, text: value });
    else if (label === 'phone') items.push({ icon: '📞', label: lang === 'ar' ? 'رقم الهاتف' : 'Phone', href: 'tel:' + value.replace(/[^0-9+]/g, ''), text: value });
    else if (label === 'landline') items.push({ icon: '☎', label: lang === 'ar' ? 'الهاتف الأرضي' : 'Landline', href: 'tel:' + value.replace(/[^0-9+]/g, ''), text: value });
    else if (label === 'website') items.push({ icon: '🌐', label: lang === 'ar' ? 'الموقع الإلكتروني' : 'Website', href: /^https?:\/\//i.test(value) ? value : 'https://' + value, text: value });
  });

  if (items.length === 0) {
    body.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:24px">${lang === 'ar' ? 'لا توجد معلومات اتصال متاحة' : 'No contact info available'}</p>`;
  } else {
    body.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;padding:8px 0">${items.map(item => `
      <a href="${item.href}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:var(--radius-sm);background:var(--bg-glass);border:1px solid var(--border-color);text-decoration:none;color:var(--text-primary);transition:all var(--transition-fast);min-height:44px">
        <span style="font-size:1.3rem;width:28px;text-align:center">${item.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:2px">${item.label}</div>
          <div style="font-size:0.9rem;word-break:break-all">${item.text}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.5"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>
      </a>
    `).join('')}</div>`;
  }

  modal.classList.add('open');
  modal.addEventListener('click', function handler(e) {
    if (e.target === modal || e.target.closest('.contact-modal-close')) {
      modal.classList.remove('open');
      modal.removeEventListener('click', handler);
    }
  });
}

function showEmptyState(grid, lang) {
  const isPendingEmpty = pageSource === 'member' && pendingMode;
  grid.innerHTML = `
    <div class="jobs-empty-state anim-fade-in">
      <div class="empty-state-icon">${isPendingEmpty ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-search"></i>'}</div>
      <h3>${isPendingEmpty
        ? (lang === 'ar' ? 'لا توجد وظائف قيد المراجعة' : 'No Pending Jobs')
        : (lang === 'ar' ? 'لم يتم العثور على وظائف' : 'No Jobs Found')}</h3>
      <p style="margin-top:8px;color:var(--text-muted);max-width:400px;margin-inline:auto;">
        ${isPendingEmpty
          ? (lang === 'ar' ? 'جميع الوظائف تمت مراجعتها. لا توجد طلبات جديدة في الوقت الحالي.' : 'All jobs have been reviewed. No pending requests at the moment.')
          : (lang === 'ar' ? 'لم نتمكن من العثور على وظائف تطابق معايير البحث. جرب إعادة تعيين الفلاتر أو اختر قسماً آخر.' : 'No jobs match your search criteria. Try resetting filters or choose another category.')}
      </p>
    </div>`;
}

function updateLoadMoreBtn(hasMoreItems, total) {
  const btn = document.getElementById('load-more');
  if (!btn) return;
  btn.classList.toggle('hidden', !hasMoreItems);
}
