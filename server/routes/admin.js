import { Router } from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { cacheGet, clearCache } from '../utils/cache.js';

const router = Router();

function requireDev(req, res, next) {
  if (!req.user || req.user.role !== 'developer') return res.status(403).json({ message: 'Developer access required' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'developer')) return res.status(403).json({ message: 'Admin or developer access required' });
  next();
}

function requireDashboard(req, res, next) {
  if (!req.user) return res.status(403).json({ message: 'Access required' });
  if (req.user.role === 'moderator' || req.user.role === 'admin' || req.user.role === 'developer') return next();
  return res.status(403).json({ message: 'Moderator or higher access required' });
}

router.get('/admin/users', auth, requireDashboard, async (req, res) => {
  try {
    const users = await cacheGet('admin/users', 30000, () => User.find().sort({ createdAt: -1 }).lean());
    res.json({ users });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.put('/admin/users/:id/role', auth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['user', 'moderator', 'admin', 'developer'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    if (role === 'developer' && req.user.role !== 'developer') return res.status(403).json({ message: 'Only a developer can assign developer role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    clearCache('admin/users');
    res.json({ user });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.put('/admin/users/:id/verify', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.verified = !user.verified;
    await user.save();
    clearCache('admin/users');
    res.json({ user: user.toObject() });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/admin/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    clearCache('admin/users');
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.post('/admin/ban/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.banned = true;
    user.banReason = reason || '';
    await user.save();
    clearCache('admin/users');
    res.json({ user: user.toObject() });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.post('/admin/unban/:id', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.banned = false;
    user.banReason = '';
    await user.save();
    clearCache('admin/users');
    res.json({ user: user.toObject() });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.post('/admin/timeout/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { until, reason } = req.body;
    if (!until) return res.status(400).json({ message: 'until date is required' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.timedOutUntil = new Date(until);
    user.timeoutReason = reason || '';
    await user.save();
    clearCache('admin/users');
    res.json({ user: user.toObject() });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.post('/admin/untimeout/:id', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.timedOutUntil = null;
    user.timeoutReason = '';
    await user.save();
    clearCache('admin/users');
    res.json({ user: user.toObject() });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

export default router;
