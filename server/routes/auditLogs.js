import { Router } from 'express';
import AuditLog from '../server/models/AuditLog.js';
import auth from '../server/middleware/auth.js';

const router = Router();

router.get('/audit-logs', auth, async (req, res) => {
  try {
    const { category, type, limit, q } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { action: regex },
        { details: regex },
        { 'user.name': regex },
        { 'user.email': regex }
      ];
    }
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 100)
      .lean();
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/audit-logs', auth, async (req, res) => {
  try {
    const { category, type, action, details, userId, user } = req.body;
    if (!category || !type || !action) {
      return res.status(400).json({ message: 'category, type, and action are required' });
    }
    const log = await AuditLog.create({
      category,
      type,
      action,
      details: details || '',
      userId: userId || req.userId,
      user: user || { id: req.userId, name: req.user?.name || '' }
    });
    res.status(201).json({ log });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
