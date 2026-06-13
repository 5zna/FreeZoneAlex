import { getCurrentLanguage } from './translationHandler.js';
import { lockBodyScroll, resolveJobAvatar, resolveJobAuthorName } from '../core/utils.js';
import { WHATSAPP_BASE, FACEBOOK_GROUP_URL } from '../core/constants.js';
import { getCurrentUser, VERIFIED_TICK } from './authHandler.js';

let modalOverlay = null;
let isOpen = false;

export function initModalHandler() {
  modalOverlay = document.getElementById('modal-overlay');
  if (!modalOverlay) return;

  const closeBtn = modalOverlay.querySelector('.modal-close-btn');

  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeModal();
  });

  let touchStartY = 0;
  modalOverlay.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  modalOverlay.addEventListener('touchmove', (e) => {
    const container = modalOverlay.querySelector('.modal-container');
    if (!container || container.scrollTop > 0) return;
    const dy = e.touches[0].clientY - touchStartY;
    if (dy > 60) closeModal();
  }, { passive: true });
}

export function openJobModal(job) {
  if (!modalOverlay) return;

  isOpen = true;
  const lang = getCurrentLanguage();

  const t = (ar, en) => lang === 'ar' ? ar : en;

  const title = t(job.title_ar, job.title_en);
  const location = t(job.location_ar, job.location_en);
  const salary = t(job.salary_ar, job.salary_en) || job.salary || '';
  const hours = t(job.hours_ar, job.hours_en) || job.hours || '';
  const details = t(job.details_ar, job.details_en) || job.details || '';
  const contact = job.contact || '';

  const fbLink = job.fbLink || '';

  const waMessage = encodeURIComponent(
    t(
      `مرحباً، أنا مهتم بالتقديم لوظيفة "${title}" التي تم نشرها على جروب المنطقة الحرة. هل الشاغر لا يزال متاحاً؟`,
      `Hello, I am interested in applying for the "${title}" position posted on the FreeZone Group. Is this vacancy still available?`
    )
  );
  const waNumber = job.contact_link ? job.contact_link.split('/').pop() : (job.contact ? job.contact.replace(/[^0-9]/g, '') : '');
  const whatsLink = waNumber ? `${WHATSAPP_BASE}${waNumber}?text=${waMessage}` : '#';

  modalOverlay.querySelector('.modal-title').textContent = title;
  modalOverlay.querySelector('.modal-company').textContent = '';

  const body = modalOverlay.querySelector('.modal-body');
  body.innerHTML = `
    <div class="modal-main-content">
      <div class="modal-section">
        <h4 class="modal-section-title">${t('تفاصيل ومسؤوليات العمل', 'Job Specifications')}</h4>
        <p class="modal-text">${details || '-'}</p>
      </div>
    </div>
    <div class="modal-sidebar">
      <h4 class="modal-section-title" style="border:none;margin-bottom:0;">${t('معلومات سريعة', 'Brief Details')}</h4>
      <div class="sidebar-detail-item">
        <span class="sidebar-detail-label">${t('المرتب المعروض', 'Salary Range')}</span>
        <span class="sidebar-detail-value">${salary}</span>
      </div>
      <div class="sidebar-detail-item">
        <span class="sidebar-detail-label">${t('ساعات العمل والتوقيت', 'Working Hours')}</span>
        <span class="sidebar-detail-value">${hours}</span>
      </div>
      <div class="sidebar-detail-item">
        <span class="sidebar-detail-label">${t('مكان العمل', 'Work Location')}</span>
        <span class="sidebar-detail-value">${location}</span>
      </div>
      ${job.tags && job.tags.length ? `
      <div class="sidebar-detail-item" style="flex-wrap:wrap">
        <span class="sidebar-detail-label" style="width:100%;margin-bottom:4px">${t('الوظائف', 'Jobs')}</span>
        <div style="display:flex;flex-wrap:wrap;gap:4px">${job.tags.map(t => `<span class="job-tag">${t}</span>`).join('')}</div>
      </div>` : ''}
      <div class="sidebar-detail-item">
        <span class="sidebar-detail-label">${t('نشر بواسطة', 'Posted by')}</span>
        <span class="sidebar-detail-value"><span class="job-author-badge ${job.creatorType === 'organization' ? 'badge-org' : 'badge-user'}">${(() => {
          const a = resolveJobAvatar(job, getCurrentUser());
          const n = resolveJobAuthorName(job, getCurrentUser());
          const isVerified = !!job.verified;
          const tickHtml = isVerified ? `<span class="job-verified-tick" title="Verified">${VERIFIED_TICK.replace('class="auth-verified-tick"', '')}</span> ` : '';
          return (a ? '<img class="job-author-avatar" src="' + a + '" alt="">' : '<span class="job-author-avatar job-author-avatar-placeholder">' + n.charAt(0).toUpperCase() + '</span>') + tickHtml + n;
        })()}</span></span>
      </div>
      <div class="sidebar-detail-item">
        <span class="sidebar-detail-label">${t('تاريخ النشر', 'Posted Date')}</span>
        <span class="sidebar-detail-value">${job.posted_date || (job.postedAt ? new Date(job.postedAt).toLocaleDateString() : '-')}</span>
      </div>
      <div class="modal-actions">
        ${fbLink ? `<a href="${fbLink}" target="_blank" rel="noopener" class="btn btn-secondary"><span><i class="fas fa-paperclip"></i></span> ${t('عرض المنشور', 'View Post')}</a>` : `<a href="${FACEBOOK_GROUP_URL}" target="_blank" class="btn btn-secondary"><span><i class="fas fa-users"></i></span> ${t('رابط المنشور الأصلي بالجروب', 'Original Group Post')}</a>`}
        <a href="${whatsLink}" target="_blank" class="btn btn-primary"><span><i class="fas fa-circle" style="color:#25D366"></i></span> ${t('راسلهم واتساب مباشرة', 'Chat on WhatsApp')}</a>
      </div>
    </div>`;

  modalOverlay.classList.remove('closing');
  modalOverlay.classList.add('open');
  lockBodyScroll(true);
}

export function closeModal() {
  if (!modalOverlay || !isOpen) return;
  isOpen = false;

  modalOverlay.classList.remove('open');
  modalOverlay.classList.add('closing');
  lockBodyScroll(false);

  setTimeout(() => {
    modalOverlay.classList.remove('closing');
  }, 400);
}
