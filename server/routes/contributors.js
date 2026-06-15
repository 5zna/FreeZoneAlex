import { Router } from 'express';
import ContributorCategory from '../models/ContributorCategory.js';
import User from '../models/User.js';
import MemberRole from '../models/MemberRole.js';
import { normalizeMemberRoles, memberDocHasOwner } from '../utils/memberRoleUtils.js';
import auth from '../middleware/auth.js';

var router = Router();

function isDeveloper(req) {
  return req.user && req.user.role === 'developer';
}

router.get('/contributors/users', auth, async (req, res) => {
  if (!isDeveloper(req)) return res.status(403).json({ message: 'Only developer can access' });
  try {
    var users = await User.find().select('name username avatar').sort({ name: 1 }).lean();
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/contributors/categories', async (req, res) => {
  try {
    var categories = await ContributorCategory.find().sort({ order: 1 }).lean();
    var userIds = new Set();
    categories.forEach(function(c) {
      (c.entries || []).forEach(function(e) {
        if (e.userId) userIds.add(e.userId.toString());
      });
    });
    if (userIds.size > 0) {
      var users = await User.find({ _id: { $in: Array.from(userIds) } }).select('name username avatar role verified').lean();
      var memberRoles = await MemberRole.find({ userId: { $in: Array.from(userIds) } }).lean();
      var memberRoleMap = {};
      memberRoles.forEach(function(doc) {
        memberRoleMap[doc.userId.toString()] = {
          roles: normalizeMemberRoles(doc),
          hasOwner: memberDocHasOwner(doc)
        };
      });
      var userMap = {};
      users.forEach(function(u) {
        var userId = u._id.toString();
        var roleData = memberRoleMap[userId] || { roles: [], hasOwner: false };
        userMap[userId] = Object.assign({}, u, {
          memberRoles: roleData.roles,
          hasOwnerRole: roleData.hasOwner,
          owner: roleData.hasOwner
        });
      });
      categories.forEach(function(c) {
        (c.entries || []).forEach(function(e) {
          if (e.userId) e.user = userMap[e.userId.toString()] || null;
        });
      });
    }
    return res.json(categories);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/contributors/categories', auth, async (req, res) => {
  if (!isDeveloper(req)) return res.status(403).json({ message: 'Only developer can manage contributors' });
  try {
    var { name, icon, entries } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Category name is required' });
    var count = await ContributorCategory.countDocuments();
    var category = await ContributorCategory.create({ name: name.trim(), icon: icon || '', entries: entries || [], order: count });
    return res.status(201).json(category);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.put('/contributors/categories/:id', auth, async (req, res) => {
  if (!isDeveloper(req)) return res.status(403).json({ message: 'Only developer can manage contributors' });
  try {
    var { name, icon, entries, order } = req.body;
    var category = await ContributorCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    if (name !== undefined) category.name = name.trim();
    if (icon !== undefined) category.icon = icon;
    if (order !== undefined) category.order = order;
    if (entries !== undefined) {
      category.entries = entries.map(function(e) {
        return { userId: e.userId, description: e.description || '' };
      });
    }
    await category.save();
    return res.json(category.toObject());
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.delete('/contributors/categories/:id', auth, async (req, res) => {
  if (!isDeveloper(req)) return res.status(403).json({ message: 'Only developer can manage contributors' });
  try {
    await ContributorCategory.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
