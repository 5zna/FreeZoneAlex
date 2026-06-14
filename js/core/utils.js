import { API_BASE_URL } from './constants.js';

export function debounce(fn, delay = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function throttle(fn, limit = 80) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

export function isLowEndDevice() {
  try {
    const mem = navigator.deviceMemory;
    const cores = navigator.hardwareConcurrency;
    if (mem !== undefined && mem < 4) return true;
    if (cores !== undefined && cores < 4) return true;
    return /Android 5|Android 6|iPhone 6|iPhone 7|LowEnd/i.test(navigator.userAgent);
  } catch { return false; }
}

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch { return false; }
}

export function shouldReduceAnimations() {
  return isLowEndDevice() || prefersReducedMotion();
}

export function rAFThrottle(fn) {
  let ticking = false;
  return (...args) => {
    if (!ticking) {
      requestAnimationFrame(() => {
        fn(...args);
        ticking = false;
      });
      ticking = true;
    }
  };
}

export function getScrollbarWidth() {
  return window.innerWidth - document.documentElement.clientWidth;
}

export function lockBodyScroll(lock) {
  if (lock) {
    const scrollBarWidth = getScrollbarWidth();
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollBarWidth}px`;
  } else {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}

const BACKEND_ORIGIN = window.location.origin;

function resolveUrl(avatar) {
  if (!avatar) return '';
  if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:')) return avatar;
  return BACKEND_ORIGIN + avatar;
}

function getCachedOrgsSafe() {
  try {
    const stored = sessionStorage.getItem('freezoneServerOrgs') || localStorage.getItem('freezoneServerOrgs');
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function resolveJobAuthorName(job, currentUser) {
  if (job.creatorType === 'organization' && job.orgId) {
    const serverOrgs = getCachedOrgsSafe();
    const org = serverOrgs.find(o => o._id === job.orgId || o.id === job.orgId);
    if (org && org.name) return org.name;
  }
  if (job.creatorType === 'user' && currentUser && String(job.postedBy) === String(currentUser._id)) {
    return currentUser.displayName || currentUser.name;
  }
  return job.orgName || '';
}

export function resolveJobAvatar(job, currentUser) {
  if (job.creatorType === 'organization' && job.orgId) {
    const serverOrgs = getCachedOrgsSafe();
    const org = serverOrgs.find(o => o._id === job.orgId || o.id === job.orgId);
    if (org && org.avatar) return resolveUrl(org.avatar);
  }
  if (job.creatorType === 'user' && currentUser && String(job.postedBy) === String(currentUser._id)) {
    return resolveUrl(currentUser.avatar);
  }
  return job.orgAvatar || '';
}

export function createElement(tag, className = '', attributes = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.entries(attributes).forEach(([key, val]) => el.setAttribute(key, val));
  return el;
}

export function openReportDetailModal(report, currentUser, isOwner) {
  var existing = document.getElementById('report-detail-modal');
  if (existing) existing.remove();

  var isAr = document.documentElement.getAttribute('lang') === 'ar';

  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'report-detail-modal';

  var statusLabels = { open: isAr ? 'مفتوح' : 'Open', in_progress: isAr ? 'قيد المعالجة' : 'In Progress', resolved: isAr ? 'تم الحل' : 'Resolved', closed: isAr ? 'مغلق' : 'Closed' };
  var typeNames = { inquiry: isAr ? 'استفسار' : 'Inquiry', suggestion: isAr ? 'اقتراح' : 'Suggestion', complaint: isAr ? 'شكوى' : 'Complaint', bug: isAr ? 'بلاغ خلل' : 'Bug Report', feedback: isAr ? 'رأى واقتراح' : 'Feedback', organization: isAr ? 'مؤسسة' : 'Organization' };

  var user = report.userId || {};
  var attachmentsHtml = '';
  if (report.attachments && report.attachments.length) {
    attachmentsHtml = '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-color)"><strong>' + (isAr ? 'المرفقات' : 'Attachments') + '</strong><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">';
    report.attachments.forEach(function(a) {
      var mime = a.type || a.mimeType || '';
      var isImage = mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(a.name) || (a.data && a.data.startsWith('data:image/'));
      if (isImage) {
        attachmentsHtml += '<div style="border:1px solid var(--border-color);border-radius:var(--radius-sm);overflow:hidden;max-width:200px;cursor:pointer" onclick="openImageLightbox(\'' + a.data.replace(/'/g, "\\'") + '\',\'' + a.name.replace(/'/g, "\\'").replace(/"/g, '&quot;') + '\')">'
          + '<img src="' + a.data.replace(/'/g, "\\'") + '" alt="' + a.name.replace(/"/g, '&quot;') + '" style="width:100%;height:auto;display:block">'
          + '<div style="padding:4px 8px;font-size:0.7rem;color:var(--text-muted)">' + escapeHtml(a.name) + '</div></div>';
      } else {
        attachmentsHtml += '<a href="' + a.data.replace(/'/g, "\\'") + '" download="' + a.name.replace(/"/g, '&quot;') + '" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border:1px solid var(--border-color);border-radius:var(--radius-sm);text-decoration:none;color:var(--text-primary);font-size:0.8rem">'
          + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>'
          + escapeHtml(a.name) + '</a>';
      }
    });
    attachmentsHtml += '</div></div>';
  }

  var userHtml = '';
  if (user.name) {
    var avatarUrl = user.avatar;
    if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:')) {
      var origin = BACKEND_ORIGIN;
      avatarUrl = origin + avatarUrl;
    }
    var avatarHtml = avatarUrl
      ? '<img src="' + avatarUrl.replace(/'/g, "\\'") + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover">'
      : '<span style="display:inline-flex;width:32px;height:32px;border-radius:50%;background:var(--bg-glass);align-items:center;justify-content:center;font-size:0.85rem;font-weight:700">' + escapeHtml((user.name || '?').charAt(0).toUpperCase()) + '</span>';
    userHtml = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border-color)">'
      + avatarHtml
      + '<div><div style="font-weight:600;font-size:0.9rem">' + escapeHtml(user.name) + '</div>'
      + (user.email ? '<div style="font-size:0.75rem;color:var(--text-muted)">' + escapeHtml(user.email) + '</div>' : '')
      + '</div></div>';
  }

  var statusColor = report.status === 'open' ? 'var(--color-danger)' : report.status === 'in_progress' ? '#d97706' : report.status === 'resolved' ? 'var(--color-success)' : 'var(--text-muted)';

  var isStaffUser = isOwner || (currentUser && currentUser.role && ['developer', 'admin', 'moderator'].includes(currentUser.role));
  var isOpenerUser = currentUser && String(currentUser._id) === String(report.userId);
  var canReply = isStaffUser || (isOpenerUser && (report.status === 'open' || report.status === 'in_progress'));

  modal.innerHTML = '<div class="modal-container" style="max-width:700px">'
    + '<button class="modal-close-btn" id="report-detail-close" type="button"><i class="fas fa-times"></i></button>'
    + '<div class="modal-header"><h3 class="modal-title">' + escapeHtml(report.title) + '</h3></div>'
    + '<div class="modal-body" style="grid-template-columns:1fr;padding:24px">'
    + userHtml
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;font-size:0.8rem;color:var(--text-muted);flex-wrap:wrap">'
    + '<span class="dashboard-role-badge" style="font-size:0.7rem;padding:2px 8px;background:' + statusColor + ';color:#fff">' + (statusLabels[report.status] || report.status) + '</span>'
    + '<span>' + escapeHtml(typeNames[report.type] || report.type) + '</span>'
    + '<span>&middot;</span>'
    + '<span>' + new Date(report.createdAt).toLocaleDateString() + '</span>'
    + (report.updatedAt && report.updatedAt !== report.createdAt
      ? '<span>&middot;</span><span>' + (isAr ? 'آخر تحديث: ' : 'Updated: ') + new Date(report.updatedAt).toLocaleDateString() + '</span>'
      : '')
    + '</div>'
    + (report.content ? '<div style="line-height:1.7;font-size:0.9rem;white-space:pre-wrap">' + escapeHtml(report.content) + '</div>' : '<p style="color:var(--text-muted)">' + (isAr ? 'لا يوجد محتوى' : 'No content') + '</p>')
    + attachmentsHtml
    + '<div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border-color)" id="report-replies-section">'
    + '<h4 style="margin:0 0 12px;font-size:1rem">' + (isAr ? 'الردود' : 'Replies') + '</h4>'
    + '<div id="report-replies-list"><p style="color:var(--text-muted);font-size:0.85rem">' + (isAr ? 'جارٍ تحميل الردود...' : 'Loading replies...') + '</p></div>'
    + (canReply
      ? '<div style="margin-top:14px"><textarea id="report-reply-input" rows="3" style="width:100%;padding:10px;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-primary);color:var(--text-primary);resize:vertical;font-size:0.85rem" placeholder="' + (isAr ? 'اكتب ردك...' : 'Write a reply...') + '"></textarea>'
      + '<button id="report-reply-submit-btn" type="button" class="dash-btn dash-btn-sm" style="margin-top:10px;min-width:140px">' + (isAr ? 'إرسال' : 'Send') + '</button></div>'
      : '')
    + '</div>'
    + '</div></div>';

  document.body.appendChild(modal);
  modal.classList.add('open');

  document.getElementById('report-detail-close').addEventListener('click', function () { modal.classList.remove('open'); setTimeout(function () { modal.remove(); }, 300); });
  modal.addEventListener('click', function (e) { if (e.target === modal) { modal.classList.remove('open'); setTimeout(function () { modal.remove(); }, 300); } });

  loadReplies(report._id);

  if (canReply) {
    var replyBtn = document.getElementById('report-reply-submit-btn');
    var replyInput = document.getElementById('report-reply-input');
    if (replyBtn && replyInput) {
      replyBtn.addEventListener('click', async function () {
        var content = replyInput.value.trim();
        if (!content) return;
        replyBtn.disabled = true;
        replyBtn.textContent = isAr ? 'جارٍ الإرسال...' : 'Sending...';
        try {
          var res = await fetch(API_BASE_URL + '/reports/' + report._id + '/replies', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
          });
          if (!res.ok) { var err = await res.json(); throw new Error(err.message || 'Failed'); }
          var data = await res.json();
          replyInput.value = '';
          appendReply(data.reply);
        } catch (e) {
          showToast(e.message || (isAr ? 'فشل إرسال الرد' : 'Failed to send reply'));
        } finally {
          replyBtn.disabled = false;
          replyBtn.textContent = isAr ? 'إرسال' : 'Send';
        }
      });
    }
  }
}

function loadReplies(reportId) {
  var list = document.getElementById('report-replies-list');
  if (!list) return;
  fetch(API_BASE_URL + '/reports/' + reportId + '/replies', { credentials: 'include' })
    .then(function (r) { return r.ok ? r.json() : { replies: [] }; })
    .then(function (data) {
      var replies = data.replies || [];
      if (replies.length === 0) {
        var isAr = document.documentElement.getAttribute('lang') === 'ar';
        list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">' + (isAr ? 'لا توجد ردود بعد' : 'No replies yet') + '</p>';
        return;
      }
      replies.forEach(function (r) { appendReply(r); });
    })
    .catch(function () {
      var isAr = document.documentElement.getAttribute('lang') === 'ar';
      list.innerHTML = '<p style="color:var(--color-danger);font-size:0.85rem">' + (isAr ? 'فشل تحميل الردود' : 'Failed to load replies') + '</p>';
    });
}

function appendReply(reply) {
  var list = document.getElementById('report-replies-list');
  if (!list) return;
  if (list.querySelector('.empty-replies-msg') || list.querySelector('p')) {
    list.innerHTML = '';
  }
  var isAr = document.documentElement.getAttribute('lang') === 'ar';
  var u = reply.userId || {};
  var isSupportStaff = !!reply.isStaffReply || ['developer', 'admin', 'moderator'].includes(u.role);
  if (isSupportStaff && isOwner && u.role !== 'developer' && u.role !== 'admin' && u.role !== 'moderator') {
    isSupportStaff = true;
  }
  var avatarUrl = u.avatar;
  if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:')) {
    avatarUrl = BACKEND_ORIGIN + avatarUrl;
  }
  var avatarHtml = avatarUrl
    ? '<img src="' + avatarUrl.replace(/'/g, "\\'") + '" style="width:30px;height:30px;border-radius:50%;object-fit:cover">'
    : '<span style="display:inline-flex;width:30px;height:30px;border-radius:50%;background:var(--bg-glass);align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;flex-shrink:0">' + escapeHtml((u.name || '?').charAt(0).toUpperCase()) + '</span>';
  var roleBadge = isSupportStaff ? '<span class="dashboard-role-badge support" style="font-size:0.65rem;padding:1px 6px;margin-inline-start:6px;background:var(--badge-admin-bg);color:var(--badge-admin-text);border-color:rgba(37,99,235,0.15)">' + (isAr ? 'الدعم الفنى' : 'Technical Support') + '</span>' : '';

  var div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color)';
  div.innerHTML = avatarHtml
    + '<div style="flex:1;min-width:0">'
    + '<div style="display:flex;align-items:center;margin-bottom:2px;flex-wrap:wrap">'
    + '<strong style="font-size:0.85rem">' + escapeHtml(u.name || (isAr ? 'غير معروف' : 'Unknown')) + '</strong>'
    + roleBadge
    + '<span style="font-size:0.7rem;color:var(--text-muted);margin-inline-start:8px">' + new Date(reply.createdAt).toLocaleString() + '</span>'
    + '</div>'
    + '<div style="font-size:0.85rem;line-height:1.6;white-space:pre-wrap">' + escapeHtml(reply.content) + '</div>'
    + '</div>';
  list.appendChild(div);
}

function showToast(msg) {
  var e = document.getElementById('toast-container');
  if (!e) {
    e = document.createElement('div');
    e.id = 'toast-container';
    e.style.cssText = 'position:fixed;bottom:20px;z-index:99999;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none';
    document.body.appendChild(e);
  }
  var t = document.createElement('div');
  t.style.cssText = 'padding:10px 24px;background:var(--bg-card,#333);color:var(--text-primary,#fff);border-radius:8px;font-size:0.85rem;box-shadow:0 4px 12px rgba(0,0,0,0.2);pointer-events:auto;animation:fadeIn 0.2s ease';
  t.textContent = msg;
  e.appendChild(t);
  setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(function () { t.remove(); }, 300); }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

window.openImageLightbox = function (dataUrl, name) {
  var existing = document.getElementById('image-lightbox');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'image-lightbox';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:100000;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
  var img = document.createElement('img');
  img.src = dataUrl;
  img.alt = name || '';
  img.style.cssText = 'max-width:95%;max-height:95%;object-fit:contain;border-radius:4px;box-shadow:0 0 40px rgba(0,0,0,0.5)';
  overlay.appendChild(img);
  overlay.addEventListener('click', function () { overlay.remove(); });
  document.body.appendChild(overlay);
};
