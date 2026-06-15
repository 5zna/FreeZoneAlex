import BannedIP from '../models/BannedIP.js';
var bannedCache = null;
var cacheTime = 0;
export default async function blockIP(req, res, next) {
  if (Date.now() - cacheTime > 60000) { bannedCache = null; }
  if (!bannedCache) { bannedCache = await BannedIP.find().lean().then(b => new Set(b.map(x => x.ip))).catch(() => new Set()); cacheTime = Date.now(); }
  var ip = (req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || '').split(',')[0].trim();
  if (ip && bannedCache.has(ip)) return res.status(403).json({ message: 'Access denied' });
  next();
}
