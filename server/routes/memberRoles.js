import { Router } from 'express';
import auth from '../middleware/auth.js';
import MemberRole from '../models/MemberRole.js';
import User from '../models/User.js';
import {
  normalizeMemberRoles,
  memberDocHasOwner,
  ensureRolesArray,
  findOwnerMemberRole
} from '../utils/memberRoleUtils.js';
import { createAuditLog, actorSnapshot } from '../utils/auditLog.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const router = Router();

async function requireAdmin(req, res, next) {
  if (!req.user) return res.status(403).json({ message: 'Admin or developer access required' });
  if (['admin', 'developer', 'owner'].includes(req.user.role)) return next();
  try {
    const mr = await MemberRole.findOne({ userId: req.user._id }).lean();
    if (memberDocHasOwner(mr)) return next();
  } catch {}
  return res.status(403).json({ message: 'Admin or developer access required' });
}

/* GET /member-roles - all users' assigned roles */
router.get('/member-roles', auth, requireAdmin, async (req, res) => {
  try {
    const docs = await MemberRole.find().lean();
    const map = {};
    docs.forEach(doc => {
      map[doc.userId] = normalizeMemberRoles(doc);
    });
    res.json({ roles: map });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

/* PUT /member-roles/:userId - add a role (does not replace existing roles) */
router.put('/member-roles/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const { roleName, roleIcon } = req.body;
    if (!roleName) return res.status(400).json({ message: 'roleName is required' });

    if (roleName.charAt(0) === '@' && req.user.role !== 'developer') {
      const existingOwner = await findOwnerMemberRole(MemberRole);
      if (existingOwner && existingOwner.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only developer or the current Owner can assign Owner role' });
      }
    }

    var finalIcon = roleIcon || '';
    if (typeof finalIcon === 'string' && finalIcon.startsWith('data:')) {
      var base64Data = finalIcon.split(',')[1];
      var buffer = Buffer.from(base64Data, 'base64');
      try {
        finalIcon = await uploadToCloudinary(buffer, 'role_icons');
      } catch {
        finalIcon = roleIcon;
      }
    }

    let doc = await MemberRole.findOne({ userId: req.params.userId });
    if (doc) {
      await ensureRolesArray(doc);
      const existing = normalizeMemberRoles(doc);
      if (existing.some(r => r.name === roleName)) {
        return res.json({ roles: existing });
      }
    doc.roles.push({ roleName, roleIcon: finalIcon });
    await doc.save();
    
    // Update user base role if this is a system rank
    // Handle @owner special prefix case
    let actualRole = roleName;
    if (roleName === '@owner') actualRole = 'owner';
    
    const systemRanks = ['owner', 'admin', 'moderator', 'developer'];
    if (systemRanks.includes(actualRole)) {
      await User.findByIdAndUpdate(req.params.userId, { role: actualRole }, { new: true });
    }
    
    await createAuditLog({ category: 'staff', type: 'member_role_add', actionType: 'role', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Added member role', targetType: 'member-role', targetId: String(req.params.userId), details: roleName });
    return res.json({ roles: normalizeMemberRoles(doc) });
    }

    doc = await MemberRole.create({
      userId: req.params.userId,
      roles: [{ roleName, roleIcon: finalIcon }]
    });
    
    // Update user base role if this is a system rank
    // Handle @owner special prefix case
    let actualRole = roleName;
    if (roleName === '@owner') actualRole = 'owner';
    
    const systemRanks = ['owner', 'admin', 'moderator', 'developer'];
    if (systemRanks.includes(actualRole)) {
      await User.findByIdAndUpdate(req.params.userId, { role: actualRole }, { new: true });
    }
    
    await createAuditLog({ category: 'staff', type: 'member_role_add', actionType: 'role', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Added member role', targetType: 'member-role', targetId: String(req.params.userId), details: roleName });
    res.json({ roles: normalizeMemberRoles(doc) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

/* GET /member-roles/me */
router.get('/member-roles/me', auth, async (req, res) => {
  try {
    const doc = await MemberRole.findOne({ userId: req.userId }).lean();
    const roles = normalizeMemberRoles(doc);
    res.json({ roles, role: roles[0] || null });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

/* DELETE /member-roles/:userId?roleName=... - remove one role, or all if roleName omitted */
router.delete('/member-roles/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const roleName = req.query.roleName || req.body?.roleName;
    const doc = await MemberRole.findOne({ userId: req.params.userId });
    if (!doc) return res.json({ roles: [] });

    await ensureRolesArray(doc);
    const existing = normalizeMemberRoles(doc);

    if (!roleName) {
      const ownerRole = existing.find(r => r.name && r.name.charAt(0) === '@');
      if (ownerRole && req.user.role !== 'developer' && req.params.userId !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only developer or the Owner themselves can remove Owner role' });
      }
    await doc.deleteOne();
    
    // Reset user role to user when all roles are cleared
    await User.findByIdAndUpdate(req.params.userId, { role: 'user' }, { new: true });
    
    await createAuditLog({ category: 'staff', type: 'member_role_clear', actionType: 'role', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Removed all member roles', targetType: 'member-role', targetId: String(req.params.userId) });
    return res.json({ roles: [] });
    }

    const removing = existing.find(r => r.name === roleName);
    if (removing && removing.name.charAt(0) === '@' && req.user.role !== 'developer') {
      if (req.params.userId !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only developer or the Owner themselves can remove Owner role' });
      }
    }

    doc.roles = doc.roles.filter(r => r.roleName !== roleName);
    
    // Handle user role update when removing system ranks
    const systemRanks = ['owner', 'admin', 'moderator', 'developer'];
    
    if (doc.roles.length === 0) {
      await doc.deleteOne();
      // Reset to user if no roles left
      await User.findByIdAndUpdate(req.params.userId, { role: 'user' }, { new: true });
      await createAuditLog({ category: 'staff', type: 'member_role_remove', actionType: 'role', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Removed member role', targetType: 'member-role', targetId: String(req.params.userId), details: roleName });
      return res.json({ roles: [] });
    }
    
    await doc.save();
    
    // If we removed the current user role, find highest remaining system rank or fallback to user
    const remainingRoles = normalizeMemberRoles(doc).map(r => r.name);
    // Map @owner to plain owner for system rank check
    const normalizedRemaining = remainingRoles.map(r => r === '@owner' ? 'owner' : r);
    const remainingSystemRanks = normalizedRemaining.filter(r => systemRanks.includes(r));
    
    if (remainingSystemRanks.length > 0) {
      // Priority order: owner > developer > admin > moderator
      const rankPriority = { owner: 4, developer: 3, admin: 2, moderator: 1 };
      remainingSystemRanks.sort((a, b) => rankPriority[b] - rankPriority[a]);
      await User.findByIdAndUpdate(req.params.userId, { role: remainingSystemRanks[0] }, { new: true });
    } else {
      // No system ranks left, set to user
      await User.findByIdAndUpdate(req.params.userId, { role: 'user' }, { new: true });
    }
    
    await createAuditLog({ category: 'staff', type: 'member_role_remove', actionType: 'role', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Removed member role', targetType: 'member-role', targetId: String(req.params.userId), details: roleName });
    res.json({ roles: normalizeMemberRoles(doc) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
