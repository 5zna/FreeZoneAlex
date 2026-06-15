import { Router } from 'express';
import auth from '../middleware/auth.js';
import MemberRole from '../models/MemberRole.js';
import { normalizeMemberRoles, memberDocHasOwner, ensureRolesArray, findOwnerMemberRole } from '../utils/memberRoleUtils.js';
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

router.get('/member-roles', auth, requireAdmin, async (req, res) => {
  try {
    const docs = await cacheGet('member-roles', 30000, () => MemberRole.find().lean());
    const map = {};
    docs.forEach(doc => { map[doc.userId] = normalizeMemberRoles(doc); });
    res.json({ roles: map });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.put('/member-roles/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const { roleName, roleIcon } = req.body;
    if (!roleName) return res.status(400).json({ message: 'roleName is required' });
    if (roleName.charAt(0) === '@' && req.user.role !== 'developer') {
      const existingOwner = await findOwnerMemberRole(MemberRole);
      if (existingOwner && existingOwner.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only developer or the current Owner can assign Owner role' });
    }
    let doc = await MemberRole.findOne({ userId: req.params.userId });
    if (doc) {
      await ensureRolesArray(doc);
      const existing = normalizeMemberRoles(doc);
      if (existing.some(r => r.name === roleName)) return res.json({ roles: existing });
      doc.roles.push({ roleName, roleIcon: roleIcon || '' });
      await doc.save();
      clearCache('member-roles');
      return res.json({ roles: normalizeMemberRoles(doc) });
    }
    doc = await MemberRole.create({ userId: req.params.userId, roles: [{ roleName, roleIcon: roleIcon || '' }] });
    clearCache('member-roles');
    res.json({ roles: normalizeMemberRoles(doc) });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.get('/member-roles/me', auth, async (req, res) => {
  try {
    const doc = await MemberRole.findOne({ userId: req.userId }).lean();
    const roles = normalizeMemberRoles(doc);
    res.json({ roles, role: roles[0] || null });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/member-roles/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const roleName = req.query.roleName || req.body?.roleName;
    const doc = await MemberRole.findOne({ userId: req.params.userId });
    if (!doc) return res.json({ roles: [] });
    await ensureRolesArray(doc);
    const existing = normalizeMemberRoles(doc);
    if (!roleName) {
      const ownerRole = existing.find(r => r.name && r.name.charAt(0) === '@');
      if (ownerRole && req.user.role !== 'developer' && req.params.userId !== req.user._id.toString()) return res.status(403).json({ message: 'Only developer or the Owner themselves can remove Owner role' });
      await doc.deleteOne();
      clearCache('member-roles');
      return res.json({ roles: [] });
    }
    const removing = existing.find(r => r.name === roleName);
    if (removing && removing.name.charAt(0) === '@' && req.user.role !== 'developer') {
      if (req.params.userId !== req.user._id.toString()) return res.status(403).json({ message: 'Only developer or the Owner themselves can remove Owner role' });
    }
    doc.roles = doc.roles.filter(r => r.roleName !== roleName);
    if (doc.roles.length === 0) { await doc.deleteOne(); clearCache('member-roles'); return res.json({ roles: [] }); }
    await doc.save();
    clearCache('member-roles');
    res.json({ roles: normalizeMemberRoles(doc) });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

export default router;
