import { API_BASE_URL } from '../core/constants.js';
import { getActiveIdentity, onAuthChange } from './authHandler.js';
import { getCachedOrgs } from './orgHandler.js';

let currentUser = null;
let editingJobId = null;
let modal = null;
let form = null;
let successEl = null;
let identityDisplay = null;
let steps = [];
let stepContents = [];
let currentStep = 1;
let draftMemory = null;
let currentTags = [];

onAuthChange((user) => {
  currentUser = user;
});

const BACKEND_ORIGIN = API_BASE_URL.replace('/api', '');

function resolveAvatar(avatar) {
  if (!avatar) return '';
  if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:')) return avatar;
  return BACKEND_ORIGIN + avatar;
}

function getEffectiveIdentity() {
  const identity = getActiveIdentity();
  if (identity) {
    if (identity.type === 'organization') {
      const serverOrgs = getCachedOrgs();
      const org = serverOrgs.find(o => o._id === identity.id);
      if (org) return { type: 'organization', name: org.name, id: org._id, orgId: org._id, avatar: resolveAvatar(org.avatar || '') };
    }
    return identity;
  }
  const userName = currentUser ? (currentUser.displayName || currentUser.name) : 'User';
  const userAvatar = resolveAvatar(currentUser ? currentUser.avatar : null);
  return { type: 'user', name: userName, avatar: userAvatar };
}

function isCurrentUserVerified() {
  const ident = getEffectiveIdentity();
  if (ident.type === 'organization') {
    // Always show post button when user has switched to any organization
    return true;
  }
  try {
    return currentUser && currentUser.verified === true;
  } catch { return false; }
}

function updateIdentityDisplay() {
  // removed
}

function goToStep(step) {
  currentStep = step;
  steps.forEach((s, i) => {
    s.classList.toggle('active', i + 1 === step);
  });
  stepContents.forEach(sc => {
    sc.style.display = parseInt(sc.dataset.step) === step ? '' : 'none';
  });
}

function clearForm() {
  if (!form) return;
  form.querySelectorAll('input, textarea, select').forEach(el => {
    if (el.type !== 'button' && el.type !== 'submit') el.value = '';
  });
  currentTags = [];
  renderTags();
  editingJobId = null;
}

function to24h(val, ampm) {
  if (!val) return '';
  const parts = val.match(/^(\d{1,2}):(\d{2})$/);
  if (!parts) return '';
  let h = parseInt(parts[1], 10);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return String(h).padStart(2, '0') + ':' + parts[2];
}

function fillForm(job) {
  const setId = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setId('post-job-title', job.title_en || job.title || '');
  setId('post-job-location', job.location_en || job.location || '');
  setId('post-job-salary', job.salary || '');
  setId('post-job-details', job.details_en || job.details || '');
  setId('post-job-fb-link', job.fbLink || '');
  const contactStr = job.contact || '';
  const contactMap = {};
  contactStr.split(' | ').forEach(p => {
    const idx = p.indexOf(': ');
    if (idx > 0) contactMap[p.slice(0, idx).toLowerCase()] = p.slice(idx + 2);
  });
  setId('post-job-contact-email', contactMap['email'] || '');
  setId('post-job-contact-phone', contactMap['phone'] || '');
  setId('post-job-contact-landline', contactMap['landline'] || '');
  setId('post-job-contact-website', contactMap['website'] || '');
  const hoursStr = job.hours || '';
  const parts = hoursStr.split(' - ');
  const to24 = (s) => {
    const m = s.trim().match(/^(.+)\s+(AM|PM)$/i);
    if (m) return to24h(m[1].trim(), m[2].toUpperCase());
    return s.trim();
  };
  if (parts.length === 2) {
    setId('post-job-hours-from', to24(parts[0]));
    setId('post-job-hours-to', to24(parts[1]));
  } else {
    // only use if it looks like a time (contains a colon)
    if (hoursStr.includes(':')) {
      setId('post-job-hours-from', hoursStr);
    }
    setId('post-job-hours-to', '');
  }
  currentTags = (job.tags || []).slice();
  renderTags();
}

export function openEditJobModal(job) {
  if (!modal) return;
  fillForm(job);
  editingJobId = job._id;
  goToStep(1);
  if (currentUser) {
    updateIdentityDisplay();
    if (form) form.style.display = 'flex';
  }
  if (successEl) successEl.style.display = 'none';
  modal.classList.add('open');
}

function updatePostBtnVisibility() {
  const btn = document.getElementById('post-job-btn');
  if (!btn) return;
  const isMemberPage = window.location.pathname.includes('member-jobs');
  const ident = getEffectiveIdentity();
  // Only show post button on company jobs page if identity is actually an organization
  const show = currentUser && (isMemberPage || (ident.type === 'organization'));
  btn.classList.toggle('hidden', !show);
}

export function initPostJobHandler() {
  modal = document.getElementById('post-job-modal');
  const btn = document.getElementById('post-job-btn');
  if (!modal || !btn) return;

  form = document.getElementById('post-job-form');
  const closeBtn = modal.querySelector('.post-job-close');
  successEl = document.getElementById('post-job-success');
  steps = document.querySelectorAll('.post-step');
  stepContents = document.querySelectorAll('.post-step-content');

  updatePostBtnVisibility();

  function openModal() {
    if (draftMemory) {
      restoreDraft();
    } else {
      clearForm();
      goToStep(1);
    }
    if (currentUser) {
      updateIdentityDisplay();
      if (form) form.style.display = 'flex';
    } else {
      if (form) form.style.display = 'none';
      if (identityDisplay) identityDisplay.textContent = 'Please log in to post a job';
    }
    if (successEl) successEl.style.display = 'none';
    modal.classList.add('open');
  }

  window.addEventListener('identityChanged', () => {
    updateIdentityDisplay();
    updatePostBtnVisibility();
  });
  onAuthChange(() => updatePostBtnVisibility());

  btn.addEventListener('click', openModal);

  function saveDraft() {
    const fields = ['post-job-title','post-job-location','post-job-hours-from','post-job-hours-to',
      'post-job-salary','post-job-details','post-job-contact-email','post-job-contact-phone',
      'post-job-contact-landline','post-job-contact-website','post-job-fb-link'];
    draftMemory = { step: currentStep, tags: currentTags.slice() };
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) draftMemory[id.replace('post-job-','')] = el.value;
    });
  }

  function clearDraft() {
    draftMemory = null;
  }

  function restoreDraft() {
    if (!draftMemory) return;
    const draft = draftMemory;
      const setId = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
      if (draft.title) setId('post-job-title', draft.title);
      if (draft.location) setId('post-job-location', draft.location);
      if (draft['hours-from']) setId('post-job-hours-from', draft['hours-from']);
      if (draft['hours-to']) setId('post-job-hours-to', draft['hours-to']);
      if (draft.salary) setId('post-job-salary', draft.salary);
      if (draft.details) setId('post-job-details', draft.details);
      if (draft['contact-email']) setId('post-job-contact-email', draft['contact-email']);
      if (draft['contact-phone']) setId('post-job-contact-phone', draft['contact-phone']);
      if (draft['contact-landline']) setId('post-job-contact-landline', draft['contact-landline']);
      if (draft['contact-website']) setId('post-job-contact-website', draft['contact-website']);
      if (draft['fb-link']) setId('post-job-fb-link', draft['fb-link']);
      if (draft.tags) {
        currentTags = draft.tags.slice();
        renderTags();
      }
      if (draft.step) goToStep(draft.step);
  }

  function closeModal() {
    saveDraft();
    modal.classList.remove('open');
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  form.addEventListener('click', (e) => {
    const nextBtn = e.target.closest('.post-step-next');
    const prevBtn = e.target.closest('.post-step-prev');
    if (nextBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (currentStep < 3) goToStep(currentStep + 1);
    }
    if (prevBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (currentStep > 1) goToStep(currentStep - 1);
    }
  });

  let submitting = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return;
    submitting = true;
    const title = document.getElementById('post-job-title').value.trim();
    const location = document.getElementById('post-job-location').value.trim();
    const hoursFrom = document.getElementById('post-job-hours-from').value;
    const hoursTo = document.getElementById('post-job-hours-to').value;
    const salary = document.getElementById('post-job-salary').value.trim();
    const details = document.getElementById('post-job-details').value.trim();
    const email = document.getElementById('post-job-contact-email').value.trim();
    const phone = document.getElementById('post-job-contact-phone').value.trim();
    const landline = document.getElementById('post-job-contact-landline').value.trim();
    const website = document.getElementById('post-job-contact-website').value.trim();
    const fbLink = document.getElementById('post-job-fb-link').value.trim();
    const tags = currentTags.slice();
    const ident = getEffectiveIdentity();

    if (!title || !location || !hoursFrom || !salary || tags.length === 0) {
      showToast('Please fill in all fields and select at least one tag');
      submitting = false;
      return;
    }

    const parts = [];
    if (email) parts.push('Email: ' + email);
    if (phone) parts.push('Phone: ' + phone);
    if (landline) parts.push('Landline: ' + landline);
    if (website) parts.push('Website: ' + website);
    const contact = parts.join(' | ');

    if (!contact) {
      showToast('Please enter at least one contact method');
      submitting = false;
      return;
    }

    const hours = hoursTo ? `${hoursFrom} - ${hoursTo}` : hoursFrom;
    const authorName = ident.type === 'organization'
      ? ident.name
      : (currentUser ? (currentUser.displayName || currentUser.name) : 'User');
    const isVerified = isCurrentUserVerified();
    const pageSource = window.location.pathname.includes('member-jobs') ? 'member' : 'company';
    const body = {
      title_en: title,
      location_en: location,
      hours,
      salary,
      details_en: details || '',
      contact,
      fbLink: fbLink || '',
      tags,
      creatorType: ident.type,
      orgName: authorName,
      orgId: ident.type === 'organization' ? (ident.orgId || '') : '',
      orgAvatar: ident.avatar || '',
      verified: isVerified,
      source: pageSource
    };

    try {
      const isEdit = !!editingJobId;
      const url = isEdit ? `${API_BASE_URL}/jobs/${editingJobId}` : `${API_BASE_URL}/jobs`;
      const editBody = { ...body };
      delete editBody.orgId;
      delete editBody.creatorType;
      delete editBody.verified;
      delete editBody.source;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? editBody : body)
      });
      if (!res.ok) throw new Error('Failed');
    } catch {
      showToast('Failed to post job');
      submitting = false;
      return;
    }

    clearDraft();
    if (successEl) successEl.style.display = 'block';
    clearForm();
    window.dispatchEvent(new CustomEvent('jobsUpdated'));
    submitting = false;

    setTimeout(() => {
      if (modal) modal.classList.remove('open');
      if (successEl) successEl.style.display = 'none';
    }, 2000);
  });

  setupTagInput();
}

function renderTags() {
  var list = document.getElementById('post-tag-list');
  if (!list) return;
  list.innerHTML = currentTags.map(function(t, i) {
    return '<span class="post-tag-chip">' + t + '<button type="button" class="post-tag-remove" data-index="' + i + '" title="Remove">&times;</button></span>';
  }).join('');
  list.querySelectorAll('.post-tag-remove').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(btn.dataset.index);
      currentTags.splice(idx, 1);
      renderTags();
    });
  });
}

function setupTagInput() {
  var input = document.getElementById('post-tag-input');
  if (!input) return;
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var val = input.value.trim();
      if (val && currentTags.indexOf(val) === -1) {
        currentTags.push(val);
        renderTags();
      }
      input.value = '';
    }
  });
  input.addEventListener('blur', function() {
    var val = input.value.trim();
    if (val && currentTags.indexOf(val) === -1) {
      currentTags.push(val);
      renderTags();
    }
    input.value = '';
  });
}

function showToast(msg) {
  let toast = document.getElementById('profile-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'profile-toast';
    toast.className = 'profile-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._hide);
  toast._hide = setTimeout(() => toast.classList.remove('show'), 2500);
}
