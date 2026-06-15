import { Router } from 'express';
import auth from '../middleware/auth.js';
import AuditLog from '../models/AuditLog.js';
import { actorSnapshot, createAuditLog } from '../utils/auditLog.js';

const router = Router();

router.get('/audit-logs', auth, async (req, res) => {
  try {
    const category = req.query.category === 'staff' ? 'staff' : 'activity';
    const q = (req.query.q || '').trim().toLowerCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    const filter = { category };
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    const filtered = q ? logs.filter(l =>
      [l.actorName, l.actorRole, l.targetName, l.message, l.details, l.type, l.actionType].join(' ').toLowerCase().includes(q)
    ) : logs;
    res.json({ logs: filtered });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/audit-logs', auth, async (req, res) => {
  try {
    const actor = actorSnapshot(req.user);
    const log = await createAuditLog({
      category: req.body.category === 'staff' ? 'staff' : 'activity',
      type: req.body.type || 'general',
      actionType: req.body.actionType || '',
      actorId: actor.actorId,
      actorName: actor.actorName,
      actorRole: actor.actorRole,
      targetType: req.body.targetType || '',
      targetId: req.body.targetId || '',
      targetName: req.body.targetName || '',
      message: req.body.message || '',
      details: req.body.details || '',
      meta: req.body.meta || {}
    });
    res.status(201).json({ log });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
