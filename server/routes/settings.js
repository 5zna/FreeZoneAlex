import { Router } from 'express';
import SiteSettings from '../models/SiteSettings.js';
import MemberRole from '../models/MemberRole.js';
import CustomRole from '../models/CustomRole.js';
import { memberDocHasOwner, normalizeMemberRoles } from '../utils/memberRoleUtils.js';
import auth from '../middleware/auth.js';
import { createAuditLog, actorSnapshot } from '../utils/auditLog.js';

const router = Router();

var cachedSettings = null;
var cacheTime = 0;
var CACHE_TTL = 5000;

function normalizeNewsItems(items) {
  if (!Array.isArray(items)) return [];
  var clean = items
    .map(function(item) { return typeof item === 'string' ? item.trim() : ''; })
    .filter(Boolean)
    .slice(0, 20);
  return clean;
}

function publicSettings(s) {
  return {
    maintenance: s.maintenance,
    maintenanceReason: s.maintenanceReason || '',
    alert: s.alert || '',
    favicon: s.favicon || '',
    news: normalizeNewsItems(s.news)
  };
}

async function canManageSettings(user, permissionName) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'developer') return true;
  var mr = await MemberRole.findOne({ userId: user._id }).lean();
  if (memberDocHasOwner(mr)) return true;
  if (!permissionName) return false;
  var roleNames = normalizeMemberRoles(mr).map(function(r) { return r.name; }).filter(Boolean);
  if (!roleNames.length) return false;
  var roles = await CustomRole.find({ name: { $in: roleNames } }).lean();
  return roles.some(function(role) {
    return role.permissions && role.permissions[permissionName];
  });
}

export async function getSettings() {
  if (cachedSettings && Date.now() - cacheTime < CACHE_TTL) return cachedSettings;
  var s = await SiteSettings.findOne({ key: 'global' }).lean();
  if (!s) {
    s = await SiteSettings.create({ key: 'global' });
    s = s.toObject();
  }
  cachedSettings = s;
  cacheTime = Date.now();
  return s;
}

export function clearSettingsCache() {
  cachedSettings = null;
  cacheTime = 0;
}

router.get('/settings', async (req, res) => {
  try {
    var s = await getSettings();
    res.json({ settings: publicSettings(s) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/settings', auth, async (req, res) => {
  try {
    var { maintenance, maintenanceReason, alert, favicon, news } = req.body;
    var newsOnly = Object.keys(req.body || {}).every(function(key) { return key === 'news'; });
    if (!await canManageSettings(req.user, newsOnly ? 'manage_announcement' : null)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    var update = {};
    if (typeof maintenance === 'boolean') update.maintenance = maintenance;
    if (typeof maintenanceReason === 'string') update.maintenanceReason = maintenanceReason;
    if (typeof alert === 'string') update.alert = alert;
    if (typeof favicon === 'string') update.favicon = favicon;
    if (Array.isArray(news)) update.news = normalizeNewsItems(news);
    update.updatedBy = req.userId;
    var s = await SiteSettings.findOneAndUpdate({ key: 'global' }, { $set: update }, { upsert: true, new: true }).lean();
    clearSettingsCache();
    await createAuditLog({
      category: 'staff',
      type: 'settings_update',
      actionType: newsOnly ? 'news' : 'settings',
      actorId: req.user._id,
      actorName: actorSnapshot(req.user).actorName,
      actorRole: req.user.role,
      message: newsOnly ? 'Updated news ticker' : 'Updated site settings',
      details: Object.keys(update).join(', ')
    });
    res.json({ settings: publicSettings(s) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
