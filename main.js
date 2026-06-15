import { getCurrentLanguage } from './translationHandler.js';

let formFields = {};
let previewBox = null;

export function initJobBuilderHandler() {
  const builderForm = document.getElementById('builder-form');
  previewBox = document.getElementById('preview-box');

  if (!builderForm || !previewBox) return;

  const copyArBtn = document.getElementById('btn-copy-ar');
  const copyEnBtn = document.getElementById('btn-copy-en');
  const resetBtn = document.getElementById('btn-reset');

  const inputs = {
    title: document.getElementById('post-title'),
    company: document.getElementById('post-company'),
    location: document.getElementById('post-location'),
    salary: document.getElementById('post-salary'),
    hours: document.getElementById('post-hours'),
    requirements: document.getElementById('post-requirements'),
    contact: document.getElementById('post-contact')
  };

  const reqCounter = document.getElementById('req-counter');

  Object.keys(inputs).forEach(key => {
    if (inputs[key]) {
      inputs[key].addEventListener('input', () => {
        formFields[key] = inputs[key].value.trim();
        updatePreview();
        if (key === 'requirements' && reqCounter) {
          const lines = inputs[key].value.split('\n').filter(l => l.trim()).length;
          reqCounter.textContent = `${lines} شرط`;
        }
      });
    }
  });

  resetForm();
  updatePreview();

  if (copyArBtn) {
    copyArBtn.addEventListener('click', () => {
      const text = generateTemplate('ar');
      copyText(text, copyArBtn);
    });
  }

  if (copyEnBtn) {
    copyEnBtn.addEventListener('click', () => {
      const text = generateTemplate('en');
      copyText(text, copyEnBtn);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      Object.values(inputs).forEach(inp => { if (inp) inp.value = ''; });
      resetForm();
      updatePreview();
    });
  }

  window.addEventListener('langChanged', () => updatePreview());
}

function resetForm() {
  formFields = {
    title: '', company: '', location: '', salary: '',
    hours: '', requirements: '', contact: ''
  };
}

function generateTemplate(lang) {
  const t = {
    title: formFields.title || (lang === 'ar' ? '[المسمى الوظيفي]' : '[Job Title]'),
    company: formFields.company || (lang === 'ar' ? '[اسم الشركة]' : '[Company Name]'),
    location: formFields.location || (lang === 'ar' ? '[مكان العمل]' : '[Location]'),
    salary: formFields.salary || (lang === 'ar' ? '[المرتب]' : '[Salary Range]'),
    hours: formFields.hours || (lang === 'ar' ? '[ساعات العمل]' : '[Work Hours]'),
    contact: formFields.contact || (lang === 'ar' ? '[رقم التواصل]' : '[Contact Number]')
  };

  let reqsText = '';
  if (formFields.requirements) {
    reqsText = formFields.requirements.split('\n')
      .map(l => l.trim()).filter(l => l)
      .map(l => `\u{1F539} ${l}`).join('\n');
  } else {
    reqsText = lang === 'ar' ? '\u{1F539} شرط أول\n\u{1F539} شرط ثاني' : '\u{1F539} Requirement 1\n\u{1F539} Requirement 2';
  }

  if (lang === 'ar') {
    return `\u{1F4E2} وظيفة جديدة معلنة بالإسكندرية (مجتمع المنطقة الحرة)
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

\u{1F4BC} الوظيفة: ${t.title}
\u{1F3E2} جهة العمل: ${t.company}
\u{1F4CD} مكان العمل: ${t.location}
\u{1F4B0} المرتب: ${t.salary}
\u23F1\uFE0F مواعيد العمل: ${t.hours}

\u{1F4CB} الشروط المطلوبة:
${reqsText}

\u{1F4DE} للتقديم: ${t.contact}

#وظائف_الإسكندرية #المنطقة_الحرة #توظيف_مصر`;
  }

  return `\u{1F4E2} New Job Posting in Alexandria (FreeZone Community)
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

\u{1F4BC} Job Title: ${t.title}
\u{1F3E2} Company: ${t.company}
\u{1F4CD} Location: ${t.location}
\u{1F4B0} Salary: ${t.salary}
\u23F1\uFE0F Hours: ${t.hours}

\u{1F4CB} Requirements:
${reqsText}

\u{1F4DE} Contact: ${t.contact}

#AlexandriaJobs #FreeZoneJobs #HiringEgypt`;
}

function updatePreview() {
  if (!previewBox) return;
  const lang = getCurrentLanguage();
  previewBox.textContent = generateTemplate(lang);
}

function copyText(text, btn) {
  const lang = getCurrentLanguage();

  const done = () => {
    const orig = btn.innerHTML;
    btn.classList.add('btn-copy-success');
    btn.innerHTML = `\u2714\uFE0F ${lang === 'ar' ? 'تم النسخ!' : 'Copied!'}`;
    btn.disabled = true;
    setTimeout(() => {
      btn.classList.remove('btn-copy-success');
      btn.innerHTML = orig;
      btn.disabled = false;
    }, 2000);
  };

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, callback) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); callback(); } catch {}
  document.body.removeChild(ta);
}
