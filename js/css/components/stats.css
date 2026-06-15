.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-6);
}

.stat-card {
  padding: var(--space-10) var(--space-6);
  text-align: center;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-sm), var(--shadow-inner);
  transition: 
    transform var(--transition-normal), 
    box-shadow var(--transition-normal), 
    border-color var(--transition-normal),
    background var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: var(--gradient-primary);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.stat-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, var(--color-primary-light) 0%, transparent 65%);
  opacity: 0;
  transition: opacity var(--transition-normal);
  pointer-events: none;
}

.stat-card:hover {
  transform: translateY(-6px) translateZ(0);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
  border-color: var(--border-strong);
  background: var(--bg-secondary);
}

.stat-card:hover::before,
.stat-card:hover::after {
  opacity: 1;
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: var(--space-3);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;
  transition: transform var(--transition-bounce);
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.05));
}

.stat-card:hover .stat-icon {
  transform: scale(1.15) rotate(4deg);
}

.stat-number {
  font-size: clamp(2rem, 5vw, 2.75rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: var(--space-2);
  color: var(--text-primary);
  font-feature-settings: "tnum";
  letter-spacing: -0.03em;
}

.stat-label {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
}

.stat-card.accent-card::before {
  background: var(--gradient-accent);
}

.stat-card.accent-card::after {
  background: radial-gradient(circle at 50% 0%, var(--color-accent-light) 0%, transparent 65%);
}

.stat-card.accent-card .stat-icon {
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

@media (max-width: 768px) {
  .stats-grid { gap: var(--space-4); }
  .stat-card { padding: var(--space-8) var(--space-4); }
}

@media (max-width: 425px) {
  .stats-grid {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
  .stat-card {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stat-number { display: none; }
  .stat-label { display: none; }
  .stat-icon {
    font-size: 2.5rem;
    margin-bottom: 0;
  }
}

@media (max-width: 280px) {
  .stat-icon {
    font-size: 2rem;
  }
}

/* TV & Cinema large displays */
@media (min-width: 1536px) {
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--space-8);
  }
}
