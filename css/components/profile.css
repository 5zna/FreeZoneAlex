.profile-modal {
  align-items: flex-start;
  overflow-y: auto;
  padding: 32px 16px;
}

.profile-modal .auth-modal-container {
  max-width: 720px;
  padding: 32px 28px;
  text-align: left;
  max-height: none;
  overflow-y: visible;
}

html[lang="ar"] .profile-modal .auth-modal-container {
  text-align: right;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.profile-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.profile-avatar-img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--gradient-primary);
  border: 3px solid var(--bg-primary);
  box-shadow: var(--shadow-sm);
}

.profile-avatar-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--gradient-primary);
  color: var(--text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 800;
  border: 3px solid var(--bg-primary);
  box-shadow: var(--shadow-sm);
}

.profile-avatar-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.25s var(--ease-out-expo);
  color: #fff;
  border: none;
  font-size: 1.25rem;
}

.profile-avatar-wrap:hover .profile-avatar-overlay {
  opacity: 1;
}

.profile-info h4 {
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.profile-info p {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-weight: 500;
}

.profile-field {
  margin-bottom: 20px;
}

.profile-field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.profile-field input[type="text"] {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-inset);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.95rem;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.01);
}

.profile-field input[type="text"]:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--ring-focus);
  background: var(--bg-secondary);
}

/* Premium WYSIWYG Editor Toolbar */
.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-bottom: none;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  background: var(--bg-tertiary);
}

.editor-toolbar button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-xs);
  cursor: pointer;
  /* Hide the raw text characters */
  font-size: 0;
  line-height: 0;
  transition: all var(--transition-fast);
  position: relative;
}

/* SVG icon injection via ::before */
.editor-toolbar button::before {
  content: '';
  display: block;
  width: 16px;
  height: 16px;
  background-color: currentColor;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
  flex-shrink: 0;
}

/* Bold — B icon */
.editor-toolbar button[data-cmd="bold"]::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z'/%3E%3Cpath d='M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z'/%3E%3Cpath d='M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z'/%3E%3C/svg%3E");
}

/* Italic — I icon */
.editor-toolbar button[data-cmd="italic"]::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round'%3E%3Cline x1='19' y1='4' x2='10' y2='4'/%3E%3Cline x1='14' y1='20' x2='5' y2='20'/%3E%3Cline x1='15' y1='4' x2='9' y2='20'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round'%3E%3Cline x1='19' y1='4' x2='10' y2='4'/%3E%3Cline x1='14' y1='20' x2='5' y2='20'/%3E%3Cline x1='15' y1='4' x2='9' y2='20'/%3E%3C/svg%3E");
}

/* Underline — U icon */
.editor-toolbar button[data-cmd="underline"]::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 4v6a6 6 0 0 0 12 0V4'/%3E%3Cline x1='4' y1='20' x2='20' y2='20'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 4v6a6 6 0 0 0 12 0V4'/%3E%3Cline x1='4' y1='20' x2='20' y2='20'/%3E%3C/svg%3E");
}

/* Remove Format — eraser icon */
.editor-toolbar button[data-cmd="removeFormat"]::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 20H7L3 16l10-10 7 7-3.5 3.5'/%3E%3Cpath d='M6.0 11.0 l7 7'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 20H7L3 16l10-10 7 7-3.5 3.5'/%3E%3Cpath d='M6.0 11.0 l7 7'/%3E%3C/svg%3E");
}

/* Bullet List — unordered list icon */
.editor-toolbar button[data-cmd="insertUnorderedList"]::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'%3E%3Cline x1='9' y1='6' x2='20' y2='6'/%3E%3Cline x1='9' y1='12' x2='20' y2='12'/%3E%3Cline x1='9' y1='18' x2='20' y2='18'/%3E%3Ccircle cx='4' cy='6' r='1.5' fill='currentColor' stroke='none'/%3E%3Ccircle cx='4' cy='12' r='1.5' fill='currentColor' stroke='none'/%3E%3Ccircle cx='4' cy='18' r='1.5' fill='currentColor' stroke='none'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'%3E%3Cline x1='9' y1='6' x2='20' y2='6'/%3E%3Cline x1='9' y1='12' x2='20' y2='12'/%3E%3Cline x1='9' y1='18' x2='20' y2='18'/%3E%3Ccircle cx='4' cy='6' r='1.5' fill='currentColor' stroke='none'/%3E%3Ccircle cx='4' cy='12' r='1.5' fill='currentColor' stroke='none'/%3E%3Ccircle cx='4' cy='18' r='1.5' fill='currentColor' stroke='none'/%3E%3C/svg%3E");
}

/* Numbered List — ordered list icon */
.editor-toolbar button[data-cmd="insertOrderedList"]::before {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'%3E%3Cline x1='10' y1='6' x2='21' y2='6'/%3E%3Cline x1='10' y1='12' x2='21' y2='12'/%3E%3Cline x1='10' y1='18' x2='21' y2='18'/%3E%3Cpath d='M4 6h1v4' stroke-width='1.8'/%3E%3Cpath d='M4 10h2' stroke-width='1.8'/%3E%3Cpath d='M6 18H4c0-1 2-2 2-3s-1-1.5-2-1' stroke-width='1.8'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'%3E%3Cline x1='10' y1='6' x2='21' y2='6'/%3E%3Cline x1='10' y1='12' x2='21' y2='12'/%3E%3Cline x1='10' y1='18' x2='21' y2='18'/%3E%3Cpath d='M4 6h1v4' stroke-width='1.8'/%3E%3Cpath d='M4 10h2' stroke-width='1.8'/%3E%3Cpath d='M6 18H4c0-1 2-2 2-3s-1-1.5-2-1' stroke-width='1.8'/%3E%3C/svg%3E");
}

.editor-toolbar button:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-color: rgba(79, 70, 229, 0.15);
}

.editor-toolbar button:active {
  transform: scale(0.95);
}

/* Active/pressed state */
.editor-toolbar button.active,
.editor-toolbar button[aria-pressed="true"] {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-color: rgba(79, 70, 229, 0.2);
}

/* Divider between button groups */
.editor-toolbar::after {
  content: '';
  display: none;
}

.editor-toolbar select {
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xs);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.78rem;
  cursor: pointer;
  outline: none;
  transition: border-color var(--transition-fast);
}

.editor-toolbar select:focus {
  border-color: var(--color-primary);
}

.editor-content {
  min-height: 160px;
  max-height: 300px;
  overflow-y: auto;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.7;
  outline: none;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.01);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.editor-content:focus {
  border-color: var(--color-primary);
  box-shadow: var(--ring-focus);
}

.editor-content[data-placeholder]:empty:before {
  content: attr(data-placeholder);
  color: var(--text-muted);
  pointer-events: none;
}

.profile-char-count {
  text-align: right;
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: 6px;
  font-weight: 500;
}

html[lang="ar"] .profile-char-count {
  text-align: left;
}

.profile-save-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--gradient-primary);
  color: var(--text-inverse);
  font-family: inherit;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  min-height: 48px;
  transition: all var(--transition-normal);
  margin-top: 8px;
  box-shadow: var(--shadow-sm);
}

.profile-save-btn:hover {
  transform: translateY(-2px) translateZ(0);
  box-shadow: var(--shadow-md), var(--shadow-glow);
}

.profile-save-btn:active {
  transform: scale(var(--scale-active)) translateZ(0);
}

.profile-save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.profile-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(80px);
  background: var(--color-success);
  color: #fff;
  padding: 12px 28px;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: 0.9rem;
  box-shadow: var(--shadow-lg), var(--shadow-glow);
  opacity: 0;
  transition: all 0.4s var(--ease-spring);
  z-index: 5000;
  pointer-events: none;
}

.profile-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@media (max-width: 480px) {
  .profile-modal {
    padding: 16px 12px;
  }

  .profile-modal .auth-modal-container {
    padding: 24px 16px;
  }

  .profile-header {
    gap: 14px;
  }

  .profile-avatar-img,
  .profile-avatar-placeholder {
    width: 58px;
    height: 58px;
  }

  .profile-avatar-placeholder {
    font-size: 1.45rem;
  }

  .editor-toolbar {
    padding: 6px 8px;
  }

  .editor-content {
    min-height: 130px;
    padding: 10px;
  }
}

/* Small screens optimizations (240px to 320px) */
@media (max-width: 360px) {
  .profile-modal { padding: 12px 8px; }
  .profile-modal .auth-modal-container { padding: 20px 14px; border-radius: var(--radius-md); }
  .profile-header { gap: 12px; flex-wrap: wrap; }
  .profile-avatar-img,
  .profile-avatar-placeholder { width: 50px; height: 50px; }
  .editor-toolbar { padding: 5px 6px; gap: 2px; }
  .editor-toolbar button { width: 28px; height: 28px; }
  .profile-org-member-add { flex-direction: column; }
}

@media (max-width: 280px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
  }
}

/* ---------- ORG MEMBERS ---------- */
.profile-org-members-section {
  margin-top: 20px;
  padding: var(--space-4);
  background: var(--bg-glass-fallback);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-xs);
}

@supports (backdrop-filter: blur(8px)) {
  .profile-org-members-section {
    background: var(--bg-glass);
    backdrop-filter: var(--blur-sm);
  }
}

.profile-org-members-section > label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 2px;
  color: var(--text-primary);
}

.profile-org-members-info {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0 0 12px;
}

.profile-org-members-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.profile-org-members-empty {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-style: italic;
  padding: 4px 0;
}

.profile-org-member-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border: 1px solid rgba(79, 70, 229, 0.12);
  border-radius: var(--radius-full);
  font-size: 0.8rem;
  font-weight: 600;
  transition: all var(--transition-fast);
}

.profile-org-member-email {
  font-size: 0.8rem;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.profile-org-member-remove {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  cursor: pointer;
  background: transparent;
  border: none;
  font-size: 1rem;
  font-weight: 800;
  opacity: 0.6;
  transition: all var(--transition-fast);
  flex-shrink: 0;
  padding: 0;
  margin-inline-start: 4px;
}

.profile-org-member-remove:hover {
  background: var(--color-primary);
  color: var(--text-inverse);
  opacity: 1;
}

.profile-org-member-add {
  display: flex;
  gap: 8px;
}

.profile-org-member-add select {
  flex: 1;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.8rem;
  outline: none;
  min-height: 38px;
  cursor: pointer;
}

.profile-org-member-add select:focus {
  border-color: var(--color-primary);
}

.profile-org-member-add-btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--gradient-primary);
  color: var(--text-inverse);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 38px;
  white-space: nowrap;
}

.profile-org-member-add-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm), var(--shadow-glow);
}
