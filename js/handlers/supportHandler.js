import { API_BASE_URL } from '../core/constants.js';
import { getCurrentUser, showToast, onAuthChange, currentUserIsOwner } from './authHandler.js';
import { getCurrentLanguage } from './translationHandler.js';
import { openReportDetailModal } from '../core/utils.js';

export function initSupportHandler() {
  onAuthChange(function(user) {
    addSupportActions();
  });
  setupCreateReportModal();
  setupViewReportsModal();
}

function addSupportActions() {
  var container = document.getElementById('support-actions');
  if (!container) return;

  container.innerHTML = '';

  var createBtn = document.createElement('button');
  createBtn.className = 'btn btn-primary';
  createBtn.id = 'create-report-btn';
  createBtn.setAttribute('data-i18n', 'support_create_btn');
  createBtn.textContent = getCurrentLanguage() === 'ar' ? 'إنشاء بلاغ' : 'Create Report';
  container.appendChild(createBtn);

  var viewBtn = document.createElement('button');
  viewBtn.className = 'btn btn-secondary';
  viewBtn.id = 'view-reports-btn';
  viewBtn.setAttribute('data-i18n', 'support_view_btn');
  viewBtn.textContent = getCurrentLanguage() === 'ar' ? 'عرض بلاغاتى' : 'My Reports';
  container.appendChild(viewBtn);

  var panel = document.getElementById('support-report-panel');
  if (panel) panel.style.display = 'block';
}

function setupCreateReportModal() {
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('#create-report-btn');
    if (!btn) return;
    e.preventDefault();
    openCreateReportModal();
  });
}

var attachmentFiles = [];

function openCreateReportModal() {
  attachmentFiles = [];
  var existing = document.getElementById('report-create-modal');
  if (existing) { existing.classList.add('open'); return; }
  var lang = getCurrentLanguage();
  var isAr = lang === 'ar';
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'report-create-modal';
  modal.innerHTML = '<div class="modal-container" style="max-width:560px">'
    + '<button class="modal-close-btn" id="report-create-close" type="button"><i class="fas fa-times"></i></button>'
    + '<div class="modal-header"><h3 class="modal-title">' + (isAr ? 'إنشاء بلاغ' : 'Create Report') + '</h3></div>'
    + '<div class="modal-body" style="grid-template-columns:1fr;padding:24px">'
    + '<div class="dash-field"><label>' + (isAr ? 'نوع البلاغ' : 'Report Type') + '</label>'
    + '<select id="report-type-select" style="width:100%;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);font-family:inherit;font-size:0.85rem">'
    + '<option value="inquiry">' + (isAr ? 'استفسار' : 'Inquiry') + '</option>'
    + '<option value="suggestion">' + (isAr ? 'اقتراح' : 'Suggestion') + '</option>'
    + '<option value="complaint">' + (isAr ? 'شكوى' : 'Complaint') + '</option>'
    + '<option value="bug">' + (isAr ? 'بلاغ خلل' : 'Bug Report') + '</option>'
    + '<option value="feedback">' + (isAr ? 'رأى واقتراح' : 'Feedback') + '</option>'
    + '<option value="organization">' + (isAr ? 'مؤسسة' : 'Organization') + '</option>'
    + '</select></div>'
    + '<div class="dash-field"><label for="report-title-input">' + (isAr ? 'العنوان' : 'Title') + '</label>'
    + '<input type="text" id="report-title-input" maxlength="200" placeholder="' + (isAr ? 'عنوان البلاغ' : 'Report title') + '" style="width:100%;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);font-family:inherit;font-size:0.85rem;box-sizing:border-box"></div>'
    + '<div class="dash-field"><label for="report-content-editor">' + (isAr ? 'المحتوى' : 'Content') + '</label>'
    + '<textarea id="report-content-editor" rows="5" placeholder="' + (isAr ? 'اكتب محتوى البلاغ هنا...' : 'Write your report content here...') + '" style="width:100%;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);font-family:inherit;font-size:0.85rem;resize:vertical;box-sizing:border-box"></textarea></div>'
    + '<div class="dash-field"><label>' + (isAr ? 'المرفقات' : 'Attachments') + ' <span style="color:var(--text-muted);font-size:0.75rem" id="report-attach-hint">' + (isAr ? '(مطلوب للشكاوى وبلاغات الخلل)' : '(required for complaints and bug reports)') + '</span></label>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap" id="report-attach-list"></div>'
    + '<button type="button" class="dash-btn dash-btn-sm" id="report-add-attach-btn" style="margin-top:6px">+ ' + (isAr ? 'إضافة مرفق' : 'Add Attachment') + '</button>'
    + '<input type="file" id="report-attach-input" accept="image/*,.pdf,.doc,.docx,.txt" multiple style="display:none"></div>'
    + '<div style="display:flex;gap:8px;margin-top:8px">'
    + '<button type="button" class="dash-btn" id="report-submit-btn">' + (isAr ? 'إرسال' : 'Submit') + '</button>'
    + '<button type="button" class="dash-btn dash-btn-outline" id="report-cancel-btn">' + (isAr ? 'إلغاء' : 'Cancel') + '</button>'
    + '</div></div></div>';
  document.body.appendChild(modal);
  modal.classList.add('open');

  document.getElementById('report-create-close').addEventListener('click', function() { modal.classList.remove('open'); });
  document.getElementById('report-cancel-btn').addEventListener('click', function() { modal.classList.remove('open'); });
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.classList.remove('open'); });

  document.getElementById('report-type-select').addEventListener('change', updateAttachHint);
  updateAttachHint();

  document.getElementById('report-add-attach-btn').addEventListener('click', function() {
    document.getElementById('report-attach-input').click();
  });
  document.getElementById('report-attach-input').addEventListener('change', function(e) {
    var files = Array.from(e.target.files);
    var lang = getCurrentLanguage();
    files.forEach(function(file) {
      if (attachmentFiles.length >= 5) return;
      if (file.size === 0) { showToast(lang === 'ar' ? 'الملف فارغ' : 'File is empty'); return; }
      if (file.size > 8 * 1024 * 1024) { showToast(lang === 'ar' ? 'حجم الملف يتجاوز 8 ميجابايت' : 'File exceeds 8MB limit'); return; }
      var reader = new FileReader();
      reader.onload = function(ev) {
        attachmentFiles.push({ name: file.name, data: ev.target.result, type: file.type });
        renderAttachments();
      };
      reader.readAsDataURL(file);
    });
    this.value = '';
  });

  document.getElementById('report-submit-btn').addEventListener('click', submitReport);
}

function updateAttachHint() {
  var type = document.getElementById('report-type-select').value;
  var hint = document.getElementById('report-attach-hint');
  if (hint) {
    hint.style.display = (type === 'complaint' || type === 'bug') ? '' : 'none';
  }
}

function renderAttachments() {
  var list = document.getElementById('report-attach-list');
  if (!list) return;
  list.innerHTML = attachmentFiles.map(function(f, i) {
    return '<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.8rem;background:var(--bg-glass)">'
      + f.name + '<button type="button" data-index="' + i + '" class="attach-remove-btn" style="background:none;border:none;color:var(--color-danger);cursor:pointer;font-size:1rem;padding:0;line-height:1">&times;</button></span>';
  }).join('');
  list.querySelectorAll('.attach-remove-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(this.dataset.index);
      attachmentFiles.splice(idx, 1);
      renderAttachments();
    });
  });
}

async function submitReport() {
  var type = document.getElementById('report-type-select').value;
  var title = document.getElementById('report-title-input').value.trim();
  var content = document.getElementById('report-content-editor').value.trim();
  if (!title) { showToast(getCurrentLanguage() === 'ar' ? 'العنوان مطلوب' : 'Title is required'); return; }
  if ((type === 'complaint' || type === 'bug') && attachmentFiles.length === 0) {
    showToast(getCurrentLanguage() === 'ar' ? 'المرفقات مطلوبة للشكاوى وبلاغات الخلل' : 'Attachments required for complaints and bug reports');
    return;
  }
  var btn = document.getElementById('report-submit-btn');
  btn.disabled = true;
  btn.textContent = getCurrentLanguage() === 'ar' ? 'جارى الإرسال...' : 'Sending...';
  try {
    var res = await fetch(API_BASE_URL + '/reports', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type, title: title, content: content, attachments: attachmentFiles })
    });
    if (!res.ok) { var err = await res.json(); throw new Error(err.error || err.message || 'Failed'); }
    showToast(getCurrentLanguage() === 'ar' ? 'تم إرسال البلاغ بنجاح' : 'Report submitted');
    document.getElementById('report-create-modal').classList.remove('open');
  } catch (e) {
    showToast(e.message || (getCurrentLanguage() === 'ar' ? 'فشل إرسال البلاغ' : 'Failed to submit report'));
  } finally {
    btn.disabled = false;
    btn.textContent = getCurrentLanguage() === 'ar' ? 'إرسال' : 'Submit';
  }
}

function setupViewReportsModal() {
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('#view-reports-btn');
    if (!btn) return;
    e.preventDefault();
    openViewReportsModal();
  });
}

async function openViewReportsModal() {
  var existing = document.getElementById('report-view-modal');
  if (existing) { existing.classList.add('open'); return; }
  var lang = getCurrentLanguage();
  var isAr = lang === 'ar';
  var modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'report-view-modal';
  modal.innerHTML = '<div class="modal-container" style="max-width:600px">'
    + '<button class="modal-close-btn" id="report-view-close" type="button"><i class="fas fa-times"></i></button>'
    + '<div class="modal-header"><h3 class="modal-title">' + (isAr ? 'بلاغاتى' : 'My Reports') + '</h3></div>'
    + '<div class="modal-body" style="grid-template-columns:1fr;padding:24px" id="report-view-body">'
    + '<p style="text-align:center;color:var(--text-muted)">' + (isAr ? 'جارٍ التحميل...' : 'Loading...') + '</p>'
    + '</div></div>';
  document.body.appendChild(modal);
  modal.classList.add('open');

  document.getElementById('report-view-close').addEventListener('click', function() { modal.classList.remove('open'); });
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.classList.remove('open'); });

  try {
    var res = await fetch(API_BASE_URL + '/reports/my', { credentials: 'include' });
    var data = res.ok ? await res.json() : { reports: [] };
    var reports = data.reports || [];
    var body = document.getElementById('report-view-body');
    if (reports.length === 0) {
      body.innerHTML = '<p style="text-align:center;color:var(--text-muted)">' + (isAr ? 'لا توجد بلاغات بعد' : 'No reports yet') + '</p>';
      return;
    }
    var statusLabels = { open: isAr ? 'مفتوح' : 'Open', in_progress: isAr ? 'قيد المراجعة' : 'In Progress', resolved: isAr ? 'تم الحل' : 'Resolved', closed: isAr ? 'مغلق' : 'Closed' };
    body.innerHTML = reports.map(function(r, idx) {
      var st = statusLabels[r.status] || r.status;
      var typeNames = { inquiry: isAr ? 'استفسار' : 'Inquiry', suggestion: isAr ? 'اقتراح' : 'Suggestion', complaint: isAr ? 'شكوى' : 'Complaint', bug: isAr ? 'بلاغ خلل' : 'Bug Report', feedback: isAr ? 'رأى واقتراح' : 'Feedback', organization: isAr ? 'مؤسسة' : 'Organization' };
      return '<div data-report-idx="' + idx + '" style="padding:12px;border:1px solid var(--border-color);border-radius:var(--radius-md);margin-bottom:10px;background:var(--bg-glass);cursor:pointer">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
        + '<strong>' + r.title + '</strong>'
        + '<span class="dashboard-role-badge" style="font-size:0.7rem;padding:2px 8px">' + st + '</span>'
        + '</div>'
        + '<div style="font-size:0.8rem;color:var(--text-muted)">' + (typeNames[r.type] || r.type) + ' &middot; ' + new Date(r.createdAt).toLocaleDateString() + '</div>'
        + (r.content ? '<div style="margin-top:6px;font-size:0.85rem;max-height:100px;overflow:hidden">' + r.content + '</div>' : '')
        + '</div>';
    }).join('');
    body.querySelectorAll('[data-report-idx]').forEach(function(el) {
      el.addEventListener('click', function() {
        openReportDetailModal(reports[parseInt(this.dataset.reportIdx)], getCurrentUser(), currentUserIsOwner);
      });
    });
  } catch (e) {
    document.getElementById('report-view-body').innerHTML = '<p style="text-align:center;color:var(--color-danger)">' + (isAr ? 'فشل التحميل' : 'Failed to load') + '</p>';
  }
}
