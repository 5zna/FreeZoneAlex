import { Router } from 'express';
import auth from '../middleware/auth.js';
import CustomRole from '../models/CustomRole.js';
import MemberRole from '../models/MemberRole.js';
import { memberDocHasOwner } from '../utils/memberRoleUtils.js';
import { cacheGet, clearCache } from '../utils/cache.js';

const router = Router();

async function requireAdmin(req, res, next) {
  if (!req.user) return res.status(403).json({ message: 'Admin or developer access required' });
  if (req.user.role === 'admin' || req.user.role === 'developer') return next();
  try {
    const mr = await MemberRole.findOne({ userId: req.user._id }).lean();
    if (memberDocHasOwner(mr)) return next();
  } catch {}
  return res.status(403).json({ message: 'Admin or developer access required' });
}

router.get('/custom-roles', auth, requireAdmin, async (req, res) => {
  try {
    const roles = await cacheGet('custom-roles', 30000, () => CustomRole.find().sort({ name: 1 }).lean());
    res.json({ roles });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.post('/custom-roles', auth, requireAdmin, async (req, res) => {
  try {
    const { name, icon, permissions } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });
    const role = await CustomRole.create({ name, icon: icon || '', permissions: permissions || {} });
    clearCache('custom-roles');
    res.status(201).json({ role });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Role already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/custom-roles/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { name, icon, permissions } = req.body;
    const update = { name, icon: icon || '' };
    if (permissions) update.permissions = permissions;
    const role = await CustomRole.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    clearCache('custom-roles');
    res.json({ role });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Role name already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/custom-roles/:id', auth, requireAdmin, async (req, res) => {
  try {
    const role = await CustomRole.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found' });
    clearCache('custom-roles');
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

export default router;
