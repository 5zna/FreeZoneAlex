import { inquiries } from '../data/inquiries.js';
import { getCurrentLanguage } from './translationHandler.js';

var _currentCategory = 'all';
var _searchTerm = '';

export function initInquiryHandler() {
  renderQuestions();
  setupCategoryTabs();
  setupSearch();
  setupAccordion();
  window.addEventListener('langChanged', filterQuestions);
}

function getLang() {
  return getCurrentLanguage();
}

function renderQuestions(filtered) {
  var list = document.getElementById('inquiry-qa-list');
  if (!list) return;

  var items = filtered || inquiries;
  var lang = getLang();
  var isAr = lang === 'ar';

  if (items.length === 0) {
    list.innerHTML = '<div class="glass-panel" style="padding:40px;text-align:center;color:var(--text-muted)">' +
      (isAr ? 'لا توجد نتائج مطابقة' : 'No matching results') +
      '</div>';
    return;
  }

  list.innerHTML = items.map(function(q) {
    var question = isAr ? q.question_ar : q.question_en;
    var answer = isAr ? q.answer_ar : q.answer_en;
    var formattedAnswer = answer.replace(/\n/g, '<br>');
    return (
      '<div class="qa-card" data-id="' + q.id + '">' +
        '<div class="qa-header">' +
          '<span class="qa-question">' + question + '</span>' +
          '<span class="qa-toggle-icon"><i class="fas fa-chevron-down"></i></span>' +
        '</div>' +
        '<div class="qa-body">' +
          '<div class="qa-content">' + formattedAnswer + '</div>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

function filterQuestions() {
  var filtered = inquiries.filter(function(q) {
    var lang = getLang();
    var isAr = lang === 'ar';
    var text = isAr ? q.question_ar + ' ' + q.answer_ar : q.question_en + ' ' + q.answer_en;
    var matchesSearch = !_searchTerm || text.toLowerCase().indexOf(_searchTerm.toLowerCase()) !== -1;
    var matchesCategory = _currentCategory === 'all' || q.category === _currentCategory;
    return matchesSearch && matchesCategory;
  });
  renderQuestions(filtered);
  updateCounts();
}

function updateCounts() {
  var total = inquiries.length;

  var countMap = {};
  inquiries.forEach(function(q) {
    countMap[q.category] = (countMap[q.category] || 0) + 1;
  });

  setCount('count-all', total);
  setCount('count-freezone', countMap['freezone'] || 0);
  setCount('count-salaries', countMap['salaries'] || 0);
  setCount('count-hours', countMap['hours'] || 0);
  setCount('count-safety', countMap['safety'] || 0);
}

function setCount(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setupCategoryTabs() {
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.inquiry-cat-btn');
    if (!btn) return;

    var category = btn.getAttribute('data-category');
    if (!category) return;

    document.querySelectorAll('.inquiry-cat-btn').forEach(function(b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');

    _currentCategory = category;
    filterQuestions();
  });
}

function setupSearch() {
  var input = document.getElementById('inquiry-search');
  if (!input) return;

  var debounceTimer;
  input.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      _searchTerm = input.value.trim();
      filterQuestions();
    }, 250);
  });
}

function setupAccordion() {
  document.addEventListener('click', function(e) {
    var header = e.target.closest('.qa-header');
    if (!header) return;

    var card = header.closest('.qa-card');
    if (!card) return;

    var isOpen = card.classList.contains('open');
    var body = card.querySelector('.qa-body');

    document.querySelectorAll('.qa-card.open').forEach(function(c) {
      if (c !== card) {
        c.classList.remove('open');
        var b = c.querySelector('.qa-body');
        if (b) b.style.maxHeight = '0';
      }
    });

    if (isOpen) {
      card.classList.remove('open');
      body.style.maxHeight = '0';
    } else {
      card.classList.add('open');
      body.style.maxHeight = body.scrollHeight + 'px';
    }
  });
}
