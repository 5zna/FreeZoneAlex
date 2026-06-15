import { Router } from 'express';
import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { createNotification } from './notifications.js';
import { containsProfanity } from '../utils/profanityFilter.js';
import { createAuditLog, actorSnapshot } from '../utils/auditLog.js';
import { uploadAvatar } from '../middleware/upload.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

const router = Router();

function isAdmin(req) {
  return req.user && (req.user.role === 'admin' || req.user.role === 'developer');
}

router.get('/organizations/verified', async (req, res) => {
  try {
    const orgs = await Organization.find({ verified: true, username: { $exists: true, $ne: '' } }).select('username name').lean();
    res.json({ organizations: orgs });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/organizations/public/:id', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).lean();
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    if (org.avatar && org.avatar.startsWith('data:')) org.avatar = '';
    res.json({ organization: org });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/organizations', auth, async (req, res) => {
  try {
    const orgs = await Organization.find({}).populate('owner', 'name displayName username email').populate('members', 'name displayName username email');
    res.json({ organizations: orgs });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/organizations', auth, async (req, res) => {
  try {
    const { name, owner, about, avatar, verified, username } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (containsProfanity(name)) {
      return res.status(400).json({ message: 'Organization name contains inappropriate language' });
    }
    if (about && containsProfanity(about)) {
      return res.status(400).json({ message: 'About section contains inappropriate language' });
    }
    if (username && containsProfanity(username)) {
      return res.status(400).json({ message: 'Username contains inappropriate language' });
    }
    if (username !== undefined && username !== '') {
      const u = username.trim().toLowerCase();
      if (!u || u.length < 2 || u.length > 30 || !/^[a-z0-9_-]+$/.test(u)) {
        return res.status(400).json({ message: 'Username must be 2-30 characters, letters, numbers, underscores, hyphens only' });
      }
      const existing = await Organization.findOne({ username: u });
      if (existing) return res.status(400).json({ message: 'Username already taken' });
    }
    const ownerId = owner || req.userId;
    var finalAvatar = avatar || '';
    if (typeof finalAvatar === 'string' && finalAvatar.startsWith('data:')) {
      var base64Data = finalAvatar.split(',')[1];
      var buffer = Buffer.from(base64Data, 'base64');
      try {
        finalAvatar = await uploadToCloudinary(buffer, 'org_avatars');
      } catch {
        finalAvatar = avatar;
      }
    }
    const orgData = {
      name: name.trim(),
      owner: ownerId,
      members: [ownerId],
      about: about || '',
      avatar: finalAvatar,
      verified: !!verified,
      members: [ownerId]
    };
    if (username !== undefined && username.trim()) {
      orgData.username = username.trim().toLowerCase();
    }
    const org = await Organization.create(orgData);
    const populated = await org.populate('owner', 'name displayName email');
    await createAuditLog({ category: 'staff', type: 'organization_create', actionType: 'organization', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Created organization', targetType: 'organization', targetId: String(populated._id), targetName: populated.name });
    res.status(201).json({ organization: populated });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/organizations/:id', auth, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: 'Not found' });
    if (org.owner.toString() !== req.userId && !isAdmin(req)) {
      return res.status(403).json({ message: 'Only the owner or an admin can edit' });
    }
    const { name, about, avatar, verified, owner, username } = req.body;
    if (name !== undefined) {
      if (containsProfanity(name)) return res.status(400).json({ message: 'Organization name contains inappropriate language' });
      org.name = name.trim();
    }
    if (about !== undefined) {
      if (containsProfanity(about)) return res.status(400).json({ message: 'About section contains inappropriate language' });
      org.about = about;
    }
    if (avatar !== undefined) {
      if (typeof avatar === 'string' && avatar.startsWith('data:')) {
        var base64Data = avatar.split(',')[1];
        var buffer = Buffer.from(base64Data, 'base64');
        try {
          org.avatar = await uploadToCloudinary(buffer, 'org_avatars');
        } catch {
          org.avatar = avatar;
        }
      } else {
        org.avatar = avatar;
      }
    }
    if (verified !== undefined) {
      const wasVerified = org.verified;
      org.verified = !!verified;
      if (wasVerified !== org.verified) {
        const adminRank = req.user.role === 'developer' ? 'Developer' : 'Admin';
        const type = org.verified ? 'verified' : 'unverified';
        const msg = org.verified ? `${adminRank} ${req.user.username} verified "${org.name}"` : `${adminRank} ${req.user.username} unverified "${org.name}"`;
        const notifyIds = [...new Set([org.owner.toString(), ...org.members.map(m => m.toString())])];
        for (const uid of notifyIds) {
          await createNotification({ userId: uid, type, message: msg, link: '/dashboard' });
        }
      }
    }
    if (owner !== undefined) org.owner = owner;
    if (username !== undefined) {
      const u = username.trim().toLowerCase();
      if (containsProfanity(u)) return res.status(400).json({ message: 'Username contains inappropriate language' });
      if (!u || u.length < 2 || u.length > 30 || !/^[a-z0-9_-]+$/.test(u)) {
        return res.status(400).json({ message: 'Username must be 2-30 characters, letters, numbers, underscores, hyphens only' });
      }
      const existing = await Organization.findOne({ username: u, _id: { $ne: org._id } });
      if (existing) return res.status(400).json({ message: 'Username already taken' });
      org.username = u;
    }
    await org.save();
    const populated = await org.populate('owner', 'name displayName email');
    await createAuditLog({ category: 'staff', type: 'organization_update', actionType: 'organization', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Updated organization', targetType: 'organization', targetId: String(populated._id), targetName: populated.name });
    res.json({ organization: populated });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

/* Upload avatar for an organization */
router.post('/organizations/:id/avatar', auth, (req, res) => {
  uploadAvatar(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    try {
      var org = await Organization.findById(req.params.id);
      if (!org) return res.status(404).json({ message: 'Not found' });
      if (org.owner.toString() !== req.userId && !isAdmin(req)) {
        return res.status(403).json({ message: 'Only the owner or an admin can change the avatar' });
      }

      var avatarUrl = await uploadToCloudinary(req.file.buffer, 'org_avatars');
      org = await Organization.findByIdAndUpdate(
        req.params.id,
        { avatar: avatarUrl },
        { new: true }
      ).populate('owner', 'name displayName email');
      await createAuditLog({ category: 'staff', type: 'organization_avatar', actionType: 'organization', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Updated organization avatar', targetType: 'organization', targetId: String(org._id), targetName: org.name });
      res.json({ organization: org });
    } catch (err) {
      console.error('[Cloudinary] Org avatar upload error:', err);
      res.status(500).json({ message: 'Upload failed' });
    }
  });
});

router.delete('/organizations/:id', auth, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: 'Not found' });
    if (org.owner.toString() !== req.userId && !isAdmin(req)) {
      return res.status(403).json({ message: 'Only the owner or an admin can delete' });
    }
    await org.deleteOne();
    await createAuditLog({ category: 'staff', type: 'organization_delete', actionType: 'organization', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Deleted organization', targetType: 'organization', targetId: String(org._id), targetName: org.name });
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/organizations/:id/members', auth, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: 'Not found' });
    if (org.owner.toString() !== req.userId && !isAdmin(req)) {
      return res.status(403).json({ message: 'Only the owner or an admin can manage members' });
    }
    const { userId, userIds } = req.body;
    const ids = userIds || (userId ? [userId] : []);
    if (ids.length === 0) return res.status(400).json({ message: 'userId or userIds required' });
    const added = [];
    const errors = [];
    for (const id of ids) {
      let user;
      if (typeof id === 'string' && id.includes('@')) {
        user = await User.findOne({ email: id.toLowerCase().trim() });
      } else {
        try { user = await User.findById(id); } catch { user = null; }
      }
      if (!user) { errors.push(id); continue; }
      const memberId = user._id;
      if (org.members.some(m => m.toString() === memberId.toString())) { errors.push(id); continue; }
      org.members.push(memberId);
      added.push(memberId);
    }
    await org.save();
    for (const memberId of added) {
      await createNotification({ userId: memberId, type: 'org_add', message: `You have been added to "${org.name}"`, link: '/dashboard' });
    }
    await org.populate([{ path: 'owner', select: 'name displayName username email' }, { path: 'members', select: 'name displayName username email' }]);
    await createAuditLog({ category: 'staff', type: 'organization_member_add', actionType: 'organization', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Added organization member(s)', targetType: 'organization', targetId: String(org._id), targetName: org.name, details: added.length + ' member(s)' });
    res.json({ organization: org, added, errors });
  } catch (err) {
    console.error('[addMember] Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/organizations/:id/members/:userId', auth, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: 'Not found' });
    if (org.owner.toString() !== req.userId && !isAdmin(req)) {
      return res.status(403).json({ message: 'Only the owner or an admin can manage members' });
    }
    org.members = org.members.filter(m => m.toString() !== req.params.userId);
    await org.save();
    await createNotification({ userId: req.params.userId, type: 'org_remove', message: `You have been removed from "${org.name}"` });
    const populated = await org.populate('owner', 'name displayName username email');
    await createAuditLog({ category: 'staff', type: 'organization_member_remove', actionType: 'organization', actorId: req.user._id, actorName: actorSnapshot(req.user).actorName, actorRole: req.user.role, message: 'Removed organization member', targetType: 'organization', targetId: String(org._id), targetName: org.name, details: req.params.userId });
    res.json({ organization: populated });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
