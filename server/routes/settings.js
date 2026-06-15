import { Router } from 'express';
import SiteSettings from '../models/SiteSettings.js';
import auth from '../middleware/auth.js';

const router = Router();

var cachedSettings = null;
var cacheTime = 0;
var CACHE_TTL = 60000;

export async function getSettings() {
  if (cachedSettings && Date.now() - cacheTime < CACHE_TTL) return cachedSettings;
  var s = await SiteSettings.findOne({ key: 'global' }).lean();
  if (!s) { s = await SiteSettings.create({ key: 'global' }); s = s.toObject(); }
  cachedSettings = s;
  cacheTime = Date.now();
  return s;
}

export function clearSettingsCache() {
  cachedSettings = null;
  cacheTime = 0;
}

function publicSettings(s) {
  return {
    maintenance: s.maintenance,
    maintenanceReason: s.maintenanceReason || '',
    alert: s.alert || '',
    favicon: s.favicon || '',
    news: Array.isArray(s.news) ? s.news.filter(Boolean).slice(0, 20) : []
  };
}

router.get('/settings', async (req, res) => {
  try {
    var s = await getSettings();
    res.json({ settings: publicSettings(s) });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.put('/settings', auth, async (req, res) => {
  try {
    var { maintenance, maintenanceReason, alert, favicon, news } = req.body;
    var update = {};
    if (typeof maintenance === 'boolean') update.maintenance = maintenance;
    if (typeof maintenanceReason === 'string') update.maintenanceReason = maintenanceReason;
    if (typeof alert === 'string') update.alert = alert;
    if (typeof favicon === 'string') update.favicon = favicon;
    if (Array.isArray(news)) update.news = news.filter(Boolean).slice(0, 20);
    update.updatedBy = req.userId;
    var s = await SiteSettings.findOneAndUpdate({ key: 'global' }, { $set: update }, { upsert: true, new: true }).lean();
    clearSettingsCache();
    res.json({ settings: publicSettings(s) });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

export default router;
