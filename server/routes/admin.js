import { Router } from 'express';
import User from '../models/User.js';
import BannedIP from '../models/BannedIP.js';
import MemberRole from '../models/MemberRole.js';
import CustomRole from '../models/CustomRole.js';
import { memberDocHasOwner, normalizeMemberRoles } from '../utils/memberRoleUtils.js';
import auth from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { createAuditLog, actorSnapshot } from '../utils/auditLog.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import multer from 'multer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

function requireDev(req, res, next) {
  if (req.user && req.user.role === 'developer') {
    return next();
  }
  return res.status(403).json({ message: 'Developer access required' });
}

async function requireAdmin(req, res, next) {
  if (!req.user) return res.status(403).json({ message: 'Admin or developer access required' });
  if (req.user.role === 'admin' || req.user.role === 'developer') return next();
  try {
    const mr = await MemberRole.findOne({ userId: req.user._id }).lean();
    if (memberDocHasOwner(mr)) return next();
  } catch {}
  return res.status(403).json({ message: 'Admin or developer access required' });
}

async function requireDashboard(req, res, next) {
  if (!req.user) return res.status(403).json({ message: 'Dashboard access required' });
  if (['admin', 'developer', 'moderator'].includes(req.user.role)) return next();
  try {
    const mr = await MemberRole.findOne({ userId: req.user._id }).lean();
    if (memberDocHasOwner(mr)) return next();
  } catch {}
  return res.status(403).json({ message: 'Dashboard access required' });
}

function requireModerator(req, res, next) {
  if (!req.user) return res.status(403).json({ message: 'Moderator access required' });
  if (['admin', 'developer', 'moderator'].includes(req.user.role)) return next();
  MemberRole.findOne({ userId: req.user._id }).lean().then(mr => {
    if (memberDocHasOwner(mr)) return next();
    return res.status(403).json({ message: 'Moderator access required' });
  }).catch(() => res.status(403).json({ message: 'Moderator access required' }));
}

async function getUserRank(userId) {
  const user = await User.findById(userId).select('role');
  if (!user) return 0;
  if (user.role === 'developer') return 4;
  const memberRole = await MemberRole.findOne({ userId }).lean();
  if (memberDocHasOwner(memberRole)) return 3;
  if (user.role === 'admin') return 2;
  if (user.role === 'moderator') return 1.5;
  return 1;
}

async function getRequesterRank(req, res, next) {
  try {
    req.requesterRank = await getUserRank(req.user._id);
    next();
  } catch { res.status(500).json({ message: 'Server error' }); }
}

router.post('/claim-dev', auth, async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || key !== process.env.DEV_SECRET_KEY) {
      return res.status(401).json({ message: 'Invalid developer key' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { role: 'developer' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await createAuditLog({ category: 'staff', type: 'claim_dev', actionType: 'role', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Claimed developer role', targetType: 'user', targetId: String(user._id), targetName: user.username || user.name });

    res.json({ user });
  } catch (err) {
    console.error('claim-dev error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/admin/users', auth, requireDashboard, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/admin/users/:id/role', auth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'moderator', 'admin', 'developer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    
    // Only developers can assign or remove 'developer' role
    if (role === 'developer' && req.user.role !== 'developer') return res.status(403).json({ message: 'Only developers can assign developer role' });
    if (target.role === 'developer' && req.user.role !== 'developer') return res.status(403).json({ message: 'Cannot modify a developer' });
    
    // Only developers or Owner can assign or remove 'admin' role
    if (req.user.role !== 'developer') {
      const mr = await MemberRole.findOne({ userId: req.user._id }).lean();
      const isOwner = mr && mr.roles && mr.roles.some(r => r.roleName && r.roleName.charAt(0) === '@');
      if (role === 'admin' && !isOwner) return res.status(403).json({ message: 'Only developers or the Owner can assign admin role' });
      if (target.role === 'admin' && role !== 'admin' && !isOwner) return res.status(403).json({ message: 'Only developers or the Owner can remove admin role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    const adminRank = req.user.role === 'developer' ? 'Developer' : 'Admin';
    await createNotification({ userId: user._id, type: 'role_change', message: `${adminRank} ${req.user.username} changed your role to ${role}`, link: '/dashboard' });
    await createAuditLog({ category: 'staff', type: 'user_role_change', actionType: 'role', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: `Changed role to ${role}`, targetType: 'user', targetId: String(user._id), targetName: user.username || user.name, details: role });
    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/admin/users/:id', auth, requireAdmin, getRequesterRank, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    const targetRank = await getUserRank(target._id);
    if (targetRank >= req.requesterRank) return res.status(403).json({ message: 'Cannot delete a user with equal or higher rank' });
    await User.findByIdAndDelete(req.params.id);
    await createAuditLog({ category: 'staff', type: 'user_delete', actionType: 'delete-account', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Deleted user', targetType: 'user', targetId: String(target._id), targetName: target.username || target.name });
    res.json({ message: 'User deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin/ban/:id', auth, requireModerator, getRequesterRank, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    const targetRank = await getUserRank(target._id);
    if (targetRank >= req.requesterRank) return res.status(403).json({ message: 'Cannot ban a user with equal or higher rank' });
    target.banned = true;
    target.banReason = req.body.reason || '';
    await target.save();
    if (target.lastIp) {
      try {
        await BannedIP.updateOne(
          { ip: target.lastIp },
          { ip: target.lastIp, userId: target._id, reason: req.body.reason || '' },
          { upsert: true }
        );
      } catch {}
    }
    const adminRank = req.user.role === 'developer' ? 'Developer' : 'Admin';
    await createNotification({ userId: target._id, type: 'ban', message: `${adminRank} ${req.user.username} banned your account` });
    await createAuditLog({ category: 'staff', type: 'user_ban', actionType: 'ban', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Banned user', targetType: 'user', targetId: String(target._id), targetName: target.username || target.name, details: req.body.reason || '' });
    res.json({ user: target });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin/unban/:id', auth, requireModerator, getRequesterRank, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    const targetRank = await getUserRank(target._id);
    if (targetRank >= req.requesterRank) return res.status(403).json({ message: 'Cannot unban a user with equal or higher rank' });
    target.banned = false; target.banReason = ''; await target.save();
    if (target.lastIp) {
      try { await BannedIP.deleteOne({ ip: target.lastIp }); } catch {}
    }
    const adminRank = req.user.role === 'developer' ? 'Developer' : 'Admin';
    await createNotification({ userId: target._id, type: 'unban', message: `${adminRank} ${req.user.username} unbanned your account` });
    await createAuditLog({ category: 'staff', type: 'user_unban', actionType: 'unban', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Unbanned user', targetType: 'user', targetId: String(target._id), targetName: target.username || target.name });
    res.json({ user: target });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin/timeout/:id', auth, requireModerator, getRequesterRank, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    const targetRank = await getUserRank(target._id);
    if (targetRank >= req.requesterRank) return res.status(403).json({ message: 'Cannot suspend a user with equal or higher rank' });
    const { minutes, reason } = req.body;
    const duration = (parseInt(minutes) || 60) * 60 * 1000;
    target.timedOutUntil = new Date(Date.now() + duration);
    target.timeoutReason = reason || '';
    await target.save();
    const adminRank = req.user.role === 'developer' ? 'Developer' : 'Admin';
    await createNotification({ userId: target._id, type: 'timeout', message: `${adminRank} ${req.user.username} suspended your account for ${parseInt(minutes) || 60} minutes` });
    await createAuditLog({ category: 'staff', type: 'user_timeout', actionType: 'suspend', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Suspended user', targetType: 'user', targetId: String(target._id), targetName: target.username || target.name, details: `${parseInt(minutes) || 60} min` });
    res.json({ user: target });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin/untimeout/:id', auth, requireModerator, getRequesterRank, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    const targetRank = await getUserRank(target._id);
    if (targetRank >= req.requesterRank) return res.status(403).json({ message: 'Cannot remove suspension for a user with equal or higher rank' });
    target.timedOutUntil = null; target.timeoutReason = ''; await target.save();
    const adminRank = req.user.role === 'developer' ? 'Developer' : 'Admin';
    await createNotification({ userId: target._id, type: 'untimeout', message: `${adminRank} ${req.user.username} lifted your suspension` });
    await createAuditLog({ category: 'staff', type: 'user_untimeout', actionType: 'untimeout', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Removed user suspension', targetType: 'user', targetId: String(target._id), targetName: target.username || target.name });
    res.json({ user: target });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/admin/users/:id/verify', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.verified = !user.verified;
    await user.save();
    const adminRank = req.user.role === 'developer' ? 'Developer' : 'Admin';
    const type = user.verified ? 'verified' : 'unverified';
    const msg = user.verified ? `${adminRank} ${req.user.username} verified your account` : `${adminRank} ${req.user.username} unverified your account`;
    await createNotification({ userId: user._id, type, message: msg, link: '/dashboard' });
    await createAuditLog({ category: 'staff', type: 'user_verify', actionType: 'verify', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: user.verified ? 'Verified user' : 'Unverified user', targetType: 'user', targetId: String(user._id), targetName: user.username || user.name });
    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/admin/users/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -googleToken -facebookToken').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Fetch and populate member roles
    const mr = await MemberRole.findOne({ userId: user._id }).lean();
    user.memberRoles = normalizeMemberRoles(mr);
    
    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

/* GET /users/public/:id - public user profile details */
router.get('/users/public/:id', async (req, res) => {
  try {
    let user = null;
    const isValidId = req.params.id && req.params.id.match(/^[0-9a-fA-F]{24}$/);
    if (isValidId) {
      user = await User.findById(req.params.id)
        .select('name username avatar role verified about')
        .lean();
    }
    
    if (!user && req.query.avatar) {
      user = await User.findOne({ avatar: req.query.avatar })
        .select('name username avatar role verified about')
        .lean();
    }
    
    if (!user && req.query.name) {
      user = await User.findOne({ name: req.query.name })
        .select('name username avatar role verified about')
        .lean();
    }
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Fetch and populate member roles
    const mr = await MemberRole.findOne({ userId: user._id }).lean();
    user.memberRoles = normalizeMemberRoles(mr);
    
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
